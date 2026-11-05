'use strict';

// The Windows app shows its terminals and chats as a panel inside the dashboard window, over the dashboard's middle,
// where the activity bar's views show (windows/src/main.js, termPanel). The panel is a view of the app's own above this
// page, so this page tells it where that place is (`stage`, and again whenever it moves or changes size), marks the
// activity bar's terminal button while one shows, and closes it when another view of the bar is chosen. The Mac app
// opens its chats its own way: nothing here runs there.
window.TermPanel = (() => {
  if (window.__platform !== 'win32') return { shown() {}, toggle() {}, hide() {}, modal() {} };
  const post = (msg) => {
    try {
      window.webkit.messageHandlers.radar.postMessage(msg);
    } catch {}
  };
  // The place: rows 2 and 3, from the sessions column to the right edge (cloud.css .cv), never shown itself.
  const stage = document.createElement('div');
  stage.id = 'termstage';
  stage.setAttribute('aria-hidden', 'true');
  document.getElementById('app').appendChild(stage);
  let sent = '';
  const tell = () => {
    const r = stage.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return;
    const key = [r.left, r.top, r.width, r.height].map((n) => Math.round(n)).join(',');
    if (key === sent) return;
    sent = key;
    post({ type: 'stage', x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
  };
  new ResizeObserver(tell).observe(stage);
  addEventListener('resize', tell);
  addEventListener('load', tell);
  setTimeout(tell, 0);

  let active = null;
  const button = () => document.querySelector('#activity [data-view=terminal]');
  return {
    // The app: which terminal shows now (null: none).
    shown(id) {
      active = id || null;
      button()?.classList.toggle('term-open', !!active);
      document.getElementById('app')?.classList.toggle('term-on', !!active);
      sent = '';
      tell();
    },
    // The activity bar's terminal button: the panel goes off, or the last terminal comes back (or a new one).
    toggle() {
      post({ type: active ? 'hideTerminal' : 'showTerminal' });
    },
    hide() {
      if (active) post({ type: 'hideTerminal' });
    },
    // A popup of the page over the panel's place: the panel steps aside while it's open.
    modal(open) {
      post({ type: 'modal', open: !!open });
    },
  };
})();
