/**
 * Endpoint discovery for EA's public ratings API.
 *
 * The API is undocumented and the season slug changes every year, so this probes
 * candidate slugs and pagination parameters and prints what actually works. Run
 * it when a ratings import starts complaining about a missing season.
 */
const ROOT = 'https://ratings-api.ea.com/v2/entities';

const SLUGS = [
  'm27-ratings',
  'madden-27-ratings',
  'm27-player-ratings',
  'm27ratings',
  'madden27-ratings',
  'nfl27-ratings',
  'm26-ratings',
  'madden-26-ratings',
  'm25-ratings',
  'm24-ratings',
  'm23-ratings',
];

/** Non-entity URLs that might list what seasons exist. */
const INDEX_URLS = [ROOT, 'https://ratings-api.ea.com/v2', 'https://ratings-api.ea.com/'];

const QUERY_VARIANTS = [
  '?limit=5',
  '?limit=5&offset=5',
  '?limit=5&skip=5',
  '?limit=5&page=2',
  '?per_page=5',
  '?offset=5',
  '?limit=2000',
  '?limit=65&offset=65',
  '?offset=65&limit=10',
  '?skip=65&limit=10',
  '?page=2&limit=65',
  '?start=65&limit=10',
];

interface Probe {
  url: string;
  status: number;
  count: number | null;
  docs: number;
  firstId: string | null;
}

async function probe(url: string): Promise<Probe> {
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      return { url, status: response.status, count: null, docs: 0, firstId: null };
    }
    const json = (await response.json()) as {
      count?: number;
      docs?: Record<string, unknown>[];
    };
    const docs = Array.isArray(json.docs) ? json.docs : [];
    const first = docs[0];
    return {
      url,
      status: response.status,
      count: typeof json.count === 'number' ? json.count : null,
      docs: docs.length,
      firstId: first ? String(first.plyrAssetname ?? first.lastName ?? '?') : null,
    };
  } catch (error) {
    return { url, status: -1, count: null, docs: 0, firstId: (error as Error).message };
  }
}

const working: string[] = [];

console.log('Index / catalogue endpoints');
for (const url of INDEX_URLS) {
  const result = await probe(url);
  console.log(`   ${url.padEnd(46)} status=${result.status} docs=${result.docs}`);
}

console.log('\nSeason slugs');
for (const slug of SLUGS) {
  const result = await probe(`${ROOT}/${slug}`);
  const mark = result.status === 200 ? 'OK ' : '   ';
  console.log(
    `${mark}${slug.padEnd(22)} status=${result.status} count=${result.count ?? '-'} returned=${result.docs}`,
  );
  if (result.status === 200 && result.docs > 0) working.push(slug);
}

const target = working[0];
if (!target) {
  console.log('\nNo slug responded. Fall back to scraping the ea.com ratings pages.');
  process.exit(0);
}

console.log(`\nPagination against ${target}`);
const rows: Probe[] = [];
for (const variant of QUERY_VARIANTS) {
  const result = await probe(`${ROOT}/${target}${variant}`);
  rows.push(result);
  console.log(
    `${variant.padEnd(22)} status=${result.status} docs=${result.docs} first=${result.firstId ?? '-'}`,
  );
}

console.log('\nPage size limits');
for (const variant of ['?limit=2000', '?limit=500', '?limit=100']) {
  const result = await probe(`${ROOT}/${target}${variant}`);
  console.log(`${variant.padEnd(22)} status=${result.status} docs=${result.docs}`);
}

const baseline = await probe(`${ROOT}/${target}`);
const changing = rows.find((row) => row.firstId && row.firstId !== baseline.firstId);
if (changing) {
  console.log(`\nPagination works: ${changing.url} returns a different page.`);
} else {
  console.log(
    '\nNo query variant changed the page; the endpoint may cap results per response or ignore these params.',
  );
}
console.log(`\nTotal players EA reports for ${target}: ${baseline.count ?? 'unknown'}`);

export {};
