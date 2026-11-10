/**
 * The editor itself refuses a sidebar node drop on a locked canvas, not only
 * the drop zone: FlowDropZone is replaced by a stub that hands its `ondrop`
 * to the test, so the editor's own handler is what is under test.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';

const captured: { ondrop?: (data: string, position: { x: number; y: number }) => void } = {};

vi.mock('$lib/components/FlowDropZone.svelte', () => ({
  default: (_anchor: unknown, props: typeof captured) => {
    captured.ondrop = props.ondrop;
  }
}));
vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

const { default: WorkflowEditor } = await import('$lib/components/WorkflowEditor.svelte');
const { createFlowDropInstance } = await import('$lib/stores/instanceContainer.svelte.js');

const lock = { reasons: [{ kind: 'in_use', message: 'Used.' }], actions: [] };
const nodeType = JSON.stringify({
  id: 'calc',
  name: 'Calc',
  type: 'default',
  category: 'math',
  inputs: [],
  outputs: [],
  description: ''
});

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    flushSync();
    await tick();
    await new Promise((r) => setTimeout(r, 5));
  }
}

async function drop(id: string, locked: boolean) {
  const fd = createFlowDropInstance({ id });
  fd.workflow.initialize({
    id: 'wf',
    name: 'wf',
    nodes: [],
    edges: [],
    metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
  } as never);
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(WorkflowEditor, { target, props: { instance: fd } as never });
  await settle();
  if (locked) fd.lock.set(lock);
  await settle();
  const push = vi.spyOn(fd.workflow, 'pushHistory');
  captured.ondrop!(nodeType, { x: 10, y: 10 });
  await settle();
  return { fd, push };
}

describe('WorkflowEditor handleNodeDrop', () => {
  it('adds the node and a history entry when editable (baseline)', async () => {
    const { fd, push } = await drop('nodedrop-edit', false);
    expect(fd.workflow.nodes).toHaveLength(1);
    expect(push).toHaveBeenCalledTimes(1);
    fd.destroy();
  });

  it('adds no node and no history entry on a locked canvas', async () => {
    const { fd, push } = await drop('nodedrop-locked', true);
    expect(fd.workflow.nodes).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
    fd.destroy();
  });
});
