# C2A-CATALOG-ATTACH — Source-catalog attachment (team seed, search/add, duplicate refusal)

## Status

- State: **complete — checks passed, migrations `0009` + `0010` applied to the live project, live browser passes done, test data cleaned up. Not yet committed/pushed/PR'd (owner to request).**
- Updated by: Freebuff lane in this thread's worktree, 2026-10-04 (D125); follow-up wording/auto-attach/one-shot-generation round 2026-10-05 (D126).
- Workspace root: this thread's Freebuff worktree; branch `freebuff/check-the-state-of-the-project-are-we-ready-to-sta-8ca9adb5-…`.
- Verified PR target: `main`; started from merged base `f844cf9` (merge of PR #19).
- Remote mergeability/check state: no remote branch/PR yet — local `npm run checks` is the evidence below.
- Owner merge confirmed? No (nothing to merge yet).
- Production migration status: **`0009_catalog_attach.sql` applied 2026-10-04** in the Supabase SQL editor, performed in the shared preview browser at the owner's explicit instruction ("help me apply it" / "use the browser to help me apply 0009"); **`0010_depth_chart_generate.sql` applied 2026-10-05** the same way at the owner's approval (D126). Both reported `Success. No rows returned`.

## Scope and authority

- Owner request (in-session): implement the source-catalog attachment flow — attach a franchise's team players from the imported revision as a labeled provisional baseline, plus search/add for free agents and individual players, with duplicate refusal and unknown handling.
- Follow-up owner request (in-session, D126): say **team** instead of **club** everywhere; auto-attach matching teams without a manual pick; and add one button that generates the depth chart for all positions instead of per-position suggest/seed.
- Closes the gap recorded in [C2A-IMPORT-DELETE-FIX.md](C2A-IMPORT-DELETE-FIX.md) §2 and ACCEPTANCE A38 ("catalog-backed path"): importing the catalog alone never created franchise players.
- Shared contract: `C0B-v2` §2 (source immutability, one baseline revision, coverage labels), §3 (unknown ≠ zero, no invented values), §5 (revision checks, retry safety), §8 (backup already carries franchise players).
- Explicitly not included: detach/removal UI, transaction-driven attachments (C4A), formation state (C3), C2B confirmation semantics, and any change to provisional depth-chart rules.

## Implemented

- **Migration** [supabase/migrations/0009_catalog_attach.sql](../../supabase/migrations/0009_catalog_attach.sql):
  - `public.source_team_summaries` — team coverage per revision (counts, missing-position counts, unsigned group separate).
  - `app.apply_source_attachment(...)` — validates one selection (non-empty, ≤100, no repeats, all ids exist, single revision), inserts only records whose published identity this franchise does not already hold, bumps the revision **once** only when something was attached, and returns counted facts `{requested, attached, alreadyAttached, alreadyPresent, revision}`.
  - `public.attach_source_team(franchise, revision, team, expected_revision, request_id)` — one published team roster; replay-safe ledger, owner-scoped.
  - `public.attach_source_records(franchise, record_ids[], expected_revision, request_id)` — explicit selection (search results, free agents, individuals).
  - Every validation failure writes nothing; a same-`source_id` record from a later revision is **skipped and reported**, never duplicated or silently replaced.
- **Helpers** [lib/catalog.ts](../../lib/catalog.ts): provisional-baseline labels, truthful result message builder, unambiguous team-name matching (no guessing; `matchTeamOption`), `ilike` wildcard escaping, published-overall parsing.
- **Loader** [lib/data/catalog.ts](../../lib/data/catalog.ts): newest revision, team options (`CatalogTeamRow`, `CatalogAttachContext.teams`), unsigned counts, already-attached record ids; honest "apply migration 0009" state when absent; `null` (not an error) when no revision is imported.
- **Actions** [lib/actions/catalog.ts](../../lib/actions/catalog.ts): `attachCatalogTeam`, `attachCatalogRecords`, `searchCatalogPlayers` (read-only, scope = all / unsigned / selected team, name search, 25-row page with overflow note).
- **UI** [components/catalog-attach-panel.tsx](../../components/catalog-attach-panel.tsx) on the GM roster: revision + coverage line, provisional-baseline label, **Team** picker with counts and missing-position disclosure, attach button, catalog search with "On roster" badges and per-row Attach, truthful statuses.
- **Automatic team attach (D126)**: when the franchise has no attached published players and its name matches exactly one published team, the panel attaches that team's roster on first open (same command as the picker, `startTransition` dispatch), shows the counted result, and offers *Retry automatic attach* on failure; ambiguous names and populated rosters fall back to the picker.
- **One-shot depth-chart generation (D126)**: [supabase/migrations/0010_depth_chart_generate.sql](../../supabase/migrations/0010_depth_chart_generate.sql) adds `public.generate_depth_chart(franchise, plans, expected_revision, request_id)` — validates every position list atomically first, then seeds a provisional baseline where none exists, stores a plan only when it differs from the baseline, consolidates away plans equal to the baseline, never downgrades an `owner_confirmed` baseline, and bumps the revision at most once; `lib/depth-chart.ts` gains `buildProvisionalGeneration` (skips manual slots and positions already planned; reports them); [components/depth-chart-panel.tsx](../../components/depth-chart-panel.tsx) adds the `Generate all positions (provisional)` button and status line; [lib/actions/depth-chart.ts](../../lib/actions/depth-chart.ts) adds `generateDepthChart`.
- **Wiring**: [roster-panel.tsx](../../components/roster-panel.tsx) renders the panel and its corrected empty state; [app/gm/page.tsx](../../app/gm/page.tsx) loads the context; [depth-chart-panel.tsx](../../components/depth-chart-panel.tsx) empty state now points to GM → Roster and states that import alone does not populate a roster.

## Invariants verified

- **Label, not a claim**: attached players are `origin='source'` with the published facts; the panel labels the result provisional/unverified and the depth chart's `provisional_published` labels are unchanged until the owner records reality.
- **Duplicate refusal**: same record id and same published identity under another revision are both skipped with a counted, explicit message; the unique `(franchise_id, source_player_record_id)` constraint is only the backstop.
- **Atomic validation**: unknown/repeated/mixed-revision ids and stale revisions leave zero rows and no revision bump.
- **Revision discipline**: one bump per request that attaches something; no-op re-runs change nothing.
- **Unknown handling**: missing position/team/archetype stay absent (no invented defaults); unsigned records are searchable as free agents and never assigned to a team automatically.
- **No silent overwrite (D126)**: generation leaves already-planned positions and manual secondary/specialist slots untouched; a second run reports "Nothing to generate" and bumps nothing.
- **Isolation**: owner-session commands (`unauthorized` for keyless/anon), cross-franchise references refused, source catalog never mutated.

## Verification evidence

| Check | Exact command/environment | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | pass |
| Lint | `npm run lint` | pass — 0 errors; 2 pre-existing unused-parameter warnings in `lib/actions/import.ts` |
| Unit tests | `npx vitest run tests/catalog.test.ts` | pass — 8/8 (team match, escaping, overall, result messages) |
| DB tests | `npx vitest run tests/db/catalog-attach.test.ts` (PGlite, real migrations) | pass — 13/13: team seed + revision bump, unknown position, duplicate refusal + no-op re-run, request replay, unknown team, explicit/free-agent attach, cross-revision identity, repeated ids, mixed revisions, missing ids atomic, stale revision, anon/other-owner refusal, team coverage view |
| DB tests (D126) | `npx vitest run tests/db/depth-chart-generate.test.ts` (PGlite, real migrations 0001–0010) | pass — 10/10: multi-position seed + single bump, identical re-run no-op, changed-only write, `owner_confirmed` never downgraded, plan-equal-to-baseline consolidated, stale revision atomic, cross-franchise refusal atomic, request replay, 11 invalid-batch shapes atomic, anon/other-owner refusal |
| UI tests | `npx vitest run tests/catalog-attach-ui.test.tsx` | pass — 8/8: provisional label + matched team default, **automatic attach when empty and unambiguous**, no auto-attach when populated or ambiguous (NY Giants / NY Jets), team attach payload, search + per-row attach + "On roster", truthful failure, no-revision state, unapplied-migration state |
| Unit tests (D126) | `npx vitest run tests/depth-chart.test.ts` | pass — 11/11 incl. `buildProvisionalGeneration` (skips manual slots and already-planned positions, reports no-eligible positions) |
| UI tests (D126) | `npx vitest run tests/depth-chart-ui.test.tsx` | pass — 11/11 incl. generate-all one request, second-run leaves positions alone, failed generation reported truthfully, honest no-upload empty case |
| Full project checks | `npm run checks` | pass — typecheck, lint (0 errors), 175 tests, build (14 route entries) |
| Live migration apply | Supabase SQL editor (shared preview browser), 2026-10-04 (`0009`) and 2026-10-05 (`0010`, at owner approval) | both `Success. No rows returned`; `source_team_summaries` returns 32 teams + 1,240 unsigned; `generate_depth_chart` rejects keyless calls with `unauthorized` |
| Live browser pass | dev server `http://localhost:3200`, signed-in owner, live project | pass — see below |
| Cleanup read-back | live REST probes after deleting the test franchise | default Atlanta Falcons rev 14 / 60 players (owner's real roster attach from the earlier pass); no temporary franchises; source revision `ea-madden-27 · 1-base` (3,111) untouched |
| Console/network | preview console + network log across the pass | clean — no errors; all page actions 200 |

Live browser pass detail (temporary franchise "Attach verification", since deleted):

1. Panel rendered revision `ea-madden-27 · 1-base — 3111 records`, the provisional label, 32 team options, 1,240 unsigned records; team defaulted from the franchise name for the default Falcons and correctly showed "Choose a team…" for the non-team name.
2. **Team seed**: Buffalo Bills (56) → "Attached 56 published players to this franchise as the provisional source baseline." Revision 0→1; roster listed source players with team/position/archetype, missing archetype shown as Unknown.
3. **Duplicate refusal**: re-running the same seed → "Nothing attached — 56 selected players are already on this roster. No duplicates were created." Revision unchanged.
4. **Search/add individual**: scope *Unsigned (free agents)*, "Tyreek Hill" → "Free agent (unsigned) · WR · OVR 88" → Attach → 56→57 players, revision 1→2, row flipped to "On roster".
5. **Depth chart**: Lineups showed 57 players (empty state gone); "Seed provisional list" produced Josh Allen and kept the provisional label, revision 3.
6. **Cleanup**: deleted "Attach verification" through the D124 exact-name control; app fell back to the default Falcons.

Live browser pass detail for D126 (temporary franchise "Seattle Seahawks", since deleted):

1. Created a fresh franchise named "Seattle Seahawks" (rev 0, 0 players), made it active, opened GM War Room → Roster: without any pick the panel showed **"Attached 59 published players to this franchise as the provisional source baseline."** — the automatic attach — revision 0→1, roster listing the published Seahawks facts.
2. Lineups rendered the new **Generate all positions (provisional)** button (59 players, revision 1).
3. One click → **"Generated provisional lists for 22 positions — 22 seeded as an unverified baseline."** Revision 1→2 (single bump); live read-back showed exactly 22 positions, all baseline layer, all `provisional_published`, **no plan rows**, and no manual/specialist slot filled.
4. Second click → "Nothing to generate: every primary position with eligible players already has a planned list." Revision stayed 2 — no rewrite, no bump.
5. Cleanup: deleted "Seattle Seahawks" through the D124 exact-name control (typed name, Delete permanently); read-back shows only the default Atlanta Falcons (rev 14 / 60 players) and no chart rows for the deleted franchise.

Post-merge full-feature audit (2026-10-05, temporary franchise "C2A Audit", since deleted):

1. Every C2A surface was exercised against the live project: provisional labels; planned/recorded layers; suggest; seed; move up/down and drag-and-drop; add/replace/search; removed-panel and keep-in-plan; record-as-already-happened; discard; practice-squad separation and both-way correction; max-rank enforcement; manual slots; cross-position eligibility; generate-all (both runs); auto-attach skip for a non-matching name; manual attach; duplicate refusal; free-agent attach; stale-device conflict plus retry/discard; revision adoption after reload; Overview counts; backup export carrying both chart layers. Messages and counts matched this record throughout.
2. **Bug found and fixed:** the roster and depth-chart empty states promised the automatic attach unconditionally, so a franchise whose name matches no published team (correctly skipped by the auto-attach guard) saw copy claiming an attach that never ran. `components/roster-panel.tsx` now computes the match with `matchTeamOption` and states the honest case per situation (matched / no published match / no revision imported); `components/depth-chart-panel.tsx` now qualifies the automatic attach. Regression tests added to `tests/catalog-attach-ui.test.tsx` (3 new; 178 total).
3. Cleanup: deleted "C2A Audit" through the D124 exact-name control; read-back shows only the default Atlanta Falcons (rev 28 / 60 players), 60 player rows, and no temporary franchises.

## Owner manual acceptance

1. Preconditions: signed in as the allowlisted owner; catalog revision imported (already true: `ea-madden-27 · 1-base`).
2. Actions: create or open an empty franchise named after your team — GM War Room → Roster should attach that team automatically (watch for the counted message). To attach a *different* team, pick it in the Team list and press the attach button; then re-run it once, and search an unsigned player by name and attach them. On Lineups, press **Generate all positions (provisional)** once.
3. Expected visible result: counted, truthful messages; the automatic attach needs no pick and does nothing for a populated or ambiguously named franchise; duplicate re-run attaches nothing; the roster count and revision increase only on real attachments; generate-all fills every open primary position in one revision bump and reports already-planned/no-eligible positions; every player shows its published facts with unknowns left unknown.
4. Recovery/undo: the flow writes only franchise players (no destructive step); an accidental temporary franchise can be deleted with the D124 control. The default franchise stays untouched unless you attach to it. A seeded provisional baseline can be replaced later by *Record as already happened*; generation never overwrites a plan you already made.
5. Known limitations to verify: no detach UI yet; the baseline is labeled provisional; positions still follow the D113 provisional rules for charting; the automatic attach is name-based, so a franchise named after a non-team (or one of the two ambiguous NY names) still needs the picker.

## Database/environment

- Live project `xueymrywpvegslbkdnpf`; no secrets recorded. `0009` and `0010` are forward-only, applied once each, in order after `0008`.
- No new persistent state beyond `app.franchise_players` rows, which the backup envelope already covers (`backup.ts` round-trips players by `sourceReference`); `pinned_revision_id` is deliberately **not** set by this lane — per-player revision provenance already drives the display, and pin restoration through `restore_new_franchise` is a separate decision.
- Verification writes were confined to the temporary franchise; the request ledger holds those bounded outcomes (CB-3: ≤200 per owner).
- Dev server for this pass: port 3200 (pid 18540); port 3100 untouched.

## Open items

- Blockers: none.
- Bugs/limitations: no detach/removal UI (out of scope; a deletion lane should add it); in the narrow preview viewport the D124 *Delete…* control of the last franchise card can sit under the fixed bottom nav (observed while driving the browser; worked around via DOM click) — a small UI pass should lift it above the nav.
- Deferred work explicitly outside scope: C2B confirmation/checklist semantics; formation screens (C3); real promotion/trade tools (C4A); setting/restoring a franchise baseline pin.
- Other-editor/uncommitted work left untouched: none.

## Next steps (owner flow)

1. Review this lane and decide whether to commit/push/PR — owner: you; artifact: this record + the changed files; **OWNER APPROVAL/CHECK:** the lane is not on a branch/PR yet.
2. Your real Falcons roster is already attached (rev 14 / 60 players). When you want, use Lineups → **Generate all positions (provisional)** to seed the whole provisional chart in one action — owner: you; **OWNER CHECK:** this seeds provisional baselines for every open primary position and can be replaced later by *Record as already happened*; there is no detach UI yet.
3. Accept C2A (its record is otherwise complete) and launch C2B from the merged base — owner: you; [C2A.md](C2A.md) + `main`.

Immediate next step: **owner review/commit decision for this lane.**

## Next thread — pasteable launch

- Exact next checkpoint: **C2B** (final-difference checklist and recovery) after C2A acceptance, from the merged base that includes this lane.
- Required merged baseline: this lane's commit on `main` (plus applied `0009` + `0010`, done).
- Files/docs to read first: this record, [C2A.md](C2A.md), `C0B-v2` §3–§5, `lib/depth-chart.ts`, `lib/actions/catalog.ts`, `lib/actions/depth-chart.ts`.
- Dependencies that MUST land first: C2A owner acceptance; no other outstanding item.
- Things NOT to change: source immutability, provisional labels, revision/retry semantics, deletion semantics.
