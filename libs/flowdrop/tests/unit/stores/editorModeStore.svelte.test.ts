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

  it('tells a listener once per real change, from set and toggle', () => {
    const store = new EditorModeStore();
    const seen: string[] = [];
    store.onChange((mode) => seen.push(mode));
    store.set('test');
    store.toggle();
    store.toggle();
    expect(seen).toEqual(['test', 'edit', 'test']);
  });

  it('does not tell a listener about the value it already has, or a non-mode', () => {
    const store = new EditorModeStore();
    const seen: string[] = [];
    store.onChange((mode) => seen.push(mode));
    store.set('edit');
    store.set('readonly' as never);
    store.set('test');
    store.set('test');
    expect(seen).toEqual(['test']);
  });

  it('stops telling a listener after it unsubscribes, and only that one', () => {
    const store = new EditorModeStore();
    const a: string[] = [];
    const b: string[] = [];
    const stopA = store.onChange((mode) => a.push(mode));
    store.onChange((mode) => b.push(mode));
    store.set('test');
    stopA();
    store.set('edit');
    expect(a).toEqual(['test']);
    expect(b).toEqual(['test', 'edit']);
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
