import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  artifactToImportResult,
  devTraitFromAbilities,
  extractNextData,
  isDropArtifact,
  metaFromHtml,
  normalizeDropPlayer,
  parseDropPage,
  toRatingsImportResult,
  type DropPlayerRaw,
} from '@/lib/importers/eaDropRatings';
import { findLatestDropArtifact } from '@/lib/importers/dropArtifact';

/**
 * The parser is the boundary between EA's rating page and everything else, and it
 * cannot be re-run against the live site in a unit test. So the fixtures below are
 * the shapes [`RATINGS.md`](RATINGS.md) records as verified, and these tests pin the
 * mapping: rich rows only, the `_rating` suffix, archetype carry-through, team label
 * to abbreviation, and the honest `null` for anything the feed does not say.
 */

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const OFFENSE_POSITIONS = ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'];
const DEFENSE_POSITIONS = ['LEDG', 'REDG', 'DT', 'SAM', 'MIKE', 'WILL', 'CB', 'FS', 'SS'];

const DEFAULT_LOCALE_FILTERS = {
  iterations: [
    { id: 'madden-ratings-week-2', label: 'Week 2 Ratings' },
    { id: 'madden-ratings-week-1', label: 'Week 1 Ratings' },
    { id: '1-base', label: 'Launch Ratings' },
  ],
  positions: [
    ...OFFENSE_POSITIONS.map((id) => ({
      id,
      shortLabel: id,
      label: id,
      positionType: { id: 'offense', name: 'Offense' },
    })),
    ...DEFENSE_POSITIONS.map((id) => ({
      id,
      shortLabel: id,
      label: id,
      positionType: { id: 'defense', name: 'Defense' },
    })),
    ...['K', 'P', 'LS'].map((id) => ({
      id,
      shortLabel: id,
      label: id,
      positionType: { id: 'special-teams', name: 'Special Teams' },
    })),
  ],
  teamGroups: [
    {
      id: 1,
      label: 'AFC North',
      teams: [
        { id: 2, label: 'Cincinnati Bengals' },
        { id: 3, label: 'Baltimore Ravens' },
      ],
    },
    {
      id: 2,
      label: 'NFC South',
      teams: [
        { id: 14, label: 'Atlanta Falcons' },
        { id: 15, label: 'New Orleans Saints' },
      ],
    },
  ],
  playerAbilities: [
    { id: 'Z_07', label: 'Double Me', type: { id: 'xFactor', label: 'X-Factor' } },
    { id: 'S_01', label: 'Tight Out', type: { id: 'superstarAbility', label: 'Superstar' } },
  ],
};

function richRow(overrides: Partial<DropPlayerRaw> = {}): DropPlayerRaw {
  return {
    id: 21586,
    firstName: "Ja'Marr",
    lastName: 'Chase',
    height: 72,
    weight: 201,
    overallRating: 97,
    college: 'LSU',
    age: 26,
    jerseyNum: 1,
    yearsPro: 5,
    archetype: { id: 'WR_DeepThreat', label: 'Deep Threat - WR' },
    team: { id: 2, label: 'Cincinnati Bengals' },
    position: {
      id: 'WR',
      shortLabel: 'WR',
      label: 'Wide Receiver',
      positionType: { id: 'offense', name: 'Offense' },
    },
    playerAbilities: [{ id: 'Z_07', label: 'Double Me', type: { id: 'xFactor' } }],
    stats: {
      speed: { value: 96, diff: 0 },
      catching: { value: 98, diff: 1 },
      bCVision: { value: 88, diff: 0 },
      overall: { value: 97, diff: 0 },
      runningStyle: { value: 'Balanced' },
    },
    ...overrides,
  };
}

function pageHtml(
  rows: DropPlayerRaw[],
  options: {
    totalItems?: number;
    iteration?: string | { id: string } | null;
    filtersIteration?: { id: string; label: string };
    nested?: boolean;
    auxData?: unknown;
    rawJson?: string;
  } = {},
): string {
  const ratingDetails = {
    items: rows,
    totalItems: options.totalItems ?? rows.length,
    iteration:
      options.iteration === undefined
        ? { id: 'madden-ratings-week-2', label: 'Week 2 Ratings' }
        : options.iteration,
  };
  const outer = {
    ratingDetails,
    ratingsFilters: options.filtersIteration
      ? { iteration: options.filtersIteration }
      : undefined,
    auxData: {
      defaultLocaleFilters: options.auxData === undefined ? DEFAULT_LOCALE_FILTERS : options.auxData,
    },
  };
  const pageProps = options.nested ? { pageProps: outer } : outer;
  const json = options.rawJson ?? JSON.stringify({ props: { pageProps } });
  return `<!doctype html><html><body><script id="__NEXT_DATA__" type="application/json">${json}</script></body></html>`;
}

/* -------------------------------------------------------------------------- */
/* One row                                                                    */
/* -------------------------------------------------------------------------- */

describe('normalizing one Madden 27 row', () => {
  it('flattens stats with the `_rating` suffix scheme fit reads', () => {
    const player = normalizeDropPlayer(richRow());
    expect(player).not.toBeNull();
    expect(player?.ratings.speed_rating).toBe(96);
    expect(player?.ratings.catching_rating).toBe(98);
    expect(player?.ratings.bCVision_rating).toBe(88);
    // `overall` and `runningStyle` are not attributes; they must not enter the map.
    expect(player?.ratings.overall_rating).toBeUndefined();
    expect(player?.ratings.runningStyle_rating).toBeUndefined();
  });

  it('keeps identity fields and carries EA\u2019s archetype code', () => {
    const player = normalizeDropPlayer(richRow());
    expect(player?.id).toBe('21586');
    expect(player?.firstName).toBe("Ja'Marr");
    expect(player?.position).toBe('WR');
    expect(player?.jersey).toBe(1);
    expect(player?.age).toBe(26);
    expect(player?.heightInches).toBe(72);
    expect(player?.college).toBe('LSU');
    expect(player?.archetype).toBe('WR_DeepThreat');
    expect(player?.ratings.archetype).toBe('WR_DeepThreat');
    expect(player?.ratings.abilities).toBe('Double Me');
  });

  it('resolves the full team label, a nickname, and refuses to guess', () => {
    expect(normalizeDropPlayer(richRow())?.teamId).toBe('CIN');
    expect(
      normalizeDropPlayer(richRow({ team: { id: 14, label: 'Falcons' } }))?.teamId,
    ).toBe('ATL');
    expect(
      normalizeDropPlayer(richRow({ team: { id: 99, label: 'Springfield Atoms' } }))?.teamId,
    ).toBeNull();
    expect(normalizeDropPlayer(richRow({ team: null }))?.teamId).toBeNull();
  });

  it('publishes no contract: salary stays null rather than invented', () => {
    expect(normalizeDropPlayer(richRow())?.salary).toBeNull();
  });

  it('keeps height and weight, which the player card shows', () => {
    const player = normalizeDropPlayer(richRow());
    expect(player?.heightInches).toBe(72);
    expect(player?.weightLbs).toBe(201);
    expect(normalizeDropPlayer(richRow({ weight: undefined }))?.weightLbs).toBeNull();
  });

  it('drops a row with no name or no position', () => {
    expect(normalizeDropPlayer(richRow({ firstName: '', lastName: '' }))).toBeNull();
    expect(normalizeDropPlayer(richRow({ position: null }))).toBeNull();
    expect(normalizeDropPlayer(richRow({ position: { id: '' } }))).toBeNull();
  });

  it('falls back to a name-derived id when the feed sends none', () => {
    const player = normalizeDropPlayer(richRow({ id: undefined }));
    expect(player?.id).toBe("ja'marr-chase");
  });
});

describe('dev traits from ability tiers', () => {
  it('reports xFactor and superstar, and nothing below them', () => {
    expect(
      devTraitFromAbilities([{ label: 'Double Me', type: { id: 'xFactor' } }]),
    ).toBe('xfactor');
    expect(
      devTraitFromAbilities([{ label: 'Tight Out', type: { id: 'superstarAbility' } }]),
    ).toBe('superstar');
    expect(devTraitFromAbilities([])).toBeNull();
    expect(devTraitFromAbilities(null)).toBeNull();
    // Star and Normal are indistinguishable here; guessing Normal would understate a
    // real asset, so unknown stays unknown.
    expect(devTraitFromAbilities([{ label: 'Some Ability', type: null }])).toBeNull();
  });

  it('reads the highest tier when a player somehow holds both', () => {
    expect(
      devTraitFromAbilities([
        { label: 'Tight Out', type: { id: 'superstarAbility' } },
        { label: 'Double Me', type: { id: 'xFactor' } },
      ]),
    ).toBe('xfactor');
  });
});

/* -------------------------------------------------------------------------- */
/* A page                                                                     */
/* -------------------------------------------------------------------------- */

describe('parsing the server-rendered ratings page', () => {
  it('reads the props shape a raw HTML fetch gives', () => {
    const page = parseDropPage(pageHtml([richRow()]));
    expect(page.rowCount).toBe(1);
    expect(page.players).toHaveLength(1);
    expect(page.total).toBe(1);
    expect(page.iteration).toBe('madden-ratings-week-2');
    expect(page.players[0]?.ratings.speed_rating).toBe(96);
  });

  it('reads the doubly-nested shape client-side navigation gives', () => {
    const page = parseDropPage(pageHtml([richRow()], { nested: true }));
    expect(page.players).toHaveLength(1);
    expect(page.players[0]?.archetype).toBe('WR_DeepThreat');
  });

  it('accepts the iteration as an object, a string or nothing', () => {
    expect(parseDropPage(pageHtml([richRow()], { iteration: 'madden-ratings-week-2' })).iteration).toBe(
      'madden-ratings-week-2',
    );
    expect(parseDropPage(pageHtml([richRow()], { iteration: null })).iteration).toBeNull();
  });

  it('prefers the selected filter, which is where the site records the shown iteration', () => {
    const page = parseDropPage(
      pageHtml([richRow()], {
        iteration: null,
        filtersIteration: { id: '1-base', label: 'Launch Ratings' },
      }),
    );
    expect(page.iteration).toBe('1-base');
    expect(page.meta?.iteration).toBe('1-base');
  });

  it('returns an empty page for missing or malformed payloads instead of throwing', () => {
    expect(parseDropPage('')).toEqual({
      players: [],
      rowCount: 0,
      total: null,
      iteration: null,
      meta: null,
    });
    const malformed = pageHtml([], { rawJson: '{not json' });
    const page = parseDropPage(malformed);
    expect(page.players).toEqual([]);
    expect(page.rowCount).toBe(0);
    expect(extractNextData('<html><body>no payload</body></html>')).toBeNull();
    expect(extractNextData(malformed)).toBeNull();
  });

  it('drops unusable rows but still reports how many the page carried', () => {
    const page = parseDropPage(pageHtml([richRow(), richRow({ id: 2, position: null })]));
    expect(page.rowCount).toBe(2);
    expect(page.players).toHaveLength(1);
  });
});

describe('page metadata', () => {
  it("extracts EA's own vocabularies", () => {
    const meta = metaFromHtml(pageHtml([]));
    expect(meta).not.toBeNull();
    expect(meta?.positions).toHaveLength(22);
    expect(meta?.positions.find((position) => position.id === 'LEDG')?.side).toBe('defense');
    expect(meta?.positions.find((position) => position.id === 'LS')?.side).toBe('special-teams');
    expect(meta?.teams).toHaveLength(4);
    expect(meta?.teams.map((team) => team.label)).toContain('Atlanta Falcons');
    expect(meta?.abilityTiers.Z_07).toBe('xFactor');
    expect(meta?.abilityTiers.S_01).toBe('superstarAbility');
    expect(meta?.iterations.map((entry) => entry.id)).toEqual([
      'madden-ratings-week-2',
      'madden-ratings-week-1',
      '1-base',
    ]);
  });

  it('returns null when the page carries no filter payload', () => {
    expect(metaFromHtml('<html></html>')).toBeNull();
    expect(metaFromHtml(pageHtml([], { auxData: null }))).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Folding pages                                                              */
/* -------------------------------------------------------------------------- */

describe('folding pages into an import result', () => {
  it('dedupes across pages and records where the rows came from', () => {
    const first = parseDropPage(pageHtml([richRow(), richRow({ id: 21600, lastName: 'Higgins' })]));
    const second = parseDropPage(
      pageHtml([richRow({ overallRating: 98 }), richRow({ id: 21700, lastName: 'Iosivas' })]),
    );
    const result = toRatingsImportResult({
      pages: [first, second],
      source: 'https://www.ea.com/games/madden-nfl/ratings',
      iteration: 'madden-ratings-week-2',
      meta: first.meta,
    });

    expect(result.players).toHaveLength(3);
    // The later page wins the duplicate row.
    expect(result.players.find((player) => player.id === '21586')?.overall).toBe(98);
    expect(result.seasonYear).toBe(2026);
    expect(result.slug).toBe('madden-ratings-week-2');
    expect(result.teams).toBe(1);
    expect(result.notes.join(' ')).toContain('3 unique players');
    expect(result.notes.join(' ')).toContain('duplicate row(s) across pages were merged');
    expect(result.notes.join(' ')).toContain('Contracts and cap figures are not published');
  });

  it('adds the launch set only for players the current update does not carry', () => {
    const current = parseDropPage(pageHtml([richRow()]));
    const base = parseDropPage(
      pageHtml(
        [richRow(), richRow({ id: 9001, lastName: 'Wagner', team: null, overallRating: 89 })],
        { iteration: '1-base', filtersIteration: { id: '1-base', label: 'Launch Ratings' } },
      ),
    );
    const result = toRatingsImportResult({
      pages: [current],
      base: { pages: [base], iteration: '1-base' },
      source: 'test',
      iteration: 'madden-ratings-week-2',
      meta: current.meta,
    });

    expect(result.players).toHaveLength(2);
    const freeAgent = result.players.find((player) => player.id === '9001');
    expect(freeAgent?.teamId).toBeNull();
    // Free agents are not in the weekly update at all; their row must say where it came from.
    expect(freeAgent?.ratingsIteration).toBe('1-base');
    expect(result.players.find((player) => player.id === '21586')?.ratingsIteration).toBe(
      'madden-ratings-week-2',
    );
    expect(result.notes.join(' ')).toContain('added that the current update does not carry');
    expect(result.notes.join(' ')).toContain('have no team row: free agents from the launch set');
  });

  it('keeps the newer numbers when both sets carry the same player', () => {
    const current = parseDropPage(pageHtml([richRow({ overallRating: 99 })]));
    const base = parseDropPage(pageHtml([richRow({ overallRating: 90 })], { iteration: '1-base' }));
    const result = toRatingsImportResult({
      pages: [current],
      base: { pages: [base], iteration: '1-base' },
      source: 'test',
      iteration: 'madden-ratings-week-2',
      meta: null,
    });

    expect(result.players).toHaveLength(1);
    expect(result.players[0]?.overall).toBe(99);
    expect(result.players[0]?.ratingsIteration).toBe('madden-ratings-week-2');
    expect(result.notes.join(' ')).toContain('overlapped the current update and kept their newer numbers');
  });

  it('still reports unsigned players when no launch set was read', () => {
    const page = parseDropPage(pageHtml([richRow({ team: null })]));
    const result = toRatingsImportResult({
      pages: [page],
      source: 'test',
      iteration: null,
      meta: null,
    });
    expect(result.notes.join(' ')).toContain('have no team row: free agents, or a team label');
    expect(result.notes.join(' ')).not.toContain('Launch set');
  });

  it('names the players it could not place instead of pretending', () => {
    const page = parseDropPage(
      pageHtml([richRow(), richRow({ id: 40, team: { id: 99, label: 'Springfield Atoms' } })]),
    );
    const result = toRatingsImportResult({
      pages: [page],
      source: 'test',
      iteration: null,
      meta: page.meta,
    });
    expect(result.teams).toBe(1);
    expect(result.notes.join(' ')).toContain('1 player(s) have no team row');
    expect(result.notes.join(' ')).toContain("Ja'Marr Chase");
  });
});

/* -------------------------------------------------------------------------- */
/* Artifact replay                                                            */
/* -------------------------------------------------------------------------- */

describe('the committed artifact', () => {
  const artifact = {
    source: 'https://www.ea.com/games/madden-nfl/ratings',
    iteration: 'madden-ratings-week-2',
    scrapedAt: '2026-09-30T12:00:00.000Z',
    meta: null,
    players: [normalizeDropPlayer(richRow())!],
  };

  it('recognises the scraper shape and rejects the older docs dump', () => {
    expect(isDropArtifact(artifact)).toBe(true);
    expect(isDropArtifact({ slug: 'm24-ratings', url: 'x', docs: [] })).toBe(false);
    expect(isDropArtifact(null)).toBe(false);
  });

  it('replays into the same result shape the live import returns', () => {
    const result = artifactToImportResult(artifact, 'data/imports/ea-ratings-madden27-week-2.json');
    expect(result.players).toHaveLength(1);
    expect(result.teams).toBe(1);
    expect(result.slug).toBe('madden-ratings-week-2');
    expect(result.artifactPath).toBe('data/imports/ea-ratings-madden27-week-2.json');
    expect(result.notes[0]).toContain('scraped 2026-09-30T12:00:00.000Z');
  });

  it('reports the unsigned pool and where its numbers came from', () => {
    const result = artifactToImportResult(
      {
        ...artifact,
        baseIteration: '1-base',
        players: [
          normalizeDropPlayer(richRow())!,
          {
            ...normalizeDropPlayer(richRow({ id: 9001, lastName: 'Wagner', team: null }))!,
            ratingsIteration: '1-base',
          },
        ],
      },
      'data/imports/ea-ratings-madden27-madden-ratings-week-2.json',
    );
    expect(result.players).toHaveLength(2);
    expect(result.notes.join(' ')).toContain('1 of them are unsigned (free agents)');
    expect(result.notes.join(' ')).toContain('carry launch-set ratings (1-base)');
  });
});

describe('finding the newest committed artifact', () => {
  it('returns null when nothing has been scraped', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fm-drop-'));
    try {
      expect(await findLatestDropArtifact(dir)).toBeNull();
      await writeFile(path.join(dir, 'ea-ratings-m24-ratings.json'), '{}');
      expect(await findLatestDropArtifact(dir)).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('picks the newest Madden 27 artifact by mtime', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fm-drop-'));
    try {
      const older = path.join(dir, 'ea-ratings-madden27-madden-ratings-week-1.json');
      const newer = path.join(dir, 'ea-ratings-madden27-madden-ratings-week-2.json');
      await writeFile(older, '{}');
      await writeFile(newer, '{}');
      await utimes(older, new Date('2026-09-01'), new Date('2026-09-01'));
      await utimes(newer, new Date('2026-09-30'), new Date('2026-09-30'));
      expect(await findLatestDropArtifact(dir)).toBe(newer);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
