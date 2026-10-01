# Phase 1 — Private Foundation

## Read first

[START_HERE.md](../START_HERE.md), [DECISIONS.md](../DECISIONS.md), [SPEC.md](../SPEC.md), [DESIGN.md](../DESIGN.md), [PLAN.md](../PLAN.md), [SETUP.md](../SETUP.md), [WORKFLOW.md](../WORKFLOW.md), [HANDOFF.md](../HANDOFF.md), accepted C0A/C0B delivery records.

## Preconditions

Verified merged planning/evidence/contracts baseline. Source feasibility/license limits known. Actual branch/remote/tools inspected. Owner authorizes project provisioning/installs separately as needed; strict $0. Do not assume code already exists.

## C1A — shell and visual acceptance

Build only the familiar Next.js/Tailwind foundation and useful empty/loading/error UI; no domain guesses.

- Desktop left rail: Overview, Lineups (Depth Chart/Formation Subs), GM War Room, Coach View, Gameday, Checklist.
- Phone bottom: Overview, Lineups, Gameday, Checklist, More.
- Light default + dark, neutral professional surfaces, restrained team accents, compact readable tables, no marketing/AI clichés.
- Franchise selector, truthful 'Saved to app' indicator (prototype/not connected until persistence exists), accessible dialogs/panels, keyboard focus, responsive structure. Never imply game sync.
- Do not show fake records, player counts, charts, or 'insights' to fill empty space.
- Establish selected package manager, reproducible local/free-CI type/build/test checks and useful shell tests, reusable primitives, measurable contrast/reflow/focus/touch criteria; dependency changes belong to one owner. Disclose unavailable remote checks; don't create a large generic component framework.

Exit: owner reviews implemented shell before feature expansion. Test at proposed desktop sizes 1440×900/1280×720 and phone 390/430 plus narrow 360; avoid clipped actions/oversized sticky areas. Type/build/browser checks and meaningful accessibility checks pass.

## C1B — auth, isolated data, franchise lifecycle

Use reviewed C0B contracts, not a UI-driven alternative schema.

- Supabase GitHub OAuth with controlled owner bootstrap and backend/database allowlisting. Unauthorized identity/direct calls denied; no first-user-wins enrollment.
- Separate dev/prod projects and envs; previews dev only. Never expose privileged keys or run prod migrations during builds.
- Immutable published revisions, full-as-reported source catalog and missing-data report, stable IDs, logically isolated franchise records and custom-player IDs.
- Default Atlanta club; name/create/switch/archive franchises; no fork/season/week features.
- Grouped all-available-field editing, missing values not zero, no invented OVR/archetype recalculation, potential-staleness cues.
- Minimal player baseline/plan state already supports planned vs already-happened editing; C2 later adds lineup action/checklist UI. App-only notes/preferences and unsupported game-edit fields are classified separately from executable Madden actions.
- Autosave + saving/saved/failed/conflict; revision checks and pending-input protection on navigation/franchise switch/sign-out/session expiry. Preserve current-session retry input; no durable offline queue/restart promise. Consequential mutation retries are idempotent.
- Backup format envelope/validated atomic restore-new for all implemented C1B state; mutable IDs remapped, owner access not taken from export, source revisions recoverable or explicitly blocked. Every later feature extends round-trip tests. Malicious/oversized/invalid inputs leave no partial franchise; secrets excluded.
- Distinct published/provisional planning baseline versus owner-confirmed game baseline labels; never claim console sync. Define archive/resume behavior and player type/range/unit/nullable/game-editability validation.

Required tests:
- Unauthorized and cross-franchise read/write rejection, policy integration, archived-franchise behavior.
- Source unchanged by edit, two franchises evolving independently, custom-player identity/export restoration.
- Stale multi-device write conflict, network-save failure/lost-response retry, navigation/session expiry with unsaved input, missing field/type/unit validation, invalid backup/version/source revision/reference and mutable-ID remapping.
- Private cache/session boundaries and OAuth redirect/write authorization, catalog-backed non-Falcons creation, source import counts/reject report and repeat-import identity safety. See ACCEPTANCE.md A31–A41 for detailed fixtures.

Exit: integrated shell + actual persistence, not isolated demos. Full source count disclosed rather than forced to 3,116. Safe recovery/export instructions and environment setup recorded.

## Parallel lanes

After C1A and contract freeze: A owns auth/persistence/policies/migrations/domain types/lockfile; B owns assigned catalog/player/franchise UI against approved fixture adapters. Default is ONE integrated C1B delivery PR under WORKFLOW.md; lane commits/reports are inputs, not separate completed foundation checkpoints. A integrates only explicitly owned/authorized lane changes and reruns acceptance. Record any unmerged contract base; never pretend partial fixtures are primary-ready persistence.

## Non-goals

Depth chart rules, formation resolution, GM ranking/transactions, generated calls, public signup, offline sync, paid services. Do not implement half of a later phase while foundation approval is pending.

## Delivery

Each checkpoint: owned commit/push/mergeable PR, checks and manual owner scenarios, migrations/env status, handoff. Owner merges; code deploy and DB migration tracked separately.

## Launch

Use canonical [C1A](../LAUNCH_PROMPTS.md#c1a--responsive-shell-owner-visual-gate) or [C1B](../LAUNCH_PROMPTS.md#c1b--private-auth-data-and-franchise-foundation) with assignment header/shared instruction. PLAN.md's dependency table and WORKFLOW.md delivery mode are authoritative.
