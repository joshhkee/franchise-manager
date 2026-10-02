import { AddCustomPlayerForm } from "./add-custom-player-form";
import { AutosaveScope } from "./autosave/autosave-provider";
import { EmptyState } from "./empty-state";
import { PlayerFieldEditor } from "./player-field-editor";
import type { FranchisePlayer, FranchiseSummary, Loaded, PlayerField } from "../lib/data/franchises";

function unknown(value: string | null): string {
  return value === null || value === "" ? "Unknown" : value;
}

function PlayerCard({
  player,
  fields,
}: {
  player: FranchisePlayer;
  fields: PlayerField[];
}) {
  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">{player.fullName}</p>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          {player.origin === "custom" ? "Custom player" : "Source player"}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Team: {unknown(player.team)} · Listed position: {unknown(player.listedPosition)} · Archetype:{" "}
        {unknown(player.archetype)}
        {player.origin === "custom" && player.customKey
          ? ` · App id ${player.customKey}`
          : ""}
      </p>
      <PlayerFieldEditor playerId={player.id} fields={fields} />
    </li>
  );
}

export function RosterPanel({
  franchise,
  players,
  fields,
}: {
  franchise: FranchiseSummary;
  players: Loaded<FranchisePlayer[]>;
  fields: Loaded<PlayerField[]>;
}) {
  if (!players.ok || !fields.ok) {
    return (
      <EmptyState
        title="Roster could not be read"
        detail={
          !players.ok ? players.message : !fields.ok ? fields.message : "Unknown read failure."
        }
        hint="Nothing was changed. Reload to retry."
      />
    );
  }

  return (
    <AutosaveScope franchiseId={franchise.id} revision={franchise.revision}>
      <div className="space-y-4">
        <section className="rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">{franchise.name} roster</h2>
          <p className="text-xs text-ink-muted">
            Revision {franchise.revision} · {players.data.length} player
            {players.data.length === 1 ? "" : "s"} · {franchise.pendingFieldCount} pending edit
            {franchise.pendingFieldCount === 1 ? "" : "s"}
          </p>
        </div>
          <p className="mt-1 max-w-prose text-xs text-ink-muted">
            Edits autosave a moment after you stop typing. Every save is revision-checked: if this franchise
            changed elsewhere, nothing is written and the edit is reported instead of overwriting it. Unknown
            values stay unknown — never zero.
          </p>
          <div className="mt-3">
            <AddCustomPlayerForm franchiseId={franchise.id} revision={franchise.revision} />
          </div>
        </section>

        {players.data.length === 0 ? (
          <EmptyState
            title="No players in this franchise yet"
            detail="Add a custom player above. Source-backed players are attached once a source revision is imported into the catalog."
            hint="Unknown contract and attribute values stay visibly unknown; nothing is invented."
          />
        ) : (
          <ul className="space-y-3">
            {players.data.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                fields={fields.data.filter((field) => field.franchisePlayerId === player.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </AutosaveScope>
  );
}
