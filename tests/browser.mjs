import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto('https://tabs.ultimate-guitar.com/tab/the-cranberries/zombie-chords-844902', { waitUntil: 'domcontentloaded' });
  const scroll = page.getByRole('button', { name: 'Autoscroll', exact: true });
  await scroll.waitFor({ timeout: 30000 });
  await page.addScriptTag({ path: 'extension/detector.js' });
  assert.equal(await page.evaluate(() => UGZombieDetector.running()), false);
  await scroll.click();
  await page.waitForTimeout(1000);
  console.log('Active controls:', await page.locator('button').filter({ hasText: /autoscroll|pause|stop/i }).allTextContents());
  assert.equal(await page.evaluate(() => UGZombieDetector.running()), true, 'live UG autoscroll detected');
  await page.addScriptTag({ path: 'extension/detector.js' });
  assert.equal(await page.evaluate(() => UGZombieDetector.running()), true, 'running-on-load detected');
  await page.getByRole('button', { name: /^(Autoscroll|Pause|Stop)$/ }).click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => UGZombieDetector.running()), false, 'live UG pause detected');
  console.log('Live Ultimate Guitar start/pause detection passed.');
  await page.addScriptTag({ path: 'extension/transpose.js' });
  await page.addStyleTag({ path: 'extension/transpose.css' });
  await page.getByRole('button', { name: 'Transpose', exact: true }).click();
  await page.getByRole('button', { name: 'Transpose Up', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('pre span[data-ugz-original]'), null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => document.querySelector('pre span[data-name]').getAttribute('data-ugz-original')), 'Em', 'live original chord shown');
  assert.equal(await page.evaluate(() => document.querySelector('[data-ugz-key]')?.getAttribute('data-ugz-key')), 'Fm', 'live transposed key shown');
  await page.getByRole('button', { name: 'Transpose Down', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-ugz-original], [data-ugz-key]'), null, { timeout: 5000 });
  console.log('Live Ultimate Guitar transpose display passed.');
  // Fixtures cover false positives and already-running/replaced controls.
  await page.setContent('<div><button>Pause</button></div>');
  assert.equal(await page.evaluate(() => UGZombieDetector.running()), false);
  await page.setContent('<section>Transpose Speed <button>Pause</button></section>');
  assert.equal(await page.evaluate(() => UGZombieDetector.running()), true);
  await page.locator('button').evaluate(el => el.disabled = true);
  assert.equal(await page.evaluate(() => UGZombieDetector.running()), false);
  console.log('Unrelated playback, running-on-load, and disabled-control checks passed.');
} finally { await browser.close(); }
