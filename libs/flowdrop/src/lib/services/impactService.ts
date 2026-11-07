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
import type {
  ImpactItem,
  ImpactRename,
  ImpactReport,
  ImpactSeverity,
  SavedCopy
} from '../types/impact.js';
import type { Workflow } from '../types/index.js';

export type ImpactResult =
  | { status: 'ok'; report: ImpactReport }
  /** The backend has no such route, refuses it, or does not know this workflow. */
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

const SEVERITIES: readonly ImpactSeverity[] = ['breaks', 'changes', 'info'];

/** Whether the configuration offers the impact check at all. */
export function impactSupported(config: EndpointConfig | null | undefined): boolean {
  return !!config?.endpoints?.workflows?.impact;
}

/** Read a list of impact items; entries without a label and message are skipped. */
export function parseImpactItems(raw: unknown): ImpactItem[] {
  const items: ImpactItem[] = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    if (typeof entry !== 'object' || entry === null) continue;
    const i = entry as Record<string, unknown>;
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
  return items;
}

function parseRenames(raw: unknown): ImpactRename[] {
  const renames: ImpactRename[] = [];
  const seen = new Set<string>();
  for (const entry of Array.isArray(raw) ? raw : []) {
    if (typeof entry !== 'object' || entry === null) continue;
    const r = entry as Record<string, unknown>;
    if (typeof r.from !== 'string' || typeof r.to !== 'string') continue;
    const direction = r.direction === 'output' ? 'output' : 'input';
    // The dialog keys its rows by direction and name: the first one wins.
    const key = `${direction}:${r.from}`;
    if (seen.has(key)) continue;
    seen.add(key);
    renames.push({
      direction,
      from: r.from,
      to: r.to,
      places: parseImpactItems(r.places)
    });
  }
  return renames;
}

export function parseReport(data: unknown): ImpactReport {
  const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const iface = (
    typeof d.interface === 'object' && d.interface !== null ? d.interface : {}
  ) as Record<string, unknown>;
  return {
    confirm: d.confirm === true,
    interfaceLevel: typeof iface.level === 'string' ? iface.level : '',
    interfaceBreaking: iface.breaking === true,
    items: parseImpactItems(d.items),
    refused: d.refused === true,
    refusedMessage:
      typeof d.refusedMessage === 'string' && d.refusedMessage ? d.refusedMessage : null,
    copyUrl: typeof d.copyUrl === 'string' && d.copyUrl ? d.copyUrl : null,
    renames: parseRenames(d.renames)
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
    // 404/405: no such route. 401/403: a backend that answers an unknown route
    // with a login or access refusal. The route ships in the default endpoints,
    // so these must not read as a failed check before every save.
    if ([401, 403, 404, 405].includes(response.status)) return { status: 'unavailable' };
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

/**
 * Whether a `copyUrl` may receive the draft and the auth headers: a path on
 * this site (one `/`, not `//` or `/\`) or a URL on the API base's origin.
 */
export function isSafeCopyUrl(config: EndpointConfig, copyUrl: string): boolean {
  if (/^\/(?![/\\])/.test(copyUrl)) return true;
  try {
    const here = typeof window !== 'undefined' ? window.location.href : undefined;
    const base = new URL(config.baseUrl, here);
    return new URL(copyUrl).origin === base.origin;
  } catch {
    return false;
  }
}

/**
 * Save the draft as a new workflow: POST it to the `copyUrl` the impact check
 * named (a path under the API base, or a full URL). Throws with the backend's
 * reason when it refuses. The answer names the copy as `{ data: { id,
 * editorUrl } }`; either may be missing.
 */
export async function saveAsCopy(
  config: EndpointConfig,
  authProvider: AuthProvider | undefined,
  copyUrl: string,
  draft: Workflow
): Promise<SavedCopy> {
  if (!isSafeCopyUrl(config, copyUrl)) throw new Error('The copy address is not on this server');
  const response = await authenticatedFetch(
    buildEndpointUrl(config, copyUrl),
    { method: 'POST', body: JSON.stringify(draft) },
    { config, endpointKey: 'workflows.copy', authProvider }
  );
  if (!response.ok) throw new Error(await errorMessage(response));
  const body = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: Record<string, unknown>;
    error?: string;
  } | null;
  if (body?.success === false) throw new Error(body.error ?? 'Saving a copy failed');
  const data = body?.data ?? {};
  const url = data.editorUrl ?? data.editor_url;
  const id = data.id;
  return {
    id: typeof id === 'string' || typeof id === 'number' ? String(id) : null,
    editorUrl: typeof url === 'string' && isFollowableUrl(url) ? url : null
  };
}

/** An editor URL the page may go to: a site path, or an http(s) address. */
function isFollowableUrl(url: string): boolean {
  if (!url || /[\t\n\r]/.test(url)) return false;
  if (/^\/(?![/\\])/.test(url)) return true;
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
