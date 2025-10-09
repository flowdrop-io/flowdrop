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
	bundles: 'var(--color-ref-slate-500)'
};

/**
 * Data type color mapping to reference tokens (CSS variables)
 * @deprecated Use getDataTypeColorToken() with port configuration instead
 */
export const DATA_TYPE_COLOR_TOKENS: Record<string, string> = {
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
	tool: 'var(--color-ref-amber-500)'
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

	return DATA_TYPE_COLOR_TOKENS[dataType.toLowerCase()] || 'var(--color-ref-slate-500)';
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
