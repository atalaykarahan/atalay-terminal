'use strict';

// Discord's Rich Presence, the Mac app's DiscordPresence.swift: what the app is doing shows on your Discord profile
// ("Playing Orbiterm"), as games show theirs. On unless Settings · DISCORD turns it off. It says how many
// sessions run, how many are at work or wait for you and the AI tools at work, never a prompt, code or a file's name.
// Two more switches add the project's name (the folder of the session at work, "+2" for the other folders at work, all
// of them under the tool's picture) and today's active time as XP counts it (Cloud's `xp.today`, with the level under
// the app's picture).
//
// It talks to the Discord app on this PC over its named pipe (\\?\pipe\discord-ipc-0…9; elsewhere the socket in the
// temp folder, so it runs from the sources on a Mac too) in Discord's IPC frames: an op and a length (UInt32 each,
// little-endian), then that much JSON. A handshake (op 0) names the application, Discord answers READY, then each
// SET_ACTIVITY (op 1) replaces what the profile shows. No Discord running, it tries again every 15 s; Discord quitting
// drops the pipe and it tries again the same way. The app quitting closes the pipe and Discord clears the presence.

const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

// The Discord application (discord.com/developers/applications): its name is what Discord shows after "Playing", its
// Rich Presence art assets the pictures (`logo`, `claude`, `codex`, `gemini`, `antigravity`). The Mac's is the same.
const CLIENT_ID = '1569329758775414905';
// Discord takes 5 updates in 20 s: at most one each 4 s.
const GAP = 4000;
const RETRY = 15000;

const pipe = (i) =>
  process.platform === 'win32'
    ? `\\\\?\\pipe\\discord-ipc-${i}`
    : path.join(process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || os.tmpdir(), `discord-ipc-${i}`);

// The AI tool a session belongs to: Claude's chats are Claude Code, the others (`ai`) carry their tool's name.
const toolOf = (s) => (s.ai ? String(s.name || '') : 'Claude Code');

// The art asset of a tool's picture, as the Discord application has them.
function asset(tool) {
  const t = tool.toLowerCase();
  if (t === 'claude code' || t === 'claude') return 'claude';
  return ['codex', 'gemini', 'antigravity'].includes(t) ? t : null;
}

// A folder's name, not the home folder or a disk's root.
function project(cwd) {
  if (!cwd || typeof cwd !== 'string') return null;
  const p = path.resolve(cwd);
  if (p === path.parse(p).root || p.toLowerCase() === os.homedir().toLowerCase()) return null;
  return path.basename(p) || null;
}

// Discord takes 2–128 characters a line.
function fit(s) {
  const t = [...s].length > 128 ? [...s].slice(0, 127).join('') + '…' : s;
  return t.length < 2 ? t + ' ' : t;
}

// 4h 12m, 35m.
function duration(seconds) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// - settings: main.js's { get, set } (the switches are kept there, under the Mac's names)
// - xp(): Cloud's xp ({ today, level, rank… }) or null
// - onChange(): anything Settings shows changed
function createDiscord({ settings, xp = () => null, onChange = () => {} }) {
  let enabled = settings.get('discordPresence') !== false;
  let showProject = settings.get('discordPresenceProject') === true;
  let showActive = settings.get('discordPresenceActive') !== false;
  // Discord answered the handshake: what's sent shows.
  let connected = false;
  let sock = null;
  let inbox = Buffer.alloc(0);
  let retry = null;
  let throttle = null;
  let lastSent = 0;
  // The live sessions last seen (engine.live()), to build the presence again when a switch changes.
  let sessions = [];
  // What Discord shows now ('' after a (re)connect: the next one goes out).
  let sentActivity = '';
  let sentPage = '';
  // The elapsed time on the profile counts from the app's start.
  const started = Math.floor(Date.now() / 1000);

  function start() {
    connect();
    changed();
  }

  function setEnabled(value) {
    enabled = !!value;
    settings.set('discordPresence', enabled);
    if (enabled) connect();
    else drop(false);
    changed();
  }

  function setShowProject(value) {
    showProject = !!value;
    settings.set('discordPresenceProject', showProject);
    send();
    changed();
  }

  function setShowActive(value) {
    showActive = !!value;
    settings.set('discordPresenceActive', showActive);
    send();
    changed();
  }

  // The engine's live sessions changed.
  function update(list) {
    sessions = Array.isArray(list) ? list : [];
    send();
  }

  // ---------- what shows ----------
  function activity() {
    const busy = sessions.filter((s) => s.status === 'busy');
    const waiting = sessions.filter((s) => s.status === 'waiting').length;
    const tools = [...new Set(busy.map(toolOf))].sort();

    const details = tools.length ? `Working with ${tools.join(', ')}` : sessions.length ? 'Between turns' : 'Idle';
    const parts = [sessions.length === 0 ? 'no sessions' : sessions.length === 1 ? '1 session' : `${sessions.length} sessions`];
    if (busy.length && sessions.length > 1) parts.push(`${busy.length} at work`);
    if (waiting > 0) parts.push(`${waiting} waiting`);

    // The sessions at work (else all of them), the latest first: the first one's project and tool's picture lead.
    const pool = (busy.length ? busy : sessions).slice().sort((a, b) => (b.statusSince || 0) - (a.statusSince || 0));
    const projects = [...new Set(pool.map((s) => project(s.cwd)).filter(Boolean))];
    if (showProject && projects.length) parts.unshift(projects.length > 1 ? `${projects[0]} +${projects.length - 1}` : projects[0]);

    const x = xp();
    if (showActive && x && Number.isInteger(x.today) && x.today >= 60) parts.push(`${duration(x.today)} today`);

    const assets = { large_image: 'logo', large_text: x && x.level ? `Level ${x.level} · ${x.rank}` : 'Orbiterm' };
    const lead = pool[0];
    const key = lead && asset(toolOf(lead));
    if (key) {
      assets.small_image = key;
      assets.small_text = fit(toolOf(lead) + (showProject && projects.length > 1 ? ` · ${projects.join(', ')}` : ''));
    }
    return { details: fit(details), state: fit(parts.join(' · ')), timestamps: { start: started }, assets, instance: false };
  }

  // Sends what should show, when it changed, at most once each GAP.
  function send() {
    if (!enabled || !connected || throttle) return;
    const a = activity();
    const json = JSON.stringify(a);
    if (json === sentActivity) return;
    const wait = GAP - (Date.now() - lastSent);
    if (wait > 0) {
      throttle = setTimeout(() => {
        throttle = null;
        send();
      }, wait);
      return;
    }
    sentActivity = json;
    lastSent = Date.now();
    write(1, { cmd: 'SET_ACTIVITY', nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`, args: { pid: process.pid, activity: a } });
  }

  // ---------- the pipe ----------
  function connect() {
    if (!enabled || sock || !CLIENT_ID) return;
    clearTimeout(retry);
    retry = null;
    tryPipe(0);
  }

  // Discord's pipe: the first of discord-ipc-0…9 that answers.
  function tryPipe(i) {
    if (!enabled || sock) return;
    if (i > 9) return later();
    const s = net.createConnection(pipe(i));
    let opened = false;
    s.once('connect', () => {
      opened = true;
      if (!enabled || sock) return s.destroy();
      attach(s);
    });
    s.on('error', () => {
      if (opened) return;
      s.destroy();
      tryPipe(i + 1);
    });
  }

  function attach(s) {
    sock = s;
    inbox = Buffer.alloc(0);
    s.on('data', (chunk) => received(s, chunk));
    s.on('error', () => lost(s));
    s.on('close', () => lost(s));
    write(0, { v: 1, client_id: CLIENT_ID });
  }

  function write(op, payload) {
    if (!sock) return;
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const head = Buffer.alloc(8);
    head.writeUInt32LE(op, 0);
    head.writeUInt32LE(body.length, 4);
    sock.write(Buffer.concat([head, body]));
  }

  function received(s, chunk) {
    if (s !== sock) return;
    inbox = Buffer.concat([inbox, chunk]);
    while (inbox.length >= 8) {
      const op = inbox.readUInt32LE(0), len = inbox.readUInt32LE(4);
      if (len >= 1 << 20) return lost(s);
      if (inbox.length < 8 + len) break;
      const body = inbox.subarray(8, 8 + len);
      inbox = inbox.subarray(8 + len);
      frame(op, body);
      if (s !== sock) return;
    }
  }

  function frame(op, body) {
    let msg = {};
    try {
      msg = JSON.parse(body.toString('utf8')) || {};
    } catch {}
    if (op === 1) {
      if (msg.evt === 'READY') {
        connected = true;
        sentActivity = '';
        changed();
        send();
      } else if (msg.evt === 'ERROR') {
        console.log('discord:', JSON.stringify(msg.data));
      }
    } else if (op === 2) {
      // Discord closed it: a wrong client id, or Discord quitting.
      console.log('discord: closed ·', msg.message || '');
      lost(sock);
    } else if (op === 3) {
      write(4, msg);
    }
  }

  // The pipe `s` broke or closed: try again later, while on.
  function lost(s) {
    if (!s || s !== sock) return;
    drop(true);
  }

  function drop(again) {
    clearTimeout(retry);
    retry = null;
    clearTimeout(throttle);
    throttle = null;
    if (sock) {
      const s = sock;
      sock = null;
      s.removeAllListeners();
      s.on('error', () => {});
      s.destroy();
    }
    inbox = Buffer.alloc(0);
    sentActivity = '';
    if (connected) {
      connected = false;
      changed();
    }
    if (again) later();
  }

  function later() {
    if (!enabled || retry) return;
    retry = setTimeout(() => {
      retry = null;
      connect();
    }, RETRY);
  }

  // ---------- Settings ----------
  // For the page: Settings · DISCORD's switches and what they're doing.
  const json = () => JSON.stringify({ available: !!CLIENT_ID, on: enabled, project: showProject, active: showActive, connected });

  function changed() {
    const now = json();
    if (now === sentPage) return;
    sentPage = now;
    onChange();
  }

  return { start, setEnabled, setShowProject, setShowActive, update, refresh: send, json };
}

module.exports = { createDiscord };
