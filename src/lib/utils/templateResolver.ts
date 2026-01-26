/**
 * Template Resolver Utility
 *
 * Provides URL template resolution for dynamic endpoints.
 * Extracted from dynamicSchemaService for reuse across services.
 *
 * @module utils/templateResolver
 */

import type { WorkflowNode } from '../types/index.js';

/**
 * Context object containing all available data for resolving template variables
 */
export interface NodeContext {
	/** Node instance ID */
	id: string;
	/** Node type from xyflow */
	type: string;
	/** Node metadata (id, name, type, category, etc.) */
	metadata: WorkflowNode['data']['metadata'];
	/** Node configuration values */
	config: Record<string, unknown>;
	/** Node extensions */
	extensions?: WorkflowNode['data']['extensions'];
	/** Current workflow ID (if available) */
	workflowId?: string;
}

/**
 * Resolves a template variable path from the node context.
 * Supports dot-notation paths like "metadata.id", "config.apiKey", "id"
 *
 * @param context - The node context containing all available data
 * @param path - Dot-notation path to resolve (e.g., "metadata.id")
 * @returns The resolved value as a string, or undefined if not found
 */
export function resolveVariablePath(
	context: Record<string, unknown>,
	path: string
): string | undefined {
	const parts = path.split('.');
	let current: unknown = context;

	for (const part of parts) {
		if (current === null || current === undefined) {
			return undefined;
		}
		if (typeof current === 'object' && part in current) {
			current = (current as Record<string, unknown>)[part];
		} else {
			return undefined;
		}
	}

	if (current === null || current === undefined) {
		return undefined;
	}
	return String(current);
}

/**
 * Replaces template variables in a URL or string with values from the node context.
 * Template variables use curly brace syntax: {variableName}
 *
 * @param template - The template string with variables
 * @param parameterMapping - Maps variable names to context paths
 * @param context - The node context containing all available data
 * @returns The resolved string with all variables replaced
 */
export function resolveTemplate(
	template: string,
	parameterMapping: Record<string, string> | undefined,
	context: NodeContext
): string {
	let resolved = template;

	// Cast context to Record for path resolution
	const contextRecord = context as unknown as Record<string, unknown>;

	// Replace each mapped variable
	if (parameterMapping) {
		for (const [variableName, contextPath] of Object.entries(parameterMapping)) {
			const value = resolveVariablePath(contextRecord, contextPath);
			if (value !== undefined) {
				const regex = new RegExp(`\\{${variableName}\\}`, 'g');
				resolved = resolved.replace(regex, encodeURIComponent(value));
			}
		}
	}

	// Also try to resolve any unmapped variables directly from context
	const remainingVariables = resolved.match(/\{([^}]+)\}/g);
	if (remainingVariables) {
		for (const variable of remainingVariables) {
			const variableName = variable.slice(1, -1);
			const value = resolveVariablePath(contextRecord, variableName);
			if (value !== undefined) {
				resolved = resolved.replace(variable, encodeURIComponent(value));
			}
		}
	}

	return resolved;
}

/**
 * Builds a NodeContext from a WorkflowNode.
 *
 * @param node - The workflow node
 * @param workflowId - Optional workflow ID
 * @returns The node context for template resolution
 */
export function buildNodeContext(node: WorkflowNode, workflowId?: string): NodeContext {
	return {
		id: node.id,
		type: node.type,
		metadata: node.data.metadata,
		config: node.data.config,
		extensions: node.data.extensions,
		workflowId
	};
}
