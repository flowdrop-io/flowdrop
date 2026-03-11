import type { FlowDropTheme } from '../types/theme.js';
import { minimalSkin } from '../skins/minimal.js';

export const minimalTheme: FlowDropTheme = {
	name: 'minimal',
	skin: minimalSkin,
	config: {
		sidebar: {
			defaultOpen: true,
			categoriesDefaultOpen: true
		}
	}
};
