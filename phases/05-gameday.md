# Phase 5 — Phone-First Drive Playcalling

## Read first

[START_HERE.md](../START_HERE.md), [DECISIONS.md](../DECISIONS.md), [SPEC.md](../SPEC.md), [DESIGN.md](../DESIGN.md), [RESEARCH.md](../RESEARCH.md), [PLAN.md](../PLAN.md), [WORKFLOW.md](../WORKFLOW.md), accepted C3/C4 book/identity/rubric records.

## Mission / preconditions

Create a low-input coaching reference for an experienced-to-intermediate solo-vs-CPU player, usable quickly on iOS Safari. Not a chatbot, automatic game-state tracker, or one-optimal-play oracle. C5A needs accepted C4B and verified chosen-book data; C3B all-book expansion can remain a separate lane until C6A. Stable play IDs and identity precede rule/UI work; PLAN.md defines dependencies.

## C5A — research, play metadata, rule contracts

- Verify exact play names/books/formations, personnel/look family, concept tags, situation applicability, and source revision. Separate official game facts, researched football heuristics, and uncertain adjustments.
- Initial target THREE offense + THREE defense themes with useful verified calls. Offense families: under-center/play action, shotgun spread/quick game, motion/misdirection. Proposed defense families (owner reviews exact calls): contain run, balanced/pass/avoid explosives, pressure or QB contain.
- C5A delivers executable tested rules/metadata/templates, NOT documentation-only pseudo-fixtures (contrast C0B). A theme×situation grid declares exact bucket boundaries, applicable contexts, valid calls, unknown-input behavior and intentional unsupported cells. At least one supported situation per initial theme demonstrates three complementary eligible calls. Refreshable themes demonstrate an eligible non-pinned alternative where available; exhausted pools are explained. Owner reviews grid/gaps; no invented universal minimum or promise every theme handles every fourth-down/goal-line case.
- Situations: down/distance, field zone, offensive personnel, tendency/focus, clock/score/phase. These are manual and optional; define explicit defaults/unknown behavior without pretending absent context is known. Resolve with the owner which roster view Gameday uses (planned vs recorded), label it and expose pending/unresolved personnel. No unconfirmed trade acquisition is implicitly game-ready.
- Empty alignment is not automatically 00 personnel. Defensive compatibility considers actual/selected threats, personnel, and plan, not simplistic universal front bans.
- Deterministic researched rules produce THREE complementary eligible calls (fewer if insufficient verified coverage, never filler) with reason traces and limitations. Never invent unsupported plays, hot routes, motion commands, audibles, coverage checks, or guarantees.
- Template editing/favorites and theme extensibility use shared book/formation IDs.
- Theme refresh rotates eligible compatible calls within the three-call cap, prioritizes compatible pins with a documented deterministic tie-break when >3 qualify, and lightly avoids recently DISPLAYED options using resettable current-session memory. Pins persist even when omitted from the current menu; incompatible favorites are browsable but excluded. All-pinned/exhausted pools get an honest no-variety explanation. Define reset/invalidation on book/theme/side/franchise changes and template edits. No used-play inference or season log/analytics; input/history/test seed produces reproducible fixtures.
- Only source art with permitted reuse; verified text/personnel fallback approved. No generated route art.

Fixtures: first/second/third/fourth down buckets, short/medium/long definitions, backed-up/red-zone/goal-line, unknown personnel, empty with actual personnel, two-minute/protect lead/must stop, no eligible calls, pinned favorite outside current bucket, repeated refresh, available-pool exhaustion, template edit/book change, incomplete metadata.

Exit: executable rules/tests, owner-reviewed three-per-side coverage grid, exact bucket/rule/pin/history boundary behavior and source explanations. Missing coverage needs owner disposition; never fill with invented calls. Establish a representative phone fixture/measurement protocol for C5B rather than promise <200 ms without a test environment.

## C5B — phone UI and editable plans

- iOS Safari portrait first: offense/defense switch, theme selector, situation chips, short complementary play cards. Sticky controls remain compact on short screens.
- Optional personnel/field/clock/score/focus controls in expandable context; no mandatory pre-call form or every-play logging.
- Show exact play/formation, purpose/one cue; expand reads/disguise/risks/verified adjustments. Return to previous theme/context after detail inspection.
- Rename/edit curated plans, pin formations/plays, refresh within theme, reset menu memory. Recent options are labeled displayed, never 'used' unless a future explicit feature is approved.
- Show art where available/permitted; full personnel detail touch/keyboard accessible, number-circle compact mode when appropriate.
- Fast in-memory situation reevaluation, limited necessary data fetching, truthful online save/error/conflict and unsaved-navigation handling. Extend backup round-trip to custom templates/drive plans/favorites; exclude ephemeral displayed-menu history. No print/PDF, offline mode, or game sync claim.

Exit: type/build/rules/persistence tests, desktop/narrow/short phone browser checks, console/network review, and actual iOS owner acceptance or explicitly pending owner-approved interim limitation (required again at C6A). Viewport emulation alone is not an iOS result. Essential controls no horizontal scrolling or hover requirement. Full catalog doesn't require loading all player attributes for a call sheet. Document performance measurements/environment; proposed targets aren't unlimited free-hosting guarantees.

## Parallel boundaries

A owns verified metadata/templates/rules/scenario types and fixtures; B owns assigned phone UI against the frozen contract. C5B starts after accepted C5A by default; any approved early fixture work is a partial lane under WORKFLOW.md's integrated mode. One shared favorite/plan persistence writer. B cannot fix sparse metadata by inventing plays.

## Non-goals

Generative AI, live save/state feed, mandatory play log, scoreboard/season tracker, opaque win probabilities, exact competitive-meta promises, print/offline sync.

## Delivery / launch

Source/rule coverage, theme/call examples, phone screenshots, repeat-memory behavior, failure cases, owner acceptance, scoped commit/push/mergeable PR and next-thread handoff. Owner merges.

Use canonical [C5A](../LAUNCH_PROMPTS.md#c5a--verified-drive-metadatatemplatesrules) or [C5B](../LAUNCH_PROMPTS.md#c5b--fast-phone-call-sheet-and-editable-plans) with assignment header/shared instruction. PLAN.md and WORKFLOW.md govern dependencies and lane delivery.
