'use strict';
// The AI tools draw in the app's theme (Settings · INTERFACE, on unless the user turns it off), as the Mac app's
// AIColors.swift has it: Claude Code, Codex and Antigravity take the themes of theirs that use the terminal's 16 colours
// (Claude's dark-ansi or light-ansi, Codex's tui.theme "ansi", Antigravity's colorScheme "terminal"). A theme then
// recolours their text and highlights too, at once, where their own themes drew in fixed colours whatever the
// terminal's. Each tool's own choice is kept and goes back when this is turned off; one the user changes afterwards is
// theirs and stays.
const fs = require('fs');
const path = require('path');

const TOOLS = ['claude', 'codex', 'agy'];
const KEY = 'aiColors';

/** `settings`: { get(key), set(key, value) }, where the choice and what was changed are kept. */
function createAIColors({ settings, claudeDir, codexDir, home }) {
  const claudeSettings = path.join(claudeDir, 'settings.json');
  const codexConfig = path.join(codexDir, 'config.toml');
  const agySettings = path.join(home, '.gemini', 'antigravity-cli', 'settings.json');
  const record = () => ({ ...(settings.get(KEY) || {}) });

  // A settings file that doesn't read as JSON is left alone (writing it back would lose the rest of what's in it).
  function readJSON(file) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return {};
    }
    if (!text.trim()) return {};
    try {
      const j = JSON.parse(text.replace(/^﻿/, ''));
      return j && typeof j === 'object' && !Array.isArray(j) ? j : null;
    } catch {
      return null;
    }
  }
  function writeJSON(file, json) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(json, null, 2) + '\n');
    fs.renameSync(tmp, file);
  }

  /** `key` set to what `value` makes of the old one (null: leave it), when the tool is there (its folder). */
  function setJSON(file, key, folder, value) {
    if (!fs.existsSync(folder)) return null;
    const json = readJSON(file);
    if (!json) return null;
    const old = json[key];
    const next = value(old);
    if (next == null) return null;
    json[key] = next;
    writeJSON(file, json);
    return { prev: old === undefined ? null : old, set: next };
  }
  function restoreJSON(file, key, kept) {
    const json = readJSON(file);
    // Changed by the user since: theirs.
    if (!json || json[key] !== kept.set) return;
    if (kept.prev == null) delete json[key];
    else json[key] = kept.prev;
    writeJSON(file, json);
  }

  const isThemeLine = (line) => /^\s*theme\s*=/.test(line);
  const tuiSection = (lines) => {
    const start = lines.findIndex((l) => l.trim() === '[tui]');
    if (start < 0) return null;
    let end = lines.findIndex((l, i) => i > start && l.trim().startsWith('['));
    if (end < 0) end = lines.length;
    return { start, end };
  };

  function apply(tool) {
    if (tool === 'claude') {
      // Claude's theme, light or dark as the user chose it.
      return setJSON(claudeSettings, 'theme', claudeDir, (old) => {
        const was = typeof old === 'string' ? old : 'dark';
        return was.endsWith('-ansi') ? null : was.startsWith('light') ? 'light-ansi' : 'dark-ansi';
      });
    }
    if (tool === 'agy') return setJSON(agySettings, 'colorScheme', path.dirname(agySettings), (old) => (old === 'terminal' ? null : 'terminal'));
    if (!fs.existsSync(codexDir)) return null;
    let text = '';
    try {
      text = fs.readFileSync(codexConfig, 'utf8');
    } catch {}
    const lines = text.split(/\r?\n/);
    const sec = tuiSection(lines);
    let prev = null;
    if (sec) {
      const at = lines.findIndex((l, i) => i > sec.start && i < sec.end && isThemeLine(l));
      if (at >= 0) {
        prev = lines[at].split('=').slice(1).join('=').trim();
        if (prev === '"ansi"') return null;
        lines[at] = 'theme = "ansi"';
      } else lines.splice(sec.start + 1, 0, 'theme = "ansi"');
    } else {
      if (lines.length && lines[lines.length - 1] !== '') lines.push('');
      lines.push('[tui]', 'theme = "ansi"', '');
    }
    fs.writeFileSync(codexConfig, lines.join('\n'));
    return { prev, set: '"ansi"', madeSection: !sec };
  }

  function putBack(tool, kept) {
    if (tool === 'claude') return restoreJSON(claudeSettings, 'theme', kept);
    if (tool === 'agy') return restoreJSON(agySettings, 'colorScheme', kept);
    let text;
    try {
      text = fs.readFileSync(codexConfig, 'utf8');
    } catch {
      return;
    }
    const lines = text.split(/\r?\n/);
    const sec = tuiSection(lines);
    if (!sec) return;
    const at = lines.findIndex((l, i) => i > sec.start && i < sec.end && isThemeLine(l));
    // Changed by the user since: theirs.
    if (at < 0 || lines[at].split('=').slice(1).join('=').trim() !== kept.set) return;
    if (kept.prev != null) lines[at] = `theme = ${kept.prev}`;
    else {
      lines.splice(at, 1);
      // A section that was the app's alone goes with it.
      const next = lines[sec.start + 1];
      if (kept.madeSection && (next === undefined || !next.trim() || next.trim().startsWith('['))) lines.splice(sec.start, 1);
    }
    fs.writeFileSync(codexConfig, lines.join('\n'));
  }

  const isOn = () => record().on !== false;

  return {
    isOn,
    /** At a launch: a tool installed since gets the theme's colours too. */
    autoStart() {
      const rec = record();
      if (rec.on === false) return;
      for (const tool of TOOLS) {
        if (rec[tool]) continue;
        try {
          const kept = apply(tool);
          if (kept) rec[tool] = kept;
        } catch (e) {
          console.error(`aicolors: ${tool}:`, e.message);
        }
      }
      settings.set(KEY, rec);
    },
    /** Settings' switch. */
    set(on) {
      const rec = record();
      rec.on = !!on;
      for (const tool of TOOLS) {
        try {
          if (on && !rec[tool]) {
            const kept = apply(tool);
            if (kept) rec[tool] = kept;
          } else if (!on && rec[tool]) {
            putBack(tool, rec[tool]);
            delete rec[tool];
          }
        } catch (e) {
          console.error(`aicolors: ${tool}:`, e.message);
        }
      }
      settings.set(KEY, rec);
    },
  };
}

module.exports = { createAIColors };
