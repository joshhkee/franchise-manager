# Execution Workflow — Windows, Two Threads, Reviewed PRs

Status: operating procedure supporting approved D046–D048/D087–D089. Commands here are instructions, not commands executed by the planning thread. Verify actual paths, branches, remotes, tools, and permissions before use.

## Non-negotiable rules

- Never run two coding threads against the same checkout. Each writable thread gets its own worktree AND branch.
- Never switch a shared checkout's branch while another thread works in it.
- Never reset, clean, stash, delete, stage, or overwrite someone else's work. A dirty baseline must be understood first.
- Default: one meaningful checkpoint per delivery branch/PR. Parallel lane branches are allowed under the delivery modes below; a partial lane PR is not a completed checkpoint. Owner reviews/merges; no agent self-merge, force-push, direct primary-branch push, or production migration during a build.
- Push/open PR are authorized for the requested execution checkpoint; credentials, installations, provisioning, destructive changes, production data, or scope changes require appropriate additional confirmation.
- Use the project's established package manager once selected. Do not install competing lockfiles.
- No application code in the planning thread. Docs can be revised as decisions emerge.

## Step 1 — Inventory before worktrees

Open Git Bash on Windows in the current repository. First inspect, do not mutate:

```bash
git status --short
git branch --show-current
git remote -v
git worktree list
git symbolic-ref --short refs/remotes/origin/HEAD
```

The last command can fail if the remote default is not recorded. Do not infer that the current phase-5-scheme-fit metadata branch is the integration branch. Ask the owner which branch receives PRs and verify the remote repository.

Identify all uncommitted docs/source hunks and their ownership. These planning docs are currently delivered as local files, not committed. Before implementation depends on them, have the owner authorize a documentation checkpoint (or include them deliberately in the first planning/evidence PR). No broad `git add -A`.

If updates from GitHub are needed, perform a read-only-to-working-tree fetch after confirming the remote and task authorization:

```bash
git fetch origin
```

Do not pull/rebase a dirty shared branch. Obtain a clean verified base without discarding the current checkout's changes.

## Step 2 — Publish the specification baseline

Execution needs the same approved docs in every worktree. Default: include the approved planning docs deliberately in the C0A evidence delivery; do not add a mandatory publication-only checkpoint. If concurrent research/review needs a common baseline first, an owner-authorized small docs PR may publish it early. Alternatively both lanes may start from the same explicitly recorded committed planning base; disclose this unmerged dependency, and neither may claim target-branch completion until it lands. Never stage ambiguous pre-existing work. If C0A updates research, incorporate its conclusions before C0B is frozen.

Never copy stale docs manually into several branches and call them authoritative. If the docs baseline has not landed, pause feature work or use an explicitly recorded stacked base—not an invisible local dependency.

## Step 3 — Create isolated worktrees

Example shows two C1B lanes only AFTER the C1A visual gate is accepted/merged and the owner verified `origin/main` as their common base. For the initial C0 researcher/reviewer pairing use the corresponding owned branch/path names and explicit planning base instead. Replace every example if not true. Sibling paths require owner approval because they are outside this workspace; do not nest worktrees in the app repository. Git Bash/POSIX commands on Windows:

```bash
git worktree add -b checkpoint/c1b-foundation ../franchise-manager-c1b origin/main
```

For the approved split, create B separately from the SAME verified base:

```bash
git worktree add -b lane/c1b-catalog-ui ../franchise-manager-c1b-ui origin/main
```

Use the integrated delivery mode: B's UI is not a separate completed C1B checkpoint. These commands do not authorize starting C1B before C1A approval.

These branch names are examples; actual assignments come from the active checkpoint record. Two worktrees cannot use the same checked-out branch. Never run these examples blindly from a different repository.

In Freebuff:
1. Open the first worktree folder as its own project/workspace and create an execution thread there.
2. Open the second worktree folder as another workspace and create its execution thread there.
3. Check each thread's workspace root and current branch before giving it write tasks.
4. Paste its launch prompt from the corresponding phase packet, plus the exact checkpoint/lane/base/ownership assignments.
5. Each thread reads docs from ITS worktree. If docs are missing, the shared baseline is wrong—fix setup rather than let the agent guess.
6. Agents inspect existing dev servers/listeners before selecting different preview ports. They must not stop another thread's server.

Do not use two chat tabs in one shared working directory as isolation. A second thread is not a second branch by itself.

## Step 4 — Assign integration ownership

Before parallel coding, record this in the checkpoint handoff:

```text
Checkpoint:
Verified PR target:
Production deployment branch (may differ):
Merged base commit:
Lane A branch/worktree:
Lane B branch/worktree:
Integration owner:
A owns paths/modules:
B owns paths/modules:
Shared contract/version:
Allowed shared changes:
Blocked dependencies:
Dev database/project identity (non-secret):
Preview port/server owner:
Merge order:
```

Lane A is normally integration/domain/persistence owner; B is UI or independent research. This is a role, not permission to merge PRs. Owner still merges PRs into the primary branch. Incorporating reviewed owned lane commits into an isolated checkpoint branch is a separate explicitly authorized integration operation, never permission to alter another thread's checkout.

- A alone owns migrations, database policies, shared domain/API types, dependency additions/lockfile, global route/layout changes, and state semantics unless explicitly reassigned.
- B owns named feature UI/components/read models or exclusive data batches. B requests shared changes via a documented contract request, not an independent competing implementation.
- Path ownership is filled after C0B/C1A actual structure exists; do not invent file paths as if code already exists.
- A/B may both touch different docs only if assigned. DECISIONS.md and PLAN.md are single-writer. The currently next checkpoint's delivery record is the operational status source; do not invent another mandatory handoff index or duplicate status database.
- If a shared contract changes, version/document it, communicate, and pause dependent work until both lanes use the same version.
- Do not parallelize migrations against the same cloud dev project. One migration owner, reviewed application sequence, fixture namespaces/isolated test runs.

## Step 5 — Select a parallel delivery mode before work

Record ONE mode, branch targets, and integration owner in the assignment:

1. **Independent checkpoints:** use separate PRs only when each assigned slice is independently useful/testable and matches a named approved checkpoint (for example C3B coverage alongside C4A GM). Owner merges the first; the second updates its verified base and reruns checks. Neither PR relies on hidden local code.
2. **One integrated checkpoint (default for backend + UI):** each lane uses an isolated branch/worktree. B submits its owned lane commits and concise verification record; A incorporates them with explicit authorization into the checkpoint delivery branch, runs integrated acceptance, and opens ONE final checkpoint PR. A lane PR, if useful, is labeled partial and targets the checkpoint branch; it is not a second owner-acceptance gate or primary-ready milestone. No forced extra integration PR after the final one.

The independent C0A reviewer can deliver a report PR separately or have its owned report integrated into the C0A PR with permission; either way findings have a disposition and do not create a hidden extra mandatory checkpoint.

A lane may be 'ready for integration' without meeting end-to-end checkpoint acceptance. Only the integrated delivery can claim the checkpoint complete. Owner still controls primary-branch merge. Do not combine unreviewed borrowed hunks, broad staging, or others' secrets under integration authority.

If B depends on A's new unmerged contract, the safe default is wait for A's PR to merge before B starts. A deliberately stacked PR is possible only if base/merge order is explicit and the owner accepts the coordination overhead. Do not label B mergeable-to-primary when it only works atop an unmerged local branch.

After owner confirms a merge, in the relevant owned clean worktree:

```bash
git status --short
git fetch origin
```

Bring the verified target base into the feature branch only with an explicit agreed merge operation. No automatic rebase/force-push. If conflicts exist, stop and coordinate ownership; do not resolve them by discarding the other lane.

New checkpoint branches start from the latest merged accepted base. Do not carry unrelated unfinished changes forward.

## Step 6 — Required checkpoint delivery

1. Verify current branch, status, tracked/untracked ownership, and intended PR base.
2. Run the project's typecheck/build and relevant tests for code checkpoints. Docs-only deliveries check consistency/evidence/links and mark application checks N/A. Inspect desktop/mobile where UI is affected; backend-only lanes need integration tests, not fabricated screenshots. Database-policy/isolation/transaction changes need real integration verification, not only mocked unit tests.
3. Run full checks at integration boundaries. If the environment blocks a check, name it; don't say all checks passed.
4. Fill the checkpoint delivery record from HANDOFF.md. Include actual test commands/results, limitations, migrations, source coverage, and next thread blockers.
5. Review staged AND unstaged diffs and recent commit style before committing. Scan for secrets, real private exports, and accidental generated files.
6. Stage only owned relevant paths/hunks. If file ownership is mixed, do not broadly stage it; resolve with the other editor or leave it uncommitted.
7. Commit on the owned feature branch. Use concise why-focused messages and the coding-agent-required attribution footer. Never change Git config for this.
8. Push the owned branch, not the integration branch. No force push.
9. Open PR against the verified base, with tests, scope, screenshots where useful, migrations, limitations, and manual acceptance checklist.
10. Confirm remote checks/base/mergeability after push. A local clean merge is not proof GitHub considers the PR mergeable. If pending/blocked, report the exact state.
11. Stop for owner review; do not merge the primary-target PR. Put post-commit PR URL/check/commit facts in the PR body or next checkpoint's startup record, referencing the committed handoff; do not leave mandatory uncommitted handoff edits solely to record a self-referential commit hash.

Before the checkpoint commit, review both unstaged and staged changes plus recent message style:

```bash
git diff
git diff --cached
git log -5 --oneline
```

Stage only explicitly owned relevant paths/hunks, then use a why-focused message with the required attribution. Git Bash heredoc example (replace message; not a commit performed by planning):

```bash
git commit -m "$(cat <<'EOF'
Establish a consistent private workspace for franchise planning.

EOF
)"
```

Do not combine staging/commit broadly if ownership is mixed. Never commit an empty checkpoint or change Git identity/config to make a commit succeed; ask if setup is missing.

Illustrative GitHub CLI commands, after verifying `gh` and auth (never install or authenticate silently):

```bash
gh auth status
git push -u origin checkpoint/c1a-shell
gh pr create --base main --head checkpoint/c1a-shell --title "Establish the private franchise workspace" --body-file docs/checkpoints/C1A.md
gh pr checks
gh pr view --json url,state,mergeable,mergeStateStatus,baseRefName,headRefName
```

The body-file path is an execution deliverable to create, not a currently existing file. Replace names/paths with the actual record. If `gh` is unavailable or unauthorized, provide the owner a compare URL/manual PR body and mark the PR step blocked; do not pretend it was opened.

## Step 7 — After owner merge

1. Verify the remote merge outcome and target commit (with owner confirmation where needed). Owner merge remains the authorization; 'approve' is not evidence that the PR was merged.
2. The next thread records the accepted baseline, PR/commit and deployment/migration status in its startup handoff. Do not demand a separate status-only PR after each merge.
3. Check Vercel deployment if configured; owner merge authorizes app deployment only, not arbitrary DB changes.
4. Export backup before approved production migrations; verify forward/backward compatibility, apply explicitly, test, record outcome.
5. Start next checkpoint from the accepted merged base.
6. Clean up worktrees only after owner confirms their work is merged/backed up and status is clean. Removal/branch deletion are separate owner-approved housekeeping, never a reset/clean shortcut.

## Recommended two-thread rhythm

- Early: planner/research reviewer can work beside one foundation coder, but don't force parallel code before contracts exist.
- State-heavy features: A implements tested service contract; B builds UI against approved fixtures. Integrate and rerun full workflow.
- Broad datasets: assign exclusive batches plus one shared catalog/mapping owner.
- Gameday: rules/metadata owner and phone UI owner after scenario types/fixtures freeze.
- If coordination costs exceed useful parallelism, run sequentially. Correct integration is the optimization, not maximum simultaneous edits.
