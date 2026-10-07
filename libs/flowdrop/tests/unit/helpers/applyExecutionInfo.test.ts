/**
 * NodeOperationsHelper.applyExecutionInfo: the pure step the editor uses to
 * paint a run's status onto canvas nodes, both when the info loads and every
 * time flowNodes is rebuilt from the store (a settings change or a workflow
 * edit re-derives the nodes, and the store has no executionInfo of its own).
 */

import { describe, it, expect } from 'vitest';
import { NodeOperationsHelper } from '$lib/helpers/workflowEditorHelper.js';
import type { NodeExecutionInfo } from '$lib/types/index.js';

const running: NodeExecutionInfo = { status: 'running', executionCount: 1, isExecuting: true };
const done: NodeExecutionInfo = { status: 'completed', executionCount: 2, isExecuting: false };

function node(id: string, extra: Record<string, unknown> = {}) {
  return { id, data: { label: id, ...extra } };
}

describe('applyExecutionInfo', () => {
  it('paints each node with its entry and the idle default when absent', () => {
    const out = NodeOperationsHelper.applyExecutionInfo([node('a'), node('b')], { a: running });
    expect(out[0].data.executionInfo).toEqual(running);
    expect(out[1].data.executionInfo).toEqual({
      status: 'idle',
      executionCount: 0,
      isExecuting: false
    });
    expect(out[0].data.label).toBe('a');
  });

  it('does not mutate its input', () => {
    const input = [node('a')];
    NodeOperationsHelper.applyExecutionInfo(input, { a: running });
    expect('executionInfo' in input[0].data).toBe(false);
  });

  it('survives a rebuild: re-applying the stored map to fresh store nodes restores it', () => {
    // The store workflow carries no executionInfo, so a rebuild yields bare nodes.
    const stored = { a: running, b: done };
    const painted = NodeOperationsHelper.applyExecutionInfo([node('a'), node('b')], stored);
    const rebuilt = [node('a'), node('b')];
    expect(rebuilt[0].data).not.toHaveProperty('executionInfo');
    const repainted = NodeOperationsHelper.applyExecutionInfo(rebuilt, stored);
    expect(repainted.map((n) => n.data.executionInfo)).toEqual(
      painted.map((n) => n.data.executionInfo)
    );
  });

  it('with null removes executionInfo (pipeline or workflow change)', () => {
    const painted = NodeOperationsHelper.applyExecutionInfo([node('a')], { a: running });
    const cleared = NodeOperationsHelper.applyExecutionInfo(painted, null);
    expect(cleared[0].data).not.toHaveProperty('executionInfo');
    expect(cleared[0].data.label).toBe('a');
  });

  it('with null returns the same array when nothing was painted', () => {
    const input = [node('a')];
    expect(NodeOperationsHelper.applyExecutionInfo(input, null)).toBe(input);
  });
});
