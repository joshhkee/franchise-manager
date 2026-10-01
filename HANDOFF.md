# Checkpoint Handoff Protocol

Status: required template for execution threads. This file defines the format; it is not a claim that any checkpoint is implemented or merged.

## Where records live

Execution thread creates an owned record at `docs/checkpoints/<CHECKPOINT-ID>.md` (directory does not exist yet). Use lane suffixes only when they help coordination, e.g. `C4B-UI.md`; the checkpoint's main record links them and contains integrated evidence. No separate mandatory integration record or status index is needed. Do not overwrite this protocol with one thread's transient report. WORKFLOW.md defines independent versus integrated parallel delivery.

Update delivery records in the checkpoint commit, including the proposed next instructions. PR URLs/remote results learned after that commit can be included in the PR body and next accepted integration record; do not create an endless series of commits solely to record a commit's own hash.

## Keep records proportional

The template is a checklist, not a requirement to manufacture identical reports in three places. One checkpoint record plus a short PR body linking it is sufficient. Mark irrelevant sections N/A; docs-only work has no app typecheck/browser requirement. Lane records can be abbreviated to ownership/base, contract, changed outcomes, verification, blockers, and integration instructions. Reuse PLAN.md/ACCEPTANCE.md references instead of pasting the entire specification.

Fields such as workspace root and project identities may contain machine/account-specific information: use repo-relative paths and non-sensitive aliases in committed records; keep sensitive local locations private. Include no credentials/private exports.

## Required delivery record

```markdown
# <Checkpoint ID> — <Outcome>

## Status
- State: not started / in progress / blocked / lane ready for integration / checks passed / PR open / owner accepted & merged
- Updated by:
- Workspace root:
- Feature branch:
- Verified PR target:
- Started from merged base commit:
- Current commit / PR URL (if known):
- Remote mergeability/check state (include pending/unknown honestly):
- Owner merge confirmed? No/Yes, with resulting base commit:
- Production deploy status:
- Production migration status (not authorized / approved / applied / failed):

## Scope and authority
- Read decisions/spec/phase packet versions:
- Approved changes:
- Explicit exclusions:
- File/module ownership and integration owner:
- Shared contract version:
- Other active lane / delivery mode / merge order:

## Implemented
- Outcomes with workspace-relative clickable file links:
- Important design/domain choices:
- Source provenance and covered vs unsupported records/formations:
- New dependencies and why already-selected/approved:

## Invariants verified
- Franchise/source isolation:
- Planned/confirmed and checklist semantics:
- Formation uniqueness/override/orientation where relevant:
- Auth/policies/secret handling where relevant:
- Unknown/missing-data handling:

## Verification evidence
| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck | | | |
| Build | | | |
| Relevant tests | | | |
| Integration/policy tests | | | |
| Desktop browser | | | |
| Phone/iOS check | | | |
| Console/network | | | |

- Checks NOT run and why:
- Screenshot/artifact links if created:
- Actual-device owner test still needed:

## Owner manual acceptance
1. Preconditions and starting state:
2. Actions to take:
3. Expected visible result:
4. Recovery/undo to try:
5. Known limitation to verify:

## Database/environment
- Dev/prod project identities (non-secret):
- New migration files / applied environments:
- Safe application order / compatibility:
- Backup and rollback/recovery considerations:
- Preview server port/process owner:
- No secret values included:

## Open items
- Blockers (evidence, decision affected, owner question):
- Bugs/limitations with severity:
- Deferred work explicitly outside scope:
- Other-editor/uncommitted work left untouched:

## Next thread — pasteable launch
- Exact next checkpoint:
- Required merged baseline and how to verify it:
- Files/docs to read first:
- Owned paths/modules:
- Dependencies that MUST land first:
- Allowed implementation outcomes:
- Things NOT to change:
- Verification and PR exit gate:
```

## PR body template

```markdown
## Why
<Problem solved and owner-visible payoff>

## Scope
- Checkpoint / phase:
- Owned changes:
- Not included:
- Dependencies / target branch:

## Evidence
- Type/build:
- Relevant tests:
- DB isolation/security checks:
- Desktop/mobile review:
- Source/coverage limitations:

## Owner acceptance
1. <Short reproducible scenario>
2. <Expected result>
3. <Undo/failure scenario>

## Deployment / data
- App auto-deploy expectation:
- Migration required? Exact reviewed sequence, no automatic prod build migration:
- Backups / risks:

## Handoff
<Delivery record link and next checkpoint prerequisites>
```

## Completion meanings

- **Checks passed**: specific checks actually ran successfully; not automatically mergeable or owner-approved.
- **PR open**: real remote PR exists; include its actual base and current checks/mergeability. Pending checks are not green checks.
- **Lane ready for integration**: owned slice is tested against its contract; not an integrated completed checkpoint or necessarily primary-target mergeable.
- **Mergeable**: separate conflict-free remote status from required-check status. 'Ready for owner merge' requires the actual intended base, no conflicts, and satisfied required checks. Pending/failed/unknown checks are not readiness even if GitHub reports no conflicts; missing configured CI must be disclosed with local evidence.
- **Owner accepted & merged**: acceptance and an actual merge outcome/base commit are established. Approval alone is not merge evidence. Agents never self-merge a primary-target PR.
- **Deployed**: actual hosted deployment verified, not inferred from push.
- **Migrated**: actual named migration applied to identified environment with authorization, not inferred from code commit.

## Next-thread startup checklist

1. Read START_HERE.md and the phase packet, then confirmed decisions/spec/design/research.
2. Inspect workspace root, branch/status, remote/base, worktrees, and existing changes before edits.
3. Read the last relevant merged delivery record across the whole dependency chain; don't rely only on the previous chat's last message.
4. Verify predecessor PRs are merged and environment/migration state matches their records.
5. Write your scoped todos and ownership before coding.
6. If reality conflicts with handoff, pause and report the discrepancy; do not patch around missing dependencies silently.
7. Keep docs current so the next thread requires no access to private provider session state or this planning chat.
