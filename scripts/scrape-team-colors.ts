/**
 * One-time team-colour scrape.
 *
 *   npm run scrape:colors            # diff scraped colours against the committed table
 *   npm run scrape:colors -- --emit  # also print a ready-to-paste TS module
 *
 * Nothing in the app calls this: `src/data/teamColors.ts` is the committed source
 * of truth. This exists so the table can be re-derived and reviewed rather than
 * trusted, and so drift is visible when a club changes its branding.
 *
 * Source: the Wikipedia article infobox for each club, whose `colors` field lists
 * the official hex codes. Read it, check the diff, then copy what you accept.
 */

import { TEAM_COLORS, type TeamPalette } from '../src/data/teamColors';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const HEX = /#([0-9a-f]{6})\b/gi;

interface ScrapeResult {
  abbr: string;
  name: string;
  colors: string[];
  error?: string;
}

function header(title: string): void {
  console.log(`\n${title}\n${'-'.repeat(title.length)}`);
}

async function fetchInfoboxColors(name: string): Promise<string[]> {
  const url = new URL(WIKI_API);
  url.searchParams.set('action', 'parse');
  url.searchParams.set('page', name);
  url.searchParams.set('prop', 'wikitext');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('redirects', '1');

  const response = await fetch(url, {
    headers: { 'user-agent': 'madden-franchise-manager/0.1 (team colour audit)' },
  });
  if (!response.ok) throw new Error(`Wikipedia responded ${response.status}`);

  const payload = (await response.json()) as {
    parse?: { wikitext?: string };
    error?: { info?: string };
  };
  if (payload.error) throw new Error(payload.error.info ?? 'Wikipedia API error');

  const wikitext = payload.parse?.wikitext ?? '';
  // The `colors` field runs to the next line that starts a new parameter.
  const match = wikitext.match(/\|\s*colors?\s*=([\s\S]*?)(?=\n\s*\||\n\}\})/i);
  if (!match) return [];

  const found: string[] = [];
  for (const hit of match[1]!.matchAll(HEX)) {
    const hex = `#${hit[1]!.toLowerCase()}`;
    if (!found.includes(hex)) found.push(hex);
  }
  return found.slice(0, 4);
}

async function scrape(team: TeamPalette): Promise<ScrapeResult> {
  try {
    return { abbr: team.abbr, name: team.name, colors: await fetchInfoboxColors(team.name) };
  } catch (error) {
    return { abbr: team.abbr, name: team.name, colors: [], error: (error as Error).message };
  }
}

function printDiff(results: ScrapeResult[]): number {
  let mismatches = 0;
  header('committed vs scraped');
  for (const result of results) {
    const committed = TEAM_COLORS.find((team) => team.abbr === result.abbr)!;
    if (result.error) {
      console.log(`${result.abbr}  ⚠ ${result.error}`);
      continue;
    }
    if (result.colors.length === 0) {
      console.log(`${result.abbr}  ⚠ no colours found in infobox`);
      continue;
    }
    const primary = result.colors[0];
    const matches = primary?.toLowerCase() === committed.primary.toLowerCase();
    if (!matches) mismatches += 1;
    const flag = matches ? 'ok ' : '≠  ';
    console.log(
      `${flag}${result.abbr}  committed ${committed.primary}/${committed.secondary}` +
        `  scraped ${result.colors.slice(0, 3).join(', ')}`,
    );
  }
  return mismatches;
}

function emitModule(results: ScrapeResult[]): void {
  header('paste-ready module');
  console.log('export const TEAM_COLORS: TeamPalette[] = [');
  for (const result of results) {
    const committed = TEAM_COLORS.find((team) => team.abbr === result.abbr)!;
    const primary = result.colors[0] ?? committed.primary;
    const secondary = result.colors[1] ?? committed.secondary;
    console.log(
      `  { abbr: '${result.abbr}', name: '${result.name}', primary: '${primary.toUpperCase()}', secondary: '${secondary.toUpperCase()}', source: SOURCE },`,
    );
  }
  console.log('];');
}

async function main(): Promise<void> {
  const emit = process.argv.includes('--emit');
  console.log(`Scraping ${TEAM_COLORS.length} clubs from Wikipedia…`);

  const results: ScrapeResult[] = [];
  for (const team of TEAM_COLORS) {
    results.push(await scrape(team));
  }

  const mismatches = printDiff(results);
  if (emit) emitModule(results);

  header('summary');
  console.log(`${results.filter((r) => r.error).length} failed, ${mismatches} differ from committed.`);
  console.log('Review the diff, then update src/data/teamColors.ts by hand.');
}

await main();
