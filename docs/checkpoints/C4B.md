# C4B — Provisional scouting and Coach workspace

## Status
- State: **closed per owner direction; PR #28 merged to `main`** at `817b9c6`.
- Updated by: C4B closeout follow-up; workspace root is this repository (absolute local paths omitted).
- Remote checks: PR #28 is merged; historical check details are recorded below. This follow-up did not re-query PR checks.
- Production deployment: not verified here; no production deployment operation performed.
- Workspace: isolated `franchise-manager-c4b`; branch `freebuff/c4b-scouting-coach`.
- PR target: `main`; base `3e3cad4` (C4A merge, PR #27); merged PR: [#28](https://github.com/joshhkee/franchise-manager/pull/28).
- Owner merge: Yes. This closes the code checkpoint; it does not imply the live migration or signed-in live walkthrough occurred.
- Migration status: `0014_c4b_scouting.sql` remains unapplied per the available record; live application is separate and requires owner authorization.
- Browser status: previous execution verified signed-out routes only; signed-in C4B behavior was not exercised.

The checkpoint is closed as requested. The migration and signed-in walkthrough remain explicit follow-up operational checks, not evidence to invent or mark complete.

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

## Follow-up items (not a blocker to the owner's requested code-checkpoint closure)
- The signed-in desktop/mobile walkthrough remains outstanding; D132 does not accept recommendation quality or close D113.
- Migration `0014_c4b_scouting.sql` is unapplied. Review and live application are separate owner-authorized operations; do not apply it without explicit authorization.
- D113 evidence supplement and Madden verification remain open. Fit/anomaly policy remains disabled.
- Supabase CLI migration listing was blocked by the absent project ref; do not link/apply without the owner's explicit project/migration step.

## Next steps
1. **Immediate next step: start C5A in a separate thread** — owner: project owner / C5A thread; artifact: C5A on merged base `817b9c6`; **OWNER CHECK:** use the last recorded roster, restrict actionable records to game-observed Madden 27 calls, and wait for the owner's call-sheet examples before freezing coverage boundaries.
2. Complete the signed-in C4B walkthrough — owner: project owner; artifact: GM and Coach routes; check representative behavior and provisional labels.
3. Review and explicitly authorize migration application — owner: project owner; artifact: `supabase/migrations/0014_c4b_scouting.sql`; **OWNER APPROVAL:** verify target and migration order.
4. After application, rerun `npm test`, `npm run checks`, and backup restore — owner: implementation thread; check live DB and user-facing behavior.
5. Keep D113 evidence work separate before enabling fit/anomaly rankings — owner: future evidence thread; **OWNER CHECK:** accept Madden evidence.
