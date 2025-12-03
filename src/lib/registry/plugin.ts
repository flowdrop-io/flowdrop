/**
 * FlowDrop Plugin System
 * Provides APIs for external libraries to register custom node components.
 *
 * This enables a plugin ecosystem where:
 * - Third-party libraries can provide custom node types
 * - Custom nodes are namespaced to avoid conflicts
 * - Registration is simplified with a clean API
 */

import {
	nodeComponentRegistry,
	createNamespacedType,
	type NodeComponentRegistration,
	type NodeComponentProps,
	type NodeComponentCategory,
	type StatusPosition,
	type StatusSize
} from './nodeComponentRegistry.js';
import type { Component } from 'svelte';

/**
 * Plugin configuration for external libraries.
 * Use this to register multiple node types from a library.
 */
export interface FlowDropPluginConfig {
	/**
	 * Unique namespace for this plugin.
	 * Used to prefix all node types (e.g., "mylib" -> "mylib:nodename").
	 * Should be lowercase, alphanumeric with optional hyphens.
	 */
	namespace: string;

	/** Display name for the plugin (for UI/debugging purposes) */
	name: string;

	/** Plugin version (optional, for debugging) */
	version?: string;

	/** Description of what this plugin provides */
	description?: string;

	/** Node components to register */
	nodes: PluginNodeDefinition[];
}

/**
 * Simplified node definition for plugins.
 * Provides a cleaner API than full NodeComponentRegistration.
 */
export interface PluginNodeDefinition {
	/**
	 * Type identifier for this node.
	 * Will be prefixed with the plugin namespace (e.g., "fancy" -> "mylib:fancy").
	 */
	type: string;

	/** Display name shown in UI */
	displayName: string;

	/** Description of what this node does */
	description?: string;

	/** The Svelte component to render */
	component: Component<NodeComponentProps>;

	/** Icon in iconify format (e.g., "mdi:star") */
	icon?: string;

	/** Category for organizing in UI */
	category?: NodeComponentCategory;

	/** Status overlay position */
	statusPosition?: StatusPosition;

	/** Status overlay size */
	statusSize?: StatusSize;
}

/**
 * Result of plugin registration.
 * Contains information about what was registered and any errors.
 */
export interface PluginRegistrationResult {
	/** Whether all nodes were registered successfully */
	success: boolean;

	/** The plugin namespace */
	namespace: string;

	/** Array of successfully registered type identifiers (namespaced) */
	registeredTypes: string[];

	/** Array of error messages for failed registrations */
	errors: string[];
}

/**
 * Register a FlowDrop plugin with custom node components.
 * All node types are automatically namespaced with the plugin namespace.
 *
 * @param config - Plugin configuration with namespace and node definitions
 * @returns Result object with registered types and any errors
 *
 * @example
 * ```typescript
 * import { registerFlowDropPlugin } from "@flowdrop/lib";
 * import FancyNode from "./FancyNode.svelte";
 * import GlowNode from "./GlowNode.svelte";
 *
 * const result = registerFlowDropPlugin({
 *     namespace: "awesome",
 *     name: "Awesome Nodes",
 *     version: "1.0.0",
 *     nodes: [
 *         {
 *             type: "fancy",
 *             displayName: "Fancy Node",
 *             component: FancyNode,
 *             icon: "mdi:sparkles"
 *         },
 *         {
 *             type: "glow",
 *             displayName: "Glowing Node",
 *             component: GlowNode,
 *             icon: "mdi:lightbulb"
 *         }
 *     ]
 * });
 *
 * // Result:
 * // {
 * //     success: true,
 * //     namespace: "awesome",
 * //     registeredTypes: ["awesome:fancy", "awesome:glow"],
 * //     errors: []
 * // }
 * ```
 */
export function registerFlowDropPlugin(config: FlowDropPluginConfig): PluginRegistrationResult {
	const result: PluginRegistrationResult = {
		success: true,
		namespace: config.namespace,
		registeredTypes: [],
		errors: []
	};

	// Validate namespace
	if (!isValidNamespace(config.namespace)) {
		result.success = false;
		result.errors.push(
			`Invalid namespace "${config.namespace}". ` +
				`Namespace must be lowercase alphanumeric with optional hyphens.`
		);
		return result;
	}

	// Register each node
	for (const nodeDef of config.nodes) {
		try {
			const namespacedType = createNamespacedType(config.namespace, nodeDef.type);

			const registration: NodeComponentRegistration = {
				type: namespacedType,
				displayName: nodeDef.displayName,
				description: nodeDef.description,
				component: nodeDef.component,
				icon: nodeDef.icon,
				category: nodeDef.category ?? 'custom',
				source: config.namespace,
				statusPosition: nodeDef.statusPosition,
				statusSize: nodeDef.statusSize
			};

			nodeComponentRegistry.register(registration);
			result.registeredTypes.push(namespacedType);
		} catch (error) {
			result.success = false;
			const errorMessage = error instanceof Error ? error.message : String(error);
			result.errors.push(`Failed to register ${config.namespace}:${nodeDef.type}: ${errorMessage}`);
		}
	}

	return result;
}

/**
 * Unregister all nodes from a plugin by namespace.
 *
 * @param namespace - The plugin namespace to unregister
 * @returns Array of unregistered type identifiers
 *
 * @example
 * ```typescript
 * const removed = unregisterFlowDropPlugin("awesome");
 * // Returns ["awesome:fancy", "awesome:glow"]
 * ```
 */
export function unregisterFlowDropPlugin(namespace: string): string[] {
	const unregistered: string[] = [];
	const types = nodeComponentRegistry.getTypes();

	for (const type of types) {
		if (type.startsWith(`${namespace}:`)) {
			if (nodeComponentRegistry.unregister(type)) {
				unregistered.push(type);
			}
		}
	}

	return unregistered;
}

/**
 * Check if a namespace is valid.
 * Must be lowercase alphanumeric with optional hyphens.
 *
 * @param namespace - The namespace to validate
 * @returns true if valid
 */
export function isValidNamespace(namespace: string): boolean {
	return /^[a-z][a-z0-9-]*$/.test(namespace);
}

/**
 * Get all registered plugins (unique namespaces).
 *
 * @returns Array of namespace strings
 */
export function getRegisteredPlugins(): string[] {
	const sources = new Set<string>();
	const registrations = nodeComponentRegistry.getAll();

	for (const reg of registrations) {
		if (reg.source && reg.source !== 'flowdrop') {
			sources.add(reg.source);
		}
	}

	return Array.from(sources);
}

/**
 * Get the count of nodes registered by a plugin.
 *
 * @param namespace - The plugin namespace
 * @returns Number of nodes registered by this plugin
 */
export function getPluginNodeCount(namespace: string): number {
	return nodeComponentRegistry.getBySource(namespace).length;
}

/**
 * Register a single custom node without a full plugin.
 * Useful for project-specific custom nodes.
 *
 * @param type - Type identifier (can be namespaced or plain)
 * @param displayName - Display name for UI
 * @param component - Svelte component
 * @param options - Additional options
 *
 * @example
 * ```typescript
 * import { registerCustomNode } from "@flowdrop/lib";
 * import MyNode from "./MyNode.svelte";
 *
 * registerCustomNode("myproject:special", "Special Node", MyNode, {
 *     icon: "mdi:star",
 *     description: "A special node for my project"
 * });
 * ```
 */
export function registerCustomNode(
	type: string,
	displayName: string,
	component: Component<NodeComponentProps>,
	options: {
		description?: string;
		icon?: string;
		category?: NodeComponentCategory;
		source?: string;
		statusPosition?: StatusPosition;
		statusSize?: StatusSize;
	} = {}
): void {
	nodeComponentRegistry.register({
		type,
		displayName,
		component,
		description: options.description,
		icon: options.icon,
		category: options.category ?? 'custom',
		source: options.source ?? 'custom',
		statusPosition: options.statusPosition,
		statusSize: options.statusSize
	});
}

/**
 * Create a plugin builder for a fluent API experience.
 *
 * @param namespace - Plugin namespace
 * @param name - Plugin name
 * @returns Plugin builder with chainable methods
 *
 * @example
 * ```typescript
 * import { createPlugin } from "@flowdrop/lib";
 *
 * createPlugin("awesome", "Awesome Nodes")
 *     .version("1.0.0")
 *     .node("fancy", "Fancy Node", FancyNode)
 *     .node("glow", "Glowing Node", GlowNode, { icon: "mdi:lightbulb" })
 *     .register();
 * ```
 */
export function createPlugin(namespace: string, name: string) {
	const config: FlowDropPluginConfig = {
		namespace,
		name,
		nodes: []
	};

	const builder = {
		/**
		 * Set plugin version
		 */
		version(v: string) {
			config.version = v;
			return builder;
		},

		/**
		 * Set plugin description
		 */
		description(desc: string) {
			config.description = desc;
			return builder;
		},

		/**
		 * Add a node to the plugin
		 */
		node(
			type: string,
			displayName: string,
			component: Component<NodeComponentProps>,
			options: Partial<Omit<PluginNodeDefinition, 'type' | 'displayName' | 'component'>> = {}
		) {
			config.nodes.push({
				type,
				displayName,
				component,
				...options
			});
			return builder;
		},

		/**
		 * Register the plugin
		 */
		register(): PluginRegistrationResult {
			return registerFlowDropPlugin(config);
		},

		/**
		 * Get the config without registering (for testing/inspection)
		 */
		getConfig(): FlowDropPluginConfig {
			return { ...config };
		}
	};

	return builder;
}
