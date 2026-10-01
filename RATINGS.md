# Real Madden 27 rosters — source, evidence and build plan

**Read [`HANDOFF.md`](HANDOFF.md) first.** This document is the handoff for one specific
piece of work: replacing the synthetic demo league with **real Madden 27 players for all 32
teams**, so the app can answer the owner's actual questions — *what does my starting lineup
look like, where am I weak, who fits the scheme I want to run, and who on other teams is
worth trading for.*

It is written to be picked up cold in a new thread. Everything marked **verified** was
confirmed by direct request on **2026-09-30**; everything marked *unverified* is a lead, not
a fact. Do not restate the verified parts as new discoveries — they cost hours.

> **Status 2026-10-01 — the demo league is gone.** The 32 real clubs and ~3,100 players now
> come entirely from `npm run import:ratings`; `npm run db:seed` seeds scheme data only (slot
> vocabulary, playbooks, default plan and call sheet) and picks no team. There is no synthetic
> roster or CPU team left in `src/`. Set your club with `npm run seed:chart -- --team=ATL
> --user-team`. Statements below that describe the demo league are kept as the record of what
> this work replaced.

> **Status, later on 2026-09-30: the plan is built.** On branch `phase-5-scheme-fit`:
> `npm run scrape:ratings` (Playwright, with a validated Node-fetch fallback), the committed
> artifact `data/imports/ea-ratings-madden27-madden-ratings-week-2.json` (**3,116 players, 32
> teams, 4.8 MB — 1,196 of them unsigned free agents**), the import wiring
> (`npm run import:ratings` reads the artifact by default and replaces the previous ratings pull),
> and the `/league` scouting screen with a trade shortlist.
> `tests/eaDropRatings.spec.ts` pins the parser against synthetic SSR fixtures.
>
> Findings from the build, worth carrying forward:
>
> - **The site page honours `?iteration=`, unlike `drop-api`.** `1-base` returns 3,111 rows and
>   `madden-ratings-week-1` 1,891 — so those iterations are not empty here, they are simply a
>   different dataset. The effective iteration is in `props.pageProps.ratingsFilters.iteration`
>   (not in `ratingDetails`, which carries only `items`/`totalItems`), and the scraper pins
>   `--iteration=madden-ratings-week-2` so the artifact is labelled.
> - **Chromium on this machine cannot reach ea.com at all** — `ERR_CONNECTION_RESET` with
>   `--disable-http2`, `ERR_HTTP2_PROTOCOL_ERROR` without — while Node `fetch` reads the SSR page
>   fine. The scraper tries the browser first and falls back to Node, still asserting the first
>   row has a position, and records `transport: "fetch"` in the artifact. Playwright remains the
>   documented route for environments where it works.
> - **Guards arrive as `G_*`** (`G_Power`, `G_PassProtector`, `G_Agile`) where older dumps used
>   `OG_*`; both are mapped in `EA_ARCHETYPE_TO_ID` now. `KP_*`/`LS_*` resolve to nothing on
>   purpose — our archetype table has no specialist entries.
> - **A full pull is 20 pages** for the current update (11 rows on the last) and **32** for the
>   launch set, and everything after `parseDropPage` is pure and offline-testable.
> - **The free agents live in the launch set and nowhere else** (§2.5). A weekly update republishes
>   rostered players only, so `madden-ratings-week-2` carries no unsigned player at all. The
>   scraper now reads both iterations and merges them, newest numbers winning, stamping each
>   launch-set row with `ratingsIteration` so the difference stays visible. **§2.4's older table
>   was wrong about this** — see the correction there.
> - **Every attribute EA publishes arrives with the import** (55 stat keys per player), plus the
>   two measurements that were being dropped — **height and weight** — and they are on screen:
>   clicking any player's name anywhere in the app opens his whole card (all 53 attributes grouped
>   and sorted, height, weight, age, college, jersey, archetype, abilities), and **`/players` ranks
>   every player in the game by any one of them**, opening on your own club through a teams
>   checklist. The dashboard shows each starter's `SPD` and your fastest players, `/league/[teamId]`
>   sorts by speed or strength, and `/free-agents` now redirects to `/players` with the unsigned
>   pool selected.
>
> **Step 6 landed too, 2026-09-30.** `src/domain/depthChartSeed.ts` derives a chart from position
> and overall (primaries first, package roles as the next man up, returners by speed, backups
> spread), `seedDepthChartFromRoster` refuses to touch a chart you have edited without an explicit
> replace, and it is reachable from the seed card on `/depth-chart` or
> `npm run seed:chart -- --team=ATL --user-team --force`. The Falcons chart now reads Bijan
> Robinson / Drake London / Chris Lindstrom / Jessie Bates, and `/scheme` grades it on EA's own
> archetypes. **Two honest limits:** the feed publishes no depth chart and no roster status, so
> every player is treated as available and the result is only a starting point; and a roster with
> no fullback hands the role to its best unused eligible body (a tight end, for the Falcons).

---

## 1. Why this work exists

The owner is starting an **Atlanta Falcons** franchise (team id `14`). The tool must let them:

1. see the initial depth chart as Madden draws it;
2. see which positions need improving via trade or draft;
3. see how each player fits the scheme they intend to implement;
4. **scout every other team** and identify trade targets.

Before this work none of that was possible with real data: the app ran on a synthetic demo
league, and the one real importer pulled **Madden 24** ratings. That was the gap this closed,
and the demo league has since been removed outright.

The owner also flagged a **future patch**: a trade-suggestion / "scout" engine that surfaces
good scheme fits and hidden gems on other teams. This document deliberately lays the data
foundation for that, but does not build it.

---

## 2. The finding: where Madden 27 ratings actually live

**Verified.** There are two different EA ratings services, and we were pointed at the dead one.

| Service | Status for Madden 27 |
| --- | --- |
| `ratings-api.ea.com/v2/entities/<slug>` — what `src/lib/importers/eaRatings.ts` uses today | **Dead end.** `m23`/`m24-ratings` return full player sets; `m25-ratings` returns `count: 0`; `m26-ratings` and `m27-ratings` both return **HTTP 500** `Server threw major exception`. |
| `drop-api.ea.com/rating/madden-nfl` — what **ea.com's own ratings database** reads from | **Has Madden 27.** Current rosters, full attributes, EA archetypes, dev-trait ability tiers. |

The human-facing page is `https://www.ea.com/games/madden-nfl/ratings` — note **there is no
year in the path**. `…/madden-nfl-27/ratings` and `…/madden-nfl-27/player-ratings` both
**404** (they still return a full EA 404 page, so check the status code, not the body).
The page title is *"Madden NFL 27 Player Ratings – Week 2"*.

### 2.1 The access trap — read this before writing any fetch code

**Verified.** `drop-api` is behind bot protection and fails *silently*:

- A bare `fetch` from Node gets **HTTP 200 with `{"items":[],"totalItems":0}`**. Not a 403,
  not an error — an empty league. It looks exactly like "Madden 27 has no ratings yet".
  Browser-ish headers (UA, `origin`, `referer`) do **not** help.
- The **same URL fetched from inside a real browser context returns 1,911 players.**
- Node fetching the *ea.com HTML* worked once, then started returning 200 with no usable
  payload (Akamai throttling after several rapid requests).
- Direct `node:http2` to `drop-api` is refused (`ERR_HTTP2_GOAWAY_SESSION`).

**Consequence: this must be scraped with Playwright (already a devDependency, already used by
`scripts/discover-ratings-endpoint.ts`), never with plain `fetch`.** Any design that fetches
this at app runtime or in a server action will silently produce an empty league in production.

### 2.2 The query-parameter surface is effectively unusable

**Verified.** `limit` caps at **100**; `limit=101` is an **HTTP 400**. Beyond that, the API
rejects anything we can find:

| Query | Result |
| --- | --- |
| `?locale=en&limit=100` | 200, 1,957 items — **but these are lean Madden 26 rows** |
| `?locale=en&limit=100&iteration=madden-ratings-week-2` | **200, 1,911 rich Madden 27 rows — the one that works** |
| `…&offset=0` / `offset=100` / `offset=1900` | 200, **0 items** |
| `…&position=WR`, `…&team=2`, `…&page=2` | 200, **0 items** |
| `…&orderBy=overallRating:desc` | **400** |

The site's own minified bundle (`_next/static/chunks/918-*.js`) builds a param list of
`offset, orderBy, position, search, team, player, iteration, player-ability, big-mover,
class-level, rookie`, and `_next/static/chunks/pages/games/%5BfranchiseSlug%5D/ratings-*.js`
maps the site's `?page=` to it. **In practice the server ignores or empties every one of
them for us.** Why is *unverified* — possibly cache-keyed, possibly the origin is broken and
only pre-warmed keys answer. Do not plan around the API's filters.

### 2.3 The path that works: the server-rendered site page

**Verified.** The ratings page is Next.js SSR (`__N_SSP`) and embeds its data in
`__NEXT_DATA__` (~941 KB on page 1). This is the harvest route:

```
https://www.ea.com/games/madden-nfl/ratings            # page 1, 100 players + all metadata
https://www.ea.com/games/madden-nfl/ratings?page=2     # 100 more players
…through ?page=20                                      # 1,911 total → 20 pages
```

- **Pagination works via `?page=N`, 1-based.** Verified on pages 1, 2, 3, 20 (all 200 with
  100 items; page 2 begins `Jalen Carter` and ends `Cross`, i.e. genuinely different rows). The
  launch set (`?iteration=1-base`) paginates the same way and needs 32 pages for its 3,111 rows.
- Players live at **`props.pageProps.ratingDetails.items`**; `totalItems` gives 1,911.
- **Nesting quirk:** a raw HTML fetch puts them at `props.pageProps.ratingDetails`, but
  reading `window.__NEXT_DATA__` *after client-side navigation* nests once more, at
  `props.pageProps.pageProps.ratingDetails`. Handle both. `parseDropPage` in the file below
  does.
- **`?page=21` returns 200 with ~596 KB, but whether it carries rows is *unverified*.**
  Loop until a page yields zero items rather than hard-coding 20.
- **Faster variant (verified):** instead of 20 full page loads, navigate once and then call
  `fetch('…/ratings?page=N')` **from inside the page context**, reading the HTML string. That
  returned 100 parsed players per page. Same origin, so no CORS problem — the bot check is
  satisfied by the browser context, not by rendering.
- **Rate-limit yourself** (~350 ms between requests) and keep a browser-like UA. Requests in
  a tight loop started degrading.

### 2.4 Which iteration to scrape

**Verified on the SSR route, corrected 2026-09-30.** The official iteration list is in the page
payload (`auxData.defaultLocaleFilters.iterations`), and every entry serves **rich Madden 27
rows** — `avatarUrl` → `…/madden-nfl-27/…`, 55 stat keys, real `position` and `team`:

| Iteration id | Label | What it actually returns |
| --- | --- | --- |
| `madden-ratings-week-2` | Week 2 Ratings | 1,911 rows — **rostered players only.** The current numbers. |
| `madden-ratings-week-1` | Week 1 Ratings | 1,891 rows, same rich shape. |
| `1-base` | Launch Ratings | **3,111 rows — the whole game, 1,196 of them unsigned.** Where the free agents live (§2.5). |

> **Correction — this table used to be wrong.** An earlier version said `madden-ratings-week-1`
> returned 0 items and `1-base` was lean Madden 26 data. Those numbers came from `drop-api`, which
> **ignores `iteration` and answers with the previous game's default** — the trap described in
> §2.1/§2.2, not a fact about the iterations. Probed directly against
> `ea.com/games/madden-nfl/ratings?iteration=…`, all three answers are Madden 27 shape, and
> `1-base` is the launch set the game ships with.

Also probed and empty: `madden-ratings-base`, `madden-ratings-week-3/4/5`, `2-base`,
`3-week-2`, `24-week-1`. The *old* game's iterations (`2-week-1`, `3-week-2`, …
`23-super-bowl`) return 1,866–2,035 **lean** rows.

**Where the trap still bites:** `drop-api`'s no-iteration default answers with lean Madden **26**
rows where `position`, `archetype` and `team` are all `null` — a bigger dataset that is useless
(§2.1). On the SSR route the default page *is* the current iteration's data, but the payload does
not label it, so pass `--iteration=` to keep the artifact named: the scraper also compares the
default against `iterations[0]` and only names it when the row counts match. Either way, keep
asserting `position !== null` on the first row.

### 2.5 The free agents only exist in the launch set

**Verified.** A weekly update republishes the players who are on a roster; it says nothing about
the unsigned pool. So `madden-ratings-week-2` (1,911 rows) contains **no free agent at all**:
`?iteration=madden-ratings-week-2&player=<a launch-set free agent>` returns 0 rows, while the same
player answers from `1-base`. The launch set is the whole game — 3,111 rows, 1,196 of them with no
team (`Bobby Wagner`, `Tyreek Hill`, `Joey Bosa`, `Joe Mixon`, `Kenny Moore II`…), and each of them
carries all 55 attributes.

So `npm run scrape:ratings` reads **two** iterations — the current update (20 pages) and the launch
set (32 pages) — and `toRatingsImportResult` folds them together:

- a player the current update carries keeps his **current** numbers;
- a player only the launch set knows is added and stamped `ratingsIteration: '1-base'`, so a launch
  rating is never passed off as a current one;
- the union is **3,116 players** (5 players appear in the current update but not in the launch set).

`--no-base` skips the second pass. On import, a team-less player gets `rosterStatus: 'free-agent'`,
which is what keeps him out of the depth-chart seed and the team screens.

---

## 3. The data

### 3.1 Player record (rich / Madden 27)

Keys: `id, firstName, lastName, birthdate, height, weight, overallRating, college,
handedness, age, jerseyNum, yearsPro, playerAbilities, avatarUrl, archetype, team, position,
iteration, availableIterations, stats`.

```
position    { id: "WR", shortLabel: "WR", label: "Wide Receiver",
              positionType: { id: "offense", name: "Offense" } }
archetype   { id: "WR_DeepThreat", label: "Deep Threat - WR" }
team        { id: 2, label: "Cincinnati Bengals", imageUrl: "…", isPopular: false }
playerAbilities[0]
            { id: "Z_07", label: "Double Me", description: "…", imageUrl: "…",
              type: { id: "xFactor", label: "X-Factor", imageUrl: "…", iconUrl: "…" } }
stats       { speed: { value: 96, diff: 0 }, … }   // 55 keys
height      72      // inches
weight      205     // pounds
```

Both measurements now land in the database — `players.height_inches` and `players.weight_lbs` — and
are shown on the player card and the `/players` table. **Weight is the one field the parser used to
throw away**: it has been in the payload all along, the importer read it (`raw.weight`) but never
wrote it, so every screen said nothing about size until 2026-09-30. The column arrives as
`drizzle/0002_busy_jean_grey.sql`, and that is a trap worth remembering: **`npm run db:push` only
replays the committed SQL in `drizzle/`, it does not diff `schema.ts`.** Edit the schema, run
`npm run db:generate`, then `npm run db:push` — otherwise the insert fails on a column that exists in
TypeScript and not in Postgres.

- **`stats` carries 55 keys with bare EA attribute names** — `speed`, `bCVision`,
  `throwAccuracyDeep`, … — which map **1:1 onto `EaAttributeKey`** in
  [`src/domain/archetypes.ts`](src/domain/archetypes.ts). Each value is `{ value, diff }`,
  where `diff` is the change since the previous ratings update (useful later for a
  "stock up / stock down" view; unused today).
- Two of the 55 are not ratings: `overall` and `runningStyle`.
- **Attribute values must be stored with the `_rating` suffix** (`speed_rating`) — that is
  what `ratingKey()` writes and what the app reads (`readAttribute` tolerates both, but stay
  consistent with `src/lib/seedRatings.ts`).
- `archetype.id` is **exactly** the key format `EA_ARCHETYPE_TO_ID` in `archetypes.ts` already
  maps (`WR_DeepThreat` → `wr-deep-threat`). **This is the single most valuable field in the
  payload** — see §5.1.
- `team.label` is the **full** name. There is no abbreviation in the payload; resolve it
  through `EA_TEAMS` in [`src/lib/importers/eaRatings.ts`](src/lib/importers/eaRatings.ts).
- **No salary, cap hit, contract years or signing bonus anywhere in this feed.**

### 3.2 Metadata — EA's own vocabulary, and it settles a repo question

**Verified.** `props.pageProps.auxData.defaultLocaleFilters` carries:

**`positions` — 22 entries, the complete Madden 27 primary position list:**

```
offense (10):        QB HB FB WR TE LT LG C RG RT
defense (9):         LEDG REDG DT SAM MIKE WILL CB FS SS
special-teams (3):   K P LS
```

**This independently confirms the whole vocabulary migration in [`POSITIONS.md`](POSITIONS.md),
from EA's own data rather than from a diagram.** `LEDG`, `REDG`, `SAM`, `MIKE`, `WILL` and
`LS` are real primary positions; `NT`, `RDT`, `RLE`, `RRE`, `SUBLB`, `SLCB`, `SLWR`, `3DRB`,
`PWHB`, `GAD`, `KR`, `PR` and `KOS` are **absent** — they are secondary/package roles, exactly
as the migration modelled them. `primaryPositions()` in
[`src/domain/depthSlots.ts`](src/domain/depthSlots.ts) matches this list. Worth citing in
`POSITIONS.md` §7, which had `SLCB`-style questions marked open.

One nuance to note, not fix: the owner described `FB` as optional, but EA ships it as a
primary position.

**`teamGroups`** — 8 groups → **32 teams** as `{ id, label }` (Atlanta Falcons = `14`).
This is a usable team-id ↔ name map if you ever need it, though each player row carries its
own team label.

**`playerAbilities`** — **115 ability definitions**, each `{ id, label, description, imageUrl,
type }`, where `type.id` is `xFactor` (22) or `superstarAbility` (93). This is what makes dev
traits derivable: **`xFactor` ability → X-Factor development, `superstarAbility` → Superstar.**

**`iterations`** — the three in §2.4.

---

## 4. What this feed does *not* give us

Be honest about each of these in the UI rather than filling them with guesses — the owner's
standing rule is to label estimates and assumptions.

| Missing | Consequence |
| --- | --- |
| Contracts, cap hits, cap space | **No cap maths, and trade value can only be age/OVR-based.** Check what `src/domain/tradeValue.ts` actually requires before promising a trade engine. |
| Star vs Normal development | Abilities distinguish X-Factor and Superstar only. A player with no abilities is written as `devTrait: null` (**unknown**), never guessed as Normal — mislabelling a Star as Normal understates a real asset. |
| Depth chart order | The feed is a player list, not a depth chart. The initial Falcons depth chart comes from our own `buildTeamDepthChart` logic ([`depthChartSeed.ts`](src/domain/depthChartSeed.ts)) and reads position and overall only — no roster status, no practice squad, no in-game chart. |
| Injuries, scheme choices, franchise state | Unchanged from today: entered in the app or, later, read from a save file. Phase 1 remains **deferred**. |
| Ratings rank within a position | Derivable: sort the imported players. |

---

## 5. Current state of the tree

Branch `phase-5-scheme-fit` (PR #3 open). **`npx tsc --noEmit` is clean.** Uncommitted:

**New — the parser is already written and typechecks:**
[`src/lib/importers/eaDropRatings.ts`](src/lib/importers/eaDropRatings.ts). Pure, no network,
no browser. Exports:

- `extractNextData(html)` / `metaFromHtml(html)` — pull the SSR payload and the vocabularies.
- `parseDropPage(html): DropPage` — `{ players, rowCount, total, iteration, meta }`,
  handling **both** prop nestings.
- `normalizeDropPlayer(raw): EaRatingsPlayer | null` — flattens `stats` with the `_rating`
  suffix, carries `archetype`, joins ability labels, resolves `team.label` → abbr, returns
  `null` for rows with no name or no position.
- `devTraitFromAbilities(abilities)` — the tier rule in §3.2.
- `toRatingsImportResult({ pages, base, source, iteration })` — folds pages into the **existing**
  `RatingsImportResult` shape, deduping by id, merging the launch set for the players the current
  update does not carry (`ratingsIteration` records which set each row came from), and emits
  honest coverage notes (players with no team, players with an archetype, ability-tier counts).
- `DropArtifact` / `isDropArtifact` / `artifactToImportResult` — the committed-artifact replay
  path.

**Superseded by the status block at the top of this file:** it is now wired, tested against
synthetic SSR fixtures, and used by the scraper. Read that block before trusting this section's
tense wording.

**New — a diagnostic, now on the route that works:**
[`scripts/probe-drop-api.ts`](scripts/probe-drop-api.ts) is a thorough discovery print
(iterations, positions, archetypes, teams, stat keys, ability tiers) in the style of the
existing `probe-ea-api.ts`. It was first written against `drop-api`'s `offset` pagination, which
returns 0 items every time (§2.2); it now reads the SSR `?page=N` route and returns real rows.
Do not reintroduce `offset`.

**Modified:** [`src/lib/importers/eaRatings.ts`](src/lib/importers/eaRatings.ts) —
`EaRatingsPlayer` gained optional `archetype?: string | null` and
`devTrait?: 'xfactor' | 'superstar' | null`.

**Known-good baseline:** 24 suites / 382 tests passing (`npx tsc --noEmit` clean, build green),
including the depth-chart seeding rules in `tests/depthChartSeed.spec.ts`, the launch-set merge in
`tests/eaDropRatings.spec.ts`, and the ranking rules in `tests/playerTable.spec.ts`.

### 5.1 The free win: scheme fit upgrades itself

[`gradeRoleFit`](src/domain/schemeFit.ts) already reads a **stored** archetype from
`ratings.archetype` and prefers it over one it *derives* from attributes
(`archetypeSource: 'stored' | 'derived' | 'none'`). Because the feed's archetype codes are the
keys `resolveArchetypeId` already maps, **storing EA's real archetype upgrades every fit grade
from `derived` to `stored` with no change to the fit engine at all.** (The demo roster used to
be derived-only; the import now stores EA's own archetype.) This is the cheapest meaningful
accuracy win in the whole body of work — and it lands directly on the owner's stated goal #3.

---

## 6. Build plan

One phase. Present it to the owner as "real Madden 27 rosters for the league, and a scouting
view to go with it". Suggested order — each step is independently verifiable.

**1. Prove the parser against real HTML.** Write `tests/eaDropRatings.spec.ts` around a small
synthetic `__NEXT_DATA__` fixture (a `<script id="__NEXT_DATA__" type="application/json">`
block), covering: rich-row normalization; `{value}` flattening and the `_rating` suffix;
archetype carry-through; `team.label` → abbr; ability tier → dev trait; missing/unknown team →
`teamId: null`; unnamed row → dropped; malformed HTML → empty page, no throw; **both** prop
nestings; metadata extraction (22 positions, 32 teams, 115 abilities / both tiers);
dedupe + coverage notes in `toRatingsImportResult`. Then run it, then and only then wire it up.

**2. Write the scraper** — `scripts/scrape-ea-ratings.ts`, npm script `scrape:ratings`.
Playwright launch → `goto` the ratings page → in-page `fetch` of `?page=N` (N = 1.. until a
page returns zero rows, cap ~25) → `parseDropPage` each → capture `meta` from page 1 → write
`data/imports/ea-ratings-madden27-<iteration>.json` in the `DropArtifact` shape. Support
`--iteration=` and `--pages=`. Print: pages read, unique players, teams, **archetype codes we
could not map** (so `EA_ARCHETYPE_TO_ID` can be extended), dev-trait counts, and an explicit
assertion that the first row has a non-null `position` (the §2.4 trap). Rate-limit ~350 ms.
Reuse the Playwright boilerplate in `scripts/discover-ratings-endpoint.ts`.

**3. Run it and commit the artifact.** Precedent: `data/imports/ea-ratings-m24-ratings.json`
is **6.1 MB and committed**; `data/*.db` and `data/pglite/` are gitignored but `data/imports/`
is not. **Recommendation on record: commit the Madden 27 artifact**, because the app must work
offline and deterministically — the same rule as the team palettes and the archetype/scheme
tables. Expect ~2–4 MB. Record `source`, `iteration` and `scrapedAt` inside it, and attribute
EA in the UI, as `SCHEME_FIT.md` does for `madden.tools`.

**4. Wire the import.** Extend `scripts/import-ratings.ts` to accept a drop artifact
(`--file=…`, detected with `isDropArtifact`) and to default to the committed Madden 27
artifact when present. `artifactToImportResult` already produces the shape
`persistRatings` consumes, so the write path needs no structural change.

**5. Carry dev traits through persistence.** [`src/db/import.ts`](src/db/import.ts)
`persistRatings` currently hard-codes `devTrait: null` on new overlay rows and always writes
the salary-approximation note. Change it to `player.devTrait ?? null`, and only write the
salary note when `player.salary !== null`. **This edit was attempted in the previous thread and
did not apply — the file is untouched.**

**6. Seed real depth charts — done 2026-09-30.** Real rosters arrive with no chart at all, so
the pure `buildTeamDepthChart` in [`src/domain/depthChartSeed.ts`](src/domain/depthChartSeed.ts)
derives one from position and overall, `seedDepthChartFromRoster` writes it to both layers, and
`/depth-chart` plus `npm run seed:chart` expose it. (The hand-authored `buildSeedDepthChart` for
the demo roster was removed with the demo league on 2026-10-01.) It refuses to overwrite an edited chart
without an explicit replace. As required: a seeded chart is a starting point, not the game's
chart, and the copy on screen says so.

**7. Build the scouting screen.** A `/league` view (32 teams, real records) plus a team detail
showing each player's OVR, archetype, dev trait and **scheme fit**, with filters for team,
position, OVR and fit grade, and a shortlist the owner can build trade targets from. Reuse
`src/components/ui.tsx` and obey [`DESIGN.md`](DESIGN.md): minimal, serif headings, accent only,
fixed semantic tones, mobile-first, dark by default. Server components + the existing loader
pattern (`src/lib/loaders.ts`); no client-side data fetching.

**8. Docs.** Update `README.md` (scripts, features), `HANDOFF.md` §3 data sources and §5 phase
status, and `PLAN.md`. Keep this file as the source of record for the endpoint behaviour.

**9. Verify and land.** `npx tsc --noEmit`, `npx vitest run`, `npm run build`, then click every
route at desktop **and 390 px**. **Stop the dev server before `npm run db:seed` — PGlite is
single-writer.** Commit, push, open a **stacked PR** (PR #3 `phase-5-scheme-fit` is still open;
do not target `main` until it merges), and verify `MERGEABLE`/`CLEAN`.

---

## 7. Open decisions — ask the owner, don't guess

1. **Commit the artifact, or generate it on demand?** Recommendation: commit (§6.3).
2. ~~**Replace the demo league, or keep it alongside real data?**~~ **Resolved 2026-10-01:** the
   demo league is removed. `db:seed` ships scheme data only and the real 32 arrive with the
   import; there is no synthetic fallback roster.
3. **Player id scheme changes.** The old importer keys players by EA's `plyrAssetname`; the new
   feed keys by EA numeric id (`21586`). Existing `franchisePlayers` overlay rows keyed by old
   ids become orphans. Harmless (ids are unique) but visible — decide whether to migrate them
   by name at import time or leave them.
4. **Scouting scope for this phase.** Full 32-team browser, or Falcons-first with a jump to
   any team? The former is what the owner described; the latter is smaller and still useful.

---

## 8. Do not

- **Do not fetch ratings at app runtime or in a server action.** It silently returns an empty
  league outside a browser context (§2.1) and breaks the offline guarantee.
- **Do not add Playwright as a runtime dependency.** It stays dev-only, like the playbook and
  colour scrapers.
- **Do not invent contract or cap numbers.** The feed has none (§4).
- **Do not trust `offset`, `position`, `team` or `page` on `drop-api`** (§2.2).
- **Do not omit `iteration`** when scraping (§2.4) — you will silently get Madden 26.
- **Do not write back to any franchise save.** Unchanged, and Phase 1 stays deferred.

---

## 9. Commands

```bash
npm run db:seed          # scheme data only; stop the dev server first (PGlite is single-writer)
npm run dev              # dev server
npx tsc --noEmit         # typecheck
npx vitest run           # 24 suites / 382 tests at handoff
npm run scrape:ratings -- --transport=fetch   # current update + launch set (no Chromium)
npm run scrape:ratings -- --no-base           # rostered players only
npx tsx scripts/discover-ratings-endpoint.ts   # Playwright boilerplate to copy
```

---

## 10. Sources

- **EA's own ratings database**, read 2026-09-30: `www.ea.com/games/madden-nfl/ratings`
  (SSR payload) and the `drop-api.ea.com/rating/madden-nfl` service behind it. Iterations
  `madden-ratings-week-2` (1,911 rostered players) and `1-base` (3,111 including the 1,196 free
  agents), 32 teams.
- **EA's older public ratings API**, `ratings-api.ea.com/v2/entities` — dead for 26/27 (§2).
- `maddenratings.com` — a third-party Madden 27 database (top-20 list seen). **Structure
  *unverified*.** A possible cross-check or fallback if EA changes their site.
- `madden.tools/schemes` and `/archetypes` — already scraped for Phase 5; see
  [`SCHEME_FIT.md`](SCHEME_FIT.md).

---

## Related documents

- [`HANDOFF.md`](HANDOFF.md) — the thread instruction set; read before starting.
- [`POSITIONS.md`](POSITIONS.md) — primary vs package positions; §3.2 here confirms it from EA's own data.
- [`SCHEME_FIT.md`](SCHEME_FIT.md) — archetypes and schemes; §5.1 here plugs real archetypes into it.
- [`DESIGN.md`](DESIGN.md) — the UI contract for the scouting screen.
- [`PLAN.md`](PLAN.md) — phase structure and exit workflow.
