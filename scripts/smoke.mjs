// Contract test: load client.js the way the DSH client module system does and
// drive it against a minimal stand-in for the locale service.
import fs from 'node:fs';
import vm from 'node:vm';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('schema/namespaces.json', 'utf8'));
const source = fs.readFileSync('client.js', 'utf8');

const context = { window: {}, console, Object, JSON };
context.window.__ModuleLoader__ = { rows: [], load(row) { this.rows.push(row); } };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'client.js' });

const [row, ...rest] = context.window.__ModuleLoader__.rows;
if (rest.length) throw new Error(`expected one registered factory, got ${rest.length + 1}`);
if (row.id !== pkg.name) throw new Error(`factory id ${row.id} does not match package name ${pkg.name}`);

const languages = [];
const registrations = new Map();
const locale = {
  addLanguage(input) { languages.push(input); return () => {}; },
  register(namespace, localeId, dict) {
    if (localeId !== 'ko') throw new Error(`unexpected locale id ${localeId}`);
    if (registrations.has(namespace)) throw new Error(`namespace ${namespace} registered twice`);
    registrations.set(namespace, dict);
    return () => {};
  },
};
const effects = [];
const ctx = { locale, effect(run, label) { effects.push({ label, dispose: run() }); } };

const plugin = row.factory(() => { throw new Error('the language pack must not require other modules'); });
plugin.apply(ctx);

if (languages.length !== 1) throw new Error(`expected one language definition, got ${languages.length}`);
const language = languages[0];
if (language.id !== 'ko' || language.fallback !== 'en') throw new Error(`unexpected language definition ${JSON.stringify(language)}`);

const expected = Object.keys(schema);
if (registrations.size !== expected.length) throw new Error(`expected ${expected.length} namespaces, got ${registrations.size}`);
for (const namespace of expected) {
  if (!registrations.has(namespace)) throw new Error(`namespace ${namespace} was not registered`);
}

let entries = 0;
for (const dict of registrations.values()) {
  for (const [key, value] of Object.entries(dict)) {
    entries++;
    if (typeof value !== 'string') throw new Error(`non-string value for ${key}`);
  }
}

for (const effect of effects) if (effect.dispose !== undefined && typeof effect.dispose !== 'function') throw new Error('effect disposer is not callable');

console.log(`OK — ${language.label} (${language.id}) loaded: ${registrations.size} namespaces, ${entries} strings, ${effects.length} effects`);
