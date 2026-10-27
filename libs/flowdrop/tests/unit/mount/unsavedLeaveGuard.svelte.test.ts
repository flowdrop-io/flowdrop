/**
 * The `beforeunload` guard `mountFlowDropApp` adds while the workflow has
 * unsaved changes (`features.confirmUnsavedLeave`).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountFlowDropApp } from '../../../src/lib/svelte-app.js';
import type { NodeMetadata, Workflow, WorkflowNode } from '../../../src/lib/types/index.js';
import { DEFAULT_PORT_CONFIG } from '../../../src/lib/config/defaultPortConfig.js';

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

const makeWorkflow = (): Workflow =>
  ({
    id: 'wf-leave-guard',
    name: 'Leave guard',
    nodes: [node('a.1'), node('b.1')],
    edges: [{ id: 'e1', source: 'a.1', target: 'b.1' }],
    metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
  }) as Workflow;

let seq = 0;

async function mountApp(extra: Partial<Parameters<typeof mountFlowDropApp>[1]> = {}) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const { features, ...rest } = extra;
  return mountFlowDropApp(el, {
    instanceId: `leave-guard-${++seq}`,
    portConfig: DEFAULT_PORT_CONFIG,
    categories: [],
    nodes: [textType],
    workflow: makeWorkflow(),
    features: { showToasts: false, autoSaveDraft: false, ...features },
    ...rest
  });
}

/** Fire `beforeunload` the way a browser does and report whether it was prevented. */
function leavePrevented(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

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

describe('confirmUnsavedLeave', () => {
  it('does not prevent leaving while the workflow is clean', async () => {
    const app = await mountApp();
    await app.runCommand('list nodes'); // waits for the load
    expect(app.isDirty()).toBe(false);
    expect(leavePrevented()).toBe(false);
    app.destroy();
  });

  it('prevents leaving once the workflow has unsaved changes', async () => {
    const app = await mountApp();
    await app.runCommand('layout auto');
    expect(app.isDirty()).toBe(true);
    expect(leavePrevented()).toBe(true);
    app.destroy();
  });

  it('does nothing when features.confirmUnsavedLeave is false', async () => {
    const app = await mountApp({ features: { confirmUnsavedLeave: false } });
    await app.runCommand('layout auto');
    expect(app.isDirty()).toBe(true);
    expect(leavePrevented()).toBe(false);
    app.destroy();
  });

  it.each(['readonly', 'locked'] as const)('does nothing in %s mode', async (mode) => {
    const app = await mountApp({ mode });
    await app.runCommand('layout auto');
    expect(leavePrevented()).toBe(false);
    app.destroy();
  });

  it('stops asking after destroy()', async () => {
    const app = await mountApp();
    await app.runCommand('layout auto');
    expect(leavePrevented()).toBe(true);
    app.destroy();
    expect(leavePrevented()).toBe(false);
  });
});
