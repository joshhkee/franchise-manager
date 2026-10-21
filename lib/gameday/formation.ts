import { LOADED_BOOK_IDS, formationsOf } from "../formations/catalog";
import { resolveFormation } from "../formations/resolver";
import type { ChartPlayer } from "../depth-chart";
import type { FormationState } from "../data/formations";

export function resolveGamedayFormation(state: FormationState, formationId: string) {
  for (const bookId of LOADED_BOOK_IDS) {
    const formation = formationsOf(bookId).find((item) => item.id === formationId);
    if (!formation) continue;
    const result = resolveFormation({
      formation,
      playersById: new Map<string, ChartPlayer>(state.players.map((player) => [player.id, player])),
      chartLists: state.chartLists,
      overrides: state.overrides,
    });
    return { ok: true as const, data: result };
  }
  return { ok: false as const, message: "That formation is not in a loaded book." };
}
