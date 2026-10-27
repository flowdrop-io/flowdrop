/**
 * The offer to bring back a stored draft: the pure decision (`draftOffer`) and
 * the Restore / Discard toast `mountFlowDropApp` shows for it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const shown: Array<{
  title: string;
  body?: string;
  actions: Array<{ label: string; onClick: () => void }>;
}> = [];

vi.mock('../../../src/lib/services/toastService.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/lib/services/toastService.js')>()),
  showWarning: (content: (typeof shown)[number]) => {
    shown.push(content);
    return 'toast-id';
  }
}));

import { mountFlowDropApp } from '../../../src/lib/svelte-app.js';
import { draftOffer } from '../../../src/lib/utils/draftRestore.js';
import {
  loadDraft,
  saveDraft,
  type DraftStorageAdapter
} from '../../../src/lib/services/draftStorage.js';
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

function node(id: string, x = 0): WorkflowNode {
  return {
    id,
    type: 'default',
    position: { x, y: 0 },
    data: { label: id, config: {}, metadata: textType }
  } as WorkflowNode;
}

const makeWorkflow = (x = 0, revision?: number): Workflow =>
  ({
    id: 'wf-draft-restore',
    name: 'Draft restore',
    nodes: [node('a.1', x), node('b.1')],
    edges: [{ id: 'e1', source: 'a.1', target: 'b.1' }],
    ...(revision !== undefined ? { revision } : {}),
    metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
  }) as Workflow;

function memoryAdapter(): DraftStorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    keys: () => [...map.keys()]
  };
}

describe('draftOffer', () => {
  const draftOf = (workflow: Workflow, baseRevision?: string) => ({
    workflow,
    metadata: { savedAt: '2026-10-27T10:00:00.000Z', ...(baseRevision ? { baseRevision } : {}) }
  });

  it('offers nothing without a draft or a loaded workflow', () => {
    expect(draftOffer(null, makeWorkflow())).toBeNull();
    expect(draftOffer(draftOf(makeWorkflow(5)), null)).toBeNull();
  });

  it('offers nothing for a draft of another workflow', () => {
    const other = { ...makeWorkflow(5), id: 'other' } as Workflow;
    expect(draftOffer(draftOf(other), makeWorkflow())).toBeNull();
  });

  it('offers nothing when the draft equals the loaded workflow', () => {
    expect(draftOffer(draftOf(makeWorkflow()), makeWorkflow())).toBeNull();
  });

  it('offers a different draft', () => {
    expect(draftOffer(draftOf(makeWorkflow(5)), makeWorkflow())).toEqual({
      savedAt: '2026-10-27T10:00:00.000Z',
      savedSince: false
    });
  });

  it('flags a workflow saved after the draft started', () => {
    expect(draftOffer(draftOf(makeWorkflow(5), '3'), makeWorkflow(0, 4))?.savedSince).toBe(true);
  });

  it('does not flag a draft from the loaded revision', () => {
    expect(draftOffer(draftOf(makeWorkflow(5), '4'), makeWorkflow(0, 4))?.savedSince).toBe(false);
  });
});

let seq = 0;

async function mountApp(storage: DraftStorageAdapter, key: string) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return mountFlowDropApp(el, {
    instanceId: `draft-restore-${++seq}`,
    portConfig: DEFAULT_PORT_CONFIG,
    categories: [],
    nodes: [textType],
    workflow: makeWorkflow(),
    draftStorage: storage,
    draftStorageKey: key,
    features: { showToasts: false, autoSaveDraft: true, autoSaveDraftInterval: 600000 }
  });
}

beforeEach(() => {
  shown.length = 0;
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

describe('mount: stored draft offer', () => {
  it('offers a different draft; Restore puts it over the workflow', async () => {
    const storage = memoryAdapter();
    saveDraft(makeWorkflow(300), 'k-restore', storage);
    const app = await mountApp(storage, 'k-restore');
    await app.runCommand('list nodes'); // waits for the load
    await vi.waitFor(() => expect(shown).toHaveLength(1));
    expect(shown[0].title).toContain('Unsaved changes from');
    expect(shown[0].body).toBeUndefined();
    expect(shown[0].actions.map((a) => a.label)).toEqual(['Restore', 'Discard']);
    expect(app.isDirty()).toBe(false);

    shown[0].actions[0].onClick();
    expect(app.isDirty()).toBe(true);
    expect(app.getWorkflow()?.nodes.find((n) => n.id === 'a.1')?.position.x).toBe(300);
    app.destroy();
  });

  it('Discard removes the draft', async () => {
    const storage = memoryAdapter();
    saveDraft(makeWorkflow(300), 'k-discard', storage);
    const app = await mountApp(storage, 'k-discard');
    await app.runCommand('list nodes');
    await vi.waitFor(() => expect(shown).toHaveLength(1));
    shown[0].actions[1].onClick();
    expect(loadDraft('k-discard', storage)).toBeNull();
    expect(app.isDirty()).toBe(false);
    app.destroy();
  });

  it('shows no toast for an equal draft and deletes it', async () => {
    const storage = memoryAdapter();
    saveDraft(makeWorkflow(), 'k-equal', storage);
    const app = await mountApp(storage, 'k-equal');
    await app.runCommand('list nodes');
    await vi.waitFor(() => expect(loadDraft('k-equal', storage)).toBeNull());
    expect(shown).toHaveLength(0);
    app.destroy();
  });

  it('says so when the workflow was saved after the draft', async () => {
    const storage = memoryAdapter();
    saveDraft({ ...makeWorkflow(300), revision: 1 } as Workflow, 'k-since', storage);
    const el = document.createElement('div');
    document.body.appendChild(el);
    const app = await mountFlowDropApp(el, {
      instanceId: `draft-restore-${++seq}`,
      portConfig: DEFAULT_PORT_CONFIG,
      categories: [],
      nodes: [textType],
      workflow: makeWorkflow(0, 2),
      draftStorage: storage,
      draftStorageKey: 'k-since',
      features: { showToasts: false, autoSaveDraft: true, autoSaveDraftInterval: 600000 }
    });
    await app.runCommand('list nodes');
    await vi.waitFor(() => expect(shown).toHaveLength(1));
    expect(shown[0].body).toContain('saved after this draft');
    app.destroy();
  });
});
