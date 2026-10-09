/**
 * Runs service — the network side of the Test-mode Runs list.
 *
 * Lists a workflow's pipelines (paged, newest first), reads one run's status,
 * re-runs a finished run and cancels one that has not finished. Endpoints come
 * from `endpoints.pipelines` (`list`, `status`, `rerun`, `cancel`); a host
 * overrides them like any other endpoint. Cancel falls back to the `signals`
 * group when `pipelines.cancel` is not set.
 *
 * Like the signal service, refusals are results, not exceptions: a run that
 * ended meanwhile is an ordinary outcome. Only a failed list read throws.
 *
 * @module services/runsService
 */

import type { EndpointConfig } from '../config/endpoints.js';
import { buildEndpointUrl } from '../config/endpoints.js';
import { authenticatedFetch } from '../utils/fetchWithAuth.js';
import type { AuthProvider } from '../types/auth.js';
import { pageQuery, parseRuns, type RunSummary } from '../utils/runsList.js';
import { pipelineSignalService } from './pipelineSignalService.js';

export type RunActionResult =
  | { ok: true; pipelineId?: string; status?: string }
  | { ok: false; message: string };

/** What the list needs to know of the configuration. */
export function runsSupport(config: EndpointConfig | null): {
  list: boolean;
  rerun: boolean;
  cancel: boolean;
} {
  const pipelines = config?.endpoints?.pipelines;
  return {
    list: !!pipelines?.list,
    rerun: !!pipelines?.rerun,
    cancel: !!pipelines?.cancel || !!config?.endpoints?.signals
  };
}

async function message(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  return payload.error ?? payload.message ?? `HTTP ${response.status}: ${response.statusText}`;
}

/** One page of a workflow's runs, newest first. Throws when the read fails. */
export async function listRuns(
  config: EndpointConfig,
  workflowId: string,
  page: { offset: number; limit?: number },
  authProvider?: AuthProvider
): Promise<RunSummary[]> {
  const base = buildEndpointUrl(config, config.endpoints.pipelines.list, {
    workflow_id: workflowId
  });
  const url = `${base}${base.includes('?') ? '&' : '?'}${pageQuery(page.offset, page.limit)}`;
  const response = await authenticatedFetch(
    url,
    { method: 'GET' },
    { config, endpointKey: 'pipelines.list', authProvider }
  );
  if (!response.ok) throw new Error(await message(response));
  const body = (await response.json()) as { success?: boolean; data?: unknown; error?: string };
  if (body.success === false) throw new Error(body.error ?? 'Failed to list runs');
  return parseRuns(body.data);
}

/** The status of one run (`pipelines.status`), or `undefined` when it cannot be read. */
export async function readRunStatus(
  config: EndpointConfig,
  pipelineId: string,
  authProvider?: AuthProvider
): Promise<string | undefined> {
  const url = buildEndpointUrl(config, config.endpoints.pipelines.status, { id: pipelineId });
  const response = await authenticatedFetch(
    url,
    { method: 'GET' },
    { config, endpointKey: 'pipelines.status', authProvider }
  );
  if (!response.ok) return undefined;
  const body = (await response.json().catch(() => null)) as {
    data?: { status?: string };
  } | null;
  return body?.data?.status;
}

/** Re-run a finished run; the answer names the new pipeline. */
export async function rerunRun(
  config: EndpointConfig,
  pipelineId: string,
  authProvider?: AuthProvider
): Promise<RunActionResult> {
  const path = config.endpoints.pipelines.rerun;
  if (!path) return { ok: false, message: 'Re-run is not available.' };
  const response = await authenticatedFetch(
    buildEndpointUrl(config, path, { id: pipelineId }),
    { method: 'POST', body: JSON.stringify({}) },
    { config, endpointKey: 'pipelines.rerun', authProvider }
  );
  if (!response.ok) return { ok: false, message: await message(response) };
  const body = (await response.json().catch(() => null)) as {
    data?: { pipeline_id?: string | number; status?: string };
  } | null;
  const id = body?.data?.pipeline_id;
  return {
    ok: true,
    pipelineId: id === undefined ? undefined : String(id),
    status: body?.data?.status
  };
}

/** Cancel a run that has not finished. */
export async function cancelRun(
  config: EndpointConfig,
  pipelineId: string,
  authProvider?: AuthProvider
): Promise<RunActionResult> {
  const path = config.endpoints.pipelines.cancel;
  if (!path) {
    const result = await pipelineSignalService.cancel(config, pipelineId, {}, authProvider);
    if (result.status === 'accepted') return { ok: true, pipelineId };
    return {
      ok: false,
      message: result.status === 'refused' ? result.message : 'Cancel is not available.'
    };
  }
  const response = await authenticatedFetch(
    buildEndpointUrl(config, path, { id: pipelineId }),
    { method: 'POST', body: JSON.stringify({}) },
    { config, endpointKey: 'pipelines.cancel', authProvider }
  );
  if (!response.ok) return { ok: false, message: await message(response) };
  return { ok: true, pipelineId };
}
