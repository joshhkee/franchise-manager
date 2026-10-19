import { formationsOf } from "../formations/catalog";
import { resolveFormation } from "../formations/resolver";
import type { ChartPlayer } from "../depth-chart";
import type { FormationState } from "../data/formations";
import { DRIVE_THEME_TEMPLATES } from "./themes";

export function resolveGamedayFormation(state: FormationState, formationId: string) {
  for (const theme of DRIVE_THEME_TEMPLATES) {
    const formation = formationsOf(theme.defaultBookId).find((item) => item.id === formationId);
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
