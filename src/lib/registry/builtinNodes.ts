/**
 * Built-in Node Components Registration
 * Registers all default FlowDrop node components with the registry.
 *
 * This module is automatically loaded when the library initializes,
 * ensuring all built-in node types are available without user action.
 */

import { nodeComponentRegistry, type NodeComponentRegistration } from './nodeComponentRegistry.js';
import WorkflowNode from '../components/WorkflowNode.svelte';
import SimpleNode from '../components/SimpleNode.svelte';
import SquareNode from '../components/SquareNode.svelte';
import ToolNode from '../components/ToolNode.svelte';
import GatewayNode from '../components/GatewayNode.svelte';
import NotesNode from '../components/NotesNode.svelte';

/**
 * Source identifier for built-in FlowDrop components
 */
export const FLOWDROP_SOURCE = 'flowdrop';

/**
 * Built-in FlowDrop node component registrations.
 * These are the default node types that ship with FlowDrop.
 */
export const BUILTIN_NODE_COMPONENTS: NodeComponentRegistration[] = [
	{
		type: 'workflowNode',
		displayName: 'Default (Standard Workflow Node)',
		description: 'Full-featured workflow node with inputs/outputs display',
		component: WorkflowNode,
		icon: 'mdi:vector-square',
		category: 'visual',
		source: FLOWDROP_SOURCE,
		statusPosition: 'top-right',
		statusSize: 'md'
	},
	{
		type: 'simple',
		displayName: 'Simple (Compact Layout)',
		description: 'Compact node with header, icon, and description',
		component: SimpleNode,
		icon: 'mdi:card-outline',
		category: 'visual',
		source: FLOWDROP_SOURCE,
		statusPosition: 'top-right',
		statusSize: 'md'
	},
	{
		type: 'square',
		displayName: 'Square (Minimal Icon)',
		description: 'Minimal square node showing only an icon',
		component: SquareNode,
		icon: 'mdi:square',
		category: 'visual',
		source: FLOWDROP_SOURCE,
		statusPosition: 'top-right',
		statusSize: 'sm'
	},
	{
		type: 'tool',
		displayName: 'Tool (Agent Tool)',
		description: 'Specialized node for agent tools with tool metadata',
		component: ToolNode,
		icon: 'mdi:tools',
		category: 'functional',
		source: FLOWDROP_SOURCE,
		statusPosition: 'top-left',
		statusSize: 'sm'
	},
	{
		type: 'gateway',
		displayName: 'Gateway (Branching)',
		description: 'Branching control flow node with multiple output branches',
		component: GatewayNode,
		icon: 'mdi:source-branch',
		category: 'functional',
		source: FLOWDROP_SOURCE,
		statusPosition: 'top-right',
		statusSize: 'md'
	},
	{
		type: 'note',
		displayName: 'Note (Sticky Note)',
		description: 'Documentation note with markdown support',
		component: NotesNode,
		icon: 'mdi:note-text',
		category: 'layout',
		source: FLOWDROP_SOURCE,
		statusPosition: 'bottom-right',
		statusSize: 'sm'
	}
];

/**
 * Alias mapping for backwards compatibility.
 * Maps old type names to their canonical registration.
 */
export const BUILTIN_TYPE_ALIASES: Record<string, string> = {
	default: 'workflowNode'
};

/**
 * Track whether built-in nodes have been registered.
 * Prevents duplicate registration on hot reload.
 */
let builtinsRegistered = false;

/**
 * Initialize the registry with built-in components.
 * This is called automatically when the library loads.
 *
 * Safe to call multiple times - will only register once.
 *
 * @example
 * ```typescript
 * // Usually not needed - called automatically
 * // But can be called manually if needed
 * registerBuiltinNodes();
 * ```
 */
export function registerBuiltinNodes(): void {
	if (builtinsRegistered) {
		return;
	}

	// Register all built-in components
	nodeComponentRegistry.registerAll(BUILTIN_NODE_COMPONENTS, true);

	// Set the default type
	nodeComponentRegistry.setDefaultType('workflowNode');

	builtinsRegistered = true;
}

/**
 * Check if built-in nodes have been registered.
 *
 * @returns true if registerBuiltinNodes() has been called
 */
export function areBuiltinsRegistered(): boolean {
	return builtinsRegistered;
}

/**
 * Reset the registration state.
 * Primarily useful for testing.
 */
export function resetBuiltinRegistration(): void {
	builtinsRegistered = false;
}

/**
 * Get the canonical type for a given type string.
 * Handles aliases like "default" -> "workflowNode".
 *
 * @param type - The type string to resolve
 * @returns The canonical type string
 */
export function resolveBuiltinAlias(type: string): string {
	return BUILTIN_TYPE_ALIASES[type] ?? type;
}

/**
 * Check if a type is a built-in FlowDrop type.
 *
 * @param type - The type to check
 * @returns true if this is a built-in type
 */
export function isBuiltinType(type: string): boolean {
	const canonicalType = resolveBuiltinAlias(type);
	return BUILTIN_NODE_COMPONENTS.some((reg) => reg.type === canonicalType);
}

/**
 * Get all built-in type identifiers.
 *
 * @returns Array of built-in type strings
 */
export function getBuiltinTypes(): string[] {
	return BUILTIN_NODE_COMPONENTS.map((reg) => reg.type);
}

/**
 * Type for built-in node types.
 * Use this when you specifically need a built-in type.
 */
export type BuiltinNodeType = 'workflowNode' | 'simple' | 'square' | 'tool' | 'gateway' | 'note';

/**
 * Array of built-in type strings for runtime validation.
 */
export const BUILTIN_NODE_TYPES: BuiltinNodeType[] = [
	'workflowNode',
	'simple',
	'square',
	'tool',
	'gateway',
	'note'
];

// Auto-register built-ins when this module is imported
registerBuiltinNodes();
