import type { FlowDropSkin } from '../types/skin';

/**
 * Drafter — a "blueprint" skin scoped to the graph editor: a soft mint canvas
 * with a faint emerald square grid and translucent, dark-green-outlined nodes
 * (see ref-image.png), as if sketched with a fine liner.
 *
 * Deliberately narrow: it only touches the editor canvas + node surfaces
 * (--fd-canvas-bg, --fd-node-*) and the brand accent (--fd-primary). The app
 * chrome — navbar, sidebars, panels — is left on the default tokens for a
 * fresh, neutral white look outside the canvas. Data-type port colors and
 * category icon colors are untouched (no `port-skin-color`) so they keep their
 * full color against the muted draft surface. Ships light + dark variants.
 *
 * The square grid is rendered by WorkflowEditor: this theme's config.canvas.grid
 * switches the xyflow Background to the Lines variant; --fd-grid-pattern-color
 * colors it.
 */
export const drafterSkin: FlowDropSkin = {
  tokens: {
    // --- Light blueprint: faintly-mint canvas, emerald square grid ---
    'canvas-bg': '#f1faf4',
    'grid-pattern-color': 'rgba(16, 185, 129, 0.16)',

    // Translucent green-tinted node body + header so the grid faintly reads through
    'node-bg': 'rgba(240, 253, 246, 0.85)',
    'node-header-bg': 'rgba(209, 250, 229, 0.7)',

    // Flat, lightly-sharpened cards — drawn, not lifted (applies to light + dark)
    'node-radius': '2px',
    'node-shadow': 'none',
    'node-shadow-hover': 'none',

    // Thin, dark-green node outline — like a node sketched with a fine liner;
    // white port ring so colored ports pop. Width applies to light + dark.
    'node-border': '#047857',
    'node-border-hover': '#065f46',
    'node-border-width': '1px',
    'handle-border': '#ffffff',

    // Drafting chrome: crisp corners + flat resting surfaces, so the navbar,
    // sidebars and panels share the editor's flat/drawn feel while staying on
    // the neutral default palette (gray borders, white surfaces). Floating
    // overlays keep --fd-shadow-lg (untouched) so modals/menus still read.
    'radius-sm': '2px',
    'radius-md': '3px',
    'radius-lg': '4px',
    'radius-xl': '6px',
    'scrollbar-radius': '0',
    'shadow-sm': 'none',
    'shadow-md': 'none',

    // Emerald brand accent (buttons/links) ties the editor identity together
    primary: '#10b981',
    'primary-hover': '#059669',
    'primary-foreground': '#ffffff',
    'primary-muted': 'rgba(16, 185, 129, 0.12)'
  },

  darkTokens: {
    // --- Dark blueprint: deep green-slate canvas ---
    'canvas-bg': '#0c1f17',
    'grid-pattern-color': 'rgba(52, 211, 153, 0.12)',

    'node-bg': 'rgba(18, 42, 31, 0.85)',
    'node-header-bg': 'rgba(15, 36, 25, 0.7)',

    // Thin dark-green liner outline; stays readable against the dark canvas
    'node-border': '#0d8a5f',
    'node-border-hover': '#34d399',
    // Port ring matches the dark canvas so colored ports read as floating dots
    'handle-border': '#0c1f17',

    primary: '#34d399',
    'primary-hover': '#6ee7b7',
    'primary-foreground': '#03291c',
    'primary-muted': 'rgba(52, 211, 153, 0.15)'
  }
};
