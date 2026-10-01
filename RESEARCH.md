# Research Evidence and Validation Gates

Status: preliminary. Research findings are not product decisions.

## Evidence standard

- Prefer official Madden 27 documentation and observed Madden 27 behavior for game-mechanic claims.
- Use Madden 26 and College Football material as context only; record version/platform and do not silently copy their rules.
- Distinguish published claims, observed UI behavior, derived assumptions, and unresolved questions.
- Publicly accessible content is not proof of permission to scrape, redistribute, or reuse artwork. Confirm permitted access/reuse before committing to an ingestion approach.
- Do not invent missing data, contract values, formation labels, game-menu mappings, or play effectiveness claims.

## Evidence scope and upcoming acquisition report

Initial source checks below are historical observations from planning, not fresh verification during the documentation audit. C0A records fetch/observation date, exact source version, confidence and access/reuse basis for its findings. Recheck mutable ratings pages and provider prices at execution; do not turn an old page title or result count into immutable ground truth.

For each catalog report distinguish (a) every available record successfully imported from that source, (b) the source's actual full Madden 27 coverage, and (c) unsupported/missing desired data. 'Complete-as-reported' cannot waive the requested full catalog by itself: known omissions need disclosure and owner disposition. Counts/rejects/duplicate IDs/missing fields and selected revision must reconcile; no forced 3,116 count.

C0A proves a feasible initial acquisition/mapping strategy with representative evidence. Exhaustive supported Falcons mappings complete at C3A, stock expansion/special teams at C3B, and exact gameday metadata/heuristic rules at C5A. This avoids making all future feature research a prerequisite to rendering the shell.

## Initial source checks

### EA ratings database

Source: https://www.ea.com/en/games/madden-nfl/ratings

The fetched page resolves to an EA page titled "Madden NFL 27 Player Ratings - Week 2". Extracted text says "Showing 1911 results". This is not proof of the full underlying dataset size; filters, free-agent coverage, and dynamic loading have not been inspected.

Consequences:
- The ~3,116-player count and ~1,196-free-agent count in FEATURES.md are not verified.
- Required attributes, jersey numbers, stable player identifiers, contract data, export methods, and completeness need separate checks.
- A data-validation checkpoint must reconcile source coverage and publish an import report rather than enforce speculative counts.

### Civil.gg playbook database

Source: https://civil.gg/playbooks/madden

Search results identify Madden 27 playbook and formation pages. Fetching the page returned only its database title; the readable HTML extraction did not expose formation/player labels, play details, or the catalog.

Consequences:
- Need browser inspection and permitted-access research to establish actual content, diagram representation, and labels.
- Do not infer that all desired playbooks can be imported or that WR3 always maps to SLWR1.
- The six-playbook/34-formation counts in FEATURES.md are not verified existing assets or a confirmed reduced scope.

### EA gameplay deep dive

Source: https://www.ea.com/en/games/madden-nfl/madden-nfl-27/news/madden-27-gameplay
Published page date: June 4, 2026.

The fetched official page discusses Madden and College Football together and describes coverage, alignment, and personnel-related changes. Some sections explicitly address College Football; shared-page placement does not establish that every claim applies to Madden 27.

Consequences:
- It supports researching version-specific behavior rather than assuming prior-year mechanics.
- It does not yet establish complete Madden 27 depth-chart slots, permitted position assignments, practice-squad eligibility, formation-sub menu support, or role-to-player mapping.

## Required research gates before implementation of dependent features

1. Player source: permitted access, full coverage including unsigned players, schema, stable identities, source revision, missing-data policy, realistic refresh/export method.
2. Depth charts: exact Madden 27 position labels/order, rank limits, eligibility/cross-position support, active/practice-squad handling, specialist behavior, duplicate-player constraints. Injury/IR/inactive/fatigue tracking is deferred; do not broaden product scope because general research mentions those states.
3. Formations: stock team/alternate coverage by playbook/version, slot labels, coordinates/orientation, specialist precedence, package variants, overrides and unresolved-slot semantics, game-menu availability, special-teams feasibility. Custom playbooks are deferred; research may note their limitations but must not make them a release requirement.
4. Schemes: actual game scheme/archetype catalog versus explanatory football fit heuristics; formulas and provenance.
5. Playcalling: accurate play metadata, formation/personnel families, situational rules, user control, research limits, and reproducible explanation fixtures.
6. Contracts: distinguish published real-world values from actual Madden franchise contracts; no false precision.

## Free-tier checks (official sources)

Sources:
- https://supabase.com/pricing
- https://vercel.com/docs/plans/hobby
- https://supabase.com/docs/guides/auth/auth-smtp

Fetched official pages state:
- Supabase Free: 500 MB database, 5 GB egress, 1 GB file storage, maximum two active projects; inactivity pausing after one week; automatic backups and database branching are not included.
- Vercel Hobby: personal non-commercial use; usage limits can cause feature suspension rather than free unlimited capacity. Current documented example limits include 100 GB fast transfer and one million function invocations. These figures must be rechecked when provisioning.
- Supabase default SMTP: only authorized organization-team addresses, currently two messages/hour, no delivery SLA; not a production email assumption.

Owner chose GitHub OAuth, accepted documented inactivity recovery, retained strict $0, and confirmed existing GitHub/Git/Supabase/Vercel accounts without created service projects (D070–D072).

Planning implications:
- Shared immutable source records plus sparse/logically isolated franchise state are recommended to avoid copying the full catalog unnecessarily.
- No paid Supabase branching for previews; use local test fixtures or a separate free development project if available, with explicit env isolation.
- Preview deployments must not accidentally write to the production owner database or trigger production migrations. Decide setup before enabling automatic Vercel previews.
- Reusable static permitted diagram/art assets and cache/pagination strategy matter for egress.
- Export/restore is necessary but not a substitute for explicitly documenting the owner's manual backup responsibilities.

## Unresolved ownership/access

The owner has not yet purchased Madden 27, so direct verification may need official documentation, trustworthy version-specific demonstrations, and later owner validation. If fidelity cannot be verified before a milestone, expose the limitation and block claims of exact parity; do not fabricate certainty.
