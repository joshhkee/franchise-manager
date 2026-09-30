# Positions in Madden 26 / 27

**Read this before touching the slot vocabulary.** The depth-chart roles seeded in
[`src/domain/depthSlots.ts`](src/domain/depthSlots.ts) were written before Madden 26 changed the
position list, and several of them no longer exist under the names we use. This document records
what the game actually models, what we got wrong, and what it will take to fix it.

Last researched **2026-09-30** against Madden 26 and 27 sources (see §8).

---

## 1. The concept: primary positions vs depth-chart positions

There are two different lists, and conflating them is what makes a depth-chart tool feel wrong.

**A primary position is a player's position.** Every player has exactly one. It is what the player
card shows, and it drives progression, scheme fit, draft logic, free agency and trade value. EA
calls these **primary positions**.

**A depth-chart position is a job.** The depth chart is *longer* than the roster list because it adds
**package positions** — roles a formation consults instead of a roster position. EA calls these
**secondary positions**. A package position is not a player type: nobody is "a third-down back" on
their player card.

The Madden 26 Gameplay Deep Dive states it directly:

> "Our depth chart positions in Madden 26 will also include new **primary positions** for Edge
> (LEDG & REDG) and SAM, MIKE and WILL linebackers, and a **secondary position** for Nose Tackle."

Two consequences that matter for this app:

- A player can occupy several depth-chart spots, but only one roster position. That is exactly the
  difference between our `game`/`plan` depth-chart layers and the `position` column on a player.
- Package positions are resolved **by role, in priority order** — a formation asks for a slot
  receiver, and the game checks `SLWR` before falling back to the base `WR` list. That is precisely
  the inherit-from-role model in [`resolution.ts`](src/domain/resolution.ts).

**The architecture already matches this.** `situational: true` on a depth slot *is* the package
concept, and `roleCode` + `roleRank` *is* the role resolution. What is stale is the vocabulary, not
the model.

---

## 2. The list

### Primary (a player's roster position)

| Side | Positions |
| --- | --- |
| Offense | `QB` `HB` `FB` `WR` `TE` `LT` `LG` `C` `RG` `RT` |
| Defense | `LEDG` `REDG` `DT` `SAM` `MIKE` `WILL` `CB` `SS` `FS` |
| Special | `K` `P` `LS` — see the open question in §7 |

### Package (depth-chart only)

| Side | Positions | What it is for |
| --- | --- | --- |
| Offense | `SLWR` | The receiver who lines up off the ball inside |
| | `3DRB` | The passing/blocking back |
| | `PWHB` | The short-yardage and goal-line back |
| Defense | `RLE` `RRE` `RDT` | The three who rush kicks, and the sub-package rushers |
| | `NT` | The zero/one-technique in odd fronts and goal line |
| | `SUBLB` | The coverage linebacker in nickel and dime |
| | `SLCB` | The corner who covers the slot in nickel and dime |
| Special | `KOS` | Kickoff duty when it differs from the placekicker |
| | `KR` `PR` | Returners |

Adjacent things that are **not** in the above and are not modelled: `GAD` (a "Gadget" specialist
slot — Deebo Samuel, Travis Hunter types — that unlocks extra plays) and **Two-Way Player**, which
lets one man hold a position on both sides of the ball.

---

## 3. What actually changed in Madden 26

1. **`LE` + 3-4 outside linebacker → `LEDG` / `REDG`.** Edge now covers both defensive ends and
   3-4 outside linebackers. The stated point of it: "You don't need to change positions between DEs
   and OLBs, as Mike and Will backers will be used in both schemes." A 3-4 outside linebacker's
   roster position is now an EDGE, not an OLB.
2. **`LOLB` / `MLB` / `ROLB` → `SAM` / `MIKE` / `WILL`.** The three off-ball linebacker jobs, named
   the way a defense names them.
3. **Long snapper promoted to a real position**, with its own rating. Community reaction was framed
   as LS no longer being "a waste of a roster spot".
4. **Nose tackle became a secondary (package) position** rather than a base one.
5. **`GAD` and Two-Way Player added.**

Everything else — `SLWR`, `3DRB`, `PWHB`, `RLE`, `RRE`, `RDT`, `SUBLB`, `SLCB`, `KOS`, `KR`, `PR` —
has been stable since at least Madden 19, which is why the older guides are still useful for those.

---

## 4. What this repo gets wrong

| We ship | Madden 26/27 | Why it matters |
| --- | --- | --- |
| `LE`, `RE` | **`LEDG`, `REDG`** | Our base fronts bind roles the game no longer has. A 3-4 outside linebacker has no home in our model at all. |
| `LOLB`, `MLB`, `ROLB` | **`SAM`, `MIKE`, `WILL`** | Every defensive formation in the seed consults these. |
| `NB` | **`SLCB`** | Nickel corner is a package position called `SLCB`. We invented `NB` — our own code even says it consults `NB` "rather than inventing a depth chart role Madden may not have", which is exactly what we then did. |
| `H` (holder) | **not a Madden depth-chart position** | We seeded a holder role. Neither the Madden 19 list nor the Madden 26/27 list contains it. |
| `LS` flagged `situational` | **primary** (probably) | We treat the long snapper as a package role; the evidence says it is a roster position now. See §7. |
| `SUBLE` in the docs | **`SUBLB`** | A typo in [README.md](README.md) and [HANDOFF.md](HANDOFF.md). The code is correct. |

Our typo is not the only artefact: the docs describe the vocabulary as "seeded from public
knowledge, not verified against the game". That honesty is why this was findable at all — but the
list was also *wrong*, not merely unverified, and the two should be distinguished.

Two knock-on effects worth naming, because they are easy to miss in a rename:

- **The special-teams units bind `H`.** The seeded field-goal unit asks for a holder, so if the
  holder role goes away, that unit has to be re-bound — the punter is the holder in practice.
- **Most of the presentation layer is role-agnostic and needs no change.** `FormationDiagram`
  takes `highlightRoles` as data, and `/packages` filters on whatever role code it is given. Two
  spots do hardcode *offense* role names and will need review if the offense ever changes:
  the "uses SLWR" badge in [`src/app/formations/page.tsx`](src/app/formations/page.tsx) and
  `derivePersonnel`'s back/receiver counting in [`src/domain/families.ts`](src/domain/families.ts).
  The defensive rename does not touch either. The real blast radius is vocabulary and data.

---

## 5. Sizing the migration

Occurrences of the stale codes across `src/` and `tests/`:

| File | Stale-code occurrences | Nature of the change |
| --- | --- | --- |
| [src/data/seed/playbooks.ts](src/data/seed/playbooks.ts) | 308 | Role bindings + `eligiblePositions` on every defensive formation, including the special-teams units |
| [src/domain/depthSlots.ts](src/domain/depthSlots.ts) | 45 | The vocabulary itself (35 slots today) |
| [tests/fixtures.ts](tests/fixtures.ts) | 37 | Test fixtures |
| [src/lib/importers/civilPlaybooks.ts](src/lib/importers/civilPlaybooks.ts) | 25 | The defensive slot builder the scraper uses |
| [src/data/seed/roster.ts](src/data/seed/roster.ts) | 13 | Demo roster `position` values |
| [tests/civilPlaybooks.spec.ts](tests/civilPlaybooks.spec.ts) | 10 | Assertions naming specific roles |
| [src/app/transactions/page.tsx](src/app/transactions/page.tsx) | 5 | Position labels in the trade view |
| [tests/slotRanks.spec.ts](tests/slotRanks.spec.ts), [tests/impact.spec.ts](tests/impact.spec.ts) | 3 | Fixtures |

Roughly **450 code occurrences**. Most are mechanical renames with an unambiguous target.

---

## 6. The one part that is not a find-and-replace

**The 3-4 front.** Today `DEF_LB_34()` binds four linebacker roles — `LOLB`, `MLB`, `SUBLB`,
`ROLB` — on top of three linemen, for seven defenders in the box:

```
LE   NT   RE          +  LOLB  MLB1  SUBLB  ROLB
```

Madden 26 gives us only **three** off-ball linebacker roles (`SAM`/`MIKE`/`WILL`) and folds the two
3-4 outside linebackers into `LEDG`/`REDG`. So a 3-4 in the new taxonomy is a five- or six-man
front with the edge jobs on the line, and our four-LB front does not map one-to-one:

```
LEDG  NT  REDG        +  SAM  MIKE  WILL
```

The rename is therefore mechanical *except* here, where someone has to decide which of our four
linebacker slots becomes an EDGE and whether the 3-4 keeps a fourth off-ball linebacker at all.
That is a football decision, not a text substitution.

---

## 7. Open questions — confirm in game, then flip the `verified` flag

These are the places where the sources disagree or are silent. Each is cheap to settle by opening
the game's depth chart once.

1. **Is `LS` primary or package?** The evidence leans primary — it has its own rating, it is
   draftable, and a roster without one reports an incomplete lineup. But every list we have of the
   *depth chart screen* groups it with the specialists. Ours currently marks it `situational`.
2. **Does a holder (`H`) exist anywhere?** Neither the Madden 19 guide nor the Madden 26/27 list has
   it. We seeded it. If it is gone, the holder is simply the punter and the role should be deleted.
3. **Is `NB` ever shown, or only `SLCB`?** We assume only `SLCB`.
4. **Which group does `GAD` live in** (Specialists?), and do we want to model it?
5. **How many ranks does each position show?** We guessed — `QB` 3, `HB` 4, `WR` 5, `CB` 4, `TE` 3
   and so on. These numbers drive how deep the app plans, and they have never been read off the real
   screen.
6. **Are `LEDG`/`REDG` ranked separately** (L/R depth charts) or as one pool?

---

## 8. Sources

- **EA SPORTS, "Madden NFL 26 Gameplay Deep Dive"** (17 Jun 2025) — primary positions for Edge
  (LEDG & REDG) and SAM/MIKE/WILL; "secondary position" language.
  https://www.ea.com/games/madden-nfl/madden-nfl-26/news/madden-26-gridiron-notes-gameplay-deep-dive
- **ClutchPoints, "Madden 26 adding Two-Way players & more Depth Chart positions"** (18 Jun 2025) —
  the list of nine added/updated positions, including Long Snapper, and the note that DE/OLB position
  changes are no longer needed.
  https://clutchpoints.com/gaming/madden-26-adding-two-way-players-more-depth-chart-positions
- **MaddenRatings.com, Madden 27 ratings database** (Week 2, Sep 2026) — live player positions:
  `REDG` (Myles Garrett), `LEDG` (Maxx Crosby), `MIKE` (Fred Warner), plus a "Long Snappers | LS"
  group. Confirms Madden 27 keeps the 26 taxonomy.
  https://www.maddenratings.com/
- **IGN, "Player Positions — Madden NFL 19"** (Aug 2018) — the pre-26 baseline, including the full
  "additional depth chart abbreviations" list that is still accurate for the package positions.
  https://www.ign.com/wikis/madden-nfl-19/Player_Positions
- **EA SPORTS, "Madden NFL 27 — Franchise Deep Dive"** (4 Jun 2026) — context, not positions: the
  Roster Management centre, guaranteed contracts, void years, incentives, no-trade clauses,
  franchise/transition tags, RFA tenders and the Persona Engine. Relevant to the front-office phases.
  https://www.ea.com/games/madden-nfl/madden-nfl-27/news/madden-27-franchise-mode
- Community corroboration on long snappers being a real roster spot, and on `GAD`:
  r/Madden "Incomplete lineup in franchise due to no long snapper"; Operation Sports "Gadget (GAD)
  Position in Madden 26 Explainer Guide".

**Not verified:** we could not read EA's own ratings feed for Madden 26/27 — `m26-ratings` and
`m27-ratings` both return HTTP 500 from `ratings-api.ea.com/v2/entities`, so the position list here
comes from EA's own prose plus a live third-party ratings database rather than from the game's data.
