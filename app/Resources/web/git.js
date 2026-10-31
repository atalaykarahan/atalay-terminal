'use strict';

// Source Control, as it looks in the user's VS Code: 1.144's modern look (its floating cards, 28 px view headers, rows
// rounded and set in 4 px), the GitHub Dark Default theme and the Material Icon Theme. The activity bar opens it (⌃⇧G).
// Changes lists every repo today's sessions and the app's terminals work in: its message box, its Commit button, its
// staged changes and its changes. Graph below is VS Code's history graph (its lanes, colours and badges, the branch's
// base included) of the repo last used; a commit opens to the files it changed. A file opens in the editor
// (git-editor.js), with the status bar under it. Swift runs git (Git.swift) and asks the questions and shows the menus
// natively, as VS Code does on a Mac. Files a Claude session edited carry a ✦.
window.GitView = (() => {
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const say = (msg) => (typeof window.toast === 'function' ? window.toast(msg) : console.warn(msg));
  const git = (type, q = {}) =>
    window.webkit.messageHandlers.git.postMessage({ type, ...q }).catch((e) => ({ error: String((e && e.message) || e) }));
  // A native question (VS Code's modal warning): the index of the button picked, -1 for Cancel.
  async function confirm(text, detail, buttons) {
    const [message, ...rest] = text.split('\n\n');
    const r = await git('confirm', { message, detail: [rest.join('\n\n'), detail].filter(Boolean).join('\n\n'), buttons });
    return typeof r === 'number' ? r : -1;
  }
  // A native menu under an element ("" is a line): the index of the item picked, -1 for none.
  async function menu(anchor, items) {
    const b = anchor.getBoundingClientRect();
    const r = await git('menu', { items, x: b.left, y: b.bottom });
    return typeof r === 'number' ? r : -1;
  }

  // VS Code's icons: its codicon font (codicon.ttf), by code point.
  const CP = {
    'chevron-down': 0xeab4, 'chevron-right': 0xeab6, repo: 0xea62, 'repo-selected': 0xec69, 'git-branch': 0xec6f,
    check: 0xeab2, refresh: 0xeb37, ellipsis: 0xea7c, add: 0xea60, remove: 0xeb3b, discard: 0xeae2, 'go-to-file': 0xea94,
    cloud: 0xebaa, 'cloud-upload': 0xeac3, sync: 0xea77, 'arrow-up': 0xeaa1, 'arrow-down': 0xea9a, close: 0xea76,
    tag: 0xea66, 'source-control': 0xea68, files: 0xeaf0, 'git-fetch': 0xecb2, 'collapse-all': 0xeac5, target: 0xebf8,
    bell: 0xeaa2, error: 0xea87, warning: 0xea6c, 'repo-pull': 0xeb40, 'repo-push': 0xeb41, 'git-commit': 0xeafc,
    whitespace: 0xeb7d, map: 0xec05, remote: 0xeb3a, 'split-horizontal': 0xeb56, 'diff-single': 0xec22,
  };
  const ch = (n) => String.fromCodePoint(CP[n]);
  const ci = (n, cls = '') => `<i class="vs-ci${cls ? ` ${cls}` : ''}">${ch(n)}</i>`;

  // File icons from the Material Icon Theme (git-icons.js), matched as VS Code does: the file's name, then its longest
  // extension. Each icon is a CSS rule, added the first time it's used.
  const iconSheet = document.head.appendChild(document.createElement('style')).sheet;
  const iconsDone = new Set();
  function fileIcon(path) {
    const G = window.GitIcons;
    const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
    let icon = G.names[name];
    const parts = name.split('.');
    for (let i = 1; !icon && i < parts.length; i++) icon = G.ext[parts.slice(i).join('.')];
    if (!icon || !G.svg[icon]) icon = 'file';
    if (!iconsDone.has(icon)) {
      iconsDone.add(icon);
      iconSheet.insertRule(`#git .vs-fi.mi-${CSS.escape(icon)} { background-image: url("data:image/svg+xml,${encodeURIComponent(G.svg[icon])}"); }`, iconSheet.cssRules.length);
    }
    return `<span class="vs-fi mi-${esc(icon)}"></span>`;
  }

  // The decorations' colours (an editor tab's name and letter): the theme's (GitHub Dark Default) where it sets them,
  // the git extension's otherwise. Source Control's own rows show the letters uncoloured, as VS Code does.
  const LETTER = {
    index: { M: '#e2c08d', T: '#e2c08d', A: '#3fb950', D: '#c74e39', R: '#73c991', C: '#73c991' },
    work: { M: '#d29922', T: '#d29922', A: '#3fb950', U: '#3fb950', D: '#f85149', R: '#73c991' },
  };
  const STATUS = {
    index: { M: 'Index Modified', T: 'Index Type Changed', A: 'Index Added', D: 'Index Deleted', R: 'Index Renamed', C: 'Index Copied' },
    work: { M: 'Modified', T: 'Type Changed', A: 'Intent to Add', U: 'Untracked', D: 'Deleted', R: 'Intent to Rename' },
  };
  const sideOf = (f) => (f.staged ? 'index' : 'work');
  // VS Code's order ("path"): folder by folder, a folder's own files before its subfolders, names compared as people read
  // them (numbers by value, case ignored).
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  function comparePaths(a, b) {
    const x = a.split('/'), y = b.split('/');
    for (let i = 0; ; i++) {
      const lastX = i === x.length - 1, lastY = i === y.length - 1;
      if (lastX && lastY) return collator.compare(x[i], y[i]) || (x[i] < y[i] ? -1 : x[i] > y[i] ? 1 : 0);
      if (lastX) return -1;
      if (lastY) return 1;
      const c = collator.compare(x[i], y[i]);
      if (c) return c;
    }
  }
  const basename = (p) => p.slice(p.lastIndexOf('/') + 1);
  const dirname = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');

  // ---------- the frame: activity bar, side bar (CHANGES and GRAPH), editor ----------
  const bar = document.createElement('nav');
  bar.id = 'activity';
  bar.innerHTML =
    `<a class="vs-ab on" data-view="dash" title="Dashboard">${ci('files')}</a>` +
    `<a class="vs-ab" data-view="git" title="Source Control (⌃⇧G)">${ci('source-control')}<b class="vs-badge" hidden></b></a>`;
  app.appendChild(bar);
  const view = document.createElement('section');
  view.id = 'git';
  view.innerHTML =
    '<div class="vs-body">' +
    '<div class="vs-card vs-left">' +
    `<nav class="vs-act"><a class="vs-ab" data-view="dash" title="Dashboard">${ci('files')}</a>` +
    `<a class="vs-ab on" data-view="git" title="Source Control (⌃⇧G)">${ci('source-control')}<b class="vs-badge" hidden></b></a></nav>` +
    '<aside class="vs-sb">' +
    `<div class="vs-title"><h2>Source Control</h2><div class="vs-tact"><a class="vs-al" data-act="views-menu" title="Views and More Actions...">${ci('ellipsis')}</a></div></div>` +
    `<div class="vs-pane changes"><div class="vs-ph" data-pane="changes">${ci('chevron-down', 'vs-pt')}<h3>Changes</h3><div class="vs-pa">` +
    `<a class="vs-al" data-act="commit-focused" title="Commit">${ci('check')}</a>` +
    `<a class="vs-al" data-act="refresh-all" title="Refresh">${ci('refresh')}</a>` +
    `<a class="vs-al" data-act="changes-menu" title="More Actions...">${ci('ellipsis')}</a></div></div>` +
    '<div class="vs-pb" tabindex="0"></div></div>' +
    `<div class="vs-pane graph"><div class="vs-sash-h"></div><div class="vs-ph" data-pane="graph">${ci('chevron-down', 'vs-pt')}<h3>Graph</h3><div class="vs-pa">` +
    `<a class="vs-al vs-picker repo" data-act="graph-repo" title="Repository">${ci('repo')}<span></span></a>` +
    `<a class="vs-al vs-picker" data-act="graph-refs" title="History Item Reference">${ci('git-branch')}<span>Auto</span></a>` +
    `<a class="vs-al" data-opt data-act="graph-current" title="Go to Current History Item">${ci('target')}</a>` +
    `<a class="vs-al" data-opt data-act="graph-fetch" title="Fetch">${ci('git-fetch')}</a>` +
    `<a class="vs-al" data-opt data-act="graph-pull" title="Pull">${ci('repo-pull')}</a>` +
    `<a class="vs-al" data-opt data-act="graph-push" title="Push">${ci('repo-push')}</a>` +
    `<a class="vs-al" data-act="graph-refresh" title="Refresh">${ci('refresh')}</a>` +
    `<a class="vs-al" data-act="graph-menu" title="More Actions...">${ci('ellipsis')}</a></div></div>` +
    '<div class="vs-pb" tabindex="0"></div></div>' +
    '</aside></div>' +
    '<div class="vs-sash-v"></div>' +
    '<div class="vs-card vs-edcard"><main class="vs-ed"></main></div>' +
    '</div>' +
    '<footer class="vs-status"><div class="vs-sl"></div><div class="vs-sr"></div></footer>';
  app.appendChild(view);
  const changesPane = view.querySelector('.vs-pane.changes'), graphPane = view.querySelector('.vs-pane.graph');
  const changesEl = changesPane.querySelector('.vs-pb'), graphEl = graphPane.querySelector('.vs-pb');
  const edEl = view.querySelector('.vs-ed'), statusEl = view.querySelector('.vs-status');

  let repos = [];
  let open = false;
  let sel = null; // the selected row: r:<root>, g:<root>|index, f:<root>|<path>|<0|1>, c:<hash>, h:<hash>|<path>
  let editor = null; // { kind: 'change', root, path, staged, status } | { kind: 'commit', root, hash, parent, path, status }
  let graphRoot = null; // the repo the graph shows: the one last used in CHANGES (VS Code's "Auto")
  let graph = { root: null, rows: [], n: 50, more: false, sig: '', at: 0 };
  let graphAll = false; // the graph's refs: VS Code's "Auto" (the branch, its upstream and base), or every branch
  const opened = new Map(); // commit -> its files (or null while they load), for commits opened in the graph
  const shut = new Set(); // collapsed: r:<root>, g:<root>|index|work
  const drafts = new Map(); // repo -> the commit message being written
  const stored = (k, d) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  };
  const store = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };
  view.style.setProperty('--sw', `${Number(stored('git.sideWidth', 300)) || 300}px`);
  if (Number(stored('git.graphHeight', 0)) > 0) graphPane.style.setProperty('--gh', `${Number(stored('git.graphHeight', 0))}px`);
  for (const p of ['changes', 'graph']) if (stored(`git.shut.${p}`, '0') === '1') view.querySelector(`.vs-pane.${p}`).classList.add('shut');

  // ---------- data ----------
  let loading = null;
  function load() {
    if (loading) return loading;
    loading = git('repos')
      .then((r) => (repos = r.repos || []))
      .catch(() => (repos = []))
      .then(() => {
        loading = null;
        badge();
        cardChips();
        if (!open) return;
        if (!graphRoot || !repos.some((r) => r.root === graphRoot)) graphRoot = repos[0]?.root || null;
        renderChanges();
        renderStatus();
        const r = repos.find((x) => x.root === graphRoot);
        const sig = r ? `${r.root}|${r.branch}|${r.ahead}|${r.behind}` : '';
        if (sig !== graph.sig || Date.now() - graph.at > 30_000) loadGraph();
        refreshEditor();
      });
    return loading;
  }

  const unique = (files) => new Set(files.map((f) => f.path)).size;
  function badge() {
    const n = repos.reduce((a, r) => a + unique(r.files), 0);
    for (const b of document.querySelectorAll('#activity .vs-badge, #git .vs-act .vs-badge')) {
      b.hidden = !n;
      b.textContent = n > 99 ? '99+' : n;
    }
  }

  // ---------- CHANGES: VS Code's tree ----------
  // A row's twistie: VS Code pads it by 8 px a level (from 8) and makes it 16 + 6 px wide; a leaf's takes no width.
  const pad = (depth) => 8 + (depth - 1) * 8;
  const twistie = (depth, key) =>
    key == null
      ? `<span class="vs-tw leaf" style="padding-left:${pad(depth)}px"></span>`
      : `<span class="vs-tw${shut.has(key) ? ' shut' : ''}" style="padding-left:${pad(depth)}px"><i>${ch('chevron-down')}</i></span>`;
  const row = (cls, key, depth, twKey, body, attrs = '') =>
    `<div class="vs-r ${cls}${key && key === sel ? ' sel' : ''}"${key ? ` data-key="${esc(key)}"` : ''}${attrs}>${twistie(depth, twKey)}<div class="vs-ct">${body}</div></div>`;

  function repoRow(r) {
    const key = `r:${r.root}`;
    const dirty = r.files.length ? '*' : '';
    // The git extension's status bar items: the branch, then sync (behind↓ ahead↑) or publish.
    const sync =
      r.ahead === null
        ? `<a class="vs-al" data-act="publish" title="Publish Branch">${ci('cloud-upload')}</a>`
        : `<a class="vs-al" data-act="sync" title="Synchronize Changes">${ci('sync')}${r.ahead || r.behind ? `<span>${r.behind}↓ ${r.ahead}↑</span>` : ''}</a>`;
    const body =
      `<div class="vs-prov">${ci('repo-selected')}<span class="vs-pn">${esc(r.name)}</span><div class="vs-pact">` +
      `<a class="vs-al vs-st" title="${esc(r.branch)}${dirty ? ' (Working Tree changes)' : ''}">${ci('git-branch')}<span>${esc(r.branch)}${dirty}</span></a>${sync}` +
      `<a class="vs-al" data-act="repo-menu" title="More Actions...">${ci('ellipsis')}</a></div></div>`;
    return row('vs-repo', key, 1, key, body, ` data-root="${esc(r.root)}" title="${esc(r.path)}"`);
  }

  function inputRow(r, depth) {
    const body =
      `<div class="vs-input"><div class="vs-editor"><textarea class="vs-msg" rows="1" data-root="${esc(r.root)}" spellcheck="false" ` +
      `placeholder="Message (⌘Enter to commit on &quot;${esc(r.branch)}&quot;)">${esc(drafts.get(r.root) || '')}</textarea></div></div>`;
    return row('vs-nh vs-inp', null, depth, null, body, ` data-root="${esc(r.root)}"`);
  }

  // The git extension's action button: Commit while there are changes, else Sync Changes or Publish Branch.
  function buttonRow(r, depth) {
    let label, act, more = true, off = false;
    if (r.files.length) (label = `${ci('check')}<span>Commit</span>`), (act = 'commit');
    else if (r.ahead === null) (label = `${ci('cloud-upload')}<span>Publish Branch</span>`), (act = 'publish'), (more = false);
    else if (r.ahead || r.behind)
      (label = `${ci('sync')}<span>Sync Changes${r.behind ? `&nbsp;${r.behind}` : ''}</span>${r.behind ? ci('arrow-down', 'vs-sm') : ''}${r.ahead ? `<span>${r.behind ? '' : '&nbsp;'}${r.ahead}</span>${ci('arrow-up', 'vs-sm')}` : ''}`),
        (act = 'sync'),
        (more = false);
    else (label = `${ci('check')}<span>Commit</span>`), (act = 'commit'), (off = true);
    const body =
      `<div class="vs-bc"><div class="vs-bd${off ? ' off' : ''}"><a class="vs-tb" data-act="${act}">${label}</a>` +
      (more ? `<div class="vs-bsep"><div></div></div><a class="vs-db" data-act="commit-menu" title="More Actions...">${ci('chevron-down')}</a>` : '') +
      '</div></div>';
    return row('vs-nh vs-btn', null, depth, null, body, ` data-root="${esc(r.root)}"`);
  }

  function groupRow(r, group, label, list, depth) {
    const key = `g:${r.root}|${group}`;
    const acts =
      group === 'index'
        ? `<a class="vs-al" data-act="unstage-all" title="Unstage All Changes">${ci('remove')}</a>`
        : `<a class="vs-al" data-act="discard-all" title="Discard All Changes">${ci('discard')}</a><a class="vs-al" data-act="stage-all" title="Stage All Changes">${ci('add')}</a>`;
    const body = `<div class="vs-rg"><span class="vs-gn">${label}</span><div class="vs-acts">${acts}</div><div class="vs-count"><span class="vs-cb">${list.length}</span></div></div>`;
    return row('vs-grp', key, depth, key, body, ` data-root="${esc(r.root)}" data-group="${group}"`);
  }

  function fileRow(r, f, depth) {
    const key = `f:${r.root}|${f.path}|${f.staged ? 1 : 0}`;
    const side = sideOf(f);
    const acts = f.staged
      ? `<a class="vs-al" data-act="open" title="Open File">${ci('go-to-file')}</a><a class="vs-al" data-act="unstage" title="Unstage Changes">${ci('remove')}</a>`
      : `<a class="vs-al" data-act="open" title="Open File">${ci('go-to-file')}</a><a class="vs-al" data-act="discard" title="Discard Changes">${ci('discard')}</a><a class="vs-al" data-act="stage" title="Stage Changes">${ci('add')}</a>`;
    const claude = f.editors && f.editors.length ? '<div class="vs-deco" title="Edited by a Claude session">✦</div>' : '';
    const body =
      `<div class="vs-res${f.status === 'D' ? ' strike' : ''}"><div class="vs-name"><div class="vs-il" data-l="${esc(f.status)}">` +
      `${fileIcon(f.path)}<span class="vs-lc"><span class="vs-ln">${esc(basename(f.path))}</span><span class="vs-ld">${esc(dirname(f.path))}</span></span>` +
      `<div class="vs-acts">${acts}</div></div></div>${claude}</div>`;
    return row('vs-file', key, depth, null, body, ` data-root="${esc(r.root)}" data-path="${esc(f.path)}" data-staged="${f.staged ? 1 : 0}" title="${esc(`${r.path}/${f.path}`)} • ${STATUS[side][f.status] || f.status}"`);
  }

  function renderChanges() {
    if (!repos.length) {
      changesEl.innerHTML = '<div class="vs-welcome">The repositories your Claude sessions and terminals work in show here.</div>';
      return;
    }
    // A message box keeps its text, cursor and focus across a refresh.
    const focused = document.activeElement && document.activeElement.matches('.vs-msg') ? document.activeElement : null;
    const keep = focused && { root: focused.dataset.root, start: focused.selectionStart, end: focused.selectionEnd, top: focused.scrollTop };
    // One repo shows without its row, as in VS Code; several each under theirs.
    const multi = repos.length > 1;
    let html = '';
    for (const r of repos) {
      const depth = multi ? 2 : 1;
      if (multi) {
        html += repoRow(r);
        if (shut.has(`r:${r.root}`)) continue;
      }
      html += inputRow(r, depth) + buttonRow(r, depth);
      for (const [group, label, staged] of [['index', 'Staged Changes', true], ['work', 'Changes', false]]) {
        const list = r.files.filter((f) => f.staged === staged).sort((a, b) => comparePaths(a.path, b.path));
        if (!list.length) continue;
        html += groupRow(r, group, label, list, depth);
        if (!shut.has(`g:${r.root}|${group}`)) html += list.map((f) => fileRow(r, f, depth + 1)).join('');
      }
    }
    changesEl.innerHTML = html;
    changesEl.querySelectorAll('.vs-msg').forEach(grow);
    if (keep) {
      const ta = changesEl.querySelector(`.vs-msg[data-root="${CSS.escape(keep.root)}"]`);
      if (ta) {
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(keep.start, keep.end);
        ta.scrollTop = keep.top;
      }
    }
  }

  // The message box grows a line at a time (20 px) up to 10 lines, as VS Code's; its row grows with it.
  function grow(ta) {
    ta.style.height = '20px';
    const lines = ta.value ? Math.max(1, Math.min(10, Math.round((ta.scrollHeight - 4) / 20))) : 1;
    ta.style.height = `${lines * 20}px`;
    ta.closest('.vs-r').style.height = `${lines * 20 + 6}px`;
  }

  // ---------- GRAPH: VS Code's history graph ----------
  // Its swimlanes, as scmHistory.ts computes and draws them: 22 px rows, 11 px lanes, 5 px curves, 4 px nodes.
  const H = 22, W = 11, CURVE = 5, R = 4, STROKE = 2;
  const LANES = ['#ffb000', '#dc267f', '#994f00', '#40b0a6', '#b66dff'];
  const REF = '#59a4f9', REMOTE = '#b180d7', BASE = '#ea5c00';
  const INCOMING = 'scm-graph-incoming-changes', OUTGOING = 'scm-graph-outgoing-changes';

  // The refs git's full decorations name: branches, remote branches and tags (HEAD itself isn't one).
  function refsOf(c) {
    const out = [];
    for (let ref of c.refs) {
      if (ref.startsWith('HEAD -> ')) ref = ref.slice(8);
      if (ref === 'HEAD' || ref.endsWith('/HEAD')) continue;
      if (ref.startsWith('tag: ')) out.push({ id: ref.slice(5), name: ref.slice(5).replace(/^refs\/tags\//, ''), icon: 'tag' });
      else if (ref.startsWith('refs/heads/')) out.push({ id: ref, name: ref.slice(11), icon: 'git-branch' });
      else if (ref.startsWith('refs/remotes/')) out.push({ id: ref, name: ref.slice(13), icon: 'cloud' });
    }
    return out;
  }

  function refColor(item, colors) {
    if (item.id === INCOMING) return REMOTE;
    if (item.id === OUTGOING) return REF;
    for (const ref of item.references || []) {
      const c = colors.get(ref.id);
      if (c !== undefined) return c;
    }
    return undefined;
  }

  function graphRows(items, colors, current, remote, base, mergeBase) {
    let colorIndex = -1;
    const rows = [];
    for (const item of items) {
      const kind = item.id === current?.revision ? 'HEAD' : 'node';
      const input = (rows.at(-1)?.output ?? []).map((l) => ({ ...l }));
      const output = [];
      let first = false;
      if (item.parentIds.length > 0) {
        for (const lane of input) {
          if (lane.id === item.id) {
            if (!first) {
              output.push({ id: item.parentIds[0], color: refColor(item, colors) ?? lane.color });
              first = true;
            }
            continue;
          }
          output.push({ ...lane });
        }
      }
      for (let i = first ? 1 : 0; i < item.parentIds.length; i++) {
        let color;
        if (i === 0) color = refColor(item, colors);
        else {
          const parent = items.find((x) => x.id === item.parentIds[i]);
          color = parent ? refColor(parent, colors) : undefined;
        }
        if (!color) {
          colorIndex = (colorIndex + 1) % LANES.length;
          color = LANES[colorIndex];
        }
        output.push({ id: item.parentIds[i], color });
      }
      const references = (item.references || []).map((ref) => {
        let color = colors.get(ref.id);
        if (colors.has(ref.id) && color === undefined) {
          const at = input.findIndex((l) => l.id === item.id), k = at !== -1 ? at : input.length;
          color = k < output.length ? output[k].color : k < input.length ? input[k].color : REF;
        }
        return { ...ref, color };
      });
      const rank = (ref) => (ref.id === current?.id ? 1 : ref.id === remote?.id ? 2 : ref.id === base?.id ? 3 : ref.color !== undefined ? 4 : 99);
      references.sort((a, b) => rank(a) - rank(b));
      rows.push({ item: { ...item, references }, kind, input, output });
    }
    // Incoming changes (the upstream ahead of us) and outgoing ones (us ahead of it), as VS Code adds them.
    if (current?.revision !== remote?.revision && mergeBase) {
      if (remote && remote.revision !== mergeBase) {
        let r = -1;
        for (let k = rows.length - 1; k >= 0; k--) if (rows[k].output.some((l) => l.id === mergeBase)) (r = k), (k = -1);
        const a = rows.findIndex((x) => x.item.id === mergeBase);
        if (r !== -1 && a !== -1 && !(rows[r].item.parentIds.length === 2 && rows[r].item.parentIds.includes(mergeBase))) {
          const swap = (l) => (l.id === mergeBase && l.color === REMOTE ? { ...l, id: INCOMING } : l);
          rows[r] = { ...rows[r], input: rows[r].input.map(swap), output: rows[r].output.map(swap) };
          const item = { id: INCOMING, parentIds: [mergeBase], author: remote.name, subject: 'Incoming Changes', references: [] };
          rows.splice(a, 0, { item, kind: 'incoming-changes', input: rows[r].output.map((l) => ({ ...l })), output: rows[a].input.map((l) => ({ ...l })) });
        }
      }
      if (current?.revision && current.revision !== mergeBase) {
        const r = rows.findIndex((x) => x.kind === 'HEAD' && x.item.id === current.revision);
        if (r !== -1) {
          const item = { id: OUTGOING, parentIds: [current.revision], author: current.name, subject: 'Outgoing Changes', references: [] };
          const input = rows[r].input.slice(0);
          rows.splice(r, 0, { item, kind: 'outgoing-changes', input, output: input.slice(0).concat({ id: current.revision, color: REF }) });
          rows[r + 1].input.push({ id: current.revision, color: REF });
        }
      }
    }
    return rows;
  }

  const path = (d, color, width = 1) => `<path d="${d}" fill="none" stroke-width="${width}px" stroke-linecap="round" style="stroke:${color}"/>`;
  const circle = (lane, r, width, fill) => `<circle cx="${W * (lane + 1)}" cy="${W}" r="${r}" style="stroke-width:${width}px${fill ? `;fill:${fill}` : ''}"/>`;
  const laneOf = (row) => {
    const i = row.input.findIndex((l) => l.id === row.item.id);
    return i !== -1 ? i : row.input.length;
  };

  function rowSvg(row) {
    const { item, input, output } = row;
    const n = input.findIndex((l) => l.id === item.id), r = n !== -1 ? n : input.length;
    const color = r < output.length ? output[r].color : r < input.length ? input[r].color : REF;
    let svg = '', c = 0;
    for (let l = 0; l < input.length; l++) {
      const u = input[l].color;
      if (input[l].id === item.id) {
        if (l !== r) svg += path(`M ${W * (l + 1)} 0 A ${W} ${W} 0 0 1 ${W * l} ${W} H ${W * (r + 1)}`, u);
        else c++;
      } else if (c < output.length && input[l].id === output[c].id) {
        if (l === c) svg += path(`M ${W * (l + 1)} 0 V ${H}`, u);
        else svg += path(`M ${W * (l + 1)} 0 V 6 A ${CURVE} ${CURVE} 0 0 1 ${W * (l + 1) - CURVE} ${H / 2} H ${W * (c + 1) + CURVE} A ${CURVE} ${CURVE} 0 0 0 ${W * (c + 1)} ${H / 2 + CURVE} V ${H}`, u);
        c++;
      }
    }
    for (let l = 1; l < item.parentIds.length; l++) {
      let u = -1;
      for (let k = output.length - 1; k >= 0; k--) if (output[k].id === item.parentIds[l]) (u = k), (k = -1);
      if (u === -1) continue;
      svg += path(`M ${W * u} ${H / 2} A ${W} ${W} 0 0 1 ${W * (u + 1)} ${H} M ${W * u} ${H / 2} H ${W * (r + 1)} `, output[u].color);
    }
    if (n !== -1) svg += path(`M ${W * (r + 1)} 0 V ${H / 2}`, input[n].color);
    if (item.parentIds.length > 0) svg += path(`M ${W * (r + 1)} ${H / 2} V ${H}`, color);
    if (row.kind === 'HEAD') svg += circle(r, R + 3, STROKE, color) + circle(r, STROKE, R);
    else if (row.kind === 'incoming-changes' || row.kind === 'outgoing-changes')
      svg += circle(r, R + 3, STROKE, color) + circle(r, R + 1, STROKE + 1) + `<circle cx="${W * (r + 1)}" cy="${W}" r="${R + 1}" style="stroke:${color};stroke-width:${STROKE - 1}px;stroke-dasharray:4,2"/>`;
    else if (item.parentIds.length > 1) svg += circle(r, R + 2, STROKE, color) + circle(r, R - 1, STROKE, color);
    else svg += circle(r, R + 1, STROKE, color);
    const width = W * (Math.max(input.length, output.length, 1) + 1);
    return `<svg class="vs-graph-svg" width="${width}" height="${H}">${svg}</svg>`;
  }

  // Under an opened commit: its lanes go on, its own one thicker.
  function lanesSvg(lanes, own) {
    let svg = '';
    lanes.forEach((l, t) => (svg += path(`M ${W * (t + 1)} 0 V ${H}`, l.color, t === own ? 3 : 1)));
    return `<svg class="vs-graph-svg" width="${W * (lanes.length + 1)}" height="${H}">${svg}</svg>`;
  }

  // A commit's badges: the first coloured ref with its name, the others one per colour and icon (only coloured ones, as
  // VS Code's "filter").
  function badges(refs) {
    const badge = (list, named) =>
      `<div class="vs-label" style="background:${list[0].color}">${list.length > 1 ? `<div class="vs-lc-n">${list.length}</div>` : ''}` +
      `${ci(list[0].icon, list[0].icon === 'git-branch' ? 'vs-br' : '')}${named ? `<div class="vs-lc-d">${esc(list[0].name)}</div>` : ''}</div>`;
    const rest = refs.slice();
    let html = '';
    if (rest.length && rest[0].color) html += badge([rest.shift()], true);
    const byColor = new Map();
    for (const ref of rest) {
      if (!ref.color) continue;
      if (!byColor.has(ref.color)) byColor.set(ref.color, new Map());
      const byIcon = byColor.get(ref.color);
      if (!byIcon.has(ref.icon)) byIcon.set(ref.icon, []);
      byIcon.get(ref.icon).push(ref);
    }
    for (const byIcon of byColor.values()) for (const list of byIcon.values()) html += badge(list, false);
    return html;
  }

  const ago = (iso) => {
    const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)} min${Math.floor(s / 60) === 1 ? '' : 's'} ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr${Math.floor(s / 3600) === 1 ? '' : 's'} ago`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)} day${Math.floor(s / 86400) === 1 ? '' : 's'} ago`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400 / 7)} wk${Math.floor(s / 86400 / 7) === 1 ? '' : 's'} ago`;
    if (s < 86400 * 365) return `${Math.floor(s / 86400 / 30)} mo${Math.floor(s / 86400 / 30) === 1 ? '' : 's'} ago`;
    return `${Math.floor(s / 86400 / 365)} yr${Math.floor(s / 86400 / 365) === 1 ? '' : 's'} ago`;
  };

  let graphSeq = 0;
  async function loadGraph(more) {
    const my = ++graphSeq;
    const root = graphRoot;
    if (!root) {
      graph = { root: null, rows: [], n: 50, more: false, sig: '', at: Date.now() };
      return renderGraph();
    }
    const n = more ? graph.n + 50 : graph.root === root ? graph.n : 50;
    const r = await git('log', { root, n, all: graphAll });
    if (my !== graphSeq) return;
    if (graph.root !== root) opened.clear();
    // The current branch's badge has VS Code's target icon.
    const items = (r.commits || []).map((c) => ({
      id: c.hash, parentIds: c.parents, author: c.author, email: c.email, date: c.date, subject: c.subject,
      references: refsOf(c).map((ref) => (ref.id === r.branch ? { ...ref, icon: 'target' } : ref)),
    }));
    const current = r.head ? { id: r.branch || undefined, name: (r.branch || '').replace(/^refs\/heads\//, ''), revision: r.head } : null;
    const remote = r.upstream ? { id: r.upstream, name: r.upstream.replace(/^refs\/remotes\//, ''), revision: r.upstreamRev } : null;
    const base = r.base ? { id: r.base, name: r.base.replace(/^refs\/(remotes|heads)\//, ''), revision: r.baseRev } : null;
    const colors = new Map();
    if (current?.id) colors.set(current.id, REF);
    if (current?.id && remote) colors.set(remote.id, REMOTE);
    if (current?.id && base) colors.set(base.id, BASE);
    const repo = repos.find((x) => x.root === root);
    graph = {
      root, n, more: items.length >= n, at: Date.now(), sig: repo ? `${repo.root}|${repo.branch}|${repo.ahead}|${repo.behind}` : '',
      rows: graphRows(items, colors, current, remote, base, r.mergeBase || null),
    };
    renderGraph();
  }

  function renderGraph() {
    const r = repos.find((x) => x.root === graphRoot);
    const picker = graphPane.querySelector('.vs-picker.repo');
    picker.hidden = repos.length < 2;
    picker.querySelector('span').textContent = r ? r.name : '';
    graphPane.querySelector('[data-act="graph-refs"] span').textContent = graphAll ? 'All' : 'Auto';
    fit(graphPane.querySelector('.vs-ph'));
    if (!graph.rows.length) {
      graphEl.innerHTML = r ? '' : '<div class="vs-welcome">No repository.</div>';
      return;
    }
    let html = '';
    for (const row of graph.rows) {
      const { item } = row;
      const synthetic = row.kind === 'incoming-changes' || row.kind === 'outgoing-changes';
      const key = `c:${item.id}`;
      const files = opened.get(item.id);
      const kindClass = row.kind === 'HEAD' ? ' current' : synthetic ? ` ${row.kind}` : '';
      const tip = synthetic ? item.subject : `${item.author}, ${ago(item.date)} (${new Date(item.date).toLocaleString()})\n\n${item.subject}\n\n${item.id.slice(0, 7)}`;
      html +=
        `<div class="vs-r vs-hi${row.kind === 'HEAD' ? ' cur' : ''}${files !== undefined ? ' open' : ''}${sel === key ? ' sel' : ''}" data-key="${esc(key)}" data-hash="${esc(item.id)}"${synthetic ? ' data-synthetic="1"' : ''} title="${esc(tip)}">` +
        `<div class="vs-ct"><div class="vs-history"><div class="vs-gc${kindClass}">${rowSvg(row)}</div>` +
        `<div class="vs-il"><span class="vs-lc"><span class="vs-ln">${esc(item.subject)}</span><span class="vs-ld">${esc(item.author || '')}</span></span></div>` +
        `<div class="vs-lbl">${badges(item.references)}</div></div></div></div>`;
      if (!files) continue;
      // The files it changed, under it: the graph goes on to their left.
      const gw = W * (row.output.length + 1);
      for (const f of files) {
        const fkey = `h:${item.id}|${f.path}`;
        html +=
          `<div class="vs-r vs-hc${sel === fkey ? ' sel' : ''}" data-key="${esc(fkey)}" data-hash="${esc(item.id)}" data-path="${esc(f.path)}" data-status="${esc(f.status)}" title="${esc(f.path)}">` +
          `<div class="vs-gp">${lanesSvg(row.output, laneOf(row))}</div><div class="vs-ct" style="padding-left:${gw}px"><div class="vs-res"><div class="vs-name">` +
          `<div class="vs-il" data-l="${esc(f.status)}">${fileIcon(f.path)}` +
          `<span class="vs-lc"><span class="vs-ln">${esc(basename(f.path))}</span><span class="vs-ld">${esc(dirname(f.path))}</span></span></div></div></div></div></div>`;
      }
    }
    if (graph.more) {
      const last = graph.rows.at(-1);
      html += `<div class="vs-r vs-more" data-act="load-more"><div class="vs-gp">${lanesSvg(last.output, -1)}</div><div class="vs-ct" style="padding-left:${W * (last.output.length + 1)}px"><span class="vs-ln">Load More...</span></div></div>`;
    }
    graphEl.innerHTML = html;
  }

  // A view header's toolbar, as VS Code's responsive one: what doesn't fit goes (into its ··· menu), push first.
  function fit(head) {
    const pa = head.querySelector('.vs-pa');
    const opt = [...pa.querySelectorAll('[data-opt]')].reverse();
    opt.forEach((el) => el.classList.remove('fit-off'));
    for (const el of opt) {
      if (pa.scrollWidth <= pa.clientWidth + 1) break;
      el.classList.add('fit-off');
    }
  }
  new ResizeObserver(() => view.querySelectorAll('.vs-ph').forEach(fit)).observe(view.querySelector('.vs-sb'));

  async function toggleCommit(hash) {
    if (opened.has(hash)) {
      opened.delete(hash);
      return renderGraph();
    }
    opened.set(hash, null);
    const c = await git('show', { root: graph.root, hash });
    if (!opened.has(hash)) return;
    opened.set(hash, (c.files || []).slice().sort((a, b) => comparePaths(a.path, b.path)));
    renderGraph();
  }

  // ---------- the editor (git-editor.js) and the status bar ----------
  // The tab's title, as the git extension names it.
  function title() {
    const name = basename(editor.path);
    if (editor.kind === 'commit') {
      const h = editor.hash.slice(0, 7), p = (editor.parent || '').slice(0, 7);
      return editor.status === 'A' ? `${name} (${h})` : editor.status === 'D' ? `${name} (${p})` : `${name} (${p}) ↔ ${name} (${h})`;
    }
    if (editor.staged) return editor.status === 'D' ? `${name} (Deleted)` : `${name} (Index)`;
    return editor.status === 'U' ? `${name} (Untracked)` : editor.status === 'D' ? `${name} (Deleted)` : `${name} (Working Tree)`;
  }

  let editorSeq = 0, shownSig = '', facts = null, cursor = null, blame = null;
  function refreshEditor() {
    if (!editor || editor.kind !== 'change') return;
    const f = repos.find((r) => r.root === editor.root)?.files.find((x) => x.path === editor.path && x.staged === editor.staged);
    const sig = f ? `${f.add}/${f.del}/${f.status}` : 'gone';
    if (sig !== shownSig) showEditor();
  }

  async function showEditor() {
    const my = ++editorSeq;
    cursor = blame = null;
    if (!editor) {
      edEl.innerHTML = '';
      facts = null;
      window.GitEditor.close();
      return renderStatus();
    }
    const r = repos.find((x) => x.root === editor.root);
    let letter = editor.status;
    if (editor.kind === 'change') {
      const f = r && r.files.find((x) => x.path === editor.path && x.staged === editor.staged);
      if (f) editor.status = letter = f.status;
      shownSig = f ? `${f.add}/${f.del}/${f.status}` : 'gone';
    }
    // The tab: its name and letter in the file's git colour (VS Code's editor decorations), italic while a preview.
    const side = editor.kind === 'commit' ? 'work' : editor.staged ? 'index' : 'work';
    const color = LETTER[side][letter] || LETTER.work.M;
    const st = window.GitEditor.state() || { ignoreTrim: stored('git.ignoreTrim', '1') === '1', collapse: stored('git.collapse', '0') === '1', inline: stored('git.inline', '0') === '1' };
    const crumbs = editor.path.split('/').map((p, i, all) => `<span class="vs-bi">${i === all.length - 1 ? fileIcon(editor.path) : ''}${esc(p)}</span>`).join(ci('chevron-right', 'vs-bs')) + `${ci('chevron-right', 'vs-bs')}<span class="vs-bi">…</span>`;
    edEl.innerHTML =
      `<div class="vs-tabs"><div class="vs-tab" title="${esc(`${r?.path || editor.root}/${editor.path}`)}">${fileIcon(editor.path)}<span class="vs-tl" style="color:${color}">${esc(title())}</span>` +
      `<span class="vs-tdeco" style="color:${color}">${esc(letter || '')}</span>` +
      `<div class="vs-ta"><a class="vs-al" data-act="close-editor" title="Close (⌘W)">${ci('close')}</a></div></div>` +
      `<div class="vs-eda"><a class="vs-al" data-act="open-file" title="Open File">${ci('go-to-file')}</a>` +
      `<a class="vs-al" data-act="prev-change" title="Previous Change">${ci('arrow-up')}</a><a class="vs-al" data-act="next-change" title="Next Change">${ci('arrow-down')}</a>` +
      `<a class="vs-al${st.ignoreTrim ? '' : ' on'}" data-act="toggle-whitespace" title="Show Leading/Trailing Whitespace Differences">${ci('whitespace')}</a>` +
      `<a class="vs-al${st.collapse ? ' on' : ''}" data-act="toggle-collapse" title="Collapse Unchanged Regions">${ci('map')}</a>` +
      `<a class="vs-al${st.inline ? ' on' : ''}" data-act="toggle-inline" title="Toggle Inline View">${ci(st.inline ? 'diff-single' : 'split-horizontal')}</a>` +
      `<a class="vs-al" data-act="editor-menu" title="More Actions...">${ci('ellipsis')}</a></div></div>` +
      `<div class="vs-crumbs">${crumbs}</div><div class="vs-view"><div class="vs-dv"></div></div>`;
    const result = await window.GitEditor.open(edEl.querySelector('.vs-dv'), { ...editor, root: editor.root }, {
      onCursor: (c) => ((cursor = c), renderStatus()),
      onBlame: (b) => ((blame = b), renderStatus()),
    });
    if (my !== editorSeq) return;
    facts = result;
    edEl.dataset.abs = result.abs || '';
    renderStatus();
  }

  // The status bar, VS Code's: the branch and its sync, the problems; for the file open, GitLens's blame of the line,
  // the cursor, the indent, the encoding, the line ends and the language.
  function renderStatus() {
    const r = repos.find((x) => x.root === (editor?.root || graphRoot));
    const item = (html, title, act) => `<a class="vs-si"${act ? ` data-act="${act}"` : ''}${title ? ` title="${esc(title)}"` : ''}>${html}</a>`;
    let left = item(ci('remote'), 'Open a Remote Window');
    if (r) {
      const dirty = r.files.some((f) => !f.staged) ? '*' : '', staged = r.files.some((f) => f.staged) ? '+' : '';
      left += item(`${ci('git-branch')}<span>${esc(r.branch)}${dirty}${staged}</span>`, `${r.name} (Git) - ${r.branch}`);
      left += r.ahead === null
        ? item(ci('cloud-upload'), 'Publish Branch', 'status-publish')
        : item(`${ci('sync')}${r.ahead || r.behind ? `<span>${r.behind}↓ ${r.ahead}↑</span>` : ''}`, 'Synchronize Changes', 'status-sync');
    }
    left += item(`${ci('error')}<span>0</span>${ci('warning')}<span>0</span>`, 'No Problems');
    let right = '';
    if (editor && facts && !facts.note) {
      if (blame) right += item(`${ci('git-commit')}<span>${esc(blame.who)}, ${esc(blame.when)}</span>`, blame.uncommitted ? 'Uncommitted changes' : `${blame.author}, ${blame.when}\n${blame.summary || ''}\n${(blame.hash || '').slice(0, 7)}`);
      right += item(`<span>Ln ${cursor ? cursor.line : 1}, Col ${cursor ? cursor.col : 1}</span>`, 'Go to Line/Column');
      right += item(`<span>${esc(facts.indent)}</span>`, 'Select Indentation');
      right += item('<span>UTF-8</span>', 'Select Encoding');
      right += item(`<span>${esc(facts.eol)}</span>`, 'Select End of Line Sequence');
      right += item(`<span>{ }</span><span>${esc(facts.language)}</span>`, 'Select Language Mode');
    }
    right += item(ci('bell'), 'No Notifications');
    statusEl.querySelector('.vs-sl').innerHTML = left;
    statusEl.querySelector('.vs-sr').innerHTML = right;
  }

  // ---------- actions ----------
  const repo = (root) => repos.find((x) => x.root === root);
  async function act(what, root, paths) {
    const r = await git(what, { root, paths });
    if (r.error) say(r.error);
    await load();
  }

  async function commit(root, how) {
    const r = repo(root);
    const message = (drafts.get(root) || '').trim();
    if (!r) return;
    if (!message) return say('Please provide a commit message');
    let all = false;
    if (!r.files.some((f) => f.staged)) {
      // VS Code's smart commit question, with its Always and Never.
      const smart = stored('git.smartCommit', '');
      if (smart === 'never') return say('There are no staged changes to commit.');
      if (smart !== 'always') {
        const i = await confirm('There are no staged changes to commit.\n\nWould you like to stage all your changes and commit them directly?', '', ['Yes', 'Always', 'Never']);
        if (i < 0) return;
        if (i === 1) store('git.smartCommit', 'always');
        if (i === 2) return store('git.smartCommit', 'never');
      }
      all = true;
    }
    const res = await git('commit', { root, message, all, push: how === 'push' });
    if (res.error) return say(res.error);
    drafts.delete(root);
    if (how === 'sync') await sync(root);
    await load();
    loadGraph();
  }

  async function sync(root) {
    const r = repo(root);
    const pulled = !r || r.behind ? await git('pull', { root }) : { ok: true };
    const pushed = pulled.error ? pulled : await git('push', { root });
    if (pushed.error) say(pushed.error);
  }

  async function discard(root, list) {
    const untracked = list.filter((f) => f.status === 'U'), tracked = list.filter((f) => f.status !== 'U');
    const name = (f) => `'${basename(f.path)}'`;
    const trash = (n) => [n === 1 ? `Are you sure you want to DELETE the following untracked file: ${name(untracked[0])}?` : `Are you sure you want to DELETE the ${n} untracked files?`, n === 1 ? 'You can restore this file from the Trash.' : 'You can restore these files from the Trash.'];
    let paths;
    if (!untracked.length) {
      const restore = tracked.every((f) => f.status === 'D');
      const text = restore
        ? tracked.length === 1 ? `Are you sure you want to restore ${name(tracked[0])}?` : `Are you sure you want to restore ALL ${tracked.length} files?`
        : tracked.length === 1 ? `Are you sure you want to discard changes in ${name(tracked[0])}?` : `Are you sure you want to discard ALL changes in ${tracked.length} files?\n\nThis is IRREVERSIBLE! Your current working set will be FOREVER LOST if you proceed.`;
      const button = restore ? (tracked.length === 1 ? 'Restore File' : `Restore All ${tracked.length} Files`) : tracked.length === 1 ? 'Discard File' : `Discard All ${tracked.length} Files`;
      if ((await confirm(text, '', [button])) !== 0) return;
      paths = tracked;
    } else if (!tracked.length) {
      const [text, detail] = trash(untracked.length);
      if ((await confirm(text, detail, ['Move to Trash'])) !== 0) return;
      paths = untracked;
    } else {
      const [text, detail] = trash(untracked.length);
      const more = tracked.length === 1 ? `Are you sure you want to discard changes in ${name(tracked[0])}?` : `Are you sure you want to discard ALL changes in ${tracked.length} files?`;
      const i = await confirm(`${text} ${detail}\n\n${more}\n\nThis is IRREVERSIBLE! Your current working set will be FOREVER LOST if you proceed.`, '', [
        tracked.length === 1 ? 'Discard 1 Tracked File' : `Discard All ${tracked.length} Tracked Files`,
        `Discard All ${list.length} Files`,
      ]);
      if (i < 0) return;
      paths = i === 0 ? tracked : list;
    }
    act('discard', root, paths.map((f) => f.path));
  }

  async function commitMenu(root, anchor) {
    const i = await menu(anchor, ['Commit', 'Commit & Push', 'Commit & Sync']);
    if (i >= 0) commit(root, ['commit', 'push', 'sync'][i]);
  }

  async function repoMenu(root, anchor) {
    const i = await menu(anchor, ['Pull', 'Push', 'Fetch', '', 'Commit', 'Commit & Push', 'Commit & Sync']);
    if (i === 0 || i === 1 || i === 2) {
      const r = await git(['pull', 'push', 'fetch'][i], { root });
      if (r.error) say(r.error);
      await load();
      loadGraph();
    } else if (i >= 4) commit(root, ['commit', 'push', 'sync'][i - 4]);
  }

  function select(key, list) {
    sel = key;
    for (const el of view.querySelectorAll('.vs-r.sel')) el.classList.remove('sel');
    const el = key && view.querySelector(`.vs-r[data-key="${CSS.escape(key)}"]`);
    if (el) {
      el.classList.add('sel');
      el.scrollIntoView({ block: 'nearest' });
    }
    if (list) list.focus({ preventScroll: true });
  }

  // The graph follows the repo last used in CHANGES (VS Code's "Auto").
  function useRepo(root) {
    if (!root || root === graphRoot) return;
    graphRoot = root;
    loadGraph();
  }

  changesEl.addEventListener('input', (e) => {
    if (!e.target.matches('.vs-msg')) return;
    drafts.set(e.target.dataset.root, e.target.value);
    grow(e.target);
  });
  changesEl.addEventListener('focusin', (e) => {
    if (e.target.matches('.vs-msg')) {
      e.target.closest('.vs-editor').classList.add('focus');
      useRepo(e.target.dataset.root);
    }
  });
  changesEl.addEventListener('focusout', (e) => e.target.matches('.vs-msg') && e.target.closest('.vs-editor').classList.remove('focus'));
  changesEl.addEventListener('keydown', (e) => {
    if (e.target.matches('.vs-msg') && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit(e.target.dataset.root, 'commit');
    }
  });

  changesEl.addEventListener('click', async (e) => {
    const rowEl = e.target.closest('.vs-r');
    if (!rowEl) return;
    const root = rowEl.dataset.root;
    const a = e.target.closest('[data-act]')?.dataset.act;
    const r = repo(root);
    useRepo(root);
    if (a) {
      e.stopPropagation();
      if (!r) return;
      if (a === 'refresh') return load();
      if (a === 'repo-menu') return repoMenu(root, e.target.closest('[data-act]'));
      if (a === 'commit') return rowEl.querySelector('.vs-bd.off') ? undefined : commit(root, 'commit');
      if (a === 'commit-menu') return commitMenu(root, e.target.closest('[data-act]'));
      if (a === 'sync') {
        await sync(root);
        await load();
        return loadGraph();
      }
      if (a === 'publish') {
        const res = await git('publish', { root });
        if (res.error) say(res.error);
        await load();
        return loadGraph();
      }
      if (a === 'stage-all') return act('stage', root, r.files.filter((f) => !f.staged).map((f) => f.path));
      if (a === 'unstage-all') return act('unstage', root, r.files.filter((f) => f.staged).map((f) => f.path));
      if (a === 'discard-all') return discard(root, r.files.filter((f) => !f.staged));
      const p = rowEl.dataset.path;
      if (a === 'open') return openInVSCode(`${root}/${p}`);
      if (a === 'stage') return act('stage', root, [p]);
      if (a === 'unstage') return act('unstage', root, [p]);
      if (a === 'discard') return discard(root, r.files.filter((f) => f.path === p && !f.staged));
      return;
    }
    if (rowEl.classList.contains('vs-nh')) return;
    const key = rowEl.dataset.key;
    if (rowEl.classList.contains('vs-file')) {
      select(key, changesEl);
      editor = { kind: 'change', root, path: rowEl.dataset.path, staged: rowEl.dataset.staged === '1' };
      return showEditor();
    }
    // A group folds with a click anywhere on it; a repo with its twistie (its row has buttons).
    if (rowEl.classList.contains('vs-grp') || e.target.closest('.vs-tw')) {
      shut.has(key) ? shut.delete(key) : shut.add(key);
      sel = key;
      renderChanges();
      return changesEl.focus({ preventScroll: true });
    }
    select(key, changesEl);
  });

  function openInVSCode(abs) {
    const link = document.createElement('a');
    link.href = `vscode://file${encodeURI(abs.startsWith('/') ? abs : `/${abs}`)}`;
    link.click();
  }

  graphEl.addEventListener('click', (e) => {
    const rowEl = e.target.closest('.vs-r');
    if (!rowEl) return;
    if (rowEl.dataset.act === 'load-more') return loadGraph(true);
    select(rowEl.dataset.key, graphEl);
    if (rowEl.classList.contains('vs-hi')) {
      if (rowEl.dataset.synthetic) return;
      return toggleCommit(rowEl.dataset.hash);
    }
    if (rowEl.classList.contains('vs-hc')) {
      const row = graph.rows.find((x) => x.item.id === rowEl.dataset.hash);
      editor = { kind: 'commit', root: graph.root, hash: rowEl.dataset.hash, parent: row?.item.parentIds[0], path: rowEl.dataset.path, status: rowEl.dataset.status };
      showEditor();
    }
  });

  edEl.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]');
    const a = el?.dataset.act;
    const E = window.GitEditor;
    if (a === 'close-editor') {
      editor = null;
      return showEditor();
    }
    if (a === 'open-file') return edEl.dataset.abs && openInVSCode(edEl.dataset.abs);
    if (a === 'prev-change' || a === 'next-change') return E.reveal(a === 'next-change' ? 1 : -1);
    const toggles = { 'toggle-whitespace': 'whitespace', 'toggle-collapse': 'collapse', 'toggle-inline': 'inline' };
    if (toggles[a]) {
      E.toggle(toggles[a]);
      const st = E.state();
      edEl.querySelector('[data-act="toggle-whitespace"]').classList.toggle('on', !st.ignoreTrim);
      edEl.querySelector('[data-act="toggle-collapse"]').classList.toggle('on', st.collapse);
      const t = edEl.querySelector('[data-act="toggle-inline"]');
      t.classList.toggle('on', st.inline);
      t.innerHTML = ci(st.inline ? 'diff-single' : 'split-horizontal');
      return;
    }
    if (a === 'editor-menu') {
      const st = E.state() || {};
      const i = await menu(el, [st.inline ? 'Side by Side View' : 'Inline View', st.collapse ? 'Show Unchanged Regions' : 'Collapse Unchanged Regions', st.ignoreTrim ? 'Show Leading/Trailing Whitespace Differences' : 'Ignore Leading/Trailing Whitespace Differences', '', 'Open File']);
      if (i >= 0 && i <= 2) edEl.querySelector(`[data-act="${['toggle-inline', 'toggle-collapse', 'toggle-whitespace'][i]}"]`).click();
      if (i === 4 && edEl.dataset.abs) openInVSCode(edEl.dataset.abs);
    }
  });

  statusEl.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    const root = editor?.root || graphRoot;
    if (!root || !a) return;
    if (a === 'status-sync') await sync(root);
    if (a === 'status-publish') {
      const res = await git('publish', { root });
      if (res.error) say(res.error);
    }
    await load();
    loadGraph();
  });

  view.querySelector('.vs-sb').addEventListener('click', async (e) => {
    if (e.target.closest('.vs-title [data-act="views-menu"]')) {
      const i = await menu(e.target.closest('[data-act]'), [`${changesPane.classList.contains('shut') ? 'Expand' : 'Collapse'} Changes`, `${graphPane.classList.contains('shut') ? 'Expand' : 'Collapse'} Graph`]);
      if (i >= 0) [changesPane, graphPane][i].querySelector('.vs-ph h3').click();
      return;
    }
    const head = e.target.closest('.vs-ph');
    if (!head) return;
    const anchor = e.target.closest('[data-act]');
    const a = anchor?.dataset.act;
    if (a === 'refresh-all') return load();
    if (a === 'collapse-all') {
      for (const r of repos) shut.add(`r:${r.root}`);
      return renderChanges();
    }
    // The repo in use: the one a row was last picked in (VS Code's focused repository).
    const focused = graphRoot || repos[0]?.root;
    if (a === 'commit-focused') return focused && commit(focused, 'commit');
    if (a === 'changes-menu') {
      if (!focused) return;
      return repoMenu(focused, anchor);
    }
    if (a === 'graph-refresh') return loadGraph();
    if (a === 'graph-current') {
      const row = graph.rows.find((x) => x.kind === 'HEAD');
      if (row) select(`c:${row.item.id}`, graphEl);
      return;
    }
    if (a === 'graph-fetch' || a === 'graph-pull' || a === 'graph-push') {
      if (!graphRoot) return;
      const res = await git(a.slice(6), { root: graphRoot });
      if (res.error) say(res.error);
      await load();
      return loadGraph();
    }
    if (a === 'graph-refs') {
      const i = await menu(anchor, ['Auto', 'All Branches']);
      if (i < 0) return;
      graphAll = i === 1;
      graph.sig = '';
      return loadGraph();
    }
    if (a === 'graph-menu') {
      const i = await menu(anchor, ['Fetch', 'Pull', 'Push', '', 'Refresh']);
      if (i === 4) return loadGraph();
      if (i >= 0 && graphRoot) {
        const res = await git(['fetch', 'pull', 'push'][i], { root: graphRoot });
        if (res.error) say(res.error);
        await load();
        loadGraph();
      }
      return;
    }
    if (a === 'graph-repo') {
      const anchor = e.target.closest('[data-act]');
      return menu(anchor, repos.map((r) => r.name)).then((i) => {
        if (i < 0) return;
        graphRoot = repos[i].root;
        loadGraph();
      });
    }
    if (a) return;
    const pane = head.parentElement;
    pane.classList.toggle('shut');
    store(`git.shut.${head.dataset.pane}`, pane.classList.contains('shut') ? '1' : '0');
    head.querySelector('.vs-pt').textContent = ch(pane.classList.contains('shut') ? 'chevron-right' : 'chevron-down');
  });
  for (const pane of [changesPane, graphPane]) if (pane.classList.contains('shut')) pane.querySelector('.vs-pt').textContent = ch('chevron-right');

  // Up and down move through a list's rows, Enter opens, left and right fold (VS Code's list keys).
  for (const list of [changesEl, graphEl]) {
    list.addEventListener('keydown', (e) => {
      if (e.target !== list) return;
      const rows = [...list.querySelectorAll('.vs-r[data-key]')];
      if (!rows.length) return;
      const i = rows.findIndex((r) => r.dataset.key === sel);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        select(next.dataset.key, list);
        if (next.classList.contains('vs-file') || next.classList.contains('vs-hc')) next.click();
      } else if (e.key === 'Enter' && i >= 0) {
        e.preventDefault();
        rows[i].click();
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && i >= 0) {
        const key = rows[i].dataset.key;
        if (key.startsWith('c:')) {
          const hash = key.slice(2);
          if ((e.key === 'ArrowRight') !== opened.has(hash)) toggleCommit(hash);
        } else if (key.startsWith('r:') || key.startsWith('g:')) {
          e.key === 'ArrowLeft' ? shut.add(key) : shut.delete(key);
          renderChanges();
        }
      }
    });
  }

  // The sashes: the side bar's width, and the graph's height (VS Code's split views).
  function drag(sash, onMove, onEnd) {
    sash.addEventListener('mousedown', (e) => {
      e.preventDefault();
      sash.classList.add('on');
      const move = (ev) => onMove(ev);
      const up = () => {
        removeEventListener('mousemove', move);
        removeEventListener('mouseup', up);
        sash.classList.remove('on');
        onEnd();
      };
      addEventListener('mousemove', move);
      addEventListener('mouseup', up);
    });
  }
  drag(
    view.querySelector('.vs-sash-v'),
    (e) => view.style.setProperty('--sw', `${Math.max(170, Math.min(view.clientWidth - 360, e.clientX - view.querySelector('.vs-sb').getBoundingClientRect().left))}px`),
    () => store('git.sideWidth', parseInt(view.style.getPropertyValue('--sw'), 10)),
  );
  drag(
    graphPane.querySelector('.vs-sash-h'),
    (e) => {
      const sb = view.querySelector('.vs-sb').getBoundingClientRect();
      graphPane.style.setProperty('--gh', `${Math.max(44, Math.min(sb.height - 35 - 44, sb.bottom - e.clientY))}px`);
    },
    () => store('git.graphHeight', parseInt(graphPane.style.getPropertyValue('--gh'), 10)),
  );

  // ---------- session cards: their repo's changes ----------
  const scmIcon = '<svg viewBox="0 0 16 16"><circle cx="4.5" cy="3.5" r="1.6"/><circle cx="4.5" cy="12.5" r="1.6"/><circle cx="11.5" cy="5.5" r="1.6"/><path d="M4.5 5.1v5.8M11.5 7.1c0 2.6-2.8 3-6 4.2"/></svg>';
  function cardChips() {
    const bySid = new Map();
    for (const r of repos) for (const s of r.sessions) if (!bySid.has(s.id)) bySid.set(s.id, r);
    document.querySelectorAll('#sessions .card').forEach((card) => {
      const r = bySid.get(card.dataset.key);
      let chip = card.querySelector('.gchip');
      if (!r || !r.files.length) return chip && chip.remove();
      const mine = r.files.filter((f) => f.editors && f.editors.includes(card.dataset.key));
      const list = mine.length ? mine : r.files;
      const t = list.reduce((s, f) => ({ add: s.add + (f.add || 0), del: s.del + (f.del || 0) }), { add: 0, del: 0 });
      const n = unique(list);
      if (!chip) {
        chip = document.createElement('div');
        chip.className = 'gchip';
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          show(chip.dataset.root);
        });
        card.querySelector('.path')?.after(chip);
      }
      chip.dataset.root = r.root;
      chip.title = `${r.name}: open in Source Control`;
      const html = `${scmIcon}<span>${esc(r.name)}</span><b>${n} ${n === 1 ? 'file' : 'files'}</b><span class="g-add">+${t.add}</span><span class="g-del">−${t.del}</span>`;
      if (chip.__h !== html) (chip.innerHTML = html), (chip.__h = html);
    });
  }

  // ---------- switching ----------
  function setOpen(on) {
    open = on;
    app.classList.toggle('git-mode', on);
    document.documentElement.classList.toggle('vs-git', on);
    bar.querySelectorAll('.vs-ab').forEach((b) => b.classList.toggle('on', b.dataset.view === (on ? 'git' : 'dash')));
    if (on) load();
    dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => window.GitEditor.measure());
  }

  function show(root) {
    shut.delete(`r:${root}`);
    graphRoot = root;
    graph.sig = '';
    setOpen(true);
  }

  for (const el of [bar, view.querySelector('.vs-act')])
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (b) setOpen(b.dataset.view === 'git');
    });
  addEventListener('keydown', (e) => {
    // ⌃⇧G opens it, as in VS Code; Esc goes back to the dashboard.
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyG') return setOpen(!open);
    if (!open || e.target.closest('input, textarea')) return;
    if (e.key === 'Escape') return setOpen(false);
  });

  // The list keeps up while it's open (a session writing shows at once); the badge and the cards every 15 s.
  // Only while the dashboard shows (the app pauses it when hidden): every few seconds when open, else for the badge.
  const shown = () => document.visibilityState === 'visible' && !document.documentElement.classList.contains('paused');
  setInterval(() => open && shown() && load(), 4000);
  setInterval(() => !open && shown() && load(), 15_000);
  load();

  return { show, open: () => setOpen(true), close: () => setOpen(false) };
})();
