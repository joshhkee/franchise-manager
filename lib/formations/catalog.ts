import type { FormationDef, PlaybookRef } from "./types";
import { PLAYBOOK_INVENTORY } from "./playbooks";
import { BEARS_OFFENSE } from "./data/bears-offense";
import { FALCONS_DEFENSE } from "./data/falcons-defense";
import { FALCONS_OFFENSE } from "./data/falcons-offense";
import { VIKINGS_DEFENSE } from "./data/vikings-defense";

/** The books whose formation data this site already carries (C3A scope, D128). */
export const LOADED_BOOKS: Record<string, FormationDef[]> = {
  "nfl-off-falcons": FALCONS_OFFENSE,
  "nfl-off-bears": BEARS_OFFENSE,
  "nfl-def-falcons": FALCONS_DEFENSE,
  "nfl-def-vikings": VIKINGS_DEFENSE,
};

export const LOADED_BOOK_IDS = new Set(Object.keys(LOADED_BOOKS));

export function playbookById(id: string): PlaybookRef | null {
  return PLAYBOOK_INVENTORY.find((book) => book.id === id) ?? null;
}

export function formationsOf(bookId: string): FormationDef[] {
  return LOADED_BOOKS[bookId] ?? [];
}

export function formationById(bookId: string, formationId: string): FormationDef | null {
  const set = new Map(formationsOf(bookId).map((formation) => [formation.id, formation]));
  return set.get(formationId) ?? null;
}

export function isLoadedBook(bookId: string): boolean {
  return LOADED_BOOK_IDS.has(bookId);
}

/** Offense books default to the Falcons stock offense (D022); defense to Falcons defense. */
export function defaultBookFor(side: "offense" | "defense"): string {
  return side === "offense" ? "nfl-off-falcons" : "nfl-def-falcons";
}

export interface InventoryEntry {
  playbook: PlaybookRef;
  loaded: boolean;
  formationCount: number;
  mappedCount: number;
}

/** Every in-game playbook with its load status (C3A inventory list view). */
export function inventoryEntries(): InventoryEntry[] {
  return PLAYBOOK_INVENTORY.map((playbook) => {
    const formations = formationsOf(playbook.id);
    return {
      playbook,
      loaded: formations.length > 0,
      formationCount: formations.length,
      mappedCount: formations.filter((formation) => formation.status === "mapped").length,
    };
  });
}
