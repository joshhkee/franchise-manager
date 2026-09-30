import { getDb } from './index';
import {
  callSheetEntries,
  depthChartEntries,
  draftPicks,
  driveCalls,
  drives,
  formationSubs,
  franchisePlayers,
  leagues,
  players,
  teams,
  transactions,
} from './schema';

/**
 * Snapshot export and restore.
 *
 * Everything you author lives in Postgres, which is great until you want a copy
 * of it on your phone, on your laptop, and in a backup you can read. A snapshot
 * is plain JSON: one file containing your whole franchise state, restorable into
 * a fresh deploy in one request.
 *
 * Playbooks and formations are deliberately *not* in the snapshot. They come from
 * the playbook dataset (`npm run scrape:playbooks` / `db:seed`), so they are
 * reproducible and the snapshot stays small enough to email yourself.
 */

export const SNAPSHOT_VERSION = 1;

const TABLES = {
  teams,
  players,
  franchisePlayers,
  leagues,
  depthChartEntries,
  formationSubs,
  callSheetEntries,
  drives,
  driveCalls,
  transactions,
  draftPicks,
} as const;

type TableName = keyof typeof TABLES;

export interface Snapshot {
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
  tables: Record<TableName, Record<string, unknown>[]>;
}

/** Timestamp columns come back from JSON as ISO strings; Drizzle wants Dates. */
function reviveDates<T extends Record<string, unknown>>(row: T): T {
  const copy: Record<string, unknown> = { ...row };
  for (const [key, value] of Object.entries(copy)) {
    if (typeof value !== 'string') continue;
    if (!(key === 'at' || key.endsWith('At'))) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) copy[key] = parsed;
  }
  return copy as T;
}

export async function exportSnapshot(): Promise<Snapshot> {
  const db = await getDb();
  const tables = {} as Record<TableName, Record<string, unknown>[]>;
  const counts: Record<string, number> = {};

  for (const name of Object.keys(TABLES) as TableName[]) {
    const rows = (await db.select().from(TABLES[name])) as Record<string, unknown>[];
    tables[name] = rows;
    counts[name] = rows.length;
  }

  return { version: SNAPSHOT_VERSION, exportedAt: new Date().toISOString(), counts, tables };
}

/**
 * Replace the current state with a snapshot. This is a restore, not a merge: it
 * wipes the tables it owns so the result is exactly the file you loaded.
 */
export async function restoreSnapshot(snapshot: Snapshot): Promise<Record<string, number>> {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.tables) {
    throw new Error('That file is not a franchise snapshot.');
  }
  if (snapshot.version !== SNAPSHOT_VERSION) {
    throw new Error(`Snapshot version ${snapshot.version} is not supported (expected ${SNAPSHOT_VERSION}).`);
  }

  const db = await getDb();
  const written: Record<string, number> = {};

  // Children first — no foreign keys are declared, but this keeps the intent clear.
  const order: TableName[] = [
    'driveCalls',
    'drives',
    'callSheetEntries',
    'transactions',
    'draftPicks',
    'formationSubs',
    'depthChartEntries',
    'franchisePlayers',
    'players',
    'teams',
    'leagues',
  ];

  for (const name of order) {
    await db.delete(TABLES[name]);
  }

  for (const name of order) {
    const rows = snapshot.tables[name] ?? [];
    if (!Array.isArray(rows)) throw new Error(`Snapshot table ${name} is malformed.`);
    if (rows.length === 0) {
      written[name] = 0;
      continue;
    }
    // Chunk so a big roster does not exceed parameter limits in one statement.
    const chunkSize = 200;
    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize).map((row) => reviveDates(row));
      await db.insert(TABLES[name]).values(chunk as never);
    }
    written[name] = rows.length;
  }

  return written;
}
