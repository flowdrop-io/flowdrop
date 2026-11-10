/**
 * A locked (or read-only) canvas takes no drops: not a workflow file, not a
 * node from the sidebar. `initialize` ignores the lock on purpose, so the
 * editor has to refuse the file itself.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import type { Workflow } from '$lib/types/index.js';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

const lock = { reasons: [{ kind: 'in_use', message: 'Two forms use it.' }], actions: [] };

function makeWorkflow(id: string, name: string): Workflow {
  return {
    id,
    name,
    nodes: [],
    edges: [],
    metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
  } as unknown as Workflow;
}

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    flushSync();
    await tick();
    await new Promise((r) => setTimeout(r, 5));
  }
}

async function mountEditor(id: string, props: Record<string, unknown> = {}) {
  const fd = createFlowDropInstance({ id });
  fd.workflow.initialize(makeWorkflow('wf-original', 'Original'));
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(WorkflowEditor, { target, props: { instance: fd, ...props } as never });
  await settle();
  return fd;
}

function dropFile(): void {
  const zone = document.querySelector('.flow-drop-zone') as HTMLElement;
  const file = new File([JSON.stringify(makeWorkflow('wf-dropped', 'Dropped'))], 'w.json', {
    type: 'application/json'
  });
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files: [file], getData: () => '' } });
  zone.dispatchEvent(event);
}

describe('WorkflowEditor drops while the canvas is not editable', () => {
  it('replaces the workflow with a dropped file when editable (baseline)', async () => {
    const fd = await mountEditor('drop-baseline');
    dropFile();
    await settle();
    expect(fd.workflow.current?.id).toBe('wf-dropped');
    fd.destroy();
  });

  it('refuses a dropped file on a locked canvas', async () => {
    const fd = await mountEditor('drop-locked');
    fd.lock.set(lock);
    await settle();
    dropFile();
    await settle();
    expect(fd.workflow.current?.id).toBe('wf-original');
    fd.destroy();
  });

  it('refuses a dropped file on a read-only canvas', async () => {
    const fd = await mountEditor('drop-readonly', { mode: 'readonly' });
    dropFile();
    await settle();
    expect(fd.workflow.current?.id).toBe('wf-original');
    fd.destroy();
  });

  it('refuses a file whose lock arrives while it is being read', async () => {
    const fd = await mountEditor('drop-late-lock');
    const zone = document.querySelector('.flow-drop-zone') as HTMLElement;
    // Hold the read back so the lock can land in between.
    let finishRead: (() => void) | null = null;
    const realReadAsText = FileReader.prototype.readAsText;
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (
      this: FileReader,
      blob: Blob
    ) {
      finishRead = () => realReadAsText.call(this, blob);
    });
    const file = new File([JSON.stringify(makeWorkflow('wf-dropped', 'Dropped'))], 'w.json', {
      type: 'application/json'
    });
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [file], getData: () => '' } });
    zone.dispatchEvent(event);
    expect(finishRead).not.toBeNull();

    fd.lock.set(lock);
    await settle();
    finishRead!();
    await settle();
    expect(fd.workflow.current?.id).toBe('wf-original');
    fd.destroy();
  });

  it('adds no node and records no history for a sidebar drop on a locked canvas', async () => {
    const fd = await mountEditor('drop-node-locked');
    fd.lock.set(lock);
    await settle();
    const push = vi.spyOn(fd.workflow, 'pushHistory');
    const zone = document.querySelector('.flow-drop-zone') as HTMLElement;
    const nodeType = JSON.stringify({
      id: 'calc',
      name: 'Calc',
      type: 'default',
      category: 'math',
      inputs: [],
      outputs: [],
      description: ''
    });
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { files: [], getData: () => nodeType }
    });
    Object.defineProperty(event, 'clientX', { value: 10 });
    Object.defineProperty(event, 'clientY', { value: 10 });
    zone.dispatchEvent(event);
    await settle();
    expect(push).not.toHaveBeenCalled();
    expect(fd.workflow.nodes).toHaveLength(0);
    fd.destroy();
  });
});
