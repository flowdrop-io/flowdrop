/**
 * Unit Tests - Interface tags
 *
 * The pure parts behind the canvas tags: which tags a workflow has, id
 * shortening and uniqueness, and the expose / rename / remove edits.
 */

import { describe, it, expect } from 'vitest';
import {
  entryAtPort,
  estimateInterfaceTagWidth,
  exposePortAsEntry,
  inputHasIncomingEdge,
  interfaceTagModels,
  interfaceTagReserve,
  interfaceTagTypeText,
  removeInterfaceEntry,
  renameInterfaceEntry,
  truncateInterfaceId,
  validateInterfaceId
} from '$lib/utils/interfaceTags.js';
import { buildPortInterfaceEntries } from '$lib/editor/interfaceMenu.js';
import { computeBeautifyLayout } from '$lib/adapters/agentspec/autoLayout.js';
import type { NodeMetadata, Workflow, WorkflowNode } from '$lib/types/index.js';

function meta(inputs: Array<[string, string]>, outputs: Array<[string, string]>): NodeMetadata {
  return {
    node_type_id: 't',
    name: 'T',
    description: '',
    category: 'processing',
    version: '1.0.0',
    type: 'default',
    inputs: inputs.map(([id, dataType]) => ({ id, name: id, type: 'input', dataType })),
    outputs: outputs.map(([id, dataType]) => ({ id, name: id, type: 'output', dataType }))
  };
}

function node(id: string, metadata: NodeMetadata): WorkflowNode {
  return {
    id,
    type: 'universalNode',
    position: { x: 0, y: 0 },
    data: { label: id, config: {}, metadata }
  };
}

function workflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'w',
    name: 'W',
    nodes: [
      node(
        'calc',
        meta(
          [
            ['a', 'number'],
            ['b', 'number'],
            ['go', 'trigger']
          ],
          [['result', 'number']]
        )
      )
    ],
    edges: [],
    metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' },
    ...overrides
  } as Workflow;
}

const withInterface = (): Workflow =>
  workflow({
    interface: {
      inputs: [
        { id: 'amount', dataType: 'number', bindings: [{ nodeId: 'calc', portId: 'a' }] },
        { id: 'items', dataType: 'array', bindings: [{ nodeId: 'calc', portId: 'b' }] }
      ]
    }
  });

describe('truncateInterfaceId', () => {
  it('leaves an id of up to 16 characters alone', () => {
    expect(truncateInterfaceId('a'.repeat(16))).toBe('a'.repeat(16));
  });

  it('cuts a longer id to 16 characters ending in an ellipsis', () => {
    const shown = truncateInterfaceId('a'.repeat(30));
    expect(Array.from(shown)).toHaveLength(16);
    expect(shown.endsWith('…')).toBe(true);
  });

  it('never splits a surrogate pair', () => {
    expect(truncateInterfaceId('😀'.repeat(20), 5)).toBe('😀😀😀😀…');
  });
});

describe('validateInterfaceId', () => {
  const wf = withInterface();

  it('rejects an empty or blank id', () => {
    expect(validateInterfaceId('  ', 'input', wf.interface)).toBe('empty');
  });

  it('rejects an id already used in the same direction', () => {
    expect(validateInterfaceId('amount', 'input', wf.interface)).toBe('duplicate');
  });

  it('allows the same id on the other direction', () => {
    expect(validateInterfaceId('amount', 'output', wf.interface)).toBeNull();
  });

  it('allows an entry to keep its own id', () => {
    expect(validateInterfaceId('amount', 'input', wf.interface, 'amount')).toBeNull();
  });
});

describe('interfaceTagModels', () => {
  it('has a tag per ok entry and flags a type mismatch', () => {
    const tags = interfaceTagModels(withInterface());
    expect(tags.map((t) => t.entry.id)).toEqual(['amount', 'items']);
    expect(tags[0].mismatch).toBeUndefined();
    expect(tags[1].mismatch).toEqual({ declared: 'array', port: 'number' });
    expect(tags[1].handleId).toBe('calc-input-b');
  });

  it('keeps tag keys unique when two entries share one port', () => {
    const wf = workflow({
      interface: {
        inputs: [
          { id: 'one', dataType: 'number', bindings: [{ nodeId: 'calc', portId: 'a' }] },
          { id: 'two', dataType: 'number', bindings: [{ nodeId: 'calc', portId: 'a' }] }
        ]
      }
    });
    const keys = interfaceTagModels(wf).map((t) => t.key);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
  });

  it('has none for an unbound or dangling entry', () => {
    const wf = workflow({
      interface: {
        inputs: [
          { id: 'free', dataType: 'string', bindings: [] },
          { id: 'gone', dataType: 'string', bindings: [{ nodeId: 'nope', portId: 'x' }] }
        ]
      }
    });
    expect(interfaceTagModels(wf)).toEqual([]);
  });

  it('reads "Array ≠ Number" for a mismatch and the type otherwise', () => {
    const [ok, bad] = interfaceTagModels(withInterface());
    const name = (t: string) => t[0].toUpperCase() + t.slice(1);
    expect(interfaceTagTypeText(ok, name)).toBe('Number');
    expect(interfaceTagTypeText(bad, name)).toBe('Array ≠ Number');
  });
});

describe('expose, rename, remove', () => {
  it('exposes a port as a complete entry, at the end of its direction', () => {
    const result = exposePortAsEntry(
      withInterface(),
      { nodeId: 'calc', direction: 'output', portId: 'result' },
      ' total '
    );
    expect(result?.interface.outputs).toEqual([
      expect.objectContaining({
        id: 'total',
        dataType: 'number',
        bindings: [{ nodeId: 'calc', portId: 'result' }]
      })
    ]);
    expect(result?.interface.inputs).toHaveLength(2);
  });

  it('refuses a duplicate id, an empty id and a control-flow port', () => {
    const wf = withInterface();
    const a = { nodeId: 'calc', direction: 'input' as const };
    expect(exposePortAsEntry(wf, { ...a, portId: 'a' }, 'amount')).toBeNull();
    expect(exposePortAsEntry(wf, { ...a, portId: 'a' }, '')).toBeNull();
    expect(exposePortAsEntry(wf, { ...a, portId: 'go' }, 'go')).toBeNull();
  });

  it('renames an entry and reports an input rename for the chat binding', () => {
    const result = renameInterfaceEntry(withInterface(), 'input', 'amount', 'sum');
    expect(result?.interface.inputs?.map((e) => e.id)).toEqual(['sum', 'items']);
    expect(result?.edit).toEqual({ kind: 'rename', id: 'amount', to: 'sum' });
    expect(renameInterfaceEntry(withInterface(), 'input', 'amount', 'items')).toBeNull();
    expect(
      renameInterfaceEntry(withInterface(), 'input', 'amount', 'amount')?.edit
    ).toBeUndefined();
  });

  it('reports no input edit for an output', () => {
    const wf = workflow({
      interface: {
        outputs: [{ id: 'r', dataType: 'number', bindings: [{ nodeId: 'calc', portId: 'result' }] }]
      }
    });
    expect(renameInterfaceEntry(wf, 'output', 'r', 's')?.edit).toBeUndefined();
    expect(removeInterfaceEntry(wf, 'output', 'r')?.edit).toBeUndefined();
  });

  it('removes an entry; emptying the interface keeps an object, not undefined', () => {
    const wf = workflow({
      interface: {
        outputs: [{ id: 'r', dataType: 'number', bindings: [{ nodeId: 'calc', portId: 'result' }] }]
      }
    });
    const result = removeInterfaceEntry(wf, 'output', 'r');
    expect(result?.interface).toEqual({ inputs: undefined, outputs: undefined });
    expect(removeInterfaceEntry(wf, 'output', 'missing')).toBeNull();
    expect(removeInterfaceEntry(withInterface(), 'input', 'amount')?.edit).toEqual({
      kind: 'remove',
      id: 'amount'
    });
  });
});

describe('port helpers', () => {
  it('finds the entry published at a port, by direction', () => {
    const wf = withInterface();
    expect(entryAtPort(wf, 'calc', 'input', 'a')?.id).toBe('amount');
    expect(entryAtPort(wf, 'calc', 'output', 'a')).toBeUndefined();
  });

  it('sees an incoming edge on an input', () => {
    const wf = workflow({
      edges: [
        {
          id: 'e',
          source: 'x',
          target: 'calc',
          sourceHandle: 'x-output-v',
          targetHandle: 'calc-input-a'
        }
      ]
    });
    expect(inputHasIncomingEdge(wf, 'calc', 'a')).toBe(true);
    expect(inputHasIncomingEdge(wf, 'calc', 'b')).toBe(false);
  });
});

describe('port menu entries', () => {
  const actions = { expose: () => {}, rename: () => {}, remove: () => {} };

  it('offers Expose on an unpublished port, by direction', () => {
    const wf = withInterface();
    const out = buildPortInterfaceEntries(
      wf,
      { nodeId: 'calc', direction: 'output', portId: 'result' },
      actions
    );
    expect(out.map((e) => ('label' in e ? e.label : ''))).toEqual(['Expose as workflow output…']);
  });

  it('offers Rename and Remove on a published port', () => {
    const entries = buildPortInterfaceEntries(
      withInterface(),
      { nodeId: 'calc', direction: 'input', portId: 'a' },
      actions
    );
    expect(entries.map((e) => e.id)).toEqual(['interface-rename', 'interface-remove']);
  });

  it('offers nothing on a control-flow port', () => {
    expect(
      buildPortInterfaceEntries(
        withInterface(),
        { nodeId: 'calc', direction: 'input', portId: 'go' },
        actions
      )
    ).toEqual([]);
  });

  it('disables Expose on an input that already has an incoming edge', () => {
    const wf = workflow({
      edges: [
        {
          id: 'e',
          source: 'x',
          target: 'calc',
          sourceHandle: 'x-output-v',
          targetHandle: 'calc-input-a'
        }
      ]
    });
    const [entry] = buildPortInterfaceEntries(
      wf,
      { nodeId: 'calc', direction: 'input', portId: 'a' },
      actions
    );
    expect('disabled' in entry && entry.disabled).toBe(true);
  });
});

describe('layout room for tags', () => {
  it('reserves left for input tags and right for output tags', () => {
    const wf = withInterface();
    const reserve = interfaceTagReserve(wf);
    expect(reserve.get('calc')?.left).toBeGreaterThan(
      estimateInterfaceTagWidth('items', 'array ≠ number')
    );
    expect(reserve.get('calc')?.right).toBe(0);
  });

  it('beautify opens the gap between columns to fit the tags', () => {
    const positions = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 400, y: 0 }]
    ]);
    const dims = new Map([
      ['a', { width: 100, height: 50 }],
      ['b', { width: 100, height: 50 }]
    ]);
    const plain = computeBeautifyLayout(positions, {}, dims);
    const reserve = new Map([
      ['a', { left: 0, right: 150 }],
      ['b', { left: 200, right: 0 }]
    ]);
    const roomy = computeBeautifyLayout(positions, {}, dims, reserve);
    expect(plain.get('b')!.x - plain.get('a')!.x).toBe(220);
    expect(roomy.get('b')!.x - roomy.get('a')!.x).toBe(100 + 150 + 200 + 40);
  });
});
