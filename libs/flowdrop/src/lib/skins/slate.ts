import type { FlowDropSkin } from "../types/skin";

export const slateSkin: FlowDropSkin = {
  tokens: {
    // --- Display / structural tokens (apply in both light and dark) ---

    // Node icon: hide squircle, show circle dot
    "node-icon-display": "none",
    "node-circle-display": "flex",

    // Sidebar: hide search + header, hide cards, show flat list
    "sidebar-search-display": "none",
    "sidebar-header-display": "none",
    "sidebar-card-display": "none",
    "sidebar-flat-display": "block",

    // Navbar: split buttons instead of dropdown
    "navbar-split-display": "flex",
    "navbar-dropdown-display": "none",

    // --- Light mode color palette (cool lavender-white) ---
    background: "#f6f6ff",
    foreground: "#13131a",
    muted: "#eeeef8",
    "muted-foreground": "#5a5a7a",
    card: "#ffffff",
    "card-foreground": "#13131a",
    border: "#d0d0e8",
    "border-muted": "#e4e4f4",
    "border-strong": "#b0b0cc",
    header: "#ededf8",
    "layout-background":
      "linear-gradient(135deg, #f4f4ff 0%, #ece8ff 50%, #e6e0ff 100%)",

    // Primary brand colors (website accent purple)
    primary: "#6c63ff",
    "primary-hover": "#5b52ef",
    "primary-foreground": "#ffffff",
    "primary-muted": "rgba(108, 99, 255, 0.1)",

    // Scrollbar
    "scrollbar-thumb": "#d0d0e8",
    "scrollbar-track": "#f0f0f8",

    // Backdrop
    backdrop: "rgba(246, 246, 255, 0.9)",

    // Node border and port ring
    "node-border": "#9898b8",
    "node-border-hover": "#7878a8",
    "handle-border": "#ffffff",

    // Category header: dim purple-grey
    "sidebar-category-color": "#c0c0d8",
    // Flat item text: dark for light bg readability
    "sidebar-flat-item-color": "#4a4a6a",

    // Logo: monochrome purple-grey to match skin
    "logo-bg": "#eeeef8",
    "logo-stroke": "#5a5a7a",
    "logo-line-fill": "#5a5a7a",
    "logo-drop": "#009cde",
    "logo-circle": "#f46351",
    "logo-left": "#ccbaf4",
    "logo-right": "#ffc423",
  },

  darkTokens: {
    // --- Dark mode color palette (deep navy / original slate) ---
    background: "#13131a",
    foreground: "#c0c0d8",
    muted: "#1a1a28",
    "muted-foreground": "#7a7a9a",
    card: "#1a1a28",
    "card-foreground": "#e8e8f0",
    border: "#2a2a3a",
    "border-muted": "#1e1e2a",
    "border-strong": "#3a3a55",
    header: "#1a1a25",
    "layout-background": "#0a0a0f",

    // Primary brand colors
    primary: "#6c63ff",
    "primary-hover": "#7c74ff",
    "primary-foreground": "#ffffff",
    "primary-muted": "rgba(108, 99, 255, 0.15)",

    // Scrollbar
    "scrollbar-thumb": "#2a2a3a",
    "scrollbar-track": "#13131a",

    // Backdrop
    backdrop: "rgba(19, 19, 26, 0.9)",

    // Node border and port ring: purplish-grey matching dark palette
    "node-border": "#9898b8",
    "node-border-hover": "#aeaed0",
    "handle-border": "#9898b8",

    // Category header: extremely dim
    "sidebar-category-color": "#3a3a55",
    // Flat item text: muted, not full-brightness white
    "sidebar-flat-item-color": "#8888aa",

    // Logo: monochrome purple-grey to match dark skin
    "logo-bg": "none",
    "logo-stroke": "#9898b8",
    "logo-line-fill": "none",
    "logo-drop": "none",
    "logo-circle": "none",
    "logo-left": "none",
    "logo-right": "none",
  },
};
