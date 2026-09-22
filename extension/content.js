(() => {
  const IDLE_TIMEOUT = 5 * 60 * 1000;
  let lastActivity = Date.now();
  let pageUrl = location.href;
  let wasAutoscrolling = false;
  let last = '';
  let lastSent = 0;
  let scheduled = false;
  let disposed = false;
  function report(forceOff = false) {
    if (disposed) return;
    const now = Date.now();
    if (pageUrl !== location.href) {
      pageUrl = location.href;
      lastActivity = now;
      wasAutoscrolling = false;
    }
    const tabPage = UGZombieDetector.isTabPage(location.href);
    const autoscrolling = tabPage && UGZombieDetector.running();
    // Give a full idle allowance when autoscroll ends, including at the song's end.
    if (autoscrolling || wasAutoscrolling) lastActivity = now;
    wasAutoscrolling = autoscrolling;
    const active = !forceOff && tabPage &&
      document.visibilityState === 'visible' && document.hasFocus() &&
      (autoscrolling || now - lastActivity < IDLE_TIMEOUT);
    const signature = `${location.href}:${active}`;
    if (signature === last && Date.now() - lastSent < 3000) return;
    last = signature;
    lastSent = Date.now();
    try {
      chrome.runtime.sendMessage({ type: 'state', active }).catch(() => { disposed = true; observer.disconnect(); clearInterval(timer); });
    } catch { disposed = true; observer.disconnect(); clearInterval(timer); }
  }
  function schedule() {
    if (scheduled || disposed) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; report(); }, 80);
  }
  function activity(event) {
    if (!event.isTrusted || disposed || !document.hasFocus() ||
        document.visibilityState !== 'visible' || !UGZombieDetector.isTabPage(location.href)) return;
    lastActivity = Date.now();
    schedule();
  }
  // Capture includes scrolling inside the tab's own scrollable containers.
  // DOM mutations, ads, and focus changes alone must not reset the idle timer.
  for (const type of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'touchmove', 'scroll']) {
    addEventListener(type, activity, { capture: true, passive: true });
  }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'aria-pressed', 'aria-disabled', 'disabled', 'href', 'xlink:href', 'hidden', 'd'] });
  const timer = setInterval(() => report(), 1000);
  addEventListener('focus', () => report());
  addEventListener('blur', () => report(true));
  addEventListener('pagehide', () => report(true));
  document.addEventListener('visibilitychange', () => report());
  chrome.runtime.onMessage.addListener(message => { if (message.type === 'check') { last = ''; report(); } });
  report();
})();
