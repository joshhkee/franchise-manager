/**
 * C3B coverage model — the honest status of every playbook in the 86-book
 * inventory (D082/A17, D130, D131).
 *
 * Nothing here is game-verified: the D113 supplement is still open and every
 * slot mapping in the catalog is a provisional default, so `verified` is
 * deliberately unreachable today. The status is derived from the catalog, never
 * hand-written per book, so it cannot drift from the data it describes.
 */

import { formationsOf } from "./catalog";
import { INVENTORY_META, PLAYBOOK_INVENTORY } from "./playbooks";
import type { EvidenceTier, PlaybookRef } from "./types";

export type CoverageStatus = "verified" | "partial" | "unsupported";

export const COVERAGE_STATUSES: CoverageStatus[] = ["verified", "partial", "unsupported"];

export const COVERAGE_STATUS_LABELS: Record<CoverageStatus, string> = {
  verified: "Verified",
  partial: "Partial",
  unsupported: "Unsupported",
};

/**
 * Plain-language meanings, shown in the interface. "Verified" means every
 * formation is mapped from a named source with nothing left provisional — it is
 * not an in-game check, which needs the D113 supplement.
 */
export const COVERAGE_STATUS_MEANINGS: Record<CoverageStatus, string> = {
  verified:
    "Every formation is mapped from a recorded source, with no provisional defaults left. Still not an in-game check while D113 is open.",
  partial:
    "Formation data is loaded, but every mapping is a provisional default that only the game can confirm.",
  unsupported:
    "No formation data is loaded yet. The source's published play count is all this catalog knows about the book.",
};

export interface CoverageProvenance {
  /** Where this book's inventory row came from. */
  source: string;
  sourceUrl: string;
  /** Date the source was observed, as recorded by the crawling thread. */
  observedAt: string;
  /** Evidence tiers actually present in this book's slots. */
  slotEvidence: EvidenceTier[];
  note: string;
}

export interface BookCoverage {
  playbook: PlaybookRef;
  status: CoverageStatus;
  /** One plain-language sentence explaining the status for this book. */
  detail: string;
  formationCount: number;
  mappedCount: number;
  slotCount: number;
  /** Slots still carrying the provisional default tier. */
  provisionalSlots: number;
  provenance: CoverageProvenance;
}

export interface CoverageReport {
  source: {
    source: string;
    sourceUrl: string;
    observedAt: string;
    note: string;
  };
  entries: BookCoverage[];
  totals: Record<CoverageStatus, number>;
  counts: {
    books: number;
    loaded: number;
    formations: number;
    mapped: number;
    provisionalSlots: number;
  };
}

/** Which tier a book's slots carry, most provisional first. */
function tiersOf(evidence: EvidenceTier[]): EvidenceTier[] {
  return [...new Set(evidence)].sort((a, b) => (a === "unverified_default" ? -1 : b === "unverified_default" ? 1 : 0));
}

function statusFor(formationCount: number, mappedCount: number, provisionalSlots: number): CoverageStatus {
  if (formationCount === 0) return "unsupported";
  if (mappedCount < formationCount) return "partial";
  return provisionalSlots > 0 ? "partial" : "verified";
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function detailFor(
  playbook: PlaybookRef,
  status: CoverageStatus,
  mappedCount: number,
  formationCount: number,
  provisionalSlots: number,
): string {
  if (status === "unsupported") {
    return `No formation data yet — the source lists ${plural(playbook.totalPlays, "play")} for this book.`;
  }
  if (mappedCount < formationCount) {
    return `${mappedCount} of ${formationCount} formations mapped; ${plural(
      provisionalSlots,
      "slot is",
      "slots are",
    )} still provisional.`;
  }
  if (provisionalSlots > 0) {
    return `All ${formationCount} formations mapped, but ${plural(
      provisionalSlots,
      "slot is",
      "slots are",
    )} still provisional.`;
  }
  return `All ${formationCount} formations mapped from named sources.`;
}

function provenanceFor(playbook: PlaybookRef, slotEvidence: EvidenceTier[]): CoverageProvenance {
  return {
    source: INVENTORY_META.source,
    sourceUrl: "https://www.civil.gg/playbooks/madden",
    observedAt: INVENTORY_META.crawledAt,
    slotEvidence,
    note:
      slotEvidence.length === 0
        ? "Inventory row only; no mapped slots to show evidence for."
        : `Slot evidence in this book: ${slotEvidence.join(", ")}.`,
  };
}

/**
 * Reconcile all 86 inventoried books with what the catalog actually carries.
 * Deterministic and side-effect free so the same report can be rendered, tested
 * and quoted in an owner document.
 */
export function buildCoverageReport(): CoverageReport {
  const entries: BookCoverage[] = PLAYBOOK_INVENTORY.map((playbook) => {
    const formations = formationsOf(playbook.id);
    const mapped = formations.filter((formation) => formation.status === "mapped");
    const slots = mapped.flatMap((formation) => formation.slots);
    const slotEvidence = tiersOf(slots.map((s) => s.evidence));
    const provisionalSlots = slots.filter((s) => s.evidence === "unverified_default").length;
    const status = statusFor(formations.length, mapped.length, provisionalSlots);

    return {
      playbook,
      status,
      detail: detailFor(playbook, status, mapped.length, formations.length, provisionalSlots),
      formationCount: formations.length,
      mappedCount: mapped.length,
      slotCount: slots.length,
      provisionalSlots,
      provenance: provenanceFor(playbook, slotEvidence),
    };
  });

  const totals: Record<CoverageStatus, number> = { verified: 0, partial: 0, unsupported: 0 };
  for (const entry of entries) totals[entry.status] += 1;

  return {
    source: {
      source: INVENTORY_META.source,
      sourceUrl: "https://www.civil.gg/playbooks/madden",
      observedAt: INVENTORY_META.crawledAt,
      note: INVENTORY_META.note,
    },
    entries,
    totals,
    counts: {
      books: entries.length,
      loaded: entries.filter((entry) => entry.formationCount > 0).length,
      formations: entries.reduce((sum, entry) => sum + entry.formationCount, 0),
      mapped: entries.reduce((sum, entry) => sum + entry.mappedCount, 0),
      provisionalSlots: entries.reduce((sum, entry) => sum + entry.provisionalSlots, 0),
    },
  };
}
