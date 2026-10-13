/**
 * Unit Test — `layout node inspect` / `layout node beautify`
 *
 * The tangled example graph of the node layout design, as a workflow, run through the parser,
 * the executor and (for undo) a real store. Geometry comes from `context.measureNode`, the way
 * the canvas supplies it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCommand } from '$lib/commands/parser.js';
import { executeCommand } from '$lib/commands/executor.js';
import { createStoreCommandContext } from '$lib/commands/storeIntegration.svelte.js';
import { buildTypeMap } from '$lib/commands/types.js';
import type { Command, CommandContext, CommandDispatch } from '$lib/commands/types.js';
import {
  createFlowDropInstance,
  type FlowDropInstance
} from '$lib/stores/instanceContainer.svelte.js';
import type { NodePort, Workflow, WorkflowEdge, WorkflowNode } from '$lib/types/index.js';

const port = (id: string, type: 'input' | 'output'): NodePort => ({
  id,
  name: id,
  type,
  dataType: 'string'
});

function node(
  id: string,
  x: number,
  y: number,
  inputs: string[],
  outputs: string[],
  type = 'default'
): WorkflowNode {
  return {
    id,
    type: 'universalNode',
    position: { x, y },
    data: {
      label: id,
      config: {},
      metadata: {
        id,
        name: id,
        type,
        inputs: inputs.map((p) => port(p, 'input')),
        outputs: outputs.map((p) => port(p, 'output'))
      } as never
    }
  } as WorkflowNode;
}

const edge = (s: string, sp: string, t: string, tp: string): WorkflowEdge =>
  ({
    id: `${s}.${sp}>${t}.${tp}`,
    source: s,
    target: t,
    sourceHandle: `${s}-output-${sp}`,
    targetHandle: `${t}-input-${tp}`
  }) as WorkflowEdge;

/** The design's "tangled" graph: cards 240 wide, ports from y 80 at a pitch of 40. */
function tangled(): Workflow {
  return {
    id: 'w',
    name: 'tangled',
    nodes: [
      node('form', 0, 100, [], ['email', 'message']),
      node('classify', 360, 100, ['text'], ['label', 'confidence']),
      node('lookup', 360, 200, ['email'], ['contact']),
      node('compose', 720, 160, ['contact', 'label'], ['reply']),
      node('loop', 1080, 180, ['items', 'loop_back'], ['item', 'done']),
      node('send', 1440, 300, ['to'], ['sent']),
      node('cap1', 720, 100, [], [], 'caption')
    ],
    edges: [
      edge('form', 'message', 'classify', 'text'),
      edge('form', 'email', 'lookup', 'email'),
      edge('lookup', 'contact', 'compose', 'contact'),
      edge('classify', 'label', 'compose', 'label'),
      edge('compose', 'reply', 'loop', 'items'),
      edge('loop', 'item', 'send', 'to'),
      edge('send', 'sent', 'loop', 'loop_back')
    ]
  } as Workflow;
}

function demoGeometry(workflow: Workflow) {
  return (id: string) => {
    const n = workflow.nodes.find((x) => x.id === id);
    if (!n || n.data.metadata.type === 'caption') return undefined;
    const ins = n.data.metadata.inputs;
    const outs = n.data.metadata.outputs;
    const rows = Math.max(ins.length, outs.length, 1);
    return {
      width: 240,
      height: 80 + (rows - 1) * 40 + 40,
      inputs: ins.map((p, i) => ({ portId: p.id, dx: 0, dy: 80 + i * 40 })),
      outputs: outs.map((p, i) => ({ portId: p.id, dx: 240, dy: 80 + i * 40 }))
    };
  };
}

function parse(input: string): Command {
  const parsed = parseCommand(input);
  if (!parsed.ok) throw new Error(`Parse failed: ${parsed.error}`);
  return parsed.command;
}

describe('parser: layout node', () => {
  it('layout node inspect <id>', () => {
    expect(parse('layout node inspect compose')).toEqual({
      type: 'inspect_node_layout',
      nodeId: 'compose'
    });
  });

  it('layout node beautify <id> defaults to no strategy and no dry run', () => {
    expect(parse('layout node beautify compose.1')).toEqual({
      type: 'beautify_node',
      nodeId: 'compose.1'
    });
  });

  it.each(['column', 'ports', 'align', 'clear', 'all'])('accepts the %s strategy', (strategy) => {
    expect(parse(`layout node beautify compose ${strategy}`)).toEqual({
      type: 'beautify_node',
      nodeId: 'compose',
      strategy
    });
  });

  it('accepts --dry-run with and without a strategy', () => {
    expect(parse('layout node beautify lookup clear --dry-run')).toEqual({
      type: 'beautify_node',
      nodeId: 'lookup',
      strategy: 'clear',
      dryRun: true
    });
    expect(parse('layout node beautify lookup --dry-run')).toEqual({
      type: 'beautify_node',
      nodeId: 'lookup',
      dryRun: true
    });
  });

  it('is case-insensitive in the verbs and the strategy, not the id', () => {
    expect(parse('LAYOUT NODE BEAUTIFY Compose PORTS')).toEqual({
      type: 'beautify_node',
      nodeId: 'Compose',
      strategy: 'ports'
    });
  });

  it.each([
    'layout node beautify compose sideways',
    'layout node beautify',
    'layout node inspect',
    'layout node inspect a b',
    'layout node beautify compose ports --dry',
    'layout node tidy compose'
  ])('rejects "%s" as invalid syntax', (input) => {
    const parsed = parseCommand(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain("Invalid syntax for 'layout'");
  });

  it('accepts --gap-x and --gap-y in any order, with a strategy and --dry-run', () => {
    expect(parse('layout node inspect compose --gap-y 80')).toEqual({
      type: 'inspect_node_layout',
      nodeId: 'compose',
      gapY: 80
    });
    expect(parse('layout node inspect compose --gap-y 80 --gap-x 160')).toEqual({
      type: 'inspect_node_layout',
      nodeId: 'compose',
      gapX: 160,
      gapY: 80
    });
    expect(parse('layout node beautify lookup clear --gap-x 160 --dry-run --gap-y 0')).toEqual({
      type: 'beautify_node',
      nodeId: 'lookup',
      strategy: 'clear',
      dryRun: true,
      gapX: 160,
      gapY: 0
    });
    expect(parse('layout node beautify lookup --dry-run --gap-y 60')).toEqual({
      type: 'beautify_node',
      nodeId: 'lookup',
      dryRun: true,
      gapY: 60
    });
  });

  it.each([
    'layout node inspect compose --gap-x',
    'layout node inspect compose --gap-x abc',
    'layout node inspect compose --gap-x -20',
    'layout node inspect compose --gap-x 2.5',
    'layout node inspect compose --gap 40',
    'layout node inspect compose --dry-run',
    'layout node beautify compose --gap-y',
    'layout node beautify compose --gap-z 40',
    'layout node beautify compose --gap-y 40 ports'
  ])('rejects "%s" as invalid syntax', (input) => {
    const parsed = parseCommand(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain("Invalid syntax for 'layout'");
  });

  it('layout beautify (the sweep) takes --dry-run and the gaps in any order', () => {
    expect(parse('layout beautify')).toEqual({ type: 'beautify_layout' });
    expect(parse('layout beautify --dry-run')).toEqual({ type: 'beautify_layout', dryRun: true });
    expect(parse('layout beautify --gap-y 60 --dry-run --gap-x 160')).toEqual({
      type: 'beautify_layout',
      dryRun: true,
      gapX: 160,
      gapY: 60
    });
  });

  it('still takes --sweep, which changes nothing', () => {
    expect(parse('layout beautify')).toEqual({ type: 'beautify_layout' });
    expect(parse('LAYOUT BEAUTIFY --SWEEP --DRY-RUN')).toEqual({
      type: 'beautify_layout',
      dryRun: true
    });
  });

  it.each([
    'layout beautify --gap-x',
    'layout beautify --gap-z 40',
    'layout beautify now',
    'layout beautify --spacing'
  ])('rejects "%s" as invalid syntax', (input) => {
    expect(parseCommand(input).ok).toBe(false);
  });

  it('leaves layout auto alone', () => {
    expect(parse('layout auto')).toEqual({ type: 'auto_layout' });
  });
});

describe('executor: layout node', () => {
  let workflow: Workflow;
  let dispatch: CommandDispatch;
  let context: CommandContext;

  beforeEach(() => {
    workflow = tangled();
    dispatch = {
      addNode: vi.fn(),
      removeNode: vi.fn(),
      updateNode: vi.fn(),
      addEdge: vi.fn(),
      removeEdge: vi.fn(),
      batchUpdate: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      cancelTransaction: vi.fn()
    };
    context = {
      getWorkflow: () => workflow,
      nodeTypes: [],
      typeMap: buildTypeMap([]),
      dispatch,
      measureNode: demoGeometry(workflow),
      visualType: (n) => n.data.metadata.type
    };
  });

  describe('inspect', () => {
    it('prints the node header, its wires and the conflict line', () => {
      const result = executeCommand(parse('layout node inspect compose'), context);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const lines = result.message.split('\n');
      expect(lines[0]).toBe('compose  y=160  inputs: contact, label  outputs: reply');
      expect(lines.some((l) => l.includes('in  contact ← lookup.contact'))).toBe(true);
      expect(lines.some((l) => l.includes('in  label') && l.includes('classify.label'))).toBe(true);
      expect(lines.some((l) => l.includes('out reply   → loop.items'))).toBe(true);
      expect(lines[lines.length - 1]).toMatch(/^ {2}overlaps|^ {2}overlap with/);
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('works on an annotation', () => {
      const result = executeCommand(parse('layout node inspect cap1'), context);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.message).toContain('caption');
    });

    it('works without a canvas measurement (fallback geometry)', () => {
      const bare: CommandContext = { ...context, measureNode: undefined, visualType: undefined };
      const result = executeCommand(parse('layout node inspect compose'), bare);
      expect(result.ok).toBe(true);
    });

    it('an unknown node is NODE_NOT_FOUND and lists the nodes', () => {
      const result = executeCommand(parse('layout node inspect nope'), context);
      expect(result).toMatchObject({ ok: false, code: 'NODE_NOT_FOUND' });
      if (!result.ok) expect(result.error).toContain('compose');
    });

    it('no workflow is NO_WORKFLOW', () => {
      const result = executeCommand(parse('layout node inspect compose'), {
        ...context,
        getWorkflow: () => null
      });
      expect(result).toMatchObject({ ok: false, code: 'NO_WORKFLOW' });
    });

    it('shows short ids for namespaced nodes', () => {
      workflow = {
        ...workflow,
        nodes: workflow.nodes.map((n) => ({
          ...n,
          id: n.id === 'compose' ? 'ns.compose.1' : n.id
        })),
        edges: workflow.edges.map((e) => ({
          ...e,
          source: e.source === 'compose' ? 'ns.compose.1' : e.source,
          target: e.target === 'compose' ? 'ns.compose.1' : e.target,
          sourceHandle: e.sourceHandle?.replace('compose-', 'ns.compose.1-'),
          targetHandle: e.targetHandle?.replace('compose-', 'ns.compose.1-')
        }))
      };
      context.measureNode = demoGeometry(workflow);
      const result = executeCommand(parse('layout node inspect compose.1'), context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.message.split('\n')[0]).toMatch(/^compose\.1 {2}y=160/);
        expect(result.message).not.toContain('ns.compose.1');
      }
    });
  });

  describe('gap settings', () => {
    const last = (cmd: string): string => {
      const result = executeCommand(parse(cmd), context);
      expect(result.ok).toBe(true);
      return result.ok ? (result.message.split('\n').pop() ?? '') : '';
    };

    it('the library defaults apply without a setting', () => {
      // compose (x 720) and loop (x 1080) sit 120 apart: exactly the default gap.
      expect(last('layout node inspect compose')).not.toContain('spacing with loop');
    });

    it('changing a gap changes which cards inspect reports as too close', () => {
      context.layoutGaps = { gapX: 160, gapY: 40, gridSize: 20 };
      expect(last('layout node inspect compose')).toContain('spacing with loop');
      context.layoutGaps = { gapX: 60, gapY: 40, gridSize: 20 };
      expect(last('layout node inspect compose')).not.toContain('spacing with loop');
    });

    it('scores loopbacks as return lanes only when the setting is on', () => {
      // A card 20 under the lane of send > loop: free with the bezier, too close to the lane.
      workflow = {
        ...workflow,
        nodes: [...workflow.nodes, node('below', 1100, 440, ['x'], ['y'])]
      };
      context.measureNode = demoGeometry(workflow);
      context.layoutGaps = { gapX: 120, gapY: 40, gridSize: 20 };
      expect(last('layout node inspect below')).not.toContain('lane with');
      context.layoutGaps = { gapX: 120, gapY: 40, gridSize: 20, loopbackLanes: false };
      expect(last('layout node inspect below')).not.toContain('lane with');
      context.layoutGaps = { gapX: 120, gapY: 40, gridSize: 20, loopbackLanes: true };
      expect(last('layout node inspect below')).toContain('lane with send → loop');
      // The sweep scores with lanes too.
      const sweep = executeCommand(parse('layout beautify --dry-run'), context);
      expect(sweep.ok).toBe(true);
    });

    it('a flag overrides the setting for one call', () => {
      context.layoutGaps = { gapX: 160, gapY: 40, gridSize: 20 };
      expect(last('layout node inspect compose --gap-x 60')).not.toContain('spacing with loop');
      expect(last('layout node inspect compose')).toContain('spacing with loop');
    });

    it('beautify takes the gaps too (dry run)', () => {
      const a = executeCommand(parse('layout node beautify lookup clear --dry-run'), context);
      const b = executeCommand(
        parse('layout node beautify lookup clear --dry-run --gap-y 200'),
        context
      );
      expect(a.ok && b.ok).toBe(true);
      if (a.ok && b.ok) expect(b.message).not.toBe(a.message);
    });

    it('refuses a gap that is not a multiple of the grid, and dispatches nothing', () => {
      for (const cmd of [
        'layout node inspect compose --gap-x 50',
        'layout node beautify compose --gap-y 30'
      ]) {
        const result = executeCommand(parse(cmd), context);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('multiple of the 20 px grid');
      }
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('checks against the grid of the setting', () => {
      context.layoutGaps = { gapX: 120, gapY: 40, gridSize: 10 };
      expect(executeCommand(parse('layout node inspect compose --gap-x 50'), context).ok).toBe(
        true
      );
      expect(executeCommand(parse('layout node inspect compose --gap-x 55'), context).ok).toBe(
        false
      );
    });
  });

  describe('layout beautify (the sweep)', () => {
    it('prints the phases, a line per step and the score, in one batchUpdate', () => {
      const result = executeCommand(parse('layout beautify'), context);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const lines = result.message.split('\n');
      expect(lines[0]).toBe('# phase 1: hard rules (the lower card of each pair yields)');
      expect(lines).toContain('lookup: moved down 100 (y 200 → 300)');
      expect(lines).toContain('compose: moved down 140 (y 160 → 300)');
      expect(lines).toContain('form: outputs reordered message, email (was email, message)');
      expect(lines[lines.length - 1]).toBe(
        'sweep: straight 0 → 4 · crossings 3 → 1 · overlaps 2 → 0 · spacing 1 too close → ok'
      );

      expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);
      expect(dispatch.startTransaction).not.toHaveBeenCalled();
      const { nodes } = vi.mocked(dispatch.batchUpdate).mock.calls[0][0];
      const by = (id: string) => nodes!.find((n) => n.id === id)!;
      expect(by('lookup').position).toEqual({ x: 360, y: 300 });
      expect(by('compose').position).toEqual({ x: 720, y: 300 });
      expect(by('form').data.config.ports).toEqual({
        outputs: [{ id: 'message' }, { id: 'email' }]
      });
      // Annotations and untouched nodes pass through as they were.
      expect(by('cap1')).toBe(workflow.nodes.find((n) => n.id === 'cap1'));
      expect(by('classify')).toBe(workflow.nodes.find((n) => n.id === 'classify'));
    });

    it('--dry-run prints the steps and dispatches nothing', () => {
      const result = executeCommand(parse('layout beautify --dry-run'), context);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.message).toContain('lookup: would move down 100 (y 200 → 300)');
      expect(result.message).toMatch(/would give: straight 0 → 4/);
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('says so and dispatches nothing when nothing improves', () => {
      workflow = { ...workflow, nodes: workflow.nodes.filter((n) => n.id === 'send'), edges: [] };
      context.measureNode = demoGeometry(workflow);
      const result = executeCommand(parse('layout beautify'), context);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.message.split('\n')[0]).toMatch(/^sweep: no change; /);
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('takes the gaps like the node commands do', () => {
      const a = executeCommand(parse('layout beautify --dry-run'), context);
      const b = executeCommand(parse('layout beautify --dry-run --gap-y 200'), context);
      expect(a.ok && b.ok).toBe(true);
      if (a.ok && b.ok) expect(b.message).not.toBe(a.message);
      const bad = executeCommand(parse('layout beautify --gap-x 50'), context);
      expect(bad.ok).toBe(false);
      if (!bad.ok) expect(bad.error).toContain('multiple of the 20 px grid');
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('prints short ids for namespaced nodes', () => {
      workflow = {
        ...workflow,
        nodes: workflow.nodes.map((n) => ({ ...n, id: n.id === 'lookup' ? 'ns.lookup.1' : n.id })),
        edges: workflow.edges.map((e) => ({
          ...e,
          source: e.source === 'lookup' ? 'ns.lookup.1' : e.source,
          sourceHandle: e.sourceHandle?.replace('lookup-', 'ns.lookup.1-'),
          target: e.target === 'lookup' ? 'ns.lookup.1' : e.target,
          targetHandle: e.targetHandle?.replace('lookup-', 'ns.lookup.1-')
        }))
      };
      context.measureNode = demoGeometry(workflow);
      const result = executeCommand(parse('layout beautify --dry-run'), context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.message).toContain('lookup.1: would move down 100');
        expect(result.message).not.toContain('ns.lookup.1');
      }
    });

    it('plain layout beautify is untouched by the sweep', () => {
      expect(parse('layout beautify')).toEqual({ type: 'beautify_layout' });
    });
  });

  describe('beautify', () => {
    it('ports: one batchUpdate carrying the new port order, position untouched', () => {
      const result = executeCommand(parse('layout node beautify compose ports'), context);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.message.split('\n')[0]).toBe(
        'compose: inputs reordered label, contact (was contact, label)'
      );
      expect(result.message).toMatch(/straight 0 → 1/);

      expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);
      const { nodes } = vi.mocked(dispatch.batchUpdate).mock.calls[0][0];
      expect(nodes).toHaveLength(workflow.nodes.length);
      const compose = nodes!.find((n) => n.id === 'compose')!;
      expect(compose.position).toEqual({ x: 720, y: 160 });
      expect(compose.data.config.ports).toEqual({ inputs: [{ id: 'label' }, { id: 'contact' }] });
      // Every other node is passed through as it was.
      for (const n of nodes!.filter((x) => x.id !== 'compose')) {
        expect(n).toBe(workflow.nodes.find((o) => o.id === n.id));
      }
    });

    it('align: one batchUpdate carrying the new position', () => {
      const result = executeCommand(parse('layout node beautify form align'), context);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.message.split('\n')[0]).toBe('form: moved up 40 (y 100 → 60)');
      expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);
      const { nodes } = vi.mocked(dispatch.batchUpdate).mock.calls[0][0];
      expect(nodes!.find((n) => n.id === 'form')!.position).toEqual({ x: 0, y: 60 });
    });

    it('all: position and port order land in the same single batchUpdate', () => {
      const result = executeCommand(parse('layout node beautify compose'), context);
      expect(result.ok).toBe(true);
      expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);
      expect(dispatch.startTransaction).not.toHaveBeenCalled();
    });

    it('--dry-run reports and dispatches nothing', () => {
      const result = executeCommand(parse('layout node beautify lookup clear --dry-run'), context);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.message).toMatch(/^lookup: would move (up|down) \d+ \(y 200 → -?\d+\)/);
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('a refusal says why, ok:true, and dispatches nothing', () => {
      const result = executeCommand(parse('layout node beautify send ports'), context);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.message).toMatch(/^send: no change; /);
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('an annotation is refused', () => {
      const result = executeCommand(parse('layout node beautify cap1'), context);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.message).toContain('cap1: ');
      expect(result.message).toContain('no change');
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('an unknown node is NODE_NOT_FOUND and dispatches nothing', () => {
      const result = executeCommand(parse('layout node beautify nope'), context);
      expect(result).toMatchObject({ ok: false, code: 'NODE_NOT_FOUND' });
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('resolves a short id to the namespaced node and prints the short id', () => {
      workflow = {
        ...workflow,
        nodes: workflow.nodes.map((n) => ({ ...n, id: n.id === 'form' ? 'ns.form.1' : n.id })),
        edges: workflow.edges.map((e) => ({
          ...e,
          source: e.source === 'form' ? 'ns.form.1' : e.source,
          sourceHandle: e.sourceHandle?.replace('form-', 'ns.form.1-')
        }))
      };
      context.measureNode = demoGeometry(workflow);
      const result = executeCommand(parse('layout node beautify form.1 align'), context);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.message.split('\n')[0]).toBe('form.1: moved up 40 (y 100 → 60)');
      const { nodes } = vi.mocked(dispatch.batchUpdate).mock.calls[0][0];
      expect(nodes!.find((n) => n.id === 'ns.form.1')!.position.y).toBe(60);
    });
  });
});

describe('layout node beautify: undo history', () => {
  let fd: FlowDropInstance;
  let context: CommandContext;
  let workflow: Workflow;

  beforeEach(() => {
    workflow = tangled();
    fd = createFlowDropInstance({ id: `node-layout-${Math.random().toString(36).slice(2)}` });
    fd.workflow.initialize(workflow);
    fd.measureNode = demoGeometry(workflow);
    const ctx = createStoreCommandContext([], undefined, fd);
    if (!ctx) throw new Error('No command context');
    context = ctx;
  });

  const snapshot = () =>
    JSON.stringify(
      fd.workflow.current?.nodes.map((n) => [n.id, n.position, n.data.config.ports ?? null])
    );

  it('the store context carries the layout gap settings and the grid', async () => {
    const { updateSettings, getEditorSettings } = await import(
      '$lib/stores/settingsStore.svelte.js'
    );
    const before = { ...getEditorSettings() };
    try {
      expect(context.layoutGaps).toEqual({
        gapX: 120,
        gapY: 40,
        gridSize: before.gridSize,
        loopbackLanes: false
      });
      updateSettings({ editor: { layoutGapX: 200, layoutGapY: 0, loopbackLanes: true } as never });
      expect(context.layoutGaps).toMatchObject({ gapX: 200, gapY: 0, loopbackLanes: true });
    } finally {
      updateSettings({ editor: before });
    }
  });

  it('the store context carries the instance measurement', () => {
    expect(context.measureNode?.('compose')?.width).toBe(240);
  });

  it('one undo restores positions and config.ports; redo brings them back', () => {
    const before = snapshot();
    expect(fd.history.canUndo()).toBe(false);

    const result = executeCommand(parse('layout node beautify compose'), context);
    expect(result.ok).toBe(true);
    const after = snapshot();
    expect(after).not.toBe(before);
    const compose = fd.workflow.current!.nodes.find((n) => n.id === 'compose')!;
    expect(compose.data.config.ports).toBeDefined();

    expect(context.dispatch.undo()).toBe(true);
    expect(snapshot()).toBe(before);
    expect(fd.history.canUndo()).toBe(false);

    expect(context.dispatch.redo()).toBe(true);
    expect(snapshot()).toBe(after);
  });

  it('a dry run adds no history step', () => {
    executeCommand(parse('layout node beautify compose --dry-run'), context);
    expect(fd.history.canUndo()).toBe(false);
  });

  it('a sweep of several nodes and ports is one undo step', () => {
    const before = snapshot();
    expect(fd.history.canUndo()).toBe(false);

    const result = executeCommand(parse('layout beautify'), context);
    expect(result.ok).toBe(true);
    const after = snapshot();
    expect(after).not.toBe(before);
    const moved = JSON.parse(after).filter(
      ([id, pos, ports], i: number) =>
        JSON.stringify([pos, ports]) !== JSON.stringify(JSON.parse(before)[i].slice(1)) && id
    );
    expect(moved.length).toBeGreaterThan(3);

    expect(context.dispatch.undo()).toBe(true);
    expect(snapshot()).toBe(before);
    expect(fd.history.canUndo()).toBe(false);

    expect(context.dispatch.redo()).toBe(true);
    expect(snapshot()).toBe(after);
  });

  it('a sweep dry run adds no history step', () => {
    const before = snapshot();
    executeCommand(parse('layout beautify --dry-run'), context);
    expect(snapshot()).toBe(before);
    expect(fd.history.canUndo()).toBe(false);
  });
});
