/**
 * Centralized icon management for FlowDrop
 * Ensures consistent icon usage across all components
 */

import type { NodeCategory } from '../types/index.js';

/**
 * Default icons for different contexts
 */
export const DEFAULT_ICONS = {
	// Node fallback icons
	NODE: 'mdi:cube',
	CATEGORY: 'mdi:folder',

	// UI action icons
	ADD: 'mdi:plus',
	REMOVE: 'mdi:minus',
	EDIT: 'mdi:pencil',
	SAVE: 'mdi:content-save',
	LOAD: 'mdi:folder-open',
	EXPORT: 'mdi:download',
	IMPORT: 'mdi:upload',
	SEARCH: 'mdi:magnify',
	CLOSE: 'mdi:close',
	SETTINGS: 'mdi:cog',
	HELP: 'mdi:help-circle',

	// Status icons
	SUCCESS: 'mdi:check-circle',
	ERROR: 'mdi:alert-circle',
	WARNING: 'mdi:alert',
	INFO: 'mdi:information',
	LOADING: 'mdi:loading',

	// Navigation icons
	HOME: 'mdi:home',
	BACK: 'mdi:arrow-left',
	FORWARD: 'mdi:arrow-right',
	UP: 'mdi:arrow-up',
	DOWN: 'mdi:arrow-down',

	// Workflow icons
	WORKFLOW: 'mdi:graph',
	NODE_ADD: 'mdi:plus-circle',
	NODE_DELETE: 'mdi:minus-circle',
	CONNECTION: 'mdi:connection',

	// Data icons
	DATA: 'mdi:database',
	FILE: 'mdi:file',
	TEXT: 'mdi:text',
	JSON: 'mdi:code-json',

	// Model and processing icons
	MODEL: 'mdi:chip',
	BRAIN: 'mdi:brain',
	VECTOR: 'mdi:vector-point',
	ROBOT: 'mdi:robot',

	// Tool icons
	TOOL: 'mdi:wrench',
	CALCULATOR: 'mdi:calculator',
	CLOCK: 'mdi:clock',

	// Communication icons
	CHAT: 'mdi:chat',
	MESSAGE: 'mdi:message',
	EMAIL: 'mdi:email',
	WEBHOOK: 'mdi:webhook',

	// Storage icons
	STORAGE: 'mdi:database',
	MEMORY: 'mdi:memory',
	CACHE: 'mdi:cached',

	// Processing icons
	PROCESS: 'mdi:cog',
	FILTER: 'mdi:filter',
	SORT: 'mdi:sort',
	TRANSFORM: 'mdi:transform',

	// Logic icons
	LOGIC: 'mdi:git-branch',
	CONDITION: 'mdi:source-fork',
	LOOP: 'mdi:loop',

	// Integration icons
	API: 'mdi:api',
	LINK: 'mdi:link',
	PLUGIN: 'mdi:puzzle',
	BUNDLE: 'mdi:package-variant'
} as const;

/**
 * Category-specific icons matching Langflow's visual style
 */
export const CATEGORY_ICONS: Record<NodeCategory, string> = {
	inputs: 'mdi:arrow-down-circle',
	outputs: 'mdi:arrow-up-circle',
	prompts: 'mdi:message-text',
	models: 'mdi:robot',
	processing: 'mdi:cog',
	logic: 'mdi:source-branch',
	data: 'mdi:database',
	helpers: 'mdi:help-circle',
	tools: 'mdi:wrench',
	'vector stores': 'mdi:vector-square',
	embeddings: 'mdi:vector-polygon',
	memories: 'mdi:brain',
	agents: 'mdi:account-cog',
	ai: 'mdi:shimmer',
	bundles: 'mdi:package-variant'
};

/**
 * Get the appropriate icon for a node
 * @param nodeIcon - The node's specific icon
 * @param category - The node's category
 * @returns The icon to use
 */
export function getNodeIcon(nodeIcon?: string, category?: NodeCategory): string {
	// If node has a specific icon, use it
	if (nodeIcon) {
		return nodeIcon;
	}

	// If category is provided, use category icon
	if (category && CATEGORY_ICONS[category]) {
		return CATEGORY_ICONS[category];
	}

	// Fallback to default node icon
	return DEFAULT_ICONS.NODE;
}

/**
 * Get the appropriate icon for a category
 * @param category - The category
 * @returns The icon to use
 */
export function getCategoryIcon(category: NodeCategory): string {
	return CATEGORY_ICONS[category] || DEFAULT_ICONS.CATEGORY;
}

/**
 * Get a default icon by key
 * @param key - The icon key from DEFAULT_ICONS
 * @returns The icon string
 */
export function getDefaultIcon(key: keyof typeof DEFAULT_ICONS): string {
	return DEFAULT_ICONS[key];
}

/**
 * Validate if an icon string is properly formatted
 * @param icon - The icon string to validate
 * @returns True if valid, false otherwise
 */
export function isValidIcon(icon: string): boolean {
	// Check if it's a valid iconify format (e.g., "mdi:icon-name")
	return /^[a-z-]+:[a-z-]+$/.test(icon);
}

/**
 * Get a fallback icon if the provided icon is invalid
 * @param icon - The icon to check
 * @param fallback - The fallback icon to use
 * @returns The valid icon string
 */
export function getValidIcon(icon: string, fallback: string = DEFAULT_ICONS.NODE): string {
	return isValidIcon(icon) ? icon : fallback;
}
