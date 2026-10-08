import type { FlowDropSkin } from '../types/skin.js';

/**
 * Graphite: the app's own look, a calm tool UI where colour carries meaning.
 *
 * One ink-coloured primary action per view, one blue accent for selection,
 * focus and "running", and three status hues (green completed, amber waiting
 * for you, red failed) that appear only where something has a status. Greys
 * lean slightly cool. Shape sits on a 4px grid: 4px radius for controls and
 * nodes, 8px for sheets, 1px rules, almost no shadow. Type is Inter at the
 * 11 / 12 / 13 / 15 / 20 scale from tokens.css.
 *
 * This is not the flowdrop.io or Factorial brand kit. Every token a colour
 * role needs is set here in both modes, so nothing falls back to the blue
 * of the default theme.
 *
 * The font is named, not loaded: import `@flowdrop/flowdrop/styles/fonts/inter.css`
 * (or serve the same @font-face) to get Inter; without it the stack falls
 * back to `system-ui`.
 *
 * Contrast (WCAG 2.1, see tests/unit/styles/contrast.test.ts): every text
 * pair is at least 4.5:1 and every status dot at least 3:1, in both modes.
 */

/** Inter first, then the system UI font when the @font-face is not loaded. */
export const GRAPHITE_FONT =
  "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const graphiteSkin: FlowDropSkin = {
  font: GRAPHITE_FONT,
  tokens: {
    /* ----- Surfaces: white panels on a cool grey canvas ----- */
    background: '#ffffff',
    foreground: '#16191f',
    muted: '#f3f4f6',
    'muted-foreground': '#5a6270',
    subtle: '#eceef1',
    card: '#ffffff',
    'card-foreground': '#16191f',
    header: '#fafbfc',
    'header-foreground': '#16191f',
    'header-gradient': 'none',
    'surface-tint': 'transparent',
    'layout-background': '#f6f7f9',
    'canvas-bg': '#f6f7f9',
    'grid-pattern-color': '#c9ced6',
    backdrop: 'rgba(246, 247, 249, 0.85)',

    /* ----- Rules: 1px, cool grey ----- */
    border: '#dfe2e7',
    'border-muted': '#ebedf0',
    'border-strong': '#b8bec8',
    ring: '#2457d6',

    /* ----- Nodes: flat, 4px corners, 1px outline; selection is the accent ----- */
    'node-radius': '4px',
    'node-border': '#b8bec8',
    'node-border-hover': '#8c94a1',
    'node-border-width': '1px',
    'node-shadow': 'none',
    'node-shadow-hover': 'none',
    'handle-border': '#ffffff',
    'edge-trigger': '#16191f',
    'edge-trigger-hover': '#16191f',
    'edge-trigger-selected': '#2457d6',
    'edge-tool-selected': '#2457d6',
    'edge-data': '#8c94a1',
    'edge-data-hover': '#5a6270',
    'edge-data-selected': '#2457d6',
    'edge-loopback': '#5a6270',
    'edge-loopback-hover': '#3d4350',
    'edge-loopback-selected': '#2457d6',

    /* ----- Shape: 4px controls and nodes, 8px sheets ----- */
    'radius-sm': '4px',
    'radius-md': '4px',
    'radius-lg': '8px',
    'radius-xl': '8px',
    'control-radius': '4px',
    'shadow-sm': 'none',
    'shadow-md': '0 2px 6px rgb(22 25 31 / 0.06)',
    'shadow-lg': '0 8px 20px rgb(22 25 31 / 0.1)',

    /* ----- Primary action: ink. One per view. ----- */
    primary: '#16191f',
    'primary-hover': '#2b303a',
    'primary-foreground': '#ffffff',
    'primary-muted': '#eceef1',

    secondary: '#f1f3f5',
    'secondary-hover': '#e5e8ec',
    'secondary-foreground': '#16191f',

    /* ----- Accent: selection, focus, the active mode, "running" ----- */
    accent: '#2457d6',
    'accent-hover': '#1b44ae',
    'accent-foreground': '#ffffff',
    'accent-muted': '#e8effd',
    info: '#2457d6',
    'info-hover': '#1b44ae',
    'info-foreground': '#ffffff',
    'info-muted': '#e8effd',

    /* ----- Status: completed, waiting for you, failed ----- */
    success: '#1b7f45',
    'success-hover': '#14653a',
    'success-foreground': '#ffffff',
    'success-muted': '#e6f4ea',
    warning: '#b45309',
    'warning-hover': '#92400e',
    'warning-foreground': '#ffffff',
    'warning-muted': '#fdf1e1',
    error: '#c0263b',
    'error-hover': '#9f1d30',
    'error-foreground': '#ffffff',
    'error-muted': '#fce8eb',

    'scrollbar-thumb': '#cdd1d8',
    'scrollbar-thumb-hover': '#b0b6c0',
    'scrollbar-track': '#f3f4f6',
    'scrollbar-radius': '4px',

    'sidebar-category-color': '#5a6270',
    'sidebar-flat-item-color': '#16191f'
  },

  darkTokens: {
    /* Dark: the light tokens above also apply in dark mode, so every colour
       the light block sets is set again here. */
    background: '#14161a',
    foreground: '#eceef2',
    muted: '#1b1e23',
    'muted-foreground': '#a0a8b5',
    subtle: '#23272d',
    card: '#1b1e23',
    'card-foreground': '#eceef2',
    header: '#171a1f',
    'header-foreground': '#eceef2',
    'header-gradient': 'none',
    'surface-tint': 'transparent',
    'layout-background': '#101215',
    'canvas-bg': '#101215',
    'grid-pattern-color': '#2c3037',
    backdrop: 'rgba(16, 18, 21, 0.85)',

    border: '#2c3037',
    'border-muted': '#23272d',
    'border-strong': '#434955',
    ring: '#7aa2ff',

    'node-border': '#434955',
    'node-border-hover': '#5d6573',
    'handle-border': '#14161a',
    'edge-trigger': '#eceef2',
    'edge-trigger-hover': '#ffffff',
    'edge-trigger-selected': '#7aa2ff',
    'edge-tool-selected': '#7aa2ff',
    'edge-data': '#5d6573',
    'edge-data-hover': '#a0a8b5',
    'edge-data-selected': '#7aa2ff',
    'edge-loopback': '#7d8594',
    'edge-loopback-hover': '#a0a8b5',
    'edge-loopback-selected': '#7aa2ff',

    'shadow-sm': 'none',
    'shadow-md': '0 2px 6px rgb(0 0 0 / 0.3)',
    'shadow-lg': '0 8px 20px rgb(0 0 0 / 0.4)',

    primary: '#eceef2',
    'primary-hover': '#ffffff',
    'primary-foreground': '#14161a',
    'primary-muted': '#23272d',

    secondary: '#23272d',
    'secondary-hover': '#2c3037',
    'secondary-foreground': '#eceef2',

    accent: '#7aa2ff',
    'accent-hover': '#9bb9ff',
    'accent-foreground': '#0e1116',
    'accent-muted': '#1c2640',
    info: '#7aa2ff',
    'info-hover': '#9bb9ff',
    'info-foreground': '#0e1116',
    'info-muted': '#1c2640',

    success: '#4cc27f',
    'success-hover': '#74d49c',
    'success-foreground': '#0b1a12',
    'success-muted': '#16291f',
    warning: '#f0b25a',
    'warning-hover': '#f5c783',
    'warning-foreground': '#1a1204',
    'warning-muted': '#2d2314',
    error: '#ff6b7d',
    'error-hover': '#ff95a2',
    'error-foreground': '#1a0b0e',
    'error-muted': '#331a1f',

    'scrollbar-thumb': '#2c3037',
    'scrollbar-thumb-hover': '#434955',
    'scrollbar-track': '#14161a',

    'sidebar-category-color': '#a0a8b5',
    'sidebar-flat-item-color': '#eceef2'
  }
};
