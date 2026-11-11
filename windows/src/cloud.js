'use strict';

// The Windows app's link to the Atalay's Terminal API, in Electron's main process: the user's hacker name and tag, how
// many are online, their XP, and the friends, messages and notifications that the API pushes into a live socket. It
// ports the Mac app's Cloud.swift (with CloudBridge, the pages' "cloud" handler), Social.swift and ClientKey.swift.
// main.js tells it what only main.js knows (whether the user is working, how long since the last input, the theme),
// passes it the pages' "cloud" messages, pushes its state and live events to the pages, and kicks it after sleep or a
// network change. Nothing here waits on the network: the dashboard and the terminals work offline, the API catches up.
//
// Updates are the one part left out. The Mac app takes its builds from the API's offers; this app updates from GitHub
// releases (electron-updater, in main.js). So no build number goes to the API (its update offers, and its rule that
// pauses XP on a build a newer release replaced, are about Mac builds), `update` is always null and "check for updates"
// is just a heartbeat.

const crypto = require('node:crypto');
const cp = require('node:child_process');
const dc = require('node:diagnostics_channel');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createE2EE } = require('./e2ee');

const API = 'https://terminal-api.atalaykarahan.com';
// Where Node's WebSocket reports the pings it answers (the API's, every 25 s); see `watch`.
const PING = 'undici:websocket:ping';
const THEME = /^[a-z0-9-]{1,40}$/;

// Only the friends, messages, notifications, feedback, Roadmap, account, sign-in, settings-sync and badges endpoints,
// as the Mac's CloudBridge allows them; the pages never reach anything else with the token.
// v1/me/profile and v1/me/avatar: Settings → PROFILE's links and picture (profile.js).
const SOCIAL_ROUTES = ['v1/me/status', 'v1/me/activity', 'v1/me/leaderboard', 'v1/me/profile', 'v1/me/avatar', 'v1/feedback'];
const SOCIAL_TREES = [
  'v1/social', 'v1/friends', 'v1/messages', 'v1/leaderboard', 'v1/notifications',
  'v1/roadmap', 'v1/account', 'v1/auth', 'v1/settings', 'v1/badges',
];
const under = (p, t) => p === t || p.startsWith(t + '/') || p.startsWith(t + '?');
// Signing out answers with this PC's new token: only signOut() here calls it, so the token stays in the main process
// and never reaches a page. Checked as the API reads the path (decoded, any case, slashes squeezed).
const PRIVATE = ['v1/account/signout'];
const isPrivate = (p) => {
  let d;
  try {
    d = decodeURIComponent(p).toLowerCase().replace(/\/{2,}/g, '/');
  } catch {
    return true;
  }
  return PRIVATE.some((t) => under(d, t));
};
const allowed = (p) =>
  !p.includes('..') && !isPrivate(p) && (SOCIAL_ROUTES.includes(p) || SOCIAL_TREES.some((t) => under(p, t)));
// The AI tools the API counts hours with for their badges (its badges.ts).
const TOOLS = new Set(['claude', 'codex', 'gemini', 'antigravity']);

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

// What the API accepts about the app (api/src/routes.ts) is plain characters only, so a later admin page can't be fed
// markup through them. A value it refuses fails the whole call, every minute, so anything else is dropped here.
const clean = (s, notAllowed, max) => String(s).replace(notAllowed, '').replace(/\s+/g, ' ').trim().slice(0, max);

// main.js's answers, guarded: a mistake there mustn't stop the heartbeat.
const ask = (f, fallback) => {
  try {
    return f();
  } catch {
    return fallback;
  }
};

// Written to a temporary file first, then renamed over the old one, so a crash halfway leaves the old file rather than
// half a new one. Windows can refuse the rename while something (an antivirus scan) has the file open: then in place.
function write(file, data, mode) {
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temp, data, { mode });
    fs.renameSync(temp, file);
  } catch {
    try {
      fs.rmSync(temp, { force: true });
      fs.writeFileSync(file, data, { mode });
    } catch {}
  }
}

// Which PC an account belongs to: SHA-256 of the machine's ID with the Mac app's salt, so it reveals nothing about the
// hardware. On Windows the ID is the MachineGuid that Windows writes at setup; on a Mac (while developing) it's the
// hardware UUID, which gives the Mac app's own hash. It signs nobody in (other software can read either); the token does.
function machineId() {
  const run = (file, args) =>
    new Promise((resolve) => {
      cp.execFile(file, args, { encoding: 'utf8', windowsHide: true, timeout: 10_000 }, (err, out) =>
        // Without NULs, in case the tool answers in UTF-16.
        resolve(err ? '' : String(out).replace(/\0/g, '')),
      );
    });
  return (async () => {
    if (process.platform === 'win32') {
      const reg = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe');
      // The 64-bit view first: a 32-bit process would read WOW6432Node, which has no MachineGuid. 32-bit Windows has no
      // such view, hence the second try.
      for (const view of [['/reg:64'], []]) {
        const out = await run(reg, ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid', ...view]);
        const m = /MachineGuid\s+REG_SZ\s+(\S+)/i.exec(out);
        if (m) return m[1];
      }
    } else if (process.platform === 'darwin') {
      const m = /"IOPlatformUUID"\s*=\s*"([^"]+)"/.exec(await run('/usr/sbin/ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice']));
      if (m) return m[1];
    }
    return '';
  })();
}

// The system as the heartbeat reports it, e.g. "Windows 11 Pro (10.0.26100)". Windows 11 still calls itself Windows 10
// in the registry name os.version() reads (newer Node corrects that itself); its builds start at 22000.
function systemVersion() {
  const release = os.release();
  if (process.platform !== 'win32') return `${os.type()} ${release}`;
  let name = os.version() || 'Windows';
  if (Number(release.split('.')[2]) >= 22000) name = name.replace(/^Windows 10\b/, 'Windows 11');
  return `${name} (${release})`;
}

// Released builds sign every call to the API with a key the public repository never has; main.js passes it in. The API
// serves only the published app that way (its src/clientauth.ts): a copy built from source can't sign, so it earns no
// XP and can't use friends or messages.
function signer(clientKey) {
  const key =
    clientKey && clientKey.id && /^(?:[0-9a-f]{2})+$/i.test(String(clientKey.secret || ''))
      ? { id: String(clientKey.id), secret: Buffer.from(String(clientKey.secret), 'hex') }
      : null;
  // How far the API's clock is ahead of this PC's (from its Date header), in seconds: a PC set to the wrong time still
  // signs with a time the API accepts.
  let skew = 0;
  return {
    // Adds x-at-key, x-at-time and x-at-sig: HMAC-SHA256 of the time, method, path with query and the body's SHA-256.
    sign(method, url, body, headers) {
      if (!key) return;
      const time = String(Math.trunc(Date.now() / 1000 + skew));
      const text = [time, method, url.pathname + url.search, sha256(body ?? '')].join('\n');
      headers['x-at-key'] = key.id;
      headers['x-at-time'] = time;
      headers['x-at-sig'] = crypto.createHmac('sha256', key.secret).update(text).digest('hex');
    },
    // Keeps up with the API's clock from a reply.
    learn(res) {
      const date = Date.parse(res.headers.get('date') || '');
      if (!Number.isNaN(date)) skew = (date - Date.now()) / 1000;
    },
  };
}

// A reply outside 2xx: its status and the API's error code ('' when it gave none).
class Failure extends Error {
  constructor(status, code) {
    super(code || `http_${status}`);
    this.status = status;
    this.code = code;
  }
}

// The API client for main.js. Options:
// - apiBase: the API (default ATALAY_API_URL, else production)
// - dataDir: a folder of the app's for the device token, the pending name and these settings
// - version: the app's version; clientKey: { id, secret (hex) }, or null to call unsigned
// - isActive(): is the user working right now, for XP (on the Mac, Activity.swift: input in the last five minutes and a
//   sign of work in the last five: a busy Claude session, a job using the CPU, typing in a chat or terminal)
// - idleSeconds(): seconds since the last key, mouse or touch input anywhere on the PC, for "away"
// - theme(): the chosen theme's id; onChange(state): the page's state changed (`json()`); onSocial(text): a live event
// - tools(): the AI tools at work since the last heartbeat (claude, codex, gemini, antigravity), for their badges
// - protect: { seal(text), open(bytes) }, both async: text sealed by Windows for this user (Electron's safeStorage), for
//   the keys of end-to-end encrypted messages (e2ee.js). Without it messages aren't sealed or opened here.
function createCloud(opts = {}) {
  const dataDir = opts.dataDir;
  if (!dataDir) throw new Error('createCloud: dataDir is required');
  const isActive = opts.isActive || (() => false);
  const toolsAtWork = opts.tools || (() => []);
  const idleSeconds = opts.idleSeconds || (() => 0);
  const theme = opts.theme || (() => 'atalay');
  const onChange = opts.onChange || (() => {});
  const onSocial = opts.onSocial || (() => {});
  // How calls go out: Node's fetch by default; the app passes Electron's net.fetch, which goes through Windows' proxy
  // settings and certificate store (antivirus that scans HTTPS, a company proxy).
  const fetcher = opts.fetch || fetch;
  // Paths resolve against the base like links in a page, so it ends with a slash.
  const base = new URL(String(opts.apiBase || process.env.ATALAY_API_URL || API).replace(/\/*$/, '/'));
  const version = clean(opts.version || 'dev', /[^A-Za-z0-9.+-]/g, 32) || 'dev';
  const osVersion = clean(systemVersion(), /[^A-Za-z0-9 ().,+_-]/g, 64);
  const key = signer(opts.clientKey);
  // What the app reports about itself when it registers and on every heartbeat. No build number: see the top.
  const client = () => ({ appVersion: version, osVersion });

  // ---------- what's kept on this PC ----------

  // The device token, kept in the app's folder and readable by this user only. One per API (production, a local one
  // while developing), so the two never sign each other out; named as the Mac app names it.
  const host = base.hostname.replace(/^\[|\]$/g, '').replace(/[^A-Za-z0-9.-]/g, '_') || 'api';
  const tokenFile = path.join(dataDir, `device-token-${host}${base.port ? `-${base.port}` : ''}`);
  const readToken = () => {
    try {
      return fs.readFileSync(tokenFile, 'utf8').trim() || null;
    } catch {
      return null;
    }
  };
  const saveToken = (token) => {
    if (token) return write(tokenFile, token, 0o600);
    try {
      fs.rmSync(tokenFile, { force: true });
    } catch {}
  };

  // What the Mac app keeps in UserDefaults, under the same names: the last known name, tag and XP (an offline launch
  // shows them), a name picked offline, "install updates right away" and a machine ID of its own when there's none.
  const settingsFile = path.join(dataDir, 'cloud.json');
  let settings = {};
  try {
    const s = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    if (s && typeof s === 'object' && !Array.isArray(s)) settings = s;
  } catch {}
  function save(changes) {
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === undefined) delete settings[k];
      else settings[k] = v;
    }
    write(settingsFile, JSON.stringify(settings, null, 2));
  }

  // A name picked while the API was out of reach (first launch or a rename). It shows at once, stays on this PC across
  // restarts and goes to the API with the first heartbeat that gets through.
  const pendingName = () => (typeof settings.pendingHackerName === 'string' && settings.pendingHackerName) || null;
  const setPending = (name) => save({ pendingHackerName: name });

  let hashed = null;
  const deviceHash = () =>
    (hashed ??= machineId().then((id) => {
      if (!id) {
        // No machine ID (never seen on a real PC): a random one kept by the app, so PCs never share a hash.
        id = (typeof settings.fallbackDeviceID === 'string' && settings.fallbackDeviceID) || crypto.randomUUID().toUpperCase();
        save({ fallbackDeviceID: id });
      }
      return sha256('atalay-terminal/device/v1:' + id);
    }));

  // ---------- state ----------

  // Starts with the last known name and tag (or a name picked offline), so an offline launch still shows them.
  let S = {
    reachable: false,
    // Null until the API answered; false means the user still has to pick a hacker name.
    registered: null,
    hackerName: pendingName() ?? (typeof settings.hackerName === 'string' ? settings.hackerName : null),
    // Names repeat; name + tag (1-9999, shown as #0427) is unique, like Discord.
    tag: Number.isInteger(settings.hackerTag) ? settings.hackerTag : null,
    online: 0,
    // Settings: "install updates right away", kept for main.js's updater to read.
    updateRightAway: settings.updateRightAway === true,
    // Settings, "check for updates": asking now, and when it last asked (ms).
    checking: false,
    checkedAt: null,
    xpPaused: false,
    // Why the API refused a name picked offline ("name_full", ...), for the page to show once.
    nameError: null,
    // Your level and active time as the API counts them (api/src/xp.ts); the pages show them as they are.
    xp: settings.xp && typeof settings.xp === 'object' ? settings.xp : null,
  };
  let running = false;

  // What the dashboard page shows (Cloud.json on the Mac): the hacker name and tag, online count, version and XP. The
  // update fields are there as the page expects them, and empty.
  function json() {
    return {
      reachable: S.reachable, registered: S.registered, hackerName: S.hackerName, tag: S.tag,
      online: S.online, version, build: 0,
      update: null, updating: null, updateError: null, nameError: S.nameError,
      updateReady: false, updateRightAway: S.updateRightAway, checking: S.checking, checkedAt: S.checkedAt,
      xpPaused: S.xpPaused, xp: S.xp,
    };
  }

  // Every change goes through here, as through `state`'s didSet in Cloud.swift: the name, tag and XP are kept for an
  // offline launch, the page hears about it, and the live socket opens or closes with the sign-in.
  function set(changes) {
    const old = S;
    const before = JSON.stringify(json());
    S = { ...S, ...changes };
    if (JSON.stringify(json()) === before) return;
    const kept = {};
    if (S.hackerName !== old.hackerName) kept.hackerName = S.hackerName;
    if (S.tag !== old.tag) kept.hackerTag = S.tag;
    if (S.xp && JSON.stringify(S.xp) !== JSON.stringify(old.xp)) kept.xp = S.xp;
    if (Object.keys(kept).length) save(kept);
    if (!running) return;
    try {
      onChange(json());
    } catch (e) {
      console.error('cloud: onChange', e);
    }
    sync();
  }

  // ---------- hacker name and heartbeat ----------

  let timer = null;
  let beating = null;

  // Every minute, at launch and after sleep or a network change. Signed in: a heartbeat. Without a token (first launch,
  // a lost token, launched offline): ask the API, which no longer recognises a PC by its hash, so the user picks a name.
  // Asked for while one runs, it waits for that one.
  function beat() {
    if (!beating) {
      beating = (async () => {
        const token = readToken();
        if (token) await heartbeat(token);
        else await identify();
      })()
        .catch((e) => console.error('cloud: heartbeat', e))
        .finally(() => {
          beating = null;
        });
    }
    return beating;
  }

  // Keeps this PC online, says whether its user is working (XP) and sends a name picked offline.
  async function heartbeat(token) {
    // The theme too: the leaderboard shows someone's card in their theme, and anyone can take it.
    const body = { ...client(), active: !!ask(isActive, false), tz: -Math.round(new Date().getTimezoneOffset()) };
    const th = ask(theme, '');
    if (typeof th === 'string' && THEME.test(th)) body.theme = th;
    // Which AI tools were at work, for their badges (hours with each).
    const tools = ask(toolsAtWork, []);
    body.tools = Array.isArray(tools) ? [...new Set(tools)].filter((t) => TOOLS.has(t)).sort() : [];
    let a;
    try {
      a = await call('POST', 'v1/heartbeat', body, token);
      if (typeof a.hackerName !== 'string' || !Number.isInteger(a.tag) || !Number.isInteger(a.online)) throw new Error('unexpected answer');
    } catch (e) {
      if (e.status !== 401) return set({ reachable: false });
      // The token isn't valid anymore: start over.
      saveToken(null);
      return identify();
    }
    let name = a.hackerName;
    let tag = a.tag;
    const wanted = pendingName();
    if (wanted) {
      const r = await send(wanted, token);
      if (r.saved) {
        if (pendingName() === wanted) setPending(null);
        name = r.name;
        tag = r.tag;
      } else if (r.refused) {
        if (pendingName() === wanted) setPending(null);
        set({ nameError: r.refused });
      } else {
        name = wanted;
        tag = S.tag ?? a.tag;
      }
    }
    set({
      reachable: true, registered: true, hackerName: name, tag, online: a.online,
      xp: a.xp && typeof a.xp === 'object' ? a.xp : S.xp, xpPaused: a.xpPaused === true,
    });
  }

  async function identify() {
    let a;
    try {
      a = await call('POST', 'v1/devices/identify', { ...client(), deviceHash: await deviceHash() });
      if (typeof a.known !== 'boolean') throw new Error('unexpected answer');
    } catch {
      return set({ reachable: false });
    }
    if (a.known && typeof a.token === 'string') {
      saveToken(a.token);
      return heartbeat(a.token);
    }
    const name = pendingName();
    if (name) {
      // Named offline before this PC was registered: register with that name now.
      setPending(null);
      const r = await register(name);
      if (r.error) set({ reachable: true, registered: false, hackerName: null, tag: null, nameError: r.error });
      return;
    }
    set({ reachable: true, registered: false, hackerName: null, tag: null });
  }

  // What became of a name the user picked, as the page's reply: done, queued (kept on this PC while offline, sent when
  // the API answers again) or refused with the API's code.
  const DONE = () => ({ error: null });

  async function register(name) {
    let a;
    try {
      a = await call('POST', 'v1/devices', { ...client(), deviceHash: await deviceHash(), hackerName: name });
      if (typeof a.token !== 'string' || typeof a.hackerName !== 'string' || !Number.isInteger(a.tag)) throw new Error('unexpected answer');
    } catch (e) {
      if (e.status === 409 && e.code === 'device_exists') {
        // Registered before (reinstall, erased disk): sign in and keep the name just picked.
        setPending(name);
        await identify();
        return DONE();
      }
      if (e.status) return { error: e.code || 'failed' };
      set({ reachable: false });
      return keep(name);
    }
    saveToken(a.token);
    if (pendingName() === name) setPending(null);
    set({ reachable: true, registered: true, hackerName: a.hackerName, tag: a.tag, nameError: null });
    await heartbeat(a.token);
    return DONE();
  }

  async function rename(name) {
    const token = readToken();
    if (!token || !S.reachable) return keep(name);
    const r = await send(name, token);
    if (r.saved) {
      setPending(null);
      set({ hackerName: r.name, tag: r.tag, nameError: null });
      return DONE();
    }
    if (r.refused) return { error: r.refused };
    // Offline or signed out: the next heartbeat sends it (signing in again first).
    return keep(name);
  }

  // Saved (with the tag it got), refused (the API said no, with its code) or neither: try again later.
  async function send(name, token) {
    try {
      const a = await call('PATCH', 'v1/me', { hackerName: name }, token);
      if (typeof a.hackerName === 'string' && Number.isInteger(a.tag)) return { saved: true, name: a.hackerName, tag: a.tag };
    } catch (e) {
      if (e.status && e.status < 500 && e.status !== 401) return { refused: e.code || 'failed' };
    }
    return {};
  }

  // Keeps a name picked while the API is out of reach: it shows at once and goes out with the next heartbeat.
  function keep(name) {
    setPending(name);
    set({ hackerName: name, nameError: null });
    return { error: null, queued: true };
  }

  // Settings, "check for updates": the API offers this app nothing, so it's a heartbeat now (main.js's updater asks
  // GitHub).
  async function checkUpdate() {
    if (S.checking) return;
    set({ checking: true });
    await beat();
    set({ checking: false, checkedAt: Date.now() });
  }

  function setUpdateRightAway(on) {
    save({ updateRightAway: on });
    set({ updateRightAway: on });
  }

  // ---------- the account (Settings → ACCOUNT, account.js) ----------

  // Why a call failed, as the page shows it: the API's code, or "offline" when it couldn't be reached.
  const why = (e) => (e && e.status ? e.code || 'failed' : 'offline');

  // This PC leaves the account and goes on as a guest, under the same name with a new tag; the account stays on the
  // server, to sign in to again. The new token comes straight here, never to a page. Null when done, else why not.
  async function signOut() {
    const token = readToken();
    if (!token) return 'signed_out';
    let a;
    try {
      a = await call('POST', 'v1/account/signout', {}, token);
      if (typeof a.token !== 'string' || typeof a.hackerName !== 'string' || !Number.isInteger(a.tag)) throw new Error('unexpected answer');
    } catch (e) {
      return why(e);
    }
    saveToken(a.token);
    set({ hackerName: a.hackerName, tag: a.tag });
    await heartbeat(a.token);
    // The API closed the live line it had with the old token: a new one now, with the new token's ticket.
    delay = 2;
    detach();
    open();
    return null;
  }

  // Everything of the account is deleted on the server, on all its computers; this PC starts over as on its first
  // launch (the page asks for a name again).
  async function deleteAccount() {
    const token = readToken();
    if (!token) return 'signed_out';
    try {
      await call('DELETE', 'v1/account', undefined, token);
    } catch (e) {
      return why(e);
    }
    saveToken(null);
    setPending(null);
    save({ xp: null });
    set({ registered: false, hackerName: null, tag: null, xp: null });
    await identify();
    return null;
  }

  // ---------- friends and messages ----------

  // A one-use ticket for the live socket (it can't carry the token in a header from every client).
  async function liveTicket() {
    const token = readToken();
    if (!token) return null;
    try {
      const a = await call('POST', 'v1/live/ticket', {}, token);
      return typeof a.ticket === 'string' ? a.ticket : null;
    } catch {
      return null;
    }
  }

  function liveURL(ticket) {
    const u = new URL('v1/live', base);
    u.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    u.searchParams.set('ticket', ticket);
    return u.href;
  }

  // The friends and messages endpoints for the pages: JSON in, the API's JSON out, or `{error}` with its code
  // ("offline" when it can't be reached, "signed_out" before a hacker name is picked). `own`: a call the app makes itself
  // (the message keys', e2ee.js), to a path it wrote: those aren't among the ones pages may reach.
  async function social(method, p, body, own = false) {
    const token = readToken();
    if (!token) return { error: 'signed_out' };
    let url;
    try {
      url = new URL(p, base);
    } catch {
      return { error: 'bad_path' };
    }
    // The path as it resolved must still be one of the allowed ones: Node's URL reads %2e%2e as "..", which the check
    // on the path as sent doesn't see.
    if (url.origin !== base.origin || !url.href.startsWith(base.href) || !(own || allowed(url.href.slice(base.href.length)))) {
      return { error: 'bad_path' };
    }
    method = method.toUpperCase();
    const withBody = method !== 'GET' && method !== 'HEAD' && body !== null && typeof body === 'object';
    try {
      const r = await request(method, url, withBody ? body : undefined, token);
      let json = null;
      try {
        json = JSON.parse(r.text);
      } catch {}
      if (r.status >= 200 && r.status < 300) return json ?? {};
      // Signed out (another install on this PC took the token): the heartbeat signs in again.
      if (r.status === 401 && running) beat();
      return { error: json && typeof json.error === 'string' ? json.error : `http_${r.status}` };
    } catch {
      return { error: 'offline' };
    }
  }

  // ---------- end-to-end encrypted messages (e2ee.js, the Mac's E2EE.swift) ----------
  // Messages are sealed on the way out and opened on the way in; what the keys keep secret is in a file of the app's
  // folder sealed by Windows for this user, one per API as the token is, and friends' pinned keys beside it.
  const vaultFile = path.join(dataDir, `e2ee-vault-${host}${base.port ? `-${base.port}` : ''}`);
  const e2ee = !opts.protect
    ? null
    : createE2EE({
        api: (method, p, body) => social(method, p, body, true),
        pass: (method, p, body) => social(method, p, body),
        vault: {
          async load() {
            let sealed;
            try {
              sealed = fs.readFileSync(vaultFile);
            } catch (e) {
              if (e.code === 'ENOENT') return null;
              throw e;
            }
            return opts.protect.open(sealed);
          },
          // A key that isn't kept must not go out: this one says so when it can't write (`write` above doesn't).
          async save(text) {
            const sealed = await opts.protect.seal(text);
            const temp = `${vaultFile}.${process.pid}.tmp`;
            fs.mkdirSync(path.dirname(vaultFile), { recursive: true });
            try {
              fs.writeFileSync(temp, sealed, { mode: 0o600 });
              fs.renameSync(temp, vaultFile);
            } catch {
              fs.rmSync(temp, { force: true });
              fs.writeFileSync(vaultFile, sealed, { mode: 0o600 });
            }
          },
        },
        pinsFile: path.join(dataDir, `e2ee-friends-${host}${base.port ? `-${base.port}` : ''}.json`),
        // What changes in the message keys reaches the pages the way live events do.
        onState: (ev) => deliver(ev),
      });

  // ---------- the live socket (Social.swift) ----------
  // The app's live line to the API for friends and messages: one WebSocket the API pushes events into (a message, a
  // friend request, a friend coming online). It opens once this PC is signed in and reopens on its own after a drop, at
  // once when main.js says the PC woke up or the network came back.

  let ws = null;
  let opening = false;
  let delay = 2;
  let retry = null;
  let signedIn = false;
  let away = false;
  let awayTimer = null;
  let watchdog = null;
  let heard = 0;
  let pingsSeen = false;
  let noSocket = false;

  // Cloud's state changed: keep the line open while signed in and the API answers.
  function sync() {
    signedIn = S.registered === true;
    if (signedIn && S.reachable) {
      open();
      if (e2ee) e2ee.wake();
    }
    if (!signedIn) close();
  }

  function open() {
    if (!running || !signedIn || ws || opening) return;
    if (typeof WebSocket !== 'function') {
      if (!noSocket) console.warn("cloud: this Node has no WebSocket, so friends and messages won't update live");
      noSocket = true;
      return;
    }
    opening = true;
    clearTimeout(retry);
    retry = null;
    liveTicket()
      .then((ticket) => {
        if (!running || !signedIn) return;
        if (!ticket) return later();
        const t = new WebSocket(liveURL(ticket));
        ws = t;
        t.onopen = () => {
          if (ws !== t) return;
          heard = Date.now();
          away = Number(ask(idleSeconds, 0)) > 600;
          tellAway();
        };
        t.onmessage = (e) => {
          if (ws !== t) return;
          heard = Date.now();
          if (typeof e.data !== 'string') return;
          delay = 2;
          event(e.data);
        };
        t.onerror = t.onclose = () => drop(t);
        watch(t);
        watchInput();
      })
      .catch((e) => {
        console.error('cloud: live socket', e);
        later();
      })
      .finally(() => {
        opening = false;
      });
  }

  // Each event goes to main.js (the dashboard, the notices and the chat panels hear every one) as JSON.stringify writes
  // it, not as it came: main.js runs it in the pages as code (`social(${text})`), so a line that isn't JSON never gets
  // there. Your own XP changing (the daily bonus, a new level) also updates the state, so the top bar shows it at once.
  // With message keys the events go through them first (messages opened, key changes taken in), one at a time, in the
  // order they came.
  let delivering = Promise.resolve();
  function event(text) {
    let e;
    try {
      e = JSON.parse(text);
    } catch {
      return;
    }
    if (!e2ee) return deliver(e);
    delivering = delivering
      .then(async () => {
        for (const out of await e2ee.incoming(e)) deliver(out);
      })
      .catch((err) => console.error('cloud: live event', err));
  }

  function deliver(e) {
    try {
      onSocial(JSON.stringify(e));
    } catch (err) {
      console.error('cloud: onSocial', err);
    }
    if (e && e.type === 'xp' && e.xp && typeof e.xp === 'object') set({ xp: e.xp });
  }

  // The API pings every 25 s and Node's WebSocket answers by itself, but unlike the Mac app's it can't ping on its own
  // to check the line. So this side listens for the API's pings: a line that died silently (sleep, a network switch)
  // shows by their stopping, and with nothing heard for 35 s (a ping missed, plus the 10 s the Mac app waits for a
  // pong) it counts as dead. Node tells of pings only on a diagnostics channel; until one has come through, nothing is
  // called dead, so a Node or a proxy that doesn't pass them on just leaves this check off.
  function watch(t) {
    clearInterval(watchdog);
    heard = Date.now();
    watchdog = setInterval(() => {
      if (ws === t && pingsSeen && Date.now() - heard > 35_000) drop(t);
    }, 5_000);
    watchdog.unref?.();
  }

  const onPing = (m) => {
    // Node 24 says which socket was pinged, Node 22 doesn't (and there's one at a time here).
    if (!ws || (m && m.websocket && m.websocket !== ws)) return;
    pingsSeen = true;
    heard = Date.now();
  };

  // ---------- away from keyboard ----------

  // Like Discord's idle: no key, mouse or touch input anywhere on this PC for 10 minutes. Friends then see "idle" while
  // the user's own status is online; any input brings it back.
  function watchInput() {
    if (awayTimer) return;
    awayTimer = setInterval(checkAway, 30_000);
    awayTimer.unref?.();
  }

  function checkAway() {
    const now = Number(ask(idleSeconds, 0)) > 600;
    if (now === away) return;
    away = now;
    tellAway();
  }

  function tellAway() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type: 'afk', afk: away }));
    } catch {}
  }

  // Forgets the current line: no more events or checks from it, and it's closed.
  function detach() {
    const t = ws;
    ws = null;
    clearInterval(watchdog);
    watchdog = null;
    if (!t) return;
    t.onopen = t.onmessage = t.onerror = t.onclose = null;
    try {
      t.close();
    } catch {}
  }

  function drop(t) {
    if (ws !== t) return;
    detach();
    later();
  }

  // Again after 2 s, then twice as long each time up to a minute; an event coming through starts over at 2 s.
  function later() {
    if (!running || !signedIn) return;
    clearTimeout(retry);
    retry = setTimeout(() => {
      retry = null;
      open();
    }, delay * 1000);
    retry.unref?.();
    delay = Math.min(delay * 2, 60);
  }

  function close() {
    clearTimeout(retry);
    retry = null;
    detach();
  }

  // ---------- HTTP ----------

  // One call: signed, with the token when there is one, 15 s at most; the API's clock is learned from the reply.
  async function request(method, url, body, token) {
    const headers = {};
    const data = body === undefined ? undefined : JSON.stringify(body);
    if (data !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = 'Bearer ' + token;
    // This app opens end-to-end encrypted messages (e2ee.js): the API sends them sealed, as they are.
    if (e2ee) headers['x-e2ee'] = '1';
    key.sign(method, url, data, headers);
    const res = await fetcher(String(url), { method, headers, body: data, signal: AbortSignal.timeout(15_000) });
    key.learn(res);
    return { status: res.status, text: await res.text() };
  }

  async function call(method, p, body, token) {
    const r = await request(method, new URL(p, base), body, token);
    let json = null;
    try {
      json = JSON.parse(r.text);
    } catch {}
    if (r.status < 200 || r.status >= 300) throw new Failure(r.status, json && typeof json.error === 'string' ? json.error : '');
    if (!json || typeof json !== 'object') throw new Error('unreadable answer');
    return json;
  }

  // ---------- main.js's side ----------

  // The pages' "cloud" handler (CloudBridge on the Mac): the hacker name, settings and update screens, and the
  // friends, messages and notifications calls. The reply is what the page's promise resolves to.
  async function handle(body) {
    const b = body && typeof body === 'object' ? body : {};
    const name = typeof b.name === 'string' ? b.name : '';
    switch (b.type) {
      case 'state':
        return json();
      case 'register':
        return register(name);
      case 'rename':
        return rename(name);
      case 'update':
        // Nothing is ever on offer from the API here (main.js's updater installs from GitHub), so there's nothing to do.
        return true;
      case 'checkUpdate':
        await checkUpdate();
        return json();
      case 'updateRightAway':
        setUpdateRightAway(b.on === true);
        return json();
      case 'social': {
        const p = typeof b.path === 'string' ? b.path : '';
        if (!allowed(p)) return { error: 'bad_path' };
        const method = typeof b.method === 'string' ? b.method : 'GET';
        // Messages are sealed on the way out and opened on the way in (e2ee.js).
        return e2ee ? e2ee.social(method, p, b.body) : social(method, p, b.body);
      }
      // End-to-end encryption's own screens: the recovery key, approving a computer, a friend's security code.
      case 'e2ee':
        return e2ee ? e2ee.page(b) : { error: 'offline' };
      case 'openChat':
        // The chat panel is main.js's to open.
        return { openChat: typeof b.id === 'string' ? b.id : '' };
      // The account changed (signed in, merged): its name and XP now, not at the next minute's heartbeat.
      case 'refresh':
        await beat();
        return json();
      // Signing out on this PC, and deleting the account: the token changes here, the page gets the new state.
      case 'signOut':
        return { error: await signOut(), state: json() };
      case 'deleteAccount':
        return { error: await deleteAccount(), state: json() };
      default:
        throw new Error('unknown message');
    }
  }

  // A heartbeat now and every minute, and the live socket once signed in.
  function start() {
    if (running) return;
    running = true;
    dc.subscribe(PING, onPing);
    beat();
    timer = setInterval(beat, 60_000);
    timer.unref?.();
    // Started again after a stop: the line comes back with the state it had.
    sync();
  }

  function stop() {
    if (!running) return;
    running = false;
    clearInterval(timer);
    timer = null;
    clearInterval(awayTimer);
    awayTimer = null;
    close();
    dc.unsubscribe(PING, onPing);
  }

  // The PC woke up or the network came back (main.js): a line opened before may be dead without anyone noticing (no
  // error comes until something is sent), so a fresh one now instead of waiting out a backoff; and a heartbeat, which
  // shows at once whether the API can be reached again.
  function kick() {
    if (!running) return;
    beat();
    delay = 2;
    detach();
    open();
  }

  return { start, stop, kick, json, handle };
}

module.exports = { createCloud };
