# Trade targets — valuing players and ranking the league

**Read this before touching [`tradeValue.ts`](src/domain/tradeValue.ts), the `/league` screens, or
anything that prices a player.** It records the research behind turning the scouting view into a
ranked trade-target board: how a player is valued, how a *need* is detected on your own roster,
and how the two combine into a list you can act on.

**Status 2026-10-01: research and plan only — nothing here is built.** The fit half it depends on
is described in [`SCHEME_FIT.md`](SCHEME_FIT.md) §7–8. The five open decisions in §9 are the
owner's to make before any of it is written.

Researched **2026-10-01**. The value model below is *borrowed structure* — one public trade
calculator's published formula, cross-checked against independent age research. It is not the
game's maths and not the NFL's. Where a number is ours, a reading, or unverified, it says so.

---

## 1. Why this exists

Two gaps stand between the current scouting screens and a trade board.

**Fit cannot rank.** `gradeRoleFit` returns one of five buckets (`ideal`, `strong`, `workable`,
`mismatch`, `unrated`). That is the right vocabulary for a card, and the wrong one for a list: it
cannot order three thousand players, and it cannot say *how much* better one `workable` corner is
than another. A trade board needs a continuous score and a delta against your own starter.

**Value has no positional premium.** [`tradeValue.ts`](src/domain/tradeValue.ts) prices a player
as `3200 · e^(−0.155 · (99 − OVR))` times an age ladder, a dev-trait multiplier and a
contract penalty. It never asks *what position he plays*: a 90-overall running back and a
90-overall quarterback price identically, which is not how the market works. And because the
ratings feed publishes no contracts, the penalty it does have has never once fired
([`RATINGS.md`](RATINGS.md) §4).

The owner's goal, in the app's own words, is: *rank players across all 32 teams by scheme fit
and value.*

---

## 2. The value model

### 2.1 Paper value

The structure worth copying is a convex quality curve times a positional premium:

```
PaperValue = 8,400 × Quality(OVR)^1.35 × PositionalValue(position)
Quality(OVR) = ((OVR − 58) / (94 − 58))^1.6
```

- **Convexity is the point.** A 92 costs far more than two 82s; below 58 the curve floors at zero
  (the player is worth no draft capital), and 94 is the top of the curve, so 95+ all price equal.
- **The scale is pinned to a pick chart** (8,400 for a top quarterback), which is what makes a
  player and a draft pick comparable at all. Without that pinning, "worth a second-rounder" is
  meaningless.
- Non-quarterbacks are capped at 4,800 (about three mid-firsts); only quarterbacks break it.

### 2.2 Positional value

The premium each position commands, from the same source's published ceilings. Note it is a
*ramp*, not a flat constant — a backup quarterback does not carry the quarterback premium:

| Position | Ceiling | Position | Ceiling |
| --- | --- | --- | --- |
| QB | 1.00 | S | 0.20 |
| EDGE | 0.42 | G | 0.19 |
| OT | 0.38 | C | 0.17 |
| WR | 0.34 | LB | 0.17 |
| DT | 0.32 | TE | 0.15 |
| CB | 0.30 | K | 0.05 |
| RB | 0.22 | P | 0.03 |
| | | LS | 0.02 |

This is the single biggest correction to the current model: it is why an 88 edge is a better
trade chip than an 88 running back.

### 2.3 Age

Age is priced *per position*, not by one ladder — the current implementation's biggest flaw after
the missing premium. Decline ages from the same source:

| Position | Decline from | Position | Decline from |
| --- | --- | --- | --- |
| RB | 26 | C | 30 |
| WR | 28 | OT | 30 |
| TE | 29 | EDGE | 30 |
| G | 29 | P | 31 |
| DT | 29 | QB | 34 |
| LB | 29 | K | 34 |
| CB | 29 | LS | 34 |
| S | 29 | | |

Independent work agrees on the shape: running backs peak around **25.5** and cliff at **29**
(age-30+ seasons are about 7% of the sample), while receivers peak around **27** and decline more
gently. The trade curve is steeper than the on-field curve, because a buyer pays for the years he
will get, but the market never fully forgets a star — so an ageing star keeps a floor.

### 2.4 Contract surplus

The most conceptually correct input and the one we cannot compute: *you are trading the contract,
not just the player*. The source's multipliers are: a rookie deal with 2+ years left ×1.35, cheap
control at ≤70% of market ×1.15, an expiring deal ×0.80, a cap hit ≥1.4× market ×0.75.

**Our data has no contracts at all** — the Madden 27 feed publishes none and the import leaves
`capHit` null. See §7.

### 2.5 Star tax

At the very top the market pays more than the curve: a ramp that is 1.0 at 90 overall and reaches
×1.4 at 96, which is roughly the two-firsts-plus price Mack, Ramsey and Parsons actually fetched.
Our dev trait (`star`, `superstar`, `xfactor`) is a second, cheaper signal for the same thing and
is already imported.

### 2.6 Draft picks, and why the chart matters

Picks should price on the same scale as players. The published chart is
**Fitzgerald-Spielberger** — built from observed pick-for-pick trades rather than the older Jimmy
Johnson table, which front offices still anchor to but which overvalues early picks. Reference
points: #1 = 3,000; #10 = 1,833; #32 = 1,244; #64 = 892; #100 = 666; #150 = 461; #200 = 315;
#256 = 190. A future pick takes its round's median value discounted **20% per year out** (2028 =
80% of this draft). Bundles are discounted too — three assets lose ~14% — because quantity never
buys quality.

Our `pickValue` is a round-linear Jimmy Johnson approximation. It should either move to the F-S
shape or stay explicitly labelled as the older chart; either way the UI must say which.

### 2.7 What the other team thinks

Paper value is the same everywhere; a trade is not. The market prices a player against the
*acquiring club's* depth chart and needs — a man who would start for them is worth more than the
same man buried behind two better players. The published ladder is ×1.25 for an upgrade on their
starter, ×1.00 for a starter, ×0.75 first man off the bench, ×0.50 buried. Its acceptance curve is
centred at 1.05 (a dead-even package clears about 41%; paying 10% over clears about 59%; under
0.75 of fair is refused outright) because a front office wants to win the trade.

We can approximate the depth half of that from our own data: every player's roster is imported, so
we can rank a target within his own team and position. We cannot know their chart, their scheme,
or their front office's mood — so this belongs in the model as an **availability multiplier with a
stated reason**, never as a percentage chance.

### 2.8 What is borrowed, what is ours

| Part | Status |
| --- | --- |
| Convex quality curve, positional-value ceilings, decline ages, star tax, contract-surplus multipliers, pick chart, need ladder | **Borrowed** from the published model (§10), cross-checked on age against independent research |
| The tuning constants and bands | Borrowed, **not** the game's numbers and not the NFL's |
| Our own age and dev-trait data | **Imported facts** from the EA feed |
| Contract surplus | **Not computable today** (§7) |
| Availability multiplier | **Our reading** of imported rosters |

---

## 3. Fit (the other half)

The ranking needs a number, not a letter. [`SCHEME_FIT.md`](SCHEME_FIT.md) §7–8 records the
planned **blueprint model**: researched per-scheme, per-unit attribute weights, a continuous
`fitScore` from 0–100, and a `fitDelta` against the starter the role currently has. The key
property for this document is that fit and value are *independent axes*: fit says "would he be
better for me", value says "what does he cost", and the board needs both because a great fit at a
positional premium is the whole idea and a great fit at running back is usually not.

---

## 4. Need and availability

### 4.1 What you actually need

The app already knows more about the owner's intent than any public model: which roles the plan
uses, how often each formation consults them, and what the call sheet leans on. A **need score**
for a role is:

- **usage weight** — how many of the plan's formations consult this role, normalised; a role three
  formations ask for matters more than one only the goal-line unit uses (`resolveBucket` and the
  call sheet are the intent signal);
- **the gap** — `fitScore` of the rank-1 player against what the role wants, plus his overall
  against the role's expectation;
- **depth** — is there anyone behind him, and how far off;
- **age** — is the starter past the position's decline age (§2.3);
- **holes** — a role with nobody at all (`auditPlan` already reports `empty`).

Needs are also *positional*: it is no good recommending a third slot receiver if the offense uses
two and has none.

### 4.2 Availability

For each candidate, from the imported rosters alone:

- **Where he sits on his own team's depth** at his position (rank within team + position by
  overall). A team's WR3 is cheaper than its WR1 in both senses — they will sell one and not the
  other;
- **his age versus his position's decline age** — a 30-year-old back is a rental;
- **his contract**, when the owner has entered one (§7).

This is the honest half of §2.7: we can say "he is their third receiver" but not "they will accept
a third-rounder".

---

## 5. The ranking engine

Pure domain, no React, no database — the same rule as every other model in `src/domain/`.

**Inputs per candidate** (every non-user player): position, overall, age, dev trait, stored
archetype, attributes, height/weight, abilities, his team's depth at his position, and the
scheme(s) the owner is running.

**Outputs per candidate**: the role he would fill on *your* team, his `fitScore`, his `fitDelta`
against your current starter, his value, his estimated pick cost, an availability multiplier with
its reason, and a one-line "why".

**Composition** — deliberately additive and explainable rather than a single opaque score, so the
board can be sorted on any axis and the UI can show the arithmetic:

```
upgrade      = fitScore(player @ role) − fitScore(your current starter @ role)
needWeight   = usage(role) × (1 + depthHole + ageRisk)
cost         = paperValue(player) × availability × ageCurve        // in trade points
targetScore  = needWeight × upgrade × valueEfficiency(cost, yourBudget)
```

Every term is named, tunable and shown on the row; the weights are ours and should be exposed,
not hidden. The board must be sortable by **fit**, by **upgrade**, by **value** and by **cost**
independently, because those are four different questions.

---

## 6. The screen

Turn `/league` into the ranked **trade-target board**, keeping the 32-team map as a section (it is
how you audit the league; the board is how you shop it). Per row: the player (opening the existing
`PlayerDialog`), his club, the role he would take, fit badge and score, your current starter and
the delta, overall/age/dev, value, estimated cost in picks, and the "why" line. Filters: position,
side, fit grade, age ceiling, maximum pick cost, upgrade-only. Sorts: best fit, biggest upgrade,
cheapest, best value-per-point. The shortlist action already exists and feeds `/transactions`.

Server components only, `Badge` tones not colours, serif headings, mobile-first — the full
contract is [`DESIGN.md`](DESIGN.md).

---

## 7. Data limits, stated up front

| Limit | Consequence |
| --- | --- |
| **No contracts** — the feed publishes none and the import leaves `capHit` null | Surplus value (§2.4) cannot be computed. Either price talent × position × age and label it "contract unknown", or let the owner enter a cap hit and apply surplus only then. Do not invent one. |
| **No other team's depth chart or scheme** | Availability is inferred from their position depth (§4.2), and their willingness is a multiplier with a reason, never a probability. |
| **EA positions are pre-Madden-26** (`LOLB`, `MLB`, `LE`, `RE`) | Known, recorded in [`SCHEME_FIT.md`](SCHEME_FIT.md) §9. Archetypes grade correctly; the position *label* is stale and any position-keyed value lookup must go through the unit map. |
| **The value model is one public calculator's maths** | It is a reference, like the colour palettes and the archetype table — committed, labelled, never fetched at runtime, and never presented as the game's own number. |
| **Fit is our model; Madden pays for archetype only** | Keep the caveat visible. A high `fitScore` at the wrong archetype is still a mismatch for progression. |

---

## 8. Build plan

Six phases, in dependency order. A–D are pure domain and carry the tests; E is the screen; F is
bookkeeping.

- **A. Fit model** — `schemeProfiles.ts`: researched per-(scheme, unit) weights and floors, the
  zone/gap, man/zone and single-/two-high axes as sub-scores, archetype match as a multiplier,
  measurables and abilities as modifiers. Adds `fitScore` and `fitDelta`; keeps the letters.
- **B. Value model** — rewrite `tradeValue.ts` around quality × positional value × age-by-position
  × dev/star, with surplus applied only when a cap hit exists. Move `pickValue` to an F-S shape or
  label it as the older chart. Keep `evaluateTrade` and `formatValue` working.
- **C. Need and availability** — `rosterNeed.ts` over the plan's formations, the call sheet, the
  depth chart and `auditPlan`'s holes; availability from imported rosters.
- **D. Ranking engine** — `tradeTargets.ts`, pure and tested, composing A–C into the §5 output.
- **E. Screen** — `/league` becomes the board (§6); the team pages keep their existing table.
- **F. Docs and tests** — golden cases from the committed artifact (a wide-zone lineman versus a
  gap lineman, a man corner versus a zone corner, a 3-4 edge versus a 4-3 edge), monotonicity
  tests for the value curve, need detection, ranking stability, and this file updated to shipped
  status.

---

## 9. Open decisions — the owner's, not a thread's

| # | Decision | Recommendation |
| --- | --- | --- |
| 1 | Does the board **replace `/league`**, or is it a new `/trade-targets` route beside it? | Replace `/league` and keep the team map as a section — the goal is one screen that answers "who should I go get" |
| 2 | **Contracts**: price without them and label it, or require cap-hit entry first? | Price without them, label "contract unknown", and apply surplus once a cap hit exists |
| 3 | **Scope order**: A–D as one unit, or value first as a standalone upgrade to `/transactions`? | A–D together — a ranking is meaningless without both the score and the price |
| 4 | **Both directions?** Outgoing candidates ("who I should shop") as well as incoming? | Incoming first; the same engine answers both later |
| 5 | **One PR or two?** | Fit score + value in one, board in the next |

---

## 10. Sources

- **Fanspeak, NFL Trade Builder** (read 2026-10-01) — the published paper-value formula, positional
  ceilings, decline ages, contract-surplus multipliers, star tax, need ladder and acceptance curve
  in §2. https://fanspeak.com/nfl-trade-builder
- **Fitzgerald-Spielberger draft trade value chart** (Over The Cap) — the pick scale §2.6 prefers.
  https://overthecap.com/draft-trade-value-chart
- **Apex Fantasy Leagues, "The Peak Age for an NFL Running Back"** — RB peak ≈ 25.5 versus WR ≈ 27,
  and the age-30+ share of seasons. https://apexfantasyleagues.com/peak-age-nfl-running-back/
- **Northwestern Sports Analytics, "The NFL Running Back Age Cliff"** — the age-29 break.
  https://sites.northwestern.edu/nusportsanalytics/2020/12/29/the-nfl-running-back-age-cliff/
- **madden.tools, schemes hub** — "match archetypes to earn faster progression, scheme fits and
  morale boosts", the in-game reason fit is worth optimising. https://madden.tools/schemes
- **[`SCHEME_FIT.md`](SCHEME_FIT.md)** §7–8 — the football research and the fit-score model this
  ranking consumes.
- **[`RATINGS.md`](RATINGS.md)** §4 — the field-level proof that contracts, depth charts and
  franchise state are absent from the feed.

**Unverified:** every number in §2 is a public model's, not Madden's. The app must present them as
estimates, the same way it labels the contract figures and the fit floor.

---

## Related documents

- [`SCHEME_FIT.md`](SCHEME_FIT.md) — how scheme fit is graded, and the football research behind the
  planned score.
- [`HANDOFF.md`](HANDOFF.md) — stated preferences, feature inventory, phase status, conventions.
- [`RATINGS.md`](RATINGS.md) — what the Madden 27 feed does and does not carry.
- [`PLAN.md`](PLAN.md) — the phase plan this work sits inside (Phase 5, front office).
- [`DESIGN.md`](DESIGN.md) — the design contract the board must obey.
