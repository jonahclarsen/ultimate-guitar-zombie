/* UG uses hashed CSS classes. Match semantic controls, never those classes. */
(() => {
  const known = new WeakSet();
  const normalize = value => (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const label = el => normalize(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent);
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const isTabPage = url => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && /(^|\.)ultimate-guitar\.com$/.test(u.hostname) && /^\/tab\/[^/]+\/[^/]+/.test(u.pathname);
    } catch { return false; }
  };
  function inToolbar(el) {
    for (let parent = el.parentElement, depth = 0; parent && depth < 4; parent = parent.parentElement, depth++) {
      if (parent.matches('body, main, article')) break;
      const text = normalize(parent.textContent);
      if (text.length < 1800 && /\bspeed\b/.test(text) && /\btranspose\b/.test(text)) return true;
    }
    return false;
  }
  function running(doc = document) {
    const buttons = doc.querySelectorAll('button, [role="button"], [data-testid^="autoscroll-play-control"], [data-test-id^="autoscroll-play-control"]');
    for (const el of buttons) {
      if (!visible(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
      const text = label(el);
      const identified = /^auto[ -]?scroll$/.test(text) ||
        /autoscroll-play-control/.test(el.getAttribute('data-testid') || el.getAttribute('data-test-id') || '');
      if (identified) known.add(el);
      const scoped = known.has(el) || inToolbar(el);
      if (!scoped) continue;
      if (/^(pause|stop)( auto[ -]?scroll)?$/.test(text) || el.getAttribute('aria-pressed') === 'true') return true;
      // Classic desktop UI keeps the Autoscroll label and swaps only this SVG.
      if (identified && [...el.querySelectorAll('svg path')].some(path =>
        (path.getAttribute('d') || '').replace(/\s+/g, ' ').includes('M5.5 5C5.22386 5 5 5.22386 5 5.5V10.5'))) return true;
      // Older UG controls use an SVG sprite instead of text.
      if (identified && [...el.querySelectorAll('use')].some(use => /(?:pause|stop)(?:$|[\W_])/.test(use.getAttribute('href') || use.getAttribute('xlink:href') || ''))) return true;
    }
    return false;
  }
  globalThis.UGZombieDetector = { running, isTabPage };
})();
