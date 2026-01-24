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
 * Loopback port name constant
 * This is the standard input port name used for loop iteration triggers
 */
const LOOPBACK_PORT_NAME = 'loop_back';

/**
 * Determines if an edge is a loopback edge.
 * Loopback edges target the special `loop_back` input port on ForEach nodes.
 * These edges are used to trigger the next iteration in a loop construct.
 *
 * @param edge - The edge to check
 * @returns True if the edge is a loopback edge
 *
 * @example
 * ```typescript
 * const edge = { targetHandle: "foreach.1-input-loop_back", ... };
 * const isLoop = isLoopbackEdge(edge); // true
 * ```
 */
export function isLoopbackEdge(edge: WorkflowEdge): boolean {
	const targetHandle = edge.targetHandle ?? '';
	return targetHandle.includes(`-input-${LOOPBACK_PORT_NAME}`);
}

/**
 * Checks if a cycle consists entirely of loopback edges.
 * A valid loopback cycle only contains edges that target loop_back ports.
 *
 * @param cycleEdges - Array of edges that form a cycle
 * @returns True if all edges in the cycle are loopback edges
 */
export function isValidLoopbackCycle(cycleEdges: WorkflowEdge[]): boolean {
	return cycleEdges.every((edge) => isLoopbackEdge(edge));
}

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

	// Get the compatibility checker instance
	const checker = getPortCompatibilityChecker();

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
				const compatible = checker.areDataTypesCompatible(sourcePort.dataType, targetPort.dataType);

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

	// Check data type compatibility using the global checker
	const checker = getPortCompatibilityChecker();
	if (!checker.areDataTypesCompatible(sourcePort.dataType, targetPort.dataType)) {
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

	// Get the compatibility checker instance
	const checker = getPortCompatibilityChecker();

	for (const otherNode of otherNodes) {
		const otherMetadata = nodeTypes.find((nt) => nt.id === otherNode.data.metadata.id);
		if (!otherMetadata) continue;

		// Check outputs from other nodes to inputs of current node
		for (const output of otherMetadata.outputs) {
			for (const input of metadata.inputs) {
				const compatible = checker.areDataTypesCompatible(output.dataType, input.dataType);
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
				const compatible = checker.areDataTypesCompatible(output.dataType, input.dataType);
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
 * Note: This function detects ALL cycles, including valid loopback cycles.
 * Use `hasInvalidCycles` to check only for cycles that could cause infinite execution.
 *
 * @param nodes - Array of workflow nodes
 * @param edges - Array of workflow edges
 * @returns True if any cycle exists in the workflow
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
 * Check if a workflow has any invalid cycles (non-loopback cycles).
 * This excludes valid loopback cycles used for ForEach iteration.
 * Only cycles that could cause infinite execution are detected.
 *
 * @param nodes - Array of workflow nodes
 * @param edges - Array of workflow edges
 * @returns True if any invalid (non-loopback) cycle exists
 *
 * @example
 * ```typescript
 * // A cycle through a loopback edge is valid (returns false)
 * // A cycle through regular data edges is invalid (returns true)
 * const hasInvalid = hasInvalidCycles(nodes, edges);
 * ```
 */
export function hasInvalidCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
	// Filter out loopback edges - these create valid cycles for loop iteration
	const nonLoopbackEdges = edges.filter((edge) => !isLoopbackEdge(edge));

	// Check for cycles using only non-loopback edges
	const visited = new Set<string>();
	const recursionStack = new Set<string>();

	/**
	 * DFS utility to detect cycles in the graph
	 * @param nodeId - Current node being visited
	 * @returns True if a cycle is found from this node
	 */
	function hasCycleUtil(nodeId: string): boolean {
		if (recursionStack.has(nodeId)) return true;
		if (visited.has(nodeId)) return false;

		visited.add(nodeId);
		recursionStack.add(nodeId);

		// Get all outgoing non-loopback edges from this node
		const outgoingEdges = nonLoopbackEdges.filter((e) => e.source === nodeId);

		for (const edge of outgoingEdges) {
			if (hasCycleUtil(edge.target)) return true;
		}

		recursionStack.delete(nodeId);
		return false;
	}

	// Check each node for cycles
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
