import type { FlowDropSkin } from '../types/skin';

export const minimalSkin: FlowDropSkin = {
	tokens: {
		// Primary brand colors
		primary: '#7c3aed',
		'primary-hover': '#6d28d9',
		'primary-foreground': '#ffffff',
		'primary-muted': 'color-mix(in srgb, #7c3aed 15%, transparent)',

		// Node icon: hide squircle, show circle dot
		'node-icon-display': 'none',
		'node-circle-display': 'flex',

		// Sidebar: hide search + header, hide cards, show flat list
		'sidebar-search-display': 'none',
		'sidebar-header-display': 'none',
		'sidebar-card-display': 'none',
		'sidebar-flat-display': 'block',

		// Port colors: override all ports to muted (uniform, no type differentiation)
		'port-skin-color': 'var(--fd-muted-foreground)'
	}
};
