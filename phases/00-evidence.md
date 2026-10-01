# Phase 0 — Evidence and Contract Readiness

## Read first

[START_HERE.md](../START_HERE.md), [DECISIONS.md](../DECISIONS.md), [SPEC.md](../SPEC.md), [RESEARCH.md](../RESEARCH.md), [PLAN.md](../PLAN.md), [WORKFLOW.md](../WORKFLOW.md), [HANDOFF.md](../HANDOFF.md).

## Mission

Turn the fresh-build brief into verified data/mechanics inputs and frozen initial contracts. No feature work may pretend that owner recollections or approximate dataset/test counts are existing assets.

## Checkpoint C0A — evidence

Owned work: research/provenance/coverage documentation and explicitly permitted source inspection. Acquire/version source data only after permitted access and owner task authorization are established; do not commit copyrighted art or bulk payloads just because they are visible online.

Required outputs:
- Player-source schema/coverage/IDs report: free agents, available ratings/measurements/numbers/archetypes, missing fields, reproducible permitted import strategy. Reconcile ~3,116 vs EA's fetched 1,911 displayed results without assuming either is complete. Distinguish full import of a source from full coverage of the game catalog; known omissions require owner disposition before a complete-catalog claim.
- Madden 27 depth-chart matrix: exact labels/order, rank limits, allowed positions, specialist precedence, active/practice-squad behavior, sources/platform/version/confidence. Owner candidate list lives in DECISIONS.md.
- Falcons offense/defense inventory and representative example slot-mapping evidence sufficient to validate the acquisition/resolver strategy: labels/coordinates/role/rank/precedence and left/right orientation. Offense line top, defense line bottom. Exhaustive supported Falcons mappings are a C3A gate, not an attempt to do all C3 work before the shell.
- Stock team and alternate playbook coverage inventory; distinguish duplicate formation names from truly equivalent personnel mappings.
- Civil.gg access/reuse and alternate-source contingency report. No bypassing access restrictions or asserting license from public availability.
- Special-teams feasibility report. If not feasible, structured owner question before skipping. Custom books not required.
- Separate official facts, credible observed demonstrations, older-game context, and unresolved hypotheses. No arbitrary trait/fit/playcall formulas yet.
- Tool/remote/account/free-slot inventory with no secret output.

Exit: documented feasible initial sources/mappings or explicit owner-approved change. Blockers remain blockers, not fictional completeness. Documentation PR can be opened without application typecheck, but links/facts/consistency must be reviewed; say no code checks applicable.

## Checkpoint C0B — contracts

Depends on accepted C0A. Own the single shared contract specification and engineering ADR; a reviewer can assess it read-only.

Specify:
- Immutable versioned source identities vs isolated franchise custom players/state.
- Confirmed baseline vs working plan; provisional charts if actual ranks absent; planned vs already-happened intent.
- Semantic diffs and executable action units (whole ordered position list by default), final-action consolidation, prerequisite ordering, atomic reviewed bulk scope, stale-confirmation rejection, partial apply between valid units, cancel, bounded undo and conflicts. Inherited formation display changes must not create redundant sub tasks; same-player override set/reset intent still matters.
- Retry/idempotency and unsaved-input navigation/session-expiry contract, plus C1B's minimal player planned-vs-recorded primitive. No generic dependency scheduler or full event-sourcing platform.
- Transaction assets/pick identities and hypothetical roster effect; no generated trades.
- Formation inheritance/override/resolution result shapes including visible unresolved/invalid states, no silent repair.
- API/read-model boundaries for UI fixtures; persistence policy/migration ownership; chosen package/test tooling and test strategy.
- Source/schema revision and incremental backup-envelope migration policy, mutable-ID remapping, atomic restore and exact source-revision recovery. Each feature extends round-trip coverage rather than leaving new state unbacked-up until release.

Create a scenario matrix covering A→B→C/revert, valid ordered-list partial/bulk units, trade→promotion/lineup prerequisite, depart→override conflict, primary+specialist reuse vs duplicate formation, inherited vs explicit-override action diffs, recording reality amid a pending plan, stale write/confirmation and lost-response retries, export round-trip/missing source revisions, and unauthorized/cross-franchise references. C0B is documentation/contracts; execution tests arrive at the owning code checkpoint.

Do not arbitrarily promise proprietary OVR formulas, exact game parity, all-book coverage, or supported custom-book subs. Material unknowns become owner questions or evidence gates.

## Parallel safety

Approved initial pairing is source/mechanics researcher plus independent reviewer, with exclusive output files and one integrator. Alternate research splits require an explicit assignment change. No rival schema docs/code scaffolds. Use WORKFLOW.md's optional early docs baseline or explicit shared committed base; do not require an extra publication PR if C0A can safely publish the baseline itself.

## Delivery

Use HANDOFF.md, scoped documentation commit/push/PR, owner merge. Leave a concise C1A/C1B readiness record listing source/license blockers, actual tool/branch state, and approved contracts. Do not provision cloud resources or install tools without scoped authorization.

## Launch

Use the canonical [C0A](../LAUNCH_PROMPTS.md#c0a--sourcemechanics-evidence) or [C0B](../LAUNCH_PROMPTS.md#c0b--initial-contractfixture-specification) launch, assignment header and shared instruction. PLAN.md's dependency table and WORKFLOW.md delivery mode govern prerequisites; do not maintain a second launch policy here.
