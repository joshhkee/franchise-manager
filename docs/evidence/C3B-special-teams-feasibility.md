# C3B special-teams feasibility attempt (D114 gate) — 2026-10-09

Status: **C3B's bounded feasibility attempt, executed; the D114 question was answered as option (a).** D114
deferred special-teams feasibility to C3B with an explicit gate and D081 forbids a silent skip, so the question was
posed rather than assumed — and the owner answered it in §4 (**D131**), which is a scope choice rather than a
waiver. Every finding below is a public-source observation made on 2026-10-09; nothing here is in-game verified,
and nothing here authorizes inventing slot coordinates.

## 1. What was probed

- **Civil.GG** public playbook database (the C3A crawl source, D106/D111): the Madden 27 playbook index and its
  public content endpoints.
- **madden.tools** public Madden 27 database (already used by C3A for personnel confirmations, evidence §4a):
  the `special` formation category and its candidate sets.
- **The existing roster data**: the EA Launch ratings already imported (K/P/LS present, confirmed by the C0A
  independent review IR-2) and the C2A special-teams depth-chart slots.

## 2. Findings

**(a) Civil.GG has no special-teams category.** Its Madden 27 playbook index lists exactly four groups — Team
Offensive (32), Team Defensive (32), Alternate Offensive (17), Alternate Defensive (5) — the 86 books already in
[lib/formations/playbooks.ts](../../lib/formations/playbooks.ts). Its formation/play payloads contain no
special-teams sets; string matches for "return" in its play names are ordinary offense/defense plays.

**(b) Civil.GG exposes a public, credential-free content API** (observed 2026-10-09), which is useful to C3B's
"source/version import reports reproducible" requirement but adds no special-teams data:

```text
https://fatgvrcdozmbkxcwpwsc.supabase.co/functions/v1/pb-content-plays?action=formations|plays|playsWithContent&type=madden&year=27
→ { success, data: { data: [...] }, meta: { correlationId, duration_ms } }
```

**(c) Civil.GG formation art is still image-only.** Alignment labels are baked into the picture
(`alt` ends "formation alignment — depth-chart positions"), so no structured slot coordinates exist — the same
limitation that keeps the D113 supplement open and every current mapping provisional.

**(d) madden.tools publishes a `Special` formation category, but only four sets resolve.** Requests to
`kickoff`, `kick-return`, `punt-return`, `onside`, `field-goal-block`, `extra-point`, `two-point`, and
`punt-block` all return **404**:

| Set observed | URL | Plays observed |
|---|---|---|
| Field Goal | `/playbooks/formation/special/field-goal` | 12 (1 kick/PAT + 11 fakes) |
| Punt | `/playbooks/formation/special/punt` | 9 |
| Punt Tight | `/playbooks/formation/special/punt-tight` | 3 |
| Stop Clock | `/playbooks/formation/special/stop-clock` | 3 |

These pages list **Personnel: Not specified**, and the site's own banner says Madden 27 coverage is still being
filled in ("some plays, sets and diagrams are not in the database yet"). The Field Goal page does describe its
alignment in prose — long snapper over the ball, interior linemen shoulder to shoulder, H and Y wings angled off
each end of the line, holder kneeling about seven yards deep, kicker offset behind — i.e. **named roles, no
coordinates**, and it references Punt/Kickoff/Onside as separate sets that are not themselves published there.

**(e) The roster side is already covered.** `K`, `P`, `LS`, `KOS`, `PR`, and `KR` depth-chart slots exist from
C2A ([lib/depth-chart.ts](../../lib/depth-chart.ts)), so "keep K/P/LS/return specialists regardless" is satisfied
without new work.

## 3. Feasibility verdict

- **Feasible now:** a special-teams **set/play inventory** (4 sets / 27 plays from madden.tools, with the
  kickoff/return/onside/block gap disclosed) plus **role lists** (K, P, LS, H, and returners) drawn from the
  existing depth-chart specialists, rendered with the approved text/personnel fallback and an explicit
  "no diagram mapping" state.
- **Provisional only:** per-set role→player mapping could exist as an owner-attested provisional mapping (the
  D128 pattern) — labeled unverified and editable, never presented as game-verified.
- **Not feasible now:** **coordinate-mapped or verified special-teams diagrams.** No public source publishes
  structured special-teams slots, so authoring coordinates would mean inventing data, which D081/D082 forbid;
  and the one alternate source that carries any special-teams sets is itself incomplete.
- **Consequence:** C3B cannot claim "special-teams diagrams included". Its exit needs either an owner-approved
  fallback scope or an explicitly recorded owner-approved skip (D114), and the eventual C6A release has to carry
  whichever limitation is chosen. **Resolved:** the owner chose the fallback scope — option (a), recorded as D131.

## 4. Owner question (the D114 gate) — **ANSWERED 2026-10-09: option (a)**

The owner chose **(a) inventory + role fallback, no diagrams**, recorded as **D131**. The gate is answered
without game access, and no option was pre-approved — the answer is a scope choice rather than a waiver, so the
special-teams position stays disclosed through C6A. It is implemented in C3B as
[lib/formations/special-teams.ts](../../lib/formations/special-teams.ts) plus the Settings coverage surface
([C3B.md](../checkpoints/C3B.md)). The options remain below for the record.

Originally posed: pick one; (a) is the smallest honest scope, (d) is the only option that waits for game access.

**(a) Inventory + role fallback, no diagrams (recommended).** Ship the special-teams set/play inventory with
provenance, the K/P/LS/H/returner role lists, and a named "no diagram mapping" state. No coordinates, no invented
alignment art. *Cost:* small; stays inside the same catalog/resolver path. *Discloses:* kickoff/return/onside/
block sets absent from the alternate source.

**(b) Inventory + provisional owner-attested diagrams (D128-style).** You answer per-set alignment questions
(Field Goal, Punt, Punt Tight, Stop Clock, plus any set only you can confirm) and those answers become
provisional, labeled diagrams on the existing resolver. *Cost:* a second owner Q&A round plus data authoring;
still unverified, and every set you cannot attest stays unmapped.

**(c) Owner-approved skip of special-teams diagrams.** Keep only C2A's roster-level specialists and record the
gap as an explicit owner-approved exception for C3B/C6A. *Cost:* smallest; ends the D114 gate by decision rather
than by evidence. *Risk:* C6A must then carry a disclosed special-teams coverage gap.

**(d) Defer special teams until you have game access** (i.e. until the D113 supplement lands). C3B does the
86-book coverage expansion only and special teams stays open past C3B. *Cost:* C6A's "all above merged, or
individually recorded owner-approved exceptions" stays unresolved until game access exists.

**OWNER APPROVAL/CHECK:** satisfied — the choice is recorded as D131, so C3B may claim its special-teams result
only as "inventory + roles, no diagrams" and must disclose the kickoff/return/onside/block gap.

## 5. What C3B can build regardless of the answer

Per [phases/03-formations.md](../../phases/03-formations.md) and D082/A17, these do not depend on the
special-teams choice: the reconciled 86-book inventory with verified/partial/unsupported status, per-book
provenance, a reproducible inventory import via the Civil.GG endpoint above, equivalent-formation deduplication
only where justified, the measured catalog-size/diagram-interaction check, the art-or-text-fallback decision, and
backup coverage for any new persisted state.
