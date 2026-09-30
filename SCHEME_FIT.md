# Scheme fit and player archetypes in Madden 26 / 27

**Read this before touching `src/domain/schemeFit.ts`, `archetypes.ts` or `schemes.ts`.** It
records what the game models, where the data came from, which parts are the game's and which
are our own additions, and what is still unconfirmed.

Researched **2026-09-30**. The archetype and scheme tables are a one-time committed scrape
(`madden.tools`), never fetched at runtime — the same rule as the team colour palettes. See
[`POSITIONS.md`](POSITIONS.md) for the position vocabulary this builds on.

---

## 1. What "scheme fit" is

Madden gives every team an **offensive scheme** and a **defensive scheme**. Each player also
has an **archetype** — one per position, assigned by the game, e.g. `Field General` at
quarterback, `Power Rusher` at edge. Scheme fit is then the overlap between the two: a scheme
names the archetypes it favours, and a player whose archetype is on that list fits it.

The game pays for that match in progression, so it is worth planning around. Three
consequences shape this design:

- **Fit is per player, evaluated per role.** A man is not "a good player" in the abstract; he
  is a good *Field General* or a poor one for a scheme that wants a *Scrambler*.
- **Archetype is a label, not a rating.** A 95-overall Strong Arm quarterback is still a
  mismatch for a scheme built on Field Generals. Our grade says so rather than averaging it
  away.
- **The scheme is per side of the ball.** Offense is graded against the offensive scheme and
  defense against the defensive scheme; there is no cross-grading.

### What we add

Madden does **not** publish numeric thresholds. It grades fit on the archetype match. The plan
asked for "attribute thresholds per role", so we add one, and label it as ours:

- each archetype lists the six attributes the game counts for it (published on the archetype
  pages);
- a rating of **70 or more clears the floor** — a `FIT_FLOOR` constant, not a game number;
- the grade combines both halves, because either alone is misleading.

---

## 2. Player archetypes

**36 archetypes across 19 positions.** Counted from the game's own pages, which publish one
page per (position, archetype) — 56 of those, collapsing to 36 because units share a set.

| Position(s) | Archetypes |
| --- | --- |
| `QB` | Strong Arm · Improviser · Scrambler · Field General |
| `HB` | Power Back · Elusive Back · Receiving Back |
| `FB` | Blocking · Utility |
| `WR` | Playmaker · Deep Threat · Slot · Physical |
| `TE` | Blocking · Possession · Vertical Threat |
| `LT` `LG` `C` `RG` `RT` | Pass Protector · Power · Agile |
| `LEDG` `REDG` | Power Rusher · Speed Rusher · Run Stopper |
| `DT` **and the `NT` package role** | Power Rusher · Speed Rusher · Nose Tackle |
| `SAM` `WILL` **and `SUBLB`** | Pass Coverage · Run Stopper |
| `MIKE` | Pass Coverage · Run Stopper · Field General |
| `CB` **and `SLCB`** | Man · Zone · Slot |
| `FS` `SS` | Zone · Run Support · Hybrid |

Two things fall out of that table and both matter:

1. **Package roles have no archetypes of their own.** `NT` is a `DT`, `SUBLB` is a `SAM`/`WILL`
   job, `SLCB` is a `CB`. That is the primary-versus-package split from
   [`POSITIONS.md`](POSITIONS.md), showing up again from a different direction, and it is why
   `unitForRole()` exists rather than a position lookup.
2. **Kickers, punters and long snappers have no archetype at all** in this reference (the EA
   ratings feed knows `KP_Accurate` and `KP_Power`, but the scheme source has no page for
   them). Those roles grade `unrated` rather than being guessed at.

`GAD` is also ungraded, deliberately: its planner role is still undecided
([`POSITIONS.md`](POSITIONS.md) §7), so inventing a unit for it would produce a meaningless
number with a confident label.

### Where an archetype comes from

- **Stored**, when we have it: the EA ratings import writes the feed's own code
  (`QB_FieldGeneral`) into the player's ratings, and both grading and the UI read it back.
- **Derived**, when we do not: `deriveArchetype()` scores every archetype the player's unit has,
  on the attributes that archetype counts, and takes the best average. The UI marks these
  `(guessed)`.

The EA feed still speaks pre-Madden-26: `DE_*` and `OLB_*` predate Edge, so `DE_PowerRusher`
has to land on the edge archetype even though the position is now LEDG or REDG and the code
cannot tell us which. `OLB_RunStopper` is the genuinely ambiguous one — a 3-4 outside
linebacker who set the edge became an EDGE in Madden 26, but SAM/WILL kept a run-stopper
archetype too — so it maps to the linebacker version. Both are recorded in
`EA_ARCHETYPE_TO_ID`.

---

## 3. Schemes

**21 schemes: 11 offensive, 10 defensive.** Each names the archetypes it favours and, where
the source lists them, the real clubs that run it.

### Offense

| Scheme | Identity | Key archetypes |
| --- | --- | --- |
| Air Raid | Pass-heavy spread | Improviser, Receiving Back, Blocking, Slot, Possession, Pass Protector, Power |
| Multiple Power Run | Power running game | Field General, Power Back, Blocking, Physical, Possession, Pass Protector, Power |
| Multiple Zone Run | Zone running with play-action | Field General, Elusive Back, Blocking, Physical, Possession, Agile |
| Pistol | Pistol formations with run threat | Scrambler, Power Back, Blocking, Physical, Agile |
| Run And Shoot | Air raid with route adjustments | Field General, Receiving Back, Utility, Slot, Vertical Threat, Pass Protector |
| Spread | Spread formations and tempo | Scrambler, Elusive Back, Utility, Playmaker, Vertical Threat, Pass Protector, Agile |
| Vertical Power Run | Vertical passing with run support | Strong Arm, Power Back, Blocking, Deep Threat, Vertical Threat, Pass Protector, Power |
| Vertical Zone Run | Vertical passing with run support | Strong Arm, Elusive Back, Blocking, Deep Threat, Vertical Threat, Pass Protector, Agile |
| West Coast Power Run | Power running game | Improviser, Power Back, Utility, Playmaker, Possession, Power |
| West Coast Spread | Spread formations and tempo | Field General, Elusive Back, Utility, Playmaker, Vertical Threat, Agile, Pass Protector |
| West Coast Zone Run | Zone running with play-action | Field General, Elusive Back, Utility, Playmaker, Possession, Agile |

### Defense

| Scheme | Identity | Key archetypes |
| --- | --- | --- |
| Base 3-4 | Three linemen, four linebackers | Power Rusher, Run Stopper, Field General, Pass Coverage, Man, Zone, Run Support |
| Base 4-3 | Four linemen, three linebackers | Power Rusher, Speed Rusher, Run Stopper, Field General, Pass Coverage, Man, Zone, Run Support |
| 3-4 Storm | Speed rush with coverage support | Speed Rusher, Run Stopper, Pass Coverage, Zone, Run Support |
| 3-4 Under | Flexible 3-4, linebacker versatility | Run Stopper, Power Rusher, Field General, Pass Coverage, Man, Hybrid, Run Support |
| Disguise 3-4 | Unpredictable fronts with disguise | Power Rusher, Run Stopper, Pass Coverage, Man, Hybrid |
| 4-3 Cover 3 | Cover 3 with aggressive safeties | Speed Rusher, Power Rusher, Pass Coverage, Run Stopper, Zone, Hybrid |
| 4-3 Quarters | Cover 4, split-field | Run Stopper, Speed Rusher, Power Rusher, Pass Coverage, Zone, Hybrid |
| 4-3 Under | Flexible 4-3, hybrid capabilities | Speed Rusher, Power Rusher, Run Stopper, Field General, Man, Zone |
| 46 Defense | Loaded box, aggressive blitzing | Run Stopper, Power Rusher, Man, Run Support, Hybrid |
| Tampa 2 | Zone with a deep-dropping MIKE | Power Rusher, Speed Rusher, Pass Coverage, Zone |

The names are **archetype names, not unit-qualified ids**, because a scheme spans a whole side
of the ball: `Power Rusher` means the edge version at `LEDGE` and the interior version at `DT`.
`preferredArchetypes(unit, scheme)` resolves that by intersecting the scheme's names with the
archetypes the unit actually has. Every scheme names something for every unit it governs — a
test asserts it — so no unit is silently un-graded.

---

## 4. How we grade

For one role, with `FIT_FLOOR = 70`:

1. Resolve the role to a **unit** (`NT` → `DT`, `SUBLB` → `LB`, `SLCB` → `CB`).
2. Get the **scheme's preferred archetypes** for that unit. If the scheme names none of them —
   which only happens when a scheme is asked about the wrong side of the ball — accept any and
   say so.
3. Take the player's **stored archetype**, or derive one from his ratings.
4. Check each of that archetype's attributes against the floor and count the clears.

| Grade | When |
| --- | --- |
| **Ideal** | right archetype, and ≥ 80% of the archetype's attributes clear the floor |
| **Strong** | right archetype, and ≥ 60% clear |
| **Workable** | right archetype with ≥ 40% clear, **or** the wrong archetype with ≥ 80% |
| **Mismatch** | anything else |
| **Not graded** | no attributes on file, or a role with no archetype model (`GAD`, specialists) |

The asymmetry is deliberate: **an archetype mismatch tops out at Workable however good the
numbers look**, because the game pays for the match. And a scheme-correct player with nothing
clearing the floor still bottoms out at Mismatch, because "right archetype, cannot play" is
still a problem.

Presented in the app as the `/scheme` screen, which also lists every mismatch with the
attributes that fell short and a link to who else could play the role.

---

## 5. Which Madden scheme our playbooks are

**This is our reading, not a fact from the game.** The seed ships formation sets, not schemes,
and the fit engine is useless without a scheme to grade against, so each seeded playbook is
mapped to its closest Madden scheme. It is printed on every card in the app so it can be
disagreed with.

| Seeded playbook | Read as |
| --- | --- |
| Wide Zone Offense (`pb-shanahan`) | West Coast Zone Run |
| Spread Passing Offense (`pb-spread`) | Spread |
| Heavy Gap Scheme (`pb-power`) | Multiple Power Run |
| Nickel 4-3 Defense (`pb-nickel-43`) | Base 4-3 |
| 3-4 Pressure Defense (`pb-34`) | Base 3-4 |
| Special Teams (`pb-special-teams`) | *none — not graded* |

A plan stores one playbook, so only one side of the ball can come from it; the other falls
back to the first seeded playbook for its side. The app prints which playbook it used.

---

## 6. Plan diffing across playbooks

Phase 5 also asks for plan diffing across playbooks. This is **not** Phase 4's playbook
comparer (which compares what is *in* two playbooks); it answers *"what would switching do to
my plan"*, working off the depth-chart roles each playbook consults:

- roles the new playbook **adds** — jobs you would suddenly have to fill;
- roles it **drops** — and the starters who held them and lose their spot;
- **holes**: an added role with nobody at all in the plan, which is the actionable part;
- formation overlap and personnel-group shift, as context.

Example from the seeded data: switching the defense from 3-4 Pressure to Nickel 4-3 drops
`RDT` and adds `SAM`, and the model reports that the `RDT` starter loses his spot. That is
correct football and it falls straight out of the migrated front shapes — a 4-3 fields three
linebackers where a 3-4 fields two ([`POSITIONS.md`](POSITIONS.md) §4).

**Multi-plan support is still open.** The depth chart is keyed by `layer` and league, not by
plan, so two plans cannot hold different charts without a schema change. What exists is one
plan compared across playbooks, which is what Phase 5's wording asks for.

---

## 7. What we get wrong, and what is still open

**Known limitations**

- **The EA ratings feed speaks pre-Madden-26 positions** (`LOLB`, `MLB`, `LE`, `RE`). Imported
  players therefore carry old position codes that are not normalised to the new vocabulary.
  Their *archetypes* are stored and graded correctly, so fit works; only the position label is
  stale. Worth fixing when the import is next touched.
- **Three attribute lists are shorter than six.** `MIKE Field General` has five attributes, and
  `Run Support` at safety has five. Grading uses however many exist and reports how many it
  graded on, so a partial list is visible rather than hidden.
- **Demo attributes are synthetic.** The seed roster is fictional and its players have no real
  ratings, so without them the scheme-fit screen would be blank on first run. Each demo player
  gets a deterministic profile derived from his overall and id, marked `demo: 1` and shown as
  `demo` in the UI. `npm run import:ratings` replaces all of it.

**Still open**

1. **Are the archetype attribute lists complete?** We take the published six per archetype. If
   the game weights them (first-listed counts most), our flat check is coarser than the game's.
2. **Where exactly is the game's own line?** Our 70 floor and the 80/60/40 bands are invented.
   They rank players sensibly but they are not Madden's numbers, and the app says so.
3. **Should `GAD` be graded?** It needs a unit before it can be, and that decision is still
   open in [`POSITIONS.md`](POSITIONS.md) §7.
4. **Do schemes affect in-game behaviour beyond progression?** The plan's framing assumes fit is
   worth optimising. If scheming a mismatch turns out to cost nothing on the field, the grade
   is still a useful roster-building lens but not a competitive one.

---

## 8. Sources

- **madden.tools, schemes hub** (Madden 27) — the 21 schemes, their identities, key archetypes
  and example teams. https://madden.tools/schemes
- **madden.tools, player archetypes** (Madden 27) — one page per position and archetype, with
  descriptions, most-relevant attributes, strengths and weaknesses. The position index is the
  authority for which archetypes each position can hold.
  https://madden.tools/archetypes/players
- **EA SPORTS ratings feed** (`ratings-api.ea.com`) — the `archetype` field per player
  (`QB_FieldGeneral`, `DE_PowerRusher`, …), plus the 55 attributes. The basis for
  `EA_ARCHETYPE_TO_ID`. Already used by `npm run import:ratings`.
- **EA SPORTS, "Madden NFL 26 Gameplay Deep Dive"** — the primary/secondary position split.
  https://www.ea.com/games/madden-nfl/madden-nfl-26/news/madden-26-gridiron-notes-gameplay-deep-dive
- **[`POSITIONS.md`](POSITIONS.md)** — the position vocabulary, the civil.gg front shapes, and
  why package roles have no archetypes of their own.

**Unverified:** the archetype and scheme data is a third-party reference, not read from the
game. The archetype *codes* in the EA feed are confirmed from EA's own API. Nothing here is
`verified` in the app's sense until it is checked against a real franchise.
