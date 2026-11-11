'use strict';
// A chat deleted from the chats list (chatlist.js), as the Mac's ChatTrash.swift: Claude Code's, Codex's or
// Antigravity's. It leaves the list at once and stays in Settings' deleted chats for 30 days, where it can be put back;
// then it's deleted from the PC. Until then nothing of the conversation is touched, so putting it back is only taking it
// off that list. This file knows which files a conversation has and deletes them; a deleted chat is
// { id, title, cwd, tool ("claude", "codex" or "antigravity"), path (its transcript; Codex's: its log), at (ms) }.
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

let sqlite = null;
try {
  sqlite = require('node:sqlite');
} catch {}

// How long a deleted chat is kept.
const KEEP = 30 * 86_400_000;
const WIN = process.platform === 'win32';

/** Whole days left before a chat deleted at `at` is deleted for good: 30 on the day it's deleted, 1 on its last. */
const daysLeft = (at, now) => Math.max(0, Math.ceil((at + KEEP - now) / 86_400_000));

/** Whether its 30 days are over. */
const expired = (chat, now) => now - chat.at >= KEEP;

// A conversation's id as all three tools write it (8-4-4-4-12 hex digits), and the name their files go by. Nothing is
// ever deleted by a name that isn't one: an empty or odd one would name a whole folder.
const isSessionId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id ?? ''));

// Whether the part of `p` under `root` is plain names (no "..", "." or empty one), `count` of them.
function plain(p, root, count) {
  const full = String(p ?? ''), base = String(root ?? '').replace(/[\\/]+$/, '');
  if (base.length < 2 || full.length <= base.length + 1 || !/[\\/]/.test(full[base.length])) return false;
  const head = full.slice(0, base.length);
  if (WIN ? head.toLowerCase() !== base.toLowerCase() : head !== base) return false;
  const rest = full.slice(base.length + 1).split(/[\\/]/);
  return !rest.some((n) => !n || n === '.' || n === '..') && (count == null || rest.length === count);
}

/** Whether `p` is the log Codex keeps of conversation `id`: sessions\…\rollout-…-<id>.jsonl in its folder `codexDir`. */
function isCodexLogIn(codexDir, p, id) {
  const name = path.basename(String(p ?? ''));
  return isSessionId(id) && plain(p, path.join(codexDir, 'sessions')) && name.startsWith('rollout-') && name.endsWith(`-${id}.jsonl`);
}

// A link counts too, where it points or not: it's the link that goes.
function exists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function modified(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return null;
  }
}

function names(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function remove(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch {}
}

/**
 * `claudeDir`: Claude Code's folder (~/.claude); `codexDir`: Codex's (CODEX_HOME or ~/.codex); `agyDir`: Antigravity's
 * (~/.gemini/antigravity-cli); `codexExe()`: where Codex's own program is, or null; `home`: the user's folder.
 */
function createChatTrash({ claudeDir, codexDir, agyDir, codexExe, home }) {
  // ----- Claude Code -----

  // Whether `p` is a transcript in Claude's projects folder: projects\<folder>\<name>.jsonl, nothing else. The folder
  // beside a transcript goes by its name without the ending, so a file named only ".jsonl" would name its whole project
  // folder: that isn't one.
  function isTranscript(p) {
    const s = String(p ?? '');
    return s.endsWith('.jsonl') && plain(s, path.join(claudeDir, 'projects'), 2) && path.basename(s).length > '.jsonl'.length;
  }

  // Everything Claude Code keeps of one conversation: its transcript and the folder beside it (its subagents and tool
  // results), in whichever project folders have them; its file checkpoints, its shell environment, its tasks and to-dos,
  // its pasted images and its debug log. Claude's prompt history (history.jsonl, the ↑ key's) stays: every running
  // Claude writes to that one file.
  function claudeFiles(chat) {
    const out = [];
    const add = (p) => {
      if (!out.includes(p) && exists(p)) out.push(p);
    };
    if (isTranscript(chat.path)) {
      add(chat.path);
      add(chat.path.slice(0, -'.jsonl'.length));
    }
    if (!isSessionId(chat.id) || String(claudeDir || '').length < 2) return out;
    const projects = path.join(claudeDir, 'projects');
    for (const name of names(projects)) {
      add(path.join(projects, name, `${chat.id}.jsonl`));
      add(path.join(projects, name, chat.id));
    }
    for (const sub of ['file-history', 'session-env', 'tasks', 'image-cache']) add(path.join(claudeDir, sub, chat.id));
    add(path.join(claudeDir, 'debug', `${chat.id}.txt`));
    const todos = path.join(claudeDir, 'todos');
    for (const name of names(todos)) if (name.startsWith(`${chat.id}-`)) add(path.join(todos, name));
    return out;
  }

  // ----- Codex -----

  const isCodexLog = (p, id) => isCodexLogIn(codexDir, p, id);

  // Codex deletes its own conversation (`codex delete --force <id>`: its log and its entry in its state database);
  // without Codex on the PC any more, its log goes. True when the log is gone.
  async function eraseCodex(chat) {
    if (!isSessionId(chat.id)) return false;
    const exe = codexExe ? await Promise.resolve(codexExe()).catch(() => null) : null;
    if (exe) {
      await new Promise((resolve) => {
        // npm puts Codex on Windows as codex.cmd, which only a shell runs; the id is hex digits and dashes.
        const shell = /\.(cmd|bat)$/i.test(exe);
        const child = cp.execFile(shell ? `"${exe}"` : exe, ['delete', '--force', chat.id], { cwd: home, shell, windowsHide: true, timeout: 30_000 }, () => resolve());
        child.on('error', () => resolve());
        if (child.stdin) child.stdin.end();
      });
    }
    // Codex didn't (it's gone, or it doesn't know this one any more): its log goes all the same.
    if (isCodexLog(chat.path, chat.id) && exists(chat.path)) remove(chat.path);
    return !(isCodexLog(chat.path, chat.id) && exists(chat.path));
  }

  // ----- Antigravity -----

  const summaries = () => path.join(agyDir, 'conversation_summaries.db');

  // Antigravity may be writing to its list: wait for it a little.
  function open(file, write) {
    if (!sqlite || !exists(file)) return null;
    try {
      const db = new sqlite.DatabaseSync(file, { readOnly: !write });
      db.exec('PRAGMA busy_timeout = 3000');
      return db;
    } catch {
      return null;
    }
  }
  const close = (db) => {
    try {
      db.close();
    } catch {}
  };

  // A conversation's subagents' conversations (theirs too), from Antigravity's list of conversations.
  function agyChildren(id) {
    if (!isSessionId(id)) return [];
    const db = open(summaries(), false);
    if (!db) return [];
    const out = [], next = [id];
    try {
      const q = db.prepare('SELECT conversation_id FROM conversation_summaries WHERE parent_conversation_id = ?');
      while (next.length && out.length < 200) {
        for (const row of q.all(next.pop())) {
          const c = row.conversation_id;
          if (!isSessionId(c) || c === id || out.includes(c)) continue;
          out.push(c);
          next.push(c);
        }
      }
    } catch {
    } finally {
      close(db);
    }
    return out;
  }

  // The files Antigravity keeps of these conversations: each one's own database, its folder (transcript, steps,
  // subagents, scratch files), its annotations and its lock.
  function agyFiles(ids) {
    const out = [];
    for (const id of ids) {
      if (!isSessionId(id)) continue;
      for (const p of [
        ['conversations', `${id}.db`], ['conversations', `${id}.db-wal`], ['conversations', `${id}.db-shm`], ['conversations', `${id}.db-journal`],
        ['brain', id], ['annotations', `${id}.pbtxt`], ['presence', `${id}.lock`],
      ]) {
        const full = path.join(agyDir, ...p);
        if (exists(full)) out.push(full);
      }
    }
    return out;
  }

  // These conversations out of Antigravity's list of them (and its search index), so neither it nor the chats list
  // shows them any more. True when that's done (or there's no list).
  function agyForget(all) {
    const ids = all.filter(isSessionId);
    if (!ids.length || !exists(summaries())) return true;
    const db = open(summaries(), true);
    if (!db) return false;
    try {
      const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name));
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const table of ['conversation_summaries', 'conversations_fts']) {
          if (!tables.has(table)) continue;
          const del = db.prepare(`DELETE FROM ${table} WHERE conversation_id = ?`);
          for (const id of ids) del.run(id);
        }
        db.exec('COMMIT');
        return true;
      } catch {
        try {
          db.exec('ROLLBACK');
        } catch {}
        return false;
      }
    } catch {
      return false;
    } finally {
      close(db);
    }
  }

  // These conversations out of Antigravity's caches: its metadata of each, and the conversation `agy -c` would continue
  // in a folder.
  function agyCacheForget(ids) {
    const gone = new Set(ids);
    const rewrite = (name, change) => {
      const file = path.join(agyDir, 'cache', name);
      try {
        const j = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!j || typeof j !== 'object' || Array.isArray(j) || !change(j)) return;
        const tmp = `${file}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(j, null, 2));
        fs.renameSync(tmp, file);
      } catch {}
    };
    rewrite('conversation_metadata.json', (j) => {
      const all = j.conversations;
      if (!all || typeof all !== 'object' || !Object.keys(all).some((id) => gone.has(id))) return false;
      for (const id of gone) delete all[id];
      return true;
    });
    rewrite('last_conversations.json', (j) => {
      let changed = false;
      for (const [dir, id] of Object.entries(j)) {
        if (typeof id !== 'string' || !gone.has(id)) continue;
        delete j[dir];
        changed = true;
      }
      return changed;
    });
  }

  // Deletes an Antigravity conversation and its subagents': out of its list first, then their files. True when its
  // database is gone and it's out of the list.
  function eraseAgy(chat) {
    if (!isSessionId(chat.id)) return false;
    const ids = [chat.id, ...agyChildren(chat.id)];
    // Out of its list first: a conversation listed with its files gone would show there, and wouldn't open.
    if (!agyForget(ids)) return false;
    for (const p of agyFiles(ids)) remove(p);
    agyCacheForget(ids);
    return !exists(path.join(agyDir, 'conversations', `${chat.id}.db`));
  }

  // ----- any tool -----

  /** Whether a saved chat of the list is one this can delete: Claude's transcript, Codex's log, Antigravity's id. */
  function deletable(item) {
    if (!item) return false;
    if (item.tool === 'codex') return isCodexLog(item.path, item.id);
    if (item.tool === 'antigravity') return isSessionId(item.id);
    return isTranscript(item.path);
  }

  /** Deletes a conversation from the PC, for good. True when it's gone (else it's tried again later). */
  async function erase(chat) {
    if (chat.tool === 'codex') return eraseCodex(chat);
    if (chat.tool === 'antigravity') return eraseAgy(chat);
    for (const p of claudeFiles(chat)) remove(p);
    return !claudeFiles(chat).some((p) => p.endsWith('.jsonl'));
  }

  /** When the conversation was last written (ms), null when it's gone. */
  function lastWritten(chat) {
    let times;
    if (chat.tool === 'codex') times = isCodexLog(chat.path, chat.id) ? [modified(chat.path)] : [];
    else if (chat.tool === 'antigravity') {
      times = !isSessionId(chat.id) ? [] : [
        modified(path.join(agyDir, 'conversations', `${chat.id}.db`)),
        modified(path.join(agyDir, 'brain', chat.id, '.system_generated', 'logs', 'transcript.jsonl')),
      ];
    } else times = claudeFiles(chat).filter((p) => p.endsWith('.jsonl')).map(modified);
    times = times.filter((t) => t != null);
    return times.length ? Math.max(...times) : null;
  }

  /**
   * What each chat in the trash is due now: nothing while its 30 days run; then deleted for good, unless it was written
   * to after it was deleted (continued in a terminal while the app was closed): that one comes back to the list instead.
   */
  function due(all, now) {
    const out = { erase: [], putBack: [] };
    for (const chat of all) {
      if (!expired(chat, now)) continue;
      const written = lastWritten(chat);
      (written != null && written > chat.at ? out.putBack : out.erase).push(chat);
    }
    return out;
  }

  return { deletable, erase, due, claudeFiles, agyFiles, agyChildren, lastWritten, isTranscript, isCodexLog };
}

module.exports = { createChatTrash, KEEP, daysLeft, expired, isSessionId, isCodexLogIn };
