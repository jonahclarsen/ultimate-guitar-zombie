/* While transposed, show each chord's original name above it and both keys.
   UG keeps the original chord in data-name and rewrites only the visible text. */
(() => {
  const NOTES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const ROOT = /^([A-G])([#b♯♭]?)/;

  function pitch(chord) {
    const m = ROOT.exec((chord || '').trim());
    if (!m) return null;
    const shift = /[#♯]/.test(m[2]) ? 1 : m[2] ? -1 : 0;
    return (NOTES[m[1]] + shift + 12) % 12;
  }
  // Semitones UG moved a chord (0 for spelling-only changes), or null if unparseable.
  function offset(original, shown) {
    const a = pitch(original), b = pitch(shown);
    return a === null || b === null ? null : (b - a + 12) % 12;
  }
  function transpose(name, steps, flats) {
    return name.trim().replace(ROOT, root => (flats ? FLATS : SHARPS)[(pitch(root) + steps) % 12]);
  }
  function set(el, attr, value) {
    if (value === null) { if (el.hasAttribute(attr)) el.removeAttribute(attr); }
    else if (el.getAttribute(attr) !== value) el.setAttribute(attr, value);
  }
  let keyEl = null;
  function keyValue(doc) {
    if (keyEl?.isConnected) return keyEl;
    const label = [...doc.querySelectorAll('span')].find(s => /^Key:\s*$/.test(s.textContent));
    return (keyEl = label?.nextElementSibling || null);
  }
  function update(doc = document) {
    const chords = doc.querySelectorAll('pre span[data-name]');
    if (!chords.length) return;
    let steps = 0, flats = false;
    for (const el of chords) {
      const original = el.getAttribute('data-name');
      const moved = offset(original, el.textContent);
      if (moved) {
        steps ||= moved;
        if (/^[A-G][b♭]/.test(el.textContent.trim())) flats = true;
      }
      set(el, 'data-ugz-original', moved ? original : null);
    }
    const key = keyValue(doc);
    if (key) set(key, 'data-ugz-key', steps && pitch(key.textContent) !== null ? transpose(key.textContent, steps, flats) : null);
  }

  globalThis.UGZombieTranspose = { pitch, offset, transpose, update };
  if (!globalThis.document?.documentElement) return;
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    setTimeout(() => { queued = false; update(); }, 50);
  };
  // Our own attribute writes are not observed, so updates cannot loop.
  new MutationObserver(schedule).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  update();
})();
