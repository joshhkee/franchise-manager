/**
 * Phase 5 (C5A) — Curated Drive Theme templates and Coach's Call-Sheet Reference
 * guides inspired by the owner's reference sheets ("Troy Offense Call Sheet" &
 * "3-4 Shell Defense Call Sheet", D066, D085, D135).
 *
 * All coaching philosophy, shell reads, and adjustment keys are explicitly
 * labeled as researched football heuristics / coaching reference — never presented
 * as guaranteed CPU counters or unverified game-engine laws (D006, D067).
 */

import type { DriveThemeId, DriveThemeTemplate, GamedaySide } from "./types";

export const DRIVE_THEME_TEMPLATES: readonly DriveThemeTemplate[] = [
  // =========================================================================
  // THREE OFFENSIVE DRIVE THEMES (D066 / D085)
  // =========================================================================
  {
    id: "off-under-center-pa",
    side: "offense",
    defaultBookId: "nfl-off-falcons",
    name: "Under-Center & Play-Action Identity",
    subtitle: "Singleback / I-Form / Pistol · Run-first marriage with deep crossers & boots",
    identitySummary:
      "Establish inside/wide zone and duo from condensed under-center and pistol sets so every play-action boot, flood, and deep cross looks identical for the first two steps.",
    coachingPhilosophy:
      "Show the defense heavy 11/12/21 formations (Singleback Tight Y Off, Wing Tight, I-Form Close, Pistol Wing Slot). Anchor early downs with Inside Zone and Duo, constrain the backside end with PA Boot Slide/Sprint, and punish single-high safeties on 2nd & short with PA Cheat Cross or PA Deep Read.",
    intentionallyUnsupportedSituations: [
      {
        situationId: "third_very_long",
        reason:
          "Under-center play-action and condensed run sets are intentionally not recommended on 3rd & 11+ (long-developing play fakes invite blitzes when the defense knows you must pass; switch to Shotgun Spread & Quick Game or call a safe screen/draw).",
      },
      {
        situationId: "two_minute",
        reason:
          "Under-center condensed huddles bleed the clock; in a 2-Minute hurry-up drill, switch to Shotgun Spread & Quick Game for sideline access and tempo.",
      },
    ],
  },
  {
    id: "off-shotgun-quick",
    side: "offense",
    defaultBookId: "nfl-off-falcons",
    name: "Shotgun Spread & Quick Game",
    subtitle: "Gun Bunch / Tight / Trips / Empty · 3-step rhythm, RPOs & coverage beaters",
    identitySummary:
      "Spread the field horizontally from Gun Bunch TE, Tight Open, Trips TE Flex, and Empty Base Flex. Get the ball out on the 3rd step against blitzes or isolate linebackers in space.",
    coachingPhilosophy:
      "Make the defense declare its shell pre-snap. Against soft corners, take hitches, stick, and spacing. Against press or man blitz, hit mesh, slants, and rub crossers. When the box lightens to 5 defenders, check to Inside Zone or HB Base.",
    intentionallyUnsupportedSituations: [
      {
        situationId: "goal_line",
        reason:
          "Shotgun Spread & Empty sets are intentionally excluded inside the 3-yard line (Goal Line 3 & In), where compressed vertical grass favors Under-Center / Goal-Line Normal heavy gaps and play-action flats.",
      },
      {
        situationId: "four_minute",
        reason:
          "High-volume spread pass concepts risk clock-stopping incompletions in 4-Minute protect-the-lead situations; use Under-Center & Play-Action or Motion & Misdirection run series to bleed the clock.",
      },
    ],
  },
  {
    id: "off-motion-misdirection",
    side: "offense",
    defaultBookId: "nfl-off-falcons",
    name: "Motion, Jet & Misdirection",
    subtitle: "Jet sweeps, cheat motion, boomerang crossers & RPO conflict reads",
    identitySummary:
      "Use pre-snap Jet, Cheat, and Orbit motion from Y Trips Close, Tight Y Off, Doubles Y Off Stack, and Bunch TE to reveal man vs. zone coverage and out-leverage the defense horizontally.",
    coachingPhilosophy:
      "Pre-snap motion forces the CPU defense to tip its hand or bump its run fits. Pair Jet Touch Pass / MTN Wide Zone with Zone Fake Jet and PA Jet Sweep from the exact same pre-snap motion so linebackers flowing with motion get gashed inside.",
    intentionallyUnsupportedSituations: [
      {
        situationId: "backed_up",
        reason:
          "Horizontal jet sweeps, boomerang reverse actions, and slow-developing misdirection carry high safety risk inside your own 5-yard line (Backed Up); use direct downhill runs or quick slants instead.",
      },
    ],
  },

  // =========================================================================
  // THREE DEFENSIVE DRIVE THEMES (D085 / phases/05-gameday.md)
  // =========================================================================
  {
    id: "def-contain-run",
    side: "defense",
    defaultBookId: "nfl-def-falcons",
    name: "Contain Run & Heavy Box",
    subtitle: "3-4 Odd / Over / Under 4 Tech & 4-3 Even 6-1 · Gap integrity & 8-man fronts",
    identitySummary:
      "Set hard edges, win interior A/B gaps, and drop a safety into the box (Cover 3 Sky, Cover 1 Robber, Saw Blitz) to shut down early-down zone, duo, and power.",
    coachingPhilosophy:
      "Match 12/21/22 personnel with sturdy 3-4 or 4-3 Even 6-1 fronts. Stop the run on 1st down to force 2nd & long. Note: when the offense aligns in Empty or 4-WR spread, this theme automatically filters out heavy base fronts or shifts to Nickel/ Penny run-fit calls so linebackers aren't stranded on slot receivers.",
    intentionallyUnsupportedSituations: [
      {
        situationId: "third_very_long",
        reason:
          "Heavy run-stopping 8-man fronts are intentionally excluded on 3rd & 11+, where 3-deep / split-field Nickel & Dime coverage shells are required to prevent explosive conversions.",
      },
      {
        situationId: "two_minute",
        reason:
          "Base 3-4 / 4-3 run fronts cannot substitute fast enough against 2-Minute hurry-up spread tempo; use Balanced Match & Shell Disguise (Nickel/Dime) instead.",
      },
    ],
  },
  {
    id: "def-balanced-shell",
    side: "defense",
    defaultBookId: "nfl-def-falcons",
    name: "Balanced Match & Shell Disguise",
    subtitle: "Nickel 2-4 / 3-3-5 Penny / Dime 2-3-6 · Saban-style Rip/Liz, Quarters & Palms",
    identitySummary:
      "Look the same pre-snap while rotating post-snap between Cover 3 Match, Cover 4 Quarters/Palms, Cover 6, and Tampa 2 to cap explosive passes and rally to the catch.",
    coachingPhilosophy:
      "Match their personnel first (Nickel 2-4 vs 11 personnel, Dime 2-3-6 vs spread/3rd & long, 3-4 Over/Penny vs 12). Use Cover 3 Buzz Match vs trips, Quarters/Palms vs 2x2 and bunch, and Double Bracket when their WR1 is taking over.",
    intentionallyUnsupportedSituations: [
      {
        situationId: "goal_line",
        reason:
          "Light split-field coverage shells (Quarters/Palms/Dime) are intentionally excluded on the Goal Line (3 & In), where heavy 6-2 or 4-3 Even 6-1 gap fronts are required.",
      },
    ],
  },
  {
    id: "def-pressure-contain",
    side: "defense",
    defaultBookId: "nfl-def-falcons",
    name: "Sim Pressure, Fire Zone & QB Contain",
    subtitle: "Mugged A-gaps, 4-rush simulated pressures, 5-man fire zones & mobile QB spy/contain",
    identitySummary:
      "Crowd the line of scrimmage from Nickel 2-4, 2-4 Single Mug, and Dime 2-3-6. Mix 4-man simulated pressures (drop 7) with 5-man fire zones and Cover 1Contain/Robber.",
    coachingPhilosophy:
      "Force the quarterback to speed up his clock without always sacrificing coverage. Show 6 on the line in Mug sets: half the time drop out into Sim Pressure (Field Sim 3, Nickel Sim 2), half the time bring 5 (Nickel Blitz 3, Overload 3 Seam) or lock up with Cover 1 Contain against a mobile QB.",
    intentionallyUnsupportedSituations: [
      {
        situationId: "four_minute",
        reason:
          "Sub-package simulated pressures and pass-first mug looks are not designed for 4-Minute clock-bleed run defense; switch to Contain Run & Heavy Box to stop the ground game.",
      },
    ],
  },
] as const;

export const DRIVE_THEME_BY_ID: ReadonlyMap<DriveThemeId, DriveThemeTemplate> = new Map(
  DRIVE_THEME_TEMPLATES.map((t) => [t.id, t]),
);

export function themesForSide(side: GamedaySide): DriveThemeTemplate[] {
  return DRIVE_THEME_TEMPLATES.filter((t) => t.side === side);
}

/**
 * Interactive Coaching Reference Cards modeled directly on the owner's
 * "Troy Offense Call Sheet" (Read the Shell, If They Stop This -> Call This)
 * and "3-4 Shell Defense Call Sheet" (Weak Spots, At the Line in Order, Adjustment Key).
 *
 * Explicitly tagged as `football_heuristic` or `official_game_fact` per D067.
 */
export interface CoachingReferenceSection {
  id: string;
  side: GamedaySide;
  title: string;
  subtitle: string;
  evidenceLabel: string;
  items: {
    badge: string;
    heading: string;
    detail: string;
    actionCue: string;
  }[];
}

export const COACHING_REFERENCE_SECTIONS: readonly CoachingReferenceSection[] = [
  {
    id: "off-read-the-shell",
    side: "offense",
    title: "Read the Shell Pre-Snap",
    subtitle: "Identify safety depth and corner leverage before the snap",
    evidenceLabel: "Football heuristic (coaching reference, not a game guarantee)",
    items: [
      {
        badge: "2 HIGH",
        heading: "Two Deep Safeties (Cover 2 or Cover 4)",
        detail: "Lighter 6-man or 7-man box. Deep middle is split; corners are either flat-footed (Cover 2) or backing off (Cover 4).",
        actionCue: "Run Inside Zone / Duo first. In the pass game, work seams, corners, and intermediate digs/levels.",
      },
      {
        badge: "1 HIGH",
        heading: "Single High Safety (Cover 1 or Cover 3)",
        detail: "8th defender is down in the box or robbing the middle. Sideline seams and deep crossers stress the lone post safety.",
        actionCue: "Attack with PA Crossers, Flood, Four Verticals, or RPO Glance/Bubble to out-leverage the box.",
      },
      {
        badge: "MOTION",
        heading: "Pre-Snap Motion Indicator",
        detail: "Use Jet or Cheat motion across the formation and watch the defender over the motion receiver.",
        actionCue: "Defender trails across the field = likely Man (call Mesh, Drive, Rubs). Defender bumps/rotates = likely Zone (call Stick, Spacing, Flood).",
      },
      {
        badge: "HEAT",
        heading: "Mugged A-Gaps / Zero Blitz Look",
        detail: "No deep safety or 6+ defenders threatening the line of scrimmage.",
        actionCue: "Get the ball out on the 3rd step (Stick, Slants, RPO Bubble) or throw HB Slip Screen into the vacated rush lane.",
      },
    ],
  },
  {
    id: "off-counter-matrix",
    side: "offense",
    title: "If They Stop This → Call This",
    subtitle: "Constraint plays from the exact same formation look",
    evidenceLabel: "Verified Civil.GG formation pairs + football heuristic",
    items: [
      {
        badge: "TIGHT Y OFF",
        heading: "If they stack the box vs. Inside Zone Split",
        detail: "Linebackers step downhill on the under-center handoff fake.",
        actionCue: "Call PA Cheat Cross or PA Post Dig from Singleback Tight Y Off — exact same pre-snap alignment.",
      },
      {
        badge: "Y TRIPS CLOSE",
        heading: "If they chase MTN Jet Wide Zone to the perimeter",
        detail: "Edge and safety fly outside on the jet motion.",
        actionCue: "Call MTN Jet PA Sprint Rt or MTN Jet PA Wide Zone off the same jet motion.",
      },
      {
        badge: "GUN BUNCH TE",
        heading: "If they user-lurk Mesh / Inside Cross over the middle",
        detail: "Middle linebacker sits low in the hook zone to jump shallow crossers.",
        actionCue: "Call Bunch Levels,PA Y Wheel, or RPO Alert Bubble to attack behind or outside the user LB.",
      },
      {
        badge: "WING TIGHT",
        heading: "If they pinch the D-line vs. HB Duo / Inside Zone",
        detail: "Interior gaps are clogged by a 5-man or pinched front.",
        actionCue: "Call HB Stretch to the perimeter or PA Boot Slide / PA Y-Drag Wheel naked outside.",
      },
    ],
  },
  {
    id: "def-weak-spots",
    side: "defense",
    title: "Shell Weak Spots & Counters",
    subtitle: "What beats each coverage shell — bait the hole, close it with the call",
    evidenceLabel: "Football heuristic (coaching reference)",
    items: [
      {
        badge: "3",
        heading: "Cover 3 (Sky / Buzz / Match)",
        detail: "Vulnerable to 4 Verticals (seams splitting the single high safety) and 3-level Flood concepts to one sideline.",
        actionCue: "Use Cover 3 Match (Rip/Liz) vs 2x2 and Cover 3 Buzz Match vs Trips so seam runners are carried.",
      },
      {
        badge: "4 / 6",
        heading: "Quarters / Palms / Cover 6 (Split-Field)",
        detail: "Vulnerable to quick flats, draws when safeties bail, and deep post-dig (Mills/Dagger) combinations.",
        actionCue: "Mix in Sim Pressure (Field Sim 3) or Cover 1 Robber when they start dinking and dunking underneath.",
      },
      {
        badge: "2",
        heading: "Tampa 2 / Cover 2 Invert",
        detail: "Vulnerable to the sideline hole shot (Smash/Corner Strike) between the flat corner and deep half safety.",
        actionCue: "Call Tampa 2 on 2nd & long or 3rd & 11+ where corners can sink into the sideline window.",
      },
      {
        badge: "1 / 0",
        heading: "Cover 1 Man & Zero Blitz",
        detail: "Vulnerable to rub/mesh routes from Bunch sets, QB scrambles when edges rush past the pocket, and RB screens.",
        actionCue: "Use Double Bracket vs a dominant WR1, or Cover 1 Contain when facing a mobile QB.",
      },
    ],
  },
  {
    id: "def-pre-snap-checklist",
    side: "defense",
    title: "At the Line — Every Snap in Order",
    subtitle: "Keep pre-snap reads fast and disciplined",
    evidenceLabel: "Football heuristic (in-game menu names remain unverified per D113)",
    items: [
      {
        badge: "STEP 1",
        heading: "Read Personnel vs. Alignment",
        detail: "Check the offensive personnel grouping first, then whether they are in Under Center, Bunch, Trips, or Empty.",
        actionCue: "Remember: Empty backfield with 1 RB + 1 TE on the field is still 11 personnel — match speed with Nickel/Dime.",
      },
      {
        badge: "STEP 2",
        heading: "Check Box Count & Edge Leverage",
        detail: "On early downs or vs 12/21 personnel, ensure your front has gap integrity before worrying about exotic coverage.",
        actionCue: "In 3-4 / 4-3 Even 6-1, let your edge backers set the outside shoulder.",
      },
      {
        badge: "STEP 3",
        heading: "Disguise the Shell Look",
        detail: "Showing the same two-high or mugged front before rotating to Cover 3, Cover 6, or Sim Pressure slows the QB's first read.",
        actionCue: "Pair Nickel 2-4 Cover 3 Match, Cover 4 Palms, and Field Sim 3 from the same pre-snap alignment.",
      },
    ],
  },
] as const;

export function coachingReferencesForSide(side: GamedaySide): CoachingReferenceSection[] {
  return COACHING_REFERENCE_SECTIONS.filter((s) => s.side === side);
}
