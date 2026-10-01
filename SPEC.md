# Franchise Manager — Product Specification

Status: approved product direction consolidated from D001–D101. Detailed engineering representation and research-dependent values remain gated; no permission to build in this planning thread.

## Authority

Read [DECISIONS.md](DECISIONS.md) for confirmed decisions, [FEATURES.md](FEATURES.md) for the original brief, [RESEARCH.md](RESEARCH.md) for evidence/gates, and [DESIGN.md](DESIGN.md) for proposed layouts. Specific later owner decisions supersede conflicting general feature wording. Proposed details below require review where marked; execution must not silently decide material product changes.

## Product boundary

A private Madden 27 companion for one owner playing solo against the CPU. Default Atlanta Falcons, multiple independent club franchises, desktop planning and excellent iOS Safari gameday use. It is not a save editor, game integration, public SaaS, league simulator, chatbot, or exact trade-acceptance predictor.

First payoff: plan depth chart and formation substitutions, then efficiently apply final actionable differences in Madden. Later deliver GM scouting/asset planning, Coach View, and explainable drive-oriented call sheets.

Fresh build: no existing application, import assets, or tests are assumed. Approximate source counts are unverified, not acceptance targets.

## Audit clarifications and implementation guardrails

The documentation audit refines engineering acceptance, not the owner's decision log. D001–D101 remain unchanged; the clarifications below prevent contradictory interpretations. Physical schema, thresholds, and research-dependent facts still belong to the named checkpoints. Prefer the smallest design that satisfies the invariants: a single application, ordinary database transactions/revision checks, and bounded undo records—not microservices, a generic workflow engine, or full event sourcing.

## Core state model — implementation-independent contract

### Source dataset

- Versioned immutable published records: game/version, source, source revision/date, imported coverage/schema, missing-field report, stable internal player identities, provenance.
- Preserve source identifiers; reconcile identity explicitly across source revisions. Names alone are not unique keys.
- Imported source is never silently rewritten by franchise edits or new ratings publications.
- New franchises select a baseline dataset; existing franchises do not automatically absorb later source updates.

### Franchise

- Owned by the single authorized account, logically isolated in one Supabase database (approved D077; physical schema reviewed at C0B).
- Name, selected club, dataset revision, selected playbooks/schemes, archive state, verification status, owner-created players, roster/asset state, lineup plans, call-sheet plans, shortlist/notes.
- No required season/week, schedules, standings, simulated progression, or franchise fork feature.
- Custom rookies/players must have independent IDs and be represented in exports. Exact archetype/attribute defaults require a missing-data-safe policy.
- Supported clubs come from the verified catalog; Atlanta is the creation default, not a hard-coded dependency in domain/UI rules. An existing franchise's club is not silently changed by switching franchises.
- Archive is non-destructive: do not delete state, assets, or pending changes. C1B documents whether archived franchises are read-only and how to resume them before implementation; no permanent-deletion workflow is implied.

### Confirmed baseline and working plan

- Baseline means the reference state for differences. Before game verification it is a published/provisional PLANNING baseline; after owner verification it represents the last owner-confirmed game facts. Use those distinct labels so the app does not call an unverified suggested chart 'confirmed in-game'. If source depth-chart ranks are absent, initial suggestions are explicitly provisional/editable, not advertised as Madden defaults; owner may establish that planning baseline before trusting differences.
- Plan expresses intended state; pending actionable differences derive from baseline versus plan, not an append-only list of clicks.
- Do not assume duplicating every database table is the right physical design. Choose a representation that preserves these semantics transactionally and can be tested.
- Owner can record a change that already happened: update relevant baseline and reconcile the plan without generating a redundant action or discarding unrelated pending work.
- Updating reality while conflicting pending work exists requires review; never silently erase a plan.
- Game-relevant edits use explicit intent. Lineup/sub edits default to planned changes. Player/roster corrections identify planned vs already happened. C1B already needs this small baseline/plan primitive for player editing; C2 adds lineup actions and checklist presentation rather than redesigning state.
- App-only preferences (theme, notes, pins/dismissals, drive templates, franchise name) save normally and never produce Madden checklist items. Editable biography/measurements/archetypes need a per-field game-editability classification: unsupported fields can be recorded as app facts, not claimed as executable Madden instructions.
- Baseline verification is an owner assertion, not a console sync claim. Confirming or undoing an app item changes the app's record only; undo never reverses a real game action. Confirming one item must not automatically label the whole franchise/source as game-verified. Before ownership the app remains usable for planning; test confirmations run against development fixtures and are not evidence of real Madden actions.

### Pending actions and dependencies

- Stable semantic actions refer to franchise, entity/slot, baseline value, planned value, prerequisites, validation state, and a revision/version.
- Repeated edits consolidate; reverting eliminates a pending difference.
- Incoming trade players may appear in plans; their lineup confirmations require transaction confirmation first.
- Unknown game support is not 'legal'. Research-limited actions must disclose/block their unsupported status appropriately.
- Confirm only the exact revision the owner reviewed. Stale confirmations from another device must not advance an outdated baseline.
- An individual checklist item is an executable action unit, not necessarily a database field. An ordered depth-chart list is one unit by default; confirming arbitrary ranks independently must not create duplicate/holey baseline lists. C0B/C2B may define smaller units only with verified game-menu operations and invariant-preserving transitions.
- Partial application means confirming some complete independent units while others remain pending. If only part of one ordered list was changed in Madden, let the owner record the actual valid list and recompute remaining differences; do not pretend arbitrary per-rank ticks are safe.
- Bulk review lists the exact selected units and any excluded/blocked units before submission. A confirmation request applies its complete reviewed valid scope atomically in prerequisite order; if a revision or prerequisite changed, apply none of that request and show a new review. Never silently skip items at submission. A selected prerequisite can be confirmed with its selected dependent only in this explicit ordered batch.
- Consequential mutations/confirmation/undo/import requests are retry-safe: repeating a request after a lost response must not apply a trade twice, duplicate a restored franchise, or double-advance history. Choose a small idempotency mechanism; do not infer success from a timeout.
- Cancel pending action restores its intended scope to baseline and previews dependent consequences.
- Undo confirmation is safe only if later dependent changes permit it; otherwise show a resolution workflow. Do not make blind rollback promises.
- Approved: preserve a small action history for undo while keeping the visible checklist consolidated. Define a bounded retention policy at C0B and what undo is still available; no unnecessary analytics or infinite full-state snapshots.
- Generate checklist items from actual game operations, not every changed derived display. An inherited formation player changing solely because of a depth-chart edit does not create a second formation-sub instruction. Explicit override set/reset changes do; even if an override currently resolves to the same player as inheritance, its persistence intent remains distinct. Test both cases.

## Lineups

### Depth chart

- Ordered per-position lists using verified Madden 27 labels, rank limits, and game-legal assignment eligibility.
- One primary listed roster position per player; primary depth-chart assignments may differ where game permits. A player can have primary and specialist roles.
- Owner's candidate primary/specialist list is recorded in DECISIONS.md; it is not an authoritative enum.
- Include active roster and practice squad. Practice squad remains separately visible and cannot silently enter active formations; promotion is a prerequisite.
- Initial release does not model injury/IR/inactives/fatigue.
- Drag + accessible move/select controls, picker search, selected player detail, relevant pending indicators.

### Formation substitutions

- First verified books: Falcons stock offense and defense. Expand later to all available Madden 27 stock playbooks with explicit coverage reporting.
- Formation slots contain verified coordinates, label, personnel role/mapping, and game/version source evidence. Book-specific/package variations must not be conflated merely because formation names match.
- Resolve inherited assignments from the current plan; preserve explicit formation overrides on chart edits.
- Show player name, number, OVR, slot role, and inherited/overridden/invalid status.
- Offense line at diagram top; defense line at diagram bottom. Exact source left/right orientation verified separately.
- Do not generalize WR3→SLWR1 across every formation. Mapping/precedence is per verified slot/formation, including rush/sub-LB/NT roles as applicable.
- Validate one distinct player per on-field slot and correct personnel count. Departed players and duplicates are visible conflicts with offered repairs; no silent override repair.
- Reset overrides has explicit scope (selected slot, selected formation; broader resets need deliberate confirmation).
- Changing a playbook retains its formation overrides/favorites/plans under stable versioned book/formation identities. It must not transplant overrides into a merely same-named formation in another book. Hide unavailable entries from the active book but retain them for switching back; preview impacted plans and block stale unsupported actions. Identical verified mappings may share catalog data, not mutable franchise overrides. Scheme changes independently recompute fit and do not reset personnel.
- Book/scheme selection is initially established with the planning baseline. Later game-relevant changes enter the checklist only through verified actionable configuration operations; switching a browsing filter is not changing the franchise's game configuration.
- Missing/uncertain inherited assignments stay visibly unresolved with suggested repairs (D094). Do not invent a starter or silently choose the highest OVR. Fixtures cover missing rank, eligibility uncertainty, and duplicate conflicts.
- Owner does not require dynamic route drawing. Source play art may be used only where permitted. Special-teams diagrams are conditional on verified feasibility; if infeasible, explain and obtain owner approval to skip. Custom playbooks are deferred.

## GM War Room

- Current/planned roster, manually known contract years/cap fields, unknown-value coverage, extension-awareness where data permits.
- Contracts are Madden manual facts, not silently substituted real NFL values. Scope is a ledger, optional manually entered cap summary, and visible years-remaining threshold flags with notes. Owner updates years manually. No inferred dead-cap/salary-engine/extension forecasts.
- Search all permitted imported players including available free agents; report missing source coverage.
- Filter by name/team/position/age/available attributes and distinguish game-archetype match from practical suitability.
- Side-by-side player comparison with shared fields and unknown labels.
- Trade Block: explained positional surplus/poor-fit candidates; never imply every off-scheme player should be traded.
- Trade Targets: other-team players with explained fit or position-relative athletic outlier reasons. Exact filters/thresholds are visible; insufficient samples/missing values handled explicitly.
- Pin, dismiss, notes. Approved persistent dismissal: stay dismissed until owner restores; do not resurrect automatically on every rerender.
- Owner-entered trades preview roster/asset effects; confirm only after Madden action. No generated packages or acceptance prediction.
- Draft picks are manually entered trade assets with explicit year, round, original team, current owner, and optional note. Unentered picks are unknown, not assumed available. No automatic season rollover or draft simulation.
- Sign/cut/practice-squad moves are secondary tools. Validate ownership, duplicates, and conflicts without claiming unknown eligibility/contract rules.
- Confirmed transactions update relevant league ownership and assets only within that franchise; no source/global-franchise mutation.

## Coach View

- Scheme & Playbook: seed verified Falcons default schemes where available (otherwise unknown + ask); owner edits schemes independently of books. Show verified game archetype match separately from practical role heuristics with provenance.
- Personnel Gaps: chosen formation needs, starters/backups, excessive role concentration; link to authoritative editors.
- Formation Identity: favorites/bread-and-butter sets, coherent look/personnel families, complementary concepts; coordinate with gameday plans rather than duplicate them.
- Do not equate the highest OVR with best suitability or make practical fit look like the game's official overall rating.

## Gameday

- Phone-first quick coaching reference for a lower-end experienced/intermediate player.
- Low input: select offense/defense and theme; situation fields are optional/useful controls, not mandatory play logs.
- Editable curated theme templates; owner can rename/customize plans and pin formations/plays. Initial target is three offense and three defense themes subject to verified useful coverage; future expansion is desired. A refresh action rotates eligible calls within the current theme, preserves pinned choices, and lightly avoids recently displayed menus using resettable current-session memory. Displayed does not mean called; no mandatory play log.
- Offensive families: under-center/play action, shotgun spread/quick game, motion/misdirection, restricted to verified supported plays.
- Offer THREE complementary eligible calls initially (fewer if insufficient verified coverage, never filler), with exact formation/play names, purpose, concise cue, expandable reads/disguise/risks/verified adjustments. Incompatible favorites stay pinned/browsable but are excluded; pinning does not override eligibility. Eligible pins compete within the same three slots; C5A defines deterministic >3-pin handling and exhaustion behavior without losing saved pins.
- C5A declares a theme×situation coverage grid and owner-reviewed bucket boundaries/unknown-context behavior; a theme need not handle every possible situation. At least one supported context per initial theme demonstrates three distinct complementary eligible calls, with refresh alternatives where available or explicit exhaustion.
- Resolve at C5A which roster view Gameday uses (planned vs last recorded), label the view, and expose pending/unresolved personnel. Do not silently treat a player in an unconfirmed deal as available in Madden. Menu-history reset/invalidation follows book/theme/side/franchise/template context, never a hidden used-play log.
- Defensive context: personnel + down/distance, field zone, tendency/focus, clock/score/game phase.
- Distinguish personnel grouping from formation appearance. Empty backfield does not alone establish 00 personnel; match receiving threats and actual/selected personnel, not an absolute 'never 3-4 against empty' rule.
- Do not promise CPU-proof counters, outcome probabilities, or unknown audible/custom-book support.
- Rules-only engine with versioned researched metadata, deterministic fixtures, reason trace, manual overrides, and confidence/coverage labels.
- No actionable suggestion from invented play metadata. Empty results explain why and offer safe browsing rather than generate nonexistent calls.
- Source play art is optional pending reuse validation; owner approved verified text/formation fallback with disclosed gaps (D078).
- iOS Safari portrait situation chips + short play cards; expandable optional context. No printing, season/week setting, offline-edit sync, or cached-offline promise initially.

## Data editing, persistence, access

- Next.js + Tailwind + Supabase + Vercel; strictly $0, no paid APIs/required domain or artificial keepalive jobs. Separate free dev/production projects if available; preview writes never hit production. Intentional owner merge authorizes app auto-deploy from the verified production branch; production migrations remain separate reviewed operations.
- GitHub OAuth, one allowlisted owner. Authentication and authorization enforced server-side and through database policies. A denied account must not receive private franchise data.
- Never expose privileged database/service keys to browser code, logs, backups, or docs.
- All available player fields editable within a franchise, with grouped UI and realistic validation/warnings. Missing values remain missing, not zero.
- Source/manual OVR and archetype values are not automatically recalculated. Flag possible staleness when relevant attributes change.
- Ordinary edits autosave with saving/saved/failed/conflict status. Consequential roster moves use explicit confirmation. Distinguish 'save this proposal in the app' from 'I completed this move in Madden'; a confirmation dialog must not advance the game baseline merely because a proposal was saved.
- Do not lose a pending edit by switching franchise, closing a dialog, navigating, or signing out while save is pending/failed: finish saving or offer retry/discard/stay, and preserve the input in the current session. Do not promise durable browser-restart recovery or queue unattended offline writes. On session expiry require reauthentication before retrying against the latest revision.
- Multi-device version/revision conflict handling; never silently overwrite a newer server state. Preserve local input for retry on network failure, without claiming offline-save support.
- Versioned franchise export and validated restore; approved restoration into a new franchise by default and explicit review for replacement. Test malicious/invalid/unsupported exports and dangling references. Export excludes auth credentials/secrets.
- Restore-new is a backup/recovery safeguard, not an implicit approval for a separate franchise-fork/experiment UI. Build a format envelope at C1B and extend/test it in EVERY feature checkpoint. It must round-trip all state implemented so far: baseline/plan, custom players, overrides, assets/proposals, notes/dismissals/favorites, drive templates, and any retained undo history. Current-session menu memory and credentials are excluded. Remap mutable franchise/entity IDs on restore while preserving source references; an export's owner ID never grants access.
- A backup references immutable dataset/playbook revisions with an explicit recovery strategy. Missing revisions fail safely with a repair/import plan, never bind silently to the newest catalog. Validate file size/schema/references before atomic commit so a failed restore leaves no partial franchise. Replacement preview/confirmation must occur before mutation; no need to build an import wizard or generic merge engine.
- Manual free-tier recovery/backup instructions required because inactivity pauses and automatic free backups are not guaranteed.

## Explicitly deferred/excluded

- Game-save import/export, console integration, automatic in-game changes.
- Public signup, shared leagues, social/community features, monetization.
- Generative AI, chatbot/copilot, paid AI/API dependency.
- Generated trade packages or acceptance prediction.
- Full league weekly maintenance, schedules/standings, season/week tracking, automatic draft/progression simulation.
- Franchise forks/experiments unless later approved.
- Injury/IR/gameday inactive/fatigue simulation.
- Print/PDF call sheets and offline editing/sync.
- Dynamic route reconstruction, custom-book fidelity claims, or proprietary formula replication without verification.

## Remaining research/engineering gates

- Physical state/event representation, bounded undo retention, and conflict-resolution fixtures at C0B; preserve confirmed semantics.
- Exact game labels/ranks/eligibility/mappings, special-teams feasibility, source reuse and import completeness at C0A/C3.
- Practical-fit/anomaly rubric and exact supported gameday templates/buckets at C4B/C5A; owner reviews examples.
- Tool/account/project/remote inventory and environment setup before consequential operations.
- Actual rendered long-name/collision, phone Safari behavior, and measured performance verified at execution checkpoints. Proposed targets in DESIGN.md are not unconditional guarantees.
