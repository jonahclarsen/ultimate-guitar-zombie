const HOST = 'com.ultimate_guitar_zombie.awake';
let owner = null;
let port = null;
let nativeStatus = 'Not connected';
let revision = 0;
let expiry;
let retryAfter = 0;

function stop() {
  owner = null;
  clearTimeout(expiry);
  chrome.power.releaseKeepAwake();
  if (port) { const old = port; port = null; old.disconnect(); }
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setTitle({ title: 'Ultimate Guitar Zombie — waiting for focused autoscroll' });
}
function connectNative() {
  if (port || Date.now() < retryAfter) return;
  const connection = chrome.runtime.connectNative(HOST);
  port = connection;
  nativeStatus = 'Connecting';
  connection.onMessage.addListener(message => {
    if (connection !== port) return;
    nativeStatus = message.ok ? 'Connected' : 'Helper error';
    chrome.action.setBadgeText({ text: message.ok ? 'ON' : '!' });
  });
  connection.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError?.message;
    if (connection !== port) return;
    port = null;
    nativeStatus = error || 'Disconnected';
    retryAfter = Date.now() + 30000;
    if (owner !== null) chrome.action.setBadgeText({ text: '!' });
  });
}
async function accept(message, sender) {
  if (sender.frameId !== 0 || !sender.tab || !/^https:\/\/(?:[\w-]+\.)*ultimate-guitar\.com\/tab\/[^/]+\/[^/]+/.test(sender.url || '')) return;
  if (message.active !== true) {
    if (owner === sender.tab.id) { revision++; stop(); }
    return;
  }
  const version = ++revision;
  try {
    const [tab, window] = await Promise.all([chrome.tabs.get(sender.tab.id), chrome.windows.get(sender.tab.windowId)]);
    if (version !== revision) return;
    if (!tab.active || !window.focused || tab.discarded) { stop(); return; }
    owner = tab.id;
    chrome.power.requestKeepAwake('display');
    chrome.action.setBadgeBackgroundColor({ color: '#b58c00' });
    chrome.action.setBadgeText({ text: nativeStatus === 'Connected' && port ? 'ON' : '!' });
    chrome.action.setTitle({ title: 'Ultimate Guitar Zombie — keeping this screen awake' });
    connectNative();
    port?.postMessage({ active: true });
    clearTimeout(expiry);
    expiry = setTimeout(() => { revision++; stop(); }, 10000);
  } catch { if (version === revision) stop(); }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message.type === 'status') { reply({ active: owner !== null, nativeStatus, helperConnected: !!port && nativeStatus === 'Connected' }); return; }
  if (message.type === 'state') void accept(message, sender);
});
function invalidate() { revision++; stop(); }
async function checkActive() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: 'check' }).catch(() => {});
}
chrome.tabs.onActivated.addListener(() => { invalidate(); void checkActive(); });
chrome.windows.onFocusChanged.addListener(() => { invalidate(); void checkActive(); });
chrome.tabs.onRemoved.addListener(id => { if (owner === id) invalidate(); });
chrome.tabs.onUpdated.addListener((id, change) => { if (owner === id && (change.status === 'loading' || change.url || change.discarded)) invalidate(); });
chrome.runtime.onStartup.addListener(() => { invalidate(); void checkActive(); });
chrome.runtime.onInstalled.addListener(invalidate);
