/**
 * Doctor service: the network side of the Problems indicator.
 *
 * `diagnose` sends the editor's draft and answers the problems found in it;
 * `remedy` asks the server what one remedy changes and answers the operations
 * (see `utils/doctorOperations.ts`). Neither saves anything.
 *
 * Refusals are results, not exceptions: a 409 (the problem is already gone) is
 * an ordinary outcome of editing while a request is in flight.
 *
 * @module services/doctorService
 */

import type { EndpointConfig } from '../config/endpoints.js';
import { buildEndpointUrl } from '../config/endpoints.js';
import { authenticatedFetch } from '../utils/fetchWithAuth.js';
import type { AuthProvider } from '../types/auth.js';
import type { DoctorProblem, DoctorRemedy, DoctorSeverity } from '../types/doctor.js';
import type { Workflow } from '../types/index.js';

export type DiagnoseResult =
  | { status: 'ok'; problems: DoctorProblem[] }
  /** The backend has no such route or does not know this workflow: the feature stays quiet. */
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export type RemedyResult =
  | { status: 'ok'; operations: unknown[] }
  /** The problem is no longer in the draft. */
  | { status: 'conflict' }
  | { status: 'error'; message: string };

/** Whether the configuration offers the Doctor at all. */
export function doctorSupported(config: EndpointConfig | null | undefined): boolean {
  const workflows = config?.endpoints?.workflows;
  return !!workflows?.diagnose && !!workflows?.remedy;
}

const SEVERITIES: readonly DoctorSeverity[] = ['error', 'warning', 'info'];

function parseRemedy(raw: unknown): DoctorRemedy | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.label !== 'string') return null;
  const params = r.params;
  return {
    id: r.id,
    label: r.label,
    description: typeof r.description === 'string' ? r.description : undefined,
    destructive: r.destructive === true,
    ...(typeof params === 'object' && params !== null && !Array.isArray(params)
      ? { params: params as DoctorRemedy['params'] }
      : {})
  };
}

/** Read the `problems` of a diagnose answer, dropping entries that are not one. */
export function parseProblems(data: unknown): DoctorProblem[] {
  const list = (data as { problems?: unknown } | null | undefined)?.problems;
  if (!Array.isArray(list)) return [];
  const problems: DoctorProblem[] = [];
  for (const raw of list) {
    if (typeof raw !== 'object' || raw === null) continue;
    const p = raw as Record<string, unknown>;
    if (typeof p.id !== 'string' || typeof p.message !== 'string') continue;
    const severity = SEVERITIES.includes(p.severity as DoctorSeverity)
      ? (p.severity as DoctorSeverity)
      : 'warning';
    problems.push({
      id: p.id,
      code: typeof p.code === 'string' ? p.code : '',
      severity,
      message: p.message,
      ...(typeof p.node === 'string' && { node: p.node }),
      ...(typeof p.port === 'string' && { port: p.port }),
      ...(typeof p.edge === 'string' && { edge: p.edge }),
      remedies: (Array.isArray(p.remedies) ? p.remedies : [])
        .map(parseRemedy)
        .filter((r): r is DoctorRemedy => r !== null)
    });
  }
  return problems;
}

async function errorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  return payload.error ?? payload.message ?? `HTTP ${response.status}: ${response.statusText}`;
}

/** Diagnose the draft of the saved workflow `workflowId`. */
export async function diagnoseDraft(
  config: EndpointConfig,
  workflowId: string,
  draft: Workflow,
  authProvider?: AuthProvider
): Promise<DiagnoseResult> {
  const path = config.endpoints.workflows.diagnose;
  if (!path) return { status: 'unavailable' };
  try {
    const response = await authenticatedFetch(
      buildEndpointUrl(config, path, { id: workflowId }),
      { method: 'POST', body: JSON.stringify(draft) },
      { config, endpointKey: 'workflows.diagnose', authProvider }
    );
    if (response.status === 404) return { status: 'unavailable' };
    if (!response.ok) return { status: 'error', message: await errorMessage(response) };
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: unknown;
      error?: string;
    } | null;
    if (!body || body.success === false) {
      return { status: 'error', message: body?.error ?? 'Diagnose failed' };
    }
    return { status: 'ok', problems: parseProblems(body.data) };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}

/** Ask what `remedy` changes for `problem` on the draft. */
export async function requestRemedy(
  config: EndpointConfig,
  workflowId: string,
  request: {
    draft: Workflow;
    code: string;
    target: string;
    remedy: string;
    params?: Record<string, unknown>;
  },
  authProvider?: AuthProvider
): Promise<RemedyResult> {
  const path = config.endpoints.workflows.remedy;
  if (!path) return { status: 'error', message: 'Remedies are not available.' };
  try {
    const response = await authenticatedFetch(
      buildEndpointUrl(config, path, { id: workflowId }),
      { method: 'POST', body: JSON.stringify(request) },
      { config, endpointKey: 'workflows.remedy', authProvider }
    );
    if (response.status === 409) return { status: 'conflict' };
    if (!response.ok) return { status: 'error', message: await errorMessage(response) };
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: { operations?: unknown };
      error?: string;
    } | null;
    if (!body || body.success === false || !Array.isArray(body.data?.operations)) {
      return { status: 'error', message: body?.error ?? 'The remedy did not answer operations.' };
    }
    return { status: 'ok', operations: body.data.operations };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}
