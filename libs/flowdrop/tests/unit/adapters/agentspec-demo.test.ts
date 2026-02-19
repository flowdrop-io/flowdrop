/**
 * Agent Spec Adapter — Interactive Demo Tests
 *
 * Run with:  npm test -- tests/unit/adapters/agentspec-demo.test.ts
 *
 * These tests demonstrate the adapter's bidirectional conversion between
 * FlowDrop's StandardWorkflow and Oracle's Open Agent Spec format.
 */

import { describe, it, expect } from 'vitest';
import { AgentSpecAdapter } from '$lib/adapters/agentspec/AgentSpecAdapter.js';
import { AgentSpecAgentAdapter } from '$lib/adapters/agentspec/agentAdapter.js';
import {
	validateForAgentSpecExport,
	validateAgentSpecFlow
} from '$lib/adapters/agentspec/validator.js';
import {
	getAgentSpecNodeMetadata,
	getDefaultAgentSpecNodeTypes
} from '$lib/adapters/agentspec/defaultNodeTypes.js';
import { AGENTSPEC_NAMESPACE } from '$lib/adapters/agentspec/componentTypeDefaults.js';
import type {
	StandardWorkflow,
	StandardNode,
	StandardEdge
} from '$lib/adapters/WorkflowAdapter.js';

// ============================================================================
// Helper: Build a FlowDrop workflow using Agent Spec node types
// ============================================================================

function buildLLMPipelineWorkflow(): StandardWorkflow {
	const startMeta = getAgentSpecNodeMetadata('start_node')!;
	const llmMeta = getAgentSpecNodeMetadata('llm_node')!;
	const endMeta = getAgentSpecNodeMetadata('end_node')!;

	const nodes: StandardNode[] = [
		{
			id: `${AGENTSPEC_NAMESPACE}.start_node.1`,
			type: startMeta.type,
			position: { x: 0, y: 100 },
			data: {
				label: 'Start',
				config: {},
				metadata: {
					...startMeta,
					outputs: [
						...startMeta.outputs,
						{
							id: 'user_query',
							name: 'User Query',
							type: 'output',
							dataType: 'string',
							description: 'The user question to answer'
						}
					]
				}
			}
		},
		{
			id: `${AGENTSPEC_NAMESPACE}.llm_node.1`,
			type: llmMeta.type,
			position: { x: 300, y: 100 },
			data: {
				label: 'Summarizer LLM',
				config: {
					model: 'gpt-4o',
					temperature: 0.3,
					system_prompt: 'You are a helpful summarizer. Summarize the input concisely.'
				},
				metadata: {
					...llmMeta,
					inputs: [
						...llmMeta.inputs,
						{
							id: 'prompt',
							name: 'Prompt',
							type: 'input',
							dataType: 'string',
							required: true
						}
					],
					outputs: [
						...llmMeta.outputs,
						{
							id: 'response',
							name: 'Response',
							type: 'output',
							dataType: 'string'
						}
					]
				}
			}
		},
		{
			id: `${AGENTSPEC_NAMESPACE}.end_node.1`,
			type: endMeta.type,
			position: { x: 600, y: 100 },
			data: {
				label: 'End',
				config: {},
				metadata: {
					...endMeta,
					inputs: [
						...endMeta.inputs,
						{
							id: 'result',
							name: 'Result',
							type: 'input',
							dataType: 'string',
							required: true
						}
					]
				}
			}
		}
	];

	const edges: StandardEdge[] = [
		// Control flow: Start → LLM → End
		{
			id: 'cf-1',
			source: nodes[0].id,
			target: nodes[1].id,
			sourceHandle: `${nodes[0].id}-output-trigger`,
			targetHandle: `${nodes[1].id}-input-trigger`
		},
		{
			id: 'cf-2',
			source: nodes[1].id,
			target: nodes[2].id,
			sourceHandle: `${nodes[1].id}-output-trigger`,
			targetHandle: `${nodes[2].id}-input-trigger`
		},
		// Data flow: Start.user_query → LLM.prompt
		{
			id: 'df-1',
			source: nodes[0].id,
			target: nodes[1].id,
			sourceHandle: `${nodes[0].id}-output-user_query`,
			targetHandle: `${nodes[1].id}-input-prompt`
		},
		// Data flow: LLM.response → End.result
		{
			id: 'df-2',
			source: nodes[1].id,
			target: nodes[2].id,
			sourceHandle: `${nodes[1].id}-output-response`,
			targetHandle: `${nodes[2].id}-input-result`
		}
	];

	return {
		id: 'demo-llm-pipeline',
		name: 'LLM Summarizer Pipeline',
		description: 'A simple Start → LLM → End pipeline',
		nodes,
		edges,
		metadata: {
			version: '1.0.0',
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z'
		}
	};
}

// ============================================================================
// Demo 1: Node Type Registry
// ============================================================================

describe('Demo 1: Agent Spec Node Type Registry', () => {
	it('lists all 9 Agent Spec node types', () => {
		const allTypes = getDefaultAgentSpecNodeTypes();

		console.log('\n=== All Agent Spec Node Types ===');
		for (const meta of allTypes) {
			console.log(`  ${meta.id.padEnd(28)} | ${meta.name.padEnd(15)} | category: ${meta.category}`);
		}
		console.log(`  Total: ${allTypes.length} node types\n`);

		expect(allTypes.length).toBe(9);
	});

	it('shows metadata for an LLM node', () => {
		const llmMeta = getAgentSpecNodeMetadata('llm_node');

		console.log('\n=== LLM Node Metadata ===');
		console.log(`  ID:          ${llmMeta!.id}`);
		console.log(`  Name:        ${llmMeta!.name}`);
		console.log(`  Type:        ${llmMeta!.type}`);
		console.log(`  Category:    ${llmMeta!.category}`);
		console.log(`  Description: ${llmMeta!.description}`);
		console.log(`  Inputs:      ${llmMeta!.inputs.map((p) => p.id).join(', ')}`);
		console.log(`  Outputs:     ${llmMeta!.outputs.map((p) => p.id).join(', ')}\n`);

		expect(llmMeta).toBeDefined();
		expect(llmMeta!.id).toBe('agentspec.llm_node');
	});
});

// ============================================================================
// Demo 2: Export FlowDrop → Agent Spec
// ============================================================================

describe('Demo 2: Export FlowDrop workflow to Agent Spec JSON', () => {
	it('converts a FlowDrop LLM pipeline to Agent Spec format', () => {
		const adapter = new AgentSpecAdapter();
		const workflow = buildLLMPipelineWorkflow();

		// Validate first
		const validation = validateForAgentSpecExport(workflow);
		console.log('\n=== Export Validation ===');
		console.log(`  Valid:    ${validation.valid}`);
		if (validation.errors.length) console.log(`  Errors:   ${validation.errors.join(', ')}`);
		if (validation.warnings.length) console.log(`  Warnings: ${validation.warnings.join(', ')}`);

		// Convert
		const agentSpecFlow = adapter.toAgentSpec(workflow);

		console.log('\n=== Exported Agent Spec Flow ===');
		console.log(`  Name:        ${agentSpecFlow.name}`);
		console.log(`  Start node:  ${agentSpecFlow.start_node}`);
		console.log(`  Nodes:       ${agentSpecFlow.nodes.length}`);
		for (const node of agentSpecFlow.nodes) {
			console.log(`    - ${node.name} (${node.component_type})`);
			if (node.input_properties?.length) {
				console.log(`      inputs:  ${node.input_properties.map((p) => p.title).join(', ')}`);
			}
			if (node.output_properties?.length) {
				console.log(`      outputs: ${node.output_properties.map((p) => p.title).join(', ')}`);
			}
		}
		console.log(
			`  Control-flow connections: ${agentSpecFlow.control_flow_connections?.length ?? 0}`
		);
		agentSpecFlow.control_flow_connections?.forEach((e) => {
			console.log(
				`    ${e.from_node} → ${e.to_node}${e.from_branch ? ` [branch: ${e.from_branch}]` : ''}`
			);
		});
		console.log(`  Data-flow connections:    ${agentSpecFlow.data_flow_connections?.length ?? 0}`);
		agentSpecFlow.data_flow_connections?.forEach((e) => {
			console.log(
				`    ${e.source_node}.${e.source_output} → ${e.destination_node}.${e.destination_input}`
			);
		});

		// Full JSON output
		const json = adapter.exportJSON(workflow);
		console.log('\n=== Full Agent Spec JSON ===');
		console.log(json);

		expect(agentSpecFlow.nodes.length).toBe(3);
		expect(agentSpecFlow.start_node).toBeDefined();
		expect(agentSpecFlow.control_flow_connections?.length).toBeGreaterThan(0);
		expect(agentSpecFlow.data_flow_connections?.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// Demo 3: Import Agent Spec → FlowDrop
// ============================================================================

describe('Demo 3: Import Agent Spec JSON into FlowDrop', () => {
	it('imports an Agent Spec JSON and converts to FlowDrop workflow', () => {
		const adapter = new AgentSpecAdapter();

		// A hand-crafted Agent Spec flow (what you'd get from an external tool)
		const agentSpecJson = JSON.stringify(
			{
				name: 'Customer Support Agent',
				description: 'Routes customer queries through LLM classification and branching',
				start_node: 'intake',
				nodes: [
					{
						name: 'intake',
						component_type: 'start_node',
						output_properties: [
							{ title: 'customer_message', type: 'string', description: 'Raw customer message' }
						]
					},
					{
						name: 'classifier',
						component_type: 'llm_node',
						input_properties: [{ title: 'message', type: 'string' }],
						output_properties: [
							{ title: 'category', type: 'string', description: 'billing, technical, or general' }
						],
						attributes: {
							model: 'claude-sonnet-4-6',
							system_prompt: 'Classify the customer message as: billing, technical, or general.'
						}
					},
					{
						name: 'router',
						component_type: 'branching_node',
						input_properties: [{ title: 'category', type: 'string' }],
						branches: [
							{ name: 'billing', condition: 'category == "billing"' },
							{ name: 'technical', condition: 'category == "technical"' },
							{ name: 'general', condition: 'default' }
						]
					},
					{
						name: 'billing_response',
						component_type: 'end_node',
						input_properties: [{ title: 'result', type: 'string' }]
					},
					{
						name: 'tech_response',
						component_type: 'end_node',
						input_properties: [{ title: 'result', type: 'string' }]
					},
					{
						name: 'general_response',
						component_type: 'end_node',
						input_properties: [{ title: 'result', type: 'string' }]
					}
				],
				control_flow_connections: [
					{ from_node: 'intake', to_node: 'classifier' },
					{ from_node: 'classifier', to_node: 'router' },
					{ from_node: 'router', to_node: 'billing_response', from_branch: 'billing' },
					{ from_node: 'router', to_node: 'tech_response', from_branch: 'technical' },
					{ from_node: 'router', to_node: 'general_response', from_branch: 'general' }
				],
				data_flow_connections: [
					{
						name: 'message_to_classifier',
						source_node: 'intake',
						source_output: 'customer_message',
						destination_node: 'classifier',
						destination_input: 'message'
					},
					{
						name: 'category_to_router',
						source_node: 'classifier',
						source_output: 'category',
						destination_node: 'router',
						destination_input: 'category'
					}
				]
			},
			null,
			2
		);

		console.log('\n=== Input Agent Spec JSON ===');
		console.log(agentSpecJson);

		// Import
		const flowDropWorkflow = adapter.importJSON(agentSpecJson);

		console.log('\n=== Imported FlowDrop Workflow ===');
		console.log(`  Name:  ${flowDropWorkflow.name}`);
		console.log(`  Nodes: ${flowDropWorkflow.nodes.length}`);
		for (const node of flowDropWorkflow.nodes) {
			console.log(
				`    - ${node.id} (${node.data.metadata.id}) at (${node.position.x}, ${node.position.y})`
			);
			console.log(
				`      inputs:  [${node.data.metadata.inputs.map((p) => `${p.id}:${p.dataType}`).join(', ')}]`
			);
			console.log(
				`      outputs: [${node.data.metadata.outputs.map((p) => `${p.id}:${p.dataType}`).join(', ')}]`
			);
		}
		console.log(`  Edges: ${flowDropWorkflow.edges.length}`);
		for (const edge of flowDropWorkflow.edges) {
			console.log(`    ${edge.source} → ${edge.target}`);
		}

		expect(flowDropWorkflow.nodes.length).toBe(6);
		expect(flowDropWorkflow.edges.length).toBe(7); // 5 control + 2 data
		// Check that auto-layout assigned positions
		for (const node of flowDropWorkflow.nodes) {
			expect(node.position).toBeDefined();
			expect(typeof node.position.x).toBe('number');
		}
	});
});

// ============================================================================
// Demo 4: Round-trip (FlowDrop → Agent Spec → FlowDrop)
// ============================================================================

describe('Demo 4: Round-trip conversion preserves workflow semantics', () => {
	it('exports then re-imports and compares key properties', () => {
		const adapter = new AgentSpecAdapter();
		const original = buildLLMPipelineWorkflow();

		// Export → Agent Spec JSON → Re-import
		const agentSpecJson = adapter.exportJSON(original);
		const reimported = adapter.importJSON(agentSpecJson);

		console.log('\n=== Round-trip Comparison ===');
		console.log(
			`  Original nodes: ${original.nodes.length}   | Re-imported nodes: ${reimported.nodes.length}`
		);
		console.log(
			`  Original edges: ${original.edges.length}   | Re-imported edges: ${reimported.edges.length}`
		);
		console.log(`  Original name:  ${original.name}`);
		console.log(`  Reimported name: ${reimported.name}`);

		// Same number of nodes and edges
		expect(reimported.nodes.length).toBe(original.nodes.length);
		expect(reimported.edges.length).toBe(original.edges.length);
		expect(reimported.name).toBe(original.name);

		// Each original node type is present after round-trip
		const originalTypes = new Set(original.nodes.map((n) => n.data.metadata.id));
		const reimportedTypes = new Set(reimported.nodes.map((n) => n.data.metadata.id));
		console.log(`  Original types:   ${[...originalTypes].join(', ')}`);
		console.log(`  Reimported types: ${[...reimportedTypes].join(', ')}`);

		for (const t of originalTypes) {
			expect(reimportedTypes.has(t)).toBe(true);
		}
	});
});

// ============================================================================
// Demo 5: Agent-level export (flow + agent metadata)
// ============================================================================

describe('Demo 5: Full Agent Spec Document export (with agent config)', () => {
	it('wraps a workflow with agent metadata, tools, and LLM config', () => {
		const agentAdapter = new AgentSpecAgentAdapter();
		const workflow = buildLLMPipelineWorkflow();

		const agentConfig = {
			name: 'Summarizer Agent',
			description: 'An agent that summarizes text using an LLM',
			system_prompt: 'You are a professional summarizer.',
			version: '1.0.0'
		};

		const tools = [
			{
				type: 'server' as const,
				name: 'web_search',
				description: 'Search the web for information',
				parameters: {
					type: 'object',
					properties: {
						query: { type: 'string', description: 'Search query' }
					},
					required: ['query']
				}
			}
		];

		const llmConfigs = [
			{
				name: 'default',
				provider: 'anthropic',
				model: 'claude-sonnet-4-6',
				temperature: 0.3,
				max_tokens: 4096
			}
		];

		const json = agentAdapter.exportJSON(workflow, agentConfig, tools, llmConfigs);

		console.log('\n=== Full Agent Spec Document ===');
		console.log(json);

		const doc = JSON.parse(json);
		expect(doc.agent).toBeDefined();
		expect(doc.agent.name).toBe('Summarizer Agent');
		expect(doc.flow).toBeDefined();
		expect(doc.flow.nodes.length).toBe(3);
		expect(doc.tools?.length).toBe(1);
		expect(doc.llm_configs?.length).toBe(1);
	});
});

// ============================================================================
// Demo 6: Validation — catch invalid workflows before export
// ============================================================================

describe('Demo 6: Validation catches issues', () => {
	it('detects a workflow missing a start node', () => {
		const endMeta = getAgentSpecNodeMetadata('end_node')!;
		const llmMeta = getAgentSpecNodeMetadata('llm_node')!;

		const badWorkflow: StandardWorkflow = {
			id: 'bad-1',
			name: 'No Start Node',
			nodes: [
				{
					id: `${AGENTSPEC_NAMESPACE}.llm_node.1`,
					type: llmMeta.type,
					position: { x: 0, y: 0 },
					data: { label: 'LLM', config: {}, metadata: llmMeta }
				},
				{
					id: `${AGENTSPEC_NAMESPACE}.end_node.1`,
					type: endMeta.type,
					position: { x: 300, y: 0 },
					data: { label: 'End', config: {}, metadata: endMeta }
				}
			],
			edges: [
				{
					id: 'e1',
					source: `${AGENTSPEC_NAMESPACE}.llm_node.1`,
					target: `${AGENTSPEC_NAMESPACE}.end_node.1`,
					sourceHandle: `${AGENTSPEC_NAMESPACE}.llm_node.1-output-trigger`,
					targetHandle: `${AGENTSPEC_NAMESPACE}.end_node.1-input-trigger`
				}
			]
		};

		const result = validateForAgentSpecExport(badWorkflow);

		console.log('\n=== Validation: Missing Start Node ===');
		console.log(`  Valid:    ${result.valid}`);
		console.log(`  Errors:   ${result.errors.join('; ')}`);
		console.log(`  Warnings: ${result.warnings.join('; ') || '(none)'}`);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /start/i.test(e))).toBe(true);
	});
});

// ============================================================================
// Demo 7: Unknown component types
// ============================================================================

describe('Demo 7: Unknown component types', () => {
	it('imports flows with unknown component types without throwing', () => {
		const adapter = new AgentSpecAdapter();
		const json = JSON.stringify({
			name: 'Custom Flow',
			start_node: 'start',
			nodes: [
				{ name: 'start', component_type: 'start_node' },
				{ name: 'custom', component_type: 'my_custom_node' },
				{ name: 'end', component_type: 'end_node' }
			],
			control_flow_connections: [
				{ from_node: 'start', to_node: 'custom' },
				{ from_node: 'custom', to_node: 'end' }
			]
		});

		const workflow = adapter.importJSON(json);

		console.log('\n=== Unknown Component Type Import ===');
		for (const node of workflow.nodes) {
			console.log(
				`  ${node.data.label.padEnd(10)} | type: ${node.data.metadata.id.padEnd(30)} | category: ${node.data.metadata.category}`
			);
		}

		expect(workflow.nodes).toHaveLength(3);
		const customNode = workflow.nodes.find((n) => n.data.label === 'custom');
		expect(customNode).toBeDefined();
		expect(customNode!.data.metadata.category).toBe('processing'); // fallback
	});
});
