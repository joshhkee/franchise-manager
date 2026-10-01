'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ARCHETYPES,
  ATTRIBUTE_GROUPS,
  ATTRIBUTE_LABELS,
  readAttribute,
  resolveArchetypeId,
} from '@/domain/archetypes';
import { formatHeight, formatWeight } from '@/domain/playerTable';
import { Badge, ovrTone } from '@/components/ui';

/**
 * Click a player, read his whole card.
 *
 * The ratings import stores all 53 of EA's attributes for every player, and a table
 * can only show three of them — so the full sheet lives behind the name. This is the
 * only interactive data component in the app (`NavBar` is the other client file), and
 * it stays deliberately thin: a button and a native `<dialog>`, no state beyond
 * "is it open", no fetching. Escape and the backdrop close it because the browser
 * already knows how.
 *
 * The sheet is **rendered on first open, not up front**: a table of 100 players would
 * otherwise ship 100 copies of a 53-row sheet in the HTML for the one card somebody
 * actually reads.
 */

/** What the sheet needs. `RosterPlayer` satisfies it, so callers pass players straight through. */
export interface PlayerSheetPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  jersey: number | null;
  overall: number;
  age: number | null;
  heightInches: number | null;
  weightLbs?: number | null;
  college: string | null;
  ratings: Record<string, number | string>;
}

const DEV_LABEL: Record<string, string> = {
  xfactor: 'X-Factor',
  superstar: 'Superstar',
  star: 'Star',
  normal: 'Normal',
};

export function PlayerDialog({
  player,
  teamAbbr,
  devTrait,
  label,
  className = '',
}: {
  player: PlayerSheetPlayer;
  /** The club to show in the header; the unsigned pool passes none. */
  teamAbbr?: string | null;
  /** Comes from the franchise overlay, not the player row. */
  devTrait?: string | null;
  /** Trigger text; defaults to `F. Last`. */
  label?: ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
  }, [open]);

  const name = `${player.firstName} ${player.lastName}`;
  const storedArchetype = typeof player.ratings.archetype === 'string' ? player.ratings.archetype : null;
  const archetypeId = resolveArchetypeId(storedArchetype);
  const archetype = ARCHETYPES.find((entry) => entry.id === archetypeId) ?? null;
  /** The attributes Madden itself counts for this archetype — worth knowing at a glance. */
  const counted = new Set<string>(archetype?.attributes ?? []);
  const abilities =
    typeof player.ratings.abilities === 'string'
      ? player.ratings.abilities
          .split(',')
          .map((ability) => ability.trim())
          .filter(Boolean)
      : [];
  const subtitle = [player.position, player.jersey !== null ? `#${player.jersey}` : null, teamAbbr ?? 'Free agent']
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${name} — full stat sheet`}
        className={`text-left underline decoration-dotted decoration-1 underline-offset-2 transition hover:text-ink ${className}`}
      >
        {label ?? `${player.firstName.charAt(0)}. ${player.lastName}`}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // The inner panel fills the dialog, so a click on the dialog itself is the backdrop.
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto max-h-[85vh] w-[min(40rem,92vw)] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/55"
      >
        {open ? (
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-lg font-semibold tracking-tight">
                  {player.firstName} {player.lastName}
                </h2>
                <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="btn-mini shrink-0"
              >
                Close
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={ovrTone(player.overall)}>{player.overall} OVR</Badge>
              {devTrait && DEV_LABEL[devTrait] ? <Badge tone="info">{DEV_LABEL[devTrait]}</Badge> : null}
              {archetype ? (
                <Badge title={archetype.description}>
                  {archetype.name}
                  {storedArchetype ? '' : ' (derived)'}
                </Badge>
              ) : null}
              {!teamAbbr ? <Badge tone="warn">unsigned</Badge> : null}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 border-y border-line py-2 text-sm sm:grid-cols-3">
              {[
                ['Height', formatHeight(player.heightInches)],
                ['Weight', formatWeight(player.weightLbs)],
                ['Age', player.age ?? '—'],
                ['College', player.college ?? '—'],
                ['Jersey', player.jersey !== null ? `#${player.jersey}` : '—'],
                ['Position', player.position],
              ].map(([term, value]) => (
                <div key={String(term)} className="flex items-baseline justify-between gap-2 py-0.5">
                  <dt className="text-muted">{term}</dt>
                  <dd className="truncate font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 space-y-3">
              {ATTRIBUTE_GROUPS.map((group) => {
                const rows = group.attributes
                  .map((attribute) => ({ attribute, value: readAttribute(player.ratings, attribute) }))
                  .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
                // A group the feed never published for this player is left out rather than
                // shown as 20 dashes.
                if (rows.every((row) => row.value === null)) return null;
                return (
                  <section key={group.id}>
                    <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                      {group.label}
                    </h3>
                    <dl className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
                      {rows.map(({ attribute, value }) => (
                        <div
                          key={attribute}
                          className="flex items-baseline justify-between gap-2 text-sm"
                          title={
                            counted.has(attribute) && archetype
                              ? `Madden counts ${ATTRIBUTE_LABELS[attribute]} for ${archetype.name}`
                              : undefined
                          }
                        >
                          <dt className="truncate text-muted">
                            {counted.has(attribute) ? (
                              <span className="text-accent-text" aria-hidden>
                                •{' '}
                              </span>
                            ) : null}
                            {ATTRIBUTE_LABELS[attribute]}
                          </dt>
                          <dd className="font-medium tabular-nums">{value ?? '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                );
              })}
            </div>

            {abilities.length ? (
              <div className="mt-4">
                <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                  Abilities
                </h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {abilities.map((ability) => (
                    <Badge key={ability} tone="info">
                      {ability}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              Every value here is EA&apos;s own, from the Madden 27 ratings database
              (<code>npm run scrape:ratings</code> → <code>npm run import:ratings</code>). Attributes
              marked <span className="text-accent-text">•</span> are the ones Madden counts for
              {archetype ? ` ${archetype.name}` : ' this archetype'}. Contracts and cap figures are not
              published by that feed.
              {!teamAbbr
                ? ' He is unsigned in EA\'s data, so this is the rating he launched with — weekly updates only republish rostered players.'
                : ''}
            </p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
