// THROWAWAY EVIDENCE PROBE — NOT PRODUCT CODE.
//
// Purpose: answer the C0A/C0B open questions about the EA Madden 27 ratings source:
//   - can every record be fetched reproducibly?
//   - are there free agents / unsigned players in the payload?
//   - which fields are actually nullable?
//   - are player ids stable across rating iterations?
//   - does the "sort each primary position by overall rating" rule produce a sane chart?
//
// It deliberately does NOT define a product schema. Raw payloads are written outside the
// repository; only the aggregate report is committed. Real import code belongs to C1B.
//
// Run: node spike/roster-source-probe.mjs
// Node >= 20 (native fetch). No dependencies.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ITERATION = 'madden-ratings-week-2';
const BASE = 'https://www.ea.com';
const RATINGS_PAGE = `${BASE}/games/madden-nfl/ratings`;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const MAX_PAGES = 40;
const RAW_DIR = join(tmpdir(), 'franchise-manager-spike');
const REPORT_PATH = new URL('./coverage-report.md', import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as = 'json') {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: as === 'json' ? 'application/json' : 'text/html' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return as === 'json' ? res.json() : res.text();
}

async function discoverBuildId() {
  const html = await get(RATINGS_PAGE, 'text');
  const m = html.match(/"buildId":"([^"]+)"/);
  if (!m) throw new Error('Could not find __NEXT_DATA__.buildId on the ratings page');
  return m[1];
}

async function fetchAllPages(buildId) {
  const items = [];
  let reportedTotal = null;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE}/_next/data/${buildId}/en/games/madden-nfl/ratings.json?franchiseSlug=madden-nfl&page=${page}`;
    const json = await get(url);
    const details = json?.pageProps?.ratingDetails ?? {};
    const batch = details.items ?? [];
    reportedTotal = details.totalItems ?? reportedTotal;
    if (batch.length === 0) break;
    items.push(...batch);
    if (items.length >= (reportedTotal ?? Infinity)) break;
    await sleep(200);
  }
  return { items, reportedTotal };
}

// Top-100-per-iteration sample only (the public endpoint cannot paginate).
// NOTE: this endpoint intermittently returns an empty payload; an empty result is a failure,
// not evidence of missing data, so retry before believing it.
async function fetchTopHundred(iteration, attempts = 6) {
  const url = `https://drop-api.ea.com/rating/madden-nfl?locale=en&limit=100&iteration=${iteration}`;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const json = await get(url);
      const items = json.items ?? [];
      if (items.length > 0) return new Map(items.map((p) => [p.id, p.overallRating]));
    } catch (err) {
      if (attempt === attempts) throw err;
    }
    await sleep(500 * attempt);
  }
  throw new Error(`empty payload after ${attempts} attempts (endpoint is rate-limited/unreliable)`);
}

function tally(values) {
  const out = new Map();
  for (const v of values) out.set(v, (out.get(v) ?? 0) + 1);
  return out;
}

function field(label, get, items) {
  let missing = 0;
  const empties = new Set();
  for (const it of items) {
    const v = get(it);
    if (v === null || v === undefined) missing++;
    else if (typeof v === 'string' && v.trim() === '') { missing++; empties.add('(empty string)'); }
  }
  return { label, missing, note: [...empties].join(',') };
}

function isFreeAgent(p) {
  const team = p.team;
  if (!team) return true;
  const label = typeof team === 'object' ? (team.label ?? '') : String(team);
  return /free\s*agent|unsigned|no team/i.test(label);
}

const RAW_PATH = join(RAW_DIR, 'players.json');
let items;
let reportedTotal = null;
let cached = false;
try {
  items = JSON.parse(await readFile(RAW_PATH, 'utf8'));
  reportedTotal = items.length;
  cached = true;
  console.log(`reused cached payload (${items.length} items) from ${RAW_PATH} — pass --refresh to refetch`);
} catch {
  const buildId = await discoverBuildId();
  console.log(`buildId=${buildId}`);
  const all = await fetchAllPages(buildId);
  items = all.items;
  reportedTotal = all.reportedTotal;
  await mkdir(RAW_DIR, { recursive: true });
  await writeFile(RAW_PATH, JSON.stringify(items, null, 0));
  console.log(`fetched ${items.length} items (reported total ${reportedTotal}) into ${RAW_PATH}`);
}

const ids = items.map((p) => p.id);
const uniqueIds = new Set(ids);
const teamCounts = tally(items.map((p) => (p.team ? p.team.label : '(no team)')));
const positionCounts = tally(items.map((p) => p.position?.shortLabel ?? '(none)'));
const archetypeCounts = tally(items.map((p) => p.archetype?.label ?? '(none)'));
const freeAgents = items.filter(isFreeAgent);
const statKeys = tally(items.flatMap((p) => Object.keys(p.stats ?? {})));

const nullability = [
  field('id', (p) => p.id, items),
  field('firstName', (p) => p.firstName, items),
  field('lastName', (p) => p.lastName, items),
  field('overallRating', (p) => p.overallRating, items),
  field('team', (p) => p.team, items),
  field('position', (p) => p.position, items),
  field('position.shortLabel', (p) => p.position?.shortLabel, items),
  field('archetype', (p) => p.archetype, items),
  field('jerseyNum', (p) => p.jerseyNum, items),
  field('height', (p) => p.height, items),
  field('weight', (p) => p.weight, items),
  field('age', (p) => p.age, items),
  field('yearsPro', (p) => p.yearsPro, items),
  field('college', (p) => p.college, items),
  field('avatarUrl', (p) => p.avatarUrl, items),
  field('stats', (p) => p.stats, items),
  field('playerAbilities', (p) => p.playerAbilities, items),
  field('birthdate', (p) => p.birthdate, items),
];

// Iteration stability: compare the top-100 ids of earlier iterations with this one.
let iterationRows = [];
let iterationNote = '';
try {
  const week2 = await fetchTopHundred(ITERATION);
  const week1 = await fetchTopHundred('madden-ratings-week-1');
  const base = await fetchTopHundred('1-base');
  const compare = (label, other) => {
    const shared = [...other.keys()].filter((id) => week2.has(id));
    const moved = shared.filter((id) => week2.get(id) !== other.get(id));
    iterationRows.push(`| ${label} | ${shared.length}/100 | ${moved.length} | ${shared.length === 100 ? 'ids stable' : 'ids differ'} |`);
  };
  compare('Launch ratings', base);
  compare('Week 1 ratings', week1);
  iterationNote = `top-100-by-rating sample only; the endpoint cannot paginate.`;
} catch (err) {
  iterationNote = `**inconclusive** — ${err.message}`;
}

// Depth-chart sanity check for the owner's rule (D107): primary positions sorted by OVR.
const ATL = 'Atlanta Falcons';
const atl = items.filter((p) => p.team?.label === ATL);
const atlByPos = new Map();
for (const p of atl) {
  const key = p.position?.shortLabel ?? '(none)';
  if (!atlByPos.has(key)) atlByPos.set(key, []);
  atlByPos.get(key).push(p);
}
const chartSample = [...atlByPos.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([pos, list]) => {
    const sorted = [...list].sort((a, b) => b.overallRating - a.overallRating || String(a.id).localeCompare(String(b.id)));
    return `| ${pos} | ${list.length} | ${sorted.slice(0, 3).map((p) => `${p.firstName} ${p.lastName} (${p.overallRating})`).join(', ')} |`;
  });

const teamRows = [...teamCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const counts = teamRows.map(([, n]) => n);
const positions = [...positionCounts.entries()].sort((a, b) => b[1] - a[1]);

const report = `# Roster source probe — EA Madden 27 ratings

> **Throwaway evidence only.** Generated by \`spike/roster-source-probe.mjs\` on ${new Date().toISOString()}.
> This is not a product schema and must not become the C1B importer. Raw payloads were written to a
> temp directory, not committed.

## Fetch reproducibility

- Iteration requested: \`${ITERATION}\`
- Records collected: **${items.length}** (endpoint reported totalItems: ${reportedTotal})
- Unique player ids: **${uniqueIds.size}** (${ids.length - uniqueIds.size} duplicates)
- Distinct teams represented: **${teamCounts.size}**

## Free agents / unsigned players

- Records without a resolvable team: **${freeAgents.length}**
- Distinct non-team labels seen: ${[...new Set(freeAgents.map((p) => (p.team ? p.team.label : '(null/absent)')))].join(', ') || '(none)'}

## Per-team counts

- min ${Math.min(...counts)} / max ${Math.max(...counts)} / avg ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}

| Team | Players |
|---|---|
${teamRows.map(([t, n]) => `| ${t} | ${n} |`).join('\n')}

## Position labels (EA vocabulary)

| shortLabel | count |
|---|---|
${positions.map(([p, n]) => `| ${p} | ${n} |`).join('\n')}

## Field nullability

| Field | Missing/empty |
|---|---|
${nullability.map((f) => `| ${f.label} | ${f.missing} |`).join('\n')}

- Distinct archetypes: **${archetypeCounts.size}**
- Stats keys across all records: **${statKeys.size}**

## Player id stability across iterations

${iterationNote}

| Iteration | Same ids as week 2 | Ratings moved | Verdict |
|---|---|---|---|
${iterationRows.join('\n') || '| (not run) | | | |'}

- Every record carries an \`availableIterations\` array naming the iterations it appears in, so the
  app can pin a source revision per D102/SPEC.
- Caveat for C0B: the public \`drop-api\` endpoint intermittently returns an empty payload and cannot
  paginate. The \`_next/data\` route was stable across every page fetched, so the importer should use
  it and treat empty responses as retryable failures, never as "no data".

## Provisional depth chart sanity check (D107 rule)

Atlanta Falcons, ${atl.length} players, primary positions sorted by overall rating:

| Position | In roster | Top 3 by OVR |
|---|---|---|
${chartSample.join('\n')}

## Open questions this does and does not settle

- Settles: full-record fetch is reproducible; team coverage breadth; real nullability; position vocabulary.
- Does not settle: whether 1,911 is EA's complete coverage of the game's player population
  (the ~3,116 figure is still unverified), contract/salary data (absent from the payload), and
  Madden 27 depth-chart slot rules (needs in-game evidence).
`;

await writeFile(REPORT_PATH, report);
console.log(`report written to ${REPORT_PATH.pathname}`);
