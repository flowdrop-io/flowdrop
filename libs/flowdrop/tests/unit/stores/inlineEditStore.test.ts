import { describe, it, expect, vi } from 'vitest';
import { InlineEditStore } from '../../../src/lib/stores/inlineEditStore.svelte.js';
import { createFlowDropInstance } from '../../../src/lib/stores/instanceContainer.svelte.js';

describe('InlineEditStore', () => {
  it('a request after register calls the starter', () => {
    const store = new InlineEditStore();
    const start = vi.fn();
    store.register('caption.1', start);
    store.request('caption.1');
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('only the addressed node starts', () => {
    const store = new InlineEditStore();
    const one = vi.fn();
    const two = vi.fn();
    store.register('a', one);
    store.register('b', two);
    store.request('b');
    expect(one).not.toHaveBeenCalled();
    expect(two).toHaveBeenCalledTimes(1);
  });

  it('a request before register runs on register, once', () => {
    const store = new InlineEditStore();
    store.request('caption.1');
    const start = vi.fn();
    store.register('caption.1', start);
    expect(start).toHaveBeenCalledTimes(1);

    const again = vi.fn();
    store.register('caption.1', again);
    expect(again).not.toHaveBeenCalled();
  });

  it('a pending request for another node is kept', () => {
    const store = new InlineEditStore();
    store.request('a');
    const other = vi.fn();
    store.register('b', other);
    expect(other).not.toHaveBeenCalled();
    const start = vi.fn();
    store.register('a', start);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('ignores requests while not editable, and drops a pending one when it turns off', () => {
    const store = new InlineEditStore();
    const start = vi.fn();
    store.register('a', start);
    store.setEditable(false);
    store.request('a');
    expect(start).not.toHaveBeenCalled();

    store.setEditable(true);
    store.request('x');
    store.setEditable(false);
    store.setEditable(true);
    const late = vi.fn();
    store.register('x', late);
    expect(late).not.toHaveBeenCalled();
  });

  it('unregister stops the starter, and only removes its own registration', () => {
    const store = new InlineEditStore();
    const first = vi.fn();
    const second = vi.fn();
    const unregisterFirst = store.register('a', first);
    store.register('a', second);
    unregisterFirst();
    store.request('a');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('after unregister a request waits for the next register', () => {
    const store = new InlineEditStore();
    const unregister = store.register('a', vi.fn());
    unregister();
    store.request('a');
    const start = vi.fn();
    store.register('a', start);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('clear forgets a pending request', () => {
    const store = new InlineEditStore();
    store.request('a');
    store.clear();
    const start = vi.fn();
    store.register('a', start);
    expect(start).not.toHaveBeenCalled();
  });

  it('each instance has its own channel', () => {
    const one = createFlowDropInstance();
    const two = createFlowDropInstance();
    const start = vi.fn();
    two.inlineEdit.register('x', start);
    one.inlineEdit.request('x');
    expect(start).not.toHaveBeenCalled();
    one.destroy();
    two.destroy();
  });
});
