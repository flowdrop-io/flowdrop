/**
 * Hot-edge rule: an edge is hot when its source completed and its target was
 * reached (running, completed, failed, paused or interrupted).
 */
import { describe, it, expect } from 'vitest';
import { isEdgeHot } from '$lib/utils/runEdges.js';
import type { NodeExecutionStatus } from '$lib/types/index.js';

const at = (status: NodeExecutionStatus) => ({ status });

describe('isEdgeHot', () => {
  it.each<NodeExecutionStatus>(['running', 'completed', 'failed', 'paused', 'interrupted'])(
    'is hot from a completed source to a %s target',
    (target) => {
      expect(isEdgeHot(at('completed'), at(target))).toBe(true);
    }
  );

  it.each<NodeExecutionStatus>(['idle', 'pending', 'skipped', 'cancelled'])(
    'is not hot to a %s target (not reached)',
    (target) => {
      expect(isEdgeHot(at('completed'), at(target))).toBe(false);
    }
  );

  it.each<NodeExecutionStatus>([
    'idle',
    'pending',
    'running',
    'failed',
    'cancelled',
    'skipped',
    'paused',
    'interrupted'
  ])('is not hot from a %s source (nothing was handed on)', (source) => {
    expect(isEdgeHot(at(source), at('completed'))).toBe(false);
  });

  it('is not hot when either end has no status', () => {
    expect(isEdgeHot(undefined, at('completed'))).toBe(false);
    expect(isEdgeHot(at('completed'), undefined)).toBe(false);
  });

  it('keeps the untaken gateway branch cold', () => {
    // gateway completed; branch A ran, branch B was skipped
    expect(isEdgeHot(at('completed'), at('completed'))).toBe(true);
    expect(isEdgeHot(at('completed'), at('skipped'))).toBe(false);
  });
});
