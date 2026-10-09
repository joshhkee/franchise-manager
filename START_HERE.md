# Start Here — Madden 27 Franchise Manager

## Current status

**The initial planning thread produced documentation only** — no application code, imports, service provisioning, or tests. Execution then began in separate threads: C0A evidence, the C0B contracts, and the C1A responsive shell are merged on `main` (PRs #1–#8), the C0B/C1A independent review is accepted and closed (D115–D117), and C1B (private auth, isolated franchise data, and the source-catalog import) is merged at `b0e57ce` (PRs #13–#16) and owner-accepted (D123). C2A (depth charts and planning state) is merged and owner-accepted (D127), C2B (final-action checklist and recovery) is merged (PR #22) with `0011_checklist.sql` applied live, and **C3A (Falcons formation diagrams and overrides) is merged (PR #23) and owner-accepted (D129)**, running on the owner-attested evidence basis **D128** with `0012_formations.sql` applied live (the D113 supplement is still open, so every mapping stays provisional). Original FEATURES.md was preserved.

The owner approved product direction, layouts/navigation, stack, phase/checkpoint granularity, and reviewed-PR workflow across 20 interview rounds; later rounds record execution decisions (D102 onward). See DECISIONS.md for D001–D129. Research is preliminary; actual Madden mechanics/source completeness/reuse remain explicit Phase 0 gates, not confirmed facts.

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

No phase is marked complete because documentation describes it. Accepted C0A exceptions (depth-chart matrix, representative Falcons mappings, stock-book inventory, alternate-source contingency) remain an evidence supplement; C3A ran provisionally under D128 and is accepted with that limitation intact, and **C3B's provisional basis is now recorded (D130)** with the D113 supplement still open; special teams move from a deferred gate to an **open owner question inside C3B** (D114), with the feasibility evidence in [docs/evidence/C3B-special-teams-feasibility.md](docs/evidence/C3B-special-teams-feasibility.md).

All planning docs and C0A/C0B/C1A/C1B/C2/C3A artifacts are committed on `main` (PRs #1–#23 merged); the shared baseline is established and no publication step remains. Decision/disposition updates land as small owner-reviewed docs PRs; no broad staging or unrelated commits.

The [documentation audit](AUDIT.md) records corrected contradictions and remaining choices. D001–D101 were not rewritten as new owner approvals; audit-derived engineering criteria are labeled separately.

## Next launch — a NEW execution thread

**C3A is closed, including its follow-up** (`2fea577`, PR #24). C3B's pre-flight is recorded — provisional basis (D130), the special-teams feasibility evidence, and its structured owner question — so the next launch is **[C3B](LAUNCH_PROMPTS.md#c3b--stock-book-coverage-and-special-teams)** (stock-book coverage; the special-teams scope awaits your D114 answer) or **C4A** from `2fea577`. Full pre-flight and prerequisites: [C3A record](docs/checkpoints/C3A.md) and [C3B-special-teams-feasibility.md](docs/evidence/C3B-special-teams-feasibility.md).

## Next-checkpoint launches

Select the checkpoint prompt in [LAUNCH_PROMPTS.md](LAUNCH_PROMPTS.md), fill verified base/worktree/ownership/delivery mode, and append its shared instruction. PLAN.md's dependency table permits independent C3B/C4A work after C3A, while dependent phases wait for accepted prerequisites. A tested partial lane is ready for integration, not a completed milestone. Do not carry forward guessed merge/deployment/migration state.

## Owner's practical next steps

1. Review docs and correct any decision that doesn't reflect your intent before execution.
2. **Answer the special-teams question** in [C3B-special-teams-feasibility.md](docs/evidence/C3B-special-teams-feasibility.md) §4 (options a–d, answerable without game access) when C3B starts. The C0B/C1A independent review, C1B, C2A, C2B, and C3A are closed (D115–D117, D123, D127, D129).
3. Follow WORKFLOW.md for C3B's ownership and declared delivery mode on `2fea577`, without adding unnecessary extra PR gates. The D113 evidence supplement (depth-chart matrix) remains open, so every mapping stays provisional; C3B's basis is D130, and its exit still requires the special-teams result or an explicitly owner-approved exception (D114).
4. Supply non-secret setup facts requested by SETUP.md, not passwords/tokens.
5. Review and merge each meaningful checkpoint PR (C1A shell approval D116; C1B acceptance D123). The Launch-ratings import is live (`ea-madden-27 · 1-base`, 3,111 records); an empty franchise named after a team attaches that published roster automatically from **GM War Room → Roster**, or pick any team there — importing the catalog alone still does not populate a franchise by itself (see [C2A-CATALOG-ATTACH.md](docs/checkpoints/C2A-CATALOG-ATTACH.md)).
6. At each next thread, paste the exact checkpoint prompt and accepted base/ownership, not merely 'continue'. Documentation plus delivery records carry the context.
7. Keep manual backups as explained in SETUP.md; Free Supabase can pause and has no included automatic backups.

## Recommendations for efficient execution

- Shared contracts first, then parallel domain/UI or independently owned features; do not optimize for two agents typing at all times.
- Prefer one authoritative editor/read model per concept, reusable detail views, and source/missing-data reports over feature duplication.
- Keep checkpoint PRs cohesive, testable, and small enough to review; meaningful checkpoint granularity is approved, but source evidence may justify an explicit revision.
- Preserve scope: extra SaaS/AI/simulation features are not improvements if they increase maintenance without the owner's approval.
- Treat a blocked source/game rule as a decision point; transparent limited coverage is better than fabricated completeness.
