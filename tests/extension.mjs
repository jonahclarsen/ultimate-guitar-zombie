import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const profile = await mkdtemp(path.join(tmpdir(), 'ug-zombie-test-'));
const extension = path.resolve('extension');
const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const page = await context.newPage();
  await page.route('https://tabs.ultimate-guitar.com/**', route => route.fulfill({ contentType: 'text/html', body: '<button onclick="this.textContent=this.textContent===\'Autoscroll\'?\'Pause\':\'Autoscroll\'">Autoscroll</button>' }));
  await page.goto('https://tabs.ultimate-guitar.com/tab/test/song-chords-123');
  await page.bringToFront();
  // Inspect service worker state through its lexical environment; content messages still use real Chrome transport.
  const waitFor = async expected => {
    for (let i = 0; i < 40; i++) {
      if (await worker.evaluate(() => owner !== null) === expected) return;
      await page.waitForTimeout(100);
    }
    assert.equal(await worker.evaluate(() => owner !== null), expected);
  };
  await waitFor(true); // Reading without autoscroll is protected immediately.
  await page.getByRole('button').click(); await waitFor(true);
  await page.getByRole('button').click(); await waitFor(true); // Pause starts the idle allowance.
  await page.getByRole('button').click(); await waitFor(true);
  const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront(); await waitFor(false);
  await page.bringToFront(); await waitFor(true);
  await page.goto('https://tabs.ultimate-guitar.com/'); await waitFor(false);
  console.log('Unpacked extension: reading, autoscroll, pause allowance, tab switch, refocus and navigation passed.');
} finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
