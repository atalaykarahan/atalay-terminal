'use strict';
// The chats list's model (the Mac's SidebarModel, Sidebar.swift): every saved conversation (the engine's history) and
// the live ones that have none yet, newest first, by project. Starred chats get a section of their own at the top;
// archived ones (a chat, or a whole folder with its later chats too) leave the list altogether and are listed in
// Settings instead, as Claude's and ChatGPT's are, so a stream shows only what's meant to be seen. Stars and the archive
// are kept across launches. Folders opened from the list (its open folder button) stay in it, at the top, with or
// without chats, and the app's own terminals with no Claude in them show in their folders too. Chats deleted from the
// list (chattrash.js) leave it at once and stay 30 days in Settings' deleted chats, where they can be put back; then
// their files are deleted from the PC. The page (pages/chats.*) draws the list and keeps what's only its own: the
// search, the folders opened past their first five chats, the folders folded shut and the chats or folders picked for
// archiving or deleting several at once.
const os = require('os');
const path = require('path');
const { daysLeft, expired } = require('./chattrash');

const HOME = os.homedir();
const WIN = process.platform === 'win32';
const SPLIT = /[\\/]/;
const SEP = WIN ? '\\' : '/';

// One folder however Claude wrote its path: C:\ or c:\, either slash, a slash at the end.
function folderKey(cwd) {
  const p = path.normalize(String(cwd || '')).replace(/[\\/]+$/, '');
  return WIN ? p.toLowerCase() : p;
}

function tildify(p) {
  const s = String(p || '');
  const head = s.slice(0, HOME.length);
  return s && (WIN ? head.toLowerCase() === HOME.toLowerCase() : head === HOME) ? '~' + s.slice(HOME.length) : s;
}

const parts = (cwd) => tildify(cwd).split(SPLIT).filter(Boolean);
const projectLabel = (cwd) => parts(cwd).slice(-2).join(SEP);

/** The shortest end of each path that tells the folders apart: "05_AI" twice becomes "F1Reels\…\05_AI" and "SecondReels\…\05_AI". */
function labels(cwds) {
  const split = new Map(cwds.map((c) => [c, parts(c)]));
  const out = new Map();
  const pending = new Set(cwds);
  for (let k = 2; pending.size; k++) {
    const seen = new Map();
    for (const cwd of pending) {
      const tail = split.get(cwd).slice(-k);
      const label = tail.length <= 2 ? tail.join(SEP) : `${tail[0]}${SEP}…${SEP}${tail[tail.length - 1]}`;
      if (!seen.has(label)) seen.set(label, []);
      seen.get(label).push(cwd);
    }
    for (const [label, owners] of seen) {
      if (owners.length > 1 && !owners.every((c) => split.get(c).length <= k)) continue;
      for (const c of owners) {
        out.set(c, owners.length === 1 ? label : tildify(c));
        pending.delete(c);
      }
    }
  }
  return out;
}

/**
 * `settings`: { get(key), set(key, value) }, where the stars, the archive and the deleted chats are kept. `trashOps`:
 * what deletes a conversation's files (chattrash.js); `onErased()`: files were deleted, the engine reads the list again.
 */
function createChatList({ settings, trashOps, onErased }) {
  const saved = settings.get('chatList') || {};
  const kept = (k) => new Set(Array.isArray(saved[k]) ? saved[k].filter((x) => typeof x === 'string') : []);
  const favorites = kept('favorites');
  const archived = kept('archived');
  // Whole folders archived (their chats, later ones too), and chats taken back out of one.
  const folders = kept('folders');
  const restored = kept('restored');
  // Names the user gave chats (right-click → Rename…), over the titles Claude gave them, as on the Mac.
  const titles = new Map(Object.entries(saved.titles && typeof saved.titles === 'object' ? saved.titles : {}).filter(([, v]) => typeof v === 'string'));
  // Folders opened from the list, in the order they were opened: path as it was picked.
  const pinned = (Array.isArray(saved.pinned) ? saved.pinned : []).filter((x) => typeof x === 'string' && x);
  // Chats deleted from the list, by id: { id, title, cwd, tool, path, at }, kept across launches.
  const trash = new Map();
  for (const [id, c] of Object.entries(saved.trash && typeof saved.trash === 'object' ? saved.trash : {})) {
    if (!c || typeof c.path !== 'string' || !Number.isFinite(c.at)) continue;
    trash.set(id, { id, title: String(c.title || ''), cwd: String(c.cwd || ''), tool: typeof c.tool === 'string' ? c.tool : 'claude', path: c.path, at: c.at });
  }
  // Chats whose files are being deleted right now: out of the trash already, not back in the list.
  const erasing = new Set();
  const save = () => settings.set('chatList', {
    favorites: [...favorites], archived: [...archived], folders: [...folders], restored: [...restored], titles: Object.fromEntries(titles),
    pinned: [...pinned],
    trash: Object.fromEntries([...trash].map(([id, c]) => [id, { title: c.title, cwd: c.cwd, tool: c.tool, path: c.path, at: c.at }])),
  });

  let items = []; // the engine's history: { id, path, cwd, mtime, size, title, lastPrompt, tool }
  let live = []; // engine.live()
  let open = new Set(); // sessions with a window of the app
  let activeId = null; // session of the focused chat window
  let terms = []; // the app's terminals with no Claude in them: { id, cwd, title, job, shown }
  let liveKey = '', openKey = '', termsKey = '', version = 0;

  // Every chat, newest first, with the live sessions that have no saved title yet (they head the list, "now"). The
  // deleted ones aren't among them.
  function everything() {
    const known = new Set(items.map((i) => i.id));
    const all = items.filter((i) => !trash.has(i.id) && !erasing.has(i.id));
    for (const b of live) {
      if (!b.cwd || known.has(b.sessionId) || (b.convId && known.has(b.convId))) continue;
      known.add(b.sessionId);
      const tool = b.name === 'Antigravity' ? 'antigravity' : b.name === 'Codex' ? 'codex' : 'claude';
      all.push({ id: b.sessionId, cwd: b.cwd, mtime: Infinity, size: 0, title: b.title || `new chat · ${b.name}`, lastPrompt: '', tool });
    }
    return all.sort((a, b) => (a.mtime === b.mtime ? 0 : a.mtime > b.mtime ? -1 : 1));
  }
  const find = (id) => everything().find((i) => i.id === id);
  const isArchived = (item) => (archived.has(item.id) || folders.has(folderKey(item.cwd))) && !restored.has(item.id);

  // One chat in or out of the archive; out of an archived folder, it alone comes back.
  function toggleArchived(item) {
    if (isArchived(item)) {
      archived.delete(item.id);
      if (folders.has(folderKey(item.cwd))) restored.add(item.id);
    } else {
      archived.add(item.id);
      restored.delete(item.id);
      favorites.delete(item.id);
    }
  }

  // A whole folder in or out of the archive. Out, everything in it comes back, chats archived one by one too.
  function setFolder(cwd, on) {
    const key = folderKey(cwd);
    const ids = everything().filter((i) => folderKey(i.cwd) === key).map((i) => i.id);
    if (on) {
      folders.add(key);
      // Archived, an opened folder leaves the list too.
      const at = pinned.findIndex((c) => folderKey(c) === key);
      if (at >= 0) pinned.splice(at, 1);
      for (const id of ids) {
        restored.delete(id);
        favorites.delete(id);
      }
    } else {
      folders.delete(key);
      for (const id of ids) {
        archived.delete(id);
        restored.delete(id);
      }
    }
  }

  const changed = () => {
    version++;
    save();
  };

  // The live session a chat of the list is (its own, or the conversation another AI tool's process is in).
  const liveOf = (item) => live.find((b) => b.sessionId === item.id || (b.convId && b.convId === item.id));
  // Whether a chat can be deleted here: a saved conversation of Claude Code's, Codex's or Antigravity's, not running
  // (a running one is ended first).
  const canDelete = (item) => !liveOf(item) && !!trashOps && trashOps.deletable(item);

  // Deleted from the disk, for good: these chats of the trash. Their names and marks here go with them. One that
  // couldn't be deleted just now (its tool held its list) stays in the trash, to be tried again.
  async function erase(ids) {
    const chats = ids.map((id) => trash.get(id)).filter(Boolean);
    if (!chats.length || !trashOps) return;
    for (const c of chats) {
      trash.delete(c.id);
      erasing.add(c.id);
    }
    changed();
    const failed = new Set();
    for (const c of chats) {
      let gone = false;
      try {
        gone = await trashOps.erase(c);
      } catch {}
      if (!gone) failed.add(c.id);
    }
    for (const c of chats) {
      erasing.delete(c.id);
      if (failed.has(c.id)) {
        if (!trash.has(c.id)) trash.set(c.id, c);
        continue;
      }
      favorites.delete(c.id);
      archived.delete(c.id);
      restored.delete(c.id);
      titles.delete(c.id);
    }
    // Gone from the list now, not when the engine has read it again.
    items = items.filter((i) => failed.has(i.id) || !chats.some((c) => c.id === i.id));
    changed();
    if (onErased) onErased();
  }

  return {
    setItems(list) {
      items = Array.isArray(list) ? list : [];
      version++;
    },
    /** What the list shows of the live sessions changed: true. */
    setLive(list) {
      live = list || [];
      // A deleted chat that runs again (continued in a terminal: `claude --resume`, `codex resume`, `agy --conversation`)
      // comes back: it's in use.
      let revived = false;
      if (trash.size) {
        for (const b of live) {
          if (trash.delete(b.sessionId)) revived = true;
          if (b.convId && trash.delete(b.convId)) revived = true;
        }
        if (revived) changed();
      }
      const key = JSON.stringify(live.map((b) => [b.sessionId, b.convId, b.cwd, b.status, b.host, b.name, b.title]));
      if (key === liveKey) return revived;
      liveKey = key;
      return true;
    },
    setOpen(ids) {
      open = new Set(ids);
      const key = [...open].sort().join(',');
      if (key === openKey) return false;
      openKey = key;
      return true;
    },
    setActive(id) {
      const next = id || null;
      if (next === activeId) return false;
      activeId = next;
      return true;
    },
    /** The app's terminals with no Claude in them, for their folders; what the list shows of them changed: true. */
    setTerms(list) {
      terms = Array.isArray(list) ? list : [];
      const key = JSON.stringify(terms);
      if (key === termsKey) return false;
      termsKey = key;
      version++;
      return true;
    },
    version: () => version,

    /** A folder opened from the list: it stays there (at the top) until it's taken out or archived. */
    pin(cwd) {
      const c = String(cwd || '');
      if (!c) return;
      const key = folderKey(c);
      if (folders.has(key)) setFolder(c, false);
      if (!pinned.some((x) => folderKey(x) === key)) pinned.unshift(c);
      changed();
    },
    unpin(cwd) {
      const key = folderKey(cwd);
      const at = pinned.findIndex((x) => folderKey(x) === key);
      if (at < 0) return;
      pinned.splice(at, 1);
      changed();
    },

    toggleFavorite(id) {
      const item = find(id);
      if (!item) return;
      if (!favorites.delete(id)) {
        favorites.add(id);
        if (isArchived(item)) toggleArchived(item);
      }
      changed();
    },
    toggleArchived(id) {
      const item = find(id);
      if (!item) return;
      toggleArchived(item);
      changed();
    },
    /** The name the user gave a chat, if any. */
    title: (id) => titles.get(id) || null,
    /** A chat's own name; an empty one brings back the title Claude gave it. */
    rename(id, name) {
      if (!id) return;
      const clean = String(name || '').trim().slice(0, 120);
      if (clean) titles.set(id, clean);
      else titles.delete(id);
      changed();
    },
    setFolder(cwd, on) {
      if (!cwd) return;
      setFolder(cwd, on);
      changed();
    },
    restore(id) {
      const item = find(id);
      if (!item || !isArchived(item)) return;
      toggleArchived(item);
      changed();
    },
    restoreAll() {
      archived.clear();
      folders.clear();
      restored.clear();
      changed();
    },
    /** These chats into the archive (the ones picked in the list). */
    archiveMany(ids) {
      for (const id of ids) {
        const item = find(id);
        if (item && !isArchived(item)) toggleArchived(item);
      }
      changed();
    },

    // ----- deleting chats -----

    /** The chats a folder's panel shows (not its archived or starred ones), for deleting a whole folder's. */
    chatsInFolders(keys) {
      const want = new Set(keys);
      return everything().filter((i) => want.has(folderKey(i.cwd)) && !isArchived(i) && !favorites.has(i.id)).map((i) => i.id);
    },
    /** Of the chats named: those that can be deleted, how many can't because they run, and how many others can't. */
    deletable(ids) {
      const wanted = new Set(ids);
      const out = { chats: [], running: 0, others: 0 };
      for (const item of everything()) {
        if (!wanted.has(item.id)) continue;
        if (canDelete(item)) out.chats.push(item);
        else if (liveOf(item)) out.running++;
        else out.others++;
      }
      return out;
    },
    /** A chat's name as the list shows it. */
    shownTitle: (item) => titles.get(item.id) || item.title || item.lastPrompt || '',
    /** Into the trash: out of the list (and the favorites), kept 30 days. */
    delete(chats) {
      const now = Date.now();
      for (const item of chats) {
        if (!canDelete(item)) continue;
        trash.set(item.id, {
          id: item.id, title: titles.get(item.id) || item.title || item.lastPrompt || '', cwd: item.cwd, tool: item.tool || 'claude', path: item.path, at: now,
        });
        favorites.delete(item.id);
      }
      changed();
    },
    /** Out of the trash, back where it was in the list. */
    putBack(id) {
      if (trash.delete(id)) changed();
    },
    putBackAll() {
      if (!trash.size) return;
      trash.clear();
      changed();
    },
    trashed: (id) => trash.get(id) || null,
    trashIds: () => [...trash.keys()],
    erase,
    /**
     * The chats whose 30 days are over are deleted from the disk. One written to since it was deleted (continued while
     * the app was closed) comes back instead.
     */
    emptyExpiredTrash() {
      const now = Date.now();
      const all = [...trash.values()];
      if (!trashOps || !all.some((c) => expired(c, now))) return Promise.resolve();
      const due = trashOps.due(all, now);
      // Only what is still as it was read: one put back meanwhile stays.
      const back = due.putBack.filter((c) => trash.get(c.id) === c);
      for (const c of back) trash.delete(c.id);
      if (back.length) changed();
      return erase(due.erase.filter((c) => trash.get(c.id) === c).map((c) => c.id));
    },
    /** For Settings (cloud.js's deleted chats): the deleted chats by folder, the one deleted last first, each with the days it has left. */
    trashList() {
      const now = Date.now();
      const order = [];
      const byKey = new Map();
      for (const c of [...trash.values()].sort((a, b) => b.at - a.at)) {
        const key = folderKey(c.cwd);
        if (!byKey.has(key)) {
          order.push(key);
          byKey.set(key, []);
        }
        byKey.get(key).push(c);
      }
      const names = labels(order.map((k) => byKey.get(k)[0].cwd));
      return order.map((key) => {
        const list = byKey.get(key);
        const cwd = list[0].cwd;
        return { cwd, label: names.get(cwd) || projectLabel(cwd), chats: list.map((c) => ({ id: c.id, title: c.title, tool: c.tool, days: daysLeft(c.at, now) })) };
      });
    },

    /** The page's list: the chats that aren't archived, each with its live status, and the folders' labels. */
    snapshot() {
      const status = new Map();
      for (const b of live) {
        status.set(b.sessionId, b);
        if (b.convId) status.set(b.convId, b);
      }
      const rows = [];
      const shown = new Map(); // folder key -> its path as the newest chat there has it
      for (const i of everything()) {
        if (isArchived(i)) continue;
        const b = status.get(i.id);
        const key = folderKey(i.cwd);
        const fav = favorites.has(i.id);
        rows.push({
          id: i.id, cwd: i.cwd, key, mtime: i.mtime, size: i.size, title: titles.get(i.id) || i.title, lastPrompt: i.lastPrompt, fav,
          tool: i.tool || 'claude', status: b ? b.status : null, host: b ? b.host : null,
          open: open.has(i.id) || (b ? open.has(b.sessionId) : false),
        });
        if (!fav && !shown.has(key)) shown.set(key, i.cwd);
      }
      // The opened folders and the terminals' folders have a place in the list too, chats or none.
      const pins = [];
      for (const c of pinned) {
        const key = folderKey(c);
        if (folders.has(key)) continue;
        pins.push(key);
        if (!shown.has(key)) shown.set(key, c);
      }
      const termRows = [];
      for (const t of terms) {
        if (!t.cwd) continue;
        const key = folderKey(t.cwd);
        termRows.push({ ...t, key });
        if (!shown.has(key)) shown.set(key, t.cwd);
      }
      const names = labels([...shown.values()]);
      const where = {};
      for (const [key, cwd] of shown) where[key] = { label: names.get(cwd) || projectLabel(cwd), path: tildify(cwd), cwd };
      // The saved chats in the list or its archive: not the deleted ones (Settings · deleted chats).
      const saved = items.filter((i) => !trash.has(i.id) && !erasing.has(i.id)).length;
      return { rows, terms: termRows, pinned: pins, saved, live: live.length, folders: where, active: activeId };
    },

    /** For Settings (cloud.js's archived chats): the archived chats by folder, each folder's newest first. */
    archivedList() {
      const order = [];
      const byKey = new Map();
      for (const i of everything()) {
        if (!isArchived(i)) continue;
        const key = folderKey(i.cwd);
        if (!byKey.has(key)) {
          order.push(key);
          byKey.set(key, []);
        }
        byKey.get(key).push(i);
      }
      const names = labels(order.map((k) => byKey.get(k)[0].cwd));
      return order.map((key) => {
        const list = byKey.get(key);
        const cwd = list[0].cwd;
        return {
          cwd, label: names.get(cwd) || projectLabel(cwd), whole: folders.has(key),
          chats: list.map((c) => ({ id: c.id, title: titles.get(c.id) || c.title || c.lastPrompt, at: Number.isFinite(c.mtime) ? c.mtime : Date.now() })),
        };
      });
    },
  };
}

module.exports = { createChatList };
