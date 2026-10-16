/**
 * Unit Tests - Trigger event inputs (SCH-47, R16, MAN-26, MAN-27)
 */

import { describe, it, expect } from 'vitest';
import {
  isEventInputConnection,
  isReservedInputName,
  isTriggerEventInput,
  isTriggerNode,
  reservedInputs
} from '$lib/utils/reservedPorts.js';
import { PortCompatibilityChecker, validateConnection } from '$lib/utils/connections.js';
import { listBindablePorts } from '$lib/utils/workflowInterface.js';
import { buildHandleId } from '$lib/utils/handleIds.js';
import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
import type { NodeMetadata, NodePort, Workflow, WorkflowNode } from '$lib/types/index.js';

function port(id: string, type: 'input' | 'output', dataType = 'mixed'): NodePort {
  return { id, name: id, type, dataType };
}

function node(
  id: string,
  nodeTypeId: string,
  inputs: NodePort[],
  outputs: NodePort[]
): WorkflowNode {
  const metadata: NodeMetadata = {
    node_type_id: nodeTypeId,
    name: nodeTypeId,
    description: '',
    category: 'inputs',
    version: '1.0.0',
    type: 'default',
    inputs,
    outputs
  };
  return {
    id,
    type: 'universalNode',
    position: { x: 0, y: 0 },
    data: { label: id, config: {}, metadata }
  };
}

const onInsert = node(
  'on_insert',
  'trigger',
  [port('event', 'input', 'json')],
  [port('data', 'output', 'json')]
);
const onUpdate = node(
  'on_update',
  'trigger',
  [port('event', 'input', 'json')],
  [port('data', 'output', 'json')]
);
const logger = node(
  'logger',
  'logger',
  [port('message', 'input', 'string')],
  [port('result', 'output', 'json')]
);
const workflow = {
  id: 'wf',
  name: 'wf',
  nodes: [onInsert, onUpdate, logger],
  edges: []
} as unknown as Workflow;

describe('reserved trigger event inputs', () => {
  it('recognises a trigger node by its declared event input', () => {
    expect(isTriggerNode(onInsert)).toBe(true);
    expect(isTriggerNode(logger)).toBe(false);
    expect(isTriggerEventInput(onInsert, 'event')).toBe(true);
    expect(isTriggerEventInput(onInsert, 'data')).toBe(false);
    expect(isTriggerEventInput(logger, 'event')).toBe(false);
  });

  it('refuses a connection into a trigger event input (R16)', () => {
    const nodes = [onInsert, logger];
    expect(
      isEventInputConnection(
        { target: 'on_insert', targetHandle: buildHandleId('on_insert', 'input', 'event') },
        nodes
      )
    ).toBe(true);
    expect(
      isEventInputConnection(
        { target: 'logger', targetHandle: buildHandleId('logger', 'input', 'message') },
        nodes
      )
    ).toBe(false);
  });

  it('refuses it in validateConnection too', () => {
    const checker = new PortCompatibilityChecker(DEFAULT_PORT_CONFIG);
    const result = validateConnection(
      checker,
      'logger',
      'result',
      'on_insert',
      'event',
      [onInsert, logger],
      [onInsert.data.metadata, logger.data.metadata]
    );
    expect(result.valid).toBe(false);
  });

  it('derives one reserved input per trigger node, never stored (MAN-26)', () => {
    expect(reservedInputs(workflow)).toEqual([
      { name: 'event:on_insert', nodeId: 'on_insert', port: 'event' },
      { name: 'event:on_update', nodeId: 'on_update', port: 'event' }
    ]);
    expect(workflow).not.toHaveProperty('interface');
    expect(isReservedInputName('event:on_insert')).toBe(true);
    expect(isReservedInputName('article')).toBe(false);
  });

  it('never offers a trigger event input for the interface (MAN-27)', () => {
    const offered = listBindablePorts(workflow, 'input').map((p) => `${p.nodeId}.${p.port.id}`);
    expect(offered).toContain('logger.message');
    expect(offered).not.toContain('on_insert.event');
    expect(offered).not.toContain('on_update.event');
  });
});
