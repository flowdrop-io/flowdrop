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
  PlaygroundSessionsResponse,
  PlaygroundSessionStatus
} from '../types/playground.js';
import { defaultShouldStopPolling } from '../types/playground.js';
import type { EndpointConfig } from '../config/endpoints.js';
import { buildEndpointUrl } from '../config/endpoints.js';
import { authenticatedFetch } from '../utils/fetchWithAuth.js';
import type { AuthProvider } from '../types/auth.js';
import { logger } from '../utils/logger.js';

/**
 * Pagination options for {@link PlaygroundService.getMessages}.
 * `since`, `before`, and `latest` are mutually exclusive.
 */
export interface GetMessagesOptions {
  /** Forward cursor — only messages with sequenceNumber greater than this value */
  since?: number;
  /** Backward cursor — the page of messages immediately older than this sequence number */
  before?: number;
  /** Return the most recent `limit` messages (conversation tail) */
  latest?: boolean;
  /** Maximum number of messages to return */
  limit?: number;
}

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
  private lastSequenceNumber: number | null = null;

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
   * Validate and return the endpoint configuration passed by the caller.
   *
   * Callers thread the config from `getInstance().api.config`; this enforces
   * the legacy "throws if not configured" contract.
   *
   * @throws Error if endpoint configuration is not set
   * @returns The endpoint configuration
   */
  private getConfig(config: EndpointConfig | null): EndpointConfig {
    if (!config) {
      throw new Error(
        'Endpoint configuration not set. Configure the instance via fd.api.configure().'
      );
    }
    return config;
  }

  /**
   * Generic API request helper
   *
   * @param config - The endpoint configuration
   * @param url - The URL to fetch
   * @param options - Fetch options
   * @returns The parsed JSON response
   */
  private async request<T>(
    config: EndpointConfig,
    url: string,
    options: RequestInit = {},
    authProvider?: AuthProvider
  ): Promise<T> {
    const response = await authenticatedFetch(url, options, {
      config,
      endpointKey: 'playground',
      authProvider
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
    endpointConfig: EndpointConfig | null,
    workflowId: string,
    options?: { limit?: number; offset?: number },
    authProvider?: AuthProvider
  ): Promise<PlaygroundSession[]> {
    const config = this.getConfig(endpointConfig);
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

    const response = await this.request<PlaygroundSessionsResponse>(config, url, {}, authProvider);
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
    endpointConfig: EndpointConfig | null,
    workflowId: string,
    name?: string,
    metadata?: Record<string, unknown>,
    authProvider?: AuthProvider
  ): Promise<PlaygroundSession> {
    const config = this.getConfig(endpointConfig);
    const url = buildEndpointUrl(config, config.endpoints.playground.createSession, {
      id: workflowId
    });

    const response = await this.request<PlaygroundSessionResponse>(
      config,
      url,
      {
        method: 'POST',
        body: JSON.stringify({ name, metadata })
      },
      authProvider
    );

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
  async getSession(
    endpointConfig: EndpointConfig | null,
    sessionId: string,
    authProvider?: AuthProvider
  ): Promise<PlaygroundSession> {
    const config = this.getConfig(endpointConfig);
    const url = buildEndpointUrl(config, config.endpoints.playground.getSession, {
      sessionId
    });

    const response = await this.request<PlaygroundSessionResponse>(config, url, {}, authProvider);

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
  async deleteSession(
    endpointConfig: EndpointConfig | null,
    sessionId: string,
    authProvider?: AuthProvider
  ): Promise<void> {
    const config = this.getConfig(endpointConfig);
    const url = buildEndpointUrl(config, config.endpoints.playground.deleteSession, {
      sessionId
    });

    await this.request<{ success: boolean }>(
      config,
      url,
      {
        method: 'DELETE'
      },
      authProvider
    );
  }

  // =========================================================================
  // Message Handling
  // =========================================================================

  /**
   * Get messages from a playground session.
   *
   * Three pagination modes (see the OpenAPI spec for the contract):
   *  - `since`: forward cursor, returns messages with sequenceNumber > value (polling the live tail)
   *  - `before`: backward cursor, returns the page immediately older than the value (scroll-up)
   *  - `latest`: returns the most recent `limit` messages (initial load)
   * `since`, `before`, and `latest` are mutually exclusive.
   *
   * @param sessionId - The session UUID
   * @param options - Pagination options
   * @returns Messages and session status
   */
  async getMessages(
    endpointConfig: EndpointConfig | null,
    sessionId: string,
    options: GetMessagesOptions = {},
    authProvider?: AuthProvider
  ): Promise<PlaygroundMessagesApiResponse> {
    const config = this.getConfig(endpointConfig);
    let url = buildEndpointUrl(config, config.endpoints.playground.getMessages, {
      sessionId
    });

    const params = new URLSearchParams();
    if (options.since !== undefined) {
      params.append('since', options.since.toString());
    }
    if (options.before !== undefined) {
      params.append('before', options.before.toString());
    }
    if (options.latest) {
      params.append('latest', 'true');
    }
    if (options.limit !== undefined) {
      params.append('limit', options.limit.toString());
    }
    const queryString = params.toString();
    if (queryString) {
      url = `${url}?${queryString}`;
    }

    return this.request<PlaygroundMessagesApiResponse>(config, url, {}, authProvider);
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
    endpointConfig: EndpointConfig | null,
    sessionId: string,
    content: string,
    inputs?: Record<string, unknown>,
    authProvider?: AuthProvider
  ): Promise<PlaygroundMessage> {
    const config = this.getConfig(endpointConfig);
    const url = buildEndpointUrl(config, config.endpoints.playground.sendMessage, {
      sessionId
    });

    const requestBody: PlaygroundMessageRequest = { content };
    if (inputs) {
      requestBody.inputs = inputs;
    }

    const response = await this.request<{
      success: boolean;
      data?: PlaygroundMessage;
    }>(
      config,
      url,
      {
        method: 'POST',
        body: JSON.stringify(requestBody)
      },
      authProvider
    );

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
  async stopExecution(
    endpointConfig: EndpointConfig | null,
    sessionId: string,
    authProvider?: AuthProvider
  ): Promise<void> {
    const config = this.getConfig(endpointConfig);
    const url = buildEndpointUrl(config, config.endpoints.playground.stopExecution, {
      sessionId
    });

    await this.request<{ success: boolean }>(
      config,
      url,
      {
        method: 'POST'
      },
      authProvider
    );
  }

  /**
   * Reset a stuck session to idle, cancelling pending messages and clearing
   * interrupt state.
   *
   * The endpoint is optional in {@link EndpointConfig} — a backend that cannot
   * reset omits it. Callers should check availability first (the slash-command
   * registry does); calling without a configured endpoint throws rather than
   * silently hitting a wrong URL.
   *
   * @param sessionId - The session UUID
   */
  async resetSession(
    endpointConfig: EndpointConfig | null,
    sessionId: string,
    authProvider?: AuthProvider
  ): Promise<void> {
    const config = this.getConfig(endpointConfig);
    const endpoint = config.endpoints.playground.resetSession;

    if (!endpoint) {
      throw new Error('Session reset is not supported by this backend');
    }

    const url = buildEndpointUrl(config, endpoint, { sessionId });

    await this.request<{ success: boolean }>(
      config,
      url,
      {
        method: 'POST'
      },
      authProvider
    );
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
   * @param shouldStopPolling - Optional override for stop conditions (default: defaultShouldStopPolling)
   * @param initialSequenceNumber - Optional sequence number to seed polling from (avoids re-fetching already loaded messages)
   */
  startPolling(
    endpointConfig: EndpointConfig | null,
    sessionId: string,
    callback: (response: PlaygroundMessagesApiResponse) => void,
    interval: number = DEFAULT_POLLING_INTERVAL,
    shouldStopPolling?: (status: PlaygroundSessionStatus) => boolean,
    initialSequenceNumber?: number | null,
    authProvider?: AuthProvider
  ): void {
    // Stop any existing polling
    this.stopPolling();

    this.pollingSessionId = sessionId;
    this.currentBackoff = interval;
    this.lastSequenceNumber = initialSequenceNumber ?? null;

    const shouldStop = shouldStopPolling ?? defaultShouldStopPolling;

    const poll = async () => {
      if (this.pollingSessionId !== sessionId) {
        return;
      }

      try {
        const response = await this.getMessages(
          endpointConfig,
          sessionId,
          {
            since: this.lastSequenceNumber ?? undefined
          },
          authProvider
        );

        // Update last sequence number cursor
        if (response.data && response.data.length > 0) {
          const lastMessage = response.data[response.data.length - 1];
          if (lastMessage.sequenceNumber !== undefined) {
            this.lastSequenceNumber = lastMessage.sequenceNumber;
          }
        }

        // Reset backoff on successful request
        this.currentBackoff = interval;

        // Call the callback with new messages
        callback(response);

        // Stop polling if the status matches the stop condition
        if (response.sessionStatus && shouldStop(response.sessionStatus)) {
          this.stopPolling();
          return;
        }
      } catch (error) {
        logger.error('Polling error:', error);

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
    this.lastSequenceNumber = null;
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

  /**
   * Get the last sequence number used as cursor for incremental polling
   *
   * @returns The last sequence number, or null
   */
  getLastSequenceNumber(): number | null {
    return this.lastSequenceNumber;
  }
}

/**
 * Export singleton instance
 */
export const playgroundService = PlaygroundService.getInstance();
