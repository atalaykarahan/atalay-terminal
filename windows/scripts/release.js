'use strict';
// Publishes the Windows app from the Windows PC that holds its API key: a signed build goes into the "windows" release of
// the public releases repo, where every installed copy looks for updates (package.json's "publish": electron-updater's
// generic provider on that release's files). The Mac's releases there are versioned (v0.12.0) and the newest is the one
// GitHub calls latest, which the README's .dmg link follows; this one is a pre-release, so it never takes that place,
// and its files are replaced on every Windows release:
//   latest.yml                          what the installed copies read (the version, the installer's SHA-512, the notes)
//   Atalays-Terminal-Setup-<v>.exe      what they download, with its .blockmap (the next update downloads only the
//                                       parts that changed); the version before stays for that, older ones go
//   Atalays-Terminal-Setup.exe          the same installer under a name that's always the newest, for new users' links
//
//   npm run release -- "what changed" ["what else"]     notes: one line per change
//   npm run release -- --dry-run                        builds, then only shows what would go up
//   npm run dist                                        (--build-only) builds the installer, nothing else
//   GH_TOKEN   a GitHub token that can write the releases repo (default: git's own sign-in to github.com on this PC)
//
// The API key is new for every release: with the admin token on this PC (~/.atalay-terminal/admin-token, or
// ATALAY_ADMIN_TOKEN) the release makes it here, with its two decoys; without it, scripts/new-key.sh on the Mac makes it
// and it's pasted here first (README).
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const pkg = require('../package.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const only = args.includes('--build-only');
const notes = args.filter((a) => a !== '--dry-run' && a !== '--build-only').map((a) => a.trim()).filter(Boolean).join('\n');
const STABLE = 'Atalays-Terminal-Setup.exe';

function fail(msg) {
  console.error(`release: ${msg}`);
  process.exit(1);
}

// One place says where the updates are: the folder of files package.json's "publish" points the installed copies to.
const feed = pkg.build.publish && pkg.build.publish.url;
const where = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/?$/.exec(feed || '');
if (!where) fail(`package.json's publish url isn't a GitHub release's files: ${feed}`);
const [, owner, repo, tag] = where;

// Git's sign-in to github.com, which Git Credential Manager keeps in Windows' credential store: it never asks here, a
// missing one is a missing token.
function token() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const r = cp.spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    env: { ...process.env, GCM_INTERACTIVE: 'never', GIT_TERMINAL_PROMPT: '0' },
    windowsHide: true,
  });
  const m = /^password=(.+)$/m.exec(r.stdout || '');
  return m ? m[1].trim() : '';
}

function request(method, url, { body, file, type } = {}) {
  return new Promise((resolve, reject) => {
    const size = file ? fs.statSync(file).size : body ? Buffer.byteLength(body) : 0;
    const req = https.request(url, {
      method,
      headers: {
        authorization: `Bearer ${auth}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'atalay-terminal-release',
        ...(file || body ? { 'content-type': type || 'application/json', 'content-length': size } : {}),
      },
    });
    req.on('error', reject);
    req.on('response', (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode === 404 && method === 'GET') return resolve(null);
        if (res.statusCode >= 300) return reject(new Error(`${method} ${url}: ${res.statusCode} ${text.slice(0, 300)}`));
        resolve(text ? JSON.parse(text) : null);
      });
    });
    if (file) fs.createReadStream(file).pipe(req);
    else req.end(body);
  });
}
const api = (method, p, body) =>
  request(method, `https://api.github.com/repos/${owner}/${repo}${p}`, body === undefined ? {} : { body: JSON.stringify(body) });

// A file goes up under a passing name and takes its real one only once it's all there, so the old one stays
// downloadable until then (a copy checking for updates meanwhile finds the old version whole, never half of the new).
async function put(release, file, name) {
  const assets = await api('GET', `/releases/${release.id}/assets?per_page=100`);
  const passing = `${name}.uploading`;
  for (const a of assets.filter((a) => a.name === passing)) await api('DELETE', `/releases/assets/${a.id}`);
  const up = await request(
    'POST',
    `https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(passing)}`,
    { file, type: 'application/octet-stream' },
  );
  for (const a of assets.filter((a) => a.name === name)) await api('DELETE', `/releases/assets/${a.id}`);
  await api('PATCH', `/releases/assets/${up.id}`, { name });
  console.log(`release: ${name} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB)`);
}

const versionOf = (name) => (/^Atalays-Terminal-Setup-(.+?)\.exe(\.blockmap)?$/.exec(name) || [])[1];
const newer = (a, b) => {
  const x = a.split(/[.-]/).map(Number), y = b.split(/[.-]/).map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
};

let auth = '';

const API = (process.env.ATALAY_API_URL || 'https://terminal-api.atalaykarahan.com').replace(/\/$/, '');
function adminToken() {
  if (process.env.ATALAY_ADMIN_TOKEN) return process.env.ATALAY_ADMIN_TOKEN.trim();
  try {
    return fs.readFileSync(path.join(os.homedir(), '.atalay-terminal', 'admin-token'), 'utf8').trim();
  } catch {
    return '';
  }
}
// Readable by this user only, like an SSH key; written beside it first (<file>.new), and put in place by placePrivate.
function writePrivate(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.new`, text, { mode: 0o600 });
  cp.execFileSync('icacls', [`${file}.new`, '/inheritance:r', '/grant:r', `${os.userInfo().username}:F`], { stdio: 'ignore', windowsHide: true });
}
const placePrivate = (file) => fs.renameSync(`${file}.new`, file);

// This release's key, made and registered here, as the Mac's release.sh does with app/scripts/rotate-key.sh and
// client-key.sh: a new key and two decoys go to the API first (the decoys checked as decoys: an API from before them
// would take them as plain keys, so they're revoked then and nothing is built); then the old key file is put aside, by
// its id, in client-keys, and the new ones take its place. A failure on the way leaves the old key file as it was.
async function freshKey(keyFile, token) {
  const newKey = () => `k${crypto.randomBytes(4).toString('hex')}:${crypto.randomBytes(32).toString('hex')}`;
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const put = async (line, fields) => {
    const [id, secret] = line.split(':');
    const r = await fetch(`${API}/v1/admin/client-keys/${id}`, { method: 'PUT', headers, body: JSON.stringify({ secret, ...fields }) });
    if (!r.ok) throw new Error(`the API refused key ${id}: ${r.status}`);
    return id;
  };
  const key = newKey();
  const decoys = [newKey(), newKey()];
  const id = await put(key, { label: `windows ${new Date().toISOString().slice(0, 10)}`, platform: 'windows' });
  for (const d of decoys) await put(d, { label: `decoy beside ${id}`, decoy: true });
  const list = await fetch(`${API}/v1/admin/client-keys`, { headers }).then((r) => (r.ok ? r.json() : { keys: [] }));
  const known = new Map((list.keys || []).map((k) => [k.id, k]));
  const bad = decoys.map((d) => d.split(':')[0]).filter((d) => !(known.get(d) || {}).decoy);
  if (bad.length) {
    for (const d of bad) await fetch(`${API}/v1/admin/client-keys/${d}`, { method: 'DELETE', headers });
    throw new Error(`${API} doesn't know decoys yet (deploy the API first): they were revoked`);
  }
  writePrivate(keyFile, key + '\n');
  writePrivate(`${keyFile}.decoys`, decoys.join('\n') + '\n');
  if (fs.existsSync(keyFile)) {
    const old = fs.readFileSync(keyFile, 'utf8').trim().split(':')[0];
    if (/^[a-z0-9]{4,32}$/.test(old)) {
      const archive = path.join(path.dirname(keyFile), 'client-keys');
      fs.mkdirSync(archive, { recursive: true });
      fs.copyFileSync(keyFile, path.join(archive, old));
    }
  }
  placePrivate(keyFile);
  placePrivate(`${keyFile}.decoys`);
  return id;
}

(async () => {
  if (process.platform !== 'win32') fail('Windows builds are made on Windows');
  const keyFile = path.join(os.homedir(), '.atalay-terminal', 'client-key-windows');
  // A key given in ATALAY_CLIENT_KEY (the Mac's windows/scripts/new-key.sh) is saved first, with its decoys; else a real
  // release makes its own with the admin token (a dry run and npm run dist build with the key there is).
  const admin = adminToken();
  if (process.env.ATALAY_CLIENT_KEY) cp.execFileSync(process.execPath, [path.join(__dirname, 'clientkey.js'), '--save'], { stdio: 'inherit' });
  // GitHub first: a release that can't go out mustn't use up a key.
  auth = only ? '' : token();
  if (!auth && !dry && !only) fail('no GitHub token: set GH_TOKEN, or sign git in to github.com once (a push does)');
  if (!process.env.ATALAY_CLIENT_KEY && admin && !dry && !only) {
    console.log(`release: key ${await freshKey(keyFile, admin)} made for this release, with 2 decoys`);
  }
  if (!fs.existsSync(keyFile)) fail(`no API key (${keyFile}): an unsigned build can't reach the API, so it isn't released`);

  // rtk for the token saver (a pinned release, checked against its checksums): a release without it would leave its
  // switch off for everyone.
  cp.execFileSync(process.execPath, [path.join(__dirname, 'fetch-rtk.js')], { stdio: 'inherit' });
  if (!fs.existsSync(path.join(root, 'vendor', 'rtk', 'rtk.exe'))) fail('no rtk in vendor/rtk, the token saver would be missing');
  // The key never goes into app.asar (an older build's src/clientkey.js mustn't go out with this one): it's in the
  // guard. The build in three steps: the app's folder (dist/win-unpacked); its guard, built over that finished
  // Orbiterm.exe and app.asar (scripts/guard.js), so it can't be inside them; the installer from the folder.
  fs.rmSync(path.join(root, 'src', 'clientkey.js'), { force: true });
  const builder = require('electron-builder');
  const config = notes ? { releaseInfo: { releaseNotes: notes } } : undefined;
  await builder.build({ targets: builder.Platform.WINDOWS.createTarget('dir'), publish: 'never', config });
  const unpacked = path.join(dist, 'win-unpacked');
  // Where an installed copy looks for its updates (electron-updater reads it): electron-builder writes it only when it
  // packs an installer, never for the folder alone, so it's written here as it would be. Without it a release never
  // hears of the next one (0.22.0 and 0.22.1 went out so).
  const pub = pkg.build.publish;
  fs.writeFileSync(path.join(unpacked, 'resources', 'app-update.yml'), `provider: ${pub.provider}\nurl: ${pub.url}\nupdaterCacheDirName: ${pkg.name}-updater\n`);
  cp.execFileSync(process.execPath, [path.join(__dirname, 'guard.js'), unpacked, keyFile], { stdio: 'inherit' });
  await builder.build({ targets: builder.Platform.WINDOWS.createTarget('nsis'), prepackaged: unpacked, publish: 'never', config });

  const yml = fs.readFileSync(path.join(dist, 'latest.yml'), 'utf8');
  const version = (/^version: (.+)$/m.exec(yml) || [])[1];
  const exe = (/^path: (.+)$/m.exec(yml) || [])[1];
  if (version !== pkg.version || !exe || !fs.existsSync(path.join(dist, exe))) fail(`dist/latest.yml doesn't match the build`);
  if (!fs.existsSync(path.join(unpacked, 'resources', 'app-update.yml'))) fail('the build has no resources/app-update.yml: it would never update');
  if (only) return console.log(`release: built dist/${exe}, not published`);
  const files = [
    [exe, exe],
    [`${exe}.blockmap`, `${exe}.blockmap`],
    [exe, STABLE],
    ['latest.yml', 'latest.yml'],
  ];

  const current = auth ? await api('GET', `/releases/tags/${tag}`) : null;
  const was = current && current.assets.map((a) => versionOf(a.name)).filter(Boolean).sort(newer).pop();
  if (was && newer(version, was) <= 0) fail(`${version} isn't newer than the published ${was}: raise "version" in package.json`);
  if (dry) {
    console.log(`release: would publish ${version} to ${owner}/${repo}, release "${tag}" (now: ${was || 'none'})`);
    for (const [file, name] of files) console.log(`  ${name} <- dist/${file}`);
    if (notes) console.log(`  notes: ${notes.replace(/\n/g, ' · ')}`);
    if (!auth) console.log('  (no GitHub token found: a real release would stop here)');
    return;
  }

  const title = 'Orbiterm for Windows';
  // The page new users land on, so it walks them past the warnings an installer without a code signature still meets
  // (the browser hasn't seen the file often, SmartScreen doesn't know its publisher).
  const body =
    `**${version}**\n\n${notes ? notes.split('\n').map((n) => `- ${n}`).join('\n') + '\n\n' : ''}` +
    '### Install\n\n' +
    `1. Download **${STABLE}** below (Windows 10 or 11, 64-bit). If the browser says the file isn't commonly ` +
    'downloaded, keep it (in Edge: **…** next to it, **Keep**, **Show more**, **Keep anyway**).\n' +
    '2. Run it. If Windows says it protected your PC, click **More info**, then **Run anyway**: the installer isn\'t ' +
    'code-signed yet. It installs for your Windows user only (no administrator needed) and opens the app.\n' +
    '3. Chats need Claude Code on the PC (in PowerShell: `irm https://claude.ai/install.ps1 | iex`); Source Control ' +
    'needs [Git for Windows](https://git-scm.com/download/win).\n\n' +
    'Installed copies update themselves.';
  const release =
    current ||
    (await api('POST', '/releases', { tag_name: tag, name: title, body, prerelease: true, make_latest: 'false' }));
  for (const [file, name] of files) await put(release, path.join(dist, file), name);
  await api('PATCH', `/releases/${release.id}`, { name: title, body, prerelease: true, make_latest: 'false' });

  // The version before stays for the parts-only download from it; older ones go.
  const assets = await api('GET', `/releases/${release.id}/assets?per_page=100`);
  const kept = [...new Set(assets.map((a) => versionOf(a.name)).filter(Boolean))].sort(newer).slice(-2);
  for (const a of assets) {
    const v = versionOf(a.name);
    if (v && !kept.includes(v)) await api('DELETE', `/releases/assets/${a.id}`);
  }

  // What the installed copies will read, from where they'll read it.
  const live = await new Promise((resolve, reject) => {
    const get = (url, hops) =>
      https.get(url, { headers: { 'user-agent': 'atalay-terminal-release' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 5) {
          res.resume();
          return get(new URL(res.headers.location, url).href, hops + 1);
        }
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve(text));
      }).on('error', reject);
    get(`${feed.replace(/\/$/, '')}/latest.yml`, 0);
  });
  if (!live.includes(`version: ${version}`)) fail(`published, but ${feed}/latest.yml doesn't show ${version} yet`);
  console.log(`release: ${version} is out; new users: https://github.com/${owner}/${repo}/releases/download/${tag}/${STABLE}`);

  // This build's key goes live: the Windows keys before it stop earning XP in 10 minutes and end in 24 hours. It's
  // published already, so a failure here only asks for the same thing by hand.
  const marked = cp.spawnSync(process.execPath, [path.join(__dirname, 'key-live.js'), keyFile], { stdio: 'inherit' });
  if (marked.status !== 0) {
    const id = fs.readFileSync(keyFile, 'utf8').split(':')[0].trim();
    console.warn(`release: the release is out, but its key isn't marked live; from the Mac: PUT /v1/admin/client-keys/${id}/live with the admin token`);
  }

  // The API names this release to every Windows app (GET /v1/releases/windows, read every minute with no key), which then
  // looks for it in this feed even if its own look went wrong. Published already, so a failure only asks for it by hand.
  const named = admin
    ? await fetch(`${API}/v1/admin/windows-release`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json' },
        body: JSON.stringify({ version, feed: feed.replace(/\/+$/, ''), notes: notes.slice(0, 4000) }),
        signal: AbortSignal.timeout(20_000),
      }).then(
        // Its answer read to the end: a body left open makes Node on Windows abort on the way out (libuv's async.c).
        (r) => r.text().then(() => r.ok, () => r.ok),
        () => false,
      )
    : false;
  if (named) console.log(`release: ${API} names ${version} to the Windows apps`);
  else console.warn(`release: the API doesn't name ${version} yet: PUT ${API}/v1/admin/windows-release {version, feed} with the admin token`);
})().catch((e) => fail(e.message));
