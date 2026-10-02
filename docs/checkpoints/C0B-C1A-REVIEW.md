# C0B-C1A-REVIEW — Independent review lane (C0B contract + C1A shell)

## Assignment header

```text
Checkpoint:                  C0B-C1A-REVIEW (independent review lane)
Workspace/worktree:          Freebuff-managed isolated worktree (repo-relative paths only)
Owned feature branch:        freebuff/my-c1a-build-just-finished-conduct-the-independent-39626366-e8b3-401c-8ac9-f072a158e51f
Verified PR target:          main
Production deployment branch: main (docs-only delivery; nothing deployable by this lane)
Accepted merged base commit: ff9975d (PR #8; includes PRs #1–#8)
Predecessor PRs/records:     #1–#4 C0A, #5 independent C0A review, #6 dispositions, #7 C0B contracts, #8 C1A shell
Integration owner:           owner (primary writer owns DECISIONS/SPEC/PLAN/contracts/checkpoint records)
Owned modules/paths:         docs/reviews/C0B-C1A-independent-review.md, docs/checkpoints/C0B-C1A-REVIEW.md
Other lane / shared contract: none active; contract version under review is C0B-v1
Delivery mode:               integrated closeout PR (owner-directed; report + accepted corrections)
PR merge order:              owner merge; C1B waits for this closeout to land
Dev/test environment:        Node v26.7.0, npm 11.19.0 (only package manager present); review dev/prod
                             server on port 3110 (the C1A thread's server on 3100 was left untouched)
```

## Status

- **State: closed — owner accepted and every item dispositioned (D115–D117, 2026-10-02).** C0B is accepted
  as `C0B-v2`, C1A as the post-correction shell; resolutions are in the Dispositions section below. The
  independent review lane has no open blockers.
- Reviewed artifacts: `C0B-v1` (merged `236886f`, PR #7) and the C1A shell (merged `ff9975d`, PR #8).
- **No blocker was found in either checkpoint.** Two important items (C0B identity-reconciliation rules;
  C1A's denied production deployment) and six suggestions were recorded in the report and are now
  dispositioned.
- Independence basis: a separate execution thread in its own worktree that authored neither the contract
  nor any C1A shell file (D101/WORKFLOW operational definition; not an external audit). The review was
  executed before the owner-directed closeout applied the corrections, so its findings are unaffected.
- Updated by: independent review thread. Owner acceptance recorded 2026-10-02; merging this closeout PR
  confirms it on `main`.

## Scope and authority

- Read: `START_HERE.md`, `DECISIONS.md`, `SPEC.md`, `DESIGN.md`, `PLAN.md`, `WORKFLOW.md`, `HANDOFF.md`,
  `ACCEPTANCE.md`, `AUDIT.md`, `LAUNCH_PROMPTS.md`, `phases/00-evidence.md`,
  `phases/00-independent-review.md`, `phases/01-foundation.md`,
  `docs/contracts/C0B-contract-spec.md`, `docs/checkpoints/C0B.md`, `docs/checkpoints/C1A.md`,
  `docs/reviews/C0A-independent-review.md`, `docs/checkpoints/C0A-REVIEW.md`, and the full C1A shell
  (`app/**`, `components/**`, `lib/nav.ts`, `tests/**`, configs, `.github/workflows/checks.yml`).
- Approved changes: the two owned files only.
- Explicit exclusions: no edits to `DECISIONS.md`, `SPEC.md`, `PLAN.md`, `DESIGN.md`, `ACCEPTANCE.md`,
  the contract, or the C0B/C1A delivery records; no shell code changes, installs beyond `npm ci`,
  provisioning, migrations, or production actions.
- Report integration mode: **separate owned report PR**; findings are coordinated through the owner, and
  proposed corrections are listed in the report for the primary writer/owner to apply.

## Findings summary

| ID | Checkpoint | Severity | Issue | Disposition needed |
|---|---|---|---|---|
| CB-1 | C0B | important | Identity reconciliation frozen as `matched/new/conflict` outcomes but the matching key/rule (especially across revisions) is unspecified; C1B may not redefine semantics | Add a reconciliation-rule clause to `C0B-v2`, or record an explicit C1B gate |
| CB-2 | C0B | suggestion | Minimum fixture coverage for transaction → depth chart → formation → confirmation is not marked | Mark the minimum fixture set/gate in §14/§15 |
| CB-3 | C0B | suggestion | Undo bound is a declared constant while the replay-retention bound is "e.g., ~200"; "whichever set is smaller" reads ambiguously | State both bounds consistently |
| CA-1 | C1A | important | Record denies production hosting, but a Vercel **Production** deployment of `ff9975d` completed (protected, anonymous 401) | Correct the C1A record's deployment section; owner confirms auto-deploy |
| CA-2 | C1A | important | Required honest loading/error states are absent (no `loading.tsx`/`error.tsx`/`not-found.tsx`) and undisclosed | Add minimal loading/error UI or record an explicit, owner-accepted deferral |
| CA-3 | C1A | suggestion | Documented phone check uses `/gm?view=transactions`; no such tab value (`assets`), so it silently renders Roster | Fix the record URL; optionally reject/default-annotate unknown values |
| CA-4 | C1A | suggestion | Phone bottom nav shows no active item on `/gm`, `/coach`, `/settings` despite the record's "active indicator" claim | Decide More-group active behavior; correct the evidence row |
| CA-5 | C1A | suggestion | Top-bar controls (Theme, Franchise) are 36px tall, under DESIGN's proposed 44px mobile minimum | Raise to ≥44px or record an accepted deviation |
| CA-6 | C1A | suggestion | Record's "10 routes (7 static, 3 dynamic)" does not match the merged build (9 entries: 5 static / 4 dynamic) | Restate the build evidence from the merged commit |

Full detail, evidence, and proposed corrections:
[docs/reviews/C0B-C1A-independent-review.md](../reviews/C0B-C1A-independent-review.md).

## Dispositions (adopted — D115–D117, 2026-10-02)

| ID | Disposition | Where it landed |
|---|---|---|
| CB-1 | **Accepted** — reconciliation keys frozen in `C0B-v2` §2 | [docs/contracts/C0B-contract-spec.md](../contracts/C0B-contract-spec.md) |
| CB-2 | **Accepted** — minimum chain table added (`C0B-v2` §15) | [docs/contracts/C0B-contract-spec.md](../contracts/C0B-contract-spec.md) |
| CB-3 | **Accepted** — declared retention constants (`C0B-v2` §4/§5) | [docs/contracts/C0B-contract-spec.md](../contracts/C0B-contract-spec.md) |
| CA-1 | **Accepted** — production deploy recorded and corrected | [docs/checkpoints/C1A.md](C1A.md) |
| CA-2 | **Accepted** — loading/error/not-found states added | [app/loading.tsx](../../app/loading.tsx), [app/error.tsx](../../app/error.tsx), [app/not-found.tsx](../../app/not-found.tsx) |
| CA-3 | **Accepted** — URL corrected; tab values centralized and test-locked | [docs/checkpoints/C1A.md](C1A.md), [lib/tabs.ts](../../lib/tabs.ts), [tests/shell.test.tsx](../../tests/shell.test.tsx) |
| CA-4 | **Accepted** — More active on child routes | [lib/nav.ts](../../lib/nav.ts), [components/bottom-nav.tsx](../../components/bottom-nav.tsx) |
| CA-5 | **Accepted** — controls raised to 44px | [components/theme-toggle.tsx](../../components/theme-toggle.tsx), [components/franchise-status.tsx](../../components/franchise-status.tsx), [app/page.tsx](../../app/page.tsx) |
| CA-6 | **Accepted** — build evidence corrected to 9 route entries | [docs/checkpoints/C1A.md](C1A.md) |

The owner accepted C0B and C1A (D115/D116), accepted merge-triggered Vercel Production auto-deploy
(D116), and recorded C1B as the next checkpoint (D117).

## Verification evidence

| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`), Node v26.7.0, clean `npm ci` at `ff9975d` | pass | review worktree, not the C1A lane's |
| Lint | `npm run lint` (eslint 9.39.5 + eslint-config-next) | pass | — |
| Tests | `npm test` (`vitest run`, jsdom) | pass — 1 file, 6 tests at review time | unit/RTL only |
| Closeout re-check | `npm run checks` + live `next start` after corrections | pass — 8/8 tests; More active on `/gm`; controls ≥44px; `/does-not-exist` renders the honest not-found page; no horizontal overflow | review worktree, post-correction tree |
| Build | `npm run build` (next 16.3.8, Turbopack) | pass — 9 route entries (5 static incl. `/_not-found`; 4 dynamic) | counts differ from the C1A record (CA-6) |
| Full gate | `npm run checks` | pass — all four stages | — |
| Remote checks | `gh pr view 7` / `gh pr view 8` | PR #8: `checks`, `Vercel`, `Vercel Preview Comments` SUCCESS; PR #7: `Vercel` SUCCESS | merged-state rollup only |
| Live shell | `next start -p 3110` (production build) at 1440×900, 1280×720/600, 390×844, 360×740 | pass — rail + bottom nav, both themes, honest empty states, no overflow/clipping down to 360 | Chromium emulation only |
| Navigation/tab state | live clicks + DOM reads | `/lineups?view=formations` works; `/gm?view=transactions` falls back to Roster; no active bottom-nav item on `/gm` | see CA-3/CA-4 |
| Contrast | recomputed from committed tokens | all 8 recorded ratios reproduce exactly | computed values, not pixel sampling |
| Theme/focus | toggle + reload + `Tab` | dark persists pre-hydration; skip link is first tab stop | — |
| Console/network | preview console + requests | console empty; only normal RSC prefetch aborts | dev/prod local only |
| Docs links | fresh throwaway parser | 29 files, 196 relative links, 15 anchors, **0 missing** | not committed |
| Deployment state | `gh api .../deployments` + statuses | Production `ff9975d` success, URL returns 401 | protection config not readable |
| Hosted preview | anonymous fetch of the production host | 401 Unauthorized — not visually verified | requires Vercel session |

- Checks NOT run and why: no database/policy/isolation tests (no backend at C0B/C1A), no real iOS Safari
  device test, no 200% zoom exercise, no hosted/pixel-diff comparison.
- Screenshots/artifacts: captured live in the review preview panel; not committed (nothing in the app
  needs them). No secrets, private exports, or temporary scripts are committed.
- Actual-device owner test still needed: the C1A visual gate itself, on desktop and a real phone.

## Owner manual acceptance

1. Preconditions: `main` @ `ff9975d`; read the report and this record.
2. Actions: confirm the dispositions you want for CB-1…CB-3 and CA-1…CA-6; decide whether the C1A visual
   acceptance covers the full empty/loading/error deliverable or a narrowed scope; decide the More-group
   active nav and the 36px top-bar control height. To reproduce independently: `npm ci`, `npm run checks`,
   `npm run dev -- --port <free port>`.
3. Expected result: owner records dispositions (a new `C0B-v2`/C1B gate and C1A record corrections are
   primary-writer actions) and either accepts C1A for C1B or requests shell changes.
4. Recovery/undo: docs only in this lane; close/revert the PR without effect on application state.
5. Known limitation: independence is separate-thread, not an external/human audit; hosted pages were not
   visually verified because Vercel returns 401 anonymously.

## Open items

- CB-1 (important), CB-2/CB-3 (suggestions) — contract corrections or explicit gates.
- CA-1, CA-2 (important) and CA-3…CA-6 (suggestions) — record corrections and/or shell decisions.
- This lane does not accept C0B or C1A; the C1A owner visual gate and the C1B prerequisite
  (`PLAN.md`: C1B requires C1A visual acceptance) remain open until the owner records them.
- IR-10 preview/production write isolation is still a C1B/C6A verification; CA-1 now shows Production
  hosts the shell (protected), which C1B should account for.

## Next thread — pasteable launch

- Exact next checkpoint: **C1B** (private auth, isolated data, franchise lifecycle) per
  [phases/01-foundation.md](../../phases/01-foundation.md), using the canonical C1B launch prompt. The C1A
  visual acceptance and all dispositions above are recorded (D115–D117); C1B may start once this closeout PR
  is merged and owner-scoped Supabase/install authorization is granted.
- Required merged baseline and how to verify it: `main` with the C1A merge (`git log --oneline -1
  origin/main` shows the C1A merge; `git merge-base --is-ancestor ff9975d origin/main`).
- Files/docs to read first: this record and the review report; `phases/01-foundation.md` (C1B);
  `docs/contracts/C0B-contract-spec.md` (**C0B-v1**, plus any `C0B-v2` amendment the owner records);
  `SETUP.md`; `ACCEPTANCE.md` (A31–A41).
- Owned paths/modules: C1B assigns its own lane ownership from what C1A created (`app/`, `components/`,
  `lib/nav.ts`, `tests/`); reuse the shell rather than building a parallel layout.
- Dependencies that MUST land first: owner C1A visual acceptance (this review's items dispositioned or
  accepted); scoped authorization for Supabase provisioning and installs; dev/prod split and preview
  credential isolation configured and verified (D103/D105, IR-10).
- Allowed implementation outcomes: single-owner GitHub OAuth with controlled bootstrap, isolated
  franchises with Falcons default and custom players, immutable source revisions + coverage reporting,
  grouped editable fields with unknown ≠ zero, the minimal planned-vs-recorded primitive, revision-safe
  autosave with unsaved-input protection, retry-safe idempotent mutations, and the versioned backup
  envelope with restore-new/ID remapping — all against the frozen contract.
- Things NOT to change: do not re-derive schema or state semantics in UI code; no depth-chart/formation/
  transaction/gameday logic (C2–C5); no fake or invented data; keep save/sync honesty wording intact.
- Verification and PR exit gate: real integration tests for unauthorized/cross-franchise access, source
  immutability, stale writes, failed saves, and backup/restore safety (not mocked-only), plus
  typecheck/lint/test/build and desktop/phone inspection; owner merges ONE integrated C1B PR per
  `WORKFLOW.md`.
