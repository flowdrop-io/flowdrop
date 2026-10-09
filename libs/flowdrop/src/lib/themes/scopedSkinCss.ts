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
 * `messages: 'document'` as tokens. The message components read each of these
 * with the look they had before as the fallback, so a theme that does not ask
 * for the document anatomy keeps its bubbles. Colours (the dark user bubble)
 * belong to the skin; this is shape and structure.
 */
const DOCUMENT_MESSAGE_TOKENS: FlowDropSkinTokens = {
  'msg-avatar-display': 'none',
  'msg-header-display': 'none',
  'msg-meta-display': 'flex',
  'msg-meta-time-display': 'inline',
  'msg-footer-extras-display': 'none',
  'msg-footer-border-width': '0',
  'msg-stream-pad': 'var(--fd-space-md)',
  'msg-gutter': '0',
  'msg-gap': 'var(--fd-space-xl)',
  'msg-footer-gap': 'var(--fd-space-2xs)',
  'msg-footer-top': 'var(--fd-space-2xs)',
  'msg-footer-pad-top': '0',
  'msg-link-color': 'var(--fd-muted-foreground)',
  'msg-link-decoration': 'none',
  'msg-typing-bg': 'transparent',
  'msg-typing-pad': 'var(--fd-space-xs) 0',
  'interrupt-card-pad': 'var(--fd-space-md)',
  'interrupt-card-radius': 'var(--fd-radius-surface)',
  'interrupt-card-bg': 'color-mix(in srgb, var(--fd-warning-muted) 50%, var(--fd-background))',
  'interrupt-card-border': 'color-mix(in srgb, var(--fd-warning) 40%, transparent)',
  'interrupt-card-shadow': 'none',
  'composer-radius': 'var(--fd-radius-bubble)',
  'composer-border': 'var(--fd-border-strong)',
  'composer-pad': '6px 6px 6px 12px',
  'composer-field-height': 'var(--fd-control-md)',
  'composer-input-pad-x': '0',
  'composer-focus-ring': '0 0 0 3px var(--fd-accent-muted)',
  'composer-send-idle-bg': 'var(--fd-subtle)',
  'composer-send-idle-fg': 'var(--fd-muted-foreground)',
  'composer-send-idle-opacity': '1',
  'msg-user-max': '85%',
  'msg-user-pad': 'var(--fd-space-xs) var(--fd-space-md)',
  'msg-user-radius': 'var(--fd-radius-bubble)',
  'msg-tail-radius': 'var(--fd-radius-sm)',
  'msg-reply-tail-radius': '0',
  'msg-reply-max': '100%',
  'msg-reply-pad': '0',
  'msg-reply-bg': 'transparent',
  'msg-reply-border-width': '0',
  'msg-reply-shadow': 'none',
  'msg-reply-radius': '0',
  'msg-text-size': 'var(--fd-text-body)',
  'msg-text-leading': '1.55',
  'msg-p-gap': 'var(--fd-space-xs)',
  'msg-code-bg': 'var(--fd-subtle)',
  'msg-pre-bg': 'var(--fd-subtle)',
  'msg-pre-fg': 'var(--fd-foreground)',
  'msg-pre-radius': 'var(--fd-control-radius)',
  'msg-pre-size': 'var(--fd-text-meta)',
  'msg-pre-border-width': '0',
  'msg-quote-style': 'normal',
  'msg-h1-size': 'var(--fd-text-md)',
  'msg-h2-size': 'var(--fd-text-md)',
  'msg-h3-size': 'var(--fd-text-body)'
};

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
    out['sidebar-card-display'] = flat ? 'none' : 'block'; // 'rows' is a card list drawn flat
    out['sidebar-flat-display'] = flat ? 'block' : 'none';
  }
  if (display.sidebarSearch !== undefined) {
    out['sidebar-search-display'] = display.sidebarSearch ? 'flex' : 'none';
  }
  if (display.sidebarHeader !== undefined) {
    out['sidebar-header-display'] = display.sidebarHeader ? 'flex' : 'none';
  }
  if (display.nodeDetails) {
    const compact = display.nodeDetails === 'compact';
    out['node-desc-display'] = compact ? 'none' : '-webkit-box';
    out['node-desc-block-display'] = compact ? 'none' : 'block';
    if (compact) {
      // Without the description row (row gap + one line) the header is 2 gaps +
      // the title: 60px, still on the 20px grid the port handles snap to.
      out['node-header-min-height'] =
        'calc(var(--fd-node-header-gap) * 2 + var(--fd-node-header-title-height) - var(--fd-node-border-width))';
    }
  }
  if (display.navbarActions) {
    const split = display.navbarActions === 'split';
    out['navbar-split-display'] = split ? 'flex' : 'none';
    out['navbar-dropdown-display'] = split ? 'none' : 'flex';
  }
  if (display.messages === 'document') {
    Object.assign(out, DOCUMENT_MESSAGE_TOKENS);
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
