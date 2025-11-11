/**
 * WorkflowAdapter - Abstracts SvelteFlow internals for external systems
 *
 * This adapter provides a clean interface for working with workflows without
 * needing to understand SvelteFlow's internal structure. It handles:
 * - Converting between standard workflow format and SvelteFlow format
 * - CRUD operations on workflows, nodes, and edges
 * - Validation and error checking
 * - Import/export functionality
 *
 * The adapter is designed to be used by:
 * - Backend systems that need to process workflows
 * - External applications that want to integrate with FlowDrop
 * - Systems that need to generate or modify workflows programmatically
 */

import type { Workflow, NodeMetadata } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique node ID based on node type and existing nodes
 * Format: <node_type>.<number>
 * Example: boolean_gateway.1, calculator.2
 */
function generateStandardNodeId(nodeTypeId: string, existingNodes: StandardNode[]): string {
	// Count how many nodes of this type already exist
	const existingNodeIds = existingNodes
		.filter((node) => node.data?.metadata?.id === nodeTypeId)
		.map((node) => node.id);

	// Extract the numbers from existing IDs with the same prefix
	const existingNumbers = existingNodeIds
		.map((id) => {
			const match = id.match(new RegExp(`^${nodeTypeId}\\.(\\d+)$`));
			return match ? parseInt(match[1], 10) : 0;
		})
		.filter((num) => num > 0);

	// Find the next available number (highest + 1)
	const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

	return `${nodeTypeId}.${nextNumber}`;
}

/**
 * Standard workflow node interface (SvelteFlow-agnostic)
 */
export interface StandardNode {
	id: string;
	type: string;
	position: { x: number; y: number };
	data: {
		label: string;
		config: Record<string, unknown>;
		metadata: NodeMetadata;
	};
}

/**
 * Standard workflow edge interface (SvelteFlow-agnostic)
 */
export interface StandardEdge {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
}

/**
 * Standard workflow interface (SvelteFlow-agnostic)
 */
export interface StandardWorkflow {
	id: string;
	name: string;
	description?: string;
	nodes: StandardNode[];
	edges: StandardEdge[];
	metadata?: {
		version: string;
		createdAt: string;
		updatedAt: string;
		author?: string;
		tags?: string[];
	};
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
	success: boolean;
	data?: unknown;
	error?: string;
	executionTime?: number;
	nodeResults?: Record<string, unknown>;
}

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Workflow Adapter Class
 * Provides a clean API for workflow operations without exposing SvelteFlow internals
 */
export class WorkflowAdapter {
	private nodeTypes: NodeMetadata[] = [];

	constructor(nodeTypes: NodeMetadata[] = []) {
		this.nodeTypes = nodeTypes;
	}

	/**
	 * Create a new workflow
	 */
	createWorkflow(name: string, description?: string): StandardWorkflow {
		return {
			id: uuidv4(),
			name,
			description,
			nodes: [],
			edges: [],
			metadata: {
				version: '1.0.0',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
		};
	}

	/**
	 * Add a node to a workflow
	 */
	addNode(
		workflow: StandardWorkflow,
		nodeType: string,
		position: { x: number; y: number },
		config?: Record<string, unknown>
	): StandardNode {
		const metadata = this.nodeTypes.find((nt) => nt.id === nodeType);
		if (!metadata) {
			throw new Error(`Node type '${nodeType}' not found`);
		}

		// Generate node ID based on node type and existing nodes
		const nodeId = generateStandardNodeId(nodeType, workflow.nodes);

		const node: StandardNode = {
			id: nodeId,
			type: nodeType,
			position,
			data: {
				label: metadata.name,
				config: config || {},
				metadata
			}
		};

		workflow.nodes.push(node);
		workflow.metadata!.updatedAt = new Date().toISOString();

		return node;
	}

	/**
	 * Remove a node from a workflow
	 */
	removeNode(workflow: StandardWorkflow, nodeId: string): boolean {
		const nodeIndex = workflow.nodes.findIndex((n) => n.id === nodeId);
		if (nodeIndex === -1) return false;

		workflow.nodes.splice(nodeIndex, 1);

		// Remove associated edges
		workflow.edges = workflow.edges.filter(
			(edge) => edge.source !== nodeId && edge.target !== nodeId
		);

		workflow.metadata!.updatedAt = new Date().toISOString();
		return true;
	}

	/**
	 * Update node position
	 */
	updateNodePosition(
		workflow: StandardWorkflow,
		nodeId: string,
		position: { x: number; y: number }
	): boolean {
		const node = workflow.nodes.find((n) => n.id === nodeId);
		if (!node) return false;

		node.position = position;
		workflow.metadata!.updatedAt = new Date().toISOString();
		return true;
	}

	/**
	 * Update node configuration
	 */
	updateNodeConfig(
		workflow: StandardWorkflow,
		nodeId: string,
		config: Record<string, unknown>
	): boolean {
		const node = workflow.nodes.find((n) => n.id === nodeId);
		if (!node) return false;

		node.data.config = { ...node.data.config, ...config };
		workflow.metadata!.updatedAt = new Date().toISOString();
		return true;
	}

	/**
	 * Add an edge between nodes
	 */
	addEdge(
		workflow: StandardWorkflow,
		sourceNodeId: string,
		targetNodeId: string,
		sourceHandle?: string,
		targetHandle?: string
	): StandardEdge {
		const edge: StandardEdge = {
			id: uuidv4(),
			source: sourceNodeId,
			target: targetNodeId,
			sourceHandle,
			targetHandle
		};

		workflow.edges.push(edge);
		workflow.metadata!.updatedAt = new Date().toISOString();

		return edge;
	}

	/**
	 * Remove an edge from a workflow
	 */
	removeEdge(workflow: StandardWorkflow, edgeId: string): boolean {
		const edgeIndex = workflow.edges.findIndex((e) => e.id === edgeId);
		if (edgeIndex === -1) return false;

		workflow.edges.splice(edgeIndex, 1);
		workflow.metadata!.updatedAt = new Date().toISOString();
		return true;
	}

	/**
	 * Get all nodes of a specific type
	 */
	getNodesByType(workflow: StandardWorkflow, nodeType: string): StandardNode[] {
		return workflow.nodes.filter((node) => node.type === nodeType);
	}

	/**
	 * Get all edges connected to a node
	 */
	getNodeEdges(workflow: StandardWorkflow, nodeId: string): StandardEdge[] {
		return workflow.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);
	}

	/**
	 * Get connected nodes (both incoming and outgoing)
	 */
	getConnectedNodes(workflow: StandardWorkflow, nodeId: string): StandardNode[] {
		const connectedNodeIds = new Set<string>();

		workflow.edges.forEach((edge) => {
			if (edge.source === nodeId) {
				connectedNodeIds.add(edge.target);
			} else if (edge.target === nodeId) {
				connectedNodeIds.add(edge.source);
			}
		});

		return workflow.nodes.filter((node) => connectedNodeIds.has(node.id));
	}

	/**
	 * Validate workflow structure
	 */
	validateWorkflow(workflow: StandardWorkflow): WorkflowValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Check for empty workflow
		if (workflow.nodes.length === 0) {
			warnings.push('Workflow has no nodes');
		}

		// Check for orphaned edges
		const nodeIds = new Set(workflow.nodes.map((n) => n.id));
		workflow.edges.forEach((edge) => {
			if (!nodeIds.has(edge.source)) {
				errors.push(`Edge ${edge.id} references non-existent source node ${edge.source}`);
			}
			if (!nodeIds.has(edge.target)) {
				errors.push(`Edge ${edge.id} references non-existent target node ${edge.target}`);
			}
		});

		// Check for self-connections
		workflow.edges.forEach((edge) => {
			if (edge.source === edge.target) {
				errors.push(`Node ${edge.source} cannot connect to itself`);
			}
		});

		// Check for duplicate node IDs
		const nodeIdCounts = new Map<string, number>();
		workflow.nodes.forEach((node) => {
			nodeIdCounts.set(node.id, (nodeIdCounts.get(node.id) || 0) + 1);
		});
		nodeIdCounts.forEach((count, id) => {
			if (count > 1) {
				errors.push(`Duplicate node ID: ${id}`);
			}
		});

		// Check for duplicate edge IDs
		const edgeIdCounts = new Map<string, number>();
		workflow.edges.forEach((edge) => {
			edgeIdCounts.set(edge.id, (edgeIdCounts.get(edge.id) || 0) + 1);
		});
		edgeIdCounts.forEach((count, id) => {
			if (count > 1) {
				errors.push(`Duplicate edge ID: ${id}`);
			}
		});

		return {
			valid: errors.length === 0,
			errors,
			warnings
		};
	}

	/**
	 * Export workflow to JSON
	 */
	exportWorkflow(workflow: StandardWorkflow): string {
		return JSON.stringify(workflow, null, 2);
	}

	/**
	 * Import workflow from JSON
	 */
	importWorkflow(json: string): StandardWorkflow {
		try {
			const workflow = JSON.parse(json) as StandardWorkflow;

			// Validate the imported workflow
			const validation = this.validateWorkflow(workflow);
			if (!validation.valid) {
				throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
			}

			// Update metadata
			workflow.metadata = {
				version: workflow.metadata?.version || '1.0.0',
				createdAt: workflow.metadata?.createdAt || new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				author: workflow.metadata?.author,
				tags: workflow.metadata?.tags
			};

			return workflow;
		} catch (error) {
			throw new Error(
				`Failed to import workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Convert SvelteFlow workflow to standard format
	 */
	fromSvelteFlow(svelteFlowWorkflow: Workflow): StandardWorkflow {
		return {
			id: svelteFlowWorkflow.id,
			name: svelteFlowWorkflow.name,
			description: svelteFlowWorkflow.description,
			nodes: svelteFlowWorkflow.nodes.map((node) => ({
				id: node.id,
				type: node.data.metadata.id,
				position: node.position,
				data: {
					label: node.data.label,
					config: node.data.config,
					metadata: node.data.metadata
				}
			})),
			edges: svelteFlowWorkflow.edges.map((edge) => ({
				id: edge.id,
				source: edge.source,
				target: edge.target,
				sourceHandle: edge.sourceHandle,
				targetHandle: edge.targetHandle
			})),
			metadata: svelteFlowWorkflow.metadata
		};
	}

	/**
	 * Convert standard workflow to SvelteFlow format
	 */
	toSvelteFlow(workflow: StandardWorkflow): Workflow {
		return {
			id: workflow.id,
			name: workflow.name,
			description: workflow.description,
			nodes: workflow.nodes.map((node) => ({
				id: node.id,
				type: 'workflowNode',
				position: node.position,
				deletable: true,
				data: {
					label: node.data.label,
					config: node.data.config,
					metadata: node.data.metadata,
					nodeId: node.id
				}
			})),
			edges: workflow.edges.map((edge) => ({
				id: edge.id,
				source: edge.source,
				target: edge.target,
				sourceHandle: edge.sourceHandle,
				targetHandle: edge.targetHandle
			})),
			metadata: workflow.metadata
		};
	}

	/**
	 * Get workflow statistics
	 */
	getWorkflowStats(workflow: StandardWorkflow) {
		const nodeTypeCounts = new Map<string, number>();
		workflow.nodes.forEach((node) => {
			nodeTypeCounts.set(node.type, (nodeTypeCounts.get(node.type) || 0) + 1);
		});

		return {
			totalNodes: workflow.nodes.length,
			totalEdges: workflow.edges.length,
			nodeTypeCounts: Object.fromEntries(nodeTypeCounts),
			lastModified: workflow.metadata?.updatedAt
		};
	}

	/**
	 * Clone a workflow
	 */
	cloneWorkflow(workflow: StandardWorkflow, newName?: string): StandardWorkflow {
		const cloned = JSON.parse(JSON.stringify(workflow)) as StandardWorkflow;

		// Generate new IDs for all nodes and edges
		const idMapping = new Map<string, string>();

		// Count nodes by type to generate proper sequential IDs
		const nodeTypeCounts = new Map<string, number>();

		cloned.nodes.forEach((node) => {
			const oldId = node.id;
			const nodeTypeId = node.data.metadata.id;

			// Get the current count for this node type
			const currentCount = nodeTypeCounts.get(nodeTypeId) || 0;
			const newCount = currentCount + 1;
			nodeTypeCounts.set(nodeTypeId, newCount);

			// Generate new ID with the sequential number
			node.id = `${nodeTypeId}.${newCount}`;
			idMapping.set(oldId, node.id);
		});

		cloned.edges.forEach((edge) => {
			edge.id = uuidv4();
			edge.source = idMapping.get(edge.source) || edge.source;
			edge.target = idMapping.get(edge.target) || edge.target;
		});

		cloned.id = uuidv4();
		cloned.name = newName || `${workflow.name} (Copy)`;
		cloned.metadata = {
			version: cloned.metadata?.version || '1.0.0',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			author: cloned.metadata?.author,
			tags: cloned.metadata?.tags
		};

		return cloned;
	}
}
