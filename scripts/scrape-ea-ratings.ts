import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EA_ARCHETYPE_TO_ID } from '@/domain/archetypes';
import {
  extractNextData,
  metaFromHtml,
  parseDropPage,
  toRatingsImportResult,
  type DropMeta,
  type DropPage,
} from '@/lib/importers/eaDropRatings';

/**
 * Scrape real Madden 27 ratings into a committed artifact.
 *
 * ## Two passes: the current update, then the launch set
 *
 * EA's *weekly* ratings updates only republish players who are on a roster — Week 2
 * carries 1,911 rows and not one of them is unsigned. The launch iteration
 * (`1-base`) carries the whole game: 3,111 players, free agents included. So this
 * script reads the current iteration first and then the launch set, and
 * [`toRatingsImportResult`](src/lib/importers/eaDropRatings.ts) folds them together,
 * newest numbers winning, with launch-set rows stamped so the difference stays
 * visible. Skip the second pass with `--no-base`.
 *
 * ## Why a browser, and why there is a fallback
 *
 * EA's ratings database (`drop-api.ea.com`) answers a bare Node `fetch` with HTTP
 * 200 and **an empty league** — no error, just zero players. A real browser context
 * is the verified route ([`RATINGS.md`](RATINGS.md) §2.1), so this script drives
 * Playwright against the server-rendered page at `ea.com/games/madden-nfl/ratings`
 * and then reads each page's HTML through `fetch` *from inside that page*, which is
 * same-origin and satisfies the bot check.
 *
 * Some environments block Chromium at the network level even though Node connects
 * fine (that is what this repo's machine does). So there is a second transport that
 * fetches the same SSR HTML with Node instead. It is not the primary route — EA has
 * throttled it in the past — but it is still *safe*, because the script never trusts
 * a page's contents: it asserts the first row has a real position, so the lean
 * Madden 26 default fails loudly instead of importing an empty league. Pick one with
 * `--transport=auto|browser|fetch` (default `auto`: browser first, Node on failure).
 *
 * Everything after the HTML arrives is [`eaDropRatings.ts`](src/lib/importers/eaDropRatings.ts),
 * which is pure and tested without a browser.
 *
 * ## Usage
 *
 *   npm run scrape:ratings                       # the site's newest iteration + launch set
 *   npm run scrape:ratings -- --iteration=madden-ratings-week-2
 *   npm run scrape:ratings -- --no-base          # rostered players only
 *   npm run scrape:ratings -- --pages=3          # debug: stop after 3 pages
 *   npm run scrape:ratings -- --transport=fetch  # skip Chromium entirely
 *   npm run scrape:ratings -- --out=custom.json
 *
 * The result is `data/imports/ea-ratings-madden27-<iteration>.json`, committed on
 * purpose: `npm run import:ratings` must work offline and deterministically, the
 * same rule as the team palettes and the archetype tables. Chromium is needed once
 * (`npx playwright install chromium`) and Playwright stays a dev dependency.
 */

const PAGE_URL = 'https://www.ea.com/games/madden-nfl/ratings';

/** RATINGS.md §2.3: requests in a tight loop start degrading; ~350 ms is verified safe. */
const PAGE_DELAY_MS = 350;

/** One page per 100 players. The launch set is 3,111 (32 pages); the cap is a runaway guard. */
const MAX_PAGES = 45;

/** Where the unsigned pool lives: the weekly updates do not republish free agents. */
const LAUNCH_ITERATION = '1-base';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

type TransportName = 'browser' | 'fetch';

interface Transport {
  name: TransportName;
  /** The raw HTML at `url`. */
  html(url: string): Promise<string>;
  close(): Promise<void>;
}

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const iterationArg = argValue('iteration');
const baseIterationArg = argValue('base-iteration') ?? LAUNCH_ITERATION;
const skipBase = process.argv.includes('--no-base');
const transportArg = (argValue('transport') ?? 'auto') as 'auto' | TransportName;
const explicitPageCap = argValue('pages');
const pageCap = Math.min(Number(explicitPageCap) || MAX_PAGES, MAX_PAGES);

function urlFor(pageNumber: number, iteration: string | null): string {
  const params = new URLSearchParams();
  if (pageNumber > 1) params.set('page', String(pageNumber));
  if (iteration) params.set('iteration', iteration);
  const query = params.toString();
  return query ? `${PAGE_URL}?${query}` : PAGE_URL;
}

/** The rows live at `props.pageProps.ratingDetails`, or one level deeper after navigation. */
function ratingDetailsOf(html: string) {
  const data = extractNextData(html);
  const pageProps = data?.props?.pageProps;
  return pageProps?.ratingDetails ?? pageProps?.pageProps?.ratingDetails ?? null;
}

/** Node fetch, with a browser-ish UA and a couple of retries for a throttled page. */
async function fetchHtml(url: string): Promise<string> {
  let lastError: Error = new Error('no attempt made');
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': USER_AGENT },
      });
      if (!response.ok) throw new Error(`${url} responded ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error as Error;
      await sleep(1_000 * attempt);
    }
  }
  throw lastError;
}

async function browserTransport(): Promise<Transport> {
  const { chromium } = await import('playwright').catch(() => {
    throw new Error(
      'Playwright is not installed. Run `npm install` then `npx playwright install chromium`.',
    );
  });

  const browser = await chromium.launch({
    // EA's host resets HTTP/2 connections from headless Chromium; these flags are
    // what make the page load reliably (same as the playbook scraper).
    args: ['--disable-http2', '--no-sandbox', '--disable-http3'],
  });

  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();
    const startUrl = urlFor(1, iterationArg);
    console.log(`Opening ${startUrl} in Chromium ...`);
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(1_500);

    return {
      name: 'browser',
      html: async (url: string) => {
        // The document we loaded is already server-rendered — read it directly.
        if (url === startUrl) return page.content();
        // Passed as a string on purpose: the TypeScript transform injects helper
        // names that do not exist inside the page context (same as the playbook scraper).
        return (await page.evaluate(
          `(async () => {
            const response = await fetch(${JSON.stringify(url)}, {
              headers: { accept: 'text/html' },
              credentials: 'omit',
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return await response.text();
          })()`,
        )) as string;
      },
      close: () => browser.close(),
    };
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
}

function fetchTransport(): Transport {
  console.log('Fetching the server-rendered pages with Node (no Chromium) ...');
  return {
    name: 'fetch',
    html: (url: string) => fetchHtml(url),
    close: async () => {},
  };
}

async function openTransport(): Promise<Transport> {
  if (transportArg === 'fetch') return fetchTransport();
  try {
    return await browserTransport();
  } catch (error) {
    if (transportArg === 'browser') throw error;
    console.log(
      `Chromium could not reach EA (${(error as Error).message.split('\n')[0]}). ` +
        'Falling back to the Node fetch transport; the payload is still validated.',
    );
    return fetchTransport();
  }
}

/**
 * Which iteration to read when `--iteration` is not given.
 *
 * The site only writes the iteration into the payload when the URL asks for one, so
 * a default page comes back unlabelled and the artifact would lose its "Week 2"
 * name. Its own filter list is ordered newest first, so we ask for that iteration
 * and trust it only when it serves the same row count as the default page — a
 * comparison, not a guess. If it does not match, we read the unlabelled default and
 * say so rather than naming it after whatever came first in the list.
 */
async function resolveIteration(transport: Transport): Promise<string | null> {
  if (iterationArg) return iterationArg;

  const defaultHtml = await transport.html(urlFor(1, null));
  const defaultPage = parseDropPage(defaultHtml);
  const candidate = metaFromHtml(defaultHtml)?.iterations[0]?.id ?? null;
  if (!candidate) return null;

  const candidatePage = parseDropPage(await transport.html(urlFor(1, candidate)));
  if (
    defaultPage.total !== null &&
    candidatePage.total === defaultPage.total &&
    candidatePage.rowCount === defaultPage.rowCount
  ) {
    console.log(
      `No --iteration given; the site's default page matches ${candidate} (${defaultPage.total} rows), so that is the set we read.`,
    );
    return candidate;
  }
  console.log(
    `No --iteration given and the default page does not match ${candidate}; reading it unlabelled. ` +
      'Re-run with --iteration=<id> to name the artifact.',
  );
  return null;
}

/**
 * Read one iteration until the site runs out of rows.
 *
 * Page 1 is validated when asked: the no-iteration default can answer with the
 * *previous* game's lean rows, where every position is null. Those look like an
 * empty league, which is the one failure mode we refuse to import (RATINGS.md §2.4).
 */
async function readIteration(
  transport: Transport,
  iteration: string | null,
  options: { validateFirstRow?: boolean; label?: string } = {},
): Promise<{ pages: DropPage[]; truncated: boolean }> {
  const pages: DropPage[] = [];
  const firstHtml = await transport.html(urlFor(1, iteration));
  const first = parseDropPage(firstHtml);
  pages.push(first);

  if (options.validateFirstRow) {
    const firstRaw = ratingDetailsOf(firstHtml)?.items?.[0];
    if (!firstRaw?.position?.id) {
      throw new Error(
        'The first row has no position: this looks like the lean Madden 26 rows, not Madden 27. ' +
          'Re-run with --iteration=madden-ratings-week-2 (see RATINGS.md §2.4).',
      );
    }
    console.log(
      `Page 1: ${first.rowCount} rows, ${first.players.length} usable` +
        (first.total !== null ? ` (site reports ${first.total} total)` : ''),
    );
    console.log(`  first row: ${firstRaw.firstName} ${firstRaw.lastName} — ${firstRaw.position.id}`);
  } else {
    console.log(`Page 1: ${first.rowCount} rows, ${first.players.length} usable` + (first.total !== null ? ` (site reports ${first.total} total)` : ''));
  }

  let truncated = false;
  for (let pageNumber = 2; pageNumber <= pageCap; pageNumber += 1) {
    await sleep(PAGE_DELAY_MS);
    const parsed = parseDropPage(await transport.html(urlFor(pageNumber, iteration)));
    if (parsed.rowCount === 0) break;
    if (parsed.players.length === 0) {
      throw new Error(
        `Page ${pageNumber} returned rows with no usable position — lean Madden 26 data. ` +
          'Re-run with --iteration=madden-ratings-week-2.',
      );
    }
    pages.push(parsed);
    if (pageNumber % 10 === 0) {
      console.log(`Page ${pageNumber}: ${parsed.rowCount} rows, ${parsed.players.length} usable`);
    }
    if (pageNumber === pageCap) truncated = true;
  }

  const rows = pages.reduce((sum, page) => sum + page.rowCount, 0);
  const total = pages.find((page) => page.total !== null)?.total ?? null;
  if (rows === 0) throw new Error('No rows at all: EA returned an empty ratings page.');
  if (truncated) {
    // A partial pull would make `persistRatings` purge the rows it did not see, so it
    // is only ever allowed as an explicit debug run.
    const message =
      `Stopped at the ${pageCap}-page cap with about ${rows} of ${total ?? '?'} rows read` +
      `${options.label ? ` (${options.label})` : ''}. This artifact would be incomplete.`;
    if (explicitPageCap) console.log(`WARNING: ${message}`);
    else throw new Error(message);
  }
  console.log(`Read ${pages.length} page(s), ${rows} rows${total !== null ? ` of ${total}` : ''}.`);
  return { pages, truncated };
}

const transport = await openTransport();

try {
  const resolvedIteration = await resolveIteration(transport);
  console.log(`Reading the current iteration${resolvedIteration ? ` (${resolvedIteration})` : ''} ...`);
  const { pages } = await readIteration(transport, resolvedIteration, { validateFirstRow: true });

  const source = urlFor(1, resolvedIteration);
  const iteration = pages.find((entry) => entry.iteration)?.iteration ?? resolvedIteration ?? null;
  const meta: DropMeta | null = pages.find((entry) => entry.meta)?.meta ?? null;

  let base: { pages: DropPage[]; iteration: string | null } | null = null;
  if (!skipBase && baseIterationArg && baseIterationArg !== iteration) {
    console.log('');
    console.log(`Reading the launch set (${baseIterationArg}) for the unsigned pool ...`);
    const read = await readIteration(transport, baseIterationArg, { label: 'launch set' });
    base = { pages: read.pages, iteration: baseIterationArg };
  }

  const result = toRatingsImportResult({ pages, base, source, iteration, meta });

  // Report the codes `EA_ARCHETYPE_TO_ID` cannot resolve, so the table can be extended.
  const archetypes = new Map<string, number>();
  for (const player of result.players) {
    if (player.archetype) {
      archetypes.set(player.archetype, (archetypes.get(player.archetype) ?? 0) + 1);
    }
  }
  // Kicker/punter/long-snapper archetypes have no model in our table on purpose; report
  // them separately from codes that are genuinely missing from the map.
  const unmapped = [...archetypes.keys()].filter((code) => !EA_ARCHETYPE_TO_ID[code]).sort();
  const expectedSpecialists = unmapped.filter((code) => /^(KP|LS)_/.test(code));
  const unexpected = unmapped.filter((code) => !/^(KP|LS)_/.test(code));

  const devCounts = { xfactor: 0, superstar: 0, unknown: 0 };
  for (const player of result.players) {
    if (player.devTrait === 'xfactor') devCounts.xfactor += 1;
    else if (player.devTrait === 'superstar') devCounts.superstar += 1;
    else devCounts.unknown += 1;
  }
  const freeAgents = result.players.filter((player) => !player.teamId).length;

  const outArg = argValue('out');
  const outPath = outArg
    ? path.resolve(outArg)
    : path.join(
        process.cwd(),
        'data',
        'imports',
        `ea-ratings-madden27${iteration ? `-${iteration}` : ''}.json`,
      );
  await mkdir(path.dirname(outPath), { recursive: true });

  const artifact = {
    source,
    iteration,
    baseIteration: base ? base.iteration : null,
    scrapedAt: new Date().toISOString(),
    transport: transport.name,
    meta,
    players: result.players,
  };
  await writeFile(outPath, JSON.stringify(artifact));

  console.log('');
  console.log(`Source:     ${source}`);
  console.log(`Transport:  ${transport.name}`);
  console.log(`Iteration:  ${iteration ?? '(not labelled by the page)'}`);
  if (base) {
    const baseRows = base.pages.reduce((sum, page) => sum + page.rowCount, 0);
    const added = result.players.filter((player) => player.ratingsIteration === base.iteration).length;
    console.log(`Launch set: ${base.iteration} — ${base.pages.length} pages, ${baseRows} rows, ${added} added`);
  } else {
    console.log('Launch set: not read (--no-base) — free agents are missing from this artifact');
  }
  console.log(`Pages read: ${pages.length} + ${base?.pages.length ?? 0}`);
  console.log(`Players:    ${result.players.length} unique (${freeAgents} unsigned)`);
  console.log(`Teams:      ${result.teams}`);
  console.log(
    `Archetypes: ${archetypes.size} seen, ${archetypes.size - unmapped.length} mapped` +
      (unexpected.length ? ` — UNMAPPED: ${unexpected.join(', ')}` : ''),
  );
  if (expectedSpecialists.length) {
    console.log(
      `            specialist codes with no archetype in our table by design: ${expectedSpecialists.join(', ')}`,
    );
  }
  console.log(
    `Dev traits: ${devCounts.xfactor} x-factor, ${devCounts.superstar} superstar, ` +
      `${devCounts.unknown} unknown (Star and Normal are not published)`,
  );
  for (const note of result.notes) console.log(`- ${note}`);
  console.log(`Artifact:   ${path.relative(process.cwd(), outPath)}`);
} finally {
  await transport.close();
}
