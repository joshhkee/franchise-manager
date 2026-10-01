# C0A — Source and Mechanics Evidence Register

Status: **initial evidence gathered; checkpoint not complete.** This register records what a fresh
execution thread could verify on **2026-10-02** using permitted browser/static inspection. It does
not claim game parity. Items marked *blocked* cannot be resolved without Madden 27 access, which the
owner does not currently have.

Evidence classes used below, per [RESEARCH.md](../../RESEARCH.md):

- **[Official]** — from an EA/official page.
- **[Observed]** — directly seen in a live page/DOM on the date above.
- **[Older-game context]** — prior Madden/NFL context, not proof of Madden 27 behavior.
- **[Hypothesis]** — a lead that still needs verification.

## 1. Player data source — EA official ratings

- **[Official][Observed]** `https://www.ea.com/games/madden-nfl/ratings` resolves to a page titled
  "Madden NFL 27 Player Ratings - Week 2" and states **"Showing 1911 results"**. The shell also
  exposes league/team filters (e.g. Buffalo Bills, Miami Dolphins, New England Patriots, NY Jets).
- **[Official]** The same page promotes Madden 27's **"Persona Engine"**, described as turning
  Franchise into a living, evolving league influenced by NFL athlete personalities. This is a
  version-specific franchise-mechanics claim worth tracking, not a confirmed depth-chart rule.### 1a. Player source — machine-readable API (resolved feasibility)

- **[Observed]** The ratings UI is backed by two documented-by-inspection endpoints:
  1. **Per-page JSON** (`ratingDetails.items`, 100 players/page, `totalItems: 1911`):
     `https://www.ea.com/_next/data/<buildId>/en/games/madden-nfl/ratings.json?franchiseSlug=madden-nfl&page=N`
     where `<buildId>` is read from the page's `__NEXT_DATA__.buildId`.
  2. **Direct drop-api** (first page only; **no** working offset/page/filter params):
     `https://drop-api.ea.com/rating/madden-nfl?locale=en&limit=100&iteration=madden-ratings-week-2`
     (`limit` is capped at 100 — a larger value returns HTTP 400 "Pagination".)
- **[Observed] Item schema** (stable for scraping): `id`, `firstName`, `lastName`, `birthdate`,
  `height` (in), `weight` (lb), `overallRating`, `college`, `handedness`, `age`, `jerseyNum`,
  `yearsPro`, `playerAbilities[]`, `avatarUrl`, `archetype{id,label}`, `team{id,label,imageUrl}`,
  `position{id,shortLabel,label,positionType}`, `iteration`, `availableIterations[]`, and `stats{}`
  with **full attribute ratings** (acceleration, agility, awareness, catching, carrying, blockShedding,
  breakTackle, …).
- **[Observed] Positions** are version-specific objects, e.g. `WR`/Wide Receiver, `QB`/Quarterback,
  `HB`/Halfback, `TE`, `LT/LG/C/RG/RT`, `LEDG`/Left Edge, `REDG`/Right Edge, `DT`, `MIKE`/Mike Backer,
  `WILL`/Weak Backer, `CB`, `FS`, `SS`.
- **[Observed]** ~20 pages cover all **1,911** records; a whole-roster scrape is feasible.
- Open gates: free-agent coverage (whether unsigned players appear), the relationship of 1,911 to the
  ~3,116 figure, and contract/salary fields (EA exposes no contract data in this payload).

## 2. Formation/playbook source — Civil.GG

- **[Observed]** Civil.GG is live and covers **Madden 27** (and College Football 27). Relevant routes:
  - `/playbooks/` — database landing.
  - `/playbooks/madden` — all Madden 27 playbooks.
  - `/playbooks/madden/formations` — all formations, Offense/Defense toggle.
  - `/playbooks/madden/plays` — all plays.
  - `/playbooks/madden/routes` — routes.
  - `/playbooks/coaching-adjustments?game=madden`, `/playbooks/abilities?game=madden`.
  - Formation detail: `/playbooks/madden/plays/<set-slug>/<formation-slug>`.
  - Play detail: `/playbooks/madden/plays/<set-slug>/<formation-slug>/<play-slug>`.
- **[Observed] Formation counts:** the offense view rendered **393** formation cards; the defense view
  rendered **58**. Each card carries an alignment image whose `alt` ends in "formation alignment".
- **[Observed] Filters:** Offense/Defense toggle, free-text search ("Search formations or sets..."),
  **set** filter, and **personnel** filter. Formation pages expose a **FLIP** control (orientation)
  and a "PLAYBOOKS WITH … (n)" cross-reference.
- **[Observed] Example offense formations / play counts:** Singleback Ace (53), Singleback Wing Slot
  (67), I Form Pro (72), Strong Close (40), Singleback Wing Tight (60), Singleback Y Trips (40),
  I Form Wing (52).
- **[Observed] Example defense formations:** 3-4 Bear, 3-4 Even, 3-4 Grizzly, 3-4 Odd, 3-4 Over,
  3-4 Over Ed, 3-4 Tite, 3-4 Tite 5 Tech, 3-4 Under, 3-4 Under 4 Tech, 4-3 Even 6-1, 4-3 Odd.
- **[Observed] Cross-reference example:** Singleback Ace appears in 6 playbooks — Balanced, Panthers,
  Run Balanced, Run Heavy, Run n Gun, West Coast. This directly supports the SPEC rule that identical
  formation *names* across books are not automatically equivalent personnel mappings.
- **[Observed] Slot/orientation evidence:** the alignment image `alt` reads
  "Singleback Ace formation alignment — **depth-chart positions**", i.e. depth-chart position labels
  are baked into the diagram image. No slot coordinates or labels are exposed as DOM text or a public
  structured API. Individual play pages show a play diagram image plus routes; no textual position map.

### 2a. Reuse / licensing (owner-authorized, residual risk noted)

- **[Observed]** Formation and play art is served from Civil.GG's public Supabase Storage bucket
  (paths such as `…/storage/v1/object/public/assets/formation_macros/cfb27/*.webp` and
  `…/storage/v1/object/public/plays_output/*.webp`). Publicly fetchable is **not** permission to
  redistribute.
- **[Observed]** The site states "Plays are free. Schemes are for members." Commercial schematics are
  gated behind membership. Terms/privacy links exist but a reuse grant was not found.
- **[Owner decision D106]** The owner authorized use of Civil.GG's **public** play and play-art data
  and confirmed we will **not** access member-only schematics. Recorded as an explicit owner
  authorization; residual licensing risk is noted (public availability is not a formal grant), so
  play art stays replaceable and attribution/source provenance is retained.

## 3. Depth chart and specialist slots

- **[Older-game context]** Madden depth charts historically use specialist designations such as SLWR
  (slot receiver), RLE/RRE/RDT (rush linemen), SUBLB, and SLCB; specialist charts are activated by
  formation, not game situation.
- **[Hypothesis] Blocked:** exact Madden 27 primary/specialist labels, rank limits, eligibility,
  specialist precedence, active vs practice-squad behavior, and formation inheritance require
  in-game or official Madden 27 evidence. Civil.GG does not expose these as structured data.
- **[Owner decision D107] Initial planning baseline:** auto-generate a *provisional* depth chart from
  the scraped roster by sorting each primary position by `overallRating` (ties broken deterministically),
  and leave specialist/secondary slots for manual owner edit. This is explicitly a **provisional
  PLANNING baseline per D096**, not the game's actual default chart, and remains editable.

## 4. Special teams

- **Blocked.** Feasibility (diagram availability, slot mapping) cannot be assessed without verified
  Madden 27 evidence. Per SPEC/PLAN, if infeasible this requires an explicit owner decision, not a
  silent skip.

## 5. Setup / environment inventory (non-secret)

- Repository: `https://github.com/joshhkee/franchise-manager`; default branch `main`; only `main` on
  the remote (older branch names in local refs are stale).
- `gh` authenticated as `joshhkee` (scopes `gist`, `read:org`, `repo`, `workflow`).
- Local tools present: Node **v26.7.0**, npm **11.19.0**, gh **2.101.0**.
- Local tools absent: `pnpm`, `corepack`, `docker`, `psql`, Supabase CLI.
- One Supabase Free project exists (owner-created, name recorded in the private execution record);
  only one free slot is available, so there is **no separate dev/prod project** (see DECISIONS).
- Vercel project exists; automatic preview deployments remain enabled by owner choice.
- Owner GitHub numeric ID is stored in the private execution record, not committed here.

## 6. Scope/authority note

Fresh build confirmed by the owner. A prior implementation exists in this repository's git history
but was deleted from `main`; it is **reference-only** and must not be treated as an approved baseline.
