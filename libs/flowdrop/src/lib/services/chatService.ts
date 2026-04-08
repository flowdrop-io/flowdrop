/**
 * Chat Service
 *
 * Handles API interactions for the LLM Chat feature including
 * sending messages, retrieving history, and clearing history.
 *
 * @module services/chatService
 */

import type { ChatRequest, ChatResponse, ChatHistoryMessage } from '../types/chat.js';
import type { EndpointConfig } from '../config/endpoints.js';
import { buildEndpointUrl, getEndpointHeaders } from '../config/endpoints.js';
import { getEndpointConfig } from './api.js';
import { logger } from '../utils/logger.js';

/**
 * Chat Service class
 *
 * Provides methods to interact with the chat API endpoints
 * for LLM-powered workflow building assistance.
 */
export class ChatService {
  private static instance: ChatService;

  private constructor() {}

  /**
   * Get the singleton instance of ChatService
   *
   * @returns The ChatService singleton instance
   */
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
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
    const headers = getEndpointHeaders(config, 'chat');
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
    const json = await response.json();
    // Unwrap the { success, data } envelope used by the Drupal backend.
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data as T;
    }
    return json as T;
  }

  // =========================================================================
  // Chat Operations
  // =========================================================================

  /**
   * Send a message to the chat endpoint
   *
   * @param workflowId - The workflow ID
   * @param request - The chat request payload
   * @returns The chat response from the LLM
   */
  async sendMessage(workflowId: string, request: ChatRequest): Promise<ChatResponse> {
    const config = this.getConfig();
    const url = buildEndpointUrl(config, config.endpoints.chat.sendMessage, {
      id: workflowId
    });

    logger.debug('[ChatService] Sending message to', url);

    return this.request<ChatResponse>(url, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Get conversation history for a workflow
   *
   * @param workflowId - The workflow ID
   * @returns Array of chat history messages
   */
  async getHistory(workflowId: string): Promise<ChatHistoryMessage[]> {
    const config = this.getConfig();
    const url = buildEndpointUrl(config, config.endpoints.chat.getHistory, {
      id: workflowId
    });

    logger.debug('[ChatService] Getting history from', url);

    return this.request<ChatHistoryMessage[]>(url);
  }

  /**
   * Clear conversation history for a workflow
   *
   * @param workflowId - The workflow ID
   */
  async clearHistory(workflowId: string): Promise<void> {
    const config = this.getConfig();
    const url = buildEndpointUrl(config, config.endpoints.chat.clearHistory, {
      id: workflowId
    });

    logger.debug('[ChatService] Clearing history at', url);

    await fetch(url, {
      method: 'DELETE',
      headers: getEndpointHeaders(config, 'chat')
    });
  }
}

/**
 * Pre-instantiated ChatService singleton
 */
export const chatService = ChatService.getInstance();
