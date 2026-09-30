# Positions and depth-chart mapping in Madden 26 / 27

**Read this before touching the slot vocabulary.** The depth-chart roles seeded in
[`src/domain/depthSlots.ts`](src/domain/depthSlots.ts) were written before Madden 26 changed the
position list, and several of them no longer exist under the names we use. This document records
what the game models, how an on-field spot maps to a depth-chart role, what we used to get wrong, and
what the fix touched. The migration itself has landed on this branch; the reasoning is kept because
it is what stops the vocabulary drifting again.

Researched **2026-09-30**; the position list was confirmed by the owner, who owns the game, and the
front shapes were read off civil.gg's alignment diagrams (§4).

---

## 1. The concept: primary positions vs depth-chart positions

Two different lists, and conflating them is what makes a depth-chart tool feel wrong.

**A primary position is a player's position.** One per player. It is what the player card shows, and
it drives progression, scheme fit, draft logic, free agency and trade value. EA calls these
**primary positions**.

**A depth-chart position is a job.** The depth chart is *longer* than the roster list because it adds
**package positions** — roles a formation consults instead of a roster position. EA calls these
**secondary positions**. A package position is not a player type: nobody is "a third-down back" on
their player card.

From the Madden 26 Gameplay Deep Dive:

> "Our depth chart positions in Madden 26 will also include new **primary positions** for Edge
> (LEDG & REDG) and SAM, MIKE and WILL linebackers, and a **secondary position** for Nose Tackle."

Two consequences that matter here:

- A player can occupy several depth-chart spots but only one roster position. That is the difference
  between our depth-chart layers and the `position` column on a player.
- Package positions resolve **by role, in priority order** — a formation asks for a slot receiver and
  the game checks `SLWR` before falling back to base `WR`. That is the inherit-from-role model in
  [`resolution.ts`](src/domain/resolution.ts).

**The architecture already matches this.** `situational: true` on a depth slot *is* the package
concept, and `roleCode` + `roleRank` *is* the role resolution. Only the vocabulary is stale.

---

## 2. The list

### Primary (a player's roster position)

| Side | Positions |
| --- | --- |
| Offense | `QB` `HB` `FB` *(optional)* `WR` `TE` `LT` `LG` `C` `RG` `RT` |
| Defense | `LEDG` `REDG` `DT` `SAM` `MIKE` `WILL` `CB` `SS` `FS` |
| Special | `K` `P` `LS` |

### Package (depth-chart only)

| Side | Positions | What it is for |
| --- | --- | --- |
| Offense | `SLWR` | The receiver who lines up off the ball inside |
| | `3DRB` | The passing/blocking back |
| | `PWHB` | The short-yardage and goal-line back |
| | `GAD` | **Gadget** specialist — unlocks extra plays for a Deebo/Hunter type |
| Defense | `RLE` `RRE` `RDT` | The three who rush kicks, and the sub-package rushers |
| | `NT` | The zero/one-technique in odd fronts and goal line |
| | `SUBLB` | The coverage linebacker in nickel and dime |
| | `SLCB` | The corner who covers the slot in nickel and dime |
| Special | `KOS` | Kickoff duty when it differs from the placekicker |
| | `KR` `PR` | Returners |

**Not a position:** "Two-Way Player" is a capability, not a roster position or a depth-chart row.
A two-way player simply holds a position on each side of the ball.

---

## 3. What changed in Madden 26

1. **`LE` + 3-4 outside linebacker → `LEDG` / `REDG`.** Edge covers defensive ends *and* 3-4
   outside linebackers, so you no longer change a player's position to move between 4-3 and 3-4.
   Stated reason: "You don't need to change positions between DEs and OLBs, as Mike and Will backers
   will be used in both schemes."
2. **`LOLB` / `MLB` / `ROLB` → `SAM` / `MIKE` / `WILL`.**
3. **Long snapper became a primary position** with its own rating — it stopped being a wasted roster
   spot.
4. **Nose tackle became a package position.**
5. **`GAD` added** (package), and **Two-Way** players added (not a position).

Everything else — `SLWR`, `3DRB`, `PWHB`, `RLE`, `RRE`, `RDT`, `SUBLB`, `SLCB`, `KOS`, `KR`, `PR` —
has been stable since at least Madden 19.

---

## 4. Mapping an on-field spot to a depth-chart role

**The authority is the diagram.** civil.gg renders each formation with the depth-chart role printed
on every spot, and those labels come from the game. A labelled diagram is the mapping; nothing here
should be inferred from a front's nickname.

### Reading a diagram

The alignment image is a **raster WebP, not DOM text**. The page is client-rendered, so its HTML
contains none of the labels — they are pixels. Asset pattern:

```
https://fatgvrcdozmbkxcwpwsc.supabase.co/storage/v1/object/public/assets/formation_macros/cfb27_def/<set>_<front>.webp
```

(840 × 388/408; the page's `<img alt>` is `"<Name> formation alignment — depth-chart positions"`.)
Read the labels by opening the asset URL directly; the page body cannot be scraped for them (§5).

Label format: **role + rank**, so `DT1` is `DT` rank 1, `DT2` is `DT` rank 2, `MIKE1` is `MIKE`
rank 1. Stripping the trailing digit gives the role; the digits give the rank. Two exceptions in
practice: `REDGE1`/`LEDGE1` are the `REDG`/`LEDG` roles, and where a formation shows the same role
twice it is expressing rank, not two different roles.

The diagram is drawn from the **offense's** view — the secondary deep at the top, the front at the
bottom — so the **right** edge shows up on the **left** of the screen. `REDGE1` is leftmost in a
3-4 front and `LEDGE1` rightmost; "left/right" in a role name is the defense's, not the viewer's.
Our seeds follow the same convention.

### Worked example — Falcons 3-4 Odd

From `civil.gg/playbooks/team/nfl/defense/falcons/3-4/odd`:

```
            FS1                 SS1
CB1                                  CB2
              WILL1     MIKE1
      REDGE1  DT1  NT1  DT2  LEDGE1
Personnel: 5 DL / 2 LB / 4 DB
```

Four rules fall out of it, and they are the ones our seed used to break:

1. **An EDGE counts as a lineman.** The game itself calls this front `5 DL / 2 LB / 4 DB` — the two
   edge defenders are DL, not linebackers. A 3-4 is therefore *5 DL + 2 LB + 4 DB*, not the
   3 DL + 4 LB we seed.
2. **A 3-4's interior is `DT`, `NT`, `DT`.** Not "two ends and a nose". The edge jobs sit outside
   as `LEDG`/`REDG`.
3. **A 3-4 uses two off-ball linebackers**, `MIKE` and `WILL`. There is no `SAM` on the field in
   this front.
4. **Below a four-man line the edge jobs are still linemen.** Nickel 2-4 presents `4 DL / 2 LB / 5 DB`
   and 3-3-5 Penny presents `5 DL / 1 LB / 5 DB`, so the rushers take the `RRE`/`RLE` package names,
   not `LEDG`/`REDG`. Only a *four-man* base line uses `LEDG`/`REDG`; a sub front's extra bodies are
   interior linemen or coverage linebackers.

### The fronts we seed, read off the diagrams

Screen order, as the diagram draws it. Pages are
`civil.gg/playbooks/team/nfl/defense/falcons/<set>/<front>`; the images are the `<set>_<front>.webp`
assets above.

| Formation | Front (screen order) | Off-ball LB | Personnel the page states | Verified |
| --- | --- | --- | --- | --- |
| 3-4 Base / Odd / Bear | `REDGE1 DT1 NT1 DT2 LEDGE1` | `WILL1 MIKE1` | 5 DL / 2 LB / 4 DB | diagram |
| 4-3 Over | `REDGE1 NT1 DT1 LEDGE1` | `WILL1 MIKE1 SAM1` | — | diagram |
| 4-3 Under | `REDGE1 DT1 NT1 LEDGE1` | `WILL1 MIKE1 SAM1` (walked up) | — | diagram |
| 4-3 Even 6-1 | `REDGE … LEDGE`, EDGE counted as DL | — | — | diagram |
| Nickel 2-4 | `RRE1 NT1 DT1 RLE1` | `SUBLB1 SUBLB2` | 4 DL / 2 LB / 5 DB | diagram |
| 3-3-5 Penny | five-man front family | one off-ball LB | 5 DL / 1 LB / 5 DB | diagram |
| Dime 2-3-6 | `RRE1 NT1 DT1 RLE1` family | one `SUBLB` | — | diagram |
| Quarter 3 Deep | `RLE RDT RRE` family | two `SUBLB` | — | layout only |

**Secondary, read off the same images.** Base fronts print `CB1` `CB2` `FS1` `SS1`; the sub fronts
add a third corner (`CB3`) or a second safety (`SS2`) rather than printing a `SLCB` role — the third
corner covers the slot (§7).

Renames throughout: `LE` → `LEDG`, `RE` → `REDG`, `LOLB` → `SAM`, `MLB` → `MIKE`, `ROLB` → `WILL`,
`NB` → `SLCB`. `RLE`, `RRE`, `RDT`, `NT`, `SUBLB`, `SLWR`, `3DRB`, `PWHB` keep their names.

---

## 5. What this repo got wrong

Every row below is fixed in the migration on this branch; the table is the record of the drift.

| We shipped | Madden 26/27 | Why it mattered |
| --- | --- | --- |
| `LE`, `RE` | **`LEDG`, `REDG`** | Base fronts bind roles the game no longer has, and 3-4 outside linebackers have no home in our model at all. |
| `LOLB`, `MLB`, `ROLB` | **`SAM`, `MIKE`, `WILL`** | Every defensive formation consults these. |
| `NB` | **`SLCB`** | The slot corner is a package position called `SLCB`. We invented `NB` — our own code comment says it consults `NB` "rather than inventing a depth chart role Madden may not have", which is exactly what we then did. |
| `H` (holder) | **not a position in either list** | We seeded a holder role, and the field-goal unit binds it. The punter holds. |
| `LS` flagged `situational` | **primary** | Confirmed by the owner: LS is a roster position, like K and P. |
| `GAD` missing | **package position** | Confirmed by the owner. Not modelled today. |
| `SUBLE` in the docs | **`SUBLB`** | A typo in [README.md](README.md) and [HANDOFF.md](HANDOFF.md); the code is right. |

The docs describe the vocabulary as "seeded from public knowledge, not verified against the game".
That honesty is why this was findable — but the list was also *wrong*, not merely unverified.

**Knock-on effects worth naming**, because a rename misses them:

- **The special-teams units bound the linebacker roles and `H`.** Four of the five units used
  `LOLB`/`MLB`/`ROLB`/`FS`/`SS` for their coverage jobs, and the field-goal unit bound a holder role
  `H` that no longer exists — the punter holds, so that spot now consults `P`.
- **Most presentation code is role-agnostic** and needs no change: `FormationDiagram` takes
  `highlightRoles` as data, and `/packages` filters on whatever code it is given. Two spots hardcode
  *offense* names — the "uses SLWR" badge in
  [`src/app/formations/page.tsx`](src/app/formations/page.tsx) and `derivePersonnel` in
  [`src/domain/families.ts`](src/domain/families.ts) — and the defensive rename touches neither.
- **The scraper cannot read the labels off the page.** [`scrape-playbooks.ts`](scripts/scrape-playbooks.ts)
  says "per-spot diagram labels are not published", and that is right in the way that matters: the
  page is client-rendered and the alignment is a **raster WebP**, so the role labels are pixels, not
  text. Scrubbing the page's HTML finds nothing. The labels *are* visible to a human, so the accuracy
  fix is not DOM scraping — it is a committed table of the shapes in §4, or OCR over the assets.
  Until then `buildDefenseSlots` lays a sub front out from its lineman count plus the §4 rules rather
  than from the printed labels.

---

## 6. Sizing the migration

Landed. The counts below are what the change touched:

| File | Occurrences | Nature of the change |
| --- | --- | --- |
| [src/data/seed/playbooks.ts](src/data/seed/playbooks.ts) | 308 | Role bindings + `eligiblePositions`, including the special-teams units |
| [src/domain/depthSlots.ts](src/domain/depthSlots.ts) | 45 | The vocabulary itself |
| [tests/fixtures.ts](tests/fixtures.ts) | 37 | Test fixtures |
| [src/lib/importers/civilPlaybooks.ts](src/lib/importers/civilPlaybooks.ts) | 25 | The defensive slot builder |
| [src/data/seed/roster.ts](src/data/seed/roster.ts) | 13 | Demo roster `position` values |
| [tests/civilPlaybooks.spec.ts](tests/civilPlaybooks.spec.ts) | 10 | Assertions naming roles |
| [src/app/transactions/page.tsx](src/app/transactions/page.tsx) | 5 | Position labels in the trade view |
| [tests/slotRanks.spec.ts](tests/slotRanks.spec.ts), [tests/impact.spec.ts](tests/impact.spec.ts) | 3 | Fixtures |

Roughly **450 occurrences**. Most were mechanical; the 3-4 restructure was not — and the seeded
fronts ended up changing shape as well as name, because the diagrams in §4 disagreed with what we
had invented from the front's nickname.

---

## 7. Still open — confirm in game

Each one either fixes a guess or retires a role.

**Settled this session**

- **The Nickel 3-3-5 tally is `5 DL / 1 LB / 5 DB`** (§4), and **3-4 Bear** uses the same five-man
  front family as 3-4 Base. Both read off the diagrams.
- **`H` is gone.** No Madden list has a holder, and the field-goal unit no longer binds one: the
  punter holds, so that spot consults the `P` role.

**Still open**

1. **Is `SLCB` ever printed on a front?** The sub fronts we seed — Nickel 2-4, 3-3-5 Penny, Dime
   2-3-6 — print three corners (`CB1`/`CB2`/`CB3`) and no slot-corner role, so the third corner
   covers the slot. `SLCB` is nonetheless a real depth-chart row (Madden 19 onward), which is why we
   keep it seeded; a formation may consult it directly even when the diagram does not name it.
2. **How many ranks does each position show?** We guessed — `QB` 3, `HB` 4, `WR` 5, `CB` 4, `TE` 3.
   These drive how deep the app plans and have never been read off the real screen.
3. **Are `LEDG` and `REDG` ranked separately** or as one pool?
4. **What does `GAD` do in our planner?** It is a real package position (CFB 26 added it; Madden 26
   carries it). Modelling it means deciding what it changes, since it does not consume a normal
   lineup spot.

---

## 8. Sources

- **EA SPORTS, "Madden NFL 26 Gameplay Deep Dive"** (17 Jun 2025) — primary positions for Edge
  (LEDG & REDG) and SAM/MIKE/WILL; the "secondary position" language.
  https://www.ea.com/games/madden-nfl/madden-nfl-26/news/madden-26-gridiron-notes-gameplay-deep-dive
- **ClutchPoints, "Madden 26 adding Two-Way players & more Depth Chart positions"** (18 Jun 2025) —
  the nine added or updated positions, including Long Snapper, and the note that DE/OLB position
  changes are no longer needed.
  https://clutchpoints.com/gaming/madden-26-adding-two-way-players-more-depth-chart-positions
- **civil.gg, Falcons defence** — the labelled diagrams in §4, supplied by the owner and read off the
  published WebP assets. Team index: `civil.gg/playbooks/team/nfl/defense/falcons`; the formations
  used here are `3-4/{cub,odd,over,under-4-tech,bear}`, `4-3/{even-6-1,over,under}`,
  `3-3-5/penny`, `nickel/2-4`, `dime/2-3-6`, `quarter/3-deep`.
  https://civil.gg/playbooks/team/nfl/defense/falcons/3-4/odd
- **civil.gg, CFB 26 Gadget guides** and **Operation Sports, "Madden 26 GAD position guide"** — what
  `GAD` is: a depth-chart slot for trick-play specialists who move between roles.
  https://civil.gg/tips/cfb-26-gadget-player-depth-chart
- **MaddenRatings.com, Madden 27 ratings** (Week 2, Sep 2026) — live positions: `REDG` (Myles
  Garrett), `LEDG` (Maxx Crosby), `MIKE` (Fred Warner), and an `LS` group. Confirms Madden 27 keeps
  the Madden 26 taxonomy.
  https://www.maddenratings.com/
- **IGN, "Player Positions — Madden NFL 19"** (Aug 2018) — the pre-26 baseline; still accurate for the
  package positions.
  https://www.ign.com/wikis/madden-nfl-19/Player_Positions
- **EA SPORTS, "Madden NFL 27 — Franchise Deep Dive"** (4 Jun 2026) — context, not positions:
  guaranteed contracts, void years, incentives, no-trade clauses, franchise/transition tags, RFA
  tenders, the Persona Engine. Relevant to the front-office phases.
  https://www.ea.com/games/madden-nfl/madden-nfl-27/news/madden-27-franchise-mode

**Not verified:** EA's own ratings feed does not serve Madden 26/27 — `m26-ratings` and
`m27-ratings` both return HTTP 500 from `ratings-api.ea.com/v2/entities` — so the list here comes
from EA's prose, the labelled diagram, and a live third-party ratings database rather than the
game's own data. It also means `npm run import:ratings` cannot pull Madden 27 ratings at all.
