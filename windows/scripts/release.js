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
//   GH_TOKEN   a GitHub token that can write the releases repo (default: git's own sign-in to github.com on this PC)
//
// The API key is rotated for every release (scripts/new-key.sh on the Mac): copy the new one here first (README).
const cp = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const pkg = require('../package.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const notes = args.filter((a) => a !== '--dry-run').map((a) => a.trim()).filter(Boolean).join('\n');
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

(async () => {
  if (process.platform !== 'win32') fail('Windows builds are made on Windows');
  const keyFile = path.join(os.homedir(), '.atalay-terminal', 'client-key-windows');
  if (!process.env.ATALAY_CLIENT_KEY && !fs.existsSync(keyFile)) {
    fail(`no API key (${keyFile}): an unsigned build can't reach the API, so it isn't released`);
  }
  auth = token();
  if (!auth && !dry) fail('no GitHub token: set GH_TOKEN, or sign git in to github.com once (a push does)');

  // The key in fresh (masked, into the gitignored src/clientkey.js), then the build.
  cp.execFileSync(process.execPath, [path.join(__dirname, 'clientkey.js')], { stdio: 'inherit' });
  const builder = require('electron-builder');
  await builder.build({
    targets: builder.Platform.WINDOWS.createTarget(),
    publish: 'never',
    config: notes ? { releaseInfo: { releaseNotes: notes } } : undefined,
  });

  const yml = fs.readFileSync(path.join(dist, 'latest.yml'), 'utf8');
  const version = (/^version: (.+)$/m.exec(yml) || [])[1];
  const exe = (/^path: (.+)$/m.exec(yml) || [])[1];
  if (version !== pkg.version || !exe || !fs.existsSync(path.join(dist, exe))) fail(`dist/latest.yml doesn't match the build`);
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

  const title = "Atalay's Terminal for Windows";
  const body =
    `**${version}**\n\n${notes ? notes.split('\n').map((n) => `- ${n}`).join('\n') + '\n\n' : ''}` +
    `Download **${STABLE}** below. Installed copies update themselves.\n\n` +
    // Until the installer is code-signed, Windows doesn't know its publisher.
    'Windows may say it protected your PC: click **More info**, then **Run anyway** (the installer isn\'t code-signed yet).';
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
})().catch((e) => fail(e.message));
