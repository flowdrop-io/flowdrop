import { describe, it, expect } from 'vitest';
import { InlineEditStore } from '../../../src/lib/stores/inlineEditStore.svelte.js';
import { createFlowDropInstance } from '../../../src/lib/stores/instanceContainer.svelte.js';

describe('InlineEditStore', () => {
  it('starts with nothing requested', () => {
    expect(new InlineEditStore().requested).toBeNull();
  });

  it('request sets the id and clear forgets it', () => {
    const store = new InlineEditStore();
    store.request('caption.1');
    expect(store.requested).toBe('caption.1');
    store.clear();
    expect(store.requested).toBeNull();
  });

  it('a later request replaces an earlier one', () => {
    const store = new InlineEditStore();
    store.request('a');
    store.request('b');
    expect(store.requested).toBe('b');
  });

  it('ignores requests while not editable, and drops a pending one when it turns off', () => {
    const store = new InlineEditStore();
    store.setEditable(false);
    store.request('a');
    expect(store.requested).toBeNull();

    store.setEditable(true);
    store.request('a');
    store.setEditable(false);
    expect(store.requested).toBeNull();
  });

  it('each instance has its own channel', () => {
    const one = createFlowDropInstance();
    const two = createFlowDropInstance();
    one.inlineEdit.request('x');
    expect(one.inlineEdit.requested).toBe('x');
    expect(two.inlineEdit.requested).toBeNull();
    one.destroy();
    two.destroy();
  });
});
