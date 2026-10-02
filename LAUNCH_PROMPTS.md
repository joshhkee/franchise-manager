# Copy/Paste Checkpoint Launches

## Before copying any prompt

- Use a NEW execution thread in its OWN approved worktree/feature branch. This planning thread remains planning-only.
- Fill the assignment header below. Do not invent accepted base commits, module ownership, PR targets, or predecessor merge status.
- PLAN.md's dependency table and WORKFLOW.md's delivery modes govern prerequisites/parallel delivery. The active phase packet plus accepted records carry feature detail; short prompts do not replace them. Use this catalog as the canonical launch source rather than maintain competing launch policies in each packet.
- Stop after each integrated checkpoint PR for owner review/merge. Starting a dependent checkpoint requires the accepted prerequisites in PLAN.md, not 'the previous agent said done'. Independent C3B/C4A work may overlap as approved; partial backend/UI lanes follow the declared integrated delivery mode.
- This catalog was written before execution began. For current checkpoint status, read START_HERE.md's active-execution section — it is authoritative over this document's historical wording.

## Required assignment header

```text
Checkpoint:
Workspace/worktree:
Owned feature branch:
Verified PR target:
Production deployment branch (may differ):
Accepted merged base commit:
Predecessor PRs and delivery records:
Integration owner:
Owned modules/paths (or 'determine before edits, then confirm'):
Other lane assignment and shared contract version:
Delivery mode (independent checkpoints / one integrated checkpoint):
PR merge order:
Dev/test environment identity (no secrets):
```

Append this shared instruction to EVERY launch:

> Read START_HERE.md, the authority/dependency rules, relevant confirmed decisions/spec/design/research, active phase packet and accepted predecessor records. Inspect workspace root, branch/status/remote/worktrees and existing edits first; don't stage/overwrite others' work. Declare ownership/delivery mode and ask on material deviations. Never invent game facts/permissions. For code run relevant type/build/tests, DB-security/integration where affected, and desktop/mobile checks when UI changes; docs-only checks are consistency/evidence/links with application checks N/A. Extend backup/state/integration tests for each new persisted feature, not only at release. Use one concise HANDOFF.md-format checkpoint record plus a PR linking it, with sources/coverage, limitations, actual migrations/deployment and next prerequisites. Partial lanes deliver owned integration inputs under WORKFLOW.md; only integrated checkpoints claim owner-facing completion. Commit only owned changes, push the owned branch, open/verify the intended PR and report conflict/check readiness honestly, then stop for owner primary review/merge. No self-merge, force-push, unauthorized install/provision, production tests or production migrations during builds. End every delivery — and every independent-review report and lane record — with the concise **Next steps** block defined in HANDOFF.md/WORKFLOW.md Step 6 (D118): the ordered next actions, their owners, and explicit owner approvals/checks, with one immediate next step.

## C0A — source/mechanics evidence

> Execute C0A only using phases/00-evidence.md. This is a fresh Madden 27 build, not an existing app with 3,116 players or 380 tests. Publish planning docs with C0A by default, or use the explicitly authorized early shared committed baseline needed by the reviewer; no mandatory extra publication checkpoint. Verify player coverage/IDs/fields and permitted acquisition, Civil.gg/alternative reuse and diagram labels, Madden 27 depth-chart eligibility/ranks/inheritance, representative Falcons mappings, stock-book inventory and special-teams feasibility (exhaustive mappings complete at C3A/C3B). Distinguish full source import from full game-catalog coverage; known omissions require owner disposition. Separate older-game context from verified facts. Deliver evidence/coverage and blockers; no speculative app code. C0B waits for accepted integrated evidence.

## C0A-REVIEW — approved independent second thread

> Execute the independent review lane using phases/00-independent-review.md. Check source/mechanic evidence, reuse assumptions, diagram orientation, planned/confirmed semantics, phone design and free-tier/scope risks independently. Own only your review report and lane delivery record; do not edit primary shared research/contracts or scaffold an app. Coordinate findings through the integration owner. Start only when the planning baseline is available in your isolated worktree.

## C0B — initial contract/fixture specification

> Execute C0B only using phases/00-evidence.md after owner acceptance of C0A and review findings. Freeze one implementation-independent contract set for immutable sources/IDs, isolated franchise state, provisional baseline setup, planned-versus-confirmed semantic differences/dependencies/partial apply/undo, revision conflicts, transactions, formation inheritance/overrides and backup schema. Record bounded history, retry safety, valid ordered-list action units and atomic bulk review, inherited-vs-explicit override diffs, unsaved navigation/session behavior, incremental backup/ID-remapping recovery, one concise ADR/scenario matrix and single shared-contract owner. Freeze only near-term interfaces; no full event-sourcing/workflow platform. Do not invent proprietary ratings formulas or unresolved game rules. Deliver the reviewed contracts/fixtures specification before parallel feature code starts.

## C1A — responsive shell, owner visual gate

> Execute C1A only using phases/01-foundation.md from accepted C0 contracts. Build the familiar Next.js/Tailwind restrained operations shell with approved desktop/phone navigation, light/dark, readable density and honest empty/loading/error states. Select/document package manager and reproducible local/free-CI check scripts after tool inspection, plus measurable accessibility criteria; show prototype save controls as not connected. No fake statistics, AI treatments, domain guesses or premature feature expansion. Demonstrate desktop and phone layouts and stop for owner visual acceptance before C1B/features proceed.

## C1B — private auth, data and franchise foundation

> Execute C1B only using phases/01-foundation.md after C1A visual acceptance. Implement authoritative single-owner GitHub OAuth/policies, dev/prod env isolation, immutable source revisions and coverage reporting, logically isolated create/switch/archive franchises with Falcons default and custom players, grouped editable fields, no invented OVR recalculation, minimal player planned-vs-recorded state, revision-safe autosave with unsaved navigation/session protection, retry safety and atomic backup envelope/restore-new with mutable ID remapping and exact source-revision recovery. Future feature checkpoints extend backups. Provision only with scoped authorization. Test unauthorized/cross-franchise requests, source immutability, stale writes, failed saves and restore safety; don't silently add later-phase rules.

## C2A — depth chart and planning state

> Execute C2A only using phases/02-lineups-checklist.md from accepted private persistence. Build verified per-position ranked lists, legal cross-position/specialist assignments, active/practice-squad separation, drag plus keyboard/touch move controls, replacement search and clear planned/confirmed inspection. Initial suggested charts are provisional if game defaults are unsourced. Extend C1B planned-vs-recorded primitives and stale-write safety. Transaction/promotion UI waits for C4A; dependent planning is fixture-tested, never exposed through dead controls. Don't assume the owner's memory list proves game legality or build formation/GM screens early.

## C2B — final-action checklist and recovery

> Execute C2B only using phases/02-lineups-checklist.md after the depth-chart/state baseline is accepted. Implement consolidated baseline→plan actions, reverts, individual/reviewed bulk confirmation, dependency blocking, partial apply, cancel, bounded safe undo and revision-safe confirmations. Recording already-happened facts must not erase unrelated plans. Integrate a useful real Overview and verified game-action wording. Test A→B→C, partial application between valid units (whole ordered position list by default), atomic stale-batch no-op, lost-response retry, prerequisite cancellation and safe undo. Actual partial list edits are recorded as a valid reality list, not arbitrary per-rank ticks. Undo corrects app records, not Madden. Checklist is not an activity feed.

## C3A — Falcons formation diagrams and subs

> Execute C3A only using phases/03-formations.md from accepted checklist and verified mappings. Implement Falcons stock offense/defense diagrams with offense line TOP, defense line BOTTOM, correct labels/left-right/personnel inheritance, persistent explicit overrides, explicit reset scope, visible duplicate/departed/missing-slot conflicts and offered repairs. Name/number/OVR must be accessible; number-circle compact mode must work by tap/click/keyboard, not hover only. Feed explicit override set/reset and verified configuration actions into the checklist; inherited diagram changes from chart edits never create redundant sub tasks. Preserve book-scoped state through A→B→A switching and extend backups. No universal WR3→SLWR1 guess or invented fallback.

## C3B — stock-book coverage and special teams

> Execute C3B only using phases/03-formations.md from accepted resolver/diagram contracts. Expand the stock team/alternate book inventory into verified mappings with provenance and visible verified/partial/unsupported coverage. Include special-teams diagrams if verified feasible; explain blockers and ask the owner before skipping. Source art only where reuse permitted, with approved text/personnel fallback. No custom books, copied unverified mapping equivalence or false all-book-complete claim. Coordinate any parallel GM lane through the shared catalog owner.

## C4A — roster, contract ledger and manual trade assets

> Execute C4A only using phases/04-gm-coach.md after accepted C3A (C3B may expand independently). Build a truthful manual contract/extension-threshold ledger, explicit-year manually owned pick assets, owner-entered hypothetical/completed deals and correct planned/confirmed roster/asset/checklist effects. Keep sign/cut/practice-squad moves visually secondary, enforce consistency/verified limits and disclose unknown eligibility. Never generate exact trade packages, forecast acceptance/dead cap, invent draft picks or add season rollover. Test asset conflicts, actual dependency integration, atomic/lost-response retry, proposal-save vs game-completion distinction, cancellation, source/franchise isolation and extended backups.

## C4B — explained scouting and Coach View

> Execute C4B only using phases/04-gm-coach.md after accepted C4A with frozen roster/formation interfaces. Build filters/side-by-side comparison, explained Trade Block/Targets, pin/dismiss/notes and approved Coach tabs. Separate verified Madden archetype match from researched practical suitability; athletic anomalies need visible position-relative threshold/peer/sample/missing policy. Seed verified editable Falcons schemes independently of playbooks. No opaque official-looking score, missing-as-zero bias, compulsory off-scheme selling or duplicate editors. Have the owner review representative suggestions/rubrics before completion.

## C5A — verified drive metadata/templates/rules

> Execute C5A only using phases/05-gameday.md after accepted GM/Coach. Research exact supported plays and complementary look/concept families, then implement executable tested rules/metadata/templates for three themes per side, with an owner-reviewed theme×situation coverage grid and exact bucket boundaries/unknown-context rules. C3B may expand independently; only supported chosen books enter suggestions. Resolve planned-vs-recorded gameday roster view with the owner. Only verified game facts enter actionable calls; heuristics are labeled. Menu has three eligible calls or fewer without filler. Refresh stays within theme, keeps compatible pins and resettable current-session recently displayed memory; incompatible favorites remain browsable, displayed never means run. Define >3-pin tie-break within the three-call cap, session-history invalidation and exhaustion behavior, freeze contracts and a phone measurement protocol, and review grid coverage with the owner before phone UI expansion. Not documentation-only pseudo-fixtures.

## C5B — fast phone call sheet and editable plans

> Execute C5B only using phases/05-gameday.md from accepted metadata/rule contracts. Build iOS Safari-first side/theme controls, situation chips, three short complementary play cards, optional defensive/game context, concise/expandable coaching detail, editable templates/favorites and eligibility-preserving refresh. Preserve browsing context, limit phone payloads, show truthful autosave/disconnection/conflict. Use permitted art or disclosed personnel/text fallback. No dense desktop grid, mandatory play log, print/offline sync or AI service. Verify actual iOS Safari (or record an explicit pending owner-approved interim limitation), input protection, incremental backup round-trip and rule/explanation agreement.

## C6A — integrated release verification

> Execute C6A only using phases/06-hardening.md after required checkpoints are merged or limitations explicitly owner-approved. Prove create/source isolation→player/custom-rookie edits→depth chart/sub overrides→manual trade/prerequisites→partial checklist/cancel/undo→scouting/Coach→phone themes/refresh→backup restore. Check auth/policies/secrets/env isolation, actual stock/special-team/art/theme coverage, desktop/iOS usability/accessibility, full-data performance and free-tier recovery. Fix scoped defects, not add features. Record honest final tests/actual-device acceptance/deployment/migrations and blockers; critical auth/data-loss failures prevent release. Deliver mergeable release PR, owner merges.
