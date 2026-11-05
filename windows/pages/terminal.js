'use strict';
// A chat or terminal, as a panel inside the dashboard window (main.js shows it, terminals.js runs its shell): xterm.js
// on the theme's palette, the way VS Code draws its terminal; typing and resizing go to the app, its output comes back.
// The strip on top shows the session's name and status from the dashboard's data.
(() => {
  const css = () => getComputedStyle(document.documentElement);
  const token = (k, d) => css().getPropertyValue(k).trim() || d;
  const palette = () => {
    const a = (i) => token(`--a${i}`, undefined);
    return {
      background: token('--code-bg', '#251200'), foreground: token('--code-fg', '#f5ebe0'), cursor: token('--code-cursor', '#f88008'),
      cursorAccent: token('--caret-text', '#1a0d00'), selectionBackground: token('--selection', '#f88008'), selectionForeground: token('--selection-text', '#1a0d00'),
      black: a(0), red: a(1), green: a(2), yellow: a(3), blue: a(4), magenta: a(5), cyan: a(6), white: a(7),
      brightBlack: a(8), brightRed: a(9), brightGreen: a(10), brightYellow: a(11), brightBlue: a(12), brightMagenta: a(13), brightCyan: a(14), brightWhite: a(15),
    };
  };
  const term = new Terminal({
    fontFamily: '"MesloLGS NF", "CaskaydiaCove Nerd Font", "Cascadia Mono", Consolas, monospace',
    fontSize: 14, lineHeight: 1.1, cursorBlink: true, scrollback: 10000, allowProposedApi: true,
    // Text never fades into its background (Claude's diffs paint lines green and red), as the Mac app's terminals do.
    minimumContrastRatio: 4.5, theme: palette(),
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.loadAddon(new Unicode11Addon.Unicode11Addon());
  term.unicode.activeVersion = '11';
  term.loadAddon(new WebLinksAddon.WebLinksAddon((e, uri) => atl.send('term:open', uri)));
  term.open(document.getElementById('term'));
  try {
    const webgl = new WebglAddon.WebglAddon();
    webgl.onContextLoss(() => webgl.dispose());
    term.loadAddon(webgl);
  } catch {}
  const size = () => ({ cols: term.cols, rows: term.rows });
  const refit = () => {
    try {
      fit.fit();
    } catch {}
  };
  refit();
  new ResizeObserver(refit).observe(document.getElementById('term'));
  addEventListener('resize', refit);
  addEventListener('focus', () => {
    refit();
    term.focus();
  });
  document.addEventListener('visibilitychange', () => !document.hidden && refit());
  addEventListener('themechange', () => (term.options.theme = palette()));
  term.onResize(({ cols, rows }) => atl.send('term:resize', { cols, rows }));
  term.onData((data) => atl.send('term:input', data));
  // The AI tool running in this window, as the app tells it (term:info), for the keys it needs.
  let tool = null;
  // Ctrl+C copies when something is selected (else it interrupts), Ctrl+V pastes: Windows Terminal's keys. The copy
  // goes through the app, as the page's clipboard API refuses a window without focus. Ctrl+V only keeps xterm.js from
  // sending ^V: the browser's own paste follows and xterm.js takes it (pasting here as well put everything in twice).
  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== 'keydown' || !e.ctrlKey || e.altKey) return true;
    const k = e.key.toLowerCase();
    if (k === 'c' && term.hasSelection()) {
      e.preventDefault();
      atl.send('term:copy', term.getSelection());
      term.clearSelection();
      return false;
    }
    // Ctrl+N (a new terminal), Ctrl+K (the shortcut wheel) and Ctrl+W (close the window: what runs in it goes on) are
    // the app's, as ⌘N, ⌘K and ⌘W are on the Mac: left unhandled, they reach its menu instead of the shell. Antigravity
    // approves its subagents' steps with Ctrl+K, so while it runs here the key is its own (the wheel is still Ctrl and
    // the middle mouse button away).
    if (k === 'k' && tool === 'Antigravity') return true;
    if (!e.shiftKey && (k === 'n' || k === 'k' || k === 'w')) return false;
    return k !== 'v';
  });
  atl.on('term:data', (data) => term.write(data));
  atl.on('term:exit', () => term.write('\r\n\x1b[2m[ended]\x1b[0m\r\n'));
  const STATUS = { busy: ['WORKING', '--accent'], idle: ['YOUR TURN', '--cyan'], waiting: ['NEEDS YOU', '--warn'], terminal: ['TERMINAL', '--cyan'], ended: ['ENDED', '--ended'] };
  atl.on('term:info', (i) => {
    tool = i.tool || null;
    document.getElementById('title').textContent = i.title || 'terminal';
    document.title = `${i.title || 'terminal'} · Atalay's Terminal`;
    const [label, color] = STATUS[i.status] || ['', '--dim'];
    document.getElementById('status').textContent = label;
    document.getElementById('where').textContent = i.cwd || '';
    document.body.style.setProperty('--st', `var(${color})`);
  });
  document.getElementById('hud').addEventListener('mousedown', (e) => e.preventDefault());
  document.getElementById('dash').onclick = () => {
    term.focus();
    atl.send('term:dashboard');
  };
  document.getElementById('end').onclick = () => atl.send('term:end');

  // The panel comes on and goes off as the dashboard's panels do (terminal.css): the app calls on() when it shows it
  // and off() before it hides it. A panel comes on by itself the first time.
  const root = document.documentElement;
  let onAt = 0, crtTimer = 0;
  const crt = (cls, ms) => {
    clearTimeout(crtTimer);
    root.classList.remove('crt-on', 'crt-off');
    void root.offsetWidth; // the animation starts again
    root.classList.add(cls);
    // Off stays off (its last frame) until the panel comes on again.
    if (cls === 'crt-on') {
      crtTimer = setTimeout(() => {
        root.classList.remove(cls);
        refit();
      }, ms);
    }
  };
  window.__panel = {
    on() {
      if (Date.now() - onAt < 200) return;
      onAt = Date.now();
      crt('crt-on', 720);
      term.focus();
    },
    off() {
      onAt = 0;
      crt('crt-off');
    },
  };
  window.__panel.on();
  // The one with the keys stands out when several are side by side (terminal.css).
  addEventListener('focus', () => root.classList.add('focused'));
  addEventListener('blur', () => root.classList.remove('focused'));
  if (document.hasFocus()) root.classList.add('focused');
  term.focus();
  atl.send('term:ready', size());
})();
