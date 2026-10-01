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
  tradeTargets,
  transactions,
} from './schema';
import { readAttribute } from '@/domain/archetypes';
import { buildTeamDepthChart, type ChartCandidate } from '@/domain/depthChartSeed';
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
    weightLbs: row.weightLbs ?? null,
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

/* -------------------------------------------------------------------------- */
/* Trade shortlist                                                            */
/* -------------------------------------------------------------------------- */

export type TradeTarget = typeof tradeTargets.$inferSelect;

/** Everyone the owner is tracking, newest first. */
export async function listTradeTargets(): Promise<TradeTarget[]> {
  const db = await getDb();
  return db.select().from(tradeTargets).orderBy(desc(tradeTargets.createdAt));
}

export async function addTradeTarget(playerId: string, note: string | null = null): Promise<void> {
  const db = await getDb();
  await db
    .insert(tradeTargets)
    .values({ playerId, leagueId: DEFAULT_LEAGUE_ID, note })
    .onConflictDoUpdate({ target: tradeTargets.playerId, set: { note } });
}

export async function removeTradeTarget(playerId: string): Promise<void> {
  const db = await getDb();
  await db.delete(tradeTargets).where(eq(tradeTargets.playerId, playerId));
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

export interface SeedChartResult {
  teamId: string;
  layers: ChartLayer[];
  /** Players on the team's published roster. */
  players: number;
  /** Ranked spots written. */
  placed: number;
  /** Distinct men given a starting job. */
  starters: number;
  /** Roles nobody on the roster could fill. */
  empty: string[];
  notes: string[];
}

/**
 * Build the depth chart from a team's imported roster.
 *
 * This is the bridge from real Madden 27 ratings to a usable plan: the feed is a flat
 * player list, and every screen in the app reads roles. [`buildTeamDepthChart`](src/domain/depthChartSeed.ts)
 * decides who goes where, and this writes the result to the chart layers.
 *
 * It refuses to overwrite a chart you have already filled in unless `force` is passed:
 * a chart is authored work ([`HANDOFF.md`](HANDOFF.md) §2.5), and a seeded one is a
 * starting point, not the game's own chart. Formation subs are never touched.
 */
export async function seedDepthChartFromRoster(
  teamId: string,
  options: { layers?: ChartLayer[]; force?: boolean } = {},
): Promise<SeedChartResult> {
  const db = await getDb();
  const layers: ChartLayer[] = options.layers ?? ['game', 'plan'];

  const existing = await db
    .select({ slotCode: depthChartEntries.slotCode })
    .from(depthChartEntries)
    .where(eq(depthChartEntries.leagueId, DEFAULT_LEAGUE_ID))
    .limit(1);
  if (existing.length > 0 && !options.force) {
    throw new Error(
      'Your depth chart is not empty. Seeding replaces it, so pass --force (or tick the replace box) to go ahead.',
    );
  }

  const roster = await getRoster(teamId);
  const candidates: ChartCandidate[] = roster
    .filter((player) => player.franchise.rosterStatus !== 'free-agent')
    .map((player) => ({
      id: player.id,
      position: player.position,
      overall: player.overall,
      speed: readAttribute(player.ratings, 'speed'),
    }));
  if (candidates.length === 0) {
    throw new Error(`No players on ${teamId}. Run \`npm run import:ratings\` first.`);
  }

  const chart = buildTeamDepthChart(candidates);

  await db
    .delete(depthChartEntries)
    .where(
      and(
        eq(depthChartEntries.leagueId, DEFAULT_LEAGUE_ID),
        inArray(depthChartEntries.layer, layers),
      ),
    );

  const rows = layers.flatMap((layer) =>
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

  const notes = [...chart.notes];
  const pinned = await db.select({ layer: formationSubs.layer }).from(formationSubs).limit(1);
  if (pinned.length > 0) {
    notes.push(
      'Formation subs were left alone. Pin them again if they pointed at players who are no longer on this roster.',
    );
  }

  await recordAudit('seed-depth-chart', 'depthChart', teamId, {
    players: candidates.length,
    placed: rows.length,
    layers,
  });

  return {
    teamId,
    layers,
    players: candidates.length,
    placed: rows.length,
    starters: chart.starters,
    empty: chart.empty,
    notes,
  };
}

/** Make a team the one this franchise is played as. */
export async function setUserTeam(teamId: string): Promise<void> {
  const db = await getDb();
  await db.update(leagues).set({ userTeamId: teamId }).where(eq(leagues.id, DEFAULT_LEAGUE_ID));
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
    getRoster(),
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

  return { ctx: { depthChart: chart, subs, playersById }, formations: list, roster };
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

/**
 * Old depth-chart role -> the one Madden 26 gave it, so a chart filled in before
 * the rename carries across instead of going blank. `H` has no successor: Madden
 * has no holder position, and the field-goal unit consults the punter instead.
 */
const RETIRED_ROLE_REPLACEMENTS: Record<string, string | undefined> = {
  LE: 'LEDG',
  RE: 'REDG',
  LOLB: 'SAM',
  MLB: 'MIKE',
  ROLB: 'WILL',
  NB: 'SLCB',
};

/**
 * Reconciles stored data with the current slot vocabulary.
 *
 * Retired roles are removed from the vocabulary, and any depth-chart entry
 * sitting on one moves to its replacement at the same rank — but only into a
 * vacancy. A chart you have already filled in under the new codes always wins,
 * and nothing is ever invented: an empty spot stays empty and shows up as one.
 */
async function reconcileSlotVocabulary(): Promise<{ retired: string[]; moved: number }> {
  const db = await getDb();
  const known = new Set(DEPTH_SLOTS.map((slot) => slot.code));

  const stored = await db.select({ code: depthSlots.code }).from(depthSlots);
  const retired = stored.map((row) => row.code).filter((code) => !known.has(code));
  for (const code of retired) {
    await db.delete(depthSlots).where(eq(depthSlots.code, code));
  }
  if (retired.length === 0) return { retired, moved: 0 };

  const retiredSet = new Set(retired);
  const rows = await db
    .select()
    .from(depthChartEntries)
    .where(eq(depthChartEntries.leagueId, DEFAULT_LEAGUE_ID));
  const occupied = new Set(
    rows
      .filter((row) => !retiredSet.has(row.slotCode))
      .map((row) => `${row.layer}:${row.slotCode}:${row.rank}`),
  );

  const moves: {
    layer: string;
    leagueId: string;
    slotCode: string;
    rank: number;
    playerId: string | null;
  }[] = [];
  for (const row of rows) {
    if (!retiredSet.has(row.slotCode)) continue;
    const replacement = RETIRED_ROLE_REPLACEMENTS[row.slotCode];
    const target = replacement ? `${row.layer}:${replacement}:${row.rank}` : '';
    if (replacement && row.playerId && !occupied.has(target)) {
      occupied.add(target);
      moves.push({
        layer: row.layer,
        leagueId: row.leagueId,
        slotCode: replacement,
        rank: row.rank,
        playerId: row.playerId,
      });
    }
    await db
      .delete(depthChartEntries)
      .where(
        and(
          eq(depthChartEntries.leagueId, row.leagueId),
          eq(depthChartEntries.layer, row.layer),
          eq(depthChartEntries.slotCode, row.slotCode),
          eq(depthChartEntries.rank, row.rank),
        ),
      );
  }

  if (moves.length) await db.insert(depthChartEntries).values(moves);
  return { retired, moved: moves.length };
}

export interface SeedOptions {
  /** Re-seed the default call sheet even if it already exists. */
  force?: boolean;
}

export interface SeedResult {
  formations: number;
  /** Roles the vocabulary no longer contains, e.g. everything Madden 26 replaced. */
  retiredRoles: string[];
  /** Depth-chart entries carried onto a renamed role at the same rank. */
  migratedEntries: number;
}

export async function applySeed(options: SeedOptions = {}): Promise<SeedResult> {
  const db = await getDb();

  // Teams and players are not seeded. The app runs on the Madden 27 ratings import
  // (`npm run import:ratings`), so a fresh install has no roster until you run it —
  // there is no demo league to fall back on. This row exists only so the app has a
  // franchise to hang state on; set your team with `seed:chart --user-team` or on the
  // League screen once a ratings import has landed.
  await db
    .insert(leagues)
    .values({
      id: DEFAULT_LEAGUE_ID,
      name: 'My Franchise',
      season: 2026,
      week: 1,
      userTeamId: null,
      capTotal: 279_000_000,
    })
    .onConflictDoUpdate({
      target: leagues.id,
      set: { capTotal: 279_000_000 },
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
  const vocabulary = await reconcileSlotVocabulary();

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

  await recordAudit('seed', 'database', null, { formations: formationCount });

  return {
    formations: formationCount,
    retiredRoles: vocabulary.retired,
    migratedEntries: vocabulary.moved,
  };
}
