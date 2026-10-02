# C0B and C1A — Independent Review Report

Status: executed by the separately owned review lane. Reviewed artifacts are the **merged** C0B contract
(PR #7) and the **merged** C1A shell (PR #8). **This report does not accept either checkpoint.** The C1A
owner visual acceptance and the disposition of every item below remain owner decisions. No blocker was
found in either checkpoint: the contract set is coherent and the shell does what it claims in most
respects, with the exceptions listed here.

Dispositions (added at closeout): the owner accepted C0B as `C0B-v2` and C1A with the directed
corrections (D115/D116), and recorded C1B as next (D117). Each item's resolution is listed in
[docs/checkpoints/C0B-C1A-REVIEW.md](../checkpoints/C0B-C1A-REVIEW.md).

## Independence statement (read first)

- Produced by a **separate execution thread in its own isolated worktree** that authored neither
  [docs/contracts/C0B-contract-spec.md](../contracts/C0B-contract-spec.md) nor any file in the C1A shell.
  That is the operational independence definition used by D101, [WORKFLOW.md](../../WORKFLOW.md), and
  [phases/00-independent-review.md](../../phases/00-independent-review.md); it is not an external or human
  audit.
- Delivery mode: **separate owned report PR** against `main`. This lane edits only this report and
  [docs/checkpoints/C0B-C1A-REVIEW.md](../checkpoints/C0B-C1A-REVIEW.md). The contract, the C0B/C1A
  delivery records, `DECISIONS.md`, `SPEC.md`, `PLAN.md`, `DESIGN.md`, and `ACCEPTANCE.md` remain
  primary-writer/owner property; the corrections below are proposals, not edits.
- Baseline reviewed: `main` @ `ff9975d` (PRs #1–#8 merged; C0B merge `236886f`, C1A merge `ff9975d`).
  No unmerged dependency. Live checks ran 2026-10-02 from a clean `npm ci` at that commit.

## How this review was independently verified

| Check | Method / exact reference | Result |
|---|---|---|
| C1A full gate | `npm ci` then `npm run checks` in a clean review worktree at `ff9975d`; Node v26.7.0 / npm 11.19.0 | **pass** — typecheck, lint, `vitest run` (1 file, 6 tests), `next build` (Next.js 16.3.8, Turbopack) |
| C1A build route table | Same `next build` output | 9 route entries — 5 static (`/`, `/_not-found`, `/checklist`, `/more`, `/settings`) and 4 dynamic (`/coach`, `/gameday`, `/gm`, `/lineups`); the record states "10 routes (7 static, 3 dynamic)" — see CA-6 |
| Reproducible CI | `gh pr view 8` / `gh pr view 7` check rollup | PR #8: `checks` **SUCCESS**, `Vercel` **SUCCESS**, `Vercel Preview Comments` **SUCCESS**; PR #7: `Vercel` **SUCCESS**. The committed `npm run checks` gate exists and is what CI runs |
| Live shell | `next start` (production build) on `:3110`, preview inspected at 1440×900, 1280×720, 1280×600, 390×844, 360×740 | Desktop left rail with Settings pinned bottom; phone bottom nav; both themes; honest empty states; no horizontal overflow at 360/390; short 1280×600 does not clip (Settings reachable at y=544–588) |
| Navigation/tab behavior | Live clicks + DOM reads at 1440 and 360 | Rail and phone nav labels match DESIGN.md/D074–D076; `/lineups?view=formations` works; **`/gm?view=transactions` silently renders Roster** — see CA-3; phone nav shows no active item on `/gm`, `/coach`, `/settings` — see CA-4 |
| Contrast | Re-computed WCAG 2.x ratios from the committed token values in [app/globals.css](../../app/globals.css) | All eight values in the C1A record reproduced exactly (15.41 / 16.83 / 6.55 / 7.43 / 15.85 / 14.52 / 7.19 / 4.69). Decorative borders measure 1.41:1 (light) / 1.51:1 (dark) and carry no required information |
| Theme + focus | Toggle → reload, read `documentElement.className` and `localStorage`; one `Tab` press | Dark persists across reload with the class applied pre-hydration (no flash); `Theme: Dark`, `aria-pressed` present; **first Tab stop is the "Skip to content" link** |
| Docs integrity | Fresh throwaway parser over repo Markdown (files, relative links, heading anchors) | **29 files, 196 relative links, 15 anchors, 0 missing** — independently reproduces the C0B/C1A claim |
| Console/network | Preview console + request log over all sessions | Console empty (no errors/warnings); only normal Next RSC prefetch `net::ERR_ABORTED` entries; all document requests 200 |
| Deployment state | `gh api repos/joshhkee/franchise-manager/deployments` + deployment statuses | A **Production** deployment of `ff9975d` completed at 2026-10-02T03:44:03Z (`vercel[bot]`, env_url `https://franchise-manager-1rk44me4v-josh-2498.vercel.app`); anonymous fetch returns **401** (Vercel deployment protection) — see CA-1 |
| Hosted preview | Anonymous fetch of the recorded production/preview host | 401 Unauthorized, so the hosted shell could **not** be visually verified anonymously; this matches the record's own SSO limitation |

## Findings — C0B (`C0B-v1` contract)

### CB-1 — Identity reconciliation is frozen as outcome types but not as matching rules (important)

- **Claim/document:** [docs/contracts/C0B-contract-spec.md](../contracts/C0B-contract-spec.md) §1 ("Source
  identity, revision pinning, and reconciliation **outcome types** (§2)"), §2 (`matched | new | conflict`,
  "never auto-merge on names and never auto-split silently", idempotent repeat import), §14 rows 13–14;
  D112 assigns "identity reconciliation and fetch-failure policy" to C0B; required output in
  [phases/00-evidence.md](../../phases/00-evidence.md) C0B ("Immutable versioned source identities vs
  isolated franchise custom players/state").
- **Independent evidence:** §2 substantially closes IR-5 — source-revision pinning, non-id-equality
  framing ("source ids are treated as revision-scoped"), conflict visibility, no-silent-merge, idempotent
  repeat import, and "fetch failure is not absence" are all stated. What is **not** stated is the
  deterministic key/rule that decides `matched` versus `new` versus `conflict` — in particular how a
  record is identified **across source revisions** (ids are explicitly revision-scoped, so id equality
  cannot carry that). §9 adds that "C1B owns the physical schema that preserves these semantics; it may
  not redefine them", so C1B inherits an unspecified matching rule it is not authorized to choose.
- **Risk:** C1B picks a de-facto reconciliation key (name/team/position/dob mix) during schema work and
  either duplicates identities across revisions or silently merges two players — the exact IR-5/C0A
  concern, just moved one checkpoint later without an owner-visible decision.
- **Proposed correction / owner question:** add one short clause to §2 that names the reconciliation rule
  (for example: within a revision, `sourceId` is the identity key; across revisions, a pin change matches
  on an explicit key set — name + team + birthdate/position as available — and any partial mismatch is a
  `conflict`, never `matched`), **or** record an explicit C1B gate requiring the key set to be documented
  and owner-reviewed before import ships. Owner question: should the key set be frozen in `C0B-v2`, or
  deferred with a mandatory C1B decision record?
- **Status:** open — C0B correction (or explicit C1B gate).

### CB-2 — Minimum fixture coverage for the transaction → depth chart → formation → confirmation chain is not marked (suggestion)

- **Claim/document:** [PLAN.md](../../PLAN.md) C0B requirement "Mark minimum fixture coverage for
  transaction → depth chart → formation → confirmation"; contract §14 (scenario matrix) and §15 (required
  fixture records).
- **Independent evidence:** §14 assigns every scenario in the phase packet to an owning checkpoint and §15
  enumerates the fixture records, but neither designates **which subset is the required minimum** for the
  end-to-end chain that PLAN.md names. The records exist only as an undifferentiated list.
- **Risk:** C2A/C2B/C3A/C4A each wire up "relevant" fixtures and no checkpoint owns proving the chained
  minimum, so the chain coverage can stay unproven until C6A.
- **Proposed correction:** add a short "minimum fixture set" subsection (or a column/flag in §15) marking
  the records the chain needs (source player complete/missing fields; pending incoming trade; promotion
  prerequisite; ordered-list partial apply; inherited-vs-explicit override diff; stale revision pair;
  corrupt/missing-revision backup), and name which owning checkpoint closes each.
- **Status:** open — C0B correction.

### CB-3 — Retention bounds are stated inconsistently for a frozen contract (suggestion)

- **Claim/document:** contract §4 ("keep, per franchise, the most recent **50 action batches or those from
  the last 30 days, whichever set is smaller** … the bound is a declared constant") versus §5
  ("Request-outcome records are bounded (**e.g., retain ~200 per franchise**)").
- **Independent evidence:** the undo bound is deliberately normative and change-controlled, while the
  idempotency retention is phrased as a non-normative example with an approximate number. The phrase
  "whichever set is smaller" is unambiguous only on close reading (retain the intersection of the two
  caps); a reader could take it as "whichever cap is reached first".
- **Risk:** low — C1B could choose a materially different replay-retention size, or implement a different
  pruning reading, without either being a contract change.
- **Proposed correction:** list both bounds once as declared constants in one place (or say
  "implementation constant, recorded at C1B"), and reword the undo bound as "prune any batch older than 30
  days or beyond the most recent 50, whichever prunes more".
- **Status:** open — C0B correction (wording).

## Findings — C1A (responsive shell)

### CA-1 — The C1A record denies a production deployment that actually completed (important)

- **Claim/document:** [docs/checkpoints/C1A.md](../checkpoints/C1A.md) — Status "Production deploy status:
  **none claimed**"; Database/environment "**production has never hosted this app** (the last production
  deployment predates any application code)"; Open items repeats the claim.
- **Independent evidence (2026-10-02):** GitHub's deployment records show a **Production** deployment for
  the C1A merge commit `ff9975d`, created by `vercel[bot]` at `2026-10-02T03:44:03Z`, with deployment
  status **success** ("Deployment has completed") and environment URL
  `https://franchise-manager-1rk44me4v-josh-2498.vercel.app` (deployment id `6800778327`). An anonymous
  fetch returns **401 Unauthorized**, so production is behind Vercel deployment protection and the shell
  is currently public-but-gated; earlier bumps (e.g. C0B's `236886f`) also produced Production records.
  The 401 means this is a wrong *claim*, not a public data exposure — the app holds no private data at
  C1A.
- **Risk:** environment accounting is wrong: a future thread (C1B env-isolation work, IR-10) may assume the
  production project has never served the app, and the owner is not told that approving the merge
  auto-deployed the production branch (D088 behavior). It also matters for the C6A production/release
  record.
- **Proposed correction / owner question:** the C1A record (or the next accepted base record) states the
  post-merge reality — the owner merge auto-deployed the shell to Vercel Production under D088, the
  deployment is protected (anonymous 401), and it contains no private data; and the C1B launch notes that
  Production now hosts the app. Owner question: do you accept production auto-deploy for the C1A shell,
  or should Vercel deployment protection/branch rules be tightened before C1B?
- **Status:** open — record correction (owner/primary writer) + owner confirmation.

### CA-2 — Required honest loading/error states are absent and undisclosed (important)

- **Claim/document:** [LAUNCH_PROMPTS.md](../../LAUNCH_PROMPTS.md) C1A ("honest empty/loading/error
  states") and [phases/01-foundation.md](../../phases/01-foundation.md) C1A ("useful empty/loading/error
  UI"). The C1A record claims "honest, non-deceptive **empty** states" only.
- **Independent evidence:** no `app/loading.tsx`, `app/error.tsx`, `app/global-error.tsx`, or
  `app/not-found.tsx` exists anywhere in the tree (checked; only per-route `page.tsx` files and
  `app/layout.tsx`). At C1A there is no data fetching, so no loading state can be exercised and only
  Next's framework defaults exist; the record does not disclose that the loading/error half of the
  deliverable is missing or deferred.
- **Risk:** the owner's visual gate can implicitly accept an incomplete deliverable; C1B then adds real
  data with no reviewed empty/failure shell to grow into.
- **Proposed correction:** add minimal, honest route-level loading UI and an error boundary (a few lines
  each, no fake content), **or** record the explicit deferral to C1B in the C1A record/open items and
  obtain owner acceptance of the narrower scope at the visual gate.
- **Status:** open — C1A correction or owner-accepted deferral.

### CA-3 — A documented phone check uses a `?view=` value that does not exist (suggestion)

- **Claim/document:** [docs/checkpoints/C1A.md](../checkpoints/C1A.md) owner manual acceptance ("`/gm` and
  switch through its four tabs — the URL should carry `?view=`"; phone browser row "360×740
  (**/gm?view=transactions**)"); [app/gm/page.tsx](../../app/gm/page.tsx) tab values `roster`,
  `trade-block`, `trade-targets`, `assets`.
- **Independent evidence:** live at `/gm?view=transactions` the active tab is **Roster** and the fourth tab
  ("Assets & Moves") is never selected; the correct value is `?view=assets`. `current` silently falls back
  to `"roster"` for any unknown value, so the typo is invisible. The record's phone evidence row therefore
  does not exercise the tab it names.
- **Risk:** a verification step that does not verify what it claims; the same silent-fallback pattern would
  hide a real link/build typo. Low functional impact on the shell.
- **Proposed correction:** fix the record's URL to `?view=assets` (or rename the tab value), and either
  reject/default-annotate unknown view values or add a shell test locking the four tab values and the
  fallback behavior.
- **Status:** open — record correction + optional test.

### CA-4 — The phone nav loses its active indicator on the More-group routes (suggestion)

- **Claim/document:** C1A record phone row ("bottom nav visible with **active indicator**" at
  `/gm?view=transactions`); [DESIGN.md](../../DESIGN.md) line 169 ("Overview, Lineups, Gameday, Checklist,
  plus **More for GM/Coach/settings**"); [lib/nav.ts](../../lib/nav.ts) `isActivePath`.
- **Independent evidence:** at `/gm` (and `/coach`, `/settings`) **no** bottom-nav item carries
  `aria-current`; at `/more` the More item is active. Measured live at 390×844. The C1A phone claim holds
  for `/gameday` and `/checklist` but not for the route it cites.
- **Risk:** a phone user who enters GM War Room via More cannot tell which top-level section they are in;
  the owner gate is being told the active indicator was verified across the phone set.
- **Proposed correction:** treat More as active for its child routes (e.g. a `subpaths` list on the More
  nav item), or state that More-group routes intentionally show no active top-level item. Either way,
  correct the evidence row.
- **Status:** open — C1A correction (owner visual decision is acceptable).

### CA-5 — Top-bar controls are 36px tall, below the proposed 44px mobile minimum (suggestion)

- **Claim/document:** [DESIGN.md](../../DESIGN.md) line 13 ("Proposed minimum touch target: **44 CSS
  pixels** for main mobile actions. Compact desktop rows must not dictate phone tap size"); C1A record
  accessibility criteria ("`min-h-9` buttons at the compact end").
- **Independent evidence:** measured live at 360/390px — the Theme toggle and the (disabled) Franchise
  button are **36px** tall; tabs are 44px, bottom-nav links 56px, rail links 44px. Only the two top-bar
  controls fall short.
- **Risk:** low — a slightly small tap target for the most frequently used phone control; the record
  discloses the compact end but not its phone implication.
- **Proposed correction:** give the top-bar controls a ≥44px touch height on phone (or record an explicit
  owner-accepted deviation with the measured value).
- **Status:** open — C1A correction (owner decision).

### CA-6 — Route-count and tab evidence numbers do not match the merged build (suggestion)

- **Claim/document:** C1A record verification table: Build "**10 routes generated (7 static, 3 dynamic)**";
  phone row cites `/gm?view=transactions` (see CA-3).
- **Independent evidence:** `next build` at `ff9975d` prints **9** route-table entries: static `/`,
  `/_not-found`, `/checklist`, `/more`, `/settings` and dynamic `/coach`, `/gameday`, `/gm`, `/lineups`.
  The record's counts do not correspond to the merged code.
- **Risk:** low — documentation accuracy; but this is the third numeric claim in the record that did not
  reproduce (with CA-3), which weakens the record as evidence.
- **Proposed correction:** restate the build evidence from a build at the merged commit (9 entries,
  listing the static/dynamic split), and re-run the remaining evidence rows against the merged commit.
- **Status:** open — record correction.

## Prior independent-review items carried into these checkpoints (disposition check)

| Prior item | Where it landed | Review note |
|---|---|---|
| IR-3 source vs game-catalog coverage | Contract §2 coverage labels (a)/(b)/(c) + §11 gate | Adequately addressed; labels distinguish imported records, source published coverage, and unevidenced game coverage |
| IR-4 ratings taxonomy vs depth-chart slots | Contract §6 ("slot identifiers remain configurable and evidence-versioned") | Addressed; no parity claimed |
| IR-5 identity stability + fetch-failure policy | Contract §2 | Fetch policy addressed ("fetch failure is not absence"); reconciliation **matching rules** still open — CB-1 |
| IR-6 missing-archetype precision | Contract §3 ("unknown is not zero", no default archetype) | Addressed |
| IR-9 diagram orientation | Contract §6 evidence/confidence marker + §11 gate | Addressed as a gate, not a claim |
| IR-10 preview write isolation | Contract §10 "requirement to configure and verify at C1B and C6A **not an already-verified fact**" | Correctly still pending; independently corroborated by CA-1 (production is gated but exists) |
| IR-11 backup/recovery | Contract §8 (versioned envelope, restore-new, ID remapping, missing-revision failure) + SETUP §8 reference | Addressed |
| C1A implements no domain semantics | All `app/**` and `components/**` read | Confirmed: no C0B-v1 entities, actions, revisions, or undo appear in the shell; the shell is not gated by the domain contract |

## Independently verified claims

- The committed check gate reproduces: `npm run checks` = typecheck + lint + 6/6 tests + Next 16.3.8
  build, matching `.github/workflows/checks.yml`, and PR #8's remote `checks` run is **SUCCESS**.
- The shell is honest: no player records, counts, statistics, charts, or "insights"; every empty panel
  names the checkpoint that will fill it; save status reads **"Not connected"** (never "Saved"/"Synced");
  the franchise control is disabled and labeled **Prototype**; metadata description says "prototype, not
  connected".
- Navigation matches the approved structure (desktop rail + Settings pinned; phone Overview, Lineups,
  Gameday, Checklist, More), with `aria-current` on active links and skip-link-first focus order.
- Light/dark both render deliberately; the theme preference persists across reload with the class applied
  before hydration (no flash), and `:focus-visible`, `prefers-reduced-motion`, `safe-area-inset-bottom`,
  and `color-scheme` are present.
- Measured contrast claims reproduce exactly from the committed tokens.
- Source hygiene: `.gitignore` covers `.env*` / `.vercel`; no secret, credential, or environment file is
  committed; dependencies are shell-only (Next/React/Tailwind/TypeScript/Vitest/ESLint).
- Docs link/anchor integrity passes (29 files, 196 links, 15 anchors, 0 missing).
- The C0B contract carries IR-3…IR-11 into traceable homes (§13) and freezes only near-term semantics;
  it explicitly excludes event sourcing, a workflow engine, offline queues, generated trades, and
  invented formulas.

## Remaining uncertainty

- Whether the Vercel Production project's protection settings, preset, and env scoping are what C1B/C6A
  need (IR-10) — the deployment exists and returns 401, but protection configuration cannot be read from
  the worktree.
- Real iOS Safari behavior (safe-area padding, virtual keyboard, text zoom) remains unobserved; both the
  C1A record and this review only have emulated viewports. 200% zoom was not independently exercised.
- Madden 27 depth-chart slots/eligibility/orientation and special-teams feasibility remain the D113/D114
  gates; nothing in C0B/C1A changes that.
- The C0B link-check figure (28 files, 164 links) was measured on the pre-C1A tree; this review verified
  the merged tree instead and did not re-check out the C0B-only snapshot.

## Review-question coverage (no finding raised)

- State design (differences, partial confirmation, undo/dependencies, two-device conflicts): the C0B
  contract states these as testable invariants with owning checkpoints; implementation is not available
  to falsify yet, and no contradiction with SPEC/ACCEPTANCE was found.
- Excluded work creeping in: none. The shell contains no AI surface, no generated trades, no season/week
  state, no custom books, and no print/offline sync; the contract names them as non-goals.
- Free-tier/OAuth/backup risks: recorded (contract §8/§10/§11) and not overstated as verified.
- Dependencies/ownership for a no-history thread: explicit in PLAN/WORKFLOW/HANDOFF and both records.

## Proposed corrections summary (owner/primary writer applies; this lane cannot)

1. **C0B `C0B-v2` (or a C1B gate):** name the identity reconciliation key/rule (CB-1).
2. **C0B:** mark the minimum fixture coverage for the transaction → depth chart → formation →
   confirmation chain (CB-2), and state both retention bounds consistently (CB-3).
3. **C1A record:** correct the deployment section to record the completed Vercel Production deployment and
   its protection (CA-1); correct the `/gm?view=` URL and the route-count evidence (CA-3, CA-6).
4. **C1A shell (or an explicit accepted deferral):** add minimal loading/error UI (CA-2), decide the
   More-group active state (CA-4), and decide the top-bar touch height (CA-5).
5. **Owner question:** confirm the C1A scope covered by the visual acceptance — full empty/loading/error
   deliverable plus the CA-4/CA-5 decisions, or a recorded narrower acceptance.
