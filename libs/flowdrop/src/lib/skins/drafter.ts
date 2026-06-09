import type { FlowDropSkin } from '../types/skin';

/**
 * Drafter — a fresh, modern "drafting workspace" skin for the whole editor
 * environment (see ref-image.png): a fresh white shell around a mint/aqua
 * canvas with soft cyan/teal technical grid lines, crisp engineering geometry
 * and clean teal-ink text — not a neutral admin UI and not an all-cyan shell.
 *
 * Unlike a canvas-only skin, Drafter themes the entire shell so it reads as one
 * designed environment:
 *  - App chrome (navbar, sidebars, inspector, status bars, form fields) stays
 *    white/near-white for a clean fresh product feel.
 *  - The mint/aqua personality lives in the canvas, node glass, focus rings,
 *    selected states and small technical accents.
 *  - Disabled/read-only surfaces use quiet light grey so state remains obvious.
 *  - Borders are mostly neutral hairlines; strong/focus borders + node outlines
 *    are teal/cyan ink (--fd-ring / --fd-border-strong / --fd-node-border).
 *  - Focus rings are cyan (--fd-ring), not the default blue.
 *  - Nodes are frosted glass with a faint inner highlight; the minimap + zoom
 *    controls share the same vocabulary.
 *  - Note/instruction cards read as cool annotations (translucent tint + slate
 *    ink border), never as a filled "success" card.
 *  - Emerald/green is reserved for primary actions, selection and live edges
 *    (--fd-primary) — it is not used for every outline.
 *
 * Data-type port colors and category icon colors are left untouched so they keep
 * their full color against the draft surface. The square grid is rendered by
 * WorkflowEditor via config.canvas.grid = 'lines'; --fd-grid-pattern-color
 * colors it. Ships light + dark variants.
 */
export const drafterSkin: FlowDropSkin = {
  tokens: {
    /* ----- Shell surfaces: fresh white chrome, not all-cyan ----- */
    background: '#ffffff',
    foreground: '#10201c',
    muted: '#f4f6f7',
    'muted-foreground': '#5f6f6b',
    subtle: '#eef3f2',
    card: '#ffffff',
    'card-foreground': '#10201c',
    header: '#ffffff',
    'header-foreground': '#10201c',
    'header-gradient': 'linear-gradient(180deg, #ffffff 0%, #fbfefd 100%)',
    'surface-tint': 'rgba(20, 184, 166, 0.015)',

    /* White sidebars/inspector with only a whisper of technical glass */
    'panel-bg': 'rgba(255, 255, 255, 0.94)',
    'panel-backdrop-filter': 'blur(10px) saturate(1.04)',
    backdrop: 'rgba(255, 255, 255, 0.92)',

    /* ----- Borders: neutral chrome; strong/focus = teal-cyan accent ----- */
    border: '#e3e8e7',
    'border-muted': '#eef2f2',
    'border-strong': 'rgba(15, 118, 110, 0.42)',
    ring: '#06b6d4',

    /* ----- Canvas: fresh aqua-mint, soft cyan/teal square grid ----- */
    'canvas-bg': '#fbfefd',
    'grid-pattern-color': 'rgba(20, 184, 166, 0.08)',

    /* ----- Nodes: frosted glass, faint inner highlight ----- */
    'node-bg': 'rgba(255, 255, 255, 0.68)',
    'node-header-bg': 'rgba(204, 251, 241, 0.62)',
    'node-backdrop-filter': 'blur(10px) saturate(1.15)',
    'node-radius': '2px',
    'node-shadow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
    'node-shadow-hover': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.85)',
    'node-border': '#0f766e',
    'node-border-hover': '#0c5f59',
    'node-border-width': '1.25px',
    'handle-border': '#ffffff',

    /* Notes read as cool annotations, not filled success cards */
    'note-border': '#5b7891',
    'note-border-hover': '#48617a',

    /* Translucent status tints so note/instruction cards stay light + glassy */
    'info-muted': 'rgba(8, 145, 178, 0.1)',
    'success-muted': 'rgba(16, 185, 129, 0.1)',
    'warning-muted': 'rgba(245, 158, 11, 0.12)',
    'error-muted': 'rgba(239, 68, 68, 0.1)',

    /* ----- Crisp drafting geometry + flat chrome (2–6px radius, no soft shadow) ----- */
    'radius-sm': '2px',
    'radius-md': '3px',
    'radius-lg': '4px',
    'radius-xl': '6px',
    'scrollbar-radius': '0',
    'shadow-sm': 'none',
    'shadow-md': 'none',

    /* ----- Canvas overlays: light, instrument-like ----- */
    'minimap-bg': 'rgba(255, 255, 255, 0.72)',
    'minimap-mask-bg': 'rgba(15, 118, 110, 0.08)',
    'minimap-mask-stroke': 'rgba(15, 118, 110, 0.35)',
    'minimap-node-bg': 'rgba(15, 118, 110, 0.3)',
    'minimap-node-stroke': 'rgba(15, 118, 110, 0.45)',
    'controls-button-bg': 'rgba(255, 255, 255, 0.86)',
    'controls-button-bg-hover': 'rgba(204, 251, 241, 0.9)',
    'controls-button-color': '#0f766e',
    'controls-button-color-hover': '#0c5f59',
    'controls-button-border': 'rgba(15, 118, 110, 0.25)',

    /* ----- Secondary = mint, accent = cyan, primary = the one allowed green ----- */
    secondary: 'rgba(204, 251, 241, 0.7)',
    'secondary-hover': 'rgba(153, 246, 228, 0.85)',
    'secondary-foreground': '#0f3d36',
    accent: '#06b6d4',
    'accent-hover': '#0891b2',
    'accent-foreground': '#ffffff',
    'accent-muted': 'rgba(6, 182, 212, 0.12)',
    primary: '#10b981',
    'primary-hover': '#059669',
    'primary-foreground': '#ffffff',
    'primary-muted': 'rgba(16, 185, 129, 0.14)'
  },

  darkTokens: {
    /* ----- Shell surfaces: deep teal-slate glass ----- */
    background: '#0e2421',
    foreground: '#d8f0ea',
    muted: 'rgba(20, 60, 54, 0.6)',
    'muted-foreground': '#8fb3aa',
    subtle: 'rgba(13, 47, 44, 0.7)',
    card: 'rgba(18, 42, 38, 0.96)',
    'card-foreground': '#d8f0ea',
    header: 'rgba(13, 40, 37, 0.7)',
    'header-foreground': '#d8f0ea',
    'header-gradient':
      'linear-gradient(180deg, rgba(17, 42, 38, 0.9) 0%, rgba(12, 33, 30, 0.9) 100%)',
    'surface-tint': 'rgba(45, 212, 191, 0.04)',

    'panel-bg': 'rgba(14, 36, 33, 0.8)',
    'panel-backdrop-filter': 'blur(14px) saturate(1.2)',
    backdrop: 'rgba(11, 31, 28, 0.8)',

    border: 'rgba(45, 212, 191, 0.22)',
    'border-muted': 'rgba(45, 212, 191, 0.12)',
    'border-strong': 'rgba(45, 212, 191, 0.4)',
    ring: '#22d3ee',

    'canvas-bg': '#0b1f1c',
    'grid-pattern-color': 'rgba(45, 212, 191, 0.16)',

    'node-bg': 'rgba(17, 38, 35, 0.62)',
    'node-header-bg': 'rgba(13, 47, 44, 0.6)',
    'node-backdrop-filter': 'blur(10px) saturate(1.2)',
    'node-shadow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
    'node-shadow-hover': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.14)',
    'node-border': '#0d9488',
    'node-border-hover': '#2dd4bf',
    'handle-border': '#0b1f1c',

    'note-border': '#7d96b0',
    'note-border-hover': '#9fb4cb',

    'info-muted': 'rgba(34, 211, 238, 0.12)',
    'success-muted': 'rgba(52, 211, 153, 0.12)',
    'warning-muted': 'rgba(251, 191, 36, 0.14)',
    'error-muted': 'rgba(248, 113, 113, 0.12)',

    'minimap-bg': 'rgba(11, 31, 28, 0.7)',
    'minimap-mask-bg': 'rgba(45, 212, 191, 0.06)',
    'minimap-mask-stroke': 'rgba(45, 212, 191, 0.3)',
    'minimap-node-bg': 'rgba(45, 212, 191, 0.28)',
    'minimap-node-stroke': 'rgba(45, 212, 191, 0.45)',
    'controls-button-bg': 'rgba(17, 38, 35, 0.8)',
    'controls-button-bg-hover': 'rgba(13, 47, 44, 0.9)',
    'controls-button-color': '#2dd4bf',
    'controls-button-color-hover': '#5eead4',
    'controls-button-border': 'rgba(45, 212, 191, 0.3)',

    secondary: 'rgba(13, 47, 44, 0.8)',
    'secondary-hover': 'rgba(20, 60, 54, 0.9)',
    'secondary-foreground': '#d8f0ea',
    accent: '#22d3ee',
    'accent-hover': '#67e8f9',
    'accent-foreground': '#03291c',
    'accent-muted': 'rgba(34, 211, 238, 0.14)',
    primary: '#34d399',
    'primary-hover': '#6ee7b7',
    'primary-foreground': '#03291c',
    'primary-muted': 'rgba(52, 211, 153, 0.16)'
  }
};
