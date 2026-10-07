import { describe, it, expect } from 'vitest';
import { EditorModeStore } from '$lib/stores/editorModeStore.svelte.js';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';

describe('EditorModeStore', () => {
  it('starts in Edit', () => {
    const store = new EditorModeStore();
    expect(store.current).toBe('edit');
    expect(store.isTest).toBe(false);
  });

  it('sets and toggles', () => {
    const store = new EditorModeStore();
    store.set('test');
    expect(store.isTest).toBe(true);
    store.toggle();
    expect(store.current).toBe('edit');
    store.toggle();
    expect(store.current).toBe('test');
  });

  it('ignores a value that is not a mode', () => {
    const store = new EditorModeStore();
    store.set('test');
    store.set('readonly' as never);
    expect(store.current).toBe('test');
  });

  it('is per instance', () => {
    const a = createFlowDropInstance();
    const b = createFlowDropInstance();
    a.editorMode.set('test');
    expect(b.editorMode.current).toBe('edit');
    a.destroy();
    b.destroy();
  });
});
