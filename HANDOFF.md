# Handoff — Madden 27 Franchise Manager

**Read this first.** This document is the instruction set for any thread working on this
project. It records what the owner asked for, what has been built, what is deliberately
*not* built, and the rules a change must follow. Where this document and the code
disagree, the code is wrong — or this document is. Fix one of them, loudly.

Verified against the working tree on **2026-09-30**: `npx vitest run` → **265 passed /
17 suites** · `npx tsc --noEmit` clean · production build green.

## How to use this

| If you are… | Read |
| --- | --- |
| Starting any phase | this file, then [`PLAN.md`](PLAN.md) (the phase briefs) |
| Changing any UI | [`DESIGN.md`](DESIGN.md) — normative, not advisory |
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
   situational roles (`SLWR`, `3DRB`, `PWHB`, `NT`, `SUBLE`, `NB`, `KOS`…) — plus
   per-formation personnel control.
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
| `/depth-chart` | The two layers (`game` = what Madden has, `plan` = what you want), verified-flag toggles |
| `/formations` | Every formation, grouped and filterable, with inherits/overrides visible |
| `/formations/[id]` | One formation: diagram with *your* players on the labelled spots, play list, per-slot inheritance state |
| `/packages` | One role across every formation that uses it, grouped by personnel (spotlight a role, read its rank columns) |
| `/personnel` | Role slots, their chain (slot → starter → consuming formations), impact preview, bulk assignment |
| `/callsheet` | Situation in, explained call out; drive logging, pre-drive script, tendency/tell report |
| `/checklist` | What to change in game, in menu order — depth chart diffs, special-teams lineups, then formation subs |
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
`markDriveComplete` · `logTrade` · `addRookie` · `importRatings` · `updateLeague` ·
`restoreSnapshot` · `setUserTeam` · `setTheme`

### Domain core (`src/domain/` — pure logic, no React, no database; this is the tested part)

`depthSlots.ts` (vocabulary + verified flags) · `resolution.ts` (spot → player via
inherit/override, plus `normalizeSlotRanks`) · `impact.ts` (blast radius of a change) ·
`conflicts.ts` (duplicate starters, injured starters, empty spots) · `bulk.ts` (one player
across a formation family) · `concepts.ts` · `families.ts` (3x1, 2x2, empty…) · `engine.ts`
(deterministic call scoring) · `tendency.ts` · `drive.ts` · `tradeValue.ts`.

**The call engine is rules and scoring on purpose. No LLM, no black box.** It is used
mid-drive, so every call must be explainable, fast and reproducible, and carries one line
saying why.

### Data sources

- **EA public ratings API** (`ratings-api.ea.com`) — `npm run import:ratings`. Season slugs
  are undocumented; the importer probes newest-first, uses the newest that answers, and
  labels rows with it. `scripts/probe-ea-api.ts` prints what responds.
- **civil.gg playbooks** — `npm run scrape:playbooks`, Playwright, manual on-demand. Cached
  JSON with attribution; never a runtime dependency.
- **Team colours** — `npm run scrape:colors` re-derives from Wikipedia and diffs against the
  committed table; `npm run audit:colors` prints every contrast ratio.
- **Seed data** — a demo league (`Demo Franchise` + 3 synthetic CPU teams) and a **53-man
  active roster** plus a practice squad the depth chart deliberately ignores. This exists so
  the app is usable before the game is owned.

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
Drizzle with 265 passing tests, and swapping PGlite for `better-sqlite3` would rewrite the
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
| **0 — Scaffold** | **Done**, on the repo's stack | Configs, 17 suites, `scripts/`, docs. Pending the §4 stack decision. |
| **1 — Save spike + import pipeline** | **Deferred** (owner, 2026-09-30) | No `src/lib/franchise/`, no `scripts/inspect-save.ts`, `madden-franchise` not a dependency. Revisit when a Madden 27 save exists; a supported-year save (19–26) can validate the approach sooner. Blocks nothing. |
| **2 — Team overview** | **Done** | Position groups, cap sheet, expiring deals, need scoring, 3-deep views. |
| **3 — Depth chart + formation planner** | **Nearly done** | Delivered 2026-09-30: the five **special-teams units** (field goal, punt, punt return, kickoff, kick return) as seeded formations; the **packages** view (`/packages`); and **checklist export** to Markdown/CSV (`/api/checklist/export`). Remaining: multi-plan selection and diffing. |
| **4 — Playbook data + comparison** | **Partly** | Scraper and 6 seed playbooks (34 formations, including the five special-teams units) exist. **No playbook comparer**; no formation editor beyond per-slot rebinding. |
| **5 — Front office — next active** | **Partly** | Trade log, analyzer, rookie entry, tracked picks exist. **No scheme-fit grading. No plan diffing.** |
| **6 — Hardening** | **Partly** | Suites cover slot validation, conflicts, bulk edits, resolution, the call engine, trade value and the WCAG theme contract. No schema-mismatch error UX; save-import idempotency applies only if Phase 1 is revived. |
| **7 — Write-back** | **Deferred by design** | Only if a future save spike shows it is safely writable *and* the owner asks for it. |

**Not in the plan, already built:** the deterministic call-sheet engine with look variety and
the tell meter (`engine.ts`, `callSheet.ts`, `tendency.ts`, `drive.ts`, `/callsheet`), snapshot
export/restore, and the design system.

**Missing tables the plan calls for:** `roster_snapshot`, `snapshot_player`, `value_chart`
(currently code constants), `scheme_fit_threshold` (same). A `plans` table exists but there is
effectively one default plan.

---

## 6. Working conventions

- **Commands:** `npm run dev` · `npm run build` · `npm test` · `npm run typecheck` ·
  `npm run db:push` · `npm run db:seed` · `npm run import:ratings` ·
  `npm run scrape:playbooks` · `npm run scrape:colors` · `npm run audit:colors`.
- **No database server is needed.** With `DATABASE_URL` unset the app uses embedded Postgres
  in `./data/pglite`; set it and the same SQL runs against that instead.
- **The local database is not in git** (`data/*.db`, `data/pglite/`, `data/backups/` are
  ignored). A thread in an existing checkout has it; a fresh clone must run `db:push` →
  `db:seed` → `import:ratings` first.
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
- **Scraping is ToS-grey and fragile** → one-off script, cached JSON with attribution, a manual
  editing path, madden-school.com as a secondary source.
- **Madden 27 is not on EA's ratings feed yet**; the importer uses the newest season that
  answers and labels it. The slug is discovered, not documented, and will need re-discovery.
- **Auth is one shared passphrase.** Correct for a single-user tool, wrong for sharing.
- **UI has no automated test coverage** — all 17 suites are domain logic, seed data, export
  formatting, DB integration and the theme contract.
- **Special-teams coverage jobs are hand-authored.** The specialists come from the depth chart,
  but which backup covers a punt is our reading of the unit rather than something the game tells
  us. The checklist prints each lineup so it can be corrected in one place.
- **Repo hygiene:** `data/imports/ea-ratings-m24-ratings.json` (6 MB, regenerable, already
  stale — an `m24` dump) is committed. Consider gitignoring it.
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
| 5 | **Whether `chokidar` save-folder watching is wanted** | Convenience vs. complexity; optional, and only relevant if Phase 1 is revived. |

## Related documents

- [`PLAN.md`](PLAN.md) — the implementation plan: scope, stack, data model, phase briefs, risks, phase-exit workflow.
- [`DESIGN.md`](DESIGN.md) — the design contract every UI change must follow.
- [`README.md`](README.md) — what the app does today, and how to run and deploy it.
