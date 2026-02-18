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
 * Mirrors the nodeComponentRegistry pattern.
 */

import type { StandardWorkflow } from '../adapters/WorkflowAdapter.js';
import type { NodeMetadata, WorkflowFormat } from '../types/index.js';

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
 * Singleton — mirrors nodeComponentRegistry pattern.
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
class WorkflowFormatRegistry {
	/** Map of format id -> adapter */
	private adapters: Map<string, WorkflowFormatAdapter> = new Map();

	/** Listeners for registry changes */
	private listeners: Set<() => void> = new Set();

	/** Callbacks invoked when registry is cleared (for resetting registration flags) */
	private clearCallbacks: Set<() => void> = new Set();

	/**
	 * Register a workflow format adapter.
	 *
	 * @param adapter - The format adapter to register
	 * @param overwrite - If true, allows overwriting existing registrations
	 * @throws Error if format already registered and overwrite is false
	 */
	register(adapter: WorkflowFormatAdapter, overwrite = false): void {
		if (this.adapters.has(adapter.id) && !overwrite) {
			throw new Error(
				`Workflow format "${adapter.id}" is already registered. ` +
					`Use overwrite: true to replace it.`
			);
		}
		this.adapters.set(adapter.id, adapter);
		this.notifyListeners();
	}

	/**
	 * Unregister a workflow format adapter.
	 *
	 * @param id - The format identifier to remove
	 * @returns true if the format was found and removed
	 */
	unregister(id: WorkflowFormat): boolean {
		const result = this.adapters.delete(id);
		if (result) {
			this.notifyListeners();
		}
		return result;
	}

	/**
	 * Get an adapter by format id.
	 *
	 * @param id - The format identifier
	 * @returns The adapter if found, undefined otherwise
	 */
	get(id: WorkflowFormat): WorkflowFormatAdapter | undefined {
		return this.adapters.get(id);
	}

	/**
	 * Check if a format is registered.
	 *
	 * @param id - The format identifier
	 * @returns true if the format is registered
	 */
	has(id: WorkflowFormat): boolean {
		return this.adapters.has(id);
	}

	/**
	 * Get all registered adapters.
	 *
	 * @returns Array of all registered format adapters
	 */
	getAll(): WorkflowFormatAdapter[] {
		return Array.from(this.adapters.values());
	}

	/**
	 * Get all registered format identifiers.
	 *
	 * @returns Array of format id strings
	 */
	getIds(): string[] {
		return Array.from(this.adapters.keys());
	}

	/**
	 * Get all node types provided by registered format adapters.
	 * Collects `adapter.nodes` from all adapters that provide them.
	 *
	 * @returns Array of NodeMetadata from all format adapters
	 */
	getAllFormatNodes(): NodeMetadata[] {
		const allNodes: NodeMetadata[] = [];
		for (const adapter of this.adapters.values()) {
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
		const adapter = this.adapters.get(formatId);
		return adapter?.nodes ?? [];
	}

	/**
	 * Subscribe to registry changes.
	 * Called whenever adapters are registered or unregistered.
	 *
	 * @param listener - Callback to invoke on changes
	 * @returns Unsubscribe function
	 */
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/**
	 * Notify all listeners of a change.
	 */
	private notifyListeners(): void {
		for (const listener of this.listeners) {
			listener();
		}
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

	/**
	 * Register a callback invoked when the registry is cleared.
	 * Useful for resetting module-level registration flags in tests.
	 *
	 * @param callback - Function to call on clear
	 * @returns Unsubscribe function
	 */
	onClear(callback: () => void): () => void {
		this.clearCallbacks.add(callback);
		return () => this.clearCallbacks.delete(callback);
	}

	/**
	 * Clear all registrations.
	 * Primarily useful for testing. Also invokes onClear callbacks
	 * so modules can reset their registration flags.
	 */
	clear(): void {
		this.adapters.clear();
		for (const cb of this.clearCallbacks) {
			cb();
		}
		this.notifyListeners();
	}

	/**
	 * Get the count of registered formats.
	 */
	get size(): number {
		return this.adapters.size;
	}
}

/** Singleton instance of the workflow format registry */
export const workflowFormatRegistry = new WorkflowFormatRegistry();
