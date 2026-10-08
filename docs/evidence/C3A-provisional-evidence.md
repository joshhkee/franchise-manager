# C3A evidence supplement — provisional, owner-attested (D128)

Status: **provisional evidence basis for C3A, authorized by [D128](../../DECISIONS.md). The [D113](../../DECISIONS.md)
evidence supplement remains OPEN** — this document does not close it and does not claim in-game verification.
Everything here is labeled with an evidence class and must be re-verified when the owner has game access.

Evidence classes used in this supplement (extending [RESEARCH.md](../../RESEARCH.md)):

- **[Owner-attested]** — the owner answered from direct knowledge of Madden 27 during the C3A Q&A (2026-10-06).
  Treated as decision-grade for C3A design under D128, but never as verified game data.
- **[Crawled]** — observed in Civil.GG's public pages on 2026-10-06 (owner-authorized per D106/D111).
- **[Unverified default]** — a provisional editable default chosen so the app ships honestly without game
  evidence; always labeled in the UI and changeable without code semantics changing.

## 1. Decision basis (D128)

C3A was blocked on the D113 supplement (owner has no game access). Instead of waiting, the owner authorized a
**provisional C3A** with this evidence basis:

1. Evidence class **owner-attested from Madden 27** for the design-critical facts listed in §2/§3.
2. **Book selection**: Falcons offense + Falcons defense (the D022 baseline), **plus Bears offense and
   Vikings defense** as extra loaded books; every other book stays an inventoried, honest "not loaded" row.
3. All slot mappings carry the evidence label **"Provisional mapping — unverified, editable"**
   (`unverified_default`); no claim of in-game verification anywhere in the UI or data.
4. A **subtle playbook-inventory list view** on Settings shows all in-game playbooks with loaded status.

## 2. Owner-attested design facts (answered in-session, 2026-10-06)

| Question | Answer | Class | Where it lives |
|---|---|---|---|
| Diagram orientation: offense | O-line at TOP of the diagram; backfield below | [Owner-attested] | [lib/formations/types.ts](../../lib/formations/types.ts) `ORIENTATION`, offense data authored line-at-top |
| Offense left/right | Offense-left = viewer's LEFT (no mirroring for offense) | [Owner-attested] | `ORIENTATION.offenseLeft = "viewer_left"` |
| Diagram orientation: defense | D-line at BOTTOM of the diagram (secondary above), drawn **from the offense's view** | [Owner-attested] | `ORIENTATION.defenseLineAtBottom`, defense data authored from offense's view |
| Defense left/right | Defense-left = viewer's RIGHT (mirrored) | [Owner-attested] | `ORIENTATION.defenseLeft = "viewer_right"` |
| `GAD` (D004-era label) | **Gadget playmaker** — an eligible playmaker role that can be filled by WR, HB, TE, or QB | [Owner-attested] | recorded here; not yet needed by any loaded formation mapping |
| Evidence basis (game) | Madden 27 | [Owner-attested] | this file; matches D007 |

These answers resolve the C3A orientation-evidence gate that [phases/03-formations.md](../../phases/03-formations.md)
flags ("Verify source left/right conventions; no automatic generic flipping") **provisionally**: coordinates are
authored in the rendered orientation per book side (no runtime flip), the note is displayed under every diagram,
and re-verification against the game stays open.

## 3. Source inventory — Civil.GG crawl (2026-10-06)

[Crawled] Playbook counts (Madden 27): **86 total** = 32 team offense + 32 team defense + 17 alternate offense +
5 alternate defense. The 17 alternate offense books: Air Raid, Air Raid Classic, Balanced, Benkert's Dimes,
Pistol, Run and Shoot, Run Balanced, Run Heavy, Run n Gun, Shotgun, Shotgun Classic, Shotgun Mix, Singleback,
Spread, Spread Classic, Two Back, West Coast. The 5 alternate defense books: 3-4, 4-3, 46, Cover 2, Multiple D.
Full machine-readable inventory: [lib/formations/playbooks.ts](../../lib/formations/playbooks.ts)
(`PLAYBOOK_INVENTORY` + crawl metadata), rendered on [app/settings/page.tsx](../../app/settings/page.tsx).

[Crawled] Formation counts for the loaded books: Falcons offense **42**, Bears offense **42**, Falcons
defense **15**, Vikings defense **24** (123 total; all present in the catalog, 60 mapped after the
2026-10-06 owner-feedback batch — see §4a).

[Crawled] Formation pages serve **alignment images only** (alt text ends "formation alignment — depth-chart
positions"). No structured slot coordinates, ranks, or inheritance are published, so per-slot mapping cannot be
sourced from Civil.GG and remains [Unverified default] until the D113 in-game supplement lands.

## 4. Mapping coverage and honesty rules

- **60 formations are mapped** across the four loaded books (42 Falcons offense — the full book, 5 Bears
  offense, 9 Falcons defense, 4 Vikings defense). Every mapped slot's evidence label is `unverified_default`;
  the diagram caption repeats it. Every mapped formation fields exactly 11 players — enforced by a catalog
  audit test (`tests/formations.test.ts`, "fields exactly 11 players on every mapped formation").
- The remaining 63 formations render as **unmapped**: visible, selectable, and explicitly described as having
  no slot mapping yet — never rendered as an invented diagram (Falcons defense keeps 6 pending, Vikings
  defense 20, Bears offense 37).
- Jersey numbers/OVR come only from recorded franchise data; unknown renders as the slot label / "OVR unknown".
  Missing values are never invented (A16).
- Conflicts (missing rank, duplicate player, departed override target, practice-squad resolution) are visible
  with offered repairs; nothing is silently substituted.

### 4a. Owner reference sheets + published personnel (2026-10-06 correction batch)

The owner supplied two in-game reference sheets and the set's published personnel tables (madden.tools /
madden-school, 2026-10-06); classes recorded per item:

- **Y Trips Close (owner sheet)** [Owner-attested]: 11 personnel (1 RB · 1 TE · 3 WR), QB under center, TE
  attached right just outside the RT, X isolated far left, exactly ONE slot receiver — the SLWR chart list
  player (sheet note: "WR3 is also listed as Slot WR 1"), Z wide right, HB behind QB.
- **Tight Y Off (Civil.GG alignment image, owner-supplied 2026-10-08)** [Crawled]: same family as Y Trips
  Close — TE attached RIGHT outside the RT, slot receiver (SLWR-list player) inside the isolated X on the
  LEFT, Z wide right, QB under center, HB behind; personnel 3 WR / 1 TE / 1 HB. The 2026-10-06 mapping had
  the TE attached left and the SL on the right; corrected 2026-10-08 (singleback + gun + Flex variants).
  Orientation is NOT mirrored: offense-left = viewer-left matches the reference image directly.
- **4-3 Even 6-1 (owner sheet, defense drawn from the offense's view)** [Owner-attested]: SIX defenders on the
  LOS — WILL and SAM standing at the edges flanking FOUR down linemen (RE–NT–DT–DT), MIKE stacked alone at
  A-gap depth behind; CBs level, SS higher (nearer the LOS), FS deepest. Personnel 4 DL / 3 LB / 4 DB = 11.
  Mirrored into the Vikings book.
- **QB depth ladder** [Owner-attested sheet + provisional depths]: under center y=21, pistol y=26, gun y=30 —
  no set renders its QB on or above the line any more.
- **Published personnel confirmations** [madden.tools / madden-school, 2026-10-06]: gun Bunch family and
  Tight/Open/Trey/Trips sets = 11 personnel (1RB·1TE·3WR); Empty sets keep no RB in the backfield (the RB
  flexes out as a WB receiver); Gun Deuce Close = 12 personnel (1RB·2TE·2WR); Wing Pair = 13 personnel
  (1HB·3TE·1WR); I-Form Slot Stack = 21 (2RB·1TE·2WR, stacked Z/SL, no isolated X); Goal Line offense
  "Normal" = 23 (2RB·3TE·0WR); Nickel 2-4 = Nickel 2-4-5 (2 interior DL · 4 LB · 5 DB); Dime 2-3-6 = Big Dime
  4-1-6 (NT+RDT down, RLE/RRE standing up on the edges, lone MIKE, 6 DB); Goal-line defense 6-2 =
  6 DL · 2 LB · 3 DB (CB, FS, SS).
- **Defects found and fixed by the 11-player audit**: the prior mappings for nickel 2-4 (13), dime 2-3-6 (10),
  goal-line 6-2 (10), 4-3 Even 6-1 (12), I-Form Y Off Close (12), Split-backs Offset Wing Close (12),
  goal-line offense (10), gun Empty Base Flex (10), and two Bears mappings (12 each) violated the 11-player
  invariant; all corrected this batch.
- **LOS line**: the diagram's line of scrimmage now passes through the on-line row (derived from slot data —
  offense y≈10, defense y≈90) instead of a hard-coded mid-field y=50.

## 5. What re-verification must cover (when the owner has game access)

1. Confirm each loaded book's formation names/counts against the in-game playbook screens (86-book inventory).
2. Confirm the four orientation answers above per formation family.
3. Replace provisional `inherits` ranks (e.g. SL→WR rank 3/4) with the game's actual per-formation matrix —
   the D113 depth-chart matrix item, including the WR3≠SLWR1 rule.
4. Verify GAD eligibility behavior (WR/HB/TE/QB playmaker eligibility) against formation playmaker screens.
5. Special teams remain C3B with the D114 owner gate; no special-teams mapping is implied by this supplement.
