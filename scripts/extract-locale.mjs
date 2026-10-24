// Read the shipped English dictionaries out of the installed DSH app.asar.
// Output: en/<namespace>.json  (git-ignored: this is DeepSeek's text, not ours)
import fs from 'node:fs';
import path from 'node:path';
import { openAsar, resolveAsar } from './lib/asar.mjs';
import { parseBundleDictionaries } from './lib/locale.mjs';

const args = process.argv.slice(2);
const asarPath = resolveAsar(args.includes('--asar') ? args[args.indexOf('--asar') + 1] : undefined);
const outDir = 'en';
const verbose = args.includes('--verbose');

const asar = openAsar(asarPath);
const pkgEntry = asar.entries.find((e) => e.path === 'dsh/package.json');
const runtime = pkgEntry ? JSON.parse(asar.read(pkgEntry).toString('utf8')) : {};
const bundles = asar.entries.filter((e) => /^dsh\/node_modules\/@deepseek-ai\/[^/]+\/lib\/client\.js$/.test(e.path));
console.log(`reading ${bundles.length} client bundles from ${asarPath}`);

const namespaces = new Map();
let duplicates = 0;
for (const entry of bundles) {
  const pkg = entry.path.split('/')[3];
  const parsed = parseBundleDictionaries(asar.read(entry).toString('utf8'));
  if (verbose && parsed.length) console.log(`  ${pkg}: ${parsed.map((d) => d.namespace).join(', ')}`);
  for (const { namespace, en } of parsed) {
    if (namespaces.has(namespace)) { duplicates++; continue; }
    namespaces.set(namespace, { namespace, package: pkg, en });
  }
}
asar.close();
console.log(`resolved ${namespaces.size} namespaces${duplicates ? ` (${duplicates} duplicate registrations skipped)` : ''}`);

// Clear the output file by file: `fs.rmSync` aborts Node on some Windows filesystems
// (observed on a Google Drive folder with Node 24), while unlink is safe.
fs.mkdirSync(outDir, { recursive: true });
for (const file of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, file));

let keys = 0;
for (const [namespace, data] of [...namespaces.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  keys += Object.keys(data.en).length;
  fs.writeFileSync(path.join(outDir, `${namespace}.json`), `${JSON.stringify(data, null, 2)}\n`);
}
const extractedAt = new Date().toISOString();
fs.writeFileSync(path.join(outDir, '_meta.json'), `${JSON.stringify({
  runtime: runtime.name,
  version: runtime.version,
  asar: asarPath,
  extractedAt,
  namespaces: namespaces.size,
  keys,
}, null, 2)}\n`);

// Refresh the committed baseline so the release watcher knows what we cover.
const metaPath = 'schema/meta.json';
const previous = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
fs.mkdirSync('schema', { recursive: true });
fs.writeFileSync(metaPath, `${JSON.stringify({
  dshVersion: runtime.version ?? previous.dshVersion,
  feed: previous.feed ?? 'https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml',
  npmPackage: previous.npmPackage ?? '@deepseek-ai/dsh',
  checkedAt: extractedAt,
}, null, 2)}\n`);

console.log(`extracted ${namespaces.size} namespaces / ${keys} keys from ${runtime.name ?? 'DSH'} ${runtime.version ?? ''}`);
