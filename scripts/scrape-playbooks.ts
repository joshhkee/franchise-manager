import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { closeDb } from '@/db/index';
import { applyMigrations } from '@/db/migrate';
import { persistPlaybooks } from '@/db/import';
import {
  classifySide,
  parseFormationKey,
  toSeedPlaybooks,
  type CivilPlay,
} from '@/lib/importers/civilPlaybooks';

/**
 * Scrape Madden 27 formations and plays from civil.gg's public playbook database.
 *
 * Usage:
 *   npm run scrape:playbooks              # write data/playbooks/*.json and import
 *   npm run scrape:playbooks -- --no-import
 *
 * civil.gg's public pages publish a client-side API for the free portion of their
 * playbook database (`formations`, `plays`, `playsWithContent`). We read it
 * through a real browser because the endpoints do not require credentials that
 * way, and we only take formation names, play names and play types.
 *
 * Two honest limits:
 *  - The public dataset is a subset (~100 plays); a member account sees more.
 *  - Per-spot diagram labels are not published, so slot layouts are derived from
 *    the formation name by `buildOffenseSlots` / `buildDefenseSlots` and are marked
 *    unverified in the app, where any slot can be rebound by hand.
 *
 * Chromium is needed; install it once with `npx playwright install chromium`.
 */

const PAGE_URL = 'https://civil.gg/playbooks/madden';
const ROOT = 'https://fatgvrcdozmbkxcwpwsc.supabase.co/functions/v1/pb-content-plays';
const IMPORT = !process.argv.includes('--no-import');

interface RawPayload {
  formations: string[];
  plays: CivilPlay[];
  playsWithContent: unknown[];
}

async function scrape(): Promise<RawPayload> {
  const { chromium } = await import('playwright').catch(() => {
    throw new Error(
      'Playwright is not installed. Run `npm install` then `npx playwright install chromium`.',
    );
  });

  const browser = await chromium.launch({
    // EA and other hosts reset HTTP/2 connections from headless Chromium; these
    // flags are what make the page load reliably.
    args: ['--disable-http2', '--no-sandbox', '--disable-http3'],
  });

  try {
    const page = await browser.newPage();
    console.log(`Opening ${PAGE_URL}...`);
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(5000);

    // Passed as a string on purpose: the TypeScript transform injects helper
    // names that do not exist inside the page context.
    const payload = (await page.evaluate(`(async () => {
      const root = ${JSON.stringify(ROOT)};
      const call = async (action) => {
        const response = await fetch(root + '?action=' + action + '&type=madden&year=27');
        if (!response.ok) throw new Error(action + ' responded ' + response.status);
        const json = await response.json();
        return json && json.data ? json.data.data : null;
      };
      return { formations: await call('formations'), plays: await call('playsWithContent') };
    })()`)) as { formations: string[] | null; plays: unknown[] | null };

    const plays: CivilPlay[] = [];
    for (const entry of payload.plays ?? []) {
      if (!Array.isArray(entry)) continue;
      const [, meta] = entry as [string, Record<string, unknown>];
      if (!meta || typeof meta !== 'object') continue;
      const formationName = String(meta.formationName ?? '');
      const setName = String(meta.setName ?? '');
      if (!formationName || !setName) continue;
      plays.push({
        playName: String(meta.playName ?? meta.displayName ?? ''),
        displayName: String(meta.displayName ?? meta.playName ?? ''),
        formationName,
        setName,
        playType: String(meta.playType ?? ''),
        offenseDefense: String(meta.offenseDefense ?? ''),
      });
    }

    return {
      formations: payload.formations ?? [],
      plays,
      playsWithContent: payload.plays ?? [],
    };
  } finally {
    await browser.close();
  }
}

const payload = await scrape();
console.log(`Captured ${payload.formations.length} formations and ${payload.plays.length} plays.`);

// Fail loudly rather than silently importing an empty playbook.
if (payload.formations.length === 0) {
  console.error(
    'No formations came back. civil.gg may have changed its page or be blocking headless browsers.',
  );
  process.exitCode = 1;
} else {
  const playbooks = toSeedPlaybooks({ formations: payload.formations, plays: payload.plays });

  const dir = path.join(process.cwd(), 'data', 'playbooks');
  await mkdir(dir, { recursive: true });
  const artifact = path.join(dir, 'civil-madden27.json');
  await writeFile(artifact, JSON.stringify({ fetchedAt: new Date().toISOString(), ...payload }, null, 1));
  console.log(`Wrote ${path.relative(process.cwd(), artifact)}`);

  for (const playbook of playbooks) {
    console.log(
      `  ${playbook.name}: ${playbook.formations.length} formations, ${playbook.formations.reduce((sum, f) => sum + f.plays.length, 0)} plays`,
    );
  }

  const sides = new Map<string, number>();
  for (const formation of payload.formations) {
    const side = classifySide(formation, undefined);
    sides.set(side, (sides.get(side) ?? 0) + 1);
  }
  console.log(`  sides: ${[...sides.entries()].map(([side, count]) => `${side}=${count}`).join(', ')}`);

  const sample = playbooks[0]?.formations.slice(0, 3) ?? [];
  for (const formation of sample) {
    const { set, name } = parseFormationKey(formation.id.replace(/^civil-/, '').replace(/-/g, ' '));
    console.log(`  e.g. ${set} ${name}: ${formation.plays.length} plays, ${formation.slots.length} spots`);
  }

  if (IMPORT) {
    await applyMigrations();
    const result = await persistPlaybooks(playbooks);
    console.log(`Imported ${result.formations} formations across ${result.playbooks} playbooks.`);
    await closeDb();
  }
}
