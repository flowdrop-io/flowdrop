/**
 * The Playground docked in Test mode: built on PlaygroundSurface (not the
 * standalone wrapper), the first send creates the session, and the session
 * and its run outlive the component, so switching back to Edit loses nothing.
 * Mounted for real (client build, happy-dom), fetch stubbed per URL.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import DockedPlayground from '$lib/components/playground/DockedPlayground.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
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

interface Call {
  url: string;
  method: string;
  body: unknown;
}

let calls: Call[] = [];
let sessionList: unknown[] = [];
const originalFetch = global.fetch;
let fd: ReturnType<typeof createFlowDropInstance>;
let mounted: ReturnType<typeof mount> | null = null;

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

function workflow(id = 'wf'): Workflow {
  return {
    id,
    name: id,
    nodes: [],
    edges: [],
    metadata: { schemaVersion: '1', createdAt: '', updatedAt: '' }
  };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tick();
  }
  flushSync();
}

function render(wf: Workflow) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(DockedPlayground, {
    target,
    props: { workflow: wf },
    context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
  });
  return target;
}

async function unmountDock(): Promise<void> {
  if (mounted) await unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
  await settle();
}

beforeEach(() => {
  calls = [];
  sessionList = [];
  fd = createFlowDropInstance();
  fd.api.configure({
    ...structuredClone(defaultEndpointConfig),
    retry: { enabled: false, maxAttempts: 1, delay: 0 }
  });
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    if (/\/workflows\/[^/]+\/playground\/sessions/.test(url)) {
      return json({ success: true, data: method === 'POST' ? SESSION : sessionList });
    }
    if (url.includes('/playground/sessions/s-1/messages') && method === 'POST') {
      return json({
        success: true,
        data: {
          id: 'm-1',
          sessionId: 's-1',
          role: 'user',
          content: 'hi',
          timestamp: '2026-10-06T10:00:01Z',
          sequenceNumber: 1
        }
      });
    }
    if (url.includes('/playground/sessions/s-1/messages')) {
      return json({ success: true, data: [], sessionStatus: 'running', hasOlder: false });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
});

afterEach(async () => {
  await unmountDock();
  fd.playgroundService.stopPolling();
  fd.destroy();
  global.fetch = originalFetch;
});

describe('DockedPlayground', () => {
  it('lets the first send create the session, with no session to start from', async () => {
    const target = render(workflow());
    await settle();

    expect(fd.playground.currentSession).toBeNull();
    const textarea = target.querySelector<HTMLTextAreaElement>('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea!.disabled).toBe(false);
    // No call to create a session is offered up front.
    expect(target.querySelector('.execution-console__cta')).toBeNull();

    textarea!.value = 'hi';
    textarea!.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    target
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Send message"], button[aria-label="Save the workflow, then send the message"]'
      )!
      .click();
    await settle();

    const creates = calls.filter(
      (c) => c.method === 'POST' && /\/playground\/sessions$/.test(c.url)
    );
    expect(creates).toHaveLength(1);
    expect(fd.playground.currentSession?.id).toBe('s-1');
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/s-1/messages'))).toBe(true);
  });

  it('keeps the session and its polling when it goes away, and finds them again', async () => {
    const target = render(workflow());
    await settle();
    const textarea = target.querySelector<HTMLTextAreaElement>('textarea')!;
    textarea.value = 'hi';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    target
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Send message"], button[aria-label="Save the workflow, then send the message"]'
      )!
      .click();
    await settle();
    expect(fd.runs.isLive).toBe(true);
    expect(fd.runs.isPolling).toBe(true);

    await unmountDock();
    // Edit mode: the run goes on, so the dot on Test can show it.
    expect(fd.playground.currentSession?.id).toBe('s-1');
    expect(fd.runs.isPolling).toBe(true);
    expect(fd.runs.isLive).toBe(true);

    render(workflow());
    await settle();
    expect(fd.playground.currentSession?.id).toBe('s-1');
  });

  it("drops a session left by another workflow's Test mode", async () => {
    render(workflow('wf-a'));
    await settle();
    fd.playground.setCurrentSession({ ...SESSION, workflowId: 'wf-a', status: 'idle' } as never);
    await unmountDock();
    expect(fd.playground.currentSession).not.toBeNull();

    render(workflow('wf-b'));
    await settle();
    expect(fd.playground.currentSession).toBeNull();
  });

  it('follows the live workflow when its interface changes, without a remount', async () => {
    const input = (id: string, turn?: 'message' | 'history') => ({
      id,
      dataType: 'string',
      bindings: [],
      ...(turn && { turn })
    });
    const live = $state({
      workflow: { ...workflow(), interface: { inputs: [input('history', 'history')], outputs: [] } }
    });
    const target = document.createElement('div');
    document.body.appendChild(target);
    mounted = mount(DockedPlayground, {
      target,
      props: live,
      context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
    });
    await settle();
    expect(fd.playground.inputMode).toBe('run');

    live.workflow = {
      ...workflow(),
      interface: { inputs: [input('message', 'message')], outputs: [] }
    };
    await settle();
    expect(fd.playground.inputMode).toBe('chat');
    expect(target.querySelector('textarea')).not.toBeNull();
  });
});
