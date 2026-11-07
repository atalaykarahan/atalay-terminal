'use strict';

// Source Control (web/git.js), as in VS Code: Git.swift's bridge, for the Windows app's main process. Its repos are the
// ones the dashboard's sessions work in (their folder, or a file they wrote) and the ones the app's terminals are in;
// for each, what changed, the diffs and the history, and from the page: stage, unstage, discard, commit, push and pull.
// Git runs in child processes (never through a shell), and the page reaches only those repos and only files inside
// them. The replies are Git.swift's, so the page runs unchanged.
//
//   const git = createGit({ folders, written, confirm, menu, trash });
//   const reply = await git.handle(body); // body: what the page posted, { type, ... }
//
// folders()        Where to look: folders (a terminal's, a session's), or sessions as the engine has them
//                  ({ id, name, title, status, live, cwd }), which are then listed on their repo as on the Mac (the
//                  session cards' chips; repos with live sessions first).
// written()        Optional: the files written today, with the sessions that wrote each ({ "<file>": ["<session id>"] }).
// confirm(options) A native question. `options` are dialog.showMessageBox's: a warning, the page's buttons and Cancel
//                  after them (Git.swift adds it), with its cancelId; and `destructive`, true unless the page says
//                  otherwise (Git.swift asks every question as a warning). Answers the index of the button clicked (or
//                  showMessageBox's { response }).
// menu(items, at)  A native menu at `at` ({ x, y }, whole pixels in the page): `items` are { id, title }, the id being
//                  the item's index in the page's list, and { type: 'separator' } for its lines. Answers the id of the
//                  item picked (or its string), null for none.
// trash(path)      Moves a file to the Recycle Bin (shell.trashItem).

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const WIN = process.platform === 'win32';
const PARALLEL = Math.max(1, typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length);

// MARK: running git

let executable = null;
let environments = null;

// The user's git: ATALAY_GIT when it's set, else the one on PATH. On Windows its full path is looked up here: Windows
// would try the current folder before PATH, and Git for Windows' installer can leave git off PATH (or the app was
// started before git was installed), so its usual places come after PATH, as VS Code's git extension looks.
function gitExecutable() {
  if (executable) return executable;
  executable = process.env.ATALAY_GIT || 'git';
  if (WIN && !process.env.ATALAY_GIT) {
    const dirs = (process.env.PATH || '').split(';').map((d) => d.trim().replace(/^"(.*)"$/, '$1'));
    for (const base of [process.env.ProgramW6432, process.env.ProgramFiles, process.env['ProgramFiles(x86)']]) {
      if (base) dirs.push(path.join(base, 'Git', 'cmd'));
    }
    if (process.env.LOCALAPPDATA) dirs.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'cmd'));
    for (const dir of dirs) {
      if (!dir || !path.isAbsolute(dir)) continue;
      const exe = path.join(dir, 'git.exe');
      try {
        if (fs.statSync(exe).isFile()) {
          executable = exe;
          break;
        }
      } catch {}
    }
  }
  return executable;
}

// Whether there's a git to run, for Source Control to say so when there isn't. Missing, it's looked for again next
// time: Git for Windows installed while the app runs is found in its usual place.
function gitFound() {
  if (!WIN) return true;
  const exe = gitExecutable();
  if (path.isAbsolute(exe) && fs.existsSync(exe)) return true;
  executable = null;
  return false;
}

// The environments git runs in: for changes, and for reads.
function gitEnvironment(locks) {
  if (!environments) {
    const env = { ...process.env };
    // Opened from the Finder, a Mac app has the system's short PATH; hooks (lint-staged through npx, …) need the user's
    // tools. On Windows hooks run in Git for Windows' own shell with the app's PATH, which has them already.
    if (process.platform === 'darwin') {
      env.PATH = `/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:${env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin'}`;
    }
    // No terminal to ask for a password on: fail instead of waiting.
    env.GIT_TERMINAL_PROMPT = '0';
    // With no locale set Git for Windows speaks the system's language, where the Mac app's git speaks English: English,
    // so that its "fatal: …" and "error: …" are found (VS Code's git extension sets it too).
    if (WIN && !env.LC_ALL && !env.LC_MESSAGES && !env.LANG && !env.LANGUAGE) env.LANG = 'en_US.UTF-8';
    // Reads don't take the index lock (VS Code's way): the page asking every few seconds mustn't get in the way of a
    // git command Claude or the user runs at the same time.
    environments = { change: env, read: { ...env, GIT_OPTIONAL_LOCKS: '0' } };
  }
  return locks ? environments.change : environments.read;
}

// Runs git in `dir`: { status, out, err } (out and err as bytes), or null if it couldn't start. A run longer than
// `timeout` ms is stopped, as is one printing more than `max` bytes; either ends with status -1.
function exec(dir, args, { timeout, locks, max = Infinity }) {
  return new Promise((resolve) => {
    let p;
    try {
      p = spawn(gitExecutable(), ['-C', dir, ...args], {
        env: gitEnvironment(locks),
        stdio: ['ignore', 'pipe', 'pipe'],
        // A console program started from a window app gets a console window of its own, unless it's hidden.
        windowsHide: true,
      });
    } catch {
      return resolve(null);
    }
    const out = [], err = [];
    let size = 0, started = false, stopped = false, finished = false, status = null, grace = null;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      p.kill();
    };
    const timer = setTimeout(stop, timeout);
    const finish = (r) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(grace);
      resolve(r);
    };
    const done = () => finish({ status: stopped || status == null ? -1 : status, out: Buffer.concat(out), err: Buffer.concat(err) });
    // Both pipes are read at once: git stops when one it writes to is full. Past `max` its output is read and dropped
    // until it's gone.
    p.stdout.on('data', (d) => {
      if (stopped) return;
      size += d.length;
      if (size > max) stop();
      else out.push(d);
    });
    p.stderr.on('data', (d) => err.push(d));
    p.on('spawn', () => (started = true));
    p.on('error', () => {
      if (!started) finish(null);
    });
    p.on('exit', (code) => {
      status = code;
      // All it printed is read once its pipes close. Something it started can hold them open after it's gone (ssh, when
      // a push that ran out of time was stopped), and the page would wait for ever: that's waited for only a moment.
      grace = setTimeout(() => {
        p.stdout.destroy();
        p.stderr.destroy();
        done();
      }, 1000);
    });
    p.on('close', (code) => {
      if (status == null) status = code;
      done();
    });
  });
}

// What git printed, or null when it failed (or printed more than `max`).
async function read(dir, args, max = 8 << 20) {
  const r = await exec(dir, args, { timeout: 6000, locks: false, max });
  return r && r.status === 0 ? r.out.toString('utf8') : null;
}

// A change to the repo; when it fails, git's last words for the page to show.
async function change(dir, args) {
  const r = await exec(dir, args, { timeout: 60000, locks: true });
  if (!r) return { error: "git didn't start" };
  if (r.status === 0) return { ok: true };
  // Git's reason ("fatal: …"), or the last lines it wrote (a hook's, or "nothing to commit" on its output).
  const said = (r.err.length ? r.err : r.out).toString('utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  const reason = said.find((l) => l.startsWith('fatal: ') || l.startsWith('error: '));
  if (reason) return { error: reason.slice(7) };
  return { error: said.length ? said.slice(-3).join(' ') : 'git failed' };
}

// The collision banner's Isolate (main.js): a worktree of `dir`'s repository beside it (`<repo>-<name>`), on a new
// branch (`isolate-<name>`). { path } or { error }.
async function worktree(dir, name) {
  const root = ((await read(dir, ['rev-parse', '--show-toplevel'])) || '').trim();
  if (!root) return { error: 'not in a git repository' };
  const where = path.join(path.dirname(root), `${path.basename(root)}-${name}`);
  const r = await change(root, ['worktree', 'add', '-b', `isolate-${name}`, where]);
  return r.ok ? { path: where } : r;
}

// Windows takes a command line of up to 32767 characters, so a long list of paths (Stage All on a big change) goes to
// git in parts, as VS Code's git extension sends it.
function batches(root, paths) {
  const room = 30000 - root.length;
  const out = [];
  let part = [], used = 0;
  for (const p of paths) {
    const n = p.length + 3; // a space, and quotes around a name with spaces
    if (part.length && used + n > room) {
      out.push(part);
      part = [];
      used = 0;
    }
    part.push(p);
    used += n;
  }
  if (part.length) out.push(part);
  return out;
}

// The same change for each part of a list of paths; the first that fails stops it.
async function changeEach(root, args, paths) {
  for (const part of batches(root, paths)) {
    const r = await change(root, [...args, '--', ...part]);
    if (!r.ok) return r;
  }
  return { ok: true };
}

// MARK: little things

const str = (v) => (typeof v === 'string' ? v : '');
// A list of strings, or none (as Swift's `as? [String]`: one that isn't a string spoils the list).
const strings = (v) => (Array.isArray(v) && v.every((s) => typeof s === 'string') ? v : []);
const number = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
// Output's lines, without the empty ones or a CR at their end.
const lines = (s) => (s || '').split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l)).filter(Boolean);
const count = (s) => (/^\d+$/.test(s) ? Number(s) : null);
// A file's key for matching paths written in different ways: resolved, and on Windows whatever its case.
const fileKey = (p) => (WIN ? path.resolve(p).toLowerCase() : path.resolve(p));

// The folder's own name.
function baseName(root) {
  const parts = root.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : root;
}

// "~/…" for a folder in the user's home, as the dashboard writes folders (on Windows whatever the separators and case).
function tildify(p) {
  const home = os.homedir();
  if (!p || !home) return p || '';
  const fold = (s) => {
    const t = s.replace(/\\/g, '/');
    return WIN ? t.toLowerCase() : t;
  };
  const at = p.slice(0, home.length), rest = p.slice(home.length);
  return fold(at) === fold(home) && (rest === '' || rest[0] === '/' || rest[0] === '\\') ? `~${rest}` : p;
}

// Runs `fn` on each item, at most `limit` at once; the answers in the items' order.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const k = next++;
      out[k] = await fn(items[k], k);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// MARK: the repos

// Folder -> the repo it's in, asked again after a minute.
const roots = new Map();

// The repo a folder is in (as git writes it: forward slashes, and on Windows the drive and the case on disk).
function repoRoot(dir) {
  const now = Date.now();
  const hit = roots.get(dir);
  if (hit && now - hit.at < 60000) return hit.root;
  const root = (async () => {
    const st = await fsp.stat(dir).catch(() => null);
    if (!st || !st.isDirectory()) return null;
    const out = await read(dir, ['rev-parse', '--show-toplevel']);
    const r = out == null ? '' : out.trim();
    // Git writes it with forward slashes on Windows too; the folder shows (and compares) as the system writes it.
    return r ? path.normalize(r) : null;
  })();
  roots.set(dir, { root, at: now });
  return root;
}

// File -> lines added and deleted (null for a binary file).
function numstat(out) {
  const m = new Map();
  for (const line of lines(out)) {
    const a = line.indexOf('\t'), b = a < 0 ? -1 : line.indexOf('\t', a + 1);
    if (b < 0) continue;
    m.set(line.slice(b + 1), { add: count(line.slice(0, a)), del: count(line.slice(a + 1, b)) });
  }
  return m;
}

// A new file's lines: null unless it's a regular file under 1 MB.
async function newLines(abs) {
  try {
    const st = await fsp.lstat(abs);
    if (!st.isFile() || st.size >= 1 << 20) return null;
    const data = await fsp.readFile(abs);
    let n = 0;
    for (let i = data.indexOf(10); i !== -1; i = data.indexOf(10, i + 1)) n++;
    return n + (data.length && data[data.length - 1] !== 10 ? 1 : 0);
  } catch {
    return null;
  }
}

async function state(root, members, editorsOf) {
  const [status, head, track, workOut, indexOut] = await Promise.all([
    read(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
    read(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    read(root, ['rev-list', '--left-right', '--count', 'HEAD...@{u}']),
    read(root, ['diff', '--numstat']),
    read(root, ['diff', '--cached', '--numstat']),
  ]);
  if (status == null) return null;
  const branch = head == null ? null : head.trim();
  const counts = (track || '').split(/\s+/).filter((s) => /^\d+$/.test(s)).map(Number);
  const work = numstat(workOut), index = numstat(indexOut);
  const files = [];
  const entries = status.split('\0');
  for (let i = 0; i < entries.length; ) {
    const e = entries[i++];
    if (e.length < 4) continue;
    const x = e[0], y = e[1], file = e.slice(3);
    // The old name follows a rename or a copy: in the index, or in the working tree (a new file added with
    // `git add -N` that git takes for a renamed one, which Git.swift reads as a file of its own).
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') i++;
    const abs = `${root}/${file}`;
    const editors = (editorsOf.size && editorsOf.get(fileKey(abs))) || [];
    if (x === '?') {
      // A new file: all its lines are added.
      files.push({ path: file, status: 'U', staged: false, add: await newLines(abs), del: 0, editors });
      continue;
    }
    for (const [code, staged, n] of [[x, true, index.get(file)], [y, false, work.get(file)]]) {
      if (code === ' ') continue;
      files.push({ path: file, status: code, staged, add: n ? n.add : null, del: n ? n.del : null, editors });
    }
  }
  return {
    root, name: baseName(root), path: tildify(root), branch: branch ?? '?',
    ahead: counts.length === 2 ? counts[0] : null, behind: counts.length === 2 ? counts[1] : null, files,
    sessions: members.map((S) => ({ id: S.id, name: S.name, title: S.title, status: S.status, live: S.live })),
  };
}

async function findRepos(src) {
  // A repo is in when a session today works in it (its folder) or wrote a file in it (Claude often works in a parent
  // folder and edits the repos under it), or when a terminal is in it.
  const dirs = [...new Set([...src.sessions.map((S) => S.cwd), ...src.written.map(([file]) => path.dirname(file)), ...src.dirs])];
  const rootOf = new Map((await mapLimit(dirs, PARALLEL, async (d) => [d, await repoRoot(d)])));
  const order = [];
  const members = new Map();
  const join = (root, S) => {
    if (!members.has(root)) {
      order.push(root);
      members.set(root, []);
    }
    if (S && !members.get(root).some((x) => x.id === S.id)) members.get(root).push(S);
  };
  for (const S of src.sessions) {
    const root = rootOf.get(S.cwd);
    if (root) join(root, S);
  }
  const byId = new Map();
  for (const S of src.sessions) if (!byId.has(S.id)) byId.set(S.id, S);
  for (const [file, editors] of src.written) {
    const root = rootOf.get(path.dirname(file));
    if (!root) continue;
    for (const id of editors) if (byId.has(id)) join(root, byId.get(id));
  }
  for (const dir of src.dirs) {
    const root = rootOf.get(dir);
    if (root) join(root, null);
  }
  const states = await mapLimit(order, PARALLEL, (root) => state(root, members.get(root), src.editorsOf));
  // Repos with sessions working in them first, then by how much changed.
  const live = (r) => r.sessions.filter((s) => s.live === true).length;
  return states.filter(Boolean).sort((a, b) => live(b) - live(a) || b.files.length - a.files.length);
}

// MARK: diffs and history

const isHash = (s) => /^[0-9a-f]{7,40}$/.test(s);

// The path of `file` in `root`, when it's inside it (worked out from the names alone, as git takes them): the root as
// git writes it, a slash and the file's path in the repo. On Windows git also takes "\" between names, and a name can't
// hold ":" (a drive, or a file's stream) or end in a dot or a space (Windows drops those, so "... " could become "..");
// and resolved as the system will, the path must still be under the root, whatever its case.
function inside(root, file) {
  if (typeof file !== 'string' || file.includes('\0') || file.startsWith('/')) return null;
  if (WIN && (file.startsWith('\\') || file.includes(':'))) return null;
  const parts = [];
  for (const part of file.split(WIN ? /[\\/]/ : '/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (parts.pop() === undefined) return null;
    } else if (WIN && /[. ]$/.test(part)) {
      return null;
    } else {
      parts.push(part);
    }
  }
  if (!parts.length) return null;
  const rel = parts.join('/');
  const base = path.resolve(root), full = path.resolve(base, rel);
  const fold = (s) => (WIN ? s.toLowerCase() : s);
  if (!fold(full).startsWith(fold(base.endsWith(path.sep) ? base : base + path.sep))) return null;
  return root.endsWith('/') ? root + rel : `${root}/${rel}`;
}

async function diff(root, file, staged, commit) {
  const abs = inside(root, file);
  if (!abs) return { error: 'outside the repo' };
  if (commit) {
    if (!isHash(commit)) return { error: 'bad commit' };
    const shown = await read(root, ['show', '--first-parent', '-m', '--no-color', '--no-ext-diff', '-U1000000', '--pretty=format:', commit, '--', file], 32 << 20);
    return shown ? { diff: shown, abs } : { abs, note: 'no differences' };
  }
  const out = await read(root, ['diff', ...(staged ? ['--cached'] : []), '--no-color', '--no-ext-diff', '-U1000000', '--', file], 32 << 20);
  if (out) return { diff: out, abs };
  // Untracked: the whole file is new.
  const st = await fsp.lstat(abs).catch(() => null);
  if (!st) return { abs, note: out == null ? 'no diff' : 'deleted' };
  // A link is shown as what it points to, so that's what has to be small enough.
  const target = st.isSymbolicLink() ? await fsp.stat(abs).catch(() => null) : st;
  if (!target) return { abs, note: 'no diff' };
  if (target.size > 2 << 20) return { abs, note: 'file too large to show' };
  const data = await fsp.readFile(abs).catch(() => null);
  if (!data) return { abs, note: 'no diff' };
  if (data.includes(0)) return { abs, note: 'binary file' };
  const all = data.toString('utf8').split('\n');
  if (all[all.length - 1] === '') all.pop();
  return { abs, diff: `@@ -0,0 +1,${all.length} @@\n${all.map((l) => `+${l}`).join('\n')}\n`, untracked: true };
}

// The history VS Code's graph shows (its "Auto"): the current branch and its upstream, newest first, each commit with
// its parents and its refs (full names); with the branch, the upstream and where they meet, for the graph's colours and
// its incoming and outgoing changes.
async function log(root, n, all) {
  const line = async (args) => {
    const out = await read(root, args);
    return out == null ? null : out.trim();
  };
  // What doesn't depend on another answer is asked at once (each git started costs more on Windows).
  const [head, branch, originHead] = await Promise.all([
    line(['rev-parse', 'HEAD']),
    line(['symbolic-ref', '-q', 'HEAD']),
    line(['symbolic-ref', '-q', 'refs/remotes/origin/HEAD']),
  ]);
  // The branch's base, as the git extension finds it: the one VS Code noted when the branch was made, else the remote's
  // default branch.
  const short = branch == null ? null : branch.replaceAll('refs/heads/', '');
  const [upstream, noted] = await Promise.all([
    branch == null ? null : line(['rev-parse', '--symbolic-full-name', '@{u}']),
    short == null ? null : line(['config', '--get', `branch.${short}.vscode-merge-base`]),
  ]);
  const [upstreamRev, notedRef] = await Promise.all([
    upstream == null ? null : line(['rev-parse', upstream]),
    noted == null ? null : line(['rev-parse', '--symbolic-full-name', noted]),
  ]);
  let base = notedRef ?? originHead;
  if (base === branch || base === upstream) base = null;
  const [mergeBase, baseRev] = await Promise.all([
    upstreamRev == null ? null : line(['merge-base', 'HEAD', upstreamRev]),
    base == null ? null : line(['rev-parse', base]),
  ]);
  // "Auto": the branch, its upstream and its base; else every branch.
  const refs = all ? ['--all'] : ['HEAD', ...[upstream, baseRev == null ? null : base].filter((r) => r != null)];
  const out = head == null ? '' : ((await read(root, ['log', '--topo-order', `-n${n}`, '--decorate=full', '--date=iso-strict',
    '--pretty=format:%H%x1f%P%x1f%an%x1f%ae%x1f%ad%x1f%s%x1f%D', ...refs])) ?? '');
  const commits = [];
  for (const l of lines(out)) {
    const f = l.split('\x1f');
    if (f.length < 7) continue;
    commits.push({ hash: f[0], parents: f[1].split(' ').filter(Boolean), author: f[2], email: f[3], date: f[4],
      subject: f[5], refs: f[6] ? f[6].split(', ') : [] });
  }
  return { commits, head, branch, upstream, upstreamRev, mergeBase, base: baseRev == null ? null : base, baseRev };
}

// Who last changed a line, and when and why (GitLens's line blame): in the working tree, or as of a commit.
async function blame(root, file, line, commit) {
  if (!inside(root, file) || !(line > 0)) return { error: 'bad line' };
  const out = (await read(root, ['blame', '--porcelain', '-L', `${line},${line}`, ...(commit ? [commit] : []), '--', file])) ?? '';
  const info = {};
  out.split('\n').forEach((raw, i) => {
    const l = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (i === 0) info.hash = l.split(' ').filter(Boolean)[0] ?? '';
    else if (l.startsWith('author ')) info.author = l.slice(7);
    else if (l.startsWith('author-mail ')) info.mail = l.slice(12);
    else if (l.startsWith('author-time ')) info.time = Number(l.slice(12)) || 0;
    else if (l.startsWith('summary ')) info.summary = l.slice(8);
  });
  if (info.hash == null || info.author == null) return { error: 'no blame' };
  const me = await read(root, ['config', 'user.name']);
  info.me = me == null ? '' : me.trim();
  return info;
}

// One commit: its message, author and the files it changed, with their counts.
async function show(root, hash) {
  const head = await read(root, ['show', '-s', '--date=iso-strict', '--pretty=format:%H%x1f%P%x1f%an%x1f%ae%x1f%ad%x1f%B', hash]);
  if (head == null) return { error: 'no such commit' };
  const f = head.split('\x1f');
  if (f.length < 6) return { error: 'no such commit' };
  const [names, counts] = await Promise.all([
    read(root, ['show', '--first-parent', '-m', '--name-status', '--pretty=format:', hash]),
    read(root, ['show', '--first-parent', '-m', '--numstat', '--pretty=format:', hash]),
  ]);
  const changed = numstat(counts);
  const files = [];
  for (const l of lines(names)) {
    const cols = l.split('\t');
    if (cols.length < 2 || !cols[0]) continue;
    const file = cols[cols.length - 1], n = changed.get(file);
    files.push({ status: cols[0][0], path: file, add: n ? n.add : null, del: n ? n.del : null });
  }
  return { hash: f[0], parents: f[1].split(' ').filter(Boolean), author: f[2], email: f[3], date: f[4],
    message: f.slice(5).join('\x1f').trim(), files };
}

// MARK: the bridge

function createGit({ folders = () => [], written = null, confirm = async () => -1, menu = async () => null, trash = async () => {
  throw new Error('no trash');
} } = {}) {
  // The page asks every few seconds; the repos are looked at again after two. Requests that come while they're being
  // looked at wait for that look, and a change to a repo makes it (and the one being taken) out of date.
  let cache = { at: 0, repos: [] };
  let pending = null;
  let generation = 0;

  function repos(src) {
    if (Date.now() - cache.at < 2000) return Promise.resolve(cache.repos);
    if (!pending) {
      const gen = generation;
      const look = findRepos(src).then((list) => {
        if (gen === generation) cache = { at: Date.now(), repos: list };
        return list;
      });
      pending = look;
      const done = () => {
        if (pending === look) pending = null;
      };
      look.then(done, done);
    }
    return pending;
  }

  function changed() {
    cache = { at: 0, repos: cache.repos };
    generation++;
    pending = null;
  }

  // Where the repos are, from main.js: sessions (with their folder), files they wrote, and plain folders.
  async function sources() {
    const sessions = [], dirs = [], list = [];
    let given = [];
    try {
      given = (await folders()) || [];
    } catch {}
    for (const f of Array.isArray(given) ? given : []) {
      if (typeof f === 'string') {
        if (f) dirs.push(f);
      } else if (f && typeof f === 'object' && typeof f.cwd === 'string' && f.cwd) {
        if (typeof f.id === 'string' && f.id) {
          sessions.push({ id: f.id, name: str(f.name), title: str(f.title), status: str(f.status), live: f.live === true, cwd: f.cwd });
        } else {
          dirs.push(f.cwd);
        }
      }
    }
    let files = {};
    try {
      files = (typeof written === 'function' && (await written())) || {};
    } catch {}
    for (const [file, ids] of files instanceof Map ? files : Object.entries(files)) {
      if (typeof file === 'string' && file && Array.isArray(ids)) list.push([file, ids.filter((id) => typeof id === 'string')]);
    }
    return { sessions, dirs, written: list, editorsOf: new Map(list.map(([file, ids]) => [fileKey(file), ids])) };
  }

  // The page's questions and menus, native as VS Code's are: a warning dialog over the dashboard ("confirm": message,
  // detail, buttons; Cancel is added) or a menu at the pointer ("menu": items, "" for a line, x and y in the page).
  // Answers the index of the button or item picked, -1 for none.
  async function native(body) {
    if (body.type === 'confirm') {
      const buttons = strings(body.buttons);
      let i;
      try {
        i = await confirm({
          type: 'warning', message: str(body.message), detail: str(body.detail), buttons: [...buttons, 'Cancel'],
          defaultId: 0, cancelId: buttons.length, noLink: true, destructive: body.destructive !== false,
        });
      } catch {
        i = -1;
      }
      if (i && typeof i === 'object') i = i.response;
      return Number.isInteger(i) && i >= 0 && i < buttons.length ? i : -1;
    }
    const items = strings(body.items);
    let picked;
    try {
      const entries = items.map((title, id) => (title === '' ? { type: 'separator' } : { id, title }));
      picked = await menu(entries, { x: Math.round(number(body.x)), y: Math.round(number(body.y)) });
    } catch {
      picked = null;
    }
    if (typeof picked === 'string' && /^\d+$/.test(picked)) picked = Number(picked);
    return Number.isInteger(picked) && picked >= 0 && picked < items.length && items[picked] !== '' ? picked : -1;
  }

  // MARK: the page's requests

  async function answer(body, src) {
    const type = str(body.type);
    const known = await repos(src);
    if (type === 'repos') return gitFound() ? { repos: known } : { repos: known, noGit: true };
    // Only today's repos: the page can't point git anywhere else.
    const root = typeof body.root === 'string' ? body.root : null;
    if (root == null || !known.some((r) => r.root === root)) return { error: 'unknown repo' };
    switch (type) {
      case 'diff':
        return diff(root, str(body.path), body.staged === true, str(body.commit));
      case 'log':
        return log(root, Math.max(1, Math.min(1000, Number.isInteger(body.n) ? body.n : 50)), body.all === true);
      case 'show': {
        const hash = str(body.hash);
        return isHash(hash) ? show(root, hash) : { error: 'unknown commit' };
      }
      case 'blame': {
        const commit = str(body.commit);
        if (commit && !isHash(commit)) return { error: 'bad commit' };
        return blame(root, str(body.path), Math.trunc(number(body.line)), commit);
      }
      default:
        break;
    }
    const paths = strings(body.paths).filter((p) => inside(root, p) != null);
    let r;
    switch (type) {
      case 'stage':
        r = paths.length ? await changeEach(root, ['add', '-A'], paths) : { error: 'nothing to stage' };
        break;
      case 'unstage':
        r = paths.length ? await changeEach(root, ['restore', '--staged'], paths) : { error: 'nothing to unstage' };
        break;
      case 'discard': {
        if (!paths.length) return { error: 'nothing to discard' };
        // Tracked files go back to their last commit; new (untracked) ones are thrown away.
        const untracked = new Set();
        for (const part of batches(root, paths)) {
          const status = (await read(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...part])) ?? '';
          for (const e of status.split('\0')) if (e.startsWith('?? ')) untracked.add(e.slice(3));
        }
        const tracked = paths.filter((p) => !untracked.has(p));
        r = tracked.length ? await changeEach(root, ['restore'], tracked) : { ok: true };
        // New files go to the Recycle Bin, as VS Code does (they can be put back from there).
        if (r.ok) {
          for (const p of paths) {
            if (!untracked.has(p)) continue;
            const abs = inside(root, p);
            if (!abs) continue;
            try {
              await trash(path.resolve(abs));
            } catch {}
          }
        }
        break;
      }
      case 'commit': {
        const message = str(body.message).trim();
        if (!message) return { error: 'write a commit message' };
        if (body.all === true) {
          const added = await change(root, ['add', '-A']);
          if (added.error) return added;
        }
        r = await change(root, ['commit', '-m', message]);
        if (r.ok && body.push === true) r = await change(root, ['push']);
        break;
      }
      case 'push':
        r = await change(root, ['push']);
        break;
      case 'pull':
        r = await change(root, ['pull', '--ff-only']);
        break;
      case 'fetch':
        r = await change(root, ['fetch']);
        break;
      case 'publish':
        r = await change(root, ['push', '-u', 'origin', 'HEAD']);
        break;
      default:
        return { error: 'unknown request' };
    }
    changed();
    return r;
  }

  // A request from the page: its answer, as Git.swift replies (or { error }).
  async function handle(body) {
    const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    try {
      if (b.type === 'confirm' || b.type === 'menu') return await native(b);
      return await answer(b, await sources());
    } catch (e) {
      return { error: String((e && e.message) || e) };
    }
  }

  return { handle, worktree };
}

module.exports = { createGit };
