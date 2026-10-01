# Design Review — Franchise Manager

Status: owner approved overall navigation, neutral schematic direction, phone navigation, and compact marker fallback in Round 15 (D074–D078). Wireframes remain documentation, not a pixel-perfect approved mockup. Fine spacing/tokens and proposed performance targets still need execution review.

## Visual contract

- A working sports-operations application, not a marketing website or an AI assistant.
- Light default plus optional dark; neutral surfaces, restrained team accents (Atlanta red initially), clear typography, compact readable tables.
- No decorative stadium art, oversized hero sections, purple gradients, sparkle/copilot treatments, gratuitous glowing/glass panels, or charts without an operational purpose.
- Proposed typography: a readable system sans-serif; tabular numerals for ranks, ratings, and money. No paid font or external font dependency required.
- Color does not carry state alone: text/icons identify pending, overridden, unavailable, invalid, saving, failed, and conflicted states.
- Target keyboard-accessible controls, visible focus, sufficient contrast in both themes, and reduced-motion support. Do not animate ordinary data updates theatrically.
- Proposed minimum touch target: 44 CSS pixels for main mobile actions. Compact desktop rows must not dictate phone tap size.
- Keep top-level navigation stable. Tabs organize alternate views; no carousel navigation for operational content.

## Proposed information architecture

1. Overview
2. Lineups — Depth Chart / Formation Subs
3. GM War Room — Roster / Trade Block / Trade Targets / Assets & Moves
4. Coach View — Scheme & Playbook / Personnel Gaps / Formation Identity
5. Gameday — Offense / Defense, editable drive plans
6. Checklist

Franchise selector and APP save status remain globally accessible. Use 'Saved to app', not a generic 'Synced' label that could imply console synchronization. Pending game changes have a separate label; prototype shell controls remain explicitly not connected until C1B. Settings contains theme, data provenance, franchise archive/create, backup/restore, and account controls. Avoid separate settings navigation items for every minor setting.

A player detail panel is reused across roster, scouting, depth chart, and diagram selection. A formation preview is reused across Coach View, lineup editing, and Gameday. Each workflow has one authoritative editor; other screens link to it rather than creating competing copies.

## Desktop wireframes

Target review sizes: 1440×900 and 1280×720 CSS pixels (proposed; actual owner resolution not provided). Long lists may scroll within a focused work area. At small heights, allow safe scrolling rather than clip controls or shrink text. Avoid several independently scrolling tiny panels.

### App shell / Overview

```text
┌───────────────┬──────────────────────────────────────────────────────┐
│ Franchise ▾   │ Overview                              Saved · Theme  │
│               ├──────────────────────────────────────────────────────┤
│ Overview      │ Falcons · Published baseline: unverified in-game    │
│ Lineups       │                                                      │
│ GM War Room   │ Pending game changes   │ Lineup issues               │
│ Coach View    │ [review checklist]     │ [resolve issues]            │
│ Gameday       │                        │                             │
│ Checklist (n) │ Offense / defense books and schemes                  │
│               │ [open formation subs]  [open gameday]                │
│               │                                                      │
│ Settings      │ Resume recent work; no fabricated records or stats   │
└───────────────┴──────────────────────────────────────────────────────┘
```

Show useful counts only. No empty win-loss record, automatic season tracker, fake charts, or placeholder 'AI insight' card. If there are no pending changes/issues, use a quiet empty state with a useful next action.

### Lineups / Depth Chart

```text
┌───────────────┬──────────────────────────────────────────────────────┐
│ Navigation    │ Lineups                    Planned ▾ · Saving status │
│               │ [Depth Chart] [Formation Subs]        Checklist (n) │
│               ├──────────────┬────────────────────────┬──────────────┤
│               │ Offense     │ WR                     │ Player info  │
│               │ Defense     │ Rank / name / # / OVR  │ on selection │
│               │ Specialists │ 1 … [move] [replace]   │ relevant     │
│               │             │ 2 … [move] [replace]   │ attributes   │
│               │ Positions   │ 3 … [move] [replace]   │ and fit      │
│               │ in verified │                        │              │
│               │ game order  │ Baseline differences   │              │
│               └─────────────┴────────────────────────┴──────────────┤
│               │ Practice squad available separately, not eligible   │
│               │ for active formation use without promotion           │
└───────────────┴──────────────────────────────────────────────────────┘
```

Primary workspace is one selected position's ordered list. A compact overview of other positions may be added if it improves comparison without forcing tiny rows. Dragging has move/select alternatives. Planned/confirmed inspection must be unambiguous; default editing changes the plan. Player detail may collapse at narrow desktop widths.

### Lineups / Formation Subs

```text
┌───────────────┬──────────────────────────────────────────────────────┐
│ Navigation    │ Offense / Defense · Playbook ▾ · Sync status         │
│               │ [Depth Chart] [Formation Subs]                       │
│               ├────────────────┬─────────────────────────────────────┤
│               │ Search         │ Formation name · Personnel · ★      │
│               │ Formation sets │                                     │
│               │ Favorites      │              DIAGRAM                │
│               │ Override badge │ # + name + OVR + slot role          │
│               │ Conflict badge │                                     │
│               │                │ Selected slot → replace / reset     │
│               │                │ Inherited from: SLWR1 (if verified) │
│               │                │ Override / conflict explanation      │
│               └────────────────┴─────────────────────────────────────┤
│               │ Changed slots → checklist; reset scope is explicit   │
└───────────────┴──────────────────────────────────────────────────────┘
```

**Non-negotiable orientation:**

```text
OFFENSE                               DEFENSE
TOP: WR / TE / offensive line         TOP: secondary / deeper defenders
     QB / backs below                      linebackers above the front
BOTTOM: offensive backfield           BOTTOM: defensive line / front
```

Exact slot coordinates, left/right identities, formation labels, and whether a slot inherits a specialist role come from verified version-specific mappings. Do not decide inheritance from visual location alone. No player may appear twice in a resolved eleven-player formation. Invalid overrides remain visible for deliberate repair.

For readability, default markers may use abbreviated first names and full surnames, with complete names in the selection panel. Owner approved jersey-number circles when full labels create clutter (D075). Full name/number/OVR must remain available through hover AND click/tap/keyboard selection plus an accessible personnel detail/list; do not make mobile depend on hover. A compact/full toggle is a proposed way to make the choice predictable. Neither mode may hide conflicts or override status.

### GM War Room

- Roster: compact table with player, position, OVR, selected fit indicators, known years/cap values. Unknown is not zero.
- Trade Block: a short explained list, not an opaque 'sell score'. Pin/dismiss/notes. Surplus depends on chosen personnel needs, not just roster count.
- Trade Targets: searchable/filterable other-team candidates, explained scheme match or athletic outlier reasons, same pin/dismiss/notes controls.
- Comparison: a few selected players, consistent fields, missing-data labels; avoid a 53-column table.
- Assets & Moves: manual pick ledger and owner-entered trades. Sign/cut/practice-squad tools are secondary actions, not dominant recommendation cards.
- Contract totals show completeness and do not invent dead-cap calculations.

### Coach View

- Scheme & Playbook: separate Madden archetype match from practical role suitability. Scheme/playbook choice and roster impact are visible together.
- Personnel Gaps: identify missing starters/backups and role workload; link to authoritative lineup/roster editors.
- Formation Identity: favorites, coherent personnel/look families, complementary concepts; link to gameday plan editing instead of duplicating it.

### Checklist

- Group by useful Madden action/menu workflow, with verified prerequisites determining order—not a fixed transactions/chart/subs/player-edit order when a position edit or another action must happen first. App-only preferences/notes never enter this list.
- Each item shows current confirmed → planned target, game location where verified, and prerequisites.
- Offer individual and reviewed bulk confirmation, cancel, undo, and clear conflict explanations.
- A confirmation attests 'I did this in Madden'; it does not imply app-to-game synchronization.
- Bulk review reveals exact executable action units and visibly excluded/blocked units before submission. Submit the reviewed valid scope atomically; if revisions/dependencies changed, apply none and request a fresh review. Do not silently skip at submission. A depth-chart ordered list is one unit by default; partial completion is between valid units or recording the actual valid list.

## Phone wireframes

Target review widths: 390 and 430 CSS pixels for iOS; include 360 CSS pixels as a narrow stress case. Verify actual iOS Safari when feasible; emulation alone is not proof. Portrait is primary; landscape must remain usable.

### Gameday — highest-priority phone workflow

```text
┌────────────────────────────────────┐
│ Falcons · Gameday        Saved      │
│ [Offense] [Defense]                 │
│ Theme: Under center ▾     [edit]     │
├────────────────────────────────────┤
│ [1st] [2nd] [3rd] [4th]             │
│ [Short] [Medium] [Long]              │
│ Field zone ▾     More context ▾     │
├────────────────────────────────────┤
│ Formation · exact play name         │
│ Purpose / one coaching cue          │
│ [play art if permitted]             │
│ [Details ▾]               [Pin ★]   │
├────────────────────────────────────┤
│ Another complementary call          │
│ Why it belongs to this drive theme  │
│ [Details ▾]                         │
├────────────────────────────────────┤
│ [navigate to another workspace]     │
└────────────────────────────────────┘
```

- Keep offense/defense, theme, and essential situation controls reachable; do not let sticky areas occupy most of a short screen.
- Show three complementary eligible calls, or fewer if verified coverage is insufficient; no filler. Eligible pins compete within the same three slots; a >3-pin tie-break is explicit, not an extra unbounded section of recommendations. Incompatible favorites stay browsable but do not override eligibility. Label whether personnel comes from planned or recorded roster; C5A resolves that owner choice before game-ready claims.
- Clock/score/personnel/tendency remain optional contextual controls, not a mandatory form before seeing calls.
- Situation choices must use researched, explicit buckets; no unexplained magic numbers.
- Expanded coaching detail is on demand. Return to the same theme/situation after inspecting art/details.
- Prefetch/cache current online plan where appropriate for speed, but do not claim offline support. Clearly report connection/save failures.

### Other phone workflows

- Navigation approved: Overview, Lineups, Gameday, Checklist, plus More for GM/Coach/settings. Verify labels and tap targets at narrow widths; do not cram all sections into the bottom bar.
- Depth chart: choose category/position, then one full-width ranked list. Drag is optional; rank/move controls stay usable.
- Formation subs: select book/formation, view a full-width diagram, tap a slot to open a player picker/detail sheet. Never require precision mouse-sized taps.
- Checklist: full-width grouped actions with prerequisites, confirmation, and undo. No horizontal table scrolling for essential content.
- GM: prioritize search, shortlist, basic player detail/compare; complex bulk editing may favor desktop as agreed.

## Proposed accessibility and performance acceptance

- Keyboard navigation covers selection, reordering, replacement, confirmation, dialogs, and focus return.
- Text and status contrast checked in both themes; no color-only warnings. C1A records objective criteria (recommended WCAG AA text contrast and non-text/focus checks) rather than calling unspecified 'meaningful accessibility' sufficient. Do not claim certified compliance without testing.
- Browser back/forward and deep links preserve understandable franchise context.
- Long names, unknown attributes, empty lists, failed loads, narrow/short viewports, 200% zoom, iOS safe-area insets and the virtual keyboard do not make core actions inaccessible. C1A documents usable reflow/touch/focus criteria; auto-compact markers preserve full details and invalid/override status.
- No large player dataset shipped solely to draw a single formation or phone call sheet. Fetch/page/search deliberately.
- Proposed phone objective: cached/in-memory situation changes feel immediate (rough target <200 ms without a network round trip). C5A/C5B records a repeatable build/device/network/catalog-size/warm-vs-cold measurement protocol first; report deviations and their impact rather than presenting a single unexplained timing as proof.
- Propose web-vitals targets LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 on representative pages, with a documented test environment and real free-tier caveats. These are proposed targets, not owner-approved guarantees.

## Owner review items

- Navigation, combined Lineups, phone navigation, neutral field, and compact-marker fallback approved in D074–D076.
- Review actual coded long-name/collision behavior during the formation-sub checkpoint; full details must remain touch/keyboard accessible.
- Per-PR tests/browser/owner acceptance is approved in D069. Review exact performance benchmarks and rendered accessibility behavior during execution; optional inspiration references must not override the approved restrained direction.
- Do not treat this document's proposed pixel sizes or performance values as already approved decisions.
