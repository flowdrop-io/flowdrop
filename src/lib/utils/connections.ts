/**
 * Connection validation utilities for FlowDrop
 */

import type {
	NodeMetadata,
	NodePort,
	NodeDataType,
	WorkflowNode,
	WorkflowEdge,
	PortConfig,
	PortDataTypeConfig
} from '../types/index.js';

/**
 * Configurable port compatibility checker
 */
export class PortCompatibilityChecker {
	private portConfig: PortConfig;
	private compatibilityMap: Map<string, Set<string>>;

	constructor(portConfig: PortConfig) {
		this.portConfig = portConfig;
		this.compatibilityMap = new Map();
		this.buildCompatibilityMap();
	}

	/**
	 * Build the compatibility map from configuration rules
	 */
	private buildCompatibilityMap(): void {
		this.compatibilityMap.clear();

		// First, add direct type matches (every type is compatible with itself)
		for (const dataType of this.portConfig.dataTypes) {
			if (!this.compatibilityMap.has(dataType.id)) {
				this.compatibilityMap.set(dataType.id, new Set());
			}
			this.compatibilityMap.get(dataType.id)!.add(dataType.id);
		}

		// Then add configured compatibility rules
		for (const rule of this.portConfig.compatibilityRules) {
			if (!this.compatibilityMap.has(rule.from)) {
				this.compatibilityMap.set(rule.from, new Set());
			}
			this.compatibilityMap.get(rule.from)!.add(rule.to);
		}

		// Add alias support
		for (const dataType of this.portConfig.dataTypes) {
			if (dataType.aliases) {
				for (const alias of dataType.aliases) {
					// Make aliases point to the main type's compatibility set
					const mainCompatibility = this.compatibilityMap.get(dataType.id);
					if (mainCompatibility) {
						this.compatibilityMap.set(alias, new Set(mainCompatibility));

						// Also make the main type compatible with the alias
						mainCompatibility.add(alias);
					}
				}
			}
		}
	}

	/**
	 * Check if two data types are compatible for connection
	 */
	public areDataTypesCompatible(outputType: NodeDataType, inputType: NodeDataType): boolean {
		const compatibleTypes = this.compatibilityMap.get(outputType);
		return compatibleTypes ? compatibleTypes.has(inputType) : false;
	}

	/**
	 * Get all compatible target types for a source type
	 */
	public getCompatibleTypes(sourceType: NodeDataType): NodeDataType[] {
		const compatibleTypes = this.compatibilityMap.get(sourceType);
		return compatibleTypes ? Array.from(compatibleTypes) : [];
	}

	/**
	 * Get data type configuration by ID
	 */
	public getDataTypeConfig(dataTypeId: string): PortDataTypeConfig | undefined {
		return this.portConfig.dataTypes.find(
			(dt) => dt.id === dataTypeId || dt.aliases?.includes(dataTypeId)
		);
	}

	/**
	 * Get all enabled data types
	 */
	public getEnabledDataTypes(): PortDataTypeConfig[] {
		return this.portConfig.dataTypes.filter((dt) => dt.enabled !== false);
	}
}

// Global instance - will be initialized with configuration
let globalCompatibilityChecker: PortCompatibilityChecker | null = null;

/**
 * Initialize the global port compatibility checker
 */
export function initializePortCompatibility(portConfig: PortConfig): void {
	globalCompatibilityChecker = new PortCompatibilityChecker(portConfig);
}

/**
 * Get the global port compatibility checker
 */
export function getPortCompatibilityChecker(): PortCompatibilityChecker {
	if (!globalCompatibilityChecker) {
		throw new Error(
			'Port compatibility checker not initialized. Call initializePortCompatibility() first.'
		);
	}
	return globalCompatibilityChecker;
}

/**
 * Check if two data types are compatible for connection (legacy function)
 * @deprecated Use PortCompatibilityChecker.areDataTypesCompatible() instead
 */
export function areDataTypesCompatible(outputType: NodeDataType, inputType: NodeDataType): boolean {
	if (!globalCompatibilityChecker) {
		// Fallback to basic compatibility for backward compatibility
		return outputType === inputType;
	}
	return globalCompatibilityChecker.areDataTypesCompatible(outputType, inputType);
}

/**
 * Get all possible connections from a source node to target nodes
 */
export function getPossibleConnections(
	sourceNode: WorkflowNode,
	targetNodes: WorkflowNode[],
	nodeTypes: NodeMetadata[]
): Array<{
	sourceNodeId: string;
	sourcePortId: string;
	sourcePort: NodePort;
	targetNodeId: string;
	targetPortId: string;
	targetPort: NodePort;
	compatible: boolean;
}> {
	const sourceMetadata = nodeTypes.find((nt) => nt.id === sourceNode.data.metadata.id);
	if (!sourceMetadata) return [];

	const possibleConnections: Array<{
		sourceNodeId: string;
		sourcePortId: string;
		sourcePort: NodePort;
		targetNodeId: string;
		targetPortId: string;
		targetPort: NodePort;
		compatible: boolean;
	}> = [];

	// Get all output ports from source node
	const sourceOutputs = sourceMetadata.outputs;

	// Check each target node
	for (const targetNode of targetNodes) {
		if (targetNode.id === sourceNode.id) continue; // Skip self-connection

		const targetMetadata = nodeTypes.find((nt) => nt.id === targetNode.data.metadata.id);
		if (!targetMetadata) continue;

		// Get all input ports from target node
		const targetInputs = targetMetadata.inputs;

		// Check each output-input combination
		for (const sourcePort of sourceOutputs) {
			for (const targetPort of targetInputs) {
				const compatible = areDataTypesCompatible(sourcePort.dataType, targetPort.dataType);

				possibleConnections.push({
					sourceNodeId: sourceNode.id,
					sourcePortId: sourcePort.id,
					sourcePort,
					targetNodeId: targetNode.id,
					targetPortId: targetPort.id,
					targetPort,
					compatible
				});
			}
		}
	}

	return possibleConnections;
}

/**
 * Validate if a specific connection is valid
 */
export function validateConnection(
	sourceNodeId: string,
	sourcePortId: string,
	targetNodeId: string,
	targetPortId: string,
	nodes: WorkflowNode[],
	nodeTypes: NodeMetadata[]
): { valid: boolean; error?: string } {
	// Check if nodes exist
	const sourceNode = nodes.find((n) => n.id === sourceNodeId);
	const targetNode = nodes.find((n) => n.id === targetNodeId);

	if (!sourceNode) {
		return { valid: false, error: 'Source node not found' };
	}

	if (!targetNode) {
		return { valid: false, error: 'Target node not found' };
	}

	// Check for self-connection
	if (sourceNodeId === targetNodeId) {
		return { valid: false, error: 'Cannot connect node to itself' };
	}

	// Get node metadata
	const sourceMetadata = nodeTypes.find((nt) => nt.id === sourceNode.data.metadata.id);
	const targetMetadata = nodeTypes.find((nt) => nt.id === targetNode.data.metadata.id);

	if (!sourceMetadata || !targetMetadata) {
		return { valid: false, error: 'Node metadata not found' };
	}

	// Find ports
	const sourcePort = sourceMetadata.outputs.find((p) => p.id === sourcePortId);
	const targetPort = targetMetadata.inputs.find((p) => p.id === targetPortId);

	if (!sourcePort) {
		return { valid: false, error: 'Source port not found' };
	}

	if (!targetPort) {
		return { valid: false, error: 'Target port not found' };
	}

	// Check data type compatibility
	if (!areDataTypesCompatible(sourcePort.dataType, targetPort.dataType)) {
		return {
			valid: false,
			error: `Incompatible data types: ${sourcePort.dataType} cannot connect to ${targetPort.dataType}`
		};
	}

	return { valid: true };
}

/**
 * Get connection suggestions for a node
 */
export function getConnectionSuggestions(
	nodeId: string,
	nodes: WorkflowNode[],
	nodeTypes: NodeMetadata[]
): Array<{
	nodeId: string;
	nodeName: string;
	portId: string;
	portName: string;
	portType: 'input' | 'output';
	dataType: NodeDataType;
	compatible: boolean;
}> {
	const node = nodes.find((n) => n.id === nodeId);
	if (!node) return [];

	const metadata = nodeTypes.find((nt) => nt.id === node.data.metadata.id);
	if (!metadata) return [];

	const suggestions: Array<{
		nodeId: string;
		nodeName: string;
		portId: string;
		portName: string;
		portType: 'input' | 'output';
		dataType: NodeDataType;
		compatible: boolean;
	}> = [];

	// Get all other nodes
	const otherNodes = nodes.filter((n) => n.id !== nodeId);

	for (const otherNode of otherNodes) {
		const otherMetadata = nodeTypes.find((nt) => nt.id === otherNode.data.metadata.id);
		if (!otherMetadata) continue;

		// Check outputs from other nodes to inputs of current node
		for (const output of otherMetadata.outputs) {
			for (const input of metadata.inputs) {
				const compatible = areDataTypesCompatible(output.dataType, input.dataType);
				suggestions.push({
					nodeId: otherNode.id,
					nodeName: otherNode.data.label,
					portId: output.id,
					portName: output.name,
					portType: 'output',
					dataType: output.dataType,
					compatible
				});
			}
		}

		// Check outputs from current node to inputs of other nodes
		for (const output of metadata.outputs) {
			for (const input of otherMetadata.inputs) {
				const compatible = areDataTypesCompatible(output.dataType, input.dataType);
				suggestions.push({
					nodeId: otherNode.id,
					nodeName: otherNode.data.label,
					portId: input.id,
					portName: input.name,
					portType: 'input',
					dataType: input.dataType,
					compatible
				});
			}
		}
	}

	return suggestions;
}

/**
 * Check if a workflow has any cycles (prevent infinite loops)
 */
export function hasCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
	const visited = new Set<string>();
	const recursionStack = new Set<string>();

	function hasCycleUtil(nodeId: string): boolean {
		if (recursionStack.has(nodeId)) return true;
		if (visited.has(nodeId)) return false;

		visited.add(nodeId);
		recursionStack.add(nodeId);

		// Get all outgoing edges from this node
		const outgoingEdges = edges.filter((e) => e.source === nodeId);

		for (const edge of outgoingEdges) {
			if (hasCycleUtil(edge.target)) return true;
		}

		recursionStack.delete(nodeId);
		return false;
	}

	// Check each node
	for (const node of nodes) {
		if (!visited.has(node.id)) {
			if (hasCycleUtil(node.id)) return true;
		}
	}

	return false;
}

/**
 * Get the execution order for a workflow (topological sort)
 */
export function getExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
	const inDegree = new Map<string, number>();
	const graph = new Map<string, string[]>();

	// Initialize
	for (const node of nodes) {
		inDegree.set(node.id, 0);
		graph.set(node.id, []);
	}

	// Build graph and calculate in-degrees
	for (const edge of edges) {
		const current = inDegree.get(edge.target) || 0;
		inDegree.set(edge.target, current + 1);

		const neighbors = graph.get(edge.source) || [];
		neighbors.push(edge.target);
		graph.set(edge.source, neighbors);
	}

	// Topological sort
	const queue: string[] = [];
	const result: string[] = [];

	// Add nodes with no incoming edges
	for (const [nodeId, degree] of inDegree) {
		if (degree === 0) {
			queue.push(nodeId);
		}
	}

	while (queue.length > 0) {
		const nodeId = queue.shift()!;
		result.push(nodeId);

		const neighbors = graph.get(nodeId) || [];
		for (const neighbor of neighbors) {
			const degree = inDegree.get(neighbor)! - 1;
			inDegree.set(neighbor, degree);

			if (degree === 0) {
				queue.push(neighbor);
			}
		}
	}

	return result;
}
