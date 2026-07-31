/**
 * Workflow Launch Service
 *
 * Starts a workflow run with named inputs — the explicit verb for "run this",
 * as opposed to posting a chat message and relying on a run starting as a side
 * effect.
 *
 * Why this matters beyond tidiness: launching by message fabricates a user turn
 * that enters the conversation and is fed back as input on the next turn. A
 * launch has no message, so nothing is fabricated.
 *
 * Like {@link pipelineSignalService}, this returns a typed result rather than
 * throwing — invalid inputs and an invalid stored workflow are expected
 * outcomes with distinct, per-field presentation, not exceptional ones.
 *
 * @module services/workflowLaunchService
 */

import type { EndpointConfig } from '../config/endpoints.js';
import { buildEndpointUrl } from '../config/endpoints.js';
import { authenticatedFetch } from '../utils/fetchWithAuth.js';
import type { AuthProvider } from '../types/auth.js';
import { logger } from '../utils/logger.js';

/** A single per-input validation failure reported by the backend. */
export interface LaunchInputError {
  /** Machine-readable error code. */
  code: string;
  /** Human-readable explanation. */
  message: string;
  /** Which input the error belongs to, when the backend can attribute it. */
  locator?: string;
}

export type LaunchResult =
  /** The run was created. `status` is the backend's own lifecycle value. */
  | { status: 'launched'; pipelineId: string; runStatus?: string; queued?: boolean }
  /** Inputs were refused — unknown key, wrong type, missing required. */
  | { status: 'invalid-input'; message: string }
  /**
   * The *stored workflow* is structurally invalid, with per-error locators.
   * Distinct from bad inputs: nothing the caller passed is at fault.
   */
  | { status: 'invalid-workflow'; message: string; errors: LaunchInputError[] }
  | { status: 'failed'; message: string }
  | { status: 'unsupported' };

export interface LaunchOptions {
  /** Named inputs, resolved server-side against the workflow's declared manifest. */
  inputs?: Record<string, unknown>;
  /** Attribute the run to a session, so its messages land in that conversation. */
  sessionId?: string;
}

class WorkflowLaunchService {
  /** True when this configuration exposes an explicit launch verb. */
  isSupported(config: EndpointConfig | null): boolean {
    return config?.endpoints?.workflows?.run != null;
  }

  /**
   * Launch a workflow run.
   *
   * An empty `inputs` is meaningful and supported — it means "run with no
   * inputs", which is a legitimate thing to want and is why this verb exists.
   */
  async launch(
    config: EndpointConfig | null,
    workflowId: string,
    options: LaunchOptions = {},
    authProvider?: AuthProvider
  ): Promise<LaunchResult> {
    const endpoint = config?.endpoints?.workflows?.run;
    if (!config || !endpoint) return { status: 'unsupported' };

    const url = buildEndpointUrl(config, endpoint, { workflowId });

    const body: Record<string, unknown> = {};
    if (options.inputs && Object.keys(options.inputs).length > 0) body.inputs = options.inputs;
    if (options.sessionId) body.sessionId = options.sessionId;

    const response = await authenticatedFetch(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      },
      { config, endpointKey: 'workflows', authProvider }
    );

    const payload = (await response.json().catch(() => ({}))) as {
      data?: { pipelineId?: string; status?: string; queued?: boolean };
      error?: string;
      message?: string;
      details?: LaunchInputError[];
    };

    if (response.ok) {
      const pipelineId = payload.data?.pipelineId;
      if (!pipelineId) {
        return { status: 'failed', message: 'Launch succeeded but returned no pipeline id' };
      }
      return {
        status: 'launched',
        pipelineId,
        runStatus: payload.data?.status,
        queued: payload.data?.queued
      };
    }

    const message =
      payload.error ?? payload.message ?? `HTTP ${response.status}: ${response.statusText}`;

    logger.warn(`Workflow launch refused for ${workflowId}:`, message);

    // 422 carries per-error locators for a structurally invalid stored
    // definition — a different problem from the caller passing bad inputs.
    if (response.status === 422) {
      return { status: 'invalid-workflow', message, errors: payload.details ?? [] };
    }

    if (response.status === 400) {
      return { status: 'invalid-input', message };
    }

    return { status: 'failed', message };
  }
}

export const workflowLaunchService = new WorkflowLaunchService();
export { WorkflowLaunchService };
