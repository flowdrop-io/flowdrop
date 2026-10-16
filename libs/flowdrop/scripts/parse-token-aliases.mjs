/**
 * Extracts the `--fd-*` alias tokens (a value that reads another `--fd-*`
 * token through var()) from the shipped stylesheets.
 *
 * Shared by `generate-token-aliases.mjs` (writes src/lib/styles/tokenAliases.ts)
 * and the drift test, so the checked-in map cannot silently go stale.
 */

/** Markers around the generated dark-alias block at the end of tokens.css. */
export const DARK_ALIAS_BEGIN =
  '/* BEGIN GENERATED dark aliases (pnpm run generate:token-aliases) */';
export const DARK_ALIAS_END = '/* END GENERATED dark aliases */';

/** Remove the generated block, so it never feeds back into the maps it is built from. */
export function stripGeneratedRegion(css) {
  const a = css.indexOf(DARK_ALIAS_BEGIN);
  const b = css.indexOf(DARK_ALIAS_END);
  if (a < 0 || b < a) return css;
  return css.slice(0, a) + css.slice(b + DARK_ALIAS_END.length);
}

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
  const src = stripComments(stripGeneratedRegion(css));
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
 * `dark`  — token → value for every [data-theme='dark'] declaration that
 *           reads another --fd-* token, plus the dark value of every light
 *           alias the dark block sets to a literal (a scoped skin that
 *           redeclares the light alias must restore that literal in dark mode).
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
    else if (k in light) darkAliases[k] = v;
  }
  return { light: sortKeys(light), dark: sortKeys(darkAliases) };
}

function sortKeys(o) {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/**
 * The generated block for the end of tokens.css: `[data-theme='dark']` re-declares
 * every light alias that (transitively) reads a token the dark palette changes.
 *
 * Why: a custom property holding var() is resolved where it is declared. The
 * light aliases are declared on :root, so with data-theme on the editor's scope
 * element (not on <html>) an alias such as `--fd-panel-bg: var(--fd-background)`
 * would keep :root's light value inside a dark editor. Declared again on the
 * themed element, it resolves against that element's dark palette.
 *
 * @param {string[]} sources stylesheet sources (tokens.css, base.css)
 * @returns {string} the block, markers included
 */
export function renderDarkAliasBlock(sources) {
  const maps = buildAliasMaps(sources);
  const darkAll = new Set();
  for (const css of sources) {
    for (const k of Object.keys(parseTokenDeclarations(css).dark)) darkAll.add(k);
  }
  const refs = (expr) => [...expr.matchAll(/var\(\s*--fd-([a-z0-9-_]+)/gi)].map((m) => m[1]);
  const need = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, expr] of Object.entries(maps.light)) {
      if (need.has(name) || darkAll.has(name)) continue;
      if (refs(expr).some((r) => darkAll.has(r) || need.has(r))) {
        need.add(name);
        changed = true;
      }
    }
  }
  const lines = Object.entries(maps.light)
    .filter(([name]) => need.has(name))
    .map(([name, expr]) => `  --fd-${name}: ${expr};`);
  return `${DARK_ALIAS_BEGIN}
/* The aliases the dark palette changes underneath, declared again on the themed
   element (see scripts/parse-token-aliases.mjs renderDarkAliasBlock). Generated
   text, so Prettier leaves it as written. */
/* prettier-ignore */
[data-theme='dark'] {
${lines.join('\n')}
}
${DARK_ALIAS_END}`;
}
