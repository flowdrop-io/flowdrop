/**
 * PlaygroundSurface lifecycle: the initial session loads once, async setup does
 * not write after unmount, and `flowdrop:refresh-status` reaches only the
 * editor it was aimed at. Mounted for real (happy-dom), fetch stubbed per URL.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import PlaygroundSurface from '$lib/components/playground/PlaygroundSurface.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { defaultEndpointConfig } from '$lib/config/endpoints.js';
import type { Workflow } from '$lib/types/index.js';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

const SESSION = {
  id: 's-1',
  workflowId: 'wf',
  name: 'Session 1',
  status: 'idle',
  createdAt: '2026-10-06T10:00:00Z',
  updatedAt: '2026-10-06T10:00:00Z'
};

let urls: string[] = [];
let releaseSessions: (() => void) | null = null;
let holdSessions = false;
const originalFetch = global.fetch;
let instances: ReturnType<typeof createFlowDropInstance>[] = [];
let mounts: ReturnType<typeof mount>[] = [];

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

const workflow: Workflow = {
  id: 'wf',
  name: 'wf',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1', createdAt: '', updatedAt: '' }
};

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tick();
  }
  flushSync();
}

function render(props: Record<string, unknown> = {}) {
  const fd = createFlowDropInstance();
  fd.api.configure({
    ...structuredClone(defaultEndpointConfig),
    retry: { enabled: false, maxAttempts: 1, delay: 0 }
  });
  instances.push(fd);
  const host = document.body.appendChild(document.createElement('div'));
  const app = mount(PlaygroundSurface, {
    target: host,
    props: { workflowId: 'wf', workflow, instance: fd, mode: 'embedded', ...props }
  });
  mounts.push(app);
  return { fd, host, app };
}

beforeEach(() => {
  urls = [];
  holdSessions = false;
  releaseSessions = null;
  instances = [];
  mounts = [];
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    urls.push(`${method} ${url}`);
    if (/\/workflows\/[^/]+\/playground\/sessions$/.test(url) && method === 'GET') {
      if (holdSessions) await new Promise<void>((r) => (releaseSessions = r));
      return json({ success: true, data: [SESSION] });
    }
    if (url.includes('/playground/sessions/s-1/messages')) {
      return json({ success: true, data: [], sessionStatus: 'idle', hasOlder: false });
    }
    if (url.includes('/playground/sessions/s-1')) {
      return json({ success: true, data: SESSION });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
});

afterEach(async () => {
  for (const m of mounts) await unmount(m).catch(() => {});
  for (const fd of instances) {
    fd.playgroundService.stopPolling();
    fd.destroy();
  }
  document.body.innerHTML = '';
  global.fetch = originalFetch;
  await settle();
});

describe('PlaygroundSurface lifecycle', () => {
  it('loads the initial session once', async () => {
    render({ initialSessionId: 's-1' });
    await settle();
    const sessionLoads = urls.filter((u) => /GET .*\/playground\/sessions\/s-1(\?|$)/.test(u));
    const messageLoads = urls.filter((u) => /GET .*\/s-1\/messages/.test(u));
    expect(sessionLoads.length + messageLoads.length).toBeGreaterThan(0);
    expect(sessionLoads.length).toBeLessThanOrEqual(1);
    expect(messageLoads.length).toBeLessThanOrEqual(1);
  });

  it('does not auto-run once unmounted while sessions were loading', async () => {
    holdSessions = true;
    const { fd, app } = render({ config: { autoRun: true } });
    await settle();
    await unmount(app);
    mounts = [];
    const startRun = vi.spyOn(fd.runs, 'startRun');
    releaseSessions?.();
    await settle();
    expect(startRun).not.toHaveBeenCalled();
  });

  it('refreshes only the editor a refresh-status event is aimed at', async () => {
    const a = render();
    const b = render();
    await settle();
    const refreshA = vi.spyOn(a.fd.runs, 'refresh').mockResolvedValue(undefined as never);
    const refreshB = vi.spyOn(b.fd.runs, 'refresh').mockResolvedValue(undefined as never);

    a.host.dispatchEvent(new CustomEvent('flowdrop:refresh-status', { bubbles: true }));
    expect(refreshA).toHaveBeenCalledTimes(1);
    expect(refreshB).not.toHaveBeenCalled();

    // A document-level event still reaches every editor.
    document.dispatchEvent(new CustomEvent('flowdrop:refresh-status'));
    expect(refreshA).toHaveBeenCalledTimes(2);
    expect(refreshB).toHaveBeenCalledTimes(1);
  });
});
