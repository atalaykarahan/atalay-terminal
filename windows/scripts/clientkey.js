'use strict';
// Writes src/clientkey.js from ATALAY_CLIENT_KEY ("keyid:hexsecret", copied from the Mac; README), or else from
// ~/.atalay-terminal/client-key-windows, where the Windows PC that builds the releases keeps it like an SSH key (only its
// user can read it): the key this build's API calls are signed with (the API refuses unsigned calls). It goes in masked,
// as two byte strings that only give the key back together, so it isn't a plain string in the app; never committed
// (.gitignore). Without either the build is unsigned: the dashboard and terminals work, friends, messages and levels don't.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const keyFile = path.join(os.homedir(), '.atalay-terminal', 'client-key-windows');
const raw = (process.env.ATALAY_CLIENT_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8') : '')).trim();
const out = path.join(__dirname, '..', 'src', 'clientkey.js');
if (!raw) {
  console.log(`clientkey: no ATALAY_CLIENT_KEY nor ${keyFile}, building unsigned`);
  process.exit(0);
}
const [id, secret] = raw.split(':');
if (!/^[a-z0-9]{4,32}$/.test(id || '') || !/^[0-9a-f]{32,}$/i.test(secret || '')) {
  console.error(`clientkey: ${process.env.ATALAY_CLIENT_KEY ? 'ATALAY_CLIENT_KEY' : keyFile} is not "keyid:hexsecret"`);
  process.exit(1);
}
// --save: a new release's key, given in ATALAY_CLIENT_KEY, also replaces the one this PC keeps, readable by its user only.
if (process.argv.includes('--save') && process.env.ATALAY_CLIENT_KEY) {
  fs.mkdirSync(path.dirname(keyFile), { recursive: true });
  fs.writeFileSync(keyFile, raw + '\n', { mode: 0o600 });
  if (process.platform === 'win32') {
    require('child_process').execFileSync('icacls', [keyFile, '/inheritance:r', '/grant:r', `${os.userInfo().username}:F`], {
      stdio: 'ignore',
      windowsHide: true,
    });
  }
  console.log(`clientkey: key ${id} saved in ${keyFile}`);
}
const key = Buffer.from(secret, 'hex');
const mask = crypto.randomBytes(key.length);
const masked = Buffer.from(key.map((b, i) => b ^ mask[i]));
fs.writeFileSync(out, `'use strict';\n// Written by scripts/clientkey.js at build time; never committed.\nmodule.exports = ${JSON.stringify({ id, a: masked.toString('base64'), b: mask.toString('base64') })};\n`);
console.log(`clientkey: key ${id} written`);
