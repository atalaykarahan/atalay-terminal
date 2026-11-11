'use strict';
// The pages were written for WKWebView on the Mac: they call the app through window.webkit.messageHandlers.<name>
// .postMessage(body), a promise where the Mac's handler replies, and they get a few values the Mac sets before they
// load (the terminals' font, the messages panel's role and friend). This gives them the same over Electron's IPC, so
// they run unchanged, and inserts the theme's colours before they draw (and again when the theme changes).
const { contextBridge, ipcRenderer, webFrame } = require('electron');

const boot = ipcRenderer.sendSync('atl:boot') || {};

const handlers = {};
for (const name of ['radar', 'cloud', 'git', 'theme', 'overlay', 'messages', 'savers', 'chats', 'archive', 'trash', 'spend', 'files', 'notes']) {
  handlers[name] = { postMessage: (body) => ipcRenderer.invoke('atl:post', name, body) };
}
contextBridge.exposeInMainWorld('webkit', { messageHandlers: handlers });
// The pages name the computer and the command key by it ("this PC", Ctrl+).
contextBridge.exposeInMainWorld('__platform', process.platform);
if (boot.look) contextBridge.exposeInMainWorld('__terminalLook', boot.look);
// A terminal window's text size (main.js's termFontSize), before it draws its first line.
if (boot.termFont) contextBridge.exposeInMainWorld('__termFont', boot.termFont);
if (boot.role) contextBridge.exposeInMainWorld('__MESSAGES_ROLE__', boot.role);
if (boot.friend) contextBridge.exposeInMainWorld('__MESSAGES_FRIEND__', boot.friend);

// A terminal window's line to its shell (pages/terminal.js): only its own channels.
const TERM = /^term:/;
contextBridge.exposeInMainWorld('atl', {
  send: (channel, data) => TERM.test(channel) && ipcRenderer.send(channel, data),
  on: (channel, fn) => TERM.test(channel) && ipcRenderer.on(channel, (_e, data) => fn(data)),
  // A question with an answer (which of a line's pieces are files).
  ask: (channel, data) => (TERM.test(channel) ? ipcRenderer.invoke(channel, data) : Promise.reject(new Error('not a terminal channel'))),
});

// The shortcut wheel: Ctrl and the middle mouse button, anywhere in the app's windows (the Mac opens it with the middle
// button; Ctrl+K still does here too). Neither the page nor the terminal under the pointer gets that press: no orbit
// zoom, no autoscroll, no click sent to the program. Cancelling the pointer press keeps its mouse events from coming.
let wheelPress = false;
const swallow = (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
};
window.addEventListener('pointerdown', (e) => {
  wheelPress = e.button === 1 && e.ctrlKey;
  if (!wheelPress) return;
  swallow(e);
  ipcRenderer.send('atl:wheel');
}, true);
for (const type of ['mousedown', 'pointerup', 'mouseup', 'auxclick']) {
  window.addEventListener(type, (e) => {
    if (e.button === 1 && wheelPress) swallow(e);
  }, true);
}

// WKWebView draws the Mac's thin overlay scrollbars; Chromium on Windows draws wide light ones, which glare in a dark
// page wherever it left them alone (Source Control's lists). Thin ones in the theme's colours instead: an area that
// hides its own keeps it hidden (its rule is more specific), and the terminal keeps xterm.js's.
webFrame.insertCSS(':where(:not(.xterm *)){scrollbar-width:thin;scrollbar-color:var(--dim2) transparent}', { cssOrigin: 'author' });

// The theme: before the page draws, and again when it changes.
let themeKey = boot.css ? webFrame.insertCSS(boot.css, { cssOrigin: 'author' }) : null;
ipcRenderer.on('atl:theme', (_e, css) => {
  if (themeKey) webFrame.removeInsertedCSS(themeKey);
  themeKey = webFrame.insertCSS(css, { cssOrigin: 'author' });
  window.dispatchEvent(new Event('themechange'));
});
