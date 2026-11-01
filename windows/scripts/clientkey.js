'use strict';
// Writes src/clientkey.json from ATALAY_CLIENT_KEY ("keyid:hexsecret", a GitHub Actions secret): the key this build's
// API calls are signed with (the API refuses unsigned calls). Never committed (.gitignore). Without the variable the
// build is unsigned: the dashboard and terminals work, friends, messages and levels don't.
const fs = require('fs');
const path = require('path');

const raw = (process.env.ATALAY_CLIENT_KEY || '').trim();
const out = path.join(__dirname, '..', 'src', 'clientkey.json');
if (!raw) {
  console.log('clientkey: no ATALAY_CLIENT_KEY, building unsigned');
  process.exit(0);
}
const [id, secret] = raw.split(':');
if (!/^[a-z0-9]{4,32}$/.test(id || '') || !/^[0-9a-f]{32,}$/i.test(secret || '')) {
  console.error('clientkey: ATALAY_CLIENT_KEY is not "keyid:hexsecret"');
  process.exit(1);
}
fs.writeFileSync(out, JSON.stringify({ id, secret }));
console.log(`clientkey: key ${id} written`);
