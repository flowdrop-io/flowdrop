/**
 * Node fingerprints: config and wiring count; position, label and display
 * overrides do not.
 */
import { describe, it, expect } from 'vitest';
import { fingerprintNodes } from '$lib/utils/nodeFingerprint.js';
import type { Workflow } from '$lib/types/index.js';

function workflow(overrides: { node?: Record<string, unknown>; edges?: unknown[] } = {}): Workflow {
  return {
    id: 'wf',
    name: 'WF',
    nodes: [
      {
        id: 'a',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {
          label: 'Alpha',
          config: { prompt: 'hi', temperature: 0.2 },
          metadata: { node_type_id: 'llm', name: 'LLM' },
          ...(overrides.node ?? {})
        }
      },
      {
        id: 'b',
        type: 'default',
        position: { x: 200, y: 0 },
        data: { label: 'Beta', config: {}, metadata: { node_type_id: 'out', name: 'Out' } }
      }
    ],
    edges: overrides.edges ?? []
  } as unknown as Workflow;
}

const printA = (wf: Workflow) => fingerprintNodes(wf).a;

describe('fingerprintNodes', () => {
  it('is stable for an identical workflow, whatever the key order', () => {
    const reordered = workflow({ node: { config: { temperature: 0.2, prompt: 'hi' } } });
    expect(printA(reordered)).toBe(printA(workflow()));
  });

  it('changes when a config value changes', () => {
    const edited = workflow({ node: { config: { prompt: 'hello', temperature: 0.2 } } });
    expect(printA(edited)).not.toBe(printA(workflow()));
  });

  it('ignores a moved node', () => {
    const moved = workflow();
    moved.nodes[0] = { ...moved.nodes[0], position: { x: 500, y: 90 } };
    expect(printA(moved)).toBe(printA(workflow()));
  });

  it('ignores a renamed label and the instance display overrides', () => {
    const renamed = workflow({
      node: {
        label: 'Something else',
        config: {
          prompt: 'hi',
          temperature: 0.2,
          instanceTitle: 'Mine',
          instanceDescription: 'd',
          instanceBadge: 'b'
        }
      }
    });
    expect(printA(renamed)).toBe(printA(workflow()));
  });

  it('ignores extensions.ui but counts other extension data', () => {
    expect(printA(workflow({ node: { extensions: { ui: { style: { opacity: 0.5 } } } } }))).toBe(
      printA(workflow())
    );
    expect(printA(workflow({ node: { extensions: { 'acme:x': { on: true } } } }))).not.toBe(
      printA(workflow())
    );
  });

  it('ignores run bookkeeping on the node data', () => {
    const noisy = workflow({
      node: { executionInfo: { status: 'failed' }, isProcessing: true, error: 'x' }
    });
    expect(printA(noisy)).toBe(printA(workflow()));
  });

  it('changes the target when an incoming edge is added or rewired, not the source', () => {
    const wired = workflow({ edges: [{ id: 'e', source: 'a', target: 'b', sourceHandle: 'out' }] });
    expect(fingerprintNodes(wired).b).not.toBe(fingerprintNodes(workflow()).b);
    expect(fingerprintNodes(wired).a).toBe(fingerprintNodes(workflow()).a);
    const rewired = workflow({ edges: [{ id: 'e', source: 'a', target: 'b', sourceHandle: 'x' }] });
    expect(fingerprintNodes(rewired).b).not.toBe(fingerprintNodes(wired).b);
  });

  it('is empty without a workflow', () => {
    expect(fingerprintNodes(null)).toEqual({});
  });
});
