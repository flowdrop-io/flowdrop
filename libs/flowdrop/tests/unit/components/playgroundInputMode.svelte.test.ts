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
let sessionMessages: unknown[] = [];
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
      return json(200, {
        success: true,
        data: sessionMessages,
        sessionStatus: 'idle',
        hasOlder: false
      });
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
  sessionMessages = [];
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

/**
 * `baseUrl`: the Playground remembers, per base URL and for the page, a server
 * that sends no Playground settings. A test that teaches it that uses its own
 * URL, so no other test inherits it.
 */
async function render(
  workflow: Workflow | undefined,
  config: PlaygroundConfig = {},
  {
    fd = createFlowDropInstance(),
    baseUrl
  }: { fd?: ReturnType<typeof createFlowDropInstance>; baseUrl?: string } = {}
) {
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
        ...(baseUrl !== undefined && { baseUrl }),
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

/** Run: the inputs card's blue button, or the composer's when there is no card. */
function runButton(target: HTMLElement): HTMLButtonElement | null {
  return (
    target.querySelector<HTMLButtonElement>('.interface-input-form__actions button') ??
    target.querySelector<HTMLButtonElement>('.chat-input .flowdrop-ui-button--primary')
  );
}

/** Type into an input or textarea the way a person does. */
function type(field: HTMLInputElement | HTMLTextAreaElement | null, text: string): void {
  field!.value = text;
  field!.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
}

/** Open the folded Inputs row above a chat composer. */
async function openInputs(target: HTMLElement): Promise<void> {
  target.querySelector<HTMLButtonElement>('.control-panel__inputs-row')?.click();
  await settle();
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
    expect(target.querySelector('textarea')).not.toBeNull();
    expect(target.querySelector('.interface-input-form')).toBeNull();
  });

  it('form: no message port renders the non-turn inputs and sends inputs without content', async () => {
    const { target, fd } = await render(
      workflowWith({ inputs: [topic, history], outputs: [reply] })
    );

    expect(fd.playground.inputMode).toBe('form');
    expect(target.querySelector('textarea')).toBeNull();
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
    // Under the Run button, not in the banner.
    expect(fd.playground.launchError).toContain('Topic');
    expect(fd.playground.error).toBeNull();
    expect(target.querySelector('.interface-input-form__error')?.textContent).toContain('Topic');
    expect(runButton(target)?.disabled).toBe(false);
  });

  it('run: nothing to fill gives Run alone, which sends empty inputs and no content', async () => {
    const { target, fd } = await render(workflowWith({ inputs: [history], outputs: [reply] }));

    expect(fd.playground.inputMode).toBe('run');
    expect(target.querySelector('textarea')).toBeNull();
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

    expect(fd.playground.launchError).toContain('declare a `message` port');
    expect(target.querySelector('.chat-input__launch-error')?.textContent).toContain(
      'takes no message'
    );
    expect(target.querySelector('.playground__error')).toBeNull();
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

  it('form: Cmd+Enter and Ctrl+Enter run from inside a field; plain Enter does not', async () => {
    const { target } = await render(workflowWith({ inputs: [topic], outputs: [reply] }));
    const field = target.querySelector<HTMLInputElement>('.interface-input-form input');
    type(field, 'cats');

    const press = (init: KeyboardEventInit) =>
      field!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, ...init }));
    press({});
    await settle();
    expect(turnCalls()).toHaveLength(0);

    press({ metaKey: true });
    await settle();
    expect(turnCalls()).toHaveLength(1);
    expect(turnCalls()[0].body).toEqual({ inputs: { topic: 'cats' } });
  });

  it('form: Ctrl+Enter refuses a blank required input the way Run does', async () => {
    const { target, fd } = await render(workflowWith({ inputs: [topic], outputs: [reply] }));
    const field = target.querySelector<HTMLInputElement>('.interface-input-form input');

    field!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true })
    );
    await settle();

    expect(turnCalls()).toHaveLength(0);
    expect(fd.playground.launchError).toContain('Topic');
  });

  it('form: an array typed as JSON is sent parsed, and bad JSON is named under Run', async () => {
    const tags = { id: 'tags', name: 'Tags', dataType: 'array', bindings: [] };
    const { target, fd } = await render(workflowWith({ inputs: [tags], outputs: [reply] }));
    const box = target.querySelector<HTMLTextAreaElement>('.interface-input-form textarea');
    expect(box).not.toBeNull();

    type(box, '[1, 2');
    runButton(target)?.click();
    await settle();
    expect(turnCalls()).toHaveLength(0);
    expect(fd.playground.launchError).toContain('Tags');
    expect(target.querySelector('.interface-input-form__error')?.textContent).toContain('Tags');

    type(box, '[1, 2]');
    runButton(target)?.click();
    await settle();
    expect(turnCalls()[0].body).toEqual({ inputs: { tags: [1, 2] } });
  });

  it('form: an example chip fills the field from the interface definition', async () => {
    const tags = {
      id: 'tags',
      name: 'Tags',
      dataType: 'array',
      bindings: [],
      examples: [['a', 'b']]
    };
    const { target } = await render(workflowWith({ inputs: [tags], outputs: [reply] }));

    const chip = target.querySelector<HTMLButtonElement>('.flowdrop-ui-field__examples button');
    expect(chip?.textContent).toContain('["a","b"]');
    chip!.click();
    await settle();

    const box = target.querySelector<HTMLTextAreaElement>('.interface-input-form textarea');
    expect(box?.value).toBe('["a","b"]');
    runButton(target)?.click();
    await settle();
    expect(turnCalls()[0].body).toEqual({ inputs: { tags: ['a', 'b'] } });
  });

  it('form: Fill from last run and the earlier-runs list refill the fields without running', async () => {
    const turn = (id: string, topicValue: string) => ({
      id,
      sessionId: 's-1',
      role: 'user',
      content: '',
      timestamp: '2026-10-06T10:00:01Z',
      sequenceNumber: Number(id.slice(-1)),
      metadata: { inputs: { topic: topicValue, gone: 'x' } }
    });
    sessionMessages = [turn('m-1', 'dogs'), turn('m-2', 'cats')];
    const { target } = await render(workflowWith({ inputs: [topic], outputs: [reply] }));

    const field = () => target.querySelector<HTMLInputElement>('.interface-input-form input');
    expect(field()?.value).toBe('');
    const rows = [...target.querySelectorAll<HTMLButtonElement>('.interface-input-form__run')];
    // Newest first; an input the interface no longer has is not listed.
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Topic: cats'),
      expect.stringContaining('Topic: dogs')
    ]);
    expect(rows[0].textContent).not.toContain('gone');

    const fill = [
      ...target.querySelectorAll<HTMLButtonElement>('.interface-input-form button')
    ].find((button) => button.textContent?.includes('Fill from last run'));
    fill!.click();
    await settle();
    expect(field()?.value).toBe('cats');

    rows[1].click();
    await settle();
    expect(field()?.value).toBe('dogs');
    expect(turnCalls()).toHaveLength(0);
  });

  it('form: no earlier run, no Fill from last run', async () => {
    const { target } = await render(workflowWith({ inputs: [topic], outputs: [reply] }));

    expect(target.querySelector('.interface-input-form__runs')).toBeNull();
    expect(target.textContent).not.toContain('Fill from last run');
  });

  it('form: no "Ready to run" empty state, and no resize handle', async () => {
    const { target } = await render(workflowWith({ inputs: [topic], outputs: [reply] }));

    expect(target.textContent).not.toContain('Ready to run');
    expect(target.querySelector('[role="separator"]')).toBeNull();
  });

  it('chat + form: the inputs open from the folded row, and a refused Run opens them', async () => {
    const plain = (id: string) => ({ id, dataType: 'string', bindings: [] });
    const { target, fd } = await render(
      workflowWith(
        { inputs: [plain('msg'), topic], outputs: [] },
        {
          chat: {
            message: 'msg',
            history: null,
            session_id: null,
            message_id: null,
            replies: [{ node_id: 'n', port: 'p' }],
            sub_workflow_replies: false
          }
        }
      )
    );
    const row = target.querySelector<HTMLButtonElement>('.control-panel__inputs-row');
    expect(row?.getAttribute('aria-expanded')).toBe('false');
    expect(row?.textContent).toContain('0 of 1 filled');

    fd.playground.setLaunchError('Fill in the required inputs: Topic');
    await settle();
    expect(row?.getAttribute('aria-expanded')).toBe('true');
    expect(target.querySelector('.interface-input-form')).not.toBeNull();

    type(target.querySelector<HTMLInputElement>('.interface-input-form input'), 'cats');
    expect(row?.textContent).toContain('1 of 1 filled');
  });

  it('legacy: an interface without turn ports keeps the chat box', async () => {
    const { target, fd } = await render(workflowWith({ inputs: [topic] }));

    expect(fd.playground.inputMode).toBe('legacy');
    expect(target.querySelector('textarea')).not.toBeNull();
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
    expect(target.querySelector('textarea')).not.toBeNull();
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
    expect(target.querySelector('textarea')).not.toBeNull();
    // Folded into one row above the composer until opened.
    expect(target.querySelector('.interface-input-form')).toBeNull();
    expect(target.querySelector('.control-panel__inputs-row')?.textContent).toContain('Inputs');
    await openInputs(target);
    const form = target.querySelector('.interface-input-form');
    expect(form?.textContent).toContain('Topic');
    // The composer's Send takes the turn: the card has no Run of its own.
    expect(form?.querySelector('.interface-input-form__actions')).toBeNull();
    expect(form?.textContent).not.toContain('msg');
    expect(form?.textContent).not.toContain('hist');
  });

  it('chat: a bound message wins over a legacy-looking interface without turns', async () => {
    const { target, fd } = await render(
      workflowWith({ inputs: [plain('msg')] }, { chat: { ...emptyChat, message: 'msg' } })
    );

    expect(fd.playground.inputMode).toBe('chat');
    expect(target.querySelector('textarea')).not.toBeNull();
    expect(target.querySelector('.interface-input-form')).toBeNull();
  });

  it('form: settings with no chat and no turns show the form, never the chat box', async () => {
    const { target, fd } = await render(workflowWith({ inputs: [topic] }, { chat: null }));

    expect(fd.playground.inputMode).toBe('form');
    expect(fd.playground.chatBinding?.source).toBe('none');
    expect(target.querySelector('textarea')).toBeNull();
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
    expect(target.querySelector('textarea')).toBeNull();
    expect(target.querySelector('.interface-input-form')).toBeNull();

    runButton(target)?.click();
    await settle();
    expect(turnCalls()[0].body).toEqual({ inputs: {} });
  });

  it('run: a workflow with settings and no interface at all is run, not legacy', async () => {
    const { target, fd } = await render(workflowWith(undefined, { chat: null }));

    expect(fd.playground.inputMode).toBe('run');
    expect(target.querySelector('textarea')).toBeNull();
  });

  it('chat: a workflow with null chat still chats through the deprecated turn', async () => {
    const { target, fd } = await render(
      workflowWith({ inputs: [message, topic], outputs: [reply] }, { chat: null })
    );

    expect(fd.playground.inputMode).toBe('chat');
    expect(fd.playground.chatBinding?.source).toBe('interface_turn');
    expect(target.querySelector('textarea')).not.toBeNull();
  });

  it('a bound name that is not on the interface binds nothing: form, not chat', async () => {
    const { target, fd } = await render(
      workflowWith({ inputs: [topic] }, { chat: { ...emptyChat, message: 'gone' } })
    );

    expect(fd.playground.inputMode).toBe('form');
    expect(target.querySelector('textarea')).toBeNull();
  });
  it("keeps the caller's interface and takes only the missing playground from workflows.get", async () => {
    // The editor passes its live workflow, unsaved interface edits and all;
    // the saved copy must not replace it.
    workflowsGetBody = {
      success: true,
      data: workflowWith({ inputs: [topic] }, { chat: null })
    };
    const { fd } = await render(
      workflowWith({ inputs: [plain('msg'), topic] }),
      {},
      { baseUrl: 'http://with-settings.test/api/flowdrop' }
    );

    expect(calls.some((c) => c.method === 'GET' && c.url.endsWith('/workflows/wf'))).toBe(true);
    expect(fd.playground.inputMode).toBe('form');
    expect(fd.playground.interfaceFormEntries.map((entry) => entry.id)).toEqual(['msg', 'topic']);
  });

  it("keeps the caller's interface when the server sends no playground (before 2.7.0)", async () => {
    // The caller's (unsaved) interface marks a message turn; the saved copy
    // has none, and taking it would drop the Playground back to legacy.
    workflowsGetBody = { success: true, data: workflowWith({ inputs: [topic] }) };
    const { fd } = await render(
      workflowWith({ inputs: [message, topic], outputs: [reply] }),
      {},
      { baseUrl: 'http://pre-27.test/api/flowdrop' }
    );

    expect(fd.playground.chatBinding).toBeNull();
    expect(fd.playground.inputMode).toBe('chat');
  });

  it('asks a server that sent no Playground settings only once per page', async () => {
    const baseUrl = 'http://pre-27-once.test/api/flowdrop';
    const loads = () =>
      calls.filter((c) => c.method === 'GET' && c.url.endsWith('/workflows/wf')).length;
    workflowsGetBody = { success: true, data: workflowWith({ inputs: [topic] }) };
    const passed = workflowWith({ inputs: [topic] });

    const { fd } = await render(passed, {}, { baseUrl });
    expect(loads()).toBe(1);
    unmount(mounted!);
    mounted = null;
    await render(passed, {}, { fd, baseUrl });
    expect(loads()).toBe(1);

    // Another server is asked anew.
    unmount(mounted!);
    mounted = null;
    await render(passed, {}, { baseUrl: 'http://other.test/api/flowdrop' });
    expect(loads()).toBe(2);
  });

  it('says nothing will reply when a message input is bound and no reply is', async () => {
    const { target } = await render(
      workflowWith({ inputs: [plain('msg')] }, { chat: { ...emptyChat, message: 'msg' } })
    );

    expect(target.querySelector('[data-testid="playground-notice"]')?.textContent).toContain(
      'Nothing will reply here'
    );
  });

  it('says there is no chat when the stored binding no longer binds anything', async () => {
    // `message` names an input the interface no longer has: resolved, it
    // binds nothing, though `source` is still `settings`.
    const { target, fd } = await render(
      workflowWith({ inputs: [topic] }, { chat: { ...emptyChat, message: 'gone' } })
    );

    expect(fd.playground.chatBinding?.source).toBe('settings');
    expect(target.querySelector('[data-testid="playground-notice"]')?.textContent).toContain(
      'No chat yet'
    );
  });

  it('shows no notice when the chat is bound with a reply', async () => {
    const { target } = await render(
      workflowWith(
        { inputs: [plain('msg')] },
        { chat: { ...emptyChat, message: 'msg', replies: [{ node_id: 'n', port: 'p' }] } }
      )
    );

    expect(target.querySelector('[data-testid="playground-notice"]')).toBeNull();
  });
});
