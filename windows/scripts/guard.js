'use strict';
// Builds the signing guard (native/guard.c) for one release, on the Windows PC that builds it (scripts/release.js):
//   node scripts/guard.js <unpacked app folder> <key file> [program]      program: Orbiterm.exe unless named
// The key file holds "keyid:hexsecret" (the API's client key for this release, scripts/clientkey.js) and, beside it,
// <key file>.decoys two more of the same shape (the API registered them as decoys). They go into a header in a random
// order, each masked, with the SHA-256 of the folder's Orbiterm.exe and resources\app.asar (the guard signs only in that
// program with that app), and the guard is compiled into the folder's resources\guard.node. The compiler is zig, a
// pinned release checked against its SHA-256, fetched into vendor/zig the first time; nothing else needs installing.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const https = require('https');

const ZIG = {
  version: '0.17.0',
  url: 'https://ziglang.org/download/0.17.0/zig-x86_64-windows-0.17.0.zip',
  sha256: 'b5663f69581dcf391293fbf16c06cb80d81d806545ce618b4d0bab7f0eb8c428',
};
const root = path.join(__dirname, '..');
const fail = (msg) => {
  console.error(`guard: ${msg}`);
  process.exit(1);
};

const [folder, keyFile, program] = process.argv.slice(2);
if (!folder || !keyFile) fail('usage: node scripts/guard.js <unpacked app folder> <key file> [program]');
const exe = path.join(folder, program || `${require('../package.json').build.productName}.exe`);
const asar = path.join(folder, 'resources', 'app.asar');
const out = path.join(folder, 'resources', 'guard.node');
for (const f of [exe, asar, keyFile]) if (!fs.existsSync(f)) fail(`no ${f}`);

const parse = (line, where) => {
  const [id, secret] = line.trim().split(':');
  if (!/^[a-z0-9]{4,32}$/.test(id || '') || !/^[0-9a-f]{64}$/i.test(secret || '')) fail(`${where} is not "keyid:hexsecret"`);
  return { id, secret: Buffer.from(secret, 'hex') };
};
const key = parse(fs.readFileSync(keyFile, 'utf8'), keyFile);
const decoysFile = `${keyFile}.decoys`;
const decoys = fs.existsSync(decoysFile)
  ? fs.readFileSync(decoysFile, 'utf8').split('\n').filter((l) => l.trim()).map((l) => parse(l, decoysFile))
  : [];
if (decoys.length < 2) console.warn(`guard: no decoys in ${decoysFile}, the key goes in alone`);

const sha256 = (file) =>
  new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });

function download(url, file) {
  return new Promise((resolve, reject) => {
    const get = (u, hops) =>
      https.get(u, { headers: { 'user-agent': 'orbiterm-release' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 5) {
          res.resume();
          return get(new URL(res.headers.location, u).href, hops + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`${url}: HTTP ${res.statusCode}`));
        const w = fs.createWriteStream(file);
        res.pipe(w);
        w.on('finish', () => w.close(resolve));
        w.on('error', reject);
      }).on('error', reject);
    get(url, 0);
  });
}

// vendor/zig/<version>/zig.exe, fetched and checked once.
async function zig() {
  const dir = path.join(root, 'vendor', 'zig', ZIG.version);
  const bin = path.join(dir, 'zig.exe');
  if (fs.existsSync(bin)) return bin;
  fs.mkdirSync(dir, { recursive: true });
  const zip = path.join(os.tmpdir(), `zig-${ZIG.version}-${process.pid}.zip`);
  console.log(`guard: fetching zig ${ZIG.version} (about 100 MB, once)`);
  await download(ZIG.url, zip);
  const got = await sha256(zip);
  if (got !== ZIG.sha256) {
    fs.rmSync(zip, { force: true });
    fail(`zig's download doesn't match its checksum (${got})`);
  }
  // Windows 10 and 11 have bsdtar, which reads zips.
  cp.execFileSync('tar', ['-xf', zip, '-C', dir, '--strip-components', '1'], { stdio: 'inherit' });
  fs.rmSync(zip, { force: true });
  if (!fs.existsSync(bin)) fail(`zig.exe isn't in ${dir}`);
  return bin;
}

// Every file under `dir` (path under it, with forward slashes) and its SHA-256, as main.js checks them.
async function tree(dir) {
  const out = {};
  const walk = async (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name !== '.DS_Store') out[path.relative(dir, p).split(path.sep).join('/')] = await sha256(p);
    }
  };
  await walk(dir);
  return out;
}

(async () => {
  // What main.js checks before the files are used: the pages and node-pty's (which load into the app's process).
  const res = path.join(folder, 'resources');
  const files = { web: await tree(path.join(res, 'web')), pty: await tree(path.join(res, 'app.asar.unpacked', 'node_modules', 'node-pty')) };
  if (!Object.keys(files.web).length || !Object.keys(files.pty).length) fail(`no pages or no node-pty in ${res}`);
  // The key and its decoys in a random order, each with a mask of its own.
  const keys = [key, ...decoys];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  const arr = (b) => `{${[...b].join(',')}}`;
  const masks = keys.map(() => crypto.randomBytes(32));
  const header =
    '// Written by scripts/guard.js for one release; never committed.\n' +
    `#define GUARD_KEYS ${keys.length}\n` +
    `static const char *const GUARD_ID[${keys.length}] = {${keys.map((k) => JSON.stringify(k.id)).join(',')}};\n` +
    `static const unsigned char GUARD_MASK[${keys.length}][32] = {${masks.map(arr).join(',')}};\n` +
    `static const unsigned char GUARD_DATA[${keys.length}][32] = {${keys.map((k, i) => arr(k.secret.map((b, j) => b ^ masks[i][j]))).join(',')}};\n` +
    `static const int GUARD_SLOT = ${keys.indexOf(key)};\n` +
    `static const char GUARD_EXE[] = "${await sha256(exe)}";\n` +
    `static const char GUARD_ASAR[] = "${await sha256(asar)}";\n` +
    // JSON as a C string: its quotes and backslashes escaped (paths and hashes, nothing else).
    `static const char GUARD_FILES[] = ${JSON.stringify(JSON.stringify(files))};\n`;
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'orbiterm-guard-'));
  try {
    fs.writeFileSync(path.join(work, 'guard-build.h'), header, { mode: 0o600 });
    const z = await zig();
    cp.execFileSync(z, ['cc', '-target', 'x86_64-windows-gnu', '-O2', '-shared', '-s', '-I', work, '-o', out,
      path.join(root, 'native', 'guard.c'), '-lbcrypt'], { stdio: 'inherit' });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  if (!fs.existsSync(out)) fail(`no ${out}`);
  // The linker's leftovers beside it (an import library, symbols) don't go out with the app.
  for (const ext of ['.lib', '.pdb']) fs.rmSync(out.replace(/\.node$/, ext), { force: true });
  console.log(`guard: ${out} built for key ${key.id} (${decoys.length} decoys beside it)`);
})().catch((e) => fail(e.message));
