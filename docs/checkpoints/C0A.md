# C0A — Source/Mechanics Evidence (initial register)

## Status
- State: **closed — owner accepted with exceptions (D113); independent review delivered and dispositions recorded (D112–D114).** Accepted exceptions listed below.
- Updated by: execution thread (fresh build)
- Workspace root: this worktree (repo-relative paths only)
- Feature branch: `checkpoint/c0a-evidence`
- Verified PR target: `main`
- Started from merged base commit: `d4cf2fd`
- Current commit / PR URL (if known): PRs #1–#4 merged; independent review PR #5 merged (`main` @ `1627d96`); this disposition update follows.
- Remote mergeability/check state: docs-only; application checks N/A
- Owner merge confirmed? Yes — C0A evidence merged; C0A accepted with exceptions (D113).
- Production deploy status: not applicable
- Production migration status: not applicable (during builds)

## Scope and authority
- Read decisions/spec/phase packet versions: `START_HERE.md`, `phases/00-evidence.md`, `PLAN.md`,
  `DECISIONS.md`, `RESEARCH.md`, `WORKFLOW.md`, `HANDOFF.md`.
- Approved changes: initial source/mechanics evidence register; confirmed execution setup facts;
  one-Supabase-project environment decision; branch/push/PR policy.
- Explicit exclusions: no application code, no provisioning, no installs, no migrations.
- File/module ownership and integration owner: single docs lane, no parallel lane active.
- Shared contract version: n/a (C0B owns contracts).
- Other active lane / delivery mode / merge order: independent review lane executed in its own
  worktree and merged as PR #5; dispositions D112–D114 recorded. No other active lane; C0B not started.

## Implemented
- Evidence register: [docs/evidence/C0A-source-evidence.md](../evidence/C0A-source-evidence.md).
- Confirmed setup/environment facts and the single-project decision in `DECISIONS.md` (Round 21).
- SETUP.md note documenting the approved single-project deviation.

## Verification evidence
| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Docs consistency | manual review | pass | links/facts only |
| Application typecheck/build/tests | n/a | not run | docs-only delivery |
| Source observation | browser inspection of civil.gg + EA ratings, 2026-10-02 | recorded | JS-rendered; counts/fields unverified |

- Checks NOT run and why: application type/build/tests; no application exists yet.
- Actual-device owner test still needed: n/a for this checkpoint.

## Owner manual acceptance
1. Preconditions: read the evidence register.
2. Actions: open the Civil.GG Madden 27 formations page and a formation detail page.
3. Expected result: counts, formation names, and the "depth-chart positions" alignment image match
   the register.
4. Recovery/undo: none needed (docs).
5. Known limitation: the accepted exceptions remain outstanding and are due before C3A/C3B (D113);
   special teams are deferred with a gate (D114).

## Implemented (continued)
- Player source feasibility **resolved**: the Launch iteration yields all 3,111 records with no
  duplicate ids, team/position objects, archetype/field coverage, and the full attribute stats
  (see evidence §1b).
- Owner authorizations recorded: D106 (Civil.GG public play/art reuse) and D107 (auto-generated
  provisional depth-chart baseline).

## Accepted exceptions and open items (D113/D114)
- **Accepted exceptions, tracked as a C0A evidence supplement required before C3A/C3B:** Madden 27
  depth-chart matrix; representative Falcons offense/defense slot-mapping evidence; stock team/alternate
  playbook coverage inventory; Civil.GG alternate-source contingency report.
- **Deferred to C3B with an explicit gate (D114):** special-teams feasibility; C3B must attempt it and
  ask the owner before any skip (D081 in force, no pre-approved skip). Madden 27 access is still absent,
  so the depth-chart/specialist matrix remains blocked pending gameplay or authoritative evidence; D107
  mitigates with a clearly provisional baseline.
- **Resolved after this record:** free-agent presence (1,240 unsigned players at Launch) and the ~3,116
  discrepancy (Launch = 3,111, D109); EA still exposes no contract/salary fields.

## Next thread — pasteable launch
- Exact next checkpoint: **C0B** (contracts) using the canonical launch prompt.
- Required merged baseline: `main` with PRs #1–#5 plus this disposition update merged; verify the
  merge commit before starting.
- Files/docs to read first: `START_HERE.md`, `phases/00-evidence.md` (C0B), this record, the
  independent review report, `docs/evidence/C0A-source-evidence.md`, `DECISIONS.md` (Rounds 22–23).
- Owned paths/modules: one contract/ADR + scenario matrix (single writer).
- Dependencies that MUST land first: D112–D114 recorded (this update); C0A accepted with exceptions
  (D113) as the recorded prerequisite. The accepted-exception evidence supplement is required before
  C3A/C3B, not before C0B.
- Allowed implementation outcomes: one concise contract set; no application code.
- Things NOT to change: no rival schema, no app scaffold, no scope changes.
- Verification and PR exit gate: docs consistency/links; owner review.
