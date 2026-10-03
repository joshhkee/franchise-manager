# C2A — Depth chart and planning state

## Assignment header

```text
Checkpoint:                   C2A (depth charts and planning state)
Workspace/worktree:           Freebuff pickup worktree (this thread) — recorded deviation, see Status
Owned feature branch:         freebuff/i-want-to-pick-up-where-i-left-off-is-the-project--f8527225-…
Verified PR target:           main
Production deployment branch: main
Started from merged base:     b0e57ce (merge of PR #16; C1B accepted as D123)
Predecessor PRs/records:      PRs #1–#16 merged; C1B accepted (D123); C0B-v2 binding (§3, §4, §5, §8, §9)
Integration owner:            owner; this lane is the single writer for C2A
Owned modules/paths:          app/lineups/**, components/depth-chart-panel.tsx, lib/depth-chart.ts,
                              lib/data/depth-chart.ts, lib/actions/depth-chart.ts, lib/actions/outcome.ts,
                              lib/backup.ts + lib/backup-service.ts (extension), supabase/migrations/0007_*,
                              tests/**, docs/checkpoints/C2A.md
Shared contract version:      C0B-v2 (§3 baseline/plan and intent, §4 whole-list unit, §5 revision/retry,
                              §8 backup, §9 read models)
Other active lane:            none; delivery mode = one integrated checkpoint PR
Dev/test environment:         PGlite (real migrations + policies, D119) for DB tests; live Supabase project
                              read by the dev server; migration 0007 applied there 2026-10-03
Provisional-rules note:       D123 — Madden 27 labels/order/rank limits/eligibility ship as one labeled,
                              editable provisional module until the D113 depth-chart supplement lands
```

## Status

- **State: implementation complete, migration applied, browser pass done, merged; owner acceptance pending.**
  All work is on this thread's Freebuff branch, cut from the accepted base `b0e57ce` with a clean tree at
  start. The owner applied `0007_depth_chart.sql` to the live project and merged PR #17 as `65284ea`
  (2026-10-03); the browser pass below ran against the live project after that merge.
- Deviation on record: C2A runs in the Freebuff pickup worktree/thread rather than a new one, by the owner's
  instruction ("launch C2A in this worktree"); the owner remains integration owner and primary reviewer.
- Provisional verification: the C2A phase packet's **verified-ordering exit is deferred** — the depth-chart
  matrix is still the open D113 supplement, and nothing in this checkpoint claims verified game legality.
  Per-position lists, planned/recorded layers, accessible move controls, search/replace, and active/practice
  separation are implemented and labeled provisional.
- C2B items (action units, confirmation, cancel/undo, bulk review) are **not started** here.

## Implemented

- **Provisional rules module** — [lib/depth-chart.ts](../../lib/depth-chart.ts): one labeled source for
  position groups/order (owner reference), provisional rank limits, cross-position/specialist eligibility,
  practice-squad blocking, provisional suggestion order (recorded overall, unknown last; manual specialist
  slots stay manual per D107), and baseline/plan diffing.
- **Schema and commands** — [supabase/migrations/0007_depth_chart.sql](../../supabase/migrations/0007_depth_chart.sql):
  `app.depth_chart_entries` (baseline/plan layers, per-position ordered rows, one player per list),
  `app.depth_chart_state` (per-position `provisional_published` / `owner_confirmed` slice label),
  `roster_status` on franchise players, owner-scoped RLS, and four revision-checked replay-safe commands:
  `set_depth_chart_plan`, `record_depth_chart_baseline` (recorded reality vs provisional seed, with
  plan reconciliation that never silently erases a differing plan), `discard_depth_chart_plan`,
  `set_player_roster_status` (recorded roster correction; C4A owns real promotion tools).
- **Read models** — `public.depth_chart_view` plus `franchise_players_view` extensions (roster status,
  published overall), security-invoker, authenticated-only.
- **Server actions** — [lib/actions/depth-chart.ts](../../lib/actions/depth-chart.ts): truthful
  `saved | conflict | unauthorized | failed` outcomes with revision re-read; shared classification moved to
  [lib/actions/outcome.ts](../../lib/actions/outcome.ts).
- **UI** — [components/depth-chart-panel.tsx](../../components/depth-chart-panel.tsx) on
  [app/lineups/page.tsx](../../app/lineups/page.tsx): group/position navigation, planned list editing with
  drag plus keyboard/touch Move up/down buttons, replace/add with roster search, removed-from-plan list,
  provisional suggestion/seed, recorded-baseline inspection with slice labels, pending-vs-baseline summary,
  explicit "Record as already happened" and "Discard pending changes", practice-squad section with the
  recorded-correction path, and player detail.
- **Backup round trip** — [lib/backup.ts](../../lib/backup.ts) / [lib/backup-service.ts](../../lib/backup-service.ts):
  chart entries (both layers) and roster status now ride in the envelope; older C1B envelopes without them
  restore as empty/defaults; restore maps ids and inserts chart rows transactionally.

## Invariants verified

- **Provisional vs confirmed**: chart rows render `provisional_published` until the owner records reality;
  nothing presents a suggestion as the game's default (D096/D107, ACCEPTANCE A10).
- **Whole-list unit**: every save writes one complete position list; rank rows are never independent units
  (C0B-v2 §4). A plan equal to the baseline is not stored (no-op difference disappears).
- **Revision safety**: stale writes are refused with `stale_revision`, no mutation, recoverable local list.
- **Retry safety**: a repeated request id replays the stored outcome and never double-applies.
- **No silent plan erasure**: recording reality keeps a differing plan and surfaces it for review.
- **Practice squad**: cannot silently enter a plan; a promotion prerequisite is disclosed, and C2A offers
  only a recorded roster correction until C4A's real tools exist (D023).
- **Isolation**: every command and view is owner-scoped; other owners see nothing and cross-franchise
  references are refused; anonymous callers have no access.
- **Franchise safety**: archived franchises stay readable but are not planned against; source data is never
  mutated by chart edits.

## Verification evidence

| Check | Exact command/environment | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | pass |
| Lint | `npm run lint` | pass — 0 errors; 2 pre-existing unused-parameter warnings in `lib/actions/import.ts` |
| Full unit/UI tests | `npx vitest run` | pass — 15 files, 118 tests |
| DB policies/commands | `npm run test:db` (PGlite, real migrations) | pass — 6 files, 48 tests (depth-chart 10/10) |
| Project checks | `npm run checks` (typecheck, lint, tests, build) | pass — build with 14 route entries |
| Rules unit tests | `npx vitest run tests/depth-chart.test.ts` | pass — 9/9 (eligibility, suggestion, diff, issues) |
| Panel UI tests | `npx vitest run tests/depth-chart-ui.test.tsx` | pass — 7/7 (move+save, conflict retry with same request id, PS block + correction, baseline view, record reality, discard, manual slots) |
| Backup tests | `npx vitest run tests/backup.test.ts` | pass — 9/9 (chart round trip, legacy envelopes, duplicate slot/dangling refusal) |
| Browser pass | dev server + shared preview, live project after 0007 | pass — depth-chart flows verified end to end: provisional seed order, practice-squad separation/blocking with the recorded-correction path, replace/add with roster search, drag + Move up/down, removed-from-plan list and Keep in plan, recorded-baseline inspection and slice labels, Record as already happened, Discard pending changes, two-tab stale-write conflict with kept input, backup export carrying chart rows, and the unchanged states on Overview/GM War Room/Coach/Gameday/Checklist/Settings/Franchises; console clean (no errors) |
| Autosave regression fix | `npm run checks` + live repro after the browser pass | pass — see Bugs/limitations; same-page commands now refresh the autosave revision so the next field edit saves instead of falsely conflicting |

- Checks NOT run and why: iOS/Safari device runs (later verification, C5B) and any confirmed-ordering
  claim (D113 supplement still open).
- No secrets or private exports are included; `.env.local` was imported from the main checkout at bootstrap
  and never printed. All browser-visible values above are non-secret.

## Owner manual acceptance

1. Preconditions: apply `0006_source_import.sql` (if not already applied) and `0007_depth_chart.sql` in the
   Supabase SQL editor in order; run the dev server or the merged preview; sign in as the allowlisted owner;
   use a franchise with players (import the Launch ratings or add custom players).
2. Actions: open **Lineups → Depth Chart**; pick QB and add two players; move one with Move up/down and once
   by dragging; replace a rank; switch to **Recorded baseline** and back; click **Seed provisional list** on
   an empty position; then **Record as already happened**; reload and confirm the pending summary is gone.
3. Expected visible result: provisional-rule labels everywhere, truthful saving/conflict statuses, and the
   per-position label changing to "recorded baseline confirmed by you as already happened" only after the
   explicit action.
4. Recovery/undo to try: attempt a save from a second tab after the first writes (conflict, input kept),
   then Retry/Discard; click **Discard pending changes** to return a position to its baseline.
5. Known limitation to verify: secondary/specialist slots stay manual (no suggestion); a practice-squad
   player is blocked with the recorded-correction path; verified labels/order/limits still wait on the
   D113 supplement.

## Database/environment

- Dev/prod project identities: single Supabase Free project `franchise-manager`
  (`xueymrywpvegslbkdnpf`); no new secrets.
- New migration: `supabase/migrations/0007_depth_chart.sql` — **applied to the live project 2026-10-03**
  (owner, Supabase SQL editor). Forward-only, not idempotent, apply once, in order after `0006`;
  `0006_source_import.sql` status is not recorded in-repo.
- Compatibility: pure additions (new tables/view, appended view columns, replaced restore function); older
  C1B backups still restore.
- Backup/rollback: project holds only owner-entered/test data; export a backup before applying if desired.
  Rollback is manual (`drop view public.depth_chart_view; drop table app.depth_chart_entries;
  drop table app.depth_chart_state; alter table app.franchise_players drop column roster_status;` plus
  restoring the 0005 restore function) — only with owner approval.
- Preview server: dev server on port 3200 for this thread; port 3100 belongs to another worktree.

## Open items

- **Blockers**: none; owner acceptance remains.
- Bugs found in the browser pass and fixed: the autosave provider kept a stale in-memory revision after a
  same-page command (e.g. Add player), so the next field edit falsely conflicted and Retry could not recover
  without a reload; fixed in `components/autosave/autosave-provider.tsx` with regression tests in
  `tests/autosave.test.tsx`, verified live. The Overview "Lineup issues" empty state said "No depth-chart
  plan yet" even when a plan existed; corrected to state-independent copy in `app/page.tsx`.
- Bugs/limitations (declared, not hidden): provisional rank limits and eligibility (D113 supplement);
  confirmation/action-unit semantics are C2B; real promotion/trade tools are C4A (C2A records corrections);
  iOS checks later.
- Deferred work explicitly outside scope: formation screens (C3), checklist/confirm/undo (C2B), GM tools (C4).
- Other-editor/uncommitted work left untouched: none; the worktree was clean at start.

## Next steps (owner flow)

1. **Apply `0007_depth_chart.sql`** — done by owner 2026-10-03. ✅
2. **Browser pass** — done in this thread against the live project after the merge; results in the table
   above. The owner may still walk the manual acceptance script below.
3. **Merge the C2A PR** — done; PR #17 merged as `65284ea`. ✅
4. **Owner acceptance**, then C2B starts from the merged base — owner: you. **OWNER CHECK.**
5. **Schedule the D113 depth-chart supplement** when game access exists; it converts provisional labels into
   verified ordering without schema changes (the rules module is the single edit point).

Immediate next step: **owner acceptance walk, then C2B from merged `main`.**

Open follow-up: the autosave fix, its regression tests, the Overview copy correction, and this record's
update ship as a small follow-up PR from this branch (PR #17 was already merged at `65284ea`; the branch
content is otherwise identical to merged `main`).

## Test-data cleanup (2026-10-03)

The browser pass created a temporary "C2A verification" franchise (7 players, revision 35) in the live
project. The owner approved cleanup. The app has no delete command by design and the `app` schema is not
exposed through PostgREST, so the row was removed in the Supabase SQL editor (C1B precedent); cascades
removed its players, field rows, chart entries, and chart state.

```sql
delete from app.franchises
 where id = '80ad5b3a-bda1-4cf2-ab0b-d444656e5d7a'
   and name = 'C2A verification'
   and is_default = false;
```

Verified after: `franchise_summaries` returns only the default Atlanta Falcons (0 players, revision 11),
and the player, field, and depth-chart read models return no rows.

## Next thread — pasteable launch

- Exact next checkpoint: **C2B** (final-difference checklist and recovery) per
  [phases/02-lineups-checklist.md](../../phases/02-lineups-checklist.md) and
  [LAUNCH_PROMPTS.md](../../LAUNCH_PROMPTS.md) — only after C2A is owner-accepted and merged.
- Required merged baseline: the C2A PR's merge commit on `main` (verify with `git log`).
- Files/docs to read first: this record, `C0B-v2` §3–§5, `SPEC.md` pending-actions section,
  `lib/depth-chart.ts` (provisional rules), and the C1B `request_outcomes`/revision primitives extended here.
- Dependencies that MUST land first: migration 0007 applied; C2A merged and accepted.
- Things NOT to change: claimed game legality, the rules-module labels, C1B isolation/revision semantics.
