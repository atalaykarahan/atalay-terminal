'use strict';
// Atalay's Terminal for Windows: the Mac app's dashboard (app/Resources/web, unchanged) in Electron. This file is the
// Mac app's MainWindowController and AppDelegate: the windows, the line between the pages and the parts that feed them
// (engine.js, cloud.js, git.js, themes.js, terminals.js), the keys and the updates.
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, screen, powerMonitor, nativeTheme, net, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const { createEngine } = require('./engine');
const { createGit } = require('./git');
const { createCloud } = require('./cloud');
const { createThemes } = require('./themes');
const { createTerminals } = require('./terminals');
const { createOverlay } = require('./overlay');

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch {}

// Where the dashboard's web files are: next to the app when it's installed (electron-builder copies them), the Mac
// app's folder in the repository when it runs from the sources.
const WEB = app.isPackaged ? path.join(process.resourcesPath, 'web') : path.join(__dirname, '..', '..', 'app', 'Resources', 'web');
const PRELOAD = path.join(__dirname, 'preload.js');
// ATL_PROBE=<folder>: a check without windows on screen — the pages render out of sight, pictures of them land in the
// folder, and the app quits (development only).
const PROBE = process.env.ATL_PROBE || '';

// Run from the sources on a Mac (development), its data must not land in the Mac app's own folder.
if (process.platform !== 'win32') app.setPath('userData', path.join(app.getPath('appData'), 'atalay-terminal-windows-dev'));
if (!app.requestSingleInstanceLock()) app.quit();
nativeTheme.themeSource = 'dark';
// The installer's shortcuts carry the app's id (build.appId in package.json) as their AppUserModelID; the windows must
// too, or a pinned shortcut and the running app sit apart on the taskbar.
if (process.platform === 'win32' && app.isPackaged) app.setAppUserModelId('com.atalaykarahan.atalay-terminal');

// ---------- settings: a small JSON file in the app's data folder ----------
const SETTINGS = path.join(app.getPath('userData'), 'settings.json');
const settings = (() => {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  } catch {}
  return {
    get: (k) => data[k],
    set(k, v) {
      data[k] = v;
      try {
        fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
        fs.writeFileSync(SETTINGS, JSON.stringify(data, null, 2));
      } catch (e) {
        console.error('settings:', e.message);
      }
    },
  };
})();

// ---------- the parts ----------
let dash = null; // the dashboard window
const boots = new Map(); // webContents id -> what its preload asks for before the page loads
const chats = new Map(); // terminal window id -> { win, sessionId, cwd, claude, title, startedAt }
const panels = { notices: null, chats: new Map() }; // the messages panels: the corner's notices, friends' chats

const themes = createThemes({
  webDir: WEB,
  settings,
  onChange(css) {
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('atl:theme', css);
    if (dash) dash.setBackgroundColor(themes.color('--bg'));
  },
});

const terminals = createTerminals({
  onData: (id, data) => send(chats.get(id)?.win, 'term:data', data),
  onExit(id) {
    const c = chats.get(id);
    if (c) {
      send(c.win, 'term:exit');
      // A plain terminal closes with its shell; a chat's window stays to show how it ended until it's closed.
      if (!c.claude && c.win && !c.win.isDestroyed()) c.win.destroy();
      chats.delete(id);
      toDash(`terminalGone(${JSON.stringify(id)})`);
    }
    quitIfIdle();
  },
  // The session host keeps chats and terminals going without the app, as screen does on the Mac. Each build has its
  // own, as there (the installed app's, a development run's), and so does a profile of its own (npm run staging's): a
  // launch only ever brings back its own app's chats.
  host:
    process.platform === 'win32' && !PROBE
      ? {
          name: `atalay-terminal-host-v1-${os.userInfo().username.replace(/[^\w.-]/g, '_')}${app.isPackaged ? '' : '-dev'}${profileSuffix()}`,
          dir: path.join(process.env.LOCALAPPDATA || app.getPath('temp'), 'atalay-terminal-host'),
          source: path.join(__dirname, 'host.cs'),
        }
      : null,
});

// "" for the app's usual profile, else a short mark of the one it was given (--user-data-dir).
function profileSuffix() {
  const own = app.getPath('userData').toLowerCase();
  if (path.resolve(own) === path.resolve(path.join(app.getPath('appData'), app.getName())).toLowerCase()) return '';
  return '-' + crypto.createHash('sha256').update(own).digest('hex').slice(0, 8);
}

// Closing the dashboard keeps the app and its chats going, as on the Mac, where the Dock brings it back (here, starting
// the app again). With no chat or terminal left there's nothing to keep it for: it quits rather than stay on out of
// sight (the hidden notices panel would keep it alive, and the uninstaller would find it running).
function quitIfIdle() {
  if (!quitting && !dash && !terminals.list().length) app.quit();
}

const engine = createEngine({
  claudeDir: path.join(os.homedir(), '.claude'),
  limitsFile: path.join(app.getPath('userData'), 'limits.json'),
  // A Claude process under one of the app's terminals belongs to that window (its id becomes the session's `tab`).
  isAppPid: (pid) => (terminals.list().find((t) => t.pid === pid) || {}).id || false,
  onInit: (json) => toDash(`init(${json})`),
  onState(json) {
    toDash(`state(${json})`);
    matchChats();
    for (const [id, c] of chats) send(c.win, 'term:info', chatInfo(id, c));
    badge();
  },
  onEvents: (json) => toDash(`events(${json})`),
});

const git = createGit({
  folders: () => [...engine.gitSessions(), ...engine.gitSources(), ...terminals.cwds()],
  written: () => engine.written(),
  async confirm({ message, detail, buttons, destructive }) {
    const r = await dialog.showMessageBox(dash || undefined, {
      type: destructive ? 'warning' : 'question', message, detail, buttons: buttons || ['OK', 'Cancel'], defaultId: 0, cancelId: (buttons || []).length - 1, noLink: true,
    });
    return r.response;
  },
  // Under the button that asked (`at`: the page's pixels), as Source Control's menus open on the Mac.
  menu: (items, at) =>
    new Promise((resolve) => {
      let picked = null;
      const build = (list) =>
        (list || []).map((i) => (i.separator || i.type === 'separator' ? { type: 'separator' } : {
          label: i.title || i.label, enabled: i.enabled !== false, submenu: i.items ? build(i.items) : undefined,
          click: i.items ? undefined : () => (picked = i.id),
        }));
      const pos = at && Number.isFinite(at.x) && Number.isFinite(at.y) ? { x: at.x, y: at.y } : {};
      Menu.buildFromTemplate(build(items)).popup({ window: dash || undefined, ...pos, callback: () => resolve(picked) });
    }),
  trash: (p) => shell.trashItem(p),
});

const cloud = createCloud({
  apiBase: process.env.ATALAY_API_URL || 'https://terminal-api.atalaykarahan.com',
  dataDir: app.getPath('userData'),
  version: app.getVersion(),
  clientKey: loadClientKey(),
  fetch: (url, init) => net.fetch(url, init),
  // Working, for the XP: someone at the keyboard in the last five minutes, and a sign of work — a Claude session
  // busy, or a terminal printing or typed in.
  isActive: () => powerMonitor.getSystemIdleTime() < 300 && (terminals.busySince(300_000) || engine.live().some((s) => s.status === 'busy')),
  idleSeconds: () => powerMonitor.getSystemIdleTime(),
  theme: () => themes.chosenId(),
  onChange(state) {
    pushCloud();
    if (state && state.xp) toNotices(`xp(${JSON.stringify(state.xp)})`);
  },
  onSocial(text) {
    toDash(`social(${text})`);
    toNotices(`event(${text})`);
    for (const p of panels.chats.values()) runPanel(p, `window.__messages && __messages.event(${text})`);
  },
});

// The signing key this build's API calls carry (src/clientkey.js, written masked at build time, never committed). A run
// from the sources against the local API (npm run staging) brings its own instead; a packaged app never reads one.
function loadClientKey() {
  try {
    if (!app.isPackaged && process.env.ATALAY_CLIENT_KEY_FILE) {
      const [id, secret] = fs.readFileSync(process.env.ATALAY_CLIENT_KEY_FILE, 'utf8').trim().split(':');
      return id && /^[0-9a-f]+$/i.test(secret || '') ? { id, secret } : null;
    }
    const k = require('./clientkey');
    const a = Buffer.from(k.a, 'base64'), b = Buffer.from(k.b, 'base64');
    const secret = Buffer.from(a.map((x, i) => x ^ b[i])).toString('hex');
    return k.id && secret ? { id: k.id, secret } : null;
  } catch {
    return null;
  }
}

const overlay = createOverlay({ dataDir: app.getPath('userData'), claudeDir: path.join(os.homedir(), '.claude') });

// ---------- pushing to the pages ----------
function run(win, js) {
  if (win && !win.isDestroyed()) win.webContents.executeJavaScript(`${js}; true`).catch(() => {});
}
function send(win, channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}
// What a messages panel is told before its page reports "ready" waits for it, as on the Mac: a friend's chat opened
// with a click would otherwise stay empty, and the notices would miss the XP and events of the app's first seconds.
const panelWaiting = new WeakMap();
function runPanel(win, js) {
  const waiting = win && panelWaiting.get(win);
  if (waiting) waiting.push(js);
  else run(win, js);
}
const toDash = (call) => run(dash, `window.__radar && window.__radar.${call}`);
const toNotices = (call) => runPanel(panels.notices, `window.__messages && __messages.${call}`);

// The page's Cloud state, with the Windows app's own updates in it (they come from GitHub releases, not the API).
function cloudState() {
  return { ...cloud.json(), ...updates.state() };
}
const pushCloud = () => toDash(`cloud(${JSON.stringify(cloudState())})`);

// ---------- windows ----------
function webPrefs() {
  return { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false };
}

function bootFor(webContents, extra = {}) {
  const look = { font: 'Cascadia Mono', size: 13 };
  boots.set(webContents.id, { css: themes.css(), look, ...extra });
  webContents.once('destroyed', () => boots.delete(webContents.id));
}

function createDashboard() {
  const area = screen.getPrimaryDisplay().workArea;
  dash = new BrowserWindow({
    width: Math.min(1480, area.width), height: Math.min(900, area.height), minWidth: 980, minHeight: 600,
    title: "Atalay's Terminal", backgroundColor: themes.color('--bg'), show: false, autoHideMenuBar: true,
    ...(PROBE ? { x: -32000, y: -32000, frame: false, width: 1480, height: 900 } : {}),
    webPreferences: webPrefs(),
  });
  bootFor(dash.webContents);
  dash.loadFile(path.join(WEB, 'index.html'));
  dash.once('ready-to-show', () => (PROBE ? dash.showInactive() : dash.show()));
  const visibility = () => toDash(`visibility(${dash.isVisible() && !dash.isMinimized()}, ${dash.isFocused()})`);
  for (const ev of ['focus', 'blur', 'minimize', 'restore', 'show', 'hide']) dash.on(ev, visibility);
  dash.webContents.on('render-process-gone', () => setTimeout(() => dash && !dash.isDestroyed() && dash.reload(), 500));
  // Links in the page open in the browser, never inside the app.
  dash.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  dash.on('closed', () => {
    dash = null;
    badged = 0;
    quitIfIdle();
  });
}

// The Mac's Dock badge: how many chats need the user (a question, a permission), here as a number on the dashboard's
// taskbar button. Drawn by the dashboard's page: the main process has no canvas.
let badged = 0;
async function badge() {
  if (process.platform !== 'win32' || !dash || dash.isDestroyed()) return;
  const n = engine.live().filter((s) => s.status === 'waiting').length;
  if (n === badged) return;
  badged = n;
  if (!n) return dash.setOverlayIcon(null, '');
  const label = n > 9 ? '9+' : String(n);
  const url = await dash.webContents
    .executeJavaScript(
      `(() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
        g.fillStyle = '#e5484d'; g.beginPath(); g.arc(16, 16, 16, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.font = 'bold ${label.length > 1 ? 15 : 21}px "Segoe UI", sans-serif'; g.textAlign = 'center';
        g.textBaseline = 'middle'; g.fillText(${JSON.stringify(label)}, 16, 17); return c.toDataURL(); })()`,
    )
    .catch(() => null);
  // The page not ready yet (the app just started): the next state tries again.
  if (!url) return void (badged = 0);
  if (badged === n && dash && !dash.isDestroyed()) dash.setOverlayIcon(nativeImage.createFromDataURL(url), `${n} waiting for you`);
}

function showDashboard() {
  if (!dash) createDashboard();
  if (dash.isMinimized()) dash.restore();
  dash.show();
  dash.focus();
}

// ---------- the dashboard's requests (the "radar" handler) ----------
function handleRadar(msg) {
  switch (msg.type) {
    case 'ready':
      engine.requestInit();
      pushCloud();
      return true;
    case 'open':
      return openSession(msg.sid, false);
    case 'fork':
      return openSession(msg.sid, true);
    case 'newTerminal':
      return showOverlay('Overlay.newTerminal()');
    case 'openTerminal':
      return chats.get(msg.id) && showChat(msg.id);
    case 'endSession':
      return endSession(msg.sid);
    case 'log':
      console.log('dashboard page:', msg.msg);
      return true;
    default:
      return true;
  }
}

// ---------- terminal and chat windows ----------
function chatInfo(id, c) {
  const s = c.sessionId && engine.live().find((x) => x.sessionId === c.sessionId);
  // A chat with no live Claude after its first seconds is a terminal: Claude exited, or never started (not installed).
  const starting = c.claude && Date.now() - c.startedAt < 15_000;
  const status = !terminals.has(id) ? 'ended' : s ? s.status : starting ? 'busy' : 'terminal';
  return { title: (s && s.name) || c.title, status: status === 'shell' ? 'idle' : status, cwd: tildify(c.cwd) };
}

const tildify = (p) => (p && p.startsWith(os.homedir()) ? '~' + p.slice(os.homedir().length) : p || '');

/**
 * Which conversation a chat window shows. The engine finds a chat's Claude under the window's shell (`tab`), and that
 * always wins, also over a guess made before it came; until then a new chat takes the first live session in its folder.
 * A chat that outlived the last launch waits for the engine: the guess could take another chat in the same folder.
 */
function matchChats() {
  const live = engine.live();
  for (const s of live) {
    const c = s.tab && chats.get(s.tab);
    if (!c || !c.claude || c.sessionId === s.sessionId) continue;
    // A session the engine places in this window too keeps it (a Claude started inside the chat's Claude doesn't take
    // its window); a guess gives way.
    if (!live.some((x) => x.sessionId === c.sessionId && x.tab === s.tab)) c.sessionId = s.sessionId;
  }
  const taken = new Set([...chats.values()].map((c) => c.sessionId).filter(Boolean));
  for (const c of chats.values()) {
    if (!c.claude || c.sessionId || !c.claudeArgs) continue;
    const s = live.find((x) => !taken.has(x.sessionId) && samePath(x.cwd, c.cwd));
    if (s) {
      c.sessionId = s.sessionId;
      taken.add(s.sessionId);
    }
  }
}
const samePath = (a, b) => !!a && !!b && path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

/**
 * A chat or terminal window. A new one starts its shell (Claude in it with `claudeArgs`); one given the `id` of a session
 * that outlived the app attaches to it instead (`claude`: whether it was started as a chat), hidden unless `show`.
 */
function openChatWindow({ id = crypto.randomUUID(), cwd, claudeArgs, claude = !!claudeArgs, sessionId, title, show = true }) {
  const area = screen.getPrimaryDisplay().workArea;
  const cascade = chats.size * 28;
  const win = new BrowserWindow({
    width: 960, height: 640, minWidth: 560, minHeight: 360, x: area.x + 120 + cascade, y: area.y + 80 + cascade,
    title: title || "Atalay's Terminal", backgroundColor: themes.color('--code-bg'), show: false, autoHideMenuBar: true,
    ...(PROBE ? { x: -32000, y: -32000, frame: false } : {}),
    webPreferences: webPrefs(),
  });
  bootFor(win.webContents);
  const c = { win, sessionId, cwd, claude, claudeArgs, title: title || path.basename(cwd || os.homedir()), startedAt: Date.now() };
  chats.set(id, c);
  win.loadFile(path.join(__dirname, '..', 'pages', 'terminal.html'));
  win.once('ready-to-show', () => show && (PROBE ? win.showInactive() : win.show()));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  // Once its first seconds are over a chat says what it is even if nothing else changes (chatInfo).
  if (claude) setTimeout(() => chats.get(id) === c && send(win, 'term:info', chatInfo(id, c)), 15_500);
  // Closing a chat's window only hides it: Claude keeps going and the dashboard brings it back. Closing a terminal
  // ends its shell, as a terminal app's window does. Quitting closes them all: their sessions were seen to just before
  // (the host's go on).
  win.on('close', (e) => {
    if (quitting) return;
    if (!c.claude || !terminals.has(id)) {
      terminals.kill(id);
      return;
    }
    e.preventDefault();
    win.hide();
  });
  win.on('closed', () => {
    if (chats.get(id)?.win === win) chats.delete(id);
  });
  return id;
}

function showChat(id) {
  const c = chats.get(id);
  if (!c || c.win.isDestroyed()) return false;
  if (c.win.isMinimized()) c.win.restore();
  c.win.show();
  c.win.focus();
  return true;
}

function openSession(sid, fork) {
  if (!sid) return false;
  const live = engine.live().find((s) => s.sessionId === sid);
  if (!fork) {
    for (const [id, c] of chats) if (c.sessionId === sid && terminals.has(id)) return showChat(id);
    // Running in one of the app's windows that doesn't know it yet: a terminal Claude was started in, a chat back from
    // the last launch.
    if (live && live.tab && chats.has(live.tab) && terminals.has(live.tab)) return showChat(live.tab);
  }
  const cwd = engine.sessionCwd(sid) || (live && live.cwd);
  if (!cwd || !fs.existsSync(cwd)) {
    dialog.showMessageBox(dash || undefined, { type: 'warning', message: 'Project folder not found', detail: cwd || "Couldn't tell which folder this chat started in." });
    return false;
  }
  // A chat running in another terminal can't be resumed twice: it opens as a copy, as "Open a Copy" does on the Mac.
  const copy = fork || !!live;
  openChatWindow({ cwd, claudeArgs: ['--resume', sid, ...(copy ? ['--fork-session'] : [])], sessionId: copy ? null : sid, title: (copy ? '⑂ ' : '') + ((live && live.name) || sid.slice(0, 8)) });
  return true;
}

function endSession(sid) {
  const live = engine.live().find((s) => s.sessionId === sid);
  for (const [id, c] of chats) {
    if (c.sessionId === sid || (live && live.tab === id)) {
      terminals.kill(id);
      if (!c.win.isDestroyed()) c.win.destroy();
      chats.delete(id);
      return true;
    }
  }
  // Running outside the app: its process ends.
  if (live && live.pid) {
    try {
      process.kill(live.pid);
    } catch {}
  }
  engine.dismiss(sid, live && live.pid);
  return true;
}

// The terminal pages' lines to their shells.
const chatOf = (e) => [...chats.entries()].find(([, c]) => c.win && !c.win.isDestroyed() && c.win.webContents === e.sender);
ipcMain.on('term:ready', (e, { cols, rows }) => {
  const found = chatOf(e);
  if (!found) return;
  const [id, c] = found;
  // A new window starts its shell; one for a session that's already running (it outlived the app, or the page
  // reloaded) attaches to it.
  if (terminals.has(id)) terminals.attach(id, cols, rows);
  else {
    terminals
      .spawn({ id, cwd: c.cwd, claudeArgs: c.claudeArgs, cols, rows, title: c.title })
      .catch((err) => send(c.win, 'term:data', `\r\n\x1b[31m${err.message}\x1b[0m\r\n`));
  }
  send(c.win, 'term:info', chatInfo(id, c));
});
ipcMain.on('term:input', (e, data) => {
  const found = chatOf(e);
  if (found) terminals.write(found[0], data);
});
ipcMain.on('term:resize', (e, { cols, rows }) => {
  const found = chatOf(e);
  if (found) terminals.resize(found[0], cols, rows);
});
ipcMain.on('term:end', (e) => {
  const found = chatOf(e);
  if (!found) return;
  terminals.kill(found[0]);
  found[1].win.destroy();
  chats.delete(found[0]);
});
ipcMain.on('term:copy', (e, text) => {
  if (chatOf(e) && typeof text === 'string' && text) clipboard.writeText(text);
});
ipcMain.on('term:dashboard', () => showDashboard());
ipcMain.on('term:open', (_e, uri) => {
  if (/^https?:\/\//.test(uri)) shell.openExternal(uri);
});

// ---------- the overlay: the shortcut wheel and the new-terminal folder picker, over the whole screen ----------
let over = null, overReady = false, overPending = null;
function showOverlay(js) {
  if (!over || over.isDestroyed()) {
    overReady = false;
    over = new BrowserWindow({
      frame: false, transparent: true, resizable: false, movable: false, show: false, skipTaskbar: true, hasShadow: false,
      alwaysOnTop: true, backgroundColor: '#00000000', webPreferences: webPrefs(),
    });
    bootFor(over.webContents);
    over.loadFile(path.join(WEB, 'overlay.html'));
    over.on('blur', hideOverlay);
  }
  const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  over.setBounds(d.bounds);
  over.setAlwaysOnTop(true, 'pop-up-menu');
  over.show();
  over.focus();
  if (overReady) run(over, js);
  else overPending = js;
  return true;
}
function hideOverlay() {
  if (over && !over.isDestroyed() && over.isVisible()) over.hide();
}
/** The wheel, centred where the pointer is (Ctrl+K: Windows has no three-finger click). */
function showShortcuts() {
  const p = screen.getCursorScreenPoint();
  const d = screen.getDisplayNearestPoint(p);
  return showOverlay(`Overlay.shortcuts(${p.x - d.bounds.x}, ${p.y - d.bounds.y})`);
}

// ---------- the messages panels: the corner's notices and friends' chats ----------
function panelWindow(role, friend) {
  const win = new BrowserWindow({
    width: 380, height: 140, frame: false, transparent: true, resizable: false, show: false, skipTaskbar: role === 'notices',
    alwaysOnTop: role === 'notices', hasShadow: false, backgroundColor: '#00000000', webPreferences: webPrefs(),
  });
  bootFor(win.webContents, { role, friend });
  panelWaiting.set(win, []);
  win.loadFile(path.join(WEB, 'messages.html'));
  return win;
}

// The level-up waits for the app to be in front (the notices' "focus"), as on the Mac.
function tellFocus() {
  toNotices(`focus(${!!BrowserWindow.getFocusedWindow()})`);
}
app.on('browser-window-focus', tellFocus);
// Going from one of the app's windows to another blurs the first before the second has focus.
app.on('browser-window-blur', () => setImmediate(tellFocus));

function notices() {
  if (PROBE) return null;
  if (!panels.notices || panels.notices.isDestroyed()) panels.notices = panelWindow('notices');
  return panels.notices;
}

function openFriendChat(friend) {
  let win = panels.chats.get(friend);
  if (!win || win.isDestroyed()) {
    win = panelWindow('chat', friend);
    panels.chats.set(friend, win);
    win.on('closed', () => panels.chats.delete(friend));
  }
  // The conversation, loaded and in front (a panel that's already open comes forward).
  runPanel(win, `window.__messages && __messages.open(${JSON.stringify(friend)})`);
  return true;
}

function handleMessages(win, body) {
  const role = win === panels.notices ? 'notices' : 'chat';
  switch (body.type) {
    case 'ready': {
      const waiting = panelWaiting.get(win) || [];
      panelWaiting.delete(win);
      for (const js of waiting) run(win, js);
      if (role === 'notices') tellFocus();
      return true;
    }
    case 'layout': {
      const w = Math.round(body.w || 0), h = Math.round(body.h || 0);
      if (w < 1 || h < 1) {
        win.hide();
        if (role === 'chat') win.close();
        return true;
      }
      const d = screen.getPrimaryDisplay();
      if (role === 'notices') {
        win.setIgnoreMouseEvents(body.place === 'fire', { forward: true });
        if (body.place === 'screen') {
          win.setAlwaysOnTop(true, 'screen-saver');
          win.setBounds(d.bounds);
          win.show();
          win.focus();
        } else {
          win.setAlwaysOnTop(true, 'floating');
          const a = d.workArea;
          win.setBounds(body.place === 'fire' ? a : { x: a.x + a.width - w - 12, y: a.y + a.height - h - 12, width: w, height: h });
          if (!win.isVisible()) win.showInactive();
        }
      } else {
        const b = win.getBounds();
        if (!win.isVisible()) {
          const saved = settings.get('chatWindowTopLeft');
          const a = d.workArea;
          const [x, y] = saved || [a.x + Math.round((a.width - w) / 2), a.y + Math.round((a.height - h) / 2)];
          win.setBounds({ x, y, width: w, height: h });
          win.show();
        } else win.setBounds({ x: b.x, y: b.y, width: w, height: h });
        if (body.focus) win.focus();
      }
      return true;
    }
    case 'drag': {
      const [x, y] = win.getPosition();
      win.setPosition(Math.round(x + (body.dx || 0)), Math.round(y + (body.dy || 0)));
      return true;
    }
    case 'dragEnd':
      settings.set('chatWindowTopLeft', win.getPosition());
      return true;
    case 'openUpdate':
      showDashboard();
      toDash('openUpdate()');
      return true;
    case 'openProfile':
      showDashboard();
      toDash('openProfile()');
      return true;
    case 'openNotifications':
      showDashboard();
      toDash('openView("notifications")');
      return true;
    case 'openChat':
      return openFriendChat(body.id);
    case 'showing':
      toNotices(`showing && __messages.showing(${JSON.stringify(body.id ? [body.id] : [])})`);
      return true;
    case 'log':
      console.log(`${role} page:`, body.msg);
      return true;
    default:
      return true;
  }
}

// ---------- updates: the releases repo's "windows" release (electron-updater; scripts/release.js) ----------
// A new version downloads by itself and goes in, as on the Mac, when the user has stepped away for 10 minutes (or wants
// updates right away) and the restart stops nothing: chats in the session host go on across it. One running in the app
// itself (no host) would end, so then it waits for the user's quit (or "update now").
const updates = (() => {
  let offer = null, ready = false, busy = null, checking = false, checkedAt = null;
  const usable = !!autoUpdater && app.isPackaged && !PROBE;
  const rightAway = () => !!settings.get('updateRightAway');
  const maybeRestart = () => {
    if (!ready || terminals.list().some((t) => terminals.local(t.id))) return;
    if (rightAway() || powerMonitor.getSystemIdleTime() >= 600) install();
  };
  const install = () => {
    busy = 'restarting…';
    pushCloud();
    setImmediate(() => autoUpdater.quitAndInstall(true, true));
  };
  if (usable) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (i) => {
      offer = { version: i.version, build: 0, notes: notesOf(i.releaseNotes) };
      pushCloud();
      toNotices(`update(${JSON.stringify({ version: i.version, build: 0 })})`);
    });
    autoUpdater.on('update-downloaded', () => {
      ready = true;
      pushCloud();
      maybeRestart();
    });
    autoUpdater.on('error', (e) => console.error('updates:', e.message));
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 30 * 60_000);
    setInterval(maybeRestart, 60_000);
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10_000);
  }
  return {
    state: () => ({ update: offer, updateReady: ready, updating: busy, updateRightAway: rightAway(), checking, checkedAt, xpPaused: false }),
    async check() {
      if (!usable) return;
      checking = true;
      pushCloud();
      await autoUpdater.checkForUpdates().catch(() => {});
      checking = false;
      checkedAt = Date.now();
      pushCloud();
    },
    now() {
      if (!usable || !offer) return;
      if (ready) return install();
      busy = 'downloading…';
      pushCloud();
      autoUpdater.downloadUpdate().catch(() => {});
    },
    setRightAway(on) {
      settings.set('updateRightAway', !!on);
      pushCloud();
      maybeRestart();
    },
  };
})();

function notesOf(n) {
  if (!n) return '';
  const text = Array.isArray(n) ? n.map((x) => x.note || '').join('\n') : String(n);
  return text.replace(/<[^>]+>/g, '\n').split(/\n+/).map((s) => s.trim()).filter(Boolean).join('\n');
}

// ---------- the pages' calls ----------
ipcMain.on('atl:boot', (e) => {
  e.returnValue = boots.get(e.sender.id) || { css: themes.css() };
});

ipcMain.handle('atl:post', async (e, name, body) => {
  body = body || {};
  const win = BrowserWindow.fromWebContents(e.sender);
  try {
    switch (name) {
      case 'radar':
        return handleRadar(body);
      case 'git':
        return await git.handle(body);
      case 'theme':
        return themes.handle(body);
      case 'messages':
        return handleMessages(win, body);
      case 'overlay':
        if (body.type === 'ready') {
          overReady = true;
          if (overPending) run(over, overPending);
          overPending = null;
          return true;
        }
        if (body.type === 'done') return hideOverlay(), true;
        if (body.type === 'newTerminal') {
          const dir = overlay.expand(String(body.dir || ''));
          hideOverlay();
          if (dir && fs.existsSync(dir)) openChatWindow({ cwd: dir, claudeArgs: null, title: path.basename(dir) });
          return true;
        }
        return await overlay.handle(body);
      case 'cloud':
        if (body.type === 'update') return updates.now(), true;
        if (body.type === 'checkUpdate') return await updates.check(), cloudState();
        if (body.type === 'updateRightAway') return updates.setRightAway(body.on), cloudState();
        if (body.type === 'openChat') return openFriendChat(body.id);
        if (body.type === 'state') return cloudState();
        return await cloud.handle(body);
      default:
        return null;
    }
  } catch (err) {
    console.error(`${name}:`, err);
    return { error: String((err && err.message) || err) };
  }
});

// ---------- menu and keys ----------
function buildMenu() {
  const focusedChat = () => [...chats.entries()].find(([, c]) => c.win && !c.win.isDestroyed() && c.win.isFocused());
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New Terminal…', accelerator: 'CmdOrCtrl+N', click: () => showOverlay('Overlay.newTerminal()') },
        { label: 'Shortcut Wheel', accelerator: 'CmdOrCtrl+K', click: () => showShortcuts() },
        // No key of its own: Ctrl+0 is Actual Size's (the text size, ⌘0 on the Mac), and two items on one key leave only
        // one of them working.
        { label: 'Dashboard', click: () => showDashboard() },
        { type: 'separator' },
        {
          label: 'Close Window', accelerator: 'CmdOrCtrl+W',
          click: () => {
            const w = BrowserWindow.getFocusedWindow();
            if (w && w !== dash) w.close();
          },
        },
        { role: 'quit', label: 'Quit', accelerator: 'CmdOrCtrl+Q' },
      ],
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    {
      label: 'View',
      submenu: [
        { label: 'Reload Dashboard', accelerator: 'CmdOrCtrl+R', click: () => dash && dash.reload() },
        { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' },
        { type: 'separator' },
        { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    { label: 'Window', submenu: [{ role: 'minimize' }, { label: 'End This Terminal', click: () => { const f = focusedChat(); if (f) { terminals.kill(f[0]); f[1].win.destroy(); chats.delete(f[0]); } } }] },
  ]));
}

// ---------- start, quit ----------
let quitting = false;

app.on('second-instance', () => showDashboard());

app.whenReady().then(() => {
  if (PROBE && app.dock) app.dock.hide();
  buildMenu();
  createDashboard();
  engine.start();
  cloud.start();
  // The corner's notices can cover the screen (a level-up): never during a development check.
  if (!PROBE) notices();
  // The orbit's cinematic camera waits for minutes without input; the terminals ride the orbit as cars.
  setInterval(() => {
    toDash(`idle(${powerMonitor.getSystemIdleTime().toFixed(1)})`);
    const cars = [...chats.entries()].filter(([id, c]) => !c.claude && terminals.has(id))
      .map(([id, c]) => ({ id, cwd: tildify(c.cwd), dir: path.basename(c.cwd), cmd: '', running: false, cpu: 0 }));
    toDash(`terminals(${JSON.stringify(cars)})`);
  }, 2000);
  powerMonitor.on('resume', () => cloud.kick());
  // Chats and terminals that outlived the last launch come back hidden, as on the Mac, so a launch doesn't throw windows
  // on screen: a chat is on the orbit, a terminal a car, and a click opens its window.
  terminals.restore().then((found) => {
    for (const s of found) openChatWindow({ id: s.id, cwd: s.cwd, claude: s.claude, title: s.title, show: false });
  });
  if (PROBE) probe();
});

app.on('before-quit', (e) => {
  if (quitting) return;
  // Only chats running in the app itself stop: the session host's go on, and come back at the next launch.
  const running = [...chats.entries()].filter(([id, c]) => c.claude && terminals.local(id)).length;
  if (running && !PROBE) {
    const r = dialog.showMessageBoxSync(dash || undefined, {
      type: 'warning', buttons: ['Quit', 'Cancel'], defaultId: 1, cancelId: 1, noLink: true,
      message: running === 1 ? '1 chat is still running' : `${running} chats are still running`,
      detail: 'Quitting stops Claude in those windows. The conversations stay saved and can be resumed.',
    });
    if (r !== 0) return e.preventDefault();
  }
  quitting = true;
  terminals.detachAll();
  engine.stop();
  cloud.stop();
});

app.on('window-all-closed', () => {
  if (!quitting) app.quit();
});

// ---------- the development check (ATL_PROBE) ----------
async function probe() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shot = async (win, name) => {
    if (!win || win.isDestroyed()) return;
    const img = await Promise.race([win.webContents.capturePage(), wait(5000).then(() => null)]);
    if (!img) return console.log('probe: no picture of', name);
    fs.mkdirSync(PROBE, { recursive: true });
    fs.writeFileSync(path.join(PROBE, `${name}.png`), img.toPNG());
    console.log('probe: shot', name);
  };
  await wait(9000);
  await run(dash, "document.getElementById('boot')?.remove()");
  await shot(dash, 'dashboard');
  for (const step of (process.env.ATL_PROBE_STEPS || '').split(';;').filter(Boolean)) {
    const [name, js] = step.split('|');
    console.log('probe: step', name);
    if (js) await Promise.race([dash.webContents.executeJavaScript(js).catch((e) => console.log('probe step', name, e.message)), wait(3000)]);
    await wait(2500);
    await shot(dash, name);
  }
  if (process.env.ATL_PROBE_TERMINAL) {
    const id = openChatWindow({ cwd: os.homedir(), claudeArgs: null, title: 'probe' });
    await wait(3000);
    terminals.write(id, process.platform === 'win32' ? 'echo hello from the probe\r' : 'echo hello from the probe\r');
    await wait(2000);
    await shot(chats.get(id)?.win, 'terminal');
  }
  quitting = true;
  app.quit();
}
