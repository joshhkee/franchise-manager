# Checkpoint C5A — Gameday catalog and deterministic rules

**Status:** C5A checkpoint committed as `f446f29` (`Establish the sourced Gameday catalog and honest call-selection rules`). C5B continued on the same branch as a separate working-tree change; the C5A commit contains only the catalog, evaluator, theme definitions, tests, evidence, and decisions. C5B remains a separate follow-up checkpoint.

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
- C5B later passed the full `npm run checks` suite (321 tests/build) and `npm run test:db` (112 DB tests); see [C5B record](C5B.md). These are implementation checks, not owner acceptance.

## Not done / next owner

C5B adds the persistence, backup validation/export/restore extension, server read model, lineup resolver and phone-first Gameday UI in the next checkpoint. Review [C5B](C5B.md) for remaining browser-auth limitation and owner migration review. No push/PR was authorized.
