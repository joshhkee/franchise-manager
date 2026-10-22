import { DRIVE_THEME_BY_ID } from "./themes";
import type { CatalogPlay, GamedayEvaluationResult, GamedayScenarioInput, PlayFamilyId } from "./types";
import { catalogFor } from "./catalog";

function compatible(play: CatalogPlay, input: GamedayScenarioInput): boolean {
  if (!play.situations.includes(input.situationId)) return false;
  if (input.familyFilter && input.familyFilter !== "all" && play.family !== input.familyFilter) return false;
  if (play.side === "defense") {
    const personnel = input.offensePersonnel ?? "unknown";
    if (input.offenseAlignment === "empty_look" && play.safeAgainstEmptyLook === false) return false;
    if (personnel !== "unknown" && play.compatibleOffensePersonnel && !play.compatibleOffensePersonnel.includes(personnel)) return false;
  }
  return true;
}

/** Pure deterministic evaluator; session history means displayed, never called/used. */
export function evaluateGameday(input: GamedayScenarioInput, catalog: readonly CatalogPlay[] = catalogFor(input.bookId, input.side)): GamedayEvaluationResult {
  const theme = DRIVE_THEME_BY_ID.get(input.themeId);
  const base = catalog.filter((p) => p.bookId === input.bookId && p.side === input.side && p.themes.includes(input.themeId));
  const allEligiblePlays = base.filter((p) => compatible(p, input));
  const supported = Boolean(theme && theme.side === input.side && base.length > 0);
  const declaredUnsupported = theme?.intentionallyUnsupportedSituations.find((s) => s.situationId === input.situationId);
  const pinned = new Set(input.pinnedPlayIds ?? []);
  const pinnedFormation = new Set(input.pinnedFormationIds ?? []);
  const incompatiblePinnedPlays = base.filter((p) => pinned.has(p.id) && !compatible(p, input)).map((play) => ({ play, exclusionReason: "Pinned play is outside this situation or selected family/personnel context; it remains available in the full catalog." }));
  const eligiblePinned = allEligiblePlays.filter((p) => pinned.has(p.id) || pinnedFormation.has(p.formationId));
  const pinPriority = (p: CatalogPlay) => (pinned.has(p.id) ? 0 : pinnedFormation.has(p.formationId) ? 1 : 2);
  const tie = (a: CatalogPlay, b: CatalogPlay) => pinPriority(a) - pinPriority(b) || a.id.localeCompare(b.id);
  const pinOrdered = [...eligiblePinned].sort(tie);
  const overflowPinnedPlays = pinOrdered.slice(3);
  const chosen = pinOrdered.slice(0, 3);
  const recent = new Set(input.recentlyDisplayedPlayIds ?? []);
  const rotate = Math.max(0, Math.floor(input.refreshSeed ?? 0));
  const unpinned = allEligiblePlays.filter((p) => !eligiblePinned.some((pin) => pin.id === p.id));
  const roles = ["anchor", "constraint", "shot_or_pressure"] as const;
  for (const role of roles) {
    if (chosen.some((p) => p.complementaryRole === role)) continue;
    const candidates = unpinned.filter((p) => !chosen.some((c) => c.id === p.id));
    const roleCandidates = candidates.filter((p) => p.complementaryRole === role);
    const diverseRoleCandidates = roleCandidates.filter((p) => !chosen.some((c) => c.family === p.family));
    const selectionCandidates = diverseRoleCandidates.length ? diverseRoleCandidates : roleCandidates;
    const fresh = selectionCandidates.filter((p) => !recent.has(p.id));
    const pool = fresh.length ? fresh : selectionCandidates;
    if (!pool.length) continue;
    const index = rotate % pool.length;
    const candidate = pool[index];
    chosen.push(candidate);
  }
  const stableRest = unpinned.filter((p) => !chosen.some((c) => c.id === p.id)).sort((a, b) => {
    const af = recent.has(a.id) ? 1 : 0;
    const bf = recent.has(b.id) ? 1 : 0;
    return af - bf || a.id.localeCompare(b.id);
  });
  const diverseRest = stableRest.filter((p) => !chosen.some((c) => c.family === p.family));
  const remaining = [...diverseRest, ...stableRest.filter((p) => chosen.some((c) => c.family === p.family))];
  while (chosen.length < 3 && remaining.length) chosen.push(remaining.shift()!);
  if (!supported || declaredUnsupported) chosen.length = 0;
  const recommendations = chosen.slice(0, 3).map((play) => ({
    play,
    isPinnedPlay: pinned.has(play.id),
    isPinnedFormation: pinnedFormation.has(play.formationId),
    wasRecentlyDisplayed: recent.has(play.id),
    reasons: [
      { kind: "civil_gg_catalog" as const, text: `Civil.GG lists ${play.playName} in ${play.setName} / ${play.formationName} (${play.sourcePlayType}).` },
      { kind: "football_heuristic" as const, text: `Selected as a ${play.complementaryRole.replaceAll("_", " ")} call for this theme and situation.` },
    ],
  }));
  const unsupportedSituationMessage = !supported ? "This book/theme pairing is not supported by the curated catalog." : declaredUnsupported ? declaredUnsupported.reason : allEligiblePlays.length === 0 ? "No curated calls match this situation and filter. Clear a filter or choose another situation; no calls were invented." : null;
  return {
    bookSupported: supported,
    unsupportedBookMessage: supported ? null : `No verified catalog for ${input.bookId} and ${input.side}.`,
    situationSupportedByTheme: supported && !declaredUnsupported && allEligiblePlays.length > 0,
    unsupportedSituationMessage,
    recommendations,
    allEligiblePlays,
    incompatiblePinnedPlays,
    overflowPinnedPlays,
    varietyExhaustionNote: allEligiblePlays.length <= recommendations.length ? "The eligible catalog is exhausted for this selection; refresh may repeat these displayed options." : eligiblePinned.length >= 3 ? "Pins fill the 3-call menu, so refresh cannot change the spotlight until a pin is removed." : null,
    contextTrace: [
      `Situation: ${input.situationId}; optional personnel: ${input.offensePersonnel ?? "unknown"}.`,
      input.offenseAlignment === "empty_look" ? "Empty alignment is filtered independently from personnel grouping." : "No empty-look override applied.",
      `Refresh seed ${rotate}; recent IDs represent displayed calls only.`,
      "Call fit and coaching cues are heuristics, not guaranteed outcomes.",
    ],
  };
}

export function familyFilters(side: "offense" | "defense"): (PlayFamilyId | "all")[] {
  const offense: PlayFamilyId[] = ["run", "quick_pass", "dropback_pass", "rpo", "play_action", "screen", "move_boot"];
  const defense: PlayFamilyId[] = ["cover_3", "quarters_split", "man_brackets", "cover_2", "sim_pressure", "fire_zone", "man_blitz_zero"];
  return ["all", ...(side === "offense" ? offense : defense)];
}
