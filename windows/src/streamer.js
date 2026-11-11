'use strict';
// The dashboard's streamer mode (the switch at its map's top right, web/app.js), for what the app shows outside that
// page, as the Mac's Streamer.swift: the chats list, the chat windows and the corner's notices show made-up names too,
// from web/streamer-names.js, the same one the dashboard picks for the same real one.
const fs = require('fs');
const path = require('path');

// The lists as the page has them: what follows "STREAMER_NAMES =" in the file is plain JSON.
function readNames(webDir) {
  try {
    const text = fs.readFileSync(path.join(webDir, 'streamer-names.js'), 'utf8');
    const eq = text.indexOf('STREAMER_NAMES =');
    const open = eq < 0 ? -1 : text.indexOf('{', eq);
    const close = text.lastIndexOf('}');
    const lists = open >= 0 && close > open ? JSON.parse(text.slice(open, close + 1)) : null;
    return lists && typeof lists === 'object' ? lists : {};
  } catch {
    return {};
  }
}

// An AI tool's own name stays, as on the dashboard.
const TOOLS = new Set(['chat', 'Claude', 'Claude Code', 'Codex', 'Antigravity', 'Gemini', 'OpenCode', 'Aider', 'Cursor', 'Copilot']);

function createStreamer(webDir) {
  let names = null;
  // On while the dashboard's mode is; off whenever the app starts.
  let on = false;

  // A made-up one of `kind` for `real` (FNV-1a over its UTF-16 units, as app.js picks).
  function fake(kind, real) {
    const s = String(real ?? '');
    names ??= readNames(webDir);
    const list = Array.isArray(names[kind]) ? names[kind] : names.title;
    if (!s || !Array.isArray(list) || !list.length) return s;
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    return list[(h >>> 0) % list.length];
  }

  // A folder's made-up project, by its last part, as the dashboard names it.
  const last = (p) => String(p).replace(/[\\/]+$/, '').split(/[\\/]/).pop() || String(p);
  const project = (p) => (p ? fake('project', last(p)) : '');
  // Where the dashboard says a folder is: ~/code/<project>.
  const folder = (p) => (p ? '~/code/' + project(p) : '');
  // A chat window's name: its project's, unless it's an AI tool's own.
  const name = (n) => (!n || TOOLS.has(n) ? n : fake('project', n));

  return {
    get on() {
      return on;
    },
    /** True when it changed. */
    set(v) {
      if (on === !!v) return false;
      on = !!v;
      return true;
    },
    fake,
    project,
    folder,
    name,
  };
}

module.exports = { createStreamer };
