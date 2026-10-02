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
- Updated by: this thread (C1B execution lane).
- Owner inputs (2026-10-02): `.env.local` written and **verified live**; Vercel production domain verified;
  GitHub provider verified enabled; Vercel env vars owner-reported. Only the Supabase **URL Configuration**
  confirmation (Site URL + Redirect URLs) remains — it cannot be verified remotely.
- PGlite/migration decisions resolved (D119).
- Owner merge confirmed? n/a (not started). Production deployment/migration: none.

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

## Verification evidence

| Check | Exact command/environment | Result |
|---|---|---|
| Handoff docs link/anchor | fresh parser over repo Markdown, 2026-10-02 | pass — 32 files, links/anchors, 0 missing |
| Application checks | n/a for this handoff | not run — docs-only; C1B runs them for real code |
| Tool inventory | `docker/psql/supabase/corepack --version` | not installed (recorded above) |
| Remote reachability probes | anonymous GETs, 2026-10-02 | Supabase `/auth/v1/health` 401 (keyless request rejected — expected); immutable Production deployment URL 401 (Deployment Protection); stable alias `https://franchise-manager-j.vercel.app` and `/gm` **200** (C1A shell live) |
| Supabase key probe | `/auth/v1/settings` + publishable → 200; `/auth/v1/admin/users` + secret → 200 (`{"users":[]}`); admin + publishable → 401 (role separation) | pass — both keys valid, live 2026-10-02 |
| Env file read by the real loader | `@next/env` `loadEnvConfig` over the main checkout, 2026-10-02 | pass — all three names parsed to the expected values; nothing printed |

- Checks NOT run and why: any C1B application/DB/policy test — the checkpoint has not started.
- No secrets, private exports, or credentials are included in this record.

## Next steps (owner flow)

1. **Confirm the Supabase URL Configuration** (Input 3, steps 3–4) — owner: you; it is the only owner item
   that cannot be verified remotely. Inputs 1, 2, and 4 are in (Input 1 verified live 2026-10-02).
2. **Open the new C1B thread/worktree** from the merge commit of this handoff PR — owner: you; artifact:
   the pasteable launch below. Tell the C1B agent to import `.env.local` from the main checkout at bootstrap.
3. **C1B implementation** — owner: C1B thread; schema/migrations against `C0B-v2`, auth + allowlisting,
   franchise isolation, player baseline/plan primitive, backup envelope, and the required integration
   tests.
4. **Apply migrations to the cloud project** — owner: C1B thread with your approval; **OWNER APPROVAL/CHECK:**
   D088 requires a separate reviewed migration step with a recovery path.
5. **Owner merge of the single integrated C1B PR** — owner: you; see `WORKFLOW.md` Step 6.

Immediate next step: **merge this handoff PR, then open the new C1B thread with the launch package below —
all owner inputs are in except the Supabase URL-Configuration confirmation.**

## Next thread — pasteable launch

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
