import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import {
	saveWorkflow,
	getWorkflows,
	getWorkflowCount,
	initializeSampleWorkflows
} from '$lib/services/workflowStorage.js';
import type { Workflow, WorkflowsResponse, ApiResponse } from '$lib/types/index.js';

/**
 * Validate and sanitize query parameters
 */
function validateQueryParams(searchParams: URLSearchParams): {
	search?: string;
	limit: number;
	offset: number;
} {
	const search = searchParams.get('search');

	// Validate limit
	let limit = parseInt(searchParams.get('limit') || '50');
	if (isNaN(limit) || limit < 1 || limit > 100) {
		limit = 50;
	}

	// Validate offset
	let offset = parseInt(searchParams.get('offset') || '0');
	if (isNaN(offset) || offset < 0) {
		offset = 0;
	}

	// Sanitize search query
	const sanitizedSearch = search ? search.trim().slice(0, 100) : undefined;

	return {
		search: sanitizedSearch,
		limit,
		offset
	};
}

/**
 * Validate workflow data for creation
 */
function validateWorkflowData(data: unknown): { isValid: boolean; error?: string } {
	if (!data || typeof data !== 'object') {
		return { isValid: false, error: 'Invalid request body' };
	}

	const obj = data as Record<string, unknown>;

	if (!obj.name || typeof obj.name !== 'string' || obj.name.trim().length === 0) {
		return { isValid: false, error: 'Workflow name is required' };
	}

	if (obj.name.length > 200) {
		return { isValid: false, error: 'Workflow name too long (max 200 characters)' };
	}

	if (obj.description && (typeof obj.description !== 'string' || obj.description.length > 1000)) {
		return { isValid: false, error: 'Workflow description too long (max 1000 characters)' };
	}

	if (obj.author && (typeof obj.author !== 'string' || obj.author.length > 100)) {
		return { isValid: false, error: 'Author name too long (max 100 characters)' };
	}

	if (obj.tags && (!Array.isArray(obj.tags) || obj.tags.length > 20)) {
		return { isValid: false, error: 'Too many tags (max 20)' };
	}

	if (
		obj.tags &&
		Array.isArray(obj.tags) &&
		obj.tags.some((tag: unknown) => typeof tag !== 'string' || tag.length > 50)
	) {
		return { isValid: false, error: 'Invalid tag format' };
	}

	return { isValid: true };
}

/**
 * Set CORS headers for API responses
 */
function setCorsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Cache-Control': 'no-cache, no-store, must-revalidate',
		'X-Content-Type-Options': 'nosniff',
		'X-Frame-Options': 'DENY',
		'X-XSS-Protection': '1; mode=block'
	};
}

/**
 * GET /api/workflows
 * List all workflows with optional filtering and pagination
 * Strictly server-side with validation and security headers
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		// Validate and sanitize query parameters
		const { search, limit, offset } = validateQueryParams(url.searchParams);

		// Initialize sample workflows if none exist
		await initializeSampleWorkflows();

		// Get workflows with filtering
		const workflows = await getWorkflows({
			search: search || undefined,
			limit,
			offset
		});

		const totalCount = await getWorkflowCount();

		const response: WorkflowsResponse = {
			success: true,
			data: workflows,
			message: `Found ${workflows.length} workflows`
		};

		// Add pagination metadata to headers
		const headers = {
			'X-Total-Count': totalCount.toString(),
			'X-Page-Size': limit.toString(),
			'X-Page-Offset': offset.toString(),
			...setCorsHeaders()
		};

		return json(response, { headers });
	} catch (error) {
		console.error('Error fetching workflows:', error);

		const errorResponse: WorkflowsResponse = {
			success: false,
			error: 'Failed to fetch workflows',
			message: error instanceof Error ? error.message : 'Unknown error occurred'
		};

		return json(errorResponse, {
			status: 500,
			headers: setCorsHeaders()
		});
	}
};

/**
 * POST /api/workflows
 * Create a new workflow
 * Strictly server-side with validation and security headers
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate workflow data
		const validation = validateWorkflowData(body);
		if (!validation.isValid) {
			return json(
				{
					success: false,
					error: validation.error
				},
				{
					status: 400,
					headers: setCorsHeaders()
				}
			);
		}

		// Create workflow data
		const workflowData: Omit<Workflow, 'id'> = {
			name: body.name.trim(),
			description: body.description?.trim() || '',
			nodes: Array.isArray(body.nodes) ? body.nodes : [],
			edges: Array.isArray(body.edges) ? body.edges : [],
			metadata: {
				version: '1.0.0',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				author: body.author?.trim(),
				tags: Array.isArray(body.tags)
					? body.tags.filter((tag: string) => tag.trim().length > 0)
					: []
			}
		};

		const newWorkflow = await saveWorkflow(workflowData);

		const response: ApiResponse<Workflow> = {
			success: true,
			data: newWorkflow,
			message: 'Workflow created successfully'
		};

		return json(response, {
			status: 201,
			headers: setCorsHeaders()
		});
	} catch (error) {
		console.error('Error creating workflow:', error);

		const errorResponse: ApiResponse<Workflow> = {
			success: false,
			error: 'Failed to create workflow',
			message: error instanceof Error ? error.message : 'Unknown error occurred'
		};

		return json(errorResponse, {
			status: 500,
			headers: setCorsHeaders()
		});
	}
};

/**
 * OPTIONS /api/workflows
 * Handle CORS preflight requests
 */
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: setCorsHeaders()
	});
};
