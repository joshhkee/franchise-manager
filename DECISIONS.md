# Franchise Manager — Planning Decision Register

Status: initial discovery complete; execution planning baseline recorded across 20 interview rounds. D001–D101 are confirmed owner choices or explicit owner instructions. Research-dependent details remain gated. No application implementation occurred.

## Authority and working rules

- This thread may research, inspect files, and create or edit planning documentation only. No application code.
- The user wants approximately one hour of focused discovery, including explicit design questions, before phases and checkpoints are finalized.
- Execution will happen in separate threads. Documentation must carry decisions and context between threads without relying on chat memory.
- The user requests commit, push, and a mergeable PR after each meaningful execution checkpoint. This planning thread will not perform those operations. Workflow is confirmed in D046–D048/D089; actual repository target/remote still requires inspection.
- Plan for up to two concurrent execution threads with explicit ownership and integration boundaries.
- Record confirmed decisions separately from recommendations, assumptions, research findings, and unanswered questions. Do not treat unanswered questions as approval.
- Use the confirmed restrained sports-operations visual direction, light + dark, reviewed navigation/diagram layouts, and no generative-AI/chatbot workflows. Fine implementation tokens remain for C1A review.

## Source and evidence

- Product source: [FEATURES.md](FEATURES.md), read in this workspace.
- At discovery start the visible workspace contained only FEATURES.md and repository/client metadata, not application source or the previously mentioned implementation documents. This thread subsequently created planning docs only.
- Repository metadata supplied to this thread mentions prior development and a phase-5-scheme-fit branch; this does not establish what exists in the current workspace.
- FEATURES.md includes scale claims (~3,116 players, ~1,196 free agents, 53 attributes, 36 archetypes, 21 schemes, six seeded playbooks/34 formations, ~380 tests). These are user-supplied targets/claims, not independently verified assets.
- Madden 27 mechanics, data availability, Civil.gg coverage and reuse permissions have not yet been verified. Prior-version examples must not silently become Madden 27 facts.

## Confirmed from the initial request

### Product

- A Madden 27 franchise planning web app; no game ownership, console connection, or save-file dependency required.
- Default team: Atlanta Falcons. Other clubs and independently evolving franchises must be possible.
- Desktop should feel like an application/dashboard, with minimal page scrolling. Mobile must support viewing and adjustments, especially a gameday call sheet.
- Depth chart: per-position ordered lists, game-specific primary/specialist positions, practice squad awareness.
- Formation substitutions: dynamic diagrams showing player name, jersey number, and overall rating; inherit depth-chart assignments and support per-formation overrides.
- Checklist: actionable changes still to be performed in the actual game.
- GM War Room: roster, contract/cap information, extension planning, player discovery, scheme/attribute filtering, and trade logging that updates the franchise roster.
- Coach View: scheme and playbook overview; further tabs may be proposed, not assumed.
- Gameday: offense/defense drive plans, coherent formation identities, down/distance buckets, favorite formations, defensive personnel matching, and researched suggestion rules.
- Published player data and Civil.gg playbook/formation information are desired sources. Editable player data must support an evolving franchise.

### Execution preferences

- User is familiar with Next.js, Tailwind, Supabase, and Vercel.
- Alternatives must be free and come with detailed setup guidance and a list of user prerequisites.
- Suggestions and critical evaluation of features and architecture are welcome.

## Initial recommendations (historical; approvals recorded below)

- Isolate franchises logically; do not assume a separate physical database per save is needed.
- Prefer stable navigation, tabs, and locally scrolling panels over carousels for operational information.
- Separate source dataset facts, manual franchise changes, proposed plans, and confirmed in-game actions.
- Separate game-mechanic fidelity from generic football heuristics; label uncertainty explicitly.
- Use separate Git worktrees/branches for concurrent implementation rather than editing shared files in one checkout.

## Interview roadmap

1. Starting point, intended audience, success criteria, game context, visual direction.
2. Franchise lifecycle, data freshness, editable player fields, roster/contract workflow.
3. Depth chart fidelity, formation mappings/overrides, checklist semantics.
4. Schemes, scouting, trade and contract scope.
5. Gameday interaction, playcalling research, rules, and manual control.
6. Navigation, screen layouts, mobile, accessibility, design references.
7. Architecture, hosting costs, authentication, backups, testing.
8. Phase/checkpoint sequencing, parallel execution, PR/merge gates, handoff templates.

## Decision log

### Round 1 — product direction (confirmed)

- D001 — Fresh build. Do not preserve or depend on an unseen prior implementation. Counts in FEATURES.md remain unverified targets/reference information.
- D002 — First release serves the owner only, privately, across their devices; multiple franchises remain required. Do not expand scope into public signup, shared leagues, or collaboration without approval.
- D003 — Primary game context is solo franchise against the CPU. Madden 27 and likely PC later established by D007; difficulty and gameplay settings remain open.
- D004 — First payoff is lineups → game checklist: plan depth charts and formation substitutions, then apply those changes efficiently in Madden. Other feature areas remain later scope rather than cancelled.
- D005 — Visual direction: restrained sports operations. Neutral surfaces, compact tables, clear typography, subtle Falcons-red accents; no decorative stadium imagery. Later D008/D039–D043/D074–D076 specify themes, density, navigation, and mobile layouts; detailed tokens remain C1A review.
- Q001 — Initially unanswered; rules-only/no-chatbot resolved in D006, visual direction further specified in DESIGN.md and approved by overall design review D074–D076.

### Round 2 — foundational behavior (confirmed)

- D006 — Rules-only recommendations. No generative AI services or chatbot. Suggestions must be explainable and manually overridable.
- D007 — Madden 27 is the target. The owner does not yet own it; platform will likely be PC, not yet confirmed. Difficulty and gameplay style are unknown. Older games are research context, not supported modes.
- D008 — Light default with an optional dark theme.
- D009 — New franchises snapshot a selected published roster, then evolve manually. Later source ratings updates must never automatically overwrite existing franchises.
- D010 — Explicit pending changes: planned lineups are visible immediately; retain the last confirmed in-game state; only owner confirmation marks changes applied. Later decisions specify dependency, undo, and trade behavior; physical representation/edge-case fixtures reviewed at C0B.
- Q002 — Initially unanswered; resolved by D039: fixed left-rail shell and focused panels, not a strict scrolling ban.

### Round 3 — maintenance and access (confirmed)

- D011 — Changes-only maintenance: log owner trades/signings/cuts, notable rating edits, and occasional contract updates. No complete weekly league audit or detailed tracking of other teams is required.
- D012 — Support several independent named franchises with switching and archiving. Support manually created fictional rookies/custom players.
- D013 — Contracts/cap fields are manually entered when useful; unknown values remain explicitly unknown. Totals must state data coverage rather than imply complete accuracy. Real-world NFL contracts are not Madden facts.
- D014 — Mobile supports viewing plus essential edits: diagrams, depth-chart reordering, formation substitutions, checklist confirmation, and explicitly the gameday call sheet. Complex bulk/data work may favor desktop.
- D015 — Private access through one allowlisted owner account. No public signup, link-only access, or sharing requirement.
- Q003 — Initially not selected; explicitly deferred by D059 (forks/season/week not required now).

### Round 4 — depth charts and formations (confirmed)

- D016 — Game-legal cross-position flexibility, limited by verified Madden 27 behavior; explain questionable fit rather than confusing it with assignment legality.
- D017 — Depth-chart reordering supports drag and explicit accessible move/select controls, including mobile and keyboard use.
- D018 — Explicit formation overrides persist through depth-chart changes. Inherited slots update; overrides stay fixed until reset and have visible indicators.
- D019 — Invalid personnel (duplicate players in one formation, departed override targets, etc.) are flagged with offered repairs. Never silently replace a deliberate override.
- D020 — First formation-sub checkpoint covers the owner's selected offensive/defensive playbooks; all available stock playbooks remain eventual scope through a tracked expansion checkpoint.
- Q004 — Initially unanswered; resolved by D023: active/practice squad only, other availability states deferred.
- Q005 — Initial ambiguity resolved by D021: one listed roster primary position, game-legal flexibility on the chart. External Madden legality still requires C0 verification.

Owner-provided position labels from memory (research candidates, not authoritative enums):
- Primary: QB, HB, FB, TE, WR, LT, LG, C, RG, RT, LEDG, REDG, DT, SAM, MIKE, WILL, CB, SS, FS, K, P, LS.
- Secondary: 3DRB, PWHB, SLWR, GAD, RLE, RRE, RDT, NT, SLCB, SUBLB, KOS, PR, KR.
- Cross-check labels, spelling, categories, ordering, rank limits, eligibility, and precedence against Madden 27. Do not guess what GAD means.

### Round 5 — clarified lineup and checklist semantics (confirmed)

- D021 — Each player has one listed primary roster position, but may occupy other primary depth-chart roles when Madden permits. Do not impose an unapproved one-primary-chart-role constraint. This resolves Q005's intended meaning, not the external game verification.
- D022 — First verified playbooks: Falcons stock offense and Falcons stock defense.
- D023 — Initial availability tracking is active roster plus practice squad only. Injuries, IR, gameday inactives, and fatigue/wear-and-tear modeling are deferred. This resolves Q004.
- D024 — Checklist is final actionable differences against the last confirmed in-game state, not every edit. A→B→C consolidates into A→C; reverting to A removes the pending action. Small action history for undo later approved in D077/D097, not an append-only visible checklist.
- D025 — Checklist supports individual confirmation, reviewed bulk confirmation, undo of accidental confirmation, and cancellation of pending changes. Dependencies and the semantics of partially applied groups still require specification.

### Round 6 — GM and coaching (confirmed)

- D026 — Practice-squad moves and free-agent signing/cut tools are useful but must stay visually secondary, not dominate the GM screen or suggestions.
- D027 — Draft picks required as trade assets, no draft simulator. D092 later confirms explicit year/round/original club/current owner, manual initialization, no rollover.
- D028 — Provide a simple Trade Block suggesting owner players to move because of positional surplus or poor scheme fit, and Trade Targets on other teams based on scheme fit or athletic anomalies.
- D029 — Do not generate exact trade packages, predict game-engine acceptance, or pretend Madden trade logic is known. Manual trade logging remains required from FEATURES.md.
- D030 — Proposal → game confirmation: preview resulting roster and allow planned lineups while retaining confirmed roster until game confirmation. D056 resolves ambiguity: owner-entered hypothetical deals only, never generated packages.
- D031 — Scouting uses filters and side-by-side comparison. Ranked target scoring beyond the simple explained Trade Targets list is not approved.
- D032 — Distinguish verified Madden scheme/archetype match from transparent practical football-role suitability; do not combine them into one ambiguous score.
- D033 — Coach View includes Personnel Gaps and Formation Identity alongside Scheme and Playbook. Avoid duplicating the depth chart, formation-sub editor, or GM roster screens.
- Q006 — Athletic anomaly direction resolved by D057, pin/dismiss/notes by D063/D077; exact tested thresholds/peer groups remain C4B research/rubric gate.

### Round 7 — gameday (confirmed)

- D034 — Low-input gameday workflow: select a drive theme and adjust situation as useful. No mandatory play-by-play logging or automatic live game tracking.
- D035 — Offense offers a small menu of complementary calls from coherent looks, with purpose, situation, and coaching cue. Do not present one supposedly optimal call.
- D036 — Curated, researched drive-theme templates plus owner-editable plans; allow renaming/customizing and pinning preferred formations/plays.
- D037 — Defensive manual inputs include offensive personnel, down/distance, field zone/red zone, opponent tendency/drive focus, and clock/score/game phase. UI must keep optional inputs from overwhelming quick use.
- D038 — Concise visible cue with expandable reads, disguise, risks, and verified adjustments.
- Q007 — Initially unanswered; D058 rejects printing, D062 rejects offline-mode promise, D053 separately approves franchise backup export/restore.

### Round 8 — screen design (confirmed)

- D039 — Desktop shell: compact left navigation rail plus focused workspace, franchise selector, contextual actions, tabs and locally scrolling lists instead of carousels. Resolves Q002. Minimal page scrolling is a goal, not a strict ban on scrolling.
- D040 — Compact, readable operations UI: useful table density, clear grouping, modest spacing, readable text, comfortable mobile touch targets.
- D041 — Clean schematic formation diagrams: simple field lines, compact labeled markers, visible inherited/overridden/conflict states. No realistic stadium art or large player cards.
- D042 — Required diagram orientation: offense offensive line at the TOP of the diagram, offensive backfield below; defense defensive line at the BOTTOM of the diagram, defensive secondary above. Match the owner's Civil.gg reference convention; do not flip both sides into a generic shared field orientation. Exact left/right label orientation must still be verified from source diagrams.
- D043 — Franchise landing screen is a compact overview: pending game changes, lineup problems, selected playbooks, useful quick-resume actions. No decorative charts or irrelevant statistics.

### Round 9 — architecture and execution (confirmed)

- D044 — Stack: Next.js, Tailwind, Supabase (auth/persistence), Vercel (hosting). Specific libraries/versions and schema/migration tooling remain to be selected by an approved implementation plan; do not add a second backend for novelty.
- D045 — Strict $0 budget. No paid services/APIs, subscriptions, required custom domain, or paid fallback without new approval. Recheck free-tier eligibility/limits before provisioning.
- D046 — Concurrent implementation may use separate Git worktrees and owned branches. Provide explicit step-by-step owner instructions; do not assume the owner knows worktree mechanics.
- D047 — Commit, push, and open a mergeable PR at meaningful verified checkpoints, not every tiny edit. Boundaries later approved in D089 and PLAN.md.
- D048 — Owner reviews and merges PRs. Agents stop at the mergeable PR and do not self-merge. Push/PR authorization for execution checkpoints is user-requested, but production operations and account provisioning require scoped confirmation.
- Q008 — Account readiness later confirmed in D072. Authenticated CLIs, local tools, PR target/default branch, remote, and free slots still require inspection; accounts alone do not establish them.

### Round 10 — data integrity (confirmed)

- D049 — If Civil.gg access/completeness/reuse fails, research permitted alternatives or manual curation, document gaps, and ask before materially replacing the source or reducing coverage. Do not scrape around access restrictions.
- D050 — All available player fields editable within the franchise through grouped UI: ratings, identity, measurements, jersey number, listed position, archetype where supported. Published source records remain immutable; franchise-specific changes must not leak into other saves. Warnings for unusual values are appropriate.
- D051 — OVR/game archetype values remain manual/source facts. Do not silently recalculate with invented formulas; flag potential staleness after relevant attribute edits.
- D052 — Autosave ordinary edits with explicit saving/saved/failed/conflict status; confirm consequential roster moves. Surface multi-device conflicts rather than silently use last-write-wins.
- D053 — Versioned franchise export and validated restore required. Restore must not blindly replace unrelated franchises; D077 specifies new-franchise default, explicit review for replacement.
- Q009 — Initially unanswered again; resolved by D058/D062: phone use, no printing or offline-mode promise.

### Round 11 — edge cases and scope closure (confirmed)

- D054 — Before owning the game, plan against a published baseline explicitly labeled unverified in-game. Owner confirmation can later establish that it matches the actual save. Never claim sync or verification automatically.
- D055 — Edits distinguish planned changes from recording something already done in-game. Lineup/sub edits default to plans; player/roster updates explicitly choose intent. Recording reality updates the appropriate baseline without creating a redundant pending action.
- D056 — Manual trade proposals are owner-entered only. App checks asset/roster bookkeeping and previews impact; owner confirms after the deal happens in Madden. No generated packages or acceptance predictions. Resolves the D030/D029 distinction.
- D057 — Athletic anomalies use explainable position-relative thresholds for speed/acceleration/agility/jump/strength or size. Missing data must not count as zero. Exact peer groups, sample sizes, thresholds, and weighting remain a research/design detail.
- D058 — No gameday printing is needed. Phone use is primary and must receive high-priority responsiveness/performance verification. Print/PDF not in scope; D062 later confirms no offline-mode/cached-sheet promise.
- D059 — No manual season/week setting needed for now. Do not add schedules, rollover, or season tracking by implication. Franchise duplication is also not selected and should remain deferred unless requested.

### Round 12 — phone and reliability (confirmed)

- D060 — Primary real devices: iOS Safari on phone; Windows desktop using Chromium-based Helium, with Chrome available as a fallback. Support current mobile Safari and Chromium; do not require switching desktop browsers absent a demonstrated compatibility issue.
- D061 — Phone gameday layout: sticky offense/defense and theme controls, situation chips, short readable play cards, expandable details. No dense desktop-grid transplant or required horizontal scrolling.
- D062 — Online edits with safe failure: clearly show disconnection, preserve unsaved local input for retry, never claim unsaved work is saved. No offline-mode promise, cached offline call sheet, or offline edit synchronization in initial scope.
- D063 — Trade Block/Targets support pinning, dismissal, and notes for an owner-curated shortlist.
- D064 — Pending actions show prerequisites. Planning may include a pending incoming player, but invalid/dependent confirmation is blocked until its required transaction/promotion is confirmed.

### Round 13 — coaching and acceptance (confirmed)

- D065 — Owner is a lower-end experienced playcaller, closer to intermediate than a professional coach. Use real football terminology with optional explanations; do not make the interface remedial or assume expert-level knowledge.
- D066 — First offensive theme families: balanced under-center/play action; shotgun spread/quick game; motion/misdirection. Exact templates must follow verified Falcons book contents, not force nonexistent plays into a theme.
- D067 — Only verified play/formation facts enter actionable suggestions. Label heuristic coaching reasoning separately. Unverified concepts may live in research notes, not masquerade as supported game actions.
- D068 — Owner allows use of Civil.gg or similar-site play-art diagrams. This is a product preference, not a license from the rights holder; permitted access/reuse still must be established. Accurate source play art with a text fallback is recommended; dynamic route reconstruction is not approved.
- D069 — Every execution PR requires passing type/build checks, relevant automated tests, desktop/mobile browser inspection, and a concise owner manual-acceptance checklist. Avoid speculative test-count targets.

### Round 14 — free hosting and setup (confirmed)

- D070 — Owner login: GitHub OAuth through Supabase, with server/database-enforced allowlisting. Do not rely on a hidden sign-in button or client checks for privacy.
- D071 — Accept Supabase Free inactivity pausing. Document manual recovery/resume, export reminders, and backup restoration. No artificial keepalive jobs or paid upgrade by default.
- D072 — Owner has GitHub/Git, Supabase, and Vercel accounts/tools, but has not created the application service projects. Step-by-step project setup still required; no credentials should be written to docs/chat/repository.
- D073 — Documented wireframes must be reviewed before execution builds the shell. Do not create application code or a coded prototype in this thread.

### Round 15 — design and safety review (confirmed)

- D074 — Approve navigation: Overview; Lineups with Depth Chart / Formation Subs; GM War Room; Coach View; Gameday; Checklist. Reuse player-detail views rather than duplicate editors.
- D075 — Approve neutral schematic diagrams with compact surname-emphasis labels. If clutter is too high, jersey-number circles are acceptable with full details on hover/click. On touch devices details require tap, not hover; full player name/number/OVR remains available, not necessarily all always printed on every marker. This refines the initial always-visible marker wording. Define a clear compact/full display policy and include an accessible personnel detail/list.
- D076 — Phone navigation: Overview, Lineups, Gameday, Checklist plus More for GM/Coach/settings. Ensure width/readability; do not cram every section into bottom tabs.
- D077 — Approve one database with logical franchise isolation; minimal action history for undo; persistent suggestion dismissals; validated backup restore into a NEW franchise by default. Replacing an existing franchise needs explicit review/confirmation.
- D078 — If play art cannot be legally reused, verified play text + interactive personnel diagram is an acceptable initial fallback with disclosed coverage gaps. Never invent routes.

### Round 16 — release boundaries (confirmed)

- D079 — Contract scope is a useful manual ledger, not a cap simulator: known years/cap hit, optional user-entered team cap/available cap, and near-expiry flags. No invented dead-cap, extension forecasts, or automatic annual rollover.
- D080 — Enforce ownership/duplicate consistency and verified roster/practice-squad limits; hard game rules require evidence. Disclose uncertain eligibility, never imply a planned move is confirmed legal.
- D081 — Include special-teams formation diagrams if feasible with verified data/mappings. If not feasible, report why and ASK the owner before skipping; do not silently defer them. Custom playbooks are not needed for now.
- D082 — All-playbooks work requires a stock team/alternate book inventory and visible verified/partial/unsupported coverage. No silent gaps; owner approval required before treating reduced coverage as complete.
- D083 — Review the implemented shell before expanding features. Resolve navigation, theme, and layout problems early, in addition to the per-PR checks already required.

### Round 17 — sequencing and deployment (confirmed)

- D084 — Keep sequence GM/Coach before Gameday after lineup and formation work. Do not reorder for novelty.
- D085 — Initial gameday target: three offensive and three defensive themes, subject to verified useful play coverage. Future catalog expansion is explicitly desired.
- D086 — Owner requested variety/shuffling; D090 clarified within-theme refresh and recent displayed-menu memory, D097 limits memory to current session, D100 preserves eligibility. Future catalog expansion desired; no full season/play logging.
- D087 — Separate free Supabase development and production projects if free slots available. Tests use local/fixtures; preview deployments must not write to production. Resolve insufficient slots explicitly.
- D088 — Intentional owner merge authorizes configured Vercel application auto-deploy from the verified production branch. Database migrations remain separate reviewed steps with backup/compatibility plans; never apply production migrations blindly during builds.
- D089 — Owner approves PLAN.md phase/checkpoint granularity. Material source-driven changes still need approval.

### Round 18 — final domain details (confirmed)

- D090 — Play variety: refresh eligible calls within the current drive theme, preserve pinned favorites, and lightly avoid recently DISPLAYED menu options. Do not infer that a displayed call was run. No mandatory used-call logging. Resolves D086.
- D091 — Seed verified Falcons offensive/defensive scheme defaults if available; editable scheme selections independent of playbooks. If defaults unavailable, leave unknown and ask rather than infer.
- D092 — Draft picks are manually entered assets with explicit year, round, original club, current owner. Unentered picks are unknown, not assumed available; no automatic year rollover.
- D093 — Extension awareness: manually maintained years remaining plus a visible threshold flag; owner may pin notes. No calendar-driven forecasts or implicit season changes.
- D094 — Incomplete/uncertain inherited personnel remains a visible unresolved slot with suggested repairs. No invented starter; invalid game-action confirmation blocked.
- D095 — Owner noted approximately 18 minutes remaining and asked to prioritize individual phase planning. Shift from broad discovery to execution documentation and material final clarifications.

### Round 19 — initialization and tools (confirmed)

- D096 — If actual game depth-chart ranks are unavailable, offer clearly provisional editable legal suggestions, never present an OVR-sorted chart as the game's actual default. Owner may establish a planning baseline; in-game parity remains unverified until confirmed.
- D097 — Retain a small action history for undo and current-session displayed-menu memory for gameday repeat avoidance, with reset and no analytics. Do not persist cross-session play-use claims. Exact bounded history size is an engineering detail to document at C0B/C5A.
- D098 — Check local tools before assuming Node/package manager/GitHub CLI/Docker. Provide scoped installation guidance and seek permission where required; do not install tools in this planning thread.

### Round 20 — final execution details (confirmed)

- D099 — Gameday phone situation menu shows THREE complementary eligible calls initially, or fewer if verified coverage is insufficient; never filler. Refresh/browse offers further choices.
- D100 — Incompatible pinned favorites remain pinned and browsable, but are excluded from the current suggested menu. Pinning does not override situation/personnel eligibility.
- D101 — Initial two-thread arrangement: source/mechanics research plus independent review. Reviewer checks evidence/permissions/scope/design risks in owned documents; no rival contracts or shared-file edits. Begin after the shared documentation baseline is available in isolated worktrees.

### Round 21 — execution setup (confirmed)

- D102 — Execution begins as a fresh build. A prior implementation exists in this repository's git history but was deleted from `main`; it is reference-only and is not restored.
- D103 — One Supabase Free project (owner-created) serves as production. Only one free slot is available, so there is no separate dev/prod project pair. Local development and automated tests use an isolated local/embedded database; the Vercel Preview scope must not receive production write credentials or run production migrations.
- D104 — `main` is both the PR target and the Vercel production branch. The agent may create checkpoint-scoped branches, push, and open PRs; the owner reviews and merges (no agent self-merge).
- D105 — Automatic Vercel preview deployments remain enabled by owner choice; preview environments must be configured so they cannot mutate production data.
- D106 — Source reuse: the owner authorizes use of Civil.GG's public play and play-art data and confirms we will not access member-only schematics. Public availability is treated as the owner's risk decision; play art stays replaceable and source provenance is retained.
- D107 — Initial depth-chart baseline is auto-generated from the scraped roster: primary positions sorted by overall rating, with specialist/secondary slots left for manual owner edit. This is a provisional PLANNING baseline (D096), not the game's actual default chart, and remains fully editable.

### Round 22 — C0A closure and review model (confirmed)

- D108 — Owner **waives the separate independent-review thread for C0A**. A same-thread review was delivered and its findings dispositioned (R1 accepted, R2 retracted, R4 reduced, R5 accepted); its independence limitation is recorded in `docs/reviews/C0A-independent-review.md` and `docs/checkpoints/C0A-REVIEW.md` rather than hidden. Interim model: the execution thread performs an explicit self-review on each checkpoint; the timing of any independently owned review is deferred and remains an owner decision.
- D109 — Source baseline is the EA **Launch ratings iteration (`1-base`)** — 3,111 records including 1,240 unsigned players. Weekly iterations are partial deltas (week-1: 1,891, week-2: 1,911) and must never be used as the catalog baseline. This resolves the long-open ~3,116 figure.
- D110 — Archetype is `null` for 782 of the 3,111 Launch records (25%); no backfill was observed on the sampled week-2/week-3 player profile pages (2026-10-02), and the 782/3,111 figure is Launch-specific. Render these as **N/A/unknown**; never treat a missing archetype as zero, as a default archetype, or as a reason to exclude a player from fit features. Revisit if EA backfills them.
- D111 — Source rights are an **owner-accepted risk** for a personal, non-commercial project, covering both Civil.GG public play data/art and the EA ratings data, with sources attributed on the site. Retained engineering constraint: art stays reference-by-URL or replaceable with a text/personnel fallback, so a takedown, license change, or bucket move cannot break the catalog.

### Round 23 — C0A review reinstatement and closeout (confirmed)

- D112 — Owner **reinstates the separately owned independent review for C0A**, superseding the D108 waiver. The independent report and lane record were delivered as PR #5 and merged; the owner accepts the review's proposed corrections (IR-3 "full published Launch population" labeling, IR-4 ratings-taxonomy caveat, IR-5 "sampled stable" identity wording, IR-6 archetype wording, IR-7 register heading). Retained review items are assigned to C0B (identity reconciliation and fetch-failure policy; versioned backup/recovery semantics), C1B/C6A (preview write isolation verification), and C3A (diagram orientation evidence gate), with special teams per D114.
- D113 — Owner **accepts C0A with exceptions**. Closed: player-source feasibility and coverage, source reuse (D106/D111), Launch-iteration baseline (D109), and the independent review disposition. Accepted exceptions, tracked as a **C0A evidence supplement required before C3A/C3B**: Madden 27 depth-chart matrix; representative Falcons offense/defense slot-mapping evidence; stock team/alternate playbook coverage inventory; Civil.GG alternate-source contingency report; special-teams feasibility per D114. C0B may start from the accepted source/reuse/baseline evidence, keeping slot identifiers configurable until in-game evidence exists.
- D114 — Special-teams feasibility is **deferred to C3B with an explicit gate**, not skipped: C3B must attempt the feasibility check and ask the owner before any skip; D081 remains in force and no skip is pre-approved.

### Round 24 — C0B/C1A independent review, acceptance, and closeout (confirmed)

- D115 — Owner **accepts C0B** and adopts the independent review's contract corrections as **`C0B-v2`**: declared identity reconciliation keys (CB-1), the minimum transaction → depth chart → formation → confirmation fixture chain (CB-2), and declared retention constants for undo history and request-outcome replay (CB-3). `C0B-v2` supersedes `C0B-v1` for C1B–C4A; no previously frozen behavior changes meaning.
- D116 — Owner **records the C1A visual acceptance** (shell direction, navigation, light/dark, density, and honest prototype states approved) and directs the review's shell corrections to ship in the same closeout: honest loading/error states, More-group active navigation, ≥44px phone controls, and corrected C1A record evidence. Owner **accepts merge-triggered Vercel Production auto-deploy** under D088, noting the deployment is protection-gated (anonymous 401) and holds no private data at C1A. Accepted C1A baseline = `ff9975d` plus the closeout commit.
- D117 — **C1B is the next checkpoint** from the accepted merged baseline; the independent review lane is closed with no open blockers. Supabase provisioning and any installs remain separate scoped owner authorizations under D072/D103 (one Free project serves as production; isolation is local/embedded test data plus preview credential protection per D103/D105).

### Round 25 — standing next-steps flow (confirmed)

- D118 — Owner requires a standing **next-steps flow**: every independent-review deliverable and every checkpoint delivery record ends with a concise **Next steps** block — at most six ordered actions, each naming its owner (owner / next thread / primary writer) and the exact artifact or command, with **OWNER APPROVAL/CHECK** items marked explicitly and one identified immediate next step — so what happens next is always clear without reading the whole record. Encoded in [WORKFLOW.md](WORKFLOW.md) Step 6, the [HANDOFF.md](HANDOFF.md) template, [phases/00-independent-review.md](phases/00-independent-review.md), and the [LAUNCH_PROMPTS.md](LAUNCH_PROMPTS.md) shared instruction.

### Round 26 — C1B execution inputs (confirmed)

- D119 — Owner approves C1B's **local/embedded test isolation via `@electric-sql/pglite`** (a real Postgres compiled to WASM, run in Node with no Docker): C1B executes its actual migrations and RLS policies against PGlite with a small `auth`-schema shim, and verifies OAuth/session flows against the live project. Docker Desktop or a local PostgreSQL remain optional upgrades. Owner also approves the **migration path**: C1B writes versioned SQL migration files and the **owner applies them** to the single Supabase project (dashboard SQL editor, or CLI if chosen) as a separate reviewed step per D088, never automatically and never during a build.

### Round 27 — C1B execution thread (confirmed)

- D120 — Owner **repurposes the review/closeout thread as the C1B execution thread** instead of opening a new thread and worktree, to use the thread's remaining session time. C1B therefore runs in the existing worktree `.freebuff/worktrees/39626366-e8b3-401c-8ac9-f072a158e51f` on branch `checkpoint/c1b-foundation` cut from the merged handoff base `1de3cfd`, and the C1B record's workspace/worktree identity is updated to match. This is a deliberate, recorded deviation from the "new execution thread in its own worktree" rule in LAUNCH_PROMPTS.md; the owner stays the integration owner and primary reviewer, and progress is pushed incrementally so any later thread can resume from the pushed branch if this thread's session ends first.

### Round 28 — C1B contract §5 completion (confirmed)

- D121 — The owner directed C1B to be finished in this thread. The frozen contract settles the one item C1B had flagged as a possible scope deviation: **`C0B-v2` §5 requires autosave statuses and unsaved-input protection**, so both are implemented rather than deferred. Ordinary field edits now autosave with truthful `saving | saved | failed | conflict` status; pending/failed input survives in-app navigation, franchise switch, dialog close, sign-out, session expiry, and page unload with explicit **stay / retry / discard** choices; a stale write is surfaced and never overwrites; and every command carries a stable request id so a retry after a lost response replays instead of double-applying. No durable offline queue or browser-restart recovery is promised (D062). This also closed two latent database defects found while testing the clear-to-unknown path: a cleared field (an explicit null) is normalized to absence instead of a stored literal null, and the applied-request ledger now stores and replays a null outcome instead of raising a NOT NULL violation.

### Round 29 — C1B browser verification (confirmed)

- D122 — Owner directed that every C1B feature be exercised in the browser against the live project before acceptance. The pass (2026-10-02, merged `main` `4c137f1`, signed in as the allowlisted owner) confirmed: sign-in and the auth gate on every route including the backup-export API; a real-counts-only overview; custom players and plan-versus-recorded editing; truthful autosave status; a failed save that preserves input with retry/discard; the unsaved-input guard (navigation blocked, with stay/retry/discard, and discard reverting to the last saved value); clearing a field back to unknown; `0` stored as a real value; a stale two-tab write reported as a conflict without overwriting; backup export and validated restore-new with ids remapped and the custom-player key preserved; invalid-backup refusal leaving nothing written; rename / make-active / archive / resume; honest provenance; and sign-out revoking the session. One display defect was found and fixed: the top-bar active-franchise picker is an uncontrolled `<select defaultValue>` and kept showing the previous franchise after "Make active" until a reload, so it is now keyed on the server-provided id, with a regression test that fails without the fix ([PR #14](https://github.com/joshhkee/franchise-manager/pull/14), awaiting owner merge). The owner also approved removing the test-created franchise and test player so the live project returns to its pre-test state; the franchise revision stays monotonic. C1B acceptance remains the owner's step, and the only outstanding scope item is the source-import path, which needs the C0A source data.

### Round 30 — C1B acceptance and C2A start (confirmed)

- D123 — Owner **accepts C1B** and **launches C2A** from the merged, verified base `main` `b0e57ce`. C1B closeout: [PR #14](https://github.com/joshhkee/franchise-manager/pull/14) (picker fix), [PR #15](https://github.com/joshhkee/franchise-manager/pull/15) (verification record), and [PR #16](https://github.com/joshhkee/franchise-manager/pull/16) (the source-import path C1B had left open: `0006_source_import.sql`, a frozen Launch-ratings import module, service-role-only commands, and an owner-run Settings action) are all merged. The remaining live-project step is the owner applying `0006` and running the import; the other recorded owner checks (Supabase URL configuration, the approved test-data cleanup) stay open without blocking C2A. Because the Madden 27 depth-chart matrix (the D113 evidence supplement) is still open and the owner has no game access yet, C2A proceeds with **provisional, configurable game rules**: per-position labels, order, rank limits, and eligibility ship behind one rules module, are editable, and are labeled unverified per the phase packet and the C2A launch prompt — never presented as confirmed game defaults — and C2A's verified-ordering exit is deferred until the supplement lands. C2A executes in the Freebuff worktree/thread that picked the project up, from `b0e57ce`.

### Round 31 — C2A import defect fix and franchise deletion (confirmed)

- D124 — Owner requested a **delete control for accidentally created franchises** ("I should be able to delete franchises that I make accidentally"), asked separately whether its absence was intentional, and the same thread fixed the C2A **Launch-ratings import defect** discovered in the browser. Decisions: permanent deletion becomes an explicit, owner-only command for **non-default** franchises, guarded by repeating the exact franchise name and by clearing the active-franchise selection if that franchise was active; `archive`/`resume` remains the normal reversible lifecycle and the default franchise cannot be deleted. The import defect (the published EA payload now sends numeric `handedness`, an object `iteration`, and `M/D/YY` birthdates, which crashed normalization and surfaced as a 500) is an implementation repair against the existing C0B-v2 §2 source contract, not a semantic change: the fix converts the published values deterministically, keeps the raw birthdate string in provenance, and returns a truthful failed-import state instead of an unhandled error. Migration `0008_franchise_delete.sql` is owner-applied like `0006`/`0007`; until it is applied the UI reports that the command is unavailable instead of failing silently.

### Round 32 — Source-catalog attachment (confirmed)

- D125 — Owner requested the **source-catalog attachment flow** for the depth chart that had no players: attach a franchise's club players from the imported revision as a **labeled provisional baseline**, plus search/add for free agents and individual players, with duplicate refusal and unknown handling. Owner separately directed that the required `0009_catalog_attach.sql` be applied with browser help. Decisions: attachment stays an explicit per-franchise action (importing the catalog never auto-populates a roster, preserving franchise isolation and source immutability); a club snapshot is resolved by the published club label from one revision; already-held published identity is skipped and counted rather than duplicated; missing position/team/archetype stays unknown; and the result remains provisional/unverified until the owner records reality. Club players may also be selected individually through catalog search. Migration `0009_catalog_attach.sql` was applied to the live project on 2026-10-04 in the shared preview browser (Supabase SQL editor reported success); the delivery record is [docs/checkpoints/C2A-CATALOG-ATTACH.md](docs/checkpoints/C2A-CATALOG-ATTACH.md).

### Round 33 — Team wording, automatic team attachment, and one-shot depth-chart generation (confirmed)

- D126 — Owner asked in-session for three things: (1) all players should be auto attached to their teams, and the UI/data wording should say **team** instead of **club**; (2) one button that auto-generates the depth chart for all positions instead of suggesting/seeding position by position; (3) an explanation of the difference between the two per-position buttons. Decisions: the product language and code now say **team** everywhere user-facing and in the data layer (`matchTeamOption`, `CatalogTeamRow`, `CatalogAttachContext.teams`, the form field `team`, `source_team_summaries`); historical docs keep the wording of their time. **Automatic attachment** happens when a franchise has no attached published players and its name matches exactly one published team: on first open of GM War Room → Roster the matching published roster attaches itself through the same owner-approved command as the manual picker (D125), reported with its counted message, and importing a catalog still never populates a roster by itself. Ambiguous names (NY Giants / NY Jets) and already-populated franchises stay on the explicit picker. **One-shot generation**: a single `Generate all positions (provisional)` action builds the provisional suggestion for every non-manual position that has no planned list yet and applies them in one atomic request (`public.generate_depth_chart`, migration `0010_depth_chart_generate.sql`), seeding a provisional baseline where none exists, storing a plan only when it differs, never downgrading an `owner_confirmed` baseline, and bumping the franchise revision at most once; positions the owner already planned and manual secondary/specialist slots are left untouched and reported honestly. The two per-position buttons remain distinct and unchanged: *Suggest order (provisional)* only fills the planned (editing) list and autosaves a plan; *Seed provisional list* writes the suggestion as the recorded baseline labeled `provisional_published` (unverified). Migration `0010_depth_chart_generate.sql` was applied to the live project on 2026-10-05 in the shared preview browser (Supabase SQL editor reported success, at owner approval).

### Round 34 — C2A acceptance and C2B start (confirmed)

- D127 — Owner **accepts C2A** ("c2a accepted") and directs **C2B** to begin from the merged base `ff6f0f2` (merge of PR #21) because no owner action is required to start. C2B implements the final-difference checklist per [phases/02-lineups-checklist.md](phases/02-lineups-checklist.md): whole-position action units derived as `diff(baseline, plan)` (A→B→C consolidates, reverting removes the unit), prerequisite blocking where a practice-squad dependent list is refused alone and applies only when its promotion prerequisite is confirmed first in the same reviewed batch (transaction prerequisites remain a fixture-only C4A seam), atomic reviewed bulk confirmation where a stale revision or changed scope applies none, cancellation with dependent preview, and bounded undo (most recent 50 batches and 30 days) that corrects app records only and refuses when a later change depends on the confirmation. No in-game menu wording is shown because none is verified (D113 supplement still open). `0011_checklist.sql` is prepared for the owner to apply as a separate reviewed step per D088/D119; until it is applied the UI reports the missing storage honestly and the confirm action fails without writing. Delivery record: [docs/checkpoints/C2B.md](docs/checkpoints/C2B.md).

## Confirmed architecture summary

Logical franchise isolation, focused panels/tabs, separate worktrees, familiar stack, and private OAuth are approved by later rounds. Separate dev/production database *projects* are superseded by D103 (only one free slot); environment isolation is instead achieved through local/embedded test data and preview-configuration protection. Earlier open-question entries document interview history, not a reversal of those approvals.

## Remaining material unknowns

- Actual Madden 27 primary/specialist ranks, eligibility, formation inheritance and stock/special-teams coverage: C0 evidence gates, not resolved by owner recollection.
- Data acquisition/reuse and source completeness: reuse is owner-accepted (D111) and published counts are recorded (D109); game-catalog completeness remains a C1B/C3 coverage gate.
- Resolved at C0A: primary branch/remote = `main`; local tools inventoried; one Supabase project approved as production (D103). OAuth bootstrap/provider configuration still to be designed at C1B.
- Practical-fit/anomaly rubrics and exact template calls/buckets: research-backed checkpoint review, not arbitrary formulas.
- Difficulty/gameplay settings, exact desktop resolution/iPhone model: not specified; use broad defaults only where they do not misrepresent behavior, ask when actually needed.
- Undo retention is frozen at `C0B-v2` (most recent 50 batches and 30 days); detailed conflict UI and transaction cancellation resolution still need engineering ADR/fixtures within the confirmed semantics; material behavior changes require owner review.
- Gameday roster view (planned or recorded with pending-change warnings) and theme/pin-overflow grid: resolve at C5A; the audit did not silently select these owner-facing defaults.
- Special-teams feasibility is deferred to C3B (D114); any skip needs owner approval (D081).

## Documentation audit provenance

The owner requested a documentation-only contradiction/acceptance/complexity audit after initial discovery. [AUDIT.md](AUDIT.md) records engineering clarifications and outstanding choices. These edits do not create new D-numbered owner decisions, alter approved phase order, or claim sources/game behavior are verified.

- SPEC.md clarifies valid checklist action units, atomic/retry-safe confirmations, baseline labels, inherited-vs-explicit formation operations, staged backup/state contracts, and app-only edits.
- PLAN.md is the dependency authority; WORKFLOW.md distinguishes independent checkpoint PRs from one integrated backend/UI delivery.
- ACCEPTANCE.md adds detailed engineering tests; exact game rules, rubrics, architecture representation, gameday roster view and proposed numeric benchmarks still require their named gates.
- LAUNCH_PROMPTS.md is the canonical prompt catalog. Phase packets link to it rather than maintain competing launch instructions.

## Scope-change process

A blocked execution thread records: evidence, affected decisions/checkpoints, proposed alternatives, cost/workflow consequences, and a structured owner question. It does not quietly replace Civil.gg, invent fields/mappings, downgrade all-book coverage, or mark a blocked checkpoint complete.

## Planning deliverables

- [START_HERE.md](START_HERE.md): reading order and phase launch instructions.
- [AUDIT.md](AUDIT.md): corrected inconsistencies, engineering clarifications and remaining gates.
- [LAUNCH_PROMPTS.md](LAUNCH_PROMPTS.md): copy/paste assignment for every checkpoint/review lane.
- [SPEC.md](SPEC.md): workflow/state invariants and exclusions.
- [DESIGN.md](DESIGN.md): reviewed wireframes and visual contract.
- [PLAN.md](PLAN.md): checkpoints/dependencies and acceptance.
- [WORKFLOW.md](WORKFLOW.md): Windows worktrees, ownership, commit/push/PR and merge handoff.
- [SETUP.md](SETUP.md): $0 environment/auth/deployment setup and recovery.
- [HANDOFF.md](HANDOFF.md): required delivery record template.
- [ACCEPTANCE.md](ACCEPTANCE.md): decision-traceable verification matrix.
- [phases/](phases/00-evidence.md): individual execution packets.
- [RESEARCH.md](RESEARCH.md): preliminary sources and remaining validation gates.

## Open risks to resolve

- Fresh build is confirmed. If execution discovers unrelated prior source/assets, do not overwrite/commit them or silently treat them as approved baseline.
- Published ratings may omit free agents, contracts, jersey numbers, or some game-specific fields; report actual coverage.
- Civil.gg access/reuse, import feasibility, version coverage, and formation-label accuracy require C0 verification.
- Manual maintenance is limited to meaningful changes; don't silently add a weekly league-audit burden.
- Playcalling must not imply guaranteed outcomes or invent play metadata; researched rules and reason traces are required.
- Free hosting pause/backup limits are accepted with recovery docs; actual project slots/capacity and environment isolation still need verification.
