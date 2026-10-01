import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS } from '@/domain/archetypes';
import {
  ALL_SORTS,
  FREE_AGENT_TEAM,
  SORT_GROUPS,
  compareBySort,
  filterPlayers,
  formatHeight,
  formatWeight,
  isPlayerSort,
  sortLabel,
  sortValue,
  teamOfPlayer,
} from '@/domain/playerTable';
import type { RosterPlayer } from '@/domain/types';

/**
 * The stats table is the one screen that ranks the whole league, so its ordering rules
 * are worth pinning: descending, missing values last, ties broken by who is better.
 * Everything here is pure — no database, no React.
 */

function player(seed: {
  id: string;
  position?: string;
  overall?: number;
  team?: string | null;
  franchiseTeam?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  ratings?: Record<string, number | string>;
}): RosterPlayer {
  const teamId = seed.team === undefined ? 'ATL' : seed.team;
  const franchiseTeam = seed.franchiseTeam === undefined ? teamId : seed.franchiseTeam;
  return {
    id: seed.id,
    firstName: 'Test',
    lastName: seed.id.toUpperCase(),
    position: seed.position ?? 'WR',
    jersey: 1,
    teamId,
    overall: seed.overall ?? 70,
    age: seed.age ?? 25,
    heightInches: seed.height ?? 72,
    weightLbs: seed.weight ?? null,
    college: null,
    ratings: seed.ratings ?? {},
    salary: null,
    franchise: {
      playerId: seed.id,
      teamId: franchiseTeam,
      contractYears: null,
      capHit: null,
      devTrait: null,
      injuryStatus: 'healthy',
      injuryWeeks: null,
      rosterStatus: 'active',
      notes: null,
    },
  };
}

describe('attribute groups', () => {
  it('covers every attribute exactly once', () => {
    const grouped = ATTRIBUTE_GROUPS.flatMap((group) => group.attributes);
    expect(grouped).toHaveLength(Object.keys(ATTRIBUTE_LABELS).length);
    expect(new Set(grouped).size).toBe(grouped.length);
    for (const attribute of Object.keys(ATTRIBUTE_LABELS)) {
      expect(grouped).toContain(attribute);
    }
  });

  it('gives every group an id and a label', () => {
    for (const group of ATTRIBUTE_GROUPS) {
      expect(group.id).toBeTruthy();
      expect(group.label).toBeTruthy();
      expect(group.attributes.length).toBeGreaterThan(0);
    }
  });
});

describe('what the table can rank by', () => {
  it('offers the identity columns plus every attribute, once each', () => {
    const sorts = SORT_GROUPS.flatMap((group) => group.sorts);
    expect(sorts).toHaveLength(ALL_SORTS.length);
    expect(new Set(sorts).size).toBe(sorts.length);
    for (const identity of ['ovr', 'name', 'age', 'height', 'weight']) {
      expect(ALL_SORTS).toContain(identity);
    }
    expect(ALL_SORTS).toContain('speed');
    expect(ALL_SORTS).toContain('manCoverage');
  });

  it('rejects a sort it does not know', () => {
    expect(isPlayerSort('speed')).toBe(true);
    expect(isPlayerSort('weight')).toBe(true);
    expect(isPlayerSort('touchdowns')).toBe(false);
    expect(isPlayerSort(undefined)).toBe(false);
    expect(isPlayerSort(null)).toBe(false);
  });

  it('labels identity columns and attributes', () => {
    expect(sortLabel('ovr')).toBe('Overall');
    expect(sortLabel('height')).toBe('Height');
    expect(sortLabel('speed')).toBe(ATTRIBUTE_LABELS.speed);
  });
});

describe('reading a sort off a player', () => {
  const subject = player({
    id: 'wr',
    overall: 88,
    age: 24,
    height: 73,
    weight: 203,
    ratings: { speed_rating: 95, manCoverage_rating: 41 },
  });

  it('reads attributes through the `_rating` suffix and the identity fields directly', () => {
    expect(sortValue(subject, 'speed')).toBe(95);
    expect(sortValue(subject, 'manCoverage')).toBe(41);
    expect(sortValue(subject, 'ovr')).toBe(88);
    expect(sortValue(subject, 'age')).toBe(24);
    expect(sortValue(subject, 'height')).toBe(73);
    expect(sortValue(subject, 'weight')).toBe(203);
    expect(sortValue(subject, 'name')).toBeNull();
  });

  it('reports a missing measurement as null rather than zero', () => {
    expect(sortValue(player({ id: 'x', weight: null }), 'weight')).toBeNull();
  });
});

describe('ordering', () => {
  it('ranks the biggest number first', () => {
    const sorted = [
      player({ id: 'slow', ratings: { speed_rating: 80 } }),
      player({ id: 'fast', ratings: { speed_rating: 96 } }),
      player({ id: 'mid', ratings: { speed_rating: 90 } }),
    ].sort(compareBySort('speed'));
    expect(sorted.map((entry) => entry.id)).toEqual(['fast', 'mid', 'slow']);
  });

  it('sinks players the feed did not rate instead of reading them as a zero', () => {
    const sorted = [
      player({ id: 'unknown' }),
      player({ id: 'rated', ratings: { speed_rating: 62 } }),
      player({ id: 'overall-95', overall: 95 }),
    ].sort(compareBySort('speed'));
    // The unrated 95-OVR player is still unranked on speed: he goes after the rated one,
    // and the tie-break between two unknowns is by overall.
    expect(sorted.map((entry) => entry.id)).toEqual(['rated', 'overall-95', 'unknown']);
  });

  it('breaks ties by overall, then by name', () => {
    const sorted = [
      player({ id: 'b', overall: 70, ratings: { speed_rating: 90 } }),
      player({ id: 'a', overall: 80, ratings: { speed_rating: 90 } }),
      player({ id: 'c', overall: 80, ratings: { speed_rating: 90 } }),
    ].sort(compareBySort('speed'));
    expect(sorted.map((entry) => entry.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by name alphabetically', () => {
    const sorted = [player({ id: 'zulu' }), player({ id: 'alpha' })].sort(compareBySort('name'));
    expect(sorted.map((entry) => entry.lastName)).toEqual(['ALPHA', 'ZULU']);
  });
});

describe('the team checklist', () => {
  const roster: RosterPlayer[] = [
    player({ id: 'atl1', team: 'ATL', overall: 80 }),
    player({ id: 'atl2', team: 'ATL', overall: 74, position: 'CB' }),
    player({ id: 'buf1', team: 'BUF', overall: 90 }),
    player({ id: 'fa1', team: null, overall: 85, ratings: { speed_rating: 93 } }),
    player({ id: 'claimed', team: null, franchiseTeam: 'ATL', overall: 72 }),
  ];

  it('knows the unsigned pool from a team', () => {
    expect(teamOfPlayer(roster[0]!)).toBe('ATL');
    expect(teamOfPlayer(roster[3]!)).toBe(FREE_AGENT_TEAM);
    // A player the feed lists without a team but the franchise overlay has claimed belongs
    // to that club, not to the free-agent pool.
    expect(teamOfPlayer(roster[4]!)).toBe('ATL');
  });

  it('keeps everyone when no team is selected', () => {
    const rows = filterPlayers(roster, { teams: [], position: 'ALL', minOvr: 0, query: '' });
    expect(rows).toHaveLength(roster.length);
  });

  it('keeps only the selected teams, and free agents under their own option', () => {
    expect(
      filterPlayers(roster, { teams: ['ATL'], position: 'ALL', minOvr: 0, query: '' }).map((r) => r.id),
    ).toEqual(['atl1', 'atl2', 'claimed']);
    expect(
      filterPlayers(roster, { teams: [FREE_AGENT_TEAM], position: 'ALL', minOvr: 0, query: '' }).map(
        (r) => r.id,
      ),
    ).toEqual(['fa1']);
    expect(
      filterPlayers(roster, { teams: ['ATL', 'BUF'], position: 'ALL', minOvr: 0, query: '' }).map(
        (r) => r.id,
      ),
    ).toEqual(['atl1', 'atl2', 'buf1', 'claimed']);
  });

  it('filters by position, rating floor and a case-insensitive name', () => {
    expect(
      filterPlayers(roster, { teams: [], position: 'CB', minOvr: 0, query: '' }).map((r) => r.id),
    ).toEqual(['atl2']);
    expect(
      filterPlayers(roster, { teams: [], position: 'ALL', minOvr: 80, query: '' }).map((r) => r.id),
    ).toEqual(['atl1', 'buf1', 'fa1']);
    expect(
      filterPlayers(roster, { teams: [], position: 'ALL', minOvr: 0, query: 'atl2' }).map((r) => r.id),
    ).toEqual(['atl2']);
    expect(
      filterPlayers(roster, { teams: [], position: 'ALL', minOvr: 0, query: '  ATL1 ' }).map((r) => r.id),
    ).toEqual(['atl1']);
  });

  it('combines the filters instead of letting one override another', () => {
    expect(
      filterPlayers(roster, { teams: ['ATL'], position: 'CB', minOvr: 78, query: '' }).map((r) => r.id),
    ).toEqual([]);
  });
});

describe('measurements', () => {
  it('reads height the way a roster does', () => {
    expect(formatHeight(72)).toBe("6'0\"");
    expect(formatHeight(76)).toBe("6'4\"");
    expect(formatHeight(null)).toBe('—');
    expect(formatHeight(undefined)).toBe('—');
  });

  it('shows a dash for a weight the source never published', () => {
    expect(formatWeight(203)).toBe('203 lb');
    expect(formatWeight(null)).toBe('—');
    expect(formatWeight(undefined)).toBe('—');
    expect(formatWeight(0)).toBe('0 lb');
  });
});
