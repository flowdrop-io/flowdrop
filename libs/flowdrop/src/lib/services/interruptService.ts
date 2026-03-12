/**
 * Interrupt Service
 *
 * Handles API interactions for Human-in-the-Loop (HITL) interrupts,
 * including fetching interrupt details, resolving interrupts with user
 * responses, and optional dedicated polling for interrupt status.
 *
 * @module services/interruptService
 */

import type {
  Interrupt,
  InterruptResolution,
  InterruptResponse,
  InterruptListResponse,
  InterruptPollingConfig,
} from "../types/interrupt.js";
import { defaultInterruptPollingConfig } from "../types/interrupt.js";
import type { EndpointConfig } from "../config/endpoints.js";
import { buildEndpointUrl, getEndpointHeaders } from "../config/endpoints.js";
import { getEndpointConfig } from "./api.js";
import { logger } from "../utils/logger.js";

/**
 * Interrupt Service class
 *
 * Provides methods to interact with interrupt API endpoints including
 * fetching, resolving, cancelling, and listing interrupts.
 * Supports optional dedicated polling for interrupt status.
 */
export class InterruptService {
  private static instance: InterruptService;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private pollingSessionId: string | null = null;
  private currentBackoff: number;
  private pollingConfig: InterruptPollingConfig;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.pollingConfig = { ...defaultInterruptPollingConfig };
    this.currentBackoff =
      this.pollingConfig.interval ?? defaultInterruptPollingConfig.interval;
  }

  /**
   * Get the singleton instance of InterruptService
   *
   * @returns The InterruptService singleton instance
   */
  public static getInstance(): InterruptService {
    if (!InterruptService.instance) {
      InterruptService.instance = new InterruptService();
    }
    return InterruptService.instance;
  }

  /**
   * Configure interrupt polling settings
   *
   * @param config - Polling configuration options
   */
  public setPollingConfig(config: Partial<InterruptPollingConfig>): void {
    this.pollingConfig = { ...this.pollingConfig, ...config };
    this.currentBackoff =
      this.pollingConfig.interval ?? defaultInterruptPollingConfig.interval;
  }

  /**
   * Get the current polling configuration
   *
   * @returns Current polling configuration
   */
  public getPollingConfig(): InterruptPollingConfig {
    return { ...this.pollingConfig };
  }

  /**
   * Check if interrupt endpoints are configured
   *
   * @returns True if interrupt endpoints are available
   */
  public isConfigured(): boolean {
    const config = getEndpointConfig();
    return Boolean(config?.endpoints?.interrupts);
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
      throw new Error(
        "Endpoint configuration not set. Call setEndpointConfig() first.",
      );
    }
    if (!config.endpoints.interrupts) {
      throw new Error("Interrupt endpoints not configured.");
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
    const headers = getEndpointHeaders(config, "interrupts");
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
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
  // Interrupt Operations
  // =========================================================================

  /**
   * Get interrupt details by ID
   *
   * @param interruptId - The interrupt UUID
   * @returns The interrupt details
   */
  async getInterrupt(interruptId: string): Promise<Interrupt> {
    const config = this.getConfig();
    const url = buildEndpointUrl(config, config.endpoints.interrupts.get, {
      interruptId,
    });

    const response = await this.request<InterruptResponse>(url);

    if (!response.data) {
      throw new Error("Interrupt not found");
    }

    return response.data;
  }

  /**
   * Resolve an interrupt with user response
   *
   * @param interruptId - The interrupt UUID
   * @param value - The user's response value
   * @returns The updated interrupt
   */
  async resolveInterrupt(
    interruptId: string,
    value: unknown,
  ): Promise<Interrupt> {
    const config = this.getConfig();
    const url = buildEndpointUrl(config, config.endpoints.interrupts.resolve, {
      interruptId,
    });

    const resolution: InterruptResolution = { value };

    const response = await this.request<InterruptResponse>(url, {
      method: "POST",
      body: JSON.stringify(resolution),
    });

    if (!response.data) {
      throw new Error("Failed to resolve interrupt: No data returned");
    }

    return response.data;
  }

  /**
   * Cancel a pending interrupt
   *
   * @param interruptId - The interrupt UUID
   * @returns The updated interrupt
   */
  async cancelInterrupt(interruptId: string): Promise<Interrupt> {
    const config = this.getConfig();
    const url = buildEndpointUrl(config, config.endpoints.interrupts.cancel, {
      interruptId,
    });

    const response = await this.request<InterruptResponse>(url, {
      method: "POST",
    });

    if (!response.data) {
      throw new Error("Failed to cancel interrupt: No data returned");
    }

    return response.data;
  }

  /**
   * List interrupts for a playground session
   *
   * @param sessionId - The session UUID
   * @returns Array of interrupts for the session
   */
  async listSessionInterrupts(sessionId: string): Promise<Interrupt[]> {
    const config = this.getConfig();
    const url = buildEndpointUrl(
      config,
      config.endpoints.interrupts.listBySession,
      {
        sessionId,
      },
    );

    const response = await this.request<InterruptListResponse>(url);
    return response.data ?? [];
  }

  /**
   * List interrupts for a pipeline
   *
   * @param pipelineId - The pipeline UUID
   * @returns Array of interrupts for the pipeline
   */
  async listPipelineInterrupts(pipelineId: string): Promise<Interrupt[]> {
    const config = this.getConfig();
    const url = buildEndpointUrl(
      config,
      config.endpoints.interrupts.listByPipeline,
      {
        pipelineId,
      },
    );

    const response = await this.request<InterruptListResponse>(url);
    return response.data ?? [];
  }

  // =========================================================================
  // Polling (Optional)
  // =========================================================================

  /**
   * Start polling for interrupts in a session
   *
   * This is optional - interrupts are typically detected via message metadata.
   * Use this for scenarios where dedicated polling is preferred.
   *
   * @param sessionId - The session UUID to poll
   * @param callback - Callback function to handle new interrupts
   */
  startPolling(
    sessionId: string,
    callback: (interrupts: Interrupt[]) => void,
  ): void {
    if (!this.pollingConfig.enabled) {
      logger.warn(
        "[InterruptService] Polling is disabled. Enable via setPollingConfig().",
      );
      return;
    }

    // Stop any existing polling
    this.stopPolling();

    this.pollingSessionId = sessionId;
    this.currentBackoff =
      this.pollingConfig.interval ?? defaultInterruptPollingConfig.interval;

    const poll = async (): Promise<void> => {
      if (this.pollingSessionId !== sessionId) {
        return;
      }

      try {
        const interrupts = await this.listSessionInterrupts(sessionId);
        const pendingInterrupts = interrupts.filter(
          (i) => i.status === "pending",
        );

        // Reset backoff on successful request
        this.currentBackoff =
          this.pollingConfig.interval ?? defaultInterruptPollingConfig.interval;

        // Call the callback with pending interrupts
        callback(pendingInterrupts);
      } catch (error) {
        logger.error("[InterruptService] Polling error:", error);

        // Exponential backoff on error
        const maxBackoff =
          this.pollingConfig.maxBackoff ??
          defaultInterruptPollingConfig.maxBackoff;
        this.currentBackoff = Math.min(this.currentBackoff * 2, maxBackoff);
      }

      // Schedule next poll
      if (this.pollingSessionId === sessionId) {
        this.pollingInterval = setTimeout(poll, this.currentBackoff);
      }
    };

    // Start polling immediately
    void poll();
  }

  /**
   * Stop polling for interrupts
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.pollingSessionId = null;
    this.currentBackoff =
      this.pollingConfig.interval ?? defaultInterruptPollingConfig.interval;
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
export const interruptService = InterruptService.getInstance();
