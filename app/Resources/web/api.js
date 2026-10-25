'use strict';

// Data access for the shortcut menu and folder picker. In the app they run in an overlay panel
// and talk to Swift through the "overlay" message handler (with replies); in staging they use the HTTP server.
window.API = (() => {
  const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.overlay;
  const inApp = !!h;
  const native = (type, payload) => h.postMessage(Object.assign({ type }, payload || {}));
  const json = (r) => r.json();
  const send = (url, method, body) =>
    fetch(url, { method, headers: { 'content-type': 'application/json', 'x-radar': '1' }, body: JSON.stringify(body) }).then(json);

  return {
    inApp,
    listDir: (p) => (inApp ? native('listDir', { path: p }) : fetch(`/api/fs/list?path=${encodeURIComponent(p)}`).then(json)),
    places: () => (inApp ? native('places') : fetch('/api/fs/places').then(json)),
    getSlots: () => (inApp ? native('getSlots') : fetch('/api/shortcuts').then(json)),
    saveSlots: (slots) => (inApp ? native('saveSlots', { slots }) : send('/api/shortcuts', 'PUT', { slots })),
    newTerminal: (dir, name) => (inApp ? native('newTerminal', { dir, name }) : window.Chat?.openNew(dir, name)),
    done: () => (inApp ? native('done') : Promise.resolve()),
  };
})();
