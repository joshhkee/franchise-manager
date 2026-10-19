# Checkpoint C5B — Interactive Gameday call sheet

**Status:** C5A is committed as `f446f29`; C5B is committed as `124c572`. This implementation remains pending owner review/acceptance and migration application. Owner must separately review/apply migrations before persistence is available in a live project.

## Delivered

- Phone-first Gameday interface: offense/defense, loaded playbook selection, curated drive themes, clickable down/distance and family chips, complementary three-call spotlight, refresh, current-session displayed-menu avoidance, pin priority and clear unsupported states.
- Expanding play detail with referenced Civil.GG WebP art and source link, graceful image-error fallback to play text/personnel, read/risk/coaching notes marked as football heuristics, interactive planned `FormationDiagram`, pending trade/practice-squad/missing/conflicted lineup warnings and the Coach’s Reference drawer.
- Franchise-local plan name/notes and ordered play/formation pins through `0015_c5b_gameday.sql`; idempotent owner/revision guarded RPC. Backup validation/export/restore includes Gameday configuration while deliberately omitting ephemeral display history.
- `0016_c5b_restore.sql` wraps the existing C4B restore atomically. Do not deploy only migration 0015 if backup restoration is expected: apply 0016 as well, in reviewed order. Neither migration was applied to a live database by this work.
- Tests: 7 rule/catalog tests, 3 UI tests, backup envelope tests for C5B, and PGlite restore tests.

## Checks completed

- `npm run checks`: passed (typecheck, lint, 321 tests, Next production build). Existing `lib/actions/import.ts` unused-parameter lint warnings and the Vite config-loader warning remain; no lint errors.
- `npm run test:db`: passed, 112 database tests including C5B restore.
- `git diff --check`: passed at final source review.
- Browser preview: the existing local server is live, but `/gameday` redirects to private sign-in. The browser was checked at 390px and remained on the signed-out screen. Do not claim authenticated Gameday UI acceptance; sign-in is an owner-only action and was not performed.

## Browser verification limitation

The local dev server started at `http://127.0.0.1:3007` and `/gameday` returned HTTP 200 with redirect to the private GitHub sign-in page. The available browser session is signed out, so the actual call sheet, Civil.GG image load, save interaction, and responsive desktop/390px layouts could not be exercised in the authenticated app. No production-like authenticated UI acceptance is claimed. Preview deployment, live migration, auth setup, and any push/PR are not part of this checkpoint.

## Handoff / next actions

1. Review source metadata and coverage in [C5A-coverage-grid.md](../evidence/C5A-coverage-grid.md). D113/D128 mapping status remains provisional; coaching metadata is heuristic.
2. Review/apply `0015_c5b_gameday.sql` then `0016_c5b_restore.sql` to the intended development database only with owner authorization; verify restore and save RPC against the actual provider once applied.
3. Sign in through the owner's private account and test the live interface across offense/defense, theme, family, situations, pinned overflows, unsupported cells, art fallback, lineup pending warnings, plan saves, browser console/network, desktop and 390px portrait.
4. The session-backed selection is local UI state; only name/notes/pins persist. Theme customizations currently use curated themes and loaded book IDs.
5. Sequential checkpoints are committed: C5A `f446f29`, then C5B `124c572`. No push or PR was made; do not push or open one without explicit authorization.
