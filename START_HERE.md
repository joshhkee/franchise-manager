# Start Here — Madden 27 Franchise Manager

## Current status

The initial planning thread produced documentation only; application work followed in checkpoint branches. C0A evidence, C0B contracts and the C1A shell are merged (PRs #1–#8); C1B private auth/data is merged and owner-accepted (D123); earlier accepted work is tracked below. C2A (depth charts and planning state) is merged and owner-accepted (D127), C2B (final-action checklist and recovery) is merged (PR #22) with `0011_checklist.sql` applied live, and **C3A (Falcons formation diagrams and overrides) is merged (PR #23) and owner-accepted (D129)**, running on the owner-attested evidence basis **D128** with `0012_formations.sql` applied live (the D113 supplement is still open, so every mapping stays provisional). Original FEATURES.md was preserved.

The owner approved product direction, layouts/navigation, stack, phase/checkpoint granularity, and reviewed-PR workflow across 20 interview rounds; later rounds record execution decisions (D102 onward). See DECISIONS.md for D001–D132. Research is preliminary; actual Madden mechanics/source completeness/reuse remain explicit evidence gates, not confirmed facts.

Fresh private build for one owner, solo vs CPU, likely PC game not yet owned. Default Falcons; independent franchises, lineup→checklist first, GM/Coach before phone-first Gameday. Strict $0, Next.js/Tailwind/Supabase/Vercel, GitHub OAuth allowlisted owner, neutral compact professional design, light + dark. No game-save dependency, generative AI, trade acceptance prediction, custom books, season/week tracking, printing, or offline editing.

## Authority and efficient reading

Confirmed owner decisions in DECISIONS.md take precedence. SPEC.md defines product/state semantics; DESIGN.md defines layout constraints; PLAN.md is the checkpoint dependency/exit authority; WORKFLOW.md governs parallel delivery. Phase packets supply scoped detail, LAUNCH_PROMPTS.md supplies canonical starts, and HANDOFF.md records actual delivery evidence. Research findings and proposed numeric benchmarks are not owner decisions.

New thread minimum: this index → active phase packet → PLAN dependency row → last accepted relevant delivery record. Then read relevant SPEC/DESIGN/DECISIONS sections, ACCEPTANCE rows, and WORKFLOW/SETUP as needed. First implementers and shared-contract owners read the full core spec. Do not reread every setup instruction for a docs-only task or copy the whole specification into each PR. If documents disagree, pause and correct the authority chain rather than guessing.

## Document index

1. [DECISIONS.md](DECISIONS.md) — confirmed owner choices, chronological IDs, unknowns, scope-change rules. Later explicit decisions supersede earlier open questions.
2. [SPEC.md](SPEC.md) — product/state invariants and exclusions.
3. [DESIGN.md](DESIGN.md) — reviewed screen organization/orientation and proposed detailed acceptance targets.
4. [PLAN.md](PLAN.md) — approved checkpoint sequence and dependencies.
5. [RESEARCH.md](RESEARCH.md) — source evidence and required validation, not a claim full research is done.
6. [WORKFLOW.md](WORKFLOW.md) — isolated Windows worktrees, ownership, commit/push/PR/owner-merge procedure.
7. [SETUP.md](SETUP.md) — account/tool inventory, $0 project/OAuth/env setup, recovery.
8. [HANDOFF.md](HANDOFF.md) — checkpoint delivery records and next-thread template.
9. [ACCEPTANCE.md](ACCEPTANCE.md) — traceable test/owner acceptance matrix.
10. [LAUNCH_PROMPTS.md](LAUNCH_PROMPTS.md) — copy/paste assignments for every checkpoint and the review lane.
11. The active phase packet and last accepted merged checkpoint records.

[FEATURES.md](FEATURES.md) remains original context. If it conflicts with later explicit decisions (e.g. always-visible full player labels versus approved compact circles), follow the later decision and document it. Never infer approval from an unanswered interview question or a proposed wireframe metric.

## Phase packets

| Phase | Checkpoints | Standalone packet |
|---|---|---|
| 0 — Evidence & contracts | C0A, C0B | [Evidence](phases/00-evidence.md) · [Independent review lane](phases/00-independent-review.md) |
| 1 — Private foundation | C1A, C1B | [Foundation](phases/01-foundation.md) |
| 2 — Depth chart/checklist | C2A, C2B | [Lineups & checklist](phases/02-lineups-checklist.md) |
| 3 — Dynamic subs/coverage | C3A, C3B | [Formations](phases/03-formations.md) |
| 4 — GM/Coach | C4A, C4B | [GM & Coach](phases/04-gm-coach.md) |
| 5 — Phone gameday | C5A, C5B | [Gameday](phases/05-gameday.md) |
| 6 — Integrated release | C6A | [Hardening](phases/06-hardening.md) |

Phase packet launch prompts intentionally start the first checkpoint only. A new thread may own a whole phase, but must stop at each checkpoint for PR/owner acceptance, then verify the accepted merged baseline before continuing. Do not code the next checkpoint atop an unreviewed predecessor by default.

## Active execution status

- **C0A**: closed — owner accepted with exceptions (D113); independent review dispositioned (D112–D114).
- **C0B**: closed — contract `C0B-v2` owner-accepted (D115); merged as `236886f` (PR #7).
- **C1A**: closed — owner visual acceptance recorded (D116); merged as `ff9975d` (PR #8), with the review corrections applied in the closeout.
- **C0B/C1A independent review**: delivered and dispositioned — [report](docs/reviews/C0B-C1A-independent-review.md), [lane record](docs/checkpoints/C0B-C1A-REVIEW.md).
- **C1B**: closed — owner accepted (D123) on the merged, browser-verified base `b0e57ce` (PRs #13–#16; verification per D122). Migrations `0001`–`0006` and the allowlist row are applied to the live project; the Launch-ratings import has run (`ea-madden-27 · 1-base`, 3,111 records).
- **C2A**: closed — merged (PRs #17–#21) and browser-verified; **owner accepted** (D127). Provisional/configurable game rules apply until the D113 depth-chart matrix lands (D123).
- **C2A import fix + franchise delete (lane)**: closed — merged as `f844cf9` (PR #19). The Launch-ratings import crash is repaired and verified against the live project (revision `ea-madden-27 · 1-base`, 3,111 records, idempotent re-run), a post-C2A feature sweep was run, and D124 adds the owner-requested delete control for accidental franchises. `0008_franchise_delete.sql` is applied and the live delete round trip passed. See [record](docs/checkpoints/C2A-IMPORT-DELETE-FIX.md).
- **C2B**: closed — merged as `0c57c47` (PR #22); `0011_checklist.sql` was applied 2026-10-06 (owner-approved) and the live confirm → undo round trip was browser-verified before the PR. Owner acceptance of the merged checkpoint is the owner's step. See [record](docs/checkpoints/C2B.md).
- **C2A catalog attachment (lane)**: complete — checks passed, `0009_catalog_attach.sql` applied to the live project (owner instruction, SQL editor, 2026-10-04) and `0010_depth_chart_generate.sql` applied 2026-10-05 (owner approval), live browser passes done on temporary franchises, and the fix for the recorded C1B/C2A gap (ACCEPTANCE A38) is delivered: team snapshots attach as a labeled provisional baseline (and now attach **automatically** for an empty, unambiguously named franchise — D126), catalog search adds free agents/individuals, duplicate identity is refused with counts, unknowns stay unknown, and one button generates the provisional depth chart for all positions at once (D126). Wording is **team**, not club. See [record](docs/checkpoints/C2A-CATALOG-ATTACH.md).
- **C3A**: closed — **owner accepted** (D129) and merged as `cb30b3d` (PR #23), running on the **D128 provisional evidence basis** (owner-attested orientation/GAD answers; Falcons off/def plus Bears off and Vikings def loaded; 86-book inventory from the 2026-10-06 Civil.GG crawl; all slot mappings labeled provisional/unverified). `0012_formations.sql` was **applied** by the owner 2026-10-08, and the post-apply live round trips (override → checklist unit → cancel, mixed chart+formation confirm → undo, two-tab stale-confirm refusal) passed — the fixes those passes found (checklist confirm includes formation units, shared confirm/cancel identity split, Tight Y Off TE side) landed **after** the merge and shipped in the **C3A follow-up, merged as `2fea577`** (PR #24) — the base C3B/C4A start from. Evidence basis: [docs/evidence/C3A-provisional-evidence.md](docs/evidence/C3A-provisional-evidence.md); delivery record: [docs/checkpoints/C3A.md](docs/checkpoints/C3A.md).
- **C3B**: closed — merged to `main` as `3d8e799` (PR #26); checks and live browser pass recorded. Delivered on the **D130 provisional basis** with the **D131 scope** (86-book coverage inventory with honest verified/partial/unsupported status and provenance; special teams as inventory + roles, no diagrams; no new mappings and no art). See [C3B record](docs/checkpoints/C3B.md). D113 remains open, so mappings are provisional.
- **C4A**: accepted predecessor; merged baseline is `3e3cad4` (PR #27). `0013_gm_ledger.sql` application state is not assumed by C4B; C4B's migration remains separate and owner-applied only after review.
- **C4B**: implementation delivered for owner review on isolated branch `freebuff/c4b-scouting-coach`, based on merged C4A. D132 allows the clearly provisional, unverified catalog only; no fit/anomaly rankings or fabricated game advice. See [C4B checkpoint record](docs/checkpoints/C4B.md). Migration `0014` has not been applied; no production deployment or migration occurred in this thread.

No phase is marked complete because documentation describes it. Accepted C0A exceptions (depth-chart matrix, representative Falcons mappings, stock-book inventory, alternate-source contingency) remain an evidence supplement; C3A ran provisionally under D128 and is accepted with that limitation intact, and **C3B's provisional basis is recorded (D130)** with the D113 supplement still open; the special-teams gate is **answered as inventory + roles with no diagrams** (**D131**, D114), and C3B also maps no new books and ships text/personnel only (D131), so no scope question is open. Feasibility evidence: [docs/evidence/C3B-special-teams-feasibility.md](docs/evidence/C3B-special-teams-feasibility.md).

Planning and accepted C0A/C0B/C1A/C1B/C2/C3A/C3B artifacts are committed on `main` (PRs #1–#26 merged); C4A is merged as PR #27 at `3e3cad4`. C4B is delivered for review on its isolated branch. Decision/disposition updates land as small owner-reviewed docs PRs; no broad staging or unrelated commits.

- **Phase 5 C5A**: implementation in progress on the current execution branch after C4B; source-backed Civil.GG Madden 27 catalog, deterministic rules, tests and evidence/checkpoint docs are being delivered before C5B. D133–D136 record the approved planned-lineup view, play art, unified call sheet and sequential checkpoint execution. Do not claim C5A accepted/committed until its checkpoint commit is confirmed; D113/D128 mapping evidence remains provisional.

The [documentation audit](AUDIT.md) records corrected contradictions and remaining choices. D001–D101 were not rewritten as new owner approvals; audit-derived engineering criteria are labeled separately.

## Next launch — a NEW execution thread

**C3B is closed and merged** at `3d8e799` (PR #26); its scope, evidence, and limitations are in the [C3B record](docs/checkpoints/C3B.md). Next, launch **C4A** (transactions), which proceeds independently per PLAN.md, or the deferred mapping increment under D131. D113 remains open, so all existing mappings stay provisional/unverified.

## Next-checkpoint launches

Select the checkpoint prompt in [LAUNCH_PROMPTS.md](LAUNCH_PROMPTS.md), fill verified base/worktree/ownership/delivery mode, and append its shared instruction. PLAN.md's dependency table permits independent C3B/C4A work after C3A, while dependent phases wait for accepted prerequisites. A tested partial lane is ready for integration, not a completed milestone. Do not carry forward guessed merge/deployment/migration state.

## Owner's practical next steps

1. Review docs and correct any decision that doesn't reflect your intent before execution.
2. **C3B is merged** (PR #26). Review this C4B implementation and [checkpoint record](docs/checkpoints/C4B.md); complete the signed-in walkthrough and review migration `0014` before authorizing merge/application. C4A is already merged at PR #27.
3. Follow WORKFLOW.md for C3B's ownership and declared delivery mode on the pre-flight merge, without adding unnecessary extra PR gates. The D113 evidence supplement (depth-chart matrix) remains open, so every mapping stays provisional and no book is labelled verified; C3B's exit is the reconciled inventory with verified/partial/unsupported labels plus your approval of the reduced all-book scope (D130).
4. Supply non-secret setup facts requested by SETUP.md, not passwords/tokens.
5. For C4B, inspect the provisional behavior and [checkpoint record](docs/checkpoints/C4B.md), complete signed-in desktop/mobile acceptance, then review and merge the PR. Review/authorize migration `0014` separately; D113 fit/rubric acceptance remains open.
6. At each next thread, paste the exact checkpoint prompt and accepted base/ownership, not merely 'continue'. Documentation plus delivery records carry the context.
7. Keep manual backups as explained in SETUP.md; Free Supabase can pause and has no included automatic backups.

## Recommendations for efficient execution

- Shared contracts first, then parallel domain/UI or independently owned features; do not optimize for two agents typing at all times.
- Prefer one authoritative editor/read model per concept, reusable detail views, and source/missing-data reports over feature duplication.
- Keep checkpoint PRs cohesive, testable, and small enough to review; meaningful checkpoint granularity is approved, but source evidence may justify an explicit revision.
- Preserve scope: extra SaaS/AI/simulation features are not improvements if they increase maintenance without the owner's approval.
- Treat a blocked source/game rule as a decision point; transparent limited coverage is better than fabricated completeness.
