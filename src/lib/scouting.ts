import { DEFAULT_DEFENSE_PLAYBOOK_IDS, DEFAULT_OFFENSE_PLAYBOOK_IDS } from '@/data/seed/playbooks';
import { schemeIdForPlaybook } from '@/domain/schemeFit';
import { SCHEME_BY_ID, schemesForSide } from '@/domain/schemes';
import type { Side } from '@/domain/types';
import type { ScoutingSchemes } from '@/domain/scouting';

export type TwoSided = Exclude<Side, 'special'>;

export const TWO_SIDED: TwoSided[] = ['offense', 'defense'];

/**
 * Which scheme to grade a side against.
 *
 * The plan stores one playbook, so only one side of the ball can come from it; the
 * other falls back to the first seeded playbook for its side. `/scheme` and the
 * league scouting screens share this so a grade means the same thing on both.
 */
export function defaultSchemeFor(side: TwoSided, planPlaybookId: string | null): string | null {
  if (planPlaybookId) {
    const mapped = SCHEME_BY_ID.get(schemeIdForPlaybook(planPlaybookId) ?? '');
    if (mapped && mapped.side === side) return mapped.id;
  }
  const fallback =
    side === 'offense' ? DEFAULT_OFFENSE_PLAYBOOK_IDS[0] : DEFAULT_DEFENSE_PLAYBOOK_IDS[0];
  return schemeIdForPlaybook(fallback);
}

/** Resolve the two requested schemes, validating each against the real scheme table. */
export function resolveSchemes(
  params: { offense?: string; defense?: string },
  planPlaybookId: string | null,
): Record<TwoSided, string> {
  const ids = {} as Record<TwoSided, string>;
  for (const side of TWO_SIDED) {
    const requested = side === 'offense' ? params.offense : params.defense;
    const options = schemesForSide(side);
    const fallback = defaultSchemeFor(side, planPlaybookId);
    ids[side] = options.some((scheme) => scheme.id === requested)
      ? (requested as string)
      : options.some((scheme) => scheme.id === fallback)
        ? (fallback as string)
        : (options[0]?.id ?? '');
  }
  return ids;
}

/** The scheme objects for a resolved id pair. */
export function schemePair(ids: Record<TwoSided, string>): ScoutingSchemes {
  return {
    offense: SCHEME_BY_ID.get(ids.offense) ?? null,
    defense: SCHEME_BY_ID.get(ids.defense) ?? null,
  };
}

/** The query string that carries a scheme pair onto a team page. */
export function schemeQuery(ids: Record<TwoSided, string>): string {
  return new URLSearchParams({ offense: ids.offense, defense: ids.defense }).toString();
}

/** A short "you are grading against X and Y" line the pages print next to grades. */
export function describeSchemes(schemes: ScoutingSchemes): string {
  const parts = [schemes.offense?.name, schemes.defense?.name].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'no scheme selected';
}
