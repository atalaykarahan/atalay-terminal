'use strict';
// Atalay's Terminal for Windows: the Mac app's dashboard (app/Resources/web, unchanged) in Electron. This file is the
// Mac app's MainWindowController and AppDelegate: the windows, the line between the pages and the parts that feed them
// (engine.js, cloud.js, git.js, themes.js, terminals.js), the keys and the updates.
const {
  app, BaseWindow, BrowserWindow, WebContentsView, webContents, ipcMain, dialog, Menu, shell, screen, powerMonitor, nativeTheme, net,
  clipboard, nativeImage,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { fileURLToPath } = require('url');

const { createEngine } = require('./engine');
const { createGit } = require('./git');
const { createCloud } = require('./cloud');
const { createThemes } = require('./themes');
const { createAIColors } = require('./aicolors');
const { createTerminals, which } = require('./terminals');
const { createOverlay } = require('./overlay');
const { createRunaways } = require('./runaways');
const { createSavers } = require('./savers');
const { createChatList } = require('./chatlist');
const { createLimits } = require('./limits');

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
// The dashboard window: the chats list beside the dashboard's page, as the Mac's split view has them (two views, so
// each page is as wide as its part of the window).
let dash = null, dashView = null, chatsView = null;
const boots = new Map(); // webContents id -> what its preload asks for before the page loads
const chats = new Map(); // terminal window id -> { win, sessionId, cwd, claude, title, startedAt }
const panels = { notices: null, chats: new Map() }; // the messages panels: the corner's notices, friends' chats

// The AI tools in the theme's colours (Settings · INTERFACE): Claude Code, Codex and Antigravity on their themes that use
// the terminal's 16 colours.
const aiColors = createAIColors({
  settings,
  claudeDir: process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
  codexDir: process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
  home: os.homedir(),
});

const themes = createThemes({
  ai: aiColors,
  webDir: WEB,
  settings,
  onChange(css) {
    for (const id of boots.keys()) {
      const wc = webContents.fromId(id);
      if (wc && !wc.isDestroyed()) wc.send('atl:theme', css);
    }
    if (dash) for (const w of [dash, dashView, chatsView]) w.setBackgroundColor(themes.color('--bg'));
  },
  // Settings' text size: the dashboard zooms, as a browser does.
  onScale(factor) {
    if (dashView && !dashView.webContents.isDestroyed()) dashView.webContents.setZoomFactor(factor);
  },
});

// The token savers (rtk, caveman), shipped next to the dashboard's files; run from the sources, rtk is the one
// scripts/fetch-rtk.js put in vendor/ and caveman the Mac app's.
const savers = createSavers({
  settings,
  ownDir: path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'atalay-terminal'),
  bundled: app.isPackaged
    ? { rtk: path.join(process.resourcesPath, 'bin', 'rtk.exe'), caveman: path.join(process.resourcesPath, 'caveman') }
    : { rtk: path.join(__dirname, '..', 'vendor', 'rtk', 'rtk.exe'), caveman: path.join(__dirname, '..', '..', 'app', 'Resources', 'caveman') },
  claudeDir: process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
  codexDir: process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
  which,
  usable: process.platform === 'win32' && !PROBE,
});

const terminals = createTerminals({
  extraPath: savers.binDir,
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

// Claude's 5-hour and weekly limits: Claude Code's status line hands its JSON to a script of ours (src/limits.js).
const limits = createLimits({
  dir: path.join(app.getPath('userData')),
  claudeDir: process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
});

const engine = createEngine({
  claudeDir: path.join(os.homedir(), '.claude'),
  limitsFile: limits.file,
  // A Claude process under one of the app's terminals belongs to that window (its id becomes the session's `tab`).
  isAppPid: (pid) => (terminals.list().find((t) => t.pid === pid) || {}).id || false,
  onInit: (json) => toDash(`init(${json})`),
  onState(json) {
    toDash(`state(${json})`);
    matchChats();
    for (const [id, c] of chats) send(c.win, 'term:info', chatInfo(id, c));
    badge();
    pushChats();
  },
  onEvents: (json) => toDash(`events(${json})`),
  // The saved conversations, for the chats list.
  onHistory(items) {
    chatlist.setItems(items);
    pushChats();
  },
});

// The chats list beside the dashboard: what it lists, with the stars and the archive (src/chatlist.js).
const chatlist = createChatList({ settings });

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
  menu: (items, at) => popupMenu(items, at, dashView),
  trash: (p) => shell.trashItem(p),
});

/**
 * A native menu of `items` ({ id, title } or { separator: true }, `items` for a submenu) at `at`, a point in the page of
 * `view` (one of the dashboard window's two), resolving to the id of the item picked, or null.
 */
function popupMenu(items, at, view) {
  return new Promise((resolve) => {
    let picked = null;
    const build = (list) =>
      (Array.isArray(list) ? list : []).map((i) => (i.separator || i.type === 'separator' ? { type: 'separator' } : {
        label: String(i.title || i.label || ''), enabled: i.enabled !== false, submenu: i.items ? build(i.items) : undefined,
        click: i.items ? undefined : () => (picked = i.id),
      }));
    const off = view ? view.getBounds() : { x: 0, y: 0 };
    const pos = at && Number.isFinite(at.x) && Number.isFinite(at.y) ? { x: Math.round(at.x + off.x), y: Math.round(at.y + off.y) } : {};
    Menu.buildFromTemplate(build(items)).popup({ window: dash || undefined, ...pos, callback: () => resolve(picked) });
  });
}

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
// Processes left burning a core where nobody sees them: the dashboard sounds the alarm (DANGER).
const runaways = createRunaways({
  // Each reading: the AI tools running besides Claude (Codex, Antigravity…), sessions on the orbit.
  onRead: () => engine.setOthers(runaways.ais()),
  onChange: (json) => {
    toDash(`runaways(${json})`);
    // The alarm, in the middle of the screen (the notices panel can play its sound).
    toNotices(`runaways && __messages.runaways(${json})`);
  },
});

// ---------- pushing to the pages ----------
// A window's page, or a view's (the dashboard window's two).
function pageOf(win) {
  if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) return null;
  const wc = win.webContents;
  return wc && !wc.isDestroyed() ? wc : null;
}
function run(win, js) {
  const wc = pageOf(win);
  if (wc) wc.executeJavaScript(`${js}; true`).catch(() => {});
}
function send(win, channel, data) {
  const wc = pageOf(win);
  if (wc) wc.send(channel, data);
}
// What a messages panel is told before its page reports "ready" waits for it, as on the Mac: a friend's chat opened
// with a click would otherwise stay empty, and the notices would miss the XP and events of the app's first seconds.
const panelWaiting = new WeakMap();
function runPanel(win, js) {
  const waiting = win && panelWaiting.get(win);
  if (waiting) waiting.push(js);
  else run(win, js);
}
const toDash = (call) => run(dashView, `window.__radar && window.__radar.${call}`);
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

// A window shows the app's own pages and nothing else, as on the Mac (RadarView): a page from anywhere else, a file on
// this PC included, would get their line to the app (preload.js), which reaches the shells. A link out of a page opens
// where it belongs instead (a web page in the browser, a file in VS Code from Source Control); other kinds go nowhere,
// since Windows has handlers for some that run things.
const PAGES = [WEB, path.join(__dirname, '..', 'pages')];
function ownPage(url) {
  let file;
  try {
    file = fileURLToPath(url);
  } catch {
    return false;
  }
  return PAGES.some((dir) => {
    const rel = path.relative(dir, file);
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  });
}
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (e, url) => {
    if (ownPage(url)) return;
    e.preventDefault();
    if (/^(https?|vscode):/i.test(url)) shell.openExternal(url);
  });
});

function bootFor(webContents, extra = {}) {
  const look = { font: 'Cascadia Mono', size: 13 };
  boots.set(webContents.id, { css: themes.css(), look, ...extra });
  webContents.once('destroyed', () => boots.delete(webContents.id));
}

function createDashboard() {
  const area = screen.getPrimaryDisplay().workArea;
  const bg = themes.color('--bg');
  dash = new BaseWindow({
    width: Math.min(1480, area.width), height: Math.min(900, area.height), minWidth: 980, minHeight: 600,
    title: "Atalay's Terminal", backgroundColor: bg, show: false, autoHideMenuBar: true,
    ...(PROBE ? { x: -32000, y: -32000, frame: false, width: 1480, height: 900 } : {}),
  });
  const win = dash;
  // The app's menu and its keys (Ctrl+N, Ctrl+K, Ctrl+Q…), as the other windows have them.
  if (process.platform !== 'darwin' && Menu.getApplicationMenu()) win.setMenu(Menu.getApplicationMenu());
  dashView = new WebContentsView({ webPreferences: webPrefs() });
  chatsView = new WebContentsView({ webPreferences: webPrefs() });
  const views = [dashView, chatsView];
  for (const v of views) {
    v.setBackgroundColor(bg);
    win.contentView.addChildView(v);
    bootFor(v.webContents);
    // Links in the pages open in the browser, never inside the app.
    v.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    v.webContents.on('render-process-gone', () => setTimeout(() => !v.webContents.isDestroyed() && v.webContents.reload(), 500));
    // Ctrl+B, the Mac's ⌘B: the chats list slides open or shut (in the terminals it stays the shell's).
    v.webContents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown' && input.control && !input.alt && !input.shift && !input.meta && input.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleChats();
      }
    });
  }
  chatsView.setVisible(chatsList.shown);
  layout();
  for (const ev of ['resize', 'maximize', 'unmaximize', 'restore', 'enter-full-screen', 'leave-full-screen']) win.on(ev, layout);
  dashView.webContents.loadFile(path.join(WEB, 'index.html'));
  // The text size Settings keeps, on every load (a reload starts at 100% otherwise).
  dashView.webContents.on('did-finish-load', () => dashView.webContents.setZoomFactor(themes.uiScale()));
  chatsView.webContents.loadFile(path.join(__dirname, '..', 'pages', 'chats.html'));
  // Shown once the dashboard's page is there (no empty window first), or a few seconds on whatever happens.
  let shown = false;
  const show = () => {
    if (shown || win.isDestroyed()) return;
    shown = true;
    if (PROBE) return win.showInactive();
    win.show();
    dashView.webContents.focus();
  };
  dashView.webContents.once('did-finish-load', show);
  setTimeout(show, 4000);
  const visibility = () => toDash(`visibility(${win.isVisible() && !win.isMinimized()}, ${win.isFocused()})`);
  for (const ev of ['focus', 'blur', 'minimize', 'restore', 'show', 'hide']) win.on(ev, visibility);
  // The level-up waits for the app to be in front (the notices' "focus"): the app's focus events are BrowserWindows'.
  win.on('focus', tellFocus);
  win.on('blur', () => setImmediate(tellFocus));
  win.on('closed', () => {
    // A window's views don't go with it: their pages close here.
    for (const v of views) if (!v.webContents.isDestroyed()) v.webContents.close();
    if (dash === win) dash = dashView = chatsView = null;
    clearInterval(chatsList.timer);
    chatsList.timer = null;
    chatsList.slide = null;
    chatsJSON = '';
    badged = 0;
    quitIfIdle();
  });
}

// ---------- the chats list beside the dashboard (the Mac's sidebar) ----------
// Open from the start, at the width it had when it was last closed (narrowest 210, widest 460); Ctrl+B or its × slides
// it open and shut, fading, while the dashboard gives it room and takes it back.
const CHATS_MIN = 210, CHATS_MAX = 460;
const chatsWidth = (w) => (Number.isFinite(w) ? Math.round(Math.min(CHATS_MAX, Math.max(CHATS_MIN, w))) : 280);
const chatsList = { shown: settings.get('sidebarHidden') !== true, width: chatsWidth(settings.get('sidebarWidth')), slide: null, timer: null };

function layout() {
  if (!dash || dash.isDestroyed()) return;
  const [w, h] = dash.getContentSize();
  const side = Math.round(chatsList.slide != null ? chatsList.slide : chatsList.shown ? chatsList.width : 0);
  chatsView.setBounds({ x: 0, y: 0, width: side, height: h });
  dashView.setBounds({ x: side, y: 0, width: Math.max(0, w - side), height: h });
}

// CSS's cubic-bezier(0.65, 0, 0.35, 1), the Mac's slide: progress (0…1) -> how far along.
const slideCurve = (() => {
  const [x1, y1, x2, y2] = [0.65, 0, 0.35, 1];
  const at = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (t) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < t) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
})();

function toggleChats() {
  if (!dash || chatsList.timer) return;
  const opening = !chatsList.shown;
  const from = opening ? 0 : chatsList.width, to = opening ? chatsList.width : 0;
  if (opening) chatsView.setVisible(true);
  run(chatsView, `window.__chats && __chats.fade(${opening})`);
  const t0 = Date.now();
  chatsList.slide = from;
  layout();
  chatsList.timer = setInterval(() => {
    const t = Math.min(1, (Date.now() - t0) / 450);
    chatsList.slide = from + (to - from) * slideCurve(t);
    if (t >= 1) {
      clearInterval(chatsList.timer);
      chatsList.timer = null;
      chatsList.slide = null;
      chatsList.shown = opening;
      if (!opening && chatsView) chatsView.setVisible(false);
      settings.set('sidebarHidden', !opening);
    }
    layout();
  }, 16);
}

let chatsJSON = '', chatsVersion = -1;
function pushChats(force) {
  if (!chatsView) return;
  const live = chatlist.setLive(engine.live());
  // A chat with a window of the app, shown or not: "in a window".
  const open = chatlist.setOpen([...chats.values()].map((c) => c.sessionId).filter(Boolean));
  if (!force && !live && !open && chatlist.version() === chatsVersion) return;
  chatsVersion = chatlist.version();
  const json = JSON.stringify(chatlist.snapshot());
  if (json === chatsJSON && !force) return;
  chatsJSON = json;
  run(chatsView, `window.__chats && __chats.update(${json})`);
}

// The chats list's requests (pages/chats.js).
function handleChats(msg) {
  const dir = () => {
    const d = String(msg.cwd || '');
    return d && fs.existsSync(d) ? d : null;
  };
  switch (msg.type) {
    case 'ready':
      pushChats(true);
      return true;
    case 'open':
      return openSession(String(msg.id || ''), false);
    case 'fork':
      return openSession(String(msg.id || ''), true);
    case 'newTerminal': {
      const d = dir();
      if (d) openChatWindow({ cwd: d, claudeArgs: null, title: path.basename(d) });
      return true;
    }
    case 'reveal': {
      const d = dir();
      if (d) shell.openPath(d);
      return true;
    }
    case 'copyId':
      if (typeof msg.id === 'string' && msg.id) clipboard.writeText(msg.id);
      return true;
    case 'favorite':
      chatlist.toggleFavorite(String(msg.id || ''));
      break;
    case 'archive':
      chatlist.toggleArchived(String(msg.id || ''));
      break;
    case 'rename':
      chatlist.rename(String(msg.id || ''), String(msg.name ?? ''));
      break;
    case 'folders':
      for (const k of Array.isArray(msg.keys) ? msg.keys : []) chatlist.setFolder(String(k || ''), msg.on === true);
      break;
    case 'menu':
      return popupMenu(msg.items, msg.at, chatsView);
    case 'close':
      toggleChats();
      return true;
    // Dragged wider or narrower: kept for the next time it opens (and the next launch) once the drag is over.
    case 'width':
      if (!chatsList.shown || chatsList.timer) return true;
      chatsList.width = chatsWidth(Number(msg.w));
      layout();
      if (msg.done) settings.set('sidebarWidth', chatsList.width);
      return true;
    default:
      throw new Error('unknown request');
  }
  pushChats(true);
  return true;
}

// Settings' archived chats (web/cloud.js's "archived chats · manage"): the list by folder, and taking a chat, a folder
// or all of them back out.
function handleArchive(msg) {
  switch (msg.type) {
    case 'list':
      break;
    case 'restore':
      chatlist.restore(String(msg.id || ''));
      break;
    case 'restoreFolder':
      chatlist.setFolder(String(msg.cwd || ''), false);
      break;
    case 'restoreAll':
      chatlist.restoreAll();
      break;
    default:
      throw new Error('unknown request');
  }
  pushChats();
  return { folders: chatlist.archivedList() };
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
  const url = await dashView.webContents
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
  // The keys go to the dashboard's page unless the chats list has them (its search).
  if (!chatsView.webContents.isFocused()) dashView.webContents.focus();
}

// ---------- the dashboard's requests (the "radar" handler) ----------
function handleRadar(msg) {
  switch (msg.type) {
    case 'ready':
      engine.requestInit();
      pushCloud();
      pushTerminals(true);
      toDash(`runaways(${runaways.json()})`);
      return true;
    case 'open':
      return openSession(msg.sid, false);
    case 'fork':
      return openSession(msg.sid, true);
    case 'newTerminal':
      return showOverlay('Overlay.newTerminal()');
    case 'openTerminal':
      // A car: its window comes up in front, a closed one too (its terminal ran on out of sight).
      return chats.get(msg.id) && showChat(msg.id);
    case 'endLeftover':
      return runaways.endLeft(msg.pid, msg.started);
    case 'endSession':
      return endSession(msg.sid);
    case 'endRunaway':
      return runaways.end(msg.pid, msg.started);
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
    const s = live.find((x) => !x.ai && !taken.has(x.sessionId) && samePath(x.cwd, c.cwd));
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
  // Closing a window (Ctrl+W, its ×) only hides it, as on the Mac: what runs in it goes on, Claude as a session on the
  // orbit and a terminal as the same car it was (no blast), and a click there brings the window back. End Session ends
  // it. Quitting closes them all: their sessions were seen to just before (the host's go on).
  win.on('close', (e) => {
    if (quitting || !terminals.has(id)) return;
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

/** The window of a process running outside the app, to the front: its own or the first of its parents' that has one. */
function revealOutside(pid) {
  if (process.platform !== 'win32' || !(pid > 0)) return;
  const own = runaways.ais().find((a) => a.pid === pid);
  const ids = [pid, ...((own && own.chain) || [])].filter((n) => Number.isInteger(n) && n > 0);
  const script = `$s = New-Object -ComObject WScript.Shell; foreach ($id in @(${ids.join(',')})) { if ($s.AppActivate([int]$id)) { break } }`;
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 10_000 }, () => {});
}

function openSession(sid, fork) {
  if (!sid) return false;
  const live = engine.live().find((s) => s.sessionId === sid);
  // Another AI tool (Codex…) has no conversation to resume or copy: a click shows the window it runs in, ours, or else
  // the terminal's outside the app (Windows Terminal, VS Code…), the first of its parents with a window.
  if (sid.startsWith('ai:')) {
    if (fork || !live) return false;
    if (live.tab && chats.has(live.tab) && terminals.has(live.tab)) return showChat(live.tab);
    revealOutside(live.pid);
    return true;
  }
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

/**
 * End Session, as on the Mac: the window goes and everything that runs in it ends, gently first (the host hangs the
 * session up, then ends what's still there three seconds on, a dev server that shrugged it off included). The dashboard
 * drops its session now and its car blows up now, not when the processes are gone.
 */
function endTerminal(id) {
  const c = chats.get(id);
  const t = terminals.list().find((x) => x.id === id);
  const tree = t && t.pid ? runaways.tree(t.pid) : [];
  // What it ran is on its way out: one that outlives the shell by a second or two isn't a car left behind.
  for (const p of tree) ending.set(p.pid, Date.now() + 10_000);
  // Without the host's help (a terminal running in the app, an older host), what the shell started apart from its
  // console is ended here once the rest has had its time.
  if (!terminals.end(id) && tree.length) setTimeout(() => runaways.fresh().then(() => runaways.kill(tree)), 3000);
  if (c && c.sessionId) {
    const live = engine.live().find((s) => s.sessionId === c.sessionId);
    engine.dismiss(c.sessionId, live && live.pid);
  }
  toDash(`terminalGone(${JSON.stringify(id)})`);
  if (c) {
    if (c.win && !c.win.isDestroyed()) c.win.destroy();
    chats.delete(id);
  }
  quitIfIdle();
}

function endSession(sid) {
  const live = engine.live().find((s) => s.sessionId === sid);
  for (const [id, c] of chats) {
    if (c.sessionId === sid || (live && live.tab === id)) {
      endTerminal(id);
      return true;
    }
  }
  // Running outside the app: its process ends.
  if (live && live.pid) {
    // Another AI tool ends with all it started: Codex's launcher alone would leave its codex.exe running.
    if (live.ai) runaways.endLeft(live.pid, Number(sid.split(':')[2]));
    else {
      try {
        process.kill(live.pid);
      } catch {}
    }
  }
  engine.dismiss(sid, live && live.pid);
  return true;
}

// ---------- the orbit's cars ----------
// Every terminal of the app with no Claude in it is a car of its own (a chat whose Claude exited too), a closed one
// included, until End Session: what runs in it (its first job and the CPU that job's processes use) decides how it
// flies. What a closed terminal left running is an amber car (runaways.left) that ends with a click.
let terminalsJSON = '';
const ending = new Map(); // pid -> until when it's an ended terminal's process, not a car left behind
function pushTerminals(force) {
  const live = engine.live(), list = [], jobs = [];
  for (const [pid, until] of ending) if (until < Date.now()) ending.delete(pid);
  for (const t of terminals.list()) {
    const c = chats.get(t.id);
    // Claude in it is a session on the orbit, not a car.
    if (!c || !t.pid || live.some((s) => s.tab === t.id) || (c.claude && chatInfo(t.id, c).status !== 'terminal')) continue;
    const kids = runaways.children(t.pid);
    if (kids.some((k) => /^claude$/i.test(k.name))) continue;
    const job = kids[0];
    if (job) jobs.push(job.pid);
    // The folder the job runs in (PowerShell's cd doesn't move the shell's own), else the one the terminal opened in.
    const cwd = (job && job.cwd) || c.cwd || os.homedir();
    list.push({
      id: t.id, cwd: tildify(cwd), dir: path.basename(cwd) || cwd, cmd: job ? commandLabel(job.cmd || job.name) : '', running: !!job,
      cpu: Math.round(runaways.busy(kids.map((k) => k.pid))),
    });
  }
  for (const l of runaways.left()) {
    if (ending.has(l.pid)) continue;
    list.push({
      id: `left:${l.pid}:${l.started}`, cwd: tildify(l.cwd), dir: l.cwd ? path.basename(l.cwd) || l.cwd : l.name, cmd: commandLabel(l.cmd),
      running: true, cpu: Math.round(l.cpu), left: true, pid: l.pid, started: l.started,
    });
  }
  // Their folders come with the next reading, and the AI tools' (the title of their session).
  runaways.want([...jobs, ...runaways.ais().map((a) => a.pid)]);
  list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const json = JSON.stringify(list);
  if (json === terminalsJSON && !force) return;
  terminalsJSON = json;
  toDash(`terminals(${json})`);
}

/** A process's command line as a car's label: `"C:\…\node.exe" "C:\…\npm-cli.js" run dev` -> "npm run dev". */
function commandLabel(cmd) {
  // A path is cut to its last part; a switch (/c) stays as it is.
  const words = (String(cmd).match(/"[^"]*"|\S+/g) || []).map((w) => w.replace(/^"|"$/g, '')).filter(Boolean)
    .map((w) => (/\\|.\//.test(w) ? path.win32.basename(w) : w));
  if (words.length) words[0] = words[0].replace(/\.(exe|cmd|bat)$/i, '');
  if (/^node(js)?$/i.test(words[0] || '') && words.length > 1) words.shift();
  if (/^np[mx]-cli\.js$/i.test(words[0] || '')) words[0] = words[0].slice(0, 3).toLowerCase();
  const label = words.join(' ');
  return label.length > 48 ? `${label.slice(0, 47)}…` : label;
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
  if (found) endTerminal(found[0]);
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
/** The wheel, centred where the pointer is (Ctrl and the middle mouse button, or Ctrl+K: Windows has no four-finger
 *  click). */
function showShortcuts() {
  const p = screen.getCursorScreenPoint();
  const d = screen.getDisplayNearestPoint(p);
  return showOverlay(`Overlay.shortcuts(${p.x - d.bounds.x}, ${p.y - d.bounds.y})`);
}
// Ctrl and the middle button in any of the app's windows (preload.js).
ipcMain.on('atl:wheel', () => showShortcuts());

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
  toNotices(`focus(${!!BaseWindow.getFocusedWindow()})`);
}
app.on('browser-window-focus', tellFocus);
// Going from one of the app's windows to another blurs the first before the second has focus.
app.on('browser-window-blur', () => setImmediate(tellFocus));

function notices() {
  if (PROBE) return null;
  if (!panels.notices || panels.notices.isDestroyed()) panels.notices = panelWindow('notices');
  return panels.notices;
}

// A friend's chat, all of it on one display (by default the one it's mostly on), moved in from the edges (cut to fit
// only where the display is smaller). With several displays a chat opened where it was left on one since unplugged or
// moved, or grew past the bottom, out of sight.
function wholeOnDisplay(r, display = screen.getDisplayMatching(r)) {
  const a = display.workArea;
  const width = Math.min(r.width, a.width), height = Math.min(r.height, a.height);
  return { x: Math.min(Math.max(r.x, a.x), a.x + a.width - width), y: Math.min(Math.max(r.y, a.y), a.y + a.height - height), width, height };
}

// The display a chat opens on, as on the Mac: the dashboard's while it's on screen, else the one in use (the pointer's).
// Opening where it was last left could put it on another display, out of sight of someone looking at the dashboard.
function chatHome() {
  if (dash && !dash.isDestroyed() && dash.isVisible() && !dash.isMinimized()) return screen.getDisplayMatching(dash.getBounds());
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

// A display plugged in, unplugged or changed: the chats on screen come back into view, whole.
let watchingDisplays = false;
function watchDisplays() {
  if (watchingDisplays) return;
  watchingDisplays = true;
  for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) {
    screen.on(event, () => {
      for (const w of panels.chats.values()) if (!w.isDestroyed() && w.isVisible()) w.setBounds(wholeOnDisplay(w.getBounds()));
    });
  }
}

function openFriendChat(friend) {
  watchDisplays();
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
      // The page measures in its own pixels: at a zoom other than 100% (the dashboard's text size, which Chromium gives
      // every page of the app's), the window is that many times larger.
      const z = win.webContents.getZoomFactor() || 1;
      const w = Math.round((body.w || 0) * z), h = Math.round((body.h || 0) * z);
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
          const at = body.place === 'center' ? { x: a.x + Math.round((a.width - w) / 2), y: a.y + Math.round((a.height - h) / 2) } : { x: a.x + a.width - w - 12, y: a.y + a.height - h - 12 };
          win.setBounds(body.place === 'fire' ? a : { ...at, width: w, height: h });
          if (!win.isVisible()) win.showInactive();
        }
      } else {
        const b = win.getBounds();
        if (!win.isVisible()) {
          // Where it was left while that's on the display it opens on (give or take 40 px), else that display's middle.
          const home = chatHome(), a = home.workArea;
          const saved = settings.get('chatWindowTopLeft');
          const p = Array.isArray(saved) && saved.length === 2 && { x: saved[0] + 40, y: saved[1] + 20 };
          const left = p && p.x >= a.x - 40 && p.x < a.x + a.width + 40 && p.y >= a.y - 40 && p.y < a.y + a.height + 40;
          const [x, y] = left ? saved : [a.x + Math.round((a.width - w) / 2), a.y + Math.round((a.height - h) / 2)];
          win.setBounds(wholeOnDisplay({ x, y, width: w, height: h }, home));
          win.show();
        } else win.setBounds(wholeOnDisplay({ x: b.x, y: b.y, width: w, height: h }));
        if (body.focus) win.focus();
      }
      return true;
    }
    case 'drag': {
      const [x, y] = win.getPosition(), z = win.webContents.getZoomFactor() || 1;
      win.setPosition(Math.round(x + (body.dx || 0) * z), Math.round(y + (body.dy || 0) * z));
      return true;
    }
    case 'dragEnd':
      win.setBounds(wholeOnDisplay(win.getBounds()));
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
    case 'openDanger':
      showDashboard();
      toDash('openDanger()');
      return true;
    case 'endRunaway':
      return runaways.end(body.pid, body.started);
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
  let offer = null, ready = false, busy = null, checking = false, checkedAt = null, error = null;
  // How far the download has come (0…1, whole percents), as on the Mac: the page's bar and "updating 42%", so a long
  // download never looks frozen.
  let progress = null;
  // "Update now" pressed while the update was still downloading (the notice of a new version comes as its download
  // starts): it goes in the moment the download is done, as on the Mac, rather than waiting for the user to step away
  // while the page says "downloading…" with no way out.
  let whenReady = false;
  const usable = !!autoUpdater && app.isPackaged && !PROBE;
  const rightAway = () => !!settings.get('updateRightAway');
  const maybeRestart = () => {
    if (!ready || busy || terminals.list().some((t) => terminals.local(t.id))) return;
    if (rightAway() || powerMonitor.getSystemIdleTime() >= 600) install();
  };
  const install = () => {
    whenReady = false;
    busy = 'restarting…';
    pushCloud();
    setImmediate(() => autoUpdater.quitAndInstall(true, true));
  };
  if (usable) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (i) => {
      // A newer one than an update already downloaded: that one isn't what goes in any more.
      ready = false;
      offer = { version: i.version, build: 0, notes: notesOf(i.releaseNotes) };
      pushCloud();
      toNotices(`update(${JSON.stringify({ version: i.version, build: 0 })})`);
    });
    autoUpdater.on('download-progress', (p) => {
      const f = Math.min(1, Math.floor(Number(p && p.percent) || 0) / 100);
      if (f === progress) return;
      progress = f;
      pushCloud();
    });
    autoUpdater.on('update-downloaded', () => {
      ready = true;
      progress = null;
      pushCloud();
      if (whenReady) install();
      else maybeRestart();
    });
    autoUpdater.on('error', (e) => {
      console.error('updates:', e.message);
      progress = null;
      // The installer didn't start: this version stays, the page says the update failed, and "update now" can be
      // pressed again.
      if (busy === 'restarting…') {
        busy = null;
        error = 'failed';
        pushCloud();
      }
    });
    const look = () => poll().catch(() => {});
    setTimeout(look, 10_000);
    setInterval(look, 60_000);
    // Back from sleep or the lock screen: at once, not at the next minute.
    powerMonitor.on('resume', look);
    powerMonitor.on('unlock-screen', look);
    setInterval(maybeRestart, 60_000);
  }

  // A new release shows within a minute of going out, as on the Mac (whose heartbeat asks the API every minute; it was
  // every 30 minutes here, so a release could wait half an hour to be seen): the feed's latest.yml, about 1 KB, is read
  // every minute with a time limit, and electron-updater only asked when it names a newer version than this one and the
  // one on offer, so its notice comes once.
  const feed = (() => {
    if (!usable) return null;
    try {
      const m = /^url:\s*(.+)$/m.exec(fs.readFileSync(path.join(process.resourcesPath, 'app-update.yml'), 'utf8'));
      return m ? m[1].trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '') : null;
    } catch {
      return null;
    }
  })();
  async function feedVersion() {
    const res = await net.fetch(`${feed}/latest.yml?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`latest.yml: HTTP ${res.status}`);
    const m = /^version:\s*['"]?(\d[^'"\s]*)/m.exec(await res.text());
    if (!m) throw new Error('latest.yml: no version');
    return m[1];
  }
  let polling = null;
  function poll() {
    if (!feed) return Promise.resolve(null);
    if (!polling) {
      polling = feedVersion()
        .then((v) => {
          if (newerVersion(v, offer ? offer.version : app.getVersion())) askUpdater();
          return v;
        })
        .finally(() => (polling = null));
    }
    return polling;
  }
  // electron-updater's own check, which downloads what it finds. Its requests are to time out through their socket,
  // which Electron's requests don't have: one that stalls never ends, and every later check is handed that same one. So
  // one still out after two minutes is let go, and the next check starts afresh.
  let asking = null, askedAt = 0;
  function askUpdater() {
    if (asking && Date.now() - askedAt < 120_000) return;
    if (asking) autoUpdater.checkForUpdatesPromise = null;
    askedAt = Date.now();
    const p = autoUpdater
      .checkForUpdates()
      .catch(() => {})
      .finally(() => {
        if (asking === p) asking = null;
      });
    asking = p;
  }

  return {
    state: () => ({ update: offer, updateReady: ready, updating: busy, updateProgress: progress, updateError: error, updateRightAway: rightAway(), checking, checkedAt, xpPaused: false }),
    // Settings' "check for updates": answered within the feed's time limit, even with the network hanging.
    async check() {
      if (!usable) return;
      checking = true;
      pushCloud();
      try {
        await poll();
        // What electron-updater found, when it was asked, comes before "up to date" would.
        if (asking) await Promise.race([asking, new Promise((r) => setTimeout(r, 20_000))]);
      } catch {}
      checking = false;
      checkedAt = Date.now();
      pushCloud();
    },
    now() {
      if (!usable || !offer || busy) return;
      error = null;
      if (ready) return install();
      busy = 'downloading…';
      whenReady = true;
      pushCloud();
      // The download already running is the one waited for. When it fails (offline), the page says so and "update now"
      // comes back for another try, instead of "downloading…" staying for ever.
      autoUpdater.downloadUpdate().catch(() => {
        if (busy !== 'downloading…') return;
        whenReady = false;
        busy = null;
        progress = null;
        error = 'failed';
        pushCloud();
      });
    },
    setRightAway(on) {
      settings.set('updateRightAway', !!on);
      pushCloud();
      maybeRestart();
    },
  };
})();

/** Whether version `a` is newer than `b` ("0.15.1" than "0.15.0"): the numbers only, as the releases have them. */
function newerVersion(a, b) {
  const nums = (v) => String(v || '').split(/[-+]/)[0].split('.').map((n) => parseInt(n, 10) || 0);
  const [x, y] = [nums(a), nums(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

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
      case 'chats':
        return await handleChats(body);
      case 'archive':
        return handleArchive(body);
      // Settings' token savers: their state with what rtk saved, and the switches.
      case 'savers':
        if (body.type === 'state') return await savers.state();
        if (body.type === 'set' && savers.known(body.which)) {
          await savers.set(body.which, body.on === true);
          return await savers.state();
        }
        throw new Error('unknown request');
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
        // Its key is caught by the dashboard window itself (createDashboard): in a terminal Ctrl+B stays the shell's.
        {
          label: 'Chats List', accelerator: 'CmdOrCtrl+B', registerAccelerator: false,
          click: () => {
            showDashboard();
            toggleChats();
          },
        },
        { label: 'Reload Dashboard', accelerator: 'CmdOrCtrl+R', click: () => dashView && dashView.webContents.reload() },
        // The page that has the keys: the dashboard window's two are views, which the role doesn't reach.
        { label: 'Toggle Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: (_i, _w, wc) => wc && wc.toggleDevTools() },
        { type: 'separator' },
        { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    { label: 'Window', submenu: [{ role: 'minimize' }, { label: 'End This Terminal', click: () => { const f = focusedChat(); if (f) endTerminal(f[0]); } }] },
  ]));
}

// ---------- start, quit ----------
let quitting = false;

app.on('second-instance', () => showDashboard());

app.whenReady().then(() => {
  if (PROBE && app.dock) app.dock.hide();
  buildMenu();
  createDashboard();
  // Only the app's usual profile hooks Claude Code's settings: a profile of its own (npm run staging) leaves them be.
  if (process.platform === 'win32' && !PROBE && !profileSuffix()) limits.install();
  engine.start();
  cloud.start();
  runaways.start();
  // The corner's notices can cover the screen (a level-up): never during a development check.
  if (!PROBE) notices();
  // The orbit's cinematic camera waits for minutes without input; the terminals ride the orbit as cars.
  setInterval(() => {
    toDash(`idle(${powerMonitor.getSystemIdleTime().toFixed(1)})`);
    pushTerminals();
    // A chat window opened or ended between the engine's states: the list says "in a window" or stops saying it.
    pushChats();
  }, 2000);
  // The token savers this build ships go on by themselves the first time (Settings turns them off).
  savers.autoStart();
  if (!PROBE) aiColors.autoStart();
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
  runaways.stop();
  cloud.stop();
});

app.on('window-all-closed', () => {
  if (!quitting) app.quit();
});

// ---------- the development check (ATL_PROBE) ----------
async function probe() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shot = async (win, name) => {
    const wc = pageOf(win);
    if (!wc) return;
    const img = await Promise.race([wc.capturePage(), wait(5000).then(() => null)]);
    if (!img) return console.log('probe: no picture of', name);
    fs.mkdirSync(PROBE, { recursive: true });
    fs.writeFileSync(path.join(PROBE, `${name}.png`), img.toPNG());
    console.log('probe: shot', name);
  };
  await wait(9000);
  await run(dashView, "document.getElementById('boot')?.remove()");
  await shot(dashView, 'dashboard');
  await shot(chatsView, 'chats');
  for (const step of (process.env.ATL_PROBE_STEPS || '').split(';;').filter(Boolean)) {
    const [name, js] = step.split('|');
    console.log('probe: step', name);
    if (js) await Promise.race([dashView.webContents.executeJavaScript(js).catch((e) => console.log('probe step', name, e.message)), wait(3000)]);
    await wait(2500);
    await shot(dashView, name);
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
