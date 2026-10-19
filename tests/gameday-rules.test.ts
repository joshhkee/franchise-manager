import { describe, expect, it } from "vitest";
import { CATALOG_PLAYS, catalogFor, SOURCE_NOTE } from "../lib/gameday/catalog";
import { SITUATION_BUCKETS } from "../lib/gameday/types";
import { evaluateGameday } from "../lib/gameday/rules";

const input = (patch: Record<string, unknown> = {}) => ({
  bookId: "nfl-off-falcons", side: "offense" as const, themeId: "off-under-center-pa" as const,
  situationId: "first_10" as const, recentlyDisplayedPlayIds: [], refreshSeed: 0, ...patch,
});

describe("C5A sourced play catalog", () => {
  it("contains unique stable identities, source IDs, source art and mapped forms", () => {
    expect(CATALOG_PLAYS.length).toBeGreaterThan(30);
    expect(new Set(CATALOG_PLAYS.map((p) => p.id)).size).toBe(CATALOG_PLAYS.length);
    expect(CATALOG_PLAYS.every((p) => Number.isInteger(p.civilPlayId) && p.civilPlayId > 0)).toBe(true);
    for (const play of CATALOG_PLAYS) {
      expect(play.formationId).toContain(play.bookId);
      expect(play.playArtUrl).toContain("/plays_output/");
      expect(play.civilPageUrl).toContain("civil.gg/playbooks/team/nfl/");
    }
    expect(SOURCE_NOTE).toContain("heuristics");
    expect(catalogFor("nfl-off-falcons", "offense").length).toBeGreaterThan(10);
    expect(catalogFor("nfl-def-vikings", "defense").length).toBeGreaterThan(3);
  });

  it("gives every curated theme at least one three-call, multi-family situation", () => {
    const themes = [...new Set(CATALOG_PLAYS.flatMap((play) => play.themes))];
    for (const themeId of themes) {
      const sample = CATALOG_PLAYS.find((p) => p.themes.includes(themeId))!;
      const bucket = SITUATION_BUCKETS.find((s) => CATALOG_PLAYS.filter((p) => p.bookId === sample.bookId && p.side === sample.side && p.themes.includes(themeId) && p.situations.includes(s.id)).length >= 3);
      expect(bucket, themeId).toBeDefined();
      const result = evaluateGameday({ bookId: sample.bookId, side: sample.side, themeId, situationId: bucket!.id });
      expect(result.recommendations, themeId).toHaveLength(3);
      expect(new Set(result.recommendations.map((r) => r.play.complementaryRole)).size, themeId).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("deterministic game-day rules", () => {
  it("returns stable complementary calls and explains the heuristic role", () => {
    const first = evaluateGameday(input());
    expect(first.recommendations).toHaveLength(3);
    expect(evaluateGameday(input()).recommendations).toEqual(first.recommendations);
    expect(first.recommendations.every((r) => r.reasons.length > 0)).toBe(true);
  });

  it("pins eligible calls first and discloses overflow beyond the 3-call cap", () => {
    const plays = catalogFor("nfl-off-falcons", "offense").filter((p) => p.themes.includes("off-under-center-pa") && p.situations.includes("first_10"));
    const result = evaluateGameday(input({ pinnedPlayIds: plays.map((p) => p.id) }));
    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations.every((r) => r.isPinnedPlay)).toBe(true);
    expect(result.overflowPinnedPlays.length).toBe(plays.length - 3);
  });

  it("keeps incompatible favorites browsable and filters empty separately from 00 personnel", () => {
    const defense = evaluateGameday({ bookId: "nfl-def-falcons", side: "defense", themeId: "def-contain-run", situationId: "first_10", offensePersonnel: "11", offenseAlignment: "empty_look" });
    expect(defense.allEligiblePlays.every((play) => play.safeAgainstEmptyLook !== false)).toBe(true);
    expect(defense.contextTrace.join(" ")).toContain("filtered independently");
  });

  it("rotates while preferring unseen displayed options and reports exhausted pools", () => {
    const first = evaluateGameday(input());
    const recent = first.recommendations.map((r) => r.play.id);
    const refreshed = evaluateGameday(input({ situationId: "first_10", recentlyDisplayedPlayIds: recent, refreshSeed: 1 }));
    expect(refreshed.recommendations.some((r) => !recent.includes(r.play.id))).toBe(true);
    const exhausted = evaluateGameday(input({ familyFilter: "run" }));
    expect(exhausted.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("never fills unsupported books or theme-situation cells", () => {
    const unsupported = evaluateGameday({ bookId: "nfl-off-falcons", side: "offense", themeId: "off-under-center-pa", situationId: "two_minute" });
    expect(unsupported.recommendations).toHaveLength(0);
    expect(unsupported.situationSupportedByTheme).toBe(false);
    const unloaded = evaluateGameday({ bookId: "nfl-off-vikings", side: "offense", themeId: "off-under-center-pa", situationId: "first_10" });
    expect(unloaded.bookSupported).toBe(false);
    expect(unloaded.recommendations).toHaveLength(0);
  });
});
