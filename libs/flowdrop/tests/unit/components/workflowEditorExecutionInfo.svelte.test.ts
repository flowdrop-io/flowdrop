/**
 * The editor keeps run status in the instance's playground store, not on the
 * canvas nodes: a rebuild from the workflow store (any edit, a settings change)
 * cannot drop it, and it never reaches the workflow.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { updateSettings } from '$lib/stores/settingsStore.svelte.js';
import { nodeExecutionService } from '$lib/services/nodeExecutionService.js';
import type { Workflow } from '$lib/types/index.js';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

const workflow = {
  id: 'wf-exec',
  name: 'Exec',
  nodes: [
    {
      id: 'n1',
      type: 'universalNode',
      position: { x: 0, y: 0 },
      data: { label: 'N1', config: {}, metadata: { id: 'x', name: 'X', inputs: [], outputs: [] } }
    }
  ],
  edges: [],
  metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
} as unknown as Workflow;

const info = { n1: { status: 'completed', executionCount: 1, isExecuting: false } };

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    flushSync();
    await tick();
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('WorkflowEditor run status and the sync effect', () => {
  it('keeps the loaded status in fd.playground across store rebuilds and settings changes', async () => {
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal('cancelIdleCallback', (id: number) => clearTimeout(id));
    vi.spyOn(nodeExecutionService, 'fetchMultipleNodeExecutionInfo').mockResolvedValue(info as never);

    const fd = createFlowDropInstance({ id: 'exec-info' });
    fd.workflow.initialize(workflow);
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(WorkflowEditor, { target, props: { instance: fd, pipelineId: 'p1' } as never });
    await settle();

    // The load landed in the store, scoped to the workflow and run.
    expect(fd.playground.nodeStatusFor('n1')).toEqual(info.n1);
    expect(fd.playground.nodeStatusScope).toEqual({ workflowId: 'wf-exec', pipelineId: 'p1' });

    // Edits rebuild flowNodes from the store; the status stays, and is not
    // written into the workflow.
    fd.workflow.updateName('Renamed');
    await settle();
    expect(fd.playground.nodeStatusFor('n1')).toEqual(info.n1);
    for (const node of fd.workflow.nodes) expect('executionInfo' in node.data).toBe(false);

    updateSettings({ theme: 'dark' } as never);
    await settle();
    expect(fd.playground.nodeStatusFor('n1')).toEqual(info.n1);

    fd.destroy();
  });

  it('clears the status when the pipeline changes, so nothing stale shows', async () => {
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal('cancelIdleCallback', (id: number) => clearTimeout(id));
    const load = vi
      .spyOn(nodeExecutionService, 'fetchMultipleNodeExecutionInfo')
      .mockResolvedValueOnce(info as never)
      .mockImplementation(() => new Promise(() => {}));

    const fd = createFlowDropInstance({ id: 'exec-info-2' });
    fd.workflow.initialize(workflow);
    const target = document.createElement('div');
    document.body.appendChild(target);
    let pipelineId = $state('p1');
    app = mount(WorkflowEditor, {
      target,
      props: {
        instance: fd,
        get pipelineId() {
          return pipelineId;
        }
      } as never
    });
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(fd.playground.nodeStatusFor('n1')).toEqual(info.n1);

    pipelineId = 'p2';
    await settle();
    expect(fd.playground.nodeStatusFor('n1')).toBeUndefined();

    // The new pipeline's load never resolves; a rebuild must not bring p1 back.
    fd.workflow.updateName('Renamed again');
    await settle();
    expect(fd.playground.nodeStatusFor('n1')).toBeUndefined();

    fd.destroy();
  });

  it('keeps two instances on one page apart', async () => {
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal('cancelIdleCallback', (id: number) => clearTimeout(id));
    vi.spyOn(nodeExecutionService, 'fetchMultipleNodeExecutionInfo').mockResolvedValue(info as never);
    const a = createFlowDropInstance({ id: 'exec-info-a' });
    const b = createFlowDropInstance({ id: 'exec-info-b' });
    a.workflow.initialize(workflow);
    b.workflow.initialize(workflow);
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(WorkflowEditor, { target, props: { instance: a, pipelineId: 'p1' } as never });
    await settle();

    expect(a.playground.nodeStatusFor('n1')).toEqual(info.n1);
    expect(b.playground.nodeStatusFor('n1')).toBeUndefined();

    a.destroy();
    b.destroy();
  });
});
