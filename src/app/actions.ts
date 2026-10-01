'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { applyMigrations } from '@/db/migrate';
import { persistRatings } from '@/db/import';
import {
  addDriveCall,
  addTransaction,
  buildResolveContext,
  clearSubs,
  createDriveRow,
  getActiveDrive,
  getDepthChart,
  getDriveState,
  getFormations,
  getLeague,
  getRoster,
  setCallSheet,
  setDepthChartEntry,
  updateDriveRow,
  upsertFranchisePlayer,
  upsertSubs,
  movePlayersToTeam,
  addTradeTarget,
  removeTradeTarget,
  seedDepthChartFromRoster,
  setUserTeam,
  DEFAULT_LEAGUE_ID,
} from '@/db/repo';
import { getDb } from '@/db/index';
import { players as playersTable } from '@/db/schema';
import { tagPlay } from '@/domain/concepts';
import { pickValue, playerValue } from '@/domain/tradeValue';
import { advanceDrive, driveSituation, type CoarseOutcome } from '@/domain/drive';
import { planBulkAssignment, type FormationFilter } from '@/domain/bulk';
import { resolveBucket } from '@/domain/callSheet';
import type { Concept } from '@/domain/concepts';
import type { FormationSub, Side } from '@/domain/types';
import { restoreSnapshot, type Snapshot } from '@/db/snapshot';
import { fetchRatings } from '@/lib/importers/eaRatings';
import { findLatestDropArtifact, loadDropArtifact } from '@/lib/importers/dropArtifact';
import { requireSession } from '@/lib/auth';
import { resolveThemeMode } from '@/lib/theme';
import { writeThemeMode } from '@/lib/themeCookie';

const text = (form: FormData, key: string): string => String(form.get(key) ?? '').trim();
const optional = (form: FormData, key: string): string | null => {
  const value = text(form, key);
  return value === '' ? null : value;
};
const number = (form: FormData, key: string, fallback: number): number => {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
};

async function currentPlanId(): Promise<string> {
  return 'plan-default';
}

/** Depth chart edit — this is what cascades through every formation. */
export async function setDepthSlotAction(formData: FormData): Promise<void> {
  await requireSession();
  const layer = text(formData, 'layer') === 'game' ? 'game' : 'plan';
  const slotCode = text(formData, 'slotCode');
  const rank = number(formData, 'rank', 1);
  const playerId = optional(formData, 'playerId');
  if (!slotCode) return;

  await setDepthChartEntry(layer, slotCode, rank, playerId);
  revalidatePath('/depth-chart');
  revalidatePath('/formations');
  revalidatePath('/personnel');
  revalidatePath('/checklist');
}

export async function toggleVocabularyVerifiedAction(formData: FormData): Promise<void> {
  await requireSession();
  const code = text(formData, 'slotCode');
  const verified = text(formData, 'verified') === '1';
  const db = await getDb();
  const { depthSlots } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  await db.update(depthSlots).set({ verified }).where(eq(depthSlots.code, code));
  revalidatePath('/depth-chart');
}

/** Pin a player into one formation (an in-game formation sub). */
export async function assignFormationSlotAction(formData: FormData): Promise<void> {
  await requireSession();
  const formationId = text(formData, 'formationId');
  const slotKey = text(formData, 'slotKey');
  const playerId = optional(formData, 'playerId');
  if (!formationId || !slotKey) return;

  if (!playerId) {
    await clearSubs('plan', [{ formationId, slotKey }]);
  } else {
    await upsertSubs('plan', [
      {
        formationId,
        slotKey,
        mode: 'override',
        playerId,
        inheritSlotCode: null,
        inheritRank: null,
        note: optional(formData, 'note'),
      },
    ]);
  }
  revalidatePath(`/formations/${formationId}`);
  revalidatePath('/personnel');
  revalidatePath('/checklist');
}

/** Revert a formation spot to inheriting from the depth chart. */
export async function clearFormationSlotAction(formData: FormData): Promise<void> {
  await requireSession();
  const formationId = text(formData, 'formationId');
  const slotKey = text(formData, 'slotKey');
  await clearSubs('plan', [{ formationId, slotKey }]);
  revalidatePath(`/formations/${formationId}`);
  revalidatePath('/personnel');
  revalidatePath('/checklist');
}

/** Point a formation spot at a different depth chart role than its default. */
export async function rebindFormationSlotAction(formData: FormData): Promise<void> {
  await requireSession();
  const formationId = text(formData, 'formationId');
  const slotKey = text(formData, 'slotKey');
  const roleCode = optional(formData, 'roleCode');
  const rank = number(formData, 'roleRank', 1);
  if (!formationId || !slotKey) return;

  await upsertSubs('plan', [
    {
      formationId,
      slotKey,
      mode: 'inherit',
      playerId: null,
      inheritSlotCode: roleCode,
      inheritRank: roleCode ? rank : null,
      note: 'rebound to a different depth chart role',
    },
  ]);
  revalidatePath(`/formations/${formationId}`);
}

/** Assign one player across many formations at once. */
export async function bulkAssignAction(formData: FormData): Promise<void> {
  await requireSession();
  const role = text(formData, 'role');
  const playerId = optional(formData, 'playerId');
  if (!role) return;

  const filter: FormationFilter = {
    side: (optional(formData, 'side') as Side | null) ?? undefined,
    set: optional(formData, 'set') ?? undefined,
    personnel: optional(formData, 'personnel') ?? undefined,
    distribution: optional(formData, 'distribution') ?? undefined,
    search: optional(formData, 'search') ?? undefined,
  };

  const formations = await getFormations();
  const { ctx } = await buildResolveContext('plan', formations);
  const plan = planBulkAssignment(formations, ctx, filter, {
    role,
    playerId,
    note: optional(formData, 'note'),
  });

  if (plan.overrides.length) await upsertSubs('plan', plan.overrides);
  if (plan.cleared.length) {
    await clearSubs(
      'plan',
      plan.cleared.map((entry) => ({ formationId: entry.formationId, slotKey: entry.slotKey })),
    );
  }

  revalidatePath('/personnel');
  revalidatePath('/formations');
  redirect(`/personnel?bulk=${playerId ? 'assigned' : 'cleared'}&count=${plan.overrides.length + plan.cleared.length}&skipped=${plan.skipped.length}`);
}

/** Record that what you planned is now what the game has. */
export async function markPlanAppliedAction(formData: FormData): Promise<void> {
  await requireSession();
  const scope = text(formData, 'scope');

  if (scope === 'depth-chart') {
    const plan = await getDepthChart('plan');
    for (const [slotCode, ranked] of Object.entries(plan.entries)) {
      for (let index = 0; index < ranked.length; index += 1) {
        await setDepthChartEntry('game', slotCode, index + 1, ranked[index] ?? null);
      }
    }
  }

  revalidatePath('/checklist');
  revalidatePath('/depth-chart');
  redirect('/checklist?applied=1');
}

export async function copyGameDepthChartToPlanAction(): Promise<void> {
  await requireSession();
  const game = await getDepthChart('game');
  for (const [slotCode, ranked] of Object.entries(game.entries)) {
    for (let index = 0; index < ranked.length; index += 1) {
      await setDepthChartEntry('plan', slotCode, index + 1, ranked[index] ?? null);
    }
  }
  revalidatePath('/depth-chart');
  revalidatePath('/checklist');
  redirect('/depth-chart?copied=1');
}

/** Edit one bucket of the call sheet. */
export async function setBucketAction(formData: FormData): Promise<void> {
  await requireSession();
  const bucketId = text(formData, 'bucketId');
  const planId = await currentPlanId();
  const concepts = text(formData, 'concepts')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean) as Concept[];

  const { getCallSheet } = await import('@/db/repo');
  const sheet = await getCallSheet(planId, 'offense');
  await setCallSheet(planId, 'offense', { ...sheet, [bucketId]: concepts });
  revalidatePath('/callsheet');
}

export async function createDriveAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = await createDriveRow({
    opponent: text(formData, 'opponent') || 'CPU',
    down: number(formData, 'down', 1),
    distance: number(formData, 'distance', 10),
    yardLine: number(formData, 'yardLine', 25),
    quarter: number(formData, 'quarter', 1),
    clockSeconds: number(formData, 'clockSeconds', 900),
    scoreDiff: number(formData, 'scoreDiff', 0),
  });
  revalidatePath('/callsheet');
  redirect(`/callsheet?drive=${id}`);
}

/** One tap per play: record the call and the coarse outcome, then move the chain. */
export async function advanceDriveAction(formData: FormData): Promise<void> {
  await requireSession();
  const driveId = text(formData, 'driveId');
  const outcome = text(formData, 'outcome') as CoarseOutcome;
  const formationId = text(formData, 'formationId');
  const playId = text(formData, 'playId');
  const playName = text(formData, 'playName');
  if (!driveId || !outcome) return;

  const state = await getDriveState(driveId);
  if (!state) return;

  const formation = (await getFormations()).find((f) => f.id === formationId);
  const bucket = resolveBucket(driveSituation(state));
  const concept = tagPlay(playName).concept;
  const reasons = text(formData, 'reasons')
    .split('|')
    .map((value) => value.trim())
    .filter(Boolean);

  const { state: next } = advanceDrive(
    state,
    {
      formationId,
      formationName: formation?.name ?? formationId,
      playId,
      playName,
      concept,
      bucket,
    },
    outcome,
  );

  await addDriveCall({
    driveId,
    sequence: state.calls.length + 1,
    formationId,
    formationName: formation?.name ?? formationId,
    playId,
    playName,
    concept,
    bucketId: bucket,
    outcome,
    down: state.down,
    distance: state.distance,
    yardLine: state.yardLine,
    reasons,
  });
  await updateDriveRow(driveId, {
    down: next.down,
    distance: next.distance,
    yardLine: next.yardLine,
    quarter: next.quarter,
    clockSeconds: next.clockSeconds,
    scoreDiff: next.scoreDiff,
    status: next.status,
  });
  revalidatePath('/callsheet');
}

export async function logTradeAction(formData: FormData): Promise<void> {
  await requireSession();
  const league = await getLeague();
  const counterparty = optional(formData, 'counterpartyTeamId');
  const incomingPlayerId = optional(formData, 'incomingPlayerId');
  const outgoingPlayerId = optional(formData, 'outgoingPlayerId');
  const incomingPick = optional(formData, 'incomingPick');
  const outgoingPick = optional(formData, 'outgoingPick');
  const notes = optional(formData, 'notes');

  // Values come from the same valuation the UI shows, so the log is consistent
  // with what you saw when you decided to make the trade.
  const roster = await getRoster();
  const valueOfPlayer = (playerId: string | null): number => {
    if (!playerId) return 0;
    const player = roster.find((entry) => entry.id === playerId);
    if (!player) return 0;
    return playerValue({
      overall: player.overall,
      age: player.age,
      devTrait: player.franchise.devTrait,
      capHit: player.franchise.capHit,
    });
  };
  const valueOfPick = (label: string | null): number => {
    if (!label) return 0;
    const round = Number(/r(?:ound)?\s*(\d)/i.exec(label)?.[1] ?? 0);
    return round ? pickValue(round, 16) : 0;
  };

  const valueIn = valueOfPlayer(incomingPlayerId) + valueOfPick(incomingPick);
  const valueOut = valueOfPlayer(outgoingPlayerId) + valueOfPick(outgoingPick);

  const incoming: Record<string, unknown> = {};
  const outgoing: Record<string, unknown> = {};
  if (incomingPlayerId) incoming.playerId = incomingPlayerId;
  if (incomingPick) incoming.pick = incomingPick;
  if (outgoingPlayerId) outgoing.playerId = outgoingPlayerId;
  if (outgoingPick) outgoing.pick = outgoingPick;

  if (Object.keys(incoming).length === 0 && Object.keys(outgoing).length === 0) {
    redirect('/transactions?error=empty');
  }

  await addTransaction({
    kind: 'trade',
    season: league?.season ?? 2026,
    week: league?.week ?? 1,
    counterpartyTeamId: counterparty,
    payload: { incoming, outgoing },
    valueIn,
    valueOut,
    notes,
  });

  // Move the players so your roster reflects the trade immediately.
  if (incomingPlayerId && league?.userTeamId) {
    await movePlayersToTeam([incomingPlayerId], league.userTeamId);
  }
  if (outgoingPlayerId && counterparty) {
    await movePlayersToTeam([outgoingPlayerId], counterparty);
  }

  revalidatePath('/transactions');
  revalidatePath('/team');
  redirect('/transactions?logged=trade');
}

/** Add a drafted rookie to the roster and log the pick. */
export async function addRookieAction(formData: FormData): Promise<void> {
  await requireSession();
  const league = await getLeague();
  const firstName = text(formData, 'firstName');
  const lastName = text(formData, 'lastName');
  const position = text(formData, 'position');
  if (!firstName || !lastName || !position) redirect('/transactions?error=rookie');

  const overall = number(formData, 'overall', 70);
  const capHit = number(formData, 'capHit', 1_500_000);
  const contractYears = number(formData, 'contractYears', 4);
  const devTrait = text(formData, 'devTrait') || 'normal';
  const round = number(formData, 'round', 1);
  const id = `rookie-${Date.now().toString(36)}-${lastName.toLowerCase().replace(/[^a-z]/g, '')}`;

  const db = await getDb();
  await db.insert(playersTable).values({
    id,
    firstName,
    lastName,
    position,
    jersey: null,
    teamId: league?.userTeamId ?? null,
    overall,
    age: 22,
    heightInches: 72,
    college: null,
    ratings: {},
    salary: capHit,
    source: 'manual',
  });
  await upsertFranchisePlayer({
    playerId: id,
    teamId: league?.userTeamId ?? null,
    capHit,
    contractYears,
    devTrait,
  });
  await addTransaction({
    kind: 'draft',
    season: league?.season ?? 2026,
    week: league?.week ?? 1,
    counterpartyTeamId: null,
    payload: { playerId: id, name: `${firstName} ${lastName}`, position, overall, round },
    valueIn: null,
    valueOut: null,
    notes: optional(formData, 'notes'),
  });

  revalidatePath('/transactions');
  revalidatePath('/team');
  revalidatePath('/depth-chart');
  redirect('/transactions?logged=rookie');
}

/** Re-import real Madden rosters from EA's public ratings feed. */
/**
 * Build the depth chart from a real Madden 27 roster.
 *
 * Seeding is an explicit choice with an explicit replace flag, because a chart you have
 * edited is authored work and must never be silently overwritten.
 */
export async function seedDepthChartAction(formData: FormData): Promise<void> {
  await requireSession();
  const teamId = text(formData, 'teamId');
  const force = text(formData, 'force') === '1';
  const makeTeam = text(formData, 'makeTeam') === '1';
  if (!teamId) return;

  let query: string;
  try {
    const result = await seedDepthChartFromRoster(teamId, { force });
    if (makeTeam) await setUserTeam(teamId);
    const params = new URLSearchParams({ seeded: result.teamId });
    if (makeTeam) params.set('teamSet', '1');
    if (result.empty.length) params.set('unfilled', result.empty.join(','));
    query = params.toString();
  } catch (error) {
    query = `seedError=${encodeURIComponent((error as Error).message.slice(0, 200))}`;
  }

  revalidatePath('/', 'layout');
  revalidatePath('/depth-chart');
  revalidatePath('/team');
  revalidatePath('/scheme');
  revalidatePath('/personnel');
  revalidatePath('/formations');
  revalidatePath('/checklist');
  redirect(`/depth-chart?${query}`);
}

/** Add or remove a league player from the trade shortlist. */
export async function setTradeTargetAction(formData: FormData): Promise<void> {
  await requireSession();
  const playerId = text(formData, 'playerId');
  if (!playerId) return;
  if (text(formData, 'intent') === 'remove') {
    await removeTradeTarget(playerId);
  } else {
    await addTradeTarget(playerId, optional(formData, 'note'));
  }
  revalidatePath('/league', 'layout');
}

export async function importRatingsAction(): Promise<void> {
  await requireSession();
  await applyMigrations();
  try {
    // Prefer the committed Madden 27 artifact. Fetching EA at request time would
    // silently produce an empty league outside a browser context, so the only
    // network path stays the older API as a fallback. See RATINGS.md §2.1.
    const artifact = await findLatestDropArtifact();
    const result = artifact ? await loadDropArtifact(artifact) : await fetchRatings();
    await persistRatings(result);
    revalidatePath('/', 'layout');
    redirect(`/?imported=${result.players.length}&slug=${result.slug}`);
  } catch (error) {
    redirect(`/?importError=${encodeURIComponent((error as Error).message.slice(0, 180))}`);
  }
}

export async function refreshDriveRecommendationAction(formData: FormData): Promise<void> {
  await requireSession();
  const driveId = text(formData, 'driveId');
  const leans = formData.getAll('leans').map((value) => String(value));
  const drive = driveId ? await getDriveState(driveId) : await getActiveDrive();
  if (!drive) redirect('/callsheet');

  // The recommendation itself is recomputed by the call sheet from the drive
  // plus the leans, so this only has to persist the leans you tapped.
  redirect(`/callsheet?drive=${drive.id}&leans=${leans.join(',')}`);
}

export async function markDriveCompleteAction(formData: FormData): Promise<void> {
  await requireSession();
  const driveId = text(formData, 'driveId');
  const drive = await getDriveState(driveId);
  if (drive) {
    // Explicit fields only: `updateDriveRow` writes straight to the drives row.
    await updateDriveRow(driveId, {
      down: drive.down,
      distance: drive.distance,
      yardLine: drive.yardLine,
      quarter: drive.quarter,
      clockSeconds: drive.clockSeconds,
      scoreDiff: drive.scoreDiff,
      status: 'ended',
    });
  }
  revalidatePath('/callsheet');
  redirect('/callsheet');
}

/** Keep the league clock and cap in step with the franchise you are playing. */
export async function updateLeagueAction(formData: FormData): Promise<void> {
  await requireSession();
  const db = await getDb();
  const { leagues } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  await db
    .update(leagues)
    .set({
      season: number(formData, 'season', 2026),
      week: number(formData, 'week', 1),
      capTotal: number(formData, 'capTotal', 279_000_000),
      updatedAt: new Date(),
    })
    .where(eq(leagues.id, DEFAULT_LEAGUE_ID));
  revalidatePath('/', 'layout');
  redirect('/team?leagueSaved=1');
}

/** Restore a downloaded snapshot, replacing the current franchise state. */
export async function restoreSnapshotAction(formData: FormData): Promise<void> {
  await requireSession();
  const file = formData.get('snapshot');
  if (!(file instanceof File) || file.size === 0) redirect('/team?restoreError=No%20file%20attached');

  try {
    const parsed = JSON.parse(await file.text()) as Snapshot;
    const written = await restoreSnapshot(parsed);
    revalidatePath('/', 'layout');
    redirect(`/team?restored=${Object.values(written).reduce((sum, count) => sum + count, 0)}`);
  } catch (error) {
    redirect(`/team?restoreError=${encodeURIComponent((error as Error).message.slice(0, 160))}`);
  }
}

/**
 * Persist the light/dark preference. Deliberately does not require a session so
 * the login screen can be themed too.
 */
export async function setThemeAction(formData: FormData): Promise<void> {
  const mode = resolveThemeMode(text(formData, 'mode'));
  await writeThemeMode(mode);
  revalidatePath('/', 'layout');
}

export async function setUserTeamAction(formData: FormData): Promise<void> {
  await requireSession();
  const teamId = text(formData, 'teamId');
  if (!teamId) return;
  const db = await getDb();
  const { leagues } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  await db.update(leagues).set({ userTeamId: teamId }).where(eq(leagues.id, DEFAULT_LEAGUE_ID));
  revalidatePath('/', 'layout');
  redirect('/team?teamSet=1');
}
