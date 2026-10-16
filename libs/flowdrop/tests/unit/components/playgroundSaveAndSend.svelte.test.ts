/**
 * The editor's Playground sends what the person sees: while the workflow has
 * unsaved edits Send reads "Save & send", saves through the editor's own save
 * first, and sends nothing (keeping the typed text) when the save fails.
 * Mounted for real (client build, happy-dom), fetch stubbed per URL.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import PlaygroundSurface from '$lib/components/playground/PlaygroundSurface.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { defaultEndpointConfig } from '$lib/config/endpoints.js';
import { playgroundService } from '$lib/services/playgroundService.js';
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

let log: string[] = [];
let mounted: ReturnType<typeof mount> | null = null;
const originalFetch = global.fetch;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

beforeEach(() => {
  log = [];
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.includes('/workflows/wf/playground/sessions')) {
      if (method === 'POST') log.push('create-session');
      return json(method === 'POST' ? 201 : 200, {
        success: true,
        data: method === 'POST' ? SESSION : []
      });
    }
    if (url.includes('/playground/sessions/s-1/messages') && method === 'POST') {
      log.push('send');
      return json(200, {
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
      return json(200, { success: true, data: [], sessionStatus: 'idle', hasOlder: false });
    }
    if (url.includes('/playground/sessions/s-1')) {
      return json(200, { success: true, data: SESSION });
    }
    return json(404, { success: false, error: 'not stubbed' });
  }) as typeof fetch;
});

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  playgroundService.stopPolling();
  document.body.innerHTML = '';
  global.fetch = originalFetch;
});

const WORKFLOW: Workflow = {
  id: 'wf',
  name: 'wf',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1', createdAt: '', updatedAt: '' },
  interface: {
    inputs: [{ id: 'message', dataType: 'string', bindings: [] }],
    outputs: [{ id: 'reply', dataType: 'string', bindings: [] }]
  },
  playground: {
    chat: {
      message: 'message',
      history: null,
      session_id: null,
      message_id: null,
      replies: [{ node_id: 'n', port: 'reply' }],
      sub_workflow_replies: false
    }
  }
};

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tick();
  }
  flushSync();
}

async function render(onSave: () => Promise<boolean>) {
  const fd = createFlowDropInstance();
  fd.workflow.initialize(structuredClone(WORKFLOW));
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(PlaygroundSurface, {
    target,
    props: {
      workflowId: 'wf',
      workflow: fd.workflow.current ?? undefined,
      mode: 'embedded',
      retainSession: true,
      followWorkflow: true,
      sessionOptional: true,
      playgroundSessionsOnly: true,
      onSave,
      endpointConfig: {
        ...structuredClone(defaultEndpointConfig),
        baseUrl: 'http://save-and-send.test',
        retry: { enabled: false, maxAttempts: 1, delay: 0 }
      },
      instance: fd
    }
  });
  await settle();
  return { fd, target };
}

function sendButton(target: HTMLElement): HTMLButtonElement {
  return target.querySelector<HTMLButtonElement>(
    'button[aria-label="Send message"], button[aria-label="Save the workflow, then send the message"]'
  )!;
}

async function type(target: HTMLElement, text: string): Promise<void> {
  const input = target.querySelector<HTMLTextAreaElement>('textarea')!;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle();
}

describe('Save & send', () => {
  it('names Send while the workflow is saved, and Save & send once it has edits', async () => {
    const { fd, target } = await render(async () => true);
    expect(sendButton(target).getAttribute('aria-label')).toBe('Send message');

    fd.workflow.batchUpdate({ name: 'edited' });
    await settle();

    expect(sendButton(target).getAttribute('aria-label')).toBe(
      'Save the workflow, then send the message'
    );
    expect(target.textContent).toContain('Unsaved edits');
  });

  it('saves first, then sends', async () => {
    const onSave = vi.fn(async () => {
      log.push('save');
      return true;
    });
    const { fd, target } = await render(onSave);
    fd.workflow.batchUpdate({ name: 'edited' });
    await type(target, 'hi');

    sendButton(target).click();
    await settle();

    expect(log).toEqual(['save', 'create-session', 'send']);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('sends without saving when there is nothing to save', async () => {
    const onSave = vi.fn(async () => true);
    const { target } = await render(onSave);
    await type(target, 'hi');

    sendButton(target).click();
    await settle();

    expect(onSave).not.toHaveBeenCalled();
    expect(log).toContain('send');
  });

  it('sends nothing and keeps the text when the save fails, and says why', async () => {
    const { fd, target } = await render(async () => {
      throw new Error('Validation failed');
    });
    fd.workflow.batchUpdate({ name: 'edited' });
    await type(target, 'hi');

    sendButton(target).click();
    await settle();

    expect(log).not.toContain('send');
    expect(log).not.toContain('create-session');
    expect(target.querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('hi');
    expect(target.textContent).toContain('Validation failed');
  });
});
