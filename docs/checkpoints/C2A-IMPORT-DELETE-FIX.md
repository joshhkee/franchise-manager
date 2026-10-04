# C2A-IMPORT-DELETE-FIX — Launch-ratings import repair, post-C2A feature sweep, and owner-requested franchise deletion

## Status

- State: complete — checks passed, pushed, PR open; `0008` applied to the live project and the live delete round trip verified.
- Updated by: Freebuff fix thread (this lane), 2026-10-04.
- Workspace root/branch: this thread's Freebuff worktree; branch
  `freebuff/fix-the-c2a-import-bug-unable-to-import-launch-rat-b5866ff2-…`.
- Verified PR target: `main`; started from merged base `0cad8f5` (C2A + autosave fix merged).
- Remote mergeability/deploy/migration: commit `88e4112` pushed to the branch; PR #19 open, MERGEABLE/CLEAN;
  Vercel and the GitHub Actions `checks` job all pass.
- Production migration status: `0006` applied (import works), `0007` already applied,
  **`0008_franchise_delete.sql` applied 2026-10-04** via the Supabase SQL editor.

## Scope and authority

- Owner request (in-session): fix "unable to import launch ratings", exercise every post-C2A feature in
  the preview, answer whether the missing delete-franchise UI is intentional, and make accidental
  franchises deletable. Recorded as [D124](../../DECISIONS.md).
- Shared contract: `C0B-v2` §2 (source immutability, reconciliation keys, fetch-failure policy) and
  §5 (retry/idempotency) are unchanged; deletion is a new owner-requested command, not a reinterpretation
  of existing semantics.
- Not included: source-to-franchise attachment UI, C2B checklist semantics, any change to provisional
  depth-chart rules.

## Implemented

### 1. Launch-ratings import crash (root cause and fix)

- **Reproduced in the preview**: Settings → *Import launch ratings* returned a 500 after ~43 s;
  `POST /settings 500`, unhandled `TypeError: (value ?? "").trim is not a function` at
  [lib/source-import.ts](../../lib/source-import.ts) `normalizeSourcePlayer` (numeric `handedness`).
- **Published payload changed** since the C0A probe (verified against 3,111 live records):
  `handedness` is numeric (`1` right, `0` left — verified on EA's own player pages: Jessie Bates III
  shows "Handedness Right" with payload `1`; left-handed QBs Tua Tagovailoa and Michael Penix Jr carry
  `0`), `iteration` is an object (`{id,label}`), and `birthdate` is `M/D/YY`.
- **Fix** ([lib/source-import.ts](../../lib/source-import.ts)): non-string values are treated as absent
  instead of coerced; `handedness` maps the verified enum; `birthdate` converts with the conventional
  two-digit pivot (00–29 → 2000s, 30–99 → 1900s) and keeps the raw published string in
  `provenance.birthdateRaw`; `iteration` stores its label. Nothing is defaulted or invented.
- **Truthful failure** ([lib/actions/import.ts](../../lib/actions/import.ts)): normalization and planning
  are wrapped so an unexpected published shape returns an inline failed-import message and records
  nothing, instead of crashing the page.
- **Regression tests** ([tests/source-import.test.ts](../../tests/source-import.test.ts)): live-shaped
  record, enum mapping, non-string coercion guard, two-digit birth years, raw preservation.

### 2. Post-C2A browser sweep (live project, desktop + 390 px)

Verified in the preview: shell/nav (sidebar + bottom nav), theme light⇄dark, franchise switch/rename/
archive/resume and archived read-only Lineups, roster custom-player add + autosave (plan vs recorded,
truthful statuses), Settings provenance, backup export envelope (`c2a/1`, includes `depthChart`) and
restore-new with remapped ids, and the full C2A depth chart: provisional labels, seed/add/replace/
remove/keep, move buttons, pending diff, record-as-already-happened, discard, recorded-baseline view,
practice-squad separation/blocking/recorded correction, player detail. GM/Coach/Gameday/Checklist/
Formations/More placeholders all render their intended copy. Console clean; no failed network requests.

Findings recorded, not silently changed:

- **No UI attaches catalog players to a franchise.** `attach_source_player` exists and empty states say
  source-backed players arrive from the imported catalog, but the only roster path is custom players, so
  the 3,111 imported records are currently reachable only as a revision summary. This is a C1B/C2A
  contract gap (ACCEPTANCE A38 "catalog-backed path"); recommend it as the next small lane.
- Overview copy claimed ratings are not shown "until a source revision is imported" even when one is;
  corrected to point at Settings.

### 3. Franchise deletion (D124)

- [supabase/migrations/0008_franchise_delete.sql](../../supabase/migrations/0008_franchise_delete.sql):
  `public.delete_franchise(franchise_id, confirm_name, request_id)` — owner-scoped, service-definer,
  refuses the default franchise, requires the exact recorded name, cascades franchise rows, and records
  its outcome in the owner-scoped request ledger so a lost-response retry replays.
- [lib/actions/franchises.ts](../../lib/actions/franchises.ts): `deleteFranchise` action; clears the
  active-franchise cookie when the deleted franchise was active; maps `unsupported_operation`,
  name-mismatch and missing-migration errors to truthful messages.
- [components/franchise-manager.tsx](../../components/franchise-manager.tsx): collapsed *Delete…*
  control on non-default franchises only, with a warning, type-the-name confirmation, and a disabled
  submit until the name matches.
- The same truthful "apply migration 0008" state was verified live before the migration is applied.

## Invariants verified

- Nothing is recorded before a completed fetch; re-running the import inserts 0 and skips 3,111.
- Source revisions remain immutable; franchise deletion is server-side owner-scoped and cascades only
  that franchise.
- The default franchise cannot be deleted by name, by another owner, by a stranger, or by anon.
- Deletion never happens on a partial name (client-disabled and DB-validated).

## Verification evidence

| Check | Exact command/environment | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | pass |
| Lint | `npm run lint` | pass — 0 errors; 2 pre-existing unused-parameter warnings in `lib/actions/import.ts` |
| Full project checks | `npm run checks` | pass — 15 test files / 118 tests, build 14 routes (run before the delete lane) |
| Import unit tests | `npx vitest run tests/source-import.test.ts` | pass — 15/15 |
| Delete DB tests | `npx vitest run tests/db/franchise-delete.test.ts` | pass — 6/6 |
| Live import | preview → Settings → Import, live project | pass — revision `ea-madden-27 · 1-base`, 3,111 records, `complete_as_imported`; missing-field report: team 1,240 (free agents), archetype 782, everything else 0; second run 0 new / 3,111 present |
| Stored data quality | live project read-back | pass — 0 null birthdates; handedness 3,045 Right / 66 Left / 0 absent; raw birthdate kept in provenance |
| Feature sweep | preview, desktop 1440×900 and phone 390×844 | pass — see §2; console/network clean |
| Delete UI (pre-migration) | preview | pass — control absent on default; exact-name gate enforced; submit reports "apply migration 0008…" and nothing is deleted |
| Delete round trip (live) | preview, live project after applying `0008` | pass — both test franchises deleted through the UI; app fell back to default; final live state only the default Atlanta Falcons (rev 11) + the intact source revision |
| Post-delete data probe | live project read-back | pass — 0 franchise players, 0 depth-chart entries, source revision `ea-madden-27 / 1-base` (3,111 records) untouched |

- Checks NOT run: iOS/Safari device runs (C5B) and the verified depth-chart ordering supplement (D113).

## Owner manual acceptance

Steps 1–2 were exercised directly by the owner during the live verification below; steps 3–4 remain
available as the scripted checks.

1. ~~Apply `0008_franchise_delete.sql` in the Supabase SQL editor~~ — done 2026-10-04.
2. Open **Franchises**; the default Atlanta Falcons has no delete control. On a non-default franchise,
   *Delete…* → type the name → **Delete permanently** deletes it and its players/plans.
3. Wrong typed name leaves the button disabled; the default franchise is refused by the database even if
   the request is replayed manually.
4. After deleting the active franchise, the app falls back to the default.

Live round trip (owner applied the migration, this lane verified): deleting the active
"Feature sweep verification" franchise removed its players and plans and the app fell back to the default
Falcons; the second test franchise was then deleted as well.

## Database/environment

- Live project `xueymrywpvegslbkdnpf`; no secrets are recorded here.
- `0008_franchise_delete.sql` — forward-only, applied once in order after `0007`; delete round trip
  verified live.
- Test data cleanup complete: both "Feature sweep verification" franchises (revision 20 with 3 custom
  players and a pending HB plan; revision 0 with 3 players) were deleted through the new UI. Final live
  state: only the default Atlanta Falcons (rev 11, 0 players) remains; franchise players and depth-chart
  entries are both 0.
- The imported `ea-madden-27 / 1-base` revision (3,111 records) is intended data and is left in place;
  it is immutable by design.

## Open items

- Blockers: none. `0008` is applied; the live delete round trip and cleanup are done.
- Gaps: source-player attachment UI (above); D113 verified-ordering supplement still pending (C2A exit).
- Deferred: C2B confirmation/checklist semantics; formation screens (C3).

## Next steps (owner flow)

1. Merge PR #19 when ready — owner: you; the branch is pushed and mergeable; the GitHub Actions `checks`
   job should be confirmed green first.
2. Decide whether the catalog-attachment lane runs next — owner: you; the next thread implements a
   roster → imported-catalog attach flow with eligibility/unknown handling.
3. Walk steps 3–4 of the manual acceptance script in §Owner manual acceptance when convenient.

## Next thread — pasteable launch

- Exact next checkpoint: source-catalog **attachment UI** (C1B/C2A follow-up) — attach a record from the
  imported `ea-madden-27` revision to the active franchise, with duplicate/identity refusal and unknown
  handling; then C2B from the merged base.
- Required merged baseline: this lane's commit on `main` (PR #19) plus applied `0008` (done).
- Files/docs to read first: this record, `C0B-v2` §2, [C1B](C1B.md), [C2A](C2A.md), ACCEPTANCE A38.
- Things NOT to change: source immutability, reconciliation keys, provisional depth-chart labels,
  archive/resume semantics.
