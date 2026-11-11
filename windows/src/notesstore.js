'use strict';
// The dashboard's notes (web/notes.js), kept in the app's data folder on this PC, as the Mac keeps them
// (NotesStore.swift): a file for each note and one for their order and the note pinned to the dashboard. Every file is
// encrypted (AES-256-GCM) and bound to its name, so a file copied over another doesn't open either. The key is made on
// this PC and kept in notes.key, sealed by Windows for this user (Electron's safeStorage).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// What a file starts with: that it's a note, and the version of how it's laid out. The same as on the Mac.
const HEADER = Buffer.from([0x6e, 0x6f, 0x74, 0x65, 1]);
// The file of the notes' order and the pinned one: a name no note has (theirs are letters, digits and dashes).
const INDEX = '_index';
const NAME = /^[A-Za-z0-9-]{1,100}$/;

function seal(plain, name, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.concat([HEADER, Buffer.from(name, 'utf8')]));
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([HEADER, iv, body, cipher.getAuthTag()]);
}

function open(file, name, key) {
  if (file.length < HEADER.length + 28 || !file.subarray(0, HEADER.length).equals(HEADER)) throw new Error(`${name} isn't a note`);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, file.subarray(HEADER.length, HEADER.length + 12));
  decipher.setAAD(Buffer.concat([HEADER, Buffer.from(name, 'utf8')]));
  decipher.setAuthTag(file.subarray(file.length - 16));
  return Buffer.concat([decipher.update(file.subarray(HEADER.length + 12, file.length - 16)), decipher.final()]);
}

// A file written whole or not at all; readable by this user only.
function writeWhole(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data, { mode: 0o600 });
  for (let i = 0; ; i++) {
    try {
      return fs.renameSync(tmp, file);
    } catch (err) {
      // Another program (an antivirus) holding the file a moment.
      if (i >= 4 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) {
        try {
          fs.unlinkSync(tmp);
        } catch {}
        throw err;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 30);
    }
  }
}

function createNotesStore({ dir, keyFile, safeStorage }) {
  let key = null;
  // Each file's content as read or written here: a note is written again only when it changed, and only a file read or
  // written here is ever deleted (one that couldn't be read stays as it is).
  const known = new Map();
  let queue = Promise.resolve();

  const fileOf = (name) => path.join(dir, `${name}.note`);
  const stored = () => {
    try {
      return fs.readdirSync(dir).filter((n) => n.endsWith('.note')).map((n) => n.slice(0, -5));
    } catch {
      return [];
    }
  };

  // The key, made the first time only while there's no note it would have to read.
  async function theKey(create) {
    if (key) return key;
    if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error("Windows can't protect the notes' key right now");
    let sealed = null;
    try {
      sealed = fs.readFileSync(keyFile);
    } catch {}
    if (sealed) {
      const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(sealed);
      const k = Buffer.from(result, 'base64');
      if (k.length !== 32) throw new Error("the notes' key is damaged");
      if (shouldReEncrypt) writeWhole(keyFile, await safeStorage.encryptStringAsync(result));
      return (key = k);
    }
    if (!create || stored().length) throw new Error("the notes' key is missing");
    const k = crypto.randomBytes(32);
    fs.mkdirSync(path.dirname(keyFile), { recursive: true });
    writeWhole(keyFile, await safeStorage.encryptStringAsync(k.toString('base64')));
    return (key = k);
  }

  // Every note, in their order, as the page keeps them ({ v, ordered, pinned, current, notes }, JSON); null when there
  // are none yet.
  async function load() {
    const names = stored();
    if (!names.length) return null;
    const k = await theKey(false);
    let index = {};
    const notes = new Map();
    for (const name of names) {
      if (name !== INDEX && !NAME.test(name)) continue;
      let plain;
      let object;
      try {
        plain = open(fs.readFileSync(fileOf(name)), name, k);
        object = JSON.parse(plain.toString('utf8'));
      } catch {
        continue;
      }
      if (!object || typeof object !== 'object') continue;
      known.set(name, plain.toString('utf8'));
      if (name === INDEX) index = object;
      else if (object.id === name) notes.set(name, object);
    }
    const order = (Array.isArray(index.order) ? index.order : []).filter((id) => notes.has(id));
    const rest = [...notes.keys()].filter((id) => !order.includes(id)).sort((a, b) => (Number(notes.get(b).at) || 0) - (Number(notes.get(a).at) || 0));
    const pad = { v: 3, ordered: index.ordered === true, notes: [...order, ...rest].map((id) => notes.get(id)) };
    if (typeof index.pinned === 'string') pad.pinned = index.pinned;
    if (typeof index.current === 'string') pad.current = index.current;
    return JSON.stringify(pad);
  }

  function put(object, name, k) {
    const plain = JSON.stringify(object);
    if (known.get(name) === plain) return;
    writeWhole(fileOf(name), seal(Buffer.from(plain, 'utf8'), name, k));
    known.set(name, plain);
  }

  // The notes as the page has them now (JSON): each that changed written again, each no longer there deleted.
  async function save(json) {
    const pad = JSON.parse(String(json));
    if (!pad || !Array.isArray(pad.notes)) throw new Error('bad request');
    const k = await theKey(true);
    fs.mkdirSync(dir, { recursive: true });
    const order = [];
    for (const note of pad.notes) {
      if (!note || typeof note.id !== 'string' || !NAME.test(note.id) || order.includes(note.id)) continue;
      order.push(note.id);
      put(note, note.id, k);
    }
    const index = { v: Number.isInteger(pad.v) ? pad.v : 3, ordered: pad.ordered !== false, order };
    if (typeof pad.pinned === 'string') index.pinned = pad.pinned;
    if (typeof pad.current === 'string') index.current = pad.current;
    put(index, INDEX, k);
    const keep = new Set([...order, INDEX]);
    for (const name of [...known.keys()]) {
      if (keep.has(name)) continue;
      try {
        fs.unlinkSync(fileOf(name));
      } catch {}
      known.delete(name);
    }
  }

  // { type: 'load' } answers { json } (null with no notes yet), { type: 'save', json } answers { ok }; either answers
  // { error } when it can't. One at a time, in the order they came.
  function handle(body) {
    const run = queue.then(async () => {
      if (body.type === 'load') return { json: await load() };
      if (body.type === 'save') {
        await save(body.json);
        return { ok: true };
      }
      throw new Error('unknown request');
    });
    queue = run.catch(() => {});
    return run.catch((err) => ({ error: String((err && err.message) || err) }));
  }

  return { handle };
}

module.exports = { createNotesStore, seal, open };
