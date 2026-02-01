/**
 * Settings Service for FlowDrop
 *
 * Provides API operations for user preferences/settings using the
 * configurable endpoint system. Integrates with settingsStore for
 * hybrid localStorage + API persistence.
 *
 * @module services/settingsService
 */

import type { FlowDropSettings, PartialSettings } from '$lib/types/settings.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';
import type { ApiResponse } from '$lib/types/index.js';
import { buildEndpointUrl, getEndpointHeaders } from '$lib/config/endpoints.js';

// =========================================================================
// Configuration
// =========================================================================

/**
 * Endpoint configuration reference
 */
let endpointConfig: EndpointConfig | null = null;

/**
 * Set the endpoint configuration for settings API calls
 *
 * @param config - Endpoint configuration
 */
export function setSettingsEndpointConfig(config: EndpointConfig): void {
	endpointConfig = config;
}

/**
 * Get the current endpoint configuration
 *
 * @returns Current endpoint configuration or null
 */
export function getSettingsEndpointConfig(): EndpointConfig | null {
	return endpointConfig;
}

// =========================================================================
// API Request Helper
// =========================================================================

/**
 * Make an API request for settings operations
 *
 * @param endpointKey - Key for headers lookup
 * @param endpointPath - Path to the endpoint
 * @param options - Additional fetch options
 * @returns Parsed response data
 */
async function settingsRequest<T>(
	endpointKey: string,
	endpointPath: string,
	options: RequestInit = {}
): Promise<ApiResponse<T>> {
	if (!endpointConfig) {
		throw new Error('Endpoint configuration not set. Call setSettingsEndpointConfig() first.');
	}

	const url = buildEndpointUrl(endpointConfig, endpointPath);
	const headers = getEndpointHeaders(endpointConfig, endpointKey);

	const response = await fetch(url, {
		headers,
		...options
	});

	// Check if response is JSON
	const contentType = response.headers.get('content-type');
	const isJson = contentType?.includes('application/json');

	if (!response.ok) {
		let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

		if (isJson) {
			try {
				const data = (await response.json()) as { error?: string; message?: string };
				errorMessage = data.error ?? data.message ?? errorMessage;
			} catch {
				// Failed to parse JSON, use default error message
			}
		}

		throw new Error(errorMessage);
	}

	// Parse successful response
	const data = (await response.json()) as ApiResponse<T>;
	return data;
}

// =========================================================================
// Settings API Methods
// =========================================================================

/**
 * Settings API namespace
 */
export const settingsApi = {
	/**
	 * Get user preferences from the backend
	 *
	 * @returns User's saved preferences
	 */
	async getPreferences(): Promise<FlowDropSettings> {
		if (!endpointConfig) {
			throw new Error('Endpoint configuration not set');
		}

		const response = await settingsRequest<FlowDropSettings>(
			'users.preferences',
			endpointConfig.endpoints.users.preferences,
			{ method: 'GET' }
		);

		if (!response.success || !response.data) {
			throw new Error(
				typeof response.error === 'string' ? response.error : 'Failed to fetch user preferences'
			);
		}

		return response.data;
	},

	/**
	 * Save user preferences to the backend
	 *
	 * @param settings - Complete settings to save
	 */
	async savePreferences(settings: FlowDropSettings): Promise<void> {
		if (!endpointConfig) {
			throw new Error('Endpoint configuration not set');
		}

		const response = await settingsRequest<void>(
			'users.preferences',
			endpointConfig.endpoints.users.preferences,
			{
				method: 'PUT',
				body: JSON.stringify(settings)
			}
		);

		if (!response.success) {
			throw new Error(
				typeof response.error === 'string' ? response.error : 'Failed to save user preferences'
			);
		}
	},

	/**
	 * Partially update user preferences
	 *
	 * @param partial - Partial settings to merge
	 */
	async patchPreferences(partial: PartialSettings): Promise<FlowDropSettings> {
		if (!endpointConfig) {
			throw new Error('Endpoint configuration not set');
		}

		const response = await settingsRequest<FlowDropSettings>(
			'users.preferences',
			endpointConfig.endpoints.users.preferences,
			{
				method: 'PATCH',
				body: JSON.stringify(partial)
			}
		);

		if (!response.success || !response.data) {
			throw new Error(
				typeof response.error === 'string' ? response.error : 'Failed to update user preferences'
			);
		}

		return response.data;
	}
};

// =========================================================================
// Settings Service Class (for settingsStore integration)
// =========================================================================

/**
 * Settings service class for integration with settingsStore
 *
 * @example
 * ```typescript
 * import { SettingsService } from "@d34dman/flowdrop";
 * import { setSettingsService } from "@d34dman/flowdrop";
 *
 * const service = new SettingsService(endpointConfig);
 * setSettingsService(service);
 * ```
 */
export class SettingsService {
	private config: EndpointConfig;

	/**
	 * Create a new settings service instance
	 *
	 * @param config - Endpoint configuration
	 */
	constructor(config: EndpointConfig) {
		this.config = config;
		// Also set the module-level config
		setSettingsEndpointConfig(config);
	}

	/**
	 * Get user preferences from the backend
	 *
	 * @returns User's saved preferences
	 */
	async getPreferences(): Promise<FlowDropSettings> {
		return settingsApi.getPreferences();
	}

	/**
	 * Save user preferences to the backend
	 *
	 * @param settings - Complete settings to save
	 */
	async savePreferences(settings: FlowDropSettings): Promise<void> {
		return settingsApi.savePreferences(settings);
	}

	/**
	 * Partially update user preferences
	 *
	 * @param partial - Partial settings to merge
	 */
	async patchPreferences(partial: PartialSettings): Promise<FlowDropSettings> {
		return settingsApi.patchPreferences(partial);
	}
}

// =========================================================================
// Factory Function
// =========================================================================

/**
 * Create a settings service instance
 *
 * @param config - Endpoint configuration
 * @returns SettingsService instance
 */
export function createSettingsService(config: EndpointConfig): SettingsService {
	return new SettingsService(config);
}
