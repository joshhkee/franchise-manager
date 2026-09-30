# Madden 27 Franchise Manager — Implementation Plan

The authoritative plan. **Read this file first in every phase thread.** It holds the
scope, the stack, the data model, the phase breakdown, the exit workflow, and — in
section 5 — an honest account of what already exists in this repository so a new
thread does not rebuild it or assume a greenfield checkout.

A local-only, single-user "GM war room" for one Madden 27 PC franchise. Reads your
franchise save file, and gives you a full team overview plus a depth chart and
formation-sub planner you can actually apply in-game from a generated checklist.

---

## 0. Before any phase starts — two blockers

### 0.1 Repository plumbing

**Resolved 2026-09-30 — remote and initial commit now exist.**

| Requirement | State |
| --- | --- |
| Git remote | `origin` → `https://github.com/joshhkee/franchise-manager.git` |
| Commits | One (`8563921 Initial Commit`), pushed. `main` tracks `origin/main`; tree clean. |
| Default branch | **`main`** (not `master`). Phase branches target `main`. |
| `gh` CLI | Installed (2.101.0) but **still not authenticated** — run `gh auth login` before any phase thread needs to open a PR. |

Everything in the phase-exit checklist (section 6) now runs as written; only **PR
creation** is gated on `gh auth login`.

Two repo-hygiene notes for phase threads:

- **The local database is not in git.** `data/*.db`, `data/pglite/` and `data/backups/`
  are gitignored. A thread working in this same checkout keeps its seeded DB on disk;
  one starting from a fresh clone must run `npm run db:push`, `npm run db:seed` and
  (for real data) `npm run import:ratings` first. See the README.
- **`data/imports/ea-ratings-m24-ratings.json` (6 MB) is committed.** It is regenerable
  and already stale (an `m24` dump, not `m27`). Consider gitignoring it before it grows.

### 0.2 Stack conflict — decide before Phase 0

This plan specifies a stack that **differs from what is already built in this repo**
(full detail in section 5). The differences are not cosmetic:

- Plan: **SQLite via `better-sqlite3`** · Repo: **PGlite** (embedded Postgres), with `postgres`/Neon if `DATABASE_URL` is set
- Plan: **Next.js 15** · Repo: **Next.js 16**
- Plan: **shadcn/ui primitives** · Repo: **hand-rolled Tailwind 4 components**
- Plan: **local-only, no auth, no deploy** · Repo: **passphrase auth + Vercel/Docker deploy configs + PWA manifest**
- Plan: **`madden-franchise` for save parsing** · Repo: **no save importer at all** (only an EA ratings API importer and a civil.gg playbook scraper)

**Recommendation (pending your confirmation): keep the existing stack and adopt this
plan's *phases, data model and scope* on top of it.** Rationale: the data model in
section 4 is already substantially implemented on Drizzle (section 5), with 265
passing tests. Swapping the driver from PGlite to `better-sqlite3` would rewrite the
schema and migrations for no functional gain in a local-only app — PGlite already
gives us a single local file with the same SQL. Dropping auth/deploy configs is a
deletion, not a phase. If you would rather migrate to the plan's stack verbatim, say
so and Phase 0 becomes "migrate stack, then scaffold" instead.

Until this is confirmed, phase threads should assume the existing stack and treat the
save-import work (Phase 1) as the real gate — it is the same work either way.

---

## 1. Confirmed decisions

- **Data source:** your PC franchise save file, read-only. No companion app, no EA login, no cloud.
- **Hosting:** local-only web app on your machine. No auth, no deploy.
- **Planning depth:** full per-formation slot assignment (every slot in every formation of the playbook).
- **In scope:** cap & contracts, draft board + rookie entry, trade log + trade analyzer, scheme-fit grading.
- **Availability:** injuries/suspensions/inactives are flagged, with next-man-up suggestions — never silent changes.
- **Write-back:** deferred. We ship an apply-checklist; the write path is kept as an additive module so it can be added later without rework.
- **Playbooks:** several offense + defense playbooks in parallel, so you can compare schemes and plan against whichever you switch to.

## 2. Stack

- Next.js 15 (App Router) + TypeScript, run with `npm run dev` on localhost.
- SQLite via `better-sqlite3` + Drizzle ORM + `drizzle-kit` migrations (single local DB file).
- Tailwind CSS + a handful of shadcn/ui primitives.
- `madden-franchise` (v4, ESM) used only in server-only code for save parsing.
- `chokidar` (optional save-folder watching), Playwright (dev-only, for the one-off playbook scraper).
- Vitest for domain-logic tests.

See section 0.2 — the repo currently differs on several of these.

## 3. Architecture: pluggable ingest

```
lib/franchise/
  source.ts        # NormalizedLeague shape shared by all sources
  save-importer.ts # madden-franchise -> NormalizedLeague (PC save)
  companion.ts     # (later) companion-app export JSON -> NormalizedLeague
  tables.ts        # table/field mapping, keyed by stable uniqueId, per game year
  backup.ts        # timestamped copies of the save before every read
```

The rest of the app only ever sees `NormalizedLeague`, so adding the companion-app
path later is a new file, not a refactor.

## 4. Data model

- **league** — name, game year, save path, current week/season, my team, cap total.
- **team** — Madden team id, abbr, name, conference, division.
- **player** — Madden player id, name, position, jersey, age, years pro, OVR, dev trait, full ratings JSON, height/weight, college, contract JSON, cap hit, years remaining, injury status + weeks, roster status.
- **roster_snapshot / snapshot_player** — one row per import, with per-week ratings, so you get history and trending, and drift is detectable.
- **draft_pick** — year, round, original team, current team (your asset inventory, tradeable).
- **transaction** — type (trade/draft/signing/cut/extension), week, counterparty, incoming/outgoing players+picks as JSON, analyzer value each way, notes.
- **playbook / formation / formation_slot** — the seeded playbook data, with source (civil/manual) and a per-formation edit flag.
- **plan** — a named planning context: `{ playbook, depth_chart, formation subs, personnel rules }`. You can hold several plans (one per playbook you're considering) and diff them.
- **depth_chart_plan** — position group + ordered player list.
- **formation_sub_plan** — formation slot → player.
- **value_chart** — tunable pick/player trade-value table for the analyzer.
- **scheme_fit_threshold** — tunable attribute thresholds per role/position.

## 5. Current repository state (delta against this plan)

This section exists so a phase thread knows what is already sitting on disk. It was
verified against the working tree, not remembered.

### Status at handoff (verified 2026-09-30)

Re-checked against the tree and a live run, not recalled: `npx vitest run` → **265
passed / 17 suites** · `npx tsc --noEmit` clean · production build green. There is no
`better-sqlite3` migration and no save importer; the stack question in section 0.2 is
**still open** and is the one decision a phase thread must not guess at.

| Phase | Status | Where / what is missing |
| --- | --- | --- |
| 0 — Scaffold | **Done**, on the repo's stack (see §0.2) | `package.json`, `tsconfig.json`, `next.config.ts`, `drizzle.config.ts`, `vitest.config.ts`, `README.md`, 17 suites, `scripts/` |
| 1 — Save spike + import pipeline | **Deferred** (owner, 2026-09-30) | No `src/lib/franchise/`, no `scripts/inspect-save.ts`; `madden-franchise` is absent from `package.json` (it appears only as a user-agent string). Blocks nothing — the app is authoritative and works without a save. Revisit when a Madden 27 save exists |
| 2 — Team overview | **Done** | `src/app/page.tsx`, `src/app/team/page.tsx` — position groups, cap sheet, expiring deals, positional need scoring, 3-deep views |
| 3 — Depth chart + formation planner | **Substantially done** | `src/app/depth-chart/page.tsx`, `src/app/personnel/page.tsx`, `src/app/formations/**`, `src/app/checklist/page.tsx`, `src/domain/{resolution,impact,conflicts,bulk}.ts` — per-formation slot assignment, inherit-vs-override subs, duplicate/empty detection, availability warnings, impact preview, apply checklist. Delivered 2026-09-30: **special-teams units** (`pb-special-teams` — field goal, punt, punt return, kickoff, kick return), the **packages** view (`src/app/packages/page.tsx`), and **checklist export** to Markdown/CSV (`src/app/api/checklist/export/route.ts`). **Remaining gap:** multi-plan selection/diffing |
| 4 — Playbook data + comparison | **Partly** | `scripts/scrape-playbooks.ts`, `src/lib/importers/civilPlaybooks.ts`, `src/data/seed/playbooks.ts` — real civil.gg scraper, 6 seed playbooks (34 formations, including the five special-teams units). **No playbook comparer**, and no formation editor beyond per-slot rebinding |
| 5 — Front office — **next active** | **Partly** | `src/app/transactions/page.tsx`, `src/domain/tradeValue.ts` — trade log, trade analyzer, rookie entry, tracked picks. **No scheme-fit grading, no plan diffing** |
| 6 — Hardening | **Partly** | Suites cover slot validation, conflicts, bulk edits, resolution, the call engine, trade value and the WCAG theme contrast contract. **No save-import idempotency** (blocked on Phase 1), no schema-mismatch error UX |
| 7 — Write-back | **Deferred by design** | — |
| — | **Extra, not in this plan** | Deterministic call-sheet engine + tell meter + drive scripting (`src/domain/{engine,callSheet,tendency,drive}.ts`, `src/app/callsheet/page.tsx`); snapshot export/restore; design system (`DESIGN.md`) |

### Missing entirely — the real work

- **Phase 1 — the save spike and import pipeline.** No `madden-franchise` dependency, no `lib/franchise/`, no `scripts/inspect-save.ts`. It is the gate on *assumptions* about the save, **not** on the rest of the build — everything already covered in this section runs on the EA ratings feed, manual entry and the demo league with no save file at all. The report it produces is the one artefact that genuinely requires a save.
- **Compaction/time-series:** `roster_snapshot` / `snapshot_player` (the repo has a JSON *export* called a snapshot — a different thing).
- **Tunable tables:** `value_chart` and `scheme_fit_threshold` are code constants today, not DB tables.
- **Multi-plan support:** a `plans` table exists but there is effectively one default plan; there is no plan diffing and no per-playbook plan comparison.
- **Playbook comparison view** (Phase 4) and **scheme-fit grading** (Phase 5).
- **`inspect-save` reporting:** nothing enumerates the save's tables or confirms whether depth chart / formation subs are readable.

### Schema present today

`src/db/schema.ts`: `teams`, `players`, `franchisePlayers`, `leagues`, `depthSlots`,
`depthChartEntries`, `formationSubs`, `playbooks`, `formations`, `formationSlots`,
`formationPlays`, `plans`, `callSheetEntries`, `drives`, `driveCalls`,
`transactions`, `draftPicks`, `auditLog`.

Mapping to section 4: `team` ≈ `teams` · `player` ≈ `players` + `franchisePlayers`
(ratings kept deliberately separate so a ratings refresh never clobbers your
contracts) · `draft_pick` ≈ `draftPicks` · `transaction` ≈ `transactions` ·
`playbook`/`formation`/`formation_slot` ≈ `playbooks`/`formations`/`formationSlots` ·
`league` ≈ `leagues`. **Not present:** `roster_snapshot`, `snapshot_player`,
`value_chart`, `scheme_fit_threshold`.

## 6. Phase workflow (exit checklist — run at the end of every phase)

Every phase thread finishes by doing all of the following, in order:

1. **Make the website usable.** Run `npm run dev` and click through every route. A phase is not done if the app is broken, blank, unstyled, or returns an error — regardless of test results. Re-verify at desktop and phone width.
2. **Verify.** `npm run typecheck` and `npm run test` must both be clean. Then do the real end-to-end pass for that phase (section 8).
3. **Confirm no regressions to existing phases.** The app has working overview, depth chart, planner, checklist and trade log; do not leave them worse than you found them.
4. **Commit.** Small, descriptive, one logical change per commit. Never commit secrets, `data/`, or a live save file.
5. **Push** the phase branch to the remote.
6. **Open a pull request**, then **verify it is mergeable** — no conflicts against the target branch, CI green if CI exists. Report the PR URL and the mergeability check in the thread.

> **One prerequisite remains from section 0.1:** `gh auth login`. Remote and initial
> commit are done, so steps 4–5 work today; step 6 needs `gh` authenticated.

Branch naming suggestion: `phase-<n>-<slug>` (e.g. `phase-1-save-spike`), PR into the
default branch, one phase per PR so each is reviewable and revertable on its own.

## 7. Phases

Each phase is written as: goal → deliverable → done-when. **Start a new thread per
phase**, pasting the phase brief plus a pointer to this file and [`HANDOFF.md`](HANDOFF.md)
(the instruction set: preferences, conventions, "do not" list, exit checklist).

> **Active order (owner decision, 2026-09-30).** **Phase 1 is deferred** — the save-import
> path blocks nothing, since the app is authoritative and runs on the EA ratings feed plus
> manual entry. Phase 3's special-teams units, packages view and checklist export landed on
> 2026-09-30; what is left of it is multi-plan support, which belongs with Phase 5's plan
> diffing. So the order is **Phase 5** (scheme-fit grading, plan diffing), then **Phase 4's
> playbook comparer**. Phase 1 is revisited only when a Madden 27 save exists — and a
> supported-year save (19–26) can validate the approach sooner if wanted.

### Phase 0 — Scaffold

**Goal.** Next.js/TS/Tailwind, SQLite + Drizzle, Vitest, `scripts/` folder, README
documenting the local run + import workflow.

**Deliverable.** A running skeleton with the test harness wired.

**Done when.** `npm run dev` serves a styled page; `npm run typecheck` and
`npm run test` are clean. *(See section 0.2: this is largely already true, on the
existing stack. Phase 0 becomes a thin gap-closing exercise or a migration,
depending on your decision.)*

### Phase 1 — Save spike + import pipeline (the gate)

**Goal.** Find out what the save actually contains before building anything on
assumptions.

**Status: deferred by the owner (2026-09-30).** See the active-order note above — the
save-free work runs first.

**This phase does not block the rest of the app.** The app is already usable with no save
(EA ratings import, manual entry, the demo league), so nothing that does not read the save
needs to wait for this. What it gates is a *claim* — that the save can supply franchise
state, and whether the depth chart and formation subs are readable at all. `madden-franchise`
supports Madden 19–27, so the spike can run against any supported year's save; only the final
confirmation is 27-specific.

**Deliverable.** `scripts/inspect-save.ts` enumerates every table (name, uniqueId,
record count), dumps the `Player` and `Team` schemas, and hunts for
depth-chart/formation-sub storage. Then `save-importer.ts` normalizes rosters, teams,
contracts and draft picks into the DB, with a backup written before every read.

**Done when.** A **written report** states exactly which tables/fields we depend on,
whether your in-game depth chart is readable, and whether formation subs exist in the
file. Nothing else gets built around assumptions until you have seen that report.

### Phase 2 — Team overview

**Goal.** The GM's first screen.

**Deliverable.** Team dashboard with position-group cards (starter/backup/depth with
OVR, age, contract, cap hit), team OVR by side, dev-trait counts, and a positional
need score (weak starters, thin depth, expiring deals). Dedicated Offense / Defense /
Special Teams tabs, a 3-deep depth chart view, and a cap sheet with expiring deals by
season (approximated values labelled as such).

**Done when.** Every figure traces to a save field or is explicitly labelled an
estimate.

### Phase 3 — Depth chart + formation planner

**Goal.** Plan every slot, then apply it in game.

**Deliverable.** Per-plan depth chart ordering (including K/P/LS/H/KR/PR and all
defensive groups) and, for each formation in the chosen playbook, full slot
assignment. Includes auto-fill from depth chart, per-slot eligibility rules,
duplicate-player and empty-slot detection, and a conflict panel driven by
injury/availability. Special-teams units (FG/PAT, punt, punt return, kick return,
kickoff) planned the same way. A grouped "packages" view so you can see every 3-WR
formation's WR3 at a glance. **Output:** apply checklist — ordered by in-game screen,
checkable, progress saved, exportable to Markdown/CSV.

**Done when.** You can plan a full offense playbook, generate the checklist, and
follow it in game without the app guessing.

**Status (2026-09-30).** Everything above is built except multi-plan support: the depth
chart with both layers, per-formation assignment with inherit/override, conflict
reporting, bulk assignment, the five special-teams units as ordinary formations, the
`/packages` role-across-formations view, and the apply checklist — which exports to
Markdown and CSV from `/api/checklist/export`. Multi-plan selection and diffing is the
last piece, and it pairs with Phase 5's plan diffing.

### Phase 4 — Playbook data + comparison

**Goal.** Choose a scheme with the data in front of you.

**Deliverable.** `scripts/scrape-playbooks.ts` (Playwright, run manually, on-demand)
turns civil.gg's public playbook pages into `data/playbooks/*.json`, merged into the
DB with attribution. Formation slots derived from personnel group + an editable
per-formation-type template. In-app formation editor so a civil.gg redesign or a bad
scrape is a 20-second fix, never a blocker. Side-by-side playbook comparer
(formations, personnel groups, play counts).

**Done when.** A bad scrape is fixable in-app and scraping is never a runtime dependency.

### Phase 5 — Front-office features

**Goal.** Trades, draft, and scheme fit.

**Deliverable.** Trade log (players + picks both directions, CPU counterparty, full
history) with a trade analyzer using the tunable value chart plus cap and
depth-chart fallout. Draft board with your picks by year/round and rookie entry that
adds players and logs the draft transaction. Scheme-fit grading against your plan's
playbook — attribute thresholds per role, plus "your playbook uses a slot this player
can't fill" flags. Plan diffing across playbooks.

**Done when.** A real trade produces a sane valuation, and a player's fit is graded
against the actual playbook.

### Phase 6 — Hardening

**Goal.** Trust it with a season.

**Deliverable.** Unit tests for slot validation, next-man-up, cap math and trade
value; import idempotency (same save twice → no duplicates); save backups verified;
clear error UX for schema mismatches and unreadable files.

**Done when.** Importing the same save twice is a no-op, and a corrupt save fails loudly and safely.

### Phase 7 (deferred) — Write-back

**Goal.** Optional, gated.

**Deliverable.** Kept behind its own module, gated on the Phase 1 findings.

**Done when.** Only pursued if the spike shows depth chart (and ideally formation
subs) are safely writable **and** you explicitly want it.

## 8. Verification

`npm run typecheck` and `npm run test` after each phase, **plus a real end-to-end pass
per phase**: import an actual save and reconcile roster/position counts against the
in-game screen, plan one full offense playbook, generate the checklist, and confirm
the trade log and analyzer produce sane values on a real trade.

## 9. Key risks and mitigations

- **Player/team IDs change between exports** (a long-standing Madden complaint) → stable composite keys (name + position + age), snapshot history, and a manual merge UI when a match is ambiguous.
- **~2,000 tables, 300-field Player records, table-name collisions** → resolve by stable uniqueId with a verified fallback, read only needed fields, keep the field mapping in one file that's cheap to update each game year.
- **Formation subs may not be stored in the save, or may not persist in-game at all** → the app is authoritative for the plan; the checklist is the delivery mechanism; nothing depends on in-game persistence.
- **Playbook slot data may be incomplete** → template table + in-app editor; scraping is a cached artifact, never a runtime dependency.
- **Scraping is ToS-grey and fragile** → one-off script, cached JSON with attribution, manual editing path, madden-school.com as a secondary source.
- **Cap rules are approximated** → show raw contract fields alongside computed figures and label estimates.
- **Save safety** → strictly read-only; backup copy before any read; never open the save for writing.

## 10. What's needed from you at build time

- The path to your franchise save (and whether it's `CAREER-*`, zipped, or both) plus whether you want folder-watching enabled.
- Which 3–4 playbooks (offense + defense) you're choosing between, so those get seeded first.
- Whether you want to tune the trade value chart yourself or start with a standard pick-value table and adjust in-app.

---

## Related documents

- [`HANDOFF.md`](HANDOFF.md) — the instruction set for any thread: stated preferences, features, phase status, conventions, exit checklist.
- [`README.md`](README.md) — what the app does today, and how to run it.
- [`DESIGN.md`](DESIGN.md) — the design system every UI change must follow (serif headings, team-driven accent, WCAG contract enforced by tests).
