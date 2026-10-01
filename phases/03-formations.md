# Phase 3 — Verified Formation Substitutions

## Read first

[START_HERE.md](../START_HERE.md), [DECISIONS.md](../DECISIONS.md), [SPEC.md](../SPEC.md), [DESIGN.md](../DESIGN.md), [RESEARCH.md](../RESEARCH.md), [PLAN.md](../PLAN.md), [WORKFLOW.md](../WORKFLOW.md), accepted C0/C2 delivery records.

## Preconditions / mission

Depth-chart plan, confirmed baseline, revision-safe checklist and core source/franchise isolation are accepted and merged. Verify exact source/playbook mappings and rights from C0; do not import a generic football diagram and call it Madden 27.

## C3A — Falcons offense and defense

- Verified formation IDs/book variants, coordinates/labels, personnel slots, role→depth-chart rank precedence. A formation name alone is not mapping identity.
- **Offense O-line at TOP; defense D-line at BOTTOM.** Verify source left/right conventions; no automatic generic flipping.
- Names/numbers/OVR accessible: surname-emphasis default, optional number circles when crowded, hover AND click/tap/keyboard full detail, accessible personnel list.
- Show inherited role/rank, explicit override, conflict/unresolved status. Existing manual overrides survive chart changes; inherited slots recompute.
- No player appears twice in the eleven on-field slots. Missing ranks/uncertain mappings stay unresolved with offered fixes, not fabricated starters.
- Departed/ineligible override target is visible conflict. Do not silently replace a deliberate override.
- Reset scope explicit for slot/formation; broader reset requires review/confirmation.
- Explicit override set/reset changes produce actionable checklist differences and retain prerequisites. Inherited player changes solely due to a chart edit create NO redundant formation-sub instruction. Same-player override-vs-inheritance equality does not erase override persistence intent.
- Switching book A→B→A retains book-scoped overrides/favorites/plans; never transplant a same-name formation. Distinguish franchise game configuration from a browsing filter and verified actionable configuration changes. Extend backup round-trip for formation state.
- Favorite formation support shared with Coach/Gameday via stable IDs, not isolated duplicate collections.

Required fixtures:
- WR/specialist, rush-edge/interior, sub-linebacker/slot-corner/NT inheritance only where source verifies it; WR3 is not universally SLWR1.
- Book/package-specific role differences despite shared formation name.
- Depth-chart change with/without override, same-player explicit set/reset, duplicate collision, missing rank, cross-franchise/practice-squad/departed target, pending incoming player dependency fixtures. 'Gameday inactive' tracking remains out of scope.
- Correct planned vs confirmed rendered details after partial confirmation/undo.
- Compact markers with long names and source unknown jersey/OVR; never fill missing values with invented data.

Exit: every supported Falcons formation mapping has evidence and fixtures; rendered desktop/phone diagrams reviewed and correct opposite orientations confirmed explicitly.

## C3B — stock coverage / special teams

- Inventory all stock team and alternate playbooks and track verified/partial/unsupported status. Do not count an unverified copied mapping as complete.
- Expand validated mappings efficiently with provenance, equivalent-formation deduplication only where justified.
- Include special-teams diagrams if data/mappings are verified feasible. If not, report precise blocker and obtain OWNER approval before skipping. Keep K/P/LS/return specialists regardless.
- Source play art where reuse permitted; approved text/personnel fallback with disclosed gaps. Do not invent routes or assume custom-book support.
- Catalog size/performance measured; source/version import reports reproducible.

Exit: complete inventory reconciles coverage. Reduced all-book scope needs explicit owner approval. No silent gaps, false parity, or unsupported art copying.

## Parallel boundaries

A owns resolver/mapping contracts and migrations; B owns assigned UI or exclusive data batches. Use ONE integrated PR for a split C3A feature; one catalog index writer, reviewed batch provenance. C3B and C4A may use independent PRs after accepted C3A if contracts/paths are frozen (PLAN.md dependency table). C3B remains required at C6A absent a recorded owner-approved exception; all-book work is not a hidden blocker on starting GM.

## Non-goals

Custom playbook assembly, dynamic route reconstruction, automatic game subs, fatigue/injury simulation, generalizing unverified packages across all books.

## Delivery / launch

Checkpoint record includes source/license status, covered formation/book IDs, unresolved slots, special-teams status, screenshots/orientation checks, tests, and next-phase interfaces. Commit/push/mergeable PR; owner merges.

Use canonical [C3A](../LAUNCH_PROMPTS.md#c3a--falcons-formation-diagrams-and-subs) or [C3B](../LAUNCH_PROMPTS.md#c3b--stock-book-coverage-and-special-teams) with assignment header/shared instruction. PLAN.md and WORKFLOW.md govern dependencies/delivery.
