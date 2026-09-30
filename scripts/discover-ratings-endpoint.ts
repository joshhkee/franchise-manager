import { chromium } from 'playwright';

/**
 * Discovery: what does the ea.com ratings page actually call?
 *
 * EA's public ratings API (`ratings-api.ea.com`) only publishes older seasons, so
 * the live page is the way to find where current-season ratings come from. This
 * loads the real page in a browser, watches every JSON/XHR response, and prints
 * the candidates.
 */
const PAGE_URL =
  process.argv.find((arg) => arg.startsWith('--url='))?.slice('--url='.length) ??
  'https://www.ea.com/en/games/madden-nfl/ratings';

const browser = await chromium.launch();
const context = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
});
const page = await context.newPage();

const hits: { url: string; status: number; type: string; size: number }[] = [];

page.on('response', async (response) => {
  const request = response.request();
  const type = request.resourceType();
  const contentType = response.headers()['content-type'] ?? '';
  const isData =
    contentType.includes('json') ||
    (type === 'xhr' || type === 'fetch') ||
    /\.json(\?|$)/.test(response.url());
  if (!isData) return;
  let size = 0;
  try {
    const body = await response.body();
    size = body.length;
  } catch {
    size = -1;
  }
  hits.push({ url: response.url(), status: response.status(), type, size });
});

console.log(`Loading ${PAGE_URL} ...`);
await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForTimeout(8000);

console.log(`\n${hits.length} data responses observed:\n`);
for (const hit of hits.sort((a, b) => b.size - a.size)) {
  console.log(`${String(hit.status).padEnd(4)} ${String(hit.size).padStart(8)}B  ${hit.url.slice(0, 150)}`);
}

const likely = hits.filter((hit) => hit.size > 20_000);
console.log(
  likely.length
    ? `\nMost likely player payload:\n  ${likely[0].url}`
    : '\nNo large JSON payload seen. The page may render ratings from embedded state; try --url with a specific team page.',
);

await browser.close();
