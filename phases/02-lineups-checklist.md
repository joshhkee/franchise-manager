# Phase 2 — Depth Chart → Actionable Checklist

## Read first

[START_HERE.md](../START_HERE.md), [DECISIONS.md](../DECISIONS.md), [SPEC.md](../SPEC.md), [DESIGN.md](../DESIGN.md), [PLAN.md](../PLAN.md), [WORKFLOW.md](../WORKFLOW.md), [HANDOFF.md](../HANDOFF.md), accepted C0 contracts and C1 delivery records.

## Mission / preconditions

Deliver the first real payoff: useful lineup plans and a trustworthy list of what to do in Madden. Auth/persistence/franchise isolation and source provenance must already work. Verify merged bases/migrations; no inherited chat-state assumptions.

## C2A — depth charts and planning state

- Exact verified Madden 27 position labels/order/rank limits and eligible assignment rules. Owner's memory list is not the enum.
- Each player has one listed primary roster position; legal primary chart reuse/cross-position roles and specialist reuse permitted as verified.
- Per-position ranked lists, drag and accessible move/select controls, search/replace/player detail.
- Active roster and practice squad separate. Planned active use requires a promotion prerequisite, and confirmation requires completion. Real promotion/trade UI is C4A: C2 uses dependency fixtures or already-recorded roster corrections, not a dead 'promote' button or competing early transaction engine.
- Confirmed vs planned view clearly identified. Lineup edits default to plans; player/roster corrections can explicitly record already-happened reality.
- Published baseline and provisional initial ranks are labeled unverified; offer editable setup without pretending highest-OVR suggestions are actual game defaults.
- Revision-safe saves/conflicts; no mutation of source or another franchise.

Exit: owner can plan a full lineup on desktop and make essential phone adjustments, with meaningful errors and no tiny precision-only drag controls.

## C2B — final-difference checklist and recovery

- Derive current actionable differences against confirmed baseline, not append-only click history.
- A→B→C yields A→C; revert to A removes action. Update values/details on later plan changes.
- Individual executable action-unit confirmation; an ordered position list is one unit by default. Partial application is between independent valid units; owner can record the actual valid list if only part was changed in-game. Per-rank controls require proof of invariant-preserving game-compatible steps, not arbitrary ticks.
- Bulk review explicitly includes valid units/dependencies and excluded blocked units. Request applies the reviewed scope atomically in shown prerequisite order; changed revision/prerequisite applies NONE and requires re-review, never silent skipping. Lost-response retries never double-confirm.
- Cancel pending scoped changes; undo accidental confirmation using bounded action history, with later-dependency resolution instead of destructive rollback.
- Handle partial application BETWEEN valid action units coherently; an intermediate list edited in Madden is recorded as the actual valid list, not represented by arbitrary independent rank confirmations.
- Confirm the exact reviewed revision; stale device confirmations conflict rather than advance wrong baseline.
- Recording a change already done reconciles affected baseline/plan only, preserving unrelated work and surfacing conflicts.
- Show useful game menu/instruction wording only where verified. No claim of applying actions to the game automatically.
- Overview uses actual pending/issues/book context and quick resume.

Required fixtures and manual scenarios:
1. Reorder/revert/consolidate ranks without duplicate or contradictory instructions.
2. Player holds legal primary+specialist role; no one-role-only policy.
3. Confirm one position-list unit while another remains pending; both lists stay valid. Recording an actual intermediate valid list recomputes remaining ranks correctly; no duplicate/holey baseline.
4. Bulk review displays excluded blocked units and exact valid scope; submission is atomic, stale scope applies none, retry returns the same effective result.
5. Pending incoming player plan cannot confirm before trade/promotion.
6. Cancel prerequisite shows dependent lineup effects; undo later-dependent action does not corrupt state.
7. Two devices edit/confirm different revisions; stale request rejected with recoverable local input.
8. Record an already-happened change amid a pending plan; no redundant checklist action/unrelated loss.
9. Separate franchise/source untouched; unauthorized requests denied. Extend backup round-trip to lineup/pending/retained undo state; preserve inputs during navigation/failure. Undo corrects app records, not real game changes.

Exit: real end-to-end depth-chart edit → review → confirm → undo flows pass, browser console/network clean, no-game baseline caveats visible.

## Parallel boundaries

A owns state/diff/dependency/confirmation/undo service and tests. B owns assigned UI after contract freeze; default ONE integrated delivery PR per checkpoint, not separate incomplete backend/UI milestones (WORKFLOW.md). Single migration/shared-type owner. Extend C1B's baseline/plan primitives instead of replacing them. Synthetic transaction fixtures until C4A; do not build a competing transaction engine.

## Non-goals

Dynamic formation diagrams (next phase), new GM ranking, injury/fatigue tracking, game-save sync, public collaboration, season tracking. Checklist must not become an activity feed.

## Delivery / launch

Scoped checkpoint commit/push/PR, tested owner acceptance, explicit bounded undo semantics and next-phase contract links. Owner merges.

Use canonical [C2A](../LAUNCH_PROMPTS.md#c2a--depth-chart-and-planning-state) or [C2B](../LAUNCH_PROMPTS.md#c2b--final-action-checklist-and-recovery) with assignment header/shared instruction. PLAN.md and WORKFLOW.md govern dependencies/integrated delivery.
