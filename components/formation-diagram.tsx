"use client";

import type { ResolvedSlot } from "../lib/formations/resolver";
import { ORIENTATION_NOTE } from "../lib/formations/types";

/**
 * Formation diagram (C3A). Offense renders with the O-line at TOP and the
 * offense's left on the viewer's left; defense renders with the D-line at BOTTOM
 * drawn from the offense's view (defense-left = viewer's right) — both
 * owner-attested in D128 and labeled in the UI (IR-9 stays honest).
 *
 * Coordinates are authored in the rendered orientation already: offense stored
 * line-at-top/offense-left=viewer-left; defense stored from the offense's view
 * (defense-left = viewer-right). No runtime flipping.
 *
 * Rendering uses native SVG elements (not foreignObject) so the field scales
 * with its container while text stays proportional inside the viewBox. The
 * viewBox is side-specific (offense crops to its band; defense spans the full
 * field), x extends past 0/100 so edge-aligned receivers stay fully visible,
 * and all circles render before all text so a stacked marker (QB under C)
 * never hides another slot's label.
 *
 * Accessibility (ACCEPTANCE A16): every marker is a real button — full name and
 * OVR are reachable by tap/click AND keyboard; compact number circles are a
 * display treatment, never the only carrier of detail; unknown numbers and
 * overall ratings show as the slot label / "OVR unknown", never invented values.
 */

export type MarkerMode = "name" | "compact";

interface DiagramProps {
  slots: ResolvedSlot[];
  side: "offense" | "defense";
  mode: MarkerMode;
  selectedSlotId: string | null;
  jerseyNumbers: ReadonlyMap<string, string | null>;
  onSelectSlot: (slotId: string) => void;
}

const SLOT_RADIUS = 5.4;
/** Desired center-to-center distance between markers (diameter + breathing room). */
const SEPARATION = SLOT_RADIUS * 2 + 1;
/**
 * Extra pull inside one cohesive group (C-group): adjacent same-group markers
 * settle at a tighter center distance than SEPARATION, so the O-line reads as
 * one unit instead of blending into an evenly spaced receiver line.
 */
const COHESION_SEPARATION = SLOT_RADIUS * 2 - 0.8;
/** Slot groups rendered as one cohesive cluster when adjacent. */
const COHESIVE_GROUPS: ReadonlySet<string> = new Set(["oline", "dline"]);

const VIEWBOX: Record<"offense" | "defense", string> = {
  offense: "-10 0 120 52",
  defense: "-10 0 120 100",
};

/**
 * Deterministic render-only layout: each cohesive group (O-line, D-line) is
 * re-laid as ONE near-touching chain at its authored center — so the line reads
 * as a single unit instead of blending into an evenly spaced row of receivers —
 * and every other alignment keeps its authored coordinates, with a relaxation
 * pass that pushes only cross-group pairs apart so bunched slots (X–TE–LT,
 * QB under C) stay legible. Slot ids, labels, and stored coordinates are
 * untouched; this is presentation layout, not a mapping change.
 */
function relaxedPositions(slots: ResolvedSlot[], maxY: number): Map<string, { x: number; y: number }> {
  const minX = -8 + SLOT_RADIUS;
  const maxX = 108 - SLOT_RADIUS;
  const minY = SLOT_RADIUS + 0.5;
  const ceiling = maxY - SLOT_RADIUS - 0.5;

  // Chain reflow for cohesive groups: ordered by authored x, centered on the
  // group's authored span, all at the group's authored line height.
  const chainGroupOf = new Map<string, string>();
  const pos = slots.map((resolved) => ({ id: resolved.slot.id, x: resolved.slot.x, y: resolved.slot.y }));
  const byId = new Map(pos.map((p) => [p.id, p]));
  for (const group of COHESIVE_GROUPS) {
    const members = slots.filter((resolved) => resolved.slot.group === group);
    if (members.length < 2) continue;
    const ordered = [...members].sort((a, b) => a.slot.x - b.slot.x);
    const center = (ordered[0].slot.x + ordered[ordered.length - 1].slot.x) / 2;
    const avgY = members.reduce((sum, m) => sum + m.slot.y, 0) / members.length;
    ordered.forEach((resolved, index) => {
      const target = byId.get(resolved.slot.id);
      if (!target) return;
      target.x = Math.min(maxX, Math.max(minX, center + (index - (ordered.length - 1) / 2) * COHESION_SEPARATION));
      target.y = Math.min(ceiling, Math.max(minY, avgY));
      chainGroupOf.set(resolved.slot.id, group);
    });
  }

  for (let iteration = 0; iteration < 80; iteration += 1) {
    let moved = false;
    for (let i = 0; i < slots.length; i += 1) {
      for (let j = i + 1; j < slots.length; j += 1) {
        const groupI = chainGroupOf.get(slots[i].slot.id);
        if (groupI && groupI === chainGroupOf.get(slots[j].slot.id)) continue; // chain already placed
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const distance = Math.hypot(dx, dy) || 0.05;
        if (distance < SEPARATION) {
          const push = (SEPARATION - distance) / 2;
          const ux = dx / distance;
          const uy = dy / distance;
          pos[i].x -= ux * push;
          pos[i].y -= uy * push;
          pos[j].x += ux * push;
          pos[j].y += uy * push;
          moved = true;
        }
      }
    }
    for (const p of pos) {
      p.x = Math.min(maxX, Math.max(minX, p.x));
      p.y = Math.min(ceiling, Math.max(minY, p.y));
    }
    if (!moved) break;
  }
  return new Map(pos.map((p) => [p.id, { x: p.x, y: p.y }]));
}

export function FormationDiagram({
  slots,
  side,
  mode,
  selectedSlotId,
  jerseyNumbers,
  onSelectSlot,
}: DiagramProps) {
  const maxY = side === "offense" ? 52 : 100;
  const positions = relaxedPositions(slots, maxY);
  return (
    <div>
      <svg
        viewBox={VIEWBOX[side]}
        className="mx-auto h-auto w-full max-w-[440px] rounded-md border border-line bg-surface"
        role="img"
        aria-label={`Formation diagram. ${ORIENTATION_NOTE}`}
      >
        {/* Line of scrimmage across the middle (defense view shows it; offense crop ends at y=50). */}
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="0.4"
          strokeDasharray="2 1.5"
        />
        {/* Pass 1: every marker surface, so overlapping circles never cover text. */}
        {slots.map((resolved) => {
          const isSelected = selectedSlotId === resolved.slot.id;
          const fill = resolved.conflict
            ? "var(--warn)"
            : resolved.pendingOverride
              ? "var(--accent)"
              : isSelected
                ? "var(--accent)"
                : "var(--surface-muted)";
          return (
            <circle
              key={resolved.slot.id}
              data-testid={`formation-slot-${resolved.slot.id}`}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${resolved.slot.label}: ${markerDetail(resolved, jerseyNumbers)}`}
              cx={positions.get(resolved.slot.id)?.x ?? resolved.slot.x}
              cy={positions.get(resolved.slot.id)?.y ?? resolved.slot.y}
              r={SLOT_RADIUS}
              fill={fill}
              stroke={isSelected ? "var(--accent)" : "var(--line)"}
              strokeWidth={isSelected ? 1.2 : 0.5}
              className="cursor-pointer outline-none focus-visible:stroke-[var(--accent)] focus-visible:[stroke-width:1.6]"
              onClick={() => onSelectSlot(resolved.slot.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectSlot(resolved.slot.id);
                }
              }}
            >
              <title>{markerDetail(resolved, jerseyNumbers)}</title>
            </circle>
          );
        })}
        {/* Pass 2: all labels, drawn above every circle. */}
        {slots.map((resolved) => {
          const { slot, player } = resolved;
          const isActive = resolved.conflict !== null || resolved.pendingOverride || selectedSlotId === slot.id;
          const ink = isActive ? "#ffffff" : "var(--ink)";
          const mainText = mode === "compact" ? (jerseyOf(resolved, jerseyNumbers) !== null ? `#${jerseyOf(resolved, jerseyNumbers)}` : slot.label) : slot.label;
          const subText = mode === "compact" ? null : player ? shortName(player.fullName) : "—";
          const at = positions.get(slot.id) ?? { x: slot.x, y: slot.y };
          return (
            <g key={slot.id} className="pointer-events-none select-none">
              <text
                x={at.x}
                y={at.y + 2}
                textAnchor="middle"
                fontSize={4.2}
                fontWeight={650}
                fill={ink}
              >
                {mainText}
              </text>
              {subText && (
                <text
                  x={at.x}
                  y={at.y + SLOT_RADIUS + 3.2}
                  textAnchor="middle"
                  fontSize={3.1}
                  fontWeight={550}
                  fill="var(--ink)"
                  stroke="var(--surface)"
                  strokeWidth={1}
                  paintOrder="stroke"
                >
                  {truncated(subText)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-xs text-ink-muted">{ORIENTATION_NOTE}</p>
    </div>
  );
}

function jerseyOf(resolved: ResolvedSlot, jerseyNumbers: ReadonlyMap<string, string | null>): string | null {
  return resolved.player ? jerseyNumbers.get(resolved.player.id) ?? null : null;
}

function markerDetail(resolved: ResolvedSlot, jerseyNumbers: ReadonlyMap<string, string | null>): string {
  const { player } = resolved;
  if (!player) return "Unfilled slot";
  const jersey = jerseyNumbers.get(player.id) ?? null;
  return (
    player.fullName +
    (player.overall !== null ? `, OVR ${player.overall}` : ", OVR unknown") +
    (jersey !== null ? `, #${jersey}` : "") +
    (resolved.pendingOverride ? " — planned override" : "")
  );
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter((part) => !/^(jr|sr|ii|iii|iv|v)\.?$/i.test(part));
  return parts[parts.length - 1] ?? fullName;
}

/** Sub-labels truncate to a fixed budget; the circle's <title> carries the full name. */
function truncated(name: string): string {
  return name.length > 9 ? `${name.slice(0, 8)}…` : name;
}
