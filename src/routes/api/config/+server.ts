import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Runtime Configuration API Endpoint
 *
 * This endpoint serves runtime configuration from environment variables.
 * This allows the application to be built once and deployed to different
 * environments without rebuilding.
 */

export interface RuntimeConfig {
	/** Base URL for the FlowDrop API */
	apiBaseUrl: string;
	/** Theme preference */
	theme: "light" | "dark" | "auto";
	/** Request timeout in milliseconds */
	timeout: number;
	/** Authentication type */
	authType: "none" | "bearer" | "api_key" | "custom";
	/** Authentication token (only exposed if explicitly configured) */
	authToken?: string;
	/** Application version */
	version: string;
	/** Environment name */
	environment: string;
}

/**
 * GET /api/config
 * Returns runtime configuration from environment variables
 */
export const GET: RequestHandler = async () => {
	// Read environment variables from the server
	const config: RuntimeConfig = {
		apiBaseUrl:
			process.env.FLOWDROP_API_BASE_URL ||
			process.env.API_BASE_URL ||
			"/api/flowdrop",
		theme:
			(process.env.FLOWDROP_THEME as "light" | "dark" | "auto") || "auto",
		timeout: process.env.FLOWDROP_TIMEOUT
			? parseInt(process.env.FLOWDROP_TIMEOUT, 10)
			: 30000,
		authType:
			(process.env.FLOWDROP_AUTH_TYPE as "none" | "bearer" | "api_key" | "custom") ||
			"none",
		authToken: process.env.FLOWDROP_AUTH_TOKEN || undefined,
		version: process.env.FLOWDROP_VERSION || "1.0.0",
		environment: process.env.NODE_ENV || "production",
	};

	// Return config with appropriate caching headers
	return json(config, {
		headers: {
			// Cache for 5 minutes in production
			"Cache-Control": process.env.NODE_ENV === "production"
				? "public, max-age=300"
				: "no-cache, no-store, must-revalidate",
		},
	});
};

