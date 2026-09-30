import { eq, inArray } from 'drizzle-orm';
import { getDb } from './index';
import { franchisePlayers, players, playbooks, teams } from './schema';
import { recordAudit } from './repo';
import { eaTeamRows, type EaRatingsPlayer, type RatingsImportResult } from '@/lib/importers/eaRatings';
import type { SeedPlaybook } from '@/data/seed/playbooks';
import { classifyFormation, derivePersonnel, familyKey } from '@/domain/families';
import { formationPlays, formationSlots, formations } from './schema';
import type { Formation } from '@/domain/types';

const CHUNK = 400;

function chunk<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface PersistRatingsResult {
  teams: number;
  players: number;
  overlayCreated: number;
}

/**
 * Import EA ratings.
 *
 * Two rules matter here:
 *  - Player rows are replaced (they are the external source of truth).
 *  - Franchise overlay rows are only *created* when missing, never overwritten,
 *    so a ratings refresh cannot wipe contracts, dev traits or injury notes.
 */
export async function persistRatings(
  result: RatingsImportResult,
  options: { userTeamId?: string | null } = {},
): Promise<PersistRatingsResult> {
  const db = await getDb();

  const teamRows = eaTeamRows();
  for (const group of chunk(teamRows)) {
    for (const team of group) {
      await db
        .insert(teams)
        .values(team)
        .onConflictDoUpdate({
          target: teams.id,
          set: { name: team.name, abbr: team.abbr, conference: team.conference, division: team.division },
        });
    }
  }

  const ids = result.players.map((player) => player.id);
  for (const group of chunk(ids)) {
    await db.delete(players).where(inArray(players.id, group));
  }

  for (const group of chunk(result.players)) {
    await db.insert(players).values(
      group.map((player) => ({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        jersey: player.jersey,
        teamId: player.teamId,
        overall: player.overall,
        age: player.age,
        heightInches: player.heightInches,
        college: player.college,
        ratings: player.ratings,
        salary: player.salary,
        source: 'ea-ratings',
      })),
    );
  }

  const existingOverlay = await db
    .select({ playerId: franchisePlayers.playerId })
    .from(franchisePlayers)
    .where(inArray(franchisePlayers.playerId, ids.slice(0, 2000)));
  const hasOverlay = new Set(existingOverlay.map((row) => row.playerId));

  const newOverlay = result.players
    .filter((player) => !hasOverlay.has(player.id))
    .map((player) => ({
      playerId: player.id,
      teamId: player.teamId,
      contractYears: null,
      capHit: player.salary,
      devTrait: null,
      injuryStatus: 'healthy',
      injuryWeeks: 0,
      rosterStatus: 'active',
      notes: 'Cap figure approximated from the ratings feed; set the real contract in the app.',
    }));

  for (const group of chunk(newOverlay)) {
    if (group.length) await db.insert(franchisePlayers).values(group);
  }

  if (options.userTeamId) {
    // Nothing to change here yet: the league keeps its own user team id.
  }

  await recordAudit('import-ratings', 'player', result.slug, {
    players: result.players.length,
    teams: result.teams,
    source: result.url,
  });

  return { teams: result.teams, players: result.players.length, overlayCreated: newOverlay.length };
}

/**
 * Upsert playbook JSON (from the scraper or hand-authored files).
 *
 * Imported formation data is owned by the import, not by the user: re-importing a
 * playbook replaces its formations. Formation subs live in their own table, so
 * your personnel choices survive a playbook refresh.
 */
export async function persistPlaybooks(playbooksInput: SeedPlaybook[]): Promise<{ playbooks: number; formations: number }> {
  const db = await getDb();
  let formationCount = 0;

  for (const pb of playbooksInput) {
    await db
      .insert(playbooks)
      .values({
        id: pb.id,
        name: pb.name,
        team: pb.team,
        side: pb.side,
        source: pb.source,
        season: '27',
        url: pb.url ?? null,
      })
      .onConflictDoUpdate({
        target: playbooks.id,
        set: { name: pb.name, team: pb.team, side: pb.side, source: pb.source, url: pb.url ?? null },
      });

    const existing = await db.select({ id: formations.id }).from(formations).where(eq(formations.playbookId, pb.id));
    const existingIds = existing.map((row) => row.id);
    if (existingIds.length) {
      await db.delete(formationSlots).where(inArray(formationSlots.formationId, existingIds));
      await db.delete(formationPlays).where(inArray(formationPlays.formationId, existingIds));
      await db.delete(formations).where(inArray(formations.id, existingIds));
    }

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

      await db.insert(formations).values({
        id: seed.id,
        playbookId: pb.id,
        name: seed.name,
        set: seed.set,
        personnel: seed.personnel ?? derivePersonnel(asFormation),
        distribution: seed.distribution,
        side: pb.side,
        family: familyKey(classifyFormation(asFormation)),
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

  await recordAudit('import-playbooks', 'playbook', null, {
    playbooks: playbooksInput.length,
    formations: formationCount,
  });

  return { playbooks: playbooksInput.length, formations: formationCount };
}

export type { EaRatingsPlayer };
