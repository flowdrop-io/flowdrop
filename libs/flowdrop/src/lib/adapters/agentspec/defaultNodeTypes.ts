/**
 * Agent Spec Default Node Types
 *
 * Provides optional starter node type definitions for the Agent Spec format.
 * These are full NodeMetadata objects with visual type, category, default ports,
 * config schema, and icon — suitable for populating the sidebar.
 *
 * These definitions are NOT required by the adapter — the adapter uses
 * componentTypeDefaults.ts for import/export infrastructure.
 * Users can provide their own node definitions instead.
 *
 * @example
 * ```typescript
 * import { getDefaultAgentSpecNodeTypes } from '@d34dman/flowdrop/core';
 *
 * mountFlowDropApp(container, {
 *   nodes: getDefaultAgentSpecNodeTypes(), // or your own definitions
 * });
 * ```
 */

import type { NodeMetadata, NodePort, ConfigSchema } from '../../types/index.js';
import type { AgentSpecNodeComponentType } from '../../types/agentspec.js';
import {
	AGENTSPEC_NAMESPACE as AGENTSPEC_NS,
	TRIGGER_INPUT,
	TRIGGER_OUTPUT
} from './componentTypeDefaults.js';

/**
 * Registry entry with FlowDrop NodeMetadata for an Agent Spec node type.
 */
interface NodeTypeEntry {
	/** The Agent Spec component_type this entry maps */
	componentType: AgentSpecNodeComponentType;
	/** Complete FlowDrop NodeMetadata */
	metadata: NodeMetadata;
}

/**
 * Build the full registry of Agent Spec node types.
 */
function buildRegistry(): Map<AgentSpecNodeComponentType, NodeTypeEntry> {
	const registry = new Map<AgentSpecNodeComponentType, NodeTypeEntry>();

	// ========================================================================
	// StartNode — Graph entry point
	// ========================================================================
	registry.set('start_node', {
		componentType: 'start_node',
		metadata: {
			id: `${AGENTSPEC_NS}.start_node`,
			name: 'Start',
			type: 'terminal',
			description: 'Flow entry point. Defines the initial inputs for the flow.',
			category: 'triggers',
			version: '1.0.0',
			icon: 'mdi:play-circle',
			color: '#22c55e',
			badge: 'START',
			inputs: [],
			outputs: [TRIGGER_OUTPUT],
			configSchema: {
				type: 'object',
				properties: {}
			},
			formats: ['agentspec'],
			extensions: { 'agentspec:component_type': 'start_node' }
		}
	});

	// ========================================================================
	// EndNode — Graph exit point
	// ========================================================================
	registry.set('end_node', {
		componentType: 'end_node',
		metadata: {
			id: `${AGENTSPEC_NS}.end_node`,
			name: 'End',
			type: 'terminal',
			description: 'Flow exit point. Defines the final outputs of the flow.',
			category: 'outputs',
			version: '1.0.0',
			icon: 'mdi:stop-circle',
			color: '#ef4444',
			badge: 'END',
			inputs: [TRIGGER_INPUT],
			outputs: [],
			configSchema: {
				type: 'object',
				properties: {}
			},
			formats: ['agentspec'],
			extensions: { 'agentspec:component_type': 'end_node' }
		}
	});

	// ========================================================================
	// LLMNode — Text generation from prompts
	// ========================================================================
	registry.set('llm_node', {
		componentType: 'llm_node',
		metadata: {
			id: `${AGENTSPEC_NS}.llm_node`,
			name: 'LLM',
			type: 'default',
			description: 'Generate text using a large language model with configurable prompts.',
			category: 'ai',
			version: '1.0.0',
			icon: 'mdi:brain',
			color: '#8b5cf6',
			badge: 'LLM',
			inputs: [
				TRIGGER_INPUT,
				{
					id: 'prompt',
					name: 'Prompt',
					type: 'input',
					dataType: 'string',
					required: false,
					description: 'Input prompt text (can also use {{variable}} in prompt template)'
				}
			],
			outputs: [
				TRIGGER_OUTPUT,
				{
					id: 'llm_output',
					name: 'LLM Output',
					type: 'output',
					dataType: 'string',
					description: 'Generated text from the LLM'
				}
			],
			configSchema: {
				type: 'object',
				properties: {
					prompt_template: {
						type: 'string',
						title: 'Prompt Template',
						description: 'Prompt template with {{variable}} placeholders for dynamic inputs',
						format: 'multiline',
						default: '{{prompt}}'
					},
					system_prompt: {
						type: 'string',
						title: 'System Prompt',
						description: 'System message to set the LLM behavior',
						format: 'multiline',
						default: ''
					},
					llm_config_ref: {
						type: 'string',
						title: 'LLM Configuration',
						description: 'Reference to an LLM configuration (e.g., model name, provider)',
						default: ''
					}
				}
			},
			formats: ['agentspec'],
			extensions: { 'agentspec:component_type': 'llm_node' }
		}
	});

	// ========================================================================
	// BranchingNode — Conditional routing
	// ========================================================================
	registry.set('branching_node', {
		componentType: 'branching_node',
		metadata: {
			id: `${AGENTSPEC_NS}.branching_node`,
			name: 'Branch',
			type: 'gateway',
			description: 'Route execution to different paths based on conditions.',
			category: 'logic',
			version: '1.0.0',
			icon: 'mdi:source-branch',
			color: '#f59e0b',
			badge: 'BRANCH',
			inputs: [
				TRIGGER_INPUT,
				{
					id: 'input',
					name: 'Input',
					type: 'input',
					dataType: 'mixed',
					required: false,
					description: 'Data to evaluate branch conditions against'
				}
			],
			outputs: [],
			configSchema: {
				type: 'object',
				properties: {
					branches: {
						type: 'array',
						title: 'Branches',
						description: 'Conditional branches for routing',
						items: {
							type: 'object',
							properties: {
								name: {
									type: 'string',
									title: 'Branch ID',
									description: 'Unique identifier for the branch'
								},
								label: {
									type: 'string',
									title: 'Label',
									description: 'Display label for the branch'
								},
								condition: {
									type: 'string',
									title: 'Condition',
									description: 'Expression that determines when this branch activates'
								},
								isDefault: {
									type: 'boolean',
									title: 'Default Branch',
									description: 'Whether this is the fallback branch',
									default: false
								}
							},
							required: ['name']
						}
					}
				}
			} as ConfigSchema,
			formats: ['agentspec'],
			extensions: { 'agentspec:component_type': 'branching_node' }
		}
	});

	// ========================================================================
	// ToolNode — Tool execution
	// ========================================================================
	registry.set('tool_node', {
		componentType: 'tool_node',
		metadata: {
			id: `${AGENTSPEC_NS}.tool_node`,
			name: 'Tool',
			type: 'tool',
			description: 'Execute a tool function with inputs and receive outputs.',
			category: 'tools',
			version: '1.0.0',
			icon: 'mdi:wrench',
			color: '#06b6d4',
			badge: 'TOOL',
			inputs: [
				TRIGGER_INPUT,
				{
					id: 'tool',
					name: 'Tool',
					type: 'input',
					dataType: 'tool',
					required: false,
					description: 'Tool connection'
				}
			],
			outputs: [
				TRIGGER_OUTPUT,
				{
					id: 'tool',
					name: 'Tool',
					type: 'output',
					dataType: 'tool',
					description: 'Tool passthrough'
				},
				{
					id: 'result',
					name: 'Result',
					type: 'output',
					dataType: 'mixed',
					description: 'Tool execution result'
				}
			],
			configSchema: {
				type: 'object',
				properties: {
					tool_ref: {
						type: 'string',
						title: 'Tool Reference',
						description: 'Reference to the tool to execute ($component_ref:tool_name)',
						default: ''
					}
				}
			},
			formats: ['agentspec'],
			extensions: { 'agentspec:component_type': 'tool_node' }
		}
	});

	// ========================================================================
	// APINode — API call
	// ========================================================================
	registry.set('api_node', {
		componentType: 'api_node',
		metadata: {
			id: `${AGENTSPEC_NS}.api_node`,
			name: 'API Call',
			type: 'default',
			description: 'Make an HTTP API call with configurable endpoint, method, and headers.',
			category: 'data',
			version: '1.0.0',
			icon: 'mdi:api',
			color: '#3b82f6',
			badge: 'API',
			inputs: [
				TRIGGER_INPUT,
				{
					id: 'body',
					name: 'Request Body',
					type: 'input',
					dataType: 'json',
					required: false,
					description: 'Request body data'
				}
			],
			outputs: [
				TRIGGER_OUTPUT,
				{
					id: 'response',
					name: 'Response',
					type: 'output',
					dataType: 'json',
					description: 'API response data'
				},
				{
					id: 'status_code',
					name: 'Status Code',
					type: 'output',
					dataType: 'number',
					description: 'HTTP status code'
				}
			],
			configSchema: {
				type: 'object',
				properties: {
					endpoint: {
						type: 'string',
						title: 'Endpoint URL',
						description: 'The API endpoint to call',
						default: ''
					},
					method: {
						type: 'string',
						title: 'HTTP Method',
						enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
						default: 'GET'
					},
					headers: {
						type: 'string',
						title: 'Headers',
						description: 'Request headers as JSON',
						format: 'multiline',
						default: '{}'
					}
				}
			},
			formats: ['agentspec'],
			extensions: { 'agentspec:component_type': 'api_node' }
		}
	});

	// ========================================================================
	// AgentNode — Multi-round agent conversation
	// ========================================================================
	registry.set('agent_node', {
		componentType: 'agent_node',
		metadata: {
			id: `${AGENTSPEC_NS}.agent_node`,
			name: 'Agent',
			type: 'default',
			description: 'Run a multi-round agent conversation within the flow.',
			category: 'agents',
			version: '1.0.0',
			icon: 'mdi:robot',
			color: '#ec4899',
			badge: 'AGENT',
			inputs: [
				TRIGGER_INPUT,
				{
					id: 'input',
					name: 'Input',
					type: 'input',
					dataType: 'string',
					required: false,
					description: 'Input message for the agent'
				}
			],
			outputs: [
				TRIGGER_OUTPUT,
				{
					id: 'output',
					name: 'Output',
					type: 'output',
					dataType: 'string',
					description: 'Agent response output'
				}
			],
			configSchema: {
				type: 'object',
				properties: {
					agent_ref: {
						type: 'string',
						title: 'Agent Reference',
						description: 'Reference to the agent ($component_ref:agent_name)',
						default: ''
					},
					max_turns: {
						type: 'integer',
						title: 'Max Turns',
						description: 'Maximum number of conversation turns',
						minimum: 1,
						default: 10
					}
				}
			},
			formats: ['agentspec'],
			extensions: { 'agentspec:component_type': 'agent_node' }
		}
	});

	// ========================================================================
	// FlowNode — Nested flow execution
	// ========================================================================
	registry.set('flow_node', {
		componentType: 'flow_node',
		metadata: {
			id: `${AGENTSPEC_NS}.flow_node`,
			name: 'Sub-Flow',
			type: 'simple',
			description: 'Execute another flow as a sub-routine within this flow.',
			category: 'processing',
			version: '1.0.0',
			icon: 'mdi:sitemap',
			color: '#14b8a6',
			badge: 'FLOW',
			inputs: [
				TRIGGER_INPUT,
				{
					id: 'input',
					name: 'Input',
					type: 'input',
					dataType: 'mixed',
					required: false,
					description: 'Input data passed to the sub-flow'
				}
			],
			outputs: [
				TRIGGER_OUTPUT,
				{
					id: 'output',
					name: 'Output',
					type: 'output',
					dataType: 'mixed',
					description: 'Output data from the sub-flow'
				}
			],
			configSchema: {
				type: 'object',
				properties: {
					flow_ref: {
						type: 'string',
						title: 'Flow Reference',
						description: 'Reference to the flow ($component_ref:flow_name)',
						default: ''
					}
				}
			},
			formats: ['agentspec'],
			extensions: { 'agentspec:component_type': 'flow_node' }
		}
	});

	// ========================================================================
	// MapNode — Map-reduce operations
	// ========================================================================
	registry.set('map_node', {
		componentType: 'map_node',
		metadata: {
			id: `${AGENTSPEC_NS}.map_node`,
			name: 'Map',
			type: 'default',
			description: 'Apply a flow or operation to each item in a collection (map-reduce).',
			category: 'processing',
			version: '1.0.0',
			icon: 'mdi:map-marker-path',
			color: '#f97316',
			badge: 'MAP',
			inputs: [
				TRIGGER_INPUT,
				{
					id: 'collection',
					name: 'Collection',
					type: 'input',
					dataType: 'array',
					required: true,
					description: 'Input collection to iterate over'
				}
			],
			outputs: [
				TRIGGER_OUTPUT,
				{
					id: 'results',
					name: 'Results',
					type: 'output',
					dataType: 'array',
					description: 'Mapped output collection'
				}
			],
			configSchema: {
				type: 'object',
				properties: {
					input_collection: {
						type: 'string',
						title: 'Input Collection Property',
						description: 'Name of the input property containing the collection',
						default: 'collection'
					},
					output_collection: {
						type: 'string',
						title: 'Output Collection Property',
						description: 'Name of the output property for mapped results',
						default: 'results'
					},
					map_flow_ref: {
						type: 'string',
						title: 'Map Flow Reference',
						description: 'Reference to the flow to execute per item ($component_ref:flow_name)',
						default: ''
					}
				}
			},
			formats: ['agentspec'],
			extensions: { 'agentspec:component_type': 'map_node' }
		}
	});

	return registry;
}

// ============================================================================
// Public API
// ============================================================================

/** Singleton registry instance */
const registry = buildRegistry();

/**
 * Get FlowDrop NodeMetadata for an Agent Spec component type.
 *
 * @param componentType - The Agent Spec component_type value
 * @returns NodeMetadata for the component type, or undefined if not found
 *
 * @example
 * ```typescript
 * const metadata = getAgentSpecNodeMetadata('llm_node');
 * // Returns NodeMetadata with id='agentspec.llm_node', type='default', category='ai', etc.
 * ```
 */
export function getAgentSpecNodeMetadata(
	componentType: AgentSpecNodeComponentType
): NodeMetadata | undefined {
	return registry.get(componentType)?.metadata;
}

/**
 * Get all default Agent Spec node types as FlowDrop NodeMetadata.
 * These are starter templates — users can provide their own node types instead.
 *
 * @returns Array of NodeMetadata for all 9 default Agent Spec node types
 */
export function getDefaultAgentSpecNodeTypes(): NodeMetadata[] {
	return Array.from(registry.values()).map((entry) => entry.metadata);
}

/**
 * Get a copy of the NodeMetadata for a component type with custom inputs/outputs.
 * Used during import to create node metadata that matches the Agent Spec definition's
 * actual ports rather than the defaults.
 *
 * @param componentType - The Agent Spec component_type value
 * @param inputs - Custom input ports
 * @param outputs - Custom output ports
 * @returns A new NodeMetadata with the custom ports merged in
 */
export function createAgentSpecNodeMetadata(
	componentType: AgentSpecNodeComponentType,
	inputs?: NodePort[],
	outputs?: NodePort[]
): NodeMetadata | undefined {
	const base = registry.get(componentType)?.metadata;
	if (!base) return undefined;

	return {
		...base,
		inputs: inputs ?? base.inputs,
		outputs: outputs ?? base.outputs
	};
}
