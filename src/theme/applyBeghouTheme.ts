import { colors } from './tokens';

/**
 * Writes Beghou app tokens as CSS custom properties on :root.
 *
 * The Beghou Kendo theme (ThemeBuilder, `beghou-theme/dist/css/beghou-theme.css`)
 * now owns every `--kendo-*` variable, so this no longer touches those — doing so
 * via inline :root styles would override the theme. It supplies only the
 * app-namespace tokens (`--beghou-*`, `--border-*`) that index.css and the chrome
 * components consume and that the theme does not define.
 */
export function applyBeghouTheme(): void {
  const root = document.documentElement;

  const vars: Record<string, string> = {
    // Beghou-specific border tokens
    '--border-form-input': colors.border.formInput.value,
    '--border-container': colors.border.container.value,
    '--border-emphasized': colors.border.emphasized.value,

    // App-level convenience tokens (used by chrome components)
    '--beghou-navy': colors.brand.navy.value,
    '--beghou-navy-hover': colors.brand.navyHover.value,
    '--beghou-on-navy': colors.brand.onPrimary.value,
    '--beghou-surface-app': colors.surface.app.value,
    '--beghou-surface-card': colors.surface.card.value,
    '--beghou-surface-soft': colors.surface.soft.value,
    '--beghou-neutral-50': colors.neutral['50'].value,
    '--beghou-neutral-100': colors.neutral['100'].value,
    '--beghou-neutral-200': colors.neutral['200'].value,
    '--beghou-focus-ring': colors.focusRing.value,
    // Alt border: the more visible container border used to frame white cards.
    '--beghou-border-alt': colors.border.emphasized.value,
  };

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}
