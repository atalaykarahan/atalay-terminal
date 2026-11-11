'use strict';
// End-to-end encrypted messages, as the Mac app's E2EE.swift (the two must seal and open the same bytes). A message to a
// friend who has a key is sealed here before it leaves the PC and opened here when it comes in; the server
// (api/src/e2ee.ts) only ever has sealed bytes, and the pages only ever get messages already open (they go through
// `social`), so no key is ever in a page.
//
// The keys:
// - this computer's own (X25519), in the vault: the account key's secret reaches it sealed to it;
// - the account's: a 32-byte secret on every computer of the account the user approved, from which an X25519 key
//   (sealing), an Ed25519 key (signing) and a key for the older generations are made. A computer leaving the account
//   brings a new generation, signed by the one before, the one before sealed in it, so old messages still open;
// - a conversation's, from the two accounts' keys, the same on both sides; each message has a key of its own from it.
// A computer new to the account is approved from another one of it (both show a code, the user compares them), or
// opens the copy sealed to the recovery key. Friends' keys are pinned the first time they're seen: a change that their
// old key didn't sign shows as a changed security code.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// ---------- the crypto (E2EECrypto) ----------

// A raw 32-byte key as Node takes it: wrapped as PKCS#8 (private) or SubjectPublicKeyInfo (public).
const DER = {
  xPriv: Buffer.from('302e020100300506032b656e04220420', 'hex'),
  xPub: Buffer.from('302a300506032b656e032100', 'hex'),
  edPriv: Buffer.from('302e020100300506032b657004220420', 'hex'),
  edPub: Buffer.from('302a300506032b6570032100', 'hex'),
};
const need32 = (raw) => {
  if (!Buffer.isBuffer(raw) || raw.length !== 32) throw new Error('bad key');
  return raw;
};
const xPrivate = (raw) => crypto.createPrivateKey({ key: Buffer.concat([DER.xPriv, need32(raw)]), format: 'der', type: 'pkcs8' });
const xPublic = (raw) => crypto.createPublicKey({ key: Buffer.concat([DER.xPub, need32(raw)]), format: 'der', type: 'spki' });
const edPrivate = (raw) => crypto.createPrivateKey({ key: Buffer.concat([DER.edPriv, need32(raw)]), format: 'der', type: 'pkcs8' });
const edPublic = (raw) => crypto.createPublicKey({ key: Buffer.concat([DER.edPub, need32(raw)]), format: 'der', type: 'spki' });
/** A private key's public half, raw. */
const publicOf = (priv) => crypto.createPublicKey(priv).export({ format: 'der', type: 'spki' }).subarray(-32);
/** X25519 of a private key and a raw public one. */
const agree = (priv, pubRaw) => crypto.diffieHellman({ privateKey: priv, publicKey: xPublic(pubRaw) });

const EMPTY = Buffer.alloc(0);
const utf8 = (s) => Buffer.from(String(s), 'utf8');
const b64 = (buf) => Buffer.from(buf).toString('base64');
/** Bytes from base64 as the API and the other apps write it, or null. */
const unb64 = (s) => (typeof s === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(s) && s.length % 4 === 0 ? Buffer.from(s, 'base64') : null);
const hkdf = (ikm, salt, info, count = 32) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, utf8(info), count));
const sha256 = (...parts) => {
  const h = crypto.createHash('sha256');
  for (const p of parts) h.update(p);
  return h.digest();
};

// AES-256-GCM as CryptoKit's "combined": the nonce (12 bytes), the ciphertext, the tag (16).
function gcmSeal(plain, key, aad) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(aad);
  const body = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, body, c.getAuthTag()]);
}
function gcmOpen(box, key, aad) {
  if (!Buffer.isBuffer(box) || box.length < 28) throw new Error('bad box');
  const d = crypto.createDecipheriv('aes-256-gcm', key, box.subarray(0, 12));
  d.setAAD(aad);
  d.setAuthTag(box.subarray(box.length - 16));
  return Buffer.concat([d.update(box.subarray(12, box.length - 16)), d.final()]);
}

/** A key's id: SHA-256 over its two public keys, the first 16 bytes in hex (the API checks it the same way). */
const kidOf = (x, ed) => sha256(x, ed).subarray(0, 16).toString('hex');

/** What a key's signatures cover (the API's `statement`). */
const statement = (account, gen, x, ed) => utf8(`orbiterm e2ee key v1\n${account}\n${gen}\n${b64(x)}\n${b64(ed)}`);

/**
 * Sealed to an X25519 public key: a one-time key's public half (32 bytes), then AES-GCM (nonce, ciphertext, tag) under
 * a key both sides make from the two. `context` says what it is for; it must be the same to open it.
 */
function seal(plain, pub, context) {
  const once = crypto.generateKeyPairSync('x25519');
  const opub = publicOf(once.privateKey);
  const key = hkdf(agree(once.privateKey, pub), Buffer.concat([opub, pub]), `orbiterm e2ee seal\n${context}`);
  return Buffer.concat([opub, gcmSeal(plain, key, utf8(context))]);
}
function open(sealed, priv, context) {
  if (!Buffer.isBuffer(sealed) || sealed.length <= 32 + 12 + 16) throw new Error('bad seal');
  const opub = sealed.subarray(0, 32);
  const key = hkdf(agree(priv, opub), Buffer.concat([opub, publicOf(priv)]), `orbiterm e2ee seal\n${context}`);
  return gcmOpen(sealed.subarray(32), key, utf8(context));
}

// AES-GCM under a key both sides already have (an older generation sealed in the next one's chain).
const lock = (plain, key, context) => gcmSeal(plain, key, utf8(context));
const unlock = (box, key, context) => gcmOpen(box, key, utf8(context));

/** The key of a conversation: X25519 of the two accounts' keys, the same whichever side makes it. */
const conversation = (mine, theirX) => hkdf(agree(mine.x, theirX), EMPTY, 'orbiterm e2ee dm');

// What a message's seal is bound to: its id and which keys sealed it (sender's, receiver's). The server can't move a
// message into another conversation or make it look as if the other side sent it.
const messageContext = (uuid, sk, rk) => utf8(`orbiterm e2ee msg v1\n${uuid}\n${sk}\n${rk}`);

/** A message: 16 random bytes (its own key is made from them and the conversation's), then AES-GCM. */
function sealMessage(plain, conv, uuid, sk, rk) {
  const salt = crypto.randomBytes(16);
  return b64(Buffer.concat([salt, gcmSeal(plain, hkdf(conv, salt, 'orbiterm e2ee msg'), messageContext(uuid, sk, rk))]));
}
function openMessage(ct, conv, uuid, sk, rk) {
  const d = unb64(ct);
  if (!d || d.length <= 16 + 12 + 16) throw new Error('bad message');
  return gcmOpen(d.subarray(16), hkdf(conv, d.subarray(0, 16), 'orbiterm e2ee msg'), messageContext(uuid, sk, rk));
}

// The recovery key: 32 letters and digits without the ones easy to mix up (no 0/O, 1/I).
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 20 random bytes as ORBI- and eight groups of four. */
function recoveryText(bytes) {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += LETTERS[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  return 'ORBI-' + out.match(/.{1,4}/g).join('-');
}

/** The 20 bytes back from what the user typed or pasted: any case, any dashes or spaces. Null when it isn't one. */
function recoveryBytes(text) {
  let s = [...String(text ?? '').toUpperCase()].filter((c) => /[\p{L}\p{N}]/u.test(c)).join('');
  if (s.startsWith('ORBI')) s = s.slice(4);
  if (s.length !== 32) return null;
  let bits = 0, value = 0;
  const out = [];
  for (const c of s) {
    const i = LETTERS.indexOf(c);
    if (i < 0) return null;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >> (bits - 8)) & 255);
      bits -= 8;
      value &= (1 << bits) - 1;
    }
  }
  return out.length === 20 ? Buffer.from(out) : null;
}

const recoveryKey = (bytes) => xPrivate(hkdf(bytes, EMPTY, 'orbiterm e2ee recovery'));

/**
 * The short code two computers of an account compare (three groups of four digits), and the key that signs what the
 * approving one sends after the user said they match.
 */
function compareCode(shared, info) {
  const b = hkdf(shared, EMPTY, `orbiterm e2ee sas\n${info}`, 6);
  const code = [0, 1, 2].map((i) => String(((b[i * 2] << 8) | b[i * 2 + 1]) % 10000).padStart(4, '0')).join(' ');
  return { code, mac: hkdf(shared, EMPTY, `orbiterm e2ee sas mac\n${info}`) };
}

/**
 * A friend's security code: 60 digits from both accounts' first keys (the start of their signed chains), the same on
 * both sides. It changes only when one of them started over (or someone came in between).
 */
function securityCode(a, b) {
  const half = ({ account, x, ed }) => {
    let h = Buffer.concat([utf8(`orbiterm e2ee security code v1\n${account}`), x, ed]);
    for (let i = 0; i < 1024; i++) h = crypto.createHash('sha512').update(h).update(x).update(ed).digest();
    let out = '';
    for (let i = 0; i < 6; i++) {
      let n = 0;
      // Five bytes: under 2^40, a number holds it whole.
      for (const byte of h.subarray(i * 5, i * 5 + 5)) n = n * 256 + byte;
      out += String(n % 100000).padStart(5, '0');
    }
    return out;
  };
  return [half(a), half(b)].sort().join('');
}

/** An account key, from its 32-byte secret. */
function accountKey(seed) {
  need32(seed);
  const x = xPrivate(hkdf(seed, EMPTY, 'orbiterm e2ee account x25519'));
  const ed = edPrivate(hkdf(seed, EMPTY, 'orbiterm e2ee account ed25519'));
  const xPub = publicOf(x), edPub = publicOf(ed);
  // `chain` seals the generation before this one.
  return { seed, x, ed, chain: hkdf(seed, EMPTY, 'orbiterm e2ee account chain'), xPub, edPub, kid: kidOf(xPub, edPub) };
}
const accountKeyOrNull = (seed) => {
  try {
    return accountKey(seed);
  } catch {
    return null;
  }
};

const signed = (edRaw, data, sig) => {
  try {
    return Buffer.isBuffer(sig) && sig.length === 64 && crypto.verify(null, data, edPublic(edRaw), sig);
  } catch {
    return false;
  }
};

/** A key as the API lists it, kept only when its id and its own signature check out; null otherwise. */
function listedKey(j) {
  if (!j || typeof j !== 'object') return null;
  const x = unb64(j.x), ed = unb64(j.ed), sig = unb64(j.sig);
  if (typeof j.kid !== 'string' || typeof j.account !== 'string' || !Number.isInteger(j.gen) || !x || x.length !== 32 || !ed || ed.length !== 32 || !sig) return null;
  if (kidOf(x, ed) !== j.kid || !signed(ed, statement(j.account, j.gen, x, ed), sig)) return null;
  // `account`: the one it was made for (its signature names it); not the account it's on now after a merge.
  return { kid: j.kid, account: j.account, gen: j.gen, x, ed, prev: unb64(j.prev), chain: unb64(j.chain), merged: j.merged === true };
}

/** Signed by the generation before it, so whoever trusted that one trusts this one. */
const follows = (k, older) => !!k.prev && older.account === k.account && older.gen === k.gen - 1 && signed(older.ed, statement(k.account, k.gen, k.x, k.ed), k.prev);

/** The account's key in use (its newest own generation), and the first key of the signed chain it's on; or null. */
function currentOf(keys, account) {
  const own = keys.filter((k) => k.account === account && !k.merged).sort((a, b) => b.gen - a.gen);
  if (!own.length) return null;
  let root = own[0];
  for (;;) {
    const older = own.find((k) => k.gen === root.gen - 1);
    if (!older || !follows(root, older)) break;
    root = older;
  }
  return { key: own[0], root };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v.filter(isObj) : []);

// ---------- the keys of this computer and its account (E2EE) ----------

/**
 * - `api(method, path, body)`: a call to the API with the token, resolving to its JSON or `{ error }` ("offline" when
 *   it can't be reached); only for paths made here.
 * - `pass(method, path, body)`: the same for a call a page made (checked against what pages may reach).
 * - `vault`: `{ load(), save(text) }`, both async: where the secret part lives (a file sealed by Windows for this
 *   user). `load` resolves to null when there's none yet and rejects when it's there but can't be read.
 * - `pinsFile`: friends' pinned keys (not secret), next to the app's other files.
 * - `onState(event)`: the pages hear about changes (an event of their own on the live line's way).
 */
function createE2EE({ api, pass, vault: vaultIO, pinsFile, onState }) {
  // off · starting · ready · locked
  let phase = 'off';
  // What this computer keeps secret: { account, device, devicePriv (base64), seeds: { kid: base64 }, recovery, recoverySeen }.
  let vault = { seeds: {} };
  let vaultLoaded = false;
  // GET /v1/e2ee/me, as last seen.
  let me = {};
  let ownKeys = [];
  const friendKeys = new Map();
  let refreshing = null;
  let again = false;
  let lastState = '';
  let lastError = null;
  // Friends' pinned keys: { [friend]: { root, verified, changed } }.
  let pins = {};
  let pinsLoaded = false;

  // ----- the vault -----

  async function loadVault() {
    if (vaultLoaded) return;
    const text = await vaultIO.load();
    vaultLoaded = true;
    if (!text) return;
    try {
      const v = JSON.parse(text);
      if (isObj(v)) vault = { ...v, seeds: isObj(v.seeds) ? v.seeds : {} };
    } catch {}
  }

  // Kept before anything that depends on it goes out: a key the server has and no computer does would lock the account.
  const saveVault = () => vaultIO.save(JSON.stringify(vault));

  function loadPins() {
    if (pinsLoaded) return;
    pinsLoaded = true;
    try {
      const p = JSON.parse(fs.readFileSync(pinsFile, 'utf8'));
      if (isObj(p)) pins = p;
    } catch {}
  }

  function savePins() {
    try {
      fs.mkdirSync(path.dirname(pinsFile), { recursive: true });
      const tmp = `${pinsFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(pins), { mode: 0o600 });
      fs.renameSync(tmp, pinsFile);
    } catch (e) {
      console.error('e2ee: pins', e);
    }
  }

  const devicePriv = () => {
    try {
      const raw = unb64(vault.devicePriv);
      return raw ? xPrivate(raw) : null;
    } catch {
      return null;
    }
  };

  // An account key this computer has, by its id.
  function key(kid) {
    const seed = unb64(vault.seeds[kid]);
    const k = seed && accountKeyOrNull(seed);
    return k && k.kid === kid ? k : null;
  }
  // A secret that makes the key named `kid`, or null.
  const seedFor = (kid, seed) => {
    const k = accountKeyOrNull(seed);
    return k && k.kid === kid ? seed : null;
  };

  const account = () => (typeof me.account === 'string' ? me.account : '');
  const device = () => (typeof me.device === 'string' ? me.device : '');
  const current = () => (currentOf(ownKeys, account()) || {}).key || null;

  // Contexts the seals are bound to.
  const boxContext = (k, dev) => `box\n${k.account}\n${k.kid}\n${dev}`;
  const backupContext = (k) => `backup\n${k.account}\n${k.kid}`;
  const importContext = (kid, to) => `import\n${kid}\n${to}`;
  const chainContext = (k) => `chain\n${k.account}\n${k.kid}`;

  // ----- calls -----

  /** An API call's answer as an object, null on an error (kept in lastError). */
  async function call(method, p, body) {
    let r = null;
    try {
      r = await api(method, p, body);
    } catch {}
    lastError = !isObj(r) ? 'offline' : typeof r.error === 'string' ? r.error : null;
    return lastError === null ? r : null;
  }

  // ----- keeping up -----

  /**
   * Brings the keys up to date (after start, a reconnect, a change on another computer). Calls while one runs make it
   * run once more after.
   */
  function wake() {
    if (!vaultIO) return;
    if (refreshing) {
      again = true;
      return;
    }
    refreshing = (async () => {
      do {
        again = false;
        try {
          await refreshNow();
        } catch (e) {
          console.error('e2ee:', e);
        }
      } while (again);
      refreshing = null;
    })();
  }

  /** Waits for the keys to be known, starting on them if nothing did yet. */
  async function settle() {
    if (!refreshing && (phase === 'off' || phase === 'starting')) wake();
    if (refreshing) await refreshing;
  }

  const take = (view) => {
    me = view;
    ownKeys = list(view.keys).map(listedKey).filter(Boolean);
  };

  async function refreshNow() {
    await loadVault();
    loadPins();
    if (phase === 'off') phase = 'starting';
    try {
      await refresh();
    } finally {
      publish();
    }
  }

  async function refresh() {
    let view = await call('GET', 'v1/e2ee/me');
    if (!view) return;
    const acc = typeof view.account === 'string' ? view.account : '', dev = typeof view.device === 'string' ? view.device : '';
    if (!acc || !dev) return;
    if (vault.device !== dev) {
      // This computer is someone new (signed out, or its token lost): nothing of the old account stays here.
      vault = { account: acc, device: dev, devicePriv: b64(crypto.randomBytes(32)), seeds: {}, recoverySeen: false };
      await saveVault();
      friendKeys.clear();
    } else if (vault.account !== acc) {
      // Its account joined another one: the keys it had came along there (merged), so they stay. The recovery key it had
      // was the account's it left: that one's recovery copy is gone, so it would open nothing here.
      vault.account = acc;
      delete vault.recovery;
      vault.recoverySeen = false;
      await saveVault();
      friendKeys.clear();
    }
    if (!devicePriv()) {
      vault.devicePriv = b64(crypto.randomBytes(32));
      await saveVault();
    }
    const dpriv = devicePriv();
    if (!dpriv) return;
    const dpub = publicOf(dpriv);
    const mine = list(view.devices).find((d) => d.me === true);
    if (!mine || mine.pub !== b64(dpub)) {
      view = await call('PUT', 'v1/e2ee/device', { pub: b64(dpub) });
      if (!view) return;
    }
    take(view);
    if (!current()) {
      view = await start(dpub);
      // Another computer of the account made it at the same moment: that one is the key.
      if (!view && lastError === 'gen_taken') view = await call('GET', 'v1/e2ee/me');
      if (!view) return;
      take(view);
    }
    const cur = current();
    if (!cur) return;
    await unlockAll(view, dpriv);
    phase = key(cur.kid) ? 'ready' : 'locked';
    if (phase !== 'ready') return;
    // A computer that had the key left the account: a new generation, for the ones still on it.
    if (view.rotate === true) {
      const v = await rotate(cur, view);
      if (v) {
        take(v);
        view = v;
        await unlockAll(v, dpriv);
      }
    }
    await keepBackup(view);
    await shareMerged(view);
  }

  /** The account's first key: made here, sealed for this computer and for a new recovery key. */
  async function start(dpub) {
    const k = accountKey(crypto.randomBytes(32));
    const recovery = crypto.randomBytes(20);
    const rpub = publicOf(recoveryKey(recovery));
    // Kept before it's sent: an answer lost on the way must not leave the account with a key nobody has.
    vault.seeds[k.kid] = b64(k.seed);
    vault.recovery = recoveryText(recovery);
    vault.recoverySeen = false;
    await saveVault();
    return publishKey(k, 1, null, null, [[device(), dpub]], rpub, true);
  }

  /**
   * Sends a new generation: signed by itself (and by the one before, if any), sealed for these computers and for the
   * recovery key.
   */
  async function publishKey(k, gen, prev, chain, devices, backupPub, newBackup) {
    const said = statement(account(), gen, k.xPub, k.edPub);
    const boxes = [];
    for (const [id, pub] of devices) {
      try {
        boxes.push({ device: id, box: b64(seal(k.seed, pub, `box\n${account()}\n${k.kid}\n${id}`)) });
      } catch {}
    }
    const body = { kid: k.kid, gen, x: b64(k.xPub), ed: b64(k.edPub), sig: b64(crypto.sign(null, said, k.ed)), boxes };
    if (prev) body.prev = b64(crypto.sign(null, said, prev.ed));
    if (chain) body.chain = b64(chain);
    if (backupPub) {
      try {
        const box = b64(seal(k.seed, backupPub, `backup\n${account()}\n${k.kid}`));
        body.backup = newBackup ? { pub: b64(backupPub), box } : { box };
      } catch {}
    }
    return call('POST', 'v1/e2ee/keys', body);
  }

  /**
   * Every key this computer can get at: the current one from its box, older generations through their chains, keys that
   * came with a merge through what's sealed for them.
   */
  async function unlockAll(view, dpriv) {
    let changed = false;
    for (const b of list(view.boxes)) {
      const k = typeof b.kid === 'string' && !vault.seeds[b.kid] && ownKeys.find((x) => x.kid === b.kid);
      const box = k && unb64(b.box);
      if (!box) continue;
      try {
        const seed = seedFor(k.kid, open(box, dpriv, boxContext(k, device())));
        if (!seed) continue;
        vault.seeds[k.kid] = b64(seed);
        changed = true;
      } catch {}
    }
    const imports = list(view.imports);
    for (let more = true; more; ) {
      more = false;
      for (const k of ownKeys) {
        const newer = k.chain && key(k.kid);
        const older = newer && ownKeys.find((x) => x.account === k.account && x.gen === k.gen - 1);
        if (!older || vault.seeds[older.kid]) continue;
        try {
          const seed = seedFor(older.kid, unlock(k.chain, newer.chain, chainContext(k)));
          if (!seed) continue;
          vault.seeds[older.kid] = b64(seed);
          changed = more = true;
        } catch {}
      }
      for (const i of imports) {
        const holder = typeof i.kid === 'string' && typeof i.to === 'string' && !vault.seeds[i.kid] && key(i.to);
        const box = holder && unb64(i.box);
        if (!box) continue;
        try {
          const seed = seedFor(i.kid, open(box, holder.x, importContext(i.kid, i.to)));
          if (!seed) continue;
          vault.seeds[i.kid] = b64(seed);
          changed = more = true;
        } catch {}
      }
    }
    if (changed) await saveVault();
  }

  /** A new generation after a computer left: sealed for the computers still on the account that had the key. */
  async function rotate(old, view) {
    const oldKey = key(old.kid);
    if (!oldKey) return null;
    const next = accountKey(crypto.randomBytes(32));
    const devices = [];
    for (const d of list(view.devices)) {
      const pub = unb64(d.pub);
      if (typeof d.id === 'string' && (d.approved === true || d.me === true) && pub && pub.length === 32) devices.push([d.id, pub]);
    }
    const chain = lock(oldKey.seed, next.chain, `chain\n${account()}\n${next.kid}`);
    const backupPub = isObj(view.backup) ? unb64(view.backup.pub) : null;
    vault.seeds[next.kid] = b64(next.seed);
    await saveVault();
    const v = await publishKey(next, old.gen + 1, oldKey, chain, devices, backupPub && backupPub.length === 32 ? backupPub : null, false);
    if (v) return v;
    // Another computer turned it at the same moment: theirs is the one.
    return lastError === 'gen_taken' ? call('GET', 'v1/e2ee/me') : null;
  }

  /** The recovery copy follows the current key; an account without one gets one (the user is asked to save it). */
  async function keepBackup(view) {
    const cur = current();
    const k = cur && key(cur.kid);
    if (!k) return;
    const pub = isObj(view.backup) ? unb64(view.backup.pub) : null;
    if (pub && pub.length === 32) {
      if ((Array.isArray(view.backup.kids) ? view.backup.kids : []).includes(cur.kid)) return;
      try {
        const box = seal(k.seed, pub, backupContext(cur));
        await call('PUT', 'v1/e2ee/backup', { pub: b64(pub), boxes: [{ kid: cur.kid, box: b64(box) }] });
      } catch {}
      return;
    }
    await newRecovery();
  }

  /**
   * Keys that came with a merge and that this computer holds: sealed to the account's current key, so the account's
   * other computers open what they sealed too.
   */
  async function shareMerged(view) {
    const cur = current();
    const to = cur && key(cur.kid);
    if (!to) return;
    const have = new Set(list(view.imports).map((i) => i.kid));
    const imports = [];
    for (const k of ownKeys) {
      const seed = k.merged && !have.has(k.kid) && unb64(vault.seeds[k.kid]);
      if (!seed) continue;
      try {
        imports.push({ kid: k.kid, to: cur.kid, box: b64(seal(seed, to.xPub, importContext(k.kid, cur.kid))) });
      } catch {}
    }
    if (imports.length) await call('POST', 'v1/e2ee/imports', { imports });
  }

  // ----- recovery -----

  /** A new recovery key: what the old one opened is no longer kept for it. Null when it couldn't be made. */
  async function newRecovery() {
    const cur = current();
    const k = cur && key(cur.kid);
    if (!k) return null;
    const bytes = crypto.randomBytes(20);
    const pub = publicOf(recoveryKey(bytes));
    const box = seal(k.seed, pub, backupContext(cur));
    if (!(await call('PUT', 'v1/e2ee/backup', { pub: b64(pub), boxes: [{ kid: cur.kid, box: b64(box) }] }))) return null;
    vault.recovery = recoveryText(bytes);
    vault.recoverySeen = false;
    await saveVault();
    publish();
    return vault.recovery;
  }

  /**
   * Opens the account's keys with the recovery key (a computer nobody else can approve). Null when it worked, else what
   * went wrong for the page.
   */
  async function recover(text) {
    await settle();
    const bytes = recoveryBytes(text);
    if (!bytes) return 'bad_recovery';
    const rkey = recoveryKey(bytes);
    const b = await call('GET', 'v1/e2ee/backup');
    if (!b) return lastError === 'no_backup' ? 'no_backup' : lastError || 'offline';
    if (b.pub !== b64(publicOf(rkey))) return 'wrong_recovery';
    let opened = false;
    for (const box of list(b.boxes)) {
      const k = typeof box.kid === 'string' && ownKeys.find((x) => x.kid === box.kid);
      const data = k && unb64(box.box);
      if (!data) continue;
      try {
        const seed = seedFor(k.kid, open(data, rkey, backupContext(k)));
        if (!seed) continue;
        vault.seeds[k.kid] = b64(seed);
        opened = true;
      } catch {}
    }
    if (!opened) return 'wrong_recovery';
    vault.recovery = recoveryText(bytes);
    vault.recoverySeen = true;
    await saveVault();
    // Sealed for this computer too, so the account counts it among the approved ones (a new generation reaches it).
    const cur = current(), dpriv = devicePriv();
    const k = cur && key(cur.kid);
    if (k && dpriv) {
      try {
        const box = seal(k.seed, publicOf(dpriv), boxContext(cur, device()));
        await call('POST', 'v1/e2ee/boxes', { boxes: [{ kid: cur.kid, device: device(), box: b64(box) }] });
      } catch {}
    }
    wake();
    await settle();
    return null;
  }

  /**
   * Every computer and the recovery key lost: a new key with nothing behind it. Messages sealed before stay closed;
   * friends see the security code change.
   */
  async function startOver() {
    await settle();
    const dpriv = devicePriv();
    if (!dpriv || !account()) return 'offline';
    const k = accountKey(crypto.randomBytes(32));
    const gen = Math.max(0, ...ownKeys.filter((x) => !x.merged && x.account === account()).map((x) => x.gen)) + 1;
    const recovery = crypto.randomBytes(20);
    const rpub = publicOf(recoveryKey(recovery));
    vault.seeds[k.kid] = b64(k.seed);
    vault.recovery = recoveryText(recovery);
    vault.recoverySeen = false;
    await saveVault();
    if (!(await publishKey(k, gen, null, null, [[device(), publicOf(dpriv)]], rpub, true))) return lastError || 'offline';
    wake();
    await settle();
    return null;
  }

  async function recoverySeen() {
    vault.recoverySeen = true;
    await saveVault();
    publish();
  }

  // ----- friends' keys -----

  /**
   * A friend's keys, checked, fetched again when `kid` isn't among the ones known. The first ones seen are pinned; a new
   * chain their old key didn't sign marks their security code changed. Null when they aren't known and can't be had.
   */
  async function keysOf(id, kid, fresh) {
    if (!UUID.test(String(id))) return null;
    const known = friendKeys.get(id);
    if (!fresh && known && (!kid || known.some((k) => k.kid === kid))) return known;
    const r = await call('GET', `v1/e2ee/keys/${id}`);
    if (!r) return known || null;
    const keys = list(r.keys).map(listedKey).filter(Boolean);
    friendKeys.set(id, keys);
    loadPins();
    const cur = currentOf(keys, id);
    if (cur) {
      const pin = pins[id];
      if (!isObj(pin)) {
        pins[id] = { root: cur.root.kid, verified: false, changed: false };
        savePins();
      } else if (pin.root !== cur.root.kid) {
        pins[id] = { root: cur.root.kid, verified: false, changed: true };
        savePins();
        publish();
      }
    }
    return keys;
  }

  // ----- messages -----

  /**
   * A message as the page shows it: sealed ones opened (`enc` true), or marked `locked` (this computer doesn't have the
   * key) or `bad` (it doesn't open: changed on the way). Plain ones (`enc` false) as they are.
   */
  async function openOne(m, friend) {
    const out = { ...m };
    for (const k of ['ct', 'sk', 'rk', 'v']) delete out[k];
    if (m.v !== 1) {
      out.enc = false;
      return out;
    }
    out.enc = 'locked';
    out.body = '';
    if (typeof m.ct !== 'string' || typeof m.sk !== 'string' || typeof m.rk !== 'string' || typeof m.uuid !== 'string') {
      out.enc = 'bad';
      return out;
    }
    const mine = m.mine === true;
    const myKid = mine ? m.sk : m.rk, theirKid = mine ? m.rk : m.sk;
    if (!key(myKid)) await settle();
    const myKey = key(myKid);
    const theirs = myKey && ((await keysOf(friend, theirKid)) || []).find((k) => k.kid === theirKid);
    if (!theirs) return out;
    try {
      const env = JSON.parse(openMessage(m.ct, conversation(myKey, theirs.x), m.uuid, m.sk, m.rk).toString('utf8'));
      if (!isObj(env) || typeof env.t !== 'string') throw new Error('bad message');
      out.body = env.t;
      if (isObj(env.r) && typeof env.r.u === 'string') {
        out.reply = { uuid: env.r.u, who: (env.r.o === 's') === mine ? 'me' : 'them', text: typeof env.r.s === 'string' ? env.r.s : '' };
      }
      out.enc = true;
    } catch {
      out.enc = 'bad';
    }
    return out;
  }

  /**
   * Sends a message the page wrote (POST v1/messages: `to`, `body`, `uuid`, `reply` {uuid, mine, text}): sealed when the
   * friend has a key, plain when they don't have one yet (their app is older). Never plain to a friend whose key was
   * seen before, and nothing goes from a computer the account hasn't approved.
   */
  async function send(b) {
    if (typeof b.to !== 'string' || !UUID.test(b.to)) return { error: 'bad_message' };
    const to = b.to;
    const text = (typeof b.body === 'string' ? b.body : '').trim();
    if (!text) return { error: 'empty' };
    const uuid = typeof b.uuid === 'string' ? b.uuid.toLowerCase() : crypto.randomUUID();
    const reply = isObj(b.reply) ? b.reply : null;
    const snippet = [...(reply && typeof reply.text === 'string' ? reply.text : '').replace(/\n/g, ' ')].slice(0, 100).join('');
    await settle();
    for (let attempt = 0; attempt < 2; attempt++) {
      const keys = await keysOf(to, null, attempt > 0);
      if (!keys) return { error: lastError || 'offline' };
      const theirs = (currentOf(keys, to) || {}).key;
      let r;
      if (theirs) {
        const cur = phase === 'ready' ? current() : null;
        const mine = cur && key(cur.kid);
        if (!mine) return { error: phase === 'locked' ? 'locked' : 'e2ee_starting' };
        const env = { t: text };
        if (reply && typeof reply.uuid === 'string') env.r = { u: reply.uuid, o: reply.mine === true ? 's' : 'r', s: snippet };
        let ct;
        try {
          ct = sealMessage(utf8(JSON.stringify(env)), conversation(mine, theirs.x), uuid, cur.kid, theirs.kid);
        } catch {
          return { error: 'seal_failed' };
        }
        r = await api('POST', 'v1/messages', { to, v: 1, uuid, ct, sk: cur.kid, rk: theirs.kid });
      } else {
        // Their key was seen before: it can't just be gone.
        loadPins();
        if (isObj(pins[to])) return { error: 'key_missing' };
        r = await api('POST', 'v1/messages', { to, body: reply && snippet ? `> ${snippet}\n${text}` : text, uuid });
      }
      const answer = isObj(r) ? r : { error: 'offline' };
      // Keys turned on either side since: once more with the new ones.
      if (answer.error === 'stale_key' && attempt === 0) {
        wake();
        await settle();
        continue;
      }
      if (!isObj(answer.message)) return answer;
      return { message: await openOne(answer.message, to) };
    }
    return { error: 'stale_key' };
  }

  /**
   * The pages' calls to the friends and messages endpoints go through here: messages are sealed on the way out and
   * opened on the way in; the friends list gets the last messages open and what the pages need to know about encryption.
   */
  async function social(method, p, body) {
    method = String(method || 'GET').toUpperCase();
    if (method === 'POST' && p === 'v1/messages' && isObj(body)) return send(body);
    const r = await pass(method, p, body);
    if (!isObj(r) || r.error !== undefined) return r;
    if (method === 'GET' && p === 'v1/social') {
      loadPins();
      if (Array.isArray(r.friends)) {
        for (const f of r.friends) {
          if (!isObj(f) || typeof f.id !== 'string') continue;
          if (isObj(f.last)) f.last = await openOne(f.last, f.id);
          const pin = pins[f.id];
          if (isObj(pin)) f.sc = { changed: pin.changed === true, verified: pin.verified === true };
        }
      }
      if (isObj(r.me)) r.me.e2ee = state();
      return r;
    }
    if (method === 'GET' && p.startsWith('v1/messages/')) {
      const friend = p.slice('v1/messages/'.length).split('?')[0];
      if (Array.isArray(r.messages)) {
        const opened = [];
        for (const m of r.messages) opened.push(isObj(m) ? await openOne(m, friend) : m);
        r.messages = opened;
      }
      return r;
    }
    return r;
  }

  // ----- live events -----

  /**
   * A live event on its way to the pages: a message opened, key changes taken in, the notes between computers approving
   * one another kept here. What the pages should get, in order.
   */
  async function incoming(ev) {
    if (!isObj(ev) || typeof ev.type !== 'string') return [ev];
    switch (ev.type) {
      case 'message':
        if (typeof ev.with !== 'string' || !isObj(ev.message)) return [ev];
        return [{ ...ev, message: await openOne(ev.message, ev.with) }];
      case 'e2ee':
        wake();
        return [];
      case 'account':
        // Joined to another account, a computer added or taken off: the keys may have changed with it.
        wake();
        return [ev];
      case 'e2ee_keys':
        if (typeof ev.id === 'string') await keysOf(ev.id, null, true);
        return [ev];
      case 'e2ee_relay':
        if (typeof ev.from === 'string' && isObj(ev.msg) && Object.values(ev.msg).every((v) => typeof v === 'string')) await relayed(ev.msg, ev.from);
        return [];
      case 'hello':
        wake();
        return [ev];
      default:
        return [ev];
    }
  }

  // ----- what the pages see -----

  // Computers of the account waiting to be approved (they have a key of their own, not the account's).
  const waiting = () =>
    list(me.devices)
      .filter((d) => d.me !== true && typeof d.pub === 'string' && d.approved !== true)
      .map((d) => ({ id: d.id ?? '', os: d.os ?? null, app: d.app ?? null }));

  function state() {
    const friends = {};
    for (const [id, p] of Object.entries(pins)) {
      if (isObj(p) && (p.changed === true || p.verified === true)) friends[id] = { changed: p.changed === true, verified: p.verified === true };
    }
    return {
      phase,
      // new: made here and not seen yet; saved: seen, or typed here; elsewhere: on another computer
      recovery: !vault.recovery ? 'elsewhere' : vault.recoverySeen ? 'saved' : 'new',
      waiting: phase === 'ready' ? waiting() : [],
      sas: sas ? sasState(sas) : null,
      friends,
    };
  }

  function publish() {
    const s = { type: 'e2ee_state', ...state() };
    const json = JSON.stringify(s);
    if (json === lastState) return;
    lastState = json;
    try {
      if (onState) onState(s);
    } catch (e) {
      console.error('e2ee: onState', e);
    }
  }

  /** A friend's security code, and whether the user marked it checked. */
  async function friendCode(friend) {
    await settle();
    const mine = (currentOf(ownKeys, account()) || {}).root;
    const keys = mine && (await keysOf(friend));
    const theirs = keys && (currentOf(keys, friend) || {}).root;
    if (!theirs) return { error: 'no_key' };
    const code = securityCode({ account: account(), x: mine.x, ed: mine.ed }, { account: friend, x: theirs.x, ed: theirs.ed });
    return { code, verified: isObj(pins[friend]) && pins[friend].verified === true };
  }

  function setVerified(friend, on) {
    loadPins();
    if (!isObj(pins[friend])) return;
    pins[friend] = { ...pins[friend], verified: on, changed: false };
    savePins();
    publish();
  }

  /** The "security code changed" line was read. */
  function seenChange(friend) {
    loadPins();
    if (!isObj(pins[friend]) || pins[friend].changed !== true) return;
    pins[friend] = { ...pins[friend], changed: false };
    savePins();
    publish();
  }

  // ----- approving a computer -----
  // Two computers of the account compare a code before one gives the other the account key. Each makes a one-time key;
  // the one asked first commits to its own (a hash) before it sees the other's, so nobody in between can pick a key that
  // makes the codes match. The code comes from both one-time keys, both computers and the new computer's own key: the
  // user checks that both screens show the same one, on both screens.

  // { sid, peer, giver (this computer gives the key: it was approved already), once, theirs, commit, code, mac,
  //   confirmed, gift, step (waiting · compare · done · failed), note, os, app }
  let sas = null;
  let sasTimer = null;

  const newSAS = (sid, peer, giver) => {
    const info = peerInfo(peer) || {};
    return {
      sid, peer, giver, once: crypto.generateKeyPairSync('x25519').privateKey, theirs: null, commit: null, code: null, mac: null,
      confirmed: false, gift: null, step: 'waiting', note: '', os: info.os ?? null, app: info.app ?? null,
    };
  };

  const sasState = (s) => ({ sid: s.sid, giver: s.giver, step: s.step, code: s.code ?? null, note: s.note, os: s.os, app: s.app });

  const relay = async (to, msg) => !!(await call('POST', 'v1/e2ee/relay', { to, msg }));

  const peerInfo = (id) => list(me.devices).find((d) => d.id === id) || null;

  /** The user asked to approve another computer of the account (from its notice or Settings). Null, or why not. */
  async function approve(peer) {
    await settle();
    if (phase !== 'ready') return 'locked';
    const info = peerInfo(peer);
    if (!info || typeof info.pub !== 'string') return 'not_found';
    const s = newSAS(b64(crypto.randomBytes(12)), peer, true);
    sas = s;
    publish();
    expireSoon(s.sid);
    if (!(await relay(peer, { t: 'start', s: s.sid }))) {
      fail(s.sid, lastError === 'offline' ? "that computer isn't connected · open the app on it" : "couldn't reach that computer");
    }
    return null;
  }

  function expireSoon(sid) {
    clearTimeout(sasTimer);
    sasTimer = setTimeout(() => {
      if (sas && sas.sid === sid && sas.step !== 'done' && sas.step !== 'failed') fail(sid, 'it took too long · try again');
    }, 300_000);
    sasTimer.unref?.();
  }

  function fail(sid, note) {
    if (!sas || sas.sid !== sid) return;
    sas.step = 'failed';
    sas.note = note;
    publish();
    clearSoon(sid);
  }

  function clearSoon(sid) {
    const t = setTimeout(() => {
      if (!sas || sas.sid !== sid) return;
      sas = null;
      publish();
    }, 8000);
    t.unref?.();
  }

  // The information both sides put into the code, in the same order.
  function sasInfo(s, giverOnce, takerOnce, takerPub) {
    const [giver, taker] = s.giver ? [device(), s.peer] : [s.peer, device()];
    return `${s.sid}\n${giver}\n${taker}\n${b64(giverOnce)}\n${b64(takerOnce)}\n${takerPub}\n${account()}`;
  }

  function makeCode(s) {
    try {
      const shared = agree(s.once, s.theirs);
      const mine = publicOf(s.once);
      let takerPub;
      if (s.giver) {
        const info = peerInfo(s.peer);
        if (!info || typeof info.pub !== 'string') return false;
        takerPub = info.pub;
      } else {
        const dpriv = devicePriv();
        if (!dpriv) return false;
        takerPub = b64(publicOf(dpriv));
      }
      const info = s.giver ? sasInfo(s, mine, s.theirs, takerPub) : sasInfo(s, s.theirs, mine, takerPub);
      const { code, mac } = compareCode(shared, info);
      s.code = code;
      s.mac = mac;
      s.step = 'compare';
      return true;
    } catch {
      return false;
    }
  }

  /** A note from another computer of the account. */
  async function relayed(msg, from) {
    const t = msg.t, sid = msg.s;
    if (typeof t !== 'string' || typeof sid !== 'string') return;
    if (t === 'start') {
      // Asked to compare codes: only a computer still waiting for the key answers.
      await settle();
      if (phase !== 'locked' || !peerInfo(from)) return;
      const s = newSAS(sid, from, false);
      const commit = sha256(publicOf(s.once), utf8(sid)).toString('hex');
      sas = s;
      publish();
      expireSoon(sid);
      await relay(from, { t: 'commit', s: sid, c: commit });
      return;
    }
    const s = sas;
    if (!s || s.sid !== sid || s.peer !== from || s.step === 'done' || s.step === 'failed') return;
    const wrong = () => fail(sid, 'something went wrong · try again');
    if (t === 'commit' && s.giver && s.commit === null) {
      s.commit = typeof msg.c === 'string' ? msg.c : '';
      await relay(from, { t: 'key', s: sid, k: b64(publicOf(s.once)) });
    } else if (t === 'key' && s.theirs === null) {
      const k = unb64(msg.k);
      if (!k || k.length !== 32) return wrong();
      if (s.giver) {
        // The other side's key must be the one it committed to.
        if (sha256(k, utf8(sid)).toString('hex') !== s.commit) return wrong();
        s.theirs = k;
      } else {
        s.theirs = k;
        await relay(from, { t: 'key', s: sid, k: b64(publicOf(s.once)) });
      }
      if (!makeCode(s)) return wrong();
      publish();
    } else if (t === 'ok' && !s.giver) {
      s.gift = msg;
      if (s.confirmed) await takeKey(sid);
    } else if (t === 'cancel') {
      fail(sid, "not approved · the codes didn't match");
    }
  }

  /** The user compared the codes: `match` false stops it on both computers. */
  async function confirm(sid, match) {
    const s = sas;
    if (!s || s.sid !== sid || s.step !== 'compare') return;
    if (!match) {
      await relay(s.peer, { t: 'cancel', s: sid });
      return fail(sid, "not approved · the codes didn't match");
    }
    s.confirmed = true;
    if (s.giver) await give(sid);
    else if (s.gift) await takeKey(sid);
    else {
      s.note = 'waiting for your other computer…';
      publish();
    }
  }

  /**
   * The approving computer: the account key sealed for the other computer, kept on the server and sent with a signature
   * only these two can make.
   */
  async function give(sid) {
    const s = sas;
    const cur = current();
    const k = cur && key(cur.kid);
    const info = s && peerInfo(s.peer);
    const pub = info && unb64(info.pub);
    if (!s || s.sid !== sid || !k || !s.mac || !pub || pub.length !== 32) return fail(sid, 'something went wrong · try again');
    let box;
    try {
      box = b64(seal(k.seed, pub, boxContext(cur, s.peer)));
    } catch {
      return fail(sid, 'something went wrong · try again');
    }
    const tag = crypto.createHmac('sha256', s.mac).update(utf8(`${cur.kid}\n${box}`)).digest('base64');
    if (!(await call('POST', 'v1/e2ee/boxes', { boxes: [{ kid: cur.kid, device: s.peer, box }] }))) return fail(sid, "couldn't reach the server · try again");
    await relay(s.peer, { t: 'ok', s: sid, kid: cur.kid, box, mac: tag });
    done(sid, 'approved · your messages are on that computer now');
  }

  /** The approved computer: takes the key once the user here said the codes match too. */
  async function takeKey(sid) {
    const s = sas;
    const wrong = () => fail(sid, 'something went wrong · try again');
    if (!s || s.sid !== sid || !s.gift || !s.mac) return wrong();
    const { kid, box: boxText, mac: tag } = s.gift;
    const want = unb64(tag);
    if (typeof kid !== 'string' || typeof boxText !== 'string' || !want) return wrong();
    const made = crypto.createHmac('sha256', s.mac).update(utf8(`${kid}\n${boxText}`)).digest();
    if (want.length !== made.length || !crypto.timingSafeEqual(want, made)) return wrong();
    wake();
    await settle();
    const k = ownKeys.find((x) => x.kid === kid), dpriv = devicePriv(), box = unb64(boxText);
    if (!k || !dpriv || !box) return wrong();
    let seed = null;
    try {
      seed = seedFor(kid, open(box, dpriv, boxContext(k, device())));
    } catch {}
    if (!seed) return wrong();
    vault.seeds[kid] = b64(seed);
    await saveVault();
    wake();
    await settle();
    done(sid, 'approved · your messages are here now');
  }

  function done(sid, note) {
    if (!sas || sas.sid !== sid) return;
    sas.step = 'done';
    sas.note = note;
    clearTimeout(sasTimer);
    publish();
    clearSoon(sid);
  }

  // ----- the pages' calls -----

  /** Settings, the chat window and the notices ask through the cloud bridge ({ type: "e2ee", action, … }). */
  async function page(b) {
    const text = (v) => (typeof v === 'string' ? v : '');
    switch (b.action) {
      case 'state':
        await settle();
        return state();
      case 'recovery':
        if (b.seen === true) await recoverySeen();
        return { key: vault.recovery || null };
      case 'newRecovery': {
        const k = await newRecovery();
        return k ? { key: k } : { error: lastError || 'offline' };
      }
      case 'recover': {
        const e = await recover(text(b.key));
        return e ? { error: e } : { ok: true };
      }
      case 'startOver': {
        const e = await startOver();
        return e ? { error: e } : { ok: true };
      }
      case 'approve': {
        const e = await approve(text(b.device));
        return e ? { error: e } : { ok: true };
      }
      case 'confirm':
        await confirm(text(b.sid), b.match === true);
        return { ok: true };
      case 'code':
        return friendCode(text(b.id));
      case 'verify':
        setVerified(text(b.id), b.on !== false);
        return { ok: true };
      case 'seen':
        seenChange(text(b.id));
        return { ok: true };
      default:
        return { error: 'bad_action' };
    }
  }

  return { wake, settle, social, incoming, page, state };
}

module.exports = {
  createE2EE,
  // For checking the bytes against the Mac's.
  crypto: { seal, open, lock, unlock, sealMessage, openMessage, conversation, accountKey, kidOf, statement, recoveryText, recoveryBytes, recoveryKey, compareCode, securityCode, publicOf, xPrivate },
};
