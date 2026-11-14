'use strict';
// The app against the local API (api/ next to app/ and windows/: `docker compose up -d` there), never the live one: a
// staging run like the Mac's dev.sh and STAGING build, for trying things without touching real users' data. Its calls
// are signed with a key of its own, ~/.atalay-terminal/client-key-windows-staging (made here once and registered with
// the local API, whose admin token is in api/.env), so the release key, which only a release's guard holds
// (scripts/guard.js), is never needed here. It keeps its own profile ("Atalay's Terminal (staging)") and its own session
// host, so it runs next to the installed app.
//   npm run staging                  the app from the sources
//   npm run staging -- --packaged    a packaged build made as a release is (dist-staging\win-unpacked, "Orbiterm
//                                    Staging"), its guard built with this key and two decoys beside it, run from there
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const API = 'http://127.0.0.1:4800';
const root = path.join(__dirname, '..');
const envFile = path.join(root, '..', 'api', '.env');
const keyFile = path.join(os.homedir(), '.atalay-terminal', 'client-key-windows-staging');
const packaged = process.argv.includes('--packaged');

function fail(msg) {
  console.error(`staging: ${msg}`);
  process.exit(1);
}

const newKey = () => `k${crypto.randomBytes(4).toString('hex')}:${crypto.randomBytes(32).toString('hex')}`;
// Readable by this user only, like an SSH key.
function writePrivate(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, { mode: 0o600 });
  if (process.platform === 'win32') {
    cp.execFileSync('icacls', [file, '/inheritance:r', '/grant:r', `${os.userInfo().username}:F`], { stdio: 'ignore', windowsHide: true });
  }
}

(async () => {
  const health = await fetch(`${API}/health`).then((r) => r.ok, () => false);
  if (!health) fail(`no local API at ${API}: start it with \`docker compose up -d\` in api/ (Docker Desktop running)`);
  const token = ((fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '').match(/^ADMIN_TOKEN=(.+)$/m) || [])[1];
  if (!token) fail(`no ADMIN_TOKEN in ${envFile}`);

  // Registering a key again changes nothing; a fresh database (`docker compose down -v`) gets it back this way.
  const register = async (line, fields) => {
    const [id, secret] = line.trim().split(':');
    const r = await fetch(`${API}/v1/admin/client-keys/${id}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token.trim()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ secret, ...fields }),
    });
    if (!r.ok) fail(`the local API refused key ${id}: ${r.status} ${await r.text()}`);
    return id;
  };
  if (!fs.existsSync(keyFile)) writePrivate(keyFile, newKey() + '\n');
  const id = await register(fs.readFileSync(keyFile, 'utf8'), { label: `windows staging ${os.hostname()}`, platform: 'windows' });
  console.log(`staging: key ${id} registered with ${API}`);
  const profile = path.join(process.env.APPDATA || os.homedir(), "Atalay's Terminal (staging)");

  if (!packaged) {
    const env = { ...process.env, ATALAY_API_URL: API, ATALAY_CLIENT_KEY_FILE: keyFile };
    const app = cp.spawn(require('electron'), ['.', `--user-data-dir=${profile}`], { cwd: root, env, stdio: 'inherit' });
    app.on('exit', (code) => process.exit(code ?? 0));
    return;
  }

  // The packaged build: its guard holds the key among two decoys, as a release's does.
  if (process.platform !== 'win32') fail('a packaged build is made on Windows');
  const decoys = `${keyFile}.decoys`;
  if (!fs.existsSync(decoys)) writePrivate(decoys, `${newKey()}\n${newKey()}\n`);
  for (const line of fs.readFileSync(decoys, 'utf8').split('\n').filter((l) => l.trim())) {
    await register(line, { label: `windows staging decoy ${os.hostname()}`, decoy: true });
  }
  console.log(`staging: its 2 decoys registered with ${API}`);
  cp.execFileSync(process.execPath, [path.join(__dirname, 'fetch-rtk.js')], { stdio: 'inherit' });
  fs.rmSync(path.join(root, 'src', 'clientkey.js'), { force: true });
  const builder = require('electron-builder');
  await builder.build({
    targets: builder.Platform.WINDOWS.createTarget('dir'),
    publish: 'never',
    config: {
      productName: 'Orbiterm Staging',
      directories: { output: 'dist-staging' },
      // main.js: a staging package speaks to the local API and never updates.
      extraMetadata: { productName: 'Orbiterm Staging', orbitermStaging: true },
    },
  });
  const unpacked = path.join(root, 'dist-staging', 'win-unpacked');
  const exe = 'Orbiterm Staging.exe';
  cp.execFileSync(process.execPath, [path.join(__dirname, 'guard.js'), unpacked, keyFile, exe], { stdio: 'inherit' });
  const env = { ...process.env };
  delete env.ATALAY_API_URL;
  delete env.ATALAY_CLIENT_KEY_FILE;
  console.log(`staging: starting ${path.join(unpacked, exe)}`);
  const app = cp.spawn(path.join(unpacked, exe), [`--user-data-dir=${profile}`], { env, stdio: 'inherit' });
  app.on('exit', (code) => process.exit(code ?? 0));
})().catch((e) => fail(e.message));
