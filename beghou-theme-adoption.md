# Adopting the Beghou Kendo theme in this app

This app is a KendoReact-based design-spec prototyping tool. It's being brought onto the
Beghou-branded theme so prototypes match production styling. Follow this exactly — the theme
is version-locked and silently fails to apply on the wrong stack.

## 1. Confirm the stack first

| Package | Required version |
|---|---|
| `@progress/kendo-react-*` | 15.1.x |
| `@progress/kendo-svg-icons` | 5.3.x |

If this app isn't already on both, stop and upgrade first. Off-version, the theme applies
partially with no errors — just missing styles that look like bugs later.

## 2. Get the theme files

Source: `kendo-beghou-theme` repo, `beghou-theme/` folder.

There's no live pull or package registry for this — copy is the supported path (same pattern
the source repo uses for itself). Copy the whole `beghou-theme/` folder into this project, next
to `src/`, and commit it. That versions the theme with this app. To take an update later,
replace the folder wholesale and commit again.

Minimum you actually need if you want a smaller footprint: `beghou-theme/dist/css/beghou-theme.css`
alone. Skip `dist/scss/` — those are raw ThemeBuilder sources for reference/diffing only, not
built, and are missing the Beghou override layer.

## 3. Import the CSS

Once, before any of this app's own styles:

```ts
import '../beghou-theme/dist/css/beghou-theme.css';
```

Do **not** also import `@progress/kendo-theme-default` — it's already baked into this file.

## 4. Load Inter

The theme sets `--kendo-font-family: inherit` — it supplies no font. Without this step
everything renders in the browser's serif default.

```sh
pnpm add @fontsource-variable/inter
```

```ts
import '@fontsource-variable/inter/index.css';
```

```css
body {
  font-family: 'Inter Variable', Inter, system-ui, sans-serif;
}
```

## 5. Conventions the theme expects

- Use `fillMode="solid"` or `fillMode="outline"` explicitly on inputs, dropdowns, buttons, and
  chips. Outline variants get white backgrounds; both are styled to sit on white or tinted-blue
  surfaces.
- Dialog, Window, and Popover footer buttons render natural-width and right-aligned by default
  (no 50/50 stretch). Pass explicit `layout="start"`/`"center"` if you need something else.
- `DateRangePicker` has no `fillMode` — pass it via `startDateInputSettings`/`endDateInputSettings`.
- `Input` has no fill mode either — use `TextBox` instead.

## 6. Beghou-specific components (AppBar, Waffle, Calendar, Search, Notifications slider)

These aren't in the `kendo-beghou-theme` repo — no reference implementation to copy from there.
Pull `beghou-kendo-designsystem.md` from the website and hand it to this session alongside the
actual business/functional requirements before building screens that need any of these five.

## Known gaps (carry over, don't rediscover)

- Not real KendoReact components even though ThemeBuilder covers them: Wizard, MediaPlayer,
  DockManager, PropertyGrid.
- Icons must come from `@progress/kendo-svg-icons` 5.x. ThemeBuilder's preview and older Figma
  kits show thicker 4.x icon artwork — don't match against those.
