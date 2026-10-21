# C5A — Gameday theme × situation coverage

Observed play facts in [catalog.ts](../../lib/gameday/catalog.ts) were read from Civil.GG's public Madden play API on 2026-10-20 (`game_year=26`): numeric play IDs, exact names, source play type, set/formation, slugs and storage object keys. Each entry links the art object under `fatgvrcdozmbkxcwpwsc.supabase.co/storage/v1/object/public/plays_output/` and its Civil.GG play page. The owner-approved source reuse scope is D106/D111/D134.

Taxonomy, situation assignments, complementary roles, cues, risks and read notes are football-coaching heuristics, not tested Madden outcomes. Formation personnel projections and loaded-book formation diagrams remain provisional under D128/D113; Gameday never presents them as verified game facts. C5A includes observed calls from Falcons offense/defense and their book-specific counterparts for Bears offense and Vikings defense. Other books have no catalog and must remain unsupported.

## Initial coverage snapshot

| Theme | Loaded book | Demonstrated supported bucket | Complementary menu roles | Deliberately unsupported / sparse |
|---|---|---|---|---|
| Under-center & play action | Falcons offense (Bears alternate calls included) | 1st & 10, 2nd & 1–3, backed up; at least 3 calls | Run anchor, PA constraint, PA shot | 3rd & 11+ and 2-minute intentionally unsupported in template. Other cells depend on exact eligible plays; no general completeness claim. |
| Shotgun spread & quick game | Falcons offense (Bears alternate calls included) | 1st & 10, 2nd & 7+, 3rd & short/medium | Run, quick/RPO, screen or levels pass | Goal line and 4-minute intentionally unsupported. |
| Motion & misdirection | Falcons offense (Bears alternate calls included) | 1st & 10 and 2nd & short | Motion run, constraint, touch-pass / play-action | Backed-up intentionally unsupported. |
| Contain run & heavy box | Falcons defense / Vikings defense | 1st & 10, 2nd & short; short-yardage calls available | Cover 3 base, man/robber constraint, pressure | 3rd & 11+ and 2-minute intentionally unsupported. Empty alignment filters are explicit. |
| Balanced shell & disguise | Falcons defense / Vikings defense | 3rd & 7–10 and 2-minute on Falcons; 3rd medium/long on Vikings | Cover 3, Quarters, Cover 2 | Goal line intentionally unsupported. Vikings book has narrower observed coverage. |
| Sim pressure, fire zone & contain | Falcons defense / Vikings defense | 3rd & medium/long on Falcons; 3rd medium/long on Vikings | Sim rush, alternative sim, 5-rush fire zone/contain | 4-minute intentionally unsupported. Some Vikings short-yardage pressure coverage is sparse. |

The machine-readable coverage function is [coverage.ts](../../lib/gameday/coverage.ts); exact bucket boundaries are declared in [types.ts](../../lib/gameday/types.ts). It computes counts from the catalog and includes explicit unsupported reasons rather than manufacturing calls.

## Rule behavior

- The evaluator filters by selected book, side, theme, situation, family and defensive matchup context before selection.
- It selects up to three complementary calls, fewer when the verified mapped catalog cannot support more. Pin priority is pinned play, then pinned formation, then deterministic ID order; overflow pins remain disclosed and browsable.
- Refresh rotates candidates and avoids recently **displayed** calls where alternatives exist. This is ephemeral client/session state; no history implies a called or used play.
- A non-personnel `empty_look` filter is distinct from the offensive personnel grouping (e.g. Empty can still use 11 personnel).
- Unsupported books and intentional theme gaps return zero spotlight recommendations with an explanation; no invented fallback.

Validation: `npm test -- tests/gameday-rules.test.ts` (7 tests), `npm run typecheck` passed at C5A implementation time. A downstream implementation must rerun after any catalog/rule edits.
