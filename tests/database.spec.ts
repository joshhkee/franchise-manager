import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Integration coverage for the storage layer.
 *
 * The domain tests never touch a database; this file exists to catch the class of
 * bug they cannot — schema drift, migrations that do not apply cleanly, a write
 * that persists the wrong column. It runs against a throwaway embedded Postgres
 * in a temp directory, so it never touches your franchise.
 */

const dataDir = mkdtempSync(path.join(os.tmpdir(), 'fm-db-test-'));
process.env.DATA_DIR = dataDir;
delete process.env.DATABASE_URL;

const repo = await import('@/db/repo');
const { applyMigrations } = await import('@/db/migrate');
const { closeDb } = await import('@/db/index');
const { exportSnapshot, restoreSnapshot } = await import('@/db/snapshot');
const { persistRatings } = await import('@/db/import');
const { findLatestDropArtifact, loadDropArtifact } = await import('@/lib/importers/dropArtifact');
const { DEPTH_SLOTS } = await import('@/domain/depthSlots');
const { resolveAll } = await import('@/domain/resolution');

const USER_TEAM = 'ATL';
let formationCount = 0;
let userTeamId = '';

beforeAll(async () => {
  await applyMigrations();
  // The seed ships scheme data only now — vocabulary, playbooks, the default plan.
  await repo.applySeed();
  // Rosters come from the committed Madden 27 artifact through the same path
  // `import:ratings` uses, so these tests exercise the real import.
  const artifact = await findLatestDropArtifact();
  if (!artifact) throw new Error('No Madden 27 ratings artifact in data/imports/.');
  await persistRatings(await loadDropArtifact(artifact));
  await repo.setUserTeam(USER_TEAM);
  // Real rosters arrive with no chart at all; build one so the resolution tests have roles.
  await repo.seedDepthChartFromRoster(USER_TEAM, { force: true });
  const league = await repo.getLeague();
  userTeamId = league?.userTeamId ?? '';
  formationCount = (await repo.getFormations()).length;
}, 300_000);

afterAll(async () => {
  await closeDb();
  rmSync(dataDir, { recursive: true, force: true });
});

describe('migrations and seed', () => {
  it('seeds the vocabulary and playbooks, and imports the real league', async () => {
    const vocabulary = await repo.getDepthSlotVocabulary();
    expect(vocabulary.length).toBe(DEPTH_SLOTS.length);

    // Teams and players arrive with the EA ratings import, which upserts by abbreviation.
    const teams = await repo.getTeams();
    expect(teams.length).toBeGreaterThanOrEqual(32);

    const roster = await repo.getRoster();
    expect(roster.length).toBeGreaterThan(1000);
    expect(roster.every((player) => player.franchise !== undefined)).toBe(true);

    expect(formationCount).toBeGreaterThan(0);
    expect(userTeamId).not.toBe('');
  });

  it('starts the game layer as a copy of the plan layer', async () => {
    const game = await repo.getDepthChart('game');
    const plan = await repo.getDepthChart('plan');
    expect(Object.keys(game.entries).length).toBeGreaterThan(20);
    expect(game.entries).toEqual(plan.entries);
  });
});

describe('formation resolution against stored data', () => {
  it('resolves every formation through the stored depth chart and slots', async () => {
    const formations = await repo.getFormations();
    const { ctx } = await repo.buildResolveContext('plan', formations);
    const resolved = resolveAll(formations, ctx);

    expect(resolved.size).toBe(formations.length);
    for (const formation of formations) {
      const resolution = resolved.get(formation.id);
      expect(resolution, formation.id).toBeDefined();
      expect(resolution!.slots.length).toBe(formation.slots.length);
      // Eleven on the field, always. Both the scraper and the seed data enforce it.
      expect(resolution!.slots.length, formation.id).toBe(11);
    }

    // Most of a real playbook should actually resolve to named players.
    const total = [...resolved.values()].reduce((sum, r) => sum + r.slots.length, 0);
    const named = [...resolved.values()].reduce(
      (sum, r) => sum + r.slots.filter((slot) => slot.playerId).length,
      0,
    );
    expect(named / total).toBeGreaterThan(0.5);
  });

  it('staffs every role in the chart derived from a real roster', async () => {
    const { auditPlan } = await import('@/domain/conflicts');
    const formations = await repo.getFormations();
    const { ctx } = await repo.buildResolveContext('plan', formations);
    const plan = auditPlan(formations, ctx);

    // The plan is no longer a hand-authored demo chart, so it is not promise-clean:
    // a chart derived from a real roster (`seed:chart`) has fewer bodies per position
    // and can put the same backup at two spots in one formation, which the audit
    // reports as a `duplicate` on purpose. What must hold is that no role went
    // unfilled — an empty starter is a gap the derivation failed to close.
    expect(plan.filter((conflict) => conflict.kind === 'empty')).toEqual([]);
  });

  it('starts a different player at every offensive and defensive role', async () => {
    const formations = await repo.getFormations();
    const { ctx } = await repo.buildResolveContext('plan', formations);
    const entries = ctx.depthChart.entries;

    // The roster rule this encodes: a player may appear at more than one spot on
    // the depth chart — the third tackle backs up both edges — but he cannot be
    // the *starter* at two of them. Special teams are the deliberate exception,
    // because the same man kicks off, holds and returns punts.
    const rolesStarted = new Map<string, string[]>();
    for (const slot of DEPTH_SLOTS) {
      if (slot.side === 'special') continue;
      const starter = (entries[slot.code] ?? [])[0];
      if (!starter) continue;
      rolesStarted.set(starter, [...(rolesStarted.get(starter) ?? []), slot.code]);
    }

    const doubleBooked = [...rolesStarted.entries()]
      .filter(([, roles]) => roles.length > 1)
      .map(([playerId, roles]) => `${playerId}: ${roles.join(' + ')}`);
    expect(doubleBooked).toEqual([]);
  });

  it('propagates a depth chart change into every formation that inherits the role', async () => {
    const formations = await repo.getFormations();
    const { ctx } = await repo.buildResolveContext('plan', formations);
    const before = resolveAll(formations, ctx);

    // Find a spot that inherits, and the role it inherits through.
    let target: { formationId: string; slotKey: string; roleCode: string } | null = null;
    for (const [formationId, resolution] of before) {
      for (const slot of resolution.slots) {
        if (slot.source === 'inherit' && slot.viaSlotCode) {
          target = { formationId, slotKey: slot.slotKey, roleCode: slot.viaSlotCode };
          break;
        }
      }
      if (target) break;
    }
    expect(target).not.toBeNull();

    const roleCode = target!.roleCode;
    const roster = await repo.getRoster();
    const eligible = roster.filter((player) => player.position && roleCode.startsWith(player.position));
    const currentId = (await repo.getDepthChart('plan')).entries[roleCode]?.[0] ?? null;
    const replacement = roster.find(
      (player) => player.id !== currentId && eligible.some((e) => e.id === player.id),
    );
    expect(replacement).toBeDefined();

    await repo.setDepthChartEntry('plan', roleCode, 1, replacement!.id);
    const after = resolveAll(formations, await repo.buildResolveContext('plan', formations).then((r) => r.ctx));

    const updated = after.get(target!.formationId)!.slots.find((s) => s.slotKey === target!.slotKey);
    expect(updated?.playerId).toBe(replacement!.id);
    expect(updated?.source).toBe('inherit');

    // Restore so later tests see the seeded chart.
    if (currentId) await repo.setDepthChartEntry('plan', roleCode, 1, currentId);
  });

  it('lets a formation sub override the depth chart, and reverts cleanly', async () => {
    const formations = await repo.getFormations();
    const formation = formations[0];
    const { ctx } = await repo.buildResolveContext('plan', formations);
    const before = resolveAll(formations, ctx).get(formation.id)!;
    const original = before.slots[0].playerId;

    const roster = await repo.getRoster();
    const other = roster.find((player) => player.id !== original && player.teamId === userTeamId);
    expect(other).toBeDefined();

    await repo.upsertSubs('plan', [
      {
        formationId: formation.id,
        slotKey: before.slots[0].slotKey,
        mode: 'override',
        playerId: other!.id,
        inheritSlotCode: null,
        inheritRank: null,
        note: 'test override',
      },
    ]);

    const overridden = resolveAll(
      formations,
      (await repo.buildResolveContext('plan', formations)).ctx,
    ).get(formation.id)!;
    expect(overridden.slots[0].playerId).toBe(other!.id);
    expect(overridden.slots[0].source).toBe('override');

    await repo.clearSubs('plan', [{ formationId: formation.id, slotKey: before.slots[0].slotKey }]);
    const reverted = resolveAll(
      formations,
      (await repo.buildResolveContext('plan', formations)).ctx,
    ).get(formation.id)!;
    expect(reverted.slots[0].playerId).toBe(original);
  });
});

describe('drives', () => {
  it('round-trips a drive and its calls', async () => {
    const id = await repo.createDriveRow({
      opponent: 'CPU',
      down: 1,
      distance: 10,
      yardLine: 25,
      quarter: 1,
      clockSeconds: 900,
      scoreDiff: 0,
    });

    const active = await repo.getActiveDrive();
    expect(active?.id).toBe(id);

    await repo.addDriveCall({
      driveId: id,
      sequence: 1,
      formationId: 'test-formation',
      formationName: 'Test Formation',
      playId: 'test-play',
      playName: 'PA Boot',
      concept: 'play-action',
      bucketId: 'early-down',
      outcome: 'medium',
      down: 1,
      distance: 10,
      yardLine: 25,
      reasons: ['test reason'],
    });

    const state = await repo.getDriveState(id);
    expect(state?.calls.length).toBe(1);
    expect(state?.calls[0].outcome).toBe('medium');

    await repo.updateDriveRow(id, {
      down: 2,
      distance: 4,
      yardLine: 31,
      quarter: 1,
      clockSeconds: 840,
      scoreDiff: 0,
      status: 'ended',
    });

    const ended = await repo.getDriveState(id);
    expect(ended?.down).toBe(2);
    expect(ended?.status).toBe('ended');

    const history = await repo.getCallHistory();
    expect(history.some((call) => call.formationId === 'test-formation')).toBe(true);
  });
});

describe('trades and rookies', () => {
  it('moves players between teams and logs the move', async () => {
    const teams = await repo.getTeams();
    const cpuTeam = teams.find((team) => team.id !== userTeamId)!;
    const incoming = (await repo.getRoster(cpuTeam.id))[0];
    expect(incoming).toBeDefined();

    await repo.movePlayersToTeam([incoming.id], userTeamId);
    const moved = (await repo.getRoster(userTeamId)).find((player) => player.id === incoming.id);
    expect(moved).toBeDefined();
    expect(moved?.franchise.teamId).toBe(userTeamId);

    await repo.addTransaction({
      kind: 'trade',
      season: 2026,
      week: 1,
      counterpartyTeamId: cpuTeam.id,
      payload: { incoming: { playerId: incoming.id }, outgoing: {} },
      valueIn: 100,
      valueOut: 80,
      notes: 'integration test',
    });

    const log = await repo.listTransactions();
    expect(log[0].kind).toBe('trade');
    expect(log[0].notes).toBe('integration test');
  });

  it('keeps a franchise row separate from an imported player row', async () => {
    await repo.upsertFranchisePlayer({
      playerId: 'test-rookie',
      teamId: userTeamId,
      capHit: 2_000_000,
      contractYears: 4,
      devTrait: 'star',
    });
    const roster = await repo.getRoster();
    expect(roster.some((player) => player.id === 'test-rookie')).toBe(false);
  });
});

describe('snapshots', () => {
  it('exports and restores the whole franchise state', async () => {
    const snapshot = await exportSnapshot();
    expect(snapshot.version).toBe(1);
    expect(snapshot.counts.players).toBeGreaterThan(0);
    expect(snapshot.counts.depthChartEntries).toBeGreaterThan(0);

    const teams = await repo.getTeams();
    const otherTeam = teams.find((team) => team.id !== userTeamId)!;
    const victim = (await repo.getRoster(userTeamId))[0];
    await repo.movePlayersToTeam([victim.id], otherTeam.id);
    expect((await repo.getRoster(userTeamId)).some((p) => p.id === victim.id)).toBe(false);

    const written = await restoreSnapshot(snapshot);
    expect(written.players).toBe(snapshot.counts.players);

    const restored = await repo.getRoster(userTeamId);
    expect(restored.some((player) => player.id === victim.id)).toBe(true);

    // And the league row survives a round trip with its dates intact.
    const league = await repo.getLeague();
    expect(league?.id).toBe(repo.DEFAULT_LEAGUE_ID);
    expect(league?.season).toBe(snapshot.tables.leagues[0].season);
  });

  it('rejects a file that is not a snapshot', async () => {
    await expect(restoreSnapshot({ nope: true } as never)).rejects.toThrow();
    const newer = { ...(await exportSnapshot()), version: 99 };
    await expect(restoreSnapshot(newer)).rejects.toThrow(/version/i);
  });

  it('carries the trade shortlist through a snapshot', async () => {
    const player = (await repo.getRoster())[0]!;
    await repo.addTradeTarget(player.id, 'snapshot test');
    const snapshot = await exportSnapshot();
    expect(snapshot.counts.tradeTargets).toBeGreaterThan(0);

    await repo.removeTradeTarget(player.id);
    expect((await repo.listTradeTargets()).some((row) => row.playerId === player.id)).toBe(false);

    await restoreSnapshot(snapshot);
    const restored = await repo.listTradeTargets();
    expect(restored.find((row) => row.playerId === player.id)?.note).toBe('snapshot test');
  });
});

describe('trade shortlist', () => {
  it('adds, updates and removes shortlisted players without duplicating them', async () => {
    const player = (await repo.getRoster())[0]!;
    await repo.addTradeTarget(player.id, 'watch him');
    expect((await repo.listTradeTargets()).filter((row) => row.playerId === player.id)).toHaveLength(1);

    await repo.addTradeTarget(player.id, 'updated note');
    const targets = await repo.listTradeTargets();
    expect(targets.filter((row) => row.playerId === player.id)).toHaveLength(1);
    expect(targets.find((row) => row.playerId === player.id)?.note).toBe('updated note');

    await repo.removeTradeTarget(player.id);
    expect((await repo.listTradeTargets()).some((row) => row.playerId === player.id)).toBe(false);
  });
});
