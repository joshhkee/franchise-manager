/**
 * Play concept tagging.
 *
 * Madden play names are semi-descriptive ("PA Boot Over", "HB Dive", "Inside
 * Zone Split"), so a rule-based tagger gets us most of the way. Every tag is
 * stored, carries a confidence, and can be corrected by hand in the app — the
 * tagger is a starting point, not an oracle.
 */

export type PlayFamily = 'run' | 'pass' | 'play-action' | 'screen' | 'rpo' | 'trick';

export type Concept =
  | 'inside-zone'
  | 'outside-zone'
  | 'gap-power'
  | 'counter'
  | 'dive'
  | 'draw'
  | 'qb-run'
  | 'screen'
  | 'rpo'
  | 'quick-game'
  | 'dropback-short'
  | 'dropback-mid'
  | 'dropback-deep'
  | 'play-action-short'
  | 'play-action-deep'
  | 'trick';

export type ConceptDepth = 'behind' | 'short' | 'mid' | 'deep';

export interface PlayTag {
  family: PlayFamily;
  concept: Concept;
  depth: ConceptDepth;
  /** 0..1. Low-confidence tags are surfaced in the UI for a curation pass. */
  confidence: number;
  reason: string;
  source: 'heuristic' | 'manual';
}

export const CONCEPT_LABELS: Record<Concept, string> = {
  'inside-zone': 'Inside Zone',
  'outside-zone': 'Outside Zone',
  'gap-power': 'Gap / Power',
  counter: 'Counter',
  dive: 'Dive',
  draw: 'Draw',
  'qb-run': 'QB Run',
  screen: 'Screen',
  rpo: 'RPO',
  'quick-game': 'Quick Game',
  'dropback-short': 'Dropback Short',
  'dropback-mid': 'Dropback Intermediate',
  'dropback-deep': 'Dropback Deep',
  'play-action-short': 'Play Action Short',
  'play-action-deep': 'Play Action Deep',
  trick: 'Trick',
};

export const CONCEPT_FAMILY: Record<Concept, PlayFamily> = {
  'inside-zone': 'run',
  'outside-zone': 'run',
  'gap-power': 'run',
  counter: 'run',
  dive: 'run',
  draw: 'run',
  'qb-run': 'run',
  screen: 'screen',
  rpo: 'rpo',
  'quick-game': 'pass',
  'dropback-short': 'pass',
  'dropback-mid': 'pass',
  'dropback-deep': 'pass',
  'play-action-short': 'play-action',
  'play-action-deep': 'play-action',
  trick: 'trick',
};

export const CONCEPT_DEPTH: Record<Concept, ConceptDepth> = {
  'inside-zone': 'behind',
  'outside-zone': 'behind',
  'gap-power': 'behind',
  counter: 'behind',
  dive: 'behind',
  draw: 'behind',
  'qb-run': 'behind',
  screen: 'short',
  rpo: 'short',
  'quick-game': 'short',
  'dropback-short': 'short',
  'dropback-mid': 'mid',
  'dropback-deep': 'deep',
  'play-action-short': 'short',
  'play-action-deep': 'deep',
  trick: 'mid',
};

function tag(
  concept: Concept,
  confidence: number,
  reason: string,
): PlayTag {
  return {
    family: CONCEPT_FAMILY[concept],
    concept,
    depth: CONCEPT_DEPTH[concept],
    confidence,
    reason,
    source: 'heuristic',
  };
}

interface Rule {
  test: RegExp;
  build: (playName: string) => PlayTag;
}

const DEEP = /deep|vert|street|post|fade|\bgo\b|bomb|seam|shot|ball|mills|nines|pump|max protect|dagger|yankee|hb angle/i;
const SHORT = /quick|slant|hitch|flat|stick|spacing|now|snag|spot|rub|pick|all curl|shallow|speed out/i;

/** Ordered most-specific first; the first match wins. */
const RULES: Rule[] = [
  {
    test: /flea|reverse|double pass|hb pass|halfback pass|wildcat|hook and ladder|throwback|trick/i,
    build: () => tag('trick', 0.95, 'trick play name'),
  },
  {
    test: /\bpa\b|play ?action|pa[- ]/i,
    build: (playName) =>
      DEEP.test(playName)
        ? tag('play-action-deep', 0.85, 'play action with deep route language')
        : tag('play-action-short', 0.75, 'play action'),
  },
  {
    test: /screen|bubble|tunnel|slip/i,
    build: () => tag('screen', 0.92, 'screen play name'),
  },
  {
    test: /rpo|run ?pass ?option|peek|glance/i,
    build: () => tag('rpo', 0.9, 'RPO play name'),
  },
  {
    test: /read option|speed option|triple option|zone read|qb (draw|power|sneak|run|keeper|blast)|keeper|designed run/i,
    build: () => tag('qb-run', 0.88, 'quarterback run'),
  },
  {
    test: /draw|delayed hand/i,
    build: () => tag('draw', 0.9, 'draw play name'),
  },
  {
    test: /counter|trap|misdi|wham/i,
    build: () => tag('counter', 0.9, 'counter/trap concept'),
  },
  {
    test: /dive|\biso\b|blast|sn ?eak|gut|fullback|fb (dive|lead)/i,
    build: () => tag('dive', 0.85, 'dive/iso concept'),
  },
  {
    test: /power|duo|lead|gap|pin|pull|belly|wedge/i,
    build: () => tag('gap-power', 0.85, 'gap scheme name'),
  },
  {
    test: /outside|stretch|toss|sweep|bounce|pitch|jet|orbit|end around/i,
    build: () => tag('outside-zone', 0.85, 'outside run name'),
  },
  {
    test: /inside|zone|split/i,
    build: () => tag('inside-zone', 0.8, 'zone scheme name'),
  },
  {
    test: /\b(hb|fb|rb)\b|hand ?off|run|off[- ]tackle/i,
    build: () => tag('inside-zone', 0.5, 'run formation names'),
  },
  {
    test: /slant|hitch|quick|flat|stick|spacing|now|snag|spot|rub|all curl/i,
    build: () => tag('quick-game', 0.8, 'quick game concept name'),
  },
  {
    test: DEEP,
    build: () => tag('dropback-deep', 0.75, 'deep concept name'),
  },
  {
    test: /mesh|cross|dig|levels|flood|sail|drive|smash|wheel|\bout\b|corner|comeback|curl|texas|scissors|pivot|dagger|yankee/i,
    build: () => tag('dropback-mid', 0.75, 'intermediate concept name'),
  },
  {
    test: SHORT,
    build: () => tag('dropback-short', 0.6, 'short concept name'),
  },
];

export interface TagOptions {
  conceptOverride?: string | null;
  familyOverride?: string | null;
  /** Formation-level hint from the playbook data ("Pass" / "Run"). */
  formationCategory?: string | null;
}

function isConcept(value: string): value is Concept {
  return Object.prototype.hasOwnProperty.call(CONCEPT_LABELS, value);
}

/**
 * Tag a play. Manual overrides always win, so the stored tags can be corrected
 * without losing the ability to re-run the heuristic later.
 */
export function tagPlay(playName: string, options: TagOptions = {}): PlayTag {
  const overrideConcept = options.conceptOverride ?? null;
  if (overrideConcept && isConcept(overrideConcept)) {
    const family =
      options.familyOverride && isFamily(options.familyOverride)
        ? options.familyOverride
        : CONCEPT_FAMILY[overrideConcept];
    return {
      family,
      concept: overrideConcept,
      depth: CONCEPT_DEPTH[overrideConcept],
      confidence: 1,
      reason: 'manual override',
      source: 'manual',
    };
  }

  for (const rule of RULES) {
    if (rule.test.test(playName)) {
      return rule.build(playName);
    }
  }

  if (options.formationCategory && /run/i.test(options.formationCategory)) {
    return tag('inside-zone', 0.3, 'run category fallback');
  }

  return tag('dropback-mid', 0.25, 'no keyword matched; defaulting to intermediate dropback');
}

function isFamily(value: string): value is PlayFamily {
  return ['run', 'pass', 'play-action', 'screen', 'rpo', 'trick'].includes(value);
}

/** Plays whose tag is weak enough to deserve a human pass. */
export function needsCuration(t: PlayTag): boolean {
  return t.confidence < 0.5 && t.source === 'heuristic';
}

export function isDropback(t: PlayTag): boolean {
  return t.concept.startsWith('dropback');
}

export function isRun(t: PlayTag): boolean {
  return t.family === 'run';
}

export function isPassing(t: PlayTag): boolean {
  return t.family === 'pass' || t.family === 'play-action' || t.family === 'screen';
}
