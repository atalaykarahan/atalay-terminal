'use strict';

// What the app is doing, for a theme to follow (docs/theme-hooks.md): states as attributes on <html> (a number also as a
// CSS variable), moments as an event and an attribute that stays for a moment, and the theme's own sounds. Each page (the
// dashboard, the notices, the overlay) has its own. The app's look and sounds don't use them: a theme that doesn't ask
// sees and hears no difference. Loaded before the page's other scripts.
window.Hooks = (() => {
  const root = document.documentElement;

  // The logic behind the states, kept pure.
  const STREAK_MARKS = [3, 5, 7, 10, 15, 25, 50, 100];
  const IDLE_STEPS = [[600, '10m'], [300, '5m'], [60, '1m']];
  const logic = {
    // A tool result after a run of `n` good ones: the run now, the mark it reached (0: none) and the run a failure
    // ended (0: none, or one shorter than 3).
    streak(n, ok) {
      if (ok) return { n: n + 1, mark: STREAK_MARKS.includes(n + 1) ? n + 1 : 0, broke: 0 };
      return { n: 0, mark: 0, broke: n >= 3 ? n : 0 };
    },
    // The run when the page opens: the good results at the newest end of the ticker (newest last). A call still running
    // has no result yet.
    streakOf(ticker) {
      let n = 0;
      for (let i = (ticker || []).length - 1; i >= 0; i--) {
        if (ticker[i].st === 'run') continue;
        if (ticker[i].st !== 'ok') break;
        n++;
      }
      return n;
    },
    // How long the computer has had no input, as a step ('', 1m, 5m, 10m), and the step a return ended (back). A
    // reading that isn't a number changes nothing.
    idleStep(was, seconds) {
      if (!Number.isFinite(seconds)) return { level: was, back: '' };
      const level = (IDLE_STEPS.find(([at]) => seconds >= at) || [0, ''])[1];
      return { level, back: was && !level ? was : '' };
    },
    // A theme's sound token: '' (none of its own), 'none' (silence), or a file's path from the web folder, quoted or
    // bare. Only a plain path is one: no address elsewhere, no way out of the folder, and no url() (WebKit hands it back
    // escaped).
    soundFile(token) {
      const v = String(token ?? '').trim().replace(/^(["'])(.*)\1$/, '$2');
      if (!v || v === 'none') return v;
      return /^[\w-][\w ./-]*$/.test(v) && !/(^|\/)\.\.(\/|$)/.test(v) ? v : '';
    },
  };

  // A state: data-<name> while it has a value (null, false and 0 take it away), a number also as --<name>; `name` as
  // in dataset (sameFile: data-same-file, --same-file). atalay:state tells a script, only when it changes.
  const states = new Map();
  function set(name, value) {
    if (states.get(name) === value) return;
    states.set(name, value);
    const prop = '--' + name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
    if (value === null || value === undefined || value === false || value === 0) delete root.dataset[name];
    else root.dataset[name] = String(value);
    if (typeof value === 'number' && Number.isFinite(value)) root.style.setProperty(prop, String(value));
    else root.style.removeProperty(prop);
    dispatchEvent(new CustomEvent('atalay:state', { detail: { name, value } }));
  }

  // A moment: data-<name> on <html> for `ms` (its value detail.value, else 1), for a CSS animation, which starts over
  // when it comes again; and the event atalay:<name> on window. False when a listener cancelled a cancelable one: the
  // app then leaves its own part out.
  const timers = new Map();
  function pulse(name, detail = {}, { ms = 1600, cancelable = false } = {}) {
    const attr = 'data-' + name;
    clearTimeout(timers.get(name));
    if (root.hasAttribute(attr)) {
      root.removeAttribute(attr);
      void root.offsetWidth;
    }
    root.setAttribute(attr, String(detail.value ?? '1'));
    timers.set(name, setTimeout(() => root.removeAttribute(attr), ms));
    return dispatchEvent(new CustomEvent('atalay:' + name, { detail, cancelable }));
  }

  // The theme's sound for `name` (its --sfx-<name> token): '' when it has none, 'none' for silence, or its file.
  const soundOf = (name) => logic.soundFile(getComputedStyle(root).getPropertyValue('--sfx-' + name));

  // Plays the theme's sound for `name`: true when the theme has one (a file now playing, or none for silence); false,
  // the app plays its own.
  function sound(name) {
    const file = soundOf(name);
    if (!file) return false;
    if (file !== 'none') {
      try {
        new Audio(file).play().catch(() => {});
      } catch {}
    }
    return true;
  }

  // The theme's id (its --theme-id token) as data-theme: when the page opens and on every change.
  const theme = () => set('theme', getComputedStyle(root).getPropertyValue('--theme-id').trim() || null);
  theme();
  addEventListener('themechange', theme);

  return { set, pulse, sound, soundOf, logic };
})();
