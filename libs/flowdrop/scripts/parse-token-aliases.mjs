/**
 * Extracts the `--fd-*` alias tokens (a value that reads another `--fd-*`
 * token through var()) from the shipped stylesheets.
 *
 * Shared by `generate-token-aliases.mjs` (writes src/lib/styles/tokenAliases.ts)
 * and the drift test, so the checked-in map cannot silently go stale.
 */

/** Drop /* ... *\/ comments. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Split a declaration block body on `;` that sit outside parentheses/quotes. */
function splitDeclarations(body) {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = '';
  for (const ch of body) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ';' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/**
 * Collect `--fd-*` declarations from top-level `:root { }` and
 * `[data-theme='dark'] { }` blocks (the only token scopes in the library).
 * @param {string} css
 * @returns {{ light: Record<string,string>, dark: Record<string,string> }}
 */
export function parseTokenDeclarations(css) {
  const src = stripComments(css);
  const light = {};
  const dark = {};
  const re = /(^|\})\s*(:root|\[data-theme=['"]dark['"]\])\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const start = re.lastIndex;
    let depth = 1;
    let i = start;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.slice(start, i - 1);
    const target = m[2] === ':root' ? light : dark;
    for (const decl of splitDeclarations(body)) {
      const idx = decl.indexOf(':');
      if (idx < 0) continue;
      const name = decl.slice(0, idx).trim();
      if (!name.startsWith('--fd-')) continue;
      target[name.slice('--fd-'.length)] = decl
        .slice(idx + 1)
        .replace(/\s+/g, ' ')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .trim();
    }
    re.lastIndex = i - 1;
  }
  return { light, dark };
}

const REFERENCES_FD_VAR = /var\(\s*--fd-/;

/**
 * Build the alias maps from one or more stylesheet sources.
 *
 * `light` — token → expression, for every :root declaration that reads another
 *           --fd-* token.
 * `dark`  — token → expression for every [data-theme='dark'] declaration that
 *           reads one; `null` when the dark block gives an alias a literal
 *           value (it then no longer follows anything).
 * @param {string[]} sources
 */
export function buildAliasMaps(sources) {
  const light = {};
  const dark = {};
  const lightAll = {};
  for (const css of sources) {
    const parsed = parseTokenDeclarations(css);
    Object.assign(lightAll, parsed.light);
    Object.assign(dark, parsed.dark);
  }
  for (const [k, v] of Object.entries(lightAll)) {
    if (REFERENCES_FD_VAR.test(v)) light[k] = v;
  }
  const darkAliases = {};
  for (const [k, v] of Object.entries(dark)) {
    if (REFERENCES_FD_VAR.test(v)) darkAliases[k] = v;
    else if (k in light) darkAliases[k] = null;
  }
  return { light: sortKeys(light), dark: sortKeys(darkAliases) };
}

function sortKeys(o) {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
}
