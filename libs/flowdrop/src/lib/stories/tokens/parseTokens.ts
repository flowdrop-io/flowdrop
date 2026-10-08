/**
 * Parser for `src/lib/styles/tokens.css`, used by the Storybook Tokens pages.
 *
 * The CSS file is the single source of truth: nothing in the Tokens pages is
 * copied by hand. This module turns the file text into a flat list of tokens
 * with their `@public` / `@internal` marker, the section comment they sit
 * under and the theme block (light `:root` or `[data-theme='dark']`) they are
 * declared in.
 */

export type TokenVisibility = 'public' | 'internal';
export type TokenTheme = 'light' | 'dark';

export type TokenCategory =
  | 'colour'
  | 'status'
  | 'spacing'
  | 'radius'
  | 'shadow'
  | 'text'
  | 'leading'
  | 'font'
  | 'size'
  | 'transition'
  | 'other';

export interface ParsedToken {
  /** Custom property name, including the leading `--`. */
  name: string;
  /** Declared value, whitespace collapsed. May be a `var()` reference. */
  value: string;
  visibility: TokenVisibility;
  /** Section heading from the nearest preceding section comment. */
  section: string;
  /** Free text after the marker in the trailing comment (e.g. `4px`). */
  note: string;
  theme: TokenTheme;
  category: TokenCategory;
}

const TOKEN_RE =
  /\/\*([\s\S]*?)\*\/|([^{};/]+)\{|\}|(--[\w-]+)\s*:\s*([^;]+);([ \t]*\/\*([^\n]*?)\*\/)?/g;

function cleanSection(comment: string): string | null {
  const text = comment.trim();
  // `/* ----- SURFACES (Backgrounds) ----- */` and multi-line `-----` comments.
  const dashed = /^-{3,}\s*([^\n]*?)\s*(?:-{3,})?\s*(?:\n|$)/.exec(text);
  if (dashed) return dashed[1].replace(/\s*-+\s*$/, '').trim() || null;
  // A short single-line plain comment (`/* Grays - Tinted scale ... */`).
  if (!text.includes('\n') && !text.includes('@') && !text.startsWith('=') && text.length < 90) {
    return text;
  }
  return null;
}

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim();
}

/** Parse the token file. Pure: same input, same output. */
export function parseTokens(css: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  let section = '';
  let theme: TokenTheme = 'light';
  let depth = 0;

  for (const m of css.matchAll(TOKEN_RE)) {
    if (m[1] !== undefined) {
      const s = cleanSection(m[1]);
      if (s) section = s;
    } else if (m[2] !== undefined) {
      depth += 1;
      if (depth === 1) theme = /dark/.test(m[2]) ? 'dark' : 'light';
    } else if (m[3] === undefined) {
      depth = Math.max(0, depth - 1);
    } else {
      const trailing = (m[6] ?? '').trim();
      const marker = /@(public|internal)\b/.exec(trailing);
      const visibility: TokenVisibility = marker
        ? (marker[1] as TokenVisibility)
        : m[3].startsWith('--_')
          ? 'internal'
          : 'public';
      const note = trailing
        .replace(/@(public|internal)\b/, '')
        .replace(/^\s*[—-]?\s*/, '')
        .trim();
      const token: ParsedToken = {
        name: m[3],
        value: collapse(m[4]),
        visibility,
        section,
        note,
        theme,
        category: 'other'
      };
      tokens.push(token);
    }
  }

  const light = new Map<string, string>();
  for (const t of tokens) if (t.theme === 'light') light.set(t.name, t.value);
  for (const t of tokens) t.category = categorize(t, light);
  return tokens;
}

/** Follow `var(--x)` references through the light block to a literal value. */
export function resolveLiteral(value: string, light: Map<string, string>, depth = 0): string {
  const ref = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(value);
  if (!ref || depth > 10) return value;
  const next = light.get(ref[1]);
  return next === undefined ? value : resolveLiteral(next, light, depth + 1);
}

const COLOUR_LITERAL = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|color-mix\()/i;
const LENGTH_LITERAL = /^-?[\d.]+(px|rem|em)$/;

function categorize(token: ParsedToken, light: Map<string, string>): TokenCategory {
  const n = token.name;
  if (n.startsWith('--fd-status-')) return 'status';
  if (n.startsWith('--fd-space-')) return 'spacing';
  if (n.startsWith('--fd-radius-') || n === '--fd-control-radius') return 'radius';
  if (n.startsWith('--fd-shadow-')) return 'shadow';
  if (n.startsWith('--fd-text-')) return 'text';
  if (n.startsWith('--fd-leading-')) return 'leading';
  if (n.startsWith('--fd-font-')) return 'font';
  if (n.startsWith('--fd-transition-')) return 'transition';
  const literal = resolveLiteral(token.value, light);
  if (/^--fd-(control-(sm|md|lg)|panel-header)$/.test(n)) return 'size';
  if (/^--fd-size-/.test(n) && LENGTH_LITERAL.test(literal)) return 'size';
  if (COLOUR_LITERAL.test(literal)) return 'colour';
  return 'other';
}

/** Group tokens by section, preserving file order. */
export function groupBySection(
  tokens: ParsedToken[]
): Array<{ section: string; tokens: ParsedToken[] }> {
  const groups: Array<{ section: string; tokens: ParsedToken[] }> = [];
  for (const t of tokens) {
    let g = groups.find((x) => x.section === t.section);
    if (!g) groups.push((g = { section: t.section, tokens: [] }));
    g.tokens.push(t);
  }
  return groups;
}
