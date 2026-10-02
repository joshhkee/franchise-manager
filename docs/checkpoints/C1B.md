# C1B — Private Auth, Data, and Franchise Foundation (startup handoff)

## Assignment header

```text
Checkpoint:                   C1B (private auth, isolated data, franchise lifecycle)
Workspace/worktree:           NEW Freebuff thread + worktree (owner-created)
Owned feature branch:         checkpoint/c1b-foundation
Verified PR target:           main
Production deployment branch: main
Started from merged base:     <merge commit of this handoff PR> (on top of PRs #1-#10; verify 8c82b5d is an ancestor)
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

- **State: not started — handoff ready.** This record is the startup handoff for a NEW C1B thread/worktree;
  the C1B thread owns and updates it from here.
- Updated by: review/closeout thread at owner direction.
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

## Owner inputs still required before C1B's exit gate can pass

1. **Non-secret facts:** Supabase project ref/URL, region; Vercel production URL; the GitHub identity to
   allowlist (username plus numeric user ID); the local dev port.
2. **Secrets** (in the C1B worktree's ignored `.env.local`, never in chat/docs/PRs):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Supabase dashboard confirmation:** Authentication → Sign In / Providers → GitHub is **enabled** with
   the OAuth App's Client ID/Secret; Authentication → URL Configuration has the Site URL and redirect URLs
   for localhost and the Vercel preview/production hosts.
4. **DECISION — local/embedded test isolation (D103, IR-10).** With no Docker/`psql`/Supabase CLI, choose:
   - (a) install Docker Desktop → local Supabase CLI stack (most faithful: real Auth + RLS + policies);
   - (b) approve `@electric-sql/pglite` (embedded Postgres in Node, no Docker) for schema/RLS tests, with
     auth flows verified against the cloud project;
   - (c) install a local PostgreSQL and run migrations/policies manually;
   - (d) another owner preference.
5. **DECISION — applying migrations to the cloud project** (separate reviewed operation per D088): approve
   the path (e.g. `npx supabase` CLI + owner access token/DB password, or owner-run SQL) and the timing.
6. **Vercel env scopes:** confirm Preview vs Production variable scoping, so previews never receive
   production write credentials (D103/D105).

## Open design items C1B must resolve (with evidence)

- **IR-10 preview/production isolation with a single project:** design and verify that a preview cannot
  write to the production project's data.
- **Single-project reality:** dev/test isolation mechanism (owner decision 4).
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

- Checks NOT run and why: any C1B application/DB/policy test — the checkpoint has not started.
- No secrets, private exports, or credentials are included in this record.

## Next steps (owner flow)

1. **Answer items 1–6 above** — owner: you; **OWNER APPROVAL/CHECK:** the test-isolation choice (4) and the
   migration path (5) block C1B's exit gate, not its first commits.
2. **Open the new C1B thread/worktree** from the merge commit of this handoff PR — owner: you; artifact:
   the pasteable launch below.
3. **C1B implementation** — owner: C1B thread; schema/migrations against `C0B-v2`, auth + allowlisting,
   franchise isolation, player baseline/plan primitive, backup envelope, and the required integration
   tests.
4. **Apply migrations to the cloud project** — owner: C1B thread with your approval; **OWNER APPROVAL/CHECK:**
   D088 requires a separate reviewed migration step with a recovery path.
5. **Owner merge of the single integrated C1B PR** — owner: you; see `WORKFLOW.md` Step 6.

Immediate next step: **answer items 1–6, then open the new C1B thread with the launch package below.**

## Next thread — pasteable launch

Fill the assignment header above, then paste the canonical **C1B** prompt from
[LAUNCH_PROMPTS.md](../../LAUNCH_PROMPTS.md) plus its shared instruction, and add:

> The owner has authorized dependency installs and Supabase use. The Supabase project and GitHub OAuth
> App already exist; do not provision cloud resources without a further scoped approval. Secrets live in
> the ignored `.env.local` — never print, commit, or paste them. Resolve the local/embedded test-isolation
> and migration-application decisions recorded in this handoff before claiming the C1B exit gate.
