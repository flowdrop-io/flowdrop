/**
 * Import replaces the workflow, so it is refused whenever the canvas is not
 * editable: locked, and also mode="readonly".
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import App from '$lib/components/App.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
import type { Workflow } from '$lib/types/index.js';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

window.matchMedia = ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {}
  }) as unknown as MediaQueryList) as typeof window.matchMedia;

function wf(id: string): Workflow {
  return {
    id,
    name: id,
    nodes: [],
    edges: [],
    metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
  } as unknown as Workflow;
}

let app: ReturnType<typeof mount> | null = null;
// App's start-up requests must fail at once: a real request can take seconds
// on a busy machine, and the workflow prop is only loaded after them.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    flushSync();
    await tick();
    await new Promise((r) => setTimeout(r, 5));
  }
}

type Mode = 'edit' | 'readonly';

/**
 * Mount the editor, pick a file in the hidden input and wait until the
 * FileReader has finished. `beforeRead` runs after the pick and before the
 * read completes (the file is held back until it returns).
 */
async function importFile(
  id: string,
  opts: { mode?: Mode; lock?: boolean; beforeRead?: (setMode: (m: Mode) => void) => void }
): Promise<{ id: string | undefined; read: boolean }> {
  const fd = createFlowDropInstance({ id });
  let mode = $state<Mode>(opts.mode ?? 'edit');
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(App, {
    target,
    props: {
      instance: fd,
      workflow: wf('original'),
      get mode() {
        return mode;
      },
      portConfig: DEFAULT_PORT_CONFIG,
      features: { showToasts: false, autoSaveDraft: false }
    } as never
  });
  // App loads its `workflow` prop once its start-up requests have finished
  // (fetch is stubbed to fail at once). An import made before that would be overwritten, so
  // wait for the load.
  for (let i = 0; i < 300 && fd.workflow.current?.id !== 'original'; i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  expect(fd.workflow.current?.id).toBe('original');
  await settle();
  if (opts.lock) {
    fd.lock.set({ reasons: [{ kind: 'in_use', message: 'Used.' }], actions: [] });
    await settle();
  }

  // Hold the read back, then finish it and wait for its end.
  const realRead = FileReader.prototype.readAsText;
  let finished: Promise<void> = Promise.resolve();
  let startRead: (() => void) | null = null;
  vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (
    this: FileReader,
    blob: Blob
  ) {
    finished = new Promise<void>((resolve) =>
      this.addEventListener('loadend', () => resolve(), { once: true })
    );
    startRead = () => realRead.call(this, blob);
  });

  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([JSON.stringify(wf('imported'))], 'w.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));

  // A refused import never starts a read at all.
  const read = startRead !== null;
  if (startRead) {
    opts.beforeRead?.((m) => {
      mode = m;
      flushSync();
    });
    (startRead as () => void)();
    await finished;
  }
  await settle();
  const current = fd.workflow.current?.id;
  fd.destroy();
  return { id: current, read };
}

describe('App import', () => {
  it('replaces the workflow when editable (baseline)', async () => {
    expect(await importFile('imp-edit', {})).toEqual({ id: 'imported', read: true });
  });

  it('is refused in read-only mode', async () => {
    // Refused up front: the file is not even read.
    expect(await importFile('imp-readonly', { mode: 'readonly' })).toEqual({
      id: 'original',
      read: false
    });
  });

  it('is refused while locked', async () => {
    expect(await importFile('imp-locked', { lock: true })).toEqual({
      id: 'original',
      read: false
    });
  });

  it('is refused when read-only arrives while the file is being read', async () => {
    // The read started (the editor was editable), then read-only arrived.
    expect(await importFile('imp-late', { beforeRead: (setMode) => setMode('readonly') })).toEqual({
      id: 'original',
      read: true
    });
  });
});
