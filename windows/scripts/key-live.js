'use strict';
// Tells the API that the release made with a key is out (POST /v1/client-key/live, signed like any app call), so the
// Windows keys before it stop earning XP in 10 minutes and end in 24 hours. Run by release.js once a release is
// published; it holds the key but not the admin token, and a key can only retire the ones older than itself.
//   node scripts/key-live.js <key file>          (ATALAY_API_URL: the API, default production)
const crypto = require('crypto');
const fs = require('fs');

const API = (process.env.ATALAY_API_URL || 'https://terminal-api.atalaykarahan.com').replace(/\/$/, '');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const fail = (msg) => {
  console.error(`key-live: ${msg}`);
  process.exit(1);
};

(async () => {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) fail('usage: node scripts/key-live.js <key file>');
  const [id, secret] = fs.readFileSync(file, 'utf8').split('\n')[0].trim().split(':');
  if (!id || !/^(?:[0-9a-f]{2})+$/i.test(secret || '')) fail(`${file} doesn't hold a key (id:secret)`);
  const url = new URL(`${API}/v1/client-key/live`);
  const body = '{}';
  // The same text the app signs (src/cloud.js signer); this call has no Authorization header, so its hash is of "".
  const time = String(Math.trunc(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString('hex');
  const text = ['v2', time, nonce, 'POST', url.pathname + url.search, sha256(body), sha256('')].join('\n');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-at-key': id,
      'x-at-time': time,
      'x-at-nonce': nonce,
      'x-at-sig': crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update(text).digest('hex'),
    },
    body,
  });
  const answer = await res.text();
  if (!res.ok) fail(`${API} answered ${res.status} ${answer.slice(0, 200)}`);
  let replaced = '?';
  try { replaced = JSON.parse(answer).replaced.length; } catch {}
  console.log(`key-live: key ${id} is live on ${API}, ${replaced} older key(s) replaced`);
})().catch((e) => fail(e.message));
