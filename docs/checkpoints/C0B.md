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

- **State: contract and this record delivered on the owned branch; PR opened against `main` (URL and
  check state in the PR metadata). Lane ready for owner review — not owner-accepted.**
- Updated by: C0B execution thread (contract writer).
- Contract version: `C0B-v1`, frozen for C1B–C4A; later extensions amend it per §12.
- Owner merge confirmed? No. Production deployment/migration: not applicable.

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
3. Expected result: owner either merges or requests amendments (contract version bump per §12).
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

- Exact next checkpoint: **C1A** (responsive shell, owner visual gate) using the canonical launch
  prompt after this PR merges or is explicitly accepted.
- Required merged baseline: `main` with this C0B PR merged; verify the merge commit before starting.
- Files/docs to read first: `START_HERE.md`, `phases/01-foundation.md`, `phases/00-evidence.md`
  (contracts), this record, `docs/contracts/C0B-contract-spec.md` (§10 tooling/test constraints,
  §12 change control), `DECISIONS.md` (Rounds 20–23).
- Owned paths/modules: shell/foundation paths determined by the thread before edits, then confirmed;
  no domain state semantics from this contract may be reinvented in UI code.
- Dependencies that MUST land first: C0B merged/owner-accepted (this PR). C1B additionally waits for
  C1A visual acceptance.
- Allowed implementation outcomes: Next.js/Tailwind shell, navigation per DESIGN.md, honest
  empty/loading/error states, check scripts and measurable accessibility criteria; no domain guesses.
- Things NOT to change: no domain calculations, fake statistics, schema decisions, or scope
  expansion; prototype save controls stay explicitly "not connected".
- Verification and PR exit gate: type/build/accessibility/browser checks at documented sizes, owner
  visual review before feature expansion.
