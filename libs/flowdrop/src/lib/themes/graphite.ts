import type { FlowDropTheme } from '../types/theme.js';
import { graphiteSkin } from '../skins/graphite.js';

export const graphiteTheme: FlowDropTheme = {
  name: 'graphite',
  skin: graphiteSkin,
  config: {
    display: {
      sidebarList: 'rows',
      messages: 'document'
    },
    sidebar: {
      defaultOpen: true,
      categoriesDefaultOpen: false
    }
  }
};
