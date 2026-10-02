import { AutosaveField } from "./autosave/autosave-field";
import type { PlayerField } from "../lib/data/franchises";

const EDITABLE_FIELDS: { key: string; label: string; numeric: boolean }[] = [
  { key: "listed_position", label: "Listed position", numeric: false },
  { key: "jersey_number", label: "Jersey number", numeric: true },
  { key: "team", label: "Team", numeric: false },
  { key: "archetype", label: "Archetype", numeric: false },
  { key: "overall", label: "Overall", numeric: true },
  { key: "notes", label: "Notes", numeric: false },
];

export function PlayerFieldEditor({
  playerId,
  fields,
}: {
  playerId: string;
  fields: PlayerField[];
}) {
  return (
    <div className="mt-3 space-y-2">
      {EDITABLE_FIELDS.map((field) => {
        const existing = fields.find((row) => row.fieldKey === field.key);
        return (
          <AutosaveField
            key={field.key}
            playerId={playerId}
            fieldKey={field.key}
            label={field.label}
            numeric={field.numeric}
            baselineValue={existing?.baselineValue ?? null}
            planValue={existing?.planValue ?? null}
          />
        );
      })}
    </div>
  );
}
