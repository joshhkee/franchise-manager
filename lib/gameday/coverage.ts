import { DRIVE_THEME_TEMPLATES } from "./themes";
import { SITUATION_BUCKETS } from "./types";
import { catalogFor } from "./catalog";

export interface CoverageCell {
  themeId: string;
  bookId: string;
  situationId: string;
  supported: boolean;
  playCount: number;
  note: string;
}

/** Counts only mapped source plays; never fills an empty matrix cell with a guess. */
export function buildGamedayCoverageGrid(): CoverageCell[] {
  return DRIVE_THEME_TEMPLATES.flatMap((theme) => {
    const plays = catalogFor(theme.defaultBookId, theme.side).filter((play) => play.themes.includes(theme.id));
    return SITUATION_BUCKETS.map((situation) => {
      const count = plays.filter((play) => play.situations.includes(situation.id)).length;
      const declaration = theme.intentionallyUnsupportedSituations.find((item) => item.situationId === situation.id);
      return {
        themeId: theme.id,
        bookId: theme.defaultBookId,
        situationId: situation.id,
        supported: count > 0 && !declaration,
        playCount: count,
        note: declaration?.reason ?? (count ? `${count} curated Civil.GG plays; role/family suitability is heuristic.` : "No curated plays in this situation; not inferred or padded."),
      };
    });
  });
}
