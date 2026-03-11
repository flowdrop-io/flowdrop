export interface FlowDropSkinTokens {
	/** Keys are --fd-* token names without the prefix, values are CSS values.
	 * e.g. { 'radius-md': '4px', 'primary': '#8b5cf6' }
	 *
	 * Display-control tokens (toggle visual variants via CSS):
	 *   'node-icon-display'      — 'flex' | 'none'  (squircle icon wrapper)
	 *   'node-circle-display'    — 'flex' | 'none'  (circle dot)
	 *   'sidebar-search-display' — 'flex' | 'none'
	 *   'sidebar-header-display' — 'flex' | 'none'
	 *   'sidebar-card-display'   — 'block' | 'none' (accordion card list)
	 *   'sidebar-flat-display'   — 'block' | 'none' (flat dot-name list)
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
	/** CSS token overrides scoped to the FlowDrop instance root element */
	tokens?: FlowDropSkinTokens;
}

export type FlowDropSkinName = 'default' | 'slate';
