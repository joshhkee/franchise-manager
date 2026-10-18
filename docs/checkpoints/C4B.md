# C4B — Provisional scouting and Coach workspace

## Status
- State: implementation ready for owner review; awaiting owner acceptance and merge.
- Workspace: isolated `franchise-manager-c4b`; branch `freebuff/c4b-scouting-coach`.
- PR target: `main`; base `3e3cad4` (C4A merge, PR #27).
- Current commit / PR: recorded in the PR after creation; owner merge is pending.
- Owner merge: No. Production deployment: none.
- Migration status: `0014_c4b_scouting.sql` not applied; owner review/application is a separate step.

## Scope and authority
- Read [phase 4](../../phases/04-gm-coach.md), [PLAN](../../PLAN.md), [DECISIONS](../../DECISIONS.md), and relevant accepted C2/C3 records. Accepted C4A baseline: merge `3e3cad4` (PR #27).
- D132 permits proceeding on the stable but **unverified** selected-book catalog, with clear provisional labels. This is an exception to PLAN's verified-catalog prerequisite, not Madden evidence, recommendation acceptance or closure of D113.
- Explicitly excluded: scheme-fit rankings, athletic-anomaly rankings, invented OVR/fit grades, and game-legal trade advice.
- One integrated checkpoint; no separate lane. Owned: scouting/Coach UI, migration 0014, backup extension and tests, decision/dependency notes and this record.

## Implemented
- Coach scheme/playbook panel with separate owner-entered schemes, independent offense/defense books, unknown defaults and provisional catalog disclosure.
- GM Trade Block/Targets: name/team/position and raw numeric filters, missing-value labels, raw side-by-side comparison, non-ranking role notes, headcount context only, persistent shortlist pin/dismiss/note.
- Scheme/book chooser and all available book options now visibly disclose provisional, unverified status.
- Coach Personnel Gaps and Formation Identity link to authoritative lineup/formation editors rather than cloning them.
- Franchise-scoped preferences/shortlist with stale-revision and idempotent commands in `0014_c4b_scouting.sql`.
- Backup export/restore for preferences, shortlist status/notes, source/player references and remapped franchise player IDs. No new dependencies.

## Invariants verified
- PGlite tests cover isolated preferences, cross-franchise reference rejection and visibility between owners.
- Scheme/book selections and shortlist state are app state, not game actions/checklist changes.
- Missing numeric values remain unknown and do not pass a numeric range filter.
- Mappings remain provisional; there is no fit/anomaly scoring.
- Older backup envelopes remain accepted; C4B state round-trips with restored player IDs.

## Verification evidence
| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Full checks | `git diff --check && npm run checks` (`typecheck`, `lint`, `npm test`, `build`) | Passed; typecheck and build passed, lint had 0 errors, full suite 34 files / 307 tests passed | Lint reports two existing unused-argument warnings in `lib/actions/import.ts`; automated/PGlite only; no live migration. |
| Signed-out browser smoke | Next.js 16.3.8 Webpack dev, `127.0.0.1:3204`; `/` and `/sign-in` | Passed: root redirects to `/sign-in`, sign-in renders and browser console/network show no app errors | Authenticated GM/Coach interactions unavailable because no signed-in owner session. Screenshot shows existing compact shell and single-column sign-in layout; not a C4B authenticated visual acceptance. |
| Browser | Next.js Webpack dev at `127.0.0.1:3204`, `/` → `/sign-in` | Signed-out route smoke passed; sign-in page rendered | Signed-in GM/Coach product flow remains unavailable without an owner session. |
| Console/network | Browser devtools on `/sign-in` | No app errors observed; required JS and font requests returned 200 | Limited to signed-out route. |
| Migration/policy | `tests/db/scouting.test.ts` via full ordered migrations | Passed | `npx supabase migration list` cannot run because the C4B worktree is not linked to a project. No live migration. |

Owner's signed-in desktop/mobile review and live migration verification remain necessary.

## Owner manual acceptance
1. Review and separately authorize application of `supabase/migrations/0014_c4b_scouting.sql` to the approved project, checking predecessor migrations first.
2. Coach → Scheme & Playbook: save offense/defense independently, leave unknown blank, reload and verify persistence and provisional messaging.
3. GM → Trade Block/Targets: search/filter, compare up to three raw profiles, inspect missing data, save note, pin/dismiss/restore.
4. Coach gaps/identity links open the authoritative editors.
5. Export and restore into a new franchise; verify preferences, notes, dismissals and player/source identities.
6. Confirm no fit/anomaly score or unverified Madden claim is displayed.

## Database/environment
- No project was linked or changed by this thread.
- Migration `0014_c4b_scouting.sql` is additive and follows `0013_gm_ledger.sql`; it was not applied.
- Next.js Webpack dev server at `127.0.0.1:3204` served `/` with a 307 sign-in redirect and `/sign-in` with HTTP 200. Signed-in C4B routes were not exercised because no owner browser session was available. No credentials included.

## Open items
- Owner review of representative behavior and provisional labels; D132 does not accept recommendation quality or close D113.
- D113 evidence supplement and Madden verification remain open. Fit/anomaly policy remains disabled.
- Supabase CLI migration listing is blocked by absent project ref; do not link/apply without the owner's explicit project/migration step.
- No unrelated edits were staged, committed, pushed or changed.

## Next steps (owner flow)
1. Review this record and C4B provisional behavior — owner: project owner; approval/check: confirm D132's limited scope and no scoring.
2. Complete signed-in desktop/mobile walkthrough — owner: project owner; artifact: GM and Coach routes; approval/check: verify representative behavior and flag confusing provisional labels.
3. Review and explicitly authorize migration application — owner: project owner; artifact: `supabase/migrations/0014_c4b_scouting.sql`; approval/check: verify target and migration order.
4. After application, rerun `npm test`, `npm run checks`, and backup restore — owner: C4B thread; approval/check: live DB and user-facing behavior.
5. Review and merge the C4B PR to `main` — owner: project owner; artifact: C4B pull request; approval/check: owner reviews and merges, no self-merge.
6. Keep D113 evidence work separate before enabling fit/anomaly rankings — owner: future evidence thread; approval/check: accept game evidence.

Immediate next step: owner review of provisional C4B behavior, migration, and PR before merge or migration application.
