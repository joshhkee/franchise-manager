# Planning Documentation Audit

Status: documentation revisions completed; final link/consistency validation recorded below. No application code, project provisioning, installs, commits, pushes, PRs, or production changes. [FEATURES.md](FEATURES.md) and owner decisions D001–D101 were preserved. No new owner decisions were fabricated.

## Scope and authority

Reviewed all planning documents and phase packets for contradictory instructions, missing acceptance, hidden dependencies and avoidable coordination overhead. These revisions clarify engineering tests and execution boundaries; they do not change approved phase IDs/order, product exclusions, private/$0 scope, design direction, or source-reuse requirements.

Authority now explicit in [START_HERE.md](START_HERE.md): owner decisions → product/design semantics → [PLAN.md](PLAN.md) dependency/exit table and [WORKFLOW.md](WORKFLOW.md) delivery modes → scoped phase packets. [LAUNCH_PROMPTS.md](LAUNCH_PROMPTS.md) is the single launch catalog; packets link to it. A research-dependent or material owner-facing choice stays a gate, not an audit-invented approval.

## Findings and corrections

| ID | Severity | Original issue | Correction / owning gate |
|---|---|---|---|
| F01 | High | 'Confirmed baseline' initially meant unverified published or suggested ranks, inviting a false game-parity claim | Distinguish provisional/published planning reference from owner-confirmed game facts; record-actual workflow and verification labels. [SPEC.md](SPEC.md), C1B/C2A |
| F02 | High | Individual rank confirmation/partial ordered-list apply could create duplicate or invalid baseline lists | Executable valid action units, whole ordered position list by default; partial application between units or recording an actual valid intermediate list. [SPEC.md](SPEC.md), C0B/C2B |
| F03 | High | Bulk confirmation both 'atomic' and 'skip blocked' was unspecified; lost-response retries could double-apply deals/restore | Review explicitly excluded items before submission; exact reviewed scope commits atomically, stale scope applies none, request retries idempotent. [ACCEPTANCE.md](ACCEPTANCE.md), C1B/C2B/C4A |
| F04 | High | Any changed formation player could become a redundant formation-sub checklist item; same-player override intent could be lost | Chart-inherited display changes create no extra sub action; explicit override set/reset intent matters even when resolved player matches. [SPEC.md](SPEC.md), C3A |
| F05 | High | C1B player editing required planned-vs-recorded state that appeared only at C2 | Minimal player state primitive starts C1B; C2 adds action/lineup UI, not a replacement state model. App-only changes excluded from Madden checklist. [PLAN.md](PLAN.md), C1B/C2 |
| F06 | High | Promotion dependency expected before GM transaction UI existed | C2/C3 use fixtures or already-recorded corrections; actual proposed transaction/promotion UI and integrated prerequisite tests arrive C4A. No dead early controls. [phases/02-lineups-checklist.md](phases/02-lineups-checklist.md) |
| F07 | High | Backup complete at foundation could quietly omit later overrides/assets/drive plans; restore source references/IDs underspecified | Versioned envelope grows and round-trips at EVERY feature checkpoint; mutable IDs remapped, exact source revision strategy, atomic failure, authenticated-owner scope. [SPEC.md](SPEC.md), [SETUP.md](SETUP.md) |
| F08 | High | Failed autosave promised input preservation but not navigation/franchise-switch/session-expiry behavior | In-session retry/discard/stay protection; never silently lose input or overwrite newer revision; no durable offline/restart promise. [SPEC.md](SPEC.md), C1B onward |
| F09 | Medium | Phase sequence suggested C3B must finish before GM, while concurrency allowed it to continue; C5A could deliver only documentation | Dependency table makes C4A start after C3A; C3B required at release absent owner exception. C5A requires executable tested engine/metadata/templates. [PLAN.md](PLAN.md) |
| F10 | Medium | 'One checkpoint PR' conflicted with partial backend/UI lane PRs requiring full integration exits | Two declared modes: independently useful named checkpoints or ONE integrated backend/UI delivery. Lane-ready ≠ checkpoint-complete. [WORKFLOW.md](WORKFLOW.md), [HANDOFF.md](HANDOFF.md) |
| F11 | Medium | Mandatory publication/reviewer/integration/status paperwork could proliferate PRs and uncommitted self-hash edits | C0A publishes docs by default; early docs PR optional; reviewer may integrate report or PR separately. One concise checkpoint record + linked PR; no status-only PR requirement. [WORKFLOW.md](WORKFLOW.md) |
| F12 | Medium | Three-call menu, pins and refresh lacked >3-pin/exhaustion rules or measurable useful-theme coverage | Three-slot cap applies to eligible pins; deterministic overflow/refresh rules, theme×situation coverage grid and boundary tests at C5A. No extra play-count/coverage invented. [phases/05-gameday.md](phases/05-gameday.md) |
| F13 | Medium | Playbook switching could discard/transpose overrides or mix same-name formations; scheme changes not isolated | Retain versioned book-scoped mutable plans/favorites; no name-only transplantation; scheme independent; browsing ≠ game configuration. [SPEC.md](SPEC.md), C3A/C4B |
| F14 | Medium | 'Complete-as-reported' could mask an incomplete game dataset; C0 risked exhaustive future research blocking shell | Source-import completeness distinct from game coverage with owner dispositions. C0 representative feasibility, C3 exhaustive mapping, C5 exact calls. [RESEARCH.md](RESEARCH.md), C0A/C1B/C3 |
| F15 | Medium | 'Mergeable', accepted, merged, deployed and migrated still blurred in a few handoff instructions | Conflict status, required checks, owner acceptance, actual merge/base, deployment and applied migration are separate facts. [HANDOFF.md](HANDOFF.md) |
| F16 | Medium | Mobile/accessibility/performance checks were qualitative; emulated viewport could be called iOS validation | Measurable criteria/protocol at owning checkpoint; actual iOS test or explicitly pending owner-approved interim limitation. Dev recovery drill, not destructive production test. [DESIGN.md](DESIGN.md), [ACCEPTANCE.md](ACCEPTANCE.md) |
| F17 | Medium | Editable field types/units, custom-player placement, archive behavior, private cache and retry security were missing test gates | Detailed import/edit/ID/archive/auth/cache acceptance and reproducible free-CI path added; engineering values documented before code claim. [ACCEPTANCE.md](ACCEPTANCE.md), C1A/C1B |
| F18 | Low | Repeated launch prompts and full-document rereading would drift and slow every thread | Canonical prompt catalog + authority/dependency references + minimum relevant reading; keep core semantics centralized. [START_HERE.md](START_HERE.md) |

## Simplifications deliberately adopted

- Preserve all approved checkpoint IDs; do not propose fewer milestones as if the owner approved them.
- Use normal single-app state transactions/revision checks and bounded undo; no compulsory event sourcing, generic workflow engine, microservices, offline queue or speculative dependency framework.
- Freeze near-term interfaces, not every future schema in C0B.
- One checkpoint record and a PR linking it; abbreviate lane records and mark N/A sections. No separate mandatory status index/integration report.
- Scope verification to affected code/UI while retaining integrated tests at boundaries. Docs-only work does not invent app build/browser results.
- Keep reviewer report integration versus separate PR as an explicit choice; do not require both.
- Distinguish useful current scope from future coverage; no all-playbook blocker on starting GM, no quiet waiver of C3B at release.

## Remaining gates — not silently resolved

1. **C0A/C3:** exact Madden 27 labels/rank/eligibility/slot mappings, player/free-agent completeness, permitted source/art reuse, special-teams feasibility. Report evidence; material source/coverage reductions and skipping special teams require owner decisions.
2. **C0B/C1B:** physical schema/ADR, bounded undo retention, exact retry mechanism, player validation units/ranges, archive/resume behavior, owner OAuth bootstrap and missing-source-revision recovery. Preserve stated semantics; material behavior changes ask the owner.
3. **C3/C4:** actionable game configuration changes versus browsing; verified game menu operations. Do not add tasks for unsupported fields or catalog filters.
4. **C4B:** exact practical-fit/anomaly peer thresholds/sample handling and manual extension-year threshold; record visible boundary fixtures and review examples.
5. **C5A:** owner chooses Gameday's planned versus recorded roster view and pending-change treatment. Resolve exact theme grid, bucket boundaries, pin overflow, session-history invalidation and representative phone benchmark protocol. Unknown inputs must not be invented.
6. **Setup:** actual repository/PR/production branch, local tools, free project slots, preview OAuth routing, and scoped provisioning/migration approval. PR target and production branch need not be assumed identical; record the actual relationship.
7. **C1A/C5B/C6:** implementation-level accessibility/performance targets and actual iOS Safari acceptance; proposed timings remain targets, not guaranteed free-hosting behavior.

## Validation record

- Manual cross-read: decision log, core spec, phase dependencies, launch catalog, parallel workflow, handoff, setup/research and acceptance gates.
- Automated read-only documentation check: enumerate root/phase Markdown, verify local link targets and heading anchors, verify D001–D101 stay unique/sequential, and verify every phase packet references canonical launches. **PASS:** 21 Markdown files, 144 local targets/heading anchors, D001–D101 unique/sequential, A01–A41 unique/sequential, all eight phase packets linked to canonical launches with no duplicate launch prose. Initial run correctly flagged the not-yet-created audit report; final run after creation passed.
- Application typecheck/tests/build: **not applicable**; no application code or project configuration was introduced.
- Provider/source facts: **not revalidated** during this audit; preliminary research remains historical and explicitly gated.
- Git operations: **none**. All audit deliverables remain documentation changes for owner review.
