// Offline validation: translations/ko vs the committed schema baseline.
// Runs in CI without any DSH installation.
import fs from 'node:fs';
import path from 'node:path';

const placeholder = /\{(\w+)\}/g;
const sorted = (value) => [...String(value).matchAll(placeholder)].map((m) => m[1]).sort();

const schema = JSON.parse(fs.readFileSync('schema/namespaces.json', 'utf8'));
const problems = [];
let expected = 0;
let present = 0;

for (const [ns, keys] of Object.entries(schema)) {
  const file = path.join('translations/ko', `${ns}.json`);
  if (!fs.existsSync(file)) { problems.push(`${ns}: missing translation file`); continue; }
  let ko;
  try {
    ko = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    problems.push(`${ns}: invalid JSON (${String(error).slice(0, 120)})`);
    continue;
  }
  for (const [key, wanted] of Object.entries(keys)) {
    expected++;
    const value = ko[key];
    if (typeof value !== 'string') { problems.push(`${ns}/${key}: missing`); continue; }
    present++;
    const got = sorted(value);
    if (wanted.join(',') !== got.join(',')) problems.push(`${ns}/${key}: placeholders {${wanted.join('} {')}} vs {${got.join('} {')}}`);
  }
  for (const key of Object.keys(ko)) if (!(key in keys)) problems.push(`${ns}/${key}: not in schema (stale translation)`);
}

if (problems.length) {
  console.error(`${problems.length} problem(s), ${present}/${expected} keys covered:`);
  for (const line of problems.slice(0, 200)) console.error(`  ${line}`);
  if (problems.length > 200) console.error(`  … ${problems.length - 200} more`);
  process.exit(1);
}
console.log(`OK — ${present}/${expected} keys across ${Object.keys(schema).length} namespaces`);
