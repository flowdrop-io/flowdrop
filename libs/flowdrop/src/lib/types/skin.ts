export interface FlowDropSkinTokens {
  /** Keys are --fd-* token names without the prefix, values are CSS values.
   * e.g. { 'radius-md': '4px', 'primary': '#8b5cf6' }
   *
   * Display-control tokens (toggle visual variants via CSS).
   * @deprecated Set `FlowDropThemeConfig.display` instead (typed, and kept out of
   * the look). The tokens still work as a fallback until 3.0:
   *   'node-icon-display'      — 'flex' | 'none'  (squircle icon wrapper)   → display.nodeIcon
   *   'node-circle-display'    — 'flex' | 'none'  (circle dot)              → display.nodeIcon
   *   'sidebar-search-display' — 'flex' | 'none'                           → display.sidebarSearch
   *   'sidebar-header-display' — 'flex' | 'none'                           → display.sidebarHeader
   *   'sidebar-card-display'   — 'block' | 'none' (accordion card list)    → display.sidebarList
   *   'sidebar-flat-display'   — 'block' | 'none' (flat dot-name list)     → display.sidebarList
   *   'navbar-split-display'   — 'flex' | 'none'                           → display.navbarActions
   *   'navbar-dropdown-display'— 'flex' | 'none'                           → display.navbarActions
   *
   * Port color token:
   *   'port-skin-color' — when set, overrides all port handle colors (e.g. 'var(--fd-muted-foreground)')
   *                       leave unset (default) to use per-type colors from getDataTypeColor()
   */
  [tokenName: string]: string;
}

export interface FlowDropSkin {
  /** Optional base skin name. When set, its tokens are used as a base and merged
   * with any inline tokens provided. Useful for extending a built-in skin:
   * @example
   * <App skin={{ name: 'minimal', tokens: { primary: '#e11d48' } }} />
   */
  name?: FlowDropSkinName | (string & {});
  /**
   * Font family for the editor, as a CSS `font-family` value, e.g.
   * `"'Inter Variable', system-ui, sans-serif"`. Sets `--fd-font-sans` on the
   * editor's scope element and applies it to the editor subtree (including its
   * portalled overlays). The skin only names the family: it does not load it,
   * the host page (or the Drupal library) must provide the @font-face.
   * Unset (default): the editor inherits the host page's font, as before.
   */
  font?: string;
  /** CSS token overrides injected on the editor's own scope element (not :root) — active in light mode (and as base) */
  tokens?: FlowDropSkinTokens;
  /** CSS token overrides injected under [data-theme='dark'] on the editor's scope element — active in dark mode only */
  darkTokens?: FlowDropSkinTokens;
}

export type FlowDropSkinName = 'default' | 'slate' | 'drafter' | 'graphite';
