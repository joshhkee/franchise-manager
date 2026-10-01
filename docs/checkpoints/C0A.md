# C0A — Source/Mechanics Evidence (initial register)

## Status
- State: **in progress — initial evidence register; checkpoint not complete.** Open gates listed below.
- Updated by: execution thread (fresh build)
- Workspace root: this worktree (repo-relative paths only)
- Feature branch: `checkpoint/c0a-evidence`
- Verified PR target: `main`
- Started from merged base commit: `d4cf2fd`
- Current commit / PR URL (if known): see PR opened against `main`
- Remote mergeability/check state: docs-only; application checks N/A
- Owner merge confirmed? No
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
- Other active lane / delivery mode / merge order: none; the approved independent review lane has not
  started and requires the shared baseline to land first.

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
5. Known limitation: reuse/licensing is unresolved; several outputs remain blocked on Madden 27 access.

## Open items (blockers)
- **Reuse:** Civil.GG content/art licensing unconfirmed — blocks the C0B source schema and C3A/C3B art.
- **Madden 27 access:** owner has none, so the depth-chart/specialist matrix and special-teams
  feasibility are **blocked** pending gameplay or authoritative evidence.
- **Player dataset:** EA page exposes "1,911 results"; full schema/IDs/coverage unverified.
- Remaining C0A outputs not yet produced: Madden 27 depth-chart matrix, representative Falcons
  offense/defense mapping evidence, stock/alternate playbook inventory, special-teams feasibility.

## Next thread — pasteable launch
- Exact next checkpoint: continue **C0A** (evidence) to close the remaining outputs, or start the
  approved independent review lane once this baseline lands.
- Required merged baseline: this PR merged into `main`.
- Files/docs to read first: `START_HERE.md`, `phases/00-evidence.md`, `docs/evidence/C0A-source-evidence.md`.
- Owned paths/modules: `docs/`; `DECISIONS.md`/`RESEARCH.md` are single-writer.
- Dependencies that MUST land first: none beyond this baseline.
- Allowed implementation outcomes: evidence/coverage documentation only.
- Things NOT to change: no app code, no provisioning, no scope changes.
- Verification and PR exit gate: docs consistency/links; owner review.
