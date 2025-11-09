/**
 * Workflow Editor Helper
 * Contains business logic for workflow operations
 */

import { MarkerType } from '@xyflow/svelte';
import type {
	WorkflowNode as WorkflowNodeType,
	NodeMetadata,
	Workflow,
	WorkflowEdge,
	NodeExecutionInfo
} from '../types/index.js';
import { hasCycles } from '../utils/connections.js';
import { workflowApi, nodeApi, setEndpointConfig } from '../services/api.js';
import { v4 as uuidv4 } from 'uuid';
import { workflowActions } from '../stores/workflowStore.js';
import { nodeExecutionService } from '../services/nodeExecutionService.js';
import type { EndpointConfig } from '../config/endpoints.js';

/**
 * Edge styling configuration
 */
export class EdgeStylingHelper {
	/**
	 * Apply custom styling to connection edges based on rules:
	 * - Dashed lines for connections to tool nodes
	 * - Arrow markers pointing towards input ports
	 */
	static applyConnectionStyling(
		edge: WorkflowEdge,
		sourceNode: WorkflowNodeType,
		targetNode: WorkflowNodeType
	): void {
		// Rule 1: Dashed lines for tool nodes
		// A node is a tool node when it uses the ToolNode component,
		// which happens when sourceNode.type === "tool"
		const isToolNode = sourceNode.type === 'tool';

		// Use inline styles for dashed lines (more reliable than CSS classes)
		if (isToolNode) {
			edge.style = 'stroke-dasharray: 0 4 0; stroke: amber !important;';
			edge.class = 'flowdrop--edge--tool';
		} else {
			edge.style = 'stroke: grey;';
		}

		// Store metadata in edge data for debugging
		edge.data = {
			...edge.data,
			isToolConnection: isToolNode,
			targetNodeType: targetNode.type,
			targetCategory: targetNode.data.metadata.category
		};

		// Rule 2: Always add arrow pointing towards input port
		// This replaces the default arrows we removed
		if (!isToolNode) {
			edge.markerEnd = {
				type: MarkerType.ArrowClosed,
				width: 16,
				height: 16,
				color: 'grey'
			};
		}
	}

	/**
	 * Update existing edges with custom styling rules
	 */
	static updateEdgeStyles(edges: WorkflowEdge[], nodes: WorkflowNodeType[]): WorkflowEdge[] {
		return edges.map((edge) => {
			// Find source and target nodes
			const sourceNode = nodes.find((node) => node.id === edge.source);
			const targetNode = nodes.find((node) => node.id === edge.target);

			if (!sourceNode || !targetNode) {
				return edge;
			}

			// Create a copy of the edge and apply styling
			const updatedEdge = { ...edge };
			this.applyConnectionStyling(updatedEdge, sourceNode, targetNode);

			return updatedEdge;
		});
	}
}

/**
 * Node operations helper
 */
export class NodeOperationsHelper {
	/**
	 * Load nodes from API
	 */
	static async loadNodesFromApi(providedNodes?: NodeMetadata[]): Promise<NodeMetadata[]> {
		// If nodes are provided via props, use them
		if (providedNodes && providedNodes.length > 0) {
			return providedNodes;
		}

		// Otherwise, load from API
		try {
			const fetchedNodes = await nodeApi.getNodes();
			return fetchedNodes;
		} catch (error) {
			console.error('❌ Failed to load nodes from API:', error);

			// Use fallback sample nodes
			return [
				{
					id: 'text-input',
					name: 'Text Input',
					category: 'inputs',
					description: 'Simple text input field',
					version: '1.0.0',
					icon: 'mdi:text-box',
					inputs: [],
					outputs: [{ id: 'text', name: 'text', type: 'output', dataType: 'string' }]
				},
				{
					id: 'text-output',
					name: 'Text Output',
					category: 'outputs',
					description: 'Display text output',
					version: '1.0.0',
					icon: 'mdi:text-box-outline',
					inputs: [{ id: 'text', name: 'text', type: 'input', dataType: 'string' }],
					outputs: []
				}
			];
		}
	}

	/**
	 * Load node execution information for all nodes in the workflow
	 */
	static async loadNodeExecutionInfo(
		workflow: Workflow | null,
		pipelineId?: string
	): Promise<Record<string, NodeExecutionInfo>> {
		if (!workflow?.nodes) return {};

		// Only load execution info if we have a pipelineId (for pipeline status mode)
		if (!pipelineId) return {};

		try {
			const nodeIds = workflow.nodes.map((node) => node.id);
			const executionInfo = await nodeExecutionService.getMultipleNodeExecutionInfo(
				nodeIds,
				pipelineId
			);

			return executionInfo;
		} catch (error) {
			console.error('Failed to load node execution info:', error);
			return {};
		}
	}

	/**
	 * Create a new node from dropped data
	 */
	static createNodeFromDrop(
		nodeTypeData: string,
		position: { x: number; y: number }
	): WorkflowNodeType | null {
		try {
			const parsedData = JSON.parse(nodeTypeData);

			// Handle both old format (with type: "node") and new format (direct NodeMetadata)
			let nodeType: NodeMetadata;
			let nodeData: {
				label: string;
				config: Record<string, unknown>;
				metadata: NodeMetadata;
			};

			if (parsedData.type === 'node') {
				// Old format from sidebar
				nodeType = parsedData.nodeData.metadata;
				nodeData = parsedData.nodeData;
			} else {
				// New format (direct NodeMetadata)
				nodeType = parsedData;

				// Extract initial config from configSchema
				let initialConfig: Record<string, unknown> = {};
				if (nodeType.configSchema && typeof nodeType.configSchema === 'object') {
					// If configSchema is a JSON Schema, extract default values
					if (nodeType.configSchema.properties) {
						// JSON Schema format - extract defaults
						Object.entries(nodeType.configSchema.properties).forEach(([key, prop]) => {
							if (prop && typeof prop === 'object' && 'default' in prop) {
								initialConfig[key] = prop.default;
							}
						});
					} else {
						// Simple object format - use as is
						initialConfig = { ...nodeType.configSchema };
					}
				}

				nodeData = {
					label: nodeType.name,
					config: initialConfig,
					metadata: nodeType
				};
			}

			const newNodeId = uuidv4();

			// All nodes use "universalNode" type
			// UniversalNode component handles internal switching based on metadata and config
			const newNode: WorkflowNodeType = {
				id: newNodeId,
				type: 'universalNode',
				position, // Use the position calculated from the drop event
				deletable: true,
				data: {
					...nodeData,
					nodeId: newNodeId // Use the same ID
				}
			};

			return newNode;
		} catch (error) {
			console.error('Error parsing node data:', error);
			return null;
		}
	}
}

/**
 * Workflow operations helper
 */
export class WorkflowOperationsHelper {
	/**
	 * Generate workflow metadata for updates
	 */
	static generateMetadata(existingMetadata?: Workflow['metadata']): Workflow['metadata'] {
		return {
			...existingMetadata,
			updatedAt: new Date().toISOString(),
			versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			updateNumber: (existingMetadata?.updateNumber || 0) + 1
		};
	}

	/**
	 * Update workflow with new nodes/edges and generate new metadata
	 */
	static updateWorkflow(
		workflow: Workflow,
		nodes: WorkflowNodeType[],
		edges: WorkflowEdge[]
	): Workflow {
		return {
			...workflow,
			nodes,
			edges,
			metadata: this.generateMetadata(workflow.metadata)
		};
	}

	/**
	 * Clear workflow (remove all nodes and edges)
	 */
	static clearWorkflow(workflow: Workflow): Workflow {
		return {
			...workflow,
			nodes: [],
			edges: [],
			metadata: this.generateMetadata(workflow.metadata)
		};
	}

	/**
	 * Update node configuration
	 */
	static updateNodeConfig(
		workflow: Workflow,
		nodeId: string,
		newConfig: Record<string, unknown>
	): Workflow {
		return {
			...workflow,
			nodes: workflow.nodes.map((node) =>
				node.id === nodeId
					? {
							...node,
							data: { ...node.data, config: { ...newConfig } }
						}
					: node
			),
			metadata: this.generateMetadata(workflow.metadata)
		};
	}

	/**
	 * Add a new node to the workflow
	 */
	static addNode(workflow: Workflow, node: WorkflowNodeType): Workflow {
		return {
			...workflow,
			nodes: [...workflow.nodes, node],
			metadata: this.generateMetadata(workflow.metadata)
		};
	}

	/**
	 * Save workflow to backend
	 */
	static async saveWorkflow(workflow: Workflow | null): Promise<Workflow | null> {
		if (!workflow) {
			console.warn('No workflow data available to save');
			return null;
		}

		try {
			// Determine the workflow ID based on whether we have an existing workflow
			let workflowId: string;
			if (workflow.id) {
				// Use the existing workflow ID
				workflowId = workflow.id;
			} else {
				// Generate a new UUID for a new workflow
				workflowId = uuidv4();
			}

			const workflowToSave: Workflow = {
				id: workflowId,
				name: workflow.name || 'Untitled Workflow',
				nodes: workflow.nodes || [],
				edges: workflow.edges || [],
				metadata: {
					version: '1.0.0',
					createdAt: workflow.metadata?.createdAt || new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
		};

		const savedWorkflow = await workflowApi.saveWorkflow(workflowToSave);

		// Update the workflow ID if it changed (new workflow)
		if (savedWorkflow.id && savedWorkflow.id !== workflowToSave.id) {
				workflowActions.batchUpdate({
					nodes: workflowToSave.nodes,
					edges: workflowToSave.edges,
					name: workflowToSave.name,
					metadata: {
						...workflowToSave.metadata,
						...savedWorkflow.metadata
					}
				});
			}

			return savedWorkflow;
		} catch (error) {
			console.error('❌ Failed to save workflow:', error);
			throw error;
		}
	}

	/**
	 * Export workflow as JSON file
	 */
	static exportWorkflow(workflow: Workflow | null): void {
		if (!workflow) {
			console.warn('No workflow data available to export');
			return;
		}

		// Use the same ID logic as saveWorkflow
		const workflowId = workflow.id || uuidv4();

		const workflowToExport: Workflow = {
			id: workflowId,
			name: workflow.name || 'Untitled Workflow',
			nodes: workflow.nodes || [],
			edges: workflow.edges || [],
			metadata: {
				version: '1.0.0',
				createdAt: workflow.metadata?.createdAt || new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
		};

		const dataStr = JSON.stringify(workflowToExport, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${workflowToExport.name}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	/**
	 * Check if workflow has cycles
	 */
	static checkWorkflowCycles(nodes: WorkflowNodeType[], edges: WorkflowEdge[]): boolean {
		return hasCycles(nodes, edges);
	}
}

/**
 * Configuration helper
 */
export class ConfigurationHelper {
	/**
	 * Configure API endpoints
	 */
	static configureEndpoints(config: EndpointConfig): void {
		setEndpointConfig(config);
	}
}
