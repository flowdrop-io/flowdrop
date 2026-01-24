/**
 * Playground Service
 *
 * Handles API interactions for the Playground feature including
 * session management, message handling, and polling for updates.
 *
 * @module services/playgroundService
 */

import type {
	PlaygroundSession,
	PlaygroundMessage,
	PlaygroundMessageRequest,
	PlaygroundMessagesApiResponse,
	PlaygroundSessionResponse,
	PlaygroundSessionsResponse
} from '../types/playground.js';
import type { EndpointConfig } from '../config/endpoints.js';
import { buildEndpointUrl, getEndpointHeaders } from '../config/endpoints.js';
import { getEndpointConfig } from './api.js';

/**
 * Default polling interval in milliseconds
 */
const DEFAULT_POLLING_INTERVAL = 1500;

/**
 * Maximum polling backoff interval in milliseconds
 */
const MAX_POLLING_BACKOFF = 10000;

/**
 * Playground Service class
 *
 * Provides methods to interact with the playground API endpoints
 * including session management, message handling, and polling.
 */
export class PlaygroundService {
	private static instance: PlaygroundService;
	private pollingInterval: ReturnType<typeof setInterval> | null = null;
	private pollingSessionId: string | null = null;
	private currentBackoff: number = DEFAULT_POLLING_INTERVAL;
	private lastMessageTimestamp: string | null = null;

	private constructor() {}

	/**
	 * Get the singleton instance of PlaygroundService
	 *
	 * @returns The PlaygroundService singleton instance
	 */
	public static getInstance(): PlaygroundService {
		if (!PlaygroundService.instance) {
			PlaygroundService.instance = new PlaygroundService();
		}
		return PlaygroundService.instance;
	}

	/**
	 * Get the endpoint configuration
	 *
	 * @throws Error if endpoint configuration is not set
	 * @returns The endpoint configuration
	 */
	private getConfig(): EndpointConfig {
		const config = getEndpointConfig();
		if (!config) {
			throw new Error('Endpoint configuration not set. Call setEndpointConfig() first.');
		}
		return config;
	}

	/**
	 * Generic API request helper
	 *
	 * @param url - The URL to fetch
	 * @param options - Fetch options
	 * @returns The parsed JSON response
	 */
	private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
		const config = this.getConfig();
		const headers = getEndpointHeaders(config, 'playground');
		const response = await fetch(url, {
			...options,
			headers: {
				...headers,
				...options.headers
			}
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage =
				(errorData as { error?: string; message?: string }).error ||
				(errorData as { error?: string; message?: string }).message ||
				`HTTP ${response.status}: ${response.statusText}`;
			throw new Error(errorMessage);
		}
		return response.json();
	}

	// =========================================================================
	// Session Management
	// =========================================================================

	/**
	 * List all playground sessions for a workflow
	 *
	 * @param workflowId - The workflow UUID
	 * @param options - Optional pagination parameters
	 * @returns Array of playground sessions
	 */
	async listSessions(
		workflowId: string,
		options?: { limit?: number; offset?: number }
	): Promise<PlaygroundSession[]> {
		const config = this.getConfig();
		let url = buildEndpointUrl(config, config.endpoints.playground.listSessions, {
			id: workflowId
		});
		// Add query parameters
		const params = new URLSearchParams();
		if (options?.limit !== undefined) {
			params.append('limit', options.limit.toString());
		}
		if (options?.offset !== undefined) {
			params.append('offset', options.offset.toString());
		}
		const queryString = params.toString();
		if (queryString) {
			url = `${url}?${queryString}`;
		}

		const response = await this.request<PlaygroundSessionsResponse>(url);
		return response.data ?? [];
	}

	/**
	 * Create a new playground session
	 *
	 * @param workflowId - The workflow UUID
	 * @param name - Optional session name
	 * @param metadata - Optional session metadata
	 * @returns The created session
	 */
	async createSession(
		workflowId: string,
		name?: string,
		metadata?: Record<string, unknown>
	): Promise<PlaygroundSession> {
		const config = this.getConfig();
		const url = buildEndpointUrl(config, config.endpoints.playground.createSession, {
			id: workflowId
		});

		const response = await this.request<PlaygroundSessionResponse>(url, {
			method: 'POST',
			body: JSON.stringify({ name, metadata })
		});

		if (!response.data) {
			throw new Error('Failed to create session: No data returned');
		}

		return response.data;
	}

	/**
	 * Get a playground session by ID
	 *
	 * @param sessionId - The session UUID
	 * @returns The session details
	 */
	async getSession(sessionId: string): Promise<PlaygroundSession> {
		const config = this.getConfig();
		const url = buildEndpointUrl(config, config.endpoints.playground.getSession, {
			sessionId
		});

		const response = await this.request<PlaygroundSessionResponse>(url);

		if (!response.data) {
			throw new Error('Session not found');
		}

		return response.data;
	}

	/**
	 * Delete a playground session
	 *
	 * @param sessionId - The session UUID
	 */
	async deleteSession(sessionId: string): Promise<void> {
		const config = this.getConfig();
		const url = buildEndpointUrl(config, config.endpoints.playground.deleteSession, {
			sessionId
		});

		await this.request<{ success: boolean }>(url, {
			method: 'DELETE'
		});
	}

	// =========================================================================
	// Message Handling
	// =========================================================================

	/**
	 * Get messages from a playground session
	 *
	 * @param sessionId - The session UUID
	 * @param since - Optional timestamp to fetch only newer messages (ISO 8601)
	 * @param limit - Maximum number of messages to return
	 * @returns Messages and session status
	 */
	async getMessages(
		sessionId: string,
		since?: string,
		limit?: number
	): Promise<PlaygroundMessagesApiResponse> {
		const config = this.getConfig();
		let url = buildEndpointUrl(config, config.endpoints.playground.getMessages, {
			sessionId
		});

		// Add query parameters
		const params = new URLSearchParams();
		if (since) {
			params.append('since', since);
		}
		if (limit !== undefined) {
			params.append('limit', limit.toString());
		}
		const queryString = params.toString();
		if (queryString) {
			url = `${url}?${queryString}`;
		}

		return this.request<PlaygroundMessagesApiResponse>(url);
	}

	/**
	 * Send a message to a playground session
	 *
	 * @param sessionId - The session UUID
	 * @param content - The message content
	 * @param inputs - Optional additional inputs for workflow nodes
	 * @returns The created message
	 */
	async sendMessage(
		sessionId: string,
		content: string,
		inputs?: Record<string, unknown>
	): Promise<PlaygroundMessage> {
		const config = this.getConfig();
		const url = buildEndpointUrl(config, config.endpoints.playground.sendMessage, {
			sessionId
		});

		const requestBody: PlaygroundMessageRequest = { content };
		if (inputs) {
			requestBody.inputs = inputs;
		}

		const response = await this.request<{ success: boolean; data?: PlaygroundMessage }>(url, {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		if (!response.data) {
			throw new Error('Failed to send message: No data returned');
		}

		return response.data;
	}

	/**
	 * Stop execution in a playground session
	 *
	 * @param sessionId - The session UUID
	 */
	async stopExecution(sessionId: string): Promise<void> {
		const config = this.getConfig();
		const url = buildEndpointUrl(config, config.endpoints.playground.stopExecution, {
			sessionId
		});

		await this.request<{ success: boolean }>(url, {
			method: 'POST'
		});
	}

	// =========================================================================
	// Polling
	// =========================================================================

	/**
	 * Start polling for new messages
	 *
	 * @param sessionId - The session UUID to poll
	 * @param callback - Callback function to handle new messages
	 * @param interval - Polling interval in milliseconds (default: 1500)
	 */
	startPolling(
		sessionId: string,
		callback: (response: PlaygroundMessagesApiResponse) => void,
		interval: number = DEFAULT_POLLING_INTERVAL
	): void {
		// Stop any existing polling
		this.stopPolling();

		this.pollingSessionId = sessionId;
		this.currentBackoff = interval;
		this.lastMessageTimestamp = null;

		const poll = async () => {
			if (this.pollingSessionId !== sessionId) {
				return;
			}

			try {
				const response = await this.getMessages(sessionId, this.lastMessageTimestamp ?? undefined);

				// Update last message timestamp
				if (response.data && response.data.length > 0) {
					const lastMessage = response.data[response.data.length - 1];
					this.lastMessageTimestamp = lastMessage.timestamp;
				}

				// Reset backoff on successful request
				this.currentBackoff = interval;

			// Call the callback with new messages
			callback(response);

			// Stop polling if session is idle, completed, or failed
			// "idle" means no processing is happening (execution finished)
			if (
				response.sessionStatus === 'idle' ||
				response.sessionStatus === 'completed' ||
				response.sessionStatus === 'failed'
			) {
				this.stopPolling();
				return;
			}
			} catch (error) {
				console.error('Polling error:', error);

				// Exponential backoff on error
				this.currentBackoff = Math.min(this.currentBackoff * 2, MAX_POLLING_BACKOFF);
			}

			// Schedule next poll
			if (this.pollingSessionId === sessionId) {
				this.pollingInterval = setTimeout(poll, this.currentBackoff);
			}
		};

		// Start polling immediately
		poll();
	}

	/**
	 * Stop polling for messages
	 */
	stopPolling(): void {
		if (this.pollingInterval) {
			clearTimeout(this.pollingInterval);
			this.pollingInterval = null;
		}
		this.pollingSessionId = null;
		this.lastMessageTimestamp = null;
		this.currentBackoff = DEFAULT_POLLING_INTERVAL;
	}

	/**
	 * Check if polling is active
	 *
	 * @returns True if polling is active
	 */
	isPolling(): boolean {
		return this.pollingSessionId !== null;
	}

	/**
	 * Get the current polling session ID
	 *
	 * @returns The session ID being polled, or null
	 */
	getPollingSessionId(): string | null {
		return this.pollingSessionId;
	}
}

/**
 * Export singleton instance
 */
export const playgroundService = PlaygroundService.getInstance();
