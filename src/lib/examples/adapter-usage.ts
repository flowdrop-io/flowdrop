/**
 * Example: Using WorkflowAdapter for workflow management
 * This demonstrates how systems can work with workflows without knowing SvelteFlow internals
 */

import { WorkflowAdapter, type StandardWorkflow } from '../adapters/WorkflowAdapter.js';
import { sampleNodes } from '../data/samples.js';

// Initialize the adapter with available node types
const adapter = new WorkflowAdapter(sampleNodes);

// Example 1: Create a simple workflow programmatically
function createSimpleWorkflow(): StandardWorkflow {
	const workflow = adapter.createWorkflow('Chat Workflow', 'A simple chat workflow');

	// Add nodes
	const inputNode = adapter.addNode(
		workflow,
		'text-input',
		{ x: 100, y: 100 },
		{
			placeholder: 'Enter your message'
		}
	);

	const modelNode = adapter.addNode(
		workflow,
		'openai',
		{ x: 300, y: 100 },
		{
			model: 'gpt-4o-mini',
			temperature: 0.7
		}
	);

	const outputNode = adapter.addNode(workflow, 'text-output', { x: 500, y: 100 });

	// Connect nodes
	adapter.addEdge(workflow, inputNode.id, modelNode.id, 'text', 'prompt');
	adapter.addEdge(workflow, modelNode.id, outputNode.id, 'text', 'text');

	return workflow;
}

// Example 2: Analyze a workflow structure
function analyzeWorkflow(workflow: StandardWorkflow) {
	const stats = adapter.getWorkflowStats(workflow);
	const validation = adapter.validateWorkflow(workflow);

	if (validation.errors.length > 0) {
		console.log('Errors:', validation.errors);
	}

	if (validation.warnings.length > 0) {
		console.log('Warnings:', validation.warnings);
	}

	return {
		stats,
		validation,
		complexity: calculateComplexity(workflow)
	};
}

// Example 3: Calculate workflow complexity
function calculateComplexity(workflow: StandardWorkflow): number {
	const nodeCount = workflow.nodes.length;
	const edgeCount = workflow.edges.length;
	const avgConnections = edgeCount / Math.max(nodeCount, 1);

	// Simple complexity score
	return nodeCount * avgConnections;
}

// Example 4: Optimize a workflow
function optimizeWorkflow(workflow: StandardWorkflow): StandardWorkflow {
	const optimized = adapter.cloneWorkflow(workflow, `${workflow.name} (Optimized)`);

	// Could make optimizations here
	// For example, removing unused nodes, optimizing connections, etc.

	return optimized;
}

// Example 5: Export/Import workflows
function exportWorkflow(workflow: StandardWorkflow): string {
	return adapter.exportWorkflow(workflow);
}

function importWorkflow(json: string): StandardWorkflow {
	return adapter.importWorkflow(json);
}

// Example 6: Get workflow structure for analysis
function getWorkflowStructure(workflow: StandardWorkflow) {
	return {
		nodes: workflow.nodes.map((node) => ({
			id: node.id,
			type: node.type,
			position: node.position,
			config: node.data.config
		})),
		edges: workflow.edges.map((edge) => ({
			source: edge.source,
			target: edge.target,
			sourceHandle: edge.sourceHandle,
			targetHandle: edge.targetHandle
		})),
		metadata: {
			name: workflow.name,
			description: workflow.description,
			version: workflow.metadata?.version,
			lastModified: workflow.metadata?.updatedAt
		}
	};
}

// Example 7: Get available node types
function getAvailableNodeTypes() {
	return sampleNodes.map((node) => ({
		id: node.id,
		name: node.name,
		category: node.category,
		description: node.description,
		inputs: node.inputs.map((input) => ({
			name: input.name,
			type: input.dataType,
			required: input.required
		})),
		outputs: node.outputs.map((output) => ({
			name: output.name,
			type: output.dataType
		}))
	}));
}

// Example 8: Validate generated workflow
function validateGeneratedWorkflow(workflowJson: string): {
	valid: boolean;
	errors: string[];
	suggestions: string[];
} {
	try {
		const workflow = adapter.importWorkflow(workflowJson);
		const validation = adapter.validateWorkflow(workflow);

		const suggestions: string[] = [];

		// Provide suggestions based on validation results
		if (workflow.nodes.length === 0) {
			suggestions.push('Consider adding input and output nodes');
		}

		if (workflow.edges.length === 0) {
			suggestions.push('Connect nodes to create a data flow');
		}

		return {
			valid: validation.valid,
			errors: validation.errors,
			suggestions
		};
	} catch (error) {
		return {
			valid: false,
			errors: [error instanceof Error ? error.message : 'Unknown error'],
			suggestions: ['Check the JSON format and required fields']
		};
	}
}

// Export all examples for use
export {
	createSimpleWorkflow,
	analyzeWorkflow,
	calculateComplexity,
	optimizeWorkflow,
	exportWorkflow,
	importWorkflow,
	getWorkflowStructure,
	getAvailableNodeTypes,
	validateGeneratedWorkflow
};
