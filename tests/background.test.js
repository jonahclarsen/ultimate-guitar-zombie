import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function setup() {
  const events = {};
  const event = name => ({ addListener: fn => { events[name] = fn; } });
  const state = { awake: false, disconnected: 0, active: true, focused: true };
  let deadline;
  const chrome = {
    runtime: { onMessage: event('message'), onStartup: event('startup'), onInstalled: event('installed'), connectNative: () => ({ onMessage: event('nativeMessage'), onDisconnect: event('nativeDisconnect'), postMessage() {}, disconnect() { state.disconnected++; } }) },
    power: { requestKeepAwake: () => { state.awake = true; }, releaseKeepAwake: () => { state.awake = false; } },
    action: { setBadgeText() {}, setTitle() {}, setBadgeBackgroundColor() {} },
    tabs: { get: async id => ({ id, active: state.active }), query: async () => [], onActivated: event('activate'), onRemoved: event('remove'), onUpdated: event('update') },
    windows: { get: async () => ({ focused: state.focused }), onFocusChanged: event('focus') }
  };
  vm.runInNewContext(fs.readFileSync('extension/background.js', 'utf8'), { chrome, setTimeout: fn => { deadline = fn; }, clearTimeout() {}, Date });
  const sender = { frameId: 0, url: 'https://tabs.ultimate-guitar.com/tab/band/song-chords-123', tab: { id: 1, windowId: 1 } };
  const send = async (active, overrides = {}) => { events.message({ type: 'state', active }, { ...sender, ...overrides }, () => {}); await new Promise(resolve => setImmediate(resolve)); };
  return { state, events, send, expire: () => deadline() };
}
test('only focused active main-frame UG tabs can hold the wake request', async () => {
  const h = setup();
  await h.send(true, { frameId: 1 }); assert.equal(h.state.awake, false);
  await h.send(true, { url: 'https://evil.com/tab/a/b' }); assert.equal(h.state.awake, false);
  h.state.focused = false; await h.send(true); assert.equal(h.state.awake, false);
  h.state.focused = true; h.state.active = false; await h.send(true); assert.equal(h.state.awake, false);
  h.state.active = true; await h.send(true); assert.equal(h.state.awake, true);
  await h.send(false); assert.equal(h.state.awake, false); assert.equal(h.state.disconnected, 1);
});
for (const event of ['focus', 'activate', 'remove', 'update', 'expiry']) {
  test(`releases power and helper on ${event}`, async () => {
    const h = setup(); await h.send(true);
    if (event === 'expiry') h.expire();
    else if (event === 'update') h.events.update(1, { status: 'loading' });
    else h.events[event](1);
    assert.equal(h.state.awake, false); assert.equal(h.state.disconnected, 1);
  });
}
test('late async validation cannot reacquire power after focus loss', async () => {
  const h = setup(); const pending = h.send(true); h.events.focus(-1); await pending;
  assert.equal(h.state.awake, false);
});
test('inactive messages from other tabs do not cancel the current tab', async () => {
  const h = setup(); await h.send(true); await h.send(false, { tab: { id: 2, windowId: 1 } });
  assert.equal(h.state.awake, true);
});
