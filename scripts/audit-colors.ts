/**
 * Contrast audit.
 *
 *   npm run audit:colors
 *
 * Prints the derived accent tokens and their contrast ratios for every team in
 * both modes, so you can see exactly what the theme will paint. `tests/theme.spec.ts`
 * enforces the same contract in CI; this is the human-readable view.
 */

import { AA_LARGE, AA_TEXT, contentSurfaces, contrastRatio, MODE_SURFACES, type ThemeMode } from '../src/lib/color';
import { NEUTRAL_PALETTE, TEAM_COLORS } from '../src/data/teamColors';
import { resolveTheme } from '../src/lib/theme';

const MODES: ThemeMode[] = ['light', 'dark'];
const PAD = (value: string, width: number) => value.padEnd(width, ' ');

let failures = 0;

function check(ratio: number, target: number): string {
  if (ratio >= target) return 'ok';
  failures += 1;
  return `FAIL(${ratio.toFixed(2)}<${target})`;
}

for (const mode of MODES) {
  const surfaces = contentSurfaces(mode);
  console.log(`\n${mode.toUpperCase()} MODE  (bg ${MODE_SURFACES[mode].bg})`);
  console.log(
    `${PAD('team', 6)}${PAD('accent', 9)}${PAD('fg', 9)}${PAD('text', 9)}${PAD('ring', 9)}${PAD('secondary', 11)}result`,
  );

  for (const team of [...TEAM_COLORS, NEUTRAL_PALETTE]) {
    const { tokens } = resolveTheme(mode, { abbr: team.abbr });

    const results: string[] = [
      check(contrastRatio(tokens.accentFg, tokens.accent), AA_TEXT),
      check(contrastRatio(tokens.accentFg, tokens.accentStrong), AA_TEXT),
      check(contrastRatio(tokens.secondaryFg, tokens.secondary), AA_TEXT),
    ];
    for (const surface of surfaces) {
      results.push(check(contrastRatio(tokens.accentText, surface), AA_TEXT));
      results.push(check(contrastRatio(tokens.accent, surface), AA_LARGE));
      results.push(check(contrastRatio(tokens.ring, surface), AA_LARGE));
      results.push(check(contrastRatio(tokens.secondary, surface), AA_LARGE));
    }

    const worst = results.every((entry) => entry === 'ok') ? 'all pass' : results.filter((e) => e !== 'ok').join(' ');
    console.log(
      `${PAD(team.abbr, 6)}${PAD(tokens.accent, 9)}${PAD(tokens.accentFg, 9)}${PAD(tokens.accentText, 9)}${PAD(tokens.ring, 9)}${PAD(tokens.secondary, 11)}${worst}`,
    );
  }
}

console.log(`\n${failures === 0 ? 'All teams pass WCAG AA in both modes.' : `${failures} checks failed.`}`);
if (failures > 0) process.exitCode = 1;
