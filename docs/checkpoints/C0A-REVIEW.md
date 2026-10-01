# C0A-REVIEW — Independent review lane (self-review, independence limited)

## Assignment header

```text
Checkpoint:                  C0A-REVIEW
Workspace/worktree:          freebuff worktree (repo-relative paths only)
Owned feature branch:        review/c0a-independent
Verified PR target:          main
Production deploy branch:    main
Accepted merged base commit: a364dda (PR #1 merged)
Predecessor PRs/records:     PR #1 (C0A evidence), PR #2 (spike, UNMERGED)
Integration owner:           owner (primary writer owns DECISIONS/SPEC/PLAN)
Owned modules/paths:         docs/reviews/C0A-independent-review.md, docs/checkpoints/C0A-REVIEW.md
Other lane / contract:       PR #2 spike/roster-import (unmerged dependency, disclosed)
Delivery mode:               separate owned report PR
PR merge order:              after owner review; no dependency on PR #2 merging
Dev/test environment:        n/a (docs-only)
```

## Status

- State: **closed.** Review revised after owner feedback: R1 accepted, R2 retracted as a week-2 artifact,
  R4 reduced, R5 accepted as N/A (D110).
- **Owner waived the separate independent-review thread for C0A (D108).** The independence limitation is
  recorded rather than hidden; the interim review model is same-thread self-review per checkpoint.
- Updated by: same agent as the primary evidence register — **independence caveat applies**; see the
  report's disclosure section. D101's separate-thread intent is not satisfied by this delivery.

## Scope and authority

- Read: `START_HERE.md`, `DECISIONS.md`, `SPEC.md`, `DESIGN.md`, `RESEARCH.md`, `PLAN.md`,
  `WORKFLOW.md`, `phases/00-evidence.md`, `phases/00-independent-review.md`, merged C0A register.
- Approved changes: a review report and this record only.
- Explicit exclusions: no edits to `DECISIONS.md`, `SPEC.md`, `PLAN.md`, shared evidence, or contracts;
  no code, installs, provisioning, or bulk scraping.
- Report integration mode: separate owned PR.

## Findings summary

| ID | Severity | Issue | Disposition needed |
|---|---|---|---|
| R1 | ~~blocker~~ resolved | Source rights for Civil.GG art/data and EA ratings data | Owner **accepted** (personal/non-commercial; attribution + reference-by-URL constraint) |
| R2 | ~~blocker~~ resolved | "Zero free agents" was a week-2 artifact; Launch iteration has 1,240 unsigned players | Baseline must be the Launch iteration |
| R3 | important | EA ratings positions conflated with Madden 27 depth-chart slots | Correction in C0B |
| R4 | important (reduced) | Player ids confirmed stable 200/200 across iterations; buildId/endpoint fragility remains | C0B source-pinning + retry policy |
| R5 | important | 25% missing archetypes (782/3,111); Cam Heyward named as the counterexample | Owner confirmation, then C0B policy |
| R6 | important | One production DB + previews on = preview write hazard | Vercel Preview scope config |
| R7 | important | Diagram orientation / slot mapping unverified | In-game evidence before C3A |
| R8 | important | No automatic backups / inactivity pausing under-stated | Carry recovery into C0B |

Full detail and proposed corrections: [docs/reviews/C0A-independent-review.md](../reviews/C0A-independent-review.md).

## Verification evidence

| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck/build/tests | n/a | not run | docs-only delivery |
| Evidence cross-check | manual against merged C0A register + PR #2 probe | pass | probe PR unmerged |
| Links/paths | manual | pass | — |

- Checks NOT run and why: application checks; no application exists.

## Owner manual acceptance

1. Preconditions: PR #1 merged; optionally apply PR #2 to see the probe evidence.
2. Actions: read the review report; decide R1 and R2 explicitly.
3. Expected result: owner either records decisions/corrections or waives.
4. Recovery/undo: docs only.
5. Known limitation: this review is not independent of the primary author.

## Open items

- **Open:** R5 — owner confirmation on the 782 null-archetype records (example: Cam Heyward).
- **Resolved:** R1 (owner accepted risk, attribution + reference-by-URL constraint) and R2 (Launch
  iteration carries 1,240 free agents).
- Still-open C0A outputs: Madden 27 depth-chart matrix, representative Falcons mappings, stock-book
  inventory, special-teams feasibility.
- Independence: **owner waived** the separate reviewer for C0A (D108), recorded here and in DECISIONS.md.

## Next thread — pasteable launch

- Exact next checkpoint: **C0B** (contracts) once R1/R2 are dispositioned and independence is either
  satisfied or waived.
- Required merged baseline: PR #1 (merged); incorporate the spike findings (PR #2).
- Files/docs to read first: `phases/00-evidence.md` (C0B), this record, the review report,
  `docs/evidence/C0A-source-evidence.md`.
- Owned paths/modules: contract/ADR + scenario matrix (single writer).
- Dependencies that MUST land first: owner dispositions on R1 and R2.
- Allowed implementation outcomes: one concise contract set; no application code.
- Things NOT to change: no rival schema, no app scaffold, no scope expansion.
- Verification and PR exit gate: docs consistency; owner review.
