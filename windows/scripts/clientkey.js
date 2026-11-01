'use strict';
// Writes src/clientkey.js from ATALAY_CLIENT_KEY ("keyid:hexsecret", copied from the Mac; README): the key this build's API
// calls are signed with (the API refuses unsigned calls). It goes in masked, as two byte strings that only give the key
// back together, so it isn't a plain string in the app; never committed (.gitignore). Without the variable the build is
// unsigned: the dashboard and terminals work, friends, messages and levels don't.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const raw = (process.env.ATALAY_CLIENT_KEY || '').trim();
const out = path.join(__dirname, '..', 'src', 'clientkey.js');
if (!raw) {
  console.log('clientkey: no ATALAY_CLIENT_KEY, building unsigned');
  process.exit(0);
}
const [id, secret] = raw.split(':');
if (!/^[a-z0-9]{4,32}$/.test(id || '') || !/^[0-9a-f]{32,}$/i.test(secret || '')) {
  console.error('clientkey: ATALAY_CLIENT_KEY is not "keyid:hexsecret"');
  process.exit(1);
}
const key = Buffer.from(secret, 'hex');
const mask = crypto.randomBytes(key.length);
const masked = Buffer.from(key.map((b, i) => b ^ mask[i]));
fs.writeFileSync(out, `'use strict';\n// Written by scripts/clientkey.js at build time; never committed.\nmodule.exports = ${JSON.stringify({ id, a: masked.toString('base64'), b: mask.toString('base64') })};\n`);
console.log(`clientkey: key ${id} written`);
