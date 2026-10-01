# Handoff — Madden 27 Franchise Manager

**Read this first.** This document is the instruction set for any thread working on this
project. It records what the owner asked for, what has been built, what is deliberately
*not* built, and the rules a change must follow. Where this document and the code
disagree, the code is wrong — or this document is. Fix one of them, loudly.

Verified against the working tree on **2026-09-30**: `npx vitest run` → **382 passed /
24 suites** · `npx tsc --noEmit` clean · production build green.

## How to use this

| If you are… | Read |
| --- | --- |
| Starting any phase | this file, then [`PLAN.md`](PLAN.md) (the phase briefs) |
| Changing any UI | [`DESIGN.md`](DESIGN.md) — normative, not advisory |
| Touching positions or the depth-slot vocabulary | [`POSITIONS.md`](POSITIONS.md) — the Madden 26/27 list and the migration plan |
| Touching scheme fit, plan diffing, archetypes or schemes | [`SCHEME_FIT.md`](SCHEME_FIT.md) — what the game models, and which parts are ours |
| Running or deploying it | [`README.md`](README.md) |

**One thread per phase.** The owner opens a fresh thread for each phase and pastes that
phase's brief from `PLAN.md` §7 plus a pointer to this file. Work proceeds in phases, and
each phase ends with the exit checklist in §7 below.

---

## 1. What this is

A **single-user planning tool for one Madden 27 franchise**, originally framed as a
hosted, mobile-first "GM war room" and drive-calling coach. It is not a league stats
site and never becomes a multi-user product.

It exists to answer four questions, in the owner's framing:

1. **What does my team actually look like?** Offense, defense and special teams, group by
   group, with cap, contracts, dev traits and injuries.
2. **Who plays where?** A depth chart that mirrors the game's own screen — including the
   **package positions** the game layers on top of a player's roster position (`SLWR`, `3DRB`,
   `PWHB`, `NT`, `SUBLB`, `SLCB`, `RLE`, `RRE`, `RDT`, `KOS`, `KR`, `PR`) — plus per-formation
   personnel control. See [`POSITIONS.md`](POSITIONS.md) for the researched Madden 26/27 list.
3. **What do I change in game?** A diff between the game's depth chart and the plan, as an
   ordered apply checklist.
4. **What do I call?** Down and distance in, one explained call out, with the looks already
   shown tracked so the defense isn't being told what is coming.

---

## 2. Every preference and decision the owner has stated

These are requirements, not suggestions. They were stated across the project threads; the
ones already implemented are marked ✅ and the ones still pending are marked ⏳.

### 2.1 Product scope — non-negotiable

- ✅ **One franchise, one user.** No leagues, no sharing, no per-user separation.
- ✅ **Mobile-first and hosted.** Billed as usable from a phone; installable as a PWA.
- ✅ **Depth chart mirrors Madden's own screen**, including situational role slots — not a
  simplified "starter/backup" list.
- ✅ **Per-formation subs with inherit-vs-override semantics.** A spot either follows a
  depth-chart role (inherited, changes with it) or is pinned to a player for that formation
  only (override, visibly an exception). Nothing in between, nothing hidden.
- ✅ **Apply checklist as the delivery mechanism.** The app tells you what to change and in
  what order; the owner makes the change in game.
- ✅ **Deterministic call engine with look variety and a tell meter.** Explanation for every
  call; track the looks shown so the same look can be reused with a different concept.
- ✅ **Trade logging and rookie/draft entry.**
- ✅ **In scope for the front office:** cap & contracts, draft board + rookie entry, trade log
  + trade analyzer, scheme-fit grading.
- ⏳ **Several offense and defense playbooks in parallel**, so schemes can be compared and the
  plan can target whichever playbook is switched to. (Comparison view does not exist yet.)
- ✅ **Injuries, suspensions and inactives are flagged, never silently changed** — with
  next-man-up suggestions.

### 2.2 Data and truthfulness

- ✅ **It must be usable without owning the game.** Real EA ratings data works today; the
  save-file import is an *additive* layer that arrives later. Nothing may be built to depend
  on owning the game.
- ✅ **Label what is assumed.** The slot vocabulary and the formation→slot bindings are seeded
  from public knowledge, stored with a `verified` flag that starts `false`, and surfaced as
  "assumed until verified". Never present a guess as a fact.
- ✅ **And keep the known-wrong list current.** The pre-Madden-26 defensive names (`LE`/`RE`,
  `LOLB`/`MLB`/`ROLB`, an invented `NB`, a holder role `H`) are retired; the seed now uses the game's
  list. [`POSITIONS.md`](POSITIONS.md) is the researched reference, and its §7 keeps what is still
  unconfirmed (position ranks, whether a front ever consults `SLCB`).
- ✅ **Label estimates as estimates** (e.g. approximated cap/expiring-deal values, alongside
  the raw contract fields).
- ✅ **Every figure traces to a save field or is explicitly an estimate.**
- ✅ **The app is authoritative on formation subs**, because in-game persistence is unconfirmed
  (community reports say device- and scheme-tied). Nothing may depend on in-game persistence.
- ✅ **Attribution.** Formation and play data is civil.gg's; we render our own diagrams from
  their coordinates rather than reusing artwork. This project is unaffiliated with them.

### 2.3 Design — the guidelines the owner asked for

The owner's explicit request was to establish design guidelines that **all further updates
must follow**: a **minimalist** site, a **serif font for a professional look**, site
**accents that change with the franchise team**, and a guarantee that **all 32 team colours
pass web colour contrast standards (WCAG)**. The owner was then asked to clarify
preferences and locked these in:

| Decision | Choice |
| --- | --- |
| Theme | **Light and dark**, per-user, defaulting to dark |
| Team colour reach | **Accents only** — never a content surface |
| Typography | **Serif headings, sans for data** |
| Contrast handling | **Auto-derived WCAG-safe tokens** — no hand-picked UI colours, no manual override |
| Team colours | **Primary + secondary** per club |
| The 32 palettes | **One-time scrape, committed** — never fetched at runtime |

All of that is implemented and specified normatively in [`DESIGN.md`](DESIGN.md), which is
the document to read before touching any UI. The essentials: the accent is the team's, the
semantic tones (`good`/`warn`/`bad`/`info`) are **fixed** because "verified" must not turn
red for a red team, no component ever hardcodes a colour, and contrast is enforced by
[`tests/theme.spec.ts`](tests/theme.spec.ts) rather than promised.

**The owner prefers being asked about taste decisions.** On the design work they explicitly
said "ask me more about my design preferences". When a choice is genuinely aesthetic and
irreversible-ish, ask rather than guess — and use the structured question tool, not prose.

### 2.4 Workflow and handoff

- ✅ **A new thread per phase**, so the handoff must be clearly documented (this file exists
  for that reason).
- ✅ **At the end of every phase:** make sure the website is actually usable, then commit,
  push, and **open a pull request after verifying mergeability** — see §7.
- ✅ **Phases are documented before they are built**, with goal → deliverable → done-when.
- ✅ **Documentation must not drift.** Design rules live in `DESIGN.md`, the plan in
  `PLAN.md`, the run/import workflow in `README.md`, and preferences here.

### 2.5 Safety and reversibility

- ✅ **The franchise save is read-only, always.** A timestamped backup is written before any
  read. The save is never opened for writing.
- ✅ **No write-back in v1, and it is not planned for v1.** A bad write does not throw — it
  silently corrupts a season — and Madden re-orders depth charts on its own anyway. The write
  path is kept as an *additive module* so it can be added later without rework, gated on the
  Phase 1 findings and only if explicitly requested afterwards.
- ✅ **Import must never clobber authored work.** Imported EA ratings and owner-authored
  franchise state (contracts, cap, dev traits, injuries, both depth-chart layers, subs,
  trades, rookies) are stored separately for exactly this reason.
- ✅ **Snapshots replace, never merge**, and exclude playbooks (reproducible from the scraper).

---

## 3. Feature inventory — what exists today

Verified by route and export inspection, not from memory.

### Pages

| Route | What it does |
| --- | --- |
| `/` | Dashboard — where the numbers came from, planning status, conflict count |
| `/team` | Group-by-group offense/defense/special teams, cap and expiring deals, thin spots, league clock, backup/restore |
| `/depth-chart` | The two layers (`game` = what Madden has, `plan` = what you want), verified-flag toggles, and a seed card that derives a starting chart from any real roster |
| `/formations` | Every formation, grouped and filterable, with inherits/overrides visible |
| `/formations/[id]` | One formation: diagram with *your* players on the labelled spots, play list, per-slot inheritance state |
| `/packages` | One role across every formation that uses it, grouped by personnel (spotlight a role, read its rank columns) |
| `/personnel` | Role slots, their chain (slot → starter → consuming formations), impact preview, bulk assignment |
| `/callsheet` | Situation in, explained call out; drive logging, pre-drive script, tendency/tell report |
| `/checklist` | What to change in game, in menu order — depth chart diffs, special-teams lineups, then formation subs |
| `/scheme` | Scheme fit per starting role (archetype + attribute floor), mismatch flags, and plan diffing across playbooks |
| `/league` | Scouting — all 32 real Madden 27 rosters, fit graded against your schemes, and the trade shortlist |
| `/league/[teamId]` | One team scouted: every player's OVR, speed, archetype, dev trait and fit, with position/rating/fit filters, a sort by speed or strength, and shortlist toggles |
| `/players` | **Every player, ranked by anything.** All 3,116 rows with a teams checklist (starts on your own club), position, minimum OVR and name filters, and a sort over all 53 attributes plus OVR/name/age/height/weight; 100 per page. `/free-agents` redirects here with the unsigned pool selected |
| `/transactions` | Trade log, rookie entry, pick inventory, trade analyzer |
| `/login` | Passphrase gate |

API: `/api/health`, `/api/snapshot` (export + restore), `/api/checklist/export?format=md|csv`,
`/api/logout`. Metadata route: `src/app/manifest.ts`.

Shared server-side builders: `src/lib/checklist.ts` is the single source of truth for the apply
checklist (the page and the export both read it, so they cannot disagree).

### Server actions (`src/app/actions.ts`)

`setDepthSlot` · `toggleVocabularyVerified` · `assignFormationSlot` · `clearFormationSlot` ·
`rebindFormationSlot` · `bulkAssign` · `markPlanApplied` · `copyGameDepthChartToPlan` ·
`setBucket` · `createDrive` · `advanceDrive` · `refreshDriveRecommendation` ·
`markDriveComplete` · `logTrade` · `addRookie` · `importRatings` · `seedDepthChart` ·
`updateLeague` · `setTradeTarget` · `restoreSnapshot` · `setUserTeam` · `setTheme`

### Domain core (`src/domain/` — pure logic, no React, no database; this is the tested part)

`depthSlots.ts` (vocabulary + verified flags, migrated to the Madden 26/27 list) · `resolution.ts` (spot → player via
inherit/override, plus `normalizeSlotRanks`) · `impact.ts` (blast radius of a change) ·
`conflicts.ts` (duplicate starters, injured starters, empty spots) · `bulk.ts` (one player
across a formation family) · `concepts.ts` · `families.ts` (3x1, 2x2, empty…) · `engine.ts`
(deterministic call scoring) · `tendency.ts` · `drive.ts` · `tradeValue.ts` · `archetypes.ts`
(the 36 Madden 27 archetypes) · `schemes.ts` (the 21 schemes) · `schemeFit.ts` (archetype
resolution and the per-role grade) · `planDiff.ts` (what switching playbooks costs the plan) ·
`scouting.ts` (any player graded against your schemes, for the league screen) ·
`depthChartSeed.ts` (a plausible chart for a roster we did not build by hand: primary roles,
package roles as the next man up, returners by speed) · `playerTable.ts` (the sort-by-any-attribute
order, the team/position/OVR/name filters, and height/weight formatting behind `/players`).

**The call engine is rules and scoring on purpose. No LLM, no black box.** It is used
mid-drive, so every call must be explainable, fast and reproducible, and carries one line
saying why.

### Data sources

- **Madden 27 ratings** (EA's own ratings database, via the SSR page at
  `ea.com/games/madden-nfl/ratings`) — `npm run scrape:ratings` writes a committed artifact
  to `data/imports/`, and `npm run import:ratings` loads it. **The whole game for all 32 teams:
  3,116 players, EA's own archetypes and the full attribute set** — of whom **1,196 are unsigned
  free agents**, read from the launch set because a weekly update only republishes rostered
  players — each also carries **height and weight** (`height_inches`, `weight_lbs`; weight was in
  the payload all along but the parser dropped it until `drizzle/0002_busy_jean_grey.sql`).
  Attributes are surfaced, not just stored: **clicking any player's name anywhere opens his whole
  card** in a native `<dialog>` (all 53 attributes grouped and sorted, height, weight, age,
  college, jersey, archetype, abilities, with the archetype's counted attributes marked), `/players`
  ranks every player by any of them with the checklist starting on your own club, the dashboard
  shows each starter's `SPD` plus a fastest-players card, and `/league/[teamId]` sorts by speed or
  strength. The feed publishes no contracts and no Star/Normal dev traits; the scrape
  route, the silent-empty trap and the query-parameter dead ends are documented in
  [`RATINGS.md`](RATINGS.md) — read that before touching ratings again.
- **EA public ratings API** (`ratings-api.ea.com`) — the older feed, still wired as
  `npm run import:ratings -- --api`. Season slugs are undocumented and it publishes nothing for
  Madden 26 or 27 (500s), so it is a fallback, not the source. `scripts/probe-ea-api.ts` prints
  what responds.
- **Depth chart seed** — no feed publishes a chart, so `npm run seed:chart` (or the seed card on
  `/depth-chart`) derives one for a team from position and overall via `buildTeamDepthChart`,
  writing both layers. It is a starting point to edit, refuses to overwrite an edited chart unless
  `--force` is passed, and leaves formation subs alone.
- **civil.gg playbooks** — `npm run scrape:playbooks`, Playwright, manual on-demand. Cached
  JSON with attribution; never a runtime dependency.
- **Team colours** — `npm run scrape:colors` re-derives from Wikipedia and diffs against the
  committed table; `npm run audit:colors` prints every contrast ratio.
- **Seed data** — scheme infrastructure only: the depth-slot vocabulary, the seeded playbooks,
  the default plan and the call sheet. There is **no demo roster**: teams and players arrive
  entirely from `npm run import:ratings`, so a fresh install has an empty league until you import.
  `db:seed` picks no user team; set it with `seed:chart -- --team=ATL --user-team`.
- **Archetypes and schemes** — a one-time committed scrape of `madden.tools` (36 archetypes,
  21 schemes), never fetched at runtime, the same rule as the colour palettes. See
  [`SCHEME_FIT.md`](SCHEME_FIT.md).

---

## 4. Architecture: as built, and the conflict with the plan

The owner's written plan specified a *different* stack from the one already built here. This
is the **one unresolved decision before Phase 0** (detailed in `PLAN.md` §0.2).

| Plan specifies | Repo today |
| --- | --- |
| Next.js 15 | **Next.js 16** |
| SQLite via `better-sqlite3` + `drizzle-kit` | **PGlite** (embedded Postgres), `postgres`/Neon if `DATABASE_URL` is set |
| Tailwind + shadcn/ui primitives | **Tailwind 4**, hand-rolled components |
| Local-only, no auth, no deploy | **Passphrase auth**, Vercel + Docker paths, PWA manifest |
| `madden-franchise` v4 for save parsing | **No save importer at all** |
| `chokidar` folder watching | Not present (optional in the plan) |
| Vitest | Vitest ✅ (same) |

**Recommendation on record:** keep the existing stack and adopt the plan's *phases, data
model and scope* on top of it. The plan's data model is already substantially implemented on
Drizzle with 315 passing tests, and swapping PGlite for `better-sqlite3` would rewrite the
schema and migrations for no functional gain in a single-file local app. Removing auth and the
deploy configs is a deletion, not a phase. **If the owner prefers the plan's stack verbatim,
Phase 0 becomes "migrate the stack, then scaffold" instead.**

### Pluggable ingest (from the plan — the shape the save work must take)

```
lib/franchise/
  source.ts        # NormalizedLeague, shared by every source
  save-importer.ts # madden-franchise -> NormalizedLeague (PC save)
  companion.ts     # (later) companion-app JSON -> NormalizedLeague
  tables.ts        # table/field mapping, keyed by stable uniqueId, per game year
  backup.ts        # timestamped save copies before every read
```

The rest of the app only ever sees `NormalizedLeague`, so adding a source later is a new
file, not a refactor. **None of this exists yet** — it is Phase 1.

### Stack in use

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Drizzle ORM · PGlite locally,
Neon/Postgres in production · Vitest · tsx · Playwright (dev-only, scraper).

Env vars actually read: `APP_PASSPHRASE` (default `madden`), `SESSION_SECRET`, `DATABASE_URL`,
`DATA_DIR`, `SECURE_COOKIES`. Session cookie is `fm_session` (HMAC-signed, 90 days); theme
mode is the `fm_theme` cookie.

---

## 5. Phase status

Re-verified against the tree, not recalled. "Done" means it works today.

**Active order — owner decision, 2026-09-30.** Phase 1 (the save import) is **deferred**: the
save-driven path blocks nothing, because the app is deliberately authoritative and works on EA
ratings plus manual entry. The work that runs first is the **save-free** unfinished work —
**Phase 5**, then **Phase 4's playbook comparer**. None of it needs a save file. Phase 3's
special-teams units, packages view and checklist export all landed on 2026-09-30; what is left
of Phase 3 is multi-plan support, which belongs with Phase 5's plan diffing.

| Phase | Status | Notes |
| --- | --- | --- |
| **0 — Scaffold** | **Done**, on the repo's stack | Configs, 20 suites, `scripts/`, docs. Pending the §4 stack decision. |
| **1 — Save spike + import pipeline** | **Deferred** (owner, 2026-09-30) | No `src/lib/franchise/`, no `scripts/inspect-save.ts`, `madden-franchise` not a dependency. Revisit when a Madden 27 save exists; a supported-year save (19–26) can validate the approach sooner. Blocks nothing. |
| **2 — Team overview** | **Done** | Position groups, cap sheet, expiring deals, need scoring, 3-deep views. |
| **3 — Depth chart + formation planner** | **Nearly done** | Delivered 2026-09-30: the five **special-teams units** (field goal, punt, punt return, kickoff, kick return) as seeded formations; the **packages** view (`/packages`); and **checklist export** to Markdown/CSV (`/api/checklist/export`). Remaining: multi-plan selection and diffing. |
| **4 — Playbook data + comparison** | **Partly** | Scraper and 6 seed playbooks (34 formations, including the five special-teams units) exist. **No playbook comparer**; no formation editor beyond per-slot rebinding. |
| **5 — Front office — active** | **Mostly** | Scheme fit landed 2026-09-30: `/scheme` grades every starting role on Madden's own archetypes plus an attribute floor, lists mismatches, and diffs the plan across playbooks. The same day: **real Madden 27 rosters** (scraped artifact + import wiring, so every grade now uses EA's stored archetype) and the **scouting screen** (`/league`, `/league/[teamId]`, trade shortlist). Trade log, analyzer, rookie entry and tracked picks already existed. **Depth-chart seeding** landed the same day: [`depthChartSeed.ts`](src/domain/depthChartSeed.ts) derives a chart from position and overall, `seedDepthChartFromRoster` refuses to overwrite without an explicit replace, and `/depth-chart` (or `npm run seed:chart`) writes both layers from any real roster. Also the same day: **free agents and attributes** — the scraper reads the launch set as well as the current update (3,116 players, 1,196 unsigned), and the attributes surface on the dashboard and the scouting sort. And **the full stat sheet**: height and weight now arrive with the import, every player's name anywhere in the app opens a dialog with all 53 attributes, and `/players` ranks the whole league by any one of them, defaulting to your own club through a teams checklist. Remaining: the analyzer's cap and depth-chart fallout, and a draft board grouped by year/round. **Next up — the trade-target board:** ranking every player on every other club by scheme fit and trade value, which needs a continuous fit score and a positional value model first. Research, model and build plan are in [`TRADE_TARGETS.md`](TRADE_TARGETS.md); nothing of it is built yet. |
| **6 — Hardening** | **Partly** | Suites cover slot validation, conflicts, bulk edits, resolution, the call engine, trade value and the WCAG theme contract. No schema-mismatch error UX; save-import idempotency applies only if Phase 1 is revived. |
| **7 — Write-back** | **Deferred by design** | Only if a future save spike shows it is safely writable *and* the owner asks for it. |

**Not in the plan, already built:** the deterministic call-sheet engine with look variety and
the tell meter (`engine.ts`, `callSheet.ts`, `tendency.ts`, `drive.ts`, `/callsheet`), snapshot
export/restore, and the design system.

**Missing tables the plan calls for:** `roster_snapshot`, `snapshot_player`, `value_chart`
(currently code constants), `scheme_fit_threshold` — scheme fit now exists but its floor and
bands are still code constants (`FIT_FLOOR` in [`schemeFit.ts`](src/domain/schemeFit.ts)), not a
DB table. A `plans` table exists but there is effectively one default plan; the depth chart is
keyed by layer, not by plan, so multi-plan needs a schema change.

---

## 6. Working conventions

- **Commands:** `npm run dev` · `npm run build` · `npm test` · `npm run typecheck` ·
  `npm run db:push` · `npm run db:seed` · `npm run scrape:ratings` ·
  `npm run import:ratings` · `npm run seed:chart` · `npm run scrape:playbooks` ·
  `npm run scrape:colors` · `npm run audit:colors`. (`scrape:ratings -- --no-base` skips the
  launch-set pass and writes rostered players only.)
- **No database server is needed.** With `DATABASE_URL` unset the app uses embedded Postgres
  in `./data/pglite`; set it and the same SQL runs against that instead.
- **The local database is not in git** (`data/*.db`, `data/pglite/`, `data/backups/` are
  ignored). A thread in an existing checkout has it; a fresh clone must run `db:push` →
  `db:seed` → `import:ratings` → `seed:chart -- --team=ATL --user-team --force` first.
- **PGlite is single-writer.** A running dev server holds the lock, so CLI commands that touch
  the database fail while it is up — and an ungraceful kill can leave `data/pglite` wedged
  ("unable to open database"). That is a known failure mode: rebuild rather than debug.
- **Tests are the contract.** Typecheck and the suite must be clean before a phase is called
  done. Adding a component that violates the design contract should break
  `tests/theme.spec.ts`, and that is the intent.
- **Commits are small and descriptive**, one logical change each, and must never include
  secrets, `data/`, or a live save file.
- **Branch per phase:** `phase-<n>-<slug>` (e.g. `phase-1-save-spike`), one phase per PR, so
  each is independently reviewable and revertable.

### 6.1 Two threads, one repo — the concurrency protocol

Two threads may run against this repository at once (the phase thread in the main checkout, a
design thread alongside it). **The only thing that can lose work is two writers in one working
tree** — git-level conflicts are recoverable, a clobbered file is not. So:

- **One writer per checkout.** The second thread works in a git worktree at **`.design/`**,
  *inside* this repository's directory: `git worktree add .design -b design-sideline-sheet
  phase-5-scheme-fit`, with its own `npm install`, its own seeded database (`data/pglite` is
  git-ignored, so it is not shared) and its own dev port (`npm run dev -- -p 3001`). PGlite is
  single-writer: never run two dev servers against one `data/pglite`.
- **Keep the worktree inside the project directory.** A worktree placed *outside* it cannot be
  edited by an agent's file tools, and work intended for it gets written into this checkout
  instead. That has already happened once — see the note below.
- **`.design/` is excluded in `.git/info/exclude`, not in `.gitignore`**, so the tracked ignore
  file stays yours. Do not add it to `.gitignore`.
- **Commit order does not matter. Merge order does.** The design branch owns the shared components
  (`ui.tsx`, `NavTabs`, `globals.css`, `layout.tsx`), so it merges into `phase-5-scheme-fit`
  **first**; this branch then pulls it once and re-applies its own additions inside the new
  structure.
- **Before pulling a design merge, commit your work.** A dirty tree plus a pull that touches the
  same files is the only genuinely painful scenario.
- **Do not PR the design branch to `main`** while `main` lags a phase branch — the PR would carry
  every phase commit with it. PR it into the active phase branch; that branch's own PR to `main`
  then carries both.

**Note — 2026-09-30.** While the design thread was setting up, design files were briefly written
into this checkout instead of the worktree. They were moved onto the design branch, and these files
were restored to their committed state: `DESIGN.md`, `src/app/globals.css`, `src/app/layout.tsx`,
`src/components/ThemeToggle.tsx`, `src/components/FormationDiagram.tsx`, `src/lib/color.ts`,
`src/lib/theme.ts`. `src/components/ui.tsx` had a genuine uncommitted change there (the `title` prop
on `Badge`) and it was re-applied exactly. If you had uncommitted edits in any of those files at
that moment, re-check them — nothing else in this tree was touched.

When the design PR is merged into `origin/phase-5-scheme-fit`:

```bash
# 1. Commit everything first — no dirty tree across a merge.
git status --short                      # review, then stage what you own
git add <your files> && git commit -m "…"

# 2. Pull the redesign in.
git fetch origin
git merge origin/phase-5-scheme-fit     # resolve once, using the rule below

# 3. Typecheck and test before continuing.
npm run typecheck && npm test
```

**Resolution rule for every conflicted code file: take the design branch's version wholesale, then
re-apply your addition.** Expected conflicts, and what each one means:

| File | Your side | Resolution |
| --- | --- | --- |
| `src/components/ui.tsx` | `title` prop on `Badge` | Take the new component module — `Mark` already carries `title` |
| `src/components/NavBar.tsx` | Scouting link | Take `NavTabs`; add Scouting under the Scheme tab in `nav.ts` and delete `NavBar.tsx` |
| `src/app/depth-chart/page.tsx` | Seed card | Keep the feature; rebuild it with `Sheet` + `Field` + `Button` |
| `src/app/page.tsx`, `src/app/scheme/page.tsx`, `src/app/actions.ts` | feature edits | Take the new page; re-apply anything behavioural |
| `HANDOFF.md`, `README.md` | doc edits | **Keep both sides** — additive, never either/or |

`src/app/league/*`, `src/app/players/*`, `src/app/free-agents/*` and `src/components/PlayerDialog.tsx`
are untracked, so they never conflict — but they are the screens still on the old components after
the merge (the dialog is `'use client'`, the second interactive file after the nav). That is planned for: they stay listed as
*pending* in [`DESIGN.md`](DESIGN.md) §11, the legacy `Card`/`Stat`/`Badge` exports are kept alive
deliberately so they still compile, and converting them is the next design task (which is also what
makes those aliases deletable).

---

## 7. Phase exit checklist

Run this at the end of **every** phase, in order:

1. **Make the website usable.** Run `npm run dev` and click through every route, at desktop
   *and* phone width. A phase is not done if the app is broken, blank, unstyled or returning
   an error — regardless of test results.
2. **Verify.** `npm run typecheck` and `npm run test` clean, then the real end-to-end pass for
   that phase (import a save and reconcile counts, plan a full playbook, generate the
   checklist, sanity-check a trade).
3. **Confirm no regressions** to the phases already done — overview, depth chart, planner,
   checklist and trade log must not be worse than they were found.
4. **Commit** — small, descriptive.
5. **Push** the phase branch.
6. **Open a pull request and verify it is mergeable** — no conflicts against the target, CI
   green if CI exists. Report the PR URL and the mergeability check in the thread.

**Current state of the plumbing:** remote `origin` → `https://github.com/joshhkee/franchise-manager.git`,
one commit pushed, `main` tracking `origin/main`, tree clean. **`gh` is installed but not
authenticated**, so step 6 needs `gh auth login` once.

---

## 8. Hard "do not" list

- **Do not write to the franchise save.** Read-only, backup before every read.
- **Do not build write-back** unless the owner explicitly asks, after Phase 1 reports.
- **Do not put an LLM in the call engine.** Deterministic rules and scoring, one reason per call.
- **Do not scrape or fetch at runtime.** Playbooks, ratings and colours are cached artifacts
  (or a committed table) with a manual path; scraping must never be a runtime dependency.
- **Do not hardcode a colour** in a component — no literal hex, no `text-white/60`, no
  `border-emerald-400`. Use tokens or component classes.
- **Do not use the team accent for meaning.** `good`/`warn`/`bad`/`info` are fixed.
- **Do not let a team colour bypass derivation**, and do not hand-pick a team's UI colour —
  add the *true* hexes to `src/data/teamColors.ts` and let the derivation work.
- **Do not present assumed data as verified.** The slot vocabulary and defensive bindings are
  thin, and their `verified` flags start `false` for a reason.
- **Do not silently change a lineup** because of injury or unavailability — flag it and
  suggest next-man-up.
- **Do not commit** secrets, `data/`, a live save file, or the embedded database.
- **Do not silently break the design contract.** Fix the change, or change `DESIGN.md`
  deliberately.

---

## 9. Known gaps, risks and unverified assumptions

- **Phase 1 is deferred by decision (2026-09-30), and it was never a sequencing gate anyway.**
  Its own wording is that
  "nothing else is built around assumptions" about the save — which is a rule about evidence,
  not an ordering. It does not block the rest of the app: phases 2, 3 and 5 are already
  substantially built with **no save data at all**, because the app is deliberately
  authoritative and the save is an additive layer. The only piece that genuinely needs a save
  file to exist is Phase 1's deliverable — the written report on which tables and fields are
  depended on, whether the in-game depth chart is readable, and whether formation subs exist
  in the file.
- **The owner may not own Madden 27 yet**, but that does not block the spike. `madden-franchise`
  supports Madden 19–27, and the questions that matter — does the library expose the depth
  chart, do formation subs appear in the file, what are the tables and fields — are answerable
  on **any** supported year's save. A public or community save would validate the whole approach
  now; only "confirm it holds on 27" needs 27.
- **The position-vocabulary migration has landed.** Madden 26 replaced `LE`/`RE` with
  `LEDG`/`REDG` (Edge covers defensive ends *and* 3-4 outside linebackers), `LOLB`/`MLB`/`ROLB` with
  `SAM`/`MIKE`/`WILL`, made `LS` a primary position and added `GAD` as a package position, and has no
  holder role. [`depthSlots.ts`](src/domain/depthSlots.ts) seeds that list, and `applySeed`
  reconciles an existing depth chart onto the replacements rather than clobbering it.
  [`POSITIONS.md`](POSITIONS.md) records the vocabulary, the civil.gg front shapes, and what is still
  unconfirmed.
- **Player/team IDs change between exports** (a long-standing Madden complaint) → stable
  composite keys (name + position + age), snapshot history, and a manual merge UI when a match
  is ambiguous.
- **~2,000 tables and ~300-field Player records** with table-name collisions → resolve by
  stable `uniqueId` with a verified fallback, read only needed fields, keep the mapping in one
  file that is cheap to update each game year.
- **Formation subs may not persist in-game.** The app is authoritative; the checklist is the
  delivery mechanism.
- **Cap rules are approximated** → show raw contract fields next to computed figures and label
  estimates.
- **Fit grades a bucket, and value has no positional premium.** `gradeRoleFit` returns five
  categories, so it cannot *rank* three thousand players, and `playerValue` prices a 90-overall
  running back and a 90-overall quarterback identically. Both have to change before a trade board
  can order the league: the researched fit score is in
  [`SCHEME_FIT.md`](SCHEME_FIT.md) §7–8 and the value model in
  [`TRADE_TARGETS.md`](TRADE_TARGETS.md).
- **Scraping is ToS-grey and fragile** → one-off script, committed JSON with attribution, a
  manual editing path, madden-school.com as a secondary source.
- **The Madden 27 ratings route will change without notice.** EA's `drop-api` silently answers a
  bare fetch with an empty league, the site page is the working route, and on some machines
  Chromium cannot reach EA at all (`npm run scrape:ratings` falls back to Node fetch, which is
  fragile but validated). [`RATINGS.md`](RATINGS.md) is the source of record; re-read it before
  touching the scraper.
- **Auth is one shared passphrase.** Correct for a single-user tool, wrong for sharing.
- **UI has no automated test coverage** — all 23 suites are domain logic, seed data, the parsed
  ratings feed, export formatting, DB integration and the theme contract.
- **Special-teams coverage jobs are hand-authored.** The specialists come from the depth chart,
  but which backup covers a punt is our reading of the unit rather than something the game tells
  us. The checklist prints each lineup so it can be corrected in one place.
- **Repo hygiene:** `data/imports/ea-ratings-madden27-madden-ratings-week-2.json` (2.9 MB,
  regenerable, committed on purpose so the app works offline) is the real roster source.
  `data/imports/ea-ratings-m24-ratings.json` (6 MB, a stale `m24` dump) is still there and is
  replaced on the first Madden 27 import; consider deleting it.
- **The field diagram overlaps player names** on crowded fronts (e.g. `3-4 Base`). Known,
  pre-existing, unfixed.

---

## 10. Open decisions

**Resolved:** Phase 1 is deferred and the save-free work runs first (owner, 2026-09-30).

| # | Decision | Why it matters |
| --- | --- | --- |
| 1 | **Stack: keep existing, or migrate to the plan's (SQLite/`better-sqlite3`, Next 15, shadcn, strip auth/deploy)?** | Determines whether Phase 0 is a thin gap-close or a migration. Recommendation on record is to keep. |
| 2 | **Which 3–4 playbooks (offense + defense) to seed first?** | Phase 4 quality; the scraper can fetch whatever is named. |
| 3 | **Tune the trade value chart yourself, or start from a standard pick-value table and adjust in-app?** | Phase 5; the plan lists this as needed at build time. |
| 4 | ~~What belongs in the special-teams units?~~ **Resolved** (2026-09-30): all five — field goal, punt, punt return, kickoff, kick return — seeded as formations in `pb-special-teams`, specialists from the depth chart and coverage jobs from the backups of the roles each unit uses. Revisit if a unit's lineup is wrong in game. | — |
| 5 | ~~When to migrate the position vocabulary?~~ **Resolved** (2026-09-30): it landed before Phase 5, as the plan required — `LE`/`RE` → `LEDG`/`REDG`, `LOLB`/`MLB`/`ROLB` → `SAM`/`MIKE`/`WILL`, `NB` → `SLCB`, `LS` promoted to primary, `GAD` added, `H` retired. | — |
| 6 | **Confirm the open position questions in game** (ranks per position? does a front ever consult `SLCB`? what should `GAD` change?). | The cheap ones are answered; three remain in [`POSITIONS.md`](POSITIONS.md) §7, and the 3-3-5 and 3-4 Bear look are now settled from the diagrams. |
| 7 | **Whether `chokidar` save-folder watching is wanted** | Convenience vs. complexity; optional, and only relevant if Phase 1 is revived. |
| 8 | **Does the trade-target board replace `/league`, or get its own route?** | One screen that answers "who should I go get" was the ask; the 32-team map stays either way. Detail in [`TRADE_TARGETS.md`](TRADE_TARGETS.md) §9. |
| 9 | **Rank players without contracts, or require cap-hit entry first?** | The feed publishes none, so contract surplus is unavailable today. Recommendation: rank on talent × position × age, label it, and apply surplus only once a cap hit exists. |
| 10 | **Scope order for the trade work — fit score + value first, or value alone on `/transactions`? And one PR or two?** | Recommendation: the fit score and value model together (a ranking is meaningless without both), then the board. |

## Related documents

- [`PLAN.md`](PLAN.md) — the implementation plan: scope, stack, data model, phase briefs, risks, phase-exit workflow.
- [`POSITIONS.md`](POSITIONS.md) — Madden 26/27 primary vs package positions, what this repo gets wrong, and the migration plan.
- [`SCHEME_FIT.md`](SCHEME_FIT.md) — how scheme fit is graded, the archetype and scheme tables it grades against, and the football research behind the planned fit score.
- [`TRADE_TARGETS.md`](TRADE_TARGETS.md) — how players are valued, how a roster need is detected, and the plan for the ranked trade-target board.
- [`RATINGS.md`](RATINGS.md) — Madden 27 roster scraping: the working source, EA's own position list, the silent-empty failure mode, and the build plan.
- [`DESIGN.md`](DESIGN.md) — the design contract every UI change must follow.
- [`README.md`](README.md) — what the app does today, and how to run and deploy it.
