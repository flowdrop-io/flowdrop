/**
 * AIChatPanel and the attached run: the chip above the composer, "+ Attach a
 * run" over the test session's runs, and `attachedRunId` on the chat request
 * only while a run is attached.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import AIChatPanel from '$lib/components/chat/AIChatPanel.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import { defaultEndpointConfig } from '$lib/config/endpoints.js';
import { chatService } from '$lib/services/chatService.js';
import { resetSettings } from '$lib/stores/settingsStore.svelte.js';
import type { ChatTurnRequest, ChatTurnResponse } from '$lib/types/chat.js';
import type { SessionRun, SessionRunsResult } from '$lib/types/playground.js';
import type { Workflow } from '$lib/types/index.js';

const workflow: Workflow = {
  id: 'wf-1',
  name: 'Panel',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
};

const run = (id: string, status: string, version: string | null): SessionRun => ({
  id,
  startedAt: '2026-01-01T10:00:00Z',
  completedAt: null,
  status,
  workflowVersion: version,
  message: `message ${id}`,
  inputs: {},
  inputsTruncated: false
});

let target: HTMLElement;
let mounted: ReturnType<typeof mount> | null = null;

function render(fd: ReturnType<typeof createFlowDropInstance>) {
  target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(AIChatPanel, {
    target,
    context: new Map<unknown, unknown>([[FLOWDROP_INSTANCE_KEY, fd]]),
    props: { nodeTypes: [], workflowId: 'wf-1', endpointConfig: defaultEndpointConfig }
  });
  flushSync();
}

function instance(id: string, runs?: SessionRunsResult) {
  const fd = createFlowDropInstance({ id });
  fd.workflow.initialize(workflow);
  fd.playground.setCurrentSession({
    id: 's1',
    workflowId: 'wf-1',
    name: 'S',
    status: 'idle',
    createdAt: '',
    updatedAt: ''
  });
  if (runs) fd.playground.setSessionRuns('s1', runs);
  vi.spyOn(fd.runs, 'loadSessionRuns').mockImplementation(async () => runs ?? null);
  return fd;
}

const q = (sel: string) => target.querySelector<HTMLElement>(sel);

async function send(text: string, sent: { mock: { calls: unknown[] } }): Promise<void> {
  const before = sent.mock.calls.length;
  const input = target.querySelector<HTMLTextAreaElement>('textarea')!;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  flushSync();
  // The tool runtime is a dynamic import: poll until the turn has been sent.
  for (let i = 0; i < 200 && sent.mock.calls.length === before; i++) {
    await new Promise((r) => setTimeout(r, 5));
    flushSync();
  }
  await new Promise((r) => setTimeout(r, 10));
  flushSync();
}

const finalTurn = (): ChatTurnResponse => ({ content: 'ok', turnId: 't-1', done: true });

beforeEach(() => resetSettings());
afterEach(() => {
  if (mounted) void unmount(mounted);
  mounted = null;
  target?.remove();
  vi.restoreAllMocks();
});

describe('AIChatPanel attached run', () => {
  it('sends no attachedRunId while nothing is attached', async () => {
    const sent = vi.spyOn(chatService, 'sendMessage').mockResolvedValue(finalTurn());
    render(instance('att-none'));
    await send('hello', sent);
    expect(sent).toHaveBeenCalledTimes(1);
    const request = sent.mock.calls[0][2] as ChatTurnRequest;
    expect(request).not.toHaveProperty('attachedRunId');
  });

  it('sends attachedRunId while a run is attached, and stops when it is detached', async () => {
    const sent = vi.spyOn(chatService, 'sendMessage').mockResolvedValue(finalTurn());
    const fd = instance('att-sent');
    fd.attachedRun.attach('7337', { status: 'failed' });
    render(fd);

    await send('why did it fail?', sent);
    expect((sent.mock.calls[0][2] as ChatTurnRequest).attachedRunId).toBe('7337');

    q('[data-testid="assistant-run-detach"]')!.click();
    flushSync();
    expect(fd.attachedRun.id).toBeNull();
    expect(q('[data-testid="assistant-run-chip"]')).toBeNull();

    await send('and now?', sent);
    expect(sent.mock.calls[1][2] as ChatTurnRequest).not.toHaveProperty('attachedRunId');
  });

  it('shows the attached run as a chip with its status and a stale mark', () => {
    const fd = instance('att-chip', {
      workflowVersion: 'v2',
      runs: [run('10', 'failed', 'v1'), run('11', 'completed', 'v2')]
    });
    fd.attachedRun.attach('10', { status: 'failed' });
    render(fd);
    const chip = q('[data-testid="assistant-run-chip"]')!;
    expect(chip.dataset.runId).toBe('10');
    expect(chip.textContent).toContain('Run #10');
    expect(q('[data-testid="assistant-run-chip-status"]')!.textContent).toContain('failed');
    expect(q('[data-testid="assistant-run-chip-stale"]')).not.toBeNull();

    fd.attachedRun.attach('11');
    flushSync();
    expect(q('[data-testid="assistant-run-chip-stale"]')).toBeNull();
    expect(q('[data-testid="assistant-run-chip-status"]')!.textContent).toContain('done');
  });

  it('lists the test session runs, newest first, and attaches the picked one', async () => {
    const fd = instance('att-list', {
      workflowVersion: 'v1',
      runs: [run('10', 'completed', 'v1'), run('11', 'failed', 'v1')]
    });
    render(fd);
    expect(q('[data-testid="assistant-run-chip"]')).toBeNull();

    q('[data-testid="assistant-attach-add"]')!.click();
    await new Promise((r) => setTimeout(r, 0));
    flushSync();
    expect(fd.runs.loadSessionRuns).toHaveBeenCalled();
    const items = [...target.querySelectorAll('.ai-chat-panel__attach-item')];
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Run #11'),
      expect.stringContaining('Run #10')
    ]);

    (items[0] as HTMLElement).click();
    flushSync();
    expect(fd.attachedRun.id).toBe('11');
    expect(q('[data-testid="assistant-attach-list"]')).toBeNull();
  });

  it('says so when the server has no runs endpoint', async () => {
    render(instance('att-empty'));
    q('[data-testid="assistant-attach-add"]')!.click();
    await new Promise((r) => setTimeout(r, 0));
    flushSync();
    expect(q('[data-testid="assistant-attach-empty"]')!.textContent).toContain('does not list');
  });

  it('says there are no runs yet when the endpoint answers an empty list', async () => {
    render(instance('att-none-yet', { workflowVersion: null, runs: [] }));
    q('[data-testid="assistant-attach-add"]')!.click();
    await new Promise((r) => setTimeout(r, 0));
    flushSync();
    expect(q('[data-testid="assistant-attach-empty"]')!.textContent).toContain('No runs yet');
  });
});
