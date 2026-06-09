/**
 * FlowDrop Endpoint Configuration
 * Provides configurable endpoints for all API actions
 */

import type { AgentSpecEndpointConfig } from './agentSpecEndpoints.js';
import type { AuthProvider } from '../types/auth.js';

export interface EndpointConfig {
  /** Base URL for all endpoints */
  baseUrl: string;

  /** Individual endpoint paths */
  endpoints: {
    // Node endpoints
    nodes: {
      list: string;
      get: string;
      byCategory: string;
      metadata: string;
    };

    // Port configuration endpoint
    portConfig: string;

    // Categories configuration endpoint
    categories: string;

    // Workflow endpoints
    workflows: {
      list: string;
      get: string;
      create: string;
      update: string;
      delete: string;
      validate: string;
      export: string;
      import: string;
    };

    // Execution endpoints
    executions: {
      execute: string;
      status: string;
      cancel: string;
      logs: string;
      history: string;
    };

    // Pipeline endpoints
    pipelines: {
      list: string;
      get: string;
      create: string;
      update: string;
      delete: string;
      status: string;
      logs: string;
      execute: string;
      stop: string;
    };

    // Playground endpoints
    playground: {
      /** List sessions for a workflow */
      listSessions: string;
      /** Create a new session */
      createSession: string;
      /** Get session details */
      getSession: string;
      /** Delete a session */
      deleteSession: string;
      /** Get messages from a session */
      getMessages: string;
      /** Send a message to a session */
      sendMessage: string;
      /** Stop execution in a session */
      stopExecution: string;
    };

    // Interrupt endpoints (Human-in-the-Loop)
    interrupts: {
      /** Get interrupt details by ID */
      get: string;
      /** Resolve an interrupt with user response */
      resolve: string;
      /** Cancel a pending interrupt */
      cancel: string;
      /** List interrupts for a playground session */
      listBySession: string;
      /** List interrupts for a pipeline */
      listByPipeline: string;
    };

    // Chat endpoints (LLM integration)
    chat: {
      /** Send a message to the chat */
      sendMessage: string;
      /** Get conversation history */
      getHistory: string;
      /** Clear conversation history */
      clearHistory: string;
    };

    // Template endpoints
    templates: {
      list: string;
      get: string;
      create: string;
      update: string;
      delete: string;
    };

    // User endpoints
    users: {
      profile: string;
      preferences: string;
    };

    // System endpoints
    system: {
      health: string;
      config: string;
      version: string;
    };
  };

  /**
   * Optional Agent Spec runtime configuration.
   * When provided, enables Agent Spec execution features.
   */
  agentSpec?: AgentSpecEndpointConfig;

  /** HTTP method overrides for specific endpoints */
  methods?: {
    [key: string]: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  };

  /** Custom headers for specific endpoints */
  headers?: {
    [key: string]: Record<string, string>;
  };

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };

  /**
   * Optional transform applied to workflow objects before they are sent to the backend
   * (i.e., in create and update requests).
   *
   * Use this to adapt the generic FlowDrop `Workflow` shape to whatever your backend
   * expects. The function receives the workflow data and must return the body that will
   * be JSON-serialised and posted.
   *
   * Default: identity — the workflow is sent as-is.
   *
   * @example Drupal integration — Drupal expects `label` in addition to `name`:
   * ```ts
   * transformWorkflowPayload: (workflow) => ({
   *   ...workflow,
   *   label: workflow.name,
   * })
   * ```
   */
  transformWorkflowPayload?: (workflow: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Default endpoint configuration
 */
export const defaultEndpointConfig: EndpointConfig = {
  baseUrl: '/api/flowdrop',
  endpoints: {
    nodes: {
      list: '/nodes',
      get: '/nodes/{id}',
      byCategory: '/nodes?category={category}',
      metadata: '/nodes/{id}/metadata'
    },
    portConfig: '/port-config',
    categories: '/categories',
    workflows: {
      list: '/workflows',
      get: '/workflows/{id}',
      create: '/workflows',
      update: '/workflows/{id}',
      delete: '/workflows/{id}',
      validate: '/workflows/validate',
      export: '/workflows/{id}/export',
      import: '/workflows/import'
    },
    executions: {
      execute: '/workflows/{id}/execute',
      status: '/executions/{id}',
      cancel: '/executions/{id}/cancel',
      logs: '/executions/{id}/logs',
      history: '/executions'
    },
    pipelines: {
      list: '/workflow/{workflow_id}/pipelines',
      get: '/pipeline/{id}',
      create: '/pipeline',
      update: '/pipeline/{id}',
      delete: '/pipeline/{id}',
      status: '/pipeline/{id}/status',
      logs: '/pipeline/{id}/logs',
      execute: '/pipeline/{id}/execute',
      stop: '/pipeline/{id}/stop'
    },
    playground: {
      listSessions: '/workflows/{id}/playground/sessions',
      createSession: '/workflows/{id}/playground/sessions',
      getSession: '/playground/sessions/{sessionId}',
      deleteSession: '/playground/sessions/{sessionId}',
      getMessages: '/playground/sessions/{sessionId}/messages',
      sendMessage: '/playground/sessions/{sessionId}/messages',
      stopExecution: '/playground/sessions/{sessionId}/stop'
    },
    interrupts: {
      get: '/interrupts/{interruptId}',
      resolve: '/interrupts/{interruptId}',
      cancel: '/interrupts/{interruptId}/cancel',
      listBySession: '/playground/sessions/{sessionId}/interrupts',
      listByPipeline: '/pipelines/{pipelineId}/interrupts'
    },
    chat: {
      sendMessage: '/workflows/{id}/chat/messages',
      getHistory: '/workflows/{id}/chat/messages',
      clearHistory: '/workflows/{id}/chat/messages'
    },
    templates: {
      list: '/templates',
      get: '/templates/{id}',
      create: '/templates',
      update: '/templates/{id}',
      delete: '/templates/{id}'
    },
    users: {
      profile: '/users/profile',
      preferences: '/users/preferences'
    },
    system: {
      /** Health check at root level (industry standard for K8s, Docker, load balancers) */
      health: '/health',
      config: '/system/config',
      version: '/system/version'
    }
  },
  timeout: 30000,
  retry: {
    enabled: true,
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential'
  }
};

/**
 * Create endpoint configuration with custom base URL
 */
export function createEndpointConfig(
  baseUrl: string,
  overrides?: Partial<EndpointConfig>
): EndpointConfig {
  const config = {
    ...defaultEndpointConfig,
    baseUrl: baseUrl.replace(/\/$/, ''),
    ...overrides
  };

  return config;
}

/**
 * Build full URL for an endpoint
 */
export function buildEndpointUrl(
  config: EndpointConfig,
  endpointPath: string,
  params?: Record<string, string>
): string {
  let url = endpointPath;

  // Replace path parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    });
  }

  // Ensure URL starts with base URL
  if (!url.startsWith('http') && !url.startsWith('//')) {
    url = `${config.baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
  }

  return url;
}

/**
 * Get HTTP method for an endpoint
 */
export function getEndpointMethod(config: EndpointConfig, endpointKey: string): string {
  return config.methods?.[endpointKey] || 'GET';
}

/**
 * Get custom headers for an endpoint
 */
export function getEndpointHeaders(
  config: EndpointConfig,
  endpointKey: string
): Record<string, string> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Authentication is supplied via the AuthProvider passed to the API client /
  // ApiContext — EndpointConfig no longer carries an `auth` block.

  // Add endpoint-specific headers
  const endpointHeaders = config.headers?.[endpointKey];
  if (endpointHeaders) {
    Object.assign(baseHeaders, endpointHeaders);
  }

  return baseHeaders;
}

/**
 * Build request headers for an endpoint, layering the auth provider's headers
 * over the static endpoint headers.
 *
 * This is the single header-building path shared by the per-instance services
 * (playground, chat, interrupt, settings, port config, categories). Routing all
 * of them through this helper guarantees a configured {@link AuthProvider}
 * authenticates every request consistently — matching the behaviour of
 * {@link EnhancedFlowDropApiClient}, which owns the equivalent merge for the
 * typed workflow/node API.
 *
 * `getAuthHeaders()` is awaited per call so providers can return freshly
 * refreshed tokens. When no provider is supplied the result is identical to
 * {@link getEndpointHeaders} (no auth) — keeping unauthenticated callers
 * working unchanged.
 *
 * @param config - The endpoint configuration
 * @param endpointKey - Key identifying the endpoint (for static header lookup)
 * @param authProvider - Optional auth provider supplying `Authorization` etc.
 * @returns Merged headers: static endpoint headers < auth headers
 */
export async function getRequestHeaders(
  config: EndpointConfig,
  endpointKey: string,
  authProvider?: AuthProvider
): Promise<Record<string, string>> {
  const headers = getEndpointHeaders(config, endpointKey);
  if (authProvider) {
    Object.assign(headers, await authProvider.getAuthHeaders());
  }
  return headers;
}
