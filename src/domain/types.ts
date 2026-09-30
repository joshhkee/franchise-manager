/**
 * Core domain types for the franchise manager.
 *
 * Everything in `src/domain` is pure, dependency-free and deterministic so it can be
 * unit tested and reused by both the server and the client.
 */

export type Side = 'offense' | 'defense' | 'special';

export type DevTrait = 'normal' | 'star' | 'superstar' | 'xfactor';

export type InjuryStatus = 'healthy' | 'questionable' | 'out' | 'ir';

export type RosterStatus = 'active' | 'practice-squad' | 'ir' | 'free-agent';

/** A player as it comes from an external source (EA ratings API, save file). */
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  /** Base position, e.g. `WR`, `CB`, `LT`. */
  position: string;
  jersey: number | null;
  teamId: string | null;
  overall: number;
  age: number | null;
  heightInches: number | null;
  college: string | null;
  /** Raw attribute map, e.g. `{ speed_rating: 93 }`. */
  ratings: Record<string, number | string>;
  salary: number | null;
}

/** Franchise-specific overlay that is never clobbered by a ratings refresh. */
export interface FranchisePlayer {
  playerId: string;
  teamId: string | null;
  contractYears: number | null;
  capHit: number | null;
  devTrait: DevTrait | null;
  injuryStatus: InjuryStatus;
  injuryWeeks: number | null;
  rosterStatus: RosterStatus;
  notes: string | null;
}

export interface RosterPlayer extends Player {
  franchise: FranchisePlayer;
}

export function playerName(p: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${p.firstName.charAt(0)}. ${p.lastName}`;
}

export function playerFullName(p: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${p.firstName} ${p.lastName}`;
}

export function isAvailable(f: Pick<FranchisePlayer, 'injuryStatus' | 'rosterStatus'>): boolean {
  if (f.rosterStatus === 'ir' || f.rosterStatus === 'practice-squad') return false;
  return f.injuryStatus === 'healthy' || f.injuryStatus === 'questionable';
}

export function availabilityProblem(
  f: Pick<FranchisePlayer, 'injuryStatus' | 'rosterStatus'>,
): string | null {
  if (f.rosterStatus === 'ir') return 'on injured reserve';
  if (f.rosterStatus === 'practice-squad') return 'on the practice squad';
  if (f.injuryStatus === 'ir') return 'on injured reserve';
  if (f.injuryStatus === 'out') return 'listed as out';
  if (f.injuryStatus === 'questionable') return 'listed as questionable';
  return null;
}

/* -------------------------------------------------------------------------- */
/* Depth chart                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A role on Madden's depth chart. Slots are the vocabulary the game itself uses,
 * including the package roles (`SLWR`, `3DRB`, `NT`, `SUBLB`, `SLCB`, ...) that
 * formations consult when deciding who lines up.
 */
export interface DepthSlot {
  code: string;
  label: string;
  side: Side;
  group: string;
  /** Positions that may be placed in this slot without a warning. */
  eligiblePositions: string[];
  /** Display order inside its group. */
  order: number;
  /** How many ranked rows the in-game screen shows for this slot. */
  ranks: number;
  /**
   * True for the package (secondary) positions — `SLWR`, `3DRB`, `NT`, `SUBLB`,
   * `SLCB` — which only exist on the depth chart. False for a primary position.
   */
  situational: boolean;
  description: string;
  /**
   * Whether this vocabulary entry has been confirmed against the game.
   * Seeded entries start unverified until checked on a real depth chart screen.
   */
  verified: boolean;
}

/** Serializable depth chart: slot code -> rank-indexed player ids (index 0 = starter). */
export interface DepthChartState {
  entries: Record<string, (string | null)[]>;
}

export function emptyDepthChart(): DepthChartState {
  return { entries: {} };
}

export function getDepthPlayer(
  chart: DepthChartState,
  code: string,
  rank = 1,
): string | null {
  const row = chart.entries[code];
  if (!row) return null;
  return row[rank - 1] ?? null;
}

export function setDepthPlayer(
  chart: DepthChartState,
  code: string,
  rank: number,
  playerId: string | null,
): DepthChartState {
  const next: DepthChartState = { entries: { ...chart.entries } };
  const row = [...(next.entries[code] ?? [])];
  while (row.length < rank) row.push(null);
  row[rank - 1] = playerId;
  next.entries[code] = row;
  return next;
}

/* -------------------------------------------------------------------------- */
/* Formations                                                                 */
/* -------------------------------------------------------------------------- */

/** One alignment spot in a formation, with display coordinates for the diagram. */
export interface FormationSlot {
  key: string;
  /** Label printed on the diagram, e.g. `WR3`, `SLWR`, `TE`. */
  label: string;
  /** Depth-chart role this spot consumes by default. */
  roleCode: string | null;
  /** Which rank of that role is consumed (1 = starter). */
  roleRank: number;
  /** Normalized diagram coordinates, 0..1 with y=0 at the line of scrimmage. */
  x: number;
  y: number;
  eligiblePositions: string[];
  /** Free-form position name used when no depth-chart role applies. */
  positionFallback: string | null;
}

export interface FormationPlay {
  id: string;
  name: string;
  /** Optional manual concept tag; otherwise derived by the tagger. */
  conceptOverride?: string | null;
  familyOverride?: string | null;
}

export interface Formation {
  id: string;
  playbookId: string;
  name: string;
  /** Gun / Singleback / Pistol / I-Form / Nickel / Dime / 3-4 / ... */
  set: string;
  /** Personnel group, e.g. `11`, `12`, `21`, `nickel`. */
  personnel: string;
  /** Trips / Doubles / Bunch / Stack / Empty / Tight / ... */
  distribution: string;
  side: Side;
  /** Offensive/defensive family key, e.g. `gun-trips`. */
  family: string;
  slots: FormationSlot[];
  plays: FormationPlay[];
  notes: string | null;
}

export interface Playbook {
  id: string;
  name: string;
  /** NFL team the playbook belongs to, or `custom`. */
  team: string;
  side: Side;
  source: 'civil' | 'madden-school' | 'manual' | 'seed';
  season: string;
  url: string | null;
}

/* -------------------------------------------------------------------------- */
/* Plans: depth chart + formation subs, resolved together                      */
/* -------------------------------------------------------------------------- */

export type SlotMode = 'inherit' | 'override';

/**
 * How a single formation slot gets its player.
 *
 * - `inherit` (default): follow the depth chart through the slot's role.
 * - `override`: pin a specific player for this formation only. This is the
 *   in-game "formation sub" the app mirrors.
 */
export interface FormationSub {
  formationId: string;
  slotKey: string;
  mode: SlotMode;
  playerId: string | null;
  /** Redirect the inheritance to a different role than the slot's default. */
  inheritSlotCode: string | null;
  inheritRank: number | null;
  note: string | null;
}

export interface Plan {
  id: string;
  name: string;
  playbookId: string;
  depthChart: DepthChartState;
  subs: FormationSub[];
}

export function subKey(formationId: string, slotKey: string): string {
  return `${formationId}:${slotKey}`;
}

export function indexSubs(subs: FormationSub[]): Map<string, FormationSub> {
  const map = new Map<string, FormationSub>();
  for (const sub of subs) map.set(subKey(sub.formationId, sub.slotKey), sub);
  return map;
}

export type ResolutionSource = 'override' | 'inherit' | 'fallback' | 'unresolved';

export interface SlotResolution {
  formationId: string;
  slotKey: string;
  label: string;
  playerId: string | null;
  source: ResolutionSource;
  /** Role the player came from, when inherited. */
  viaSlotCode: string | null;
  viaRank: number | null;
  /**
   * The role this slot consults, whether it inherits from it or overrides it.
   * This is what the impact analysis groups formations by.
   */
  roleUsed: { code: string; rank: number } | null;
  /** Why we could not put a player here. */
  problem: string | null;
}

export interface FormationResolution {
  formation: Formation;
  slots: SlotResolution[];
  /** Distinct players on the field; duplicates are impossible in game. */
  personnelIds: string[];
  duplicates: { playerId: string; slotKeys: string[]; labels: string[] }[];
  unavailable: { playerId: string; label: string; problem: string }[];
  unresolved: { label: string; slotKey: string }[];
}
