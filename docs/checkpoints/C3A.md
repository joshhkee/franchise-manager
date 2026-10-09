# C3A — Formation diagrams and overrides (provisional, D128)

## Assignment header

```text
Checkpoint:                   C3A (Falcons formation diagrams and overrides) — PROVISIONAL under D128
Workspace/worktree:           Freebuff worktree .freebuff/worktrees/10029aaf-… (this thread)
Owned feature branch:         freebuff/if-all-requirements-are-met-execute-c3a-according--10029aaf-… (PR #23, merged);
                              post-merge closeout branch: freebuff/c3a-followup-closeout
Verified PR target:           main
Production deployment branch: main
Started from merged base:     0c57c47 (merge of PR #22; C2B owner-accepted and merged)
Owner merge confirmed?        Yes — `main` `cb30b3d` (merge of PR #23); accepted per D129
Predecessor PRs/records:      PRs #17–#22 merged; C2B closed; C0B-v2 §4/§5/§6 binding; D128 authorizes
                              provisional C3A on owner-attested evidence (docs/evidence/C3A-provisional-evidence.md)
Integration owner:            owner; this lane is the single writer for C3A
Owned modules/paths:          lib/formations/**, lib/checklist-formation.ts, lib/actions/formations.ts,
                              lib/data/formations.ts, lib/data/checklist.ts (formation section),
                              lib/actions/checklist.ts (mixed units + formation cancel),
                              components/formation-diagram.tsx, components/formation-panel.tsx,
                              components/checklist-panel.tsx (formation section), app/lineups/page.tsx,
                              app/settings/page.tsx (86-book inventory), app/page.tsx (Overview copy),
                              lib/backup.ts + lib/backup-service.ts (envelope extension),
                              supabase/migrations/0012_formations.sql, tests/**, docs/**
Shared contract version:      C0B-v2 (§4 action units, §5 revision+requestId replay, §6 formation identity,
                              inheritance, explicit overrides, reset scope, backup extension)
Other active lane:            none; delivery mode = one integrated checkpoint
Dev/test environment:         PGlite (real migrations 0001–0012) for DB tests; live Supabase project read by
                              the dev server. `0012_formations.sql` APPLIED by the owner 2026-10-08
                              (verified: "Success. No rows returned" in the SQL editor; the checklist
                              formation section appeared immediately after).
Provisional-rules note:       D128 — every mapping is labeled "Provisional mapping — unverified, editable";
                              the D113 supplement remains OPEN and no claim of in-game verification is made.
```

## Status

- **State: owner accepted & merged (D129) — merged as `cb30b3d` (PR #23) · checks passed (typecheck, lint 0
  errors, 266 tests, build) · migration `0012` APPLIED on the live project (owner, 2026-10-08) · live browser
  verification passed including confirm/undo/two-tab conflict legs · post-merge fixes + this closeout record ship
  in the follow-up PR (`freebuff/c3a-followup-closeout`).**
- All formation data is provisional per D128; the pre-apply honest-failure paths are verified, not accidental.
- 2026-10-06 owner-feedback batch: full Falcons offense mapping, owner-corrected 4-3 Even 6-1, Vikings mirror,
  confirmed sub-package personnel, 11-player audit — see evidence §4a.

## Implemented

- **Catalog and inventory** — [lib/formations/playbooks.ts](../../lib/formations/playbooks.ts): 86-book
  inventory from the Civil.GG crawl (2026-10-06; 32+32 team, 17+5 alternate) with crawl metadata;
  [lib/formations/catalog.ts](../../lib/formations/catalog.ts) declares the four loaded books (Falcons off/def,
  Bears off, Vikings def) and 123 formations (60 mapped after the owner-feedback batch); [app/settings/page.tsx](../../app/settings/page.tsx)
  renders the inventory as a subtle `<details>` list ("86 playbooks · 4 loaded") with the source line.
- **Types, resolver, and orientation** — [lib/formations/types.ts](../../lib/formations/types.ts) encodes the
  owner-attested D128 orientation (offense line at top, offense-left = viewer's left; defense line at bottom
  drawn from the offense's view, defense-left = viewer's right) with no runtime flipping;
  [lib/formations/resolver.ts](../../lib/formations/resolver.ts) resolves a formation from book+formation id
  (never the name) over inherited chart lists plus explicit per-slot overrides, with conflict detection.
- **Data** — [lib/formations/data/](../../lib/formations/data): slots plus the four loaded books' mapped
  formations. Mapped formations render diagrams; the other 63 render honestly as "unmapped" — visible and
  selectable, never an invented diagram (evidence: [C3A-provisional-evidence.md](../evidence/C3A-provisional-evidence.md) §4).
- **Owner-feedback correction batch (2026-10-06)** — the Falcons offense book is fully mapped (42/42) with
  confirmed personnel from the owner's reference sheets + madden.tools (Y Trips Close = 11 personnel with ONE
  SLWR-list slot; Empty sets flex the RB out as a WB; Slot Stack = 21; Wing Pair = 13; Goal Line = 23);
  the 4-3 Even 6-1 now matches the owner's defensive sheet exactly (six on the LOS: WILL/SAM standing at the
  edges over four down linemen, MIKE stacked behind, FS>SS>CB depth order) and the Vikings book mirrors it;
  QB depth follows the set-type ladder (under center 21 / pistol 26 / gun 30); attached TEs sit just outside
  the reflowed tackles; sub-package personnel follow the confirmed packages (Nickel 2-4-5, Big Dime 4-1-6,
  Goal-line 6-2 = 6DL·2LB·3DB); the diagram's line of scrimmage derives from the on-line row instead of a
  hard-coded mid-field line; and a catalog audit test enforces exactly 11 players on every mapped formation
  (it caught and drove out nine over/under-filled mappings this batch).
- **Diagram** — [components/formation-diagram.tsx](../../components/formation-diagram.tsx): native SVG
  `<circle role="button">` markers with keyboard Enter/Space activation and focus-visible rings; two-pass
  rendering (all circles, then all labels) so overlapping circles never cover text; cohesive-group layout —
  the O-line (and D-line) re-lays as one near-touching chain at its authored center so the line reads as a
  single unit instead of blending into the receiver row; sub-labels truncate to a nine-char budget with the
  full name in each circle's `<title>` tooltip; side-specific viewBoxes; compact mode shows only recorded
  jersey numbers and falls back to the slot label, never inventing one (A16); aria-labels carry name/OVR on
  every slot.
- **Panel and actions** — [components/formation-panel.tsx](../../components/formation-panel.tsx) +
  [lib/actions/formations.ts](../../lib/actions/formations.ts): slot editor with player picker, per-slot reset,
  explicit whole-formation reset (scope-stated), favorites, and compact toggle. Set-override/favorite write
  through the server actions with `saved | unauthorized | failed` outcomes.
- **Checklist integration (C0B-v2 §6)** — [lib/checklist-formation.ts](../../lib/checklist-formation.ts)
  derives franchise-wide formation units ONLY from explicit override differences (a chart edit that changes an
  inherited player creates no unit; a same-player override is persistence intent A32, not a unit), with honest
  blocked entries for practice-squad/departed targets. [lib/actions/checklist.ts](../../lib/actions/checklist.ts)
  accepts mixed chart+formation confirm batches, describes formation scope in the review message, and cancels
  formation units by exact slot identity. [components/checklist-panel.tsx](../../components/checklist-panel.tsx)
  gains the "Formation overrides (reviewed separately)" section with cancel buttons and amber blocked cards.
  [lib/data/checklist.ts](../../lib/data/checklist.ts) hides the section unless migration 0012 is actually
  applied (`overridesAvailable` from [lib/data/formations.ts](../../lib/data/formations.ts)) — pre-apply, the
  Lineups surface owns the named not-applied messaging instead of pointing at an action that cannot record.
- **Schema and backup** — [supabase/migrations/0012_formations.sql](../../supabase/migrations/0012_formations.sql):
  `app.formation_overrides` / `app.formation_favorites` (RLS owner-scoped), the two read views, and the
  confirm/cancel/undo support for `formation_slot` units inside the existing checklist batch machinery
  (revision+requestId replay preserved). [lib/backup.ts](../../lib/backup.ts) /
  [lib/backup-service.ts](../../lib/backup-service.ts) extend the envelope with overrides and favorites; older
  envelopes restore as empty.
- Overview copy on [app/page.tsx](../../app/page.tsx) now points at Formation Subs + the Settings inventory.

## Invariants verified

- **Formation identity**: every override, favorite, unit, and cancel payload carries book+formation+slot ids;
  formation names never appear as identity.
- **Inheritance recompute**: chart edits change the inherited baseline inside the diagram immediately and never
  create checklist units; only explicit overrides do.
- **Same-player override = persistence intent (A32)**: plan-equals-baseline writes are stored but produce no unit.
- **Reset scope**: per-slot reset and whole-formation reset are both explicit; no broader reset exists.
- **Atomic reviewed batches**: formation units ride the same confirm/cancel/undo commands as chart units —
  revision+requestId replay, atomic no-op on any invalid unit, prerequisite ordering, and bounded undo all
  unchanged (tests: tests/db/checklist.test.ts, tests/db/formations.test.ts).
- **Provisional honesty**: every mapped formation is labeled "Provisional mapping — unverified, editable ·
  D128"; orientation text is shown under every diagram; no in-game verification is claimed anywhere (D113 open).
- **Missing data**: missing 0012 = honest not-applied states (Lineups banner, checklist section hidden, actions
  fail truthfully); unknown jersey/OVR renders as slot label / "OVR unknown" (A16).
- **Isolation**: new tables are owner-scoped via RLS; cross-franchise requests are refused (DB tests).

## Verification evidence

| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck | `npx tsc --noEmit` | pass | — |
| Lint | `npm run lint` | pass — 0 errors | 2 pre-existing unused-param warnings in `lib/actions/import.ts` |
| Full tests | `npx vitest run` | pass — 26 files, 266 tests | — |
| Formation pure tests | `npx vitest run tests/formations.test.ts` | pass — 22/22 (identity, inheritance recompute, override precedence, same-player persistence, reset scope, orientation math, second-batch set-scoped identity, 11-player catalog audit, owner Y Trips Close + 4-3 Even 6-1 sheets, sub-package personnel, unmapped-honesty counts) | — |
| Formation DB tests | `npx vitest run tests/db/formations.test.ts` | pass — 12/12 (PGlite migrations 0001–0012: overrides/favorites round trip, mixed checklist batches, replay, isolation) | — |
| Formation UI tests | `npx vitest run tests/formation-ui.test.tsx` | pass — 10/10 (override identity, inherit-clear, pending summary/reset, unmapped honesty, favorites, compact fallback, orientation text, sub-label truncation + tooltip, O-line cohesion band) | — |
| Checklist UI tests | `npx vitest run tests/checklist-ui.test.tsx` | pass — 10/10 (incl. new: honest empty state, hidden-when-0012-missing, formation cancel identity, blocked card without cancel button) | — |
| Backup tests | `npx vitest run tests/backup.test.ts tests/db/restore.test.ts` | pass | — |
| Build | `npm run build` | pass — 14 route entries | — |
| Migration apply | `0012_formations.sql` | **APPLIED 2026-10-08** (owner, Supabase SQL editor; byte-exact paste of the file verified against the disk file before running; result "Success. No rows returned") | — |
| Live browser pass | dev server `http://localhost:3220` + shared preview, signed-in owner, live Atlanta Falcons | pass — see below | — |
| Live post-apply round trip | dev server 3220, signed-in owner: set formation override → checklist unit → cancel (2026-10-08) | pass — write (rev bump + "Pending overrides: 1"), unit "Tight Y Off — Z override" on the checklist, cancel clears it (rev bump + history row with stored identity `nfl-off-falcons:singleback:tight-y-off:Z`), no console/network errors | — |
| Live confirm → undo (formation unit) | dev server 3220, signed-in owner: SL override → Confirm (mixed batch) → Undo (2026-10-08) | pass — confirm button includes formation units (`Confirm 2 selected units`: KOS chart + SL override), batch applied atomically (rev 39→40, history row `depth_chart_list:KOS, formation_slot:…:SL`), undo restored both units to pending (rev 40→41) with the honest status message | — |
| Live two-tab double-confirm | two browser tabs both loaded at rev 41; tab 2 confirms (→42), tab 1 confirms from its stale rev-41 view | pass — tab 1 refused atomically: "The plan changed since you reviewed it, so nothing was applied. Reload to review the current checklist." Nothing applied, revision not clobbered | — |
| Tight Y Off alignment vs Civil.GG reference | owner-supplied screenshot (2026-10-08) vs live diagram at mobile width | fixed + pass — TE moved to the right side (attached outside RT), SL moved inside the isolated X on the left, matching the reference (singleback + gun + Flex variants); diagram re-verified by DOM geometry + screenshot at 390px | — |
| Console/network | preview console + network log | clean — no errors | — |
| iOS Safari device check | not run | deferred to C5B per project convention | — |

Live browser pass detail (2026-10-06, owner's real Falcons, revision 34):

1. **Formation Subs tab**: Falcons offense renders all 42 formations (8 mapped with diagrams, 34 honest
   "unmapped"); switching to Bears offense renders its 42.
2. **Live inheritance**: diagram slots show real depth-chart data (QB Tagovailoa, LT Matthews, …) resolved from
   the live roster through the chart lists.
3. **Defense geometry**: Falcons defense book renders 4-3 Even 6-1 with the mirrored orientation (D-line at
   bottom, LE on the viewer's right) and the attested-orientation note under the diagram.
4. **Compact mode**: falls back to slot labels when no jersey is recorded; aria-labels carry full name/OVR.
5. **Slot editor**: opens with the player picker and "Reset slot to inherited"; whole-formation reset states its
   scope; favorite toggle renders (write path fails honestly pre-apply, see 7).
6. **Settings inventory**: 86 rows, 4 loaded, crawl source line — verified on the owner's session.
7. **Pre-apply honest failures**: set-override and favorite surface the truthful
   "Could not find the function … schema cache" outcome with no silent writes; /checklist hides the formation
   section until 0012 is applied (fixed during this pass — it previously showed an empty section that pointed
   at an action that could not record).
8. Defects found & fixed during verification: diagram rewritten from `foreignObject` to native SVG
   (two-pass rendering + relaxation) after overlap was observed; stale compact-mode test updated to the real
   DOM. A follow-up pass (same session, owner-reported) fixed two remaining cosmetic issues: sub-labels now
   truncate with the full name in a `<title>` tooltip, and the O-line re-lays as one near-touching chain
   (verified live: line gaps 10.0 units vs 26+ receiver spacing, 13 mapped Falcons-off formations incl. the
   gun Tight family) — screenshot capture was unavailable (preview compositing), so layout was verified by
   DOM geometry probes.
9. Post-apply defect found & fixed by the 2026-10-08 live round trip: the checklist's confirm/cancel payloads
   passed the checklist unit's FULL app formation id (`nfl-off-falcons:singleback:tight-y-off`) while the DB
   stores `book_id` + `formation_id` split at the first colon — so cancel/confirm against a real pending unit
   failed with "no pending override". The DB tests missed it because they hand-built split ids instead of
   going through the real unit path. Fixed at the identity layer (`848cb75`): a shared
   `splitAppFormationId` helper in [lib/formations/types.ts](../../lib/formations/types.ts) is now used by
   both `lib/actions/formations.ts` (write) and `lib/actions/checklist.ts` (confirm+cancel), so the three
   paths can never disagree again; regression test added in tests/formations.test.ts. Re-verified live after
   the fix: stale unit canceled cleanly (rev 35→36), then a fresh write→checklist→cancel round trip
   (rev 36→37→38) with the history row carrying the stored identity.
10. Post-apply defects found & fixed in the 2026-10-08 second live pass (`fb2c4ea`):
    (a) the checklist confirm button never included formation units — `toConfirmUnits` existed but was not
    wired into the panel, so confirm was unreachable from the UI while cancel worked; the confirm batch now
    merges reviewed formation units (chart units + formation units in one atomic batch, C0B-v2 §6), with a
    regression UI test;
    (b) Tight Y Off (singleback/gun/Flex) had the TE attached LEFT while the owner's Civil.GG reference shows
    it attached RIGHT outside the RT with the slot receiver (SL) inside the isolated X on the LEFT; the
    orientation is NOT mirrored (offense-left = viewer-left, as attested) — the TE side was simply mis-mapped;
    corrected in the data with a new `slLeft` slot helper;
    (c) O-line sub-label text could touch at narrow widths; sub-labels now dodge same-row text collisions
    (render-only shift) on top of the smaller 2.5-unit font. All three live-verified (confirm→undo round
    trip rev 39→41, two-tab conflict refusal, mobile-width diagram screenshot).

## Owner manual acceptance

1. Preconditions: `0012_formations.sql` is already applied (2026-10-08); run the dev server and sign in as the allowlisted owner.
2. Actions: open **Lineups → Formation Subs**, pick a mapped formation, click a slot, set a different player;
   then open **Checklist** and see the formation override unit; confirm it (alone or mixed with a chart unit);
   then try **Cancel pending change** on a formation unit; then reset a slot from the diagram.
3. Expected visible result: diagram updates and turns accent-colored for the pending slot; the checklist gains
   exactly one "formation override" unit (chart edits never add units); confirm/cancel/undo behave like the
   chart units with the same truthful statuses.
4. Recovery/undo to try: undo the confirmation from the bounded history (unit returns pending); attempt the
   same confirm twice from two tabs (second refused as a conflict, nothing applied).
5. Known limitation to verify: the "unmapped" formations stay uneditable-by-diagram by design; mapping labels
   stay "unverified, editable" until the D113 supplement lands.

## Database/environment

- Live project `xueymrywpvegslbkdnpf`; no secrets recorded.
- Migration `supabase/migrations/0012_formations.sql` — **APPLIED 2026-10-08** by the owner (Supabase SQL
  editor), in order after `0011`, never during a build. Pure additions; no existing objects were altered. Applied
  state independently re-confirmed 2026-10-09: `formation_overrides_view` resolves in PostgREST's schema cache
  (401 permission-denied rather than a 404 unknown-relation), matching the live post-apply round trips above.
- Rollback (only with owner approval, after an export): drop `formation_overrides_view`,
  `formation_favorites_view`, and `app.formation_overrides` / `app.formation_favorites`; the checklist batch
  objects are unchanged by 0012 (formation units ride the existing tables).
- Backup envelope extension is backward compatible; older envelopes restore with empty formation data.
- Preview server: dev server port 3220 (this thread's background process); ports 3100/3210/3211 belong to
  other worktrees and were untouched.
- Worktree env: `.env.local` copied from the repo root at worktree setup; no secret values in any committed file.

## Open items

- **D113 supplement remains OPEN** (evidence gate): all mappings/orientation stay provisional until the owner
  has game access; re-verification list is in [C3A-provisional-evidence.md](../evidence/C3A-provisional-evidence.md) §5.
- 63 of 123 formations render as unmapped by design; mapping them is incremental data work, not code work.
- Cosmetic (low severity): adjacent O-line surnames can slightly overlap at the default diagram width —
  **improved 2026-10-08** (smaller sub-label font + collision-dodge shift, verified at 390px mobile width);
  extreme cases may still touch slightly, fix is a further font/offset tweak if seen.
- Deferred outside scope: special teams (C3B with the D114 gate), iOS Safari device checks (C5B), verified
  in-game wording (D113).

## Next steps (owner flow)

1. **Review and merge the C3A follow-up PR** (`freebuff/c3a-followup-closeout` → `main`) — owner: you;
   artifact: the PR plus this record; **OWNER APPROVAL/CHECK:** merge is the delivery step (agents never
   self-merge). It carries the post-merge live-verified fixes and this acceptance/status record, and its merge
   commit is the base C3B/C4A must start from — `cb30b3d` alone does **not** contain the fixes.
2. ~~Apply `supabase/migrations/0012_formations.sql`~~ **DONE 2026-10-08** — owner applied it in the Supabase
   SQL editor; verified live (checklist formation section appeared; write/cancel round trip succeeds).
3. **Run the owner manual acceptance script** (above) on the merged app — owner: you; **OWNER CHECK:**
   formation override → checklist unit → confirm → undo round trip on live data. **The confirm→undo legs and
   the two-tab conflict refusal were live-verified 2026-10-08** (see verification table); what remains for you
   is walking the same flow on the merged build.
4. **Schedule the D113 depth-chart supplement** when game access exists — owner: you; it upgrades every
   provisional label and the orientation answers to verified.
5. **Record a provisional C3B evidence basis (a D128-equivalent decision)** before C3B starts — owner: you;
   artifact: a `DECISIONS.md` entry. D113 lists the C0A supplement as required before C3A/C3B; C3A was waived
   provisionally and C3B has no equivalent, and C3B's written exit ("verified mappings with provenance", visible
   verified/partial/unsupported coverage) cannot be met while the owner has no game access. The entry should fix
   C3B's honest exit: reconciled 86-book inventory with verified/partial/unsupported labels, provisional mapping
   labels, and any reduced all-book scope explicitly owner-approved.
6. **Launch C3B (special teams, D114 gate) or C4A (transactions)** from the follow-up merge commit — owner: you;
   `LAUNCH_PROMPTS.md`. C3B's first deliverable is the bounded special-teams feasibility attempt plus the
   structured owner question (D114: no skip is pre-approved).

Immediate next step: **owner review/merge of the C3A follow-up PR.**

## Next thread — pasteable launch

- Exact next checkpoint: **C3B** (special teams, gated on D114) or **C4A** (transactions) per the phase plan,
  only after C3A is owner-accepted, merged, and 0012 is applied.
- Required merged baseline: the **C3A follow-up PR merge commit** on `main` (the first C3A merge `cb30b3d` does
  not contain the post-merge fixes); verify with `git log`; `0012_formations.sql` is already applied (2026-10-08).
- Files/docs to read first: this record, [C3A-provisional-evidence.md](../evidence/C3A-provisional-evidence.md),
  C0B-v2 §6, `lib/formations/resolver.ts`, `lib/checklist-formation.ts`.
- Dependencies that MUST land first: the C3A follow-up merged; 0012 applied; a recorded provisional C3B evidence
  basis; D114 answered only after C3B's bounded feasibility attempt (D113 stays open for any verified wording).
- Things NOT to change: formation identity (book+formation, never name), inheritance recompute semantics,
  same-player-override persistence rule (A32), explicit reset scopes, provisional evidence labels, and the
  C4A transaction seam.
- Allowed implementation outcomes: mapped-data expansion under the existing catalog schema; new loaded books
  via the same catalog/resolver path; special-teams work only as C3B with its own record.
- Verification and PR exit gate: `npm run checks` green plus a live browser pass recorded in the checkpoint
  record; PR to `main`; never self-merge.
