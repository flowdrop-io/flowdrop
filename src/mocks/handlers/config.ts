/**
 * MSW handlers for Configuration API endpoints
 * Implements port configuration and health check
 */

import { http, HttpResponse } from "msw";
import { DEFAULT_PORT_CONFIG } from "../../lib/config/defaultPortConfig.js";
import type { ApiResponse, PortConfig } from "../../lib/types/index.js";

/** Response type for port configuration */
type PortConfigResponse = ApiResponse<PortConfig>;

/** Base API path for flowdrop endpoints */
const API_BASE = "/api/flowdrop";

/** Store the start time for uptime calculation */
const startTime = Date.now();

/**
 * GET /api/config
 * Runtime configuration endpoint (replaces server-side route)
 */
export const runtimeConfigHandler = http.get("/api/config", () => {
	return HttpResponse.json({
		apiBaseUrl: "/api/flowdrop",
		theme: "auto",
		timeout: 30000,
		authType: "none",
		version: "1.0.0",
		environment: "development"
	});
});

/**
 * GET /api/flowdrop/health
 * API health check endpoint
 */
export const healthCheckHandler = http.get(`${API_BASE}/health`, () => {
	const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
	return HttpResponse.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
		version: "1.0.0",
		service: "FlowDrop Mock API",
		uptime: uptimeSeconds
	});
});

/**
 * GET /api/flowdrop/port-config
 * Retrieve port configuration for node connections
 */
export const getPortConfigHandler = http.get(`${API_BASE}/port-config`, () => {
	const response: PortConfigResponse = {
		success: true,
		data: DEFAULT_PORT_CONFIG,
		message: "Port configuration loaded successfully"
	};

	return HttpResponse.json(response);
});

/**
 * OPTIONS handlers for CORS preflight
 */
export const healthOptionsHandler = http.options(`${API_BASE}/health`, () => {
	return new HttpResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization"
		}
	});
});

export const portConfigOptionsHandler = http.options(`${API_BASE}/port-config`, () => {
	return new HttpResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization"
		}
	});
});

/**
 * Export all config handlers
 */
export const configHandlers = [
	runtimeConfigHandler,
	healthCheckHandler,
	getPortConfigHandler,
	healthOptionsHandler,
	portConfigOptionsHandler
];

