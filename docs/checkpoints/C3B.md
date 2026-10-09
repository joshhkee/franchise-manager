# C3B — Playbook coverage inventory and special teams (provisional, D130/D131)

## Assignment header

```text
Checkpoint:                   C3B (stock-book coverage inventory + special teams) — PROVISIONAL under D130
Workspace/worktree:           Freebuff worktree .freebuff/worktrees/56e5f485-… (this thread); deviation from
                              "new thread per checkpoint" recorded below
Owned feature branch:         freebuff/c3b-coverage-inventory
Verified PR target:           main
Production deployment branch: main
Started from merged base:     6210185 (merge of PR #25, the C3B pre-flight)
Predecessor PRs/records:      PRs #23/#24 (C3A + follow-up), #25 (C3B pre-flight); D128/D129/D130/D131 binding
Integration owner:            owner; single writer for this checkpoint
Owned modules/paths:          lib/formations/coverage.ts, lib/formations/special-teams.ts,
                              components/playbook-coverage.tsx, app/settings/page.tsx, tests/**,
                              docs/checkpoints/C3B.md, START_HERE.md
Shared contract version:      C0B-v2 (§2 source revisions/coverage vocabulary; §6 formation identity)
Other active lane:            none; delivery mode = one integrated checkpoint (C4A not started)
Dev/test environment:         PGlite/unit tests only; live Supabase project read by the dev server.
                              Migration `0012_formations.sql` applied 2026-10-08; no migration in C3B.
Provisional-rules note:       D130 — D113 stays open, every mapping stays provisional, and no book is labelled
                              verified. D131 — inventory-first scope: no new books mapped, no art, special
                              teams as inventory + roles with no diagrams.
```

Thread deviation: this checkpoint executes in the thread/worktree that closed the pre-flight instead of a fresh
worktree, the same recorded deviation as D120 for C1B. Work is isolated on its own branch cut from the merged
base, and the owner remains integration owner and reviewer.

## Status

- **State: checks passed (typecheck, lint 0 errors, 281 tests, build) · live browser pass on the owner's
  session · PR open for owner review.**
- Scope is exactly D131: coverage inventory + special-teams inventory/roles. **No new formations were mapped,
  no art was copied or embedded (the special-teams set names link to their source pages for provenance only),
  and no special-teams diagram was drawn.**

## Implemented

- **Coverage model** — [lib/formations/coverage.ts](../../lib/formations/coverage.ts) derives a
  **verified | partial | unsupported** status for each of the 86 inventoried books from the catalog itself
  (formation census, mapped count, slot evidence tiers), with per-book provenance (source, source URL,
  observation date, evidence tiers present) and a plain-language explanation. Nothing is hand-labelled, so the
  status cannot drift from the data it describes. **`verified` is unreachable today by construction**: every
  slot in the catalog still carries the `unverified_default` tier because D113 is open, and the report says so
  on screen rather than implying progress it cannot evidence.
- **Special-teams inventory** — [lib/formations/special-teams.ts](../../lib/formations/special-teams.ts) records
  the four sets a public source actually publishes (Field Goal 12, Punt 9, Punt Tight 3, Stop Clock 3 = 27
  plays), the eight named roles, the **seven sets no public source publishes** (kickoff, kick return, punt
  return, onside, field goal block, extra point, two-point), and the D131 no-diagram state with its reason. It
  carries **no slot or coordinate data at all**, which the tests assert, so a diagram cannot be drawn from it
  by accident.
- **Settings surface** — [components/playbook-coverage.tsx](../../components/playbook-coverage.tsx) replaces the
  old inline inventory list on [app/settings/page.tsx](../../app/settings/page.tsx): the honest totals line
  ("86 playbooks: 0 verified, 4 partial, 82 unsupported"), the meaning of each status, the per-book list with
  its detail, and the special-teams block. Roles that map to a real depth-chart slot say "depth chart"; holder
  and wing say "set role only" and are documented as having no slot, so nothing is invented.

## Invariants verified

- **Honesty**: no book, row, or copy claims verification while D113 is open; the legend states plainly what
  "verified" would require and that it is not an in-game check.
- **Derived, not asserted**: statuses come from the catalog; the tests re-derive the rule over all 86 entries
  and would fail if a status were hard-coded or if a book gained provisional slots without the label changing.
- **No invented data**: the special-teams module has no slots/coordinates; holder and wing are marked
  `set_role` and the tests assert `positionSpec("H")`/`positionSpec("Y")` are null while all six assignable
  roles resolve to real depth-chart slots.
- **Isolation/state**: nothing new is persisted — the report is derived per render and no schema changed, so
  backups and franchise isolation are untouched (C0B-v2 §8 envelope unchanged).
- **Reduced scope is visible**: the 82 unsupported books are listed with their published play counts rather
  than omitted, so the reduced all-book coverage D130 requires the owner to approve is on screen.

## Verification evidence

| Check | Exact command/environment | Result | Limitations |
|---|---|---|---|
| Typecheck | `npx tsc --noEmit` | pass | — |
| Lint | `npm run lint` | pass — 0 errors | 2 pre-existing unused-param warnings in `lib/actions/import.ts` |
| Full tests | `npx vitest run` | pass — 28 files, 281 tests | — |
| New coverage tests | `npx vitest run tests/coverage.test.ts` | pass — 11/11 (86-book reconciliation, nothing verified, derivation rule, provenance, loaded-book details, budget, special-teams sets/gaps/roles/no-slot) | — |
| New UI tests | `npx vitest run tests/playbook-coverage-ui.test.tsx` | pass — 4/4 (honest totals, no verified row, every book with its explanation, special-teams gaps and roles, injected report) | — |
| Catalog budget | `npx vitest run tests/coverage.test.ts --reporter=verbose` | pass — the 200-report-build + 60-formation resolve guard runs in **8ms** against 2000ms/1000ms ceilings | a regression guard, not a benchmark |
| Build | `npm run build` | pass — 12 static pages generated | — |
| Live browser pass | dev server `http://localhost:3220`, signed-in owner, Atlanta Falcons | pass | — |
| Console/network | preview console + network | clean — only React DevTools info and HMR connected; no errors | — |
| iOS Safari device check | not run | deferred to C5B per project convention | — |

Live pass detail (2026-10-09): Settings renders "86 playbooks: 0 verified, 4 partial, 82 unsupported"; the
badge census matches exactly (4 Partial, 82 Unsupported, zero Verified); expanding the list shows all 86 books,
e.g. Chicago Bears offense "5 of 42 formations mapped; 55 slots are still provisional." and San Francisco 49ers
offense "No formation data yet — the source lists 582 plays for this book."; the special-teams block shows
4 sets / 27 plays, 7 unpublished sets, six roles as "depth chart" and holder/wing as "set role only". Verified
at phone width (390px) and desktop width (1280px). One defect was found and fixed during the pass: role keys
and labels concatenated in the DOM text ("KKicker"), which reads badly to a screen reader, so a real space
replaced the margin-only separator; re-checked live afterwards.

## Owner manual acceptance

1. Preconditions: no migration; run the dev server and sign in as the allowlisted owner.
2. Actions: open **Settings → Madden 27 playbook inventory**; expand "Show all 86 playbooks"; scroll to
   **Special teams**.
3. Expected visible result: the totals line says **0 verified, 4 partial, 82 unsupported**; every unsupported
   row explains there is no formation data and quotes the source's play count; the four loaded books show their
   real mapped counts; the special-teams block states that no diagrams are drawn and lists the seven sets with
   no published data.
4. Recovery/undo to try: nothing mutates state — this screen is read-only, and no franchise data changes.
5. Known limitation to verify: the loaded books still say "still provisional" after a full mapping, which is the
   intended honest label until the D113 supplement lands.

## Database/environment

- Live project unchanged; **no migration and no new persisted state** in C3B.
- The coverage report is derived per render from the catalog, so there is nothing to back up or roll back.
- Preview server: dev server port 3220 (this thread's background process, PID recorded in the thread); ports
  used by other worktrees were left untouched.
- Worktree env: `.env.local` copied from the repo root at worktree setup (gitignored); no secret values in any
  committed file.

## Open items

- **D113 remains OPEN**: no book can be labelled verified until the owner has game access, and the interface
  says exactly that rather than leaving a hole.
- **Mapping expansion is deferred by D131**: 4 of 86 books are loaded and 60 of 123 formations mapped; mapping
  more books is a later increment, and the release coverage claim stays limited to what is actually mapped.
- **Special-teams diagrams are not authored (D131)**, and the seven unpublished sets are disclosed; C6A carries
  this position.
- The playbook inventory is still a recorded crawl snapshot (2026-10-06). A repeatable refresh against the
  public Civil.GG content endpoints is possible but was not required by D130 and is not claimed here; the
  observed endpoints and their shape caveat are recorded in
  [C3B-special-teams-feasibility.md](../evidence/C3B-special-teams-feasibility.md) §2 if a later increment
  automates it.

## Next steps (owner flow)

1. **Review and merge the C3B PR** — owner: you; artifact: the PR plus this record; **OWNER APPROVAL/CHECK:**
   merge is the delivery step (agents never self-merge), and it is where you accept the reduced all-book
   coverage D130 requires.
2. **Open Settings on the merged build** and confirm the coverage line reads 0 / 4 / 82 — owner: you;
   **OWNER CHECK:** the honest partial state is legible without documentation.
3. **Launch C4A (transactions)** from the merged base, or the deferred mapping increment — owner: you;
   `LAUNCH_PROMPTS.md`; **OWNER APPROVAL/CHECK:** C4A may proceed independently per PLAN.md.
4. **Schedule the D113 supplement** when game access exists — owner: you; it is the only thing that can move a
   book off "partial", and the interface states that as the requirement.

Immediate next step: **owner review/merge of the C3B PR.**

## Next thread — pasteable launch

- Exact next checkpoint: **C4A** (roster/contract ledger and manual trade assets) per PLAN.md, or a mapping
  increment under D131.
- Required merged baseline: this PR's merge commit on `main`; verify with `git log`; no migration is pending
  (`0012_formations.sql` is applied).
- Files/docs to read first: this record, [C3A.md](C3A.md), [C3B-special-teams-feasibility.md](../evidence/C3B-special-teams-feasibility.md),
  D130/D131, `lib/formations/coverage.ts`, `lib/formations/special-teams.ts`.
- Dependencies that MUST land first: C3B merged; D113 stays open (no verified wording); mapping expansion and
  special-teams diagrams need a new owner decision before they claim scope.
- Things NOT to change: the derived-status rule (no hand-written statuses), the special-teams no-slot guard,
  the provisional labels, and the C4A transaction seam.
- Allowed implementation outcomes: C4A's manual ledger/assets work; a later mapping increment under the existing
  catalog/resolver path; automation of the inventory refresh if it keeps the recorded snapshot honest.
- Verification and PR exit gate: `npm run checks` green plus a live browser pass recorded in the checkpoint
  record; PR to `main`; never self-merge.
