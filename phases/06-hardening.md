# Phase 6 — Integrated Release and Recovery

## Read first

[START_HERE.md](../START_HERE.md), [DECISIONS.md](../DECISIONS.md), [SPEC.md](../SPEC.md), [DESIGN.md](../DESIGN.md), [RESEARCH.md](../RESEARCH.md), [PLAN.md](../PLAN.md), [SETUP.md](../SETUP.md), [WORKFLOW.md](../WORKFLOW.md), all accepted checkpoint records and source coverage inventories.

## Mission / preconditions

Prove the integrated product is useful, private, recoverable, and honest about supported game behavior. All PLAN.md dependencies including C3B merged or individually owner-approved exceptions explicitly recorded. Do not certify an incomplete catalog/theme set as full support. C6 verifies accumulated feature acceptance/backup extensions, not first-time integration deferred from earlier checkpoints.

## C6A — release evidence

### End-to-end acceptance

1. Owner OAuth login; unauthorized/direct API/data attempts denied.
2. Create Falcons and second-club franchises from selected source snapshot; no leakage between them.
3. Inspect source revision/provisional chart/unverified game status; edit player facts/custom rookie without touching source.
4. Plan rank changes and persistent formation override; check offense/defense orientation and compact details.
5. Create owner-entered trade using actual manual pick/player assets; plan incoming lineup; block confirmation before prerequisite.
6. Confirm trade then dependent actions, partially apply another group, cancel/revert, and undo safely.
7. Record already-happened correction amid pending work; preserve unrelated plans and show conflicts.
8. Scout/compare, inspect game-fit vs practical fit and athletic reasons, pin/dismiss/notes.
9. Build/edit gameday theme, change situation, refresh compatible menus with pinned choices; no displayed→used assumption.
10. Export/restore into new franchise; corrupt/version-mismatched/cross-franchise references fail safely.
11. Test network failure, unsaved navigation/franchise switch/session expiry, two-device stale writes/confirmations and lost-response retry without duplicate transactions/restores.
12. Switch playbook A→B→A and scheme independently; retained overrides/favorites/plans do not leak across same-named mappings; inherited personnel changes don't create redundant sub tasks.
13. Review theme coverage/bucket boundaries, incompatible and >3 pins, refresh exhaustion, displayed-history reset and labeled gameday roster view with pending acquisitions.

### Browser/design/accessibility

- Light/dark, readable neutral professional styling, correct team accent, no ornamental filler.
- Desktop Chromium and owner Helium where feasible; iOS Safari actual-device owner acceptance plus emulated narrow/short/landscape checks.
- Keyboard/visible focus/dialog focus return, non-color-only status, usable touch targets, no essential horizontal scrolling/hover-only details.
- Long names, missing values, empty/conflicted/unresolved diagrams, small height, 200% zoom, many catalog entries.
- Gameday sticky controls never obscure most of screen; details preserve chosen context.

### Performance and scale

- Run actual representative complete-as-reported player/book/template datasets, not tiny fixtures only.
- Measure queries/payloads/page loads/menu interaction in documented environment. No whole catalog fetch needed for a single phone call sheet.
- Track permitted artwork sizes/cache and free-tier storage/egress, indices/pagination/search, concurrent preview/test isolation.
- Review DESIGN.md's proposed web-vitals/menu targets and document measurements/limits; never promise guaranteed warm free hosting after pauses.

### Security and operations

- Policy/allowlist integration tests, source/franchise isolation, stable identity, unauthorized export/restore/update attempts.
- No privileged keys in client bundles/logs/export/repo. Secrets/environment examples safe.
- Dev vs prod deployment env verified; production migrations not automatic during builds. No unauthorized external actions.
- Backup/export/rebuild/exact-source-revision recovery and inactivity resume instructions tested/documented; owner responsibilities clear. Use isolated dev recovery drills and owner walkthrough, not a destructive real production pause/reset. Backup round-trip includes every implemented persisted feature, remaps mutable IDs, excludes secrets/ephemeral menu memory and fails atomically.
- Actual named applied migrations/compatibility recorded, no repeat-blind instructions.
- Stock-book/special-team/art/template coverage and owner-approved exclusions reconciled in release limitations.

## Exit

No unresolved critical failures, all relevant type/build/unit/integration/browser checks actually run or noncritical exceptions explicitly owner-accepted, owner manual acceptance completed (actual iOS Safari or explicitly pending owner-approved interim limitation), release PR conflict-free with required checks passed. Acceptance/readiness and remote mergeability are separate facts. State app deployment and production migration separately; owner merges.

A critical unresolved auth/data-loss/confirmation corruption issue blocks release. An inaccessible source or unverified game rule is a coverage limitation/owner decision, not an excuse for fabrication.

## Parallel boundaries

One release integrator owns fixes touching shared contracts/migrations. Second reviewer tests independently and reports reproducible bugs, or owns exclusively assigned UI fixes. Do not run two destructive DB test suites against the same data. No scope expansion during hardening; new ambitions go to the backlog.

## Delivery / launch

Final checkpoint record includes integrated scenario results, tests/commands, actual-device results, coverage/limitations, deployment/migration state, backup/recovery instructions, remaining noncritical backlog and next maintenance path. Owned commit/push/mergeable PR only; no agent merge.

Use canonical [C6A](../LAUNCH_PROMPTS.md#c6a--integrated-release-verification) with assignment header/shared instruction. PLAN.md release dependencies and ACCEPTANCE.md determine readiness; partial lane status is not a release claim.
