/**
 * C0B-v2 §2 (CB-1) identity reconciliation.
 *
 * Identity is decided by a declared composite key — never names alone and never
 * `sourceId` alone. This module is the concrete normalization C1B records for
 * that contract constant; changing it is a §12 contract amendment.
 *
 * Rules implemented here:
 * - Within one revision, `sourceId` identifies the record, and a repeated
 *   `sourceId` with materially different data is a conflict.
 * - Across revisions a record is `matched` only when the normalized composite
 *   key agrees: the normalized name matches and at least one corroborating
 *   field (birthdate, team, or listed position) is available on both sides and
 *   every available corroborating field is consistent.
 * - `sourceId` agreement with a contradictory key, more than one candidate
 *   agreeing, or any partial agreement is a `conflict` for owner disposition —
 *   never a silent `matched`.
 * - No key match at all is `new`.
 * - Repeat import of the same revision is idempotent: identical records
 *   re-classify as `matched` instead of creating duplicates.
 */

export type CoverageStatus = "complete_as_imported" | "partial" | "unsupported";

export type ReconciliationOutcome = "matched" | "new" | "conflict";

export interface SourcePlayerLike {
  sourceId: string;
  fullName: string;
  /** ISO `yyyy-mm-dd`, or null/absent when the source does not publish it. */
  birthdate?: string | null;
  team?: string | null;
  listedPosition?: string | null;
}

export interface ExistingSourceRecord extends SourcePlayerLike {
  id: string;
}

export interface Classification {
  outcome: ReconciliationOutcome;
  /** Present when the outcome is `matched`. */
  matchedId?: string;
  /** Candidate ids that made the record ambiguous; present on `conflict`. */
  candidates?: string[];
  reason: string;
}

type CorroboratingField = "birthdate" | "team" | "listedPosition";

const CORROBORATING_FIELDS: CorroboratingField[] = ["birthdate", "team", "listedPosition"];

/**
 * Normalization: Unicode-decomposed, diacritics stripped, lowercased, every
 * non-alphanumeric run collapsed to a single space, trimmed. Name suffixes are
 * deliberately preserved (dropping "jr"/"iii" would merge distinct people).
 */
export function normalizeText(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeName(value: string | null | undefined): string {
  return normalizeText(value);
}

export function normalizeTeam(value: string | null | undefined): string {
  return normalizeText(value);
}

export function normalizePosition(value: string | null | undefined): string {
  return normalizeText(value);
}

export function normalizeBirthdate(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function normalizedField(record: SourcePlayerLike, field: CorroboratingField): string {
  switch (field) {
    case "birthdate":
      return normalizeBirthdate(record.birthdate);
    case "team":
      return normalizeTeam(record.team);
    case "listedPosition":
      return normalizePosition(record.listedPosition);
  }
}

/** Fields where both records carry a value, so they can corroborate or contradict. */
function overlappingFields(a: SourcePlayerLike, b: SourcePlayerLike): CorroboratingField[] {
  return CORROBORATING_FIELDS.filter(
    (field) => normalizedField(a, field) !== "" && normalizedField(b, field) !== "",
  );
}

function agrees(a: SourcePlayerLike, b: SourcePlayerLike): boolean {
  return normalizeName(a.fullName) !== "" && normalizeName(a.fullName) === normalizeName(b.fullName);
}

function contradictions(a: SourcePlayerLike, b: SourcePlayerLike): CorroboratingField[] {
  return overlappingFields(a, b).filter((field) => normalizedField(a, field) !== normalizedField(b, field));
}

/**
 * True only when the composite key agrees: same normalized name, at least one
 * corroborating field available on both sides, and no contradiction.
 */
export function keysAgree(a: SourcePlayerLike, b: SourcePlayerLike): boolean {
  if (!agrees(a, b)) return false;
  const overlap = overlappingFields(a, b);
  if (overlap.length === 0) return false;
  return contradictions(a, b).length === 0;
}

/**
 * Classify an incoming record against the existing records of the target
 * revision (or the catalog, for a cross-revision import).
 */
export function classifyRecord(
  incoming: SourcePlayerLike,
  existing: readonly ExistingSourceRecord[],
): Classification {
  const sameSourceId = existing.filter((record) => record.sourceId === incoming.sourceId);

  if (sameSourceId.length > 1) {
    return {
      outcome: "conflict",
      candidates: sameSourceId.map((record) => record.id),
      reason: "ambiguous_source_id: more than one existing record shares this sourceId",
    };
  }

  if (sameSourceId.length === 1) {
    const candidate = sameSourceId[0];
    if (keysAgree(incoming, candidate)) {
      return { outcome: "matched", matchedId: candidate.id, reason: "source_id_and_key_agree" };
    }
    const differing = contradictions(incoming, candidate);
    return {
      outcome: "conflict",
      candidates: [candidate.id],
      reason:
        differing.length > 0
          ? `source_id_conflicts_on_${differing.join("_")}`
          : "source_id_agrees_but_the_composite_key_cannot_be_corroborated",
    };
  }

  const nameMatches = existing.filter((record) => agrees(incoming, record));

  if (nameMatches.length === 0) {
    return { outcome: "new", reason: "no_name_or_source_id_match" };
  }

  if (nameMatches.length > 1) {
    return {
      outcome: "conflict",
      candidates: nameMatches.map((record) => record.id),
      reason: "several_candidates_share_the_normalized_name",
    };
  }

  const candidate = nameMatches[0];
  if (keysAgree(incoming, candidate)) {
    return { outcome: "matched", matchedId: candidate.id, reason: "composite_key_agrees" };
  }

  const differing = contradictions(incoming, candidate);
  return {
    outcome: "conflict",
    candidates: [candidate.id],
    reason:
      differing.length > 0
        ? `composite_key_conflicts_on_${differing.join("_")}`
        : "composite_key_partially_agrees_only",
  };
}
