/**
 * The editor keeps run status across a settings change: the sync effect
 * (store -> flowNodes) must not re-run for a setting it only reads in passing,
 * and a rebuild re-applies the loaded execution info either way.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { updateSettings } from '$lib/stores/settingsStore.svelte.js';
import { NodeOperationsHelper } from '$lib/helpers/workflowEditorHelper.js';
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
});

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    flushSync();
    await tick();
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('WorkflowEditor run status and the sync effect', () => {
  it('re-applies the loaded map on a store rebuild, and a settings change does not rebuild', async () => {
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal('cancelIdleCallback', (id: number) => clearTimeout(id));
    vi.spyOn(NodeOperationsHelper, 'loadNodeExecutionInfo').mockResolvedValue(info as never);
    const apply = vi.spyOn(NodeOperationsHelper, 'applyExecutionInfo');

    const fd = createFlowDropInstance({ id: 'exec-info' });
    fd.workflow.initialize(workflow);
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(WorkflowEditor, { target, props: { instance: fd, pipelineId: 'p1' } as never });
    await settle();

    // The load painted the map once it arrived.
    expect(apply).toHaveBeenCalledWith(expect.anything(), info);

    // A workflow store change rebuilds flowNodes; the map is applied again.
    apply.mockClear();
    fd.workflow.updateName('Renamed');
    await settle();
    expect(apply).toHaveBeenCalledWith(expect.anything(), info);

    // A settings change (theme) must not rebuild flowNodes at all.
    apply.mockClear();
    updateSettings({ theme: 'dark' } as never);
    await settle();
    expect(apply).not.toHaveBeenCalled();

    fd.destroy();
  });

  it('clears the map when the pipeline changes, so a rebuild paints nothing stale', async () => {
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal('cancelIdleCallback', (id: number) => clearTimeout(id));
    const load = vi
      .spyOn(NodeOperationsHelper, 'loadNodeExecutionInfo')
      .mockResolvedValueOnce(info as never)
      .mockImplementation(() => new Promise(() => {}));
    const apply = vi.spyOn(NodeOperationsHelper, 'applyExecutionInfo');

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

    pipelineId = 'p2';
    await settle();
    expect(apply).toHaveBeenCalledWith(expect.anything(), null);

    // The new pipeline's load never resolves; a rebuild must not bring p1 back.
    apply.mockClear();
    fd.workflow.updateName('Renamed again');
    await settle();
    expect(apply).not.toHaveBeenCalledWith(expect.anything(), info);

    fd.destroy();
  });
});
