# C0B — Contract and Fixture Specification (C0B-v2)

Version history: **C0B-v2 (2026-10-02)** adopts the accepted independent-review corrections CB-1
(identity reconciliation rules), CB-2 (minimum fixture chain) and CB-3 (declared retention constants);
it supersedes `C0B-v1` for C1B–C4A. No previously frozen behavior changes meaning, so the merged C1A
shell (`ff9975d`, which implements none of these semantics) remains valid against it. **C0B-v1
(2026-10-02)** was the initial freeze.

Status: **frozen near-term interfaces for C1B–C4A**, implementation-independent. This is the single
shared contract set the phase packet requires; no application code or physical schema lives here.
C1A is a visual shell and is not gated by domain interfaces. Amendments follow the change-control
rule in §12.

Authority: [SPEC.md](../../SPEC.md) semantics, [ACCEPTANCE.md](../../ACCEPTANCE.md) invariants,
[DECISIONS.md](../../DECISIONS.md) (Rounds 6–23), [PLAN.md](../../PLAN.md) dependency table,
[WORKFLOW.md](../../WORKFLOW.md) ownership and delivery. Where this document conflicts with a
confirmed decision, the decision wins; record the conflict instead of silently rewriting either.

C0A context carried in: Launch ratings baseline (D109), missing archetype = unknown (D110), reuse
risk accepted (D111), reinstated review and accepted corrections (D112), C0A accepted with
exceptions (D113), special-teams deferral (D114). Independent-review items IR-3…IR-11 map to the
sections and gates in §13.

## 1. Scope and non-goals

Frozen here (C0B-v1, extended by the C0B-v2 corrections):

- Source identity, revision pinning, and reconciliation outcome types (§2).
- Franchise isolation and the source/franchise/custom boundary (§2).
- The baseline / plan / pending-action / history state model and diff semantics (§3).
- Action units, partial application, bulk confirmation, cancel, and bounded undo (§4).
- Revision, conflict, idempotency, and unsaved-input contracts (§5).
- Formation inheritance/override resolution contract (§6).
- Transaction/proposal and asset semantics (§7).
- Backup envelope, restore-new, ID remapping, and missing-revision recovery (§8).
- Logical entities, commands, read models, and error taxonomy (§9).
- Persistence/migration ownership, test strategy, and tooling constraints (§10).
- Evidence gates and open owner questions (§11).

Not frozen here (owned by later checkpoints through reviewed amendments): physical schema and
migrations (C1B), exact game slot/eligibility rules pending the D113 evidence supplement (C2A/C3A),
special-teams data (C3B per D114), practical-fit rubrics and thresholds (C4B), gameday metadata,
theme grids, and the planned-vs-recorded roster-view choice (C5A).

Non-goals: event sourcing, a generic workflow/dependency scheduler, an offline queue or durable
offline edits, season/week state, generated trades or acceptance prediction, invented ratings
formulas, game-save integration, custom playbooks, print/offline sync (SPEC "Explicitly
deferred/excluded").

## 2. Source, identity, and isolation contract

**Source stays immutable.** Published records are versioned snapshots. No franchise operation may
mutate a source record or revision; franchise edits are franchise-scoped overlays or custom records.

- `SourceRevision`: `{source, revisionKey, capturedAt, coverageStatus: complete-as-imported |
  partial | unsupported, missingFieldReport, provenance, accessBasis}`. EA ratings use the Launch
  iteration (`1-base`) as the baseline revision (D109); other revisions remain selectable data, not
  defaults.
- `SourcePlayerRecord`: source-scoped fields including `sourceId`, name, team, position, birthdate,
  measurements, ratings, archetype (nullable), abilities, provenance. Source ids are treated as
  **revision-scoped**, not globally stable: the sample evidence (200/200 per iteration and
  cross-week id checks) is supporting, not a guarantee.
- **Reconciliation on import** classifies each incoming record as `matched`, `new`, or `conflict`
  (duplicate-name cases, ambiguous identity, or id reappearance with materially different data).
  Conflicts require owner-visible disposition before the revision can be pinned by a franchise;
  never auto-merge on names and never auto-split silently. Repeat import of the same revision is
  idempotent — no duplicate identities.
- **Fetch failure is not absence.** A failed or partial fetch records a retryable failure; it never
  marks a player/revision as missing and never partially pins a revision. This is IR-5.
- **Reconciliation keys (CB-1)**: identity is decided by a declared composite key — never names alone
  and never `sourceId` alone. Within one revision, `sourceId` identifies the record, and a repeated
  `sourceId` with materially different data is a `conflict`. Across revisions a record is `matched`
  only when the normalized composite key agrees (name plus at least one corroborating field —
  birthdate, team, or listed position — with every available corroborating field consistent);
  `sourceId` agreement with a contradictory key, several candidates agreeing, or any partial
  agreement is a `conflict` for owner disposition, never a silent `matched`; no key match is `new`.
  Custom players are never reconciled against source records. The composite key and its
  normalization are a declared constant of this contract (C1B records the concrete normalization it
  implements); changing them is a §12 amendment.
- **Coverage labels** distinguish (a) records imported from a source revision, (b) the source's
  actual published coverage, and (c) game-catalog coverage that has no evidence yet. The app never
  presents (a) as complete game coverage. This is IR-3.
- **Franchise isolation**: every mutable entity carries `franchiseId`. Cross-franchise and
  custom-source references are rejected server-side and by database policy (ACCEPTANCE A02/A03/
  A40). One logical Supabase database, one owner (D077/D103); no shared/global mutable state.
- **Custom players** get app-generated stable IDs in a namespace distinct from source IDs, are
  always represented in exports, and restore into new franchises with remapped mutable IDs.
  Unverifiable required fields default to explicit unknown/missing, never fabricated values.
- **Franchise dataset pinning**: a franchise pins one baseline dataset revision. New revisions are
  never absorbed automatically; a later pin change is an explicit, reviewed operation.

## 3. State model: baseline, plan, differences, intent

The app keeps three distinct layers per domain slice and derives the checklist from them:

1. **Baseline** — reference state for differences. Label per slice: `published/provisional` until
   the owner asserts in-game verification, then `owner_confirmed`. A confirmation never promotes
   other slices or the whole franchise to "game-verified" (SPEC; ACCEPTANCE A10/A41). Initial
   depth-chart suggestions generated from the source (D107) are provisional planning baseline data
   — editable and labeled, never advertised as the game's actual default (D096).
2. **Plan** — intended state. Pending differences are computed as `diff(baseline, plan)`, never as
   an append-only click log. A→B→C consolidates to A→C; reverting to A removes the pending action.
3. **History** — bounded app-record batches for undo only (§4), never a visible activity feed.

Intent is explicit where it can differ:

- Lineup/formation edits default to **planned**; player/roster corrections must declare **planned**
  or **already happened**.
- Recording an already-happened change updates the affected baseline slice, reconciles the plan,
  removes redundant actions, and preserves unrelated pending work. If conflicting pending work
  exists, surface the conflict for review — never silently erase a plan (ACCEPTANCE A13).
- **App-only facts** (theme, notes, pins/dismissals, templates, franchise name) save normally and
  never generate checklist items. Game-editable fields carry a per-field classification
  (`game_edit_action | app_fact`) that defaults to **app_fact (unverified)** until evidence exists;
  an unverified field never yields a fake game instruction (ACCEPTANCE C0A/C1B detailed list).
- **Unknown is not zero** and never a default archetype: missing OVR, ratings, archetype, number,
  or contract values render as unknown; source/manual OVR and archetype are facts, never
  recalculated (D051/D110; ACCEPTANCE A05).

Verification status is explicit and slice-scoped: `provisional_published`, `owner_confirmed`,
`recorded_app_fact`. The app never claims console sync.

## 4. Action units, confirmation, cancel, and bounded undo

**Action unit** (the checklist item) is the executable scope:

```text
ActionUnit = {
  unitId, franchiseId, type, scopeRef,
  baselineValue, plannedValue,
  prerequisites: [unitRef...],
  validation: ok | unverified | blocked(reason),
  revision
}
```

Default unit types and boundaries:

| Domain | Default unit |
|---|---|
| Depth chart | One position's ordered list (whole list). Rank-level ticks are **not** units. |
| Formation | One explicit override set or reset for one slot/formation. An inherited change from a chart edit is never a unit. |
| Player/roster | One recorded player field-group change; one promotion/demotion; one sign/cut. |
| Transaction | One completed transaction (roster/asset effects as one batch). |

Smaller units are allowed only when a verified game-menu operation preserves the invariant and the
contract is amended with evidence; otherwise the fallback is recording the actual valid intermediate
list (SPEC; ACCEPTANCE A31). A declared-reset broader than one formation/slot is a reviewed batch,
not a single click.

- **Consolidation**: repeated edits collapse; a no-op difference disappears.
- **Partial application** happens only between complete independent units, or by recording the
  actual valid list after a partial in-game change; the remaining diff is recomputed. Arbitrary
  per-rank confirmations must not create duplicate or holey baselines.
- **Submitting a unit/batch** revalidates the exact reviewed revision and prerequisites at apply
  time. A confirmation request carries the selected units; excluded/blocked units are visible in
  review and never silently skipped at submission. If a revision or prerequisite changed, the
  request applies **none** of its scope and requires a fresh review. A selected prerequisite may be
  confirmed together with its dependent only inside the same explicit ordered batch.
- **Confirmation is an app-record assertion** ("I did this in Madden"), not game synchronization.
  Confirming one item does not verify the franchise/source globally.
- **Cancel** discards the pending scope back to its baseline and previews dependent consequences.
- **Bounded undo**: keep, per franchise, only the batches that are both within the most recent
  **50 action batches** and no older than **30 days** — prune any batch older than 30 days or beyond
  the most recent 50, whichever prunes more. A batch stores minimal deltas (scope, before/after,
  revision, timestamps) and never full snapshots. Undo is offered only while its batch is retained
  and no later dependent change conflicts; otherwise show a resolution workflow. Undo corrects app
  records only and never reverses a real game action. Retained history is included in backups; both
  retention bounds are declared constants of this contract (see §5), and changing one is a normal
  reviewed change rather than a semantic change (D097; SPEC; ACCEPTANCE A12).
- **Prerequisite examples**: a pending incoming trade player cannot confirm a lineup unit until the
  transaction is confirmed; a practice-squad player cannot enter an active formation until a
  promotion unit exists and is confirmed; unsupported/unknown eligibility is disclosed, never
  presented as legal.

## 5. Revision, idempotency, and unsaved-input contract

- Each franchise has one monotonic `revision` integer, incremented by every committed mutation.
  Writes carry `expectedRevision`; a mismatch returns `stale_revision` with no mutation and a
  recoverable local input. No last-write-wins, no silent overwrite (D052; ACCEPTANCE A06/A33).
- Consequential mutations (confirm/cancel/undo, transactions, restores, imports, pin changes)
  carry a `requestId`. The server records applied request outcomes per franchise; a retry after a
  lost response returns the same effective result and never double-applies. Timeouts are never
  inferred as success. Request-outcome records are bounded to a declared **200 per franchise**,
  oldest pruned first; once pruned, a stale replay still fails safely on the revision check
  (ACCEPTANCE A34).
- **Declared retention constants (CB-3)**: undo history = the most recent 50 batches and 30 days
  (§4); request-outcome records = 200 per franchise. Both are contract constants; changing either
  is a §12 amendment, and C1B records the concrete values it implements.
- Autosave statuses: `saving | saved | failed | conflict`, shown truthfully.
- **Unsaved input**: on navigation, franchise switch, dialog close, sign-out, or session expiry,
  pending/failed input is preserved in the current session with retry/discard/stay choices; the app
  never claims unsaved work was saved. Session expiry rejects writes until reauthentication and
  then requires latest-revision review. No durable browser-restart recovery and no offline write
  queue are promised (D062; ACCEPTANCE A33).
- The revision/idempotency mechanism is deliberately small: ordinary transactions plus a revision
  column and request-outcome records — no event store or generic workflow engine.

## 6. Formation inheritance/override contract

- Stable identities are **book + formation + slot + source revision**, never formation name alone.
  Same-name formations in different books share catalog data only when verified equivalent; mutable
  overrides/favorites/plans are book-scoped (SPEC; ACCEPTANCE A36).
- Resolution inputs: current plan (chart assignments), pinned mapping catalog, explicit override
  records. Output shape:

```text
SlotResolution = {
  slot, source: inherited | override | none,
  resolvedPlayerId | null,
  status: ok | missing | conflict | invalid,
  role/rank, personnelCountOk, conflicts[departed|duplicate|ineligible|unresolved]
}
```

- Inherited slots recompute from plan edits; explicit overrides persist until reset. An
  override-vs-inheritance equality (same resolved player) still preserves the override's
  persistence intent and remains a distinct action when explicitly set/reset (ACCEPTANCE A32).
- A chart edit that only changes an inherited player creates **no** formation-sub unit.
- Duplicated player in the resolved eleven, departed override targets, missing ranks, and
  cross-franchise/practice-squad targets are visible conflicts with offered repairs; no silent
  override repair, no invented starter, no highest-OVR fallback (D019/D094).
- Reset scope is explicit (slot, formation); broader resets are reviewed batches.
- Slot identifiers remain **configurable and evidence-versioned**; the EA ratings vocabulary
  (WR/QB/MIKE/…) is not treated as the Madden 27 depth-chart slot enum until the D113 supplement
  supplies in-game evidence. This is IR-4, and it keeps C2A/C3A unblocked without guessing.
- Orientation and left/right identity are data fields with an evidence/confidence marker; no
  orientation parity claim before C3A evidence (IR-9).

## 7. Transactions, assets, and roster effects

- `TransactionProposal` is owner-entered (players/picks as explicit assets); the app validates
  ownership, duplicates, and bookkeeping, and previews roster/asset/lineup effects. No generated
  packages, no acceptance prediction (D029/D056).
- **Saving a proposal is not game completion.** Completion is a separate explicit confirmation that
  updates the baseline; until then, effects stay planned. Retries never apply a deal twice
  (ACCEPTANCE A18/A34).
- Pick assets: explicit year, round, original club, current owner, optional note; unentered picks
  are unknown, not available; no season rollover (D092).
- Contract ledger: manual years/cap values with coverage/unknown disclosure; no invented dead-cap,
  extensions, or rollover (D079).
- Sign/cut/practice-squad moves stay secondary and use the same unit/confirmation semantics;
  uncertain eligibility is disclosed, never implied legal (D080).
- A confirmed transaction updates that franchise only; dependent lineup/formation units become
  confirmable, and removing a player previews affected chart/override conflicts with repairs
  (D064; ACCEPTANCE A18/A19).

## 8. Backup envelope, restore, and recovery

- **Versioned envelope** (`envelopeVersion`, app contract version, exportedAt). Contents include
  all implemented state: baseline/plan, custom players, overrides/favorites, assets/proposals/
  contracts, notes/dismissals, drive plans/templates, and retained undo history. Excluded:
  credentials, session menu memory, ephemeral caches. Credentials/secrets are never written into an
  export (D053/D077; ACCEPTANCE A07/A35).
- **Restore defaults to a NEW franchise**: a new local franchise ID, mutable entity IDs remapped,
  source references preserved by source revision key. The export's owner identity grants no access
  (D077).
- **Validation before atomic commit**: envelope version, size, schema/types, references, cross-
  franchise or dangling IDs, and secret-like content are checked first; a failed restore leaves no
  partial franchise. Unsupported/newer envelopes fail safely with an explanation.
- **Missing source revision fails safely**: the restore lists the required revision and repair
  options (pin an available revision explicitly or re-import) and never binds silently to the
  newest catalog (ACCEPTANCE A35).
- Replacement of an existing franchise requires explicit review/confirmation; restore-new is the
  default and is not a franchise-fork feature.
- Envelope growth rule: every feature checkpoint extends round-trip coverage and this document's
  content inventory in the same delivery; no feature state waits until C6A to be backed up.
- Manual recovery cadence and pause-recovery steps live in [SETUP.md](../../SETUP.md) §8 and are
  referenced, not duplicated. IR-11 is owned here.

## 9. Logical entities, commands, read models, errors

Logical entities (semantics, not physical schema): `SourceRevision`, `SourcePlayerRecord`,
`CatalogFormation`, `CatalogPlay`, `Franchise`, `FranchisePlayer` (source-backed or custom),
`DatasetPin`, `BaselineSlice`, `PlanSlice`, `ActionUnit`, `ActionBatch` (history), `Override`,
`BookSelection`, `SchemeSelection`, `TransactionProposal`, `AssetEntry`, `ContractLedgerEntry`,
`DraftPickAsset`, `NotePreference`, `DrivePlan/Template`, `BackupEnvelope`. C1B owns the physical
schema that preserves these semantics; it may not redefine them. C1B's schema/migrations must be
traceable to these entities and the §2–§8 invariants — deviations are contract amendments, not
local reinterpretations.

Commands (minimal set; exact API names are implementation details of the same semantics):
franchise create/switch/archive/resume; dataset pin; player field edit (planned vs happened);
listed-position set; depth-chart list edit; formation override set/reset; unit confirm (single or
reviewed batch); cancel scope; undo batch; proposal save; transaction complete; asset/pick edit;
import revision; export; restore-new; restore-replace.

Read models: franchise summary/verification labels; roster view (known/unknown fields, coverage);
player detail; depth-chart view per position; formation resolution view (statuses above); checklist
view (units, prerequisites, excluded/blocked scope); proposal/asset view; backup validation/status.

Error/outcome taxonomy (must map to truthful UI states): `stale_revision`, `dependency_blocked`,
`validation_failed`, `unsupported_operation`, `unverified_operation`, `unauthorized`,
`cross_franchise_reference`, `source_revision_unavailable`, `backup_invalid`, `identity_conflict`,
`fetch_failed_retryable`, `idempotent_replay`.

UI fixture boundary: read models and commands are the only channel between UI and state. UI fixture
adapters are deterministic, labeled as fixtures, and replaced by real services before an integrated
checkpoint claims completion; UI never defines its own diff/override semantics, and each workflow
keeps one authoritative editor (DESIGN.md; WORKFLOW.md integrated delivery).

## 10. Persistence, tooling, and test strategy

- One Supabase database, one logical franchise isolation boundary; authorization enforced
  server-side and by database policy. Migrations are versioned files with a single owner (the
  integration/domain owner per WORKFLOW.md); no competing migration authors. Production migrations
  are separate reviewed operations with backup/rollback plans; never applied automatically during
  builds (D088).
- Environment isolation: local development and automated tests use an isolated local/embedded
  database, never production data. The Vercel Preview scope must not receive production write
  credentials or run production migrations; this is a requirement to configure and verify at C1B
  and C6A, not an already-verified fact (D103/D105; IR-10).
- Tooling constraints: use the single package manager present at C1A inspection (currently npm;
  no pnpm/corepack/docker per the C0A register) and do not introduce competing lockfiles or a
  second backend. Exact test runner/browser tooling is chosen and documented at C1A within free,
  locally reproducible constraints; docs-only PRs do not need a fake build job.
- Test strategy levels: (1) pure contract/unit tests for diff, consolidation, unit/partial/bulk
  semantics, resolution, reconciliation, and envelope validation; (2) database integration/policy
  tests on isolated local data with fixture namespaces; (3) browser/console/network checks when UI
  is affected; (4) owner manual scenarios per checkpoint; full integrated runs at dependency
  boundaries. Every feature checkpoint extends backup round-trip tests (ACCEPTANCE "Verification
  policy").
- Deterministic fixtures follow the C0B scenario matrix (§14) and the fixture-record list (§15);
  executing tests arrive at the owning code checkpoint, not here.

## 11. Evidence gates and open owner questions

| Gate / question | Needed by | Status |
|---|---|---|
| Madden 27 depth-chart matrix: exact labels/order/rank limits/eligibility/slots; orientation left/right evidence | C2A verified-ordering exit; C3A/C3B supplement; IR-9 | Open — D113 evidence supplement; owner has no game access yet |
| Representative Falcons mappings; stock/alternate book inventory; alternate-source contingency | C3A/C3B supplement (D113) | Open — D113 |
| Special-teams feasibility attempt and owner decision | C3B (D114 gate; D081) | Deferred with explicit ask-before-skip |
| Game-catalog coverage reporting vs EA published population | C1B/C3 coverage report (IR-3) | Contract fixes the labels; evidence later |
| Per-field game editability | C1B/C2A classification | Defaults to app-fact until evidenced |
| Archive read-only/resume behavior documented before implementation | C1B | Open — C1B documents (SPEC) |
| Gameday planned-vs-recorded roster view | C5A | Owner decision deferred (SPEC) |
| Practical-fit/anomaly thresholds, sample policy | C4B | Research/rubric gate (D057) |
| Preview credential isolation configured and verified | C1B/C6A (IR-10) | Requirement recorded; verification pending |

## 12. Change control

The contract has a single writer (the integration/domain owner role in WORKFLOW.md). Amendments are
reviewed changes to this document with an explicit version bump (`C0B-v2`, …) and a note of which
checkpoints are affected; a breaking change pauses dependent lanes until both use the same version.
Every checkpoint delivery record names the contract version it implemented. Later checkpoint
extensions (C4B rubrics, C5A metadata) become amendments or their own named extensions rather than
silent reinterpretations.

## 13. Independent-review traceability

| Review item | Contract home |
|---|---|
| IR-3 source vs game-catalog coverage | §2 coverage labels; §11 gate |
| IR-4 ratings taxonomy vs depth-chart slots | §6 configurable slot identifiers; §11 gate |
| IR-5 identity stability/reconciliation and fetch policy | §2 |
| IR-6 missing archetype precision | §3 unknown policy |
| IR-9 orientation | §6 evidence marker; §11 gate |
| IR-10 preview write isolation | §10 requirement + gate |
| IR-11 backup/recovery | §8 |
| CB-1 reconciliation keys | §2 |
| CB-2 minimum fixture chain | §15 |
| CB-3 declared retention constants | §4, §5 |

(IR-1, IR-2, IR-7, IR-8 are C0A process items closed by D113/D114 and the disposition update.
CB-1…CB-3 are the C0B/C1A independent-review corrections adopted as `C0B-v2`; dispositions are
recorded in [docs/checkpoints/C0B-C1A-REVIEW.md](../checkpoints/C0B-C1A-REVIEW.md).)

## 14. Scenario matrix

Executable tests arrive at the owning checkpoint; this matrix is the required behavior contract.
"Atomic" means a rejected request mutates nothing.

| # | Scenario | Required behavior | Owning checkpoint |
|---|---|---|---|
| 1 | A→B→C edits, then revert to A | Checklist consolidates to A→C, then no pending action | C2B |
| 2 | Baseline WR [A,B,C] → plan [C,A,B] | One ordered-list unit; confirmation yields valid ordered baseline | C2B |
| 3 | Partial application between units (WR confirmed, TE pending) | Both lists remain valid; TE pending | C2B |
| 4 | Only part of one list changed in game | Owner records actual valid intermediate list; remaining diff recomputed; no per-rank ticks | C2B |
| 5 | Bulk review with blocked units visible | Exact valid scope submitted atomically in prerequisite order; changed revision/prereq applies none; no silent skips | C2B |
| 6 | Lost response on confirmation, then retry | Same effective result; no double confirmation; timeout ≠ success | C1B/C2B |
| 7 | Pending incoming trade player + lineup unit | Dependent unit blocked until transaction confirmed; selected prerequisite+dependent apply in one ordered batch | C4A (fixtures from C2B) |
| 8 | Cancel pending scope with dependents | Scope returns to baseline; dependent consequences previewed | C2B |
| 9 | Undo accidental confirmation; later dependent change exists | Undo app-record only; dependency conflict offers resolution, never blind rollback | C2B |
| 10 | Record already-happened change amid a pending plan | Baseline updates, redundant action removed, unrelated plan preserved; conflicts surfaced | C2B |
| 11 | Two devices, stale confirm/write | `stale_revision`, no mutation, local input recoverable; refresh to latest | C1B |
| 12 | Session expiry mid-edit | Writes rejected until reauth; latest-revision review; input retained in-session | C1B |
| 13 | New source revision arrives; franchise pinned to old | Franchise unchanged; new pin only by explicit reviewed operation; new franchises may pin the new revision | C1B |
| 14 | Import with duplicate names / ambiguous identity; repeat import | `identity_conflict` requires owner disposition; no silent merge; repeat import idempotent | C1B |
| 15 | Fetch fails mid-import | Retryable failure; nothing recorded absent or pinned | C1B |
| 16 | Franchise A edit/trade | Franchise B and source records untouched; cross-franchise refs rejected | C1B/C4A |
| 17 | Custom player create → export → restore-new | Stable custom ID, remapped on restore, identity preserved | C1B |
| 18 | Chart edit changes inherited formation player | No formation-sub unit; explicit override set/reset still a unit even when resolved player matches | C3A |
| 19 | Book switch A→B→A | A overrides/favorites/plans retained; no same-name transplantation; unavailable entries hidden, retained | C3A |
| 20 | Duplicate/departed/missing in resolved formation | Visible conflict statuses with offered repairs; no silent substitution | C3A |
| 21 | Backup round-trip incl. history; corrupt/oversized/secret/foreign-ID inputs; missing source revision | All implemented state round-trips; invalid inputs rejected atomically; missing revision fails safely, never binds newest | C1B (extends every checkpoint) |
| 22 | Unauthorized account/session/privileged-path write | Denied; no private data exposure or cache leak | C1B |
| 23 | Player holds a legal primary + specialist role; same player resolves twice in one formation | Primary/specialist reuse allowed per verified rules; duplicate in the resolved eleven flagged, never silently resolved | C2A verified rules / C3A |

## 15. Required fixture records

Deterministic fixture data (not code) covering: source player complete; source player missing
number/contract/OVR/archetype; two same-named players with distinct IDs; free agent; custom rookie
with unknowns; two franchises from one snapshot plus a later revision; archived franchise with
pending state; primary+specialist reuse; duplicate-in-formation; missing specialist rank; departed
override; pending incoming trade; duplicate/concurrent asset use; unknown money vs zero; manual
pick with changed owner; two-device revision pair; invalid/corrupt/oversized/foreign backup;
  missing source revision. Each owning checkpoint wires the relevant records into its tests and names
  the seeded IDs in its delivery record.

**Minimum chain coverage (CB-2).** The end-to-end chain — transaction → depth chart → formation →
confirmation — must be provable from this minimum subset, each row closed by the named checkpoint:

| Chain step | Minimum records | Closed by |
|---|---|---|
| Transaction | pending incoming trade; duplicate/concurrent asset use; two-device revision pair | C4A (fixtures seeded from C2B) |
| Depth chart | source player complete; source player missing number/contract/OVR/archetype; baseline→plan ordered list; two-device revision pair | C2A/C2B |
| Formation | primary + specialist reuse; duplicate-in-formation; missing specialist rank; departed override; inherited-vs-explicit override diff | C3A |
| Confirmation | stale-revision atomic batch; lost-response retry; corrupt/oversized/foreign backup; missing source revision | C1B/C2B |

The remaining records above are still required by their owning checkpoints; these rows are the ones a
checkpoint may not defer past its own exit.

## 16. Delivery and next interfaces

This specification is the C0B deliverable ("one concise contract/ADR + scenario matrix; no
application code"). Delivery mode: single checkpoint PR against `main`, owner review/merge; the
contract version is recorded in [docs/checkpoints/C0B.md](../checkpoints/C0B.md). C1A starts only
after C0B is merged or explicitly owner-accepted; C1B implements against `C0B-v2` and records:
chosen test runner/browser tooling, physical schema/migrations, and the preview-isolation
configuration. Later checkpoints consume §14 rows assigned to them and extend the backup envelope
in their own PRs.
