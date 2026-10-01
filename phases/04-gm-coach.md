# Phase 4 — GM War Room and Coach View

## Read first

[START_HERE.md](../START_HERE.md), [DECISIONS.md](../DECISIONS.md), [SPEC.md](../SPEC.md), [DESIGN.md](../DESIGN.md), [PLAN.md](../PLAN.md), [WORKFLOW.md](../WORKFLOW.md), [HANDOFF.md](../HANDOFF.md), accepted C2/C3 domain and coverage records.

## Mission / preconditions

Build useful low-maintenance team planning, not a cap/trade simulator. C4A depends on accepted C3A, NOT completion of C3B; C4B depends on accepted C4A and stable selected-book catalog. C3B can run independently with frozen contracts/exclusive ownership, remains visible and is required by C6A or owner-approved exception. PLAN.md's dependency table is authoritative.

## C4A — assets, roster moves, contract ledger

- Roster displays known contract years/cap hit and coverage. Unknown is not zero; real NFL estimates are not Madden facts.
- Optional owner-entered cap/available-cap summary, visible years-remaining threshold/notes. No dead-cap forecasts, extension generator, annual rollover, or calendar/season requirements.
- Manually entered pick assets: explicit year, round, original club, current owner, optional note. Unentered picks are unknown, not available by assumption.
- Owner enters hypothetical deals; choose players/picks and preview roster/asset impact. No generated packages or acceptance predictions.
- Planned incoming/outgoing ownership and lineup dependencies modeled; game confirmation updates baseline only when owner attests the deal occurred. Saving an app proposal is not this game-completion confirmation. Lost-response retry never applies the same deal twice; ownership/asset changes validate and commit atomically.
- Sign/cut/practice-squad moves are useful SECONDARY actions. Enforce identity/ownership/duplicate consistency and verified game limits; uncertain eligibility disclosed.
- Removing a player previews affected depth chart/overrides; flag conflicts with repair options, not silent substitution.
- Record already-completed deals distinctly from planned deals; preserve unrelated pending work. Integrate real transaction prerequisites with C2/C3 fixtures and extend backup round-trip for assets/proposals/contracts/roster changes.

Test: unavailable/traded-away assets, duplicate picks/players, concurrent proposals consuming same asset, multi-player deal, same-team invalid exchange, incoming player prerequisite, cancelling trade with dependent lineup plan, zero vs unknown money, manual pick years, source/franchise isolation, stale confirmations, policy denial.

Exit: owner can log a real trade and inspect correct roster/asset/checklist consequences, without an invented trade engine.

## C4B — scouting, explained suggestions, Coach

- Independent scheme and playbook selection; seed verified Falcons scheme defaults only, otherwise ask/unknown.
- Verified game scheme/archetype match clearly distinct from researched practical role suitability. Record rubric/version/inputs/reasons; no official-looking invented OVR/fit percentage.
- Name/team/position/age/available-attribute filters, side-by-side comparison, missing-data labels and editable owner data.
- Trade Block: positional surplus/poor-fit candidates with explanations; formation needs and good-player exceptions considered. User judgment wins.
- Trade Targets: other-team scheme fits or position-relative athletic anomalies using visible threshold/peer/sample policy. Missing metrics not scored as zero; insufficient samples produce uncertainty.
- Pin/dismiss/notes; dismissed stays dismissed until owner restores. No repeated unsolicited resurrection.
- Coach tabs: Scheme & Playbook, Personnel Gaps, Formation Identity; link to authoritative lineup/GM/gameday editors rather than clone them.
- Favorites/look families share formation IDs with Phase 3/5; no independent incompatible collections. Scheme changes recompute fit without resetting personnel. Extend export/restore to shortlist/notes/dismissals/formation identity.
- Years-remaining extension threshold and athletic peer/threshold/sample policy are visible exact values with boundary fixtures; don't call unspecified 'near expiry' or 'athletic' a completed rule.

Test/review: known archetype match vs practical mismatch, small sample/missing metric outliers, overweighted OVR, custom rookies, formation-specific surplus vs simple headcount, pins/dismissals/notes persistence, scheme change, cross-franchise suggestions.

Exit: owner reviews representative Block/Targets/fit examples and understands each reason. No fabricated inputs, forced trade advice, or untraceable ranking.

## Parallel boundaries

A owns transactions/assets/policies/migrations; B owns assigned UI/read models against frozen interfaces. C4B waits for accepted C4A by default; fixture-driven parallel work must declare its base and ONE integrated checkpoint delivery, not claim independent C4B readiness on an unmerged C4A. Shared changes go through one schema/contract writer. Exclusive paths, delivery mode and PR order explicit.

## Non-goals

Exact deals generated by app, acceptance prediction, cap/dead-money simulator, development/XP simulation, detailed league audit, public sharing, season/week tracking.

## Delivery / launch

Owned checkpoints, passing tests/type/build/browser checks, owner scenarios, rubric/provenance links, migration state, commit/push/mergeable PR and next-thread record. Owner merges.

Use canonical [C4A](../LAUNCH_PROMPTS.md#c4a--roster-contract-ledger-and-manual-trade-assets) or [C4B](../LAUNCH_PROMPTS.md#c4b--explained-scouting-and-coach-view) with assignment header/shared instruction. PLAN.md and WORKFLOW.md govern accepted prerequisites/delivery.
