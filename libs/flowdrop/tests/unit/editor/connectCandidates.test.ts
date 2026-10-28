/**
 * Unit Tests - "Connect to…" candidates: trigger pins and data ports are
 * listed apart from each other.
 */

import { describe, it, expect } from 'vitest';
import { listConnectCandidates } from '../../../src/lib/editor/connectCandidates.js';
import { PortCompatibilityChecker } from '../../../src/lib/utils/connections.js';
import { DEFAULT_PORT_CONFIG } from '../../../src/lib/config/defaultPortConfig.js';
import type { NodePort, Workflow, WorkflowNode } from '../../../src/lib/types/index.js';

const checker = new PortCompatibilityChecker(DEFAULT_PORT_CONFIG);

function port(id: string, type: 'input' | 'output', dataType: string): NodePort {
  return { id, name: id, type, dataType } as NodePort;
}

function makeNode(id: string, inputs: NodePort[], outputs: NodePort[]): WorkflowNode {
  return {
    id,
    type: 'universalNode',
    position: { x: 0, y: 0 },
    data: { label: id, config: {}, metadata: { inputs, outputs } }
  } as unknown as WorkflowNode;
}

const a = makeNode(
  'a',
  [],
  [port('text', 'output', 'string'), port('trigger', 'output', 'trigger')]
);
const b = makeNode('b', [port('value', 'input', 'mixed'), port('trigger', 'input', 'trigger')], []);
const trig = makeNode('t', [port('event', 'input', 'mixed')], []);
const workflow = { id: 'w', name: 'w', nodes: [a, b, trig], edges: [] } as unknown as Workflow;

function ids(list: { nodeId: string; port: NodePort }[]): string[] {
  return list.map((c) => `${c.nodeId}.${c.port.id}`);
}

describe('listConnectCandidates trigger kind', () => {
  it('a data output lists the data input as compatible and the trigger pin as other', () => {
    const groups = listConnectCandidates(workflow, checker, {
      nodeId: 'a',
      direction: 'output',
      portId: 'text'
    });
    expect(ids(groups.compatible)).toEqual(['b.value']);
    expect(ids(groups.other)).toEqual(['b.trigger']);
  });

  it('a trigger output lists the trigger pin as compatible and the data input as other', () => {
    const groups = listConnectCandidates(workflow, checker, {
      nodeId: 'a',
      direction: 'output',
      portId: 'trigger'
    });
    expect(ids(groups.compatible)).toEqual(['b.trigger']);
    expect(ids(groups.other)).toEqual(['b.value']);
  });

  it('a trigger node event input is never listed', () => {
    const groups = listConnectCandidates(workflow, checker, {
      nodeId: 'a',
      direction: 'output',
      portId: 'text'
    });
    expect(ids([...groups.compatible, ...groups.other])).not.toContain('t.event');
  });
});
