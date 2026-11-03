/**
 * Impact service: asks the backend what saving the editor's draft would change
 * for the workflows, profiles and triggers that use it. Nothing is saved.
 *
 * Refusals are results, not exceptions: a backend without the route simply
 * leaves the save unasked.
 *
 * @module services/impactService
 */

import type { EndpointConfig } from '../config/endpoints.js';
import { buildEndpointUrl } from '../config/endpoints.js';
import { authenticatedFetch } from '../utils/fetchWithAuth.js';
import type { AuthProvider } from '../types/auth.js';
import type { ImpactItem, ImpactReport, ImpactSeverity } from '../types/impact.js';
import type { Workflow } from '../types/index.js';

export type ImpactResult =
  | { status: 'ok'; report: ImpactReport }
  /** The backend has no such route or does not know this workflow. */
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

const SEVERITIES: readonly ImpactSeverity[] = ['breaks', 'changes', 'info'];

/** Whether the configuration offers the impact check at all. */
export function impactSupported(config: EndpointConfig | null | undefined): boolean {
  return !!config?.endpoints?.workflows?.impact;
}

function parseReport(data: unknown): ImpactReport {
  const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const iface = (
    typeof d.interface === 'object' && d.interface !== null ? d.interface : {}
  ) as Record<string, unknown>;
  const items: ImpactItem[] = [];
  for (const raw of Array.isArray(d.items) ? d.items : []) {
    if (typeof raw !== 'object' || raw === null) continue;
    const i = raw as Record<string, unknown>;
    if (typeof i.label !== 'string' || typeof i.message !== 'string') continue;
    items.push({
      kind: typeof i.kind === 'string' ? i.kind : '',
      severity: SEVERITIES.includes(i.severity as ImpactSeverity)
        ? (i.severity as ImpactSeverity)
        : 'info',
      label: i.label,
      message: i.message,
      url: typeof i.url === 'string' ? i.url : null
    });
  }
  return {
    confirm: d.confirm === true,
    interfaceLevel: typeof iface.level === 'string' ? iface.level : '',
    interfaceBreaking: iface.breaking === true,
    items
  };
}

async function errorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  return payload.error ?? payload.message ?? `HTTP ${response.status}: ${response.statusText}`;
}

/** Ask what saving `draft` over the saved workflow `workflowId` would change. */
export async function checkImpact(
  config: EndpointConfig,
  authProvider: AuthProvider | undefined,
  workflowId: string,
  draft: Workflow
): Promise<ImpactResult> {
  const path = config.endpoints.workflows.impact;
  if (!path) return { status: 'unavailable' };
  try {
    const response = await authenticatedFetch(
      buildEndpointUrl(config, path, { id: workflowId }),
      { method: 'POST', body: JSON.stringify(draft) },
      { config, endpointKey: 'workflows.impact', authProvider }
    );
    if (response.status === 404 || response.status === 405) return { status: 'unavailable' };
    if (!response.ok) return { status: 'error', message: await errorMessage(response) };
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: unknown;
      error?: string;
    } | null;
    if (!body || body.success === false) {
      return { status: 'error', message: body?.error ?? 'Impact check failed' };
    }
    return { status: 'ok', report: parseReport(body.data) };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}
