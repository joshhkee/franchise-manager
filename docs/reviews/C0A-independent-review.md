# C0A — Independent Review Report

Status: executed by the separately owned review lane. This report **supersedes** the earlier same-thread
self-review that was merged as PR #3. The owner reinstated the independent review after initially
waiving it (D108); the decision-log correction is proposed in
[docs/checkpoints/C0A-REVIEW.md](../checkpoints/C0A-REVIEW.md) for the primary writer/owner to apply.

## Independence statement (read first)

- Produced by a **separate execution thread in its own isolated worktree** that did not author
  [docs/evidence/C0A-source-evidence.md](../evidence/C0A-source-evidence.md), the spike, or the
  Round 22 closure decisions. That is the operational independence definition used by D101 and
  [WORKFLOW.md](../../WORKFLOW.md); it is not an external or human audit.
- Delivery mode: **separate owned report PR** against `main`. The C0A evidence PR is already merged,
  so folding this report into it is no longer possible.
- The reviewer edits only this report and [docs/checkpoints/C0A-REVIEW.md](../checkpoints/C0A-REVIEW.md).
  `DECISIONS.md`, `SPEC.md`, `PLAN.md`, the register, and source contracts remain primary-writer/owner
  property per [phases/00-independent-review.md](../../phases/00-independent-review.md).
- **This report does not accept C0A.** C0B must not be recorded as "independent review dispositions
  complete" until the owner records dispositions for the items below.

Baseline reviewed: `main` @ `6351033` (PRs #1, #2, #3, #4 all merged). No unmerged dependency.
Live-source checks were performed on **2026-10-02**; live pages are mutable and every count below is
scoped to that date.

## How this review was independently verified

| Check | Method / exact reference | Result |
|---|---|---|
| Docs link/anchor integrity | Fresh parser over all 26 repo Markdown files: relative targets and heading anchors | 156 relative file links, 15 anchored links, **0 missing** |
| EA Launch population | `www.ea.com/_next/data/<buildId>/en/games/madden-nfl/ratings.json?franchiseSlug=madden-nfl&page=1&iteration=1-base` (site's own context) | `totalItems: 3111` on 2026-10-02 |
| EA weekly iterations | Same route, `iteration=madden-ratings-week-1/2/3` | 1,891 / 1,911 / **1,937** — weekly defaults are deltas and have already rolled to Week 3 |
| Unsigned-player interleaving | Launch pages 16 and 32 sampled (2 requests) | page 16: 47/100 unsigned; page 32: 9/11 unsigned — unsigned records are real and interleaved, not zero |
| Archetype UI (positive) | `.../ratings/player-ratings/jessie-bates-iii/13202` | "Weight 210lb / 95kg · **Archetype Zone - S** · Handedness Right" — row present |
| Archetype UI (negative) | `.../ratings/player-ratings/cam-heyward/10698` (Week 3 profile) | Height → Weight → Handedness; **no Archetype row** — gap persists at Week 3 |
| Civil.GG counts | `civil.gg/playbooks/madden/formations`, offense view | 393 formation-alignment images |
| Civil.GG counts | Same page, Defense toggle | 58 formation-alignment images |
| Civil.GG orientation claim | `civil.gg/playbooks/madden/plays/singleback/ace` | Alignment image `alt` = **"Singleback Ace formation alignment — depth-chart positions"**; FLIP control present; image served from the public Supabase bucket (`.../formation_macros/cfb27/singleback_ace.webp`) |
| Civil.GG play count / cross-ref | Same detail page | "ALL PLAYS (53 PLAYS)"; "PLAYBOOKS WITH SINGLEBACK ACE (6)": Balanced, Panthers, Run Balanced, Run Heavy, Run n Gun, West Coast |
| Civil.GG membership wording | Formation/list pages | "Plays are free. Schemes are for members." still displayed |

The current `buildId` (`DO3P1GxCuQJYTuXacQAJB`) is a fresh ephemeral value, not committed evidence — it
demonstrates again that scraping must discover it per deploy rather than pin it.

## Findings

### IR-1 — C0A is presented as closed while its delivery record and required outputs say otherwise (important)

- **Claim/document:** commit `6f9f0ba` "Close C0A …"; D108 (Round 22, "C0A closure"); C0A delivery
  record [docs/checkpoints/C0A.md](../checkpoints/C0A.md) — "State: **in progress — initial evidence
  register; checkpoint not complete.**"; required outputs in
  [phases/00-evidence.md](../../phases/00-evidence.md); PLAN.md C0B prerequisite "C0A and independent
  review dispositions".
- **Independent evidence:** the closure commit changed `DECISIONS.md`, the register, and the review
  record only — `docs/checkpoints/C0A.md` was not updated and still lists "Remaining C0A outputs not
  yet produced: Madden 27 depth-chart matrix, representative Falcons mappings, stock-book inventory,
  special-teams feasibility". The register's own opening line still says "checkpoint not complete".
  The Civil.GG alternate-source contingency report is also absent from the register. The merged tree
  therefore says both "closed" and "not complete".
- **Risk:** C0B can start from an ambiguous acceptance state; unresolved outputs quietly stop being
  tracked instead of being recorded as explicit exceptions.
- **Proposed correction / owner question:** record one of: (a) owner **acceptance with exceptions** —
  closed: player-source feasibility, reuse decision, Launch baseline; accepted exceptions: depth-chart
  matrix (blocked on game access), Falcons representative mappings, stock-book inventory, special-teams
  feasibility (see IR-2), alternate-source contingency — then update `C0A.md`/`START_HERE.md` status;
  or (b) leave C0A open until the outputs are produced. The reviewer cannot make this an acceptance.
- **Status:** open — owner question.

### IR-2 — Special-teams feasibility still lacks the required structured owner decision (important)

- **Claim/document:** [phases/00-evidence.md](../../phases/00-evidence.md) "Special-teams feasibility
  report. If not feasible, structured owner question before skipping."; D081; register §4
  ("Blocked"); C0A open items.
- **Independent evidence:** the register records the block but no owner question or decision exists in
  `DECISIONS.md` Round 22. No feasibility evidence beyond "requires Madden 27 access" was gathered.
  Independently confirmed relevant datum: the Launch payload does include K/P/LS player positions, so
  the *roster side* of special teams has source data; only diagram/slot feasibility is unresolved.
- **Risk:** silent scope reduction that D081 explicitly forbids; C3B's exit requires a special-teams
  result or a recorded owner-approved skip.
- **Proposed owner question (options):** (a) defer a bounded feasibility attempt to C3B and record the
  gap now; (b) attempt Civil.GG-only special-teams diagram/slot feasibility before C3B and report;
  (c) owner pre-approves skipping special-teams diagrams with a disclosed coverage gap. Selecting (c)
  now does not require Madden access; (a)/(b) keep the gate open.
- **Status:** open — owner question.

### IR-3 — "Full catalog" wording still risks source-import vs game-catalog conflation (important)

- **Claim/document:** register §1b "**`1-base` (Launch)** … the full catalog, including unsigned
  players"; D109; required output "Distinguish full import of a source from full coverage of the game
  catalog".
- **Independent evidence:** re-verified 2026-10-02: `1-base` is EA's full published ratings population
  (3,111). The weekly views are strict subsets (1,891 / 1,911 / 1,937) and the default view has already
  rolled to Week 3 — the published population is a revision-scoped snapshot, not a frozen game
  roster universe. Nothing in the payload evidences complete coverage of the game's roster universe
  (practice-squad behavior, in-season churn, future revisions).
- **Risk:** C1B's "permitted complete-as-reported player import" gets read as "complete game catalog",
  recreating the F14/A39 concern the checkpoint exists to prevent.
- **Proposed correction:** relabel the claim "EA's full **published** Launch ratings population as of
  the observation date"; keep **game-catalog** completeness a visible coverage item at C1B/C3. This is
  a precision fix, not a factual falsity — the register's header disclaimer is correct but the body
  wording drifts from it.
- **Status:** open — register wording (primary writer).

### IR-4 — EA ratings taxonomy is still conflatable with Madden 27 depth-chart slots (important; carried from R3)

- **Claim/document:** register §1a ("Positions are version-specific objects"); SPEC depth-chart
  requirements; register §3 blocked matrix.
- **Independent evidence:** the committed probe report shows the ratings vocabulary includes K/P/LS/SAM/FB
  position objects and archetype labels that use different group names than the position objects
  ("Field General - MLB", "Pass Coverage - OLB" vs MIKE/WILL/SAM). None of this is evidence of Madden
  27's depth-chart slot names, order, rank limits, or specialist precedence; no in-game evidence
  exists.
- **Risk:** a plausible vocabulary silently becomes the frozen C0B position enum and the app's depth
  chart diverges from the game menu.
- **Proposed correction:** annotate §1a as "EA ratings taxonomy — unverified as depth-chart slots";
  C0B keeps slot identifiers configurable and does not imply parity from the provisional D107 chart.
- **Status:** open — C0B correction (prior R3 carried forward unchanged).

### IR-5 — Identity stability is sample-verified, and the endpoint/fetch path is fragile (important; carried from R4)

- **Claim/document:** register §1b "[Observed] Player ids are stable across iterations: 200/200
  sampled ids"; SPEC identity-reconciliation requirement.
- **Independent evidence:** spot-checked id 21586 (Ja'Marr Chase) across `1-base`, week-1, week-2,
  week-3 — present in all. The committed probe compared only pages 1–2 per iteration (200 of ~3,100),
  and its own note calls the comparison inconclusive for `availableIterations`. The `buildId` changes
  per EA deploy (today's differs from anything committed), and the public `drop-api` route was already
  observed unreliable.
- **Risk:** iteration-scoped ids would create duplicates across rating weeks and corrupt franchise
  plans; a failed request recorded as "no data" would silently drop players.
- **Proposed correction:** downgrade "stable" wording to "sampled stable"; C0B specifies identity
  reconciliation independent of id equality (source-revision pinning + reconciliation keys + visible
  conflicts) and a fetch-failure policy that never records absence on a failed request.
- **Status:** open — C0B.

### IR-6 — D110 "in every iteration" overstates what was measured (suggestion)

- **Claim/document:** D110 "Archetype is `null` for 782 of 3,111 records **in every iteration** and on
  their profile pages."
- **Independent evidence:** the probe measured Launch only, plus sampled profiles. Reproduced the
  negative case at Week 3: Cam Heyward's profile still shows no Archetype row (so "no backfill so far"
  is supported), but per-iteration null counts were never measured and weekly totals differ. The
  "782 of 3,111" figure is Launch-specific.
- **Risk:** minor; C4B's missing-as-unknown policy is unaffected.
- **Proposed correction:** reword as "782 of the 3,111 Launch records; no backfill observed on the
  sampled week-2/week-3 profiles (2026-10-02)".
- **Status:** open — wording (primary writer).

### IR-7 — Register heading is glued to the preceding paragraph (suggestion, mechanical)

- **Claim/document:** register line 22: "…not a confirmed depth-chart rule.### 1a. Player source —
  machine-readable API (resolved feasibility)".
- **Independent evidence:** the `###` has no preceding newline, so "1a" renders as inline text, not a
  heading/anchor.
- **Risk:** link targets/readability only.
- **Proposed correction:** insert a newline before `### 1a.`.
- **Status:** open — mechanical (primary writer).

### IR-8 — START_HERE active-execution status is stale after four merged PRs (important)

- **Claim/document:** [START_HERE.md](../../START_HERE.md) lines 49 and 53: "All checkpoints: **not
  started**." and "Planning docs are local changes; audit changes are also docs-only and uncommitted."
- **Independent evidence:** PRs #1–#4 are merged (evidence, spike, self-review, closure); all planning
  docs are committed on `main`; this independent review is now executed. A new thread with no chat
  history reads `START_HERE.md` first and would conclude nothing has started.
- **Risk:** duplicated work, wrong baseline, or a reviewer being re-requested — this exact confusion is
  what the current owner reversal had to correct manually.
- **Proposed correction:** the owner/primary writer refreshes the active-execution-status section after
  the IR dispositions land (C0A accepted-with-exceptions or open; review executed; C0B next).
- **Status:** open — owner/primary writer.

### IR-9 — Diagram orientation and slot mapping remain unverified (important; carried from R7)

- **Claim/document:** register §2 "Slot/orientation evidence"; SPEC's "offense line top, defense line
  bottom" rule; C3A checkpoint.
- **Independent evidence:** the detail-page alignment image `alt` explicitly claims "depth-chart
  positions", but the labels are baked into a raster image — no DOM text, coordinates, or structured
  API. The FLIP control exists (orientation can change), and no left/right identity or slot matrix was
  verified.
- **Risk:** C3A ships mirrored or mislabelled diagrams presented as verified.
- **Proposed correction:** keep orientation/slot mapping explicitly unverified; require in-game or
  screenshot evidence before C3A claims parity; carry an orientation/confidence field in the data
  model.
- **Status:** open — C3A evidence gate.

### IR-10 — Preview write isolation is recorded but unverified (important; carried from R6)

- **Claim/document:** D103 (preview scope must not receive production write credentials or run
  production migrations), D105, PLAN C6A env-isolation check; register §5 "automatic preview
  deployments remain enabled".
- **Independent evidence:** no app or Vercel configuration exists yet, so nothing is verifiable at
  C0A. The prior self-review's concern is now the explicit D103 requirement.
- **Risk:** if unverified later, every PR preview touches the owner's only franchise database.
- **Proposed correction:** keep as a C1B setup verification and C6A acceptance item; do not treat
  the requirement's presence in DECISIONS as evidence it was configured.
- **Status:** researcher responded — requirement recorded; verification deferred to C1B/C6A.

### IR-11 — Backup/recovery consequence is recorded but must be carried into the C0B contract (important; carried from R8)

- **Claim/document:** register §5 (no automatic backups, inactivity pausing); SETUP.md §8 manual
  export/resume routine; phases/00-evidence.md C0B scope (versioned envelope, atomic restore,
  exact source-revision recovery).
- **Independent evidence:** SETUP.md §8 documents the owner routine and pause recovery; the register
  records the provider facts. Nothing in C0B yet commits the envelope/versioning semantics, and no
  drill exists.
- **Risk:** the only franchise data lives in one free project with no automatic backups; unbacked-up
  state added by later features would be lost.
- **Proposed correction:** C0B must make the versioned backup envelope, restore-new with ID remapping,
  and missing-source-revision handling first-class, with SETUP §8's cadence referenced in the ADR.
- **Status:** open — C0B.

## Prior findings re-checked (R1–R8 from the superseded self-review)

| Prior ID | Current status | Independent note |
|---|---|---|
| R1 rights | Closed — owner accepted risk as D111 | Verified live: Civil.GG art is served from a public bucket and the site still gates "Schemes" to members; keep art reference-by-URL/replaceable with text fallback. |
| R2 free agents / 1,911 | Closed — corrected; D109 | Independently re-confirmed: 3,111 Launch; 1,891/1,911 weekly; unsigned records interleaved (pages 16/32). The weekly default has since rolled to Week 3 (1,937) — pin the Launch iteration at import. |
| R3 taxonomy conflation | Carried → IR-4 | Still open; probe vocabulary confirms ratings taxonomy ≠ depth-chart slots. |
| R4 id stability | Carried → IR-5 | Sample-verified only; endpoint fragility remains. |
| R5 missing archetypes | Closed as N/A — D110 | Gap reproduced at Week 3 (Cam Heyward); see IR-6 for wording precision. |
| R6 preview write hazard | Carried → IR-10 | Now an explicit D103 requirement; verify at C1B/C6A. |
| R7 diagram orientation | Carried → IR-9 | Alt text confirms the claim is baked into imagery; no structured slot data. |
| R8 backups | Carried → IR-11 | SETUP §8 routine exists; C0B must carry it into contract semantics. |

## Independently verified claims

- EA Launch (`1-base`) is EA's full published ratings population: **3,111** records (endpoint
  `totalItems`), consistent with the committed probe.
- Weekly iterations are partial deltas: **1,891** (week 1), **1,911** (week 2), **1,937** (week 3);
  the live default view now shows Week 3.
- Unsigned players are real and numerous: sampled Launch pages contain 47/100 and 9/11 unsigned
  records; the "zero free agents" reading remains fully retracted.
- EA's own UI agrees with the payload on archetypes: Jessie Bates III (Zone - S) renders the row;
  Cam Heyward still renders none (Week 3).
- Civil.GG: **393** offense / **58** defense formation cards; Singleback Ace detail alt exactly
  "Singleback Ace formation alignment — depth-chart positions"; 53 plays; 6 playbooks (Balanced,
  Panthers, Run Balanced, Run Heavy, Run n Gun, West Coast); public-bucket art URL.
- Committed documents pass a fresh link check (156 relative links, 15 anchors, 0 missing).
- No scope creep in C0A deliverables: the spike is explicitly throwaway, and no app code, trade
  generation, season tracking, custom books, print/offline sync, or generative-AI work appears.

## Remaining uncertainty

- Madden 27 depth-chart slots, rank limits, eligibility, specialist precedence, practice-squad rules.
- Special-teams diagram/slot feasibility.
- Civil.GG labels/coordinates as machine-readable data (imagery only; FLIP control exists).
- Per-iteration archetype null counts; whether EA backfills higher-OVR gaps later.
- Identity stability beyond sampled pages.
- Game-catalog coverage vs EA's published population (see IR-3).

## Review-question coverage (no finding raised)

- **State design (differences, partial confirmation, undo/dependencies, conflicts):** not assessable at
  C0A — no contracts exist yet; the C0B ADR is the first artifact to review read-only.
- **Phone call sheet / jersey-circle accessibility:** DESIGN-level concerns; no C0A output conflicts
  with them. Review at C1A/C3/C5 per PLAN.
- **Free-tier pausing/OAuth bootstrap:** provider facts and D103/D105 constraints recorded; see
  IR-10/IR-11 for the items that must not be treated as verified.
- **Excluded work creeping in:** none found.
- **Dependencies/ownership for a no-history thread:** explicit in PLAN/WORKFLOW/LAUNCH/HANDOFF;
  weakened only by IR-8's stale status.

## Proposed corrections summary (primary writer/owner applies; this lane cannot)

1. Record the owner's reinstatement of the independent review, superseding the D108 waiver (proposed
   D112 text in the lane record).
2. Reconcile C0A closure status with `docs/checkpoints/C0A.md` and `START_HERE.md` (IR-1, IR-8).
3. Answer the special-teams owner question (IR-2).
4. Relabel "full catalog" and the ratings-taxonomy caveat; fix the heading glue (IR-3, IR-4, IR-6, IR-7).
5. C0B carries identity reconciliation, backup/recovery, and preview-isolation requirements
   (IR-5, IR-10, IR-11); C3A carries the orientation gate (IR-9).
