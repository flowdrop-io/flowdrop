/**
 * The run controller (`fd.runs`): the session and run executors the Playground
 * and the editor Console share. The PlaygroundService is a mock; the stores
 * are real.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RunController } from '$lib/stores/runController.svelte.js';
import { PlaygroundStore } from '$lib/stores/playgroundStore.svelte.js';
import { WorkflowStore } from '$lib/stores/workflowStore.svelte.js';
import { ApiContext } from '$lib/stores/apiContext.js';
import { HistoryService } from '$lib/services/historyService.js';
import { nodeExecutionService } from '$lib/services/nodeExecutionService.js';
import { workflowLaunchService } from '$lib/services/workflowLaunchService.js';
import type { PlaygroundService } from '$lib/services/playgroundService.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';
import type { PlaygroundSession } from '$lib/types/playground.js';
import type { Workflow } from '$lib/types/index.js';

function workflow(id: string): Workflow {
  return {
    id,
    name: id,
    nodes: [],
    edges: [],
    metadata: { schemaVersion: '1', createdAt: '', updatedAt: '' }
  };
}

function session(id: string, status: PlaygroundSession['status'] = 'idle'): PlaygroundSession {
  return {
    id,
    workflowId: 'wf',
    name: `Session ${id}`,
    status,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    executions: []
  };
}

/** A promise settled from outside, to order two slow loads. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function setup() {
  const playground = new PlaygroundStore();
  const editor = new WorkflowStore(new HistoryService());
  const api = new ApiContext();
  api.configure({ baseUrl: 'http://backend.test', endpoints: {} } as unknown as EndpointConfig);
  const service = {
    listSessions: vi.fn().mockResolvedValue([]),
    getSession: vi.fn(),
    getMessages: vi.fn().mockResolvedValue({ data: [], sessionStatus: 'idle' }),
    createSession: vi.fn(),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    resetSession: vi.fn().mockResolvedValue(undefined),
    stopExecution: vi.fn().mockResolvedValue(undefined),
    sendTurn: vi.fn(),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    isPolling: vi.fn().mockReturnValue(false),
    getLastSequenceNumber: vi.fn().mockReturnValue(null)
  };
  const runs = new RunController({
    playground,
    service: service as unknown as PlaygroundService,
    api,
    workflow: editor
  });
  return { runs, playground, editor, api, service };
}

describe('RunController', () => {
  beforeEach(() => {
    vi.spyOn(workflowLaunchService, 'isSupported').mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadSession', () => {
    it('lets the last load win when an earlier one resolves after it', async () => {
      const { runs, playground, service } = setup();
      runs.configure({ workflowId: 'wf' });
      const slow = deferred<PlaygroundSession>();
      service.getSession.mockImplementation((_config: unknown, id: string) =>
        id === 'slow' ? slow.promise : Promise.resolve(session('fast'))
      );

      const first = runs.loadSession('slow');
      await runs.loadSession('fast');
      expect(playground.currentSession?.id).toBe('fast');

      slow.resolve(session('slow'));
      await first;

      expect(playground.currentSession?.id).toBe('fast');
      expect(playground.isLoading).toBe(false);
    });

    it('tails a session that is not idle, seeded from the loaded page', async () => {
      const { runs, service } = setup();
      runs.configure({ workflowId: 'wf' });
      service.getSession.mockResolvedValue(session('s1', 'running'));

      await runs.loadSession('s1');

      expect(service.startPolling).toHaveBeenCalledTimes(1);
    });
  });

  describe('takeTurn', () => {
    it('creates a session on the first turn, then sends and polls', async () => {
      const { runs, playground, service } = setup();
      runs.configure({ workflowId: 'wf' });
      service.createSession.mockResolvedValue(session('s1'));
      service.sendTurn.mockResolvedValue({
        kind: 'turn',
        result: { sessionId: 's1', userMessageId: 'u1', pipelineId: 'p1', status: 'running' }
      });

      const accepted = await runs.takeTurn({ content: 'hi' });

      expect(accepted).toBe(true);
      expect(service.createSession).toHaveBeenCalledTimes(1);
      expect(service.sendTurn).toHaveBeenCalledWith(
        expect.anything(),
        's1',
        { content: 'hi', inputs: {} },
        expect.anything()
      );
      expect(playground.currentSession?.status).toBe('running');
      expect(service.startPolling).toHaveBeenCalledTimes(1);
      expect(playground.turnPending).toBe(false);
    });

    it('releases the run lock and goes idle when the turn is refused', async () => {
      const { runs, playground, service } = setup();
      runs.configure({ workflowId: 'wf' });
      playground.setCurrentSession(session('s1'));
      playground.lockRunUntilEnabled();
      service.sendTurn.mockRejectedValue(new Error('409 busy'));

      const accepted = await runs.takeTurn({ content: 'hi' });

      expect(accepted).toBe(false);
      expect(playground.runLocked).toBe(false);
      expect(playground.currentSession?.status).toBe('idle');
      expect(playground.error).toBe('409 busy');
      expect(playground.turnPending).toBe(false);
    });

    it('does not send while a run is in flight, and frees the lock', async () => {
      const { runs, playground, service } = setup();
      runs.configure({ workflowId: 'wf' });
      playground.setCurrentSession(session('s1', 'running'));
      playground.lockRunUntilEnabled();

      expect(await runs.takeTurn({ content: 'hi' })).toBe(false);
      expect(service.sendTurn).not.toHaveBeenCalled();
      expect(playground.runLocked).toBe(false);
    });
  });

  describe('startRun', () => {
    it('returns the refused-launch feedback in the configured messages and frees Run', async () => {
      const { runs, playground, service } = setup();
      runs.configure({
        workflowId: 'wf',
        messages: () =>
          ({
            playground: {
              chat: { predefinedRun: 'Go' },
              commands: {
                unavailable: ({ name }: { name: string }) => `no ${name}`,
                runInvalidInput: ({ error }: { error: string }) => `bad input: ${error}`
              }
            }
          }) as never
      });
      playground.setCurrentSession(session('s1'));
      playground.lockRunUntilEnabled();
      vi.spyOn(workflowLaunchService, 'launch').mockResolvedValue({
        status: 'invalid-input',
        message: 'topic missing'
      });

      const feedback = await runs.startRun();

      expect(feedback).toEqual({ status: 'error', message: 'bad input: topic missing' });
      expect(playground.runLocked).toBe(false);
      expect(service.sendTurn).not.toHaveBeenCalled();
    });

    it('returns null for an accepted launch and tails the run', async () => {
      const { runs, playground, service } = setup();
      runs.configure({ workflowId: 'wf' });
      playground.setCurrentSession(session('s1'));
      vi.spyOn(workflowLaunchService, 'launch').mockResolvedValue({
        status: 'launched',
        pipelineId: 'p1'
      });

      expect(await runs.startRun()).toBeNull();
      expect(playground.currentSession?.status).toBe('running');
      expect(service.startPolling).toHaveBeenCalledTimes(1);
    });

    it('sends the predefined message where the host configured one', async () => {
      const { runs, playground, service } = setup();
      runs.configure({ workflowId: 'wf', predefinedMessage: 'Kick off' });
      playground.setCurrentSession(session('s1'));
      service.sendTurn.mockResolvedValue({
        kind: 'turn',
        result: { sessionId: 's1', userMessageId: 'u', pipelineId: 'p', status: 'running' }
      });

      await runs.startRun();

      expect(service.sendTurn).toHaveBeenCalledWith(
        expect.anything(),
        's1',
        { content: 'Kick off', inputs: {} },
        expect.anything()
      );
    });
  });

  describe('editor fallback', () => {
    it('uses the editor workflow id when no workflow id was configured', () => {
      const { runs, editor } = setup();
      expect(runs.workflowId).toBeNull();

      editor.initialize(workflow('editor-wf'));
      expect(runs.workflowId).toBe('editor-wf');

      runs.configure({ workflowId: 'configured' });
      expect(runs.workflowId).toBe('configured');
    });

    it('sets the playground workflow from the editor when it is missing or different', () => {
      const { runs, editor, playground, service } = setup();
      editor.initialize(workflow('a'));

      runs.adoptEditorWorkflow();
      expect(playground.currentWorkflow?.id).toBe('a');

      playground.setSessions([session('old')]);
      editor.initialize(workflow('b'));
      runs.adoptEditorWorkflow();
      expect(playground.currentWorkflow?.id).toBe('b');
      // Another workflow's sessions are not carried over.
      expect(playground.sessions).toEqual([]);
      expect(service.stopPolling).toHaveBeenCalled();
    });

    it('picks up a binding edited in the editor since the last turn, keeping the sessions', () => {
      const { runs, editor, playground } = setup();
      editor.initialize(workflow('a'));
      runs.adoptEditorWorkflow();
      playground.setSessions([session('s1')]);
      playground.setFormValues({ topic: 'solar' });

      editor.initialize({
        ...workflow('a'),
        playground: { chat: { message: 'question', replies: [] } }
      } as Workflow);
      runs.adoptEditorWorkflow();

      expect(playground.currentWorkflow?.playground).toEqual({
        chat: { message: 'question', replies: [] }
      });
      expect(playground.sessions.map((s) => s.id)).toEqual(['s1']);
      expect(playground.formValues).toEqual({ topic: 'solar' });
    });

    it('leaves the playground workflow alone when a surface configured one', () => {
      const { runs, editor, playground } = setup();
      runs.configure({ workflowId: 'configured' });
      playground.setWorkflow(workflow('configured'));
      editor.initialize(workflow('a'));

      runs.adoptEditorWorkflow();
      expect(playground.currentWorkflow?.id).toBe('configured');
    });

    it('refuses to create a session with no workflow id', async () => {
      const { runs, playground, service } = setup();
      await runs.createSession();
      expect(service.createSession).not.toHaveBeenCalled();
      expect(playground.error).toBe('Save the workflow first');
    });
  });

  describe('signals', () => {
    it('holds an accepted signal as pending until cleared', async () => {
      const { runs } = setup();
      runs.configure({ workflowId: 'wf' });
      const { pipelineSignalService } = await import('$lib/services/pipelineSignalService.js');
      vi.spyOn(pipelineSignalService, 'pause').mockResolvedValue({ status: 'accepted' } as never);

      await runs.sendSignal('pause', 'p1');
      expect(runs.pendingSignal).toEqual({ pipelineId: 'p1', signal: 'pause' });

      runs.clearPendingSignal();
      expect(runs.pendingSignal).toBeNull();
    });
  });

  describe('commandHandlers', () => {
    it('adapts the dispatch handlers to the controller', async () => {
      const { runs, playground, service } = setup();
      runs.configure({ workflowId: 'wf' });
      playground.setCurrentSession(session('s1', 'running'));

      await runs.commandHandlers().stopExecution();

      expect(service.stopExecution).toHaveBeenCalledWith(
        expect.anything(),
        's1',
        expect.anything()
      );
      expect(playground.currentSession?.status).toBe('idle');
    });
  });

  describe('loadNodeStatuses', () => {
    const done = { status: 'completed', executionCount: 1, isExecuting: false } as const;
    const wf = () => ({
      ...workflow('wf'),
      nodes: [{ id: 'n1' }, { id: 'n2' }] as unknown as Workflow['nodes']
    });

    it('puts the run status in the instance playground store, scoped to workflow and run', async () => {
      const { runs, playground } = setup();
      const spy = vi
        .spyOn(nodeExecutionService, 'getMultipleNodeExecutionInfo')
        .mockResolvedValue({ n1: done });

      await runs.loadNodeStatuses('p1', wf());

      expect(spy).toHaveBeenCalledWith(expect.anything(), ['n1', 'n2'], 'p1');
      expect(playground.nodeStatusFor('n1')).toEqual(done);
      expect(playground.nodeStatusScope).toEqual({ workflowId: 'wf', pipelineId: 'p1' });
    });

    it('survives the editor workflow changing', async () => {
      const { runs, playground, editor } = setup();
      editor.initialize(wf());
      vi.spyOn(nodeExecutionService, 'getMultipleNodeExecutionInfo').mockResolvedValue({
        n1: done
      });
      await runs.loadNodeStatuses('p1');
      editor.updateName('Renamed');
      expect(playground.nodeStatusFor('n1')).toEqual(done);
    });

    it('lets the last load win when an earlier one resolves after it', async () => {
      const { runs, playground } = setup();
      const slow = deferred<Record<string, typeof done>>();
      vi.spyOn(nodeExecutionService, 'getMultipleNodeExecutionInfo').mockImplementation(
        async (_c, _ids, run) => (run === 'slow' ? slow.promise : { n2: done })
      );

      const first = runs.loadNodeStatuses('slow', wf());
      await runs.loadNodeStatuses('fast', wf());
      slow.resolve({ n1: done });
      await first;

      expect(playground.nodeStatusScope?.pipelineId).toBe('fast');
      expect(playground.nodeStatusFor('n1')).toBeUndefined();
    });

    it('clearNodeStatuses discards a load still in flight', async () => {
      const { runs, playground } = setup();
      const slow = deferred<Record<string, typeof done>>();
      vi.spyOn(nodeExecutionService, 'getMultipleNodeExecutionInfo').mockReturnValue(slow.promise);

      const load = runs.loadNodeStatuses('p1', wf());
      runs.clearNodeStatuses();
      slow.resolve({ n1: done });
      await load;

      expect(playground.nodeStatusFor('n1')).toBeUndefined();
    });

    it('clears when there is no run to show', async () => {
      const { runs, playground } = setup();
      playground.setNodeStatuses({ n1: done }, { workflowId: 'wf', pipelineId: 'p1' });
      await runs.loadNodeStatuses(null, wf());
      expect(playground.nodeStatuses).toEqual({});
    });
  });
  describe('requestNodeStatuses', () => {
    const done = { status: 'completed', executionCount: 1, isExecuting: false } as const;
    const wf = () => ({
      ...workflow('wf'),
      nodes: [{ id: 'n1' }] as unknown as Workflow['nodes']
    });

    it('coalesces asks made while a load runs into one more load', async () => {
      const { runs, playground, editor } = setup();
      editor.initialize(wf());
      playground.pinExecution('p1');
      const first = deferred<Record<string, typeof done>>();
      const spy = vi
        .spyOn(nodeExecutionService, 'getMultipleNodeExecutionInfo')
        .mockReturnValueOnce(first.promise)
        .mockResolvedValue({ n1: done });

      runs.requestNodeStatuses();
      runs.requestNodeStatuses();
      runs.requestNodeStatuses();
      expect(spy).toHaveBeenCalledTimes(1);

      first.resolve({});
      await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
      await vi.waitFor(() => expect(playground.nodeStatusFor('n1')).toEqual(done));
      // Nothing more was asked for, so nothing more loads.
      await new Promise((r) => setTimeout(r, 10));
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('can be asked again once the load has finished', async () => {
      const { runs, playground, editor } = setup();
      editor.initialize(wf());
      playground.pinExecution('p1');
      const spy = vi
        .spyOn(nodeExecutionService, 'getMultipleNodeExecutionInfo')
        .mockResolvedValue({ n1: done });

      runs.requestNodeStatuses();
      await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
      await new Promise((r) => setTimeout(r, 0));
      runs.requestNodeStatuses();
      await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    });
  });

  describe('node statuses of a host run', () => {
    it('requestNodeStatuses loads the host run, and isLive follows it', async () => {
      const { runs, editor } = setup();
      editor.initialize({
        ...workflow('wf'),
        nodes: [{ id: 'n1' }] as unknown as Workflow['nodes']
      });
      const spy = vi
        .spyOn(nodeExecutionService, 'getMultipleNodeExecutionInfo')
        .mockResolvedValue({});
      let status = 'running';
      const hooks = runs.wrapHostHooks({
        onRun: async () => ({ ok: true, data: { runId: 'host-1', status } }),
        onRunStatus: async (runId: string) => ({ ok: true, data: { runId, status } })
      } as never);
      await hooks.onRun!({});
      expect(runs.isLive).toBe(true);

      runs.requestNodeStatuses();
      await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
      expect(spy.mock.calls[0][2]).toBe('host-1');

      status = 'completed';
      await hooks.onRunStatus!('host-1');
      expect(runs.isLive).toBe(false);
      runs.dismissRun();
    });
  });

  describe('isLive', () => {
    it('is true while a run is going or waiting for someone, false otherwise', () => {
      const { runs, playground } = setup();
      expect(runs.isLive).toBe(false);
      playground.setCurrentSession(session('s', 'running'));
      expect(runs.isLive).toBe(true);
      playground.setCurrentSession(session('s', 'awaiting_input'));
      expect(runs.isLive).toBe(true);
      playground.setCurrentSession(session('s', 'completed'));
      expect(runs.isLive).toBe(false);
      playground.setCurrentSession(session('s', 'failed'));
      expect(runs.isLive).toBe(false);
    });
  });
});
