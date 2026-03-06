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
import { hasCycles, hasInvalidCycles, isLoopbackEdge } from '../utils/connections.js';
import { workflowApi, nodeApi, setEndpointConfig } from '../services/api.js';
import { v4 as uuidv4 } from 'uuid';
import { workflowActions } from '../stores/workflowStore.svelte.js';
import { nodeExecutionService } from '../services/nodeExecutionService.js';
import type { EndpointConfig } from '../config/endpoints.js';
import { WorkflowAdapter } from '../adapters/WorkflowAdapter.js';
import { AgentSpecAdapter } from '../adapters/agentspec/AgentSpecAdapter.js';
import { validateForAgentSpecExport } from '../adapters/agentspec/validator.js';
import { extractPortId } from '../utils/handleIds.js';
import { logger } from '../utils/logger.js';

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
 * - trigger: For control flow connections (dataType: "trigger")
 * - tool: Dashed amber line for tool connections (dataType: "tool")
 * - loopback: Dashed gray line for loop iteration connections (targets loop_back port)
 * - data: Normal gray line for all other data connections
 */
export type EdgeCategory = 'trigger' | 'tool' | 'loopback' | 'data';

/**
 * Edge styling configuration based on source port data type
 */
export class EdgeStylingHelper {
	/**
	 * Extract the port ID from a handle ID
	 * @param handleId - The handle ID string (e.g., "sample-node.1-output-trigger" or "trigger")
	 * @returns The port ID (e.g., "trigger") or the handleId itself for short format
	 */
	static extractPortIdFromHandle(handleId: string | undefined): string | null {
		return extractPortId(handleId);
	}

	/**
	 * Check if a port ID matches a dynamic branch in a Gateway node
	 * Gateway nodes store branches in config.branches array
	 * @param node - The workflow node to check
	 * @param portId - The port ID to look up
	 * @returns true if the portId matches a gateway branch
	 */
	static isGatewayBranch(node: WorkflowNodeType, portId: string): boolean {
		// Check if this is a gateway node with dynamic branches
		const nodeType = node.data?.metadata?.type || node.type;
		if (nodeType !== 'gateway') {
			return false;
		}

		// Check if the portId matches a branch name in config.branches
		const branches = node.data?.config?.branches as Array<{ name: string }> | undefined;
		if (!branches || !Array.isArray(branches)) {
			return false;
		}

		return branches.some((branch) => branch.name === portId);
	}

	/**
	 * Get the data type of a port from a node's metadata
	 * Also handles dynamic ports like Gateway branches
	 * @param node - The workflow node containing the port
	 * @param portId - The port ID to look up
	 * @param portType - Whether to look in "inputs" or "outputs"
	 * @returns The port's dataType or null if not found
	 */
	static getPortDataType(
		node: WorkflowNodeType,
		portId: string,
		portType: 'input' | 'output'
	): string | null {
		// First, check static ports in metadata
		const ports =
			portType === 'output' ? node.data?.metadata?.outputs : node.data?.metadata?.inputs;

		if (ports && Array.isArray(ports)) {
			const port = ports.find((p) => p.id === portId);
			if (port?.dataType) {
				return port.dataType;
			}
		}

		// Check dynamic ports from config (dynamicInputs/dynamicOutputs)
		const dynamicKey = portType === 'output' ? 'dynamicOutputs' : 'dynamicInputs';
		const dynamicPorts = node.data?.config?.[dynamicKey] as
			| Array<{ name: string; dataType: string }>
			| undefined;
		if (dynamicPorts && Array.isArray(dynamicPorts)) {
			const dynamicPort = dynamicPorts.find((p) => p.name === portId);
			if (dynamicPort?.dataType) {
				return dynamicPort.dataType;
			}
		}

		// For output ports, also check dynamic Gateway branches
		// Gateway branches are always trigger type (control flow)
		if (portType === 'output' && this.isGatewayBranch(node, portId)) {
			return 'trigger';
		}

		return null;
	}

	/**
	 * Determine the edge category based on source port data type
	 * Note: This method does not check for loopback edges.
	 * Use getEdgeCategoryWithLoopback() for full edge categorization.
	 *
	 * @param sourcePortDataType - The data type of the source output port
	 * @returns The edge category for styling
	 */
	static getEdgeCategory(sourcePortDataType: string | null): EdgeCategory {
		if (sourcePortDataType === 'trigger') {
			return 'trigger';
		}

		if (sourcePortDataType === 'tool') {
			return 'tool';
		}

		// All other data types (string, number, boolean, array, etc.) are "data" edges
		return 'data';
	}

	/**
	 * Determine the full edge category including loopback detection
	 * Loopback edges take precedence over source port data type
	 *
	 * @param edge - The edge to categorize
	 * @param sourcePortDataType - The data type of the source output port
	 * @returns The edge category for styling
	 */
	static getEdgeCategoryWithLoopback(
		edge: WorkflowEdge,
		sourcePortDataType: string | null
	): EdgeCategory {
		// Loopback edges are identified by their target handle
		// Check this first as it takes precedence
		if (isLoopbackEdge(edge)) {
			return 'loopback';
		}

		// Fall back to source port data type categorization
		return this.getEdgeCategory(sourcePortDataType);
	}

	/**
	 * Apply custom styling to connection edges based on edge type:
	 * - Loopback: Dashed gray line for loop iteration (targets loop_back port)
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
			? this.getPortDataType(sourceNode, sourcePortId, 'output')
			: null;

		// Determine edge category (loopback takes precedence)
		const edgeCategory = this.getEdgeCategoryWithLoopback(edge, sourcePortDataType);

		// Apply styling based on edge category
		// Marker colors use CSS custom properties so they respond to theme changes automatically
		switch (edgeCategory) {
			case 'loopback':
				// Loopback edges: dashed gray line for loop iteration
				edge.style =
					'stroke: var(--fd-edge-loopback); stroke-dasharray: var(--fd-edge-loopback-dasharray); stroke-width: var(--fd-edge-loopback-width); opacity: var(--fd-edge-loopback-opacity);';
				edge.class = 'flowdrop--edge--loopback';
				edge.markerEnd = {
					type: MarkerType.ArrowClosed,
					width: 14,
					height: 14,
					color: 'var(--fd-edge-loopback)'
				};
				break;

			case 'trigger':
				// Trigger edges: solid dark line for control flow
				edge.style = 'stroke: var(--fd-edge-trigger); stroke-width: var(--fd-edge-trigger-width);';
				edge.class = 'flowdrop--edge--trigger';
				edge.markerEnd = {
					type: MarkerType.ArrowClosed,
					width: 16,
					height: 16,
					color: 'var(--fd-edge-trigger)'
				};
				break;

			case 'tool':
				// Tool edges: dashed amber line
				edge.style = 'stroke: var(--fd-edge-tool); stroke-dasharray: 5 3;';
				edge.class = 'flowdrop--edge--tool';
				edge.markerEnd = {
					type: MarkerType.ArrowClosed,
					width: 16,
					height: 16,
					color: 'var(--fd-edge-tool)'
				};
				break;

			case 'data':
			default:
				// Data edges: normal gray line
				edge.style = 'stroke: var(--fd-edge-data);';
				edge.class = 'flowdrop--edge--data';
				edge.markerEnd = {
					type: MarkerType.ArrowClosed,
					width: 16,
					height: 16,
					color: 'var(--fd-edge-data)'
				};
				break;
		}

		// Store metadata in edge data for API and persistence
		edge.data = {
			...edge.data,
			metadata: {
				...((edge.data?.metadata as Record<string, unknown>) || {}),
				edgeType: edgeCategory,
				sourcePortDataType: sourcePortDataType ?? undefined
			},
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

			// Create a copy of the edge
			const updatedEdge = { ...edge };

			if (!sourceNode || !targetNode) {
				// Set default edgeType even when nodes are not found
				updatedEdge.data = {
					...updatedEdge.data,
					metadata: {
						...((updatedEdge.data?.metadata as Record<string, unknown>) || {}),
						edgeType: 'data' as EdgeCategory
					}
				};
				return updatedEdge;
			}

			// Apply full styling when nodes are available
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
			logger.error('Failed to load nodes from API:', error);

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
			logger.error('Failed to load node execution info:', error);
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
			logger.error('Error parsing node data:', error);
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
		const now = new Date().toISOString();
		return {
			version: '1.0.0',
			createdAt: now,
			...(existingMetadata ?? {}),
			updatedAt: now,
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
			logger.warn('No workflow data available to save');
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
			logger.error('Failed to save workflow:', error);
			throw error;
		}
	}

	/**
	 * Export workflow as JSON file
	 */
	static exportWorkflow(workflow: Workflow | null): void {
		if (!workflow) {
			logger.warn('No workflow data available to export');
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
	 * Export workflow as Agent Spec JSON file.
	 *
	 * Converts the FlowDrop workflow to Agent Spec format and triggers a download.
	 * Validates the workflow for Agent Spec compatibility first.
	 *
	 * @param workflow - The FlowDrop workflow to export
	 * @returns Validation result (check .valid before assuming success)
	 */
	static exportAsAgentSpec(workflow: Workflow | null): {
		valid: boolean;
		errors: string[];
		warnings: string[];
	} {
		if (!workflow) {
			return { valid: false, errors: ['No workflow data available to export'], warnings: [] };
		}

		// Convert to StandardWorkflow first
		const workflowAdapter = new WorkflowAdapter();
		const standardWorkflow = workflowAdapter.fromSvelteFlow(workflow);

		// Validate for Agent Spec
		const validation = validateForAgentSpecExport(standardWorkflow);
		if (!validation.valid) {
			return validation;
		}

		// Convert to Agent Spec
		const agentSpecAdapter = new AgentSpecAdapter();
		const agentSpecJson = agentSpecAdapter.exportJSON(standardWorkflow);

		// Trigger download
		const dataBlob = new Blob([agentSpecJson], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${workflow.name || 'workflow'}-agentspec.json`;
		link.click();
		URL.revokeObjectURL(url);

		return validation;
	}

	/**
	 * Import a workflow from an Agent Spec JSON or YAML file.
	 *
	 * Reads the file, detects format, converts to FlowDrop format,
	 * and returns a Workflow ready for the editor.
	 *
	 * @param file - The file to import (JSON or YAML)
	 * @returns Promise resolving to the imported FlowDrop Workflow
	 */
	static async importFromAgentSpec(file: File): Promise<Workflow> {
		const text = await file.text();

		const agentSpecAdapter = new AgentSpecAdapter();
		const workflowAdapter = new WorkflowAdapter();

		// Parse the Agent Spec data
		const standardWorkflow = agentSpecAdapter.importJSON(text);

		// Convert to SvelteFlow format
		return workflowAdapter.toSvelteFlow(standardWorkflow);
	}

	/**
	 * Check if workflow has invalid cycles (excludes valid loopback cycles)
	 * Valid loopback cycles are used for ForEach node iteration and should not
	 * trigger a warning.
	 *
	 * @param nodes - Array of workflow nodes
	 * @param edges - Array of workflow edges
	 * @returns True if there are invalid (non-loopback) cycles
	 */
	static checkWorkflowCycles(nodes: WorkflowNodeType[], edges: WorkflowEdge[]): boolean {
		return hasInvalidCycles(nodes, edges);
	}

	/**
	 * Check if workflow has any cycles (including valid loopback cycles)
	 * Use this when you need to detect ALL cycles regardless of type.
	 *
	 * @param nodes - Array of workflow nodes
	 * @param edges - Array of workflow edges
	 * @returns True if any cycle exists
	 */
	static checkWorkflowHasAnyCycles(nodes: WorkflowNodeType[], edges: WorkflowEdge[]): boolean {
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
