# Design guidelines

The rules every change to this site must follow. They exist so the app stays
minimal, professional, and — the part that is easy to get wrong — **readable no
matter which team you are running**, in either light or dark mode.

If a change conflicts with anything here, fix the change or change this document
deliberately. Don't quietly break the contract.

---

## 1. Colour: one accent, fixed semantics

There are exactly two kinds of colour in the UI, and they must never be confused.

### The accent (team colour)

The accent is the user's franchise colour. It is **presentational and swappable**:
it changes the moment you change your team. It reaches the UI through CSS custom
properties resolved per request by [`src/lib/theme.ts`](src/lib/theme.ts).

Use the accent for:

- Buttons (`.btn`), focus rings, `.field` focus borders
- The active navigation pill
- Links and inline accent text
- Highlighted diagram markers, selected states, the "this is the call" panel
- The team badge in the header and the browser/PWA chrome colour

**Accents only.** The accent never becomes a page or panel background. Content
surfaces stay neutral so legibility never depends on which team you picked.

### The semantic tones (never team-coloured)

`good` / `warn` / `bad` / `info` mean something. They are **fixed** and must not
follow the team, or "verified" would turn red for a red team:

- `good` — verified, applied, on the field, a trade that favours you
- `warn` — assumed-until-verified, thin depth, expiring deals
- `bad` — empty spots, duplicates, errors, unavailability
- `info` — neutral facts, notes, counts

They are defined once as `--tone-*` in [`globals.css`](src/app/globals.css) with a
light and a dark value, and surfaced through the `Badge` tones in
[`src/components/ui.tsx`](src/components/ui.tsx).

**Rule of thumb:** if turning the team blue would make it a lie, it is semantic.

---

## 2. The accent token contract

Accent values are never used raw. `deriveAccentTokens` in
[`src/lib/color.ts`](src/lib/color.ts) takes a team's true colours and returns this
set, guaranteed WCAG-AA safe:

| Token             | Purpose                                | Guarantee                              |
| ----------------- | -------------------------------------- | -------------------------------------- |
| `--accent`        | Solid fill (buttons, active pill)      | ≥ 3:1 vs every surface (AA UI/large)   |
| `--accent-strong` | Hover/active fill                      | ≥ 4.5:1 with `--accent-fg`             |
| `--accent-fg`     | Text **on** an accent fill             | ≥ 4.5:1 on `--accent` and `-strong`    |
| `--accent-text`   | Accent used **as** text on a surface   | ≥ 4.5:1 vs every surface (AA text)     |
| `--accent-soft`   | Subtle wash (highlight panels)         | decorative only                        |
| `--accent-border` | Subtle border                          | decorative only                        |
| `--ring`          | Focus ring                             | ≥ 3:1 vs every surface                 |
| `--secondary`     | Sparing highlight (charts, hover)      | ≥ 3:1 vs every surface                 |
| `--secondary-fg`  | Text on `--secondary`                  | ≥ 4.5:1                                |

"Every surface" means the page background, the card surface, and the inset
surface — the binding one is whichever is closest in lightness to the accent.

**Why the derivation exists.** Teams brand themselves in colours that are
routinely unusable on the web: silver, gold, near-black, near-white. Rather than
guess a "close enough" hex per team, the real colour is stored and
lightness-shifted (hue and saturation preserved) until it clears the target. The
team still looks like the team; it just becomes legible.

**You never hand-pick a team's UI colour.** Add the true hexes to
[`src/data/teamColors.ts`](src/data/teamColors.ts) and the derivation does the
rest.

---

## 3. Accessibility is enforced, not promised

The rule: **every team must pass WCAG 2.1 AA in both modes**, and that is checked
in CI, not by eye.

- [`tests/theme.spec.ts`](tests/theme.spec.ts) derives the tokens for all 32 clubs
  plus the neutral fallback, in light and dark, and asserts the whole contract
  above. Adding a team that fails makes the suite fail.
- [`tests/color.spec.ts`](tests/color.spec.ts) covers the colour maths itself.
- The surface hexes are declared in **two** places — `MODE_SURFACES` in
  `color.ts` and the CSS in `globals.css` — and a test reads the stylesheet and
  asserts they match. Change one, change both.
- `npm run audit:colors` prints the ratios per team/mode for eyeballing.

Never remove a focus outline. Never signal meaning with colour alone — pair it
with text (`Badge`, a label, a symbol).

---

## 4. Typography

- **Serif for headings.** Source Serif 4, loaded via `next/font` in the root
  layout, applied to `h1`–`h3` in `globals.css`. It gives the app its editorial,
  professional voice.
- **Sans for everything else**, including all data: tables, stats, form controls.
  Micro-labels (`.label`, table `th`, `Card` titles) stay sans, uppercase,
  letter-spaced.
- **Numbers are `tabular-nums`.** Any figure in a column — ratings, money, counts
  — gets it so columns line up.
- Keep the scale small: `text-xl`/`text-2xl` page titles, `text-lg` stat values,
  `text-sm` body, `text-xs`/`text-[11px]` metadata. Don't invent new sizes.
- A `Card` title is a *label*, not a display heading — keep it sans even though
  it is an `h2`.

## 5. Surface, depth and motion (minimalism)

- **No decorative gradients, textures or shadows.** Depth comes from a 1px border
  plus one surface step (`--surface` → `--surface-2`). The only exception is the
  football field in `FormationDiagram`, which is an illustration.
- **Radii:** `rounded-lg` for controls and inset panels, `rounded-xl` for cards,
  `rounded-full` for pills and badges. That's the whole vocabulary.
- **Spacing:** Tailwind's `gap-3`/`gap-4` between cards, `space-y-4` between page
  sections, `p-4` inside a card. Keep dense tables dense — this is a data tool.
- **Motion:** colour transitions only, ~150ms. No entrance animation, no layout
  movement, no bouncing. The app should feel instant on a phone.
- Icons-and-emoji: prefer a word. This is a tool, not a storefront.

---

## 6. Theming mechanics (how it actually works)

- The mode (`light` | `dark`, default **dark**) lives in the `fm_theme` cookie and
  is read on the server, so the first paint is already correct — **no flash, no
  client-side theme script**.
- The root layout resolves `mode + team` and **inlines every token** on `<html>`,
  then sets `data-theme` so Tailwind's `dark:` variant can key off it.
- The toggle is a plain form posting to a server action. It works without
  JavaScript.
- The PWA manifest and `theme-color` are generated per request from the same
  resolution.

**Therefore: never hardcode a colour in a component.** Use a token utility
(`bg-accent`, `text-muted`, `border-line`, `bg-surface-2`, `text-tone-good`) or a
component class (`.card`, `.btn`, `.field`, `.note`). If you catch yourself typing
`text-white/60`, `border-emerald-400`, or any literal hex, stop and use a token.

## 7. Adding or changing a team's colours

1. Put the club's **true** colours in `src/data/teamColors.ts` (primary + secondary).
2. Add any abbreviation aliases other feeds use.
3. Run `npm test` — the WCAG gate will tell you immediately if it holds.
4. Optionally `npm run scrape:colors` to re-derive from Wikipedia and diff, and
   `npm run audit:colors` to see every ratio.

Fictional or unlisted teams fall back to the neutral palette by design — the demo
franchise should not pretend to be somebody's real club.

## 8. Checklist for any UI change

- [ ] Accent for brand/interactive; semantic tones for meaning. Not mixed.
- [ ] No literal colours or `white/opacity` utilities.
- [ ] Text meets AA on the surface it actually sits on, in both modes.
- [ ] Numbers are `tabular-nums`; headings are serif; labels are sans.
- [ ] Focus states present and accent-coloured.
- [ ] Works with the neutral (demo) team and with a low-contrast team like the
      Raiders or the Steelers.
- [ ] `npm test` green, including the theme contract.
