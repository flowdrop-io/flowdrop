/**
 * WCAG contrast check for the token pairs that carry text or UI glyphs.
 *
 * Parses `tokens.css` (light `:root`, dark `[data-theme='dark']`) and layers each
 * built-in skin on top the way `buildScopedSkinCss` does:
 *   light = :root + skin.tokens
 *   dark  = :root + [data-theme='dark'] + skin.tokens + skin.darkTokens
 * `var(--fd-x)` references are resolved against the merged map; translucent
 * colours are composited over the surface they sit on.
 *
 * Thresholds:
 *   TEXT  4.5  body text: foreground / muted-foreground / header / *-foreground
 *              on the colour they are printed on.
 *   GLYPH 3.0  large text and UI glyphs (WCAG 1.4.11): status colours as dots,
 *              icons and borders on the app background and on their -muted tint;
 *              the focus ring and the primary colour on the background.
 *
 * Pairs that already fail are listed in KNOWN_FAILURES with their measured
 * ratio. The test asserts the failing set equals that list, so fixing a colour
 * (or breaking another) shows up here. D1 deliberately changes no colours.
 * Graphite has no entry: all its text pairs and status dots pass in both modes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseTokenDeclarations } from '../../../scripts/parse-token-aliases.mjs';
import { defaultSkin, graphiteSkin } from '../../../src/lib/skins/index.js';
import { resolveTheme } from '../../../src/lib/themes/index.js';

type TokenMap = Record<string, string>;
type Mode = 'light' | 'dark';
type RGBA = { r: number; g: number; b: number; a: number };

const css = readFileSync(resolve(__dirname, '../../../src/lib/styles/tokens.css'), 'utf8');
const root = parseTokenDeclarations(css);

// Themes -> skins. minimal uses the slate skin, drafter and graphite their own (themes/index.ts).
const skins: Record<string, { tokens?: TokenMap; darkTokens?: TokenMap }> = {
  default: defaultSkin,
  minimal: resolveTheme('minimal').skin ?? slateSkin,
  drafter: resolveTheme('drafter').skin ?? drafterSkin,
  graphite: resolveTheme('graphite').skin ?? graphiteSkin
};

// Gray palette used by the root tokens (--_gray-n etc.): resolved from the same file.
const palette: TokenMap = {};
for (const m of css.matchAll(/--(_[a-z]+-\d)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) palette[m[1]] = m[2];

function tokensFor(theme: string, mode: Mode): TokenMap {
  const skin = skins[theme];
  return {
    ...root.light,
    ...(mode === 'dark' ? root.dark : {}),
    ...(skin.tokens ?? {}),
    ...(mode === 'dark' ? (skin.darkTokens ?? {}) : {})
  };
}

function parseColor(value: string): RGBA | null {
  const v = value.trim();
  let m = v.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    };
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
  if (m) {
    const a =
      m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  return null;
}

function resolveValue(map: TokenMap, name: string, depth = 0): string | null {
  if (depth > 10) return null;
  const raw = map[name];
  if (raw === undefined) return null;
  const ref = raw.match(/^var\(\s*--(_?[a-z0-9-]+)\s*(?:,[^)]*)?\)$/i);
  if (!ref) return raw;
  const target = ref[1];
  if (target.startsWith('_')) return palette[target] ?? null;
  if (target.startsWith('fd-')) return resolveValue(map, target.slice(3), depth + 1);
  return null;
}

function over(top: RGBA, bottom: RGBA): RGBA {
  const a = top.a + bottom.a * (1 - top.a);
  const ch = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / (a || 1);
  return { r: ch(top.r, bottom.r), g: ch(top.g, bottom.g), b: ch(top.b, bottom.b), a };
}

function luminance({ r, g, b }: RGBA): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a: RGBA, b: RGBA): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Opaque colour of `name`, composited over `surface` (itself composited over the page). */
function solid(map: TokenMap, name: string, mode: Mode, surface?: RGBA): RGBA {
  const value = resolveValue(map, name);
  const c = value ? parseColor(value) : null;
  if (!c) throw new Error(`cannot resolve --fd-${name} (${value})`);
  const page: RGBA =
    mode === 'dark' ? { r: 0, g: 0, b: 0, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  return over(c, surface ?? page);
}

const TEXT = 4.5;
const GLYPH = 3.0;

type Pair = { fg: string; bg: string; min: number; kind: string };

const pairs: Pair[] = [];
const text = (fg: string, bg: string) => pairs.push({ fg, bg, min: TEXT, kind: 'text' });
const glyph = (fg: string, bg: string) => pairs.push({ fg, bg, min: GLYPH, kind: 'glyph' });

text('foreground', 'background');
text('foreground', 'muted');
text('muted-foreground', 'background');
text('muted-foreground', 'muted');
text('muted-foreground', 'card');
text('card-foreground', 'card');
text('header-foreground', 'header');
text('secondary-foreground', 'secondary');
for (const k of ['primary', 'accent', 'success', 'warning', 'error', 'info'])
  text(`${k}-foreground`, k);
glyph('primary', 'background');
glyph('ring', 'background');
for (const k of ['success', 'warning', 'error', 'info']) {
  glyph(k, 'background');
  glyph(k, `${k}-muted`);
}
// Run-status roles (aliases of the above, checked so a theme remap cannot regress them).
for (const k of ['running', 'completed', 'waiting', 'failed', 'skipped']) {
  glyph(`status-${k}`, 'background');
  glyph(`status-${k}`, `status-${k}-soft`);
}

/**
 * Pairs that fail today (D1 changes no colours). Key = theme|mode|fg|bg, value = measured ratio
 * at the time of writing. Fixing one makes the test fail until the entry is deleted.
 */
const KNOWN_FAILURES: Record<string, string> = {
  // Light-mode status colours (green/amber 500 tints) are meant as dots, borders and fills, not as
  // text: they sit at 2.0-2.3:1 on white. White-on-500 fills (success/info/error/primary/accent
  // buttons) miss 4.5:1 for body text. Dark mode passes except minimal (muted text, primary button) and the drafter light skin has its own gaps. No colours change in D1; theme colours are D5.
  'default|light|accent-foreground|accent': '4.23',
  'default|light|error-foreground|error': '3.76',
  'default|light|info-foreground|info': '3.68',
  'default|light|primary-foreground|primary': '3.68',
  'default|light|status-completed|background': '2.28',
  'default|light|status-completed|status-completed-soft': '2.18',
  'default|light|status-waiting|background': '2.15',
  'default|light|status-waiting|status-waiting-soft': '2.07',
  'default|light|success-foreground|success': '2.28',
  'default|light|success|background': '2.28',
  'default|light|success|success-muted': '2.18',
  'default|light|warning|background': '2.15',
  'default|light|warning|warning-muted': '2.07',
  'drafter|light|accent-foreground|accent': '2.43',
  'drafter|light|info-foreground|info': '3.68',
  'drafter|light|primary-foreground|primary': '2.54',
  'drafter|light|primary|background': '2.54',
  'drafter|light|ring|background': '2.43',
  'drafter|light|status-waiting|status-waiting-soft': '2.81',
  'drafter|light|success-foreground|success': '3.74',
  'drafter|light|warning|warning-muted': '2.81',
  'minimal|dark|muted-foreground|background': '4.47',
  'minimal|dark|muted-foreground|card': '4.15',
  'minimal|dark|muted-foreground|muted': '4.15',
  'minimal|dark|primary-foreground|primary': '4.32',
  'minimal|light|accent-foreground|accent': '4.23',
  'minimal|light|error-foreground|error': '3.76',
  'minimal|light|info-foreground|info': '3.68',
  'minimal|light|primary-foreground|primary': '4.32',
  'minimal|light|status-completed|background': '2.12',
  'minimal|light|status-completed|status-completed-soft': '2.18',
  'minimal|light|status-waiting|background': '2.00',
  'minimal|light|status-waiting|status-waiting-soft': '2.07',
  'minimal|light|success-foreground|success': '2.28',
  'minimal|light|success|background': '2.12',
  'minimal|light|success|success-muted': '2.18',
  'minimal|light|warning|background': '2.00',
  'minimal|light|warning|warning-muted': '2.07'
};

const key = (theme: string, mode: Mode, p: Pair) => `${theme}|${mode}|${p.fg}|${p.bg}`;

function measure() {
  const out: { key: string; ratio: number; min: number }[] = [];
  for (const theme of Object.keys(skins)) {
    for (const mode of ['light', 'dark'] as Mode[]) {
      const map = tokensFor(theme, mode);
      const page = solid(map, 'background', mode);
      for (const p of pairs) {
        // Backgrounds are composited over the app background; text over its own background.
        const bg = solid(map, p.bg, mode, p.bg === 'background' ? undefined : page);
        const fg = solid(map, p.fg, mode, bg);
        out.push({ key: key(theme, mode, p), ratio: ratio(fg, bg), min: p.min });
      }
    }
  }
  return out;
}

describe('token contrast (WCAG AA)', () => {
  const results = measure();

  it('covers every theme in both modes', () => {
    expect(results.length).toBe(Object.keys(skins).length * 2 * pairs.length);
  });

  it('every pair meets its threshold, except the known failures', () => {
    const failing = results.filter((r) => r.ratio < r.min).map((r) => r.key);
    expect(failing.sort()).toEqual(Object.keys(KNOWN_FAILURES).sort());
  });

  it('known failures are real (entry removed once fixed)', () => {
    for (const k of Object.keys(KNOWN_FAILURES)) {
      const r = results.find((x) => x.key === k);
      expect(r, k).toBeDefined();
      expect(r!.ratio).toBeLessThan(r!.min);
    }
  });
});
