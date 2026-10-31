'use strict';

// Source Control's editor (git.js opens files in it), as the user's VS Code shows a diff: coloured by VS Code's own
// highlighter (tm/: vscode-textmate with VS Code's grammars and the user's theme), lines wrapped as his
// `editor.wordWrap: on` wraps them (a wrapped line goes on under its own indent), sticky scroll, the whole file side by
// side or inline with VS Code's colours for removed and inserted lines and text, lines that differ only in their
// leading or trailing spaces left alone (`diffEditor.ignoreTrimWhitespace`), the middle gutter, the overview rulers (each
// editor's, with its scroll bar and cursor, and the diff's, where the changes are), colour swatches in CSS, Better
// Comments' colours, and GitLens's blame of the line clicked. The code looks as the user's terminals do: their font and
// colours (Theme.swift, passed by RadarView), VS Code's colour roles turned into the terminals' own.
window.GitEditor = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const git = (type, q = {}) =>
    window.webkit.messageHandlers.git.postMessage({ type, ...q }).catch((e) => ({ error: String((e && e.message) || e) }));
  const LINE = 20;

  // The terminals' look: their font and their 16 colours. The theme's colours (GitHub Dark Default's) are roles, and each
  // becomes the terminal colour with the same role, the way the terminals' palette was made from iTerm2's (Theme.swift).
  const LOOK = window.__terminalLook || {
    font: 'Menlo', size: 13, bg: '#251200', fg: '#f5ebe0', cursor: '#f88008',
    ansi: ['#562f18', '#ff4d4d', '#c5e35a', '#ffd23f', '#c16100', '#e0849c', '#ff7345', '#ffb27a', '#7d6553', '#ff5c8a', '#ddf08f', '#ffe28a', '#f88008', '#ffa8c4', '#ff9b73', '#fff3e6'],
  };
  const A = LOOK.ansi;
  const mix = (c, base, k) => {
    const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [n(c), n(base)];
    return `#${x.map((v, i) => Math.round(v * k + y[i] * (1 - k)).toString(16).padStart(2, '0')).join('')}`;
  };
  const ROLE = {
    '#ff7b72': A[1], // keywords, storage, units: red
    '#79c0ff': A[12], // constants, numbers, properties: bright blue (the brand orange)
    '#a5d6ff': A[14], // strings: bright cyan (light coral)
    '#d2a8ff': A[13], // functions: bright magenta
    '#ffa657': A[3], // variables, types, parameters: yellow (amber)
    '#7ee787': A[2], // tags, selectors: green
    '#8b949e': A[8], // comments: bright black
    '#e6edf3': LOOK.fg,
    '#ffa198': A[9], // invalid, deleted: bright red
    '#f0f6fc': A[15],
    '#161b22': LOOK.bg,
    '#490202': mix(A[1], LOOK.bg, 0.25),
    '#04260f': mix(A[2], LOOK.bg, 0.2),
    '#5a1e02': mix(A[6], LOOK.bg, 0.3),
  };
  function terminalTheme(theme) {
    const role = (c) => (c && ROLE[c.toLowerCase()]) || c;
    return {
      name: 'terminal',
      settings: theme.settings.map((t, i) =>
        i === 0 ? { settings: { foreground: LOOK.fg, background: LOOK.bg } } : { ...t, settings: { ...t.settings, foreground: role(t.settings?.foreground), background: role(t.settings?.background) } },
      ),
    };
  }
  {
    const root = document.documentElement.style;
    root.setProperty('--code-font', `"${LOOK.font}", Menlo, monospace`);
    root.setProperty('--code-size', `${LOOK.size}px`);
    root.setProperty('--code-bg', LOOK.bg);
    root.setProperty('--code-fg', LOOK.fg);
    root.setProperty('--code-cursor', LOOK.cursor);
    A.forEach((c, i) => root.setProperty(`--a${i}`, c));
  }
  const store = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };
  const stored = (k, d) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  };

  // ---------- VS Code's highlighter ----------
  const TM = (() => {
    let ready = null, registry = null;
    const loaded = {};
    window.__tmGrammar = (scope, grammar) => (loaded[scope] = grammar);
    const script = (src) =>
      new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = ok;
        s.onerror = fail;
        document.head.appendChild(s);
      });
    function init() {
      if (ready) return ready;
      ready = (async () => {
        await script('tm/textmate.js');
        await script('tm/theme.js');
        await script('tm/languages.js');
        const wasm = Uint8Array.from(atob(window.__onigWasm), (c) => c.charCodeAt(0));
        await window.onig.loadWASM(wasm.buffer);
        registry = new window.vscodetextmate.Registry({
          onigLib: Promise.resolve({ createOnigScanner: (p) => new window.onig.OnigScanner(p), createOnigString: (s) => new window.onig.OnigString(s) }),
          loadGrammar: async (scope) => {
            if (!window.__tmLanguages.scopes.includes(scope)) return null;
            if (!loaded[scope]) await script(`tm/grammars/${scope}.js`).catch(() => {});
            return loaded[scope] || null;
          },
        });
        registry.setTheme(terminalTheme(window.__tmTheme));
        // One class a colour: .tc<n>.
        const sheet = document.head.appendChild(document.createElement('style')).sheet;
        registry.getColorMap().forEach((c, i) => c && sheet.insertRule(`#git .tc${i} { color: ${c}; }`, sheet.cssRules.length));
        return registry;
      })().catch((e) => {
        console.warn('highlighter', e);
        return null;
      });
      return ready;
    }
    const scopeOf = (path) => {
      const L = window.__tmLanguages;
      const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
      if (L.names[name]) return L.names[name];
      const parts = name.split('.');
      for (let i = 1; i < parts.length; i++) if (L.ext[`.${parts.slice(i).join('.')}`]) return L.ext[`.${parts.slice(i).join('.')}`];
      return null;
    };
    // Each line's tokens: { e: end offset, c: colour, f: font style (1 italic, 2 bold, 4 underline, 8 strike), k: comment }.
    async function tokenize(lines, path) {
      const reg = await init();
      if (!reg) return null;
      const scope = scopeOf(path);
      const grammar = scope && (await reg.loadGrammar(scope));
      if (!grammar) return null;
      const out = new Array(lines.length);
      let state = window.vscodetextmate.INITIAL;
      for (let i = 0; i < lines.length; i++) {
        const text = lines[i] ?? '';
        if (text.length > 20000) {
          out[i] = [{ e: text.length, c: 1, f: 0, k: false }];
          continue;
        }
        const r = grammar.tokenizeLine2(text, state, 500);
        state = r.ruleStack;
        const t = r.tokens, toks = [];
        for (let k = 0; k < t.length; k += 2) {
          const meta = t[k + 1];
          toks.push({ e: k + 2 < t.length ? t[k + 2] : text.length, c: (meta & 0x00ff8000) >>> 15, f: (meta & 0x00007800) >>> 11, k: ((meta & 0x00000300) >>> 8) === 1 });
        }
        out[i] = toks;
      }
      return out;
    }
    const label = (path) => {
      const s = scopeOf(path);
      return s ? window.__tmLanguages.labels[s] || s : 'Plain Text';
    };
    return { init, tokenize, label, ready: () => !!registry };
  })();
  TM.init();

  // Better Comments, with the user's tags: a comment starting with one takes its colour.
  const BETTER = [
    { tag: '!', color: '#FF2D00' },
    { tag: '?', color: '#3498DB' },
    { tag: '//', color: '#474747', strike: true },
    { tag: 'todo', color: '#FF8C00' },
    { tag: '*', color: '#98C379' },
  ];
  function betterComment(text, toks) {
    let pos = 0, body = '';
    for (const t of toks || []) {
      if (t.k) body += text.slice(pos, t.e);
      pos = t.e;
    }
    const rest = body.replace(/^\s*(\/\/|#|\/\*+|\*|<!--|--)\s?/, '').toLowerCase();
    return BETTER.find((b) => rest.startsWith(b.tag)) || null;
  }

  // CSS colour swatches (VS Code's colour decorators) before the colours a line spells out.
  const COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|\b(?:rgba?|hsla?)\(\s*[\d.]+(?:deg|%)?\s*(?:,\s*|\s+)[\d.]+%?\s*(?:,\s*|\s+)[\d.]+%?\s*(?:(?:,|\/)\s*[\d.]+%?\s*)?\)/g;
  const swatches = (text) => [...text.matchAll(COLOR)].map((m) => ({ at: m.index, html: `<span class="vs-sw" style="background:${esc(m[0])}"></span>` }));

  // A line as HTML: its tokens, the changed parts of a changed line (`marks`), swatches and the like (`inserts`).
  function lineHTML(text, toks, marks, inserts, css) {
    toks = toks || [{ e: text.length, c: 1, f: 0, k: false }];
    const better = toks.some((t) => t.k) ? betterComment(text, toks) : null;
    const extra = (css ? swatches(text) : []).concat(inserts || []).sort((a, b) => a.at - b.at);
    const cuts = new Set([0, text.length]);
    let pos = 0;
    for (const t of toks) cuts.add(Math.min(t.e, text.length)), (pos = t.e);
    for (const [s, e] of marks || []) cuts.add(Math.max(0, Math.min(s, text.length))), cuts.add(Math.max(0, Math.min(e, text.length)));
    for (const x of extra) cuts.add(Math.min(x.at, text.length));
    const points = [...cuts].sort((a, b) => a - b);
    let html = '', ti = 0, xi = 0;
    for (let i = 0; i < points.length; i++) {
      const at = points[i];
      while (xi < extra.length && extra[xi].at <= at) html += extra[xi++].html;
      if (i === points.length - 1) break;
      const end = points[i + 1];
      if (end <= at) continue;
      while (ti < toks.length - 1 && toks[ti].e <= at) ti++;
      const t = toks[ti];
      let cls = `tc${t.c}`;
      let style = '';
      if (better && t.k) (style = `color:${better.color}`), better.strike && (cls += ' vs-strike');
      if (t.f & 1) cls += ' vs-it';
      if (t.f & 2) cls += ' vs-bd';
      if (t.f & 4) cls += ' vs-ul';
      if (t.f & 8) cls += ' vs-strike';
      const piece = `<span class="${cls}"${style ? ` style="${style}"` : ''}>${esc(text.slice(at, end))}</span>`;
      html += (marks || []).some(([s, e]) => at >= s && end <= e && e > s) ? `<span class="vs-m">${piece}</span>` : piece;
    }
    return html || '';
  }

  // ---------- the model: rows of a diff ----------
  function parse(diff) {
    const lines = [];
    let a = 0, b = 0, hunks = 0;
    for (const line of diff.split('\n')) {
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (m) {
        if (hunks++) lines.push({ t: 'gap' });
        a = Number(m[1]);
        b = Number(m[2]);
        continue;
      }
      if (!hunks || line.startsWith('\\')) continue;
      const c = line[0], text = line.slice(1).replace(/\r$/, ''), cr = line.endsWith('\r');
      if (c === '+') lines.push({ t: '+', b: b++, text, cr });
      else if (c === '-') lines.push({ t: '-', a: a++, text, cr });
      else if (c === ' ') lines.push({ t: ' ', a: a++, b: b++, text, cr });
    }
    return lines;
  }

  // What changed inside a changed line: word by word, as VS Code marks it (whole line beyond 400 words).
  function charDiff(x, y) {
    const split = (s) => s.match(/\s+|[\p{L}\p{N}_$]+|[^\s\p{L}\p{N}_$]/gu) || [];
    const A = split(x), B = split(y);
    if (A.length * B.length > 160000) {
      let p = 0;
      while (p < x.length && p < y.length && x[p] === y[p]) p++;
      let s = 0;
      while (s < x.length - p && s < y.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
      return [[[p, x.length - s]], [[p, y.length - s]]];
    }
    const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const ma = [], mb = [];
    let i = 0, j = 0, pa = 0, pb = 0;
    const add = (list, s, e) => (list.length && list[list.length - 1][1] === s ? (list[list.length - 1][1] = e) : list.push([s, e]));
    while (i < n || j < m) {
      if (i < n && j < m && A[i] === B[j]) (pa += A[i++].length), (pb += B[j++].length);
      else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) add(mb, pb, (pb += B[j++].length));
      else add(ma, pa, (pa += A[i++].length));
    }
    return [ma, mb];
  }

  // A block of removed and inserted lines, as rows: lines equal but for their outer spaces stay together (VS Code's
  // ignoreTrimWhitespace), the rest pairs up (changed lines) or stands alone (removed, inserted).
  function align(del, add, ignoreTrim) {
    const rows = [];
    const pairUp = (d, p) => {
      for (let i = 0; i < Math.max(d.length, p.length); i++) {
        if (d[i] && p[i]) {
          const [ma, mb] = charDiff(d[i].text, p[i].text);
          rows.push({ kind: 'mod', a: d[i].a, b: p[i].b, ta: d[i].text, tb: p[i].text, ma, mb });
        } else if (d[i]) rows.push({ kind: 'del', a: d[i].a, ta: d[i].text });
        else rows.push({ kind: 'ins', b: p[i].b, tb: p[i].text });
      }
    };
    if (!ignoreTrim || del.length * add.length > 250000) return pairUp(del, add), rows;
    const n = del.length, m = add.length, A = del.map((l) => l.text.trim()), B = add.map((l) => l.text.trim());
    const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let i = 0, j = 0, si = 0, sj = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) {
        pairUp(del.slice(si, i), add.slice(sj, j));
        rows.push({ kind: 'eq', a: del[i].a, b: add[j].b, ta: del[i].text, tb: add[j].text });
        i++, j++, (si = i), (sj = j);
      } else if (L[i + 1][j] >= L[i][j + 1]) i++;
      else j++;
    }
    pairUp(del.slice(si), add.slice(sj));
    return rows;
  }

  function model(lines, ignoreTrim) {
    const rows = [];
    for (let k = 0; k < lines.length; ) {
      const l = lines[k];
      if (l.t === ' ') rows.push({ kind: 'eq', a: l.a, b: l.b, ta: l.text, tb: l.text }), k++;
      else if (l.t === 'gap') rows.push({ kind: 'gap' }), k++;
      else {
        const del = [], add = [];
        while (k < lines.length && lines[k].t === '-') del.push(lines[k++]);
        while (k < lines.length && lines[k].t === '+') add.push(lines[k++]);
        rows.push(...align(del, add, ignoreTrim));
      }
    }
    return rows;
  }

  // Long runs of unchanged lines folded away, three kept on each side of a change (VS Code's "collapse unchanged
  // regions"; on by itself for very long files).
  function fold(rows) {
    const near = new Uint8Array(rows.length);
    rows.forEach((r, i) => {
      if (r.kind !== 'eq') for (let k = Math.max(0, i - 3); k <= Math.min(rows.length - 1, i + 3); k++) near[k] = 1;
    });
    const out = [];
    for (let i = 0; i < rows.length; ) {
      if (near[i]) out.push(rows[i++]);
      else {
        let j = i;
        while (j < rows.length && !near[j]) j++;
        out.push({ kind: 'gap', n: j - i });
        i = j;
      }
    }
    return out;
  }

  // ---------- the view ----------
  const leading = (s) => {
    const m = /^[ \t]*/.exec(s)[0];
    let w = 0;
    for (const c of m) w = c === '\t' ? w + 4 - (w % 4) : w + 1;
    return w;
  };
  // A side's text as lines (by number) and their indents, for highlighting and sticky scroll.
  function sides(lines) {
    const A = [], B = [];
    for (const l of lines) {
      if (l.a) A[l.a] = l.text;
      if (l.b) B[l.b] = l.text;
    }
    return [A, B];
  }

  let view = null; // the open editor: { el, spec, rows, A, B, tokA, tokB, mode, ... }
  // Wrapped lines change height with the editor's width: the rulers and sticky scroll measure again.
  const resized = new ResizeObserver(() => view && measure());

  // A line: its number (inline, both numbers), the diff's sign column and its text, wrapped under its own indent.
  function lineCell(side, n, text, toks, cls, marks, css, sign, nums = [n]) {
    return (
      `<div class="vs-hl${cls}" data-s="${side}" data-l="${n}">${nums.map((x) => `<span class="vs-n">${x ?? ''}</span>`).join('')}<span class="vs-i${sign ? ` ${sign}` : ''}"></span>` +
      `<span class="vs-t" style="--ws:${leading(text)}ch">${lineHTML(text, toks, marks, null, css)}</span></div>`
    );
  }

  function render() {
    const v = view;
    const css = /\.(css|scss|less)$/i.test(v.spec.path);
    let rows = model(v.lines, v.ignoreTrim);
    if (v.collapse || rows.length > 6000) rows = fold(rows);
    v.rows = rows;
    const adds = rows.some((r) => r.kind === 'ins' || r.kind === 'mod'), dels = rows.some((r) => r.kind === 'del' || r.kind === 'mod');
    const same = rows.some((r) => r.kind === 'eq');
    // A new file opens alone, a deleted one too (the git extension opens no diff for them).
    v.mode = (adds && !dels && !same) || (dels && !adds && !same) ? 'single' : v.inline ? 'inline' : 'split';
    const digits = Math.max(1, String(Math.max(v.A.length, v.B.length)).length);
    let html = '';
    v.single = adds ? 'b' : 'a';
    if (v.mode === 'single') {
      const side = v.single;
      for (const r of rows) {
        if (r.kind === 'gap') html += `<div class="vs-dr gap"><span>${r.n ? `${r.n} hidden lines` : '⋯'}</span></div>`;
        else {
          const n = side === 'b' ? r.b : r.a, text = side === 'b' ? r.tb : r.ta;
          html += `<div class="vs-dr">${lineCell(side, n, text, (side === 'b' ? v.tokB : v.tokA)?.[n], '', null, css)}</div>`;
        }
      }
    } else if (v.mode === 'inline') {
      for (const r of rows) {
        if (r.kind === 'gap') {
          html += `<div class="vs-dr gap"><span>${r.n ? `${r.n} hidden lines` : '⋯'}</span></div>`;
          continue;
        }
        if (r.kind === 'eq') html += `<div class="vs-dr inl">${lineCell('b', r.b, r.tb, v.tokB?.[r.b], '', null, css, '', [r.a, r.b])}</div>`;
        if (r.kind === 'del' || r.kind === 'mod')
          html += `<div class="vs-dr inl">${lineCell('a', r.a, r.ta, v.tokA?.[r.a], r.kind === 'del' ? ' del whole' : ' del', r.ma, css, 'm', [r.a, ''])}</div>`;
        if (r.kind === 'ins' || r.kind === 'mod')
          html += `<div class="vs-dr inl">${lineCell('b', r.b, r.tb, v.tokB?.[r.b], r.kind === 'ins' ? ' ins whole' : ' ins', r.mb, css, 'p', ['', r.b])}</div>`;
      }
    } else {
      const fill = '<div class="vs-h fill"></div>';
      const cell = (side, r) => {
        const n = side === 'a' ? r.a : r.b, text = side === 'a' ? r.ta : r.tb, toks = (side === 'a' ? v.tokA : v.tokB)?.[n];
        const cls = r.kind === 'eq' ? '' : r.kind === 'mod' ? (side === 'a' ? ' del' : ' ins') : side === 'a' ? ' del whole' : ' ins whole';
        const sign = r.kind === 'eq' ? '' : side === 'a' ? 'm' : 'p';
        return `<div class="vs-h">${lineCell(side, n, text, toks, cls, side === 'a' ? r.ma : r.mb, css, sign)}<div class="vs-pad"></div></div>`;
      };
      for (const r of rows) {
        if (r.kind === 'gap') html += `<div class="vs-dr gap"><span>${r.n ? `${r.n} hidden lines` : '⋯'}</span></div>`;
        else if (r.kind === 'del') html += `<div class="vs-dr">${cell('a', r)}<div class="vs-mid"></div>${fill}</div>`;
        else if (r.kind === 'ins') html += `<div class="vs-dr">${fill}<div class="vs-mid"></div>${cell('b', r)}</div>`;
        else html += `<div class="vs-dr">${cell('a', r)}<div class="vs-mid"></div>${cell('b', r)}</div>`;
      }
    }
    v.el.className = `vs-dv ${v.mode}`;
    v.el.style.setProperty('--digits', Math.max(digits, 3));
    v.el.innerHTML =
      `<div class="vs-sc"><div class="vs-rows">${html}</div></div>` +
      (v.mode === 'split' ? '<div class="vs-sticky left"></div>' : '') +
      '<div class="vs-sticky right"></div>' +
      (v.mode === 'split' ? '<div class="vs-er left"><div class="vs-cur"></div><div class="vs-slider"></div></div>' : '') +
      '<div class="vs-er right"><div class="vs-cur"></div><div class="vs-slider"></div></div>' +
      (v.mode === 'single' ? '' : '<div class="vs-dov"><div class="vs-marks"></div><div class="vs-vp"></div></div>');
    v.sc = v.el.querySelector('.vs-sc');
    v.rowEls = [...v.el.querySelectorAll('.vs-dr')];
    v.cursor = null;
    measure();
    v.sc.addEventListener('scroll', onScroll, { passive: true });
    wireRulers();
    resized.disconnect();
    resized.observe(v.sc);
  }

  // Row tops (wrapped lines make them uneven), the diff ruler's marks, sliders and sticky scroll follow from them.
  function measure() {
    const v = view;
    if (!v || !v.sc) return;
    v.tops = v.rowEls.map((el) => el.offsetTop);
    const total = v.sc.scrollHeight || 1;
    const marks = v.el.querySelector('.vs-marks');
    if (marks) {
      let html = '';
      const span = (from, to, cls) => {
        const top = v.tops[from], bottom = to + 1 < v.tops.length ? v.tops[to + 1] : total;
        html += `<div class="vs-mk ${cls}" style="top:${(top / total) * 100}%;height:max(2px,${((bottom - top) / total) * 100}%)"></div>`;
      };
      for (const [side, kinds] of [['a', ['del', 'mod']], ['b', ['ins', 'mod']]]) {
        let start = -1;
        v.rows.forEach((r, i) => {
          const on = kinds.includes(r.kind);
          if (on && start < 0) start = i;
          if (!on && start >= 0) span(start, i - 1, side), (start = -1);
        });
        if (start >= 0) span(start, v.rows.length - 1, side);
      }
      marks.innerHTML = html;
    }
    onScroll();
  }

  function onScroll() {
    const v = view;
    if (!v || !v.sc) return;
    const { scrollTop, scrollHeight, clientHeight } = v.sc;
    const total = scrollHeight || 1;
    for (const ruler of v.el.querySelectorAll('.vs-er, .vs-dov')) {
      const h = ruler.clientHeight;
      const slider = ruler.querySelector('.vs-slider, .vs-vp');
      const size = Math.max(ruler.classList.contains('vs-dov') ? 4 : 20, (clientHeight / total) * h);
      slider.style.height = `${size}px`;
      slider.style.top = `${(scrollTop / Math.max(1, total - clientHeight)) * (h - size) || 0}px`;
      slider.hidden = scrollHeight <= clientHeight + 1 && !ruler.classList.contains('vs-dov');
    }
    sticky();
  }

  // Sticky scroll: the lines opening the blocks the top line sits in, pinned above it (five at most), on each side.
  function sticky() {
    const v = view;
    let lo = 0, hi = v.tops.length - 1, top = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (v.tops[mid] <= v.sc.scrollTop) (top = mid), (lo = mid + 1);
      else hi = mid - 1;
    }
    const right = v.mode === 'single' ? v.single : 'b';
    for (const [cls, side] of [['left', 'a'], ['right', right]]) {
      const texts = side === 'a' ? v.A : v.B, toks = side === 'a' ? v.tokA : v.tokB;
      const box = v.el.querySelector(`.vs-sticky.${cls}`);
      if (!box) continue;
      let line = 0;
      for (let i = top; i < v.rows.length && !line; i++) line = v.rows[i][side] || 0;
      const heads = [];
      if (line && v.sc.scrollTop > 0) {
        let indent = leading(texts[line] ?? '');
        if (!(texts[line] ?? '').trim()) indent = 1e9;
        for (let i = line - 1; i >= 1 && heads.length < 5 && indent > 0; i--) {
          const t = texts[i];
          if (t === undefined || !t.trim()) continue;
          const w = leading(t);
          if (w < indent) heads.unshift(i), (indent = w);
        }
      }
      const css = /\.(css|scss|less)$/i.test(v.spec.path);
      const html = heads.map((n) => `<div class="vs-hl" data-s="${side}" data-l="${n}"><span class="vs-n">${n}</span><span class="vs-i"></span><span class="vs-t">${lineHTML(texts[n], toks?.[n], null, null, css)}</span></div>`).join('');
      if (box.__h !== html) (box.innerHTML = html), (box.__h = html);
      box.hidden = !heads.length;
    }
  }

  // The rulers take the mouse: their sliders drag, a click elsewhere jumps there.
  function wireRulers() {
    const v = view;
    for (const ruler of v.el.querySelectorAll('.vs-er, .vs-dov')) {
      ruler.addEventListener('wheel', (e) => (v.sc.scrollTop += e.deltaY), { passive: true });
      ruler.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const slider = ruler.querySelector('.vs-slider, .vs-vp');
        const rect = ruler.getBoundingClientRect();
        const range = Math.max(1, rect.height - slider.offsetHeight);
        const maxScroll = v.sc.scrollHeight - v.sc.clientHeight;
        let grab = slider.offsetHeight / 2;
        if (e.target === slider) grab = e.clientY - slider.getBoundingClientRect().top;
        const move = (ev) => (v.sc.scrollTop = ((ev.clientY - rect.top - grab) / range) * maxScroll);
        move(e);
        slider.classList.add('on');
        const up = () => {
          removeEventListener('mousemove', move);
          removeEventListener('mouseup', up);
          slider.classList.remove('on');
        };
        addEventListener('mousemove', move);
        addEventListener('mouseup', up);
      });
    }
  }

  // A click on a line puts the cursor there: the line lights up, its number too, the rulers mark it, and GitLens's blame
  // of it shows at its end and in the status bar.
  let blameSeq = 0;
  async function place(lineEl, col) {
    const v = view;
    v.el.querySelectorAll('.vs-hl.cur').forEach((el) => el.classList.remove('cur'));
    v.el.querySelectorAll('.vs-blame').forEach((el) => el.remove());
    lineEl.classList.add('cur');
    const side = lineEl.dataset.s, line = Number(lineEl.dataset.l);
    v.cursor = { side, line, col };
    const row = lineEl.closest('.vs-dr');
    const total = v.sc.scrollHeight || 1;
    for (const ruler of v.el.querySelectorAll('.vs-er')) {
      const mine = v.mode !== 'split' || (side === 'a') === ruler.classList.contains('left');
      const cur = ruler.querySelector('.vs-cur');
      cur.hidden = !mine;
      cur.style.top = `${((row.offsetTop + 9) / total) * ruler.clientHeight}px`;
    }
    v.onCursor?.({ line, col, side });
    const my = ++blameSeq;
    const commit = side === 'b' ? (v.spec.kind === 'commit' ? v.spec.hash : '') : v.spec.kind === 'commit' ? v.spec.parent || '' : 'HEAD';
    const b = await git('blame', { root: v.spec.root, path: v.spec.path, line, commit });
    if (my !== blameSeq || b.error || view !== v) return v.onBlame?.(null);
    const uncommitted = /^0+$/.test(b.hash);
    const who = uncommitted || b.author === b.me ? 'You' : b.author;
    const when = uncommitted ? 'now' : ago(b.time * 1000);
    const text = uncommitted ? `${who}, ${when} • Uncommitted changes` : `${who}, ${when} • ${b.summary || ''}`;
    const t = lineEl.querySelector('.vs-t');
    // After the line's end and wrapping nothing (a zero-width box whose text runs on, cut at the editor's edge).
    if (lineEl.classList.contains('cur')) t.insertAdjacentHTML('beforeend', `<span class="vs-blame"><span>${esc(text)}</span></span>`);
    v.onBlame?.({ who, when, author: uncommitted ? 'You' : b.author, hash: b.hash, summary: b.summary, uncommitted });
  }

  const ago = (ms) => {
    const s = Math.max(0, (Date.now() - ms) / 1000);
    const unit = (n, w) => `${n} ${w}${n === 1 ? '' : 's'} ago`;
    if (s < 60) return 'just now';
    if (s < 3600) return unit(Math.floor(s / 60), 'minute');
    if (s < 86400) return unit(Math.floor(s / 3600), 'hour');
    if (s < 86400 * 30) return unit(Math.floor(s / 86400), 'day');
    if (s < 86400 * 365) return unit(Math.floor(s / 86400 / 30), 'month');
    return unit(Math.floor(s / 86400 / 365), 'year');
  };

  // Previous and next change: the starts of the changed blocks, the first shown when the diff opens.
  function reveal(step, first) {
    const v = view;
    if (!v?.rows) return;
    const starts = [];
    v.rows.forEach((r, i) => r.kind !== 'eq' && r.kind !== 'gap' && !(i > 0 && v.rows[i - 1].kind !== 'eq' && v.rows[i - 1].kind !== 'gap') && starts.push(i));
    if (!starts.length) return;
    v.at = first ? 0 : ((v.at ?? -1) + step + starts.length) % starts.length;
    v.sc.scrollTop = Math.max(0, v.tops[starts[v.at]] - v.sc.clientHeight / 3);
  }

  // How the file is laid out, for the status bar: its indent, its line ends, its language.
  function facts(lines) {
    let tabs = 0, spaces = 0;
    const steps = new Map();
    let prev = 0;
    for (const l of lines) {
      if (!l.text || !l.text.trim()) continue;
      const m = /^[ \t]*/.exec(l.text)[0];
      if (m.startsWith('\t')) tabs++;
      else if (m) {
        spaces++;
        const d = Math.abs(m.length - prev);
        if (d >= 2 && d <= 8) steps.set(d, (steps.get(d) || 0) + 1);
      }
      prev = m.startsWith('\t') ? prev : m.length;
    }
    const step = [...steps].sort((a, b) => b[1] - a[1])[0]?.[0] || 4;
    return { indent: tabs > spaces ? 'Tab Size: 4' : `Spaces: ${step}`, eol: lines.some((l) => l.cr) ? 'CRLF' : 'LF' };
  }

  // Opens a file: `spec` { root, path, staged, kind: 'change' | 'commit', hash, parent }. Answers the diff's facts (or
  // its error) for the tab and the status bar.
  async function open(el, spec, hooks) {
    const keep = view && view.spec.root === spec.root && view.spec.path === spec.path && view.spec.staged === spec.staged && view.spec.hash === spec.hash && view.sc ? view.sc.scrollTop : null;
    const d = await git('diff', { root: spec.root, path: spec.path, staged: !!spec.staged, commit: spec.kind === 'commit' ? spec.hash : '' });
    if (d.error || d.note || !d.diff) {
      view = null;
      el.className = 'vs-dv';
      el.innerHTML = `<div class="vs-note">${esc(d.error || d.note || 'No changes')}</div>`;
      return { abs: d.abs, note: d.error || d.note || 'No changes' };
    }
    const lines = parse(d.diff);
    const [A, B] = sides(lines);
    const v = {
      el, spec, lines, A, B, tokA: null, tokB: null, ...hooks,
      ignoreTrim: stored('git.ignoreTrim', '1') === '1', collapse: stored('git.collapse', '0') === '1', inline: stored('git.inline', '0') === '1',
    };
    // Coloured first if the highlighter is ready (else plain, coloured a moment later).
    const color = async () => {
      const [ta, tb] = await Promise.all([TM.tokenize(A, spec.path), TM.tokenize(B, spec.path)]);
      v.tokA = ta;
      v.tokB = tb;
    };
    if (TM.ready()) await color();
    view = v;
    render();
    if (keep !== null) v.sc.scrollTop = keep;
    else reveal(0, true);
    if (!v.tokA && !v.tokB) color().then(() => view === v && (v.tokA || v.tokB) && rerender());
    return { abs: d.abs, ...facts(lines), language: TM.label(spec.path) };
  }

  function rerender() {
    if (!view) return;
    const top = view.sc?.scrollTop || 0;
    render();
    view.sc.scrollTop = top;
  }

  function toggle(what) {
    if (!view) return;
    if (what === 'whitespace') (view.ignoreTrim = !view.ignoreTrim), store('git.ignoreTrim', view.ignoreTrim ? '1' : '0');
    if (what === 'collapse') (view.collapse = !view.collapse), store('git.collapse', view.collapse ? '1' : '0');
    if (what === 'inline') (view.inline = !view.inline), store('git.inline', view.inline ? '1' : '0');
    rerender();
  }

  // Clicks on lines place the cursor (the column from where the click fell in the text).
  document.addEventListener('mousedown', (e) => {
    const lineEl = e.target.closest('#git .vs-dv .vs-hl');
    if (!lineEl || !view || !view.el.contains(lineEl) || lineEl.closest('.vs-sticky')) return;
    let col = 1;
    const t = lineEl.querySelector('.vs-t');
    const r = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (r && t.contains(r.startContainer)) {
      const pre = document.createRange();
      pre.setStart(t, 0);
      pre.setEnd(r.startContainer, r.startOffset);
      col = pre.toString().length + 1;
    }
    place(lineEl, col);
  });
  // A sticky line takes you to its line.
  document.addEventListener('click', (e) => {
    const lineEl = e.target.closest('#git .vs-sticky .vs-hl');
    if (!lineEl || !view) return;
    const side = lineEl.dataset.s, n = Number(lineEl.dataset.l);
    const i = view.rows.findIndex((r) => r[side] === n);
    if (i >= 0) view.sc.scrollTop = view.tops[i];
  });

  return {
    open,
    close: () => (view = null),
    reveal,
    toggle,
    state: () => (view ? { ignoreTrim: view.ignoreTrim, collapse: view.collapse, inline: view.inline, mode: view.mode } : null),
    measure: () => view && measure(),
  };
})();
