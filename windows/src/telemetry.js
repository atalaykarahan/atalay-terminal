'use strict';

// Asynchronous, append-only state logger for Orbit Time-Machine telemetry (%USERPROFILE%\.claude\orbit-telemetry.jsonl).
// Buffers session state transitions in memory and flushes in batches every 5 seconds via fs.createWriteStream.

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

function baseFileName(p) {
  if (typeof p !== 'string' || !p) return '';
  const norm = p.replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  return idx >= 0 ? norm.slice(idx + 1) : norm;
}

function cleanFileList(files) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const set = new Set();
  for (const f of files) {
    const b = baseFileName(f);
    if (b) set.add(b);
  }
  return [...set].sort();
}

class OrbitTelemetry {
  constructor(opts = {}) {
    const home = process.env.USERPROFILE || os.homedir();
    this.claudeDir = opts.claudeDir || process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
    this.filePath = opts.filePath || path.join(this.claudeDir, 'orbit-telemetry.jsonl');
    this.flushIntervalMs = typeof opts.flushIntervalMs === 'number' ? opts.flushIntervalMs : 5000;
    this.maxBufferSize = typeof opts.maxBufferSize === 'number' ? opts.maxBufferSize : 2000;

    this.buffer = [];
    this.lastBySid = new Map();
    this.stream = null;
    this.dirReady = false;
    this.stopped = false;
    this.flushing = Promise.resolve();
    this.timer = null;

    if (this.flushIntervalMs > 0) {
      this.timer = setInterval(() => {
        this.flush().catch(() => {});
      }, this.flushIntervalMs);
      if (typeof this.timer.unref === 'function') this.timer.unref();
    }
  }

  record(sid, status, cpu = 0, files = [], timestamp = Math.floor(Date.now() / 1000)) {
    if (this.stopped || typeof sid !== 'string' || !sid) return;
    const st = typeof status === 'string' && status ? status : 'ended';
    if (st === 'ended') {
      if (this.lastBySid.delete(sid)) {
        this._enqueue(sid, 'ended', 0, [], timestamp);
      }
      return;
    }
    const roundedCpu = Math.round(Number(cpu) || 0);
    const cleanFiles = cleanFileList(files);
    this._appendIfChanged(sid, st, roundedCpu, cleanFiles, timestamp);
  }

  recordSnapshot(snapshot, timestamp = Math.floor(Date.now() / 1000)) {
    if (this.stopped || !snapshot || !Array.isArray(snapshot.sessions)) return;
    const filesBySid = new Map();
    if (Array.isArray(snapshot.files)) {
      for (const f of snapshot.files) {
        if (!f) continue;
        const base = baseFileName(f.p || f.short || '');
        if (!base || !Array.isArray(f.editors)) continue;
        for (const e of f.editors) {
          const sid = e && e.s;
          if (typeof sid === 'string' && sid) {
            let list = filesBySid.get(sid);
            if (!list) filesBySid.set(sid, (list = []));
            list.push(base);
          }
        }
      }
    }

    const activeIds = new Set();
    for (const s of snapshot.sessions) {
      if (!s || typeof s.id !== 'string' || !s.id) continue;
      const sid = s.id;
      const status = typeof s.status === 'string' && s.status ? s.status : 'ended';
      const live = typeof s.live === 'boolean' ? s.live : status !== 'ended';
      if (!live || status === 'ended') {
        if (this.lastBySid.delete(sid)) {
          this._enqueue(sid, 'ended', 0, [], timestamp);
        }
        continue;
      }
      activeIds.add(sid);
      const cpu = Math.round(Number(s.cpu) || 0);
      const files = cleanFileList(filesBySid.get(sid) || []);
      this._appendIfChanged(sid, status, cpu, files, timestamp);
    }

    for (const sid of [...this.lastBySid.keys()]) {
      if (!activeIds.has(sid)) {
        this.lastBySid.delete(sid);
      }
    }
  }

  evict(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId) return;
    this.lastBySid.delete(sessionId);
  }

  stats() {
    return {
      trackedSessions: this.lastBySid.size,
      bufferedLines: this.buffer.length,
    };
  }

  async readHistory(maxAgeSeconds = 86_400) {
    await this.flush();
    let st;
    try {
      st = await fsp.stat(this.filePath);
    } catch {
      return [];
    }
    if (!st || st.size <= 0) return [];
    const maxBytes = 4 * 1024 * 1024;
    const offset = st.size > maxBytes ? st.size - maxBytes : 0;
    const len = st.size - offset;
    const fh = await fsp.open(this.filePath, 'r');
    let text = '';
    try {
      const buf = Buffer.allocUnsafe(len);
      const { bytesRead } = await fh.read(buf, 0, len, offset);
      text = buf.subarray(0, bytesRead).toString('utf8');
    } finally {
      await fh.close();
    }
    if (offset > 0) {
      const nl = text.indexOf('\n');
      if (nl >= 0) text = text.slice(nl + 1);
    }
    const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
    const out = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj && typeof obj.t === 'number' && obj.t >= cutoff) {
          out.push(obj);
        }
      } catch {}
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  }

  flush() {
    if (!this.buffer.length) return this.flushing;
    const batch = this.buffer;
    this.buffer = [];
    const payload = batch.join('\n') + '\n';
    this.flushing = this.flushing
      .then(() => this._writeBatch(payload))
      .catch(() => {});
    return this.flushing;
  }

  async stop() {
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
    this.buffer = [];
    this.lastBySid.clear();
    if (this.stream) {
      const s = this.stream;
      this.stream = null;
      await new Promise((resolve) => {
        s.end(() => resolve());
      });
    }
  }

  _appendIfChanged(sid, status, cpu, files, timestamp) {
    const sig = `${status}|${cpu}|${files.join(',')}`;
    if (this.lastBySid.get(sid) === sig) return;
    this.lastBySid.set(sid, sig);
    this._enqueue(sid, status, cpu, files, timestamp);
  }

  _enqueue(sid, status, cpu, files, timestamp) {
    const line = JSON.stringify({
      t: timestamp,
      sid,
      status,
      cpu,
      files,
    });
    this.buffer.push(line);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.splice(0, this.buffer.length - this.maxBufferSize);
    }
  }

  async _ensureStream() {
    if (this.stream && !this.stream.destroyed && !this.stream.writableEnded) {
      return this.stream;
    }
    if (!this.dirReady) {
      await fsp.mkdir(path.dirname(this.filePath), { recursive: true });
      this.dirReady = true;
    }
    const s = fs.createWriteStream(this.filePath, { flags: 'a', encoding: 'utf8' });
    s.on('error', () => {
      if (this.stream === s) this.stream = null;
    });
    this.stream = s;
    return s;
  }

  async _writeBatch(payload) {
    const s = await this._ensureStream();
    await new Promise((resolve, reject) => {
      s.write(payload, 'utf8', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

function createTelemetry(opts = {}) {
  return new OrbitTelemetry(opts);
}

module.exports = { OrbitTelemetry, createTelemetry };
