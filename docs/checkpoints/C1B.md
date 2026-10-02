# C1B — Private Auth, Data, and Franchise Foundation (startup handoff)

## Assignment header

```text
Checkpoint:                   C1B (private auth, isolated data, franchise lifecycle)
Workspace/worktree:           .freebuff/worktrees/39626366-e8b3-401c-8ac9-f072a158e51f (this thread, repurposed per D120)
Owned feature branch:         checkpoint/c1b-foundation
Verified PR target:           main
Production deployment branch: main
Started from merged base:     1de3cfd (merge of handoff PR #12; contains 8c82b5d and 545bcfc)
Predecessor PRs/records:      PRs #1-#10 merged; C0B-v2 accepted (D115); C1A accepted & merged (D116);
                              independent review closed (D117); next-steps standard (D118)
Integration owner:            owner; this lane is the single writer for C1B
Owned modules/paths:          app/**, components/**, lib/**, tests/**, supabase/** (migrations/policies),
                              package.json + package-lock.json, config, docs/checkpoints/C1B.md
Shared contract version:      C0B-v2 (binding §2, §3, §5, §8, §9, §10, §11, §15)
Other active lane:            none; delivery mode = one integrated checkpoint PR
Dev/test environment:         isolated local/embedded data + preview isolation per D103/D105 (IR-10);
                              the single Supabase Free project is production
Authorization on record:      owner authorized dependency installs and Supabase use (2026-10-02);
                              the owner created the Supabase project and the GitHub OAuth App
```

## Status

- **State: in progress — C1B execution started (2026-10-02).** The owner repurposed this thread/worktree
  for C1B instead of opening a new one (D120); this record is now the live C1B record and this thread is its
  single writer. Branch `checkpoint/c1b-foundation` is cut from `1de3cfd`; `.env.local` was imported from the
  main checkout at bootstrap (never printed).
- Deviation on record: **D120** — C1B runs in this repurposed thread/worktree rather than a new one.
- **Exit-gate state (2026-10-02): implementation complete, browser-verified, and merged; owner acceptance
  pending.** Every slice listed below is on `checkpoint/c1b-foundation`; application checks and 70 automated
  tests pass. Background mode is unavailable in this build, so the dev server was detached on port 3200
  (port 3100 belongs to another worktree and was left untouched).
- **Merged (2026-10-02):** [PR #13](https://github.com/joshhkee/franchise-manager/pull/13) merged into `main`
  as `4c137f1`. The owner applied migrations `0001`–`0005` and the allowlist row to the live project, and the
  browser pass below ran against the merged `main`.
- **Browser verification pass (2026-10-02): passed, with one display defect found and fixed** — see
  [Browser verification pass](#browser-verification-pass-2026-10-02) and fix
  [PR #14](https://github.com/joshhkee/franchise-manager/pull/14).
- **Contract §5 closed (second pass, 2026-10-02):** autosave with truthful `saving | saved | failed |
  conflict` statuses and unsaved-input protection (guard on navigation, franchise switch, dialog close,
  sign-out, and session expiry, with stay/retry/discard choices) are now built, not deferred. This was
  previously listed as a possible scope deviation; the frozen contract required it, so it was implemented.
- Updated by: this thread (C1B execution lane).
- Owner inputs (2026-10-02): `.env.local` written and **verified live**; Vercel production domain verified;
  GitHub provider verified enabled; Vercel env vars owner-reported. Only the Supabase **URL Configuration**
  confirmation (Site URL + Redirect URLs) remains — it cannot be verified remotely.
- PGlite/migration decisions resolved (D119).
- Owner merge confirmed? **yes** — PR #13 → `main` (`4c137f1`), 2026-10-02. Production deployment tracks
  `main` via Vercel; the database migration was applied by the owner to the single Supabase project (D088).

## Scope and authority

- Read first: `START_HERE.md`, [phases/01-foundation.md](../../phases/01-foundation.md) (C1B),
  [docs/contracts/C0B-contract-spec.md](../contracts/C0B-contract-spec.md) (**C0B-v2**),
  [docs/checkpoints/C1A.md](C1A.md) (accepted shell + launch section), [SETUP.md](../../SETUP.md),
  [ACCEPTANCE.md](../../ACCEPTANCE.md) (A31–A41), `DECISIONS.md` (D103–D118), and the canonical C1B
  launch in [LAUNCH_PROMPTS.md](../../LAUNCH_PROMPTS.md).
- Approved changes: C1B scope only — single-owner GitHub OAuth with authoritative allowlisting, isolated
  franchise lifecycle (Falcons default, custom players), immutable source revisions with coverage
  reporting, grouped editable fields (unknown ≠ zero), the minimal player planned-vs-recorded primitive,
  revision-safe autosave with unsaved-input protection, retry-safe idempotent mutations, and the versioned
  backup envelope with atomic restore-new and ID remapping.
- Explicit exclusions: depth-chart/formation/GM/gameday logic (C2–C5), season/week state, generated
  trades, fake or invented data, and any redefinition of `C0B-v2` schema semantics in UI code.

## Preconditions verified at handoff (2026-10-02)

| Precondition | Evidence |
|---|---|
| Base merged | `origin/main` @ `8c82b5d`; PRs #1–#10 merged |
| C1A visual acceptance | D116, C1A record status "owner accepted & merged" |
| Contract frozen | `C0B-v2` (CB-1…CB-3 adopted) |
| Repo checks | `npm run checks` green (typecheck, lint, 8/8 tests, build); docs link check 0 missing |
| Shell honest states | loading/error/not-found + More-group nav + 44px controls shipped |
| Tooling present | Node v26.7.0, npm 11.19.0, `gh` authenticated |
| Tooling absent | **Docker, `psql`, Supabase CLI, corepack: not installed** (drives the decision below) |

## Known project facts (recorded 2026-10-02)

| Fact | Value |
|---|---|
| Supabase project name | `franchise-manager` |
| Supabase project ref | `xueymrywpvegslbkdnpf` |
| Supabase project URL | `https://xueymrywpvegslbkdnpf.supabase.co` |
| Supabase region | `ap-southeast-2` |
| OAuth callback for the GitHub OAuth App | `https://xueymrywpvegslbkdnpf.supabase.co/auth/v1/callback` |
| Allowlisted owner | GitHub `joshhkee` (numeric id `21141160`) |
| Local dev ports | 3000 (default) and/or 3100 (C1A used 3100) |
| Upstream main checkout (env source) | `C:\Users\josh\Desktop\React Projects\franchise-manager` |
| Vercel scope / project | `josh-2498` / `franchise-manager` (from deployment URLs) |
| Vercel production domain | `https://franchise-manager-j.vercel.app` (owner-confirmed 2026-10-02; anonymous GET 200 — C1A shell live) |
| Vercel Production deployment | `f6f609a` → immutable `https://franchise-manager-6pq5fkb7h-josh-2498.vercel.app`; anonymous GET 401 = Deployment Protection (expected); the stable alias above is public |
| Local env file | `.env.local` in the main checkout; `NAME = value` spacing, no trailing newline — `@next/env` parses all three names to the expected values (verified 2026-10-02); new-style keys (`sb_publishable_…`, `sb_secret_…`) |
| Supabase auth state (verified 2026-10-02) | providers: GitHub ✅ enabled, Email enabled; `disable_signup:false`; `mailer_autoconfirm:false`; **0 users** (owner has not signed in yet) |

The project ref, URL, and GitHub user id are not secrets; API keys, DB password, and OAuth client secret are.

## Owner inputs — exact steps (secrets never leave `.env.local`)

**Rule:** values marked **SECRET** go only into `.env.local` — never into chat, docs, PRs, or logs.
Everything else (project ref/URL, Vercel domain, yes/no confirmations) is safe to send back.
These three variable names are fixed for C1B — the implementation must read exactly them.

### Input 1 — Supabase API keys → `.env.local` in the MAIN checkout

Why the main checkout: Freebuff bootstrap imports the main checkout's ignored env files into each new
worktree, so the C1B worktree picks the file up automatically
(`git worktree list --porcelain` finds the main checkout if needed).

1. Sign in, open the project: `https://supabase.com/dashboard/project/xueymrywpvegslbkdnpf`.
2. Copy the **Project URL** and the **Publishable key** (`sb_publishable_...`): click **Connect** in the
   top bar, or **Settings → API Keys**.
3. Copy the **Secret key** (`sb_secret_...`; **SECRET**): **Settings → API Keys** → tab
   **"Publishable and secret API keys"**. If the page offers **Create new API keys**, click it first —
   it adds the new keys alongside the legacy `anon`/`service_role` keys without breaking anything. If the
   default secret value cannot be revealed, click **Create new secret key**, name it `c1b-local`, and copy
   it immediately (shown once).
4. Create `C:\Users\josh\Desktop\React Projects\franchise-manager\.env.local` with exactly:
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://xueymrywpvegslbkdnpf.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   ```
   Git Bash recipe (avoids the Windows `.env.local.txt` extension trap):
   ```bash
   cd "/c/Users/josh/Desktop/React Projects/franchise-manager"
   touch .env.local && notepad .env.local
   ```
5. Reply "`.env.local` ready" — never the values. `.env*` is gitignored and the C1B thread imports the
   file at bootstrap.
   - Fallback: if the dashboard only offers legacy keys, use the same three variable names with the `anon`
     and `service_role` values, and say so (Supabase retires legacy keys at the end of 2026).
   - C1B implementation note: new-style keys travel on the `apikey` header; verify the installed
     supabase-js version also accepts them when it sets `Authorization: Bearer`.

**Status: DONE — verified live 2026-10-02.** All three names exist in the main checkout's `.env.local`,
`@next/env` parses them to the expected values, and both keys authenticate against the live project (recipe
below). Values were never printed. The file uses `NAME = value` spacing and has no trailing newline —
Next.js handles both, so the C1B bootstrap can import it unchanged.

### Input 2 — Vercel production domain (non-secret) — PROVIDED

**Received (owner, 2026-10-02): `https://franchise-manager-j.vercel.app`** — anonymous GET returns 200 and
serves the C1A shell, so the stable production alias is public and the OAuth callback will not be blocked
by Vercel Deployment Protection. It becomes Supabase's Site URL and a Redirect URL entry.

### Input 3 — Supabase auth dashboard (two pages; reply with checkboxes)

GitHub provider — `https://supabase.com/dashboard/project/xueymrywpvegslbkdnpf/auth/providers`:

1. **GitHub → Enabled**; paste **Client ID** and **Client Secret**, then Save. Client ID/Secret live at
   `https://github.com/settings/developers` → **OAuth Apps** → the app; if no secret is shown, click
   **Generate a new client secret** and copy it immediately (shown once).
2. Confirm the OAuth App's **Authorization callback URL** is
   `https://xueymrywpvegslbkdnpf.supabase.co/auth/v1/callback`.

URL configuration — `https://supabase.com/dashboard/project/xueymrywpvegslbkdnpf/auth/url-configuration`:

3. **Site URL** = `https://franchise-manager-j.vercel.app`.
4. **Redirect URLs** — click Add URL for each: `http://localhost:3000/**`, `http://localhost:3100/**`,
   `https://franchise-manager-j.vercel.app/**`, and `https://*-josh-2498.vercel.app/**` (previews).

**Status (2026-10-02):** GitHub provider **verified enabled** live (`/auth/v1/settings` →
`external.github: true`). Steps 3–4 (Site URL + Redirect URLs) **cannot be verified remotely** — `site_url`
and `uri_allow_list` are absent from the public settings response, and `/auth/v1/authorize` returns 302 for
*any* `redirect_to` (it validates at the callback) — so the owner confirms them on the dashboard.

### Input 4 — Vercel environment variables (values = the two keys; SECRET)

Vercel → project → **Settings → Environment Variables** → add three rows, same values as `.env.local`:

| Name | Environments |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production + Preview |
| `SUPABASE_SECRET_KEY` | Production only (never Preview — IR-10) |

Deployments pick these up on the next deploy; no redeploy is needed now (no C1B code is live yet).

**Status (2026-10-02): owner reports all three variables created.** Vercel variable scopes are not remotely
verifiable from this thread; the first C1B deployment is the real check.

### What to send back (checklist — no secret values)

- [x] `.env.local` ready in the main checkout — verified 2026-10-02: names parsed by `@next/env`, both keys
      authenticate live, new-style `sb_publishable_`/`sb_secret_`
- [x] Vercel production domain: `https://franchise-manager-j.vercel.app` (verified live, HTTP 200)
- [x] GitHub provider enabled in Supabase — verified live (`external.github: true`); key style = new
      publishable/secret
- [ ] **Redirect URLs / Site URL — owner confirms on the dashboard** (not remotely verifiable): Site URL
      `https://franchise-manager-j.vercel.app`; redirects `http://localhost:3000/**`, `http://localhost:3100/**`,
      `https://franchise-manager-j.vercel.app/**`, `https://*-josh-2498.vercel.app/**`
- [x] Vercel env vars added with the scopes above — owner-reported
- [ ] Anything that looked different from these steps (exact page and what you saw)

### Live verification recipe (run 2026-10-02; C1B should reuse it)

- Publishable key: `GET https://xueymrywpvegslbkdnpf.supabase.co/auth/v1/settings` with `apikey:
  <publishable>` → 200. Do **not** use `GET /rest/v1/` — its OpenAPI root now requires a secret key
  (publishable → 401 `Secret API key required`), which is not a key problem.
- Secret key: `GET /auth/v1/admin/users` with `apikey: <secret>` → 200 `{"users":[]}`.
- Provider state: the same `settings` response (`external.github: true`).
- Not remotely checkable: `site_url` / `uri_allow_list` (absent from `settings`), and redirect allowlisting
  (`/auth/v1/authorize` 302s for any `redirect_to`).
- Signup note: 0 users exist today with `disable_signup:false`, so the owner's first GitHub sign-in creates
  the account — do not disable signup before that. C1B enforces the authoritative allowlist in-app and must
  reject and revoke any non-allowlisted identity.

### Resolved decisions (D119, owner 2026-10-02)

- **RESOLVED — local/embedded test isolation (D103, IR-10).** The owner approved
  **`@electric-sql/pglite`**: a real Postgres (WASM) in Node, no Docker install. C1B runs the actual
  migrations and RLS policies against it, with a small `auth`-schema shim (`auth.uid()`, `authenticated`
  role) so policy tests exercise real SQL; OAuth/session flows are owner-verified against the live project.
  Docker Desktop or local PostgreSQL remain optional upgrades, not prerequisites.
- **RESOLVED — applying migrations to the cloud project (D088).** C1B writes versioned SQL migration files
  and the **owner applies them** via the Supabase dashboard **SQL editor** (no install) or the CLI if they
  prefer (`npx supabase link` + `db push`; access token from
  `https://supabase.com/dashboard/account/tokens`, plus the project DB password). Nothing applies
  migrations automatically, and never during a build.

## Open design items C1B must resolve (with evidence)

- **IR-10 preview/production isolation with a single project:** design and verify that a preview cannot
  write to the production project's data.
- **Single-project reality:** dev/test isolation runs on PGlite (D119); only auth/session flows
  touch the live project, and previews must stay read-only against it (IR-10).
- **Local OAuth caveat:** one GitHub OAuth App allows exactly one callback URL; using the local Supabase
  CLI stack (`http://localhost:54321/auth/v1/callback`) requires a second OAuth app dedicated to local.
- **Archive/resume behavior:** document read-only/resume semantics before implementing (contract §11).
- **Reconciliation keys:** implement `C0B-v2` §2 and record the concrete normalization C1B uses.
- **C0A evidence supplement / D114 special-teams gate:** remain outside C1B, but keep them visible for
  C2A/C3A/C3B.

## Progress (C1B execution in this thread)

Branch `checkpoint/c1b-foundation` from `1de3cfd`, pushed as it goes so any later thread can resume from the
branch rather than from an unpushed worktree (D120).

| Slice | Artifact | Evidence |
|---|---|---|
| Governance | D120 recorded; record workspace/state updated | commit `a79e98f` |
| Foundation migration | [supabase/migrations/0001_c1b_foundation.sql](../../supabase/migrations/0001_c1b_foundation.sql) — `app` schema, authoritative `owner_allowlist`, `owners` mapping, `franchises` (per-franchise `revision`, one default per owner), RLS policies, `public.register_owner` bootstrap, `public.touch_franchise` revision contract | applied and exercised on PGlite |
| Local DB harness | [tests/db/harness.ts](../../tests/db/harness.ts) — PGlite plus a Supabase `auth` shim (`auth.uid()`, anon/authenticated/service_role) that applies the real migrations | `npm run test:db` |
| Policy/isolation tests | [tests/db/foundation.test.ts](../../tests/db/foundation.test.ts) — allowlist accept/reject, client-role denial, per-owner visibility, cross-franchise write refusal, stale-revision refusal, cross-franchise function call refusal | 7/7 pass |
| Source catalog migration | [supabase/migrations/0002_source_catalog.sql](../../supabase/migrations/0002_source_catalog.sql) — `source_revisions`, `source_player_records` (revision-scoped `sourceId`, nullable archetype), franchise dataset-pin FK, read-only RLS for allowlisted owners, and a database-level immutability guard with an explicit import window | applied on PGlite |
| Reconciliation keys (CB-1) | [lib/identity.ts](../../lib/identity.ts) — declared normalization plus `matched` / `new` / `conflict` classification (never name-only or `sourceId`-only); unit tests in [tests/identity.test.ts](../../tests/identity.test.ts) | 10/10 pass |
| Source catalog tests | [tests/db/source-catalog.test.ts](../../tests/db/source-catalog.test.ts) — owner reads, stranger sees nothing, client writes denied, immutability guard plus import window, duplicate `sourceId` rejected, pin FK enforced | 6/6 pass |
| Franchise + player commands | [supabase/migrations/0003_franchise_players.sql](../../supabase/migrations/0003_franchise_players.sql) — default Atlanta club, custom ids in a distinct namespace, grouped fields where unknown is absence (never zero), recorded-vs-planned reconciliation, request-outcome ledger (200 per owner) | 12/12 pass |
| Auth gate and allowlist | [proxy.ts](../../proxy.ts), [app/auth/callback/route.ts](../../app/auth/callback/route.ts), [lib/auth/identity.ts](../../lib/auth/identity.ts) — session refresh and verification, callback admitting only allowlisted GitHub ids and signing refusals back out, open-redirect guard, honest refusal messages | 8/8 pass |
| Backup envelope + restore-new | [lib/backup.ts](../../lib/backup.ts), [supabase/migrations/0005_restore.sql](../../supabase/migrations/0005_restore.sql) — validation before any write, id remapping, custom identity and source references preserved by revision key, atomic refusal when a revision is missing | 7/7 + 3/3 pass |
| Integrated persistence in the shell | [app/page.tsx](../../app/page.tsx), [app/franchises/page.tsx](../../app/franchises/page.tsx), [components/roster-panel.tsx](../../components/roster-panel.tsx), [components/player-field-editor.tsx](../../components/player-field-editor.tsx), [components/backup-panel.tsx](../../components/backup-panel.tsx), read-model views in [0004](../../supabase/migrations/0004_read_models.sql) | build + live dev check |
| Autosave + unsaved-input protection (contract §5) | [components/autosave/autosave-provider.tsx](../../components/autosave/autosave-provider.tsx) (serialized saves, shared revision, navigation/submit/unload guard with stay/retry/discard), [components/autosave/autosave-field.tsx](../../components/autosave/autosave-field.tsx) (debounced autosave, truthful statuses, retry/discard), [components/autosave/use-idempotent-action.ts](../../components/autosave/use-idempotent-action.ts) (stable request id per form action) | 6/6 pass; build + live dev check |
| Idempotent retries across every command | Server action [lib/actions/franchises.ts](../../lib/actions/franchises.ts) `autosavePlayerField` plus caller-supplied `requestId` on create/rename/archive/add-player/restore, and [proxy.ts](../../proxy.ts) no longer redirects server-action POSTs (expired session surfaces as a truthful failed save) | covered by autosave tests + DB retry tests |
| Migration hardening found while testing autosave | [0003_franchise_players.sql](../../supabase/migrations/0003_franchise_players.sql): a cleared field (JSON null) is normalized to absence and no longer stored as a literal `null`; the request-outcome ledger accepts the null outcome and replays it; the `stale_revision`/replay paths are covered | franchise-players 13/13 pass |

### Not done in this checkpoint (open, not silently implied)

- **Source import path and coverage surface:** the immutable catalog tables, their policies, the
  immutability guard, and the CB-1 reconciliation library exist, but nothing yet parses/imports a real
  source revision (that needs the C0A source data), so the catalog is legitimately empty and no coverage
  label is populated.
- **Action units, partial/bulk confirmation, cancel, bounded undo:** contract §4 semantics belong to C2B
  and are not started.
- **iOS/Safari checks:** not run — later verification (C5B is phone-first). Live sign-in, cloud migration
  application, and the two-tab stale-write conflict were verified in the browser pass below.

## Verification evidence

| Check | Exact command/environment | Result |
|---|---|---|
| Handoff docs link/anchor | fresh parser over repo Markdown, 2026-10-02 | pass — 32 files, links/anchors, 0 missing |
| Application checks | n/a for this handoff | not run — docs-only; C1B runs them for real code |
| Tool inventory | `docker/psql/supabase/corepack --version` | not installed (recorded above) |
| Remote reachability probes | anonymous GETs, 2026-10-02 | Supabase `/auth/v1/health` 401 (keyless request rejected — expected); immutable Production deployment URL 401 (Deployment Protection); stable alias `https://franchise-manager-j.vercel.app` and `/gm` **200** (C1A shell live) |
| Supabase key probe | `/auth/v1/settings` + publishable → 200; `/auth/v1/admin/users` + secret → 200 (`{"users":[]}`); admin + publishable → 401 (role separation) | pass — both keys valid, live 2026-10-02 |
| Env file read by the real loader | `@next/env` `loadEnvConfig` over the main checkout, 2026-10-02 | pass — all three names parsed to the expected values; nothing printed |
| DB policy/isolation tests | `npm run test:db` (PGlite, real migrations), 2026-10-02 | pass — foundation 7/7, source catalog 6/6, franchise-players 13/13, restore 3/3 |
| Autosave + unsaved-input tests | `npx vitest run tests/autosave.test.tsx`, 2026-10-02 | pass — 6/6 (autosave, conflict + same-request-id retry, failed input preserved then discarded, session-expiry failure, navigation guard stay/discard) |
| Reconciliation-key unit tests | `npx vitest run tests/identity.test.ts`, 2026-10-02 | pass — 10/10 |
| Auth unit tests | `npx vitest run tests/auth.test.ts`, 2026-10-02 | pass — 8/8 (identity extraction, admission, redirect guard) |
| Backup validation tests | `npx vitest run tests/backup.test.ts`, 2026-10-02 | pass — 7/7 (round trip, unsupported version, dangling refs, secret-like content, size) |
| Full project checks | `npm run checks` with `.env.local` imported into the worktree, 2026-10-02 | pass — typecheck, lint, 68 tests, build (14 route entries) |
| Browser verification pass | shared preview browser → `http://localhost:3000` (merged `main`), 2026-10-02 | pass — every C1B feature exercised end to end against the live project; one display defect found and fixed (PR #14); console clean |
| Post-verification checks | `npm run typecheck` + `npx vitest run` on the fix branch from `main`, 2026-10-02 | pass — 10 files / 70 tests; PR #14 `checks` SUCCESS |
| Live app check | `npm run dev -- -p 3200` (detached) + curl, 2026-10-02 | `/sign-in` 200; `/` → 307 to `/sign-in` (auth gate); top bar reports "Signed out" and "App storage connected"; port 3100 left to the other worktree |

- Checks NOT run and why: live OAuth sign-in (owner browser action), cloud migration application (D088
  owner step), multi-device conflict and iOS runs (later verification), and the source-import round trip
  (import path not built).
- No secrets, private exports, or credentials are included in this record; the imported `.env.local` is
  gitignored and never printed.

## Browser verification pass (2026-10-02)

The owner signed in to `http://localhost:3000` (merged `main`) in the shared preview browser, and every C1B
surface was driven end to end against the live project.

| Feature | Result |
|---|---|
| GitHub OAuth sign-in (allowlisted owner) | pass — session established, shell renders |
| Auth gate on every route | pass — `/gm`, `/settings`, `/franchises`, `/lineups`, `/gameday`, `/checklist`, and `/api/backup/export` all `307` → `/sign-in?next=…` while signed out |
| Overview | pass — real counts only (revision, players, pending edits); no invented ratings, charts, or statistics |
| Roster and custom player | pass — custom player carries a `c_…` app id; plan vs recorded shown per field |
| Autosave | pass — truthful `Saving… → Saved to app` |
| Failed save | pass — invalid number → **Not saved** with the exact reason, input preserved, Retry/Discard offered |
| Unsaved-input guard | pass — navigation blocked, pending field named, **Stay** kept the input, **Discard** reverted to the last saved value and then continued |
| Plan → already-happened | pass — recorded value set, redundant plan cleared, revision incremented |
| Unknown ≠ zero | pass — recorded `0` persisted as a real value, not as unknown |
| Clear a field | pass — returned to **Unknown** (row removed) |
| Two-tab stale write | pass — stale tab reported **Conflict — nothing written**, kept its input, and did not overwrite the other tab |
| Backup export | pass — `no-store`, attachment filename, envelope v1 / `c1b/1`, custom key preserved, no secrets |
| Restore-new | pass — new non-default franchise; the database confirms the same `c_…` key with a **new** row id (ids remapped) |
| Invalid backup | pass — refused ("not valid JSON") and no franchise was created |
| Rename / Make active / Archive / Resume | pass — after the fix below |
| Provenance | pass — honestly reports that no source revision has been imported |
| Console | pass — no errors; only HMR notices and one benign CSS-preload warning |
| Sign-out | pass — session revoked; `/gm` → `/sign-in?next=%2Fgm` |

**Defect found and fixed (display only):** after **Make active**, the top-bar "Active franchise" picker kept
showing the previous franchise until a full navigation. The stored state was correct — the list showed the
right `Active` badge and a reload showed the right selection — because the picker is an uncontrolled
`<select defaultValue>` and React never rewrites its value after a server-driven change. Fixed by keying the
select on the server-provided id; the regression test `tests/franchise-picker.test.tsx` rerenders with a
different id and fails without the fix. Fix
[PR #14](https://github.com/joshhkee/franchise-manager/pull/14) is open with green checks (the test file
lands with that PR).

**Test data:** the pass created a second franchise ("Restored Test", from the round-trip) and modified one
player in the live project. The owner approved a cleanup that removes the test-created franchise and test
player so the project returns to its pre-test state; the franchise revision stays monotonic and is bumped so
any tab left open sees a conflict rather than writing against out-of-band changes. The app has no delete
command by design and the `app` schema is not exposed through PostgREST, so the owner runs it in the
Supabase SQL editor:

```sql
delete from app.franchises
 where id = '702ad0d3-b565-4de0-ac5c-9eae1faed9c8';

delete from app.franchise_players
 where id = '90b4d672-1ae0-4c6a-8357-a1c97e12f023';

update app.franchises
   set revision = revision + 1, updated_at = now()
 where id = '8df75d43-ffa1-4f3a-bcda-abb605b46a67';
```

Expected end state: one franchise (Atlanta Falcons, default, one higher revision, 0 players, 0 field rows).
This is cleanup, not imported data.

Checks not covered by this pass: iOS/Safari device runs (later verification) and the source-import round trip
(the import path is not built).

## Owner runbook — turn C1B on

1. **Apply the migrations to the project** (D088/D119; never during a build). Paste each file from
   `supabase/migrations/` into the dashboard **SQL editor** in order (`0001` → `0005`), or use the CLI:

   ```bash
   npx supabase link --project-ref xueymrywpvegslbkdnpf
   npx supabase db push
   ```

   Export a backup first if the project ever holds data; it currently holds none, so the forward path is
   risk-free. The files are not idempotent — apply each once, in order.
2. **Add the allowlist row** in the same SQL editor (GitHub numeric id `21141160`, login `joshhkee`):

   ```sql
   insert into app.owner_allowlist (github_user_id, github_login)
   values (21141160, 'joshhkee')
   on conflict (github_user_id) do nothing;
   ```

3. **Sign in** at `/sign-in` locally (`http://localhost:3000`) or on the production domain. A refusal
   explains itself; `setup_incomplete` means the migrations are not applied yet.
4. **Run the four manual scenarios** and report anything that looks wrong: create the Atlanta franchise →
   add a custom player → plan a field and then record it as already-happened → download a backup, restore it
   as a new franchise, and confirm the custom player keeps its `c_*` app id while gaining a new row id.

## Next steps (owner flow)

1. ~~Apply migrations `0001`–`0005` and add the allowlist row~~ — **done** (owner, 2026-10-02).
2. ~~Sign in and run the manual scenarios~~ — **done**; the browser pass above replaced and exceeded them.
3. ~~Merge the checkpoint PR~~ — **done**; PR #13 merged into `main` as `4c137f1`.
4. **Merge the picker fix** — owner: you; [PR #14](https://github.com/joshhkee/franchise-manager/pull/14) is
   open with green checks. **OWNER APPROVAL/CHECK.**
5. **Run the approved test-data cleanup** — owner: you; the cleanup SQL in the browser-pass notes removes the
   test-created franchise and test player. **OWNER CHECK.**
6. **Confirm the Supabase URL Configuration** — owner: you; Site URL + Redirect URLs, which cannot be
   verified remotely.
7. **Decide the remaining open item** — owner: you; the source-import path needs the C0A source data before
   it can populate the catalog.
8. **Owner acceptance of C1B, then start C2A** from the merged, verified base.

Immediate next step: **merge PR #14 and run the cleanup SQL.**

## Next thread — pasteable launch

C1B is complete and merged (`main` `4c137f1`); the next checkpoint is **C2A**. Use the canonical **C2A**
prompt from [LAUNCH_PROMPTS.md](../../LAUNCH_PROMPTS.md) in a fresh thread/worktree and fill that record's
own assignment header. The block below is retained as the C1B launch record:

Fill the assignment header above, then paste the canonical **C1B** prompt from
[LAUNCH_PROMPTS.md](../../LAUNCH_PROMPTS.md) plus its shared instruction, and add:

> The owner has authorized dependency installs and Supabase use. The Supabase project and GitHub OAuth
> App already exist; do not provision cloud resources without a further scoped approval. The owner placed
> `.env.local` (three variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
> `SUPABASE_SECRET_KEY`) in the main checkout `C:\Users\josh\Desktop\React Projects\franchise-manager`;
> import it into this worktree at bootstrap — never print, commit, or paste its contents. The owner's
> dashboard confirmations (GitHub provider, redirect URLs, Vercel env scopes) arrive in this thread.
> Resolve the local/embedded test-isolation and migration-application decisions recorded in this handoff
> (D119) before claiming the C1B exit gate.
