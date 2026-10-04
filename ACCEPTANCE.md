# Acceptance Matrix — Traceable Verification

Status: future acceptance requirements, not test results. No code/tests exist in the planning workspace. Each execution record names actual commands and outcomes. Approximate ~380 tests in FEATURES.md is not a target or existing suite.

## Verification policy

Every code checkpoint: typecheck/build, relevant automated tests, database integration/policy tests where needed, desktop/mobile browser and console/network review when UI is affected, owner manual scenario, source/coverage limitations, handoff and mergeable PR. Docs-only deliveries check links/consistency/evidence and mark app checks N/A; backend-only lanes do not need screenshots. Use actual project scripts/package manager selected at foundation, not guessed commands. Full integrated suite at dependency/phase boundaries. If unavailable, report blocked/not run rather than success. A partial lane meets its scoped verification, not the integrated checkpoint exit; PLAN.md/WORKFLOW.md govern delivery.

Code checks must become reproducible locally and in an appropriate free CI path by C1A; exact tooling is an execution choice. If hosted checks cannot run, report that limitation and obtain owner acceptance instead of implying remote checks exist. Docs-only PRs do not need a fake build job.

## Product invariants

| ID | Decision basis | Must demonstrate | First checkpoint / release regression |
|---|---|---|---|
| A01 | D001/D007/D054 | Works without game ownership/save file; source and baseline verification clearly labeled | C1B / C6A |
| A02 | D002/D015/D070 | Only allowlisted owner gets private data; direct unauthorized requests denied | C1B / C6A |
| A03 | D009/D050/D077 | Source immutable; edits/trades in one franchise never change another | C1B, C4A / C6A |
| A04 | D012 | Multiple named franchises, switch/archive, custom rookies with stable IDs | C1B / C6A |
| A05 | D013/D051/D079 | Unknown values not zero; no invented OVR/archetype/cap math; totals state completeness | C1B, C4A / C6A |
| A06 | D052/D062 | Truthful autosave/failure/conflict; local unsaved input recoverable; stale write rejected | C1B / C6A |
| A07 | D053/D077 | Export validated/versioned; restore new franchise default; invalid references/secrets rejected | C1B / C6A |
| A08 | D021/D016 | One roster primary position; verified legal cross-position chart and specialist roles | C2A / C6A |
| A09 | D017/D023 | Keyboard/touch move controls plus drag; practice squad not active silently | C2A / C6A |
| A10 | D096 | Suggested initial ranks provisional/editable, not falsely advertised game defaults | C2A / C6A |
| A11 | D010/D024 | Planned vs confirmed; A→B→C consolidates, reverting eliminates action | C2B / C6A |
| A12 | D025/D064/D097 | Individual/bulk reviewed exact scope, dependencies, partial confirmation, cancel, safe bounded undo | C2B / C6A |
| A13 | D052/D055 | Stale confirmation rejected; already-happened corrections preserve unrelated plans | C2B / C6A |
| A14 | D018/D019/D094 | Override persists; missing/conflicting personnel visible; no silent invented repairs | C3A / C6A |
| A15 | D042 | Offensive line at TOP; defensive line at BOTTOM; verified labels/left-right conventions | C3A / C6A |
| A16 | D075 | Compact markers if needed; full name/number/OVR accessible by tap/click/keyboard, no hover-only phone UX | C3A / C6A |
| A17 | D020/D022/D081/D082 | Falcons first, stock book inventory/coverage honest; special teams feasibility or owner-approved skip | C3A, C3B / C6A |
| A18 | D029/D056/D092 | Manual assets/deals only; no generated trades/acceptance prediction; unknown picks not invented | C4A / C6A |
| A19 | D026/D080 | Sign/cut/promotion secondary, verified limits enforced and uncertainty disclosed | C4A / C6A |
| A20 | D032/D057/D091 | Official archetype match distinct from practical fit; transparent anomaly peer/threshold/missing policy | C4B / C6A |
| A21 | D028/D031/D063/D077 | Explained block/targets, compare/search, pin/dismiss/notes; dismissals persist | C4B / C6A |
| A22 | D033/D074 | Coach tabs support gaps/identity without competing roster/lineup editors | C4B / C6A |
| A23 | D034/D035/D038/D067/D099/D100 | Three verified eligible complementary calls (or fewer, no filler), incompatible pins excluded but retained, concise details, optional inputs, honest no-result state | C5A, C5B / C6A |
| A24 | D066/D085 | Three offense + three defense useful researched themes; exact coverage owner-reviewed | C5A / C6A |
| A25 | D090/D097 | Refresh within theme, pins preserved, session repeat memory/reset; displayed ≠ run | C5A, C5B / C6A |
| A26 | D058/D060/D061 | iOS Safari phone-first call sheet; no tiny dense grid, horizontal essential scrolling, or oversized sticky regions | C5B / C6A |
| A27 | D068/D078 | Artwork only if permitted; accurate text/personnel fallback with coverage labels | C3/C5 / C6A |
| A28 | D045/D071/D087/D088 | $0, dev/prod isolated, no artificial keepalive/paid additions, owner merge deployment and separate migrations | C1/C6 |
| A29 | D005/D008/D039/D040/D074/D076 | Professional neutral light/dark shell, readable density, agreed desktop/phone nav, no gratuitous AI styling | C1A / every UI checkpoint |
| A30 | D047/D048/D069 | Owned integrated checkpoint delivery, truthful conflict/check readiness, concise handoff, owner primary merge | Every checkpoint |
| A31 | D024/D025/D064 | Ordered chart/action units remain valid after partial/bulk confirmation; stale atomic batch applies none, never silent skips | C0B, C2B / C6A |
| A32 | D018/D024 | Inherited formation changes create no redundant sub tasks; explicit override set/reset intent survives same-player equality | C3A / C6A |
| A33 | D052/D055/D062 | Pending/failed input protected on navigation/franchise switch/session expiry; retry never silently overwrites | C1B / every mutation checkpoint |
| A34 | D025/D053/D056 | Lost-response retry does not duplicate deal, confirmation, undo, or restore; validation failures leave no partial state | C1B, C2B, C4A / C6A |
| A35 | D053/D077 | Backup grows with every feature, restores stable source refs and remapped mutable IDs; missing revision does not bind to newest | C1B onward / C6A |
| A36 | D018/D020/D091 | Book switch retains book-scoped overrides/favorites/plans; no same-name transplantation; scheme change leaves personnel intact | C3A, C4B / C6A |
| A37 | D035/D085/D099/D100 | Theme coverage grid declares bucket boundaries/unsupported cells; pin overflow obeys three-call cap; refresh exhaustion explained | C5A, C5B / C6A |
| A38 | D012/D050/D051 | Custom-player/field validation, archive semantics and catalog-backed non-Falcons path specified/tested; no invented attribute defaults | C1B, C2A / C6A |
| A39 | D009/D049/D082 | Complete-source import distinguished from complete-game catalog; omission/reuse decisions recorded, record rejects reconciled | C0A, C1B, C3B / C6A |
| A40 | D015/D070/D087 | Private cache/session boundaries and redirect/write authorization tested; privileged code not used as an auth bypass | C1B / C6A |
| A41 | D010/D055/D059/D093 | App-only preferences/notes generate no Madden tasks; manual contract thresholds don't imply season progression; undo is app-record correction | C1B, C2B, C4A / C6A |

## Required detailed acceptance before the owning checkpoint

These are audit-derived test clarifications, not additional owner product decisions. Record unresolved material choices at their named gates.

### C0A/C1B — import and player editing

- Import report identifies source/game/revision/access basis, fetched/accepted/rejected counts, duplicates, teams/free-agent coverage and missing fields. Reimporting the same revision is repeatable without duplicate identities. Approximate targets are not forced counts; known game-catalog gaps require owner disposition before a full-catalog claim.
- Schema defines types, ranges, nullable fields, height/weight and currency units, jersey-number format, safe text handling and attribute bounds from evidence. Invalid values rejected; unusual-but-valid values warned. Distinguish one recorded OVR/archetype fact from derived practical fit; changing position/attributes marks affected facts stale without inventing formulas.
- A custom player can be created and explicitly assigned catalog/free-agent/owner-roster status without duplicating identity. Baseline versus planned onboarding intent is tested. Two same-named players remain distinct. Any unverifiable required field uses the approved unknown policy, not a fabricated number.
- Creating/switching/archiving a second non-Falcons franchise works with catalog-backed clubs. Document archive/read-only/resume behavior; pending work and exports remain intact. An accidentally created non-default franchise can be permanently deleted after repeating its exact name (D124); the default franchise is refused, and deletion cascades that franchise's players, fields, and chart plans only.
- App-only preferences/notes and game-editable fields have explicit action classification; unsupported game-edit fields never yield fake menu instructions.

### C2B/C3A — action units and overrides

- Fixture: baseline WR list [A,B,C], target [C,A,B]. A position-list confirmation produces a valid ordered baseline; confirming a subset of independent POSITION actions leaves other positions pending. If rank-level confirmation is introduced, prove a game-compatible transformation preserves uniqueness/order or use record-actual-list instead.
- A reviewed bulk request with changed revision/prerequisite fails with zero mutations; valid selected dependencies apply atomically in shown order. Repeated request after response loss returns the same effective result.
- Depth-chart-only inherited player change produces a depth-chart instruction, not redundant formation-sub tasks. Explicit set/reset override remains a game-action difference even when current inherited and overridden players happen to match.
- Cancellation/undo previews dependent effects; undo states it corrects app records and does not reverse a Madden action. Confirming an item never globally promotes provisional/unverified baseline status; no-game manual test scenarios use isolated development fixtures, not assertions that real game work occurred.

### C3A/C5B — configuration and gameday context

- Book switch A→B→A preserves A overrides/favorites/templates, never reuses merely same-named mutable data, and reports unsupported references. Scheme change only recalculates its proper read models.
- C5A gets an owner decision on which roster view Gameday uses (planned or last recorded), especially with pending trades. UI must label it and warn about unresolved personnel; don't implicitly call an unconfirmed acquisition game-ready.
- Theme grid identifies applicable down/distance/field/personnel contexts and intentional unsupported cells. One supported situation per initial theme demonstrates three distinct eligible complementary calls; theme refresh demonstrates additional eligible non-pinned alternatives where they exist. Do not require every theme to solve every fourth-down/goal-line situation or invent a numeric catalog minimum.
- Unknown inputs remain unknown. Reasons may say conditional/general-purpose, never 'matched empty personnel' without actual input. Pin overflow, all-pinned menus and pool exhaustion keep the three-call cap, preserve pins, and explain why refresh cannot vary; exact tie-break/rotation rule tested at C5A.
- Theme/template edit and book/franchise/side changes invalidate the correct current-session menu history, not unrelated saved plans. Same input/history/test seed gives reproducible results; no persisted play-use analytics.

### Persistence, recovery and security

- Pending edits survive supported in-session navigation/failure controls or explicit discard; session expiry prevents new writes and requires latest-revision review after login. Durable offline/restart recovery is not promised.
- Test denied account, expired/forged session, cross-franchise/custom-source references, write requests through privileged paths, and invalid OAuth redirects. Private data must not be publicly cached across accounts/franchises or remain exposed after logout on a shared device. Select framework-appropriate protections; do not prescribe a new security library.
- Import/restore/transactions and action confirmation validate before atomic mutation and are retry-safe. Test unsupported schema, oversized/corrupt input, missing source revision, ID remapping and secret rejection. Backup round-trip additions are part of each feature PR, not a C6-only chore.

## Suggested high-value fixtures

- Source player with all fields, missing number/contract/OVR, duplicate name but distinct ID, free agent, custom rookie.
- Two franchises from the same snapshot; update one after new source revision without changing either baseline automatically.
- Player legally assigned primary + specialist; duplicate player in resolved formation; missing specialist rank; departed explicit override.
- Pending trade/promotion → dependent chart/sub action; partial application between valid list/override/transaction units and record-actual intermediate list; later edits superseding reviewed action.
- Two device revisions; stale autosave/confirmation; network failure then newer remote edit.
- Already-happened roster/player update contradicting an existing plan, preserving unrelated changes.
- Manual pick with explicit year and changed owner, duplicate/ineligible asset; no automatic season rollover.
- Fit mismatch vs athlete outlier with sparse metrics and small peer sample; persistent dismissed candidate after rerender.
- Empty backfield with nonzero RB/TE personnel; unknown offensive personnel; no eligible verified play; pinned favorite incompatible with current bucket; refresh pool exhaustion.
- Corrupt/unsupported backup schema, malicious cross-franchise IDs, missing source revision, restore-new vs explicit replacement.

## Manual owner scenarios

Each checkpoint gives a short specific scenario. At release:
- Plan a Falcons lineup/sub change, apply only some actions in Madden (or simulate confirmation before owning), inspect remaining checklist, undo an accidental tick.
- Try a manually entered deal, confirm roster/pick effects and dependent lineups, never expect predicted acceptance.
- Use Gameday on the actual iPhone in portrait for several drive identities and refreshes; identify any extra taps, obstruction, small text, or sluggish controls.
- Export and restore into a separate franchise; check notes/custom players/plans rather than assume a downloaded file is valid.
- Review stock/special-team/art/theme coverage and explicitly accept any reported limitations before full-release claims.

## Performance/accessibility

DESIGN.md proposes target sizes/web-vitals and interaction goals. They are engineering targets to measure and review, not promises of always-warm free services. Record device/browser/network/fixture sizes, build mode, cache conditions, and actual results. C1A sets measurable contrast/focus/reflow/touch criteria; C5A/C5B set a representative phone performance protocol before interpreting benchmark values. Include safe narrow/short/zoom behavior and iOS safe areas/virtual keyboard.

Actual iOS Safari owner validation is required for full phone-release acceptance, or must remain explicitly pending with an owner-accepted interim limitation. Chromium viewport emulation is not an iOS result. Don't simulate a real production pause/destructive restore just to check recovery: use an isolated development drill and a documented owner resume walkthrough.
