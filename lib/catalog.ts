/**
 * Catalog attachment helpers (C0B-v2 §2/§3, ACCEPTANCE A38).
 *
 * Attaching published catalog records to a franchise is an owner action: the
 * result is the *provisional published baseline*, never the game's confirmed
 * state. Missing values stay unknown (never zero), duplicate identity is
 * reported instead of duplicated, and a team is only matched when the match is
 * unambiguous. Opening the roster for a franchise with no attached players
 * attaches its matching team automatically (D126); the picker remains for
 * every other case.
 */

export const CATALOG_ATTACH_LABEL =
  "Published source baseline — provisional and unverified, imported from the catalog. Not the game's confirmed state.";

export const CATALOG_ATTACH_DETAIL =
  "Attached players keep their published facts (team, position, overall) exactly as imported. A missing value stays unknown, and nothing is recalculated or invented. The depth chart's provisional labels continue to apply until you record reality.";

export interface AttachSummary {
  requested: number;
  attached: number;
  alreadyAttached: number;
  alreadyPresent: number;
  revision: number | null;
}

function plural(count: number): string {
  return count === 1 ? "" : "s";
}

/** Truthful one-line result for an attach request, including what was skipped. */
export function attachResultMessage(summary: AttachSummary): string {
  const { attached, alreadyAttached, alreadyPresent } = summary;
  if (attached > 0) {
    const parts = [
      `Attached ${attached} published player${plural(attached)} to this franchise as the provisional source baseline.`,
    ];
    if (alreadyAttached > 0) {
      parts.push(
        `${alreadyAttached} selected player${plural(alreadyAttached)} ${
          alreadyAttached === 1 ? "was" : "were"
        } already on this roster and left untouched.`,
      );
    }
    if (alreadyPresent > 0) {
      parts.push(
        `${alreadyPresent} matched a player already held from another catalog revision, so the newest copy was not added.`,
      );
    }
    return parts.join(" ");
  }

  if (alreadyAttached > 0 && alreadyPresent > 0) {
    return `Nothing attached — ${alreadyAttached} selected player${plural(
      alreadyAttached,
    )} already on this roster, and ${alreadyPresent} held from another catalog revision. No duplicates were created.`;
  }
  if (alreadyAttached > 0) {
    return `Nothing attached — ${alreadyAttached} selected player${plural(alreadyAttached)} ${
      alreadyAttached === 1 ? "is" : "are"
    } already on this roster. No duplicates were created.`;
  }
  if (alreadyPresent > 0) {
    return `Nothing attached — ${alreadyPresent} selected player${plural(
      alreadyPresent,
    )} ${
      alreadyPresent === 1 ? "is" : "are"
    } already held from another catalog revision; a later revision never duplicates or replaces an attached player automatically.`;
  }
  return "Nothing attached.";
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Match a franchise name to a published team label without guessing: an exact
 * normalized match wins; otherwise a unique whole-word suffix/prefix match (so
 * "Falcons" finds "Atlanta Falcons") is accepted. Ambiguous or absent matches
 * return null and the owner picks the team explicitly.
 */
export function matchTeamOption(
  franchiseName: string,
  teams: readonly string[],
): string | null {
  const name = normalize(franchiseName);
  if (!name) return null;

  const exact = teams.find((team) => normalize(team) === name);
  if (exact) return exact;

  const partial = teams.filter((team) => {
    const normalizedTeam = normalize(team);
    return normalizedTeam.endsWith(` ${name}`) || name.endsWith(` ${normalizedTeam}`);
  });
  return partial.length === 1 ? partial[0] : null;
}

/**
 * Escape user text for a PostgREST `ilike` pattern. `%` and `_` must not act as
 * wildcards, and the backslash escape itself must be escaped.
 */
export function escapeSearchTerm(term: string): string {
  return term.trim().replace(/[\\%_]/g, "\\$&");
}

/** The published overall from a record's ratings jsonb; null means unknown. */
export function overallFromRatings(ratings: unknown): number | null {
  if (ratings === null || typeof ratings !== "object") return null;
  const raw = (ratings as Record<string, unknown>).overallRating;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
