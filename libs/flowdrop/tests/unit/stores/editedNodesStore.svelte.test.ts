/**
 * Edited nodes: a baseline per shown run, compared with the live workflow.
 */
import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { EditedNodesStore } from '$lib/stores/editedNodesStore.svelte.js';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import type { Workflow, WorkflowNode } from '$lib/types/index.js';

function node(id: string, config: Record<string, unknown> = {}): WorkflowNode {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: id, config, metadata: { node_type_id: 'llm', name: 'LLM' } }
  } as unknown as WorkflowNode;
}

const wf = (id = 'wf'): Workflow =>
  ({ id, name: 'WF', nodes: [node('a', { prompt: 'hi' }), node('b')], edges: [] }) as Workflow;

function setup() {
  const fd = createFlowDropInstance({ id: `edited-${Math.random()}` });
  fd.workflow.initialize(wf());
  fd.editedNodes.setVisible(true);
  return fd;
}

const edit = (fd: ReturnType<typeof setup>, id: string, updates: Partial<WorkflowNode>) => {
  fd.workflow.updateNode(id, updates);
  flushSync();
};

describe('EditedNodesStore', () => {
  it('marks nothing before a run is tracked', () => {
    const fd = setup();
    edit(fd, 'a', { data: { ...node('a', { prompt: 'x' }).data } });
    expect(fd.editedNodes.isEdited('a')).toBe(false);
    fd.destroy();
  });

  it('marks a node whose config changed after the run was tracked', () => {
    const fd = setup();
    fd.editedNodes.track('run-1');
    expect(fd.editedNodes.isEdited('a')).toBe(false);

    edit(fd, 'a', { data: node('a', { prompt: 'changed' }).data });
    expect(fd.editedNodes.isEdited('a')).toBe(true);
    expect(fd.editedNodes.isEdited('b')).toBe(false);
    fd.destroy();
  });

  it('does not mark a moved node or a renamed label', () => {
    const fd = setup();
    fd.editedNodes.track('run-1');

    edit(fd, 'a', { position: { x: 300, y: 300 } });
    edit(fd, 'a', { data: { ...node('a', { prompt: 'hi' }).data, label: 'Renamed' } });
    expect(fd.editedNodes.isEdited('a')).toBe(false);
    fd.destroy();
  });

  it('clears the mark when the edit is undone by hand', () => {
    const fd = setup();
    fd.editedNodes.track('run-1');
    edit(fd, 'a', { data: node('a', { prompt: 'changed' }).data });
    edit(fd, 'a', { data: node('a', { prompt: 'hi' }).data });
    expect(fd.editedNodes.isEdited('a')).toBe(false);
    fd.destroy();
  });

  it('keeps the baseline while the same run is tracked again', () => {
    const fd = setup();
    fd.editedNodes.track('run-1');
    edit(fd, 'a', { data: node('a', { prompt: 'changed' }).data });
    fd.editedNodes.track('run-1');
    expect(fd.editedNodes.isEdited('a')).toBe(true);
    fd.destroy();
  });

  it('starts a new baseline when another run is shown, and drops it when none is', () => {
    const fd = setup();
    fd.editedNodes.track('run-1');
    edit(fd, 'a', { data: node('a', { prompt: 'changed' }).data });
    expect(fd.editedNodes.isEdited('a')).toBe(true);

    fd.editedNodes.track('run-2');
    expect(fd.editedNodes.runId).toBe('run-2');
    expect(fd.editedNodes.isEdited('a')).toBe(false);

    fd.editedNodes.track(null);
    expect(fd.editedNodes.runId).toBeNull();
    fd.destroy();
  });

  it('shows nothing while hidden (Edit mode)', () => {
    const fd = setup();
    fd.editedNodes.track('run-1');
    edit(fd, 'a', { data: node('a', { prompt: 'changed' }).data });
    fd.editedNodes.setVisible(false);
    expect(fd.editedNodes.isEdited('a')).toBe(false);
    fd.editedNodes.setVisible(true);
    expect(fd.editedNodes.isEdited('a')).toBe(true);
    fd.destroy();
  });

  it('does not compare across workflows, and ignores a node added after the run', () => {
    const fd = setup();
    fd.editedNodes.track('run-1');
    fd.workflow.initialize({ ...wf('other'), nodes: [node('a', { prompt: 'zzz' })] });
    flushSync();
    expect(fd.editedNodes.isEdited('a')).toBe(false);

    fd.workflow.initialize(wf());
    fd.editedNodes.track('run-2');
    fd.workflow.updateNodes([...wf().nodes, node('c', { new: true })]);
    flushSync();
    expect(fd.editedNodes.isEdited('c')).toBe(false);
    fd.destroy();
  });

  it('is independent per instance', () => {
    const a = setup();
    const b = setup();
    a.editedNodes.track('run-1');
    edit(a, 'a', { data: node('a', { prompt: 'changed' }).data });
    expect(a.editedNodes.isEdited('a')).toBe(true);
    expect(b.editedNodes.isEdited('a')).toBe(false);
    a.destroy();
    b.destroy();
  });

  it('can be built on any workflow reader', () => {
    const store = new EditedNodesStore(() => null);
    store.track('run-1');
    expect(store.runId).toBeNull();
  });
});
