# Setup and Recovery Guide — Strict $0

Status: instructions for future execution. Nothing provisioned or installed by this planning thread. Owner has GitHub/Git, Supabase, Vercel accounts; service projects not yet created. Commands are illustrative; verify current provider UI/docs and tool availability.

## What the owner will provide

Non-secret setup facts:
- Verified repository URL, PR target and separately recorded production deployment branch (may differ), plus permission to create checkpoint branches/push/PR.
- Confirmed GitHub identity to allowlist (record stable provider identity or authorized internal user ID privately, not merely an editable display name).
- Available free Supabase project slots, chosen region, development/production project names.
- Vercel project connected to the verified repository; personal non-commercial Hobby plan.
- Local tool inventory and permission for any missing installs.
- Later: actual Madden version/platform evidence for research gaps and iOS Safari/manual acceptance.

Secrets stay in provider dashboards/local ignored environment files or approved secret stores. Never paste tokens, OAuth client secrets, database passwords, service-role keys, or private franchise backups into chat, committed docs, screenshots, or PR bodies.

## 1. Inspect tools before selecting commands

On Windows use Git Bash (commands remain POSIX); read-only checks:

```bash
git --version
node --version
corepack --version
gh --version
docker --version
```

Missing tools are not authorization to install them. The execution thread explains why a tool is needed, compatible versions/current free licensing, and exact scoped steps. Package manager choice is recorded once in C0B/C1A; afterward use the repository lockfile/scripts consistently. Docker/local Supabase is optional pending inventory, but real authorization/policy/transaction tests still need an isolated database integration path.

GitHub CLI is convenient, not mandatory. If used, owner authenticates through its normal browser flow and the agent verifies auth without printing credentials.

## 2. Repository baseline and worktrees

Follow WORKFLOW.md. Confirm actual current branch/remote; do not infer main from metadata. Publish approved docs as part of C0A by default; a separate owner-authorized docs PR is optional if the review lane needs an earlier common base. Both worktrees must reference one explicit committed baseline, never unrelated uncommitted copies.

## 3. Create separate Supabase Free projects

> **Superseded for this execution (D103).** Only one Supabase Free slot is available, so a single project serves as production and there is no separate dev project. The steps below remain the reference for the ideal two-project setup if a second slot ever frees up. Local development and automated tests must use isolated local/embedded data, and the Vercel Preview scope must not receive production write credentials.

Owner performs or explicitly authorizes provisioning:
1. Sign in to Supabase and verify organization is Free, not a trial/paid upgrade.
2. Check available active-project slots. Current documented Free maximum is two; recheck. Existing unrelated projects are not disposable.
3. Create development project, e.g. `franchise-manager-dev`, in an appropriate region. Generate/store its database password safely.
4. Create production project, e.g. `franchise-manager-prod`, in an appropriate region. Store its different password safely.
5. Record non-secret project IDs/URLs in the private execution setup record; put necessary keys in ignored environment/provider secret settings.
6. Verify no paid add-ons, domains, branching, or backups were enabled by accident.
7. If slots are unavailable, stop for owner decision. Do not delete other projects, upgrade, or reuse another application's database silently.

Database structure comes from the reviewed C0B schema/migration contract. One cloud database contains many logically isolated franchises, not one cloud project per franchise. Development and production are separated for safety, not because franchises require separate databases.

## 4. GitHub OAuth and authoritative owner access

Owner-guided setup after auth design is reviewed:
1. Get each Supabase project's Auth callback URL from its dashboard (normally `https://<project-ref>.supabase.co/auth/v1/callback`; verify exact value).
2. Create appropriate GitHub OAuth applications in GitHub developer settings; separate dev/production apps are recommended because callback configuration differs.
3. Configure client ID/secret only in Supabase provider settings. GitHub OAuth secret is not a public frontend environment variable.
4. Configure application/site callback URLs and approved redirects for localhost, the controlled dev preview, and production. Avoid permissive arbitrary wildcard redirect hosts.
5. Define private owner bootstrap: provider identity/internal authorized-user identity allowlist enforced server-side/database-side. A first unexpected OAuth login must NOT automatically become owner.
6. If disabling new signups would prevent initial OAuth bootstrap, resolve that flow deliberately using current Supabase behavior. Do not switch to 'first user wins' or open enrollment.
7. Test authorized owner login/logout/session expiry on desktop and phone. Test a non-allowlisted identity or controlled unauthorized session and direct data requests; private franchise data must not be accessible.
8. Apply/test row-level policies for owner and franchise scope. Privileged migration/admin credentials stay server-only; normal app reads/writes should not casually bypass policies.
9. Document account recovery/admin procedure privately without adding public signup.

Exact bootstrap implementation is an ADR at C0B/C1B. Auth configuration is not complete because the login page looks private.

## 5. Environment matrix

| Environment | Data target | Mutations | Secret location |
|---|---|---|---|
| Automated unit/domain tests | synthetic/approved fixtures | isolated in-memory/local | no production credentials |
| DB integration tests | isolated local DB or reviewed dev test scope | isolated test data | ignored test env |
| Local development | dev Supabase | dev only | ignored local env |
| Vercel preview | dev Supabase | dev only | Vercel Preview environment |
| Vercel production | prod Supabase | prod only | Vercel Production environment |

- Verify actual env-variable naming from implementation; expose only deliberately public client configuration.
- Production credentials must not be inherited by preview builds or test scripts.
- Multiple previews may share a dev project only with explicit fixture namespaces and one migration owner; no concurrent destructive reset.
- Do not run migrations in application startup or ordinary Vercel build commands.
- In-session pending/failed edits require retry/discard/stay behavior before franchise switch/navigation/sign-out; session expiry cannot be treated as successful autosave. This is failure safety, not a durable offline mutation queue.
- Environment examples list names/placeholders only, never real secrets.

## 6. Connect Vercel Hobby

1. Confirm personal non-commercial eligibility and Free/Hobby status; no trial or paid add-on dependency.
2. Import verified GitHub repository into a new project after owner approval.
3. Set framework/build/root configuration matching the actual project, not guessed npm commands.
4. Set production branch deliberately. Owner merge into it authorizes app deployment (D088).
5. Set Preview variables to development and Production variables to production. Inspect before first deployment.
6. Configure approved auth callbacks/redirects. Use a deliberately authorized stable dev/preview host or explicit preview URL registration, then document/test it. Do not assume dynamic Vercel preview URLs work with OAuth out of the box or solve this with arbitrary wildcard redirect hosts.
7. Enable useful free checks without paid analytics/error services. Preview account/data privacy still relies on real app authorization.
8. Verify app route loads, owner access, unauthorized denial, persistence target, and no secret leakage in build/client logs.
9. Record preview URL, production URL, deployed commit, and limitations in the delivery record.

C1A shell previews/deploys must contain no private franchise data, production keys or pretend authenticated state. Do not expose private persistence routes before C1B's authorization gate passes. If PR integration and production branches differ, record the reviewed promotion path; merge only triggers the configured production branch, not every feature branch.

Automatic deployment is not permission for a production database migration. New schema changes must be reviewed for compatibility with old/new deployed app versions. Use an explicit expand/migrate/contract plan where needed; don't assume code/database deployment is atomic.

## 7. Free-tier caveats and capacity

Official initial checks in RESEARCH.md found Supabase Free: 500 MB DB, 5 GB egress, 1 GB storage, two active projects, inactivity pausing, no automatic backups/branching. Vercel Hobby is personal non-commercial with finite usage. Recheck at setup.

- Shared immutable dataset records and sparse franchise differences avoid unnecessarily duplicating the complete catalog.
- Measure real import/database/asset sizes; don't guess the maximum franchise count or promise unlimited saves.
- Use appropriate queries/indexes/pagination and fetch only needed phone/gameday data.
- Serve/store play art only with permitted reuse and a cost-aware strategy. Public source access is not license.
- No artificial keepalive traffic to avoid pause policies.
- If a limit is reached, stop and report $0-compatible options; don't upgrade silently.

## 8. Owner backup and resume routine

Manual export is an explicit owner responsibility because free automatic backups are absent:
- Export a versioned franchise backup after substantial planning/roster sessions and before risky data/migration work.
- Keep backups outside the repository in a trusted location. They contain private franchise notes/data, even if not credentials.
- Test validated restore into a NEW franchise in dev before relying on recovery; replacement requires reviewed confirmation.
- A per-franchise app export does not replace schema/source/catalog recovery. The execution handoff must document reconstructing schema and exact permitted versioned source records, or an owner-approved database export route. A version ID alone cannot recover an unavailable snapshot; C1B records whether reconstruction uses permitted retained data or a reproducible source plus missing-revision failure handling.
- Extend backup round-trip tests in every feature checkpoint. Export must include implemented pending/recorded state, assets, overrides, notes/favorites/dismissals and drive templates; restore remaps mutable IDs and grants only the authenticated owner access. Never treat an old envelope that drops new features as a complete backup.
- Keep backup/restore drills in isolated development state. Don't pause/reset production or copy a private real backup into a public PR to demonstrate recovery.

If inactive project pauses:
1. The app must show a truthful unavailable/retry state, not lose/claim saved edits.
2. Owner signs into Supabase, selects the correct project, and uses the current provider's resume/restore workflow.
3. Check current provider retention/recovery policy rather than assuming paused data exists indefinitely.
4. Verify auth and a harmless read before attempting edits.
5. If unavailable/data lost, recreate reviewed schema/source state and restore validated backups using documented recovery steps.
6. Record the recovered state and conflicts; don't overwrite newer franchise backups blindly.

## 9. Migration checklist

Before a production schema/data change:
- Verify owner scoped approval, current deployed version, clean migration ownership, correct project ID.
- Export backup/record recovery path and check backward compatibility.
- Apply and validate in development first; include policy/transaction tests.
- Explain irreversible/lossy steps and obtain separate approval if present.
- Apply production migration explicitly, verify success/data/access, then verify app deployment compatibility.
- Record actual migration names/applied status and unresolved follow-up; don't tell the next thread to rerun blindly.

No provisioning, installs, auth changes, deployment, or migrations were performed by the planning thread.
