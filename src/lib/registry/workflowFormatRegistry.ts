/**
 * Workflow Format Registry
 *
 * Central registry for workflow format adapters that allows built-in and
 * third-party formats to be registered and resolved at runtime.
 *
 * This enables:
 * - Custom workflow formats (e.g., n8n, LangGraph) to be registered by users
 * - Format adapters to bundle their own node types
 * - Bidirectional conversion between FlowDrop's StandardWorkflow and external formats
 *
 * Extends BaseRegistry for shared mechanics (subscribe, onClear, etc.).
 */

import type { StandardWorkflow } from '../adapters/WorkflowAdapter.js';
import type { NodeMetadata, WorkflowFormat } from '../types/index.js';
import { BaseRegistry } from './BaseRegistry.js';

/**
 * Validation result returned by format adapters.
 */
export interface FormatValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Interface that all workflow format adapters must implement.
 * Adapters handle bidirectional conversion between FlowDrop's StandardWorkflow
 * and an external workflow format.
 *
 * @example
 * ```typescript
 * const myAdapter: WorkflowFormatAdapter = {
 *   id: 'n8n',
 *   name: 'n8n Workflow',
 *   export: (workflow) => JSON.stringify(convertToN8n(workflow)),
 *   import: (data) => convertFromN8n(JSON.parse(data)),
 * };
 * ```
 */
export interface WorkflowFormatAdapter {
	/** Unique format identifier (e.g., 'agentspec', 'n8n') */
	id: WorkflowFormat;
	/** Display name for UI (e.g., 'Agent Spec (Oracle)') */
	name: string;
	/** Description */
	description?: string;
	/** Version */
	version?: string;

	/**
	 * Optional node types specific to this format.
	 * When provided, these nodes are merged into the sidebar
	 * and automatically tagged with this format.
	 */
	nodes?: NodeMetadata[];

	/** Convert a StandardWorkflow to this format's JSON string */
	export(workflow: StandardWorkflow): string;

	/** Parse this format's input and convert to StandardWorkflow */
	import(data: string): StandardWorkflow;

	/** Validate whether a workflow can be exported to this format */
	validate?(workflow: StandardWorkflow): FormatValidationResult;
}

/**
 * Central registry for workflow format adapters.
 * Singleton — extends BaseRegistry for shared mechanics.
 *
 * @example
 * ```typescript
 * // Register a custom format
 * workflowFormatRegistry.register({
 *   id: 'n8n',
 *   name: 'n8n Workflow',
 *   export: (workflow) => JSON.stringify(convertToN8n(workflow)),
 *   import: (data) => convertFromN8n(JSON.parse(data)),
 * });
 *
 * // Get an adapter
 * const adapter = workflowFormatRegistry.get('n8n');
 * ```
 */
class WorkflowFormatRegistry extends BaseRegistry<string, WorkflowFormatAdapter> {
	/**
	 * Register a workflow format adapter.
	 *
	 * @param adapter - The format adapter to register
	 * @param overwrite - If true, allows overwriting existing registrations
	 * @throws Error if format already registered and overwrite is false
	 */
	register(adapter: WorkflowFormatAdapter, overwrite = false): void {
		if (this.items.has(adapter.id) && !overwrite) {
			throw new Error(
				`Workflow format "${adapter.id}" is already registered. ` +
					`Use overwrite: true to replace it.`
			);
		}
		this.items.set(adapter.id, adapter);
		this.notifyListeners();
	}

	/**
	 * Get all registered format identifiers.
	 *
	 * @returns Array of format id strings
	 */
	getIds(): string[] {
		return this.getKeys();
	}

	/**
	 * Get all node types provided by registered format adapters.
	 * Collects `adapter.nodes` from all adapters that provide them.
	 *
	 * @returns Array of NodeMetadata from all format adapters
	 */
	getAllFormatNodes(): NodeMetadata[] {
		const allNodes: NodeMetadata[] = [];
		for (const adapter of this.items.values()) {
			if (adapter.nodes && adapter.nodes.length > 0) {
				allNodes.push(...adapter.nodes);
			}
		}
		return allNodes;
	}

	/**
	 * Get node types for a specific format.
	 *
	 * @param formatId - The format identifier
	 * @returns Array of NodeMetadata for the format, or empty array
	 */
	getFormatNodes(formatId: WorkflowFormat): NodeMetadata[] {
		const adapter = this.items.get(formatId);
		return adapter?.nodes ?? [];
	}

	/**
	 * Get oneOf options for config forms.
	 * Returns array suitable for JSON Schema oneOf with const/title.
	 *
	 * @returns Array of oneOf items
	 */
	getOneOfOptions(): Array<{ const: string; title: string }> {
		return this.getAll().map((adapter) => ({
			const: adapter.id,
			title: adapter.name
		}));
	}
}

/** Singleton instance of the workflow format registry */
export const workflowFormatRegistry = new WorkflowFormatRegistry();
