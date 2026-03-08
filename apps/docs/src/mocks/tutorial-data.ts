/**
 * Per-step mock data for the tutorial guide.
 * Each step progressively introduces more FlowDrop concepts.
 */

import { http, HttpResponse } from 'msw';

const API_BASE = '/api/flowdrop';

// ─── Node Definitions ───────────────────────────────────────────────────────

const textInputNode = {
	id: 'text_input',
	name: 'Text Input',
	type: 'simple',
	supportedTypes: ['simple', 'square', 'default'],
	description: 'Simple text input for user data',
	category: 'inputs',
	icon: 'mdi:text',
	color: '#22c55e',
	version: '1.0.0',
	tags: ['input', 'text'],
	inputs: [],
	outputs: [
		{ id: 'text', name: 'text', type: 'output', dataType: 'string', required: false, description: 'The input text value' }
	],
	config: { placeholder: 'Enter text here...', defaultValue: '' },
	configSchema: {
		type: 'object',
		properties: {
			nodeType: { type: 'string', title: 'Node Type', default: 'simple', oneOf: [{ const: 'simple', title: 'Simple' }, { const: 'square', title: 'Square' }, { const: 'default', title: 'Default' }] },
			placeholder: { type: 'string', title: 'Placeholder', default: 'Enter text...' }
		}
	}
};

const textOutputNode = {
	id: 'text_output',
	name: 'Text Output',
	type: 'simple',
	supportedTypes: ['square', 'simple', 'default'],
	description: 'Simple text output for displaying data',
	category: 'outputs',
	icon: 'mdi:text-box',
	color: '#ef4444',
	version: '1.0.0',
	tags: ['output', 'text', 'display'],
	inputs: [
		{ id: 'text', name: 'Text Input', type: 'input', dataType: 'string', required: false, description: 'The text to output' },
		{ id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger', required: false, description: '' }
	],
	outputs: [],
	config: { format: 'plain', maxLength: 1000 },
	configSchema: {
		type: 'object',
		properties: {
			nodeType: { type: 'string', title: 'Node Type', default: 'simple', oneOf: [{ const: 'simple', title: 'Simple' }, { const: 'square', title: 'Square' }, { const: 'default', title: 'Default' }] },
			maxLength: { type: 'integer', title: 'Maximum Length', default: 1000, minimum: 1, maximum: 10000 },
			format: { type: 'string', title: 'Text Format', default: 'plain', enum: ['plain', 'html', 'markdown'] }
		}
	}
};

const aiContentAnalyzerNode = {
	id: 'ai_content_analyzer',
	name: 'AI Content Analyzer',
	type: 'tool',
	supportedTypes: ['tool', 'default'],
	description: 'AI-powered content analysis for smart text processing',
	category: 'ai',
	icon: 'mdi:brain',
	color: '#9C27B0',
	version: '1.0.0',
	tags: ['ai', 'analysis', 'content'],
	inputs: [
		{ id: 'content', name: 'Content to Analyze', type: 'input', dataType: 'mixed', required: false, description: 'Text content for AI analysis' },
		{ id: 'tool', name: 'Tool', type: 'input', dataType: 'tool', required: false, description: 'Available Tools' },
		{ id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger', required: false, description: '' }
	],
	outputs: [
		{ id: 'tool', name: 'Tool', type: 'output', dataType: 'tool', required: false, description: 'Available tools' },
		{ id: 'analyzed_content', name: 'analyzed_content', type: 'output', dataType: 'array', required: false, description: 'Content items with AI analysis results' },
		{ id: 'total_analyzed', name: 'total_analyzed', type: 'output', dataType: 'number', required: false, description: 'Total number of items analyzed' }
	],
	config: { targetText: 'XB', replacementText: 'Canvas', analysisMode: 'context_aware', confidenceThreshold: 0.8 },
	configSchema: {
		type: 'object',
		properties: {
			nodeType: { type: 'string', title: 'Node Type', default: 'tool', oneOf: [{ const: 'tool', title: 'Tool Node' }, { const: 'default', title: 'Default Node' }] },
			targetText: { type: 'string', title: 'Target Text', default: 'XB' },
			replacementText: { type: 'string', title: 'Replacement Text', default: 'Canvas' },
			analysisMode: { type: 'string', title: 'Analysis Mode', enum: ['acronym_detection', 'sentence_flow', 'context_aware'], default: 'context_aware' },
			confidenceThreshold: { type: 'number', title: 'Confidence', format: 'range', minimum: 0, maximum: 1, step: 0.01, default: 0.8 }
		}
	}
};

const jsonTransformerNode = {
	id: 'json_transformer',
	name: 'JSON Transformer',
	type: 'tool',
	supportedTypes: ['tool', 'default'],
	description: 'Transform JSON data using configurable rules',
	category: 'processing',
	icon: 'mdi:code-json',
	color: '#3b82f6',
	version: '1.0.0',
	tags: ['json', 'transform', 'data'],
	inputs: [
		{ id: 'input', name: 'Input Data', type: 'input', dataType: 'json', required: false, description: 'JSON data to transform' },
		{ id: 'tool', name: 'Tool', type: 'input', dataType: 'tool', required: false, description: 'Available Tools' },
		{ id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger', required: false, description: '' }
	],
	outputs: [
		{ id: 'tool', name: 'Tool', type: 'output', dataType: 'tool', required: false, description: 'Available tools' },
		{ id: 'output', name: 'output', type: 'output', dataType: 'json', required: false, description: 'Transformed JSON output' }
	],
	config: {},
	configSchema: {
		type: 'object',
		properties: {
			nodeType: { type: 'string', title: 'Node Type', default: 'tool', oneOf: [{ const: 'tool', title: 'Tool Node' }, { const: 'default', title: 'Default Node' }] },
			template: { type: 'string', title: 'Transform Template', format: 'multiline', description: 'JSONPath or transformation template' }
		}
	}
};

const gatewayNode = {
	id: 'gateway',
	name: 'Gateway',
	type: 'gateway',
	supportedTypes: ['gateway'],
	description: 'Conditional routing based on rules',
	category: 'logic',
	icon: 'mdi:source-branch',
	color: '#f59e0b',
	version: '1.0.0',
	tags: ['logic', 'routing', 'conditional'],
	inputs: [
		{ id: 'input', name: 'Input', type: 'input', dataType: 'mixed', required: false, description: 'Data to evaluate' },
		{ id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger', required: false, description: '' }
	],
	outputs: [
		{ id: 'true', name: 'True', type: 'output', dataType: 'mixed', required: false, description: 'Route when condition is true' },
		{ id: 'false', name: 'False', type: 'output', dataType: 'mixed', required: false, description: 'Route when condition is false' }
	],
	config: {},
	configSchema: {
		type: 'object',
		properties: {
			condition: { type: 'string', title: 'Condition', description: 'Expression to evaluate' }
		}
	}
};

const notesNode = {
	id: 'notes',
	name: 'Notes',
	type: 'idea',
	supportedTypes: ['idea'],
	description: 'Add notes and documentation to your workflow',
	category: 'helpers',
	icon: 'mdi:note-text',
	color: '#fbbf24',
	version: '1.0.0',
	tags: ['notes', 'documentation', 'comment'],
	inputs: [],
	outputs: [],
	config: {},
	configSchema: {
		type: 'object',
		properties: {
			text: { type: 'string', title: 'Note Text', format: 'multiline', default: '' }
		}
	}
};

// ─── Category Definitions ───────────────────────────────────────────────────

const allCategories = {
	inputs: { id: 'inputs', name: 'Inputs', icon: 'mdi:import', color: '#22c55e' },
	outputs: { id: 'outputs', name: 'Outputs', icon: 'mdi:export', color: '#ef4444' },
	ai: { id: 'ai', name: 'AI & ML', icon: 'mdi:brain', color: '#9C27B0' },
	processing: { id: 'processing', name: 'Processing', icon: 'mdi:cog', color: '#3b82f6' },
	logic: { id: 'logic', name: 'Logic', icon: 'mdi:source-branch', color: '#f59e0b' },
	helpers: { id: 'helpers', name: 'Helpers', icon: 'mdi:wrench', color: '#fbbf24' }
};

// ─── Step 4 Pre-built Workflow ──────────────────────────────────────────────

const step4Workflow = {
	id: 'tutorial_workflow',
	name: 'My First Workflow',
	description: 'A simple text processing workflow',
	nodes: [
		{
			id: 'text_input.1',
			type: 'universalNode',
			position: { x: 0, y: 100 },
			data: {
				label: 'Text Input',
				config: { nodeType: 'simple', placeholder: 'Enter text...' },
				metadata: textInputNode,
				nodeId: 'text_input.1'
			},
			deletable: true
		},
		{
			id: 'ai_content_analyzer.1',
			type: 'universalNode',
			position: { x: 400, y: 80 },
			data: {
				label: 'AI Content Analyzer',
				config: { nodeType: 'tool', analysisMode: 'context_aware', confidenceThreshold: 0.8 },
				metadata: aiContentAnalyzerNode,
				nodeId: 'ai_content_analyzer.1'
			},
			deletable: true
		},
		{
			id: 'text_output.1',
			type: 'universalNode',
			position: { x: 800, y: 100 },
			data: {
				label: 'Text Output',
				config: { nodeType: 'simple', format: 'plain', maxLength: 1000 },
				metadata: textOutputNode,
				nodeId: 'text_output.1'
			},
			deletable: true
		}
	],
	edges: [
		{
			id: 'e-text_input-ai_analyzer',
			source: 'text_input.1',
			target: 'ai_content_analyzer.1',
			data: { metadata: { edgeType: 'data' }, targetNodeType: 'universalNode', targetCategory: 'ai' },
			sourceHandle: 'text_input.1-output-text',
			targetHandle: 'ai_content_analyzer.1-input-content',
			style: 'stroke: grey;',
			markerEnd: { type: 'arrowclosed', width: 16, height: 16, color: 'grey' }
		},
		{
			id: 'e-ai_analyzer-text_output',
			source: 'ai_content_analyzer.1',
			target: 'text_output.1',
			data: { metadata: { edgeType: 'data' }, targetNodeType: 'universalNode', targetCategory: 'outputs' },
			sourceHandle: 'ai_content_analyzer.1-output-analyzed_content',
			targetHandle: 'text_output.1-input-text',
			style: 'stroke: grey;',
			markerEnd: { type: 'arrowclosed', width: 16, height: 16, color: 'grey' }
		}
	],
	metadata: {
		version: '1.0.0',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	}
};

// ─── Step Configurations ────────────────────────────────────────────────────

interface TutorialStepConfig {
	nodes: typeof textInputNode[];
	categories: (typeof allCategories)['inputs'][];
	workflow: typeof step4Workflow | null;
}

const stepConfigs: Record<string, TutorialStepConfig> = {
	'empty-editor': {
		nodes: [],
		categories: [],
		workflow: null
	},
	'first-node': {
		nodes: [textInputNode],
		categories: [allCategories.inputs],
		workflow: null
	},
	'multiple-nodes': {
		nodes: [textInputNode, textOutputNode, aiContentAnalyzerNode, jsonTransformerNode, gatewayNode, notesNode],
		categories: [allCategories.inputs, allCategories.outputs, allCategories.ai, allCategories.processing, allCategories.logic, allCategories.helpers],
		workflow: null
	},
	'saving-workflows': {
		nodes: [textInputNode, textOutputNode, aiContentAnalyzerNode, jsonTransformerNode, gatewayNode, notesNode],
		categories: [allCategories.inputs, allCategories.outputs, allCategories.ai, allCategories.processing, allCategories.logic, allCategories.helpers],
		workflow: step4Workflow
	}
};

// ─── Handler Generator ──────────────────────────────────────────────────────

function createHandlers(config: TutorialStepConfig) {
	let currentWorkflow = config.workflow ? structuredClone(config.workflow) : null;

	return [
		// Health check
		http.get(`${API_BASE}/health`, () => {
			return HttpResponse.json({ status: 'healthy', version: '1.0.0' });
		}),

		// Runtime config
		http.get('/api/config', () => {
			return HttpResponse.json({
				apiBaseUrl: '/api/flowdrop',
				theme: 'auto',
				timeout: 30000,
				authType: 'none',
				version: '1.0.0',
				environment: 'demo'
			});
		}),

		// Port configuration
		http.get(`${API_BASE}/port-config`, () => {
			return HttpResponse.json({
				success: true,
				data: {
					dataTypes: {
						string: { color: '#22c55e', label: 'String' },
						number: { color: '#3b82f6', label: 'Number' },
						boolean: { color: '#f59e0b', label: 'Boolean' },
						array: { color: '#8b5cf6', label: 'Array' },
						json: { color: '#06b6d4', label: 'JSON' },
						mixed: { color: '#6b7280', label: 'Mixed' },
						tool: { color: '#ec4899', label: 'Tool' },
						trigger: { color: '#f97316', label: 'Trigger' }
					},
					compatibility: {
						string: ['string', 'mixed'],
						number: ['number', 'mixed'],
						boolean: ['boolean', 'mixed'],
						array: ['array', 'mixed'],
						json: ['json', 'mixed', 'string'],
						mixed: ['string', 'number', 'boolean', 'array', 'json', 'mixed'],
						tool: ['tool'],
						trigger: ['trigger']
					}
				},
				message: 'Port configuration loaded successfully'
			});
		}),

		// Categories
		http.get(`${API_BASE}/categories`, () => {
			return HttpResponse.json({
				success: true,
				data: config.categories,
				message: 'Categories loaded successfully'
			});
		}),

		// Get all nodes
		http.get(`${API_BASE}/nodes`, () => {
			return HttpResponse.json({
				success: true,
				data: config.nodes,
				message: `Found ${config.nodes.length} node types`
			}, {
				headers: {
					'X-Total-Count': String(config.nodes.length),
					'Content-Type': 'application/json'
				}
			});
		}),

		// Get node by ID
		http.get(`${API_BASE}/nodes/:id`, ({ params }) => {
			const node = config.nodes.find((n) => n.id === params.id);
			if (!node) {
				return HttpResponse.json({ success: false, error: 'Node type not found' }, { status: 404 });
			}
			return HttpResponse.json({ success: true, data: node });
		}),

		// Get all workflows
		http.get(`${API_BASE}/workflows`, () => {
			const workflows = currentWorkflow ? [currentWorkflow] : [];
			return HttpResponse.json({
				success: true,
				data: workflows,
				message: `Found ${workflows.length} workflows`
			}, {
				headers: { 'X-Total-Count': String(workflows.length), 'Content-Type': 'application/json' }
			});
		}),

		// Get workflow by ID
		http.get(`${API_BASE}/workflows/:id`, () => {
			if (!currentWorkflow) {
				return HttpResponse.json({ success: false, error: 'No workflow found' }, { status: 404 });
			}
			return HttpResponse.json({
				success: true,
				data: currentWorkflow,
				message: 'Workflow retrieved successfully'
			});
		}),

		// Create workflow
		http.post(`${API_BASE}/workflows`, async ({ request }) => {
			const body = await request.json() as Record<string, unknown>;
			currentWorkflow = {
				id: 'tutorial_workflow',
				name: (body.name as string) || 'Untitled Workflow',
				description: (body.description as string) || '',
				nodes: (body.nodes as typeof step4Workflow.nodes) || [],
				edges: (body.edges as typeof step4Workflow.edges) || [],
				metadata: { version: '1.0.0', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
			};
			return HttpResponse.json({ success: true, data: currentWorkflow, message: 'Workflow created' }, { status: 201 });
		}),

		// Update workflow
		http.put(`${API_BASE}/workflows/:id`, async ({ request }) => {
			const body = await request.json() as Record<string, unknown>;
			if (!currentWorkflow) {
				currentWorkflow = {
					id: 'tutorial_workflow',
					name: 'Untitled Workflow',
					description: '',
					nodes: [],
					edges: [],
					metadata: { version: '1.0.0', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
				};
			}
			currentWorkflow = {
				...currentWorkflow,
				...(body.name && { name: body.name as string }),
				...(body.description !== undefined && { description: body.description as string }),
				...(body.nodes && { nodes: body.nodes as typeof step4Workflow.nodes }),
				...(body.edges && { edges: body.edges as typeof step4Workflow.edges }),
				metadata: { ...currentWorkflow.metadata, updatedAt: new Date().toISOString() }
			};
			return HttpResponse.json({ success: true, data: currentWorkflow, message: 'Workflow updated' });
		}),

		// Validate workflow
		http.post(`${API_BASE}/workflows/validate`, () => {
			return HttpResponse.json({
				success: true,
				data: { valid: true, errors: [], warnings: [], suggestions: [] }
			});
		}),

		// Dynamic schema (return empty)
		http.post(`${API_BASE}/dynamic-schema`, () => {
			return HttpResponse.json({ success: true, data: null });
		}),

		// Variable suggestions (return empty)
		http.get(`${API_BASE}/variable-suggestions`, () => {
			return HttpResponse.json({ success: true, data: [] });
		})
	];
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getTutorialConfig(step: string) {
	const config = stepConfigs[step] || stepConfigs['empty-editor'];
	return {
		nodes: config.nodes,
		categories: config.categories,
		workflow: config.workflow,
		handlers: createHandlers(config)
	};
}
