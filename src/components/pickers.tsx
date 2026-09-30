import type { RosterPlayer } from '@/domain/types';

function optionLabel(player: RosterPlayer): string {
  const dev =
    player.franchise.devTrait === 'xfactor'
      ? ' ★★★★'
      : player.franchise.devTrait === 'superstar'
        ? ' ★★★'
        : player.franchise.devTrait === 'star'
          ? ' ★★'
          : '';
  return `${player.firstName.charAt(0)}. ${player.lastName} · ${player.position} · ${player.overall}${dev}`;
}

export function PlayerSelect({
  players,
  name,
  selected,
  emptyLabel = '— nobody —',
  includeEmpty = true,
  id,
}: {
  players: RosterPlayer[];
  name: string;
  selected?: string | null;
  emptyLabel?: string;
  includeEmpty?: boolean;
  id?: string;
}) {
  const sorted = [...players].sort((a, b) => b.overall - a.overall);
  return (
    <select id={id} name={name} defaultValue={selected ?? ''} className="field">
      {includeEmpty ? <option value="">{emptyLabel}</option> : null}
      {sorted.map((player) => (
        <option key={player.id} value={player.id}>
          {optionLabel(player)}
        </option>
      ))}
    </select>
  );
}

export function EligiblePlayerSelect({
  players,
  positions,
  name,
  selected,
  includeEmpty = true,
  emptyLabel = '— inherit / nobody —',
}: {
  players: RosterPlayer[];
  positions: string[];
  name: string;
  selected?: string | null;
  includeEmpty?: boolean;
  emptyLabel?: string;
}) {
  const eligible = positions.length
    ? players.filter((player) => positions.includes(player.position))
    : players;
  const others = players.filter((player) => !eligible.includes(player));
  const sortedEligible = [...eligible].sort((a, b) => b.overall - a.overall);
  const sortedOthers = [...others].sort((a, b) => b.overall - a.overall);

  return (
    <select name={name} defaultValue={selected ?? ''} className="field">
      {includeEmpty ? <option value="">{emptyLabel}</option> : null}
      {/* Out-of-position players stay selectable: sometimes that is the point. */}
      <optgroup label="Natural fits">
        {sortedEligible.map((player) => (
          <option key={player.id} value={player.id}>
            {optionLabel(player)}
          </option>
        ))}
      </optgroup>
      {sortedOthers.length ? (
        <optgroup label="Out of position">
          {sortedOthers.map((player) => (
            <option key={player.id} value={player.id}>
              {optionLabel(player)}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}

export function TeamSelect({
  teams,
  name,
  selected,
  includeEmpty = true,
  emptyLabel = '— none —',
}: {
  teams: { id: string; name: string; abbr: string }[];
  name: string;
  selected?: string | null;
  includeEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <select name={name} defaultValue={selected ?? ''} className="field">
      {includeEmpty ? <option value="">{emptyLabel}</option> : null}
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.abbr} · {team.name}
        </option>
      ))}
    </select>
  );
}
