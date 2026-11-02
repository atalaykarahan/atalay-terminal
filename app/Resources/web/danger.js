'use strict';
// Runaway processes, as the app finds them: one of yours left burning a CPU core where nobody sees it, its parent gone
// and no terminal (a shell's leftover helper, a stuck script). The alarm itself sounds in the middle of the screen (the
// notices panel, messages.js); this is its Details card, which the alarm's button or the burning blue box on the orbit
// opens: a line or two for each, and END IT. It sits at the map's right, so the camera flying to the box stays in sight.
window.Danger = (() => {
  let list = [];
  let panel = null, sure = null, sureTimer = 0;
  const ending = new Set();
  const key = (r) => `${r.pid}:${r.started}`;
  const send = (msg) => {
    try {
      window.webkit.messageHandlers.radar.postMessage(msg);
    } catch {}
  };
  const dur = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s} s`;
    if (s < 3600) return `${Math.floor(s / 60)} min`;
    const h = s / 3600;
    return `${h < 10 ? h.toFixed(1).replace(/\.0$/, '') : Math.round(h)} h`;
  };

  function update(next) {
    list = Array.isArray(next) ? next : [];
    const now = new Set(list.map(key));
    for (const k of [...ending]) if (!now.has(k)) ending.delete(k);
    if (panel) render();
  }

  function open(pid) {
    if (!list.length) return;
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'danger-panel';
      panel.addEventListener('click', onClick);
      addEventListener('keydown', onKey, true);
      document.body.appendChild(panel);
    }
    render();
    window.Orbit?.focusRunaway?.(pid ?? list[0].pid);
  }

  function close() {
    if (!panel) return;
    panel.remove();
    panel = null;
    sure = null;
    removeEventListener('keydown', onKey, true);
  }

  function onKey(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close();
  }

  function render() {
    if (!list.length) return close();
    const now = Date.now(), first = !panel.firstElementChild;
    panel.innerHTML =
      `<div class="dp${first ? ' in' : ''}"><div class="dp-head"><b>⚠ ENGINE FAILURE</b><button type="button" class="dp-x" title="Close (Esc)">✕</button></div>` +
      `<p class="dp-sub">${list.length === 1 ? 'A process was' : `${list.length} processes were`} left running with no terminal, burning the CPU.</p>` +
      list.map((r) => {
        const k = key(r);
        const btn = ending.has(k) ? '<button type="button" class="dp-end" disabled>ENDING…</button>'
          : `<button type="button" class="dp-end${sure === k ? ' sure' : ''}">${sure === k ? 'SURE?' : 'END IT'}</button>`;
        return (
          `<div class="dp-row" data-key="${esc(k)}"><div class="dp-l1"><b>${esc(r.name)}</b><span class="dp-cpu">${Math.round(r.cpu)}%</span>${btn}</div>` +
          `<div class="dp-l2" title="${esc(r.cmd)}">PID ${r.pid} · for ${dur(now - r.since)} · ${esc(r.cmd)}</div></div>`
        );
      }).join('') +
      '</div>';
  }

  function onClick(e) {
    if (e.target.closest('.dp-x')) return close();
    const row = e.target.closest('.dp-row');
    const r = row && list.find((x) => key(x) === row.dataset.key);
    if (!r || !e.target.closest('.dp-end')) return;
    // Two clicks, as anything that can't be undone.
    if (sure !== key(r)) {
      sure = key(r);
      clearTimeout(sureTimer);
      sureTimer = setTimeout(() => {
        sure = null;
        if (panel) render();
      }, 3000);
      return render();
    }
    sure = null;
    ending.add(key(r));
    send({ type: 'endRunaway', pid: r.pid, started: r.started });
    impact(e.target.closest('.dp-end'));
    window.Orbit?.blowUp?.(r.pid);
    render();
  }

  // A hit you feel, as in games: a punch from the speakers, sparks flying off the button, the card jolting; on the orbit
  // the box blows up with its own blast (Orbit.blowUp).
  function impact(btn) {
    window.Sfx?.play('hit');
    setTimeout(() => window.Sfx?.play('boom'), 120);
    panel.classList.remove('hit');
    void panel.offsetWidth;
    panel.classList.add('hit');
    setTimeout(() => panel && panel.classList.remove('hit'), 400);
    if (!btn) return;
    const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const layer = document.createElement('div');
    layer.className = 'dp-burst';
    document.body.appendChild(layer);
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('i');
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 100, size = 3 + Math.random() * 5;
      p.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${['#ff2e2e', '#ffb057', '#fff3e6'][i % 3]}`;
      layer.appendChild(p);
      p.animate([{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0.2)`, opacity: 0 }],
        { duration: 450 + Math.random() * 350, easing: 'cubic-bezier(0.15, 0.8, 0.3, 1)', fill: 'forwards' });
    }
    const ring = document.createElement('b');
    ring.style.cssText = `left:${cx}px;top:${cy}px`;
    layer.appendChild(ring);
    ring.animate([{ transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.9 }, { transform: 'translate(-50%, -50%) scale(3.4)', opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
    setTimeout(() => layer.remove(), 900);
  }

  return { update, open };
})();
