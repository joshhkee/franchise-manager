import { describe, expect, it } from "vitest";
import { CATALOG_PLAYS, catalogFor } from "../lib/gameday/catalog";
import { evaluateGameday } from "../lib/gameday/rules";
import { SITUATION_BUCKETS, type GamedayScenarioInput } from "../lib/gameday/types";

/**
 * C6A representative-data measurement (phases/06-hardening.md): evaluate every
 * curated theme against every supported situation on the full imported catalog,
 * repeatedly, and record the per-menu cost. The ceiling is deliberately loose
 * (a regression guard, not a promise of warm free hosting); the recorded figure
 * belongs in docs/checkpoints/C6A.md.
 */
const ITERATIONS = 50;

function supportedScenarios(): GamedayScenarioInput[] {
  const scenarios: GamedayScenarioInput[] = [];
  const themes = [...new Set(CATALOG_PLAYS.flatMap((play) => play.themes))];
  for (const themeId of themes) {
    const sample = CATALOG_PLAYS.find((play) => play.themes.includes(themeId));
    if (!sample) continue;
    for (const bucket of SITUATION_BUCKETS) {
      const eligible = catalogFor(sample.bookId, sample.side).filter(
        (play) => play.themes.includes(themeId) && play.situations.includes(bucket.id),
      );
      if (eligible.length === 0) continue;
      scenarios.push({
        bookId: sample.bookId,
        side: sample.side,
        themeId,
        situationId: bucket.id,
        recentlyDisplayedPlayIds: [],
        refreshSeed: 0,
      });
    }
  }
  return scenarios;
}

describe("C6A gameday representative-data measurement", () => {
  it("evaluates every supported theme x situation menu on the full catalog within the phone budget", () => {
    const scenarios = supportedScenarios();
    expect(scenarios.length).toBeGreaterThan(20);
    expect(CATALOG_PLAYS.length).toBeGreaterThan(30);

    // Warm up so module/catalog initialisation is not measured as menu cost.
    for (const scenario of scenarios) evaluateGameday(scenario);

    const started = performance.now();
    for (let i = 0; i < ITERATIONS; i += 1) {
      for (const scenario of scenarios) evaluateGameday(scenario);
    }
    const elapsed = performance.now() - started;
    const perMenu = elapsed / (ITERATIONS * scenarios.length);

    // Representative-data figures recorded in the C6A release record.
    console.info(
      `[C6A] ${CATALOG_PLAYS.length} catalog plays · ${scenarios.length} supported menus · ${ITERATIONS} iterations · ${perMenu.toFixed(3)} ms/menu`,
    );
    expect(perMenu).toBeLessThan(10);
  });
});
