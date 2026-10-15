/**
 * Unit Tests - bulk port exposure (hide unconnected / show hidden) and the
 * minimal `PortsConfig` writer it shares with the Ports form.
 */

import { describe, it, expect } from 'vitest';
import {
  applyPortExposure,
  countPortWires,
  hideBlock,
  hideCandidates,
  showCandidates
} from '../../../src/lib/utils/portExposure.js';
import { buildPortsConfig } from '../../../src/lib/utils/portUtils.js';
import { buildHandleId } from '../../../src/lib/utils/handleIds.js';
import type { NodePort, Workflow, WorkflowNode } from '../../../src/lib/types/index.js';

function port(id: string, type: 'input' | 'output', extra: Partial<NodePort> = {}): NodePort {
  return { id, name: id, type, dataType: 'string', ...extra } as NodePort;
}

function makeNode(
  id: string,
  inputs: NodePort[],
  outputs: NodePort[],
  config: Record<string, unknown> = {}
): WorkflowNode {
  return {
    id,
    type: 'universalNode',
    position: { x: 0, y: 0 },
    data: { label: id, config, metadata: { inputs, outputs } }
  } as unknown as WorkflowNode;
}

function wf(nodes: WorkflowNode[], edges: Workflow['edges'] = [], extra = {}): Workflow {
  return { id: 'w', name: 'w', nodes, edges, ...extra } as Workflow;
}

const edge = (source: string, sp: string, target: string, tp: string) => ({
  id: `${source}-${target}`,
  source,
  target,
  sourceHandle: buildHandleId(source, 'output', sp),
  targetHandle: buildHandleId(target, 'input', tp)
});

const ids = (c: { direction: string; port: NodePort }[]) =>
  c.map((x) => `${x.direction}:${x.port.id}`);

describe('hideCandidates', () => {
  it('lists exposed data ports with no edge, both directions', () => {
    const n = makeNode('n', [port('a', 'input'), port('b', 'input')], [port('o', 'output')]);
    const other = makeNode('m', [port('x', 'input')], []);
    const w = wf([n, other], [edge('n', 'o', 'm', 'x')]);
    expect(ids(hideCandidates(n, w))).toEqual(['inputs:a', 'inputs:b']);
  });

  it('an edge on the handle (either side) removes the port', () => {
    const n = makeNode('n', [port('a', 'input'), port('b', 'input')], [port('o', 'output')]);
    const src = makeNode('s', [], [port('p', 'output')]);
    const w = wf([n, src], [edge('s', 'p', 'n', 'a')]);
    expect(ids(hideCandidates(n, w))).toEqual(['inputs:b', 'outputs:o']);
  });

  it('skips ports that are already hidden', () => {
    const n = makeNode(
      'n',
      [port('a', 'input'), port('b', 'input', { exposedByDefault: false })],
      [],
      {
        ports: {
          inputs: [
            { id: 'a', exposed: false },
            { id: 'b', exposed: true }
          ]
        }
      }
    );
    expect(ids(hideCandidates(n, wf([n])))).toEqual(['inputs:b']);
  });

  it('keeps a required input with no config value, hides one that has a value', () => {
    const n = makeNode(
      'n',
      [
        port('empty', 'input', { required: true }),
        port('blank', 'input', { required: true }),
        port('set', 'input', { required: true })
      ],
      [],
      { blank: '', set: 'hello' }
    );
    expect(ids(hideCandidates(n, wf([n])))).toEqual(['inputs:set']);
  });

  it('excludes reserved ports: error output, trigger and tool data types', () => {
    const n = makeNode(
      'n',
      [port('t', 'input', { dataType: 'trigger' }), port('tl', 'input', { dataType: 'tool' })],
      [port('error', 'output'), port('tool', 'output', { dataType: 'tool' }), port('ok', 'output')]
    );
    expect(ids(hideCandidates(n, wf([n])))).toEqual(['outputs:ok']);
  });

  it('excludes the loop-back port', () => {
    const n = makeNode('n', [port('loop_back', 'input'), port('a', 'input')], []);
    expect(ids(hideCandidates(n, wf([n])))).toEqual(['inputs:a']);
  });

  it('excludes a trigger event input', () => {
    const n = makeNode('n', [port('event', 'input'), port('a', 'input')], []);
    expect(ids(hideCandidates(n, wf([n])))).toEqual(['inputs:a']);
  });

  it('excludes ports bound to a workflow interface entry', () => {
    const n = makeNode('n', [port('a', 'input'), port('b', 'input')], [port('o', 'output')]);
    const w = wf([n], [], {
      interface: {
        inputs: [{ id: 'in', bindings: [{ nodeId: 'n', portId: 'a' }] }],
        outputs: [{ id: 'out', bindings: [{ nodeId: 'n', portId: 'o' }] }]
      }
    });
    expect(ids(hideCandidates(n, w))).toEqual(['inputs:b']);
  });

  it('excludes a port the node type locks', () => {
    const n = makeNode('n', [port('a', 'input', { exposureLocked: true }), port('b', 'input')], []);
    expect(ids(hideCandidates(n, wf([n])))).toEqual(['inputs:b']);
  });

  it('covers dynamic ports but not gateway branches', () => {
    const n = makeNode('n', [], [], {
      dynamicInputs: [{ name: 'dyn', label: 'Dyn', dataType: 'string' }],
      branches: [{ name: 'yes' }]
    });
    expect(ids(hideCandidates(n, wf([n])))).toEqual(['inputs:dyn']);
  });
});

describe('hideBlock', () => {
  const n = makeNode(
    'n',
    [port('a', 'input'), port('lock', 'input', { exposureLocked: true })],
    [port('o', 'output')]
  );
  const src = makeNode('s', [], [port('p', 'output')]);
  const published = {
    interface: {
      inputs: [
        { id: 'in', bindings: [{ nodeId: 'n', portId: 'a' }] },
        { id: 'in2', bindings: [{ nodeId: 'n', portId: 'lock' }] }
      ],
      outputs: []
    }
  };
  const blockOf = (w: Workflow, direction: 'inputs' | 'outputs', id: string) => {
    const p = [...(n.data.metadata?.inputs ?? []), ...(n.data.metadata?.outputs ?? [])].find(
      (x) => x.id === id
    ) as NodePort;
    return hideBlock(n, w, direction, p, countPortWires(n, w));
  };

  it('is null for a free port', () => {
    expect(blockOf(wf([n, src]), 'inputs', 'a')).toBeNull();
  });

  it('reports a port published on the workflow interface', () => {
    expect(blockOf(wf([n, src], [], published), 'inputs', 'a')).toEqual({ kind: 'published' });
  });

  it('prefers wired over published, and locked over both', () => {
    const w = wf([n, src], [edge('s', 'p', 'n', 'a'), edge('s', 'p', 'n', 'lock')], published);
    expect(blockOf(w, 'inputs', 'a')).toEqual({ kind: 'wired', count: 1 });
    expect(blockOf(w, 'inputs', 'lock')).toEqual({ kind: 'locked' });
  });

  it('counts an edge that names the bare port id, per direction', () => {
    const bare = { id: 'e', source: 's', target: 'n', sourceHandle: 'p', targetHandle: 'a' };
    const w = wf([n, src], [bare as Workflow['edges'][number]]);
    expect(blockOf(w, 'inputs', 'a')).toEqual({ kind: 'wired', count: 1 });
    expect(blockOf(w, 'outputs', 'o')).toBeNull();
  });

  it('counts every wire on a port', () => {
    const w = wf([n, src], [edge('s', 'p', 'n', 'a'), { ...edge('s', 'p', 'n', 'a'), id: 'e2' }]);
    expect(blockOf(w, 'inputs', 'a')).toEqual({ kind: 'wired', count: 2 });
  });
});

describe('showCandidates', () => {
  it('lists hidden ports in both directions', () => {
    const n = makeNode(
      'n',
      [port('a', 'input'), port('b', 'input')],
      [port('o', 'output', { exposedByDefault: false })],
      { ports: { inputs: [{ id: 'b', exposed: false }] } }
    );
    expect(ids(showCandidates(n))).toEqual(['inputs:b', 'outputs:o']);
  });

  it('leaves hidden reserved and control-flow ports alone, so hide takes back what show shows', () => {
    const hidden = { exposedByDefault: false };
    const n = makeNode(
      'n',
      [
        port('trigger', 'input', { dataType: 'trigger', ...hidden }),
        port('loop_back', 'input', hidden),
        port('p', 'input', hidden)
      ],
      [
        port('error', 'output', hidden),
        port('tool', 'output', { dataType: 'tool', ...hidden }),
        port('o', 'output', hidden)
      ]
    );
    expect(ids(showCandidates(n))).toEqual(['inputs:p', 'outputs:o']);
    const shown = makeNode('n', n.data.metadata!.inputs!, n.data.metadata!.outputs!, {
      ports: applyPortExposure(n, wf([n]), 'show')
    });
    expect(applyPortExposure(shown, wf([shown]), 'hide')).toBeUndefined();
  });

  it('is empty when everything is shown', () => {
    expect(showCandidates(makeNode('n', [port('a', 'input')], []))).toEqual([]);
  });
});

describe('applyPortExposure', () => {
  it('hide writes only the exposed:false overrides, in the default order', () => {
    const n = makeNode('n', [port('a', 'input'), port('b', 'input')], [port('o', 'output')]);
    const w = wf([n]);
    expect(applyPortExposure(n, w, 'hide')).toEqual({
      inputs: [
        { id: 'a', exposed: false },
        { id: 'b', exposed: false }
      ],
      outputs: [{ id: 'o', exposed: false }]
    });
  });

  it('keeps the stored order and unrelated overrides', () => {
    const n = makeNode(
      'n',
      [port('a', 'input'), port('b', 'input'), port('c', 'input')],
      [port('o', 'output')],
      {
        ports: { inputs: [{ id: 'c' }, { id: 'a', exposed: false }, { id: 'b' }] }
      }
    );
    const src = makeNode('s', [], [port('p', 'output')]);
    const w = wf([n, src], [edge('s', 'p', 'n', 'c'), edge('n', 'o', 's', 'zz')]);
    // c and o are wired; a is already hidden; b is the only candidate.
    expect(applyPortExposure(n, w, 'hide')).toEqual({
      inputs: [{ id: 'c' }, { id: 'a', exposed: false }, { id: 'b', exposed: false }]
    });
  });

  it('show drops the exposed flags it resets, and collapses to undefined', () => {
    const n = makeNode('n', [port('a', 'input'), port('b', 'input')], [], {
      ports: { inputs: [{ id: 'a', exposed: false }, { id: 'b' }] }
    });
    expect(applyPortExposure(n, wf([n]), 'show')).toBeUndefined();
  });

  it('show keeps a reorder', () => {
    const n = makeNode('n', [port('a', 'input'), port('b', 'input')], [], {
      ports: { inputs: [{ id: 'b' }, { id: 'a', exposed: false }] }
    });
    expect(applyPortExposure(n, wf([n]), 'show')).toEqual({
      inputs: [{ id: 'b' }, { id: 'a' }]
    });
  });

  it('show sets exposed:true on a port hidden by default', () => {
    const n = makeNode('n', [port('a', 'input', { exposedByDefault: false })], []);
    expect(applyPortExposure(n, wf([n]), 'show')).toEqual({
      inputs: [{ id: 'a', exposed: true }]
    });
  });

  it('leaves the untouched direction as stored', () => {
    const n = makeNode('n', [port('a', 'input')], [port('o', 'output')], {
      ports: { outputs: [{ id: 'o', exposed: false }] }
    });
    expect(applyPortExposure(n, wf([n]), 'hide')).toEqual({
      inputs: [{ id: 'a', exposed: false }],
      outputs: [{ id: 'o', exposed: false }]
    });
  });
});

describe('buildPortsConfig', () => {
  const inputs = [port('a', 'input'), port('b', 'input')];

  it('collapses to undefined for default order and exposure', () => {
    expect(buildPortsConfig(undefined, 'inputs', inputs, inputs, () => true)).toBeUndefined();
  });

  it('drops an empty other direction', () => {
    expect(buildPortsConfig({ outputs: [] }, 'inputs', inputs, inputs, () => true)).toBeUndefined();
  });

  it('stores a reorder without exposure flags', () => {
    expect(
      buildPortsConfig(undefined, 'inputs', [inputs[1], inputs[0]], inputs, () => true)
    ).toEqual({ inputs: [{ id: 'b' }, { id: 'a' }] });
  });

  it('drops the direction when it returns to the default', () => {
    expect(
      buildPortsConfig(
        { inputs: [{ id: 'a', exposed: false }, { id: 'b' }] },
        'inputs',
        inputs,
        inputs,
        () => true
      )
    ).toBeUndefined();
  });

  it('never stores an exposure flag for a locked port', () => {
    const locked = [port('a', 'input', { exposureLocked: true, exposedByDefault: false })];
    expect(buildPortsConfig(undefined, 'inputs', locked, locked, () => true)).toBeUndefined();
  });
});
