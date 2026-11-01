'use strict';
// The pages were written for WKWebView on the Mac: they call the app through window.webkit.messageHandlers.<name>
// .postMessage(body), a promise where the Mac's handler replies, and they get a few values the Mac sets before they
// load (the terminals' font, the messages panel's role and friend). This gives them the same over Electron's IPC, so
// they run unchanged, and inserts the theme's colours before they draw (and again when the theme changes).
const { contextBridge, ipcRenderer, webFrame } = require('electron');

const boot = ipcRenderer.sendSync('atl:boot') || {};

const handlers = {};
for (const name of ['radar', 'cloud', 'git', 'theme', 'overlay', 'messages']) {
  handlers[name] = { postMessage: (body) => ipcRenderer.invoke('atl:post', name, body) };
}
contextBridge.exposeInMainWorld('webkit', { messageHandlers: handlers });
// The pages name the computer and the command key by it ("this PC", Ctrl+).
contextBridge.exposeInMainWorld('__platform', process.platform);
if (boot.look) contextBridge.exposeInMainWorld('__terminalLook', boot.look);
if (boot.role) contextBridge.exposeInMainWorld('__MESSAGES_ROLE__', boot.role);
if (boot.friend) contextBridge.exposeInMainWorld('__MESSAGES_FRIEND__', boot.friend);

// A terminal window's line to its shell (pages/terminal.js): only its own channels.
const TERM = /^term:/;
contextBridge.exposeInMainWorld('atl', {
  send: (channel, data) => TERM.test(channel) && ipcRenderer.send(channel, data),
  on: (channel, fn) => TERM.test(channel) && ipcRenderer.on(channel, (_e, data) => fn(data)),
});

// The theme: before the page draws, and again when it changes.
let themeKey = boot.css ? webFrame.insertCSS(boot.css, { cssOrigin: 'author' }) : null;
ipcRenderer.on('atl:theme', (_e, css) => {
  if (themeKey) webFrame.removeInsertedCSS(themeKey);
  themeKey = webFrame.insertCSS(css, { cssOrigin: 'author' });
  window.dispatchEvent(new Event('themechange'));
});
