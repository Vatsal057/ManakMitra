/**
 * End-to-end check of the DEPLOYED stack in a real browser.
 *
 *   node scripts/verify-deployment.mjs https://manakmitra-phi.vercel.app
 *
 * curl can prove the API answers and that CORS headers look right, but it
 * cannot prove the deployed bundle actually reaches the backend and renders
 * results -- a wrong baseUrl, a blocked preflight, or a render crash all
 * still pass a curl check. This drives the real UI and fails on any console
 * error or failed request, so a pass means a judge's browser will work.
 */
import { chromium } from 'playwright';

const base = process.argv[2];
if (!base) {
  console.error('usage: node scripts/verify-deployment.mjs <frontend-url>');
  process.exit(2);
}

const browser = await chromium.launch();
// Fresh context => empty localStorage, so we exercise the build-time
// VITE_API_BASE_URL default rather than a saved Settings override.
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleErrors = [];
const failedRequests = [];
const apiCalls = [];

page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('requestfailed', (r) => {
  // api.ts testConnection() deliberately probes /docs with mode:'no-cors',
  // which always surfaces as an aborted request even when the backend is
  // perfectly healthy. Not a real failure -- don't report it as one.
  if (r.url().includes('/docs')) return;
  failedRequests.push(`${r.method()} ${r.url()} -- ${r.failure()?.errorText}`);
});
page.on('response', (r) => {
  const u = r.url();
  if (/\/(recommend|translate|allied|audit|health)/.test(u)) {
    apiCalls.push(`${r.status()} ${r.request().method()} ${u}`);
  }
});

let failed = false;
const step = (ok, label, extra = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
  if (!ok) failed = true;
};

console.log(`Browser-verifying ${base}\n`);

await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
step(true, 'page loaded');

const title = await page.title();
step(title.length > 0, 'has title', JSON.stringify(title.slice(0, 60)));

// The spec field is a <textarea> (SpecificationInput.tsx), and plain Enter
// does NOT submit -- submission is Ctrl/Cmd+Enter or the action button.
const input = page.locator('textarea').first();
await input.waitFor({ state: 'visible', timeout: 20000 });
step(true, 'spec textarea visible');

await input.fill('ordinary portland cement for general construction work');

// Click the real submit button rather than relying on the keyboard shortcut,
// so this also proves the button's disabled-state logic released.
const submit = page.getByRole('button', { name: /identify mandatory standards/i });
await submit.waitFor({ state: 'visible', timeout: 20000 });
step(!(await submit.isDisabled()), 'submit button enabled after typing');
await submit.click();

// Wait for a real /recommend response rather than a fixed sleep.
let recommendOk = false;
try {
  const resp = await page.waitForResponse(
    (r) => r.url().includes('/recommend'),
    { timeout: 90000 }
  );
  recommendOk = resp.status() === 200;
  step(recommendOk, 'POST /recommend from browser', `HTTP ${resp.status()}`);
} catch (e) {
  step(false, 'POST /recommend from browser', 'no response within 90s');
}

// The canonical answer for this query in the corpus. Asserting on real
// content, not just "something rendered", so an empty/error state fails.
await page.waitForTimeout(2500);
const bodyText = await page.locator('body').innerText();
step(/IS\s*269/.test(bodyText), 'rendered expected standard (IS 269)');

console.log('\n  API calls observed:');
if (apiCalls.length === 0) console.log('    (none)');
for (const c of apiCalls) console.log(`    ${c}`);

// CORS failures surface here, not as a non-200, so this matters.
if (failedRequests.length) {
  console.log('\n  Failed requests:');
  for (const f of failedRequests) console.log(`    ${f}`);
  failed = true;
}
if (consoleErrors.length) {
  console.log('\n  Console errors:');
  for (const c of consoleErrors.slice(0, 10)) console.log(`    ${c}`);
  failed = true;
}

await browser.close();
console.log(`\n${failed ? 'FAILED' : 'ALL PASSED'}`);
process.exit(failed ? 1 : 0);
