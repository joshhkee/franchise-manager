import { ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS, readAttribute, type EaAttributeKey } from './archetypes';
import type { RosterPlayer } from './types';

/**
 * Ranking every player in the league by any attribute.
 *
 * The ratings import stores all 53 of EA's numeric attributes for every player, so the
 * question "who is the fastest man available" is answerable without another scrape —
 * it just needs one table that can sort by any of them and a filter that starts on the
 * owner's own roster. This module is the pure half of that: sorting, filtering and the
 * labels, testable without a database or a browser.
 */

/**
 * The unsigned pool has no team id, so the team checklist carries a sentinel for it —
 * free agents are a group an owner thinks in, even though EA publishes no team row.
 */
export const FREE_AGENT_TEAM = 'FA';

/** Sorts that are not attributes: identity columns and the two published measurements. */
export const IDENTITY_SORTS = ['ovr', 'name', 'age', 'height', 'weight'] as const;
export type IdentitySort = (typeof IDENTITY_SORTS)[number];

/** Anything the table can rank by: an attribute, or one of the identity columns. */
export type PlayerSort = EaAttributeKey | IdentitySort;

const IDENTITY_SORT_LABELS: Record<string, string> = {
  ovr: 'Overall',
  name: 'Name',
  age: 'Age',
  height: 'Height',
  weight: 'Weight',
};

/** The sort dropdown, in the sheet's own groups so 53 attributes stay findable. */
export const SORT_GROUPS: { label: string; sorts: PlayerSort[] }[] = [
  { label: 'Overall & measurements', sorts: [...IDENTITY_SORTS] },
  ...ATTRIBUTE_GROUPS.map((group) => ({ label: group.label, sorts: group.attributes })),
];

export const ALL_SORTS: PlayerSort[] = SORT_GROUPS.flatMap((group) => group.sorts);

export function isPlayerSort(value: string | null | undefined): value is PlayerSort {
  return Boolean(value) && ALL_SORTS.includes(value as PlayerSort);
}

export function sortLabel(sort: PlayerSort): string {
  return IDENTITY_SORT_LABELS[sort] ?? ATTRIBUTE_LABELS[sort as EaAttributeKey] ?? sort;
}

/** Which group a player belongs to for the checklist: his team, or the unsigned pool. */
export function teamOfPlayer(player: RosterPlayer): string {
  return player.teamId ?? player.franchise.teamId ?? FREE_AGENT_TEAM;
}

/** The number behind a sort, or `null` when the source does not publish it. */
export function sortValue(player: RosterPlayer, sort: PlayerSort): number | null {
  switch (sort) {
    case 'ovr':
      return player.overall;
    case 'age':
      return player.age;
    case 'height':
      return player.heightInches;
    case 'weight':
      return player.weightLbs ?? null;
    case 'name':
      return null;
    default:
      return readAttribute(player.ratings, sort);
  }
}

/** A player with the attribute missing sinks to the bottom rather than reading as a zero. */
export function compareBySort(sort: PlayerSort): (a: RosterPlayer, b: RosterPlayer) => number {
  if (sort === 'name') {
    return (a, b) =>
      a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
  }
  return (a, b) => {
    const left = sortValue(a, sort);
    const right = sortValue(b, sort);
    if (left === right) return tieBreak(a, b);
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  };
}

/** Ties read best by who is better, then alphabetically — never by row order. */
function tieBreak(a: RosterPlayer, b: RosterPlayer): number {
  return (
    b.overall - a.overall ||
    a.lastName.localeCompare(b.lastName) ||
    a.firstName.localeCompare(b.firstName)
  );
}

export interface PlayerFilter {
  /** Team ids to keep; `FREE_AGENT_TEAM` means the unsigned pool. Empty keeps everyone. */
  teams: string[];
  /** A primary position, or `ALL`. */
  position: string;
  minOvr: number;
  /** Case-insensitive substring of the full name. */
  query: string;
}

export function filterPlayers(players: RosterPlayer[], filter: PlayerFilter): RosterPlayer[] {
  const wanted = new Set(filter.teams);
  const query = filter.query.trim().toLowerCase();
  return players.filter((player) => {
    if (wanted.size > 0 && !wanted.has(teamOfPlayer(player))) return false;
    if (filter.position !== 'ALL' && player.position !== filter.position) return false;
    if (player.overall < filter.minOvr) return false;
    if (query) {
      const name = `${player.firstName} ${player.lastName}`.toLowerCase();
      if (!name.includes(query)) return false;
    }
    return true;
  });
}

/** `6'2"`, the way a roster reads it. */
export function formatHeight(inches: number | null | undefined): string {
  if (inches === null || inches === undefined) return '—';
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

/** `203 lb`, or a dash when the source is silent. */
export function formatWeight(pounds: number | null | undefined): string {
  return pounds === null || pounds === undefined ? '—' : `${pounds} lb`;
}
