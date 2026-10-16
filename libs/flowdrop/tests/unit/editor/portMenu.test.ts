/**
 * Unit Tests - the port menu ("Connect to…" + interface entries) and the
 * "Connect to…" candidates.
 */

import { describe, it, expect, vi } from 'vitest';
import { buildPortMenuEntries, type PortMenuActions } from '../../../src/lib/editor/portMenu.js';
import {
  buildConnectEdge,
  canConnectFrom,
  connectPickerGroups,
  listConnectCandidates
} from '../../../src/lib/editor/connectCandidates.js';
import { PortCompatibilityChecker } from '../../../src/lib/utils/connections.js';
import { DEFAULT_PORT_CONFIG } from '../../../src/lib/config/defaultPortConfig.js';
import { buildHandleId } from '../../../src/lib/utils/handleIds.js';
import type { NodePort, Workflow, WorkflowNode } from '../../../src/lib/types/index.js';

const checker = new PortCompatibilityChecker(DEFAULT_PORT_CONFIG);

function port(id: string, type: 'input' | 'output', dataType = 'string'): NodePort {
  return { id, name: id.toUpperCase(), type, dataType } as NodePort;
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

function wf(nodes: WorkflowNode[], edges: Workflow['edges'] = []): Workflow {
  return { id: 'w', name: 'w', nodes, edges } as Workflow;
}

function actions(): PortMenuActions {
  return { expose: vi.fn(), rename: vi.fn(), remove: vi.fn(), connectTo: vi.fn() };
}

const src = makeNode('src', [], [port('out', 'output', 'string'), port('num', 'output', 'number')]);
const a = makeNode('a', [port('in', 'input', 'string'), port('n', 'input', 'number')], []);
const b = makeNode('b', [port('in', 'input', 'string')], [port('res', 'output', 'string')]);
const out = { nodeId: 'src', direction: 'output', portId: 'out' } as const;

describe('buildPortMenuEntries', () => {
  it('Connect to… comes first, then a separator, then the interface entries', () => {
    const entries = buildPortMenuEntries(wf([src, a]), out, actions());
    expect(entries.map((e) => e.id)).toEqual(['connect-to', 'separator-port', 'interface-expose']);
    expect(entries[0]).toMatchObject({ label: 'Connect to…' });
  });

  it('running Connect to… hands the port to the editor', () => {
    const acts = actions();
    const [connect] = buildPortMenuEntries(wf([src, a]), out, acts);
    if ('separator' in connect) throw new Error('not an entry');
    connect.run({} as never);
    expect(acts.connectTo).toHaveBeenCalledWith(out);
  });

  it('is not offered on a hidden port', () => {
    const hidden = makeNode('h', [], [port('o', 'output')], {
      ports: { outputs: [{ id: 'o', exposed: false }] }
    });
    const target = { nodeId: 'h', direction: 'output', portId: 'o' } as const;
    expect(buildPortMenuEntries(wf([hidden, a]), target, actions())).toEqual([]);
  });

  it('is not offered on a trigger event input', () => {
    const trigger = makeNode('t', [port('event', 'input')], []);
    const target = { nodeId: 't', direction: 'input', portId: 'event' } as const;
    expect(canConnectFrom(wf([trigger, src]), target)).toBe(false);
    expect(
      buildPortMenuEntries(wf([trigger, src]), target, actions()).map((e) => e.id)
    ).not.toContain('connect-to');
  });

  it('an unknown port has no entries', () => {
    expect(
      buildPortMenuEntries(
        wf([src]),
        { nodeId: 'src', direction: 'output', portId: 'zz' },
        actions()
      )
    ).toEqual([]);
  });
});

describe('listConnectCandidates', () => {
  const keys = (list: { nodeId: string; port: NodePort }[]) =>
    list.map((c) => `${c.nodeId}.${c.port.id}`);

  it('from an output: other nodes inputs, compatible first, nothing refused', () => {
    const groups = listConnectCandidates(wf([src, a, b]), checker, out);
    expect(keys(groups.compatible)).toContain('a.in');
    expect(keys(groups.compatible)).toContain('b.in');
    // Every input of another node is offered, whatever its type.
    expect(keys([...groups.compatible, ...groups.other]).sort()).toEqual(['a.in', 'a.n', 'b.in']);
    // Compatibility only orders the list: string into number is the one that is not compatible.
    expect(keys(groups.other).includes('a.n')).toBe(
      !checker.areDataTypesCompatible('string', 'number')
    );
  });

  it('from an input: other nodes outputs', () => {
    const groups = listConnectCandidates(wf([src, a, b]), checker, {
      nodeId: 'a',
      direction: 'input',
      portId: 'in'
    });
    expect(keys([...groups.compatible, ...groups.other]).sort()).toEqual([
      'b.res',
      'src.num',
      'src.out'
    ]);
  });

  it('skips hidden ports and trigger event inputs, and the origin node', () => {
    const hiddenIn = makeNode('h', [port('in', 'input')], [], {
      ports: { inputs: [{ id: 'in', exposed: false }] }
    });
    const trigger = makeNode('t', [port('event', 'input')], []);
    const groups = listConnectCandidates(wf([src, hiddenIn, trigger, a]), checker, out);
    expect(keys([...groups.compatible, ...groups.other]).sort()).toEqual(['a.in', 'a.n']);
  });

  it('an input that already has a wire is a candidate marked wired; an exact pair is connected', () => {
    const w = wf(
      [src, a, b],
      [
        {
          id: 'e1',
          source: 'src',
          target: 'a',
          sourceHandle: buildHandleId('src', 'output', 'out'),
          targetHandle: buildHandleId('a', 'input', 'in')
        },
        {
          id: 'e2',
          source: 'b',
          target: 'b',
          sourceHandle: buildHandleId('b', 'output', 'res'),
          targetHandle: buildHandleId('b', 'input', 'in')
        }
      ]
    );
    const all = Object.values(listConnectCandidates(w, checker, out)).flat();
    const ain = all.find((c) => c.nodeId === 'a' && c.port.id === 'in')!;
    const bin = all.find((c) => c.nodeId === 'b' && c.port.id === 'in')!;
    expect(ain).toMatchObject({ wired: true, connected: true });
    expect(bin).toMatchObject({ wired: true, connected: false });
    expect(all.find((c) => c.port.id === 'n')).toMatchObject({ wired: false, connected: false });
  });

  it('includes dynamic ports and gateway branches', () => {
    const dyn = makeNode('d', [], [], { dynamicInputs: [{ name: 'extra', dataType: 'string' }] });
    const gate = makeNode('g', [], [], { branches: [{ name: 'yes' }] });
    gate.data.metadata = { ...gate.data.metadata, type: 'gateway' } as never;
    const fromInput = listConnectCandidates(wf([a, gate]), checker, {
      nodeId: 'a',
      direction: 'input',
      portId: 'in'
    });
    expect(keys([...fromInput.compatible, ...fromInput.other])).toContain('g.yes');
    const fromOut = listConnectCandidates(wf([src, dyn]), checker, out);
    expect(keys([...fromOut.compatible, ...fromOut.other])).toContain('d.extra');
  });
});

describe('connectPickerGroups and buildConnectEdge', () => {
  it('groups: Compatible then Other types (dimmed), with Wired / Connected badges', () => {
    const w = wf(
      [src, a],
      [
        {
          id: 'e1',
          source: 'src',
          target: 'a',
          sourceHandle: buildHandleId('src', 'output', 'out'),
          targetHandle: buildHandleId('a', 'input', 'in')
        }
      ]
    );
    const groups = connectPickerGroups(listConnectCandidates(w, checker, out));
    expect(groups.map((g) => g.title)).toEqual(['Compatible', 'Other types']);
    const first = groups[0].options.find((o) => o.key === 'a::in')!;
    expect(first.badges?.map((x) => x.label)).toEqual(['Connected', 'Wired']);
    expect(first.dimmed).toBe(false);
    for (const option of groups[1].options) expect(option.dimmed).toBe(true);
  });

  it('the edge always runs from the output side', () => {
    const [c] = listConnectCandidates(wf([src, a]), checker, out).compatible;
    const forward = buildConnectEdge(out, c);
    expect(forward).toMatchObject({
      source: 'src',
      target: 'a',
      sourceHandle: 'src-output-out',
      targetHandle: 'a-input-in'
    });
    expect(forward.id).toBeTruthy();

    const inTarget = { nodeId: 'a', direction: 'input', portId: 'in' } as const;
    const [o] = listConnectCandidates(wf([src, a]), checker, inTarget).compatible;
    expect(buildConnectEdge(inTarget, o)).toMatchObject({
      source: 'src',
      target: 'a',
      sourceHandle: 'src-output-out',
      targetHandle: 'a-input-in'
    });
  });
});
