(() => {
  let last = '';
  let lastSent = 0;
  let scheduled = false;
  let disposed = false;
  function report(forceOff = false) {
    if (disposed) return;
    const active = !forceOff && UGZombieDetector.isTabPage(location.href) &&
      document.visibilityState === 'visible' && document.hasFocus() && UGZombieDetector.running();
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
