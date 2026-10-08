import type { FlowDropTheme } from '../types/theme.js';
import { graphiteSkin } from '../skins/graphite.js';

export const graphiteTheme: FlowDropTheme = {
  name: 'graphite',
  skin: graphiteSkin,
  config: {
    display: {
      sidebarList: 'rows'
    },
    sidebar: {
      defaultOpen: true,
      categoriesDefaultOpen: false
    }
  }
};
