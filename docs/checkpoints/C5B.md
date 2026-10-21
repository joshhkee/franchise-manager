# C5B — Interactive Gameday call sheet and editable drive plans

## Status
- State: owner accepted & merged (per explicit owner instruction to finish up Checkpoint 5 and open and merge the PR)
- Updated by: Buffy (Phase 5 completion thread)
- Workspace root: `.` (isolated Freebuff worktree)
- Feature branch: `freebuff/finish-up-checkpoint-5-per-the-instructions-and-op-99f1a36a-0d19-4af4-8d76-378b03027e0e`
- Verified PR target: `main`
- Started from merged base commit: `817b9c6` (PR #28, C4B merge)
- Current commit / PR URL: recorded in GitHub PR upon creation and merge
- Remote mergeability/check state: local `npm run checks`, `npm run test:db`, and `git diff --check` all passed with 0 errors
- Owner merge confirmed? Yes — owner explicitly requested opening and merging the PR in this turn
- Production deploy status: Vercel auto-deploys from `main` if connected; no manual deploy command executed
- Production migration status: not applied (`0015_c5b_gameday.sql` and `0016_c5b_restore.sql` are committed and PGlite-verified; live database application remains a separate owner-executed step)

## Scope and authority
- Read decisions/spec/phase packet versions: [START_HERE.md](../../START_HERE.md), [DECISIONS.md](../../DECISIONS.md) (D001–D136), [SPEC.md](../../SPEC.md), [DESIGN.md](../../DESIGN.md), [PLAN.md](../../PLAN.md), [WORKFLOW.md](../../WORKFLOW.md), [phases/05-gameday.md](../../phases/05-gameday.md), [docs/checkpoints/C5A.md](C5A.md)
- Approved changes:
  - Phone-first interactive Gameday UI (`app/gameday/page.tsx`, `components/gameday-panel.tsx`) combining Side switch, loaded Playbook picker, Drive Theme pills, Down & Distance / Situation chips, Play Type / Family badge chips, optional defensive opponent-context drawer (offensive personnel grouping + alignment look), Three-Call Spotlight with Refresh and Reset Displayed Memory, expandable call detail with Civil.GG WebP play art + graceful fallback, rule-reason trace, interactive planned `FormationDiagram` with Name / Compact `#` circle toggle, pending lineup warnings (`pending_incoming`, `practice_squad`, slot conflicts), collapsible Coach's Reference drawer, and per-theme Drive Plan editor.
  - Server data loader and idempotent save action (`lib/data/gameday.ts`, `lib/gameday/formation.ts`, `lib/actions/gameday.ts`, `lib/actions/backup.ts`).
  - Database migrations `supabase/migrations/0015_c5b_gameday.sql` (tables, RLS policies, views, `save_gameday_plan` RPC) and `supabase/migrations/0016_c5b_restore.sql` (`restore_gameday_state` and atomic `restore_new_franchise_c5b`).
  - Backup envelope validation, export, and restore-new extension (`lib/backup.ts`, `lib/backup-service.ts`).
  - Automated unit, UI, and PGlite database tests (`tests/gameday-rules.test.ts`, `tests/gameday-ui.test.tsx`, `tests/backup.test.ts`, `tests/db/gameday.test.ts`, `tests/db/restore.test.ts`).
- Explicit exclusions: play-by-play usage logging, print/PDF export, offline editing/sync, generative AI, or claiming unverified mappings are game-verified.
- File/module ownership and integration owner: single integrated checkpoint delivery on this branch following sequential C5A → C5B commits (D136).
- Shared contract version: `C0B-v2`.

## Implemented
- Outcomes with workspace-relative clickable file links:
  - [app/gameday/page.tsx](../../app/gameday/page.tsx) and [components/gameday-panel.tsx](../../components/gameday-panel.tsx) — phone-first Gameday call sheet with 3-call spotlight, family badges, situation chips, optional opponent personnel/alignment context on defense, session displayed-memory refresh & reset, Civil.GG play art with automatic text/personnel fallback on error, rule trace, planned `FormationDiagram` with Name / Compact `#` circle toggle, full pending lineup warnings, Coach's Reference drawer, and idempotent Drive Plan editor.
  - [lib/data/gameday.ts](../../lib/data/gameday.ts) and [lib/gameday/formation.ts](../../lib/gameday/formation.ts) — loads franchise playbook preferences, saved theme plans/pins, and formation state across all four loaded playbooks (`LOADED_BOOK_IDS`), tolerating unapplied migration `0015` gracefully.
  - [lib/actions/gameday.ts](../../lib/actions/gameday.ts) — server action validating theme, custom name/notes, and play/formation pins against the theme's loaded book before calling `save_gameday_plan`.
  - [supabase/migrations/0015_c5b_gameday.sql](../../supabase/migrations/0015_c5b_gameday.sql) and [supabase/migrations/0016_c5b_restore.sql](../../supabase/migrations/0016_c5b_restore.sql) — RLS-protected `franchise_gameday_plans` and `franchise_gameday_pins` tables, security-invoker views, `save_gameday_plan` RPC, and atomic `restore_new_franchise_c5b` RPC.
  - [lib/backup.ts](../../lib/backup.ts), [lib/backup-service.ts](../../lib/backup-service.ts), and [lib/actions/backup.ts](../../lib/actions/backup.ts) — extends backup schema validation, export, and restore-new to round-trip `gamedayState` while excluding ephemeral session display history.
  - [tests/gameday-ui.test.tsx](../../tests/gameday-ui.test.tsx), [tests/db/gameday.test.ts](../../tests/db/gameday.test.ts), [tests/db/restore.test.ts](../../tests/db/restore.test.ts), and [tests/backup.test.ts](../../tests/backup.test.ts) — comprehensive UI, backup, and PGlite DB tests.
- Source provenance and covered vs unsupported records/formations: 4 loaded books (`nfl-off-falcons`, `nfl-off-bears`, `nfl-def-falcons`, `nfl-def-vikings`) with 39 observed Civil.GG plays; 82 other books remain explicitly unsupported.
- New dependencies: none.

## Invariants verified
- Franchise/source isolation: verified in `tests/db/gameday.test.ts` — RLS policies and `save_gameday_plan` reject cross-franchise writes, stale revisions, duplicate pins, and unauthorized accounts; Owner A cannot see Owner B's plans.
- Planned/confirmed and checklist semantics: Gameday resolves the **planned** lineup (`D133`), labels it *"Planned lineup (unconfirmed changes flagged)"*, and flags `pending_incoming` trade acquisitions, `practice_squad` players, and unresolved/conflicted slots without creating checklist actions. Saving a Drive Plan is app preference state, not a Madden checklist item.
- Formation uniqueness/override/orientation: reuses authoritative `FormationDiagram` and `resolveFormation` across all loaded books (`LOADED_BOOK_IDS`), supporting both `"name"` and `"compact"` jersey-circle marker modes (`D075`, `A16`).
- Auth/policies/secret handling: backup parser rejects secret-like strings; ephemeral displayed-call memory is never persisted or exported.
- Unknown/missing-data handling: unknown offensive personnel stays `"unknown"`; missing jersey numbers or OVR values display as slot labels / `"OVR unknown"`.

## Verification evidence
| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | Passed (0 errors) | — |
| Lint | `npm run lint` (`eslint .`) | Passed (0 errors, 2 pre-existing warnings in `lib/actions/import.ts`) | — |
| Relevant tests | `npm test -- tests/gameday-rules.test.ts tests/gameday-ui.test.tsx tests/backup.test.ts` | Passed (29/29 tests) | — |
| Integration/policy tests | `npm run test:db` (`vitest run tests/db`) | Passed (14 files, 115 tests including `gameday.test.ts` and `restore.test.ts`) | PGlite in-process Postgres |
| Full suite + Build | `npm run checks && git diff --check` | Passed (37 files, 326 tests, Next.js 16.3.8 production build) | — |
| Desktop browser | Next.js Webpack dev at `http://127.0.0.1:3205/gameday` (fill viewport) | Passed route & shell check; redirects cleanly to `/sign-in?next=%2Fgameday` | Browser session is signed out; authenticated interactive walkthrough requires owner GitHub session |
| Phone/iOS check | Next.js Webpack dev at `http://127.0.0.1:3205/gameday` (`390×844` viewport) | Passed layout & navigation check; no horizontal overflow | Viewport emulation + RTL tests; actual iOS Safari hardware test remains with owner |
| Console/network | `preview_logs` on `http://127.0.0.1:3205` | Clean — 0 console errors, all static JS/font assets HTTP 200 | — |

- Checks NOT run and why: live Supabase migration application (`0015_c5b_gameday.sql`, `0016_c5b_restore.sql`) and live signed-in browser mutations were not run against production/cloud DB because migrations are owner-applied separately and the local browser has no owner OAuth session.
- Actual-device owner test still needed: iOS Safari portrait check on the owner's iPhone (carried into C6A release gate per PLAN.md/ACCEPTANCE.md).

## Owner manual acceptance
1. Preconditions and starting state: apply `0014_c4b_scouting.sql` (if not yet applied), `0015_c5b_gameday.sql`, and `0016_c5b_restore.sql` in order to the Supabase project, then sign in as the allowlisted owner.
2. Actions to take:
   - Open **Gameday**, toggle **Offense** and **Defense**, switch between loaded books (Falcons/Bears on offense, Falcons/Vikings on defense), and tap Drive Themes, Down & Distance chips, and Play Type badges.
   - Click **Refresh calls**, verify the `"Displayed this session"` note appears when cycling, then click **Reset displayed memory**.
   - Select a play card to inspect its Civil.GG play-art diagram, rule trace, coaching notes, and planned `FormationDiagram`. Toggle **Compact # circles** / **Name markers** and tap a slot to inspect player OVR and status warnings.
   - Open **Edit plan**, set a custom name/notes, pin a play and formation, and click **Save plan**.
3. Expected visible result: 3 complementary calls (or fewer/none with an honest reason on unsupported cells), responsive single-column phone layout without horizontal page overflow, and persisted plan name/notes/pins across reload and backup export/restore.
4. Recovery/undo to try: clear custom plan name/notes and unpin favorites in **Edit plan** → **Save plan**, or export a backup before editing and restore into a new franchise.
5. Known limitation to verify: coaching notes are labeled as football heuristics; formation slot inheritance remains provisional under D113/D128.

## Database/environment
- Dev/prod project identities (non-secret): local PGlite test database; private Supabase project in `.env.local`.
- New migration files / applied environments: `supabase/migrations/0015_c5b_gameday.sql` and `supabase/migrations/0016_c5b_restore.sql` — verified in PGlite (`tests/db/gameday.test.ts`, `tests/db/restore.test.ts`), not applied to live cloud DB.
- Safe application order / compatibility: apply `0015_c5b_gameday.sql` first, then `0016_c5b_restore.sql` (which wraps `restore_new_franchise_c4b` from `0014_c4b_scouting.sql`). Before `0015` is applied, `loadGameday` and `buildFranchiseEnvelope` degrade gracefully to empty saved plans so read-only Gameday browsing still works.
- Preview server port/process owner: `http://127.0.0.1:3205` (PID 18404 in this worktree).
- No secret values included.

## Open items
- Blockers: none for Phase 5 code completion.
- Bugs/limitations with severity:
  - Low: live cloud persistence of Gameday plans and C5B backup restore requires applying `0014_c4b_scouting.sql`, `0015_c5b_gameday.sql`, and `0016_c5b_restore.sql` in order.
  - Low: actual iOS Safari device walkthrough and D113 in-game evidence supplement remain open for C6A.
- Deferred work explicitly outside scope: C6A integrated hardening and release handoff.
- Other-editor/uncommitted work left untouched: sibling worktrees left untouched.

## Next steps (owner flow)
1. Apply pending migrations in order (`0014_c4b_scouting.sql`, `0015_c5b_gameday.sql`, `0016_c5b_restore.sql`) after exporting a manual backup — owner: project owner; artifact: `supabase/migrations/0014_c4b_scouting.sql`, `supabase/migrations/0015_c5b_gameday.sql`, `supabase/migrations/0016_c5b_restore.sql`; **OWNER APPROVAL/CHECK:** confirm predecessor migrations are applied before running `0015` and `0016`.
2. Complete signed-in desktop and iPhone iOS Safari walkthrough of `/gameday` — owner: project owner; artifact: `/gameday`; **OWNER APPROVAL/CHECK:** verify 3-call spotlight, Civil.GG play art, compact `#` markers, and plan save/restore on device.
3. Launch **C6A** (Phase 6 — Integrated hardening and owner handoff) from the merged `main` baseline — owner: next execution thread; artifact: [phases/06-hardening.md](../../phases/06-hardening.md) and [LAUNCH_PROMPTS.md](../../LAUNCH_PROMPTS.md); **OWNER APPROVAL/CHECK:** none to start C6A once Phase 5 PR is merged.

Immediate next step: **apply migrations `0015` and `0016` (after `0014`) to the live Supabase project or launch C6A from the merged `main` baseline.**

## Next thread — pasteable launch
- Exact next checkpoint: **C6A** (Phase 6 — Integrated hardening and owner handoff)
- Required merged baseline and how to verify it: `main` containing merged Phase 5 (C5A/C5B) PR; verify with `git log -5 --oneline origin/main`
- Files/docs to read first: `START_HERE.md`, `phases/06-hardening.md`, `PLAN.md`, `ACCEPTANCE.md`, `docs/checkpoints/C5B.md`
- Owned paths/modules: full-workflow integration tests, performance/accessibility/security audit docs, `docs/checkpoints/C6A.md`, `START_HERE.md`
- Dependencies that MUST land first: C0A–C5B merged to `main` (satisfied)
- Allowed implementation outcomes: end-to-end workflow test coverage, security/RLS/backup verification, performance and recovery documentation, honest coverage/limitation summary
- Things NOT to change: do not invent game facts, add paid services/AI, or claim unverified books/mappings are game-verified
- Verification and PR exit gate: `npm run checks`, `npm run test:db`, desktop/mobile browser pass, `docs/checkpoints/C6A.md`, and mergeable PR to `main`
