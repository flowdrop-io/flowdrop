import type { FlowDropSkin } from '../types/skin.js';

/**
 * Graphite: the app's own look, a calm tool UI where colour carries meaning.
 *
 * One ink-coloured primary action per view, one blue accent for selection,
 * focus and "running", and three status hues (green completed, amber waiting
 * for you, red failed) that appear only where something has a status. Greys
 * lean slightly cool. Shape sits on a 4px grid: 6px radius for controls, 8px for
 * surfaces (nodes, cards, floating controls, sheets), 12px for message
 * bubbles, 1px rules, and one float elevation for what sits over the canvas. Type is Inter, 13px body and
 * 12px meta (see process/plans/graphite-refinement.md in the workspace).
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
    muted: '#eceef1',
    'muted-foreground': '#5d6573',
    subtle: '#f1f3f5',
    card: '#ffffff',
    'card-foreground': '#16191f',
    header: '#ffffff',
    'header-foreground': '#16191f',
    'header-gradient': 'none',
    'surface-tint': 'transparent',
    'layout-background': '#f6f7f9',
    'canvas-bg': '#f6f7f9',
    'grid-pattern-color': '#d3d8df',
    backdrop: 'rgba(246, 247, 249, 0.85)',

    /* ----- Rules: 1px, cool grey ----- */
    border: '#e4e7eb',
    'border-muted': '#eceef1',
    'border-strong': '#cfd4db',
    ring: '#2457d6',

    /* ----- Nodes (card v2, G8): borderless 10px card on a soft shadow, a faint inset ring,
       a category-wash header; selection is the accent ----- */
    'node-radius': '10px',
    'node-bg': '#ffffff',
    'node-header-bg': '#ffffff',
    'node-header-divider-color': '#eceef1',
    'node-border': 'rgb(16 24 40 / 0.09)',
    'node-border-hover': 'rgb(16 24 40 / 0.18)',
    'node-border-width': '1px',
    'node-shadow': '0 1px 2px rgb(16 24 40 / 0.05), 0 8px 24px rgb(16 24 40 / 0.06)',
    'node-shadow-hover': '0 1px 2px rgb(16 24 40 / 0.06), 0 10px 28px rgb(16 24 40 / 0.1)',
    'node-header-wash': '8%',
    'node-tile-shadow': '0 1px 2px rgb(16 24 40 / 0.12)',
    'node-pill-open-fg': '#6f7682',
    'node-pill-open-border': '#e4e7eb',
    'node-pin-open': '#8a919c',

    /* ----- Notes: warm paper, a tinted inset edge, no lift ----- */
    'note-bg': '#fffdf6',
    'note-edge': '#ece6cf',
    'note-info-bg': '#f5f8ff',
    'note-warning-bg': '#fdf6e3',
    'note-success-bg': '#f0f8f2',
    'note-error-bg': '#fdf0f1',
    'note-edge-mix': '16%',
    'note-shadow': '0 1px 2px rgb(16 24 40 / 0.04)',
    'note-fg': '#2b2f36',
    'note-meta': '#8a8370',
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

    /* ----- Shape: 6px controls, 8px surfaces, 12px bubbles ----- */
    'radius-sm': '4px',
    'radius-md': '6px',
    'radius-lg': '8px',
    'radius-xl': '12px',
    'control-radius': '6px',
    'radius-surface': '8px',
    'radius-bubble': '12px',

    /* ----- Elevation: one float level over the canvas, none in flow ----- */
    'shadow-sm': '0 1px 2px rgb(16 24 40 / 0.05)',
    'shadow-md': '0 1px 2px rgb(16 24 40 / 0.05), 0 4px 12px rgb(16 24 40 / 0.06)',
    'shadow-lg': '0 12px 32px rgb(16 24 40 / 0.12)',
    'elevation-float': '0 1px 2px rgb(16 24 40 / 0.05), 0 4px 12px rgb(16 24 40 / 0.06)',
    'float-border': '#e4e7eb',

    /* ----- Type: 13px body, 12px meta ----- */
    'text-body': '0.8125rem',
    'text-meta': '0.75rem',

    /* ----- Primary action: ink. One per view. ----- */
    primary: '#16191f',
    'primary-hover': '#2b303a',
    'primary-foreground': '#ffffff',
    'primary-muted': '#dfe4ee',

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

    /* ----- Controls: 32px, strong rule, accent border + 3px ring on focus ----- */
    'field-height': '2rem',
    'field-height-sm': '1.75rem',
    'field-padding': '0 0.625rem',
    'field-padding-multiline': '0.375rem 0.625rem',
    'field-min-height-multiline': '4rem',
    'field-border-color': 'var(--fd-border-strong)',
    'field-shadow': 'none',
    'field-focus-shadow': '0 0 0 3px var(--fd-accent-muted)',
    'field-focus-outline': 'none',
    'field-label-size': '0.75rem',
    'field-help-size': '0.75rem',
    'switch-on-bg': 'var(--fd-accent)',

    /* ----- Buttons: secondary = white + strong rule, ghost = subtle hover, danger = red text ----- */
    'size-btn-min': '2rem',
    'button-secondary-border': 'var(--fd-border-strong)',
    'button-ghost-hover': 'var(--fd-subtle)',
    'button-danger-bg': 'transparent',
    'button-danger-fg': 'var(--fd-error)',
    'button-danger-border': 'transparent',
    'button-danger-hover-bg': 'var(--fd-error-muted)',
    'button-danger-hover-fg': 'var(--fd-error)',

    /* ----- Menus: 8px, float elevation, 32px items ----- */
    'menu-radius': '8px',
    'menu-shadow': 'var(--fd-elevation-float)',
    'menu-item-radius': '6px',
    'menu-item-height': '2rem',

    /* ----- Inspector sheet, meta list, code blocks, modal ----- */
    'sheet-inset': '8px',
    'sheet-radius': '8px',
    'sheet-border-width': '1px',
    'sheet-border': 'var(--fd-float-border)',
    'inspector-link-color': 'var(--fd-accent)',
    'inspector-details-bg': 'transparent',
    'inspector-details-rule': 'transparent',
    'inspector-title-size': '0.875rem',
    'inspector-meta-size': '0.75rem',
    'id-chip-bg': 'transparent',
    'id-chip-padding': '0',
    'code-block-bg': 'var(--fd-subtle)',
    'code-block-border': 'none',
    'code-block-radius': '6px',
    'modal-radius': '12px',
    'modal-header-height': '3rem',
    'modal-title-size': '0.9375rem',

    /* ----- Node anatomy: no header band, ink on white. Geometry stays on the
       10/20px grid from tokens.css so ports and edges line up. ----- */
    'node-title-size': '0.8125rem',
    'node-title-weight': '600',
    'node-title-clamp': '1',
    'node-icon-size': '22px',
    'node-icon-glyph-size': '14px',
    'node-icon-radius': '6px',
    'node-port-name-weight': '400',
    'node-port-chip-font': 'var(--fd-font-mono)',
    'node-port-chip-size': '10.5px',
    'node-port-chip-border': 'transparent',
    'node-port-chip-pad': '0',
    'node-port-required-mark-display': 'inline',
    'node-port-required-word-position': 'absolute',
    'node-port-required-word-size': '1px',
    'node-port-required-word-overflow': 'hidden',
    'node-port-required-word-clip': 'inset(50%)',
    'node-port-symbol-display': 'none',
    'node-port-out-name-order': '2',
    'node-port-out-chip-order': '1',
    'node-port-out-symbol-order': '3',
    'node-port-out-name-align': 'right',
    'handle-visual-size': '10px',
    'node-selected-border': 'var(--fd-accent)',
    'node-selected-ring': 'var(--fd-accent-muted)',
    'node-selected-edge': '0.5px',
    'node-selected-ring-width': '3px',
    'node-terminal-bg': 'var(--fd-node-bg)',
    'node-terminal-border-width': '1px',
    'node-terminal-border-color': '#cfd4db',
    'node-terminal-shadow': 'var(--fd-node-shadow)',
    'node-terminal-shadow-hover': 'var(--fd-node-shadow-hover)',
    'node-terminal-ring': 'var(--fd-node-selected-ring)',
    'node-terminal-icon-bg': 'transparent',
    'node-terminal-icon-color': 'var(--fd-muted-foreground)',
    'node-terminal-icon-size': '16px',
    'node-terminal-label-bg': 'transparent',
    'node-terminal-label-shadow': 'none',
    'node-terminal-label-weight': '500',
    'node-dim-opacity': '0.55',
    'node-status-edge': '0.5px',
    'node-status-ring': '3px',

    /* ----- Run status pill: soft fill, no border, "x3" count ----- */
    'status-pill-height': '22px',
    'status-pill-size': '0.6875rem',
    'status-pill-weight': '600',
    'status-pill-padding': '0 8px 0 6px',
    'status-pill-border-width': '0px',
    'status-pill-icon-size': '12px',
    'status-pill-icon-display': 'none',
    'status-pill-glyph-display': 'block',
    'status-pill-count-bg': 'transparent',
    'status-pill-count-fg': 'currentColor',
    'status-pill-count-font': 'var(--fd-font-mono)',
    'status-pill-count-opacity': '0.8',
    'status-pill-count-rule': '1px',
    'status-pill-count-pad': '0 0 0 5px',
    'status-pill-count-min': '0',
    'status-pill-count-radius': '0',
    'status-pill-count-prefix': "'\\00d7'",

    /* ----- Canvas controls: each floats on its own, one elevation ----- */
    'toolbar-segmented-bg': 'var(--fd-background)',
    'toolbar-segmented-border': 'var(--fd-float-border)',
    'toolbar-segmented-selected-bg': 'var(--fd-primary)',
    'toolbar-segmented-selected-fg': 'var(--fd-primary-foreground)',
    'toolbar-segmented-selected-shadow': 'none',
    'toolbar-segmented-radius': 'var(--fd-radius-surface)',
    'toolbar-segment-radius': 'var(--fd-control-radius)',
    'zoom-group-bg': 'var(--fd-background)',
    'zoom-group-border': '1px solid var(--fd-float-border)',
    'zoom-group-radius': 'var(--fd-radius-surface)',
    'zoom-group-padding': '2px',
    'zoom-group-shadow': 'var(--fd-elevation-float)',
    'zoom-button-size': '28px',
    'zoom-button-radius': 'var(--fd-control-radius)',
    'zoom-button-border': 'none',
    'zoom-icon-size': '15px',
    'zoom-percent-display': 'inline',
    'controls-button-bg': 'transparent',
    'controls-button-bg-hover': 'var(--fd-subtle)',
    'controls-button-color': 'var(--fd-muted-foreground)',
    'controls-button-color-hover': 'var(--fd-foreground)',
    'minimap-radius': 'var(--fd-radius-surface)',
    'minimap-shadow': 'var(--fd-elevation-float)',
    'minimap-border': 'var(--fd-float-border)',
    'minimap-bg': 'var(--fd-background)',
    'minimap-mask-bg': 'rgba(246, 247, 249, 0.7)',
    'minimap-mask-stroke': 'var(--fd-accent)',
    'minimap-node-bg': 'var(--fd-border-strong)',
    'minimap-node-stroke': 'transparent',

    'scrollbar-thumb': '#d5d9e0',
    'scrollbar-thumb-hover': '#b4bbc5',
    'scrollbar-track': 'transparent',
    'scrollbar-radius': '9999px',
    'scrollbar-size': '8px',

    /* ----- Form-first inputs: no card around the form; a 32px control, a type tag in mono, dashed example pills ----- */
    'inputs-frame-border': '0',
    'inputs-frame-bg': 'transparent',
    'inputs-frame-pad': '0',
    'field-control-height': '2rem',
    'field-control-border': '#cfd4db',
    'field-control-radius': '6px',
    'field-textarea-min': '4rem',
    'field-focus-border': '#2457d6',
    'field-focus-ring': '0 0 0 3px #e8effd',
    'field-tag-bg': 'transparent',
    'field-tag-pad': '0',
    'field-example-border-style': 'dashed',
    'field-example-bg': 'transparent',

    'sidebar-category-color': '#5a6270',
    'sidebar-flat-item-color': '#16191f',

    /* ----- Navbar: 48px bar, ink split Save, ghost settings ----- */
    'navbar-start-width': 'auto',
    'navbar-logo-height': '20px',
    'navbar-rule-display': 'block',
    'navbar-title-size': '0.875rem',
    'navbar-status-bg': 'transparent',
    'navbar-status-fg': 'var(--fd-muted-foreground)',
    'navbar-action-height': '2rem',
    'navbar-action-bg': 'var(--fd-primary)',
    'navbar-action-fg': 'var(--fd-primary-foreground)',
    'navbar-action-hover-bg': 'var(--fd-primary-hover)',
    'navbar-action-border': 'transparent',
    'navbar-action-divider': 'rgb(255 255 255 / 0.18)',
    'navbar-chevron-width': '1.75rem',
    'navbar-icon-bg': 'transparent',
    'navbar-icon-border': 'transparent',
    'navbar-icon-border-hover': 'transparent',
    'navbar-status-order': '2'
  },

  darkTokens: {
    /* Dark: the light tokens above also apply in dark mode, so every colour
       the light block sets is set again here. */
    background: '#16181d',
    foreground: '#eceef2',
    muted: '#262a31',
    'muted-foreground': '#9aa2af',
    subtle: '#1f2228',
    card: '#1b1e23',
    'card-foreground': '#eceef2',
    header: '#16181d',
    'header-foreground': '#eceef2',
    'header-gradient': 'none',
    'surface-tint': 'transparent',
    'layout-background': '#0f1114',
    'canvas-bg': '#0f1114',
    'grid-pattern-color': '#262a31',
    backdrop: 'rgba(16, 18, 21, 0.85)',

    border: '#262a31',
    'border-muted': '#1f2228',
    'border-strong': '#353a43',
    ring: '#7aa2ff',

    'node-bg': '#1b1e23',
    'node-header-bg': '#1b1e23',
    'node-header-divider-color': '#262a31',
    'node-border': 'rgb(255 255 255 / 0.1)',
    'node-terminal-border-color': '#353a43',
    'node-border-hover': 'rgb(255 255 255 / 0.2)',
    'node-header-wash': '16%',
    'node-tile-shadow': '0 1px 2px rgb(0 0 0 / 0.4)',
    'node-pill-open-fg': '#9aa2af',
    'node-pill-open-border': '#353a43',
    'node-pin-open': '#7d8594',
    'handle-border': '#1b1e23',
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

    'node-shadow': '0 1px 2px rgb(0 0 0 / 0.3)',
    'node-shadow-hover': '0 1px 2px rgb(0 0 0 / 0.4), 0 6px 16px rgb(0 0 0 / 0.35)',

    'note-bg': '#23211a',
    'note-edge': '#3a3728',
    'note-info-bg': '#1a2133',
    'note-warning-bg': '#2d2314',
    'note-success-bg': '#16291f',
    'note-error-bg': '#331a1f',
    'note-edge-mix': '22%',
    'note-shadow': 'none',
    'note-fg': '#e3e1d8',
    'note-meta': '#9a9580',
    'shadow-sm': '0 1px 2px rgb(0 0 0 / 0.3)',
    'shadow-md': '0 1px 2px rgb(0 0 0 / 0.4), 0 6px 16px rgb(0 0 0 / 0.35)',
    'shadow-lg': '0 12px 32px rgb(0 0 0 / 0.5)',
    'elevation-float': '0 1px 2px rgb(0 0 0 / 0.4), 0 6px 16px rgb(0 0 0 / 0.35)',
    'float-border': '#2c3037',

    primary: '#eceef2',
    'primary-hover': '#ffffff',
    'primary-foreground': '#14161a',
    'primary-muted': '#2a3140',

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

    'minimap-mask-bg': 'rgba(15, 17, 20, 0.7)',

    'scrollbar-thumb': '#343943',
    'scrollbar-thumb-hover': '#4a505b',
    'scrollbar-track': 'transparent',

    'sidebar-category-color': '#a0a8b5',
    'sidebar-flat-item-color': '#eceef2',

    /* ----- Navbar: 48px bar, ink split Save, ghost settings ----- */
    'navbar-start-width': 'auto',
    'navbar-logo-height': '20px',
    'navbar-rule-display': 'block',
    'navbar-title-size': '0.875rem',
    'navbar-status-bg': 'transparent',
    'navbar-status-fg': 'var(--fd-muted-foreground)',
    'navbar-action-height': '2rem',
    'navbar-action-bg': 'var(--fd-primary)',
    'navbar-action-fg': 'var(--fd-primary-foreground)',
    'navbar-action-hover-bg': 'var(--fd-primary-hover)',
    'navbar-action-border': 'transparent',
    'navbar-action-divider': 'rgb(0 0 0 / 0.18)',
    'navbar-chevron-width': '1.75rem',
    'navbar-icon-bg': 'transparent',
    'navbar-icon-border': 'transparent',
    'navbar-icon-border-hover': 'transparent',
    'navbar-status-order': '2',

    'field-control-border': '#353a43',
    'field-focus-border': '#7aa2ff',
    'field-focus-ring': '0 0 0 3px #1c2640',

    /* Your own message: a dark-grey bubble, not the light primary */
    'msg-user-bg': '#2a2f3a',
    'msg-user-fg': '#eceef2'
  }
};
