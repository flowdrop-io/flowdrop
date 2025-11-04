import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
import type { PortConfig, ApiResponse } from '$lib/types/index.js';

/**
 * Set CORS headers for API responses
 */
function setCorsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
		'X-Content-Type-Options': 'nosniff',
		'X-Frame-Options': 'DENY',
		'X-XSS-Protection': '1; mode=block'
	};
}

/**
 * GET /api/flowdrop/port-config
 * Fetch port configuration for FlowDrop system
 * Returns data types, compatibility rules, and default settings
 */
export const GET: RequestHandler = async () => {
	try {
		// For now, return the default port configuration
		// In a real implementation, this could fetch from a database or external service
		const portConfig: PortConfig = DEFAULT_PORT_CONFIG;

		const response: ApiResponse<PortConfig> = {
			success: true,
			data: portConfig,
			message: 'Port configuration loaded successfully'
		};

		return json(response, {
			headers: setCorsHeaders()
		});
	} catch (error) {
		console.error('Error fetching port configuration:', error);

		const errorResponse: ApiResponse<PortConfig> = {
			success: false,
			error: 'Failed to fetch port configuration',
			message: error instanceof Error ? error.message : 'Unknown error occurred'
		};

		return json(errorResponse, {
			status: 500,
			headers: setCorsHeaders()
		});
	}
};

/**
 * OPTIONS /api/flowdrop/port-config
 * Handle CORS preflight requests
 */
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: setCorsHeaders()
	});
};
