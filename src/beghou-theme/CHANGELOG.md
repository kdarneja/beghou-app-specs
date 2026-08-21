# Changelog

Version here is the `beghou-theme/` npm package version (`beghou-theme/package.json`), not the
base `@progress/kendo-theme-default` version it's built on (tracked separately in the same file).
Bump it whenever a change here would visibly affect a consuming app. Each release also gets a
git tag on `kendo-beghou-theme` (`0.0.x`, no `v` prefix) — see that repo's CLAUDE.md.

Starts at 1.1.0 — no changelog existed before this, so earlier changes aren't retroactively
logged here. See `git log -- scripts/process-theme.mjs` for that history.

## 1.3.0 — 2026-08-20 (tag `0.0.3`)

**Fix: outline "base"-role hover still looked stuck on Beghou navy no matter what primary was
set to, on Button, Picker (DropDownList/DropDownTree), and Chip.**

Root cause: their hover fill read a static ink token (`on-base`/`on-app-surface`/
`base-on-surface`) instead of the theme's real neutral-hover token
(`--kendo-color-base-hover`, `#E8E8EC`) — that token is already used correctly everywhere else
in the theme (drawer items, stepper, grid rows). Every other role (primary/secondary/error/etc.)
already hover-fills with its own correct color; only the base role was wired wrong. Fixed by
swapping the fill to `base-hover` and carrying the existing "border tracks primary" rule through
hover/active/selected too, so it holds through interaction, not just at rest. SplitButton's main
and arrow segments were checked directly against this — both already correctly fill solid
primary on hover (KendoReact's own established, unchanged outline+primary pattern), confirmed
consistent between the two segments; no change needed there.

**Fix: Grid/TreeList checkbox-selected row showed a solid dark block instead of a light tint of
primary.**

Two ThemeBuilder-native rules were stacking instead of agreeing: the `<tr>` itself got a
full-strength primary fill, while its `<td>` cells separately layered a 25%-opacity tint on top
of that already-solid row — compounding into a dark block regardless of what primary was set to.
Fixed by leaving the row transparent so the cell-level 25% tint (already correct) is the only
thing that paints, against the row's normal background — a proper light "variant of primary"
tint, matching what was actually requested.

## 1.2.0 — 2026-08-20 (tag `0.0.2`)

**Fix: NumericTextBox spin buttons (and 7 other components) rendered permanently solid-navy,
ignoring `fillMode`.**

`scripts/process-theme.mjs`'s selector-relaxing step stripped ThemeBuilder's legacy
`.k-state-hover`/`.k-state-focus` classes down to nothing instead of dropping those
comma-separated selector parts outright. For most stripped classes that's fine (there's always
another class left to keep the selector scoped), but here the state class was often the *only*
thing scoping it — so the "relaxed" rule became unconditional and fired at all times, not just on
hover/focus. Most visible on NumericTextBox's outline spin buttons (always solid regardless of
`fillMode="outline"`); 7 other selectors had the same latent bug (SplitButton, Scheduler view
switcher, Menu popup, DropDownButton menu-button hover). Not a ThemeBuilder export issue — the
raw override selectors are correct; this was purely a bug in our own post-processing.

## 1.1.0 — 2026-08-20

**Fix: primary-color override was bleeding into body text and headings theme-wide.**

A prior change (commit `b4257bd`) redirected `--kendo-color-on-app-surface`, `-on-base`,
`-subtle`, and `-base-on-subtle` to `var(--kendo-color-primary)` at `:root`, intending to fix
outline-button/picker accents. Those tokens are also the theme's general "ink" color, used 378
places theme-wide, so ordinary headings and paragraph text shifted color with any primary
override too — reported by consuming developers as a regression. Reverted; those four tokens are
static Beghou navy again.

Replaced with the actually-requested, narrowly-scoped behavior (from written requirements,
Aug 2026):
- Outline buttons (all roles except semantic error/success/warning/info/inverse): border-color
  now tracks primary.
- ComboBox/AutoComplete popup selection and Grid/TreeList checkbox-selected rows: text color
  fixed to the contrast-aware `--kendo-color-on-primary` instead of a hardcoded white, so it
  stays legible on light primary overrides. (DropDownList, MultiSelect, Calendar, and DatePicker
  already shipped this correctly out of the box — no change needed there.)
- Confirmed Loader already tracks primary automatically via the existing `primary-on-surface`
  formula — no change needed.
- General component borders (inputs, pickers, etc. theme-wide) reverted to static navy — not on
  the requirements list.
