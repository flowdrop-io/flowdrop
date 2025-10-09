import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getWorkflow, updateWorkflow, deleteWorkflow } from '$lib/services/workflowStorage.js';
import type { Workflow, ApiResponse } from '$lib/types/index.js';

/**
 * Validate workflow ID (UUID v4 format)
 */
function validateWorkflowId(workflowId: string): boolean {
	// Check if workflowId is a valid UUID v4
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return typeof workflowId === 'string' && workflowId.length === 36 && uuidRegex.test(workflowId);
}

/**
 * Validate workflow update data
 */
function validateWorkflowUpdateData(data: unknown): { isValid: boolean; error?: string } {
	if (!data || typeof data !== 'object') {
		return { isValid: false, error: 'Invalid request body' };
	}

	const obj = data as Record<string, unknown>;

	if (obj.name !== undefined) {
		if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
			return { isValid: false, error: 'Workflow name cannot be empty' };
		}

		if (obj.name.length > 200) {
			return { isValid: false, error: 'Workflow name too long (max 200 characters)' };
		}
	}

	if (
		obj.description !== undefined &&
		(typeof obj.description !== 'string' || obj.description.length > 1000)
	) {
		return { isValid: false, error: 'Workflow description too long (max 1000 characters)' };
	}

	const metadata = obj.metadata as Record<string, unknown> | undefined;

	if (
		metadata?.author !== undefined &&
		(typeof metadata.author !== 'string' || metadata.author.length > 100)
	) {
		return { isValid: false, error: 'Author name too long (max 100 characters)' };
	}

	if (metadata?.tags !== undefined) {
		if (!Array.isArray(metadata.tags) || metadata.tags.length > 20) {
			return { isValid: false, error: 'Too many tags (max 20)' };
		}

		if (metadata.tags.some((tag: unknown) => typeof tag !== 'string' || tag.length > 50)) {
			return { isValid: false, error: 'Invalid tag format' };
		}
	}

	return { isValid: true };
}

/**
 * Set CORS headers for API responses
 */
function setCorsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Cache-Control': 'no-cache, no-store, must-revalidate',
		'X-Content-Type-Options': 'nosniff',
		'X-Frame-Options': 'DENY',
		'X-XSS-Protection': '1; mode=block'
	};
}

/**
 * GET /api/workflows/{id}
 * Get a specific workflow by ID
 * Strictly server-side with validation and security headers
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const workflowId = params.id;

		// Validate workflow ID
		if (!workflowId || !validateWorkflowId(workflowId)) {
			return json(
				{
					success: false,
					error: 'Invalid workflow ID'
				},
				{
					status: 400,
					headers: setCorsHeaders()
				}
			);
		}

		const workflow = await getWorkflow(workflowId);

		if (!workflow) {
			return json(
				{
					success: false,
					error: 'Workflow not found'
				},
				{
					status: 404,
					headers: setCorsHeaders()
				}
			);
		}

		const response: ApiResponse<Workflow> = {
			success: true,
			data: workflow
		};

		return json(response, { headers: setCorsHeaders() });
	} catch (error) {
		console.error('Error fetching workflow:', error);

		const errorResponse: ApiResponse<Workflow> = {
			success: false,
			error: 'Failed to fetch workflow',
			message: error instanceof Error ? error.message : 'Unknown error occurred'
		};

		return json(errorResponse, {
			status: 500,
			headers: setCorsHeaders()
		});
	}
};

/**
 * PUT /api/workflows/{id}
 * Update an existing workflow
 * Strictly server-side with validation and security headers
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const workflowId = params.id;

		// Validate workflow ID
		if (!workflowId || !validateWorkflowId(workflowId)) {
			return json(
				{
					success: false,
					error: 'Invalid workflow ID'
				},
				{
					status: 400,
					headers: setCorsHeaders()
				}
			);
		}

		const body = await request.json();

		// Validate workflow update data
		const validation = validateWorkflowUpdateData(body);
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

		// Update workflow data with sanitization
		const updateData: Partial<Workflow> = {
			name: body.name?.trim(),
			description: body.description?.trim(),
			nodes: Array.isArray(body.nodes) ? body.nodes : undefined,
			edges: Array.isArray(body.edges) ? body.edges : undefined,
			metadata: {
				version: body.metadata?.version || '1.0.0',
				createdAt: body.metadata?.createdAt || new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				author: body.metadata?.author?.trim(),
				tags: Array.isArray(body.metadata?.tags)
					? body.metadata.tags.filter((tag: string) => tag.trim().length > 0)
					: undefined
			}
		};

		const updatedWorkflow = await updateWorkflow(workflowId, updateData);

		if (!updatedWorkflow) {
			return json(
				{
					success: false,
					error: 'Workflow not found'
				},
				{
					status: 404,
					headers: setCorsHeaders()
				}
			);
		}

		const response: ApiResponse<Workflow> = {
			success: true,
			data: updatedWorkflow,
			message: 'Workflow updated successfully'
		};

		return json(response, { headers: setCorsHeaders() });
	} catch (error) {
		console.error('Error updating workflow:', error);

		const errorResponse: ApiResponse<Workflow> = {
			success: false,
			error: 'Failed to update workflow',
			message: error instanceof Error ? error.message : 'Unknown error occurred'
		};

		return json(errorResponse, {
			status: 500,
			headers: setCorsHeaders()
		});
	}
};

/**
 * DELETE /api/workflows/{id}
 * Delete a workflow
 * Strictly server-side with validation and security headers
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const workflowId = params.id;

		// Validate workflow ID
		if (!workflowId || !validateWorkflowId(workflowId)) {
			return json(
				{
					success: false,
					error: 'Invalid workflow ID'
				},
				{
					status: 400,
					headers: setCorsHeaders()
				}
			);
		}

		const deleted = await deleteWorkflow(workflowId);

		if (!deleted) {
			return json(
				{
					success: false,
					error: 'Workflow not found'
				},
				{
					status: 404,
					headers: setCorsHeaders()
				}
			);
		}

		const response: ApiResponse<null> = {
			success: true,
			data: null,
			message: 'Workflow deleted successfully'
		};

		return json(response, { headers: setCorsHeaders() });
	} catch (error) {
		console.error('Error deleting workflow:', error);

		const errorResponse: ApiResponse<null> = {
			success: false,
			error: 'Failed to delete workflow',
			message: error instanceof Error ? error.message : 'Unknown error occurred'
		};

		return json(errorResponse, {
			status: 500,
			headers: setCorsHeaders()
		});
	}
};

/**
 * OPTIONS /api/workflows/{id}
 * Handle CORS preflight requests
 */
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: setCorsHeaders()
	});
};
