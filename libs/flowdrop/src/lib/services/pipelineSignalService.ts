/**
 * Pipeline Signal Service
 *
 * Operator signals *into* a running pipeline — pause, resume, cancel.
 *
 * The opposite direction from `interruptService`: an interrupt is raised by a
 * node inside a run and awaits an answer, while a signal is raised by an
 * external party and acts on a run that never asked.
 *
 * ## Why this returns a result instead of throwing
 *
 * Every refusal here is an ordinary, expected outcome the composer must render
 * differently — a run that already finished, a duplicate signal, a resume with
 * nothing to resume. Turning those into exceptions would force every caller to
 * re-parse HTTP status codes out of message strings. Only genuine transport
 * failures reject.
 *
 * ## Accepted is not applied
 *
 * A successful pause or cancel returns `accepted`, never `applied`. Backends
 * are expected to observe signals cooperatively — the reference implementation
 * polls between job steps, so the in-flight step always finishes first. Callers
 * must render "pause requested", not "paused", and let a status poll confirm.
 *
 * @module services/pipelineSignalService
 */

import type { EndpointConfig } from '../config/endpoints.js';
import { buildEndpointUrl } from '../config/endpoints.js';
import { authenticatedFetch } from '../utils/fetchWithAuth.js';
import type { AuthProvider } from '../types/auth.js';
import { logger } from '../utils/logger.js';

/**
 * Signals a pipeline can be sent.
 *
 * Open by design: this is the set the reference backend implements today, but
 * the direction is a general concept and other backends may define more. Widen
 * with care — the client must never offer a signal nothing implements.
 */
export type SignalType = 'pause' | 'resume' | 'cancel' | (string & {});

/** Why a signal was refused. Maps onto distinct, user-visible explanations. */
export type SignalRefusal =
  /** The run already finished — nothing left to signal. */
  | 'terminal'
  /** A signal is already pending on this pipeline; the backend rejects a second. */
  | 'duplicate'
  /** Resume with no pause outstanding. */
  | 'not-paused'
  /** No such pipeline. */
  | 'not-found'
  /** Caller lacks permission for this pipeline. */
  | 'forbidden'
  /** Refused for a reason this client does not model. */
  | 'rejected';

export type SignalResult =
  /**
   * The backend accepted the signal. It has *not* necessarily taken effect —
   * see the module docblock.
   */
  | { status: 'accepted'; signal: SignalType; pipelineId: string }
  | { status: 'refused'; reason: SignalRefusal; message: string }
  | { status: 'unsupported' };

/** Options accepted by every signal. */
export interface SendSignalOptions {
  /**
   * Free-text audit note recorded against the signal.
   *
   * Note this is an audit field, not an execution-control one. In the reference
   * backend a pipeline's *paused reason* is a separate, enumerated concept that
   * governs auto-resume, and an operator pause deliberately carries none — the
   * absence is what keeps a human-initiated pause from resuming itself. Sending
   * a note here must not populate that field.
   */
  reason?: string;
}

/** Map a refusal HTTP status + payload onto a modelled reason. */
function classifyRefusal(status: number, message: string): SignalRefusal {
  if (status === 404) return 'not-found';
  if (status === 403 || status === 401) return 'forbidden';

  if (status === 409) {
    const text = message.toLowerCase();
    if (text.includes('terminal')) return 'terminal';
    if (text.includes('already pending') || text.includes('already')) return 'duplicate';
    if (text.includes('no active pause') || text.includes('pause')) return 'not-paused';
    return 'rejected';
  }

  return 'rejected';
}

class PipelineSignalService {
  /**
   * True when this configuration exposes a signal plane at all.
   *
   * Callers gate on this rather than assuming: a backend without signals is a
   * supported configuration, not an error.
   */
  isSupported(config: EndpointConfig | null): boolean {
    return config?.endpoints?.signals != null;
  }

  /** Pause a running pipeline. */
  async pause(
    config: EndpointConfig | null,
    pipelineId: string,
    options: SendSignalOptions = {},
    authProvider?: AuthProvider
  ): Promise<SignalResult> {
    return this.#send(config, 'pause', pipelineId, options, authProvider);
  }

  /** Resume a paused pipeline. */
  async resume(
    config: EndpointConfig | null,
    pipelineId: string,
    options: SendSignalOptions = {},
    authProvider?: AuthProvider
  ): Promise<SignalResult> {
    return this.#send(config, 'resume', pipelineId, options, authProvider);
  }

  /** Cancel a running pipeline. Terminal and durable — it cannot be undone. */
  async cancel(
    config: EndpointConfig | null,
    pipelineId: string,
    options: SendSignalOptions = {},
    authProvider?: AuthProvider
  ): Promise<SignalResult> {
    return this.#send(config, 'cancel', pipelineId, options, authProvider);
  }

  async #send(
    config: EndpointConfig | null,
    signal: 'pause' | 'resume' | 'cancel',
    pipelineId: string,
    options: SendSignalOptions,
    authProvider?: AuthProvider
  ): Promise<SignalResult> {
    const signals = config?.endpoints?.signals;
    if (!config || !signals) return { status: 'unsupported' };

    const url = buildEndpointUrl(config, signals[signal], { pipelineId }, signals.baseUrl);

    const response = await authenticatedFetch(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options.reason ? { reason: options.reason } : {})
      },
      { config, endpointKey: 'signals', authProvider }
    );

    if (response.ok) {
      return { status: 'accepted', signal, pipelineId };
    }

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    const message =
      payload.error ?? payload.message ?? `HTTP ${response.status}: ${response.statusText}`;

    logger.warn(`Pipeline signal "${signal}" refused for ${pipelineId}:`, message);

    return {
      status: 'refused',
      reason: classifyRefusal(response.status, message),
      message
    };
  }
}

export const pipelineSignalService = new PipelineSignalService();
export { PipelineSignalService };
