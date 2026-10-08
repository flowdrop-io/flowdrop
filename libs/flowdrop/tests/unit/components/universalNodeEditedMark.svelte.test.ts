/**
 * The `edited` mark and the status-only badge on a node.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import UniversalNode from '$lib/components/UniversalNode.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { Workflow, WorkflowNode } from '$lib/types/index.js';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

const metadata = { node_type_id: 'x', name: 'X', inputs: [], outputs: [] };
const done = {
  status: 'completed',
  executionCount: 2,
  isExecuting: false,
  lastExecutionDuration: 4200
};
const scope = { workflowId: 'wf', pipelineId: 'run-1' };

const nodeWith = (config: Record<string, unknown>) =>
  ({
    id: 'n1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: 'N', config, metadata }
  }) as unknown as WorkflowNode;

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function setup() {
  const fd = createFlowDropInstance({ id: `mark-${Math.random()}` });
  fd.workflow.initialize({
    id: 'wf',
    name: 'WF',
    nodes: [nodeWith({ prompt: 'a' })],
    edges: []
  } as unknown as Workflow);
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(UniversalNode, {
    target,
    props: { id: 'n1', data: nodeWith({ prompt: 'a' }).data } as never,
    context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
  });
  flushSync();
  const edit = () => {
    fd.workflow.updateNode('n1', { data: nodeWith({ prompt: 'b' }).data });
    flushSync();
  };
  return { fd, target, edit };
}

describe('UniversalNode edited mark', () => {
  it('shows on an edited node with a last run, in Test mode only', () => {
    const { fd, target, edit } = setup();
    fd.playground.setNodeStatuses({ n1: done as never }, scope);
    fd.editedNodes.track('run-1');
    fd.editedNodes.setVisible(true);
    flushSync();
    expect(target.querySelector('[data-testid="node-edited"]')).toBeNull();

    edit();
    expect(target.querySelector('[data-testid="node-edited"]')?.textContent).toBe('edited');

    fd.editedNodes.setVisible(false);
    flushSync();
    expect(target.querySelector('[data-testid="node-edited"]')).toBeNull();
    fd.destroy();
  });

  it('does not show on a node that never ran', () => {
    const { fd, target, edit } = setup();
    fd.playground.setNodeStatuses(
      { n1: { status: 'idle', executionCount: 0, isExecuting: false } as never },
      scope
    );
    fd.editedNodes.track('run-1');
    fd.editedNodes.setVisible(true);
    edit();
    expect(target.querySelector('[data-testid="node-edited"]')).toBeNull();
    fd.destroy();
  });
});

describe('node status badge', () => {
  it('shows the labelled status pill on the canvas', () => {
    const { fd, target } = setup();
    fd.playground.setNodeStatuses({ n1: done as never }, scope);
    flushSync();
    const badge = target.querySelector('.node-status-overlay');
    expect(badge?.getAttribute('data-status')).toBe('completed');
    expect(badge?.getAttribute('aria-label')).toContain('Completed');
    // Label yes; a count only above 1; timing never (it lives in Last run).
    expect(badge?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Completed 2');
    fd.destroy();
  });
});
