/**
 * Centralized color management for FlowDrop
 * Ensures consistent category colors across sidebar and canvas
 * Uses BEM syntax for CSS classes
 */

import type { NodeCategory } from "../types/index.js";

/**
 * Category color mapping to reference tokens (CSS variables)
 */
export const CATEGORY_COLOR_TOKENS: Record<NodeCategory, string> = {
  "inputs": "var(--color-ref-emerald-500)",
  "outputs": "var(--color-ref-blue-600)",
  "prompts": "var(--color-ref-amber-500)",
  "models": "var(--color-ref-indigo-500)",
  "processing": "var(--color-ref-teal-500)",
  "logic": "var(--color-ref-purple-600)",
  "data": "var(--color-ref-orange-500)",
  "helpers": "var(--color-ref-slate-500)",
  "tools": "var(--color-ref-amber-500)",
  "vector stores": "var(--color-ref-emerald-500)",
  "embeddings": "var(--color-ref-indigo-500)",
  "memories": "var(--color-ref-blue-600)",
  "agents": "var(--color-ref-teal-500)",
  "bundles": "var(--color-ref-slate-500)"
};

/**
 * Data type color mapping to reference tokens (CSS variables)
 */
export const DATA_TYPE_COLOR_TOKENS: Record<string, string> = {
  string: "var(--color-ref-emerald-500)",
  text: "var(--color-ref-emerald-500)",
  number: "var(--color-ref-blue-600)",
  integer: "var(--color-ref-blue-600)",
  float: "var(--color-ref-blue-600)",
  boolean: "var(--color-ref-purple-600)",
  array: "var(--color-ref-amber-500)",
  list: "var(--color-ref-amber-500)",
  object: "var(--color-ref-orange-500)",
  json: "var(--color-ref-orange-500)",
  file: "var(--color-ref-red-500)",
  document: "var(--color-ref-red-500)",
  image: "var(--color-ref-pink-500)",
  picture: "var(--color-ref-pink-500)",
  audio: "var(--color-ref-indigo-500)",
  sound: "var(--color-ref-indigo-500)",
  video: "var(--color-ref-teal-500)",
  movie: "var(--color-ref-teal-500)",
  url: "var(--color-ref-cyan-500)",
  email: "var(--color-ref-cyan-500)",
  date: "var(--color-ref-lime-500)",
  datetime: "var(--color-ref-lime-500)",
  time: "var(--color-ref-lime-500)"
};

/**
 * Get the reference color token for a category
 */
export function getCategoryColorToken(category: NodeCategory): string {
  return CATEGORY_COLOR_TOKENS[category] || "var(--color-ref-slate-500)";
}

/**
 * Get the reference color token for a data type
 */
export function getDataTypeColorToken(dataType: string): string {
  return DATA_TYPE_COLOR_TOKENS[dataType.toLowerCase()] || "var(--color-ref-slate-500)";
}

/**
 * Default colors for fallback cases
 */
export const DEFAULT_COLORS = {
  background: "flowdrop-color--base-light",
  accent: "flowdrop-color--neutral",
  text: "flowdrop-color--base-text",
  border: "flowdrop-color--base-border"
};

/**
 * Get category colors
 * @param category - The node category
 * @returns The color configuration for the category
 */
export function getCategoryColors(category: NodeCategory) {
  return CATEGORY_COLOR_TOKENS[category] || DEFAULT_COLORS;
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
 * Get category accent color (for icons, highlights)
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
 * Get node colors based on category and status
 * @param category - The node category
 * @param isError - Whether the node has an error
 * @param isProcessing - Whether the node is processing
 * @param isSelected - Whether the node is selected
 * @returns The color configuration for the node
 */
export function getNodeColors(
  category: NodeCategory,
  isError: boolean = false,
  isProcessing: boolean = false,
  isSelected: boolean = false
) {
  if (isError) {
    return {
      background: "flowdrop-color--error-light",
      accent: "flowdrop-color--error",
      text: "flowdrop-color--error-text",
      border: "flowdrop-color--error-border"
    };
  }
  
  if (isProcessing) {
    return {
      background: "flowdrop-color--warning-light",
      accent: "flowdrop-color--warning",
      text: "flowdrop-color--warning-text",
      border: "flowdrop-color--warning-border"
    };
  }
  
  if (isSelected) {
    return {
      background: "flowdrop-color--primary-light",
      accent: "flowdrop-color--primary",
      text: "flowdrop-color--primary-text",
      border: "flowdrop-color--primary-border"
    };
  }
  
  return getCategoryColors(category);
}

/**
 * Get node background color
 * @param category - The node category
 * @param isError - Whether the node has an error
 * @param isProcessing - Whether the node is processing
 * @param isSelected - Whether the node is selected
 * @returns The background color class
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
 * @param isError - Whether the node has an error
 * @param isProcessing - Whether the node is processing
 * @param isSelected - Whether the node is selected
 * @returns The accent color class
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
 * @param isError - Whether the node has an error
 * @param isProcessing - Whether the node is processing
 * @param isSelected - Whether the node is selected
 * @returns The text color class
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
 * @param isError - Whether the node has an error
 * @param isProcessing - Whether the node is processing
 * @param isSelected - Whether the node is selected
 * @returns The border color class
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
 * Data type color mapping for ports (used in WorkflowNode, etc.)
 * These use BEM color classes for consistency
 */
export const dataTypeColors: Record<string, string> = {
  string: "flowdrop-color--emerald",
  text: "flowdrop-color--emerald",
  number: "flowdrop-color--blue",
  integer: "flowdrop-color--blue",
  float: "flowdrop-color--blue",
  boolean: "flowdrop-color--purple",
  array: "flowdrop-color--amber",
  list: "flowdrop-color--amber",
  object: "flowdrop-color--orange",
  json: "flowdrop-color--orange",
  file: "flowdrop-color--red",
  document: "flowdrop-color--red",
  image: "flowdrop-color--pink",
  picture: "flowdrop-color--pink",
  audio: "flowdrop-color--indigo",
  sound: "flowdrop-color--indigo",
  video: "flowdrop-color--teal",
  movie: "flowdrop-color--teal",
  url: "flowdrop-color--cyan",
  email: "flowdrop-color--cyan",
  date: "flowdrop-color--lime",
  datetime: "flowdrop-color--lime",
  time: "flowdrop-color--lime"
};

/**
 * Get the color class for a given data type (default to slate)
 */
export function getDataTypeColor(dataType: string): string {
  return dataTypeColors[dataType.toLowerCase()] || "flowdrop-color--slate";
} 