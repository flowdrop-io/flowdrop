import { describe, it, expect } from 'vitest';
import { resolveMessageNodeLink } from '$lib/utils/messageNodeLink.js';

const nodes = [{ id: 'a' }, { id: 'b' }];

describe('resolveMessageNodeLink', () => {
  it('links to a node on the canvas', () => {
    expect(resolveMessageNodeLink({ nodeId: 'a' }, nodes)).toBe('a');
  });

  it('does not link to a node that is gone', () => {
    expect(resolveMessageNodeLink({ nodeId: 'deleted' }, nodes)).toBeNull();
  });

  it('does not link a message without a node, or without a workflow', () => {
    expect(resolveMessageNodeLink({}, nodes)).toBeNull();
    expect(resolveMessageNodeLink({ nodeId: null }, nodes)).toBeNull();
    expect(resolveMessageNodeLink({ nodeId: 'a' }, undefined)).toBeNull();
    expect(resolveMessageNodeLink({ nodeId: 'a' }, null)).toBeNull();
  });

  it('does not link a sub-workflow message: its node id belongs to the child', () => {
    expect(resolveMessageNodeLink({ nodeId: 'a', parentPipelineId: 'p0' }, nodes)).toBeNull();
    expect(resolveMessageNodeLink({ nodeId: 'a', parentPipelineId: null }, nodes)).toBe('a');
  });
});
