# C0B — Initial Contract/Fixture Specification (C0B-v1)

## Assignment header

```text
Checkpoint:                  C0B (initial contract/fixture specification)
Workspace/worktree:          Freebuff-managed isolated worktree (repo-relative paths only)
Owned feature branch:        checkpoint/c0b-contracts
Verified PR target:          main
Production deployment branch: main (docs-only delivery; nothing deployable)
Accepted merged base commit: 4299cb0 (PR #6 merged; includes PRs #1–#5)
Predecessor PRs/records:     C0A evidence, spike, review and dispositions (PRs #1–#6 merged); C0A accepted with exceptions (D113)
Integration owner:           owner; this lane is the single contract writer for C0B-v1
Owned modules/paths:         docs/contracts/C0B-contract-spec.md, docs/checkpoints/C0B.md
Other lane / shared contract: none active; contract version C0B-v1
Delivery mode:               single docs-only checkpoint (independent)
PR merge order:              owner review first; C1A waits for merge or explicit owner acceptance
Dev/test environment:        n/a (docs-only)
```

## Status

- **State: owner accepted & merged.** PR #7 merged as `236886f`; on 2026-10-02 the owner accepted the
  contract and its `C0B-v2` amendment (D115), adopting the independent review's CB-1…CB-3 corrections.
- Updated by: C0B execution thread (contract writer); `C0B-v2` amendment recorded by the closeout thread.
- Contract version: **`C0B-v2`** (supersedes `C0B-v1`; version history in the contract). C1B–C4A implement
  against `C0B-v2`.
- Owner merge confirmed? **Yes — resulting base commit `236886f`**; the closeout PR carries the `C0B-v2`
  amendment. Production deployment/migration: not applicable.

## Scope and authority

- Read: `START_HERE.md`, `DECISIONS.md` (Rounds 1–23), `SPEC.md`, `DESIGN.md`, `RESEARCH.md`,
  `PLAN.md`, `WORKFLOW.md`, `HANDOFF.md`, `ACCEPTANCE.md`, `phases/00-evidence.md` (C0B),
  `phases/01-foundation.md`–`phases/05-gameday.md`, C0A register and the independent review report.
- Approved changes: the contract/fixture specification and this record only.
- Explicit exclusions: no application code, physical schema/migrations (C1B), installs,
  provisioning, scope changes; no invented game rules or ratings formulas.
- Findings from the independent review are carried into the contract (IR-3…IR-11 traceability in
  §13) without redefining confirmed decisions.

## Implemented

- Contract set + engineering ADR + scenario matrix:
  [docs/contracts/C0B-contract-spec.md](../contracts/C0B-contract-spec.md).
- **`C0B-v2` amendment (2026-10-02)**: declared identity reconciliation keys (CB-1, §2), the minimum
  transaction → depth chart → formation → confirmation fixture chain (CB-2, §15), and declared retention
  constants for undo history and request-outcome replay (CB-3, §4/§5). No previously frozen behavior
  changed meaning.
- Outcomes frozen: source revision pinning/reconciliation with fetch-failure safety; franchise
  isolation and custom-ID namespace; baseline/plan/diff model with explicit intent and unknown
  policy; action units (ordered list default), partial/bulk atomic confirmation, cancel, bounded
  undo (50 batches or 30 days, whichever is smaller); revision + idempotency contract; formation
  inheritance/override resolution; proposal-vs-completion transactions; versioned backup envelope
  with restore-new, ID remapping, and missing-revision safety; logical entities/commands/read
  models/error taxonomy; persistence, tooling constraints, and test strategy.
- Deliberately not frozen: physical schema (C1B), slot/eligibility evidence (D113 supplement),
  special teams (C3B/D114), fit rubrics (C4B), gameday view/metadata (C5A).

## Invariants verified

- Docs-only delivery: contract semantics are specified; executable verification belongs to the
  owning checkpoints named in the scenario matrix (§14).
- Source immutability, franchise isolation, revised-write safety, unknown-not-zero, app-fact vs
  game-action classification, override persistence, and backup growth rules are stated as
  invariants with their future test homes.
- No source records, game rules, thresholds, or proprietary formulas were invented; unresolved
  items are listed as evidence gates/owner questions in §11.

## Verification evidence

| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck/build/tests | n/a | not run | docs-only; no application exists |
| Docs link/anchor check | fresh Node parser over repo Markdown, 2026-10-02 | pass — 28 files, 164 relative links, 15 anchors, 0 missing | anchor slug heuristics |
| Consistency cross-read | contract vs SPEC/ACCEPTANCE/DECISIONS/phase packets | pass — semantics matched to cited decisions; conflicts none found | game-rule facts remain gated |
| Application/browser checks | n/a | not run | no app |

- Checks NOT run and why: application type/build/tests, DB/policy, browser/phone — no application
  exists; this is a documentation/contracts checkpoint.
- No secrets, private exports, or copyrighted payloads were committed.

## Owner manual acceptance

1. Preconditions: `main` @ `4299cb0`; read [docs/contracts/C0B-contract-spec.md](../contracts/C0B-contract-spec.md).
2. Actions: check that the frozen scope (§1) matches your intent; confirm the bounded undo bound
   (§4), the backup restore-new/missing-revision behavior (§8), and that §11 gates list every
   unresolved evidence item you expect before C2A/C3A/C3B.
3. Actual result: owner merged PR #7 (`236886f`) and accepted the contract; the independent review's
   CB-1…CB-3 corrections were adopted as `C0B-v2` (D115).
4. Recovery/undo: docs only; close/revert the PR without application effect.
5. Known limitation: game-dependent slots/eligibility/special teams/orientation remain open gates;
   the contract keeps them configurable rather than guessing.

## Database/environment

- No database, project, or environment changes; no migrations; no new dependencies.
- Preview credential isolation remains a recorded requirement to configure and verify at C1B/C6A
  (D103/D105; IR-10).

## Open items

- Evidence gates and owner questions: contract §11 (depth-chart matrix and orientation, Falcons
  mappings/stock book/alternate source, special-teams attempt, game-editability classification,
  archive behavior, gameday view, fit thresholds, preview isolation).
- The D113 evidence supplement is required before C2A's verified-ordering exit at the latest and
  before C3A/C3B; owner may prioritize it earlier.
- No blocker for C1A: the shell is not gated by domain interfaces.

## Next thread — pasteable launch

- Exact next checkpoint: **C1B** (private auth, isolated data, franchise lifecycle) per
  [phases/01-foundation.md](../../phases/01-foundation.md) and the C1B launch section of
  [docs/checkpoints/C1A.md](C1A.md). C0B and C1A are both owner-accepted and merged.
- Required merged baseline: `main` containing PR #7 (`236886f`), the C1A merge (`ff9975d`), and the
  closeout review/disposition PR; verify `git merge-base --is-ancestor ff9975d origin/main`.
- Files/docs to read first: `START_HERE.md`, `phases/01-foundation.md` (C1B), this record,
  `docs/contracts/C0B-contract-spec.md` (**C0B-v2**: §2 reconciliation, §4/§5 retention constants,
  §8 backup, §10 tooling, §11 gates, §12 change control, §15 minimum fixtures), `DECISIONS.md`
  Round 24, and the C1A record.
- Owned paths/modules: C1B assigns its own ownership from what C1A created (`app/`, `components/`,
  `lib/`, `tests/`); no domain state semantics from this contract may be reinvented in UI code.
- Dependencies that MUST land first: C0B and C1A accepted/merged (done); owner-scoped authorization
  for Supabase provisioning and installs; local/embedded test isolation and preview credential
  protection configured and verified (D103/D105; IR-10).
- Allowed implementation outcomes: single-owner GitHub OAuth with controlled bootstrap, immutable
  source revisions with coverage reporting, isolated franchises with Falcons default and custom
  players, grouped editable fields (unknown ≠ zero), the minimal planned-vs-recorded primitive,
  revision-safe autosave with unsaved-input protection, retry-safe idempotent mutations, and the
  versioned backup envelope with restore-new/ID remapping.
- Things NOT to change: no depth-chart/formation/transaction/gameday logic (C2–C5), no fake data, no
  schema semantics redefined in UI code; keep save/sync honesty wording intact.
- Verification and PR exit gate: real integration tests for unauthorized/cross-franchise access,
  source immutability, stale writes, failed saves, and backup/restore safety, plus typecheck/lint/
  test/build and desktop/phone inspection; owner merges ONE integrated C1B PR.
