import type { FlowDropSkin } from '../types/skin';

export const minimalSkin: FlowDropSkin = {
	tokens: {
		// --- Color palette (matching website dark theme) ---
		background: '#13131a',
		foreground: '#e8e8f0',
		muted: '#1a1a28',
		'muted-foreground': '#7a7a9a',
		card: '#1a1a28',
		'card-foreground': '#e8e8f0',
		border: '#2a2a3a',
		'border-muted': '#1e1e2a',
		'border-strong': '#3a3a55',
		header: '#1a1a25',
		'layout-background': '#0a0a0f',

		// Primary brand colors (website accent purple)
		primary: '#6c63ff',
		'primary-hover': '#7c74ff',
		'primary-foreground': '#ffffff',
		'primary-muted': 'rgba(108, 99, 255, 0.15)',

		// Scrollbar colors for dark bg
		'scrollbar-thumb': '#2a2a3a',
		'scrollbar-track': '#13131a',
		backdrop: 'rgba(19, 19, 26, 0.9)',

		// Node icon: hide squircle, show circle dot
		'node-icon-display': 'none',
		'node-circle-display': 'flex',

		// Sidebar: hide search + header, hide cards, show flat list
		'sidebar-search-display': 'none',
		'sidebar-header-display': 'none',
		'sidebar-card-display': 'none',
		'sidebar-flat-display': 'block',

		// Category header: extremely dim
		'sidebar-category-color': '#3a3a55',

		// Navbar: split buttons instead of dropdown
		'navbar-split-display': 'flex',
		'navbar-dropdown-display': 'none'
	}
};
