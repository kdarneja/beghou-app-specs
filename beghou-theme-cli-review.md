# Beghou theme — review notes for the theme-building CLI

## What this document is

Observations, evidence, assumptions, and open questions gathered while adopting the
ThemeBuilder-authored **Beghou theme** into an **existing** KendoReact application
(`kendo-ux-playground` / "beghou-app-specs"). This is the *themeify-an-existing-app*
path, which differs from the ground-up path the CLI already handles well (the
reference app in the `kendo-beghou-theme` repo).

It is written to be **unbiased**: each item states what was observed, the evidence,
one or more candidate explanations (including "this may be intended"), the impact,
and questions to investigate. Nothing here asserts the CLI or theme is wrong — several
items may be deliberate. The goal is to give the CLI team a checklist to confirm or
refute against the ground-up assumptions the tool was built on.

## Environment observed (evidence base)

- Theme file: `beghou-theme/dist/css/beghou-theme.css`, **1,279,259 bytes**, minified
  (67 lines). Header comment: `/* Compatible with @progress/kendo-theme-default v.14.1.0 */`.
- Same file is **byte-identical** in the source repo (`kendo-beghou-theme/beghou-theme/…`)
  and in this app — so findings are about the export itself, not a stale copy.
- Reference app (`kendo-beghou-theme`): imports **only** `beghou-theme.css`; runs
  `@progress/kendo-react-* ^15.1.0`, `@progress/kendo-svg-icons ^5.3.0` (installed 5.3.0);
  its `app.css` styles chrome with `--kendo-color-primary`, `--kendo-color-on-primary`,
  `--kendo-elevation-1`, etc. **No icon shim, no JS.**
- This existing app was initially on `@progress/kendo-react-* 16.0.0` +
  `@progress/kendo-svg-icons 5.4.0` (deliberately "latest") before we aligned it down.
- `@progress/kendo-theme-default` in `node_modules` for comparison: 14.5.0.

---

## P0 — Outline icons render invisible on kendo-svg-icons 5.4+

**Observation.** With the theme as the only stylesheet, every SVG icon (chrome icons
*and* Kendo component glyphs — dropdown carets, grid sort arrows, dialog close, calendar
nav) rendered **invisible** on `kendo-svg-icons@5.4.0`. Aligning down to `5.3.0` fixed it
with no other change.

**Evidence.**
- `kendo-svg-icons@5.3.0` `searchIcon.content`: `<path d="m22.15 …"/>` — a **filled** path.
- `kendo-svg-icons@5.4.0` `searchIcon.content`: `<path … fill="none"/>` — an **outline**
  path drawn with a stroke. (Kendo appears to have switched the icon set from filled to
  outline between 5.3 and 5.4.)
- The theme's only icon paint rule is `.k-svg-icon>svg{fill:currentColor}`. It fills the
  `<svg>`, but an outline `<path fill="none">` needs a **stroke**, and the theme sets none,
  so computed `stroke: none` → nothing paints.
- `@progress/kendo-theme-default` (14.5.0) contains the rule that handles exactly this:
  ```css
  .k-svg-icon>svg [fill=none]{stroke:var(--kendo-icon-color)}
  .k-svg-icon.k-svg-icon-outline>svg [fill=none],
  .k-svg-icon.k-svg-icon-duotone>svg [fill=none]{stroke-width:var(--kendo-icon-stroke-width)}
  ```
- In `beghou-theme.css`: `grep -c 'fill=none'` → **0**; `--kendo-icon-color` → **0**;
  `--kendo-icon-stroke-width` → **0**. The rule and its variables are **absent** from the export.

**Candidate explanations.**
1. The export intentionally targets 5.3.x (filled icons) and never expected outline icons.
2. ThemeBuilder's compile/prune step dropped the `[fill=none]` selector because no
   editor-visible component referenced it (dead-code elimination that isn't dead at runtime).
3. The base-theme version ThemeBuilder compiled from predates the outline-icon rule.

**Impact.** Silent, total icon loss for any consumer on 5.4+. No console error. Matches the
adoption doc's own warning: *"Off-version, the theme applies partially with no errors —
just missing styles that look like bugs later."*

**Questions to investigate.**
- Is the omission of the `[fill=none]{stroke:…}` rule (and `--kendo-icon-color` /
  `--kendo-icon-stroke-width`) intentional, or a prune bug in the export?
- Should the export always carry the base outline-icon rule regardless of which components
  the editor touched, since icon markup is decided at runtime by the installed
  `kendo-svg-icons`, not by the theme?
- Should the theme declare a supported `@progress/kendo-svg-icons` range and fail loudly
  (or warn) outside it?

---

## P1 — The 5.3.x / 15.1.x version lock is real but unenforced

**Observation.** The theme works cleanly *only* on the versions the adoption doc names
(KendoReact 15.1.x, icons 5.3.x). Nothing in the delivered artifact enforces or signals
that. An existing app on a newer Kendo compiles and runs with no error and just looks broken.

**Evidence.**
- `beghou-theme/package.json` declares a dependency on `@progress/kendo-theme-default: 14.1.0`
  only. No constraint on `@progress/kendo-react-*` or `@progress/kendo-svg-icons`.
- The version drift (16.0.0 / 5.4.0) produced the P0 icon failure with no diagnostic.

**Candidate explanations.**
1. Version locking is expected to live in human docs (the adoption `.md`), not the package.
2. The CLI assumes it controls the whole app (ground-up), where it also pins the versions.

**Impact.** The *existing-app* path has no guardrail. A team upgrading Kendo later would
silently regress the theme.

**Questions to investigate.**
- Should the exported theme package carry `peerDependencies` / `engines` or a machine-readable
  compatibility matrix (theme version ↔ kendo-react ↔ kendo-svg-icons ↔ kendo-theme-default)?
- Could the CLI emit a tiny runtime/build check that compares installed Kendo versions to the
  theme's supported range and warns?

---

## P1 — Theme supplies no font; `--kendo-font-family: inherit`

**Observation.** The theme sets `--kendo-font-family: inherit` and ships no font faces.
If the consuming app doesn't supply a font on `body`, everything renders in the browser
serif default. In this app, `body` was `font-family: var(--kendo-font-family)`, which
resolved to `inherit` → serif until we set an explicit Inter stack.

**Evidence.** `--kendo-font-family: inherit`, `--kendo-font-size: 0.875rem` in the export.
Adoption doc step 4 tells consumers to `pnpm add @fontsource-variable/inter` and set
`body { font-family: 'Inter Variable', … }`.

**Candidate explanations.**
1. Intentional: Beghou brand font is licensed/loaded by the host app, so the theme stays
   font-agnostic via `inherit`.
2. The editor had no font asset to embed.

**Impact.** For an existing app that already sets `--kendo-font-family` (or relies on the
theme to), the `inherit` default is a silent trap.

**Questions to investigate.**
- Is `inherit` the intended contract? If so, can the export document the expected `body`
  font rule inline (a comment) rather than only in the separate adoption doc?
- Would shipping the font token (or an optional font CSS) reduce the number of manual steps,
  given the stated goal of "drop in and use, nothing else"?

---

## P2 — Design tokens the theme doesn't expose (ThemeBuilder editor scope)

**Observation.** Adopting the theme still required app-side values the theme does not define:
a light-blue surface tint, a neutral gray scale, a focus ring, a soft surface, and a
form-input border color. These are legitimate Beghou design values that TB's editor didn't
surface, so they live in the app's CSS.

**Evidence.** Values the app needed with no theme equivalent:
`#EDF0FA` (card tint), `#F7FBFF` (soft surface), `#F6F6F7 / #E8E8EC / #C5C5CF` (neutrals),
`rgba(2,4,52,0.30)` (focus ring), `rgba(2,4,52,0.5)` (form-input border).
Also missing from the export: `--kendo-color-border-subtle`, `--kendo-color-border-strong`.

**Related observation (possible token bug).** `--kendo-color-primary-subtle: #020434` in the
export — i.e. the "subtle" primary equals the full primary, not a tint. A "subtle" token that
equals its base color looks suspicious and may indicate an editor default that wasn't set.

**Also noted (not a problem, just informative).** The export *does* emit two custom vars:
`--beghou-component-border` and `--beghou-component-hover-border`
(`color-mix(in srgb, var(--kendo-color-primary) …%, transparent)`). So TB can emit
`--beghou-*` tokens — good to know the mechanism exists.

**Candidate explanations.**
1. TB only lets you customize what its editor exposes; neutrals/tints/focus aren't editable,
   so they can't be in the export by design.
2. `--kendo-color-primary-subtle` may be an unset editor default.

**Impact.** A themed existing app still forks a small set of its own design tokens. The
"all variables come from the theme" expectation isn't literally met — by design, but worth
confirming.

**Questions to investigate.**
- Which token families does the ThemeBuilder editor expose vs omit (neutrals, subtle tints,
  focus ring, border-subtle/strong)? Can the exposed surface be widened so themed apps don't
  fork their own?
- Is `--kendo-color-primary-subtle == --kendo-color-primary` intended, or an unset value?
- Are `--kendo-color-border-subtle` / `--kendo-color-border-strong` intentionally omitted?

---

## P2 — Existing-app override collisions (the core of the themeify use case)

**Observation.** An existing app carries its own styling that can silently override or fight
the theme when the theme is dropped in. Two mechanisms bit us specifically:

1. **JS-injected `--kendo-*` overrides win over the theme.** This app had a startup function
   writing `--kendo-color-primary` (and others) onto `:root` via inline element style. Inline
   styles beat stylesheet rules, so the app was **silently overriding the theme** while
   appearing to use it. We deleted that function and pointed the app CSS at the theme's vars.
2. **Pre-existing `.k-*` CSS.** The app has ~90 rules targeting Kendo classes (layout, per-screen
   design, a few deliberate recolors). These coexist with the theme; some are redundant now,
   some are intentional, none are theme fixes — but a migrator can't easily tell which is which.

**Impact.** The themeify path has failure modes the ground-up path never sees: hidden inline
`--kendo-*` overrides, specificity fights, and stale component overrides that mask the theme.

**Questions to investigate.**
- Could the CLI offer a **themeify audit** for an existing repo: detect (a) any code writing
  `--kendo-*` custom properties at runtime, (b) `.k-*` CSS rules that set color/background/border
  and may conflict, (c) a second Kendo theme import? Report them for human review.
- What's the recommended import order and specificity guidance when the app already has a
  large stylesheet? (We load theme before app CSS; is that the intended contract?)

---

## P2 — "Do not also import kendo-theme-default," but existing apps already do

**Observation.** The adoption doc says the base theme is baked into `beghou-theme.css` and
must **not** be imported separately. An existing KendoReact app almost always *already*
imports `@progress/kendo-theme-default`. Migrators must find and remove that import; if they
don't, two full themes load (double specificity, larger bundle, unpredictable cascade).

**Evidence.** `beghou-theme.css` is a full 1.2 MB compiled theme (includes all base component
rules + utilities), not an overrides-only layer.

**Questions to investigate.**
- Should the CLI detect and call out an existing `kendo-theme-default` import during themeify?
- Is there value in an **overrides-only** export variant (the Beghou delta to layer on top of a
  base the app already ships), for apps that can't or won't drop their existing base import?

---

## P3 — Convention expectations are silent

**Observation.** The adoption doc lists conventions the theme assumes (explicit
`fillMode="solid"/"outline"` on inputs/dropdowns/buttons/chips; footer buttons render
natural-width; `DateRangePicker`/`Input` have no `fillMode`; use `TextBox` instead of `Input`).
An existing app that doesn't follow these gets wrong-looking components with no error.

**Questions to investigate.**
- Can the editor/export detect or lint for these conventions in a target codebase (e.g. flag
  `<Input>` usage, or buttons/inputs without an explicit `fillMode`)?
- Are these conventions inherent to the base theme, or specific to the Beghou customizations?

---

## P3 — SCSS sources don't reproduce the shipped CSS

**Observation.** The adoption doc states the `dist/scss/` sources are "raw ThemeBuilder output
without the processed overrides" and that building from them "will silently not apply several
Beghou styles." So the shipped `dist/css/beghou-theme.css` is the source of truth and the SCSS
is non-buildable-to-parity.

**Impact.** A team that tries to rebuild from SCSS (normal instinct) gets a different, subtly
broken theme with no error.

**Questions to investigate.**
- Should the SCSS export either (a) reproduce the compiled CSS exactly, or (b) be clearly marked
  non-authoritative / reference-only in the files themselves (not just the doc)?
- Where does the "Beghou override layer" live, and can it be included in the SCSS build graph?

---

## P3 — Possible duplicate/oklch-vs-literal variable definitions

**Observation (low confidence).** While inspecting the export, `--kendo-color-primary-hover`
appeared **twice** — once as a literal (`#002889`) and once computed via
`oklch(from var(--kendo-color-primary) …)`. Same pattern for `-active` / `-emphasis`.

**Candidate explanations.**
1. Intentional layered defaults (literal base, oklch refinement) resolved by cascade order.
2. A duplication artifact from the compile step.

**Questions to investigate.**
- Are the literal and oklch-computed definitions of `-hover/-active/-emphasis` both intended,
  and is their cascade order deterministic across browsers that support `oklch(from …)` and
  those that don't?

---

## P3 — Editor covers components that aren't real KendoReact (documented gaps)

**Observation.** The adoption doc's "Known gaps" already flags that ThemeBuilder styles some
things that aren't real KendoReact components (Wizard, MediaPlayer, DockManager, PropertyGrid),
and that five Beghou-specific components (AppBar, Waffle, Calendar, Search, Notifications slider)
aren't in the theme repo at all.

**Questions to investigate.**
- Can the editor label which exposed components map to shipping KendoReact components vs not, so
  a migrator doesn't design against a component the theme can't actually deliver?

---

## Boundary note — styling vs component behavior (scope-setting, not a bug)

Some things this app needed are **runtime component behavior**, not styling, and no theme or
ThemeBuilder could address them: the Kendo Map's inner `.k-map` defaulting to 600px in a flex
container, and stacked `Window` positioning quirks (0-treated-as-unset; `appendTo` coordinate
space). These would exist in a ground-up app too. Flagged only so the themeify guidance can set
expectations that "Beghou-themeify" means styling, not behavior fixes.

---

## Summary of open questions

1. Is the missing outline-icon stroke rule (+ `--kendo-icon-color`) an intentional 5.3.x lock or
   an export prune bug? Should it always ship?
2. Should the theme package encode a version-compatibility contract (peers/engines/matrix) and
   warn on drift?
3. Is `--kendo-font-family: inherit` (no shipped font) the intended contract?
4. Which token families does the editor expose vs omit, and can neutrals/tints/focus/border-subtle
   be added? Is `--kendo-color-primary-subtle == primary` intended?
5. Can the CLI provide a **themeify audit** for existing repos (runtime `--kendo-*` overrides,
   conflicting `.k-*` rules, duplicate base-theme import)?
6. Is an overrides-only export variant worthwhile for apps that already ship kendo-theme-default?
7. Can convention expectations (`fillMode`, `TextBox` over `Input`, footer button layout) be
   linted against a target codebase?
8. Should the SCSS sources reproduce the compiled CSS, or be marked non-authoritative in-file?
9. Are the duplicate literal/oklch primary-state definitions intentional and deterministic?
10. Can the editor label non-KendoReact components it exposes?

## Assumptions behind these notes (state them so they can be challenged)

- The reference app in `kendo-beghou-theme` (15.1.x / 5.3.x, theme-only, no shims) represents the
  intended "correct" consumption. If that app is *not* the reference contract, several conclusions
  above shift.
- `beghou-theme.css` is meant to be self-contained (base + Beghou overrides), not an overrides-only
  layer. (Adoption doc supports this; confirm.)
- The observed export is current. (Both repos held a byte-identical copy, so assumed yes.)
- The Kendo 5.3→5.4 filled→outline icon change is a KendoReact-side change, not something the theme
  controls. (Confirmed by inspecting `kendo-svg-icons` package contents at both versions.)
