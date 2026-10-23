// Build client.js from en/ (English keys) + translations/ko/ (our Korean).
// Also refreshes schema/namespaces.json, the offline key/placeholder baseline.
import fs from 'node:fs';
import path from 'node:path';
import { placeholders } from './lib/locale.mjs';

const strict = process.argv.includes('--strict');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!fs.existsSync('en')) {
  console.error('en/ is missing — run: npm run extract -- --asar "<path to app.asar>"');
  process.exit(2);
}

const sources = fs.readdirSync('en').filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();
const dicts = {};
const schema = {};
const missing = [];
const extra = [];
const placeholderProblems = [];
let total = 0;

for (const file of sources) {
  const source = JSON.parse(fs.readFileSync(path.join('en', file), 'utf8'));
  const ns = source.namespace;
  const koPath = path.join('translations/ko', file);
  const ko = fs.existsSync(koPath) ? JSON.parse(fs.readFileSync(koPath, 'utf8')) : {};

  const dict = {};
  schema[ns] = {};
  for (const key of Object.keys(source.en)) {
    total++;
    const expected = placeholders(source.en[key]);
    schema[ns][key] = expected;
    if (typeof ko[key] !== 'string') { missing.push(`${ns}/${key}`); continue; }
    const got = placeholders(ko[key]);
    if (expected.join(',') !== got.join(',')) {
      placeholderProblems.push(`${ns}/${key}: expected {${expected.join('} {')}} got {${got.join('} {')}}`);
      continue;
    }
    dict[key] = ko[key];
  }
  for (const key of Object.keys(ko)) if (!(key in source.en)) extra.push(`${ns}/${key}`);
  dicts[ns] = dict;
}

// Order namespaces for stable diffs.
const ordered = {};
for (const ns of Object.keys(schema).sort()) ordered[ns] = dicts[ns] ?? {};

const body = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(pkg.name)},
  factory(require) {
    const DICTS = ${JSON.stringify(ordered)};

    /** Keep one failed registration from taking the whole pack down. */
    function guard(label, register) {
      try {
        return register();
      } catch (error) {
        console.warn("[locale-ko] skipped " + label + ": " + error);
        return () => {};
      }
    }

    return {
      inject: ["locale"],
      apply(ctx) {
        ctx.effect(
          () => guard("language", () => ctx.locale.addLanguage({ id: "ko", label: "한국어", fallback: "en" })),
          "locale-ko: language",
        );
        for (const [ns, dict] of Object.entries(DICTS)) {
          ctx.effect(() => guard(ns, () => ctx.locale.register(ns, "ko", dict)), "locale-ko: " + ns);
        }
      },
    };
  },
});
`;

fs.writeFileSync('client.js', body);
fs.mkdirSync('schema', { recursive: true });
fs.writeFileSync('schema/namespaces.json', `${JSON.stringify(schema, null, 2)}\n`);

const translated = total - missing.length - placeholderProblems.length;
console.log(`${Object.keys(ordered).length} namespaces, ${translated}/${total} keys translated (${((translated / total) * 100).toFixed(1)}%)`);
if (missing.length) console.log(`missing (${missing.length}): ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' …' : ''}`);
if (extra.length) console.log(`stale translations (${extra.length}): ${extra.join(', ')}`);
if (placeholderProblems.length) {
  console.log(`placeholder mismatches (${placeholderProblems.length}):`);
  for (const line of placeholderProblems) console.log(`  ${line}`);
}
if (strict && (missing.length || placeholderProblems.length)) process.exit(1);
