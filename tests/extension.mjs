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

  // Transposition display, using UG's markup: data-name keeps the original chord.
  await page.route('https://tabs.ultimate-guitar.com/tab/test/sheet-chords-1', route => route.fulfill({ contentType: 'text/html', body:
    '<div><span><span>Key</span>: </span><span id="key">Em</span></div>' +
    '<pre style="font: 13px/18px monospace">line\n<span data-name="Em" style="display:inline-block;position:relative;padding:1px 6px">Em</span>   <span data-name="D/F#" style="display:inline-block;position:relative;padding:1px 6px">D/F#</span>\nlyrics</pre>' }));
  await page.goto('https://tabs.ultimate-guitar.com/tab/test/sheet-chords-1');
  const chord = page.locator('pre span').first();
  const bass = page.locator('pre span').nth(1);
  const attrs = () => page.evaluate(() => [...document.querySelectorAll('pre span')].map(s => s.getAttribute('data-ugz-original'))
    .concat(document.querySelector('#key').getAttribute('data-ugz-key')));
  const settle = () => page.waitForTimeout(200);
  await settle();
  assert.deepEqual(await attrs(), [null, null, null], 'untransposed page is unchanged');
  const lineTop = await chord.evaluate(el => el.getBoundingClientRect().top);
  const x = await chord.evaluate(el => el.getBoundingClientRect().left);
  await page.evaluate(() => { const [a, b] = document.querySelectorAll('pre span'); a.textContent = 'F#m'; b.textContent = 'E/G#'; });
  await settle();
  assert.deepEqual(await attrs(), ['Em', 'D/F#', 'F#m'], 'originals and transposed key shown');
  assert.notEqual(await chord.evaluate(el => getComputedStyle(el, '::before').content), 'none', 'original label rendered');
  assert.notEqual(await page.locator('#key').evaluate(el => getComputedStyle(el, '::after').content), 'none', 'transposed key rendered');
  assert.equal(await chord.evaluate(el => el.getBoundingClientRect().left), x, 'chord stays horizontally aligned');
  assert.ok(await chord.evaluate(el => el.getBoundingClientRect().top) > lineTop, 'chord line makes room for the original');
  await page.evaluate(() => { document.querySelector('pre span').textContent = 'Gbm'; });
  await settle();
  assert.equal((await attrs())[2], 'Gbm', 'key follows flats');
  await page.evaluate(() => { const [a, b] = document.querySelectorAll('pre span'); a.textContent = 'Em'; b.textContent = 'D/Gb'; });
  await settle();
  assert.deepEqual(await attrs(), [null, null, null], 'returning to the original key, or respelling, removes labels');
  assert.equal(await bass.evaluate(el => getComputedStyle(el, '::before').content), 'none');
  console.log('Unpacked extension: transposed chords show originals and both keys.');
} finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
