import type { FlowDropSkin } from '../types/skin';

/**
 * Drafter — a "blueprint" skin: a soft mint canvas with a faint emerald square
 * grid and translucent, lightly-outlined nodes (see ref-image.png). Port and
 * category-icon colors are intentionally left untouched (no `port-skin-color`
 * override) so data-type ports and node icons keep their full color, popping
 * against the muted draft surface.
 *
 * The square grid itself is rendered by WorkflowEditor: when the active theme
 * is `drafter` it switches the xyflow Background to the Lines variant and
 * colors it with `--fd-grid-pattern-color` (defined below).
 */
export const drafterSkin: FlowDropSkin = {
  tokens: {
    // --- Light "blueprint paper" palette (soft mint) ---
    background: '#f1faf4',
    foreground: '#0f231a',
    muted: '#e3f3ea',
    'muted-foreground': '#5b7d6b',
    // Translucent green-tinted node body so the grid faintly reads through
    card: 'rgba(240, 253, 246, 0.85)',
    'card-foreground': '#0f231a',
    border: '#c2e3d0',
    'border-muted': '#d7ecdf',
    'border-strong': '#a4d4b8',
    header: 'rgba(209, 250, 229, 0.7)',
    'header-foreground': '#13402c',
    'header-gradient': 'none',
    'layout-background': 'linear-gradient(135deg, #f3faf6 0%, #e9f6ef 100%)',

    // Faint emerald square grid lines
    'grid-pattern-color': 'rgba(16, 185, 129, 0.16)',

    // Emerald brand accent
    primary: '#10b981',
    'primary-hover': '#059669',
    'primary-foreground': '#ffffff',
    'primary-muted': 'rgba(16, 185, 129, 0.12)',

    // Thin emerald-tinted node outline; white port ring so colored ports pop
    'node-border': '#86efac',
    'node-border-hover': '#34d399',
    'handle-border': '#ffffff',

    // Flat: near-shadowless cards to suit the draft surface
    'shadow-md': '0 1px 2px rgba(6, 78, 59, 0.06)',
    'shadow-lg': '0 4px 10px rgba(6, 78, 59, 0.08)',

    // Scrollbar + backdrop tuned to the mint surface
    'scrollbar-thumb': '#c2e3d0',
    'scrollbar-track': '#e9f6ef',
    backdrop: 'rgba(241, 250, 244, 0.9)'
  },

  darkTokens: {
    // --- Dark "blueprint" palette (deep green-slate) ---
    background: '#0c1f17',
    foreground: '#d1fae5',
    muted: '#13291f',
    'muted-foreground': '#6b9080',
    card: 'rgba(18, 42, 31, 0.85)',
    'card-foreground': '#d1fae5',
    border: '#1d3a2c',
    'border-muted': '#16302355',
    'border-strong': '#2a5440',
    header: 'rgba(15, 36, 25, 0.7)',
    'header-foreground': '#a7f3d0',
    'header-gradient': 'none',
    'layout-background': 'linear-gradient(135deg, #0a1a13 0%, #0c1f17 100%)',

    'grid-pattern-color': 'rgba(52, 211, 153, 0.12)',

    primary: '#34d399',
    'primary-hover': '#6ee7b7',
    'primary-foreground': '#03291c',
    'primary-muted': 'rgba(52, 211, 153, 0.15)',

    'node-border': '#1f6f4d',
    'node-border-hover': '#34d399',
    // Port ring matches the dark canvas so colored ports read as floating dots
    'handle-border': '#0c1f17',

    'shadow-md': '0 1px 3px rgba(0, 0, 0, 0.4)',
    'shadow-lg': '0 6px 14px rgba(0, 0, 0, 0.45)',

    'scrollbar-thumb': '#1d3a2c',
    'scrollbar-track': '#0c1f17',
    backdrop: 'rgba(12, 31, 23, 0.9)'
  }
};
