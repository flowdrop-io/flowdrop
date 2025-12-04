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
 * Generate a unique node ID based on node type and existing nodes
 * Format: <node_type>.<number>
 * Example: boolean_gateway.1, calculator.2
 */
export function generateNodeId(nodeTypeId: string, existingNodes: WorkflowNodeType[]): string {
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
 * Edge category type for styling purposes
 * - tool: Dashed amber line for tool connections
 * - data: Normal gray line for all other data connections
 */
export type EdgeCategory = "tool" | "data";

/**
 * Edge styling configuration based on source port data type
 */
export class EdgeStylingHelper {
	/**
	 * Extract the port ID from a handle ID
	 * Supports two formats:
	 * 1. New format: "${nodeId}-output-${portId}" or "${nodeId}-input-${portId}"
	 * 2. Legacy format: just the portId (e.g., "text", "trigger")
	 * @param handleId - The handle ID string (e.g., "sample-node.1-output-trigger" or "trigger")
	 * @returns The port ID (e.g., "trigger") or the handleId itself for legacy format
	 */
	static extractPortIdFromHandle(handleId: string | undefined): string | null {
		if (!handleId) {
			return null;
		}

		// Try new format: "${nodeId}-output-${portId}" or "${nodeId}-input-${portId}"
		// We need to find the last occurrence of "-output-" or "-input-" and get what follows
		const outputMatch = handleId.lastIndexOf("-output-");
		const inputMatch = handleId.lastIndexOf("-input-");

		if (outputMatch !== -1) {
			return handleId.substring(outputMatch + "-output-".length);
		}

		if (inputMatch !== -1) {
			return handleId.substring(inputMatch + "-input-".length);
		}

		// Legacy format: the handleId IS the port ID
		return handleId;
	}

	/**
	 * Get the data type of a port from a node's metadata
	 * @param node - The workflow node containing the port
	 * @param portId - The port ID to look up
	 * @param portType - Whether to look in "inputs" or "outputs"
	 * @returns The port's dataType or null if not found
	 */
	static getPortDataType(
		node: WorkflowNodeType,
		portId: string,
		portType: "input" | "output"
	): string | null {
		const ports = portType === "output"
			? node.data?.metadata?.outputs
			: node.data?.metadata?.inputs;

		if (!ports || !Array.isArray(ports)) {
			return null;
		}

		const port = ports.find((p) => p.id === portId);
		return port?.dataType || null;
	}

	/**
	 * Determine the edge category based on source port data type
	 * @param sourcePortDataType - The data type of the source output port
	 * @returns The edge category for styling
	 */
	static getEdgeCategory(sourcePortDataType: string | null): EdgeCategory {
		if (sourcePortDataType === "tool") {
			return "tool";
		}

		// All other data types (string, number, boolean, trigger, array, etc.) are "data" edges
		return "data";
	}

	/**
	 * Apply custom styling to connection edges based on source port data type:
	 * - Trigger ports: Solid black line with arrow
	 * - Tool ports: Dashed amber line with arrow
	 * - Data ports: Normal gray line with arrow
	 */
	static applyConnectionStyling(
		edge: WorkflowEdge,
		sourceNode: WorkflowNodeType,
		targetNode: WorkflowNodeType
	): void {
		// Extract port ID from sourceHandle
		const sourcePortId = this.extractPortIdFromHandle(edge.sourceHandle);

		// Get the source port's data type
		const sourcePortDataType = sourcePortId
			? this.getPortDataType(sourceNode, sourcePortId, "output")
			: null;

		// Determine edge category based on source port data type
		const edgeCategory = this.getEdgeCategory(sourcePortDataType);

		// Apply styling based on edge category
		switch (edgeCategory) {
			case "tool":
				// Tool edges: dashed amber line
				edge.style = "stroke: #f59e0b; stroke-dasharray: 5 3;";
				edge.class = "flowdrop--edge--tool";
				edge.markerEnd = {
					type: MarkerType.ArrowClosed,
					width: 16,
					height: 16,
					color: "#f59e0b"
				};
				break;

			case "data":
			default:
				// Data edges: normal gray line (includes trigger, string, number, etc.)
				edge.style = "stroke: #9ca3af;";
				edge.class = "flowdrop--edge--data";
				edge.markerEnd = {
					type: MarkerType.ArrowClosed,
					width: 16,
					height: 16,
					color: "#9ca3af"
				};
				break;
		}

		// Store metadata in edge data for debugging and API
		edge.data = {
			...edge.data,
			sourcePortDataType: sourcePortDataType || undefined,
			edgeCategory: edgeCategory,
			// Keep isToolConnection for backward compatibility
			isToolConnection: edgeCategory === "tool",
			targetNodeType: targetNode.type,
			targetCategory: targetNode.data.metadata.category
		};
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
		position: { x: number; y: number },
		existingNodes: WorkflowNodeType[] = []
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

			// Generate node ID based on node type and existing nodes
			const newNodeId = generateNodeId(nodeType.id, existingNodes);

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
