/**
 * App and the test blocker: provided at init (so the first render already
 * knows), the store's `effective` is the one answer, withdrawn on destroy.
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

const workflow = {
  id: 'wf-blocker',
  name: 'wf-blocker',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
} as unknown as Workflow;

let app: ReturnType<typeof mount> | null = null;
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});
afterEach(() => {
  vi.unstubAllGlobals();
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

function mountApp(fd: ReturnType<typeof createFlowDropInstance>, props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(App, {
    target,
    props: {
      instance: fd,
      workflow,
      showNavbar: true,
      portConfig: DEFAULT_PORT_CONFIG,
      features: { showToasts: false, autoSaveDraft: false },
      ...props
    } as never
  });
}

describe('App test blocker lifecycle', () => {
  it('registers at init, follows the editor, and is withdrawn on destroy', async () => {
    const fd = createFlowDropInstance({ id: 'blocker-lifecycle' });
    // No App yet: Test is never in effect.
    expect(fd.editorMode.testBlocker).toContain('not available');
    mountApp(fd, {});
    // Registered while the component initialised: no effect had to run first.
    expect(fd.editorMode.testBlocker).not.toBeNull(); // the workflow is still loading (no id yet)
    for (let i = 0; i < 300 && fd.workflow.current?.id !== 'wf-blocker'; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    await settle();
    expect(fd.editorMode.testBlocker).toBeNull();

    fd.editorMode.set('test');
    expect(fd.editorMode.effective).toBe('test');

    unmount(app!);
    app = null;
    expect(fd.editorMode.testBlocker).toContain('not available');
    expect(fd.editorMode.effective).toBe('edit');
    // The request stays: the store keeps what was asked.
    expect(fd.editorMode.current).toBe('test');
    fd.destroy();
  });

  it('holds Test back on a read-only editor, and reads the reason from the store', async () => {
    const fd = createFlowDropInstance({ id: 'blocker-readonly' });
    mountApp(fd, { mode: 'readonly', editorMode: 'test' });
    for (let i = 0; i < 300 && fd.workflow.current?.id !== 'wf-blocker'; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    await settle();
    expect(fd.editorMode.current).toBe('test');
    expect(fd.editorMode.testBlocker).toContain('read-only');
    expect(fd.editorMode.effective).toBe('edit');
    fd.destroy();
  });
});
