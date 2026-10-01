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
  version-specific franchise-mechanics claim worth tracking, not a confirmed depth-chart rule.
- Open gates:
  - The **1,911** figure is a displayed result count, not a confirmed dataset size. Dynamic loading,
    filters, free-agent coverage, and the ~3,116 figure remain **unverified**.
  - **Blocked:** underlying field schema, stable player IDs, jersey numbers, contract fields, and a
    reproducible permitted import path. The page is JS-rendered and exposes no static machine-readable
    dataset in the fetched HTML.

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

### 2a. Reuse / licensing (unresolved — owner decision required)

- **[Observed]** Formation and play art is served from Civil.GG's public Supabase Storage bucket
  (paths such as `…/storage/v1/object/public/assets/formation_macros/cfb27/*.webp` and
  `…/storage/v1/object/public/plays_output/*.webp`). Publicly fetchable is **not** permission to
  redistribute.
- **[Observed]** The site states "Plays are free. Schemes are for members." Commercial schematics are
  gated behind membership. Terms/privacy links exist but a reuse grant was not found.
- **Gate:** C0A must establish permitted access/reuse for labels/coordinates/art, or adopt an
  alternate source, before any ingestion approach is committed. Do **not** infer license from public
  availability. This blocks C3A/C3B art handling and the C0B source schema.

## 3. Depth chart and specialist slots

- **[Older-game context]** Madden depth charts historically use specialist designations such as SLWR
  (slot receiver), RLE/RRE/RDT (rush linemen), SUBLB, and SLCB; specialist charts are activated by
  formation, not game situation.
- **[Hypothesis] Blocked:** exact Madden 27 primary/specialist labels, rank limits, eligibility,
  specialist precedence, active vs practice-squad behavior, and formation inheritance require
  in-game or official Madden 27 evidence. Civil.GG does not expose these as structured data.

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
