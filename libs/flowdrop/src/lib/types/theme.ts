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
 * Structural layout switches: which variant of a piece of chrome the editor
 * shows. They are structure, not colour, so they belong to the theme's
 * config and not to a skin's tokens. Every field is optional; an unset field
 * falls back to the deprecated `--fd-*-display` token (so CSS written for
 * 2.x keeps working until 3.0) and then to the built-in default.
 */
export interface FlowDropDisplayConfig {
  /** Node icon: a rounded-square icon wrapper ('squircle', default) or a small colour dot ('dot'). */
  nodeIcon?: 'squircle' | 'dot';
  /** Sidebar node list: accordion cards per category ('cards', default) or a flat dot-and-name list ('flat'). */
  sidebarList?: 'cards' | 'flat';
  /** Show the sidebar search input. Defaults to true. */
  sidebarSearch?: boolean;
  /** Show the sidebar "Components" header. Defaults to true. */
  sidebarHeader?: boolean;
  /** Navbar actions: a primary action plus a dropdown ('dropdown', default) or all actions as separate buttons ('split'). */
  navbarActions?: 'dropdown' | 'split';
}

/**
 * Behavioral configuration bundled with a theme.
 * These are initial-state flags, not CSS — they control runtime defaults.
 */
export interface FlowDropThemeConfig {
  /** Layout switches that used to be skin tokens (`--fd-node-icon-display` and friends). */
  display?: FlowDropDisplayConfig;
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
