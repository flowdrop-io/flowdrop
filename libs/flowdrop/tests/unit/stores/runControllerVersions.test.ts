/**
 * Test mode's freshness and session rules on the run controller: Save & send
 * (`needsSave`, `saveFirst`), the version dividers a save and a load produce,
 * which sessions the editor's Playground lists, how a first-turn session is
 * named, and that reset and new are two separate actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RunController } from '$lib/stores/runController.svelte.js';
import { PlaygroundStore } from '$lib/stores/playgroundStore.svelte.js';
import { WorkflowStore } from '$lib/stores/workflowStore.svelte.js';
import { ApiContext } from '$lib/stores/apiContext.js';
import { HistoryService } from '$lib/services/historyService.js';
import { workflowLaunchService } from '$lib/services/workflowLaunchService.js';
import type { PlaygroundService } from '$lib/services/playgroundService.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';
import type {
  PlaygroundMessage,
  PlaygroundSession,
  SessionRun,
  SessionRunsResult
} from '$lib/types/playground.js';
import type { Workflow } from '$lib/types/index.js';

function workflow(id = 'wf'): Workflow {
  return {
    id,
    name: id,
    nodes: [],
    edges: [],
    metadata: { schemaVersion: '1', createdAt: '', updatedAt: '' }
  };
}

function session(id: string, marked?: boolean): PlaygroundSession {
  return {
    id,
    workflowId: 'wf',
    name: `Session ${id}`,
    status: 'idle',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    executions: [],
    ...(marked !== undefined && {
      thirdPartySettings: marked ? { flowdrop_playground: { created: true } } : {}
    })
  };
}

function message(id: string, seq: number, executionId?: string): PlaygroundMessage {
  return {
    id,
    sessionId: 's1',
    role: seq % 2 ? 'user' : 'assistant',
    content: id,
    timestamp: '2026-01-01T00:00:00Z',
    sequenceNumber: seq,
    executionId
  };
}

function run(id: string, workflowVersion: string | null): SessionRun {
  return {
    id,
    startedAt: null,
    completedAt: null,
    status: 'completed',
    workflowVersion,
    message: null,
    inputs: {},
    inputsTruncated: false
  };
}

let serverCount = 0;

function setup() {
  const playground = new PlaygroundStore();
  const editor = new WorkflowStore(new HistoryService());
  const api = new ApiContext();
  // One server per test: "no runs endpoint" is remembered per base URL.
  api.configure({
    baseUrl: `http://backend-${++serverCount}.test`,
    endpoints: {}
  } as unknown as EndpointConfig);
  const service = {
    listSessions: vi.fn().mockResolvedValue([]),
    getSession: vi.fn(),
    getMessages: vi.fn().mockResolvedValue({ data: [], sessionStatus: 'idle' }),
    createSession: vi.fn().mockResolvedValue(session('s1')),
    resetSession: vi.fn().mockResolvedValue(undefined),
    getSessionRuns: vi.fn().mockResolvedValue(null),
    stopPolling: vi.fn(),
    isPolling: vi.fn().mockReturnValue(false),
    startPolling: vi.fn(),
    getLastSequenceNumber: vi.fn().mockReturnValue(null)
  };
  const runs = new RunController({
    playground,
    service: service as unknown as PlaygroundService,
    api,
    workflow: editor
  });
  return { runs, playground, editor, service };
}

/** A conversation open in the editor's Playground: session s1 with two messages. */
function openConversation(ctx: ReturnType<typeof setup>) {
  ctx.editor.initialize(workflow());
  ctx.playground.setWorkflow(ctx.editor.current);
  ctx.playground.setCurrentSession(session('s1', true));
  ctx.playground.addMessages([message('m1', 1, 'p1'), message('m2', 2, 'p1')]);
}

beforeEach(() => {
  vi.spyOn(workflowLaunchService, 'isSupported').mockReturnValue(true);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('Save & send', () => {
  it('needs no save when the surface cannot save, or nothing is edited', () => {
    const ctx = setup();
    ctx.editor.initialize(workflow());
    ctx.editor.batchUpdate({ name: 'edited' });

    ctx.runs.configure({ workflowId: 'wf' });
    expect(ctx.runs.needsSave).toBe(false);

    ctx.runs.configure({ workflowId: 'wf', saveWorkflow: vi.fn() });
    expect(ctx.runs.needsSave).toBe(true);

    ctx.editor.markAsSaved();
    expect(ctx.runs.needsSave).toBe(false);
  });

  it('counts the Playground settings as edits', () => {
    const ctx = setup();
    ctx.editor.initialize({ ...workflow(), playground: { chat: null } });
    ctx.runs.configure({ workflowId: 'wf', saveWorkflow: vi.fn() });
    expect(ctx.runs.needsSave).toBe(false);

    ctx.editor.batchUpdate({
      playground: {
        chat: {
          message: 'q',
          history: null,
          session_id: null,
          message_id: null,
          replies: [],
          sub_workflow_replies: false
        }
      }
    });

    expect(ctx.runs.needsSave).toBe(true);
  });

  it('saves first and resolves true; saves nothing when the workflow is clean', async () => {
    const ctx = setup();
    const save = vi.fn().mockResolvedValue(true);
    ctx.runs.configure({ workflowId: 'wf', saveWorkflow: save });
    ctx.editor.initialize(workflow());

    expect(await ctx.runs.saveFirst()).toBe(true);
    expect(save).not.toHaveBeenCalled();

    ctx.editor.batchUpdate({ name: 'edited' });
    expect(await ctx.runs.saveFirst()).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('holds the send back and shows why when the save fails or is cancelled', async () => {
    const ctx = setup();
    ctx.editor.initialize(workflow());
    ctx.editor.batchUpdate({ name: 'edited' });

    ctx.runs.configure({
      workflowId: 'wf',
      saveWorkflow: vi.fn().mockRejectedValue(new Error('Validation failed: R7'))
    });
    expect(await ctx.runs.saveFirst()).toBe(false);
    expect(ctx.playground.error).toContain('Validation failed: R7');

    ctx.playground.setError(null);
    ctx.runs.configure({ workflowId: 'wf', saveWorkflow: vi.fn().mockResolvedValue(false) });
    expect(await ctx.runs.saveFirst()).toBe(false);
    expect(ctx.playground.error).toContain('not saved');
  });
});

describe('version dividers', () => {
  it('rebuilds them from the runs when a session is loaded', async () => {
    const ctx = setup();
    ctx.runs.configure({ workflowId: 'wf', saveWorkflow: vi.fn() });
    ctx.service.getSession.mockResolvedValue(session('s1', true));
    ctx.service.getMessages.mockResolvedValue({
      data: [message('m1', 1, 'p1'), message('m2', 2, 'p1'), message('m3', 3, 'p2')],
      sessionStatus: 'idle'
    });
    const result: SessionRunsResult = {
      workflowVersion: 'v2',
      runs: [run('p1', 'v1'), run('p2', 'v2')]
    };
    ctx.service.getSessionRuns.mockResolvedValue(result);

    await ctx.runs.loadSession('s1');
    await vi.waitFor(() => expect(ctx.playground.versionDividers).toHaveLength(1));

    expect(ctx.playground.versionDividers[0].anchor).toEqual({ kind: 'before-run', runId: 'p2' });
    expect(ctx.playground.sessionRuns).toEqual(result);
  });

  it('shows none for a surface that cannot save (the standalone Playground)', async () => {
    const ctx = setup();
    ctx.runs.configure({ workflowId: 'wf' });
    ctx.service.getSession.mockResolvedValue(session('s1', true));

    await ctx.runs.loadSession('s1');

    expect(ctx.service.getSessionRuns).not.toHaveBeenCalled();
  });

  it('degrades silently on a server without the endpoint, and asks once', async () => {
    const ctx = setup();
    ctx.runs.configure({ workflowId: 'wf', saveWorkflow: vi.fn() });
    openConversation(ctx);
    ctx.service.getSessionRuns.mockResolvedValue(null);

    await ctx.runs.noteWorkflowSaved();
    await ctx.runs.noteWorkflowSaved();
    await ctx.runs.loadSessionRuns();

    expect(ctx.playground.versionDividers).toEqual([]);
    expect(ctx.playground.sessionRuns).toBeNull();
    expect(ctx.service.getSessionRuns).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the runs request fails', async () => {
    const ctx = setup();
    openConversation(ctx);
    ctx.service.getSessionRuns.mockRejectedValue(new Error('HTTP 500'));

    await expect(ctx.runs.noteWorkflowSaved()).resolves.toBeUndefined();
    await expect(ctx.runs.loadSessionRuns()).resolves.toBeNull();
    expect(ctx.playground.versionDividers).toEqual([]);
  });

  it('adds a divider below the last message when a save made a new version', async () => {
    const ctx = setup();
    openConversation(ctx);
    ctx.service.getSessionRuns.mockResolvedValue({
      workflowVersion: 'v2',
      runs: [run('p1', 'v1')]
    });

    await ctx.runs.noteWorkflowSaved();

    expect(ctx.playground.versionDividers).toEqual([
      { id: 'save:m2', anchor: { kind: 'after-message', messageId: 'm2' } }
    ]);
  });

  it('keeps the place where the conversation ended at the save, not when the answer arrives', async () => {
    const ctx = setup();
    openConversation(ctx);
    ctx.service.getSessionRuns.mockImplementation(async () => {
      // The send that follows Save & send lands while the runs request is out.
      ctx.playground.addMessage(message('m3', 3, 'p2'));
      return { workflowVersion: 'v2', runs: [run('p1', 'v1')] };
    });

    await ctx.runs.noteWorkflowSaved();

    expect(ctx.playground.versionDividers[0].anchor).toEqual({
      kind: 'after-message',
      messageId: 'm2'
    });
  });

  it('adds no divider when the save did not change the version the last run ran', async () => {
    const ctx = setup();
    openConversation(ctx);
    ctx.service.getSessionRuns.mockResolvedValue({
      workflowVersion: 'v1',
      runs: [run('p1', 'v1')]
    });

    await ctx.runs.noteWorkflowSaved();

    expect(ctx.playground.versionDividers).toEqual([]);
  });

  it('treats an unknown version as never stale: the divider is added', async () => {
    const ctx = setup();
    openConversation(ctx);
    ctx.service.getSessionRuns.mockResolvedValue({
      workflowVersion: 'v2',
      runs: [run('p1', null)]
    });

    await ctx.runs.noteWorkflowSaved();

    expect(ctx.playground.versionDividers).toHaveLength(1);
  });

  it('adds none without a conversation, and not twice for two saves at the same place', async () => {
    const ctx = setup();
    ctx.editor.initialize(workflow());
    ctx.playground.setWorkflow(ctx.editor.current);
    ctx.playground.setCurrentSession(session('s1', true));
    ctx.service.getSessionRuns.mockResolvedValue({ workflowVersion: 'v2', runs: [] });

    await ctx.runs.noteWorkflowSaved();
    expect(ctx.playground.versionDividers).toEqual([]);

    ctx.playground.addMessages([message('m1', 1)]);
    await ctx.runs.noteWorkflowSaved();
    await ctx.runs.noteWorkflowSaved();
    expect(ctx.playground.versionDividers).toHaveLength(1);
  });

  it('ignores a conversation kept from another workflow', async () => {
    const ctx = setup();
    ctx.editor.initialize(workflow('editor-wf'));
    ctx.playground.setWorkflow(workflow('other-wf'));
    ctx.playground.setCurrentSession(session('s1', true));
    ctx.playground.addMessages([message('m1', 1)]);
    ctx.service.getSessionRuns.mockResolvedValue({ workflowVersion: 'v2', runs: [] });

    await ctx.runs.noteWorkflowSaved();

    expect(ctx.service.getSessionRuns).not.toHaveBeenCalled();
  });
});

describe('sessions of the editor Playground', () => {
  it('lists only sessions with the Playground mark', async () => {
    const ctx = setup();
    ctx.runs.configure({ workflowId: 'wf', playgroundSessionsOnly: true });
    ctx.service.listSessions.mockResolvedValue([
      session('a', true),
      session('b', false),
      session('c', true)
    ]);

    await ctx.runs.loadSessions();

    expect(ctx.playground.sessions.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('lists every session when the server does not expose the mark', async () => {
    const ctx = setup();
    ctx.runs.configure({ workflowId: 'wf', playgroundSessionsOnly: true });
    ctx.service.listSessions.mockResolvedValue([session('a'), session('b')]);

    await ctx.runs.loadSessions();

    expect(ctx.playground.sessions.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('lists every session on a surface that does not ask for the filter', async () => {
    const ctx = setup();
    ctx.runs.configure({ workflowId: 'wf' });
    ctx.service.listSessions.mockResolvedValue([session('a', true), session('b', false)]);

    await ctx.runs.loadSessions();

    expect(ctx.playground.sessions).toHaveLength(2);
  });

  it('keeps the conversation when the workflow is saved', async () => {
    const ctx = setup();
    ctx.runs.configure({ workflowId: 'wf', saveWorkflow: vi.fn().mockResolvedValue(true) });
    openConversation(ctx);
    ctx.editor.batchUpdate({ name: 'edited' });

    await ctx.runs.saveFirst();

    expect(ctx.playground.currentSession?.id).toBe('s1');
    expect(ctx.playground.messages).toHaveLength(2);
    expect(ctx.service.createSession).not.toHaveBeenCalled();
    expect(ctx.service.resetSession).not.toHaveBeenCalled();
  });
});

describe('naming a new session', () => {
  it('lets the server name a session the editor creates', async () => {
    const ctx = setup();
    ctx.runs.configure({ workflowId: 'wf', playgroundSessionsOnly: true });

    await ctx.runs.createSession();

    expect(ctx.service.createSession.mock.calls[0][2]).toBeUndefined();
  });

  it('lets the server name a session the Console creates (nothing configured)', async () => {
    const ctx = setup();
    ctx.editor.initialize(workflow());

    await ctx.runs.createSession();

    expect(ctx.service.createSession.mock.calls[0][2]).toBeUndefined();
  });

  it('keeps counting in the standalone Playground, which lists every session', async () => {
    const ctx = setup();
    ctx.runs.configure({ workflowId: 'wf' });
    ctx.playground.setSessions([session('a'), session('b')]);

    await ctx.runs.createSession();

    expect(ctx.service.createSession.mock.calls[0][2]).toBe('Session 3');
  });
});

describe('reset and new are separate actions', () => {
  it('reset returns the session to idle and creates nothing; new creates and resets nothing', async () => {
    const ctx = setup();
    ctx.runs.configure({ workflowId: 'wf' });
    openConversation(ctx);

    await ctx.runs.resetSession();
    expect(ctx.service.resetSession).toHaveBeenCalledTimes(1);
    expect(ctx.service.createSession).not.toHaveBeenCalled();
    expect(ctx.playground.currentSession?.id).toBe('s1');
    expect(ctx.playground.messages).toHaveLength(2);

    await ctx.runs.createSession();
    expect(ctx.service.createSession).toHaveBeenCalledTimes(1);
    expect(ctx.service.resetSession).toHaveBeenCalledTimes(1);
    expect(ctx.playground.currentSession?.id).toBe('s1');
  });
});
