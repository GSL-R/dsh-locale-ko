// Report what a DSH release changed in the UI text since the last baseline.
// Usage: npm run drift            (report only)
//        npm run drift -- --strict (exit 1 when new keys appear)
import fs from 'node:fs';
import path from 'node:path';

const strict = process.argv.includes('--strict');
const meta = JSON.parse(fs.readFileSync('en/_meta.json', 'utf8'));
const baselineSchema = JSON.parse(fs.readFileSync('schema/namespaces.json', 'utf8'));

const sources = fs.readdirSync('en').filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const fresh = new Map();
for (const file of sources) {
  const data = JSON.parse(fs.readFileSync(path.join('en', file), 'utf8'));
  fresh.set(data.namespace, data);
}

const addedNamespaces = [...fresh.keys()].filter((ns) => !(ns in baselineSchema)).sort();
const removedNamespaces = Object.keys(baselineSchema).filter((ns) => !fresh.has(ns)).sort();

const addedKeys = [];
const removedKeys = [];
const changedPlaceholders = [];
for (const [ns, data] of fresh) {
  const baseline = baselineSchema[ns];
  if (!baseline) continue;
  for (const key of Object.keys(data.en)) {
    if (!(key in baseline)) { addedKeys.push(`${ns}/${key}`); continue; }
  }
  for (const key of Object.keys(baseline)) {
    if (!(key in data.en)) removedKeys.push(`${ns}/${key}`);
  }
}

const totalKeys = [...fresh.values()].reduce((sum, data) => sum + Object.keys(data.en).length, 0);
const line = (label, list) => `- ${label}: ${list.length}${list.length ? `\n${list.map((item) => `  - \`${item}\``).join('\n')}` : ''}`;

const report = [
  `# DSH locale drift — ${meta.runtime ?? 'DSH'} ${meta.version ?? 'unknown'}`,
  '',
  `Generated ${new Date().toISOString()} from \`${meta.asar}\`.`,
  '',
  `- namespaces: ${fresh.size} (baseline ${Object.keys(baselineSchema).length})`,
  `- keys: ${totalKeys}`,
  '',
  line('new namespaces', addedNamespaces),
  line('removed namespaces', removedNamespaces),
  line('new keys', addedKeys),
  line('removed keys', removedKeys),
  changedPlaceholders.length ? line('placeholder changes', changedPlaceholders) : '',
].join('\n');

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/drift.md', `${report}\n`);
console.log(report);

const breaking = addedNamespaces.length + addedKeys.length + removedKeys.length + removedNamespaces.length + changedPlaceholders.length;
if (strict && breaking > 0) process.exit(1);
