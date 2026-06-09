import type { FlowDropSkin } from './skin.js';

/**
 * Canvas background grid pattern. Mirrors xyflow's BackgroundVariant values:
 *   'dots'  — a square grid of dots (the default)
 *   'lines' — a square grid of solid lines (a "blueprint" / drafter look)
 *   'cross' — small plus-marks at each grid intersection
 *
 * The grid's color is driven separately by the `--fd-grid-pattern-color` token,
 * so any skin can recolor whichever variant a theme chooses.
 */
export type FlowDropGridVariant = 'dots' | 'lines' | 'cross';

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
  canvas?: {
    /** Background grid pattern applied when this theme is selected. Defaults to 'dots'. */
    grid?: FlowDropGridVariant;
  };
}

/**
 * A FlowDrop theme bundles a visual skin (CSS tokens) with UI config (behavioral defaults).
 *
 * Built-in themes: 'default' | 'minimal' | 'drafter'
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

export type FlowDropThemeName = 'default' | 'minimal' | 'drafter';
