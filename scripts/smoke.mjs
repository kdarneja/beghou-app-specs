#!/usr/bin/env node
// Quick browser-side smoke test. Loads each route in headless Chromium,
// captures uncaught errors + console.error lines, and exits non-zero if any.
//
// Usage:
//   pnpm verify              # runs against http://localhost:5173 (assumes `pnpm dev`)
//   BASE=http://... pnpm verify

import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const ROUTES = ['/', '/stacked-windows', '/map-toolbars', '/alignment-manage-views', '/calendar', '/launch-planning', '/small-calendar', '/app-visualizations', '/edit-product-roles', '/goal-refinement', '/settings', '/settings/incentive-compensation'];

// Console noise we know is benign (favicon 404s, dev hot-reload chatter,
// and a known kendo-react-map bug: its internal `onHideTooltip` calls
// setState during the mount transition, which React 19 flags in dev only.
// Confirmed via stack trace (Component.setState <- p4.onHideTooltip in
// @progress/kendo-react-map@16); it only fires on the two map routes and does
// not affect rendering or the production build. React strips the message so
// it carries no stack — we match the message text itself.
const IGNORE_PATTERNS = [
  /favicon\.ico/i,
  /\[vite\]/i,
  /Cannot update during an existing state transition/i,
];

function isNoise(text) {
  return IGNORE_PATTERNS.some((re) => re.test(text));
}

async function checkRoute(page, route) {
  const errors = [];

  const onPageError = (err) => {
    errors.push(`pageerror: ${err.message}`);
  };
  const onConsole = (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isNoise(text)) return;
    errors.push(`console.error: ${text}`);
  };
  const onRequestFailed = (req) => {
    if (isNoise(req.url())) return;
    errors.push(`request failed: ${req.url()} (${req.failure()?.errorText ?? 'unknown'})`);
  };

  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('requestfailed', onRequestFailed);

  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    // Give async post-mount work (Kendo Window mounts, ResizeObserver, etc) a beat to throw.
    await page.waitForTimeout(800);
  } catch (e) {
    errors.push(`navigation: ${e.message}`);
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    page.off('requestfailed', onRequestFailed);
  }

  return errors;
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  let failed = 0;
  for (const route of ROUTES) {
    const errors = await checkRoute(page, route);
    if (errors.length === 0) {
      console.log(`ok   ${route}`);
    } else {
      failed++;
      console.log(`FAIL ${route}`);
      for (const e of errors) console.log(`     ${e}`);
    }
  }

  await browser.close();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
