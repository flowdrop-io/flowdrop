import type { FlowDropTheme } from '../types/theme.js';
import { slateSkin } from '../skins/slate.js';

export const minimalTheme: FlowDropTheme = {
  name: 'minimal',
  skin: slateSkin,
  config: {
    display: {
      // Node icon: circle dot instead of the squircle
      nodeIcon: 'dot',
      // Sidebar: flat dot-name list, no search, no header
      sidebarList: 'flat',
      sidebarSearch: false,
      sidebarHeader: false,
      // Navbar: split buttons instead of a dropdown
      navbarActions: 'split'
    },
    sidebar: {
      defaultOpen: true,
      categoriesDefaultOpen: true
    }
  }
};
