#!/usr/bin/env node
/**
 * Generalized contract verifier for docs/FRONTEND_CONTRACT.md.
 *
 * Runs against a live frontend (default http://localhost:3000) and backend
 * (default http://localhost:8000) it has NOT been written to assume the DOM
 * of -- selectors are resilient (role/text based, with fallbacks) and any
 * selector that finds nothing is logged loudly and counted as a failure,
 * never silently treated as "the click worked" (that's exactly how last
 * round's driver produced false passes: it matched a button on
 * /search|submit/i while the real label was "Identify Mandatory Standards",
 * the click silently no-op'd, and every downstream check ran against the
 * unchanged landing page).
 *
 * Prints a pass/fail table for every machine-checkable item in
 * docs/FRONTEND_CONTRACT.md and exits non-zero if anything failed.
 */
import { chromium } from 'playwright';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

const results = []; // { id, title, status: 'PASS'|'FAIL'|'SKIP', detail }

function record(id, title, status, detail) {
  results.push({ id, title, status, detail });
  const marker = status === 'PASS' ? 'PASS' : status === 'SKIP' ? 'SKIP' : 'FAIL';
  console.log(`[${marker}] ${id} -- ${title}${detail ? ': ' + detail : ''}`);
}

/** Click a control found by any of several strategies, in order. Logs
 * loudly and returns false (never throws, never pretends) if none match. */
async function resilientClick(page, label, locators) {
  for (const loc of locators) {
    const count = await loc.count().catch(() => 0);
    if (count > 0) {
      await loc.first().click();
      return true;
    }
  }
  console.warn(`  WARNING: no selector matched for "${label}" -- tried ${locators.length} strategies, found none.`);
  return false;
}

async function resilientFill(page, label, locators, text) {
  for (const loc of locators) {
    const count = await loc.count().catch(() => 0);
    if (count > 0) {
      await loc.first().fill(text);
      return true;
    }
  }
  console.warn(`  WARNING: no input matched for "${label}" -- tried ${locators.length} strategies, found none.`);
  return false;
}

async function submitQuery(page, query) {
  const filled = await resilientFill(page, 'query textarea', [
    page.locator('textarea'),
    page.locator('input[type="text"]'),
  ], query);
  if (!filled) return false;

  const clicked = await resilientClick(page, 'submit button', [
    page.getByRole('button', { name: /identify mandatory standards/i }),
    page.getByRole('button', { name: /get recommendation/i }),
    page.getByRole('button', { name: /^search$/i }),
    page.getByRole('button', { name: /submit/i }),
  ]);
  if (!clicked) return false;

  await page.waitForTimeout(3000);
  return true;
}

async function main() {
  // Preflight: both services must be reachable, or every check is
  // meaningless noise -- fail loudly and immediately instead.
  let health;
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    health = await res.json();
  } catch (e) {
    console.error(`FATAL: backend not reachable at ${BACKEND_URL} (${e.message}). Start it first.`);
    process.exit(2);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  // Capture raw /recommend and /audit response bodies for item 8's
  // JSON-level checks (mandatory:false, literal "None") -- these are
  // properties of the wire contract the frontend consumes, not of what
  // it renders, so they're checked against the network payload, not the DOM.
  const capturedResponses = { recommend: [], audit: [] };
  page.on('response', async (res) => {
    const url = res.url();
    try {
      if (url.includes('/recommend') && res.request().method() === 'POST') {
        capturedResponses.recommend.push(await res.text());
      } else if (url.includes('/audit') && res.request().method() === 'POST') {
        capturedResponses.audit.push(await res.text());
      }
    } catch { /* response body not readable (e.g. aborted) -- ignore */ }
  });

  try {
    await page.goto(FRONTEND_URL, { timeout: 20000 });
  } catch (e) {
    console.error(`FATAL: frontend not reachable at ${FRONTEND_URL} (${e.message}). Start it first.`);
    await browser.close();
    process.exit(2);
  }

  const landingVisible = await page.locator('body').count();
  if (!landingVisible) {
    console.error('FATAL: page did not render a body element.');
    await browser.close();
    process.exit(2);
  }

  // --- Item 7: 22K+/431 framed against actual corpus_size -------------
  // corpus_size is fetched client-side after mount (a real /health round
  // trip, not baked into the initial HTML) -- give it a moment to resolve
  // before reading the page text, or this races the fetch and false-fails.
  await page.waitForTimeout(1500);
  const landingText = await page.locator('body').innerText();
  const hasCorpusSize = landingText.includes(String(health.corpus_size));
  const hasHeadlineFigures = /22K\+/.test(landingText) || /431/.test(landingText);
  record('7', '22K+/431 framed against actual indexed count', hasCorpusSize ? 'PASS' : 'FAIL',
    hasCorpusSize
      ? `found actual corpus_size (${health.corpus_size}) on the page`
      : `corpus_size (${health.corpus_size}) not found anywhere on landing page${hasHeadlineFigures ? ' (headline figures present without qualification)' : ''}`);

  // --- Item 1 & 2 & 3: submit a normal (high-confidence) query ---------
  const submittedNormal = await submitQuery(page, '43 grade ordinary Portland cement for general RCC work');
  if (!submittedNormal) {
    record('1', '"Not determined" renders literally, no bare "None"', 'FAIL', 'could not submit query -- see selector warning above');
    record('2a', 'high-confidence result state renders', 'FAIL', 'could not submit query');
  } else {
    const bodyText = await page.locator('body').innerText();
    const hasNotDetermined = /not determined/i.test(bodyText);
    const hasBareNone = /\bNone\b/.test(bodyText);
    record('1', '"Not determined" renders literally, no bare "None"',
      (hasNotDetermined && !hasBareNone) ? 'PASS' : 'FAIL',
      `not-determined present: ${hasNotDetermined}, bare "None" present: ${hasBareNone}`);
    record('2a', 'high-confidence result state renders', bodyText.length > 500 ? 'PASS' : 'FAIL', 'result content rendered');

    // --- Item 5: allied standards, installation group ---
    const expandClicked = await resilientClick(page, 'allied standards expander', [
      page.getByText(/view allied.*standards/i),
      page.getByText(/allied.*normative/i),
    ]);
    if (expandClicked) {
      await page.waitForTimeout(1000);
      const alliedText = await page.locator('body').innerText();
      const hasInstallation = /installation/i.test(alliedText);
      record('5', 'Allied standards group by relationship, installation entries present', hasInstallation ? 'PASS' : 'FAIL',
        hasInstallation ? 'installation group found with content' : 'no "installation" text found after expanding');
    } else {
      record('5', 'Allied standards group by relationship, installation entries present', 'FAIL', 'no expand control found');
    }

    // --- Item 4: fusion_rank_score must never reach the DOM ---
    const visibleText = await page.locator('body').innerText();
    const domHtml = await page.content();
    const inVisibleText = visibleText.includes('fusion_rank_score');
    record('4', 'fusion_rank_score never appears in visible DOM text', inVisibleText ? 'FAIL' : 'PASS',
      inVisibleText ? 'found in rendered text' : `absent from visible text (raw HTML contains it: ${domHtml.includes('fusion_rank_score')}, which is fine)`);
  }

  // --- Item 3 & 2b: low-confidence / abstained state -------------------
  const submittedLow = await submitQuery(page, 'USB Type-C charging cable and connector for mobile devices');
  if (!submittedLow) {
    record('3', 'abstained=true shows "no strong match" state', 'FAIL', 'could not submit query');
  } else {
    const lowText = await page.locator('body').innerText();
    const hasNoMatchState = /no strong match/i.test(lowText);
    record('3', 'abstained=true shows "no strong match" state', hasNoMatchState ? 'PASS' : 'FAIL',
      hasNoMatchState ? 'found low-confidence banner' : 'no low-confidence banner text found');
  }

  // --- Item 2: moderate band must render distinctly from high and low -
  const submittedModerate = await submitQuery(page, 'red masonry blocks for load-bearing walls');
  if (!submittedModerate) {
    record('2', 'confidence_band high/moderate/low render distinctly', 'FAIL', 'could not submit moderate-band query');
  } else {
    const moderateText = await page.locator('body').innerText();
    const looksLikeLowBanner = /no strong match/i.test(moderateText);
    const looksLikeModerateMarker = /moderate|lower confidence|provisional|uncertain/i.test(moderateText);
    if (looksLikeLowBanner) {
      record('2', 'confidence_band high/moderate/low render distinctly', 'FAIL',
        'moderate-band query rendered the LOW-band banner -- band not distinguished at all');
    } else if (looksLikeModerateMarker) {
      record('2', 'confidence_band high/moderate/low render distinctly', 'PASS', 'distinct moderate marker found');
    } else {
      record('2', 'confidence_band high/moderate/low render distinctly', 'FAIL',
        'no distinct visual/textual marker for moderate band -- renders identically to high (see FRONTEND_CONTRACT.md item 2)');
    }
  }

  // --- Item 9: Tender Audit never emits outdated/superseded/current ---
  const auditTabClicked = await resilientClick(page, 'Tender Audit tab', [
    page.getByRole('button', { name: /tender audit/i }),
    page.getByText(/tender audit/i),
  ]);
  if (!auditTabClicked) {
    record('9', 'Audit never emits outdated/superseded/current', 'FAIL', 'could not find Tender Audit tab');
    record('8a', 'no mandatory:false or "None" in /audit response', 'SKIP', 'audit tab not reached');
  } else {
    await page.waitForTimeout(500);
    const sampleSpec = [
      '4.1 Supply of 33 grade ordinary Portland cement conforming to IS 269 : 2015 for RCC foundation work.',
      '4.2 Thermo-mechanically treated deformed reinforcement bars conforming to IS 1786 shall be used for column reinforcement, Fe 500 grade.',
      '4.3 The reinforced concrete structure shall be designed in accordance with IS 456 : 1978.',
    ].join('\n');
    const specFilled = await resilientFill(page, 'audit spec textarea', [page.locator('textarea')], sampleSpec);
    const auditRunClicked = specFilled && await resilientClick(page, 'Run Audit button', [
      page.getByRole('button', { name: /run audit/i }),
    ]);
    if (!auditRunClicked) {
      record('9', 'Audit never emits outdated/superseded/current', 'FAIL', 'could not run audit');
      record('8a', 'no mandatory:false or "None" in /audit response', 'SKIP', 'audit did not run');
    } else {
      await page.waitForTimeout(4000);
      const auditText = await page.locator('body').innerText();
      const badWords = ['outdated', 'superseded', 'current'].filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(auditText));
      record('9', 'Audit never emits outdated/superseded/current', badWords.length === 0 ? 'PASS' : 'FAIL',
        badWords.length ? `found forbidden word(s): ${badWords.join(', ')}` : 'none of the forbidden words found');

      const auditBodies = capturedResponses.audit;
      if (auditBodies.length === 0) {
        record('8a', 'no mandatory:false or "None" in /audit response', 'SKIP', 'no /audit network response captured');
      } else {
        const joined = auditBodies.join('\n');
        const hasMandatoryFalse = /"mandatory"\s*:\s*false/.test(joined);
        const hasBareNoneJson = /"certification_badge"\s*:\s*"None"/.test(joined);
        record('8a', 'no mandatory:false or "None" in /audit response', (!hasMandatoryFalse && !hasBareNoneJson) ? 'PASS' : 'FAIL',
          `mandatory:false present: ${hasMandatoryFalse}, certification "None" present: ${hasBareNoneJson}`);
      }
    }
  }

  // --- Item 8b: same check against captured /recommend responses ------
  if (capturedResponses.recommend.length === 0) {
    record('8b', 'no mandatory:false or "None" in /recommend response', 'SKIP', 'no /recommend network response captured');
  } else {
    const joined = capturedResponses.recommend.join('\n');
    const hasMandatoryFalse = /"mandatory"\s*:\s*false/.test(joined);
    const hasBareNoneJson = /"certification_badge"\s*:\s*"None"/.test(joined);
    record('8b', 'no mandatory:false or "None" in /recommend response', (!hasMandatoryFalse && !hasBareNoneJson) ? 'PASS' : 'FAIL',
      `mandatory:false present: ${hasMandatoryFalse}, certification "None" present: ${hasBareNoneJson}`);
  }

  // --- Item 6: demo-fallback banner when backend unreachable ----------
  // Intercepted at the network layer (route abort) rather than actually
  // killing the backend process -- keeps this script self-contained and
  // safe to run without managing server lifecycle.
  // The audit check above switches tabs -- switch back, or the search
  // textarea/button this step needs don't exist on the current tab.
  await resilientClick(page, 'Standards Search tab', [
    page.getByRole('button', { name: /^standards search$/i }),
    page.getByText(/^standards search$/i),
  ]);
  await page.waitForTimeout(500);
  await page.route(`${BACKEND_URL}/**`, (route) => route.abort());
  const settingsOpened = await resilientClick(page, 'settings gear', [
    page.getByRole('button', { name: /api settings|service configuration/i }),
    page.locator('[aria-label*="Settings" i]'),
    page.locator('button').last(),
  ]);
  if (settingsOpened) {
    await page.waitForTimeout(500);
    const demoToggleVisible = await page.getByText(/demo data.*backend.*unreachable/i).count();
    if (demoToggleVisible > 0) {
      const checkbox = page.locator('input[type="checkbox"]').first();
      const isChecked = await checkbox.isChecked().catch(() => false);
      if (!isChecked) await checkbox.check().catch(() => {});
      await resilientClick(page, 'save configuration', [page.getByRole('button', { name: /save configuration/i })]);
      await page.waitForTimeout(500);
    } else {
      console.warn('  WARNING: demo-fallback toggle not found in settings -- cannot force it on.');
    }
  }
  const submittedOffline = await submitQuery(page, '43 grade ordinary Portland cement for general RCC work');
  if (!submittedOffline) {
    record('6', 'Demo-fallback banner visible when backend unreachable', 'FAIL', 'could not submit query with backend blocked');
  } else {
    const offlineText = await page.locator('body').innerText();
    const hasDemoBanner = /demo data|backend unreachable|illustrative/i.test(offlineText);
    record('6', 'Demo-fallback banner visible when backend unreachable', hasDemoBanner ? 'PASS' : 'FAIL',
      hasDemoBanner ? 'demo banner text found' : 'no demo/unreachable banner text found -- request may have just failed silently');
  }
  await page.unroute(`${BACKEND_URL}/**`);

  if (consoleErrors.length) {
    console.log(`\n${consoleErrors.length} browser console error(s) observed during the run (informational, not scored):`);
    for (const e of consoleErrors.slice(0, 10)) console.log(`  - ${e}`);
  }

  await browser.close();
  printTable();
}

function printTable() {
  console.log('\n=== Frontend Contract Verification ===');
  console.log('ID   | Status | Item');
  console.log('-----|--------|-----');
  for (const r of results) {
    console.log(`${r.id.padEnd(4)} | ${r.status.padEnd(6)} | ${r.title}`);
  }
  const failed = results.filter((r) => r.status === 'FAIL');
  const skipped = results.filter((r) => r.status === 'SKIP');
  console.log(`\n${results.length - failed.length - skipped.length}/${results.length} passed, ${failed.length} failed, ${skipped.length} skipped.`);
  if (failed.length) {
    console.log('\nFAILED:');
    for (const r of failed) console.log(`  - ${r.id}: ${r.title} -- ${r.detail}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL: verifier crashed:', e);
  process.exit(2);
});
