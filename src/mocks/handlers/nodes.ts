/**
 * MSW handlers for Node Types API endpoints
 * Implements GET /api/flowdrop/nodes and GET /api/flowdrop/nodes/:id
 */

import { http, HttpResponse } from 'msw';
import { mockNodes, getNodesByCategory, searchNodes, getNodeById } from '../data/nodes.js';
import type { NodeMetadata, NodesResponse, ApiResponse } from '../../lib/types/index.js';

/** Response type for single node */
type NodeTypeResponse = ApiResponse<NodeMetadata>;

/** Base API path for flowdrop endpoints */
const API_BASE = '/api/flowdrop';

/**
 * Valid node categories for filtering
 */
const VALID_CATEGORIES = [
	'ai',
	'models',
	'inputs',
	'outputs',
	'prompts',
	'processing',
	'logic',
	'data',
	'helpers',
	'tools',
	'vector_store',
	'embeddings',
	'memories',
	'agents',
	'control',
	'content',
	'integrations',
	'ui',
	'flowdrop_node_test'
];

/**
 * GET /api/flowdrop/nodes
 * Retrieve all available node types with optional filtering and pagination
 */
export const getNodesHandler = http.get(`${API_BASE}/nodes`, ({ request }) => {
	const url = new URL(request.url);

	// Parse query parameters
	const category = url.searchParams.get('category');
	const search = url.searchParams.get('search');
	let limit = parseInt(url.searchParams.get('limit') || '100');
	let offset = parseInt(url.searchParams.get('offset') || '0');

	// Validate limit and offset
	if (isNaN(limit) || limit < 1 || limit > 1000) {
		limit = 100;
	}
	if (isNaN(offset) || offset < 0) {
		offset = 0;
	}

	// Start with all mock nodes
	let filteredNodes: NodeMetadata[] = [...mockNodes];

	// Filter by category if specified and valid
	if (category && VALID_CATEGORIES.includes(category)) {
		filteredNodes = getNodesByCategory(category);
	}

	// Filter by search query if specified
	if (search && search.trim()) {
		const searchQuery = search.toLowerCase().slice(0, 100);
		filteredNodes = filteredNodes.filter(
			(node) =>
				node.name.toLowerCase().includes(searchQuery) ||
				node.description.toLowerCase().includes(searchQuery) ||
				node.tags?.some((tag) => tag.toLowerCase().includes(searchQuery))
		);
	}

	// Apply pagination
	const totalCount = filteredNodes.length;
	const paginatedNodes = filteredNodes.slice(offset, offset + limit);

	const response: NodesResponse = {
		success: true,
		data: paginatedNodes,
		message: `Found ${paginatedNodes.length} node types`
	};

	return HttpResponse.json(response, {
		headers: {
			'X-Total-Count': totalCount.toString(),
			'X-Page-Size': limit.toString(),
			'X-Page-Offset': offset.toString(),
			'Content-Type': 'application/json'
		}
	});
});

/**
 * GET /api/flowdrop/nodes/:id
 * Retrieve a specific node type by ID
 */
export const getNodeByIdHandler = http.get(`${API_BASE}/nodes/:id`, ({ params }) => {
	const { id } = params;
	const nodeId = Array.isArray(id) ? id[0] : id;

	// Find the node using the helper function
	const node = getNodeById(nodeId);

	if (!node) {
		return HttpResponse.json(
			{
				success: false,
				error: 'Node type not found',
				code: 'NOT_FOUND'
			} as NodeTypeResponse,
			{ status: 404 }
		);
	}

	const response: NodeTypeResponse = {
		success: true,
		data: node,
		message: `Node type "${node.name}" retrieved successfully`
	};

	return HttpResponse.json(response);
});

/**
 * OPTIONS /api/flowdrop/nodes
 * Handle CORS preflight requests
 */
export const nodesOptionsHandler = http.options(`${API_BASE}/nodes`, () => {
	return new HttpResponse(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization'
		}
	});
});

/**
 * Export all node handlers
 */
export const nodeHandlers = [getNodesHandler, getNodeByIdHandler, nodesOptionsHandler];
