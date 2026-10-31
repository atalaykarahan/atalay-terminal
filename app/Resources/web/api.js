'use strict';

// Data access for the shortcut menu and folder picker, in the app's overlay panel: Swift answers through the
// "overlay" message handler (with replies).
window.API = (() => {
  const native = (type, payload) => window.webkit.messageHandlers.overlay.postMessage(Object.assign({ type }, payload || {}));
  return {
    listDir: (p) => native('listDir', { path: p }),
    places: () => native('places'),
    // set: undefined for the pie's slices, 'picker' for the places around the new-terminal folder picker.
    getSlots: (set) => native('getSlots', { set }),
    saveSlots: (slots, set) => native('saveSlots', { slots, set }),
    newTerminal: (dir, name) => native('newTerminal', { dir, name }),
    done: () => native('done'),
  };
})();
