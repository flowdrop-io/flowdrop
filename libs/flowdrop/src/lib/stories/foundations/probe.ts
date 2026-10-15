/**
 * Reads token values the way the editor sees them: inside the active skin's
 * scope, in light or dark. The Storybook preview puts the skin scope on
 * <body> (see .storybook/preview.ts); a hidden probe element with the same
 * scope attribute and its own `data-theme` gets exactly the values a node or
 * panel in that scheme would get, whatever the toolbar shows right now.
 */
import { SCOPE_ATTR } from '../../themes/scopedSkinCss.js';
import type { ParsedToken } from '../tokens/parseTokens.js';

export type Scheme = 'light' | 'dark';

const SKIN_STYLE_ID = 'storybook-skin-tokens';

/** Computed values of `names` (with leading `--`) for one scheme. */
export function readTokens(names: readonly string[], scheme: Scheme): Record<string, string> {
  const probe = document.createElement('div');
  const scope = document.body.getAttribute(SCOPE_ATTR);
  if (scope) probe.setAttribute(SCOPE_ATTR, scope);
  probe.setAttribute('data-theme', scheme);
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const out: Record<string, string> = {};
  for (const name of names) out[name] = style.getPropertyValue(name).trim();
  probe.remove();
  return out;
}

/** Token names (with `--`) the active skin sets itself, light or dark. */
export function skinSetTokens(): Set<string> {
  const css = document.getElementById(SKIN_STYLE_ID)?.textContent ?? '';
  return new Set([...css.matchAll(/(--fd-[\w-]+)\s*:/g)].map((m) => m[1]));
}

/** Calls `cb` whenever the skin or the light/dark switch changes. Returns a stop function. */
export function onSkinChange(cb: () => void): () => void {
  const observer = new MutationObserver(() => cb());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-theme', SCOPE_ATTR]
  });
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}

/**
 * Every token of tokens.css re-declared on one scope, light and dark. A sample
 * nested inside the page's skin scope would otherwise inherit that skin for
 * every token its own skin leaves alone; with this base under it, it shows its
 * skin over the library defaults, exactly as a fresh editor would.
 */
export function baseTokensCss(scope: string, tokens: readonly ParsedToken[]): string {
  const sel = `[${SCOPE_ATTR}="${scope}"]`;
  const decl = (theme: 'light' | 'dark') =>
    tokens
      .filter((t) => t.theme === theme)
      .map((t) => `  ${t.name}: ${t.value};`)
      .join('\n');
  return `${sel} {\n${decl('light')}\n}\n${sel}[data-theme='dark'] {\n${decl('dark')}\n}\n`;
}
