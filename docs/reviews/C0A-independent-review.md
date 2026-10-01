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

## R1 — Source rights: owner-accepted risk, with a portability constraint (resolved)

- Claim: [C0A-source-evidence.md](../evidence/C0A-source-evidence.md) §2a treats reuse as settled by D106.
- Owner position: **accepted.** This is a personal, non-commercial project and sources will be
  referenced on the site. This is recorded as an explicit risk acceptance rather than an open blocker.
- Residual engineering constraint (not a rights objection): keep art **reference-by-URL or replaceable**,
  with a text/personnel fallback that renders with zero third-party assets, so a future takedown, license
  change, or bucket move cannot break the catalog. Attribution is rendered wherever source data appears.
- Status: owner accepted limitation.

## R2 — Free-agent gap: resolved (closed)

- Claim: [SPEC.md](../../SPEC.md) GM War Room — "Search all permitted imported players including
  available free agents; report missing source coverage."
- **Retracted finding.** The earlier "0 free agents" result was an artifact of probing the **week-2**
  iteration, which only contains players under contract that week.
- Corrected evidence: the **Launch (`1-base`) iteration reports 3,111 records, of which 1,240 have no
  team** — the unsigned/free-agent population (e.g. Bobby Wagner, Tyreek Hill, Joey Bosa, Joe Mixon).
- Residual requirement: the import must take the **Launch iteration as the source baseline**, not a
  weekly one, and report which revision a franchise is pinned to. Weekly iterations are deltas
  (week-1: 1,891, week-2: 1,911), so importing a weekly iteration would silently drop free agents.
- Status: corrected.

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

## R5 — Missing archetypes are a real, quantified gap (important, open)

- Claim: archetypes should be present for every player; C4B needs "published/recorded archetype fit
  distinct from practical role rubric".
- Confirmed mechanism: the profile page renders the archetype as a labelled row directly after Weight —
  verified on `player-ratings/jessie-bates-iii/13202` → "Weight 210lb / 95kg · **Archetype Zone - S** ·
  Handedness Right", and the Launch payload carries the same value. So the API and UI agree.
- Corrected evidence: `archetype` is null for **782 / 3,111 (25%)** records, concentrated at DT 286,
  WR 215, QB 61, MIKE 48, RT 41, LEDG 32, LT 32, REDG 30, CB 26, C 11.
- Counterexample supplied for owner confirmation: **Cam Heyward** (DT, Steelers, id 10698, 95 OVR) — null
  in the Launch payload and no Archetype row on his Week 2 profile or Launch tab. Same for Derrick Brown
  (96), Creed Humphrey (95), Lamar Jackson (94), Trent McDuffie (94), Vita Vea (94).
- Risk: missing-as-zero or missing-as-default bias in fit scoring (which C4B explicitly forbids).
- Proposed correction: owner confirms whether these are genuine EA gaps; C0B freezes a missing-archetype
  policy; C4B renders "unknown archetype" rather than excluding or down-scoring those players.
- Status: open — awaiting owner input on the counterexample.

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

- **3,111** records at the Launch iteration, **0 duplicate ids**, 32 clubs plus 1,240 unsigned players.
- **Free agents are present** (1,240 no-team records) once the Launch iteration is used.
- **Player ids are stable across iterations:** 200/200 sampled ids from each of `1-base`, week-1 and
  week-2 also appear in the Launch population.
- Field completeness: only `archetype` (782) and `avatarUrl` (124) are missing; every other inspected
  field is complete, including the 55-key `stats` attribute block.
- Archetype placement in the UI confirmed as a labelled row after Weight (Jessie Bates III = "Zone - S").
- The D107 rule (sort each primary position by overall rating) produces a sane chart for Atlanta.
- The `_next/data` route fetched every page without failure; the public `drop-api` route is unreliable.

## Corrections issued to the C0A evidence register

- §1a's "total 1,911" is the **week-2** count, not the catalog size. Correct figure: **3,111** at the
  Launch iteration, which also resolves the long-standing ~3,116 discrepancy in FEATURES.md.
- The register implied the player source omits free agents. It does not — 1,240 unsigned players exist.
- The correct import baseline is the **Launch iteration**; weekly iterations are partial deltas.

## Remaining uncertainty

- Why 782 records (25%) have a null archetype, concentrated in DT/WR/QB — owner counterexample pending.
- Madden 27 depth-chart slots, rank limits, eligibility, specialist precedence, practice-squad rules.
- Special-teams diagram feasibility.
- Civil.GG labels/coordinates as machine-readable data (they are images, not text).

## Issues raised but not endorsed as blockers

- The depth chart generator (D107) sorting by OVR is a reasonable provisional heuristic (D096 covers it);
  it only becomes a fidelity risk if presented as the game's actual default.
- One Supabase project is an acceptable $0 constraint given a single owner; the hazard is the preview
  credential scope, not the project count.
