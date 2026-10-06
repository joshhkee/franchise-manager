# C2B — Final-action checklist and recovery

## Assignment header

```text
Checkpoint:                   C2B (final-action checklist and recovery)
Workspace/worktree:           Freebuff worktree .freebuff/worktrees/7c8b769f-… (this thread)
Owned feature branch:         freebuff/c2a-accepted-if-no-further-action-is-required-from-7c8b769f-…
Verified PR target:           main
Production deployment branch: main
Started from merged base:     ff6f0f2 (merge of PR #21; C2A owner-accepted as D127)
Predecessor PRs/records:      PRs #17–#21 merged; C2A accepted (D127); C0B-v2 §3/§4/§5/§8 binding
Integration owner:            owner; this lane is the single writer for C2B
Owned modules/paths:          lib/checklist.ts, lib/actions/checklist.ts, lib/data/checklist.ts,
                              components/checklist-panel.tsx, app/checklist/**, app/page.tsx (overview),
                              lib/backup.ts + lib/backup-service.ts (extension), supabase/migrations/0011_*,
                              tests/**, docs/checkpoints/C2B.md (plus the small DECISIONS/START_HERE status sync)
Shared contract version:      C0B-v2 (unchanged: §3 diff/consolidation, §4 action units/prerequisites/
                              cancel/bounded undo, §5 revision+retry, §8 backup growth)
Other active lane:            none; delivery mode = one integrated checkpoint
Dev/test environment:         PGlite (real migrations 0001–0011, D119) for DB tests; live Supabase project
                              read by the dev server. `0011_checklist.sql` applied 2026-10-06 (owner-approved)
Provisional-rules note:       D127 — the D113 depth-chart supplement is still open, so all game-legality
                              wording remains labeled provisional; no in-game menu wording is shown.
```

## Status

- **State: checks passed (typecheck, lint, 216 tests, build), migration `0011` applied, live confirm → undo
  round trip browser-verified, PR open for owner review.**
- C2A acceptance was recorded by the owner in-session ("c2a accepted", D127); this checkpoint starts from the
  merged accepted base `ff6f0f2`.

## Implemented

- **Action-unit service** — [lib/checklist.ts](../../lib/checklist.ts): derives the checklist as
  `diff(baseline, plan)` per position (never a click log, so A→B→C consolidates and reverting removes the
  unit), one whole ordered position list per unit, prerequisite/blocking detection (practice squad with a
  satisfiable promotion prerequisite, pending incoming transaction seam, ineligible placement repair), and
  `buildConfirmation`, which produces the exact reviewed scope in prerequisite order plus the excluded units
  with reasons. `summarizeChecklist` feeds the Overview; `formatBatchTimestamp` renders retained-history times
  deterministically (UTC) to avoid locale-dependent hydration mismatches.
- **Schema and commands** — [supabase/migrations/0011_checklist.sql](../../supabase/migrations/0011_checklist.sql):
  `app.action_batches` (bounded undo history with minimal before/after deltas, RLS owner-scoped,
  `app.prune_action_batches` enforcing the declared most-recent-50-batches / 30-days retention),
  `public.confirm_checklist_units` (full validation pass first: exact revision, exact reviewed scope still
  pending, in-batch prerequisite ordering, duplicates; any failure mutates nothing; applies prerequisites
  then dependents in the reviewed order with one revision bump and one history batch),
  `public.cancel_checklist_units` (reverts plans to baseline and reports dependent positions that share a
  player), `public.undo_action_batch` (reverses a retained confirmation only when the stored after-state still
  matches; otherwise refuses with `dependency_blocked` and mutates nothing), and the `action_batches_view`
  read model. `restore_new_franchise` now also restores retained history with remapped player ids.
- **Server actions** — [lib/actions/checklist.ts](../../lib/actions/checklist.ts): truthful
  `saved | conflict | unauthorized | failed` outcomes with tailored messages for `dependency_blocked`,
  no-longer-pending scope, already-undone, and out-of-retention undo.
- **Read model** — [lib/data/checklist.ts](../../lib/data/checklist.ts): reuses the depth-chart read model,
  collapses entries to baseline/plan lists (a position with no plan rows is not a difference), derives the
  checklist, and loads the bounded history with an honest not-applied state.
- **UI** — [components/checklist-panel.tsx](../../components/checklist-panel.tsx) on
  [app/checklist/page.tsx](../../app/checklist/page.tsx): pending units with Now/After lists, ready/blocked
  badges, per-unit selection (blocked units are opt-in), a review block showing the exact atomic scope and the
  excluded units with reasons, per-position cancel, and a compact bounded-undo list. Confirmations keep their
  status line and let the confirmed unit disappear from the derived list; the panel remounts only when the
  franchise changes. [app/page.tsx](../../app/page.tsx) Overview shows real pending/blocked counts, announced
  quick-resume links, and no invented data.
- **Backup extension** — [lib/backup.ts](../../lib/backup.ts) / [lib/backup-service.ts](../../lib/backup-service.ts):
  the envelope carries retained (not-yet-undone) confirmation batches, validates that every referenced player
  exists, and remaps mutable ids on restore-new; older envelopes without history restore as empty.

## Invariants verified

- **Derived, not accumulated**: the checklist is a pure diff of the stored layers; a plan equal to the
  baseline produces no unit, and reality catching up removes the redundant unit while unrelated plans stay.
- **Whole-list unit**: every confirmed unit is one complete ordered position list; rank ticks are never units.
- **Atomic reviewed scope**: a stale revision, a plan that changed since review, an unsatisfied prerequisite,
  or any invalid unit applies **none** of the request; excluded blocked units are shown in review.
- **Prerequisite ordering**: a practice-squad dependent list is refused alone and applies only when its
  promotion prerequisite is confirmed first inside the same reviewed batch.
- **Retry safety**: a repeated confirmation request id replays the stored outcome (same batch id) without a
  second revision bump.
- **Cancel previews dependents**: reverting a plan reports other pending positions that reference the same
  player, instead of silently changing them.
- **Bounded undo**: only retained confirmations are undoable; undo restores the exact before-state and the
  prior slice label, refuses when a later change touched the same scope, cannot run twice, and never claims to
  reverse a real Madden action.
- **No game claims**: no in-game menu wording is displayed because none is verified (D113 supplement open);
  confirmation is labeled as correcting app records only.
- **Isolation**: history and confirmation are owner-scoped; anonymous and other-owner callers see nothing and
  cross-franchise requests are refused.

## Verification evidence

| Check | Exact command/environment | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | pass |
| Lint | `npm run lint` | pass — 0 errors; 2 pre-existing unused-parameter warnings in `lib/actions/import.ts` |
| Full unit/UI tests | `npx vitest run` | pass — 23 files, 216 tests |
| New pure tests | `npx vitest run tests/checklist.test.ts` | pass — 17/17 (consolidation/revert, added/removed/moved, chart order, partial-list recomputation, already-happened preservation, practice-squad/transaction/placement blocking, reviewed batching, shared prerequisite dedup, summary, deterministic timestamp) |
| New UI tests | `npx vitest run tests/checklist-ui.test.tsx` | pass — 6/6 (exact reviewed scope, blocked-unit promotion ordering, truthful failure, cancel, undo availability, honest not-applied state) |
| New DB tests | `npx vitest run tests/db/checklist.test.ts` | pass — 12/12 (confirm promotes plan→owner-confirmed baseline with one bump, replay, stale no-op, changed-scope no-op, multi-unit atomicity, prerequisite blocking and in-batch promotion, cancel + dependent preview, undo restore/second-undo refusal/dependency conflict, 50-batch + 30-day retention, isolation) |
| Backup tests | `npx vitest run tests/backup.test.ts tests/db/restore.test.ts` | pass — 11 + 4 (history round trip with remapped ids, dangling-history refusal, legacy empty history, SQL remap in restore) |
| Project checks | `npm run checks` | pass — typecheck, lint (0 errors), 216 tests, build (14 route entries) |
| Migration apply | Supabase SQL editor in the shared preview browser, live project `xueymrywpvegslbkdnpf`, 2026-10-06 at owner approval (D127) | **`Success. No rows returned`**; Supabase showed its expected destructive-operation confirmation (the retention prune contains deletes) and ran the reviewed file |
| Live round trip | dev server `http://localhost:3210` (pid 14708) + shared preview, signed-in owner, live Atlanta Falcons | pass — see below |
| Console/network | preview console + network log on the app tab | clean after the fix — no errors; all page/action requests 200 |
| Defect found & fixed | dev-server stderr + code fix | hydration mismatch from locale-dependent `toLocaleString()` replaced by deterministic UTC formatting; regression unit test added; reload confirmed clean |

Live round trip detail (2026-10-06, owner's real Atlanta Falcons; verification left the plan data net-zero):

1. **Derivation** matched the chart: 5 pending units, 5 ready, 0 blocked (HB, RT, 3DRB, PWHB, SLWR), each with
   real player names and an exact review scope.
2. **Confirm**: selecting only PWHB showed "Exact scope: 1 position — PWHB depth chart"; the confirmation
   succeeded, revision 28→29, PWHB disappeared (5→4 pending), and the bounded history gained a
   `depth_chart_list:PWHB` batch with an Undo button.
3. **Undo**: revision 29→30, the PWHB unit returned ("Now: Empty / After confirming: Bijan Robinson"), and the
   batch is shown as **UNDONE** with no Undo button.
4. **Message/format repair re-verified**: a second round trip (revision 30→32) showed the success messages
   ("Confirmation corrects app records only — it never changes Madden." and the undo message) and deterministic
   history timestamps (`2026-10-06 02:41 UTC`); the page console is clean on reload.
5. **Pre-apply failure path** (checked before the migration landed) was honest: "Not saved. Your input is kept
   here so you can retry. (Could not find the function public.confirm_checklist_units …)" and the history
   section stated the migration was not applied.
6. **Phone width 390×844**: readable, no essential horizontal scrolling, 44px+ controls, correct bottom-nav
   state.
7. Checks NOT run and why: the blocked/promotion path in the browser (needs a practice-squad plan; covered by
   unit and PGlite tests), the cancel path on live data (left to the owner's manual acceptance so no pending
   plan is discarded), iOS Safari device checks (C5B), and any verified-ordering claim (D113 supplement open).

## Owner manual acceptance

1. Preconditions: `0011_checklist.sql` is already applied; run the dev server and sign in as the allowlisted
   owner.
2. Actions: open **Checklist** and confirm one position; then press **Undo** in the bounded history; then use
   **Cancel pending change** on a position whose plan you no longer want (this discards that plan).
3. Expected visible result: truthful statuses, one atomic scope per confirmation, the confirmed unit removed
   from pending, undo restoring it (and the label), and cancel returning a position to its baseline.
4. Recovery/undo to try: attempt a confirmation from two tabs (the second is refused as a conflict with
   nothing applied), and attempt an undo after re-planning the same position (refused with a resolution
   message instead of a blind rollback).
5. Known limitation to verify: no in-game menu wording is shown (nothing is verified yet); a practice-squad
   dependent list requires its promotion prerequisite inside the same batch; transaction prerequisites are
   fixture-only until C4A.

## Database/environment

- Live project `xueymrywpvegslbkdnpf`; no secrets recorded.
- Migration `supabase/migrations/0011_checklist.sql` — **applied 2026-10-06** by the owner-approved shared
  browser session (supabase SQL editor reported success). Forward-only, in order after `0010`; pure additions
  plus a `create or replace` of `restore_new_franchise`. Older backups still restore (empty history); a C2B
  backup restored into a project without 0011 would drop history (disclosed, not silent).
- Rollback (only with owner approval, after an export): drop `public.action_batches_view`,
  `public.confirm_checklist_units`, `public.cancel_checklist_units`, `public.undo_action_batch`,
  `app.action_batches`, the three helpers, and restore the 0007 `restore_new_franchise` body.
- Preview server: dev server port 3210 (pid 14708); port 3100 belongs to another worktree and was untouched.
- Live state after verification: revision 32, 5 pending units on the owner's real plan (unchanged in content),
  two retained undone batches (both within retention).

## Open items

- **Blockers**: none.
- Bugs/limitations (declared): the transaction prerequisite is a documented C4A seam with no production source
  yet; placement blocking is enforced in the app layer, while the database enforces revision, exact scope,
  duplicates and practice-squad prerequisites atomically. One single-test flake was observed in one
  `npm run checks` run and did not reproduce in two subsequent full runs; no code changed in between and the
  failing test was not identified.
- Deferred work explicitly outside scope: formation units (C3A), real promotion/trade tools and transaction
  batches (C4A), the D113 supplement's verified labels/order/menu wording.
- Other-editor/uncommitted work left untouched: none; the worktree was clean at start.

## Next steps (owner flow)

1. **Review and merge the C2B PR** against `main` — owner: you; artifact: the PR plus this record;
   **OWNER APPROVAL/CHECK:** merge is the acceptance step (agents never self-merge).
2. **Optionally rerun the manual acceptance script** (above) on the merged app — owner: you; **OWNER CHECK:**
   only if you want to exercise cancel on live data, since the verification pass left the plan unchanged.
3. **Schedule the D113 depth-chart supplement** when game access exists — owner: you; it converts provisional
   ordering and lets verified in-game menu wording appear in the checklist.
4. After the merge, launch **C3A** from the new merged base — owner: you; `LAUNCH_PROMPTS.md`.

Immediate next step: **owner review/merge of the C2B PR.**

## Next thread — pasteable launch

- Exact next checkpoint: **C3A** (Falcons formation diagrams and overrides) per
  [phases/03-formations.md](../../phases/03-formations.md), only after C2B is owner-accepted and merged.
- Required merged baseline: the C2B PR merge commit on `main`; verify with `git log`, and confirm migration
  `0011_checklist.sql` is applied (it is, as of 2026-10-06).
- Files/docs to read first: this record, [C2A.md](C2A.md), `C0B-v2` §4/§6, `lib/depth-chart.ts`,
  `lib/checklist.ts` (action-unit and prerequisite vocabulary), and the C0A evidence supplement status (D113).
- Dependencies that MUST land first: C2B merged and accepted; the D113 supplement for verified
  labels/orientation (still open — C3A's evidence gate).
- Things NOT to change: the whole-list action-unit boundary, prerequisite ordering/atomic no-op semantics,
  bounded-undo retention constants, provisional-rules labels, and the C4A transaction seam.
