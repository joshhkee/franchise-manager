import { EA_ARCHETYPE_TO_ID } from '@/domain/archetypes';
import { extractNextData, metaFromHtml, parseDropPage } from '@/lib/importers/eaDropRatings';

/**
 * Discovery for EA's Madden 27 ratings page.
 *
 * `ratings-api.ea.com` (what `probe-ea-api.ts` pokes) publishes nothing for Madden 26
 * or 27. The current game lives in EA's own ratings database, and the way to read it
 * from a script is the **server-rendered page** at
 * `ea.com/games/madden-nfl/ratings` — not the `drop-api` service behind it, which
 * answers a bare fetch with HTTP 200 and an empty league ([`RATINGS.md`](RATINGS.md)
 * §2.1 — the worst failure mode there is, because it looks like "no players").
 *
 * This prints what each iteration actually serves, so the next thread writes the
 * scraper against evidence rather than a guess. Run it before
 * `npm run scrape:ratings` after a game launch or a ratings update.
 *
 *   npx tsx scripts/probe-drop-api.ts
 *   npx tsx scripts/probe-drop-api.ts --iteration=madden-ratings-week-2
 */

const PAGE_URL = 'https://www.ea.com/games/madden-nfl/ratings';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': USER_AGENT },
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.text();
}

function rawItems(html: string) {
  const data = extractNextData(html);
  const pageProps = data?.props?.pageProps;
  const details = pageProps?.ratingDetails ?? pageProps?.pageProps?.ratingDetails ?? null;
  return { details, items: details?.items ?? [], filters: pageProps?.ratingsFilters ?? null };
}

const requested =
  process.argv.find((arg) => arg.startsWith('--iteration='))?.slice('--iteration='.length) ?? null;

console.log(`Reading ${PAGE_URL} ...`);
const baseHtml = await fetchHtml(PAGE_URL);
const base = parseDropPage(baseHtml);
const meta = metaFromHtml(baseHtml);
const baseRaw = rawItems(baseHtml);

console.log(`\nDefault iteration row check`);
console.log(
  `   rows=${base.rowCount} total=${base.total} iteration=${base.iteration ?? '(unlabelled)'} ` +
    `first=${baseRaw.items[0]?.firstName ?? '?'} ${baseRaw.items[0]?.lastName ?? ''} ` +
    `position=${baseRaw.items[0]?.position?.id ?? 'NULL'}`,
);
if (baseRaw.items[0] && !baseRaw.items[0].position?.id) {
  console.log(
    '   WARNING: the first row has no position — this looks like the lean Madden 26 rows.',
  );
}

if (!meta) {
  console.log('\nNo filter payload found. The page structure has changed; re-read RATINGS.md.');
  process.exit(0);
}

console.log(`\nIterations (${meta.iterations.length})`);
for (const entry of meta.iterations) {
  const html = await fetchHtml(`${PAGE_URL}?iteration=${encodeURIComponent(entry.id)}&page=1`);
  const page = parseDropPage(html);
  const first = rawItems(html).items[0];
  console.log(
    `   ${entry.id.padEnd(26)} "${entry.label}" rows=${page.rowCount} total=${page.total} ` +
      `position=${first?.position?.id ?? 'NULL'} first=${first?.lastName ?? '?'}`,
  );
}

if (requested) {
  const html = await fetchHtml(`${PAGE_URL}?iteration=${encodeURIComponent(requested)}`);
  const page = parseDropPage(html);
  console.log(`\nRequested iteration "${requested}": ${page.players.length} usable rows`);
}

console.log(`\nPositions (${meta.positions.length})`);
for (const position of meta.positions) {
  console.log(`   ${position.id.padEnd(6)} ${position.side.padEnd(14)} ${position.label}`);
}

console.log(`\nTeams (${meta.teams.length})`);
console.log('   ' + meta.teams.map((team) => `${team.label} (${team.id})`).join(', '));

const tiers = new Map<string, number>();
for (const tier of Object.values(meta.abilityTiers)) {
  tiers.set(tier, (tiers.get(tier) ?? 0) + 1);
}
console.log('\nAbility definitions by tier (a proxy for dev trait)');
for (const [tier, count] of tiers) console.log(`   ${tier.padEnd(20)} ${count}`);

const statKeys = new Set<string>();
for (const item of baseRaw.items) for (const key of Object.keys(item.stats ?? {})) statKeys.add(key);
console.log(`\nStat keys on page 1 (${statKeys.size})`);
console.log('   ' + [...statKeys].sort().join(', '));

const archetypes = new Map<string, number>();
for (const item of baseRaw.items) {
  const code = item.archetype?.id;
  if (code) archetypes.set(code, (archetypes.get(code) ?? 0) + 1);
}
const unmapped = [...archetypes.keys()].filter((code) => !EA_ARCHETYPE_TO_ID[code]).sort();
console.log(
  `\nArchetype codes on page 1, not in EA_ARCHETYPE_TO_ID (${unmapped.length}): ` +
    (unmapped.join(', ') || 'none'),
);

export {};
