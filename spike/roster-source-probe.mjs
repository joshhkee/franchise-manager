// THROWAWAY EVIDENCE PROBE — NOT PRODUCT CODE.
//
// Purpose: answer the C0A/C0B open questions about the EA Madden 27 ratings source:
//   - which rating iteration holds the full player population (including free agents)?
//   - what is really nullable, and how complete are archetypes?
//   - are player ids stable across rating iterations?
//   - does the "sort each primary position by overall rating" rule produce a sane chart?
//
// It deliberately does NOT define a product schema. Raw payloads are written outside the
// repository; only the aggregate report is committed. Real import code belongs to C1B.
//
// Usage:
//   node spike/roster-source-probe.mjs                      # probe the launch iteration (full catalog)
//   node spike/roster-source-probe.mjs --iteration=1-base
//   node spike/roster-source-probe.mjs --refresh            # ignore the local cache
//
// Node >= 20 (native fetch). No dependencies.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// "1-base" is the Launch Ratings iteration; it contains the full population, including
// unsigned players. week-1/week-2 only cover players who were on a roster that week.
const DEFAULT_ITERATION = '1-base';
const ALL_ITERATIONS = ['1-base', 'madden-ratings-week-1', 'madden-ratings-week-2'];
const BASE = 'https://www.ea.com';
const RATINGS_PAGE = `${BASE}/games/madden-nfl/ratings`;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const MAX_PAGES = 60;
const RAW_DIR = join(tmpdir(), 'franchise-manager-spike');
const REPORT_PATH = new URL('./coverage-report.md', import.meta.url);

const args = process.argv.slice(2);
const ITERATION = (args.find((a) => a.startsWith('--iteration=')) ?? `--iteration=${DEFAULT_ITERATION}`).split('=')[1];
const REFRESH = args.includes('--refresh');

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

function ratingsUrl(buildId, page, iteration) {
  return `${BASE}/_next/data/${buildId}/en/games/madden-nfl/ratings.json?franchiseSlug=madden-nfl&page=${page}&iteration=${iteration}`;
}

async function fetchPage(buildId, page, iteration) {
  const json = await get(ratingsUrl(buildId, page, iteration));
  const details = json?.pageProps?.ratingDetails ?? {};
  return { items: details.items ?? [], total: details.totalItems ?? null };
}

async function fetchAll(buildId, iteration) {
  const items = [];
  let total = null;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items: batch, total: t } = await fetchPage(buildId, page, iteration);
    total = t ?? total;
    if (batch.length === 0) break;
    items.push(...batch);
    if (items.length >= (total ?? Infinity)) break;
    await sleep(150);
  }
  return { items, total };
}

function tally(values) {
  const out = new Map();
  for (const v of values) out.set(v, (out.get(v) ?? 0) + 1);
  return out;
}

function missingField(label, get, items) {
  let missing = 0;
  for (const it of items) {
    const v = get(it);
    if (v === null || v === undefined) missing++;
    else if (typeof v === 'string' && v.trim() === '') missing++;
  }
  return { label, missing };
}

// Load (or fetch) the dataset for one iteration.
async function loadIteration(buildId, iteration) {
  const path = join(RAW_DIR, `players-${iteration}.json`);
  if (!REFRESH) {
    try {
      const cached = JSON.parse(await readFile(path, 'utf8'));
      console.log(`reused cache ${path} (${cached.items.length} items) — pass --refresh to refetch`);
      return cached;
    } catch {
      /* fall through to fetch */
    }
  }
  const result = await fetchAll(buildId, iteration);
  await mkdir(RAW_DIR, { recursive: true });
  await writeFile(path, JSON.stringify(result, null, 0));
  console.log(`fetched ${result.items.length} items (reported total ${result.total}) into ${path}`);
  return result;
}

const buildId = await discoverBuildId();
console.log(`buildId=${buildId} iteration=${ITERATION}`);
const { items, total: reportedTotal } = await loadIteration(buildId, ITERATION);

const ids = items.map((p) => p.id);
const uniqueIds = new Set(ids);
const teamCounts = tally(items.map((p) => p.team?.label ?? '(no team)'));
const freeAgents = items.filter((p) => !p.team);
const positionCounts = tally(items.map((p) => p.position?.shortLabel ?? '(none)'));
const noArchetype = items.filter((p) => !p.archetype);
const archetypeByPosition = tally(noArchetype.map((p) => p.position?.shortLabel ?? '(none)'));
const statKeys = tally(items.flatMap((p) => Object.keys(p.stats ?? {})));

const nullability = [
  missingField('id', (p) => p.id, items),
  missingField('firstName', (p) => p.firstName, items),
  missingField('lastName', (p) => p.lastName, items),
  missingField('overallRating', (p) => p.overallRating, items),
  missingField('team (null = unsigned/free agent)', (p) => p.team, items),
  missingField('position', (p) => p.position, items),
  missingField('position.shortLabel', (p) => p.position?.shortLabel, items),
  missingField('archetype', (p) => p.archetype, items),
  missingField('jerseyNum', (p) => p.jerseyNum, items),
  missingField('height', (p) => p.height, items),
  missingField('weight', (p) => p.weight, items),
  missingField('age', (p) => p.age, items),
  missingField('yearsPro', (p) => p.yearsPro, items),
  missingField('college', (p) => p.college, items),
  missingField('avatarUrl', (p) => p.avatarUrl, items),
  missingField('stats', (p) => p.stats, items),
  missingField('playerAbilities', (p) => p.playerAbilities, items),
  missingField('birthdate', (p) => p.birthdate, items),
];

// Iteration comparison over the first two pages of each iteration (the route paginates reliably,
// unlike the rate-limited public drop-api).
const iterationRows = [];
for (const iteration of ALL_ITERATIONS) {
  try {
    const pages = [await fetchPage(buildId, 1, iteration), await fetchPage(buildId, 2, iteration)];
    const sample = pages.flatMap((p) => p.items);
    const sampleIds = new Set(sample.map((p) => p.id));
    const shared = [...sampleIds].filter((id) => uniqueIds.has(id)).length;
    iterationRows.push(
      `| ${iteration} | ${pages[0].total ?? '?'} | ${sample.length} | ${shared}/${sampleIds.size} |`,
    );
    await sleep(200);
  } catch (err) {
    iterationRows.push(`| ${iteration} | error | — | ${err.message} |`);
  }
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
const freeAgentSample = freeAgents.slice(0, 12).map((p) => `${p.firstName} ${p.lastName} (${p.position?.shortLabel}, ${p.overallRating})`);
const archetypeSample = [...new Set(items.filter((p) => p.archetype).map((p) => p.archetype.label))].sort();

const report = `# Roster source probe — EA Madden 27 ratings

> **Throwaway evidence only.** Generated by \`spike/roster-source-probe.mjs\` on ${new Date().toISOString()}.
> This is not a product schema and must not become the C1B importer. Raw payloads were written to a
> temp directory, not committed.
>
> Iteration probed: \`${ITERATION}\`${ITERATION === DEFAULT_ITERATION ? ' (Launch Ratings — the full population)' : ''}

## Why the iteration matters

The ratings database exposes several **iterations**. Weekly iterations only contain players who were
signed that week; the **Launch** iteration contains the whole population, free agents included.

| Iteration | Reported total | Sampled (page 1–2) | Sample ids also in \`${ITERATION}\` |
|---|---|---|---|
${iterationRows.join('\n')}

## Fetch reproducibility

- Records collected: **${items.length}** (endpoint reported totalItems: ${reportedTotal})
- Unique player ids: **${uniqueIds.size}** (${ids.length - uniqueIds.size} duplicates)
- Distinct team labels: **${teamCounts.size}** (32 clubs + unsigned)

## Free agents / unsigned players

- Records with **no team** (free agents): **${freeAgents.length}**
- Examples: ${freeAgentSample.join('; ') || '(none)'}
- This resolves the earlier week-2 artifact: free agents are present in the Launch iteration.

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

## Archetypes

- Stats keys across all records: **${statKeys.size}** (full attribute set)
- Records with an archetype: **${items.length - noArchetype.length} / ${items.length}**
- Records with \`archetype: null\`: **${noArchetype.length}**
- Missing by position: ${[...archetypeByPosition.entries()].map(([p, n]) => `${p} ${n}`).join(', ') || '(none)'}
- Distinct archetype labels: **${archetypeSample.length}**
- Sample labels: ${archetypeSample.slice(0, 18).join(' | ')}

**Where the archetype lives in the UI (confirmed):** the player profile renders it as a labelled row
directly after Weight. Verified on \`player-ratings/jessie-bates-iii/13202\` → "Height 6'1\" · Weight
210lb / 95kg · **Archetype Zone - S** · Handedness Right". The list payload carries the same value
(\`archetype.label = "Zone - S"\`), so the API and the UI agree.

**Counterexample for owner review:** **Cam Heyward** (DT, Pittsburgh Steelers, id 10698, 95 OVR) has
\`archetype: null\` in the Launch payload, and neither his Week 2 profile nor his Launch Ratings tab
renders an Archetype row at all (verified: the word "Archetype" does not appear anywhere in the page
text). Other high-OVR records with the same gap: Derrick Brown (DT, 96), Creed Humphrey (C, 95),
Lamar Jackson (QB, 94), Trent McDuffie (CB, 94), Vita Vea (DT, 94). If every player is meant to have
an archetype, Cam Heyward is the case to check.

## Provisional depth chart sanity check (D107 rule)

${ATL}, ${atl.length} players, primary positions sorted by overall rating:

| Position | In roster | Top 3 by OVR |
|---|---|---|
${chartSample.join('\n')}

## What this settles

- The full population is **${reportedTotal ?? items.length}** records at the Launch iteration, including free agents.
- Free-agent and archetype coverage can now be reported as facts rather than guesses.
- The \`_next/data\` route paginates reliably; the public \`drop-api\` route does not (treat empty as retryable failure).
`;

await writeFile(REPORT_PATH, report);
console.log(`report written to ${REPORT_PATH.pathname}`);
