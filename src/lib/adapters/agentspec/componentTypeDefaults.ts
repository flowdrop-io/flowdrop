/**
 * Agent Spec Component Type Defaults
 *
 * Internal adapter infrastructure for import/export.
 * Provides lightweight defaults per component_type (trigger ports, visual styling)
 * WITHOUT prescribing full node type definitions (data ports, config schemas).
 *
 * Full node type definitions are user-provided via getDefaultAgentSpecNodeTypes()
 * or custom node arrays passed to mountFlowDropApp().
 */

import type { NodePort } from '../../types/index.js';

// ============================================================================
// Constants
// ============================================================================

/** Namespace prefix for Agent Spec node type IDs */
export const AGENTSPEC_NAMESPACE = 'agentspec';

// ============================================================================
// Standard ports (adapter infrastructure)
// ============================================================================

/** Standard trigger input port — control flow into a node */
export const TRIGGER_INPUT: NodePort = {
	id: 'trigger',
	name: 'Trigger',
	type: 'input',
	dataType: 'trigger',
	required: false,
	description: 'Control flow input'
};

/** Standard trigger output port — control flow out of a node */
export const TRIGGER_OUTPUT: NodePort = {
	id: 'trigger',
	name: 'Trigger',
	type: 'output',
	dataType: 'trigger',
	required: false,
	description: 'Control flow output'
};

/** Tool input port for tool_node */
const TOOL_INPUT: NodePort = {
	id: 'tool',
	name: 'Tool',
	type: 'input',
	dataType: 'tool',
	required: false,
	description: 'Tool connection'
};

/** Tool output port for tool_node */
const TOOL_OUTPUT: NodePort = {
	id: 'tool',
	name: 'Tool',
	type: 'output',
	dataType: 'tool',
	description: 'Tool passthrough'
};

// ============================================================================
// Types
// ============================================================================

/**
 * Lightweight defaults for a component_type.
 * Used during import to construct minimal NodeMetadata from Agent Spec JSON.
 * These are NOT full node type definitions — they only contain what the
 * adapter needs to create valid FlowDrop nodes.
 */
export interface ComponentTypeDefaults {
	/** FlowDrop visual node type (terminal, gateway, default, tool, simple) */
	visualType: string;
	/** Node category for sidebar grouping */
	category: string;
	/** Default display color */
	color: string;
	/** Default icon (MDI format) */
	icon: string;
	/** Badge text for node header */
	badge: string;
	/** Default node name when no name provided */
	defaultName: string;
	/** Default description */
	defaultDescription: string;
	/** Trigger/tool ports to prepend to data inputs during import */
	triggerInputs: NodePort[];
	/** Trigger/tool ports to prepend to data outputs during import */
	triggerOutputs: NodePort[];
}

// ============================================================================
// Defaults mapping
// ============================================================================

const COMPONENT_TYPE_DEFAULTS = new Map<string, ComponentTypeDefaults>([
	[
		'start_node',
		{
			visualType: 'terminal',
			category: 'triggers',
			color: '#22c55e',
			icon: 'mdi:play-circle',
			badge: 'START',
			defaultName: 'Start',
			defaultDescription: 'Flow entry point. Defines the initial inputs for the flow.',
			triggerInputs: [],
			triggerOutputs: [TRIGGER_OUTPUT]
		}
	],
	[
		'end_node',
		{
			visualType: 'terminal',
			category: 'outputs',
			color: '#ef4444',
			icon: 'mdi:stop-circle',
			badge: 'END',
			defaultName: 'End',
			defaultDescription: 'Flow exit point. Defines the final outputs of the flow.',
			triggerInputs: [TRIGGER_INPUT],
			triggerOutputs: []
		}
	],
	[
		'llm_node',
		{
			visualType: 'default',
			category: 'ai',
			color: '#8b5cf6',
			icon: 'mdi:brain',
			badge: 'LLM',
			defaultName: 'LLM',
			defaultDescription:
				'Generate text using a large language model with configurable prompts.',
			triggerInputs: [TRIGGER_INPUT],
			triggerOutputs: [TRIGGER_OUTPUT]
		}
	],
	[
		'branching_node',
		{
			visualType: 'gateway',
			category: 'logic',
			color: '#f59e0b',
			icon: 'mdi:source-branch',
			badge: 'BRANCH',
			defaultName: 'Branch',
			defaultDescription: 'Route execution to different paths based on conditions.',
			triggerInputs: [TRIGGER_INPUT],
			triggerOutputs: []
		}
	],
	[
		'tool_node',
		{
			visualType: 'tool',
			category: 'tools',
			color: '#06b6d4',
			icon: 'mdi:wrench',
			badge: 'TOOL',
			defaultName: 'Tool',
			defaultDescription: 'Execute a tool function with inputs and receive outputs.',
			triggerInputs: [TRIGGER_INPUT, TOOL_INPUT],
			triggerOutputs: [TRIGGER_OUTPUT, TOOL_OUTPUT]
		}
	],
	[
		'api_node',
		{
			visualType: 'default',
			category: 'data',
			color: '#3b82f6',
			icon: 'mdi:api',
			badge: 'API',
			defaultName: 'API Call',
			defaultDescription:
				'Make an HTTP API call with configurable endpoint, method, and headers.',
			triggerInputs: [TRIGGER_INPUT],
			triggerOutputs: [TRIGGER_OUTPUT]
		}
	],
	[
		'agent_node',
		{
			visualType: 'default',
			category: 'agents',
			color: '#ec4899',
			icon: 'mdi:robot',
			badge: 'AGENT',
			defaultName: 'Agent',
			defaultDescription: 'Run a multi-round agent conversation within the flow.',
			triggerInputs: [TRIGGER_INPUT],
			triggerOutputs: [TRIGGER_OUTPUT]
		}
	],
	[
		'flow_node',
		{
			visualType: 'simple',
			category: 'processing',
			color: '#14b8a6',
			icon: 'mdi:sitemap',
			badge: 'FLOW',
			defaultName: 'Sub-Flow',
			defaultDescription: 'Execute another flow as a sub-routine within this flow.',
			triggerInputs: [TRIGGER_INPUT],
			triggerOutputs: [TRIGGER_OUTPUT]
		}
	],
	[
		'map_node',
		{
			visualType: 'default',
			category: 'processing',
			color: '#f97316',
			icon: 'mdi:map-marker-path',
			badge: 'MAP',
			defaultName: 'Map',
			defaultDescription:
				'Apply a flow or operation to each item in a collection (map-reduce).',
			triggerInputs: [TRIGGER_INPUT],
			triggerOutputs: [TRIGGER_OUTPUT]
		}
	]
]);

/** Fallback defaults for unrecognized component types */
const UNKNOWN_DEFAULTS: ComponentTypeDefaults = {
	visualType: 'default',
	category: 'processing',
	color: '#6b7280',
	icon: 'mdi:puzzle',
	badge: '',
	defaultName: 'Unknown',
	defaultDescription: 'Agent Spec node',
	triggerInputs: [TRIGGER_INPUT],
	triggerOutputs: [TRIGGER_OUTPUT]
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Get adapter defaults for a component type.
 * Returns sensible fallbacks for unrecognized types (never throws).
 *
 * @param componentType - The Agent Spec component_type value
 * @returns ComponentTypeDefaults for the type, or fallback for unknown types
 */
export function getComponentTypeDefaults(componentType: string): ComponentTypeDefaults {
	return COMPONENT_TYPE_DEFAULTS.get(componentType) ?? UNKNOWN_DEFAULTS;
}

/**
 * Check if a FlowDrop node ID belongs to an Agent Spec node type.
 *
 * @example
 * ```typescript
 * isAgentSpecNodeId('agentspec.llm_node') // true
 * isAgentSpecNodeId('calculator') // false
 * ```
 */
export function isAgentSpecNodeId(nodeId: string): boolean {
	return nodeId.startsWith(`${AGENTSPEC_NAMESPACE}.`);
}

/**
 * Extract the component_type string from a FlowDrop node type ID.
 * Does not validate against any registry — any string after the namespace prefix is returned.
 *
 * @example
 * ```typescript
 * extractComponentType('agentspec.llm_node') // 'llm_node'
 * extractComponentType('agentspec.my_custom') // 'my_custom'
 * extractComponentType('calculator') // undefined
 * ```
 */
export function extractComponentType(nodeTypeId: string): string | undefined {
	if (!isAgentSpecNodeId(nodeTypeId)) return undefined;
	const componentType = nodeTypeId.slice(AGENTSPEC_NAMESPACE.length + 1);
	return componentType || undefined;
}
