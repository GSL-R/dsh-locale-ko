// Extract the shipped English dictionaries from DSH client bundles.
// The bundles embed `locale.register(NS, { zh, en })` calls; this module turns
// those calls back into plain objects without running the plugin.

function scanString(src, i) {
  const quote = src[i];
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === quote) return j + 1;
    j++;
  }
  return j;
}

function matchBracket(src, i) {
  const open = src[i];
  const close = open === '{' ? '}' : open === '[' ? ']' : ')';
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '"' || c === "'" || c === '`') { j = scanString(src, j) - 1; continue; }
    if (c === '/' && src[j + 1] === '/') { j = src.indexOf('\n', j); if (j < 0) return -1; continue; }
    if (c === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j + 2); if (j < 0) return -1; j += 2; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return j + 1; }
  }
  return -1;
}

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') { i = scanString(text, i) - 1; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { parts.push(text.slice(last, i)); last = i + 1; }
  }
  parts.push(text.slice(last));
  return parts;
}

function unquote(text) {
  const s = text.trim();
  const quote = s[0];
  if (s.length > 1 && (quote === '"' || quote === "'" || quote === '`') && s.at(-1) === quote) {
    const body = s.slice(1, -1);
    return body.replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' }[c] ?? c));
  }
  return null;
}

/** Index of the first `:` outside strings and brackets, or -1. */
function findTopLevelColon(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') { i = scanString(text, i) - 1; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ':' && depth === 0) return i;
  }
  return -1;
}

function resolveLiteral(src, ident, before) {
  const re = new RegExp(`(?:const|let|var)\\s+${ident.replace(/\$/g, '\\$&')}\\s*=\\s*`, 'g');
  let match;
  let start = -1;
  while ((match = re.exec(src))) {
    if (match.index >= before) break;
    start = match.index + match[0].length;
  }
  if (start < 0) return null;
  while (start < src.length && /\s/.test(src[start])) start++;
  const c = src[start];
  if (c === '{' || c === '[') { const end = matchBracket(src, start); return end < 0 ? null : src.slice(start, end); }
  if (c === '"' || c === "'" || c === '`') { const end = scanString(src, start); return src.slice(start, end); }
  return null;
}

function evaluate(text, src, before) {
  const bindings = new Map();
  const names = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const fn = new Function(...names, `return (${text}\n)`);
      return fn(...names.map((n) => bindings.get(n)));
    } catch (error) {
      const ref = /(\w+) is not defined/.exec(String(error));
      if (!ref) return { __error: String(error) };
      const name = ref[1];
      if (bindings.has(name)) return { __error: String(error) };
      const literal = resolveLiteral(src, name, before);
      if (!literal) return { __error: `unresolved identifier ${name}` };
      const value = evaluate(literal, src, before);
      if (value?.__error) return { __error: `while resolving ${name}: ${value.__error}` };
      bindings.set(name, value);
      names.push(name);
    }
  }
  return { __error: 'too many unresolved identifiers' };
}

function readPairObject(dictExpr, src, before) {
  const body = dictExpr.trim().replace(/^\{/, '').replace(/\}$/, '');
  const pair = {};
  for (const part of splitTopLevel(body)) {
    const piece = part.trim();
    if (!piece) continue;
    const colon = findTopLevelColon(piece);
    if (colon >= 0) pair[unquote(piece.slice(0, colon)) ?? piece.slice(0, colon).trim()] = piece.slice(colon + 1).trim();
    else pair[piece] = piece;
  }
  return pair;
}

/**
 * Collect every `ctx.locale.register(...)` dictionary in one client bundle.
 * @param source - Bundle source text.
 * @returns Array of `{ namespace, en, zh }` entries that could be resolved.
 */
export function parseBundleDictionaries(source) {
  const found = [];
  const callRe = /locale\.register\(/g;
  let match;
  while ((match = callRe.exec(source))) {
    const parenStart = match.index + 'locale.register'.length;
    const parenEnd = matchBracket(source, parenStart);
    if (parenEnd < 0) continue;
    const args = splitTopLevel(source.slice(parenStart + 1, parenEnd - 1));
    if (args.length < 2) continue;

    let namespace = unquote(args[0]);
    if (!namespace) {
      const literal = resolveLiteral(source, args[0].trim(), match.index);
      if (literal) namespace = unquote(literal);
    }
    if (!namespace) continue;

    const before = match.index;
    let pair;
    if (args.length === 2) {
      pair = readPairObject(args[1], source, before);
    } else {
      const localeExpr = args[1].trim();
      const dictExpr = args[2].trim();
      const loopRe = /for\s*\(\s*(?:const|let|var)\s*\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*of\s*(\w+)/;
      const scope = source.slice(0, before);
      const loop = loopRe.exec(scope.slice(Math.max(0, scope.length - 4000))) ?? loopRe.exec(scope);
      if (loop && loop[1] === localeExpr) {
        const arrayLiteral = resolveLiteral(source, loop[3], before);
        if (!arrayLiteral) continue;
        pair = {};
        for (const element of splitTopLevel(arrayLiteral.trim().slice(1, -1))) {
          const tuple = splitTopLevel(element.trim().replace(/^\[/, '').replace(/\]$/, ''));
          if (tuple.length !== 2) continue;
          const locale = unquote(tuple[0].trim());
          if (locale) pair[locale] = tuple[1].trim();
        }
      } else if (unquote(localeExpr)) {
        pair = { [unquote(localeExpr)]: dictExpr };
      } else {
        continue;
      }
    }

    const dicts = {};
    for (const [locale, text] of Object.entries(pair)) {
      if (locale !== 'en' && locale !== 'zh') continue;
      const literal = text.trim().startsWith('{') ? text.trim() : resolveLiteral(source, text.trim(), before);
      dicts[locale] = literal ? evaluate(literal, source, before) : { __error: 'missing literal' };
    }
    if (!dicts.en || dicts.en.__error) continue;
    found.push({ namespace, en: dicts.en, zh: dicts.zh });
  }
  return found;
}

/** Return the sorted placeholder names used by a template string. */
export function placeholders(template) {
  return [...String(template).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}
