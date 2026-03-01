/**
 * Library-wide Constants
 *
 * Centralizes magic numbers and default configuration values
 * used across FlowDrop services.
 *
 * @module config/constants
 */

/** Default API request timeout in milliseconds */
export const DEFAULT_API_TIMEOUT_MS = 30_000;

/** Cache timeout for node execution data in milliseconds */
export const NODE_EXECUTION_CACHE_TIMEOUT_MS = 30_000;

/** Duration to mark pipeline API as unavailable after 404 (milliseconds) */
export const PIPELINE_API_UNAVAILABLE_DURATION_MS = 5 * 60 * 1000;

/** Toast notification durations in milliseconds */
export const TOAST_DURATION = {
	SUCCESS: 4_000,
	ERROR: 6_000,
	WARNING: 5_000,
	INFO: 4_000,
	CONFIRMATION: 5_000
} as const;
