import type { FlowDropTheme } from '../types/theme.js';

/**
 * Classic: the original FlowDrop look, drawn by the stock tokens in
 * tokens.css with no skin on top (blue primary, card sidebar, bubbles).
 * It was called 'default' until 2.14; Graphite is what the editor opens in.
 */
export const classicTheme: FlowDropTheme = {
  name: 'classic',
  config: {
    sidebar: {
      defaultOpen: true,
      categoriesDefaultOpen: false
    }
  }
};

/** @deprecated Renamed to `classicTheme`; removed in 3.0. */
export const defaultTheme: FlowDropTheme = classicTheme;
