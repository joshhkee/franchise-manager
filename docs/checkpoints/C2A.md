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
                              read by the dev server only; migration 0007 not yet applied there
Provisional-rules note:       D123 — Madden 27 labels/order/rank limits/eligibility ship as one labeled,
                              editable provisional module until the D113 depth-chart supplement lands
```

## Status

- **State: in progress — implementation complete, checks green; owner migration application, browser pass, and
  acceptance pending.** All work is on this thread's Freebuff branch, cut from the accepted base `b0e57ce`
  with a clean tree at start.
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
| Browser pass | dev server + shared preview | **pending** — see Database/environment; migration 0007 is not applied to the live project, so only the honest "storage not ready" state can be seen until the owner applies it |

- Checks NOT run and why: live end-to-end depth-chart editing (needs migration 0007 applied), iOS/Safari
  device runs (later verification, C5B), and any confirmed-ordering claim (D113 supplement still open).
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
- New migration: `supabase/migrations/0007_depth_chart.sql` — **not yet applied**; forward-only, not
  idempotent, apply once, in order after `0006`. `0006_source_import.sql` application status is not recorded
  in-repo; if it is unapplied, apply it first.
- Compatibility: pure additions (new tables/view, appended view columns, replaced restore function); older
  C1B backups still restore.
- Backup/rollback: project holds only owner-entered/test data; export a backup before applying if desired.
  Rollback is manual (`drop view public.depth_chart_view; drop table app.depth_chart_entries;
  drop table app.depth_chart_state; alter table app.franchise_players drop column roster_status;` plus
  restoring the 0005 restore function) — only with owner approval.
- Preview server: dev server on port 3200 for this thread; port 3100 belongs to another worktree.

## Open items

- **Blockers**: none for code; the browser pass and acceptance wait on the owner applying `0007`.
- Bugs/limitations (declared, not hidden): provisional rank limits and eligibility (D113 supplement);
  confirmation/action-unit semantics are C2B; real promotion/trade tools are C4A (C2A records corrections);
  iOS checks later.
- Deferred work explicitly outside scope: formation screens (C3), checklist/confirm/undo (C2B), GM tools (C4).
- Other-editor/uncommitted work left untouched: none; the worktree was clean at start.

## Next steps (owner flow)

1. **Apply `0007_depth_chart.sql`** (after `0006` if needed) — owner: you; Supabase SQL editor.
   **OWNER CHECK.**
2. **Run the browser acceptance script above** — owner: you (or this thread on request); report anything
   that looks wrong. **OWNER CHECK.**
3. **Commit/push this branch and open the C2A PR to `main`** — owner/next thread; PR body links this record.
   **OWNER APPROVAL/CHECK.**
4. **Owner acceptance after the browser pass**, then C2B starts from the merged base — owner: you.
5. **Schedule the D113 depth-chart supplement** when game access exists; it converts provisional labels into
   verified ordering without schema changes (the rules module is the single edit point).

Immediate next step: **owner applies migration 0007, then runs the browser acceptance script.**

## Next thread — pasteable launch

- Exact next checkpoint: **C2B** (final-difference checklist and recovery) per
  [phases/02-lineups-checklist.md](../../phases/02-lineups-checklist.md) and
  [LAUNCH_PROMPTS.md](../../LAUNCH_PROMPTS.md) — only after C2A is owner-accepted and merged.
- Required merged baseline: the C2A PR's merge commit on `main` (verify with `git log`).
- Files/docs to read first: this record, `C0B-v2` §3–§5, `SPEC.md` pending-actions section,
  `lib/depth-chart.ts` (provisional rules), and the C1B `request_outcomes`/revision primitives extended here.
- Dependencies that MUST land first: migration 0007 applied; C2A merged and accepted.
- Things NOT to change: claimed game legality, the rules-module labels, C1B isolation/revision semantics.
