# Handoff — Beghou App/UX Specs (`kendo-ux-playground`)

**Purpose:** everything a fresh Claude Code CLI session needs to pick this project up cold.
Written 2026-09-22 by the cloud (web) session before handing off to the local CLI.

**Read order if you're short on time:** §1 → §9 → §10 → §13.

---

## 1. TL;DR — where things stand

| | |
|---|---|
| Repo | **`kdarneja/beghou-app-specs`** — renamed on GitHub. `kendo-ux-playground` still redirects, but pushes print a "This repository moved" warning. Update the remote: `git remote set-url origin https://github.com/kdarneja/beghou-app-specs.git` |
| Local path | `/Users/kdarneja/Developer/claude-workspace-beghou/Github/kendo-ux-playground` |
| Default branch | `main` — **solo-dev convention: commit straight to `main`** |
| HEAD at handoff | `b59bf20` "Admin IC dirty-save + Goal Refinement dev-handoff scaffold bar" (2026-08-21) |
| Working tree | Clean. `main` and the cloud branch `claude/clone-repo-setup-HOB9Z` are **identical** (0 ahead / 0 behind) |
| Owner | KD Singh Arneja (UX Consultant) — sole maintainer |
| What it is | A **prototype playground**, not production. Mock data everywhere. Its output is UX specs for the dev team. |

**Nothing is pending from the cloud session except this document.** Two design requests were
raised but deliberately *not* implemented in the cloud — see §10.

---

## 2. Why the handoff (session/tooling context)

The work started in a **Claude Code cloud/web session** (ephemeral Linux container).
That environment cannot see `/Users/...`, so any locally-uploaded reference files were
invisible to it. Beghou does not permit the Claude Code desktop app, so everything is
moving to the **Claude Code CLI on macOS**.

Tooling notes carried over:

- **Org auth.** The Mac enforces organization `841fffcb-c2e7-4982-8592-04f7e54c7bc9`.
  Sign in as **kd.singh@beghou.com**, not the personal Pro account. If you hit
  *"Unable to verify organization for the current authentication token"*:
  `claude auth login`, or wipe `~/.claude/.credentials.json` and relaunch.
  Check `env | grep -i anthropic` and `~/.claude/managed-settings.json` for the enforcing policy.
- **Model.** `/model` → Claude Opus 4.7 (1M context) if the Beghou org has it.
- **Permission noise.** `/permissions` → add to *project* scope:
  `Bash(node:*)`, `Bash(node -e:*)`, `Bash(pnpm:*)`, `Bash(npx:*)`,
  `Bash(git status)`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(ls:*)`.
  `Shift+Tab` cycles Normal → Accept Edits → Plan. The `/fewer-permission-prompts`
  skill will generate an allowlist from your transcript.
  Note `.claude/` is **gitignored**, so project permissions stay local.
- A `CLAUDE.md` was created manually in the local `Github/` folder. The CLI auto-loads
  `CLAUDE.md` from the repo root and `~/.claude/CLAUDE.md` at launch — no command needed.
  `/memory` edits them; a `#`-prefixed message appends a line.

---

## 3. Stack and the version locks (do not casually bump)

```
React 19.2 · TypeScript 5.6 · Vite 5.4 · react-router-dom 6.30
KendoReact 15.1.0 (every @progress/kendo-react-* pinned EXACTLY, no caret)
@progress/kendo-svg-icons ~5.3.0
@progress/kendo-theme-default 14.5.0
pnpm 11.1.3 · Node >= 22.13 required (pnpm 11 uses node:sqlite; Node 20 fails install)
```

**The pins are load-bearing.** From `beghou-theme-cli-review.md`:

- **P0 — outline icons render invisible on `kendo-svg-icons` 5.4+.** The Beghou theme was
  built against 5.3 *filled* icons. Bumping the icon package silently blanks icons.
- KendoReact 15.1.x ↔ icons 5.3.x is a real but **unenforced** coupling — nothing will
  error, it will just look wrong.
- The theme sets `--kendo-font-family: inherit`, so **the app must supply the font itself**.
  That's why `@fontsource-variable/inter` is imported first in `main.tsx`.

If you must upgrade, read `beghou-theme-cli-review.md` end to end first.

---

## 4. Commands

```bash
pnpm install              # needs Node >= 22.13
pnpm dev                  # Vite on :5173, opens browser
pnpm build                # tsc -b && vite build && cp dist/index.html dist/404.html
pnpm preview
pnpm verify               # Playwright smoke test — run with `pnpm dev` already up
```

`pnpm verify` (`scripts/smoke.mjs`) loads all **12 routes** in headless Chromium and fails
on any uncaught error / `console.error` / failed request. Three noise patterns are
deliberately ignored: favicon 404s, `[vite]` chatter, and a known
`kendo-react-map` "Cannot update during an existing state transition" React 19 dev warning
(setState during mount transition; dev-only, does not affect the build).

**Green `pnpm verify` + clean `pnpm build` is the bar before every commit.**

Other scripts: `scripts/screenshot.mjs <route> <out.png>`, `scripts/visualize.mjs`,
`scripts/visualize-toolbars.mjs`.

**Kendo license:** `telerik-license.txt` / `kendo-ui-license.txt` are gitignored. CI writes
the file from the `KENDO_LICENSE` repo secret; without it you get a watermark, not a failure.

---

## 5. Repository map

```
/
├── index.html
├── package.json            pinned Kendo versions (§3)
├── vite.config.ts          base '/' in dev, '/beghou-app-specs/' in build
├── pnpm-workspace.yaml     allowBuilds: kendo-licensing, esbuild
├── tsconfig{,.app,.node}.json
│
├── src/
│   ├── main.tsx            IMPORT ORDER MATTERS — Inter → beghou-theme.css → index.css
│   ├── App.tsx             shell: AppBar + Drawer + <Routes>
│   ├── routes.tsx          single source of truth for nav/launcher (see below)
│   ├── index.css           2,722 lines — ALL chrome + page styles live here
│   ├── components/
│   │   ├── AppBar.tsx              111 lines
│   │   ├── Drawer.tsx              122
│   │   └── SaveNotification.tsx     20  — Kendo semantic success, under the AppBar
│   ├── data/territories.ts          12  — shared territory IDs
│   ├── assets/             beghou-arc-logo.svg, launch-planning.svg
│   ├── beghou-theme/       ThemeBuilder output, VENDORED + COMMITTED
│   │   └── dist/css/beghou-theme.css   ← the only file the app imports
│   └── pages/              12 files, ~4,750 lines (see §7)
│
├── scripts/                smoke.mjs, screenshot.mjs, visualize*.mjs
├── context/
│   ├── memory/session-summary.md   ← running state-of-work log (KEEP UPDATING)
│   ├── scratchpad/
│   └── RM Goal view example(Sheet1).csv
├── .github/workflows/deploy.yml    Pages deploy on push to main
│
└── docs (root-level, all meaningful):
    beghou-kendo-playground-brief.md   28KB — the bootstrap brief: AppBar/Drawer specs,
                                        anatomy, states, anti-patterns. THE style bible.
    beghou-theme-adoption.md            how to adopt the theme + known gaps
    beghou-theme-cli-review.md         17KB — P0–P3 findings on the theme/CLI. Read before
                                        any version bump.
    manage-view-prd.md                  PRD for the Manage Views dialog
    beghou-color-tokens.json            brand / surface / neutral / semantic / 20-series chart palette
    beghou-typography-tokens.json
```

> `1alias` at the repo root is a stray ssh-agent dump (`Identity added: ...id_ed25519_resonata`).
> Harmless, unrelated to this project, safe to delete.

### `.gitignore` subtlety

`/dist` is **anchored to the root on purpose** — an unanchored `dist` previously excluded
`src/beghou-theme/dist/`, which broke the CI build (commit `8bf4dd9`). The theme's compiled
CSS *must* stay committed. Don't "fix" that pattern.

---

## 6. Architecture conventions

**Routing.** `src/routes.tsx` exports `routes` (all pages), `navRoutes` (Home pinned first,
everything else **sorted lexically by label**), and `launcherRoutes` (navRoutes minus Home).
Adding a page = add one entry to `routes` with `{path, label, icon, description, component}`.
Nav order, the drawer, and the landing launcher cards all follow automatically — **never
hand-order them**. Add the route to `ROUTES` in `scripts/smoke.mjs` too.

Label convention is `Area-Page`: `Alignment-Map Windows`, `Portal-Calendar`,
`Portal-Admin-Edit Product Roles`, `IC-Goal Refinement`.

**Admin/Settings routes are deliberately excluded** from `routes` and registered directly in
`App.tsx` (`/settings`, `/settings/incentive-compensation`). They're reached via the AppBar
gear, not the launcher or drawer.

**Styling.** No CSS modules, no Tailwind, no styled-components. One global `src/index.css`,
BEM-ish prefixes (`beghou-shell`, `beghou-page`, `beghou-toolbar`, `lp-*` for Launch
Planning, etc.). It consumes the theme's `--kendo-*` variables **directly** — there is no
JS theme step. `applyBeghouTheme()` was removed in `b9e7b57`; don't reintroduce it.

App-level custom properties are few: `--beghou-neutral-50/100/200`, `--beghou-surface-card`,
`--beghou-surface-soft`, `--beghou-border-alt`, `--beghou-focus-ring`. Everything else
comes from the theme or the token JSONs.

**Semantic palette** (`beghou-color-tokens.json`): success `#11A13C`, warning `#FFA202`,
error `#FF0000`, info `#3282FA`; brand navy `#020434`, magenta `#E60F65` (**brand accent
only** — never a generic UI accent). Charts have their own 20-colour series list that must
**never** be used for UI elements.

**Base path.** Vite `base` is `/` in dev and `/beghou-app-specs/` in build. `main.tsx`
derives the router `basename` from `import.meta.env.BASE_URL` and trims the trailing slash.
If you touch either, check both dev and the Pages build.

---

## 7. Page inventory

| Route | File | LOC | What it is |
|---|---|---:|---|
| `/` | `Home.tsx` | 18 | Card launcher, driven by `launcherRoutes` |
| `/stacked-windows` | `StackedWindows.tsx` | 568 | **Alignment-Map Windows** — Kendo Map + stacked Kendo Windows (Zip / HCP / Accounts) + docked Summary panel |
| `/map-toolbars` | `MapToolbars.tsx` | 204 | Floating toolbar over a map, popup tool palette |
| `/alignment-manage-views` | `AlignmentManageViews.tsx` | 294 | Saved-view management — spec'd in `manage-view-prd.md` |
| `/calendar` | `Calendar.tsx` | 584 | Commercialization calendar on Kendo Scheduler |
| `/launch-planning` | `LaunchPlanning.tsx` | 673 | **Systems roadmap on Kendo Gantt** — grouped by function, per-system status |
| `/small-calendar` | `SmallCalendar.tsx` | 373 | Portal dashboard: compact calendar + Events/Updates feed |
| `/app-visualizations` | `AppVisualizations.tsx` | 431 | Kendo chart best-practice examples |
| `/edit-product-roles` | `EditProductRoles.tsx` | 303 | Single-dialog role assignment flow |
| `/goal-refinement` | `GoalRefinement.tsx` | **1,250** | **IC Goal Refinement** — the most complex page (§8) |
| `/settings` | `SettingsHome.tsx` | 65 | Admin landing (AppBar gear) |
| `/settings/incentive-compensation` | `SettingsIncentiveCompensation.tsx` | 184 | IC config + dirty-save |

### Page deep-dives worth knowing before you edit

**`StackedWindows.tsx`** — the trickiest layout code in the repo.
- Three windows keyed `'zip' | 'hcp' | 'acc'`; HCP and Accounts are toggled by checkboxes
  ("When HCP data is present" / "When Accounts data is present").
- `visibleSlots` is the ordered list of shown windows; `slotPosition(slotIdx, totalSlots,
  stage, rect)` divides the map width into `totalSlots` equal cells (`GUTTER = 5`).
- Stages: `MINIMIZED` (titlebar only, 44px, parked at the bottom of its slot), `DEFAULT`
  (250px tall, ~4-5 rows, grows up from the minimized chip), `FULLSCREEN`.
- **`resetKey`**: bumped on every slot-snap to force a *remount*. Kendo's
  `componentDidUpdate` only syncs `left`/`top` — `width`/`height` props are never written
  back to state, so a controlled approach ships stale geometry through `onResize` and
  collapses the window to its mount-time size. A re-render alone is not enough.
- **`ZERO_DODGE = 1`**: Kendo Window silently ignores `top: 0` / `left: 0`
  (`this.props.top || this.state.top` treats 0 as falsy). Always use 1.
- There's a documented key-collision trap: Accounts' `resetKey` starts at 1 and would
  collide with HCP's just-bumped key, remounting HCP into Accounts' position with HCP's
  preserved state. See the comment around line 426.

**`LaunchPlanning.tsx`** — Gantt with functional groups (Medical Affairs, Commercial
Operations, Sales & Sales Training, …). Each system row carries a `status` of
`'On track' | 'Watch' | 'At risk'` and a `lp-shade-{0..3}` class that tints the first
(label) column. Launch-gate vertical reference lines are injected as an absolute overlay
(`.lp-gates` / `.lp-gate`, magenta `#e60f65`, `z-index: 5`). Wired: status filter, function
filter, view label, gate overlay. The export control is scaffold only.

**`GoalRefinement.tsx`** — DM and RM views behind an "Impersonate" role toggle, master-detail
RM grid, ±10% guardrail band, `rebalanceWithinBand()` auto-redistribute that resolves to
all-green, profile dialogs, a Product dropdown (display-only). See §9 for the SME questions
still open on it.

---

## 8. Deployment

`.github/workflows/deploy.yml` — on push to `main` (or manual dispatch):
checkout → pnpm 11.1.3 → **Node 22** → write `telerik-license.txt` from the `KENDO_LICENSE`
secret → `pnpm install --frozen-lockfile` → `pnpm build` → upload `dist` → deploy to Pages.

`pnpm build` copies `dist/index.html` to `dist/404.html` so client-side routes deep-link
correctly on Pages.

Concurrency group `pages`, `cancel-in-progress: false`.

---

## 9. State of work (from `context/memory/session-summary.md`)

Everything described in that file as "in progress / uncommitted" as of 2026-08-20 **has
since been committed** — the tree is clean and the Goal Refinement SME batch landed in
`1fc9496`. Treat the "UNCOMMITTED" section of that file as stale and refresh it.

### Settled and on `main`

- Repo presents as **beghou-app-specs** (Pages base `/beghou-app-specs/`); the local folder
  is still named `kendo-ux-playground`. Window title and landing label: "Beghou App/UX Specs".
  Avatar initials "KD".
- On the Beghou ThemeBuilder theme, compiled-CSS import only, no JS token step.
- Goal Refinement DM + RM views complete as a mock: Impersonate toggle, master-detail RM
  grid, both guardrails, Auto Redistribute, dialogs, Product dropdown, renamed column set
  (Territory ID, Prev Quarter *, Baseline Volume, Proposed Goal, Adjusted Goal, Volume
  Adjusted, % Adjusted, % Growth over Prev Quarter, Action).
- Admin Settings area with IC config, dirty-save, green success notifications.
- `% Adjusted` limit to Proposed Goal defaults to **10%**.

### Open questions parked for SME (unchanged — still open)

1. Does **Auto Redistribute** belong in the RM view at all, and should it move goals
   *between* DMs?
2. Real **% Growth over Prev Quarter** denominator. The mock uses
   `(Adjusted − Proposed) / Proposed`, which makes it identical to `% Adjusted`.
3. **Prev Quarter Attainment** formula is *assumed* to be `Prev Q Volume / Prev Q Goal`.
4. RM district **Action** has no district-level profile in the build, so it currently just
   drills into (expands) the district.
5. The **Product dimension** is a significant backend/key change per SME — out of scope for
   the mock, but the UI carries it.
6. Manage Views v1 has its own open-questions list in `manage-view-prd.md` §"Open questions
   for SME".

---

## 10. ⚠️ Two design requests raised but NOT implemented

Both were typed into the **cloud** session by mistake while the real work was moving to the
CLI. Neither was actioned there. **Verify current behaviour before building anything** —
for both, code that looks like it already satisfies the request exists in the repo, so the
right first move is to reproduce the problem, not to write new code.

### 10a. Zip / HCP window widths (`src/pages/StackedWindows.tsx`)

> *"When HCP is off, Zip takes entire width. When HCPs is on, both take 50% each.
> When minimized they minimize in place to the width they had."*

**Reading of current code:** `slotPosition()` already computes
`cellWidth = floor(W / totalSlots)`, and `totalSlots` is driven by `visibleSlots`. So Zip
alone → full width; Zip + HCP → 50/50. The `MINIMIZED` branch returns that same slot
`width` and only collapses `height` to `TITLEBAR_HEIGHT` — i.e. it already minimizes in
place at the width it had.

**So the request reads as a bug report, not a new feature.** Prime suspects, in order:
1. The `resetKey` remount fighting the geometry (see §7) — the window may be re-mounting at
   its stale `initialWin` width of `200`.
2. `Accounts` being counted in `totalSlots` when it shouldn't be for the scenario tested.
3. Kendo Window overriding controlled `width` (the `FULLSCREEN` comment notes it does
   exactly this from `appendTo`).

Reproduce first: `pnpm dev` → `/stacked-windows` → toggle the HCP checkbox, then minimize.
Confirm with KD which of the three windows misbehaved.

### 10b. Traffic-light circles on Launch Planning rows (`src/index.css`)

> *"For the colored rows, add 3x3 circles for all those cells, before the text as to show
> 'traffic light' effect. Use the darker version of semantic-light that is on the
> backgrounds of those cells."*
>
> (Accompanied by a screenshot of the Launch Planning Gantt label column: MSL Platform,
> MSL CRM, Medical Information Hub, Grants Portal, Ad Board Platform, Master Data Mgmt,
> Commercial Data Warehouse, Reporting & Analytics, IT Needs Assessment — with **no dots
> visible**.)

**This CSS already exists**, added back in `77e6a2c` (2026-06-29), at `src/index.css` ~1374–1404:

```css
/* pale cell shades */
.lp-gantt .lp-shade-0 > td:first-child { background: #e1f0fc !important; }  /* blue   */
.lp-gantt .lp-shade-1 > td:first-child { background: #e4f6e9 !important; }  /* green  */
.lp-gantt .lp-shade-2 > td:first-child { background: #fbe3e3 !important; }  /* red    */
.lp-gantt .lp-shade-3 > td:first-child { background: #fcf3d4 !important; }  /* yellow */

/* the dot: 8x8, injected via ::after on the last treelist-toggle spacer */
.lp-gantt .lp-system-row > td:first-child .k-treelist-toggle:last-of-type { width: 24px; }
.lp-gantt .lp-shade-0 ... ::after { background: #1f77b4; }
.lp-gantt .lp-shade-1 ... ::after { background: #16a34a; }
.lp-gantt .lp-shade-2 ... ::after { background: #dc2626; }
.lp-gantt .lp-shade-3 ... ::after { background: #d9a406; }
```

The dot colours are already "the darker version" of each pale shade, as asked.

**Hypothesis to verify (not confirmed — the app was never run in the cloud session):** the
dots aren't rendering because the selector
`.k-treelist-toggle:last-of-type` no longer matches the DOM Kendo 15.1 emits, or because
the `::after` has no positioned ancestor (it uses `position: absolute` but nothing in the
rule sets `position: relative` on the toggle). Inspect the rendered row in devtools before
changing anything.

Also clarify with KD: **"3x3"** most likely means a ~3px dot (current is 8px), but it could
mean a 3×3 arrangement. Ask rather than guess — it's a one-line difference either way.

---

## 11. Traps and gotchas (collected)

1. **Don't bump `@progress/kendo-svg-icons` past 5.3.x** — outline icons go invisible (P0).
2. **Don't bump KendoReact off 15.1.0** without re-reading `beghou-theme-cli-review.md`.
3. **Don't also import `kendo-theme-default`** — it's baked into `beghou-theme.css`.
4. **Import order in `main.tsx` is load-bearing**: Inter → theme CSS → `index.css`.
5. **Don't un-anchor `/dist` in `.gitignore`** — it would stop shipping the theme CSS and
   break CI.
6. **Kendo Window treats `0` as falsy** for `top`/`left` — use `ZERO_DODGE`.
7. **Kendo Window doesn't sync `width`/`height` back from props** — hence `resetKey` remounts.
8. **Node 20 cannot install** — pnpm 11 needs Node ≥ 22.13.
9. `pnpm verify` needs `pnpm dev` already running on :5173.
10. The `kendo-react-map` React-19 setState warning is **known noise**, already filtered in
    `smoke.mjs`. Don't chase it.
11. Adding a route means touching **two** files: `src/routes.tsx` and `scripts/smoke.mjs`.
12. Magenta `#E60F65` is a **brand accent only**; chart series colours are **charts only**.

---

## 12. Working conventions

- **Commit straight to `main`.** Solo maintainer, no PR flow. KD says "commit and push"
  explicitly when he wants it — don't push unprompted.
- Commit messages are short, imperative, scoped by area:
  `"Admin IC: default % Adjusted limit to Proposed Goal to 10%"`,
  `"Goal Refinement: SME column/layout updates + Auto Redistribute resolves to all-green"`.
- Keep `context/memory/session-summary.md` current — it's the running state-of-work log and
  the fastest way for the next session to orient.
- Code comments in this repo are **unusually explanatory** and document *why* (Kendo bugs,
  layout traps, version locks). Match that density; it's deliberate and it's load-bearing
  institutional memory.
- Everything is mock data. Realism of the *data* matters less than realism of the
  *interaction* — this repo exists to settle UX specs.

---

## 13. First moves in the new CLI session

```bash
cd /Users/kdarneja/Developer/claude-workspace-beghou/Github/kendo-ux-playground
git pull origin main
node --version            # must be >= 22.13
pnpm install
pnpm dev                  # :5173
# in a second shell:
pnpm verify               # expect 12x "ok"
```

Then:

1. Confirm the org/auth and model setup from §2 are sorted.
2. Set up `/permissions` so the session isn't prompt-bound.
3. Point Claude at this file plus `beghou-kendo-playground-brief.md`.
4. Reproduce §10a and §10b before writing code, and get KD's clarification on "3x3".
5. Refresh `context/memory/session-summary.md` — its "UNCOMMITTED" section is stale.
