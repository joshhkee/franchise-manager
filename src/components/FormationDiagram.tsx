import type { Formation, SlotResolution } from '@/domain/types';

/**
 * Our own field diagram, drawn from slot coordinates.
 *
 * The point of drawing it ourselves is that every spot can carry *your* player's
 * name, so a formation shows exactly who lines up where — and any spot that is
 * pinned by a formation sub is visibly marked.
 */

export interface DiagramPlayer {
  name: string;
  overall?: number;
  source?: SlotResolution['source'];
  unavailable?: boolean;
}

export function FormationDiagram({
  formation,
  players,
  highlightRoles = [],
}: {
  formation: Formation;
  /** Resolved player per slot key. */
  players: Record<string, DiagramPlayer | undefined>;
  highlightRoles?: string[];
}) {
  const width = 320;
  const height = 240;
  // y=1 is the line of scrimmage at the bottom of the card.
  const toX = (x: number) => 20 + x * (width - 40);
  const toY = (y: number) => height - 22 - y * (height - 50);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full rounded-lg border border-line bg-emerald-950/40"
      role="img"
      aria-label={`${formation.name} diagram`}
    >
      <defs>
        <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b2b1c" />
          <stop offset="100%" stopColor="#0f3a25" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#fieldGrad)" />
      {[...Array(6)].map((_, index) => (
        <line
          key={index}
          x1={24 + index * ((width - 48) / 5)}
          y1={10}
          x2={24 + index * ((width - 48) / 5)}
          y2={height - 12}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}
      <line x1={16} y1={height - 22} x2={width - 16} y2={height - 22} stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />

      {formation.slots.map((slot) => {
        const player = players[slot.key];
        const isHighlighted = slot.roleCode ? highlightRoles.includes(slot.roleCode) : false;
        const isOverridden = player?.source === 'override';
        const fill = player?.unavailable
          ? '#7f1d1d'
          : isOverridden
            ? '#7c3aed'
            : isHighlighted
              ? 'var(--accent)'
              : '#1f2937';
        return (
          <g key={slot.key} transform={`translate(${toX(slot.x)}, ${toY(slot.y)})`}>
            <circle r="13" fill={fill} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
            <text
              textAnchor="middle"
              y="3.5"
              fontSize="9"
              fontWeight="700"
              fill={isHighlighted ? 'var(--accent-fg)' : '#ffffff'}
              style={{ pointerEvents: 'none' }}
            >
              {slot.label.slice(0, 4)}
            </text>
            {player ? (
              <text
                textAnchor="middle"
                y={slot.y > 0.55 ? 26 : -18}
                fontSize="8.5"
                fill={player.unavailable ? '#fca5a5' : 'rgba(255,255,255,0.85)'}
              >
                {player.name}
              </text>
            ) : (
              <text textAnchor="middle" y={slot.y > 0.55 ? 26 : -18} fontSize="8" fill="#fca5a5">
                unassigned
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
