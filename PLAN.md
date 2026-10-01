# Execution Plan — Approved Checkpoint Sequence

Status: phase/checkpoint granularity and GM/Coach-before-Gameday sequencing approved by owner (D084/D089). Research-dependent exact coverage and engineering contracts remain gated. No implementation in the planning thread.

## How to use this plan

Read [DECISIONS.md](DECISIONS.md), [SPEC.md](SPEC.md), [DESIGN.md](DESIGN.md), and [RESEARCH.md](RESEARCH.md). Each checkpoint is a cohesive commit/push/PR unit, not an obligation to PR every internal task. Owner reviews and merges. A later checkpoint starts from the owner's merged baseline, never assumes an unmerged predecessor has landed.

All checkpoints require: correct scope, relevant tests, type/build checks when code exists, applicable desktop/mobile inspection, no secrets, updated docs/handoff, and a mergeable PR. If a source/account/remote or game rule blocks completion, record the blocker rather than claim done or quietly reduce scope.

## Checkpoint dependencies and staged completeness

This table is the dependency authority; phase packets and launch prompts refer to it rather than imply every lower-numbered phase must finish first. Owner-approved phase order is unchanged.

| Checkpoint | Required accepted/merged baseline | Specific exit evidence |
|---|---|---|
| C0A | Approved planning docs available; baseline publication integrated with evidence or a separate owner-authorized docs PR | Versioned evidence/coverage register, feasible initial source strategy, reviewer findings resolved or explicitly open |
| C0B | C0A and independent review dispositions | One concise contract/ADR + scenario matrix; no application code required |
| C1A | C0B | Built responsive shell, actual check scripts, owner visual approval |
| C1B | C1A visual acceptance | Private persistence, player baseline/plan primitive, snapshot import report, backup envelope/round-trip for implemented state |
| C2A | C1B | Accessible verified depth-chart plans; baseline setup and data-safety fixtures |
| C2B | C2A | Executable action units, atomic/retry-safe confirmations and safe undo; transaction dependencies tested with fixtures only |
| C3A | C2B plus verified Falcons mappings | Dynamic personnel/overrides; no redundant inherited-sub checklist items; backup includes formations |
| C3B | C3A | Reconciled stock-book inventory + special-teams result/owner-approved exception |
| C4A | C3A; C3B need not be finished | Real transaction/asset integration replaces dependency fixtures; backup includes GM state |
| C4B | C4A and stable verified selected-book catalog | Tested fit/scouting/Coach rubrics; backup includes notes/dismissals/identity |
| C5A | C4B and supported chosen books; C3B may still expand independently | Executable tested rule engine + metadata/templates + signed-off coverage grid, not documentation-only examples |
| C5B | C5A | Integrated phone UI and persistent editable plans; backup includes gameday state |
| C6A | All above merged, including C3B, or individually recorded owner-approved exceptions | Integrated acceptance, actual iOS test or explicit pending owner waiver, recovery/security/coverage evidence |

A checkpoint's feature is complete for its declared scope, not for future features. Early backup/state primitives must grow with each subsequent feature; don't defer all integration or export updates to C6A. Transactions/promotion UI arrive at C4A: C2/C3 use dependency fixtures or already-recorded roster corrections and must not expose a nonfunctional 'promote' or 'trade' button.

## Lean execution defaults

- Keep approved checkpoint IDs. Do not add mandatory paperwork PRs, integration-only PRs, speculative libraries, or a generic workflow/event-sourcing platform.
- Freeze only the contracts used by the next pair of workstreams. Later schema changes use normal reviewed migrations; 'freeze' does not mean designing every future implementation in C0B.
- Full shared-code tests at integration boundaries, targeted tests per change, UI inspection only when UI is affected. Docs-only work marks application checks not applicable.
- Two parallel code lanes use WORKFLOW.md's explicit independent-or-integration delivery mode. A partial lane does not count as a completed owner-facing checkpoint.

## Phase 0 — Evidence and execution readiness

### C0A — Data and mechanics feasibility

Deliver research/documentation and permitted data-acquisition plan, not a speculative UI feature.

- Verify player schema/coverage/IDs and free-agent availability; reconcile the unverified counts and separate complete-source import from complete-game coverage. Any known omission needs visible disclosure and an owner decision before claiming the full requested catalog is complete.
- Inventory Madden 27 primary/specialist slots, ranks, eligibility, specialist precedence, and baseline defaults with citations/version/platform.
- Inspect Civil.gg formation labels/coordinates; establish permitted access/reuse, stock book inventory, and play-art policy.
- Create a validation matrix with representative Falcons offense/defense mappings sufficient to prove the acquisition/resolver strategy; exhaustive initial-book mapping validation completes at C3A. Inventory special-teams feasibility now; exact special-teams mapping/owner-approved skip completes at C3B.
- Identify unknowns requiring owner gameplay verification; distinguish prior-year evidence.
- Record accounts/projects prerequisites and source coverage risks.

Exit: useful initial sources and a documented mapping strategy are established, or owner makes an explicit revised-scope/source decision. Merely finding a webpage is not completion.

### C0B — Contracts and test fixture specification

After C0A, freeze the initial domain vocabulary and implementation interfaces before parallel feature coding:

- Source/franchise identity and isolation, confirmed-vs-planned semantics, semantic diff/dependencies/undo, revision conflicts, source/manual missing values.
- Verified initial position/formation fixtures and no duplicate-player formation invariant.
- One concise persistence/API and migration/test-tooling ADR: bounded undo, request retries/idempotency, autosave revision/unsaved navigation behavior, provisional baseline setup, valid ordered-list action units, and baseline-versus-override diff rules. Check existing dependencies when code exists; before that select/document a minimal stack, not a second backend or generic event-sourcing engine.
- Mark minimum fixture coverage for transaction → depth chart → formation → confirmation.

Exit: one coherent contract set, no rival schema definitions, and owner-approved revised assumptions where research requires changes.

Approved first pairing (D101): source/mechanics researcher plus independent reviewer of evidence/permissions/scope/design. Exclusive docs/worktrees and one integrator; no two writers edit the same decision/schema document simultaneously.

## Phase 1 — Private usable foundation

### C1A — App shell and design acceptance

- Next.js/Tailwind skeleton, agreed desktop/mobile navigation, light/dark, empty/loading/error states, neutral visual tokens, accessible controls.
- Documentation-only layouts guide implementation; no invented domain calculations or fake dashboard statistics.
- Demonstrate shell at 1280×720, 1440×900, and narrow phone sizes, subject to actual-device updates.

Exit: owner reviews the implemented shell and approves direction before feature expansion. Type/build/accessibility/browser checks pass. Temporary fixtures clearly identified, never presented as published data.

### C1B — Private persistence and franchise baseline

- Supabase GitHub OAuth with authoritative single-owner allowlisting and policy tests.
- One logical database, immutable source revisions, isolated franchises, Falcons default, create/switch/archive, custom-player identities.
- Permitted complete-as-reported player import, missing-data report, editable grouped player data, no invented OVR recalculation.
- Published/provisional planning baseline distinct from owner-confirmed game state; player planned-vs-recorded primitive precedes C2 checklist UI. Autosave/revision/conflict/network failure, navigation, and session-expiry paths.
- Versioned backup envelope and atomic validated restore-new for all C1B state, including custom-player identity remapping and missing source-revision handling. Every later checkpoint extends round-trip coverage. Provision only after owner approval; production data never used as test fixtures.

Exit: unauthorized access denied, two franchises isolated, published source untouched by edits, restore safe, multi-device stale writes detected. Initial shell and data integrated, not merely parallel demos.

Possible parallelism after C1A/contracts: A owns persistence/auth/domain; B owns read-only catalog/player UI and visual components with fixture adapters. A alone owns migrations/shared contracts. Freeze adapters before work; integrate only after their PR bases are clear.

## Phase 2 — First payoff: depth chart → checklist

### C2A — Planning state and depth charts

- Verified per-position lists and game-compatible eligibility; active/practice squad separation.
- Planned/confirmed state, accessible drag + move controls, replacement search, primary/specialist assignments.
- Intent-aware changes (planned vs already happened), revision-safe writes, visible game-verification state.

Exit: core lineup fixtures pass; same player can have legal primary/specialist roles; invalid assignments and cross-franchise IDs rejected; mobile/keyboard workflows usable.

### C2B — Actionable checklist and recovery

- Final differences, A→B→C consolidation/revert, individual and reviewed bulk confirmations.
- Prerequisites, valid executable action units (ordered list by default), blocking invalid confirmation, explicit atomic reviewed bulk scope, retry-safe requests, cancel and dependency-aware bounded undo. Partial application is between valid units, not arbitrary per-rank baseline corruption.
- Verified game-menu guidance only; transaction dependencies may use domain fixtures before full GM UI exists.
- Overview displays real pending/issues and quick resume.

Exit: stale device confirmations, partial applies, cancel/undo dependencies, and recording already-completed reality are covered by tests and owner manual scenarios. Usable no-game workflow remains clear.

Parallelism: after state contract freeze, A owns diff/dependency/confirmation service; B owns depth-chart/checklist presentation consuming those interfaces. Never let both independently define pending-action semantics.

## Phase 3 — Verified dynamic formation substitutions

### C3A — Falcons offense/defense diagrams and overrides

- Verified labels, coordinates, slot inheritance/precedence, correct opposite diagram orientations.
- Name/number/OVR detail, optional compact jersey-circle treatment with tap/keyboard access.
- Inherit changes, retain overrides, explicit reset scope, duplicate/departed-player conflict + offered repair.
- Checklist receives explicit override set/reset and verified game actions, not redundant tasks for inherited diagram changes caused by a depth-chart edit. Playbook switching retains book-scoped plans without transplanting same-name mappings.

Exit: fixtures prove each initial formation mapping, overrides survive chart changes, distinct on-field personnel, source confidence visible. Both phone and desktop rendered diagrams reviewed, including long names/collision.

### C3B — Coverage expansion and special teams

- Stock team/alternate inventory; validated mappings deduplicated only when genuinely equivalent.
- Expand all available books with coverage report; do not claim unsupported/partial books complete.
- Special-teams diagrams if verified feasible; otherwise blocker report and owner-approved skip.
- Play-art permitted assets/links where available, fallback disclosed. No custom-book builder.

Exit: inventory reconciles implemented vs partial/unsupported; any reduced completion accepted explicitly. Large data catalog does not degrade diagram interactions.

Parallelism: A owns resolver and mapping/schema updates; B owns diagram/selection UI or separate data batches with mutually exclusive files. Special-teams/all-book mapping research may run alongside GM work after C3A if shared catalogs/contracts are frozen.

## Phase 4 — GM War Room and Coach View

### C4A — Roster, assets, manual transactions, contracts

- Manual contract ledger and incomplete-total coverage; no cap simulator.
- Manually initialized explicit-year pick ledger (no invented assets) and owner-entered proposals; confirmed-vs-planned roster and asset effects.
- Secondary sign/cut/promotion tools; no generated deals/acceptance prediction.
- Transaction confirmation feeds checklist prerequisites and flags affected plans with offered repairs; it does not silently change deliberate overrides. App proposal save and owner game-completion confirmation are separate operations; retries never apply a deal twice.

Exit: asset ownership/duplicate trade validation, cross-franchise isolation, incoming/outgoing roster effects, conflicting proposals, unknown contracts, and dependency-safe confirmation tested.

### C4B — Scouting, fit, Trade Block/Targets, Coach tabs

- Published/recorded archetype fit distinct from practical role rubric; research-backed/versioned explanations.
- Attribute/name/team filters and side-by-side comparison; position-relative athletic anomalies with explicit missing/sample policy.
- Explained surplus/poor-fit Trade Block, explained targets, pin/dismiss/notes.
- Coach Scheme & Playbook, Personnel Gaps, Formation Identity with links to authoritative editors.

Exit: no ambiguous magic score, no missing-as-zero bias, no mandatory off-scheme sell decision, persistent dismissals and custom-player behavior covered. Owner approves example recommendations.

Parallelism: A owns transactions/assets/persistence; B owns fit/scouting/Coach read models using frozen roster interfaces. Shared schema changes routed through A with agreed integration window.

## Phase 5 — Phone-first gameday

### C5A — Verified play metadata and curated templates

- Exact supported calls/formation identifiers, personnel/look families, permissible play art or fallback.
- Research notes separate official game facts, football heuristics, and version-dependent adjustments.
- Initial target: three offensive themes (under-center/play action, shotgun quick game, motion/misdirection) and three defensive themes with verified useful calls/context. Catalog is extensible. A source gap requires an explicit owner decision, not fabricated calls.
- Explicit down/distance/field/context rules, empty-formation vs personnel distinction, traceable explanations, no invented calls.

Exit: executable rule tests and an explicit theme×situation coverage grid reviewed by owner, including exact bucket boundaries, unknown-context behavior, valid calls, and intentional unsupported cells. At least one supported situation per theme has three eligible complementary calls; a refreshable theme also demonstrates an eligible non-pinned alternative or explains exhaustion. Source gaps require owner approval, never filler. The grid, not a speculative universal play count, defines useful initial coverage.

### C5B — Gameday UI and editable plans

- Phone situation chips, sticky but compact side/theme controls, THREE complementary eligible calls (fewer if insufficient verified coverage, never filler), optional context, expanded coaching details. Incompatible pins remain browsable but not recommended.
- Edit/name themes, favorite formations/plays, preserve current context while browsing; refresh eligible calls within theme with resettable current-session recent-menu memory. Eligible pins are prioritized within three slots, never expand the menu or override compatibility; deterministic handling of >3 pins documented. Displayed does not mean run.
- Fast local situation evaluation against current validated plan; truthful online save/connection status.
- No play-by-play logging, print/PDF, live sync claims, or offline-edit complexity.

Exit: iOS Safari-oriented browser checks, representative actual-device owner check, no essential horizontal scrolling, no sticky control obstruction, readable play cards, rule/UI explanation agreement. Unsupported context produces an honest empty/fallback state.

Parallelism: A owns rules/metadata/templates; B owns gameday UI once scenario input/output types are frozen. No LLM or paid API added.

## Phase 6 — Integrated hardening and owner handoff

### C6A — Full workflow/security/performance release

- Exercise create franchise → player edit → lineup → sub override → planned trade → prerequisite confirmation → final checklist → gameday → backup/restore.
- Validate light/dark, keyboard, narrow/short screens, iOS Safari, Chromium/Helium owner test where available.
- Inspect performance with full verified catalog and representative diagrams/templates; document environment and realistic free-tier caveats.
- Verify preview/production env isolation, migrations/rollback plan, owner allowlist/policies, secret handling, safe logs, and export integrity.
- Document project resume, backup cadence, failure recovery, limitations, supported coverage, and future feature exclusions.

Exit: no unresolved critical blockers; coverage is honest; owner accepts supported scope; final PR mergeable. Hosting changes/production migration only with scoped owner approval.

## Scheduling recommendation

Do not keep two coding threads busy artificially. Run in parallel only after shared contracts are stable. Strong candidates:
- source research + independent design/research review;
- backend/state services + fixture-driven UI;
- mapping coverage research + GM UI after formation contract freeze;
- transaction/contract tooling + scheme/scouting read models;
- gameday engine/metadata + phone UI.

A completed phase is not just passing isolated unit tests: integrated behavior and owner acceptance must be demonstrated. No time estimates or exact PR count promises until C0 source feasibility is known.

## Approved sequencing and remaining gates

- Sequencing/checkpoint granularity approved; GM/Coach precedes Gameday.
- Initial gameday target approved as three offense + three defense themes, exact verified calls/buckets reviewed at C5A.
- See WORKFLOW.md for worktree/PR/integration procedure and SETUP.md for project/auth/environment setup.
- Node/package manager/GitHub CLI/Docker, primary branch/remote, free project slots, and source feasibility must be inspected, not assumed.
- Infeasible special-teams diagrams require owner explanation and approval to skip.
- Proposed performance targets, bounded history retention, and exact scoring thresholds must be documented with tests and limitations before being called complete.
