import type { FlowDropSkin } from './skin.js';

/**
 * Behavioral configuration bundled with a theme.
 * These are initial-state flags, not CSS — they control runtime defaults.
 */
export interface FlowDropThemeConfig {
	sidebar?: {
		/** Whether the sidebar starts open. Defaults to true. */
		defaultOpen?: boolean;
		/** Whether category <details> accordion sections start open in card mode. Defaults to false. */
		categoriesDefaultOpen?: boolean;
	};
}

/**
 * A FlowDrop theme bundles a visual skin (CSS tokens) with UI config (behavioral defaults).
 *
 * Built-in themes: 'default' | 'minimal'
 *
 * @example
 * // Use a built-in theme by name
 * <App theme="minimal" />
 *
 * @example
 * // Extend a built-in theme with custom token overrides
 * <App theme={{ name: 'minimal', skin: { tokens: { primary: '#e11d48' } } }} />
 */
export interface FlowDropTheme {
	/** Optional built-in theme name used as a merge base */
	name?: FlowDropThemeName | (string & {});
	/** Visual skin — CSS token overrides */
	skin?: FlowDropSkin;
	/** Behavioral configuration defaults */
	config?: FlowDropThemeConfig;
}

export type FlowDropThemeName = 'default' | 'minimal';
