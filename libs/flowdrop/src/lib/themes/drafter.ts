import type { FlowDropTheme } from '../types/theme.js';
import { drafterSkin } from '../skins/drafter.js';

export const drafterTheme: FlowDropTheme = {
  name: 'drafter',
  skin: drafterSkin,
  config: {
    sidebar: {
      defaultOpen: true,
      categoriesDefaultOpen: false
    },
    // Blueprint square line grid (any theme can opt into a grid variant here)
    canvas: {
      grid: 'lines'
    }
  }
};
