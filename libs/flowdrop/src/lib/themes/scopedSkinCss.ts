import type { FlowDropSkin, FlowDropSkinTokens } from '../types/skin.js';
import type { FlowDropDisplayConfig } from '../types/theme.js';
import { LIGHT_ALIASES, DARK_ALIASES } from '../styles/tokenAliases.js';
import { SCOPE_ATTR } from '../utils/portal.js';

export { SCOPE_ATTR };

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

function rule(
  selector: string,
  declarations: Record<string, string>,
  rawDeclarations: readonly string[] = []
): string {
  const body = [
    ...Object.entries(declarations).map(([k, v]) => `  --fd-${k}: ${v};`),
    ...rawDeclarations.map((d) => `  ${d};`)
  ].join('\n');
  return `${selector} {\n${body}\n}\n`;
}

/**
 * The `--fd-*-display` tokens a theme's `config.display` stands for.
 *
 * Structure used to be switched by skin tokens; it now lives in the theme
 * config. The components still read the tokens, so the config is translated
 * here, and written *after* the skin's own tokens: config wins, a token set by
 * the skin (or by the host's CSS, when the config sets nothing) is the
 * deprecated fallback until 3.0, and neither falls through to tokens.css.
 */
export function displayTokens(display: FlowDropDisplayConfig | undefined): FlowDropSkinTokens {
  const out: FlowDropSkinTokens = {};
  if (!display) return out;
  if (display.nodeIcon) {
    const dot = display.nodeIcon === 'dot';
    out['node-icon-display'] = dot ? 'none' : 'flex';
    out['node-circle-display'] = dot ? 'flex' : 'none';
  }
  if (display.sidebarList) {
    const flat = display.sidebarList === 'flat';
    out['sidebar-card-display'] = flat ? 'none' : 'block';
    out['sidebar-flat-display'] = flat ? 'block' : 'none';
  }
  if (display.sidebarSearch !== undefined) {
    out['sidebar-search-display'] = display.sidebarSearch ? 'flex' : 'none';
  }
  if (display.sidebarHeader !== undefined) {
    out['sidebar-header-display'] = display.sidebarHeader ? 'flex' : 'none';
  }
  if (display.navbarActions) {
    const split = display.navbarActions === 'split';
    out['navbar-split-display'] = split ? 'flex' : 'none';
    out['navbar-dropdown-display'] = split ? 'none' : 'flex';
  }
  return out;
}

/** A skin's light tokens with its font and the theme's display switches folded in. */
export function effectiveSkinTokens(
  skin: Pick<FlowDropSkin, 'tokens' | 'font'> | undefined,
  display?: FlowDropDisplayConfig
): FlowDropSkinTokens {
  return {
    ...(skin?.tokens ?? {}),
    ...(skin?.font ? { 'font-sans': skin.font } : {}),
    ...displayTokens(display)
  };
}

/** Dark-mode alias values: the light ones with the dark block's overrides applied. */
function effectiveDarkAliases(): Record<string, string> {
  return { ...LIGHT_ALIASES, ...DARK_ALIASES };
}

/**
 * The scope id as written everywhere: the `data-fd-scope` attribute, the skin
 * rule and `FlowDropInstance.skinScope`. Clean once at the source so every
 * side agrees; idempotent, so cleaning again is harmless.
 */
export function toScopeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Attribute selector for a scope id (cleaned again, so a raw id cannot inject CSS). */
export function scopeSelector(scopeId: string): string {
  return `[${SCOPE_ATTR}="${toScopeId(scopeId)}"]`;
}

/**
 * CSS for one editor instance's skin, confined to its scope element.
 *
 *   tokens     → [data-fd-scope="id"]                        (light / base)
 *   darkTokens → [data-theme='dark'] [data-fd-scope="id"]    (dark)
 *
 * data-theme stays page-global (on <html>, or any ancestor of the scope).
 * `display` (the theme config's layout switches) is merged into the light tokens.
 * Returns '' when the skin and display set nothing.
 */
export function buildScopedSkinCss(
  scopeId: string,
  skin: Pick<FlowDropSkin, 'tokens' | 'darkTokens' | 'font'> | undefined,
  display?: FlowDropDisplayConfig
): string {
  const tokens: FlowDropSkinTokens = effectiveSkinTokens(skin, display);
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
    // A named font also has to take effect: the editor otherwise inherits the host's.
    css += rule(
      scope,
      { ...lightAliases, ...tokens },
      skin?.font ? ['font-family: var(--fd-font-sans)'] : []
    );
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
