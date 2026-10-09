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
      /**
       * Launch a run with schema-resolved named inputs, returning the new
       * pipeline id.
       *
       * The semantically correct verb for "start this workflow" — as opposed to
       * posting a chat message and relying on the side effect of a run starting.
       *
       * Optional: a backend without an explicit launch verb omits it, and the
       * `/run` command is not offered.
       */
      run?: string;
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
      /**
       * Re-run a finished pipeline (`POST`, answers
       * `{ success, data: { pipeline_id, status } }`). The Runs list in Test
       * mode offers Re-run only when this is set.
       */
      rerun?: string;
      /**
       * Cancel a pipeline that has not finished (`POST`, no body). The Runs
       * list offers Cancel only when this or `signals` is set; this key wins
       * when both are.
       */
      cancel?: string;
    };

    /**
     * Playground endpoints. `listSessions` and `createSession` are always read
     * from here; the per-session keys only while no `sessions` group is
     * configured (servers that predate it serve the session API here).
     */
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
      /**
       * Reset a stuck session to idle.
       *
       * Optional: a backend that cannot reset a session simply omits this key,
       * and the `/reset` command is not offered. Absence of an endpoint is
       * absence of a capability — see the slash-command registry.
       */
      resetSession?: string;
    };

    /**
     * One session's own HTTP surface: read, delete, page its messages, take a
     * turn, stop and reset. Keyed by the session's id, independent of which
     * client created it (the Playground, a node session, an integration).
     *
     * Optional as a whole. When present, every per-session call goes here and
     * the matching `playground` keys are no longer read; when absent, those
     * calls stay on the `playground` group, which is what servers that predate
     * this surface serve. Listing and creating sessions for a workflow stay on
     * `playground` either way: they are the console's concern, not the
     * session's. {@link sessionsEndpoints} holds the reference backend's paths.
     *
     * Not part of {@link defaultEndpointConfig} on purpose: hosts merge their
     * endpoint groups over the defaults, so a default here would move every
     * host to paths its server may not serve yet. The host that knows its
     * server sets the group.
     */
    sessions?: {
      /** Get session details (`GET`) */
      get: string;
      /** Delete a session (`DELETE`) */
      delete: string;
      /**
       * Page a session's messages (`GET`; `since`, `before`, `latest` and
       * `limit` query parameters, the same response as `playground.getMessages`).
       */
      messages: string;
      /**
       * Take a turn (`POST`, body `{content?, inputs?}`). Answers with the
       * turn result (`userMessageId`, `pipelineId`, `status`, …), not the
       * user's message row; the row arrives with the next messages poll.
       */
      turn: string;
      /** Stop the running turn (`POST`) */
      stop: string;
      /** Reset a stuck session to idle (`POST`). Optional, as `playground.resetSession`. */
      reset?: string;
      /**
       * The runs a session started, each stamped with the workflow version it
       * ran (`GET`, `limit` query parameter). Optional: a server without it
       * answers 404 and the editor shows no version dividers. When the group
       * is configured and this key is left out, the editor still tries
       * {@link sessionsEndpoints}'s path and stops after the first 404.
       */
      runs?: string;
    };

    /**
     * Operator signals into a *running* pipeline — pause, resume, cancel.
     *
     * Distinct from `interrupts`, which are raised *by* a pipeline and awaited
     * (human-in-the-loop). These travel the other way: an external party acting
     * on a run that never asked.
     *
     * Optional as a whole: a backend with no signal plane omits the block, and
     * the corresponding commands are not offered.
     */
    signals?: {
      /**
       * Root for signal routes, when the backend serves them from a different
       * prefix than {@link EndpointConfig.baseUrl}.
       *
       * Needed because API roots are not always uniform — the reference backend
       * serves signals from `/flowdrop/api` while everything else lives under
       * `/api/flowdrop`, and a single base cannot express both. Omit to use the
       * global `baseUrl`.
       */
      baseUrl?: string;
      /** Pause a running pipeline */
      pause: string;
      /** Resume a paused pipeline */
      resume: string;
      /** Cancel a running pipeline */
      cancel: string;
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
      /**
       * Continue a tool-calling turn with the results of the tool calls the
       * assistant made (`POST`, `{turnId}` in the path). Optional: a backend
       * without it gets the legacy text mode — the panel sends one message,
       * parses the ```flowdrop block in the reply, and asks before applying.
       */
      toolResults?: string;
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
      import: '/workflows/import',
      // Singular `workflow` here is the reference backend's spelling, not a typo.
      run: '/workflow/{workflowId}/run'
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
      stop: '/pipeline/{id}/stop',
      rerun: '/pipeline/{id}/rerun',
      cancel: '/pipeline/{id}/cancel'
    },
    playground: {
      listSessions: '/workflows/{id}/playground/sessions',
      createSession: '/workflows/{id}/playground/sessions',
      getSession: '/playground/sessions/{sessionId}',
      deleteSession: '/playground/sessions/{sessionId}',
      getMessages: '/playground/sessions/{sessionId}/messages',
      sendMessage: '/playground/sessions/{sessionId}/messages',
      stopExecution: '/playground/sessions/{sessionId}/stop',
      resetSession: '/playground/sessions/{sessionId}/reset'
    },
    signals: {
      // The reference backend transposes its prefix for these routes.
      baseUrl: '/flowdrop/api',
      pause: '/pipelines/{pipelineId}/pause',
      resume: '/pipelines/{pipelineId}/resume',
      cancel: '/pipelines/{pipelineId}/cancel'
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
      clearHistory: '/workflows/{id}/chat/messages',
      toolResults: '/workflows/{id}/chat/turns/{turnId}/tool-results'
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
 * The reference backend's `sessions` group: the session HTTP surface under
 * `/sessions/{sessionId}`. Hosts whose server serves it opt in with
 * `endpoints: { ...defaultEndpointConfig.endpoints, sessions: sessionsEndpoints }`.
 */
export const sessionsEndpoints: NonNullable<EndpointConfig['endpoints']['sessions']> = {
  get: '/sessions/{sessionId}',
  delete: '/sessions/{sessionId}',
  messages: '/sessions/{sessionId}/messages',
  turn: '/sessions/{sessionId}/turn',
  stop: '/sessions/{sessionId}/stop',
  reset: '/sessions/{sessionId}/reset',
  runs: '/sessions/{sessionId}/runs'
};

/** One per-session call, named as the `sessions` group names it. */
export type SessionEndpointKey = Exclude<
  keyof NonNullable<EndpointConfig['endpoints']['sessions']>,
  'runs'
>;

/** Which `playground` key served each per-session call before the `sessions` group. */
const LEGACY_SESSION_ENDPOINT_KEYS = {
  get: 'getSession',
  delete: 'deleteSession',
  messages: 'getMessages',
  turn: 'sendMessage',
  stop: 'stopExecution',
  reset: 'resetSession'
} as const satisfies Record<SessionEndpointKey, keyof EndpointConfig['endpoints']['playground']>;

/** A resolved per-session endpoint: its path and the group it came from. */
export interface ResolvedSessionEndpoint {
  path: string;
  group: 'sessions' | 'playground';
}

/**
 * Resolve a per-session call to its path.
 *
 * The `sessions` group wins as a whole when configured; otherwise the call
 * stays on its `playground` key. A key absent from the winning group is a
 * capability the backend does not offer (only `reset` may be absent), so this
 * returns `undefined` rather than borrowing the other group's path.
 */
export function resolveSessionEndpoint(
  config: EndpointConfig,
  key: SessionEndpointKey
): ResolvedSessionEndpoint | undefined {
  const sessions = config.endpoints.sessions;
  if (sessions) {
    const path = sessions[key];
    return path ? { path, group: 'sessions' } : undefined;
  }
  const path = config.endpoints.playground?.[LEGACY_SESSION_ENDPOINT_KEYS[key]];
  return path ? { path, group: 'playground' } : undefined;
}

/**
 * The path of a session's runs, or `undefined` when the backend has no
 * `sessions` group (servers that predate the session surface have no runs
 * endpoint either). Unlike the other per-session calls there is no legacy
 * `playground` key, and a `sessions` group without a `runs` key falls back to
 * the reference path: the call is optional and a 404 switches it off.
 */
export function resolveSessionRunsEndpoint(config: EndpointConfig): string | undefined {
  const sessions = config.endpoints.sessions;
  if (!sessions) return undefined;
  return sessions.runs ?? sessionsEndpoints.runs;
}

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
  params?: Record<string, string>,
  baseUrlOverride?: string
): string {
  let url = endpointPath;

  // Replace path parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    });
  }

  // Ensure URL starts with base URL. `baseUrlOverride` lets a group of
  // endpoints hang off a different root than the global one — backends do not
  // always serve every API from a single prefix.
  const base = baseUrlOverride ?? config.baseUrl;
  if (!url.startsWith('http') && !url.startsWith('//')) {
    url = `${base}${url.startsWith('/') ? url : `/${url}`}`;
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
