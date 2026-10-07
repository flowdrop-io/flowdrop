import type { FlowDropSkin, FlowDropSkinTokens } from '../types/skin.js';
import { LIGHT_ALIASES, DARK_ALIASES } from '../styles/tokenAliases.js';

/** Attribute that scopes one editor instance's skin (set on `.flowdrop-root`, copied onto portalled nodes). */
export const SCOPE_ATTR = 'data-fd-scope';

const VAR_REF = /var\(\s*--fd-([a-z0-9_-]+)/gi;

function dependenciesOf(expression: string): string[] {
  return [...expression.matchAll(VAR_REF)].map((m) => m[1]);
}

/**
 * Aliases (transitively) reading any of `seeds`, minus `exclude`.
 *
 * A custom property holding var() is resolved on the element that declares it,
 * so `--fd-panel-bg: var(--fd-background)` declared on :root keeps the default
 * background even when a skin sets --fd-background lower down. The scoped rule
 * redeclares every such alias next to the skin's own tokens.
 */
export function aliasClosure(
  seeds: Iterable<string>,
  aliases: Readonly<Record<string, string>>,
  exclude: ReadonlySet<string> = new Set()
): Record<string, string> {
  const known = new Set(seeds);
  const result: Record<string, string> = {};
  let grew = true;
  while (grew) {
    grew = false;
    for (const [name, expression] of Object.entries(aliases)) {
      if (name in result || exclude.has(name)) continue;
      if (dependenciesOf(expression).some((dep) => known.has(dep))) {
        result[name] = expression;
        known.add(name);
        grew = true;
      }
    }
  }
  return result;
}

function rule(selector: string, declarations: Record<string, string>): string {
  const body = Object.entries(declarations)
    .map(([k, v]) => `  --fd-${k}: ${v};`)
    .join('\n');
  return `${selector} {\n${body}\n}\n`;
}

/** Dark-mode alias values: the light ones with the dark block's overrides applied. */
function effectiveDarkAliases(): Record<string, string> {
  return { ...LIGHT_ALIASES, ...DARK_ALIASES };
}

/** Keep the id usable inside an attribute selector. */
export function scopeSelector(scopeId: string): string {
  return `[${SCOPE_ATTR}="${scopeId.replace(/[^a-zA-Z0-9_-]/g, '_')}"]`;
}

/**
 * CSS for one editor instance's skin, confined to its scope element.
 *
 *   tokens     → [data-fd-scope="id"]                        (light / base)
 *   darkTokens → [data-theme='dark'] [data-fd-scope="id"]    (dark)
 *
 * data-theme stays page-global (on <html>, or any ancestor of the scope).
 * Returns '' when the skin sets nothing.
 */
export function buildScopedSkinCss(
  scopeId: string,
  skin: Pick<FlowDropSkin, 'tokens' | 'darkTokens'> | undefined
): string {
  const tokens: FlowDropSkinTokens = skin?.tokens ?? {};
  const darkTokens: FlowDropSkinTokens = skin?.darkTokens ?? {};
  const lightKeys = Object.keys(tokens);
  const darkKeys = Object.keys(darkTokens);
  if (lightKeys.length === 0 && darkKeys.length === 0) return '';

  const scope = scopeSelector(scopeId);
  // A skin's light tokens also apply in dark mode (as with the old :root rule),
  // so an alias a skin sets in either palette is never overridden here.
  const skinSet = new Set([...lightKeys, ...darkKeys]);
  let css = '';

  const lightAliases = aliasClosure(lightKeys, LIGHT_ALIASES, skinSet);
  if (lightKeys.length > 0) {
    css += rule(scope, { ...lightAliases, ...tokens });
  }

  // Every alias the light rule redeclares shadows the :root dark value, so the
  // dark rule restores it — including dark values that are literals, which the
  // closure (it follows var() references) would never pick up.
  const darkAliases: Record<string, string> = {
    ...aliasClosure(skinSet, effectiveDarkAliases(), skinSet)
  };
  for (const name of Object.keys(lightAliases)) {
    if (name in DARK_ALIASES && !(name in darkAliases)) darkAliases[name] = DARK_ALIASES[name];
  }
  if (darkKeys.length > 0 || Object.keys(darkAliases).length > 0) {
    css += rule(`[data-theme='dark'] ${scope}`, { ...darkAliases, ...darkTokens });
  }

  return css;
}
