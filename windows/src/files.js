'use strict';

// The file side of Source Control's editor (web/file-editor.js), the Mac app's FileEditor.swift: the dashboard opens a
// text file there, beside the diff, when it's Ctrl-clicked in a terminal (rather than in its app), and a new one on
// Ctrl+N. This reads and writes the files for the page, only the ones opened there (and the pictures a Markdown file
// shows), and asks where a new one goes. Paths go to the page as Windows writes them (C:\…), as Source Control's do.

const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

// The largest file the editor opens; a bigger one opens in its app.
const LARGEST = 10 << 20;

// The same file however it was written: Windows' names don't care about case or "/" against "\".
const keyOf = (p) => path.resolve(p).toLowerCase();

// \\host\share\… (or //host/share/…): on Windows merely looking one up is an SMB request, which hands the host the
// user's NTLM hash; a path a terminal printed or a page sent never gets that far.
const isUnc = (p) => typeof p === 'string' && /^[\\/]{2}/.test(p);

// A file's text when it's one the editor shows: UTF-8 (its BOM kept aside), no NUL byte in its first 8 KB (not a
// binary file), at most 10 MB.
function textOf(p) {
  try {
    const real = fs.realpathSync(p);
    const st = fs.statSync(real);
    if (!st.isFile() || st.size > LARGEST) return null;
    const data = fs.readFileSync(real);
    if (data.subarray(0, 8192).includes(0)) return null;
    const bom = data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf;
    const body = bom ? data.subarray(3) : data;
    const text = new TextDecoder('utf-8', { fatal: true }).decode(body);
    return { text, bom };
  } catch {
    return null;
  }
}

const canOpen = (p) => textOf(p) !== null;

// When the file last changed, in seconds (to the nanosecond, as the Mac's), through a link; null when it's gone.
function mtime(p) {
  try {
    return Number(fs.statSync(p, { bigint: true }).mtimeNs) / 1e9;
  } catch {
    return null;
  }
}

// Writes over the file where it is, as VS Code does (its permissions and the links to it stay), or makes it when it
// isn't there. The old text past the new end goes only once the new is written.
function write(text, bom, p) {
  const data = Buffer.concat([bom ? Buffer.from([0xef, 0xbb, 0xbf]) : Buffer.alloc(0), Buffer.from(text, 'utf8')]);
  if (!fs.existsSync(p)) return fs.writeFileSync(p, data);
  const fd = fs.openSync(p, 'r+');
  try {
    fs.writeSync(fd, data, 0, data.length, 0);
    fs.ftruncateSync(fd, data.length);
  } finally {
    fs.closeSync(fd);
  }
}

// A picture a Markdown file shows, as a data: address (the page reads no file outside the app's own).
const IMAGES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon' };
function image(p) {
  const type = IMAGES[path.extname(p).slice(1).toLowerCase()];
  if (!type) return null;
  try {
    if (fs.statSync(p).size > LARGEST) return null;
    return `data:${type};base64,${fs.readFileSync(p).toString('base64')}`;
  } catch {
    return null;
  }
}

// ---------- a path Ctrl-clicked in a terminal (the Mac's ChatTerminal.swift) ----------

const exists = (p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
};

// The file `text` names (from the terminal's folder when relative), also as "file.js:12" or "file.js:12:4": the file,
// and the line and column it names with it.
function existingFile(text, cwd, home) {
  let p = text;
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) p = path.join(home, p.slice(1));
  // Git Bash's way of writing C:\…: /c/…
  else if (/^\/[a-z]\//i.test(p)) p = `${p[1]}:${p.slice(2)}`;
  if (isUnc(p)) return null;
  if (!path.win32.isAbsolute(p)) {
    if (!cwd) return null;
    p = path.resolve(cwd, p);
  }
  let numbers = [];
  const m = /:(\d+)(?::(\d+))?$/.exec(p);
  if (m && !exists(p)) {
    numbers = [m[1], m[2]].filter(Boolean).map(Number);
    p = p.slice(0, m.index);
  }
  if (!p || !exists(p)) return null;
  return { path: path.resolve(p), line: numbers[0] || null, column: numbers[1] || null };
}

// …or followed by a sentence's full stop or a closing bracket (the link takes those in).
function fileTarget(text, cwd, home) {
  let trimmed = text;
  while (trimmed && '.,;:!?)]}\'"`'.includes(trimmed[trimmed.length - 1])) trimmed = trimmed.slice(0, -1);
  return existingFile(text, cwd, home) || (trimmed === text || !trimmed ? null : existingFile(trimmed, cwd, home));
}

// Claude wraps its own text, so a long path it printed can sit on two or three lines the terminal doesn't know belong
// together: a piece that isn't a file is joined with the path text ending the line above or starting the line below,
// and the longest that's a file wins. `rows`: the lines around the piece's (`at`), right-trimmed; `start`: where in its
// line the piece starts.
function wholePath(piece, start, rows, at, cwd, home) {
  const row = rows[at];
  if (typeof row !== 'string' || row.slice(start, start + piece.length) !== piece) return null;
  const tail = (s) => /\S*$/.exec(s)[0];
  const head = (s) => /^\s*(\S*)/.exec(s)[1];
  // A line that's nothing but path text goes on the path whole; otherwise it ends or starts it.
  const alone = (s) => !!s && !s.trim().includes(' ');
  const above = [''], below = [''];
  if (!row.slice(0, start).trim() && at > 0) {
    above.push(tail(rows[at - 1]));
    if (alone(rows[at - 1]) && at > 1) above.push(tail(rows[at - 2]) + head(rows[at - 1]));
  }
  if (!row.slice(start + piece.length).trim() && at + 1 < rows.length) {
    below.push(head(rows[at + 1]));
    if (alone(rows[at + 1]) && at + 2 < rows.length) below.push(head(rows[at + 1]) + head(rows[at + 2]));
  }
  let best = null;
  for (const a of above) {
    for (const b of below) {
      if (!a && !b) continue;
      const t = fileTarget(a + piece + b, cwd, home);
      if (t && t.path.length > (best ? best.path.length : 0)) best = t;
    }
  }
  return best;
}

// What a piece of a terminal's text names: { path, line, column }, or null. `q`: { text, start, rows, at } from the
// terminal page.
function linkTarget(q, cwd, home) {
  if (!q || typeof q.text !== 'string' || !q.text || q.text.length > 1024) return null;
  const rows = Array.isArray(q.rows) ? q.rows.slice(0, 5).map((r) => (typeof r === 'string' ? r.slice(0, 2000) : '')) : [];
  return fileTarget(q.text, cwd, home) ||
    (Number.isInteger(q.at) && Number.isInteger(q.start) ? wholePath(q.text, q.start, rows, q.at, cwd, home) : null);
}

// Files Windows would run rather than show when opened in "their app": shown in File Explorer instead, so a Ctrl-click
// on a path in a terminal never starts a program.
const RUNS = new Set(['exe', 'com', 'scr', 'pif', 'msi', 'msp', 'msix', 'appx', 'appxbundle', 'lnk', 'url', 'cpl', 'hta',
  'jar', 'reg', 'application', 'gadget', 'scf', 'inf', 'sys', 'dll', 'ocx', 'appref-ms', 'settingcontent-ms', 'library-ms',
  // Scripts too: one that isn't valid UTF-8 text isn't shown in the editor, so it would come here and run.
  'bat', 'cmd', 'ps1', 'psm1', 'psd1', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'msc', 'chm', 'py', 'rb', 'sh']);

// A file the editor shows as Markdown, with its preview (web/tm/languages.js's text.html.markdown).
const MARKDOWN = new Set(['md', 'mkd', 'mkdn', 'mdwn', 'mdown', 'markdown', 'markdn', 'mdtxt', 'mdtext', 'copilotmd', 'litcoffee', 'ron', 'ronn', 'workbook']);
const isMarkdown = (p) => MARKDOWN.has(path.extname(p).slice(1).toLowerCase());

// Whether a link in the Markdown file `from` may open `p` in the editor, both as the files they really are (links and
// junctions followed): inside the repository holding `from` (the folder with .git above it, not the home folder);
// outside any, below `from`'s folder and in no hidden folder nor a hidden file, only that folder itself when it's the
// home folder or a drive's root. Windows' names don't care about case.
function linkable(p, from, home) {
  const real = (q) => {
    try {
      return fs.realpathSync(q);
    } catch {
      return null;
    }
  };
  const target = real(p), folder = real(path.dirname(from)), own = real(home) || home;
  if (!target || !folder) return false;
  const fold = (s) => (process.platform === 'win32' ? s.toLowerCase() : s);
  const under = (dir) => fold(target).startsWith(fold(dir.endsWith(path.sep) ? dir : dir + path.sep));
  for (let dir = folder; ; ) {
    if (fold(dir) !== fold(own) && exists(path.join(dir, '.git'))) return under(dir);
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  if (!under(folder)) return false;
  const rest = path.relative(folder, target).split(/[\\/]/);
  if (rest.some((part) => part.startsWith('.'))) return false;
  return (fold(folder) !== fold(own) && path.parse(folder).root !== folder) || rest.length === 1;
}

// - shell: Electron's (openPath, showItemInFolder, openExternal); dialog(options): showSaveDialog over the dashboard
// - appName(path): the app a file opens in otherwise, for the page's "Open in …" (VS Code, for most), or ''
// - onOpen(path, line, cwd): the page should open this file (a link in a Markdown preview to a text file beside it)
// - userActed(ms, press): whether Windows delivered a click (press: or Enter or Space), or any key or click, to the
//   dashboard in the last `ms` (main.js's input-event): the user's own, since a page can't make these
// - confirmWrite(path): asks the user before the first save of a file opened from a Markdown link; true to save it
// - home: the user's folder (os.homedir())
function createFiles({ shell, saveDialog, appName = () => '', onOpen = () => {}, userActed = () => false, confirmWrite = async () => false, home = '' }) {
  // The files the page may read: those opened in it (a Ctrl-click, a link in a Markdown preview, a Save As). Those it
  // may also write: the ones the app opened (a Ctrl-click, a Save As), and one opened from a Markdown link once the user
  // agreed to save it. The page alone never makes a file writable.
  const allowed = new Set();
  const writable = new Set();
  const allow = (p) => {
    allowed.add(keyOf(p));
    writable.add(keyOf(p));
  };
  const mine = (p) => !!p && allowed.has(keyOf(p));

  // Not a file the editor shows: in its app, or (a program) shown in its folder.
  function openOutside(p) {
    if (!fs.existsSync(p)) return;
    if (RUNS.has(path.extname(p).slice(1).toLowerCase())) return shell.showItemInFolder(p);
    shell.openPath(p).catch(() => {});
  }

  async function handle(body) {
    const b = body && typeof body === 'object' ? body : {};
    if (b.type === 'saveAs') return saveAs(b);
    const p = typeof b.path === 'string' && b.path && !isUnc(b.path) ? path.resolve(b.path) : '';
    switch (b.type) {
      case 'read': {
        const file = mine(p) ? textOf(p) : null;
        if (!file) return { error: `${path.basename(p)} can't be shown as text.` };
        return { text: file.text, bom: file.bom, mtime: mtime(p) ?? 0, app: (await appName(p)) || '' };
      }
      case 'write': {
        if (!mine(p) || typeof b.text !== 'string') return { error: 'not a file opened here' };
        // Opened from a Markdown link: written once the user agrees, right after typing or clicking here.
        if (!writable.has(keyOf(p))) {
          if (!userActed(10000) || !(await confirmWrite(p))) return { error: "the save wasn't confirmed (it was opened from a Markdown link)" };
          writable.add(keyOf(p));
        }
        // Changed on disk since the page read it: the user picks (the page's banner).
        const now = mtime(p);
        if (typeof b.base === 'number' && now !== null && Math.abs(now - b.base) > 0.0005) return { conflict: true };
        try {
          write(b.text, b.bom === true, p);
          return { mtime: mtime(p) ?? 0 };
        } catch (e) {
          return { error: e.message };
        }
      }
      case 'stat': {
        const out = {};
        for (const q of Array.isArray(b.paths) ? b.paths : []) if (typeof q === 'string' && mine(q)) out[q] = mtime(path.resolve(q));
        return out;
      }
      case 'image': {
        const url = p ? image(p) : null;
        return url ? { url } : { error: 'no picture' };
      }
      case 'external':
        if (mine(p) && userActed(1000, true)) openOutside(p);
        return null;
      case 'reveal':
        if (mine(p)) shell.showItemInFolder(p);
        return null;
      case 'openURL': {
        let u = null;
        try {
          u = new URL(String(b.url || ''));
        } catch {}
        if (u && ['http:', 'https:', 'mailto:'].includes(u.protocol)) shell.openExternal(u.href).catch(() => {});
        return null;
      }
      case 'openPath': {
        // A link in a Markdown preview, clicked: a text file in the editor, anything else in its app. Only right after a
        // click Windows delivered here; a text file only from a Markdown file the page may already read, and only inside
        // its repository (or its folder), read only until a save is agreed to.
        if (!p || !userActed(1000, true)) return { error: 'not clicked' };
        if (canOpen(p)) {
          const from = typeof b.from === 'string' && b.from && !isUnc(b.from) ? path.resolve(b.from) : '';
          if (!from || !mine(from) || !isMarkdown(from) || !linkable(p, from, home)) return { error: 'not beside the Markdown file' };
          allowed.add(keyOf(p));
          onOpen(p, Number.isInteger(b.line) ? b.line : null, typeof b.cwd === 'string' && b.cwd ? b.cwd : path.dirname(p));
        } else openOutside(p);
        return null;
      }
      default:
        return null;
    }
  }

  // A new file's first save (VS Code's Save As): where it goes, then its text written there.
  async function saveAs(b) {
    const r = await saveDialog({ defaultPath: typeof b.name === 'string' && b.name ? b.name : 'Untitled.txt' });
    const where = r && !r.canceled && r.filePath;
    if (!where || typeof b.text !== 'string') return { cancelled: true };
    try {
      write(b.text, false, where);
      allow(where);
      return { path: path.resolve(where), mtime: mtime(where) ?? 0, app: (await appName(where)) || '' };
    } catch (e) {
      return { error: e.message };
    }
  }

  return { handle, allow, canOpen, openOutside };
}

// A file:// link a program printed (OSC 8) as the local file it names, if there is one; never a share's (file://host/…).
function fileFromURL(url) {
  let p = null;
  try {
    p = /^file:/i.test(url) ? fileURLToPath(url) : null;
  } catch {}
  return p && !isUnc(p) && fs.existsSync(p) ? path.resolve(p) : null;
}

module.exports = { createFiles, canOpen, linkTarget, fileFromURL, linkable, isMarkdown, LARGEST };
