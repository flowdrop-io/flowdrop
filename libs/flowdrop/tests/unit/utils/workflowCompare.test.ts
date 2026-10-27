import { describe, it, expect } from 'vitest';
import { compareWorkflows } from '$lib/utils/workflowCompare.js';
import type { Workflow } from '$lib/types/index.js';

function wf(over: Partial<Workflow> = {}): Workflow {
  return {
    id: 'w',
    name: 'Flow',
    nodes: [
      {
        id: 'a',
        type: 't',
        position: { x: 0, y: 0 },
        data: { label: 'Summarise', config: { x: 1, y: { b: 2, a: 1 } } }
      },
      { id: 'b', type: 't', position: { x: 10, y: 10 }, data: { label: 'Send', config: {} } }
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'o', targetHandle: 'i' }],
    metadata: { schemaVersion: '1', createdAt: '', updatedAt: '' },
    ...over
  } as unknown as Workflow;
}

describe('compareWorkflows', () => {
  it('reports identical workflows as same', () => {
    const r = compareWorkflows(wf(), wf());
    expect(r.same).toBe(true);
    expect(r.nodesChanged).toEqual([]);
  });

  it('finds added, removed and changed steps', () => {
    const theirs = wf();
    theirs.nodes = [
      { ...theirs.nodes[0], data: { label: 'Summarise', config: { x: 2 } } },
      { id: 'c', type: 't', position: { x: 0, y: 0 }, data: { label: 'New', config: {} } }
    ] as Workflow['nodes'];
    const r = compareWorkflows(wf(), theirs);
    expect(r.nodesOnlyMine).toEqual([{ id: 'b', label: 'Send' }]);
    expect(r.nodesOnlyTheirs).toEqual([{ id: 'c', label: 'New' }]);
    expect(r.nodesChanged).toEqual([{ id: 'a', label: 'Summarise', what: ['settings'] }]);
    expect(r.same).toBe(false);
  });

  it('ignores key order in settings and sub-pixel position jitter', () => {
    const theirs = wf();
    theirs.nodes[0] = {
      ...theirs.nodes[0],
      position: { x: 0.5, y: -0.9 },
      data: { label: 'Summarise', config: { y: { a: 1, b: 2 }, x: 1 } }
    } as Workflow['nodes'][number];
    expect(compareWorkflows(wf(), theirs).same).toBe(true);
  });

  it('reports a move and a rename', () => {
    const theirs = wf();
    theirs.nodes[1] = {
      ...theirs.nodes[1],
      position: { x: 50, y: 10 },
      data: { label: 'Mail', config: {} }
    } as Workflow['nodes'][number];
    const r = compareWorkflows(wf(), theirs);
    expect(r.nodesChanged[0].what).toEqual(['label', 'position']);
  });

  it('counts wires only on one side', () => {
    const theirs = wf({ edges: [] });
    const r = compareWorkflows(wf(), theirs);
    expect(r.edgesOnlyMine).toBe(1);
    expect(r.edgesOnlyTheirs).toBe(0);
  });

  it('flags interface, chat, name and description changes', () => {
    const theirs = wf({
      name: 'Other',
      description: 'd',
      interface: { inputs: [] } as unknown as Workflow['interface'],
      playground: { chat: null } as unknown as Workflow['playground']
    });
    const r = compareWorkflows(wf(), theirs);
    expect(r.interfaceChanged).toBe(true);
    expect(r.chatChanged).toBe(true);
    expect(r.name).toEqual({ mine: 'Flow', theirs: 'Other' });
    expect(r.description).toBeDefined();
  });
});
