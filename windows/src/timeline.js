'use strict';
// The time machine's record (the map's ⟲ button, app.js), as Timeline.swift keeps it on the Mac: a line per change of a
// session's status, and one per launch, kept for the last 24 hours in the app's own folder. Written as the state comes
// (main.js), read only when the page asks; nothing is read at launch.
const fsp = require('fs/promises');
const path = require('path');

const KEEP = 24 * 3600_000;

function createTimeline(dir) {
  const file = path.join(dir, 'timeline.jsonl');
  const last = new Map(); // session id -> its status as last written
  let booted = false, trimmed = 0, chain = Promise.resolve();
  // One file operation at a time: a cut back to 24 hours mustn't lose a line appended meanwhile.
  const run = (fn) => (chain = chain.then(fn).catch(() => {}));
  const lines = async (since) => {
    const all = (await fsp.readFile(file, 'utf8').catch(() => '')).split('\n').filter(Boolean);
    const kept = all.filter((l) => {
      try {
        return JSON.parse(l).t >= since;
      } catch {
        return false;
      }
    });
    return { all, kept };
  };
  return {
    /** `live`: engine.live(), the sessions running now; one gone from it since has ended. */
    record(live) {
      const now = Date.now(), out = [], seen = new Set();
      if (!booted) {
        booted = true;
        // The sessions a launch doesn't list again ended while the app was closed (the page's tmAt).
        out.push({ t: now, k: 'boot' });
      }
      for (const s of live) {
        seen.add(s.sessionId);
        if (last.get(s.sessionId) === s.status) continue;
        last.set(s.sessionId, s.status);
        out.push({ t: now, s: s.sessionId, st: s.status, n: s.name, c: s.cwd, ...(s.waitingFor ? { w: s.waitingFor } : {}) });
      }
      for (const [sid, st] of last) {
        if (seen.has(sid)) continue;
        last.delete(sid);
        if (st !== 'ended') out.push({ t: now, s: sid, st: 'ended' });
      }
      if (!out.length) return chain;
      const text = out.map((l) => JSON.stringify(l) + '\n').join('');
      return run(async () => {
        if (now - trimmed > 3600_000) {
          trimmed = now;
          const { all, kept } = await lines(now - KEEP);
          if (kept.length < all.length) {
            await fsp.writeFile(file + '.tmp', kept.map((l) => l + '\n').join(''));
            await fsp.rename(file + '.tmp', file);
          }
        }
        await fsp.mkdir(dir, { recursive: true });
        await fsp.appendFile(file, text);
      });
    },
    /** The last 24 hours' lines, parsed, once what's being written is. */
    read: () => run(() => {}).then(() => lines(Date.now() - KEEP)).then(({ kept }) => kept.map((l) => JSON.parse(l))),
  };
}

module.exports = { createTimeline };
