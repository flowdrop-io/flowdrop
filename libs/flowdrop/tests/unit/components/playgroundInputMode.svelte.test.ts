/**
 * The Playground picks its input from the workflow interface's turn ports:
 *   - `message` port → the chat box, content goes to the turn
 *   - turn ports but no `message` → a form of the non-turn inputs and Run;
 *     the turn sends `inputs` and no content
 *   - nothing to fill → Run alone
 *   - no `turn` anywhere (older servers, undeclared workflows) → unchanged
 * A server refusal (the 400 for content sent to a form-only workflow) shows
 * the server's message and leaves Run usable.
 * Mounted for real (client build, happy-dom), fetch stubbed per URL.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import Playground from '$lib/components/playground/Playground.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { defaultEndpointConfig } from '$lib/config/endpoints.js';
import { playgroundService } from '$lib/services/playgroundService.js';
import type { Workflow, WorkflowInterface, WorkflowPlayground } from '$lib/types/index.js';
import type { PlaygroundConfig } from '$lib/types/playground.js';

// Iconify fetches icon data with the fetch it captured at load, which would
// outlive the test; stub its API loader so icons resolve to nothing.
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
let turnResponse: { status: number; body: unknown } = {
  status: 200,
  body: {
    success: true,
    data: {
      id: 'm-1',
      sessionId: 's-1',
      role: 'user',
      content: '',
      timestamp: '2026-10-06T10:00:01Z',
      sequenceNumber: 1
    }
  }
};
let workflowsGetBody: unknown = { success: true, data: { id: 'wf', name: 'wf', nodes: [] } };
let mounted: ReturnType<typeof mount> | null = null;
const originalFetch = global.fetch;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

beforeEach(() => {
  calls = [];
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    if (url.includes('/workflows/wf/playground/sessions')) {
      return json(200, { success: true, data: [SESSION] });
    }
    if (url.endsWith('/workflows/wf')) return json(200, workflowsGetBody);
    if (url.includes('/playground/sessions/s-1/messages') && method === 'POST') {
      return json(turnResponse.status, turnResponse.body);
    }
    if (url.includes('/playground/sessions/s-1/messages')) {
      return json(200, { success: true, data: [], sessionStatus: 'idle', hasOlder: false });
    }
    if (url.includes('/playground/sessions/s-1'))
      return json(200, { success: true, data: SESSION });
    return json(404, { success: false, error: 'not stubbed' });
  }) as typeof fetch;
});

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  playgroundService.stopPolling();
  document.body.innerHTML = '';
  global.fetch = originalFetch;
  turnResponse = { ...turnResponse, status: 200 };
  workflowsGetBody = { success: true, data: { id: 'wf', name: 'wf', nodes: [] } };
});

function workflowWith(iface?: WorkflowInterface, playground?: WorkflowPlayground): Workflow {
  return {
    id: 'wf',
    name: 'wf',
    nodes: [],
    edges: [],
    metadata: { schemaVersion: '1', createdAt: '', updatedAt: '' },
    ...(iface ? { interface: iface } : {}),
    ...(playground ? { playground } : {})
  };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tick();
  }
  flushSync();
}

async function render(workflow: Workflow | undefined, config: PlaygroundConfig = {}) {
  const fd = createFlowDropInstance();
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(Playground, {
    target,
    props: {
      workflowId: 'wf',
      workflow,
      initialSessionId: 's-1',
      // No retries: a refused request must not outlive the test.
      endpointConfig: {
        ...structuredClone(defaultEndpointConfig),
        retry: { enabled: false, maxAttempts: 1, delay: 0 }
      },
      config,
      instance: fd
    }
  });
  await settle();
  return { target, fd };
}

function turnCalls(): Call[] {
  return calls.filter((c) => c.method === 'POST' && c.url.includes('/messages'));
}

function runButton(target: HTMLElement): HTMLButtonElement | null {
  return target.querySelector<HTMLButtonElement>('.chat-input__run-btn');
}

const message = {
  id: 'message',
  dataType: 'string',
  bindings: [],
  turn: 'message' as const
};
const history = {
  id: 'history',
  dataType: 'array',
  bindings: [],
  turn: 'history' as const
};
const topic = {
  id: 'topic',
  name: 'Topic',
  dataType: 'string',
  required: true,
  bindings: []
};
const reply = { id: 'reply', dataType: 'string', bindings: [], turn: 'reply' as const };

describe('Playground input mode', () => {
  it('chat: a message port gets the chat box and no form', async () => {
    const { target, fd } = await render(
      workflowWith({ inputs: [message, history], outputs: [reply] })
    );

    expect(fd.playground.inputMode).toBe('chat');
    expect(target.querySelector('textarea.chat-input__textarea')).not.toBeNull();
    expect(target.querySelector('.interface-input-form')).toBeNull();
  });

  it('form: no message port renders the non-turn inputs and sends inputs without content', async () => {
    const { target, fd } = await render(
      workflowWith({ inputs: [topic, history], outputs: [reply] })
    );

    expect(fd.playground.inputMode).toBe('form');
    expect(target.querySelector('textarea.chat-input__textarea')).toBeNull();
    const form = target.querySelector('.interface-input-form');
    expect(form).not.toBeNull();
    // Only the non-turn input: history is the session's to fill.
    expect(form?.textContent).toContain('Topic');
    expect(form?.textContent).not.toContain('history');

    const field = form?.querySelector<HTMLInputElement>('input');
    expect(field).not.toBeNull();
    field!.value = 'cats';
    field!.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    runButton(target)?.click();
    await settle();

    expect(turnCalls()).toHaveLength(1);
    expect(turnCalls()[0].body).toEqual({ inputs: { topic: 'cats' } });
  });

  it('form: a blank required input is refused before the request, and Run stays usable', async () => {
    const { target, fd } = await render(workflowWith({ inputs: [topic], outputs: [reply] }));

    runButton(target)?.click();
    await settle();

    expect(turnCalls()).toHaveLength(0);
    expect(fd.playground.error).toContain('Topic');
    expect(runButton(target)?.disabled).toBe(false);
  });

  it('run: nothing to fill gives Run alone, which sends empty inputs and no content', async () => {
    const { target, fd } = await render(workflowWith({ inputs: [history], outputs: [reply] }));

    expect(fd.playground.inputMode).toBe('run');
    expect(target.querySelector('textarea.chat-input__textarea')).toBeNull();
    expect(target.querySelector('.interface-input-form')).toBeNull();

    runButton(target)?.click();
    await settle();

    expect(turnCalls()).toHaveLength(1);
    expect(turnCalls()[0].body).toEqual({ inputs: {} });
  });

  it("shows the server's 400 message and re-enables Run", async () => {
    turnResponse = {
      status: 400,
      body: {
        success: false,
        error: 'This workflow takes no message; declare a `message` port or send `inputs`'
      }
    };
    const { target, fd } = await render(workflowWith({ inputs: [history], outputs: [reply] }));

    runButton(target)?.click();
    await settle();

    expect(fd.playground.error).toContain('declare a `message` port');
    expect(target.querySelector('.playground__error')?.textContent).toContain('takes no message');
    expect(fd.playground.sessionStatus).toBe('idle');
    expect(runButton(target)?.disabled).toBe(false);
  });

  it('run: Run works again for a second turn in the same session', async () => {
    const { target, fd } = await render(workflowWith({ inputs: [history], outputs: [reply] }));

    runButton(target)?.click();
    await settle();
    expect(turnCalls()).toHaveLength(1);

    // The turn finishes: the server never sends an enableRun message.
    fd.playground.updateSessionStatus('idle');
    await settle();
    expect(runButton(target)?.disabled).toBe(false);

    runButton(target)?.click();
    await settle();
    expect(turnCalls()).toHaveLength(2);
  });

  it('form: Run works again for a second turn in the same session', async () => {
    const { target, fd } = await render(workflowWith({ inputs: [topic], outputs: [reply] }));
    const field = target.querySelector<HTMLInputElement>('.interface-input-form input');
    field!.value = 'cats';
    field!.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    runButton(target)?.click();
    await settle();
    fd.playground.updateSessionStatus('idle');
    await settle();
    runButton(target)?.click();
    await settle();

    expect(turnCalls()).toHaveLength(2);
  });

  it('legacy: an interface without turn ports keeps the chat box', async () => {
    const { target, fd } = await render(workflowWith({ inputs: [topic] }));

    expect(fd.playground.inputMode).toBe('legacy');
    expect(target.querySelector('textarea.chat-input__textarea')).not.toBeNull();
    expect(target.querySelector('.interface-input-form')).toBeNull();
  });

  it('loads the interface through workflows.get when the host passes none', async () => {
    workflowsGetBody = {
      success: true,
      data: workflowWith({ inputs: [topic], outputs: [reply] })
    };
    const { fd } = await render(workflowWith());

    expect(calls.some((c) => c.method === 'GET' && c.url.endsWith('/workflows/wf'))).toBe(true);
    expect(fd.playground.inputMode).toBe('form');
  });

  it('stays legacy when loading the workflow fails', async () => {
    workflowsGetBody = { success: false, error: 'nope' };
    const { target, fd } = await render(undefined);

    expect(fd.playground.inputMode).toBe('legacy');
    expect(target.querySelector('textarea.chat-input__textarea')).not.toBeNull();
  });

  it('legacy: Run still launches, and a refused launch is reported (messages read at init)', async () => {
    const { target } = await render(workflowWith(), { showChatInput: false });

    runButton(target)?.click();
    await settle();

    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/workflow/wf/run'))).toBe(true);
    expect(target.querySelector('.chat-input__command-feedback')).not.toBeNull();
    expect(turnCalls()).toHaveLength(0);
  });

  it('legacy: Run with a slash-command predefinedMessage runs the command and frees Run', async () => {
    const { target } = await render(workflowWith(), {
      showChatInput: false,
      predefinedMessage: '/help'
    });

    runButton(target)?.click();
    await settle();

    // The command ran (no turn was taken), and nothing is left to unlock Run.
    expect(turnCalls()).toHaveLength(0);
    expect(runButton(target)?.disabled).toBe(false);
  });
});

describe('Playground input mode with Playground settings', () => {
  const plain = (id: string) => ({ id, dataType: 'string', bindings: [] });
  const emptyChat = {
    message: null,
    history: null,
    session_id: null,
    message_id: null,
    replies: [],
    sub_workflow_replies: false
  };

  it('chat: a bound message input gets the chat box, the other inputs a form beside it', async () => {
    const { target, fd } = await render(
      workflowWith(
        { inputs: [plain('msg'), plain('hist'), topic], outputs: [] },
        {
          chat: {
            ...emptyChat,
            message: 'msg',
            history: { input: 'hist', limit: 5 },
            replies: [{ node_id: 'n', port: 'p' }]
          }
        }
      )
    );

    expect(fd.playground.inputMode).toBe('chat');
    expect(fd.playground.chatBinding?.source).toBe('settings');
    expect(target.querySelector('textarea.chat-input__textarea')).not.toBeNull();
    const form = target.querySelector('.interface-input-form');
    expect(form?.textContent).toContain('Topic');
    expect(form?.textContent).not.toContain('msg');
    expect(form?.textContent).not.toContain('hist');
  });

  it('chat: a bound message wins over a legacy-looking interface without turns', async () => {
    const { target, fd } = await render(
      workflowWith({ inputs: [plain('msg')] }, { chat: { ...emptyChat, message: 'msg' } })
    );

    expect(fd.playground.inputMode).toBe('chat');
    expect(target.querySelector('textarea.chat-input__textarea')).not.toBeNull();
    expect(target.querySelector('.interface-input-form')).toBeNull();
  });

  it('form: settings with no chat and no turns show the form, never the chat box', async () => {
    const { target, fd } = await render(workflowWith({ inputs: [topic] }, { chat: null }));

    expect(fd.playground.inputMode).toBe('form');
    expect(fd.playground.chatBinding?.source).toBe('none');
    expect(target.querySelector('textarea.chat-input__textarea')).toBeNull();
    expect(target.querySelector('.interface-input-form')?.textContent).toContain('Topic');
  });

  it('form: sends inputs and no content when nothing is bound', async () => {
    const { target } = await render(workflowWith({ inputs: [topic] }, { chat: null }));
    const field = target.querySelector<HTMLInputElement>('.interface-input-form input');
    field!.value = 'cats';
    field!.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    runButton(target)?.click();
    await settle();

    expect(turnCalls()).toHaveLength(1);
    expect(turnCalls()[0].body).toEqual({ inputs: { topic: 'cats' } });
  });

  it('run: settings with no chat and no inputs give Run alone, not legacy', async () => {
    const { target, fd } = await render(workflowWith({ outputs: [plain('out')] }, { chat: null }));

    expect(fd.playground.inputMode).toBe('run');
    expect(target.querySelector('textarea.chat-input__textarea')).toBeNull();
    expect(target.querySelector('.interface-input-form')).toBeNull();

    runButton(target)?.click();
    await settle();
    expect(turnCalls()[0].body).toEqual({ inputs: {} });
  });

  it('run: a workflow with settings and no interface at all is run, not legacy', async () => {
    const { target, fd } = await render(workflowWith(undefined, { chat: null }));

    expect(fd.playground.inputMode).toBe('run');
    expect(target.querySelector('textarea.chat-input__textarea')).toBeNull();
  });

  it('chat: a workflow with null chat still chats through the deprecated turn', async () => {
    const { target, fd } = await render(
      workflowWith({ inputs: [message, topic], outputs: [reply] }, { chat: null })
    );

    expect(fd.playground.inputMode).toBe('chat');
    expect(fd.playground.chatBinding?.source).toBe('interface_turn');
    expect(target.querySelector('textarea.chat-input__textarea')).not.toBeNull();
  });

  it('a bound name that is not on the interface binds nothing: form, not chat', async () => {
    const { target, fd } = await render(
      workflowWith({ inputs: [topic] }, { chat: { ...emptyChat, message: 'gone' } })
    );

    expect(fd.playground.inputMode).toBe('form');
    expect(target.querySelector('textarea.chat-input__textarea')).toBeNull();
  });
});
