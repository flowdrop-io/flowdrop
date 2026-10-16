import { describe, it, expect } from 'vitest';
import { AttachedRunStore } from '$lib/stores/attachedRunStore.svelte.js';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';

describe('AttachedRunStore', () => {
  it('starts with no run', () => {
    const store = new AttachedRunStore();
    expect(store.id).toBeNull();
    expect(store.hint).toEqual({});
  });

  it('attaches a run, with what the caller knew of it, and detaches it', () => {
    const store = new AttachedRunStore();
    expect(store.attach('7337', { status: 'failed' })).toBe(true);
    expect(store.id).toBe('7337');
    expect(store.hint.status).toBe('failed');
    store.detach();
    expect(store.id).toBeNull();
    expect(store.hint).toEqual({});
  });

  it('replaces the attached run and takes numbers', () => {
    const store = new AttachedRunStore();
    store.attach('1', { status: 'failed' });
    store.attach(2);
    expect(store.id).toBe('2');
    expect(store.hint).toEqual({});
  });

  it('refuses an id the server would refuse (digits only)', () => {
    const store = new AttachedRunStore();
    store.attach('5');
    for (const bad of ['', 'r1', '12a', '-3', '1.5', '1234567890123456789']) {
      expect(store.attach(bad)).toBe(false);
    }
    expect(store.id).toBe('5');
  });

  it('is per instance', () => {
    const a = createFlowDropInstance({ id: 'att-a' });
    const b = createFlowDropInstance({ id: 'att-b' });
    a.attachedRun.attach('9');
    expect(b.attachedRun.id).toBeNull();
  });
});
