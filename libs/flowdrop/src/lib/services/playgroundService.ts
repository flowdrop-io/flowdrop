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
  PlaygroundSessionStatus,
  PlaygroundTurnResponse,
  PlaygroundTurnResult
} from '../types/playground.js';
import { defaultShouldStopPolling } from '../types/playground.js';
import type {
  EndpointConfig,
  ResolvedSessionEndpoint,
  SessionEndpointKey
} from '../config/endpoints.js';
import { buildEndpointUrl, resolveSessionEndpoint } from '../config/endpoints.js';
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
   * Resolve a per-session call (see {@link resolveSessionEndpoint}): the
   * `sessions` group when configured, the legacy `playground` key otherwise.
   *
   * @throws Error when the backend does not offer the call
   */
  private sessionEndpoint(
    config: EndpointConfig,
    key: SessionEndpointKey,
    sessionId: string
  ): { url: string; group: ResolvedSessionEndpoint['group'] } {
    const endpoint = resolveSessionEndpoint(config, key);
    if (!endpoint) {
      throw new Error(`Session ${key} is not supported by this backend`);
    }
    return {
      url: buildEndpointUrl(config, endpoint.path, { sessionId }),
      group: endpoint.group
    };
  }

  /**
   * Generic API request helper
   *
   * @param config - The endpoint configuration
   * @param url - The URL to fetch
   * @param options - Fetch options
   * @param endpointKey - Group whose static headers apply (default `playground`)
   * @returns The parsed JSON response
   */
  private async request<T>(
    config: EndpointConfig,
    url: string,
    options: RequestInit = {},
    authProvider?: AuthProvider,
    endpointKey: string = 'playground'
  ): Promise<T> {
    const response = await authenticatedFetch(url, options, {
      config,
      endpointKey,
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
    const { url, group } = this.sessionEndpoint(config, 'get', sessionId);

    const response = await this.request<PlaygroundSessionResponse>(
      config,
      url,
      {},
      authProvider,
      group
    );

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
    const { url, group } = this.sessionEndpoint(config, 'delete', sessionId);

    await this.request<{ success: boolean }>(
      config,
      url,
      {
        method: 'DELETE'
      },
      authProvider,
      group
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
    const endpoint = this.sessionEndpoint(config, 'messages', sessionId);
    let url = endpoint.url;

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

    return this.request<PlaygroundMessagesApiResponse>(
      config,
      url,
      {},
      authProvider,
      endpoint.group
    );
  }

  /**
   * Take a turn in a session: post the person's message and/or named inputs
   * and run the session's workflow on them.
   *
   * Goes to `sessions.turn` when that group is configured, else to the legacy
   * `playground.sendMessage`. The two doors answer differently (the legacy one
   * with the user's message row, the turn door with a turn result), so the
   * answer is returned tagged. The tag follows the door the request went to
   * (the endpoint group), never the shape of the payload; either way the rest
   * of the turn arrives through the messages poll.
   *
   * `content` is optional: a workflow whose interface declares no `message`
   * port takes `inputs` alone, and its server refuses `content` with a 400
   * whose message names the fix. Refusals are thrown as an `Error` carrying
   * the server's message.
   *
   * @param sessionId - The session UUID
   * @param request - `content` (the person's message) and/or `inputs` (named
   *   interface inputs); keys left `undefined` are not sent
   */
  async sendTurn(
    endpointConfig: EndpointConfig | null,
    sessionId: string,
    request: PlaygroundMessageRequest,
    authProvider?: AuthProvider
  ): Promise<PlaygroundTurnResponse> {
    const config = this.getConfig(endpointConfig);
    const { url, group } = this.sessionEndpoint(config, 'turn', sessionId);

    const requestBody: PlaygroundMessageRequest = {};
    if (request.content !== undefined) {
      requestBody.content = request.content;
    }
    if (request.inputs !== undefined) {
      requestBody.inputs = request.inputs;
    }

    const response = await this.request<{
      success: boolean;
      data?: PlaygroundMessage | PlaygroundTurnResult;
    }>(
      config,
      url,
      {
        method: 'POST',
        body: JSON.stringify(requestBody)
      },
      authProvider,
      group
    );

    const data = response.data;
    if (!data) {
      throw new Error('Failed to send message: No data returned');
    }
    return group === 'sessions'
      ? { kind: 'turn', result: data as PlaygroundTurnResult }
      : { kind: 'message', message: data as PlaygroundMessage };
  }

  /**
   * Send a message to a playground session
   *
   * @deprecated Use {@link sendTurn}, which also takes a turn without
   *   `content` and understands the `sessions.turn` door. This method throws
   *   when the configured door answers with a turn result instead of the
   *   user's message row.
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
    const response = await this.sendTurn(
      endpointConfig,
      sessionId,
      { content, inputs },
      authProvider
    );
    if (response.kind !== 'message') {
      throw new Error(
        'The turn endpoint answered with a turn result, not a message; use sendTurn()'
      );
    }
    return response.message;
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
    const { url, group } = this.sessionEndpoint(config, 'stop', sessionId);

    await this.request<{ success: boolean }>(
      config,
      url,
      {
        method: 'POST'
      },
      authProvider,
      group
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
    const endpoint = resolveSessionEndpoint(config, 'reset');

    if (!endpoint) {
      throw new Error('Session reset is not supported by this backend');
    }

    const url = buildEndpointUrl(config, endpoint.path, { sessionId });

    await this.request<{ success: boolean }>(
      config,
      url,
      {
        method: 'POST'
      },
      authProvider,
      endpoint.group
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
