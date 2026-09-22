import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const FIVE_MINUTES = 300000;
function setup() {
  let now = 1000000;
  let poll;
  let mutation;
  const pending = [];
  const listeners = {};
  const messages = [];
  const state = { focused: true, visible: true, autoscrolling: false };
  const location = { href: 'https://tabs.ultimate-guitar.com/tab/band/song-chords-123' };
  const listen = (type, fn) => { (listeners[type] ||= []).push(fn); };
  const document = {
    documentElement: {},
    get visibilityState() { return state.visible ? 'visible' : 'hidden'; },
    hasFocus: () => state.focused,
    addEventListener: listen,
  };
  vm.runInNewContext(fs.readFileSync('extension/content.js', 'utf8'), {
    Date: { now: () => now }, location, document,
    UGZombieDetector: { isTabPage: url => url.includes('/tab/'), running: () => state.autoscrolling },
    chrome: { runtime: { sendMessage: async message => { messages.push(message); }, onMessage: { addListener() {} } } },
    MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} disconnect() {} },
    setInterval: fn => { poll = fn; }, clearInterval() {},
    setTimeout: fn => { pending.push(fn); }, addEventListener: listen,
  });
  const flush = () => { while (pending.length) pending.shift()(); };
  return {
    state, location,
    active: () => messages.at(-1).active,
    tick(ms) { now += ms; poll(); flush(); },
    event(type, trusted = true) { for (const fn of listeners[type] || []) fn({ isTrusted: trusted }); flush(); },
    mutate() { mutation(); flush(); },
  };
}

test('reading starts protected and expires at five idle minutes', () => {
  const h = setup(); assert.equal(h.active(), true);
  h.tick(FIVE_MINUTES - 1); assert.equal(h.active(), true);
  h.tick(1); assert.equal(h.active(), false);
});
for (const activity of ['scroll', 'wheel', 'pointerdown', 'pointermove', 'keydown', 'touchstart', 'touchmove']) {
  test(`${activity} resumes an expired page and renews the five-minute allowance`, () => {
    const h = setup(); h.tick(FIVE_MINUTES); assert.equal(h.active(), false);
    h.event(activity); assert.equal(h.active(), true);
    h.tick(FIVE_MINUTES - 1); assert.equal(h.active(), true);
    h.tick(1); assert.equal(h.active(), false);
  });
}
test('ongoing page activity extends the allowance before it expires', () => {
  const h = setup(); h.tick(240000); h.event('scroll'); h.tick(240000);
  assert.equal(h.active(), true);
  h.tick(60000); assert.equal(h.active(), false);
});
test('autoscroll stays protected past five minutes; stopping begins a full allowance', () => {
  const h = setup(); h.state.autoscrolling = true;
  h.tick(FIVE_MINUTES * 4); assert.equal(h.active(), true);
  h.state.autoscrolling = false; h.tick(1000); assert.equal(h.active(), true);
  h.tick(FIVE_MINUTES - 1); assert.equal(h.active(), true);
  h.tick(1); assert.equal(h.active(), false);
});
test('starting autoscroll resumes an expired page', () => {
  const h = setup(); h.tick(FIVE_MINUTES); assert.equal(h.active(), false);
  h.state.autoscrolling = true; h.mutate(); assert.equal(h.active(), true);
});
test('background time counts; refocusing an expired page alone does not renew it', () => {
  const h = setup(); h.state.focused = false; h.event('blur'); assert.equal(h.active(), false);
  h.tick(FIVE_MINUTES); h.event('scroll');
  h.state.focused = true; h.event('focus'); assert.equal(h.active(), false);
  h.event('scroll'); assert.equal(h.active(), true);
});
test('hidden pages cannot hold or renew protection', () => {
  const h = setup(); h.state.visible = false; h.event('visibilitychange'); assert.equal(h.active(), false);
  h.tick(FIVE_MINUTES); h.event('pointermove'); h.state.visible = true; h.event('visibilitychange');
  assert.equal(h.active(), false);
});
test('DOM updates and synthetic activity cannot keep an idle page awake', () => {
  const h = setup(); h.tick(FIVE_MINUTES - 1); h.mutate(); h.event('scroll', false);
  h.tick(1); assert.equal(h.active(), false);
  h.mutate(); h.event('pointermove', false); assert.equal(h.active(), false);
});
test('navigation starts an allowance only on a tab page', () => {
  const h = setup(); h.tick(FIVE_MINUTES);
  h.location.href = 'https://tabs.ultimate-guitar.com/tab/band/another-chords-234'; h.tick(1000);
  assert.equal(h.active(), true);
  h.location.href = 'https://tabs.ultimate-guitar.com/'; h.tick(1000); assert.equal(h.active(), false);
  h.event('scroll'); assert.equal(h.active(), false);
});
