/**
 * Import replaces the workflow, so it is refused whenever the canvas is not
 * editable: locked, and also mode="readonly".
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
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
afterEach(() => {
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

async function importFile(id: string, mode: 'edit' | 'readonly'): Promise<string | undefined> {
  const fd = createFlowDropInstance({ id });
  fd.workflow.initialize(wf('original'));
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(App, {
    target,
    props: {
      instance: fd,
      workflow: wf('original'),
      mode,
      portConfig: DEFAULT_PORT_CONFIG,
      features: { showToasts: false, autoSaveDraft: false }
    } as never
  });
  await settle();
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([JSON.stringify(wf('imported'))], 'w.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await settle();
  const current = fd.workflow.current?.id;
  fd.destroy();
  return current;
}

describe('App import', () => {
  it('replaces the workflow when editable (baseline)', async () => {
    expect(await importFile('imp-edit', 'edit')).toBe('imported');
  });

  it('is refused in read-only mode', async () => {
    expect(await importFile('imp-readonly', 'readonly')).toBe('original');
  });
});
