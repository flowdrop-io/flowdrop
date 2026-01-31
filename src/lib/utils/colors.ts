/**
 * Centralized color management for FlowDrop
 * Ensures consistent category colors across sidebar and canvas
 * Uses BEM syntax for CSS classes
 */

import type { NodeCategory, PortDataTypeConfig } from '../types/index.js';
import { getPortCompatibilityChecker } from './connections.js';

/**
 * Category color mapping to design tokens (CSS variables)
 * Uses --fd-node-* tokens from tokens.css
 */
export const CATEGORY_COLOR_TOKENS: Record<NodeCategory, string> = {
	triggers: 'var(--fd-node-cyan)',
	inputs: 'var(--fd-node-emerald)',
	outputs: 'var(--fd-node-blue)',
	prompts: 'var(--fd-node-amber)',
	models: 'var(--fd-node-indigo)',
	processing: 'var(--fd-node-teal)',
	logic: 'var(--fd-node-purple)',
	data: 'var(--fd-node-orange)',
	helpers: 'var(--fd-node-slate)',
	tools: 'var(--fd-node-amber)',
	'vector stores': 'var(--fd-node-emerald)',
	embeddings: 'var(--fd-node-indigo)',
	memories: 'var(--fd-node-blue)',
	agents: 'var(--fd-node-teal)',
	ai: 'var(--fd-node-purple)',
	bundles: 'var(--fd-node-slate)'
};

/**
 * Default data type colors for fallback when port configuration is not available
 * Uses --fd-node-* tokens from tokens.css
 */
const DEFAULT_DATA_TYPE_COLORS: Record<string, string> = {
	string: 'var(--fd-node-emerald)',
	text: 'var(--fd-node-emerald)',
	number: 'var(--fd-node-blue)',
	integer: 'var(--fd-node-blue)',
	float: 'var(--fd-node-blue)',
	boolean: 'var(--fd-node-purple)',
	array: 'var(--fd-node-amber)',
	list: 'var(--fd-node-amber)',
	object: 'var(--fd-node-orange)',
	json: 'var(--fd-node-orange)',
	mixed: 'var(--fd-node-orange)',
	file: 'var(--fd-node-red)',
	document: 'var(--fd-node-red)',
	image: 'var(--fd-node-pink)',
	picture: 'var(--fd-node-pink)',
	audio: 'var(--fd-node-indigo)',
	sound: 'var(--fd-node-indigo)',
	video: 'var(--fd-node-teal)',
	movie: 'var(--fd-node-teal)',
	url: 'var(--fd-node-cyan)',
	email: 'var(--fd-node-cyan)',
	date: 'var(--fd-node-lime)',
	datetime: 'var(--fd-node-lime)',
	time: 'var(--fd-node-lime)',
	tool: 'var(--fd-node-amber)',
	trigger: '#18181b',
	branch: 'var(--fd-node-purple)'
};

/**
 * Get the design token for a category color
 */
export function getCategoryColorToken(category: NodeCategory): string {
	return CATEGORY_COLOR_TOKENS[category] || 'var(--fd-node-slate)';
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

	return DEFAULT_DATA_TYPE_COLORS[dataType.toLowerCase()] || 'var(--fd-node-slate)';
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
	return CATEGORY_COLOR_TOKENS[category] || 'var(--fd-node-slate)';
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
			background: 'var(--fd-error-muted)',
			accent: 'var(--fd-error)',
			text: 'var(--fd-error-hover)',
			border: 'var(--fd-error)'
		};
	}

	if (isProcessing) {
		return {
			background: 'var(--fd-info-muted)',
			accent: 'var(--fd-info)',
			text: 'var(--fd-primary-hover)',
			border: 'var(--fd-primary)'
		};
	}

	if (isSelected) {
		return {
			background: 'var(--fd-accent-muted)',
			accent: 'var(--fd-accent)',
			text: 'var(--fd-accent-hover)',
			border: 'var(--fd-accent)'
		};
	}

	return {
		background: baseColor,
		accent: baseColor,
		text: 'var(--fd-foreground)',
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
 * Creates a very light background-friendly version of the color for light mode
 * @param hex - Base hex color string
 * @returns Light tint hex color string
 */
export function getLightTint(hex: string): string {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return "#fffbeb"; // Fallback to amber-50
	}
	// Mix with white at 95% to create a very light tint
	const mixRatio = 0.95;
	const r = rgb.r + (255 - rgb.r) * mixRatio;
	const g = rgb.g + (255 - rgb.g) * mixRatio;
	const b = rgb.b + (255 - rgb.b) * mixRatio;
	return rgbToHex(r, g, b);
}

/**
 * Generate a dark tint of a color for dark mode backgrounds
 * Creates a subtle, muted version of the color that works well on dark backgrounds
 * @param hex - Base hex color string
 * @param opacity - Optional opacity for the color overlay (default 0.15)
 * @returns Dark tint hex color string
 */
export function getDarkTint(hex: string, opacity: number = 0.15): string {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return "#2a2518"; // Fallback dark amber tint
	}
	// Mix with dark background (#1a1a1e) to create a subtle dark tint
	const darkBg = { r: 26, g: 26, b: 30 };
	const r = darkBg.r + (rgb.r - darkBg.r) * opacity;
	const g = darkBg.g + (rgb.g - darkBg.g) * opacity;
	const b = darkBg.b + (rgb.b - darkBg.b) * opacity;
	return rgbToHex(r, g, b);
}

/**
 * Generate a border tint of a color (similar to Tailwind's -300 shade)
 * Creates a medium-light version suitable for borders in light mode
 * @param hex - Base hex color string
 * @returns Border tint hex color string
 */
export function getBorderTint(hex: string): string {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return "#fcd34d"; // Fallback to amber-300
	}
	// Mix with white at 60% to create a medium-light tint
	const mixRatio = 0.6;
	const r = rgb.r + (255 - rgb.r) * mixRatio;
	const g = rgb.g + (255 - rgb.g) * mixRatio;
	const b = rgb.b + (255 - rgb.b) * mixRatio;
	return rgbToHex(r, g, b);
}

/**
 * Generate a dark border tint of a color for dark mode
 * Creates a medium-dark version suitable for borders in dark mode
 * @param hex - Base hex color string
 * @returns Dark border tint hex color string
 */
export function getDarkBorderTint(hex: string): string {
	const rgb = hexToRgb(hex);
	if (!rgb) {
		return "#5c4a1e"; // Fallback dark amber border
	}
	// Mix with dark background to create a muted but visible border
	const darkBg = { r: 26, g: 26, b: 30 };
	const mixRatio = 0.35;
	const r = darkBg.r + (rgb.r - darkBg.r) * mixRatio;
	const g = darkBg.g + (rgb.g - darkBg.g) * mixRatio;
	const b = darkBg.b + (rgb.b - darkBg.b) * mixRatio;
	return rgbToHex(r, g, b);
}

/**
 * Color variants interface for theming components
 */
export interface ColorVariants {
	/** Base color value */
	base: string;
	/** Light tint for light mode backgrounds */
	light: string;
	/** Border tint for light mode borders */
	border: string;
	/** Dark tint for dark mode backgrounds */
	darkLight: string;
	/** Dark border tint for dark mode borders */
	darkBorder: string;
}

/**
 * Generate color variants for theming a component
 * Returns variants for both light and dark modes
 * @param baseColor - Base hex color string
 * @returns Object with base, light, border, darkLight, and darkBorder color variants
 */
export function getColorVariants(baseColor: string): ColorVariants {
	return {
		base: baseColor,
		light: getLightTint(baseColor),
		border: getBorderTint(baseColor),
		darkLight: getDarkTint(baseColor),
		darkBorder: getDarkBorderTint(baseColor)
	};
}

/**
 * Get theme-aware color variants
 * Returns the appropriate light or dark variants based on the theme
 * @param baseColor - Base hex color string
 * @param isDarkMode - Whether dark mode is active
 * @returns Object with base, background, and border colors appropriate for the theme
 */
export function getThemeAwareColorVariants(
	baseColor: string,
	isDarkMode: boolean
): {
	base: string;
	background: string;
	border: string;
} {
	const variants = getColorVariants(baseColor);
	return {
		base: variants.base,
		background: isDarkMode ? variants.darkLight : variants.light,
		border: isDarkMode ? variants.darkBorder : variants.border
	};
}
