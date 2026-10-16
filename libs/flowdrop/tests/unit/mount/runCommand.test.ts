/**
 * `runCommand` on the object `mountFlowDropApp` / `mountWorkflowEditor` return (#53).
 * The real App is mounted (no network: fetch rejects) so the call has to wait
 * for the editor to load the workflow, like a host's call right after mounting.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountFlowDropApp, mountWorkflowEditor } from '../../../src/lib/svelte-app.js';
import type { NodeMetadata, Workflow, WorkflowNode } from '../../../src/lib/types/index.js';
import * as executor from '../../../src/lib/commands/executor.js';
import { DEFAULT_PORT_CONFIG } from '../../../src/lib/config/defaultPortConfig.js';
import {
  hasUIActionTarget,
  provideUIActionTarget
} from '../../../src/lib/commands/uiActionTarget.js';

const textType = {
  node_type_id: 'text_input',
  name: 'Text Input',
  category: 'inputs',
  inputs: [],
  outputs: [{ id: 'value', name: 'Value', type: 'output', dataType: 'string' }],
  configSchema: { type: 'object', properties: {} }
} as NodeMetadata;

function node(id: string): WorkflowNode {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: id, config: {}, metadata: textType }
  } as WorkflowNode;
}

function makeWorkflow(): Workflow {
  return {
    id: 'wf-run-command',
    name: 'Run command',
    nodes: [node('a.1'), node('b.1'), node('c.1')],
    edges: [
      { id: 'e1', source: 'a.1', target: 'b.1' },
      { id: 'e2', source: 'b.1', target: 'c.1' }
    ],
    metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
  } as Workflow;
}

let seq = 0;
// Each mount gets its own instance so no state leaks between tests.
const mountOptions = () => ({
  instanceId: `run-command-${++seq}`,
  portConfig: DEFAULT_PORT_CONFIG,
  categories: [],
  nodes: [textType],
  features: { showToasts: false, autoSaveDraft: false }
});

async function mountApp(
  workflow: Workflow = makeWorkflow(),
  extra: Partial<Parameters<typeof mountFlowDropApp>[1]> = {}
) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return mountFlowDropApp(el, { ...mountOptions(), workflow, ...extra });
}

const labelOf = (app: { getWorkflow: () => Workflow | null }, id: string) =>
  app.getWorkflow()?.nodes.find((n) => n.id === id)?.data.label;

function positions(app: { getWorkflow: () => Workflow | null }): string[] {
  return (app.getWorkflow()?.nodes ?? []).map((n) => `${n.position.x},${n.position.y}`);
}

const allAtOrigin = (p: string[]) => p.every((x) => x === '0,0');

beforeEach(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network'));
  vi.spyOn(window, 'fetch').mockRejectedValue(new Error('no network'));
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('runCommand', () => {
  it('runs a console line: moves nodes, dirties the workflow, one undo step', async () => {
    const app = await mountApp();
    // Called straight after the mount: waits for the editor to load the workflow.
    const result = await app.runCommand('layout auto');

    expect(result.ok).toBe(true);
    expect(allAtOrigin(positions(app))).toBe(false);
    expect(app.isDirty()).toBe(true);

    expect(app.instance.history.canUndo()).toBe(true);
    await app.runCommand('undo');
    expect(allAtOrigin(positions(app))).toBe(true);
    expect(app.instance.history.canUndo()).toBe(false);
    app.destroy();
  });

  it('works once the workflow is already loaded', async () => {
    const app = await mountApp();
    expect((await app.runCommand('list nodes')).ok).toBe(true); // waits for the load
    const again = await app.runCommand('layout auto');
    expect(again.ok).toBe(true);
    expect(allAtOrigin(positions(app))).toBe(false);
    app.destroy();
  });

  it('runs a Command object', async () => {
    const app = await mountApp();
    const result = await app.runCommand({ type: 'auto_layout' });
    expect(result.ok).toBe(true);
    expect(allAtOrigin(positions(app))).toBe(false);
    app.destroy();
  });

  it('resolves a line that does not parse as a failed result', async () => {
    const app = await mountApp();
    const result = await app.runCommand('frobnicate the widgets');
    expect(result).toMatchObject({ ok: false, code: 'PARSE_ERROR' });
    expect(app.isDirty()).toBe(false);
    app.destroy();
  });

  it('refuses session commands', async () => {
    const app = await mountApp();
    const result = await app.runCommand('session run');
    expect(result).toMatchObject({ ok: false, code: 'SESSION_REFUSED' });
    app.destroy();
  });

  it('resolves a failed command without touching the workflow', async () => {
    const app = await mountApp();
    const result = await app.runCommand('delete nope.1');
    expect(result.ok).toBe(false);
    expect(app.isDirty()).toBe(false);
    app.destroy();
  });
});

describe('runCommand with a hand-built Command object', () => {
  const malformed: Array<[string, unknown]> = [
    ['null', null],
    ['an unknown type', { type: 'bogus' }],
    ['set_config without key and value', { type: 'set_config', nodeId: 'a.1' }],
    ['add_node without a node type', { type: 'add_node' }],
    ['rename_node without a label', { type: 'rename_node', nodeId: 'a.1' }]
  ];

  it.each(malformed)('refuses %s and changes nothing', async (_name, command) => {
    const app = await mountApp();
    await app.runCommand('list nodes'); // waits for the load
    const result = await app.runCommand(command as never);

    expect(result).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' });
    // A rename with no label used to rename the node to "undefined".
    expect(labelOf(app, 'a.1')).toBe('a.1');
    expect(app.getWorkflow()?.nodes).toHaveLength(3);
    expect(app.isDirty()).toBe(false);
    expect(app.instance.history.canUndo()).toBe(false);
    app.destroy();
  });

  it('resolves, not hangs, on a malformed object right after mounting', async () => {
    const app = await mountApp();
    // No earlier call: the workflow may not have loaded yet.
    const result = await app.runCommand({ type: 'rename_node', nodeId: 'a.1' } as never);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' });
    app.destroy();
  });

  it('still runs a well-formed object', async () => {
    const app = await mountApp();
    const result = await app.runCommand({
      type: 'move_node',
      nodeId: 'a.1',
      position: { x: 40, y: 80 }
    });
    expect(result.ok).toBe(true);
    expect(app.getWorkflow()?.nodes.find((n) => n.id === 'a.1')?.position).toEqual({
      x: 40,
      y: 80
    });
    app.destroy();
  });

  it('resolves INTERNAL_ERROR, not a rejection, when the executor throws', async () => {
    const app = await mountApp();
    await app.runCommand('list nodes'); // waits for the load
    vi.spyOn(executor, 'executeCommand').mockImplementation(() => {
      throw new Error('boom');
    });
    const result = await app.runCommand('layout auto');
    expect(result).toMatchObject({ ok: false, code: 'INTERNAL_ERROR' });
    app.destroy();
  });
});

describe('runCommand({ baseline: true })', () => {
  it('makes the result the clean starting point: not dirty, nothing to undo', async () => {
    const app = await mountApp();
    const result = await app.runCommand('layout auto', { baseline: true });

    expect(result.ok).toBe(true);
    expect(allAtOrigin(positions(app))).toBe(false);
    expect(app.isDirty()).toBe(false);
    expect(app.instance.history.canUndo()).toBe(false);
    app.destroy();
  });

  it('is refused on a workflow with unsaved changes, and runs nothing', async () => {
    const app = await mountApp();
    expect((await app.runCommand('rename a.1 "Renamed"')).ok).toBe(true);
    expect(app.isDirty()).toBe(true);
    const before = positions(app);

    const result = await app.runCommand('layout auto', { baseline: true });
    expect(result).toMatchObject({ ok: false, code: 'DIRTY' });
    expect(positions(app)).toEqual(before);
    expect(app.isDirty()).toBe(true);
    app.destroy();
  });

  it('keeps the undo history when the command changes nothing', async () => {
    const app = await mountApp();
    await app.runCommand('layout auto');
    app.instance.workflow.markAsSaved(); // clean, with one undo step behind it
    expect(app.isDirty()).toBe(false);
    expect(app.instance.history.canUndo()).toBe(true);

    const result = await app.runCommand('list nodes', { baseline: true });
    expect(result.ok).toBe(true);
    expect(app.instance.history.canUndo()).toBe(true);
    app.destroy();
  });

  it('does not tell the host about a successful baseline run', async () => {
    const onDirtyStateChange = vi.fn();
    const onWorkflowChange = vi.fn();
    const app = await mountApp(makeWorkflow(), {
      eventHandlers: { onDirtyStateChange, onWorkflowChange }
    });
    await app.runCommand('list nodes'); // waits for the load
    onDirtyStateChange.mockClear();
    onWorkflowChange.mockClear();

    const result = await app.runCommand('layout auto', { baseline: true });
    expect(result.ok).toBe(true);
    expect(allAtOrigin(positions(app))).toBe(false);
    expect(onDirtyStateChange).not.toHaveBeenCalled();
    expect(onWorkflowChange).not.toHaveBeenCalled();
    app.destroy();
  });

  it('refuses undo and redo as a baseline, and changes nothing', async () => {
    const app = await mountApp();
    await app.runCommand('rename a.1 Renamed');
    app.instance.workflow.markAsSaved();
    expect(app.isDirty()).toBe(false);

    for (const line of ['undo', 'redo']) {
      const result = await app.runCommand(line, { baseline: true });
      expect(result).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' });
    }
    expect(labelOf(app, 'a.1')).toBe('Renamed');
    expect(app.instance.history.canUndo()).toBe(true);
    app.destroy();
  });

  it('does nothing extra when the command fails', async () => {
    const app = await mountApp();
    const result = await app.runCommand('delete nope.1', { baseline: true });
    expect(result.ok).toBe(false);
    expect(app.isDirty()).toBe(false);
    app.destroy();
  });
});

describe('runCommand after destroy', () => {
  it('resolves with a failed result at once', async () => {
    const app = await mountApp();
    app.destroy();
    const result = await app.runCommand('layout auto');
    expect(result).toMatchObject({ ok: false, code: 'NO_WORKFLOW' });
  });

  it('resolves, not hangs, when the mount goes away before the workflow loads', async () => {
    // No workflow option: nothing ever loads one, so the call is left waiting.
    const el = document.createElement('div');
    document.body.appendChild(el);
    const app = await mountFlowDropApp(el, { ...mountOptions() });
    expect(app.getWorkflow()).toBeNull();

    const pending = app.runCommand('layout auto');
    app.destroy();
    await expect(pending).resolves.toMatchObject({ ok: false, code: 'NO_WORKFLOW' });
  });
});

describe('runCommand UI actions', () => {
  it('routes a select command to the editor shell through the instance', async () => {
    const app = await mountApp();
    await app.runCommand('layout auto'); // make sure the workflow has loaded
    const handler = vi.fn();
    expect(hasUIActionTarget(app.instance)).toBe(true); // App registered its handler
    provideUIActionTarget(app.instance, handler);

    const result = await app.runCommand('select a.1');
    expect(result.ok).toBe(true);
    expect(handler).toHaveBeenCalledWith({ type: 'select_node', nodeId: 'a.1' });
    app.destroy();
  });

  it('is not on the public instance', async () => {
    const app = await mountApp();
    await app.runCommand('list nodes');
    expect('uiActions' in app.instance).toBe(false);
    app.destroy();
  });

  it('a released target does not clear a newer one', () => {
    const instance = {} as Parameters<typeof provideUIActionTarget>[0];
    const releaseFirst = provideUIActionTarget(instance, vi.fn());
    provideUIActionTarget(instance, vi.fn());
    releaseFirst();
    expect(hasUIActionTarget(instance)).toBe(true);
  });
});

describe('mountWorkflowEditor().runCommand', () => {
  it('runs against the seeded workflow', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const app = await mountWorkflowEditor(el, {
      instanceId: `run-command-${++seq}`,
      workflow: makeWorkflow(),
      portConfig: DEFAULT_PORT_CONFIG,
      categories: []
    });
    const result = await app.runCommand('layout auto', { baseline: true });
    expect(result.ok).toBe(true);
    expect(allAtOrigin(positions(app))).toBe(false);
    expect(app.isDirty()).toBe(false);
    app.destroy();
  });
});
