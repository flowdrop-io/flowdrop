/**
 * Node Component Registry
 * Central registry for node component types that allows built-in and third-party
 * components to be registered and resolved at runtime.
 *
 * This enables:
 * - Custom node components to be registered by users
 * - External libraries to contribute node types via plugins
 * - Runtime switching between different node visualizations
 */

import type { Component } from 'svelte';
import type { WorkflowNode } from '../types/index.js';
import { BaseRegistry } from './BaseRegistry.js';

/**
 * Props interface that all node components must accept.
 * Any component registered in the registry must be compatible with these props.
 */
export interface NodeComponentProps {
	/** Node data containing label, config, metadata, executionInfo */
	data: WorkflowNode['data'] & {
		nodeId?: string;
		onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
	};
	/** Whether the node is currently selected */
	selected?: boolean;
	/** Whether the node is in processing state */
	isProcessing?: boolean;
	/** Whether the node has an error */
	isError?: boolean;
}

/**
 * Position options for the status overlay on nodes
 */
export type StatusPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Size options for the status overlay on nodes
 */
export type StatusSize = 'sm' | 'md' | 'lg';

/**
 * Category for organizing node types in the UI
 */
export type NodeComponentCategory = 'visual' | 'functional' | 'layout' | 'custom';

/**
 * Framework-agnostic metadata for a node type.
 * Contains all display/organizational information without any Svelte dependency.
 * Use this interface when you only need node metadata (e.g., in adapters, headless consumers).
 */
export interface NodeTypeInfo {
	/** Unique identifier for this node type (e.g., "simple", "mylib:custom") */
	type: string;
	/** Display name for UI purposes (e.g., "Simple Node") */
	displayName: string;
	/** Description of what this node type is for */
	description?: string;
	/** Icon to show in the node type selector (iconify format) */
	icon?: string;
	/** Category for grouping in UI */
	category?: NodeComponentCategory;
	/** Source of the registration (e.g., "flowdrop", "mylib") for debugging/filtering */
	source?: string;
	/** Default status overlay position for this node type */
	statusPosition?: StatusPosition;
	/** Default status overlay size for this node type */
	statusSize?: StatusSize;
}

/**
 * Full registration for a node component.
 * Extends NodeTypeInfo with the Svelte component needed for rendering.
 */
export interface NodeComponentRegistration extends NodeTypeInfo {
	/** The Svelte component to render for this node type */
	component: Component<NodeComponentProps>;
}

/**
 * Options for filtering node registrations
 */
export interface NodeRegistrationFilter {
	/** Filter by category */
	category?: NodeComponentCategory;
	/** Filter by source */
	source?: string;
	/** Custom filter function */
	predicate?: (registration: NodeComponentRegistration) => boolean;
}

/**
 * Central registry for node component types.
 * Allows built-in and third-party components to be registered and resolved.
 *
 * Extends BaseRegistry for shared mechanics (subscribe, onClear, etc.).
 *
 * @example
 * ```typescript
 * // Register a custom node
 * nodeComponentRegistry.register({
 *     type: "myCustomNode",
 *     displayName: "My Custom Node",
 *     component: MyCustomNodeComponent,
 *     icon: "mdi:star",
 *     category: "custom"
 * });
 *
 * // Get a component
 * const component = nodeComponentRegistry.getComponent("myCustomNode");
 * ```
 */
class NodeComponentRegistry extends BaseRegistry<string, NodeComponentRegistration> {
	/** Default type to use when requested type is not found */
	private defaultType: string = 'workflowNode';

	/** Initial default type, restored on clear() */
	private static readonly INITIAL_DEFAULT_TYPE = 'workflowNode';

	/**
	 * Register a node component type.
	 *
	 * @param registration - The component registration details
	 * @param overwrite - If true, allows overwriting existing registrations
	 * @throws Error if type already registered and overwrite is false
	 *
	 * @example
	 * ```typescript
	 * nodeComponentRegistry.register({
	 *     type: "fancy",
	 *     displayName: "Fancy Node",
	 *     component: FancyNode,
	 *     icon: "mdi:sparkles"
	 * });
	 * ```
	 */
	/**
	 * Clear all registrations and reset default type.
	 */
	override clear(): void {
		super.clear();
		this.defaultType = NodeComponentRegistry.INITIAL_DEFAULT_TYPE;
	}

	register(registration: NodeComponentRegistration, overwrite = false): void {
		if (this.items.has(registration.type) && !overwrite) {
			throw new Error(
				`Node type "${registration.type}" is already registered. ` +
					`Use overwrite: true to replace it, or use a namespaced type like "mylib:${registration.type}".`
			);
		}
		this.items.set(registration.type, registration);
		this.notifyListeners();
	}

	/**
	 * Register multiple components at once.
	 * Useful for libraries registering multiple node types.
	 *
	 * @param registrations - Array of registrations to add
	 * @param overwrite - If true, allows overwriting existing registrations
	 */
	registerAll(registrations: NodeComponentRegistration[], overwrite = false): void {
		for (const registration of registrations) {
			this.register(registration, overwrite);
		}
	}

	/**
	 * Get the component for a type, with fallback to default.
	 *
	 * @param type - The type identifier to look up
	 * @returns The component if found, or the default component
	 */
	getComponent(type: string): Component<NodeComponentProps> | undefined {
		const registration = this.items.get(type) ?? this.items.get(this.defaultType);
		return registration?.component;
	}

	/**
	 * Get framework-agnostic metadata for a type, without the Svelte component.
	 *
	 * @param type - The type identifier to look up
	 * @returns The metadata if found, undefined otherwise
	 */
	getMetadata(type: string): NodeTypeInfo | undefined {
		const reg = this.items.get(type);
		if (!reg) return undefined;
		const { component: _, ...metadata } = reg;
		return metadata;
	}

	/**
	 * Get all registered type identifiers.
	 *
	 * @returns Array of registered type strings
	 */
	getTypes(): string[] {
		return this.getKeys();
	}

	/**
	 * Get registrations filtered by criteria.
	 *
	 * @param filter - Filter options
	 * @returns Filtered array of registrations
	 *
	 * @example
	 * ```typescript
	 * // Get all visual nodes
	 * const visualNodes = nodeComponentRegistry.filter({ category: "visual" });
	 *
	 * // Get nodes from a specific library
	 * const libNodes = nodeComponentRegistry.filter({ source: "mylib" });
	 * ```
	 */
	filter(filter: NodeRegistrationFilter): NodeComponentRegistration[] {
		return this.getAll().filter((reg) => {
			if (filter.category && reg.category !== filter.category) {
				return false;
			}
			if (filter.source && reg.source !== filter.source) {
				return false;
			}
			if (filter.predicate && !filter.predicate(reg)) {
				return false;
			}
			return true;
		});
	}

	/**
	 * Get registrations filtered by category.
	 *
	 * @param category - The category to filter by
	 * @returns Array of registrations in that category
	 */
	getByCategory(category: NodeComponentCategory): NodeComponentRegistration[] {
		return this.filter({ category });
	}

	/**
	 * Get registrations filtered by source.
	 *
	 * @param source - The source identifier to filter by (e.g., "flowdrop", "mylib")
	 * @returns Array of registrations from that source
	 */
	getBySource(source: string): NodeComponentRegistration[] {
		return this.filter({ source });
	}

	/**
	 * Set the default fallback type.
	 *
	 * @param type - The type to use as default when requested type is not found
	 * @throws Error if the type is not registered
	 */
	setDefaultType(type: string): void {
		if (!this.items.has(type)) {
			throw new Error(`Cannot set default to unregistered type: ${type}`);
		}
		this.defaultType = type;
	}

	/**
	 * Get the current default type.
	 *
	 * @returns The default type identifier
	 */
	getDefaultType(): string {
		return this.defaultType;
	}

	/**
	 * Get oneOf options for config forms.
	 * Returns array suitable for JSON Schema oneOf with const/title.
	 *
	 * @param filterFn - Optional filter function to limit which types are included
	 * @returns Array of oneOf items with const (type value) and title (display name)
	 *
	 * @example
	 * ```typescript
	 * const oneOf = nodeComponentRegistry.getOneOfOptions();
	 * // Use in configSchema: { type: "string", oneOf }
	 * ```
	 */
	getOneOfOptions(
		filterFn?: (reg: NodeComponentRegistration) => boolean
	): Array<{ const: string; title: string }> {
		const registrations = filterFn ? this.getAll().filter(filterFn) : this.getAll();
		return registrations.map((r) => ({
			const: r.type,
			title: r.displayName
		}));
	}

	/**
	 * Get the status position for a node type.
	 *
	 * @param type - The node type
	 * @returns The status position, or default "top-right"
	 */
	getStatusPosition(type: string): StatusPosition {
		return this.items.get(type)?.statusPosition ?? 'top-right';
	}

	/**
	 * Get the status size for a node type.
	 *
	 * @param type - The node type
	 * @returns The status size, or default "md"
	 */
	getStatusSize(type: string): StatusSize {
		return this.items.get(type)?.statusSize ?? 'md';
	}
}

/** Singleton instance of the node component registry */
export const nodeComponentRegistry = new NodeComponentRegistry();

/**
 * Helper function to create a namespaced type identifier.
 * Use this to avoid conflicts when registering custom nodes.
 *
 * @param namespace - Your library/project namespace
 * @param type - The node type name
 * @returns Namespaced type string (e.g., "mylib:custom")
 *
 * @example
 * ```typescript
 * const type = createNamespacedType("mylib", "fancy");
 * // Returns "mylib:fancy"
 * ```
 */
export function createNamespacedType(namespace: string, type: string): string {
	return `${namespace}:${type}`;
}

/**
 * Parse a namespaced type into its components.
 *
 * @param namespacedType - The full namespaced type (e.g., "mylib:custom")
 * @returns Object with namespace and type, or null if not namespaced
 *
 * @example
 * ```typescript
 * parseNamespacedType("mylib:fancy");
 * // Returns { namespace: "mylib", type: "fancy" }
 *
 * parseNamespacedType("simple");
 * // Returns null (not namespaced)
 * ```
 */
export function parseNamespacedType(
	namespacedType: string
): { namespace: string; type: string } | null {
	const colonIndex = namespacedType.indexOf(':');
	if (colonIndex === -1) {
		return null;
	}
	return {
		namespace: namespacedType.slice(0, colonIndex),
		type: namespacedType.slice(colonIndex + 1)
	};
}
