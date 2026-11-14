'use strict';
// Saves a release's API key, with its two decoys, on the Windows PC that builds the releases (README):
//   $env:ATALAY_CLIENT_KEY = (Get-Clipboard -Raw).Trim(); node scripts/clientkey.js --save; Remove-Item Env:ATALAY_CLIENT_KEY
// ATALAY_CLIENT_KEY holds what the Mac's windows/scripts/new-key.sh put on the clipboard: "keyid:hexsecret", then the
// decoys the API registered beside it, joined by commas. The key goes to ~/.atalay-terminal/client-key-windows and the
// decoys to client-key-windows.decoys, both readable by this user only, like an SSH key; scripts/guard.js builds them
// into the release's guard. Nothing is written into the app's sources, and nothing shows on screen.
const fs = require('fs');
const os = require('os');
const path = require('path');

const keyFile = path.join(os.homedir(), '.atalay-terminal', 'client-key-windows');
const raw = (process.env.ATALAY_CLIENT_KEY || '').trim();
if (!process.argv.includes('--save') || !raw) {
  console.log(`clientkey: ${fs.existsSync(keyFile) ? `a key is saved in ${keyFile}` : `no key in ${keyFile}`}; to save one: README`);
  process.exit(0);
}
const parts = raw.split(/[,\s]+/).filter(Boolean);
const valid = (p) => /^[a-z0-9]{4,32}:[0-9a-f]{64}$/i.test(p);
if (!parts.length || !parts.every(valid)) {
  console.error('clientkey: ATALAY_CLIENT_KEY is not "keyid:hexsecret" (then its decoys, joined by commas)');
  process.exit(1);
}
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, { mode: 0o600 });
  if (process.platform === 'win32') {
    require('child_process').execFileSync('icacls', [file, '/inheritance:r', '/grant:r', `${os.userInfo().username}:F`], {
      stdio: 'ignore',
      windowsHide: true,
    });
  }
};
write(keyFile, parts[0] + '\n');
if (parts.length > 1) write(`${keyFile}.decoys`, parts.slice(1).join('\n') + '\n');
else fs.rmSync(`${keyFile}.decoys`, { force: true });
console.log(`clientkey: key ${parts[0].split(':')[0]} saved in ${keyFile}, with ${parts.length - 1} decoys`);
