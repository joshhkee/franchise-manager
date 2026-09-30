import {
  CONCEPT_LABELS,
  tagPlay,
  type Concept,
  type PlayFamily,
  type PlayTag,
} from './concepts';
import {
  BUCKET_LABELS,
  OPPONENT_LEANS,
  leanById,
  prioritiesFor,
  resolveBucket,
  situationLabel,
  type BucketId,
  type Situation,
} from './callSheet';
import { classifyFormation, describeLook, familyKey, type FormationClass } from './families';
import type { Formation, Side } from './types';

/**
 * The playcall engine.
 *
 * Rules and scoring only — no model, no randomness beyond a seeded tie-break —
 * because this gets used mid-drive and has to be fast, explainable and identical
 * if you ask the same question twice.
 *
 * The distinctive part is variety accounting: the engine tracks which *looks*
 * (set + personnel + distribution) you have already shown and rewards the
 * football answer to a defense that is catching on — same look, new concept.
 */

export interface LookShown {
  formationId: string;
  playId: string;
  concept: Concept;
  bucket: BucketId;
}

export interface CallRequest {
  situation: Situation;
  /** Calls already made this drive or game, oldest first. */
  looks?: LookShown[];
  /** Opponent lean ids from `OPPONENT_LEANS`. */
  leans?: string[];
  side?: Side;
  /** Number of unresolved/unavailable personnel issues per formation. */
  formationProblems?: Record<string, number>;
  limit?: number;
  seed?: number;
  /** Your curated sheet for the bucket, overriding the defaults. */
  prioritiesOverride?: Concept[];
}

export interface CallCandidate {
  formationId: string;
  formationName: string;
  formationClass: FormationClass;
  look: string;
  playId: string;
  playName: string;
  tag: PlayTag;
  score: number;
  reasons: string[];
}

export interface CallRecommendation {
  bucket: BucketId;
  bucketLabel: string;
  situationLabel: string;
  primary: CallCandidate;
  alternatives: CallCandidate[];
  reuseableLooks: {
    formationId: string;
    formationName: string;
    used: Concept[];
    unseen: Concept[];
  }[];
  explanation: string[];
}

const WEIGHTS = {
  priorityStep: 10,
  offSheetPenalty: -12,
  sameLookNewConcept: 8,
  sameFamilyNewConcept: 4,
  lookRepeatExact: -4,
  lookRepeatExactCap: -12,
  lookRepeatFamily: -1.5,
  lookRepeatFamilyCap: -9,
  conceptRepeatOnce: -5,
  conceptRepeatTwice: -12,
  samePlayAgain: -25,
  tellReinforced: -8,
  tellBroken: 10,
  personnelProblem: -3,
  personnelProblemCap: -9,
  streakLength: 4,
  streakPenalty: 6,
} as const;

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

type CallCategory = 'run' | 'pass';

function categoryOf(family: PlayFamily): CallCategory | null {
  if (family === 'run') return 'run';
  if (family === 'pass' || family === 'play-action' || family === 'screen' || family === 'rpo') {
    return 'pass';
  }
  return null;
}

export function recommendCalls(
  formations: Formation[],
  request: CallRequest,
): CallRecommendation | null {
  const side: Side = request.side ?? 'offense';
  const looks = request.looks ?? [];
  const bucket = resolveBucket(request.situation);
  const priorityList = request.prioritiesOverride ?? prioritiesFor(bucket);
  const leanIds = request.leans ?? [];
  const activeLeans = leanIds.map((id) => leanById(id)).filter((lean) => lean !== null);
  const seed = request.seed ?? 7;

  const candidates: CallCandidate[] = [];

  // Pre-compute tendency tables from what has already been shown.
  const byFormation = new Map<string, { run: number; pass: number }>();
  const byLook = new Map<string, { run: number; pass: number }>();
  const conceptCounts = new Map<Concept, number>();
  const playIds = new Set<string>();
  const formationById = new Map(formations.map((f) => [f.id, f]));

  for (const look of looks) {
    const formation = formationById.get(look.formationId);
    const klass = formation
      ? classifyFormation(formation)
      : { set: 'unknown', personnel: 'unknown', distribution: 'unknown', motion: false };
    const lookKey = familyKey(klass);

    for (const [map, key] of [
      [byFormation, look.formationId],
      [byLook, lookKey],
    ] as const) {
      const entry = map.get(key) ?? { run: 0, pass: 0 };
      const category = categoryOf(conceptFamilyOf(look.concept));
      if (category === 'run') entry.run += 1;
      if (category === 'pass') entry.pass += 1;
      map.set(key, entry);
    }
    conceptCounts.set(look.concept, (conceptCounts.get(look.concept) ?? 0) + 1);
    playIds.add(look.playId);
  }

  // In-drive balance: a run of the same category begs for the opposite.
  let trailingCategory: CallCategory | null = null;
  let trailingLength = 0;
  for (let i = looks.length - 1; i >= 0; i -= 1) {
    const category = categoryOf(conceptFamilyOf(looks[i].concept));
    if (!category) break;
    if (trailingCategory === null) trailingCategory = category;
    if (category !== trailingCategory) break;
    trailingLength += 1;
  }

  for (const formation of formations) {
    if (formation.side !== side) continue;
    const klass = classifyFormation(formation);
    const lookKey = familyKey(klass);
    const lookLabel = describeLook(klass);

    for (const play of formation.plays) {
      const playTag = tagPlay(play.name, {
        conceptOverride: play.conceptOverride ?? null,
        familyOverride: play.familyOverride ?? null,
      });
      const reasons: string[] = [];
      let score = 0;

      // 1. Where does this sit on the sheet for this situation?
      const index = priorityList.indexOf(playTag.concept);
      if (index >= 0) {
        score += (priorityList.length - index) * WEIGHTS.priorityStep;
        reasons.push(`On your sheet for this situation (#${index + 1}: ${CONCEPT_LABELS[playTag.concept]})`);
      } else {
        score += WEIGHTS.offSheetPenalty;
        reasons.push(`Off-sheet concept for this situation (${WEIGHTS.offSheetPenalty})`);
      }

      // 2. Look variety: repeat the look, change the concept.
      const exactShows = looks.filter((l) => l.formationId === formation.id);
      const familyShows = looks.filter((l) => {
        const f = formationById.get(l.formationId);
        if (!f) return false;
        return familyKey(classifyFormation(f)) === lookKey;
      });
      const conceptAlreadyFromThisFormation = exactShows.some((l) => l.concept === playTag.concept);
      const conceptAlreadyFromThisLook = familyShows.some((l) => l.concept === playTag.concept);

      if (exactShows.length > 0 && !conceptAlreadyFromThisFormation) {
        score += WEIGHTS.sameLookNewConcept;
        reasons.push(
          `Same look you already showed, different concept (+${WEIGHTS.sameLookNewConcept})`,
        );
      } else if (familyShows.length > 0 && !conceptAlreadyFromThisLook) {
        score += WEIGHTS.sameFamilyNewConcept;
        reasons.push(
          `Same picture, different concept from a sister formation (+${WEIGHTS.sameFamilyNewConcept})`,
        );
      }

      const exactRepeat = exactShows.length;
      if (exactRepeat > 0) {
        const penalty = Math.max(-WEIGHTS.lookRepeatExactCap, exactRepeat * WEIGHTS.lookRepeatExact);
        score += penalty;
        if (exactRepeat >= 2) reasons.push(`You have shown this exact look ${exactRepeat}\u00d7 (${penalty})`);
      } else if (familyShows.length >= 2) {
        const penalty = Math.max(
          -WEIGHTS.lookRepeatFamilyCap,
          familyShows.length * WEIGHTS.lookRepeatFamily,
        );
        score += penalty;
        reasons.push(`This look has been on the field ${familyShows.length}\u00d7 (${penalty.toFixed(1)})`);
      }

      const priorConcept = conceptCounts.get(playTag.concept) ?? 0;
      if (priorConcept === 1) {
        score += WEIGHTS.conceptRepeatOnce;
        reasons.push(`You already called ${CONCEPT_LABELS[playTag.concept]} once (${WEIGHTS.conceptRepeatOnce})`);
      } else if (priorConcept >= 2) {
        score += WEIGHTS.conceptRepeatTwice;
        reasons.push(
          `You have called ${CONCEPT_LABELS[playTag.concept]} ${priorConcept}\u00d7 already (${WEIGHTS.conceptRepeatTwice})`,
        );
      }

      if (playIds.has(play.id)) {
        score += WEIGHTS.samePlayAgain;
        reasons.push(`You have literally called this play (${WEIGHTS.samePlayAgain})`);
      }

      // 3. Tell awareness — the reason this engine exists.
      const category = categoryOf(playTag.family);
      if (category) {
        const formationTendency = byFormation.get(formation.id);
        const lookTendency = byLook.get(lookKey);
        const other: CallCategory = category === 'run' ? 'pass' : 'run';

        const reinforceFormation =
          formationTendency &&
          formationTendency[category] >= 2 &&
          formationTendency[other] === 0;
        const reinforceLook =
          lookTendency && lookTendency[category] >= 3 && lookTendency[other] === 0;

        if (reinforceFormation || reinforceLook) {
          const total = reinforceFormation
            ? formationTendency![category] + formationTendency![other]
            : lookTendency![category] + lookTendency![other];
          const scope = reinforceFormation ? formation.name : lookLabel;
          score += WEIGHTS.tellReinforced;
          reasons.push(
            `This would confirm a tell: ${scope} has been ${category === 'pass' ? 'pass' : 'run'} ${total}\u00d7 in a row (${WEIGHTS.tellReinforced})`,
          );
        } else {
          const breaksFormation =
            formationTendency &&
            formationTendency[other] >= 2 &&
            formationTendency[category] === 0;
          const breaksLook =
            lookTendency && lookTendency[other] >= 3 && lookTendency[category] === 0;
          if (breaksFormation || breaksLook) {
            const scope = breaksFormation ? formation.name : lookLabel;
            score += WEIGHTS.tellBroken;
            reasons.push(
              `Breaks your own tendency: ${scope} has been ${other === 'pass' ? 'pass' : 'run'} every time (+${WEIGHTS.tellBroken})`,
            );
          }
        }
      }

      // 4. Opponent leans.
      for (const lean of activeLeans) {
        if (!lean) continue;
        if (lean.boosts.includes(playTag.concept)) {
          score += 6;
          reasons.push(`${lean.label}: ${CONCEPT_LABELS[playTag.concept]} is an answer (+6)`);
        }
        if (lean.fades.includes(playTag.concept)) {
          score -= 6;
          reasons.push(`${lean.label}: avoid ${CONCEPT_LABELS[playTag.concept]} (-6)`);
        }
      }

      // 5. Situation shaping.
      const depth = playTag.depth;
      if (bucket === 'goal-line' || bucket === 'backed-up') {
        if (depth === 'behind') {
          score += 6;
          reasons.push('Tight quarters: run concepts are safer (+6)');
        }
        if (depth === 'deep') {
          score -= 10;
          reasons.push('Deep shots are risky here (-10)');
        }
      }
      if (bucket === 'two-minute') {
        if (depth === 'short') {
          score += 5;
          reasons.push('Two-minute: keep it short and stop the clock (+5)');
        }
        if (depth === 'behind') {
          score -= 6;
          reasons.push('Two-minute: a run keeps the clock moving (-6)');
        }
      }
      if (bucket === 'four-minute') {
        if (depth === 'behind') {
          score += 8;
          reasons.push('Four-minute: run it and bleed the clock (+8)');
        }
        if (depth === 'deep') {
          score -= 8;
          reasons.push('Four-minute: an incompletion stops the clock (-8)');
        }
      }
      if (request.situation.yardLine <= 20 && (depth === 'deep' || playTag.concept === 'play-action-deep')) {
        score -= 6;
        reasons.push('Backed up: protect the ball (-6)');
      }
      if (bucket === '3rd-long' && conceptIsRiskyOnThirdAndLong(playTag.concept)) {
        score -= 4;
        reasons.push('3rd & long: low-percentage concept (-4)');
      }

      // 6. Balance.
      if (trailingLength >= WEIGHTS.streakLength && trailingCategory && category) {
        if (category !== trailingCategory) {
          score += WEIGHTS.streakPenalty;
          reasons.push(
            `${trailingLength} straight ${trailingCategory === 'pass' ? 'passes' : 'runs'}: mix it up (+${WEIGHTS.streakPenalty})`,
          );
        } else {
          score -= WEIGHTS.streakPenalty;
          reasons.push(
            `${trailingLength} straight ${trailingCategory === 'pass' ? 'passes' : 'runs'} in a row (-${WEIGHTS.streakPenalty})`,
          );
        }
      }

      // 7. Personnel health.
      const problems = request.formationProblems?.[formation.id] ?? 0;
      if (problems > 0) {
        const penalty = Math.max(
          WEIGHTS.personnelProblemCap,
          problems * WEIGHTS.personnelProblem,
        );
        score += penalty;
        reasons.push(`${problems} personnel issue${problems === 1 ? '' : 's'} in this formation (${penalty})`);
      }

      const tieBreak = hash(`${seed}:${play.id}`) * 0.001;

      candidates.push({
        formationId: formation.id,
        formationName: formation.name,
        formationClass: klass,
        look: lookLabel,
        playId: play.id,
        playName: play.name,
        tag: playTag,
        score: Math.round((score + tieBreak) * 100) / 100,
        reasons,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.playId.localeCompare(b.playId);
  });

  const limit = request.limit ?? 3;
  const [primary, ...rest] = candidates;

  const reuseableLooks = buildReusableLooks(formations, looks);

  const explanation: string[] = [
    `Sheet used: ${BUCKET_LABELS[bucket]}`,
    activeLeans.length
      ? `Adjusting for: ${activeLeans.map((l) => l!.label).join(', ')}`
      : 'No defensive read applied',
  ];
  if (looks.length) {
    explanation.push(
      `${looks.length} call${looks.length === 1 ? '' : 's'} tracked this drive; look variety and your own tells are factored in.`,
    );
  }

  return {
    bucket,
    bucketLabel: BUCKET_LABELS[bucket],
    situationLabel: situationLabel(request.situation),
    primary,
    alternatives: rest.slice(0, Math.max(0, limit - 1)),
    reuseableLooks,
    explanation,
  };
}

function conceptIsRiskyOnThirdAndLong(concept: Concept): boolean {
  return ['inside-zone', 'dive', 'gap-power', 'screen'].includes(concept);
}

function conceptFamilyOf(concept: Concept): PlayFamily {
  // Mirrors CONCEPT_FAMILY without importing the whole table twice.
  switch (concept) {
    case 'inside-zone':
    case 'outside-zone':
    case 'gap-power':
    case 'counter':
    case 'dive':
    case 'draw':
    case 'qb-run':
      return 'run';
    case 'screen':
      return 'screen';
    case 'rpo':
      return 'rpo';
    case 'play-action-short':
    case 'play-action-deep':
      return 'play-action';
    case 'trick':
      return 'trick';
    default:
      return 'pass';
  }
}

/** For each look you have already shown, which concepts you have not tried from it. */
function buildReusableLooks(
  formations: Formation[],
  looks: LookShown[],
): CallRecommendation['reuseableLooks'] {
  const byFormation = new Map<string, { used: Set<Concept>; available: Set<Concept> }>();
  const formationById = new Map(formations.map((f) => [f.id, f]));

  for (const look of looks) {
    const formation = formationById.get(look.formationId);
    if (!formation) continue;
    const entry =
      byFormation.get(formation.id) ??
      {
        used: new Set<Concept>(),
        available: new Set(
          formation.plays.map(
            (play) =>
              tagPlay(play.name, {
                conceptOverride: play.conceptOverride ?? null,
                familyOverride: play.familyOverride ?? null,
              }).concept,
          ),
        ),
      };
    entry.used.add(look.concept);
    byFormation.set(formation.id, entry);
  }

  return [...byFormation.entries()]
    .map(([formationId, entry]) => ({
      formationId,
      formationName: formationById.get(formationId)?.name ?? formationId,
      used: [...entry.used],
      unseen: [...entry.available].filter((concept) => !entry.used.has(concept)),
    }))
    .filter((entry) => entry.unseen.length > 0)
    .sort((a, b) => b.unseen.length - a.unseen.length);
}

export function leanOptions() {
  return OPPONENT_LEANS;
}
