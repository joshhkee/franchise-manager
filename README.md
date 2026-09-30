# Madden Franchise Manager

A hosted, mobile-first planner and drive-calling coach for one Madden 27 franchise.

> **Working on this? Start with [`HANDOFF.md`](HANDOFF.md).** It is the instruction set for
> any thread: every preference and decision the owner has stated, the feature inventory,
> verified phase status, the hard "do not" list, and the phase-exit checklist.
>
> **Building a phase?** [`PLAN.md`](PLAN.md) holds the briefs — scope, stack, data model,
> the Phase 0–7 breakdown, and an honest reconciliation of the plan against what is already
> built here. Design rules for any UI work live in [`DESIGN.md`](DESIGN.md).

Not a league stats site. It answers four questions:

1. **What does my team actually look like?** Offense, defense and special teams, group by
   group, with cap, contracts, dev traits and injuries.
2. **Who plays where?** A depth chart that mirrors the game's own screen — including the
   package positions (`SLWR`, `3DRB`, `PWHB`, `NT`, `SUBLB`, `SLCB`, `RLE`, `RRE`, `RDT`,
   `KOS`, `KR`, `PR`) — plus per-formation personnel control.
3. **What do I change in game?** A diff between the game's depth chart and your plan, as an
   ordered apply checklist.
4. **What do I call?** Down and distance in, one explained call out, with the looks you have
   already shown tracked so you don't tell the defense what's coming.

Plus the boring part that keeps it accurate: trade logging and drafted-rookie entry.

---

## Running it locally

```bash
npm install
cp .env.example .env.local     # set APP_PASSPHRASE and SESSION_SECRET
npm run db:push                # create tables in the embedded database
npm run db:seed                # demo league and roster, full slot vocabulary, seeded playbooks
npm run scrape:playbooks       # real Madden 27 formations from civil.gg (needs Playwright)
npm run dev                    # http://localhost:3000
```

No database server needed: with `DATABASE_URL` unset the app runs an embedded Postgres
(PGlite) in `./data/pglite`. Set `DATABASE_URL` and it uses that instead — same SQL, same code.

Every script:

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | 265 tests: the domain core (resolution, impact, conflicts, bulk edits, concepts, families, call engine, tendency, drive logic, trade values), the seed playbook invariants, the checklist exporters, the WCAG theme contract, plus a database integration suite over a throwaway embedded Postgres |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Apply schema |
| `npm run db:seed` | Vocabulary, demo league/roster, seeded playbooks |
| `npm run import:ratings` | Pull real player ratings from EA's public feed |
| `npm run scrape:playbooks` | Pull real formations and plays from civil.gg |
| `npm run scrape:colors` | One-time: diff team colours against Wikipedia (never runs at runtime) |
| `npm run audit:colors` | Print the WCAG contrast ratios for every team, both modes |

---

## Design

The look and the accessibility rules are specified in **[DESIGN.md](DESIGN.md)** — read it
before changing any UI. The short version:

- **Serif headings, sans data.** Source Serif 4 for titles; everything numeric stays sans and
  `tabular-nums`.
- **The accent is your team.** Buttons, links, the active nav pill, focus rings and highlight
  markers follow the franchise colour; the neutral surfaces never do.
- **Team colours are derived, not picked.** You store each club's *true* colours and the app
  lightness-shifts them per mode until they clear WCAG AA, so a team's gold or near-black cannot
  make the UI unreadable.
- **Light and dark, no flash.** The mode lives in a cookie and is rendered server-side; the
  toggle works without JavaScript.
- **Contrast is a test, not a promise.** `tests/theme.spec.ts` proves every one of the 32 clubs
  passes AA in both modes.

Fictional teams (the demo franchise and CPU teams) get a neutral accent rather than pretending to
be somebody's real club.

---

## Getting it on your phone

The app is mobile-first and installable (PWA manifest + icon), so once it is hosted you open it
once, hit "Add to Home Screen", and it behaves like an app. Two deploy paths:

**Vercel + Neon (recommended, zero upkeep).** Push the repo, import it on Vercel, create a free
Neon Postgres, and set the environment variables below. Serverless filesystems are ephemeral, so
the hosted path *requires* `DATABASE_URL` — the embedded database is a local-development
convenience only.

| Variable | Why |
| --- | --- |
| `APP_PASSPHRASE` | The only thing standing between the internet and your depth chart |
| `SESSION_SECRET` | Signs the session cookie (`openssl rand -hex 32`) |
| `DATABASE_URL` | Neon/Postgres connection string |
| `SECURE_COOKIES=1` | Required on HTTPS; omit for local http |

**Docker on your own machine or VPS.** `docker compose up -d --build` (set `APP_PASSPHRASE` and
`SESSION_SECRET` first). Your data lives in the `franchise-data` volume. If you do this, put it
behind HTTPS — a Cloudflare tunnel or Tailscale is the least-effort way — and then set
`SECURE_COOKIES=1`.

**Moving state between devices.** `/team` → *League clock, cap and backups* has **Download
snapshot** and **Restore a snapshot**. A snapshot is one JSON file: rosters, both depth-chart
layers, formation subs, call sheet, drives, trades and picks. Restoring replaces (never merges).
Playbooks are excluded on purpose — they are reproducible from the scraper.

---

## The three layers of data

**1. Base roster — real, automated.** `npm run import:ratings` calls EA's public ratings feed
(the same one the ea.com ratings database reads). It returns full player records: every
attribute, position, height, jersey, college, team, plus salary and signing bonus.

One honest caveat: the feed publishes past seasons and its season slugs are undocumented. The
importer probes candidate slugs, uses the newest that answers, and labels the rows with it. When
EA publishes Madden 27 there, the same command picks it up. `scripts/probe-ea-api.ts` prints what
actually responds if a slug ever changes.

**2. Franchise state — yours, entered in-app.** Contracts, cap, dev traits, injuries, your two
depth charts, formation subs, trades, drafted rookies. Anything you author is stored separately
from the imported ratings, so re-importing EA data never clobbers your work.

The seed ships a small demo league (`Demo Franchise` plus three synthetic CPU teams) so the app
is usable before you own the game. The demo roster is a realistic 53-man active roster (plus a
practice squad the depth chart deliberately ignores), which is what lets every role have a
different starter while backups still cover two spots — the swing tackle. Importing ratings adds the real 32 NFL teams alongside them
and merges by abbreviation, which means your trade-partner list will show both until you import.
Set your team from the **Team** screen once real rosters are in.

**3. Franchise state — automated, later.** When you own Madden 27 on PC, a save-file importer
(`madden-franchise`, which supports Madden 19–27 and can write) populates layer 2 behind the same
interface. The import layer is deliberately kept apart from the planning layer so this is additive.
Write-back into the save is *not* built and is not planned for v1: a bad write does not throw, it
silently corrupts a season, and Madden re-orders depth charts on its own anyway.

### Playbooks

`npm run scrape:playbooks` drives a real browser against civil.gg's public Madden 27 playbook
data and converts it into our own formation model: formation name, set, personnel, slot labels
with coordinates, and the play list. We render **our own diagrams** from those coordinates rather
than reusing their artwork — which is also what lets a diagram show *your* players' names on the
labelled spots.

The seed ships six playbooks: four offense/defense sets plus **Special Teams**, which models the
five units Madden makes you set (field goal, punt, punt return, kickoff, kick return) as ordinary
formations — eleven spots each, bound to depth-chart roles, so a depth-chart change moves them too.
The specialists are roles (`K`, `P`, `KOS`, `H`, `LS`, `KR`, `PR` — `H` is one of the roles
[POSITIONS.md](POSITIONS.md) questions); the coverage and blocking jobs
around them ride on the backups of the offensive and defensive roles each unit really uses.

Slot layouts derived from a set name rather than read from a diagram are our best reading of the
personnel group, not a tracing of the game's screen — treat them as a starting point, and every
slot binding is editable by hand. Formation and play data is civil.gg's; this project is
unaffiliated with it.

---

## How the personnel model works

This is the part worth understanding, because it is the part that stops the game shuffling
players out from under you.

Madden's depth chart is not only base positions. It is a set of **role slots** that formations
consult when deciding who lines up. So formations inherit from the depth chart, and your manual
choices are explicit, visible exceptions:

- **Inherited** — this spot follows `SLWR` rank 1. Change `SLWR` and this spot changes with it.
- **Override** — this spot is pinned to a specific player for this formation only.

Everything else follows from that:

- **Impact preview** before you commit a depth chart change: how many formations follow
  automatically, which are pinned by your own override, where a duplicate or an injured player
  would land.
- **Bulk assignment**: apply one player across a formation family (every Trips look, every 3x1)
  instead of editing fourteen formations by hand.
- **Two states**: `game` (what Madden currently has) and `plan` (what you want), with the apply
  checklist closing the gap.

### Depth chart and formation vocabulary

Madden draws a line between a player's **primary position** (one per player: his roster position,
which drives progression, scheme fit and value) and the **package positions** the depth chart adds
on top (`SLWR`, `3DRB`, `PWHB`, `NT`, `SUBLB`, `SLCB`, `RLE`, `RRE`, `RDT`, `KOS`, `KR`, `PR`). A
package position is a job a formation consults, not a player type — which is exactly the
inherit-from-role model this app is built on.

**Madden 26 renamed part of that list**, and the vocabulary seeded here follows the new names:
`LE`/`RE` are now `LEDG`/`REDG` (Edge covers defensive ends *and* 3-4 outside linebackers), the
linebackers are `SAM`/`MIKE`/`WILL` rather than `LOLB`/`MLB`/`ROLB`, the slot corner is `SLCB`
rather than the `NB` we invented, `LS` is a primary position, and `GAD` was added as a package
position. [POSITIONS.md](POSITIONS.md) is the researched reference: the full list, what changed, and
the civil.gg front shapes the seeded formations are drawn from. The **front shapes** are read off
labelled diagrams; those labels are raster images on the page, not text, so the scraper still lays
sub fronts out from a personnel count rather than from the printed labels.

Every slot is still stored with a `verified` flag that starts `false`, shown in the app as "assumed
until verified", and you can toggle it from the depth chart screen. When you have the game, you
compare our screen to theirs once and the guesswork is gone.

---

## Using it week to week

1. **Dashboard** — where the numbers came from, planning status, conflict count.
2. **Team** — group-by-group offense/defense/special teams, cap and expiring deals, where you are
   thin, and the league clock.
3. **Depth chart** — mirror the game's screen into the `game` layer (or seed it and edit), plan
   changes into the `plan` layer.
4. **Formations** — every formation as a diagram with your players on the labelled spots, plus
   its play list and whether each spot inherits or is overridden.
5. **Packages** — one role across every formation that uses it, grouped by personnel. Pick `WR`
   and you are looking at the third receiver in all eight of your 11-personnel looks at once.
6. **Personnel** — role slots, their chain (slot → starter → consuming formations), impact
   preview, and bulk assignment.
7. **Checklist** — exactly what to change in game, in menu order: depth chart differences first,
   then the special-teams lineups, then the formation subs. Exportable to Markdown or CSV so you
   can follow it away from the app.
8. **Call sheet** — situation in, explained call out. Log a drive with one tap per play (coarse
   outcomes only, never play-by-play), get a pre-drive script, and watch your own tendency report
   for tells.
9. **Trades & draft** — log CPU trades (players move between teams immediately), add rookies, and
   check a CPU offer against a pick-value chart.

---

## Where things live

```
src/domain/        Pure logic — no React, no database. This is the tested core.
  depthSlots.ts    The Madden slot vocabulary, each with a verified flag
  resolution.ts    Formation spot -> player, via inherit/override
  impact.ts        Blast radius of a depth chart change
  conflicts.ts     Duplicate starters, injured starters, empty spots
  bulk.ts          Apply one player across a formation family
  concepts.ts      Play name -> concept, with the rules visible
  families.ts      Formation families (3x1, 2x2, empty...) for grouping
  engine.ts        Call selection: deterministic scoring, one reason per call
  tendency.ts      Your own tendencies, by bucket
  drive.ts         Drive state, coarse outcomes, scripts
  tradeValue.ts    Pick values and a player model
src/db/            Drizzle schema, repositories, migrations, snapshots
src/lib/color.ts   WCAG colour maths and the accent-token derivation
src/lib/theme.ts   Mode + team -> the token set the UI paints with
src/data/teamColors.ts  The 32 committed club palettes (never scraped at runtime)
src/lib/importers/ EA ratings + civil.gg playbooks
src/app/           Next.js App Router pages, server actions, API routes
src/app/globals.css  The design tokens and component classes
scripts/           One-off scripts: push, seed, import, scrape, colour audit
tests/             265 tests: the domain core, seed data, checklist exports, the theme contract, DB integration
```

**The call engine is rules and scoring on purpose.** No black box, no LLM. You will use it
mid-drive, so every call has to be explainable, fast, and reproducible — and every recommendation
carries one line saying why. It also tracks the looks you have shown this drive and this game and
biases toward new concepts from familiar looks, which is the actual football answer to being
predictable: repeat the *look*, change the *concept*.

---

## Known gaps

- **Formation subs are not confirmed to persist in-game.** Community reports say they are
  device-and-scheme-tied. The plan is built so the app is authoritative either way: you hold the
  plan, the checklist tells you what to set.
- **Madden 27 is not on EA's ratings feed yet.** The importer uses the newest season that answers
  and labels it; you can also start from the demo roster or enter players by hand.
- **The ratings slug is discovered, not documented.** It will need re-discovery when EA changes
  it. That is what `scripts/probe-ea-api.ts` is for.
- **Auth is one passphrase.** Correct for a single-user tool, not for sharing. There is no
  per-user data separation.
- **Defensive slots also carry assumed bindings.** Offensive role slots (`SLWR`, `3DRB`…) are the
  ones community sources document best; the defensive counterparts (which look consults `RLE`
  versus `LEDG`) are the thinnest part of the seed data.
- **Defensive slot bindings are assumptions, not facts.** Offensive role slots (`SLWR`, `3DRB`…) are
  the ones community sources document best; which front a formation consults (`RLE` versus `LEDG`)
  rests on our reading of civil.gg's alignment diagrams, and those diagrams are images we cannot
  scrape as text ([POSITIONS.md](POSITIONS.md) §4).
- **Special-teams coverage jobs are hand-authored.** The specialists (`K`, `P`, `LS`, `KR`,
  `PR`) come from the depth chart, but *which* backup covers a punt is our reading of the unit, not
  something the game tells us. The checklist shows the lineup so you can correct it in one place.
