'use strict';
// The chats list's model (the Mac's SidebarModel, Sidebar.swift): every saved conversation (the engine's history) and
// the live ones that have none yet, newest first, by project. Starred chats get a section of their own at the top;
// archived ones (a chat, or a whole folder with its later chats too) leave the list altogether and are listed in
// Settings instead, as Claude's and ChatGPT's are, so a stream shows only what's meant to be seen. Stars and the archive
// are kept across launches. Folders opened from the list (its open folder button) stay in it, at the top, with or
// without chats, and the app's own terminals with no Claude in them show in their folders too. The page
// (pages/chats.*) draws it and keeps what's only its own: the search, the folders opened past their first five chats,
// the folders folded shut and the folders picked for archiving several at once.
const os = require('os');
const path = require('path');

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

/** `settings`: { get(key), set(key, value) }, where the stars and the archive are kept. */
function createChatList({ settings }) {
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
  const save = () => settings.set('chatList', {
    favorites: [...favorites], archived: [...archived], folders: [...folders], restored: [...restored], titles: Object.fromEntries(titles),
    pinned: [...pinned],
  });

  let items = []; // the engine's history: { id, cwd, mtime, size, title, lastPrompt }
  let live = []; // engine.live()
  let open = new Set(); // sessions with a window of the app
  let activeId = null; // session of the focused chat window
  let terms = []; // the app's terminals with no Claude in them: { id, cwd, title, job, shown }
  let liveKey = '', openKey = '', termsKey = '', version = 0;

  // Every chat, newest first, with the live sessions that have no saved title yet (they head the list, "now").
  function everything() {
    const known = new Set(items.map((i) => i.id));
    const all = items.slice();
    for (const b of live) {
      if (!b.cwd || known.has(b.sessionId)) continue;
      known.add(b.sessionId);
      all.push({ id: b.sessionId, cwd: b.cwd, mtime: Infinity, size: 0, title: b.title || `new chat · ${b.name}`, lastPrompt: '' });
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

  return {
    setItems(list) {
      items = Array.isArray(list) ? list : [];
      version++;
    },
    /** What the list shows of the live sessions changed: true. */
    setLive(list) {
      live = list || [];
      const key = JSON.stringify(live.map((b) => [b.sessionId, b.cwd, b.status, b.host, b.name, b.title]));
      if (key === liveKey) return false;
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

    /** The page's list: the chats that aren't archived, each with its live status, and the folders' labels. */
    snapshot() {
      const status = new Map(live.map((b) => [b.sessionId, b]));
      const rows = [];
      const shown = new Map(); // folder key -> its path as the newest chat there has it
      for (const i of everything()) {
        if (isArchived(i)) continue;
        const b = status.get(i.id);
        const key = folderKey(i.cwd);
        const fav = favorites.has(i.id);
        rows.push({
          id: i.id, cwd: i.cwd, key, mtime: i.mtime, size: i.size, title: titles.get(i.id) || i.title, lastPrompt: i.lastPrompt, fav,
          status: b ? b.status : null, host: b ? b.host : null, open: open.has(i.id), active: activeId === i.id,
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
      return { rows, terms: termRows, pinned: pins, saved: items.length, live: live.length, folders: where, active: activeId };
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
