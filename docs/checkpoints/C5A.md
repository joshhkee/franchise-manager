# Checkpoint C5A — Gameday catalog and deterministic rules

**Status:** Implementation checkpoint delivered. C5B work has continued on the same working tree, but the C5A checkpoint has not been committed yet; current branch history does not contain a C5A commit. Keep the phase checkpoint ordering honest: produce and verify the C5A commit before staging any C5B files, then commit C5B separately.

## Scope delivered

- Civil.GG-backed catalog of mapped Madden 27 calls from Falcons offense/defense, Bears offense and Vikings defense, including observed play IDs, names, raw types, set/formation identity, art object URL and source page URL. Curated situation applicability, call roles, families, cues and read/risk copy are marked as heuristics.
- Three offense and three defense theme templates (existing `lib/gameday/themes.ts`) and executable evaluator/coverage grid (`lib/gameday/rules.ts`, `coverage.ts`).
- Filters by book, side, theme, play family, situation, defensive offensive-personnel grouping and separate Empty-look alignment; deterministic 3-call cap, pin priority/overflow, session-only displayed-history avoidance, resettable refresh seed, incompatibility disclosure, explicit empty/unsupported states and reason traces.
- Tests in `tests/gameday-rules.test.ts` and coverage evidence in `docs/evidence/C5A-coverage-grid.md`.
- Round 40 D133–D136 decisions recorded in `DECISIONS.md`; the phase 5 architecture and owner choices are already recorded.

## Provenance and constraints

Source API: Civil.GG public Supabase REST endpoint, `plays` joined through Madden 27 (`game_year=26`) team playbooks observed 2026-10-20. Browser page path pattern and public `plays_output/*.webp` keys are retained per play. Values authored as taxonomy/situation/cue/risk remain football heuristics. Civil.GG's API observation does not verify in-game outcomes. Slot inheritance and personnel diagrams remain provisional under D128/D113. Do not use the term *game-verified* for any call or lineup mapping.

## Checks at this checkpoint

- `npm ci` completed using the existing lockfile.
- `npm test -- tests/gameday-rules.test.ts` passed (7 tests).
- `npm run typecheck` passed.
- C5B also later passed the full `npm run checks` suite (321 tests/build) and `npm run test:db` (112 DB tests); see [C5B record](C5B.md). Those later checks do not make the C5A checkpoint committed or owner-accepted.

## Not done / next owner

No database migration or persistent customization exists yet. The interactive page is not yet wired to this catalog, lineup resolution, Civil.GG art, or persistence. Continue with `0015_c5b_gameday.sql`, backup validation/restore extension, server read model for franchise preferences and planned roster data, and phone-first Gameday UI. The user requested sequential checkpoint commits. **This C5A checkpoint remains uncommitted**, and C5B work is already present in the same worktree, so isolate only C5A paths in staging/commit and confirm `git log` before describing it as committed. Then stage C5B in a separate commit. No push/PR was authorized.
