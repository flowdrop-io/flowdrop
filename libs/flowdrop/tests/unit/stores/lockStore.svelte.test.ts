import { describe, it, expect, vi } from 'vitest';
import { EditorLockStore } from '$lib/stores/lockStore.svelte.js';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import type { Workflow } from '$lib/types/index.js';

const lock = {
  reasons: [{ kind: 'in_use', message: 'Two forms use it.', url: '/usage' }],
  actions: [{ id: 'edit', label: 'Edit', primary: true }]
};

function workflow(): Workflow {
  return {
    id: 'wf',
    name: 'Flow',
    nodes: [],
    edges: [],
    metadata: { version: '1.0.0' }
  } as unknown as Workflow;
}

describe('EditorLockStore', () => {
  it('starts unlocked', () => {
    const store = new EditorLockStore();
    expect(store.current).toBeNull();
    expect(store.isLocked).toBe(false);
  });

  it('locks, replaces and unlocks; tells a listener only about real changes', () => {
    const store = new EditorLockStore();
    const seen: boolean[] = [];
    store.onChange((locked) => seen.push(locked));
    store.set(lock);
    store.set({ ...lock, reasons: [] });
    store.set(null);
    store.clear();
    expect(seen).toEqual([true, false]);
  });

  it('drops reasons and actions that are not usable', () => {
    const store = new EditorLockStore();
    store.set({
      reasons: [
        { kind: 'x', message: '' },
        { kind: 'y', message: 'Kept' }
      ],
      actions: [
        { id: '', label: 'No id' },
        { id: 'ok', label: 'Ok' }
      ]
    });
    expect(store.current?.reasons.map((r) => r.message)).toEqual(['Kept']);
    expect(store.current?.actions.map((a) => a.id)).toEqual(['ok']);
    store.set('nonsense' as never);
    expect(store.isLocked).toBe(false);
  });

  it('reports an action to the host, and only one the lock offers', () => {
    const store = new EditorLockStore();
    const onAction = vi.fn();
    store.onAction(onAction);
    store.fire('edit');
    expect(onAction).not.toHaveBeenCalled();
    store.set(lock);
    store.fire('edit');
    store.fire('other');
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('edit');
  });
});

describe('a locked instance', () => {
  it('refuses every edit until it is unlocked', () => {
    const fd = createFlowDropInstance({ id: 'lock-test' });
    fd.workflow.initialize(workflow());
    const node = { id: 'n1', type: 'default', position: { x: 0, y: 0 }, data: {} } as never;

    fd.lock.set(lock);
    expect(fd.workflow.locked).toBe(true);
    fd.workflow.addNode(node);
    fd.workflow.updateName('Changed');
    fd.workflow.batchUpdate({ name: 'Changed again' });
    expect(fd.workflow.nodes).toHaveLength(0);
    expect(fd.workflow.name).toBe('Flow');
    expect(fd.workflow.isDirty).toBe(false);

    fd.lock.set(null);
    fd.workflow.addNode(node);
    expect(fd.workflow.nodes).toHaveLength(1);
    expect(fd.workflow.isDirty).toBe(true);
  });

  it('still loads a workflow while locked', () => {
    const fd = createFlowDropInstance({ id: 'lock-load' });
    fd.lock.set(lock);
    fd.workflow.initialize(workflow());
    expect(fd.workflow.id).toBe('wf');
  });
});

describe('history while locked', () => {
  function withTwoEdits(id: string) {
    const fd = createFlowDropInstance({ id });
    fd.workflow.initialize(workflow());
    fd.workflow.addNode({ id: 'n1', type: 'default', position: { x: 0, y: 0 }, data: {} } as never);
    fd.workflow.addNode({ id: 'n2', type: 'default', position: { x: 0, y: 0 }, data: {} } as never);
    return fd;
  }

  it('does nothing on undo and redo: position, workflow and answer stay as they were', () => {
    const fd = withTwoEdits('lock-history');
    expect(fd.workflow.nodes).toHaveLength(2);
    const position = fd.historyBindings.state.currentIndex;

    fd.lock.set(lock);
    expect(fd.historyBindings.undo()).toBe(false);
    expect(fd.historyBindings.redo()).toBe(false);
    expect(fd.historyBindings.state.currentIndex).toBe(position);
    expect(fd.workflow.nodes).toHaveLength(2);
  });

  it('does not call the restore callback while locked', () => {
    const fd = withTwoEdits('lock-history-callback');
    const restored = vi.fn();
    fd.historyBindings.setOnRestoreCallback(restored);
    fd.lock.set(lock);
    fd.historyBindings.undo();
    expect(restored).not.toHaveBeenCalled();
  });

  it('undoes normally once the lock is removed', () => {
    const fd = withTwoEdits('lock-history-unlock');
    const position = fd.historyBindings.state.currentIndex;
    fd.lock.set(lock);
    fd.historyBindings.undo();
    fd.lock.set(null);
    expect(fd.historyBindings.undo()).toBe(true);
    expect(fd.historyBindings.state.currentIndex).toBe(position - 1);
    expect(fd.workflow.nodes).toHaveLength(1);
  });
});
