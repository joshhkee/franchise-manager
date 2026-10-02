# C1A — Responsive Shell and Owner Visual Gate

## Assignment header

```text
Checkpoint:                  C1A (responsive shell, honest empty states, owner visual gate)
Workspace/worktree:          Freebuff-managed isolated worktree (repo-relative paths only)
Owned feature branch:        checkpoint/c1a-shell
Verified PR target:          main
Production deployment branch: main (outside this worktree)
Started from merged base:    236886f (PR #7 merge; includes PRs #1–#7)
Predecessor PRs/records:     C0A evidence/spike/self-review (PRs #1–#4), C0A independent review (PR #5),
                             C0A dispositions D112–D114 (PR #6), C0B contract C0B-v1 (PR #7)
Integration owner:           owner; this lane is the single writer for the shell
Owned paths/modules:         app/**, components/**, lib/nav.ts, tests/**, .github/workflows/checks.yml,
                             package.json, package-lock.json, tsconfig.json, next.config.ts,
                             postcss.config.mjs, eslint.config.mjs, vitest.config.ts, .gitignore,
                             docs/checkpoints/C1A.md
Shared contract version:     C0B-v1 (frozen; the shell deliberately implements none of its domain semantics)
Other active lane:           none. Delivery mode: one independent checkpoint PR. Merge order: owner
                             visual acceptance first; C1B may not start before merge or explicit acceptance.
Dev/test environment:        Node v26.7.0, npm 11.19.0 (the only package manager present; no pnpm/corepack);
                             local dev server on port 3100; Vercel preview builds run per PR.
```

## Status

- **State: checks passed locally; branch committed and PR opened against `main` — URL, base and remote
  check/mergeability state are in the PR metadata. Lane ready for owner visual review — not owner-accepted.**
- Updated by: C1A execution thread.
- Owner merge confirmed? No.
- Production deploy status: none claimed. No production data exists; the app is a shell with no persistence.
- Production migration status: not applicable — no database, project, or migration was created.

## Scope and authority

- Read: `START_HERE.md`, `DECISIONS.md` (Rounds 1–23, esp. D005/D008/D039–D043/D074–D076 themes/density/
  navigation, D113/D114 exceptions), `SPEC.md`, `DESIGN.md` (navigation, theming, accessibility criteria),
  `PLAN.md` (dependency table), `WORKFLOW.md` (delivery mode), `HANDOFF.md`, `ACCEPTANCE.md`
  (A29, reproducibility line), `SETUP.md` (shell previews must contain no private data), `AUDIT.md` (F17),
  `phases/01-foundation.md` (C1A), `LAUNCH_PROMPTS.md` (C1A), and the accepted C0A/C0B records plus
  `docs/contracts/C0B-contract-spec.md` (§10 tooling/test constraints, §12 change control).
- Approved changes: the Next.js/Tailwind shell, its own checks/tests, and this record.
- Explicit exclusions (deliberately NOT built): no authentication, no Supabase project, no schema,
  migrations or policies, no domain logic (depth charts, formations, transactions, gameday calls),
  no persistence and no autosave, no fake records/counts/statistics/charts, no AI/chat surface,
  no `C0B-v1` state semantics re-implemented in UI code, no scope expansion beyond the shell.
- File/module ownership and integration owner: single writer lane; owner merges.

## Implemented

- **Shell and navigation**
  ([app/layout.tsx](../../app/layout.tsx), [components/app-shell.tsx](../../components/app-shell.tsx),
  [lib/nav.ts](../../lib/nav.ts), [components/sidebar-nav.tsx](../../components/sidebar-nav.tsx),
  [components/bottom-nav.tsx](../../components/bottom-nav.tsx), [components/top-bar.tsx](../../components/top-bar.tsx)):
  desktop left rail (Overview, Lineups, GM War Room, Coach View, Gameday, Checklist + Settings pinned at the
  bottom) and phone bottom nav (Overview, Lineups, Gameday, Checklist, More) exactly as specified in
  `phases/01-foundation.md`. Rail is `hidden md:flex`, bottom nav is `md:hidden`; both use `aria-current`
  for the active route via one shared `isActivePath` helper. Skip-to-content link is the first tab stop.
- **Pages** — every route in the approved navigation exists and renders honest, non-deceptive empty states:
  [Overview](../../app/page.tsx), [Lineups](../../app/lineups/page.tsx) (Depth Chart / Formation Subs via
  `?view=`), [GM War Room](../../app/gm/page.tsx) (Roster / Trade Block / Trade Targets / Assets & Moves),
  [Coach View](../../app/coach/page.tsx), [Gameday](../../app/gameday/page.tsx) (Offense / Defense via
  `?side=`), [Checklist](../../app/checklist/page.tsx), [Settings](../../app/settings/page.tsx),
  [More](../../app/more/page.tsx). Tabs ([components/tabs.tsx](../../components/tabs.tsx)) are link-based and
  server-rendered, so tab state survives reload and is shareable without client state.
- **Theming and tokens** ([app/globals.css](../../app/globals.css),
  [components/theme-toggle.tsx](../../components/theme-toggle.tsx)): light default plus dark, neutral
  professional surfaces with a restrained Falcons red used only as a small accent (`--accent: #a71930`
  light / `#e05a6e` dark). Tailwind v4 `@theme inline` maps CSS variables to `bg-surface`, `text-ink`,
  `border-line`, etc. Theme is an explicit user toggle (no unprompted flash), persisted best-effort in
  `localStorage` under the key `fm-theme`, applied by an inline pre-hydration script on
  `document.documentElement.classList` and read back with `useSyncExternalStore`.
- **Honest prototype controls** ([components/save-status.tsx](../../components/save-status.tsx),
  [components/franchise-status.tsx](../../components/franchise-status.tsx),
  [components/empty-state.tsx](../../components/empty-state.tsx),
  [components/page-header.tsx](../../components/page-header.tsx)): save indicator reads **"Not connected"**
  (never "Saved"), the franchise selector is a *disabled* button showing "Franchise: none" / "No franchise"
  with a "Prototype" badge, and empty states name the checkpoint that will populate them. Nothing implies
  game sync.
- **Reproducible checks** ([package.json](../../package.json), [package-lock.json](../../package-lock.json),
  [.github/workflows/checks.yml](../../.github/workflows/checks.yml),
  [eslint.config.mjs](../../eslint.config.mjs), [vitest.config.ts](../../vitest.config.ts),
  [.gitignore](../../.gitignore)): `npm run checks` = `typecheck && lint && test && build`, mirrored in a
  free GitHub Actions job (Node 26, `npm ci`) that runs on every PR and on pushes to `main`.
- **Important choices / provenance**: the repository had no `package.json` before this checkpoint, so this
  checkpoint establishes the toolchain, the single package manager (**npm**, the only one present at
  inspection per `C0B-v1` §10), and the lockfile. No source data, ratings, thresholds, or game rules were
  invented or imported. Dependencies are limited to the shell: Next 16.3.8, React 19.3.0, Tailwind 4.3.3,
  TypeScript 5.9.3, Vitest 5.0.3 + Testing Library, and ESLint 9.39.5 with `eslint-config-next`.
- **New dependency note**: ESLint is pinned to `^9.39.5`, not 10.x. ESLint 10 breaks `eslint-config-next`'s
  react plugin at load time (`react/display-name` → `getFilename is not a function`); 9.x is the version
  that actually works with this stack today. Recorded so C1B does not "upgrade" it back into a broken state.

## Invariants verified

- **No invented data**: no fake player records, counts, statistics, charts, or "insights" exist anywhere in
  the shell; every panel that has no data says what will fill it and in which checkpoint. Verified by reading
  the page sources and by the desktop/phone inspection below.
- **No false connectivity claims**: the save control never says "Saved"/"Synced", the franchise control is
  disabled rather than interactive, and Settings/More describe the prototype rather than pretending to have
  configuration or account state.
- **No domain semantics**: nothing in `app/`/`components/` implements `C0B-v1` entities, actions, revisions,
  or undo. The shell is not gated by the domain contracts, as `C0B-v1` §1 states.
- **Franchise/source isolation, planned-vs-confirmed semantics, formation/override rules, auth/policies,
  secret handling, unknown/missing-data policy**: N/A here — none of these exist yet. They belong to C1B and
  later checkpoints against `C0B-v1`. No secret, `.env`, or credential file exists in the tree
  (`.gitignore` ignores `.env*` while allowing `.env.example`).
- **Accessibility structure**: one `<main id="main">` landmark, labelled `<nav aria-label="Primary">` for both
  navigations, `aria-current="page"` on the active link, real `<button>`/`<a>` elements throughout, and no
  color-only state signals (active tab and rail item also carry weight/underline and `aria-current`).

## Verification evidence

| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`), Node v26.7.0 | pass — no errors | none |
| Lint | `npm run lint` (`eslint .`, ESLint 9.39.5 + eslint-config-next) | pass — no errors/warnings | no type-aware lint rules configured yet |
| Relevant tests | `npm test` (`vitest run`, jsdom) | pass — 1 file, **6 tests** | unit/RTL only; no browser/E2E runner |
| Integration/policy tests | n/a | not run | no auth, DB, or policies exist at C1A |
| Build | `npm run build` (`next build`, Turbopack, Next 16.3.8) | pass — 10 routes generated (7 static, 3 dynamic), TypeScript finished clean | Turbopack is the Next 16 default; no webpack comparison run |
| Full gate | `npm run checks` | pass — all four stages above in one run | Vite prints a config-loader warning about ESM in `vitest.config.ts`; cosmetic, tests still pass |
| Desktop browser | dev server (port 3100) at **1440×900** and **1280×720**; Overview, `/lineups?view=formations` | pass — left rail with active state, Settings pinned bottom, skip link first in tab order, theme toggle light↔dark, no clipping | "1280×720 pass" is from the earlier pass in this checkpoint; 1440×900 re-verified after the final commit-ready state |
| Phone browser | **390×844** (`/gameday`), **430** (`/checklist`), **360×740** (`/gm?view=transactions`) | pass — bottom nav visible with active indicator, top bar wraps to two rows without truncation, tabs wrap cleanly at 360, no clipped actions | emulated viewport only — see limitations |
| Console/network | preview console + request log over the sessions above | pass — no console errors or warnings (only React DevTools notice and HMR logs in dev); all requests 200 | dev-mode only; production bundle inspected via `next build` output, not a hosted deploy |
| Contrast measurement | computed WCAG contrast ratios from the actual token values in `app/globals.css` | pass — see the measured table below | computed from token values, not a pixel-sampled screenshot |
| Docs link/anchor check | fresh throwaway Node parser over repo Markdown (excluding `.git`, `node_modules`, `.next`, `.freebuff`) | pass — 29 files, 192 relative links, 15 anchors, 0 missing | slug heuristics; checker is temporary and not committed |
| Reproducible remote checks | GitHub Actions workflow `checks` (`.github/workflows/checks.yml`) on the PR | required check runs typecheck/lint/test/build on Node 26; **current status is in the PR metadata** (pending is not green) | first-ever run of this workflow happens on this PR; it was not exercised before |

- Checks NOT run and why: no database/policy/isolation tests (no backend exists), no E2E/browser automation
  (unit tests plus manual inspection were chosen instead of adding a heavy framework), no hosted/production
  check, and no real iOS Safari device test.
- Screenshot/artifact links: none committed — screenshots were captured live in the preview panel and are not
  stored in the repository. The owner can reproduce every view by running the dev server (see below).
- Actual-device owner test still needed: real iOS Safari / common Android Chromium check of the bottom nav,
  safe-area padding, and the virtual keyboard (emulation only so far). Plan in "Owner manual acceptance".

### Measured accessibility criteria (this checkpoint's objective targets)

Ratios computed from the committed token values (`app/globals.css`); WCAG AA requires ≥ 4.5:1 for normal text
and ≥ 3:1 for non-text/UI components.

| Pair | Token values | Measured | Meets |
|---|---|---|---|
| Light body text on background | `#1b1e1b` on `#f5f5f3` | 15.41:1 | AA/AAA |
| Light body text on surface | `#1b1e1b` on `#ffffff` | 16.83:1 | AA/AAA |
| Light muted text on surface | `#55605a` on `#ffffff` | 6.55:1 | AA |
| Light accent on surface | `#a71930` on `#ffffff` | 7.43:1 | AA |
| Dark body text on background | `#edefe9` on `#131512` | 15.85:1 | AA/AAA |
| Dark body text on surface | `#edefe9` on `#1b1e1b` | 14.52:1 | AA/AAA |
| Dark muted text on surface | `#a3aca1` on `#1b1e1b` | 7.19:1 | AA |
| Dark accent on surface (focus ring / active marker) | `#e05a6e` on `#1b1e1b` | 4.69:1 | AA text, ≥ 3:1 non-text |

- **Focus**: a single global `:focus-visible` outline (2px accent, 2px offset) on every interactive element;
  skip link is the first tab stop; active nav carries `aria-current` rather than color alone.
- **Touch/reflow**: interactive targets are ≥ 44px tall in the rail/nav (`min-h-11` nav items, `min-h-9`
  buttons at the compact end); layout reflows to a single column with no horizontal scrolling down to 360px;
  `pb-28` reserves space so the phone bottom nav never covers content.
- **Motion**: `prefers-reduced-motion: reduce` collapses animations/transitions to ~0ms globally.
- **Honesty of status**: green/amber/red are always paired with a text label, never used alone.

## Owner manual acceptance

1. **Preconditions / starting state**: `main` at the merged predecessor base `236886f`; this branch
   (`checkpoint/c1a-shell`) checked out. In the worktree root run `npm ci` once, then `npm run dev -- --port 3100`.
   The dev server from the execution thread may still be running on port 3100 — reuse it or start your own on
   another port (check existing listeners first). `npm run checks` reruns the whole gate.
2. **Actions to take**:
   - Desktop at 1440×900 and 1280×720: open `/`; click every left-rail item (Overview, Lineups, GM War Room,
     Coach View, Gameday, Checklist) and Settings; confirm the active item is obvious and Settings sits at the
     bottom. Open `/lineups` and switch to **Formation Subs**, then `/gm` and switch through its four tabs —
     the URL should carry `?view=`.
   - Phone at 390 (and 430): open `/gameday`; confirm the bottom nav is present with Gameday active, the top
     bar does not truncate, and the empty state is honest. Repeat at the narrow 360 width.
   - Toggle **Theme** in both sizes and confirm light and dark both look deliberate and readable; reload to
     confirm the preference sticks.
   - Tab through the page once: skip link first, visible focus ring on links/buttons, no keyboard trap.
3. **Expected visible result**: the restrained professional shell from `DESIGN.md` with no fake data, no
   "Saved"/sync claims, and "Not connected" save status — plus a clear statement of which later checkpoint
   fills each empty panel. Owner either accepts for C1B or requests specific visual/density/navigation changes.
4. **Recovery/undo**: nothing persists server-side, so no cleanup is needed; delete the `fm-theme` localStorage
   key to reset to light. Closing the PR discards the checkpoint entirely.
5. **Known limitation to verify**: no real iOS Safari device test was performed (emulated viewports only), and
   accessibility is documented as measured criteria — **not** a certified compliance claim.

## Database/environment

- Dev/prod project identities: none — no Supabase project, database, or environment was created or connected.
- New migration files / applied environments: none.
- Safe application order / compatibility: n/a; nothing to migrate or deploy. The app builds and runs with no
  environment variables set (no `.env` required).
- Backup and rollback/recovery: n/a; no data exists.
- Preview server port/process owner: the execution thread started a dev server on **port 3100** (detached,
  log at `/tmp/c1a-dev.log`). It is safe to stop; no other worktree's server was touched.
- Hosted preview: Vercel builds a preview per PR (the Vercel check shows on the PR). It hosts the shell only —
  **no private franchise data, production keys, or pretend authenticated state**, per `SETUP.md`.
- No secret values included; `.gitignore` ignores `.env*` (allowing `.env.example`) and `.vercel`.

## Open items

- **Blockers**: none for C1B start, once C1A is merged or explicitly accepted. C1B is gated on that acceptance
  (`PLAN.md` dependency table), not on this shell's internals.
- **Bugs/limitations (severity)**:
  - Not tested on a real iOS Safari device — bottom nav safe-area padding and virtual-keyboard behavior are
    reasoned, not observed (medium; revisit in C5A's phone protocol).
  - Accessibility is measured (contrast/focus/touch/reflow) but not certified; no automated a11y runner
    (axe) is wired in yet (low).
  - `vitest.config.ts` triggers a Vite config-loader warning (ESM syntax in a CommonJS-loaded file); tests
    pass, but the file could be renamed `.mts` later (low, cosmetic).
  - Tab state is link/query-driven by design; there is no client-side router prefetch tuning yet (low).
- **Deferred work explicitly outside scope**: auth, Supabase projects/policies/migrations, persistence,
  autosave/revision/undo semantics, imports, domain logic, gameday play metadata, and any real franchise,
  player, formation, or transaction data. Special teams remain deferred to C3B behind the explicit
  check-and-ask gate (D114). The D113 evidence supplement is still required before C2A's verified-ordering
  exit and before C3A/C3B.
- **Other-editor/uncommitted work left untouched**: none — this worktree contained only this lane's files, and
  planning docs (`START_HERE.md`, `PLAN.md`, `DECISIONS.md`, `SPEC.md`, `DESIGN.md`, contracts, prior checkpoint
  records) were read, not modified.

## Next thread — pasteable launch

- Exact next checkpoint: **C1B** (private auth, isolated data, franchise lifecycle) per
  [phases/01-foundation.md](../../phases/01-foundation.md), using the canonical C1B prompt.
- Required merged baseline and how to verify it: `main` with this C1A PR merged (`git log --oneline -1 origin/main`
  should show the C1A merge; `git merge-base --is-ancestor <C1A merge commit> origin/main`). Do not start C1B
  before the owner's C1A visual acceptance, even if the branch is open.
- Files/docs to read first: `START_HERE.md`, `phases/01-foundation.md` (C1B + parallel lanes), `SPEC.md`,
  `DESIGN.md`, `SETUP.md`, `ACCEPTANCE.md` (A31–A41), `docs/contracts/C0B-contract-spec.md` (**C0B-v1** is the
  binding interface set: §2 source/identity, §3 state model, §5 revision/idempotency, §8 backup envelope,
  §9 entities/errors, §10 tooling, §11 evidence gates, §12 change control), `DECISIONS.md` (Rounds 20–23),
  and this record.
- Owned paths/modules: C1B assigns its own lane ownership before edits, starting from what C1A actually
  created (`app/`, `components/`, `lib/nav.ts`, `tests/`). Reuse the existing shell primitives rather than
  building a parallel layout. Dependency/lockfile changes stay with one owner; `C0B-v1` §12 governs contract
  changes (any amendment version-bumps the contract).
- Dependencies that MUST land first: (1) C1A owner visual acceptance and merge — this PR; (2) owner-scoped
  authorization for Supabase project provisioning and any installs, with strict $0 constraints; (3) the
  dev/prod environment split and preview credential isolation configured and verified (D103/D105, IR-10).
- Allowed implementation outcomes: single-owner GitHub OAuth with controlled owner bootstrap and
  backend/database allowlisting (no first-user-wins), separate dev/prod projects with previews using dev only,
  immutable published source revisions with coverage reporting, logically isolated create/switch/archive
  franchises (Falcons default) with custom players, grouped editable fields with missing ≠ zero, minimal
  planned-vs-recorded player state, revision-safe autosave with unsaved-input/session protection, and the
  versioned backup envelope with atomic restore-new and ID remapping — all against `C0B-v1`.
- Things NOT to change: do not re-derive schema or state semantics in UI code; no depth-chart/formation/
  transaction/gameday logic (those are C2–C5); no fake or invented data; do not expose private routes before
  the C1B authorization gate passes; keep save/sync honesty wording intact and extend it only with real state.
- Verification and PR exit gate: real integration tests for unauthorized/cross-franchise access, source
  immutability, stale writes, failed saves, and backup/restore safety (not mocked-only), plus typecheck/lint/
  test/build and desktop/phone inspection; owner merges. Default delivery is ONE integrated C1B PR per
  `WORKFLOW.md`.
