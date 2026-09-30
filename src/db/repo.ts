import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { DriveState } from '@/domain/drive';
import { getDb, schema } from './index';
import {
  auditLog,
  callSheetEntries,
  depthChartEntries,
  depthSlots,
  draftPicks,
  driveCalls,
  drives,
  formationPlays,
  formationSlots,
  formationSubs,
  formations,
  franchisePlayers,
  leagues,
  plans,
  playbooks,
  players,
  teams,
  transactions,
} from './schema';
import { normalizeSlotRanks, type ResolveContext, type ResolvePlayer } from '@/domain/resolution';
import { classifyFormation, familyKey, derivePersonnel } from '@/domain/families';
import { DEPTH_SLOTS } from '@/domain/depthSlots';
import { DEFAULT_PRIORITIES, type BucketId } from '@/domain/callSheet';
import type { CallRecord } from '@/domain/tendency';
import type { Concept, PlayFamily } from '@/domain/concepts';
import type {
  DepthChartState,
  DepthSlot,
  Formation,
  FormationSub,
  FranchisePlayer,
  Player,
  RosterPlayer,
  Side,
} from '@/domain/types';
import {
  CPU_ROSTERS,
  CPU_TEAMS,
  DEMO_ROSTER,
  DEMO_SITUATIONAL,
  DEMO_TEAM,
  seedPlayersFor,
  type SeedPlayer,
  type SeedTeam,
} from '@/data/seed/roster';
import { PLAYBOOK_SEEDS, type SeedFormation } from '@/data/seed/playbooks';

export const DEFAULT_LEAGUE_ID = 'default';
export type ChartLayer = 'game' | 'plan';

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export async function getLeague() {
  const db = await getDb();
  const [row] = await db.select().from(leagues).where(eq(leagues.id, DEFAULT_LEAGUE_ID)).limit(1);
  return row ?? null;
}

export async function getTeams() {
  const db = await getDb();
  return db.select().from(teams).orderBy(asc(teams.name));
}

export async function getRoster(teamId?: string): Promise<RosterPlayer[]> {
  const db = await getDb();
  const base = db
    .select({
      player: players,
      franchise: franchisePlayers,
    })
    .from(players)
    .leftJoin(franchisePlayers, eq(franchisePlayers.playerId, players.id));

  const rows = teamId
    ? await base.where(orTeam(teamId))
    : await base;

  return rows.map(({ player, franchise }) => toRosterPlayer(player, franchise));
}

function orTeam(teamId: string) {
  return sql`(${players.teamId} = ${teamId} or ${franchisePlayers.teamId} = ${teamId})`;
}

type PlayerRow = typeof players.$inferSelect;
type FranchiseRow = typeof franchisePlayers.$inferSelect | null;

function toRosterPlayer(row: PlayerRow, franchise: FranchiseRow): RosterPlayer {
  const player: Player = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    position: row.position,
    jersey: row.jersey,
    teamId: row.teamId,
    overall: row.overall,
    age: row.age,
    heightInches: row.heightInches,
    college: row.college,
    ratings: row.ratings ?? {},
    salary: row.salary,
  };
  const overlay: FranchisePlayer = {
    playerId: row.id,
    teamId: franchise?.teamId ?? row.teamId,
    contractYears: franchise?.contractYears ?? null,
    capHit: franchise?.capHit ?? null,
    devTrait: (franchise?.devTrait as FranchisePlayer['devTrait']) ?? null,
    injuryStatus: (franchise?.injuryStatus as FranchisePlayer['injuryStatus']) ?? 'healthy',
    injuryWeeks: franchise?.injuryWeeks ?? null,
    rosterStatus: (franchise?.rosterStatus as FranchisePlayer['rosterStatus']) ?? 'active',
    notes: franchise?.notes ?? null,
  };
  return { ...player, franchise: overlay };
}

/** Where the roster data actually came from — shown in the UI so nothing is implicit. */
export async function getDataSourceCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ source: players.source, count: sql<number>`count(*)::int` })
    .from(players)
    .groupBy(players.source);
  return Object.fromEntries(rows.map((row) => [row.source ?? 'unknown', Number(row.count)]));
}

export async function getPlaybookSummary() {
  const db = await getDb();
  return db
    .select({
      id: playbooks.id,
      name: playbooks.name,
      side: playbooks.side,
      source: playbooks.source,
      team: playbooks.team,
    })
    .from(playbooks)
    .orderBy(asc(playbooks.side), asc(playbooks.name));
}

export async function getDepthSlotVocabulary(): Promise<DepthSlot[]> {
  const db = await getDb();
  const rows = await db.select().from(depthSlots).orderBy(asc(depthSlots.displayOrder));
  if (rows.length === 0) return DEPTH_SLOTS;
  return rows.map((row) => ({
    code: row.code,
    label: row.label,
    side: row.side as Side,
    group: row.groupName,
    eligiblePositions: row.eligiblePositions ?? [],
    order: row.displayOrder,
    ranks: row.ranks,
    situational: row.situational,
    description: row.description,
    verified: row.verified,
  }));
}

export async function getDepthChart(layer: ChartLayer): Promise<DepthChartState> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(depthChartEntries)
    .where(and(eq(depthChartEntries.layer, layer), eq(depthChartEntries.leagueId, DEFAULT_LEAGUE_ID)));

  const chart: DepthChartState = { entries: {} };
  for (const row of rows) {
    const row2 = chart.entries[row.slotCode] ?? [];
    while (row2.length < row.rank) row2.push(null);
    row2[row.rank - 1] = row.playerId;
    chart.entries[row.slotCode] = row2;
  }
  return chart;
}

export async function getSubs(layer: ChartLayer): Promise<FormationSub[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(formationSubs)
    .where(and(eq(formationSubs.layer, layer), eq(formationSubs.leagueId, DEFAULT_LEAGUE_ID)));

  return rows.map((row) => ({
    formationId: row.formationId,
    slotKey: row.slotKey,
    mode: row.mode as FormationSub['mode'],
    playerId: row.playerId,
    inheritSlotCode: row.inheritSlotCode,
    inheritRank: row.inheritRank,
    note: row.note,
  }));
}

export async function getPlaybooks() {
  const db = await getDb();
  return db.select().from(playbooks).orderBy(asc(playbooks.name));
}

export async function getFormations(playbookIds?: string[]): Promise<Formation[]> {
  const db = await getDb();
  const formationRows = playbookIds?.length
    ? await db.select().from(formations).where(inArray(formations.playbookId, playbookIds)).orderBy(asc(formations.sortOrder))
    : await db.select().from(formations).orderBy(asc(formations.sortOrder));

  if (formationRows.length === 0) return [];
  const ids = formationRows.map((f) => f.id);

  const [slotRows, playRows] = await Promise.all([
    db.select().from(formationSlots).where(inArray(formationSlots.formationId, ids)),
    db.select().from(formationPlays).where(inArray(formationPlays.formationId, ids)),
  ]);

  const slotsByFormation = new Map<string, typeof slotRows>();
  for (const slot of slotRows) {
    const list = slotsByFormation.get(slot.formationId) ?? [];
    list.push(slot);
    slotsByFormation.set(slot.formationId, list);
  }

  const playsByFormation = new Map<string, typeof playRows>();
  for (const play of playRows) {
    const list = playsByFormation.get(play.formationId) ?? [];
    list.push(play);
    playsByFormation.set(play.formationId, list);
  }

  return formationRows.map((row) => ({
    id: row.id,
    playbookId: row.playbookId,
    name: row.name,
    set: row.set,
    personnel: row.personnel,
    distribution: row.distribution,
    side: row.side as Side,
    family: row.family,
    notes: row.notes,
    // Two spots pulling the same man at the same rank is never what you want, so
    // ranks are made distinct here — the one place every formation is read from.
    // Spatial order (back to front, left to right) sets who is rank 1, so the
    // left corner is CB rank 1 and the second lineman in the same front is the
    // second man on the depth chart.
    slots: normalizeSlotRanks(
      (slotsByFormation.get(row.id) ?? [])
        .slice()
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((slot) => ({
          key: slot.key,
          label: slot.label,
          roleCode: slot.roleCode,
          roleRank: slot.roleRank,
          x: slot.x,
          y: slot.y,
          eligiblePositions: slot.eligiblePositions ?? [],
          positionFallback: slot.positionFallback,
        })),
    ),
    plays: (playsByFormation.get(row.id) ?? []).map((play) => ({
      id: play.id,
      name: play.name,
      conceptOverride: play.conceptOverride,
      familyOverride: play.familyOverride,
    })),
  }));
}

export async function getFormationById(id: string): Promise<Formation | null> {
  const all = await getFormations();
  return all.find((formation) => formation.id === id) ?? null;
}

/** Everything the domain functions need to resolve personnel. */
export async function buildResolveContext(
  layer: ChartLayer,
  formations?: Formation[],
): Promise<{ ctx: ResolveContext; formations: Formation[]; roster: RosterPlayer[] }> {
  const [chart, subs, roster] = await Promise.all([
    getDepthChart(layer),
    getSubs(layer),
    getRoster(DEMO_TEAM.id),
  ]);
  const list = formations ?? (await getFormations());

  const playersById: Record<string, ResolvePlayer> = {};
  for (const player of roster) {
    playersById[player.id] = {
      id: player.id,
      position: player.position,
      franchise: player.franchise,
    };
  }
  // Defensive formations resolve against defensive roles, which live on the same
  // depth chart; the roster above already covers every role the seed uses.
  const allRoster = await getRoster();
  for (const player of allRoster) {
    playersById[player.id] ??= {
      id: player.id,
      position: player.position,
      franchise: player.franchise,
    };
  }

  return { ctx: { depthChart: chart, subs, playersById }, formations: list, roster: allRoster };
}

export async function getPlans() {
  const db = await getDb();
  return db.select().from(plans).orderBy(asc(plans.name));
}

export async function getDefaultPlan() {
  const all = await getPlans();
  return all.find((plan) => plan.isDefault) ?? all[0] ?? null;
}

export async function getCallSheet(planId: string, side: Side = 'offense'): Promise<Record<string, Concept[]>> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(callSheetEntries)
    .where(and(eq(callSheetEntries.planId, planId), eq(callSheetEntries.side, side)))
    .orderBy(asc(callSheetEntries.priority));

  if (rows.length === 0) return DEFAULT_PRIORITIES;

  const sheet: Record<string, Concept[]> = {};
  for (const row of rows) {
    const list = sheet[row.bucketId] ?? [];
    list.push(row.concept as Concept);
    sheet[row.bucketId] = list;
  }
  return sheet;
}

export async function listTransactions() {
  const db = await getDb();
  return db.select().from(transactions).orderBy(desc(transactions.id));
}

export async function listDraftPicks() {
  const db = await getDb();
  return db.select().from(draftPicks).orderBy(asc(draftPicks.season), asc(draftPicks.round));
}

export async function listDrives(limit = 10) {
  const db = await getDb();
  return db.select().from(drives).orderBy(desc(drives.createdAt)).limit(limit);
}

/** Rebuild the domain drive state from storage. */
export async function getDriveState(id: string): Promise<DriveState | null> {
  const db = await getDb();
  const [row] = await db.select().from(drives).where(eq(drives.id, id)).limit(1);
  if (!row) return null;
  const calls = await getDriveCalls(id);
  return {
    id: row.id,
    opponent: row.opponent,
    side: row.side as DriveState['side'],
    down: row.down,
    distance: row.distance,
    yardLine: row.yardLine,
    quarter: row.quarter,
    clockSeconds: row.clockSeconds,
    scoreDiff: row.scoreDiff,
    status: row.status as DriveState['status'],
    calls: calls.map((call) => ({
      sequence: call.sequence,
      formationId: call.formationId,
      formationName: call.formationName,
      playId: call.playId,
      playName: call.playName,
      concept: call.concept as DriveState['calls'][number]['concept'],
      bucket: call.bucketId as DriveState['calls'][number]['bucket'],
      outcome: call.outcome as DriveState['calls'][number]['outcome'],
      down: call.down,
      distance: call.distance,
      yardLine: call.yardLine,
    })),
  };
}

/** The most recent drive that is still in progress, if any. */
export async function getActiveDrive(): Promise<DriveState | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: drives.id })
    .from(drives)
    .where(eq(drives.status, 'active'))
    .orderBy(desc(drives.createdAt))
    .limit(1);
  if (!row) return null;
  return getDriveState(row.id);
}

export async function getDriveCalls(driveId: string) {
  const db = await getDb();
  return db.select().from(driveCalls).where(eq(driveCalls.driveId, driveId)).orderBy(asc(driveCalls.sequence));
}

/** Call history for the tell meter, newest last. */
export async function getCallHistory(limit = 200): Promise<CallRecord[]> {
  const db = await getDb();
  const rows = await db
    .select({ call: driveCalls, formation: formations })
    .from(driveCalls)
    .leftJoin(formations, eq(formations.id, driveCalls.formationId))
    .orderBy(asc(driveCalls.id))
    .limit(limit);

  return rows.map(({ call, formation }) => {
    const klass = formation
      ? classifyFormation({
          id: formation.id,
          playbookId: formation.playbookId,
          name: formation.name,
          set: formation.set,
          personnel: formation.personnel,
          distribution: formation.distribution,
          side: formation.side as Side,
          family: formation.family,
          slots: [],
          plays: [],
          notes: null,
        })
      : { set: 'unknown', personnel: 'unknown', distribution: 'unknown', motion: false };

    return {
      id: String(call.id),
      formationId: call.formationId,
      formationName: call.formationName,
      set: klass.set,
      personnel: klass.personnel,
      distribution: klass.distribution,
      concept: call.concept as Concept,
      family: 'pass' as PlayFamily,
      playName: call.playName,
      down: call.down,
      distance: call.distance,
      yardLine: call.yardLine,
      bucket: call.bucketId as BucketId,
      outcome: call.outcome,
      sequence: call.sequence,
    } satisfies CallRecord;
  });
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

export async function setDepthChartEntry(
  layer: ChartLayer,
  slotCode: string,
  rank: number,
  playerId: string | null,
): Promise<void> {
  const db = await getDb();
  await db
    .insert(depthChartEntries)
    .values({ layer, leagueId: DEFAULT_LEAGUE_ID, slotCode, rank, playerId })
    .onConflictDoUpdate({
      target: [
        depthChartEntries.layer,
        depthChartEntries.leagueId,
        depthChartEntries.slotCode,
        depthChartEntries.rank,
      ],
      set: { playerId },
    });
  await recordAudit('set-depth-slot', 'depth_chart', `${layer}:${slotCode}:${rank}`, { playerId });
}

export async function upsertSubs(layer: ChartLayer, subs: FormationSub[]): Promise<void> {
  if (subs.length === 0) return;
  const db = await getDb();
  for (const sub of subs) {
    await db
      .insert(formationSubs)
      .values({
        layer,
        leagueId: DEFAULT_LEAGUE_ID,
        formationId: sub.formationId,
        slotKey: sub.slotKey,
        mode: sub.mode,
        playerId: sub.playerId,
        inheritSlotCode: sub.inheritSlotCode,
        inheritRank: sub.inheritRank,
        note: sub.note,
      })
      .onConflictDoUpdate({
        target: [
          formationSubs.layer,
          formationSubs.leagueId,
          formationSubs.formationId,
          formationSubs.slotKey,
        ],
        set: {
          mode: sub.mode,
          playerId: sub.playerId,
          inheritSlotCode: sub.inheritSlotCode,
          inheritRank: sub.inheritRank,
          note: sub.note,
        },
      });
  }
  await recordAudit('upsert-subs', 'formation_sub', layer, { count: subs.length });
}

export async function clearSubs(
  layer: ChartLayer,
  keys: { formationId: string; slotKey: string }[],
): Promise<void> {
  const db = await getDb();
  for (const key of keys) {
    await db
      .delete(formationSubs)
      .where(
        and(
          eq(formationSubs.layer, layer),
          eq(formationSubs.leagueId, DEFAULT_LEAGUE_ID),
          eq(formationSubs.formationId, key.formationId),
          eq(formationSubs.slotKey, key.slotKey),
        ),
      );
  }
  await recordAudit('clear-subs', 'formation_sub', layer, { count: keys.length });
}

export async function setCallSheet(
  planId: string,
  side: Side,
  sheet: Record<string, Concept[]>,
): Promise<void> {
  const db = await getDb();
  await db
    .delete(callSheetEntries)
    .where(and(eq(callSheetEntries.planId, planId), eq(callSheetEntries.side, side)));

  const rows = Object.entries(sheet).flatMap(([bucketId, concepts]) =>
    concepts.map((concept, index) => ({
      planId,
      side,
      bucketId,
      priority: index + 1,
      concept,
    })),
  );
  if (rows.length) await db.insert(callSheetEntries).values(rows);
  await recordAudit('set-call-sheet', 'call_sheet', `${planId}:${side}`, { buckets: Object.keys(sheet).length });
}

export async function createDriveRow(input: {
  opponent: string;
  down: number;
  distance: number;
  yardLine: number;
  quarter: number;
  clockSeconds: number;
  scoreDiff: number;
}): Promise<string> {
  const db = await getDb();
  const id = `drive-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  await db.insert(drives).values({
    id,
    leagueId: DEFAULT_LEAGUE_ID,
    opponent: input.opponent,
    side: 'offense',
    down: input.down,
    distance: input.distance,
    yardLine: input.yardLine,
    quarter: input.quarter,
    clockSeconds: input.clockSeconds,
    scoreDiff: input.scoreDiff,
  });
  return id;
}

export async function updateDriveRow(
  id: string,
  state: {
    down: number;
    distance: number;
    yardLine: number;
    quarter: number;
    clockSeconds: number;
    scoreDiff: number;
    status: string;
  },
): Promise<void> {
  const db = await getDb();
  await db.update(drives).set(state).where(eq(drives.id, id));
}

export async function addDriveCall(input: {
  driveId: string;
  sequence: number;
  formationId: string;
  formationName: string;
  playId: string;
  playName: string;
  concept: string;
  bucketId: string;
  outcome: string;
  down: number;
  distance: number;
  yardLine: number;
  reasons: string[];
}): Promise<void> {
  const db = await getDb();
  await db.insert(driveCalls).values(input);
}

export async function addTransaction(input: {
  kind: string;
  season: number;
  week: number;
  counterpartyTeamId: string | null;
  payload: Record<string, unknown>;
  valueIn: number | null;
  valueOut: number | null;
  notes: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.insert(transactions).values({ ...input, leagueId: DEFAULT_LEAGUE_ID });
  await recordAudit('add-transaction', 'transaction', input.kind, input.payload);
}

export async function movePlayersToTeam(playerIds: string[], teamId: string): Promise<void> {
  if (playerIds.length === 0) return;
  const db = await getDb();
  await db.update(players).set({ teamId }).where(inArray(players.id, playerIds));
  await db.update(franchisePlayers).set({ teamId }).where(inArray(franchisePlayers.playerId, playerIds));
}

export async function upsertFranchisePlayer(input: {
  playerId: string;
  teamId: string | null;
  capHit: number | null;
  contractYears: number | null;
  devTrait: string | null;
}): Promise<void> {
  const db = await getDb();
  await db
    .insert(franchisePlayers)
    .values({
      playerId: input.playerId,
      teamId: input.teamId,
      capHit: input.capHit,
      contractYears: input.contractYears,
      devTrait: input.devTrait,
      injuryStatus: 'healthy',
      rosterStatus: 'active',
    })
    .onConflictDoUpdate({
      target: franchisePlayers.playerId,
      set: {
        teamId: input.teamId,
        capHit: input.capHit,
        contractYears: input.contractYears,
        devTrait: input.devTrait,
      },
    });
}

export async function recordAudit(
  action: string,
  entity: string,
  entityId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  await db.insert(auditLog).values({ action, entity, entityId, payload });
}

export async function listAudit(limit = 25) {
  const db = await getDb();
  return db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(limit);
}

/* -------------------------------------------------------------------------- */
/* Seeding                                                                    */
/* -------------------------------------------------------------------------- */

function teamRow(seed: SeedTeam) {
  return {
    id: seed.id,
    name: seed.name,
    abbr: seed.abbr,
    conference: seed.conference,
    division: seed.division,
    isUserTeam: seed.isUserTeam ?? false,
    source: 'seed',
  };
}

function playerRow(seed: SeedPlayer, teamId: string) {
  return {
    id: seed.id,
    firstName: seed.first,
    lastName: seed.last,
    position: seed.position,
    jersey: seed.jersey,
    teamId,
    overall: seed.overall,
    age: seed.age,
    heightInches: 72,
    college: 'Demo State',
    ratings: { speed_rating: seed.speed ?? seed.overall - 3 } as Record<string, number | string>,
    salary: (seed.capHit ?? 1_000_000) + 500_000,
    source: 'seed',
  };
}

function franchiseRow(seed: SeedPlayer, teamId: string) {
  return {
    playerId: seed.id,
    teamId,
    contractYears: seed.contractYears ?? 3,
    capHit: seed.capHit ?? 1_000_000,
    devTrait: seed.dev ?? 'normal',
    injuryStatus: seed.injury ?? 'healthy',
    injuryWeeks: seed.injury === 'out' ? 3 : 0,
    rosterStatus: seed.rosterStatus ?? 'active',
    notes: null,
  };
}

/**
 * Best-guess depth chart for a roster.
 *
 * The rule is the one a real roster is built on: a man may appear at more than
 * one spot on the depth chart, but he cannot be the **starter** at two of them.
 * The third tackle can cover both edges; he cannot open the game at left and
 * right tackle at the same time.
 *
 *   1. Situational roles are curated coaching decisions, so they are assigned
 *      first — the nickel back, the third-down back, the sub-package rushers.
 *   2. Every other role then claims a starter who does not start anywhere else,
 *      preferring a player who actually plays that position.
 *   3. Backups spread across players who are not already backing up somewhere,
 *      which is what produces the swing tackle: one backup listed at two spots.
 *
 * A roster thin enough to run out of bodies still ends up repeating someone, and
 * the conflict audit is there to show you exactly where.
 */
function buildSeedDepthChart(roster: SeedPlayer[]): DepthChartState {
  const active = roster.filter((p) => (p.rosterStatus ?? 'active') === 'active');

  /** Eligible players, with a real fit at the position ranked first. */
  const poolFor = (slot: DepthSlot): SeedPlayer[] =>
    [...active]
      .sort((a, b) => {
        const fitA = a.position === slot.code ? 1 : 0;
        const fitB = b.position === slot.code ? 1 : 0;
        if (fitA !== fitB) return fitB - fitA;
        return b.overall - a.overall;
      })
      .filter((p) => slot.eligiblePositions.includes(p.position));

  const chart: DepthChartState = { entries: {} };
  /** Players holding rank 1 somewhere — nobody may hold it twice. */
  const starters = new Set<string>();
  /** How many backup spots each player already covers. */
  const backupUses = new Map<string, number>();

  // 1. Curated situational roles win outright.
  for (const slot of DEPTH_SLOTS) {
    const curated = DEMO_SITUATIONAL[slot.code];
    if (!curated) continue;
    const ranked = curated.slice(0, slot.ranks);
    chart.entries[slot.code] = ranked;
    if (ranked[0]) starters.add(ranked[0]);
    for (const id of ranked.slice(1)) backupUses.set(id, (backupUses.get(id) ?? 0) + 1);
  }

  // 2. One distinct starter per remaining role.
  for (const slot of DEPTH_SLOTS) {
    if (DEMO_SITUATIONAL[slot.code]) continue;
    const pool = poolFor(slot);
    const starter = pool.find((p) => !starters.has(p.id)) ?? pool[0] ?? null;
    const ranked: (string | null)[] = Array.from({ length: slot.ranks }, () => null);
    if (starter) {
      ranked[0] = starter.id;
      starters.add(starter.id);
    }
    chart.entries[slot.code] = ranked;
  }

  // 3. Backups: never twice on the same chart line, and spread before shared.
  for (const slot of DEPTH_SLOTS) {
    if (DEMO_SITUATIONAL[slot.code]) continue;
    const ranked = chart.entries[slot.code]!;
    const pool = poolFor(slot);
    const usedHere = new Set(ranked.filter((id): id is string => Boolean(id)));

    for (let rank = 1; rank < ranked.length; rank += 1) {
      const choice =
        pool.find((p) => !usedHere.has(p.id) && !backupUses.has(p.id)) ??
        pool.find((p) => !usedHere.has(p.id) && (backupUses.get(p.id) ?? 0) < 2) ??
        pool.find((p) => !usedHere.has(p.id)) ??
        null;
      if (!choice) continue;
      ranked[rank] = choice.id;
      usedHere.add(choice.id);
      backupUses.set(choice.id, (backupUses.get(choice.id) ?? 0) + 1);
    }
  }

  return chart;
}

export interface SeedOptions {
  /** Re-seed depth charts and formation subs even if they already exist. */
  force?: boolean;
}

export async function applySeed(options: SeedOptions = {}): Promise<{ teams: number; players: number; formations: number }> {
  const db = await getDb();

  // --- teams and players (seed-owned rows only; imported data is left alone) ---
  const seedTeamIds = [DEMO_TEAM.id, ...CPU_TEAMS.map((t) => t.id)];
  const seedPlayerIds = [
    ...DEMO_ROSTER.map((p) => p.id),
    ...Object.values(CPU_ROSTERS).flatMap((list) => list.map((p) => p.id)),
  ];

  await db.delete(franchisePlayers).where(inArray(franchisePlayers.playerId, seedPlayerIds));
  await db.delete(players).where(inArray(players.id, seedPlayerIds));
  await db.delete(teams).where(inArray(teams.id, seedTeamIds));

  await db.insert(teams).values([DEMO_TEAM, ...CPU_TEAMS].map(teamRow));
  for (const team of [DEMO_TEAM, ...CPU_TEAMS]) {
    const seeds = seedPlayersFor(team.id);
    if (seeds.length === 0) continue;
    await db.insert(players).values(seeds.map((seed) => playerRow(seed, team.id)));
    await db.insert(franchisePlayers).values(seeds.map((seed) => franchiseRow(seed, team.id)));
  }

  // --- league ---
  await db
    .insert(leagues)
    .values({
      id: DEFAULT_LEAGUE_ID,
      name: 'My Franchise',
      season: 2026,
      week: 1,
      userTeamId: DEMO_TEAM.id,
      capTotal: 279_000_000,
    })
    .onConflictDoUpdate({
      target: leagues.id,
      set: { userTeamId: DEMO_TEAM.id, capTotal: 279_000_000 },
    });

  // --- depth chart vocabulary ---
  for (const slot of DEPTH_SLOTS) {
    await db
      .insert(depthSlots)
      .values({
        code: slot.code,
        label: slot.label,
        side: slot.side,
        groupName: slot.group,
        eligiblePositions: slot.eligiblePositions,
        displayOrder: slot.order,
        ranks: slot.ranks,
        situational: slot.situational,
        description: slot.description,
        verified: slot.verified,
      })
      .onConflictDoUpdate({
        target: depthSlots.code,
        set: {
          label: slot.label,
          side: slot.side,
          groupName: slot.group,
          eligiblePositions: slot.eligiblePositions,
          displayOrder: slot.order,
          ranks: slot.ranks,
          situational: slot.situational,
          description: slot.description,
        },
      });
  }

  // --- playbooks ---
  const seedPlaybookIds = PLAYBOOK_SEEDS.map((pb) => pb.id);
  const existingFormations = await db
    .select({ id: formations.id })
    .from(formations)
    .where(inArray(formations.playbookId, seedPlaybookIds));
  const existingFormationIds = existingFormations.map((f) => f.id);
  if (existingFormationIds.length) {
    await db.delete(formationSlots).where(inArray(formationSlots.formationId, existingFormationIds));
    await db.delete(formationPlays).where(inArray(formationPlays.formationId, existingFormationIds));
    await db.delete(formations).where(inArray(formations.id, existingFormationIds));
  }
  await db.delete(playbooks).where(inArray(playbooks.id, seedPlaybookIds));

  let formationCount = 0;
  for (const pb of PLAYBOOK_SEEDS) {
    await db.insert(playbooks).values({
      id: pb.id,
      name: pb.name,
      team: pb.team,
      side: pb.side,
      source: pb.source,
      season: '27',
      url: pb.url ?? null,
    });

    let order = 0;
    for (const seed of pb.formations) {
      order += 1;
      const asFormation: Formation = {
        id: seed.id,
        playbookId: pb.id,
        name: seed.name,
        set: seed.set,
        personnel: seed.personnel ?? '',
        distribution: seed.distribution,
        side: pb.side,
        family: '',
        slots: seed.slots.map((slot) => ({
          key: slot.key,
          label: slot.label,
          roleCode: slot.role,
          roleRank: slot.rank ?? 1,
          x: slot.x,
          y: slot.y,
          eligiblePositions: slot.eligible,
          positionFallback: slot.fallback ?? null,
        })),
        plays: seed.plays.map((name) => ({ id: `${seed.id}:${name}`, name })),
        notes: seed.notes ?? null,
      };
      const klass = classifyFormation(asFormation);

      await db.insert(formations).values({
        id: seed.id,
        playbookId: pb.id,
        name: seed.name,
        set: seed.set,
        personnel: seed.personnel ?? derivePersonnel(asFormation),
        distribution: seed.distribution,
        side: pb.side,
        family: familyKey(klass),
        notes: seed.notes ?? null,
        sortOrder: order,
      });

      await db.insert(formationSlots).values(
        asFormation.slots.map((slot) => ({
          formationId: seed.id,
          key: slot.key,
          label: slot.label,
          roleCode: slot.roleCode,
          roleRank: slot.roleRank,
          x: slot.x,
          y: slot.y,
          eligiblePositions: slot.eligiblePositions,
          positionFallback: slot.positionFallback,
        })),
      );

      if (asFormation.plays.length) {
        await db.insert(formationPlays).values(
          asFormation.plays.map((play) => ({
            id: play.id,
            formationId: seed.id,
            name: play.name,
            conceptOverride: null,
            familyOverride: null,
          })),
        );
      }
      formationCount += 1;
    }
  }

  // --- depth charts: the game layer starts as a copy of your plan ---
  const existingEntries = await db
    .select({ layer: depthChartEntries.layer })
    .from(depthChartEntries)
    .limit(1);
  if (options.force || existingEntries.length === 0) {
    await db.delete(depthChartEntries).where(eq(depthChartEntries.leagueId, DEFAULT_LEAGUE_ID));
    const chart = buildSeedDepthChart(DEMO_ROSTER);
    const rows = (['game', 'plan'] as const).flatMap((layer) =>
      Object.entries(chart.entries).flatMap(([slotCode, ranked]) =>
        ranked
          .map((playerId, index) => ({
            layer,
            leagueId: DEFAULT_LEAGUE_ID,
            slotCode,
            rank: index + 1,
            playerId,
          }))
          .filter((row) => row.playerId),
      ),
    );
    if (rows.length) await db.insert(depthChartEntries).values(rows);
  }

  // --- default plan and call sheet ---
  await db
    .insert(plans)
    .values({
      id: 'plan-default',
      leagueId: DEFAULT_LEAGUE_ID,
      name: 'Base plan',
      playbookId: 'pb-shanahan',
      isDefault: true,
    })
    .onConflictDoUpdate({
      target: plans.id,
      set: { name: 'Base plan', playbookId: 'pb-shanahan', isDefault: true },
    });

  const sheetRows = await db.select({ id: callSheetEntries.planId }).from(callSheetEntries).limit(1);
  if (options.force || sheetRows.length === 0) {
    await db.delete(callSheetEntries).where(eq(callSheetEntries.planId, 'plan-default'));
    const rows = Object.entries(DEFAULT_PRIORITIES).flatMap(([bucketId, concepts]) =>
      concepts.map((concept, index) => ({
        planId: 'plan-default',
        side: 'offense',
        bucketId,
        priority: index + 1,
        concept,
      })),
    );
    if (rows.length) await db.insert(callSheetEntries).values(rows);
  }

  await recordAudit('seed', 'database', null, { players: seedPlayerIds.length, formations: formationCount });

  return { teams: 1 + CPU_TEAMS.length, players: seedPlayerIds.length, formations: formationCount };
}
