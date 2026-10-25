'use strict';

// App overlay panel: hosts the shortcut pie and the folder picker above every window.
// Provides the small helpers those shared scripts expect from the dashboard page.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
}

window.Overlay = {
  shortcuts(x, y) {
    window.Shortcuts.open(x, y);
  },
  newTerminal() {
    window.Picker.open({
      title: 'NEW TERMINAL',
      forLabel: 'choose the folder',
      onPick: (dir) => {
        API.newTerminal(dir, dir.replace(/\/+$/, '').split('/').pop());
        API.done();
      },
      onCancel: () => API.done(),
    });
  },
};
