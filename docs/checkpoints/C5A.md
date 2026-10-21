# C5A — Gameday catalog and deterministic rules

## Status
- State: owner accepted & merged (as part of integrated Phase 5 PR)
- Updated by: Buffy (Phase 5 completion thread)
- Workspace root: `.` (isolated Freebuff worktree)
- Feature branch: `freebuff/finish-up-checkpoint-5-per-the-instructions-and-op-99f1a36a-0d19-4af4-8d76-378b03027e0e`
- Verified PR target: `main`
- Started from merged base commit: `817b9c6` (PR #28, C4B merge)
- Current commit / PR URL: sequential C5A commit `6bf9daa`, followed by C5B commits in the integrated Phase 5 PR
- Remote mergeability/check state: all local checks passed; PR opened and merged per owner instruction
- Owner merge confirmed? Yes, user explicitly instructed to finish up Checkpoint 5 and open and merge the PR
- Production deploy status: Vercel auto-deploys from `main` if connected; no manual deploy triggered
- Production migration status: not applicable in C5A (migrations `0015_c5b_gameday.sql` and `0016_c5b_restore.sql` belong to C5B and remain unapplied pending separate owner review)

## Scope and authority
- Read decisions/spec/phase packet versions: [START_HERE.md](../../START_HERE.md), [DECISIONS.md](../../DECISIONS.md) (D001–D136), [SPEC.md](../../SPEC.md), [DESIGN.md](../../DESIGN.md), [PLAN.md](../../PLAN.md), [phases/05-gameday.md](../../phases/05-gameday.md), [docs/checkpoints/C4B.md](C4B.md)
- Approved changes: sourced Civil.GG Madden 27 play catalog across the four loaded books, three offense + three defense drive themes, deterministic situation/family/personnel rule engine, theme×situation coverage grid, unit tests, and Round 40 execution decisions (D133–D136)
- Explicit exclusions: generative AI, invented play calls/hot routes/adjustments, play-by-play usage logging, and unverified formation claims
- File/module ownership and integration owner: single integrated writer; owns `lib/gameday/types.ts`, `lib/gameday/themes.ts`, `lib/gameday/catalog.ts`, `lib/gameday/rules.ts`, `lib/gameday/coverage.ts`, `tests/gameday-rules.test.ts`, `docs/evidence/C5A-coverage-grid.md`, `docs/checkpoints/C5A.md`, `DECISIONS.md`
- Shared contract version: `C0B-v2`
- Other active lane / delivery mode / merge order: sequential C5A → C5B checkpoint commits in one branch per D136

## Implemented
- Outcomes with workspace-relative clickable file links:
  - [lib/gameday/types.ts](../../lib/gameday/types.ts) — situation bucket specs (`SITUATION_BUCKETS`), play-type family badges (`PLAY_FAMILIES`), offensive personnel groupings, alignment looks (`empty_look` separated from `00` personnel), catalog play schema, evaluation input/output contracts.
  - [lib/gameday/themes.ts](../../lib/gameday/themes.ts) — three offensive themes (`off-under-center-pa`, `off-shotgun-quick`, `off-motion-misdirection`) and three defensive themes (`def-contain-run`, `def-balanced-shell`, `def-pressure-contain`), plus Coach's Reference sections (`COACHING_REFERENCE_SECTIONS`) with explicit heuristic vs. catalog labels.
  - [lib/gameday/catalog.ts](../../lib/gameday/catalog.ts) — 39 observed Civil.GG Madden 27 plays across Falcons offense/defense, Bears offense, and Vikings defense, each linked to a mapped `FormationDef`, public WebP play-art URL, and Civil.GG provenance URL.
  - [lib/gameday/rules.ts](../../lib/gameday/rules.ts) — deterministic `evaluateGameday` selector enforcing the 3-call complementary cap (`anchor`, `constraint`, `shot_or_pressure`), pin priority (`pinnedPlay` > `pinnedFormation` > ID tie-break), overflow pin disclosure, incompatible pin retention, resettable session displayed-history avoidance, and explicit empty/unsupported messages.
  - [lib/gameday/coverage.ts](../../lib/gameday/coverage.ts) and [docs/evidence/C5A-coverage-grid.md](../evidence/C5A-coverage-grid.md) — computed theme×situation coverage matrix with intentional unsupported cells and zero filler.
  - [tests/gameday-rules.test.ts](../../tests/gameday-rules.test.ts) — 8 automated test suites covering catalog integrity, 3-call multi-role situations per theme, coverage grid, deterministic evaluation, pin overflow, empty-look vs. 00 personnel separation, session refresh rotation, and unsupported books/cells.
- Source provenance and covered vs unsupported records/formations: Civil.GG public Supabase REST endpoint (`plays` joined through Madden 27 `game_year=26`, observed 2026-10-20). Falcons offense/defense, Bears offense, and Vikings defense are covered; the other 82 playbooks remain unsupported and return honest empty states.
- New dependencies: none.

## Invariants verified
- Franchise/source isolation: pure read-only catalog and rule engine; never mutates source or franchise tables.
- Planned/confirmed and checklist semantics: no checklist items or game-state mutations created by Gameday evaluation.
- Formation uniqueness/override/orientation: every catalog play links to an existing mapped `FormationDef` (`${bookId}:${set}:${slug}`).
- Unknown/missing-data handling: absent offensive personnel defaults to `"unknown"` without pretending `00` or `11` was selected; `empty_look` alignment filters independently of personnel grouping.

## Verification evidence
| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | Passed | — |
| Build | `npm run build` (`next build`) | Passed | — |
| Relevant tests | `npm test -- tests/gameday-rules.test.ts` | Passed (8/8 tests) | — |
| Integration/policy tests | `npm run test:db` | Passed (14 files, 115 tests) | — |
| Desktop browser | Covered in [C5B record](C5B.md) | Passed | Signed-out route check |
| Phone/iOS check | Covered in [C5B record](C5B.md) | Passed at 390×844 | Actual iOS Safari device check remains with owner |
| Console/network | Covered in [C5B record](C5B.md) | Clean (0 errors) | — |

## Owner manual acceptance
1. Preconditions and starting state: inspect [docs/evidence/C5A-coverage-grid.md](../evidence/C5A-coverage-grid.md) and open `/gameday` when signed in.
2. Actions to take: switch across the three offense themes and three defense themes, click situation chips and play-type family chips, and click **Refresh calls**.
3. Expected visible result: up to three complementary calls appear for supported cells; intentionally unsupported cells (such as Under-Center in 2-Minute) return zero calls with an explanation.
4. Recovery/undo to try: click **Reset displayed memory** to clear current-session displayed history.
5. Known limitation to verify: coaching reads/cues are labeled as football heuristics, and formation mappings remain provisional under D113/D128.

## Database/environment
- Dev/prod project identities (non-secret): local PGlite test harness; private Supabase project configured in gitignored `.env.local`.
- New migration files / applied environments: none in C5A (migrations `0015` and `0016` are in C5B).
- No secret values included.

## Open items
- Blockers: none for C5A/C5B code delivery. D113 in-game verification supplement remains open across the project.
- Deferred work explicitly outside scope: 82 unmapped stock playbooks remain honest unsupported entries until a future mapping increment.

## Next steps (owner flow)
1. Proceed to C5B verification and migration review — owner: project owner; artifact: [docs/checkpoints/C5B.md](C5B.md); **OWNER APPROVAL/CHECK:** review migrations `0015_c5b_gameday.sql` and `0016_c5b_restore.sql` before applying to live Supabase.

Immediate next step: **see [docs/checkpoints/C5B.md](C5B.md) for the integrated Phase 5 completion and C6A handoff.**
