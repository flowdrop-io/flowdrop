/**
 * The node status overlay draws from the instance's playground store (keyed by
 * node id), with `data.executionInfo` only as a deprecated fallback.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import UniversalNode from '$lib/components/UniversalNode.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

const data = { label: 'N', config: {}, metadata: { id: 'x', name: 'X', inputs: [], outputs: [] } };
const failed = { status: 'failed', executionCount: 1, isExecuting: false, lastError: 'boom' };

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function render(fd: ReturnType<typeof createFlowDropInstance>, nodeData: object) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(UniversalNode, {
    target,
    props: { id: 'n1', data: nodeData } as never,
    context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
  });
  flushSync();
  return target;
}

describe('UniversalNode status overlay source', () => {
  it('shows nothing without a status, then the store entry once it arrives', () => {
    const fd = createFlowDropInstance({ id: 'overlay-store' });
    const target = render(fd, data);
    expect(target.querySelector('.node-status-overlay')).toBeNull();

    fd.playground.setNodeStatuses({ n1: failed as never }, { workflowId: 'w', pipelineId: 'p' });
    flushSync();
    expect(target.querySelector('.node-status-overlay')).not.toBeNull();

    fd.playground.clearNodeStatuses();
    flushSync();
    expect(target.querySelector('.node-status-overlay')).toBeNull();
    fd.destroy();
  });

  it('prefers the store over the deprecated data.executionInfo', () => {
    const fd = createFlowDropInstance({ id: 'overlay-pref' });
    fd.playground.setNodeStatuses({ n1: failed as never }, { workflowId: 'w', pipelineId: 'p' });
    const target = render(fd, {
      ...data,
      executionInfo: { status: 'completed', executionCount: 1, isExecuting: false }
    });
    expect(target.querySelector('.node-status-overlay')?.getAttribute('aria-label')).toContain(
      'Failed'
    );
    fd.destroy();
  });

  it('still honours data.executionInfo when the store has no entry', () => {
    const fd = createFlowDropInstance({ id: 'overlay-legacy' });
    const target = render(fd, {
      ...data,
      executionInfo: { status: 'completed', executionCount: 1, isExecuting: false }
    });
    expect(target.querySelector('.node-status-overlay')).not.toBeNull();
    fd.destroy();
  });
});
