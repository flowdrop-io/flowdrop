/** The test blocker: provided by `App` only, never replaceable through the public class. */

import { describe, it, expect } from 'vitest';
import {
  EditorModeStore,
  provideTestBlocker
} from '../../../src/lib/stores/editorModeStore.svelte.js';

describe('EditorModeStore test blocker', () => {
  it('is not a method of the public class', () => {
    expect('provideTestBlocker' in new EditorModeStore()).toBe(false);
  });

  it('holds Test back while provided and reads live', () => {
    const store = new EditorModeStore();
    // No App: Test is never in effect.
    store.set('test');
    expect(store.effective).toBe('edit');
    let reason: string | null = 'saved first';
    const withdraw = provideTestBlocker(store, () => reason);
    expect(store.testBlocker).toBe('saved first');
    expect(store.effective).toBe('edit');
    reason = null;
    expect(store.effective).toBe('test');
    withdraw();
    expect(store.effective).toBe('edit');
  });

  it('a stale withdraw does not remove a newer provider', () => {
    const store = new EditorModeStore();
    const first = provideTestBlocker(store, () => 'first');
    provideTestBlocker(store, () => null);
    first();
    expect(store.testBlocker).toBeNull();
  });
});
