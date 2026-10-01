# Phase 0 — Independent Review Lane

## Purpose

Approved initial second thread (D101): independently challenge the source/mechanics research, rights assumptions, product scope, and design/workflow risks. You are a reviewer, not a second implementation owner or rival architect.

## Preconditions

The approved documentation baseline is committed/available in your isolated worktree (an early docs PR is optional; a shared explicitly recorded unmerged base is allowed for research lanes under WORKFLOW.md). Owner/integrator has identified the primary C0A branch, your review branch, actual PR target, and review report ownership. If baseline docs are only local/uncommitted in another checkout, do not invent context—establish a shared baseline first.

## Read

[START_HERE.md](../START_HERE.md), [DECISIONS.md](../DECISIONS.md), [SPEC.md](../SPEC.md), [DESIGN.md](../DESIGN.md), [RESEARCH.md](../RESEARCH.md), [PLAN.md](../PLAN.md), [WORKFLOW.md](../WORKFLOW.md), [phases/00-evidence.md](00-evidence.md), primary researcher delivery/evidence when available.

## Owned output

A separate review report at `docs/reviews/C0A-independent-review.md` plus your lane delivery record `docs/checkpoints/C0A-REVIEW.md`. These paths are future execution outputs, not existing reports. You do not directly rewrite DECISIONS.md, SPEC.md, PLAN.md, the shared evidence matrix, or source contracts while the primary writer owns them.

## Review questions

- Is the player dataset really Madden 27 and complete-as-reported? Are free-agent coverage, numbers, measurements, archetypes, and stable identities verified rather than guessed?
- Is EA's 1,911 displayed result count being mistaken for full catalog size, or the brief's ~3,116 being enforced without evidence?
- Are sources permitted for acquisition/reuse/redistribution? Public accessibility and the owner's approval are not licenses. Are artwork and data rights separated?
- Are position labels/rank limits/eligibility/inheritance sourced to Madden 27 and relevant platform, rather than older Madden/CFB material silently reused?
- Do diagrams preserve offensive line top, defensive line bottom, and verified left/right identities? Are WR/specialist relationships per formation, not universal guesses?
- Are special-teams limitations reported to the owner before skipping? Is all-book coverage inventory honest?
- Does the state design actually support consolidated differences, partial confirmation, undo/dependencies, recording reality, source isolation and multi-device conflicts without overwriting unrelated work?
- Does the design retain accessible touch/keyboard detail when jersey circles replace full markers? Is the phone call sheet quick, not a dense desktop table?
- Are free-tier pausing, absent backups, dev/prod isolation and OAuth bootstrap risks clear?
- Are exact trade packages, acceptance prediction, hidden generative AI, season tracking, custom books, print/offline sync, or other excluded work creeping in?
- Are phase dependencies and ownership sufficiently explicit for a new thread with no chat history?

## Report format

For each issue:
- ID and severity: blocker / important / suggestion.
- Claim/document affected with exact reference.
- Independent evidence and source/version, or explanation of missing evidence.
- Risk to owner workflow/data/fidelity/design.
- Proposed correction or a concrete owner question.
- Status: open / researcher responded / corrected / owner accepted limitation.

Also list independently verified claims and remaining uncertainty. Do not present every disagreement as a blocker; distinguish factual falsity, incomplete evidence, and reversible engineering preference.

## Interaction with primary lane

Communicate findings via report/owner, not shared-file edits. Primary/integration owner incorporates accepted corrections into the authoritative evidence/contracts. Don't assume access to the other thread's uncommitted files/provider state. If owner references the other thread explicitly, a saved transcript excerpt may aid context, but delivered docs are still the durable source.

Merge the report as its owned checkpoint PR or integrate it deliberately into the primary evidence PR with ownership approval. In either case its evidence/check status must be recorded. Do not claim C0A accepted because the review report exists; owner confirms integrated findings.

## Verification and delivery

This is documentation/research review: check citations, links, contradictions, confidence and report completeness; app checks N/A. Choose report-integration mode OR a separate owned report PR under WORKFLOW.md before work; don't require both or claim integrated acceptance from an isolated report. Owned commits/handoff, and push/PR according to that declared mode; owner controls the primary merge. No code, installs, cloud provisioning, bulk scraping, or production actions.

## Launch

Use the canonical [C0A-REVIEW](../LAUNCH_PROMPTS.md#c0a-review--approved-independent-second-thread) launch, assignment header and shared instruction; declare report integration versus separate PR and explicit shared baseline before work.
