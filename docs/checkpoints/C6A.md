# C6A — Integrated release verification

## Status
- State: in progress — local release evidence complete, owner walkthrough and PR pending
- Updated by: C6A execution thread
- Workspace root: Freebuff worktree, branch `checkpoint/c6a-release-evidence`
- Feature branch: `checkpoint/c6a-release-evidence`
- Verified PR target: `main`
- Started from merged base commit: `15cfea0` (merge of PR #30, completing C5A `6bf9daa` and C5B `2908dbf`/`cc604f2`/`a868e0b`)
- Current commit / PR URL (if known): not committed yet
- Remote mergeability/check state: not pushed
- Owner merge confirmed? No
- Production deploy status: not verified in this thread; the merged `main` deploys through the existing Vercel production branch only after owner merge
- Production migration status: `0015_c5b_gameday.sql` and `0016_c5b_restore.sql` **not applied** — owner action outstanding (see blockers)

## Scope and authority
- Read decisions/spec/phase packet versions: [phases/06-hardening.md](../../phases/06-hardening.md), [PLAN.md](../../PLAN.md) C6A row, [ACCEPTANCE.md](../../ACCEPTANCE.md), [WORKFLOW.md](../../WORKFLOW.md), [SETUP.md](../../SETUP.md), [START_HERE.md](../../START_HERE.md), C5A/C5B records, D113/D128/D130–D136
- Approved changes: release verification only — an integrated release-chain database test, a representative-data gameday measurement, live migration-state verification, and this record. No feature, schema, or scope changes.
- Explicit exclusions: new features, source/mapping expansion, production deployment, production data reset, any real production pause/recovery drill
- File/module ownership and integration owner: single integrated writer for this checkpoint; owns [tests/db/release.test.ts](../../tests/db/release.test.ts), [tests/gameday-performance.test.ts](../../tests/gameday-performance.test.ts), [docs/checkpoints/C6A.md](C6A.md), and the `START_HERE.md` status lines
- Shared contract version: `C0B-v2` (unchanged)
- Other active lane / delivery mode / merge order: none; one integrated checkpoint PR, owner-merged

## Implemented
- Integrated release-chain test [tests/db/release.test.ts](../../tests/db/release.test.ts) walks one franchise across the C6A scenario list on the real migrations in PGlite: source attach → recorded player fact → planned depth chart → planned formation override → checklist confirm → safe undo → dependent trade blocked until the planned lineup releases the outgoing player → trade applied exactly once and replayed idempotently → scouting preferences/shortlist → gameday plan with ordered pins. A second franchise is asserted to hold none of that state.
- Representative-data measurement [tests/gameday-performance.test.ts](../../tests/gameday-performance.test.ts) evaluates every curated theme × supported situation on the full imported catalog, 50 iterations, with a loose regression ceiling. Measured: **46 catalog plays, 48 supported menus, 0.003 ms per menu**.
- Live migration inventory verified read-only against the real project (`xueymrywpvegslbkdnpf`): `0013` and `0014` objects answer (`save_transaction_proposal`, `restore_new_franchise_c4b` returns an authorization error rather than "not found"), while `save_gameday_plan`, `restore_gameday_state`, `restore_new_franchise_c5b` and the `franchise_gameday_*_view` views do not exist. `0015`/`0016` are therefore unapplied.
- Release blocker identified: merged application code calls `restore_new_franchise_c5b` for **every** restore, so backup restore fails on the live project until `0016` is applied, and Gameday plan saves fail until `0015` is applied. This is a deployment/migration-state problem, not a code defect; the reviewed SQL is already in the repository.

## Invariants verified
- Franchise/source isolation: integrated test asserts the second franchise sees zero gameday/scouting rows; existing PGlite suites cover RLS, cross-franchise RPC rejection and unauthorized accounts.
- Planned/confirmed and checklist semantics: integrated test confirms a reviewed depth-chart unit, then undoes it and asserts the plan reappears while the baseline returns to empty; formation override stays a plan-layer override.
- Formation uniqueness/override/orientation: override survives the chart confirm/undo cycle; orientation and slot inheritance are unchanged from C3A/C5B and remain provisional under D128.
- Auth/policies/secret handling: no privileged key in `.next/static` or `.next/server` build output; `.env*` is ignored; `SUPABASE_SECRET_KEY` is referenced only in [lib/supabase/config.ts](../../lib/supabase/config.ts) and consumed by the server-only client in [lib/supabase/server.ts](../../lib/supabase/server.ts).
- Unknown/missing-data handling: unchanged from C1B–C5B; backup export treats missing later-migration views as honest empty state, and restore rejects invalid state atomically.

## Verification evidence
| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck | `npm run typecheck` (Node 26.7.0, Windows worktree) | Passed | — |
| Build | `npm run build` (Next.js 16.3.8, Turbopack) | Passed | Build-only; no deployment |
| Lint | `npm run lint` (via `npm run checks`) | 0 errors, 2 pre-existing unused-parameter warnings in `lib/actions/import.ts` | Warnings predate C6A |
| Relevant tests | `npm test` | 39 files, 330 tests passed | jsdom unit/UI tests |
| Integration/policy tests | `npm run test:db` | 15 files, 118 tests passed (PGlite) | PGlite mirrors policies, not the live cluster |
| Gameday measurement | `npx vitest run tests/gameday-performance.test.ts` | 46 plays, 48 menus, 0.003 ms/menu | This machine only; not an iPhone measurement |
| Desktop browser | not run yet | Pending owner sign-in | `/gameday` and other private routes redirect when signed out |
| Phone/iOS check | not run | **Explicit owner interim waiver recorded** | No actual iOS Safari test; Chromium emulation is not an iOS result |
| Console/network | not run yet | Pending owner sign-in | — |

- Checks NOT run and why: authenticated browser acceptance (requires owner GitHub OAuth), live migration application (requires owner credential), actual-device iOS Safari (owner device), production deployment check (owner merge not requested).
- Screenshot/artifact links if created: none yet.
- Actual-device owner test still needed: yes, or the recorded interim waiver stands.

## Owner manual acceptance
1. Preconditions and starting state: `0015` then `0016` applied to the live project; signed in as the allowlisted owner; create a temporary franchise so no real roster is mutated.
2. Actions to take: (a) edit a player fact and set a planned depth-chart change; (b) open Formations, set a plan override and inspect the diagram; (c) create a manual trade with an owned pick, try to confirm it while the outgoing player is still on the planned lineup (expect a blocked-prerequisite message), then clear the plan and confirm; (d) confirm a checklist unit and undo it; (e) open Scouting, save a scheme pair and dismiss one target; (f) open Gameday, pick offense/defense, a theme and a situation, expand a play (Civil.GG art or the text/personnel fallback), pin a call and save the plan, then refresh twice; (g) export the franchise and restore it into a new franchise.
3. Expected visible result: blocked confirmation explains the prerequisite and changes nothing; the trade applies exactly once; undo restores the plan without claiming it reverses Madden; the restored franchise contains the plan name/notes/pins, the scouting shortlist and the pending/confirmed roster state; no duplicate players.
4. Recovery/undo to try: undo the confirmation batch; delete the temporary franchise by repeating its exact name; re-import the exported file and confirm the original is untouched.
5. Known limitation to verify: mappings, schemes and coaching copy are labeled provisional/heuristic; special teams have inventory and roles but no diagram (D131); play art is referenced from Civil.GG, not redistributed (D134).

## Database/environment
- Dev/prod project identities (non-secret): single Supabase Free project `xueymrywpvegslbkdnpf` (D103); Vercel Hobby; no separate dev project.
- New migration files / applied environments: none added. Applied state: `0001`–`0012` per earlier records, `0013` and `0014` confirmed live read-only in this thread, `0015_c5b_gameday.sql` and `0016_c5b_restore.sql` **pending**.
- Safe application order / compatibility: apply `0015` then `0016`, in that order, in the Supabase SQL editor (or via CLI with a credential). `0016` replaces `restore_new_franchise`'s wrapper; until both are applied, restore and Gameday saves fail. Both migrations are additive/replace-only and safe to apply once; they were verified in PGlite by `tests/db/gameday.test.ts` and `tests/db/restore.test.ts`.
- Backup and rollback/recovery considerations: export a versioned franchise backup before applying (SETUP §8); the free project has no automatic backups. Migration rollback is dropping `app.franchise_gameday_pins`/`app.franchise_gameday_plans`, their views, and restoring the previous `restore_new_franchise` wrapper — only after exporting, and only with owner approval.
- Preview server port/process owner: this thread starts a local dev server on `127.0.0.1:3210` for the owner walkthrough; no other server is stopped.
- No secret values included.

## Open items
- **Blocker (critical until applied):** `0015`/`0016` unapplied → live restore fails for every backup and Gameday plan saving fails. Evidence: RPC probes above. Owner action required; the SQL is reviewed and unchanged from the merged C5B commit.
- **Limitation (owner-accepted interim waiver):** actual iOS Safari testing is pending; emulated 390 px checks are not a substitute. Revisit before any full phone-release claim.
- **Limitation:** authenticated end-to-end walkthrough not yet performed; the browser session is signed out and sign-in is owner-only.
- **Limitation:** D113 evidence supplement remains open; all formation mappings/schemes are provisional and special teams have no diagrams (D131). No unverified play becomes an actionable call.
- **Deferred:** production deployment and any production recovery drill; PR #29 (`freebuff/c4b-closeout-c5a-handoff`) remains a separate docs decision and is not part of this checkpoint.
- Bugs/limitations with severity: none known in the C5 code paths beyond the unapplied migrations.

## Next steps (owner flow)
1. Add `SUPABASE_ACCESS_TOKEN` to `.env.local` (or run `0015` then `0016` in the SQL editor) — owner: you; artifact: `supabase/migrations/0015_c5b_gameday.sql`, `0016_c5b_restore.sql`; **OWNER APPROVAL/CHECK:** applying schema to the live project, and confirm no errors.
2. Sign in to the local preview when the thread starts it — owner: you; command: `npm run dev` on the thread's port; **OWNER APPROVAL/CHECK:** GitHub OAuth as the allowlisted account.
3. Complete the walkthrough above and report any wrong state — owner: you; artifact: this record's acceptance section; **OWNER APPROVAL/CHECK:** confirm the observed results.
4. Review the release evidence and merge the PR — owner: you; artifact: PR for `checkpoint/c6a-release-evidence`; **OWNER APPROVAL/CHECK:** merge to `main` (this authorizes the app deployment, not any further DB change).
5. Decide PR #29 separately — owner: you; artifact: PR #29; **OWNER APPROVAL/CHECK:** reconcile or close as superseded.

Immediate next step: **apply `0015` then `0016` to the live project, then tell the thread to start the preview for sign-in.**

## Next thread — pasteable launch
- Exact next checkpoint: C6A closeout (owner walkthrough results + merge), or C6B if the owner defines a follow-up.
- Required merged baseline and how to verify it: `main` containing the C6A merge commit; `git log --oneline -1 origin/main`.
- Files/docs to read first: `phases/06-hardening.md`, this record, `START_HERE.md`, `ACCEPTANCE.md`, C5B record.
- Owned paths/modules: `docs/checkpoints/C6A.md`, `START_HERE.md`, release-evidence tests only.
- Dependencies that MUST land first: migrations `0015`/`0016` applied; owner sign-in.
- Allowed implementation outcomes: verification fixes only; no new features.
- Things NOT to change: mappings, catalog, schema beyond the reviewed migrations, deployment settings, scope.
- Verification and PR exit gate: `npm run checks` and `npm run test:db` green, authenticated walkthrough recorded, iOS waiver or result recorded, PR conflict-free with checks passed; owner merges.
