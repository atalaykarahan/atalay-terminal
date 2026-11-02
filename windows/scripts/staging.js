'use strict';
// The app from the sources against the local API (api/ next to app/ and windows/: `docker compose up -d` there), never
// the live one: a staging run like the Mac's dev.sh and STAGING build, for trying things without touching real users'
// data. Its calls are signed with a key of its own, ~/.atalay-terminal/client-key-windows-staging (made here once and
// registered with the local API, whose admin token is in api/.env), so the production key in src/clientkey.js is never
// swapped out. It keeps its own profile ("Atalay's Terminal (staging)") and, as every development run, its own session
// host, so it runs next to the installed app.
//   npm run staging
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const API = 'http://127.0.0.1:4800';
const root = path.join(__dirname, '..');
const envFile = path.join(root, '..', 'api', '.env');
const keyFile = path.join(os.homedir(), '.atalay-terminal', 'client-key-windows-staging');

function fail(msg) {
  console.error(`staging: ${msg}`);
  process.exit(1);
}

(async () => {
  const health = await fetch(`${API}/health`).then((r) => r.ok, () => false);
  if (!health) fail(`no local API at ${API}: start it with \`docker compose up -d\` in api/ (Docker Desktop running)`);
  const token = ((fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '').match(/^ADMIN_TOKEN=(.+)$/m) || [])[1];
  if (!token) fail(`no ADMIN_TOKEN in ${envFile}`);

  if (!fs.existsSync(keyFile)) {
    fs.mkdirSync(path.dirname(keyFile), { recursive: true });
    fs.writeFileSync(keyFile, `k${crypto.randomBytes(4).toString('hex')}:${crypto.randomBytes(32).toString('hex')}\n`, { mode: 0o600 });
    if (process.platform === 'win32') {
      cp.execFileSync('icacls', [keyFile, '/inheritance:r', '/grant:r', `${os.userInfo().username}:F`], { stdio: 'ignore', windowsHide: true });
    }
  }
  const [id, secret] = fs.readFileSync(keyFile, 'utf8').trim().split(':');
  // Registering it again changes nothing; a fresh database (`docker compose down -v`) gets it back this way.
  const r = await fetch(`${API}/v1/admin/client-keys/${id}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token.trim()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ secret, label: `windows staging ${os.hostname()}` }),
  });
  if (!r.ok) fail(`the local API refused the key: ${r.status} ${await r.text()}`);
  console.log(`staging: key ${id} registered with ${API}`);

  const env = { ...process.env, ATALAY_API_URL: API, ATALAY_CLIENT_KEY_FILE: keyFile };
  const profile = path.join(process.env.APPDATA || os.homedir(), "Atalay's Terminal (staging)");
  const app = cp.spawn(require('electron'), ['.', `--user-data-dir=${profile}`], { cwd: root, env, stdio: 'inherit' });
  app.on('exit', (code) => process.exit(code ?? 0));
})().catch((e) => fail(e.message));
