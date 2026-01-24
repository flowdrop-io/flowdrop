/**
 * Centralized color management for FlowDrop
 * Ensures consistent category colors across sidebar and canvas
 * Uses BEM syntax for CSS classes
 */

import type { NodeCategory, PortDataTypeConfig } from '../types/index.js';
import { getPortCompatibilityChecker } from './connections.js';

/**
 * Category color mapping to reference tokens (CSS variables)
 */
export const CATEGORY_COLOR_TOKENS: Record<NodeCategory, string> = {
	triggers: 'var(--color-ref-cyan-500)',
	inputs: 'var(--color-ref-emerald-500)',
	outputs: 'var(--color-ref-blue-600)',
	prompts: 'var(--color-ref-amber-500)',
	models: 'var(--color-ref-indigo-500)',
	processing: 'var(--color-ref-teal-500)',
	logic: 'var(--color-ref-purple-600)',
	data: 'var(--color-ref-orange-500)',
	helpers: 'var(--color-ref-slate-500)',
	tools: 'var(--color-ref-amber-500)',
	'vector stores': 'var(--color-ref-emerald-500)',
	embeddings: 'var(--color-ref-indigo-500)',
	memories: 'var(--color-ref-blue-600)',
	agents: 'var(--color-ref-teal-500)',
	ai: 'var(--color-ref-purple-500)',
	bundles: 'var(--color-ref-slate-500)'
};

/**
 * Default data type colors for fallback when port configuration is not available
 */
const DEFAULT_DATA_TYPE_COLORS: Record<string, string> = {
	string: 'var(--color-ref-emerald-500)',
	text: 'var(--color-ref-emerald-500)',
	number: 'var(--color-ref-blue-600)',
	integer: 'var(--color-ref-blue-600)',
	float: 'var(--color-ref-blue-600)',
	boolean: 'var(--color-ref-purple-600)',
	array: 'var(--color-ref-amber-500)',
	list: 'var(--color-ref-amber-500)',
	object: 'var(--color-ref-orange-500)',
	json: 'var(--color-ref-orange-500)',
	mixed: 'var(--color-ref-orange-500)',
	file: 'var(--color-ref-red-500)',
	document: 'var(--color-ref-red-500)',
	image: 'var(--color-ref-pink-500)',
	picture: 'var(--color-ref-pink-500)',
	audio: 'var(--color-ref-indigo-500)',
	sound: 'var(--color-ref-indigo-500)',
	video: 'var(--color-ref-teal-500)',
	movie: 'var(--color-ref-teal-500)',
	url: 'var(--color-ref-cyan-500)',
	email: 'var(--color-ref-cyan-500)',
	date: 'var(--color-ref-lime-500)',
	datetime: 'var(--color-ref-lime-500)',
	time: 'var(--color-ref-lime-500)',
	tool: 'var(--color-ref-amber-500)',
	trigger: 'var(--color-ref-gray-950)',
	branch: 'var(--color-ref-purple-500)'
};

/**
 * Get the reference color token for a category
 */
export function getCategoryColorToken(category: NodeCategory): string {
	return CATEGORY_COLOR_TOKENS[category] || 'var(--color-ref-slate-500)';
}

/**
 * Get the reference color token for a data type (configurable version)
 */
export function getDataTypeColorToken(dataType: string): string {
	try {
		const checker = getPortCompatibilityChecker();
		const config = checker.getDataTypeConfig(dataType);
		if (config?.color) {
			return config.color;
		}
	} catch {
		// Fallback to static color mapping if port checker not initialized
		// console.warn("Port compatibility checker not initialized, using fallback colors");
	}

	return DEFAULT_DATA_TYPE_COLORS[dataType.toLowerCase()] || 'var(--color-ref-slate-500)';
}

/**
 * Get data type configuration from port config
 */
export function getDataTypeConfig(dataType: string): PortDataTypeConfig | undefined {
	try {
		const checker = getPortCompatibilityChecker();
		return checker.getDataTypeConfig(dataType);
	} catch (error) {
		console.warn('Port compatibility checker not initialized:', error);
		return undefined;
	}
}

/**
 * Get all available data types from port configuration
 */
export function getAvailableDataTypes(): PortDataTypeConfig[] {
	try {
		const checker = getPortCompatibilityChecker();
		return checker.getEnabledDataTypes();
	} catch (error) {
		console.warn('Port compatibility checker not initialized:', error);
		return [];
	}
}

/**
 * Default colors for fallback cases
 */
export const DEFAULT_COLORS = {
	background: 'flowdrop-color--base-light',
	accent: 'flowdrop-color--neutral',
	text: 'flowdrop-color--base-text',
	border: 'flowdrop-color--base-border'
};

/**
 * Get category colors
 * @param category - The node category
 * @returns The color configuration for the category
 */
export function getCategoryColors(category: NodeCategory): string {
	return CATEGORY_COLOR_TOKENS[category] || 'var(--color-ref-slate-500)';
}

/**
 * Get category background color
 * @param category - The node category
 * @returns The background color class
 */
export function getCategoryBackground(category: NodeCategory): string {
	return getCategoryColors(category);
}

/**
 * Get category accent color
 * @param category - The node category
 * @returns The accent color class
 */
export function getCategoryAccent(category: NodeCategory): string {
	return getCategoryColors(category);
}

/**
 * Get category text color
 * @param category - The node category
 * @returns The text color class
 */
export function getCategoryText(category: NodeCategory): string {
	return getCategoryColors(category);
}

/**
 * Get category border color
 * @param category - The node category
 * @returns The border color class
 */
export function getCategoryBorder(category: NodeCategory): string {
	return getCategoryColors(category);
}

/**
 * Get node colors based on category and state
 * @param category - The node category
 * @param isError - Whether the node is in error state
 * @param isProcessing - Whether the node is processing
 * @param isSelected - Whether the node is selected
 * @returns The color configuration object
 */
export function getNodeColors(
	category: NodeCategory,
	isError: boolean = false,
	isProcessing: boolean = false,
	isSelected: boolean = false
): { background: string; accent: string; text: string; border: string } {
	const baseColor = getCategoryColors(category);

	if (isError) {
		return {
			background: 'var(--color-ref-red-50)',
			accent: 'var(--color-ref-red-500)',
			text: 'var(--color-ref-red-900)',
			border: 'var(--color-ref-red-200)'
		};
	}

	if (isProcessing) {
		return {
			background: 'var(--color-ref-blue-50)',
			accent: 'var(--color-ref-blue-500)',
			text: 'var(--color-ref-blue-900)',
			border: 'var(--color-ref-blue-200)'
		};
	}

	if (isSelected) {
		return {
			background: 'var(--color-ref-indigo-50)',
			accent: 'var(--color-ref-indigo-500)',
			text: 'var(--color-ref-indigo-900)',
			border: 'var(--color-ref-indigo-200)'
		};
	}

	return {
		background: baseColor,
		accent: baseColor,
		text: 'var(--color-ref-slate-900)',
		border: baseColor
	};
}

/**
 * Get node background color
 * @param category - The node category
 * @param isError - Whether the node is in error state
 * @param isProcessing - Whether the node is processing
 * @param isSelected - Whether the node is selected
 * @returns The background color
 */
export function getNodeBackground(
	category: NodeCategory,
	isError: boolean = false,
	isProcessing: boolean = false,
	isSelected: boolean = false
): string {
	return getNodeColors(category, isError, isProcessing, isSelected).background;
}

/**
 * Get node accent color
 * @param category - The node category
 * @param isError - Whether the node is in error state
 * @param isProcessing - Whether the node is processing
 * @param isSelected - Whether the node is selected
 * @returns The accent color
 */
export function getNodeAccent(
	category: NodeCategory,
	isError: boolean = false,
	isProcessing: boolean = false,
	isSelected: boolean = false
): string {
	return getNodeColors(category, isError, isProcessing, isSelected).accent;
}

/**
 * Get node text color
 * @param category - The node category
 * @param isError - Whether the node is in error state
 * @param isProcessing - Whether the node is processing
 * @param isSelected - Whether the node is selected
 * @returns The text color
 */
export function getNodeText(
	category: NodeCategory,
	isError: boolean = false,
	isProcessing: boolean = false,
	isSelected: boolean = false
): string {
	return getNodeColors(category, isError, isProcessing, isSelected).text;
}

/**
 * Get node border color
 * @param category - The node category
 * @param isError - Whether the node is in error state
 * @param isProcessing - Whether the node is processing
 * @param isSelected - Whether the node is selected
 * @returns The border color
 */
export function getNodeBorder(
	category: NodeCategory,
	isError: boolean = false,
	isProcessing: boolean = false,
	isSelected: boolean = false
): string {
	return getNodeColors(category, isError, isProcessing, isSelected).border;
}

/**
 * Get data type color
 * @param dataType - The data type
 * @returns The color for the data type
 */
export function getDataTypeColor(dataType: string): string {
	return getDataTypeColorToken(dataType);
}

/**
 * Parse typed array notation and get display information
 * @param dataType - The data type (e.g., "string[]", "number", "object[]")
 * @returns Object with display information
 */
export function parseDataTypeDisplay(dataType: string): {
	baseType: string;
	isArray: boolean;
	displayName: string;
	elementType?: string;
} {
	// Check if it's a typed array (ends with [])
	const isArray = dataType.endsWith('[]');

	if (isArray) {
		const elementType = dataType.slice(0, -2); // Remove []
		const config = getDataTypeConfig(dataType);

		return {
			baseType: dataType,
			isArray: true,
			displayName: config?.name || `${elementType}[]`,
			elementType: elementType
		};
	} else {
		const config = getDataTypeConfig(dataType);
		return {
			baseType: dataType,
			isArray: false,
			displayName: config?.name || dataType
		};
	}
}

/**
 * Get formatted display text for a data type
 * @param dataType - The data type
 * @returns Formatted display text
 */
export function getDataTypeDisplayText(dataType: string): string {
	const parsed = parseDataTypeDisplay(dataType);
	return parsed.displayName;
}

/**
 * Check if a data type represents an array
 * @param dataType - The data type
 * @returns True if it's an array type
 */
export function isArrayDataType(dataType: string): boolean {
	return dataType.endsWith('[]') || dataType === 'array' || dataType === 'list';
}

/**
 * Get the element type from an array data type
 * @param arrayDataType - The array data type (e.g., "string[]")
 * @returns The element type (e.g., "string") or null if not an array
 */
export function getArrayElementType(arrayDataType: string): string | null {
	if (arrayDataType.endsWith('[]')) {
		return arrayDataType.slice(0, -2);
	}
	return null;
}

/**
 * Parse a hex color string to RGB components
 * @param hex - Hex color string (e.g., "#f59e0b" or "f59e0b")
 * @returns Object with r, g, b values (0-255) or null if invalid
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const cleanHex = hex.replace(/^#/, '');
	if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
		return null;
	}
	const r = parseInt(cleanHex.substring(0, 2), 16);
	const g = parseInt(cleanHex.substring(2, 4), 16);
	const b = parseInt(cleanHex.substring(4, 6), 16);
	return { r, g, b };
}

/**
 * Convert RGB components to hex color string
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Hex color string with # prefix
 */
export function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (value: number): string => {
		const clamped = Math.max(0, Math.min(255, Math.round(value)));
		return clamped.toString(16).padStart(2, '0');
	};
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a light tint of a color (similar to Tailwind's -50 shade)
 * Creates a very light background-friendly version of the color
 * @param hex - Base hex color string
 * @returns Light tint hex color string
 */
export function getLightTint(hex: string): string {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return '#fffbeb'; // Fallback to amber-50
	}
	// Mix with white at 95% to create a very light tint
	const mixRatio = 0.95;
	const r = rgb.r + (255 - rgb.r) * mixRatio;
	const g = rgb.g + (255 - rgb.g) * mixRatio;
	const b = rgb.b + (255 - rgb.b) * mixRatio;
	return rgbToHex(r, g, b);
}

/**
 * Generate a border tint of a color (similar to Tailwind's -300 shade)
 * Creates a medium-light version suitable for borders
 * @param hex - Base hex color string
 * @returns Border tint hex color string
 */
export function getBorderTint(hex: string): string {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return '#fcd34d'; // Fallback to amber-300
	}
	// Mix with white at 60% to create a medium-light tint
	const mixRatio = 0.6;
	const r = rgb.r + (255 - rgb.r) * mixRatio;
	const g = rgb.g + (255 - rgb.g) * mixRatio;
	const b = rgb.b + (255 - rgb.b) * mixRatio;
	return rgbToHex(r, g, b);
}

/**
 * Generate color variants for theming a component
 * @param baseColor - Base hex color string
 * @returns Object with base, light, and border color variants
 */
export function getColorVariants(baseColor: string): {
	base: string;
	light: string;
	border: string;
} {
	return {
		base: baseColor,
		light: getLightTint(baseColor),
		border: getBorderTint(baseColor)
	};
}
