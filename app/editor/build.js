// Builds Source Control's file editor's Monaco into Resources/web/editor: monaco.js and monaco.css (with codicon.ttf,
// its icons), and workers.js, the editor's and JSON's web workers as text. The dashboard is a file, and WebKit starts a
// worker for it only from a blob: web/file-editor.js makes one of each from that text.
//   npm install && npm run build
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = '../Resources/web/editor';
const common = { bundle: true, minify: true, format: 'iife', target: ['es2022', 'safari16'], legalComments: 'none', logLevel: 'warning' };
mkdirSync(OUT, { recursive: true });

await esbuild.build({
  ...common,
  entryPoints: { monaco: 'index.js' },
  outdir: OUT,
  loader: { '.ttf': 'file' },
  assetNames: '[name]',
  // A worker made the module way (new URL(…, import.meta.url)) is never made: MonacoEnvironment.getWorker makes them.
  logOverride: { 'empty-import-meta': 'silent' },
});
// Its icon font under a name of its own: the dashboard's "codicon" is the user's VS Code's (Source Control's icons).
const css = `${OUT}/monaco.css`;
writeFileSync(css, readFileSync(css, 'utf8').replace(/font-family:codicon\b/g, 'font-family:monaco-codicon').replace(/16px\/1 codicon\b/g, '16px/1 monaco-codicon'));

const workers = {};
for (const [label, entry] of [['editor', 'monaco-editor/editor/editor.worker.js'], ['json', 'monaco-editor/languages/features/json/json.worker.js']]) {
  const r = await esbuild.build({ ...common, entryPoints: [entry], write: false, logOverride: { 'empty-import-meta': 'silent' } });
  workers[label] = r.outputFiles[0].text;
}
writeFileSync(`${OUT}/workers.js`, `window.__monacoWorkers = ${JSON.stringify(workers)};\n`);
// Its licences (MIT, and the code it carries: marked, DOMPurify, the JSON language service…).
copyFileSync('node_modules/monaco-editor/LICENSE', `${OUT}/LICENSE.txt`);
copyFileSync('node_modules/monaco-editor/ThirdPartyNotices.txt', `${OUT}/ThirdPartyNotices.txt`);
