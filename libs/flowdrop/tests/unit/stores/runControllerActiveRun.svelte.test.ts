/**
 * The run `fd.runs` shows (`activeRun`): session runs follow the session,
 * host runs (`host.onRun`) follow `onRunStatus`, and each instance has its own.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { RunController } from '$lib/stores/runController.svelte.js';
import { PlaygroundStore } from '$lib/stores/playgroundStore.svelte.js';
import { WorkflowStore } from '$lib/stores/workflowStore.svelte.js';
import { ApiContext } from '$lib/stores/apiContext.js';
import { HistoryService } from '$lib/services/historyService.js';
import { pipelineSignalService } from '$lib/services/pipelineSignalService.js';
import type { PlaygroundService } from '$lib/services/playgroundService.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';
import type { PlaygroundSession } from '$lib/types/playground.js';
import type { HostHooks } from '$lib/webmcp/types.js';

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

function setup() {
  const playground = new PlaygroundStore();
  const editor = new WorkflowStore(new HistoryService());
  const api = new ApiContext();
  api.configure({ baseUrl: 'http://backend.test', endpoints: {} } as unknown as EndpointConfig);
  const service = {
    createSession: vi.fn().mockResolvedValue(session('s1')),
    stopExecution: vi.fn().mockResolvedValue(undefined),
    sendTurn: vi.fn().mockResolvedValue({
      kind: 'turn',
      result: { sessionId: 's1', userMessageId: 'u1', pipelineId: 'p1', status: 'running' }
    }),
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
  runs.configure({ workflowId: 'wf' });
  return { runs, playground, service };
}

describe('activeRun: session runs', () => {
  it('is null until a run starts', () => {
    expect(setup().runs.activeRun).toBeNull();
  });

  it('follows the session from running to waiting to done', async () => {
    const { runs, playground } = setup();
    await runs.takeTurn({ content: 'hi' });
    expect(runs.activeRun).toMatchObject({ origin: 'session', status: 'running', endedAt: null });

    playground.updateSessionStatus('awaiting_input');
    flushSync();
    expect(runs.activeRun?.status).toBe('waiting');

    playground.updateSessionStatus('running');
    playground.updateSessionStatus('completed');
    flushSync();
    expect(runs.activeRun?.status).toBe('done');
    expect(runs.activeRun?.endedAt).toEqual(expect.any(Number));
    runs.dispose();
  });

  it('reports a failed session as failed', async () => {
    const { runs, playground } = setup();
    await runs.takeTurn({ content: 'hi' });
    playground.updateSessionStatus('failed');
    flushSync();
    expect(runs.activeRun?.status).toBe('failed');
    runs.dispose();
  });

  it('reads as stopped, not done, when the run was stopped', async () => {
    const { runs, service } = setup();
    await runs.takeTurn({ content: 'hi' });
    await runs.stopRun();
    expect(service.stopExecution).toHaveBeenCalledTimes(1);
    flushSync();
    expect(runs.activeRun?.status).toBe('stopped');
    runs.dispose();
  });

  it('also reads as stopped when something other than the bar stops it', async () => {
    const { runs } = setup();
    await runs.takeTurn({ content: 'hi' });
    await runs.stopExecution();
    expect(runs.activeRun?.status).toBe('stopped');
    runs.dispose();
  });

  it('tracks the pipeline the session reports', async () => {
    const { runs, playground } = setup();
    await runs.takeTurn({ content: 'hi' });
    expect(runs.activeRun?.runId).toBeNull();
    playground.setCurrentSession({
      ...session('s1', 'running'),
      executions: [{ id: 'p1', startedAt: '2026-01-01T00:00:00Z', status: 'running' }]
    });
    expect(runs.activeRun?.runId).toBe('p1');
    runs.dispose();
  });

  it('lets go of the run when another conversation is selected', async () => {
    const { runs, playground } = setup();
    await runs.takeTurn({ content: 'hi' });
    playground.setCurrentSession(session('other'));
    expect(runs.activeRun).toBeNull();
    runs.dispose();
  });

  it('dismissRun forgets the run and its node statuses', async () => {
    const { runs, playground } = setup();
    await runs.takeTurn({ content: 'hi' });
    playground.setNodeStatuses({}, { workflowId: 'wf', pipelineId: 'p1' });
    runs.dismissRun();
    expect(runs.activeRun).toBeNull();
    expect(playground.nodeStatuses).toEqual({});
    runs.dispose();
  });

  it('keeps run state per instance', async () => {
    const a = setup();
    const b = setup();
    await a.runs.takeTurn({ content: 'hi' });
    expect(a.runs.activeRun?.status).toBe('running');
    expect(b.runs.activeRun).toBeNull();
    a.runs.dispose();
    b.runs.dispose();
  });
});

describe('activeRun: host runs', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function hooks(statuses: string[]) {
    const onRun = vi.fn(async () => ({ ok: true, data: { runId: 'r1', status: 'pending' } }));
    const onRunStatus = vi.fn(async (runId: string) => ({
      ok: true,
      data: { runId, status: statuses.shift() ?? 'completed' }
    }));
    return { onRun, onRunStatus } as unknown as HostHooks & {
      onRun: ReturnType<typeof vi.fn>;
      onRunStatus: ReturnType<typeof vi.fn>;
    };
  }

  it('hands the host envelopes back untouched', async () => {
    const { runs } = setup();
    const given = hooks([]);
    const wrapped = runs.wrapHostHooks(given);
    expect(await wrapped.onRun!({ a: 1 })).toEqual({
      ok: true,
      data: { runId: 'r1', status: 'pending' }
    });
    expect(given.onRun).toHaveBeenCalledWith({ a: 1 });
    expect(await wrapped.onRunStatus!('r1')).toMatchObject({ ok: true });
    runs.dispose();
  });

  it('keeps hooks that are not run hooks, and absent ones absent', () => {
    const { runs } = setup();
    const onSave = vi.fn();
    const wrapped = runs.wrapHostHooks({ onSave } as HostHooks);
    expect(wrapped.onSave).toBe(onSave);
    expect(wrapped.onRun).toBeUndefined();
    expect(wrapped.onRunStatus).toBeUndefined();
  });

  it('shows a run the host started, and reads its status on a timer until it ends', async () => {
    const { runs } = setup();
    runs.hostPollInterval = 1000;
    const wrapped = runs.wrapHostHooks(hooks(['running', 'paused', 'completed']));
    await wrapped.onRun!({});
    expect(runs.activeRun).toMatchObject({ origin: 'host', runId: 'r1', status: 'running' });

    await vi.advanceTimersByTimeAsync(1000);
    expect(runs.activeRun?.status).toBe('running');
    await vi.advanceTimersByTimeAsync(1000);
    expect(runs.activeRun?.status).toBe('waiting');
    await vi.advanceTimersByTimeAsync(1000);
    expect(runs.activeRun?.status).toBe('done');
    expect(runs.activeRun?.endedAt).toEqual(expect.any(Number));
    runs.dispose();
  });

  it('moves with the status an agent reads itself', async () => {
    const { runs } = setup();
    const wrapped = runs.wrapHostHooks(hooks(['failed']));
    await wrapped.onRun!({});
    await wrapped.onRunStatus!('r1');
    expect(runs.activeRun?.status).toBe('failed');
    runs.dispose();
  });

  it('does not follow a run it cannot read the status of', async () => {
    const { runs } = setup();
    const wrapped = runs.wrapHostHooks({ onRun: hooks([]).onRun });
    await wrapped.onRun!({});
    expect(runs.activeRun).toBeNull();
  });

  it('ignores a status for another run', async () => {
    const { runs } = setup();
    const wrapped = runs.wrapHostHooks(hooks([]));
    await wrapped.onRun!({});
    await wrapped.onRunStatus!('someone-else');
    expect(runs.activeRun?.status).toBe('running');
    runs.dispose();
  });

  it('does not show a run the host refused', async () => {
    const { runs } = setup();
    const wrapped = runs.wrapHostHooks({
      onRun: async () => ({ ok: false, code: 'FORBIDDEN' }),
      onRunStatus: hooks([]).onRunStatus
    } as HostHooks);
    await wrapped.onRun!({});
    expect(runs.activeRun).toBeNull();
  });

  it('stops a host run with a cancel signal on its pipeline', async () => {
    const { runs } = setup();
    const cancel = vi.spyOn(pipelineSignalService, 'cancel').mockResolvedValue({
      status: 'accepted'
    } as never);
    const wrapped = runs.wrapHostHooks(hooks(['cancelled']));
    await wrapped.onRun!({});
    await runs.stopRun();
    expect(cancel).toHaveBeenCalledWith(
      expect.anything(),
      'r1',
      { reason: undefined },
      expect.anything()
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(runs.activeRun?.status).toBe('stopped');
    runs.dispose();
  });

  it('stops polling once dismissed', async () => {
    const { runs } = setup();
    const given = hooks([]);
    const wrapped = runs.wrapHostHooks(given);
    await wrapped.onRun!({});
    runs.dismissRun();
    await vi.advanceTimersByTimeAsync(10000);
    expect(given.onRunStatus).not.toHaveBeenCalled();
  });
});
