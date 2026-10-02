# C0A-REVIEW — Independent review lane (independence satisfied by a separate thread; D108 reversed)

## Assignment header

```text
Checkpoint:                  C0A-REVIEW (independent review lane)
Workspace/worktree:          Freebuff-managed isolated worktree (repo-relative paths only)
Owned feature branch:        freebuff/execute-the-independent-review-for-c0a-according-t-57ec9ee2-a4fd-4897-badb-caebe699ce5a
Verified PR target:          main
Production deployment branch: main (docs-only delivery; nothing deployable)
Accepted merged base commit: 6351033 (PR #4; includes PRs #1–#3)
Predecessor PRs/records:     PR #1 evidence (merged), PR #2 spike (merged), PR #3 self-review (merged), PR #4 closure (merged)
Integration owner:           owner (primary writer owns DECISIONS/SPEC/PLAN/register)
Owned modules/paths:         docs/reviews/C0A-independent-review.md, docs/checkpoints/C0A-REVIEW.md
Other lane / shared contract: none active; C0B not started
Delivery mode:               separate owned report PR
PR merge order:              after owner review; no dependency on C0B
Dev/test environment:        n/a (docs-only)
```

## Status

- **State: closed — owner merged PR #5 (`main` @ `1627d96`, 2026-10-02) and recorded dispositions
  D112–D114: C0A accepted with exceptions (D113); special teams deferred to C3B with an explicit
  gate (D114).** The proposed D112 below was adopted and extended; see `DECISIONS.md` Round 23.
- **The owner reinstated the separately owned independent review for C0A, reversing the D108 waiver.**
  This lane supersedes the same-thread self-review merged as PR #3 (git history retains it). The
  decision-log correction is a primary-writer/owner action; proposed text in "Proposed D112" below.
- Independence basis: a separate execution thread in its own worktree that did not author the
  evidence register, the spike, or the Round 22 closure decisions (D101/WORKFLOW operational
  definition; not an external audit).
- Updated by: independent review thread.

## Scope and authority

- Read: `START_HERE.md`, `DECISIONS.md`, `SPEC.md`, `DESIGN.md`, `RESEARCH.md`, `PLAN.md`,
  `WORKFLOW.md`, `HANDOFF.md`, `phases/00-evidence.md`, `phases/00-independent-review.md`,
  `docs/evidence/C0A-source-evidence.md`, `spike/roster-source-probe.mjs`,
  `spike/coverage-report.md`, the prior review/records.
- Approved changes: the two owned files only.
- Explicit exclusions: no edits to `DECISIONS.md`, `SPEC.md`, `PLAN.md`, `START_HERE.md`, the
  register, or contracts; no code, installs, provisioning, production actions, or bulk scraping.
- Report integration mode: **separate owned report PR** (the C0A evidence PR is merged; integration
  is no longer possible).
- Findings are coordinated through the owner; proposed register/decision corrections are listed in
  the report for the primary writer.

## Findings summary

| ID | Severity | Issue | Disposition needed |
|---|---|---|---|
| IR-1 | important | C0A "closure" contradicts its own delivery record ("checkpoint not complete") and required outputs | **Done — D113 acceptance with exceptions; `C0A.md`/`START_HERE.md` refreshed** |
| IR-2 | important | Special-teams feasibility still lacks the required structured owner decision (D081) | **Done — D114: deferred to C3B with an explicit gate; no pre-approved skip** |
| IR-3 | important | "Full catalog" wording risks source-import vs game-catalog conflation | Relabel to "EA's full published Launch population" (primary writer) |
| IR-4 | important | EA ratings taxonomy still conflatable with depth-chart slots (prior R3) | C0B correction |
| IR-5 | important | Identity stability is sample-verified; endpoint/fetch fragility (prior R4) | C0B reconciliation + fetch-failure policy |
| IR-6 | suggestion | D110 "in every iteration" overstates what was measured | Wording precision (primary writer) |
| IR-7 | suggestion | Register `### 1a` heading glued to preceding paragraph | Mechanical newline fix (primary writer) |
| IR-8 | important | `START_HERE.md` says all checkpoints "not started" and docs "uncommitted" after four merged PRs | Owner/primary writer refreshes active status |
| IR-9 | important | Diagram orientation/slot mapping unverified (prior R7) | C3A evidence gate |
| IR-10 | important | Preview write isolation recorded (D103/D105) but unverified (prior R6) | Verify at C1B/C6A; do not treat as configured |
| IR-11 | important | Backup/recovery must be carried into the C0B contract (prior R8) | C0B envelope/recovery semantics + SETUP §8 reference |

Prior findings R1 and R2 are closed (D111 owner-accepted risk; Launch-iteration correction independently
re-confirmed); R5 closed as N/A per D110 with the IR-6 wording note. Full detail:
[docs/reviews/C0A-independent-review.md](../reviews/C0A-independent-review.md).

## Verification evidence

| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck/build/tests | n/a | not run | docs-only delivery; no application exists |
| Docs link/anchor check | fresh Node parser over repo Markdown, 2026-10-02 | pass — 26 files, 156 relative links, 15 anchors, 0 missing | anchor slug heuristics |
| EA source checks | site-context requests to the `_next/data` ratings route, 2026-10-02 | Launch 3,111; week-1 1,891; week-2 1,911; week-3 1,937; pages 16/32 confirm unsigned players | live source is mutable; `buildId` ephemeral |
| EA archetype UI checks | `player-ratings/jessie-bates-iii/13202`, `player-ratings/cam-heyward/10698` (Week 3), 2026-10-02 | row present / row absent as recorded | two profiles, not all 782 |
| Civil.GG checks | formations list + `plays/singleback/ace`, 2026-10-02 | 393 offense / 58 defense; exact alt text; 53 plays; 6-playbook cross-ref; public-bucket art; membership wording | imagery only, no structured labels |
| Application/browser/phone | n/a | not run | no app |

- Checks NOT run and why: all application checks; documentation/research review only.
- No secrets, private exports, or copyrighted payloads were committed.

## Dispositions (adopted — `DECISIONS.md` Round 23)

- D112 — independent review reinstated; the review's proposed corrections accepted (original text below,
  extended to cover the corrections).
- D113 — C0A accepted with exceptions; blocked/missing outputs tracked as an evidence supplement
  required before C3A/C3B.
- D114 — special-teams feasibility deferred to C3B with an explicit gate; no pre-approved skip.

Original proposed text (adopted and extended):

> D112 — Owner reinstates the separately owned independent review for C0A, superseding the D108 waiver.
> The review report and lane record are delivered as a separate PR; C0B requires the owner's recorded
> dispositions of the report's IR items and an explicit C0A acceptance-with-exceptions (or reopen)
> before its prerequisite is considered satisfied.

## Owner manual acceptance

1. Preconditions: `main` @ `1627d96` (PR #5 merged); read the report and `DECISIONS.md` Round 23.
2. Actions (already taken): IR-1/IR-2 answered and recorded as D113/D114; confirm the dispositions
   match your intent. IR-3–IR-11 corrections/gates are applied or assigned per D112.
3. Actual result: D112–D114 recorded; status docs refreshed; this lane closed as owner-accepted
   (2026-10-02).
4. Recovery/undo: docs only; close/revert the PR without effect on application state.
5. Known limitation: live source counts are dated 2026-10-02 and will drift; independence is
   separate-thread, not an external/human audit.

## Open items

- IR-1–IR-11 above (all remain open; none is a fabricated blocker).
- D108's waiver text still stands as the latest recorded decision until D112 lands — the reinstated
  review must be recorded rather than implied.
- C0A outputs still not produced (now candidates for explicit owner exception): depth-chart matrix,
  representative Falcons mappings, stock-book inventory, special-teams feasibility, alternate-source
  contingency.

## Next thread — pasteable launch

- Exact next checkpoint: **C0B** (contracts) — only after the owner's recorded dispositions above and
  a recorded C0A acceptance disposition (PLAN.md prerequisite: "C0A and independent review
  dispositions").
- Required merged baseline: PR #5 merged plus the disposition update (D112–D114) merged; verify `main`.
- Files/docs to read first: `phases/00-evidence.md` (C0B), this record, the review report,
  `docs/evidence/C0A-source-evidence.md`, `DECISIONS.md` (Rounds 22–23).
- Owned paths/modules: one contract/ADR + scenario matrix (single writer).
- Dependencies that MUST land first: D112–D114 recorded (done in the disposition update); C0A accepted
  with exceptions (D113). The accepted-exception evidence supplement is required before C3A/C3B.
- Allowed implementation outcomes: one concise contract set; no application code.
- Things NOT to change: no rival schema, no app scaffold, no scope expansion.
- Verification and PR exit gate: docs consistency/links; owner review.
