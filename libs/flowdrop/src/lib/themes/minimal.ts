import type { FlowDropTheme } from '../types/theme.js';
import { slateSkin } from '../skins/slate.js';

export const minimalTheme: FlowDropTheme = {
	name: 'minimal',
	skin: slateSkin,
	config: {
		sidebar: {
			defaultOpen: true,
			categoriesDefaultOpen: true
		}
	}
};
