'use strict';

// Files in Source Control's editor, in tabs beside its diff, as VS Code opens them: a text file ⌘-clicked in a chat's
// terminal (FileEditor.swift) and a new one (⌘N: Untitled-1, Untitled-2…). Monaco, VS Code's own editor
// (editor/monaco.js, built by app/editor, loaded when the first file opens), coloured by the highlighter that colours
// the diff (git-editor.js), in the terminals' font and colours, with the user's VS Code settings: words wrap, a ruler at
// 120, Turkish letters aren't flagged, a change is saved a second after it's made and when the editor loses the keyboard
// (files.autoSave: afterDelay). A Markdown file opens as its preview, ⇧⌘V away from its text. A file changed on disk
// (Claude wrote it again) is read again, unless it has unsaved changes: then the user picks. A new file stays until it's
// saved (⌘S asks where), through a restart too, as VS Code keeps one. git.js draws the tabs, the toolbar, the path and the
// status bar from what this says. The Windows app's file side is its files.js (Ctrl where the Mac has ⌘).
window.FileEditor = (() => {
  if (!window.webkit?.messageHandlers?.files) return null;
  // Windows' paths (the Windows app sets __platform) have "\" between names (it takes "/" too), start at a drive and
  // don't care about case; its keys are Ctrl's.
  const WIN = window.__platform === 'win32';
  const SEP = WIN ? '\\' : '/';
  const KEY = { save: WIN ? 'Ctrl+S' : '⌘S', preview: WIN ? 'Ctrl+Shift+V' : '⇧⌘V' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const files = (type, q = {}) =>
    window.webkit.messageHandlers.files.postMessage({ type, ...q }).catch((e) => ({ error: String((e && e.message) || e) }));
  // A native question (git.js's): the index of the button picked, -1 for Cancel.
  const ask = (message, detail, buttons) =>
    window.webkit.messageHandlers.git.postMessage({ type: 'confirm', message, detail, buttons }).then((r) => (typeof r === 'number' ? r : -1), () => -1);
  const say = (msg) => (typeof window.toast === 'function' ? window.toast(msg) : console.warn(msg));
  const TM = () => window.GitEditor.tm;
  const LOOK = window.__terminalLook || { font: 'Menlo', size: 13 };
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
  const cut = (p) => (WIN ? Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')) : p.lastIndexOf('/'));
  const name = (p) => p.slice(cut(p) + 1);
  const folder = (p) => p.slice(0, cut(p)) || '/';
  const under = (p, dir) => (WIN ? p.toLowerCase().startsWith(`${dir.toLowerCase()}${SEP}`) : p.startsWith(`${dir}/`));
  const tilde = (p, home) => (home && (p === home || under(p, home)) ? `~${p.slice(home.length)}` : p);
  // The highlighter knows a file by its name ("/" before it).
  const scopeOf = (p) => TM().scopeOf(WIN ? p.replace(/\\/g, '/') : p);
  // A link's path from the address in a Markdown file: absolute (/… on the Mac; C:\… or /C:/… from file:// here), or
  // from the file's folder.
  const absolute = (p) => (WIN ? /^[a-z]:[\\/]/i.test(p) || /^\/[a-z]:\//i.test(p) : p.startsWith('/'));
  const fromLink = (p) => (WIN && /^\/[a-z]:\//i.test(p) ? p.slice(1).replace(/\//g, '\\') : p);

  // Where git.js shows a file: the banner, Monaco and the Markdown preview.
  const host = document.createElement('div');
  host.className = 'fe-host';
  host.hidden = true;
  host.innerHTML = '<div class="fe-banner" hidden></div><div class="fe-view"><div class="fe-code"></div><div class="fe-preview" tabindex="-1" hidden></div></div>';
  const bannerEl = host.querySelector('.fe-banner'), codeEl = host.querySelector('.fe-code'), previewEl = host.querySelector('.fe-preview');

  let listener = null;
  // Tells git.js: the tabs changed (`tabs`), or only what the status bar shows.
  const notify = (tabs = false) => listener && listener(tabs);

  // ---------- Monaco, loaded with the first file ----------
  const script = (src) =>
    new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = fail;
      document.head.appendChild(s);
    });
  const sheet = (href) =>
    new Promise((ok) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = l.onerror = ok;
      document.head.appendChild(l);
    });
  const QUICK = { other: true, comments: false, strings: false };
  let booting = null, editor = null;
  function boot() {
    booting ||= (async () => {
      // Its workers (the editor's, JSON's) from their text (editor/workers.js): WebKit starts none from a file for a page
      // that is a file.
      self.MonacoEnvironment = {
        getWorker: (_, label) =>
          new Worker(URL.createObjectURL(new Blob([window.__monacoWorkers[label === 'json' ? 'json' : 'editor']], { type: 'text/javascript' })), { name: label }),
      };
      await Promise.all([sheet('editor/monaco.css'), script('editor/workers.js')]);
      await script('editor/monaco.js');
      // JSON keeps its language service (problems, formatting, folding), as lenient as VS Code is with JSON with
      // Comments; VS Code's grammar colours it.
      const { jsonDefaults } = window.MonacoExtras;
      jsonDefaults.setModeConfiguration({ ...jsonDefaults.modeConfiguration, tokens: false });
      jsonDefaults.setDiagnosticsOptions({ ...jsonDefaults.diagnosticsOptions, validate: true, allowComments: true, comments: 'ignore', trailingCommas: 'warning', schemaValidation: 'ignore' });
      defineTheme(await TM().init());
      addEventListener('themechange', () => TM().init().then(defineTheme));
      editor = monaco.editor.create(codeEl, {
        model: null,
        theme: 'terminal',
        fontFamily: `"${LOOK.font}", Menlo, monospace`,
        fontSize: LOOK.size,
        wordWrap: 'on',
        rulers: [120],
        unicodeHighlight: { allowedLocales: { tr: true } },
        stickyScroll: { enabled: true },
        bracketPairColorization: { enabled: true },
        renderWhitespace: 'selection',
        automaticLayout: true,
        fixedOverflowWidgets: true,
        accessibilitySupport: 'off',
        padding: { top: 4 },
      });
      editor.onDidChangeCursorSelection(() => notify());
      editor.onDidBlurEditorWidget(() => cur() && save(cur()));
      monaco.editor.onDidChangeMarkers(() => notify());
      return editor;
    })();
    return booting;
  }

  // ---------- VS Code's highlighter as Monaco's tokenizer ----------
  // A grammar run line by line as VS Code runs it. A token's type goes by its colour (tc<n>, from the theme's colour map)
  // and font style (.f<n>), and by what Monaco must know of it (.comment, .string, .regex: brackets and quotes don't
  // close inside those); a comment starting with one of the user's Better Comments tags takes its colour (bc<n>).
  const TYPE = ['', '.comment', '.string', '.regex'];
  class TMState {
    constructor(stack) {
      this.stack = stack;
    }
    clone() {
      return new TMState(this.stack);
    }
    equals(other) {
      return other instanceof TMState && (other.stack === this.stack || !!this.stack?.equals?.(other.stack));
    }
  }
  function tokenizer(grammar) {
    const better = TM().better;
    return {
      getInitialState: () => new TMState(window.vscodetextmate.INITIAL),
      tokenize(line, state) {
        if (line.length > 20000) return { tokens: [{ startIndex: 0, scopes: '' }], endState: state };
        const r = grammar.tokenizeLine2(line, state.stack, 500);
        const t = r.tokens, out = [];
        let comment = '';
        for (let k = 0; k < t.length; k += 2) if ((t[k + 1] & 0x300) >>> 8 === 1) comment += line.slice(t[k], k + 2 < t.length ? t[k + 2] : line.length);
        const rest = comment.replace(/^\s*(\/\/|#|\/\*+|\*|<!--|--)\s?/, '').toLowerCase();
        const tag = comment ? better.findIndex((b) => rest.startsWith(b.tag)) : -1;
        for (let k = 0; k < t.length; k += 2) {
          const m = t[k + 1], type = (m & 0x300) >>> 8, f = (m & 0x7800) >>> 11;
          out.push({ startIndex: t[k], scopes: tag >= 0 && type === 1 ? `bc${tag}.comment` : `tc${(m & 0xff8000) >>> 15}${f ? `.f${f}` : ''}${TYPE[type]}` });
        }
        return { tokens: out, endState: new TMState(r.ruleStack) };
      },
    };
  }

  const PLAIN = {
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [{ open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' }, { open: '"', close: '"' }, { open: "'", close: "'" }],
  };
  const languages = new Map();
  // A file's language in Monaco: its grammar's scope (VS Code's language), JSON's own for JSON.
  function languageOf(scope) {
    if (!scope) return Promise.resolve('plaintext');
    if (!languages.has(scope)) {
      languages.set(scope, (async () => {
        const json = scope === 'source.json' || scope === 'source.json.comments';
        const reg = await TM().init();
        const grammar = reg && (await reg.loadGrammar(json ? 'source.json.comments' : scope));
        if (!grammar) return 'plaintext';
        const id = json ? 'json' : scope;
        if (!json) {
          monaco.languages.register({ id });
          monaco.languages.setLanguageConfiguration(id, window.MonacoExtras.conf[scope] || PLAIN);
        }
        monaco.languages.setTokensProvider(id, tokenizer(grammar));
        return id;
      })());
    }
    return languages.get(scope);
  }

  // ---------- the theme: the terminals' colours (Themes.swift's tokens) as Monaco's ----------
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(`--${n}`).trim();
  function hex(c) {
    let m = /^#([0-9a-f]{3})$/i.exec(c || '');
    if (m) return m[1].replace(/./g, (x) => x + x).toLowerCase();
    if ((m = /^#([0-9a-f]{6})/i.exec(c || ''))) return m[1].toLowerCase();
    if ((m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(c || ''))) return m.slice(1, 4).map((x) => (+x).toString(16).padStart(2, '0')).join('');
    return null;
  }
  const FONT = (f) => [f & 1 && 'italic', f & 2 && 'bold', f & 4 && 'underline', f & 8 && 'strikethrough'].filter(Boolean).join(' ');
  function defineTheme(registry) {
    const v = (n, d) => hex(cssVar(n)) || d;
    const fg = v('code-fg', 'e6edf3'), bg = v('code-bg', '0d1117'), accent = v('accent', 'f88008'), sel = v('selection', accent);
    const amber = v('amber', 'ffd23f');
    const rules = [{ token: '', foreground: fg }];
    (registry ? registry.getColorMap() : []).forEach((c, i) => {
      const role = c && /^var\(--([\w-]+)\)$/.exec(TM().roleOf(c) || '')?.[1];
      const color = role ? v(role, fg) : hex(c);
      if (!color) return;
      rules.push({ token: `tc${i}`, foreground: color });
      for (let f = 1; f < 16; f++) rules.push({ token: `tc${i}.f${f}`, foreground: color, fontStyle: FONT(f) });
    });
    TM().better.forEach((b, i) => rules.push({ token: `bc${i}`, foreground: b.color.slice(1).toLowerCase(), fontStyle: b.strike ? 'strikethrough' : '' }));
    const ansi = (n) => `#${v(n, fg)}`;
    monaco.editor.defineTheme('terminal', {
      base: 'vs-dark',
      inherit: true,
      rules,
      colors: {
        'editor.background': '#00000000',
        'editor.foreground': `#${fg}`,
        'editorCursor.foreground': `#${v('code-cursor', accent)}`,
        'editor.selectionBackground': `#${sel}55`,
        'editor.inactiveSelectionBackground': `#${sel}2e`,
        'editor.selectionHighlightBackground': `#${sel}22`,
        'editor.wordHighlightBackground': `#${fg}14`,
        'editor.wordHighlightStrongBackground': `#${fg}1f`,
        'editor.findMatchBackground': `#${amber}55`,
        'editor.findMatchHighlightBackground': `#${amber}26`,
        'editor.lineHighlightBackground': `#${fg}0a`,
        'editor.lineHighlightBorder': '#00000000',
        'editorLineNumber.foreground': `#${v('a8', '6e7681')}`,
        'editorLineNumber.activeForeground': `#${fg}`,
        'editorIndentGuide.background1': `#${fg}14`,
        'editorIndentGuide.activeBackground1': `#${fg}33`,
        'editorRuler.foreground': `#${fg}1a`,
        'editorWhitespace.foreground': `#${fg}26`,
        'editorBracketMatch.background': `#${accent}22`,
        'editorBracketMatch.border': `#${accent}88`,
        'editorBracketHighlight.foreground1': ansi('a12'),
        'editorBracketHighlight.foreground2': ansi('a2'),
        'editorBracketHighlight.foreground3': ansi('a3'),
        'editorBracketHighlight.foreground4': ansi('a9'),
        'editorBracketHighlight.foreground5': ansi('a13'),
        'editorBracketHighlight.foreground6': ansi('a14'),
        'editorGutter.background': '#00000000',
        'editorWidget.background': `#${bg}`,
        'editorWidget.border': `#${accent}44`,
        'editorSuggestWidget.background': `#${bg}`,
        'editorSuggestWidget.selectedBackground': `#${accent}33`,
        'editorHoverWidget.background': `#${bg}`,
        'editorStickyScroll.background': `#${bg}`,
        'editorStickyScrollHover.background': `#${bg}`,
        'minimap.background': '#00000000',
        'minimapSlider.background': `#${fg}14`,
        'scrollbarSlider.background': `#${fg}1f`,
        'scrollbarSlider.hoverBackground': `#${fg}33`,
        'scrollbarSlider.activeBackground': `#${accent}55`,
        'scrollbar.shadow': '#00000000',
        'editorOverviewRuler.border': '#00000000',
        'editorOverviewRuler.background': '#00000000',
        focusBorder: `#${accent}88`,
        'input.background': `#${bg}`,
        'inputOption.activeBorder': `#${accent}`,
        'list.activeSelectionBackground': `#${accent}33`,
        'list.hoverBackground': `#${accent}1a`,
        'quickInput.background': `#${bg}`,
        'editorError.foreground': `#${v('red', 'ff4d4d')}`,
        'editorWarning.foreground': `#${amber}`,
      },
    });
    monaco.editor.setTheme('terminal');
  }

  // ---------- the tabs ----------
  // { id, path (null for a new file), name, untitled, n (Untitled-<n>), cwd and home (the path is shown from them), scope,
  //   md, model (text0: a new file's text until Monaco is there), mode ('code' | 'preview'), mtime, bom, saved (the
  //   version on disk), view (Monaco's scroll and cursor), scroll (the preview's), at (a line to go to), timer, saving,
  //   gone (deleted), conflict, error, app (the app it opens in otherwise) }
  const tabs = [];
  let current = null; // the file shown when a file's tab is in front
  let seq = 0;
  const opening = new Map();
  const byId = (id) => tabs.find((t) => t.id === id);
  const cur = () => byId(current);
  const dirty = (t) =>
    t.model ? (t.untitled ? t.model.getValueLength() > 0 : t.model.getAlternativeVersionId() !== t.saved) : !!(t.untitled && t.text0);

  // A file from a terminal: its tab (a new one, or the one it has), to go to `line` when it shows.
  async function open({ path, line, column, cwd, home }) {
    let t = tabs.find((x) => x.path === path);
    if (!t) {
      if (!opening.has(path)) opening.set(path, load(path, cwd, home).finally(() => opening.delete(path)));
      t = await opening.get(path);
      if (!t) return null;
    }
    if (line) t.at = { line, column };
    return t.id;
  }

  async function load(path, cwd, home) {
    const r = await files('read', { path });
    if (r.error) return say(r.error), null;
    await boot();
    const scope = scopeOf(path);
    const t = { id: `f${++seq}`, path, name: name(path), cwd, home, scope, md: scope === 'text.html.markdown', mtime: r.mtime, bom: r.bom, app: r.app };
    t.mode = t.md ? 'preview' : 'code';
    t.model = monaco.editor.createModel(r.text, await languageOf(scope), monaco.Uri.file(path));
    t.saved = t.model.getAlternativeVersionId();
    t.model.onDidChangeContent(() => changed(t));
    tabs.push(t);
    notify(true);
    return t;
  }

  // ⌘N: Untitled-1 (the lowest number free), a plain text file nowhere yet.
  function newFile(text = '', n = 0) {
    const used = new Set(tabs.filter((t) => t.untitled).map((t) => t.n));
    if (!n) for (n = 1; used.has(n); n++);
    const t = { id: `f${++seq}`, path: null, name: `Untitled-${n}`, untitled: true, n, scope: null, md: false, mode: 'code', text0: text };
    tabs.push(t);
    notify(true);
    return t.id;
  }

  async function model(t) {
    if (t.model) return;
    await boot();
    if (t.model) return;
    t.model = monaco.editor.createModel(t.text0 || '', await languageOf(t.scope));
    t.saved = t.model.getAlternativeVersionId();
    delete t.text0;
    t.model.onDidChangeContent(() => changed(t));
  }

  // Shows a file in the host, which git.js has put in the editor's place.
  async function show(id) {
    const t = byId(id);
    if (!t) return;
    await model(t);
    if (!tabs.includes(t)) return;
    const prev = cur();
    if (prev && prev !== t) keepPlace(prev);
    current = t.id;
    if (t.at) t.mode = 'code';
    // The editor shows before the file goes in: Monaco measures itself to put the line in the middle.
    showMode(t);
    if (editor.getModel() !== t.model) {
      editor.setModel(t.model);
      if (t.view) editor.restoreViewState(t.view);
    }
    editor.updateOptions({ quickSuggestions: t.md || !t.scope ? false : QUICK });
    if (t.at) {
      const pos = { lineNumber: t.at.line, column: t.at.column || 1 };
      editor.setPosition(pos);
      editor.revealPositionInCenter(pos);
      t.at = null;
    }
    renderBanner();
  }

  function keepPlace(t) {
    if (t.mode === 'code' && editor?.getModel() === t.model) t.view = editor.saveViewState();
    if (t.mode === 'preview') t.scroll = previewEl.scrollTop;
  }

  function showMode(t) {
    const preview = t.mode === 'preview';
    codeEl.hidden = preview;
    previewEl.hidden = !preview;
    if (preview) renderPreview(t);
    else editor.layout();
  }

  // ⇧⌘V: a Markdown file's preview and its text, each at about the same place in the file.
  function toggleMode() {
    const t = cur();
    if (!t || !t.md || !editor) return;
    const height = () => editor.getLayoutInfo().height;
    if (t.mode === 'preview') {
      const part = previewEl.scrollHeight > previewEl.clientHeight ? previewEl.scrollTop / (previewEl.scrollHeight - previewEl.clientHeight) : 0;
      t.mode = 'code';
      showMode(t);
      editor.setScrollTop(part * Math.max(0, editor.getScrollHeight() - height()));
    } else {
      const part = editor.getScrollHeight() > height() ? editor.getScrollTop() / (editor.getScrollHeight() - height()) : 0;
      t.view = editor.saveViewState();
      t.mode = 'preview';
      showMode(t);
      requestAnimationFrame(() => (previewEl.scrollTop = part * (previewEl.scrollHeight - previewEl.clientHeight)));
    }
    notify(true);
    focus();
  }

  function focus() {
    const t = cur();
    if (!t || !editor) return;
    if (t.mode === 'code') editor.focus();
    else previewEl.focus({ preventScroll: true });
  }

  // ---------- saving: a second after a change, on ⌘S, and when the editor loses the keyboard ----------
  // A new file is kept in the page's storage as it's written (VS Code's hot exit), and comes back on the next launch.
  const HOT = 'files.untitled';
  let hotTimer = 0;
  function keepNew(now = false) {
    clearTimeout(hotTimer);
    const write = () => store(HOT, JSON.stringify(tabs.filter((t) => t.untitled && dirty(t)).map((t) => ({ n: t.n, text: t.model ? t.model.getValue() : t.text0 }))));
    if (now) write();
    else hotTimer = setTimeout(write, 400);
  }
  try {
    for (const u of JSON.parse(stored(HOT, '[]'))) if (u && u.text) newFile(u.text, u.n);
  } catch {}

  function changed(t) {
    if (t.reloading) return;
    if (t.untitled) keepNew();
    else {
      clearTimeout(t.timer);
      t.timer = setTimeout(() => save(t), 1000);
    }
    const d = dirty(t);
    if (d !== t.wasDirty) {
      t.wasDirty = d;
      notify(true);
    }
  }

  async function save(t, force = false) {
    if (!t.model || t.untitled) return;
    clearTimeout(t.timer);
    while (t.saving) await t.saving;
    if (!tabs.includes(t) && !force) return;
    if (!dirty(t) || (t.conflict && !force)) return;
    const version = t.model.getAlternativeVersionId();
    t.saving = files('write', { path: t.path, text: t.model.getValue(), bom: !!t.bom, base: force ? null : t.mtime });
    const r = await t.saving;
    t.saving = null;
    if (r.conflict) t.conflict = true;
    else if (r.error) t.error = r.error;
    else Object.assign(t, { mtime: r.mtime, saved: version, conflict: false, gone: false, error: null });
    t.wasDirty = dirty(t);
    renderBanner();
    notify(true);
  }

  // A new file's first save: where it goes (a native Save panel), then it's that file.
  async function saveAs(t) {
    await model(t);
    const r = await files('saveAs', { name: `${t.name}.txt`, text: t.model.getValue() });
    if (r.cancelled) return false;
    if (r.error || !r.path) return say(`Couldn't save ${t.name}: ${r.error || 'no file'}`), false;
    Object.assign(t, { untitled: false, n: 0, path: r.path, name: name(r.path), mtime: r.mtime, app: r.app, bom: false });
    t.scope = scopeOf(r.path);
    t.md = t.scope === 'text.html.markdown';
    monaco.editor.setModelLanguage(t.model, await languageOf(t.scope));
    t.saved = t.model.getAlternativeVersionId();
    t.wasDirty = false;
    if (t === cur()) editor.updateOptions({ quickSuggestions: t.md || !t.scope ? false : QUICK });
    keepNew(true);
    notify(true);
    return true;
  }

  const saveAll = () => Promise.all(tabs.map((t) => save(t)));

  // ---------- the files on disk: read again when they change there (Claude wrote them) ----------
  let polling = false;
  const shown = () => document.visibilityState === 'visible' && !document.documentElement.classList.contains('paused');
  async function poll() {
    const list = tabs.filter((t) => t.path && t.model);
    if (!list.length || !shown() || polling) return;
    polling = true;
    try {
      const r = await files('stat', { paths: list.map((t) => t.path) });
      if (!r || r.error) return;
      for (const t of list) {
        if (!tabs.includes(t) || !(t.path in r)) continue;
        const m = r[t.path];
        if (m == null) {
          if (!t.gone) (t.gone = true), notify(true);
          continue;
        }
        if (t.gone) (t.gone = false), notify(true);
        if (t.saving || Math.abs(m - t.mtime) < 0.0005) continue;
        if (dirty(t)) {
          if (!t.conflict) (t.conflict = true), renderBanner();
          continue;
        }
        await reload(t);
      }
    } finally {
      polling = false;
    }
  }

  async function reload(t) {
    const r = await files('read', { path: t.path });
    if (r.error) return;
    Object.assign(t, { mtime: r.mtime, bom: r.bom, conflict: false });
    if (r.text !== t.model.getValue()) {
      const view = cur() === t && t.mode === 'code' && editor.getModel() === t.model ? editor.saveViewState() : null;
      t.reloading = true;
      t.model.pushEditOperations([], [{ range: t.model.getFullModelRange(), text: r.text }], () => null);
      t.model.pushStackElement();
      t.reloading = false;
      if (view) editor.restoreViewState(view);
    }
    t.saved = t.model.getAlternativeVersionId();
    t.wasDirty = false;
    if (cur() === t && t.mode === 'preview' && !host.hidden) renderPreview(t, true);
    renderBanner();
    notify(true);
  }
  setInterval(poll, 1500);
  document.addEventListener('visibilitychange', poll);
  addEventListener('focus', poll);
  addEventListener('blur', saveAll);

  // ---------- closing ----------
  // A tab goes after its changes are saved; a new file with text asks first, as VS Code does. False: it stays.
  async function close(id) {
    const t = byId(id);
    if (!t) return true;
    if (t.untitled && dirty(t)) {
      const i = await ask(`Do you want to save the changes you made to ${t.name}?`, "Your changes will be lost if you don't save them.", ['Save', "Don't Save"]);
      if (i < 0 || (i === 0 && !(await saveAs(t)))) return false;
    } else if (!t.untitled) {
      await save(t);
      // Changes the file on disk would lose: the banner asks first.
      if (t.conflict && dirty(t)) return false;
    }
    if (!tabs.includes(t)) return true;
    clearTimeout(t.timer);
    tabs.splice(tabs.indexOf(t), 1);
    if (editor?.getModel() === t.model) editor.setModel(null);
    t.model?.dispose();
    if (current === t.id) current = null;
    if (t.untitled) keepNew(true);
    notify(true);
    return true;
  }

  // ---------- the Markdown preview, VS Code's ----------
  let marked = null;
  const slug = (s) => s.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
  function resolve(dir, rel) {
    const parts = (p) => (WIN ? p.split(/[\\/]/) : p.split('/'));
    const out = parts(dir);
    for (const p of parts(rel)) {
      if (p === '..') out.length > 1 && out.pop();
      else if (p && p !== '.') out.push(p);
    }
    return out.join(SEP) || '/';
  }
  const elsewhere = (href) => /^[a-z][a-z0-9+.-]*:/i.test(href) && !/^file:/i.test(href);

  // Code as HTML in the diff's colours (git.js's .tc<n>), for the preview's code blocks.
  const FENCE = {
    ts: 'source.ts', typescript: 'source.ts', tsx: 'source.tsx', js: 'source.js', javascript: 'source.js', jsx: 'source.js.jsx',
    json: 'source.json', jsonc: 'source.json.comments', json5: 'source.json.comments', sh: 'source.shell', bash: 'source.shell',
    zsh: 'source.shell', shell: 'source.shell', console: 'source.shell', shellscript: 'source.shell', py: 'source.python',
    python: 'source.python', rb: 'source.ruby', rs: 'source.rust', yml: 'source.yaml', md: 'text.html.markdown',
    markdown: 'text.html.markdown', html: 'text.html.basic', cs: 'source.cs', csharp: 'source.cs', golang: 'source.go',
    ps1: 'source.powershell', makefile: 'source.makefile', objc: 'source.objc', env: 'source.env', docker: 'source.dockerfile',
  };
  function fenceScope(lang) {
    const L = window.__tmLanguages;
    return FENCE[lang] || L.ext[`.${lang}`] || Object.keys(L.labels).find((s) => L.labels[s].toLowerCase() === lang) || null;
  }
  async function codeHTML(code, scope) {
    const reg = await TM().init();
    const grammar = reg && (await reg.loadGrammar(scope));
    if (!grammar) return esc(code);
    let state = window.vscodetextmate.INITIAL;
    return code
      .split('\n')
      .map((line) => {
        const r = grammar.tokenizeLine2(line, state, 200);
        state = r.ruleStack;
        let out = '';
        for (let k = 0; k < r.tokens.length; k += 2) {
          const m = r.tokens[k + 1], f = (m & 0x7800) >>> 11;
          const text = line.slice(r.tokens[k], k + 2 < r.tokens.length ? r.tokens[k + 2] : line.length);
          out += `<span class="tc${(m & 0xff8000) >>> 15}"${f ? ` style="${f & 1 ? 'font-style:italic;' : ''}${f & 2 ? 'font-weight:bold;' : ''}"` : ''}>${esc(text)}</span>`;
        }
        return out;
      })
      .join('\n');
  }

  async function renderPreview(t, keepScroll) {
    marked ||= new window.MonacoExtras.Marked({ gfm: true });
    const scroll = keepScroll ? previewEl.scrollTop : t.scroll || 0;
    const text = t.model.getValue();
    const body = text.trim() ? window.MonacoExtras.purify.sanitize(marked.parse(text)) : '<p class="fe-empty">This file is empty.</p>';
    previewEl.innerHTML = `<div class="fe-md">${body}</div>`;
    // GitHub's anchors on the headings, for the links to them.
    const seen = {};
    for (const h of previewEl.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
      const s = slug(h.textContent);
      h.id = seen[s] ? `${s}-${seen[s]}` : s;
      seen[s] = (seen[s] || 0) + 1;
    }
    previewEl.scrollTop = scroll;
    // Pictures beside the file, from the app (the page reads no file outside its own).
    for (const img of previewEl.querySelectorAll('img[src]')) {
      const src = img.getAttribute('src');
      if (elsewhere(src) || src.startsWith('data:')) continue;
      img.removeAttribute('src');
      const rel = decodeURI(src.replace(/^file:\/\//i, ''));
      const path = WIN ? (absolute(rel) ? fromLink(rel) : resolve(folder(t.path), rel)) : src.startsWith('/') ? decodeURI(src) : resolve(folder(t.path), rel);
      files('image', { path }).then((r) => r.url && (img.src = r.url));
    }
    for (const code of previewEl.querySelectorAll('pre > code')) {
      const lang = (/language-([\w#+.-]+)/.exec(code.className) || [])[1];
      const scope = lang && fenceScope(lang.toLowerCase());
      if (scope) code.innerHTML = await codeHTML(code.textContent.replace(/\n$/, ''), scope);
    }
  }

  // A link in the preview: a heading of the file, a page in the browser, or a file beside it (here when it's text).
  previewEl.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href'), t = cur();
    if (href.startsWith('#')) return previewEl.querySelector(`[id="${CSS.escape(decodeURIComponent(href.slice(1)))}"]`)?.scrollIntoView({ block: 'start' });
    if (/^(https?|mailto):/i.test(href)) return files('openURL', { url: href });
    if (elsewhere(href) || !t || !t.path) return;
    const [rel, frag] = href.replace(/^file:\/\//i, '').split('#');
    const path = absolute(rel) ? fromLink(decodeURI(rel)) : resolve(folder(t.path), decodeURI(rel));
    const line = /^L(\d+)/.exec(frag || '');
    // `from`: the Markdown file the link is in; the app opens only what's beside it (its repository), after this click.
    files('openPath', { path, line: line ? +line[1] : null, cwd: t.cwd, from: t.path });
  });

  // ---------- the banner: a file changed on disk while it had unsaved changes, or a save that failed ----------
  function renderBanner() {
    const t = cur();
    bannerEl.hidden = !(t && (t.conflict || t.error));
    if (bannerEl.hidden) return;
    bannerEl.innerHTML = t.conflict
      ? `<span>${esc(t.name)} changed on disk while it had unsaved changes.</span>` +
        '<button type="button" data-fe="take-disk">Use the file on disk</button><button type="button" data-fe="keep-mine">Keep my changes</button>'
      : `<span>Couldn't save ${esc(t.name)}: ${esc(t.error)}</span><button type="button" data-fe="retry">Try again</button>`;
  }
  bannerEl.addEventListener('click', (e) => {
    const a = e.target.closest('[data-fe]')?.dataset.fe, t = cur();
    if (!a || !t) return;
    if (a === 'take-disk') reload(t);
    if (a === 'keep-mine') save(t, true);
    if (a === 'retry') (t.error = null), save(t);
  });

  // ---------- what git.js draws ----------
  function list() {
    const names = tabs.map((t) => t.name);
    return tabs.map((t) => ({
      id: t.id,
      name: t.name,
      path: t.path,
      tip: t.path ? `${tilde(t.path, t.home)}${t.gone ? ' • Deleted' : ''}` : t.name,
      twin: t.path && names.filter((n) => n === t.name).length > 1 ? name(folder(t.path)) : '',
      dirty: dirty(t),
      gone: !!t.gone,
      untitled: !!t.untitled,
    }));
  }

  // The toolbar's buttons: { act, icon (a codicon), title, label }.
  function actions(id) {
    const t = byId(id);
    if (!t) return [];
    const out = [];
    if (t.md) {
      out.push(t.mode === 'preview'
        ? { act: 'mode', icon: 'edit', title: `Edit the Markdown (${KEY.preview})`, label: 'Edit' }
        : { act: 'mode', icon: 'open-preview', title: `Open Preview (${KEY.preview})`, label: 'Preview' });
    }
    if (t.untitled) out.push({ act: 'save', icon: 'save', title: `Save As… (${KEY.save})` });
    else {
      out.push({ act: 'external', icon: 'go-to-file', title: `Open in ${t.app || 'its app'}` });
      out.push({ act: 'reveal', icon: 'folder-opened', title: WIN ? 'Reveal in File Explorer' : 'Reveal in Finder' });
    }
    return out;
  }

  function act(a) {
    const t = cur();
    if (!t) return;
    if (a === 'mode') return toggleMode();
    if (a === 'save') return saveAs(t);
    if (a === 'external') return save(t).then(() => files('external', { path: t.path }));
    if (a === 'reveal') return files('reveal', { path: t.path });
    if (a === 'goto') return editor && (editor.focus(), editor.trigger('status', 'editor.action.gotoLine'));
    if (a === 'problem') return editor && (editor.focus(), editor.trigger('status', 'editor.action.marker.next'));
  }

  // The path from the chat's folder (VS Code's breadcrumbs, from its workspace).
  function crumbs(id) {
    const t = byId(id);
    if (!t) return [];
    if (!t.path) return [t.name];
    const inside = t.cwd && under(t.path, t.cwd);
    return (inside ? t.path.slice(t.cwd.length + 1) : tilde(t.path, t.home)).split(WIN ? /[\\/]/ : '/').filter(Boolean);
  }

  // The status bar's part: the problems, the cursor, the indent, the encoding, the line ends, the language.
  function status(id) {
    const t = byId(id);
    if (!t || !t.model || !editor) return null;
    const marks = monaco.editor.getModelMarkers({ resource: t.model.uri });
    const out = {
      errors: marks.filter((m) => m.severity === monaco.MarkerSeverity.Error).length,
      warnings: marks.filter((m) => m.severity === monaco.MarkerSeverity.Warning).length,
      preview: t.mode === 'preview',
      encoding: t.bom ? 'UTF-8 with BOM' : 'UTF-8',
      eol: t.model.getEOL() === '\r\n' ? 'CRLF' : 'LF',
      language: t.scope ? TM().label(t.path) : 'Plain Text',
    };
    if (t.mode === 'code' && editor.getModel() === t.model) {
      const pos = editor.getPosition() || { lineNumber: 1, column: 1 };
      const sel = editor.getSelection();
      const o = t.model.getOptions();
      Object.assign(out, {
        line: pos.lineNumber,
        col: pos.column,
        selected: sel && !sel.isEmpty() ? t.model.getValueInRange(sel).length : 0,
        indent: o.insertSpaces ? `Spaces: ${o.indentSize}` : `Tab Size: ${o.tabSize}`,
      });
    }
    return out;
  }

  // VS Code's keys for what Monaco doesn't do itself, while a file shows: ⌘S saves (a new file asks where), ⇧⌘V toggles
  // a Markdown preview, ⇧⌘P opens the command palette. git.js takes ⌘W and ⌃Tab (the diff's tab too).
  addEventListener('keydown', (e) => {
    const t = cur();
    if (!t || host.hidden || !host.isConnected) return;
    const cmd = WIN ? e.ctrlKey && !e.metaKey && !e.altKey : e.metaKey && !e.ctrlKey && !e.altKey;
    const key = e.key.toLowerCase();
    const stop = () => (e.preventDefault(), e.stopPropagation(), true);
    if (cmd && !e.shiftKey && key === 's') return stop() && (t.untitled ? saveAs(t) : save(t));
    if (cmd && e.shiftKey && key === 'v') return stop() && toggleMode();
    if (cmd && e.shiftKey && key === 'p' && t.mode === 'code' && editor) return stop() && (editor.focus(), editor.trigger('keyboard', 'editor.action.quickCommand'));
  }, true);

  return {
    host,
    list,
    current: () => current,
    open,
    newFile: () => newFile(),
    show,
    close,
    actions,
    act,
    crumbs,
    status,
    focus,
    // The app quits: every file saved, the new ones kept for the next launch.
    flush: () => (keepNew(true), saveAll().then(() => true)),
    onChange: (fn) => (listener = fn),
  };
})();
