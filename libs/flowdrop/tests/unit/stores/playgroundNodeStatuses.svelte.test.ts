/**
 * Run status overlay store: node statuses live per instance in
 * `fd.playground`, keyed by node id.
 */

import { describe, it, expect } from 'vitest';
import { PlaygroundStore } from '$lib/stores/playgroundStore.svelte.js';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import type { NodeExecutionInfo } from '$lib/types/index.js';

const done: NodeExecutionInfo = { status: 'completed', executionCount: 1, isExecuting: false };
const failed: NodeExecutionInfo = {
  status: 'failed',
  executionCount: 1,
  isExecuting: false,
  lastError: 'boom'
};
const scope = { workflowId: 'wf', pipelineId: 'p1' };

describe('PlaygroundStore node statuses', () => {
  it('starts empty', () => {
    const store = new PlaygroundStore();
    expect(store.nodeStatuses).toEqual({});
    expect(store.nodeStatusScope).toBeNull();
    expect(store.nodeStatusFor('a')).toBeUndefined();
  });

  it('keeps statuses by node id with their scope', () => {
    const store = new PlaygroundStore();
    store.setNodeStatuses({ a: done, b: failed }, scope);
    expect(store.nodeStatusFor('a')).toBe(done);
    expect(store.nodeStatusFor('b')).toBe(failed);
    expect(store.nodeStatusFor('c')).toBeUndefined();
    expect(store.nodeStatusScope).toEqual(scope);
  });

  it('replaces the whole map on each set', () => {
    const store = new PlaygroundStore();
    store.setNodeStatuses({ a: done }, scope);
    store.setNodeStatuses({ b: failed }, { workflowId: 'wf', pipelineId: 'p2' });
    expect(store.nodeStatusFor('a')).toBeUndefined();
    expect(store.nodeStatusScope?.pipelineId).toBe('p2');
  });

  it('clear and reset forget them', () => {
    const store = new PlaygroundStore();
    store.setNodeStatuses({ a: done }, scope);
    store.clearNodeStatuses();
    expect(store.nodeStatuses).toEqual({});
    expect(store.nodeStatusScope).toBeNull();

    store.setNodeStatuses({ a: done }, scope);
    store.reset();
    expect(store.nodeStatusFor('a')).toBeUndefined();
  });

  it('is per instance: two instances never share statuses', () => {
    const one = createFlowDropInstance({ id: 'status-one' });
    const two = createFlowDropInstance({ id: 'status-two' });
    one.playground.setNodeStatuses({ a: done }, scope);
    expect(one.playground.nodeStatusFor('a')).toBe(done);
    expect(two.playground.nodeStatusFor('a')).toBeUndefined();
    one.destroy();
    two.destroy();
  });
});
