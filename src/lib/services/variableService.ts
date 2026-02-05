/**
 * Variable Service
 * Derives available template variables from connected upstream nodes' output schemas.
 * Used by the template editor for autocomplete suggestions.
 *
 * @module services/variableService
 */

import type {
	WorkflowNode,
	WorkflowEdge,
	VariableSchema,
	TemplateVariable,
	TemplateVariableType,
	NodePort,
	OutputProperty,
	InputProperty,
	BaseProperty,
	TemplateVariablesConfig,
	AuthProvider
} from '../types/index.js';

/**
 * Converts a JSON Schema property type to a TemplateVariableType.
 *
 * @param schemaType - The type from JSON Schema
 * @returns The corresponding TemplateVariableType
 */
function toTemplateVariableType(schemaType: string | undefined): TemplateVariableType {
	switch (schemaType) {
		case 'string':
			return 'string';
		case 'number':
			return 'number';
		case 'integer':
			return 'integer';
		case 'boolean':
			return 'boolean';
		case 'array':
			return 'array';
		case 'object':
			return 'object';
		case 'float':
			return 'float';
		default:
			return 'mixed';
	}
}

/**
 * Converts a JSON Schema property to a TemplateVariable.
 * Recursively processes nested objects and arrays.
 *
 * @param name - The property name
 * @param property - The JSON Schema property definition
 * @param sourcePort - Optional source port ID
 * @param sourceNode - Optional source node ID
 * @returns A TemplateVariable representing the property
 */
function propertyToTemplateVariable(
	name: string,
	property: BaseProperty | OutputProperty | InputProperty,
	sourcePort?: string,
	sourceNode?: string
): TemplateVariable {
	const variable: TemplateVariable = {
		name,
		label: property.title ?? name,
		description: property.description,
		type: toTemplateVariableType(property.type),
		sourcePort,
		sourceNode
	};

	// Handle nested object properties
	if (property.type === 'object' && property.properties) {
		variable.properties = {};
		for (const [propName, propValue] of Object.entries(property.properties)) {
			variable.properties[propName] = propertyToTemplateVariable(
				propName,
				propValue as BaseProperty,
				sourcePort,
				sourceNode
			);
		}
	}

	// Handle array items
	if (property.type === 'array' && property.items) {
		variable.items = propertyToTemplateVariable(
			'item',
			property.items as BaseProperty,
			sourcePort,
			sourceNode
		);
	}

	return variable;
}

/**
 * Creates a TemplateVariable from a NodePort.
 * Uses the port's schema if available, otherwise creates a basic variable.
 *
 * @param port - The output port to convert
 * @param sourceNode - The source node ID
 * @returns A TemplateVariable representing the port's data
 */
function portToTemplateVariable(port: NodePort, sourceNode: string): TemplateVariable {
	// If the port has a schema, use it to build a detailed variable
	if (port.schema && port.schema.properties) {
		const variable: TemplateVariable = {
			name: port.id,
			label: port.name,
			description: port.description,
			type: 'object',
			sourcePort: port.id,
			sourceNode,
			properties: {}
		};

		for (const [propName, propValue] of Object.entries(port.schema.properties)) {
			variable.properties![propName] = propertyToTemplateVariable(
				propName,
				propValue as BaseProperty,
				port.id,
				sourceNode
			);
		}

		return variable;
	}

	// Otherwise, create a basic variable based on dataType
	return {
		name: port.id,
		label: port.name,
		description: port.description,
		type: toTemplateVariableType(port.dataType),
		sourcePort: port.id,
		sourceNode
	};
}

/**
 * Information about an upstream connection to the current node.
 */
interface UpstreamConnection {
	/** The edge connecting the nodes */
	edge: WorkflowEdge;
	/** The source (upstream) node */
	sourceNode: WorkflowNode;
	/** The output port on the source node */
	sourcePort: NodePort | undefined;
	/** The input port on the target (current) node */
	targetPort: NodePort | undefined;
}

/**
 * Extracts the port ID from a handle ID.
 * Handle IDs follow the format: {nodeId}-{input|output}-{portId}
 *
 * @param handleId - The handle ID (e.g., "http_request.1-output-json")
 * @returns The port ID (e.g., "json") or the original handleId if parsing fails
 */
function extractPortIdFromHandle(handleId: string | undefined): string | undefined {
	if (!handleId) return undefined;

	// Handle format: {nodeId}-{input|output}-{portId}
	// Example: "http_request.1-output-json" -> "json"
	const outputMatch = handleId.match(/-output-(.+)$/);
	if (outputMatch) {
		return outputMatch[1];
	}

	const inputMatch = handleId.match(/-input-(.+)$/);
	if (inputMatch) {
		return inputMatch[1];
	}

	// Fallback: return the handle ID as-is (might be a simple port ID)
	return handleId;
}

/**
 * Finds all upstream connections to a node.
 * Returns information about each connection including source node and ports.
 *
 * @param node - The node to find upstream connections for
 * @param nodes - All nodes in the workflow
 * @param edges - All edges in the workflow
 * @returns Array of upstream connection information
 */
function findUpstreamConnections(
	node: WorkflowNode,
	nodes: WorkflowNode[],
	edges: WorkflowEdge[]
): UpstreamConnection[] {
	const connections: UpstreamConnection[] = [];

	// Find all edges that target this node
	const incomingEdges = edges.filter((edge) => edge.target === node.id);

	for (const edge of incomingEdges) {
		// Find the source node
		const sourceNode = nodes.find((n) => n.id === edge.source);
		if (!sourceNode) continue;

		// Extract port IDs from handle IDs
		// Handle format: {nodeId}-{input|output}-{portId}
		const sourcePortId = extractPortIdFromHandle(edge.sourceHandle);
		const targetPortId = extractPortIdFromHandle(edge.targetHandle);

		// Find the source output port
		const sourcePort = sourceNode.data.metadata.outputs.find((p) => p.id === sourcePortId);

		// Find the target input port
		const targetPort = node.data.metadata.inputs.find((p) => p.id === targetPortId);

		connections.push({
			edge,
			sourceNode,
			sourcePort,
			targetPort
		});
	}

	return connections;
}

/**
 * Options for deriving available variables.
 */
export interface GetAvailableVariablesOptions {
	/**
	 * Filter to only include variables from specific input ports.
	 * If not specified, all input ports with connections are used.
	 * If specified as an empty array, no variables will be available.
	 */
	targetPortIds?: string[];

	/**
	 * Whether to include the port name as a prefix for variables.
	 * When true, variables are named like `data.user` instead of just `user`.
	 * When false (default), schema properties are unpacked as top-level variables.
	 */
	includePortName?: boolean;
}

/**
 * Derives available template variables from connected upstream nodes.
 * Variables are extracted from the output schemas of nodes connected to
 * the current node's input ports.
 *
 * @param node - The current node being configured
 * @param nodes - All nodes in the workflow
 * @param edges - All edges in the workflow
 * @param options - Optional configuration for filtering variables
 * @returns A VariableSchema containing all available variables
 *
 * @example
 * ```typescript
 * // Get variables from all connected ports
 * const variableSchema = getAvailableVariables(currentNode, allNodes, allEdges);
 *
 * // Get variables only from specific input ports
 * const filteredSchema = getAvailableVariables(currentNode, allNodes, allEdges, {
 *   targetPortIds: ["data", "context"]
 * });
 * ```
 */
export function getAvailableVariables(
	node: WorkflowNode,
	nodes: WorkflowNode[],
	edges: WorkflowEdge[],
	options?: GetAvailableVariablesOptions
): VariableSchema {
	const variables: Record<string, TemplateVariable> = {};
	const { targetPortIds, includePortName } = options ?? {};

	// Find all upstream connections
	const connections = findUpstreamConnections(node, nodes, edges);

	for (const connection of connections) {
		const { sourceNode, sourcePort, targetPort } = connection;

		// Skip trigger ports - they don't carry data
		if (sourcePort?.dataType === 'trigger') continue;
		if (targetPort?.dataType === 'trigger') continue;

		// Get the target port ID for filtering
		const targetPortId = targetPort?.id ?? sourcePort?.id ?? 'data';

		// Filter by target port IDs if specified
		if (targetPortIds !== undefined) {
			if (!targetPortIds.includes(targetPortId)) continue;
		}

		if (!sourcePort) continue;

		// If the source port has a schema with top-level properties,
		// unpack them as top-level variables (unless includePortName is true)
		if (sourcePort.schema?.properties && !includePortName) {
			// Unpack schema properties as top-level variables
			for (const [propName, propValue] of Object.entries(sourcePort.schema.properties)) {
				// Skip if we already have a variable with this name
				if (variables[propName]) continue;

				variables[propName] = propertyToTemplateVariable(
					propName,
					propValue as BaseProperty,
					sourcePort.id,
					sourceNode.id
				);
			}
		} else {
			// No schema or includePortName is true - use port name as the variable
			const variableName = includePortName ? targetPortId : targetPortId;

			// Skip if we already have a variable with this name
			if (variables[variableName]) continue;

			const variable = portToTemplateVariable(sourcePort, sourceNode.id);
			variable.name = variableName;
			variable.label = targetPort?.name ?? sourcePort.name;
			variables[variableName] = variable;
		}
	}

	return { variables };
}

/**
 * Gets the child variables for a given path in the variable schema.
 * Used for drilling down into nested objects and arrays.
 *
 * @param schema - The variable schema
 * @param path - The path to the parent variable (e.g., "user", "user.address")
 * @returns Array of child variables, or empty array if none found
 *
 * @example
 * ```typescript
 * // For path "user" with schema containing user.name, user.email, user.address
 * getChildVariables(schema, "user");
 * // Returns: [{ name: "name", ... }, { name: "email", ... }, { name: "address", ... }]
 *
 * // For path "user.address" with schema containing city, country
 * getChildVariables(schema, "user.address");
 * // Returns: [{ name: "city", ... }, { name: "country", ... }]
 * ```
 */
export function getChildVariables(schema: VariableSchema, path: string): TemplateVariable[] {
	const parts = path.split('.');
	let current: TemplateVariable | undefined;

	// Navigate to the target variable
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];

		// Handle array index access (e.g., "items[0]")
		const arrayMatch = part.match(/^(\w+)\[(\d+|\*)\]$/);
		if (arrayMatch) {
			const [, varName] = arrayMatch;
			if (i === 0) {
				current = schema.variables[varName];
			} else if (current?.properties) {
				current = current.properties[varName];
			}
			// After array access, move to items schema
			if (current?.items) {
				current = current.items;
			}
			continue;
		}

		// Regular property access
		if (i === 0) {
			current = schema.variables[part];
		} else if (current?.properties) {
			current = current.properties[part];
		} else {
			return [];
		}
	}

	// Return child properties if available
	if (current?.properties) {
		return Object.values(current.properties);
	}

	return [];
}

/**
 * Gets suggestions for array index access.
 * Returns common index options like [0], [1], [2], and [*] for all items.
 *
 * @param maxIndex - Maximum index to suggest (default: 2)
 * @returns Array of index suggestion strings
 */
export function getArrayIndexSuggestions(maxIndex: number = 2): string[] {
	const suggestions: string[] = [];

	for (let i = 0; i <= maxIndex; i++) {
		suggestions.push(`${i}]`);
	}

	// Add wildcard for "all items"
	suggestions.push('*]');

	return suggestions;
}

/**
 * Checks if a variable at the given path is an array.
 *
 * @param schema - The variable schema
 * @param path - The path to check (e.g., "items", "user.orders")
 * @returns True if the variable is an array type
 */
export function isArrayVariable(schema: VariableSchema, path: string): boolean {
	const parts = path.split('.');
	let current: TemplateVariable | undefined;

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];

		// Handle array index access
		const arrayMatch = part.match(/^(\w+)\[(\d+|\*)\]$/);
		if (arrayMatch) {
			const [, varName] = arrayMatch;
			if (i === 0) {
				current = schema.variables[varName];
			} else if (current?.properties) {
				current = current.properties[varName];
			}
			if (current?.items) {
				current = current.items;
			}
			continue;
		}

		if (i === 0) {
			current = schema.variables[part];
		} else if (current?.properties) {
			current = current.properties[part];
		} else {
			return false;
		}
	}

	return current?.type === 'array';
}

/**
 * Checks if a variable at the given path has child properties.
 *
 * @param schema - The variable schema
 * @param path - The path to check
 * @returns True if the variable has children that can be drilled into
 */
export function hasChildren(schema: VariableSchema, path: string): boolean {
	const children = getChildVariables(schema, path);
	return children.length > 0;
}

/**
 * Merges two variable schemas together.
 * Variables from the primary schema take precedence over the secondary schema.
 *
 * @param primary - The primary variable schema (takes precedence)
 * @param secondary - The secondary variable schema
 * @returns A merged VariableSchema
 *
 * @example
 * ```typescript
 * const apiSchema = { variables: { apiKey: {...}, endpoint: {...} } };
 * const staticSchema = { variables: { env: {...}, config: {...} } };
 * const merged = mergeVariableSchemas(apiSchema, staticSchema);
 * // Result: { variables: { apiKey, endpoint, env, config } }
 * ```
 */
export function mergeVariableSchemas(
	primary: VariableSchema,
	secondary: VariableSchema
): VariableSchema {
	// Create a shallow copy of secondary variables
	const mergedVariables = { ...secondary.variables };

	// Overlay primary variables (they take precedence)
	for (const [key, value] of Object.entries(primary.variables)) {
		mergedVariables[key] = value;
	}

	return { variables: mergedVariables };
}

/**
 * Gets variable schema using the appropriate mode (API, schema-based, or hybrid).
 * This is the main orchestration function that determines how to fetch variables
 * based on the configuration.
 *
 * @param node - The current node being configured
 * @param nodes - All nodes in the workflow
 * @param edges - All edges in the workflow
 * @param config - Template variables configuration
 * @param workflowId - Optional workflow ID for API context
 * @param authProvider - Optional auth provider for API requests
 * @returns A promise that resolves to the variable schema
 *
 * @example
 * ```typescript
 * // Schema-based mode (existing behavior)
 * const config = { ports: ["data"], schema: {...} };
 * const schema = await getVariableSchema(node, nodes, edges, config);
 *
 * // API mode
 * const config = { api: { endpoint: { url: "/api/variables/{workflowId}/{nodeId}" } } };
 * const schema = await getVariableSchema(node, nodes, edges, config, workflowId, authProvider);
 *
 * // Hybrid mode (API + static schema)
 * const config = {
 *   schema: {...},
 *   api: { endpoint: {...}, mergeWithSchema: true }
 * };
 * const schema = await getVariableSchema(node, nodes, edges, config, workflowId, authProvider);
 * ```
 */
export async function getVariableSchema(
	node: WorkflowNode,
	nodes: WorkflowNode[],
	edges: WorkflowEdge[],
	config: TemplateVariablesConfig,
	workflowId?: string,
	authProvider?: AuthProvider
): Promise<VariableSchema> {
	let resultSchema: VariableSchema = { variables: {} };

	// Try API mode first (if configured)
	if (config.api) {
		try {
			// Import API variable service dynamically to avoid circular dependencies
			const { fetchVariableSchema } = await import('./apiVariableService.js');

			const apiResult = await fetchVariableSchema(workflowId, node.id, config.api, authProvider);

			if (apiResult.success && apiResult.schema) {
				resultSchema = apiResult.schema;

				// Merge with static schema if configured
				if (config.api.mergeWithSchema !== false && config.schema) {
					resultSchema = mergeVariableSchemas(resultSchema, config.schema);
				}

				// Merge with port-derived variables if configured
				if (config.api.mergeWithPorts) {
					const portSchema = getAvailableVariables(node, nodes, edges, {
						targetPortIds: config.ports,
						includePortName: config.includePortName
					});
					resultSchema = mergeVariableSchemas(resultSchema, portSchema);
				}

				return resultSchema;
			} else if (!config.api.fallbackOnError) {
				// API failed and fallback is disabled - return empty schema
				console.error('Failed to fetch variables from API:', apiResult.error);
				return { variables: {} };
			}
			// If fallback is enabled (default), continue to schema-based mode below
		} catch (error) {
			console.error('Error fetching variables from API:', error);
			// If fallback is disabled, return empty schema
			if (config.api.fallbackOnError === false) {
				return { variables: {} };
			}
			// Otherwise, continue to schema-based mode below
		}
	}

	// Schema-based mode (existing behavior)
	// This is the fallback when API mode is not configured or fails

	// Start with port-derived variables (if ports are configured or no API mode)
	if (config.ports !== undefined || !config.api) {
		const portSchema = getAvailableVariables(node, nodes, edges, {
			targetPortIds: config.ports,
			includePortName: config.includePortName
		});
		resultSchema = portSchema;
	}

	// Merge with static schema (if configured)
	if (config.schema) {
		resultSchema = mergeVariableSchemas(config.schema, resultSchema);
	}

	return resultSchema;
}
