import type { DevTrait } from './types';

/**
 * Trade valuation.
 *
 * Deliberately transparent and tunable: a standard pick-value curve plus a
 * player value derived from overall, age, development trait and contract. It is
 * here to sanity-check a CPU offer, not to declare a winner — the numbers are
 * approximations and the UI says so.
 */

/** Approximate standard (Jimmy Johnson style) chart: [round][first, last]. */
const ROUND_CURVE: Record<number, [number, number]> = {
  1: [3000, 590],
  2: [580, 270],
  3: [265, 116],
  4: [118, 45],
  5: [49, 21],
  6: [27, 11],
  7: [14, 1],
};

/** Value of a draft pick, interpolated inside its round. */
export function pickValue(round: number, slotInRound = 16): number {
  const curve = ROUND_CURVE[round];
  if (!curve) return round > 7 ? 0.5 : 3000;
  const [first, last] = curve;
  const clamped = Math.min(Math.max(slotInRound, 1), 32);
  const t = (clamped - 1) / 31;
  const value = first + (last - first) * t;
  return Math.round(value);
}

export interface PlayerValueInput {
  overall: number;
  age: number | null;
  devTrait?: DevTrait | null;
  capHit?: number | null;
}

const DEV_MULTIPLIER: Record<DevTrait, number> = {
  normal: 1,
  star: 1.25,
  superstar: 1.5,
  xfactor: 1.75,
};

function ageMultiplier(age: number | null): number {
  if (age === null) return 1;
  if (age <= 23) return 1.45;
  if (age <= 25) return 1.3;
  if (age <= 27) return 1.15;
  if (age <= 29) return 1;
  if (age <= 31) return 0.8;
  if (age <= 33) return 0.6;
  return 0.4;
}

/** A player expressed as an equivalent pick value. */
export function playerValue(input: PlayerValueInput): number {
  const base = 3200 * Math.exp(-0.155 * (99 - input.overall));
  const age = ageMultiplier(input.age);
  const dev = input.devTrait ? DEV_MULTIPLIER[input.devTrait] : 1;
  const contractPenalty = input.capHit
    ? 1 - Math.min(0.25, Math.max(0, input.capHit / 60_000_000) * 0.25)
    : 1;
  return Math.round(base * age * dev * contractPenalty);
}

export interface TradeAssetSummary {
  give: number;
  get: number;
  diff: number;
  verdict: 'fair' | 'slight edge' | 'lopsided';
  favour: 'you' | 'them' | 'even';
  message: string;
}

export function evaluateTrade(giveValue: number, getValue: number): TradeAssetSummary {
  const diff = getValue - giveValue;
  const swing = Math.abs(diff) / Math.max(1, Math.max(giveValue, getValue));
  const verdict: TradeAssetSummary['verdict'] =
    swing <= 0.1 ? 'fair' : swing <= 0.3 ? 'slight edge' : 'lopsided';
  const favour: TradeAssetSummary['favour'] = swing <= 0.1 ? 'even' : diff > 0 ? 'you' : 'them';

  const message =
    favour === 'even'
      ? 'Roughly even on paper.'
      : `${favour === 'you' ? 'You' : 'They'} come out ahead by about ${Math.round(swing * 100)}% of the trade's value.`;

  return { give: giveValue, get: getValue, diff, verdict, favour, message };
}

export function formatValue(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}k`;
  return `${Math.round(value)}`;
}
