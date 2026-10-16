/**
 * Unit Test - DoctorStore
 *
 * Diagnoses the draft (debounced, only for a saved workflow, only when the
 * backend offers a Doctor), drops an answer a newer request overtook, and
 * applies a remedy as ONE undoable edit.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createFlowDropInstance,
  type FlowDropInstance
} from '$lib/stores/instanceContainer.svelte.js';
import { defaultEndpointConfig } from '$lib/config/endpoints.js';
import { createTestWorkflow, createTestNode, createTestEdge } from '../../utils/index.js';
import type { DoctorProblem } from '$lib/types/doctor.js';

const problem = (over: Partial<DoctorProblem> = {}): DoctorProblem => ({
  id: 'p1',
  code: 'W_CONFIG_UNKNOWN',
  severity: 'warning',
  message: 'Unknown key "legacy"',
  node: 'a',
  remedies: [{ id: 'remove_config_key', label: 'Remove', destructive: false }],
  ...over
});

const reply = (data: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify({ success: status < 400, data }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  );

function workflow() {
  return createTestWorkflow({
    id: 'wf-1',
    nodes: [
      createTestNode({
        id: 'a',
        data: { label: 'A', config: { keep: 1, legacy: true }, metadata: undefined as never }
      }),
      createTestNode({ id: 'b' })
    ],
    edges: [createTestEdge({ id: 'e1', source: 'a', target: 'b' })]
  });
}

describe('DoctorStore', () => {
  let fd: FlowDropInstance;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    fd = createFlowDropInstance({ id: `doctor-${Math.random().toString(36).slice(2)}` });
    fd.api.configure(defaultEndpointConfig);
  });

  afterEach(() => {
    fd.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('is off, and makes no request, without the endpoints', async () => {
    fd.api.configure({
      ...defaultEndpointConfig,
      endpoints: {
        ...defaultEndpointConfig.endpoints,
        workflows: { ...defaultEndpointConfig.endpoints.workflows, diagnose: undefined }
      }
    });
    fd.workflow.initialize(workflow());
    fd.doctor.schedule();
    await vi.runAllTimersAsync();
    expect(fd.doctor.supported).toBe(false);
    expect(fd.doctor.status).toBe('off');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes no request for a workflow that is not saved yet', async () => {
    fd.workflow.initialize(createTestWorkflow({ id: '' }));
    fd.doctor.schedule();
    await vi.runAllTimersAsync();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fd.doctor.problems).toEqual([]);
  });

  it('diagnoses the draft as the save would send it, once on load', async () => {
    fetchMock.mockImplementation(() => reply({ problems: [problem()] }));
    fd.workflow.initialize(workflow());
    fd.doctor.schedule();
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/flowdrop/workflow/wf-1/diagnose');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.nodes.map((n: { id: string }) => n.id)).toEqual(['a', 'b']);
    expect(body.edges).toHaveLength(1);
    expect(fd.doctor.problems.map((p) => p.id)).toEqual(['p1']);
    expect(fd.doctor.severityOf('a')).toBe('warning');
    expect(fd.doctor.severityOf('b')).toBeNull();
    // The same version is not diagnosed twice.
    fd.doctor.schedule();
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('waits for the draft to sit still, then asks once', async () => {
    fetchMock.mockImplementation(() => reply({ problems: [] }));
    fd.workflow.initialize(workflow());
    fd.doctor.schedule();
    await vi.runAllTimersAsync();
    fetchMock.mockClear();

    fd.workflow.actions.updateName('One');
    fd.doctor.schedule();
    await vi.advanceTimersByTimeAsync(500);
    fd.workflow.actions.updateName('Two');
    fd.doctor.schedule();
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).name).toBe('Two');
  });

  it('drops an answer a newer request has overtaken', async () => {
    const slow: Array<(r: Response) => void> = [];
    fetchMock
      .mockImplementationOnce(() => new Promise<Response>((resolve) => slow.push(resolve)))
      .mockImplementationOnce(() => reply({ problems: [problem({ id: 'new' })] }));
    fd.workflow.initialize(workflow());

    const first = fd.doctor.diagnoseNow();
    const second = fd.doctor.diagnoseNow();
    await second;
    expect(fd.doctor.problems.map((p) => p.id)).toEqual(['new']);

    // The first request answers last, with an older finding: ignored.
    slow[0](
      new Response(
        JSON.stringify({ success: true, data: { problems: [problem({ id: 'old' })] } }),
        {
          status: 200
        }
      )
    );
    await first;
    expect(fd.doctor.problems.map((p) => p.id)).toEqual(['new']);
    expect(fd.doctor.status).toBe('ready');
  });

  it('a 404 keeps it quiet', async () => {
    fetchMock.mockImplementation(() => reply({}, 404));
    fd.workflow.initialize(workflow());
    await fd.doctor.diagnoseNow();
    expect(fd.doctor.problems).toEqual([]);
    expect(fd.doctor.status).toBe('off');
  });

  describe('applying a remedy', () => {
    const op = {
      op: 'updateNodeConfig',
      nodeId: 'a',
      patch: {},
      unset: ['legacy']
    };

    async function ready() {
      fetchMock.mockImplementation(() => reply({ problems: [problem()] }));
      fd.workflow.initialize(workflow());
      await fd.doctor.diagnoseNow();
      fetchMock.mockReset();
    }

    it('applies the operations as one edit that one undo restores exactly', async () => {
      await ready();
      const before = JSON.stringify(fd.workflow.current);
      fetchMock.mockImplementation((url: string) =>
        url.endsWith('/remedy')
          ? reply({
              operations: [op, { op: 'updateNodeConfig', nodeId: 'a', patch: { z: 1 }, unset: [] }]
            })
          : reply({ problems: [] })
      );

      const p = fd.doctor.problems[0];
      expect(await fd.doctor.applyRemedy(p, p.remedies[0])).toBe(true);

      expect(fd.workflow.nodes[0].data.config).toEqual({ keep: 1, z: 1 });
      const remedyCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/remedy'))!;
      expect(JSON.parse(remedyCall[1].body)).toMatchObject({
        code: 'W_CONFIG_UNKNOWN',
        target: 'p1',
        remedy: 'remove_config_key'
      });
      // Re-diagnosed.
      await vi.runAllTimersAsync();
      expect(fd.doctor.problems).toEqual([]);

      expect(fd.historyBindings.undo()).toBe(true);
      expect(JSON.stringify(fd.workflow.current)).toBe(before);
    });

    it('an unknown operation aborts the whole remedy: nothing changes', async () => {
      await ready();
      const before = JSON.stringify(fd.workflow.current);
      fetchMock.mockImplementation(() => reply({ operations: [op, { op: 'teleport' }] }));
      const p = fd.doctor.problems[0];
      expect(await fd.doctor.applyRemedy(p, p.remedies[0])).toBe(false);
      expect(JSON.stringify(fd.workflow.current)).toBe(before);
      expect(fd.workflow.isDirty).toBe(false);
      expect(fd.doctor.notice?.kind).toBe('failed');
    });

    it('a 409 says the problem is gone and checks again', async () => {
      await ready();
      fetchMock.mockImplementation((url: string) =>
        url.endsWith('/remedy') ? reply({}, 409) : reply({ problems: [] })
      );
      const p = fd.doctor.problems[0];
      expect(await fd.doctor.applyRemedy(p, p.remedies[0])).toBe(false);
      expect(fd.doctor.notice).toMatchObject({ kind: 'gone', problemId: 'p1' });
      await vi.runAllTimersAsync();
      expect(fd.doctor.problems).toEqual([]);
    });

    it('refuses operations when the workflow changed while the server worked', async () => {
      await ready();
      fetchMock.mockImplementation(async (url: string) => {
        if (url.endsWith('/remedy')) {
          fd.workflow.actions.updateName('Edited meanwhile');
          return reply({ operations: [op] });
        }
        return reply({ problems: [] });
      });
      const p = fd.doctor.problems[0];
      expect(await fd.doctor.applyRemedy(p, p.remedies[0])).toBe(false);
      expect(fd.doctor.notice?.kind).toBe('changed');
      expect(fd.workflow.nodes[0].data.config).toEqual({ keep: 1, legacy: true });
    });

    it('a remedy that changes nothing says so', async () => {
      await ready();
      fetchMock.mockImplementation((url: string) =>
        url.endsWith('/remedy') ? reply({ operations: [] }) : reply({ problems: [] })
      );
      const p = fd.doctor.problems[0];
      expect(await fd.doctor.applyRemedy(p, p.remedies[0])).toBe(false);
      expect(fd.doctor.notice?.kind).toBe('empty');
    });
  });
});
