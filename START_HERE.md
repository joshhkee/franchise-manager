# Start Here — Madden 27 Franchise Manager

## Current status

**The initial planning thread produced documentation only** — no application code, imports, service provisioning, or tests. Execution then began in separate threads: C0A evidence, the C0B contracts, and the C1A responsive shell are merged on `main` (PRs #1–#8), and the C0B/C1A independent review is accepted and closing out (D115–D117). Original FEATURES.md was preserved.

The owner approved product direction, layouts/navigation, stack, phase/checkpoint granularity, and reviewed-PR workflow across 20 interview rounds; later rounds record execution decisions (D102 onward). See DECISIONS.md for D001–D117. Research is preliminary; actual Madden mechanics/source completeness/reuse remain explicit Phase 0 gates, not confirmed facts.

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
- **C1B**: **next — not started.** Requires the closeout PR merged plus owner-scoped Supabase/install authorization (D117).

No phase is marked complete because documentation describes it. Accepted C0A exceptions (depth-chart matrix, representative Falcons mappings, stock-book inventory, alternate-source contingency) remain an evidence supplement required before C3A/C3B; special teams are deferred to C3B with an owner gate (D114).

All planning docs and C0A/C0B/C1A artifacts are committed on `main` (PRs #1–#8 merged); the shared baseline is established and no publication step remains. Decision/disposition updates land as small owner-reviewed docs PRs; no broad staging or unrelated commits.

The [documentation audit](AUDIT.md) records corrected contradictions and remaining choices. D001–D101 were not rewritten as new owner approvals; audit-derived engineering criteria are labeled separately.

## Next launch — a NEW execution thread

Use [LAUNCH_PROMPTS.md: C1B](LAUNCH_PROMPTS.md#c1b--private-auth-data-and-franchise-foundation), filling its assignment header and appending its shared instruction. It is the canonical launch, not a separate competing set of requirements. C0B and C1A are closed and merged; C1B implements against `C0B-v2`. Start from the accepted merged baseline, not an unmerged predecessor.

## Next-checkpoint launches

Select the checkpoint prompt in [LAUNCH_PROMPTS.md](LAUNCH_PROMPTS.md), fill verified base/worktree/ownership/delivery mode, and append its shared instruction. PLAN.md's dependency table permits independent C3B/C4A work after C3A, while dependent phases wait for accepted prerequisites. A tested partial lane is ready for integration, not a completed milestone. Do not carry forward guessed merge/deployment/migration state.

## Owner's practical next steps

1. Review docs and correct any decision that doesn't reflect your intent before execution.
2. Start **C1B** (private auth and franchise data) in one thread once the closeout PR merges. The C0B/C1A independent review is closed (D115–D117); C0B and C1A are accepted and merged.
3. Follow WORKFLOW.md for C1B's isolated worktree, ownership, and declared delivery mode on the merged baseline, without adding unnecessary extra PR gates. Sibling worktree creation requires permission in environments that restrict writes outside this workspace.
4. Supply non-secret setup facts requested by SETUP.md, not passwords/tokens.
5. Review and merge each meaningful checkpoint PR (C1A shell approval was recorded 2026-10-02, D116). C1B additionally needs scoped authorization for Supabase provisioning and installs.
6. At each next thread, paste the exact checkpoint prompt and accepted base/ownership, not merely 'continue'. Documentation plus delivery records carry the context.
7. Keep manual backups as explained in SETUP.md; Free Supabase can pause and has no included automatic backups.

## Recommendations for efficient execution

- Shared contracts first, then parallel domain/UI or independently owned features; do not optimize for two agents typing at all times.
- Prefer one authoritative editor/read model per concept, reusable detail views, and source/missing-data reports over feature duplication.
- Keep checkpoint PRs cohesive, testable, and small enough to review; meaningful checkpoint granularity is approved, but source evidence may justify an explicit revision.
- Preserve scope: extra SaaS/AI/simulation features are not improvements if they increase maintenance without the owner's approval.
- Treat a blocked source/game rule as a decision point; transparent limited coverage is better than fabricated completeness.
