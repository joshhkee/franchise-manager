# C0A — Independent Review Report

## Independence disclosure (read first)

This review was produced by the **same agent that wrote the C0A evidence register**. The approved
lane (D101 / [phases/00-independent-review.md](../../phases/00-independent-review.md)) intends a
*separate thread in its own worktree*. This report does **not** satisfy that independence intent and
must not be recorded as an independently satisfied C0B precondition on its own. It is offered as a
useful adversarial pass; a separately owned reviewer should still be run, or the owner should record
an explicit waiver.

Baseline reviewed: `main` @ `a364dda` (PR #1 merged).
Unmerged dependency disclosed: PR #2 (`spike/roster-import`) supplied the coverage facts used below.
Report integration mode: **separate owned PR** (this branch), not folded into the primary evidence PR.

## Source rights are unresolved for *both* sources (blocker)

- Claim: [C0A-source-evidence.md](../evidence/C0A-source-evidence.md) §2a treats reuse as settled by D106.
- Evidence: the review brief states plainly that "public accessibility and the owner's approval are not
  licenses. Are artwork and data rights separated?" D106 authorizes Civil.GG public play/art reuse, but
  (a) Civil.GG demonstrably asserts IP by gating schematics behind membership, (b) their formation/play
  images are re-hosted assets served from their storage bucket, and (c) the C0A register is **silent on
  EA's terms for the ratings data** even though the probe now scrapes all 1,911 records.
- Risk: a private single-owner app is low-exposure, but re-hosting third-party art is the highest-risk
  act and would be hard to unwind after the catalog is built on it.
- Proposed correction: keep art as **reference-by-URL or replaceable placeholders** with a text/personnel
  fallback that renders with zero third-party assets; add attribution; and record an explicit written
  owner **risk acceptance** for both Civil.GG art/data and EA ratings data, or seek permission.

## The free-agent gap is a product-scope blocker, not a data footnote (blocker)

- Claim: [SPEC.md](../../SPEC.md) GM War Room — "Search all permitted imported players including
  available free agents; report missing source coverage."
- Evidence: the probe found **0 of 1,911** records without a team. EA's ratings database covers signed
  players only.
- Risk: free-agent search is one of the few *unique* GM features; with no source it cannot be delivered
  as written.
- Proposed correction: owner question — (1) accept a reduced scope where free agency is manual entry,
  (2) fund a second source, or (3) drop free-agent search from C4A. Do not paper over it with an empty
  search result that looks like "no free agents exist".

## EA position labels are being conflated with Madden depth-chart slots (important)

- Claim: §1a describes the EA position objects as version-specific "position vocabulary".
- Evidence: EA's ratings taxonomy (MIKE/WILL/SAM/LEDG/REDG/LS/P/K) comes from a ratings database page.
  Nothing verifies it matches Madden 27's **depth-chart** slot list, its order, its rank limits, or its
  specialist precedence — which SPEC requires, and which C0A still lists as blocked.
- Risk: a plausible-looking vocabulary silently becomes the frozen C0B position enum, and the app's
  depth chart diverges from the game's menu.
- Proposed correction: label EA positions as *ratings taxonomy, unverified as depth-chart slots*;
  keep the depth-chart matrix explicitly open until in-game evidence exists.

## Source identity stability is unverified, and the endpoint is undocumented (important)

- Claim: SPEC requires reconciling identity "explicitly across source revisions. Names alone are not
  unique keys."
- Evidence: the probe's iteration comparison is **inconclusive** — the public endpoint returned empty
  after 6 retries. `availableIterations` suggests the API models revisions but does not prove id
  stability. The whole path depends on a scraped `buildId` that changes on every EA deploy.
- Risk: if ids are iteration-scoped, a naive import creates duplicate players across rating weeks and
  corrupts franchise plans.
- Proposed correction: C0B must specify identity reconciliation independently of id equality (e.g.
  explicit source-revision pinning + name/team/position/birthdate matching with owner-visible conflicts),
  and a fetch-failure policy that never records "no data" on a failed request.

## Missing archetypes will break the C4B fit features as specified (important)

- Evidence: `archetype` is absent for **445 / 1,911 (23%)** records.
- Claim at risk: C4B's "published/recorded archetype fit distinct from practical role rubric".
- Risk: missing-as-zero or missing-as-default bias in fit scoring (which C4B explicitly forbids).
- Proposed correction: C0B freezes an explicit missing-archetype policy; C4B must render "unknown
  archetype" rather than excluding or down-scoring those players.

## Single-project environment creates a real preview-write hazard (important)

- Claim: D103 + D105 permit one production Supabase project with automatic Vercel previews enabled.
- Evidence: [SETUP.md](../../SETUP.md) §5–6 requires preview environments to use development data, and
  PLAN C6A verifies preview/production env isolation. With one project there is no development data.
- Risk: every PR preview (including this docs-only one — a Vercel deployment already ran) can reach
  production credentials and mutate the owner's only franchise database. Policy integration tests are
  also left without a safe target.
- Proposed correction: configure the Vercel **Preview scope with no database credentials** so previews
  are inert, and run DB/policy tests against an isolated embedded database plus a dedicated test
  namespace — recorded in the C0B ADR.

## Diagram orientation and inherited-slot semantics remain unverified (important)

- Evidence: the register notes an alignment image whose alt mentions "depth-chart positions" and a FLIP
  control, but no left/right identity, coordinate set, or slot-mapping matrix was verified. SPEC's
  "offense line top, defense line bottom" is an owner/design rule, not a sourced fact.
- Risk: C3A could ship mirrored or mislabelled diagrams.
- Proposed correction: keep orientation explicitly unverified; require in-game or screenshot evidence
  before C3A claims parity, and make the data model carry an orientation/confidence field.

## Recovery risk is under-stated in the evidence register (important)

- Evidence: Supabase Free has **no automatic backups** and pauses after inactivity; the register records
  the free-project facts but not the operational consequence.
- Risk: the owner's only franchise data lives in the one project and can pause or be lost.
- Proposed correction: carry SETUP.md's manual export cadence and recovery drill into the C0B contract
  as a first-class requirement, with the backup envelope versioned from C1B rather than "later".

## Verified independently

- 1,911 records, **0 duplicate ids**, **32 teams**, 55–68 players per team (probe, PR #2).
- **0 unsigned players** in the payload — a genuine coverage gap, not a rendering artifact.
- Field completeness: only `archetype` (445) and `avatarUrl` (53) are missing; all other inspected
  fields are complete.
- EA position vocabulary as listed in §1a.
- The D107 rule (sort each primary position by overall rating) produces a sane chart for Atlanta.
- The `_next/data` route fetched every page without failure; the public `drop-api` route is unreliable.

## Remaining uncertainty

- Whether 1,911 is EA's complete player population; the ~3,116 figure is still unverified either way.
- Whether ids are stable across rating iterations.
- Madden 27 depth-chart slots, rank limits, eligibility, specialist precedence, practice-squad rules.
- Special-teams diagram feasibility.
- Civil.GG labels/coordinates as machine-readable data (they are images, not text).
- Rights position for both Civil.GG art/data and EA ratings data.

## Issues raised but not endorsed as blockers

- The depth chart generator (D107) sorting by OVR is a reasonable provisional heuristic (D096 covers it);
  it only becomes a fidelity risk if presented as the game's actual default.
- One Supabase project is an acceptable $0 constraint given a single owner; the hazard is the preview
  credential scope, not the project count.
