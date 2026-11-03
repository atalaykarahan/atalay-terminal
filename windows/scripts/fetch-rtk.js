'use strict';
// rtk (github.com/rtk-ai/rtk, Apache-2.0), its open-source build, for the app's token saver (src/savers.js), as the Mac's
// app/scripts/fetch-rtk.sh: the Windows binary of a pinned release, checked against the release's checksums, into
// vendor/rtk (gitignored) with its licence. `npm run dist` and `npm run release` run it; it does nothing when that
// version is there already.
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

const VERSION = '1.1.0';
const ASSET = 'rtk-oss-x86_64-pc-windows-msvc.zip';
const OUT = path.join(__dirname, '..', 'vendor', 'rtk');
const EXE = path.join(OUT, 'rtk.exe');

function get(url, hops = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'user-agent': 'atalay-terminal-build' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 5) {
          res.resume();
          return resolve(get(new URL(res.headers.location, url).href, hops + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`${url}: ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

(async () => {
  try {
    const have = cp.execFileSync(EXE, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 10_000 });
    if (have.includes(` ${VERSION}`)) return console.log(`fetch-rtk: rtk ${VERSION} already in ${OUT}`);
  } catch {}
  const base = `https://github.com/rtk-ai/rtk/releases/download/v${VERSION}`;
  const sums = (await get(`${base}/checksums.txt`)).toString('utf8');
  const want = sums.split(/\r?\n/).map((l) => l.trim().split(/\s+/)).find(([, name]) => (name || '').replace(/^\*/, '') === ASSET);
  const zip = await get(`${base}/${ASSET}`);
  const got = crypto.createHash('sha256').update(zip).digest('hex');
  if (!want || want[0].toLowerCase() !== got) throw new Error(`${ASSET} doesn't match the release's checksum`);
  // Windows' own tar (10 and later) opens zips; it unpacks into a folder of its own, and only the binary and the licence
  // come out of it.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fetch-rtk-'));
  try {
    fs.writeFileSync(path.join(tmp, ASSET), zip);
    fs.mkdirSync(path.join(tmp, 'x'));
    cp.execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', path.join(tmp, ASSET), '-C', path.join(tmp, 'x')], { windowsHide: true });
    fs.mkdirSync(OUT, { recursive: true });
    fs.copyFileSync(path.join(tmp, 'x', 'rtk.exe'), EXE);
    fs.copyFileSync(path.join(tmp, 'x', 'LICENSE'), path.join(OUT, 'rtk-LICENSE'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`fetch-rtk: rtk ${VERSION} in ${OUT}`);
})().catch((e) => {
  console.error(`fetch-rtk: ${e.message}`);
  process.exit(1);
});
