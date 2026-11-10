/**
 * A locked editor's Save: Ctrl/Cmd+S saves nothing and the person is told so
 * (not silence, not the browser's Save Page), and edits made before the lock
 * arrived still show as unsaved.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import App from '$lib/components/App.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
import { defaultMessages } from '$lib/messages/index.js';
import type { Workflow } from '$lib/types/index.js';

const showInfo = vi.hoisted(() => vi.fn());
vi.mock('$lib/services/toastService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/services/toastService.js')>();
  return {
    ...actual,
    showInfo: (...args: Parameters<typeof actual.showInfo>) => {
      showInfo(...args);
      return actual.showInfo(...args);
    }
  };
});

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
  id: 'wf-locked',
  name: 'wf-locked',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
} as unknown as Workflow;

let app: ReturnType<typeof mount> | null = null;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  showInfo.mockClear();
  // Start-up requests fail at once, so the workflow prop loads quickly.
  fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', fetchMock);
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

async function mountApp(
  id: string,
  props: Record<string, unknown>
): Promise<ReturnType<typeof createFlowDropInstance>> {
  const fd = createFlowDropInstance({ id });
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
  for (let i = 0; i < 300 && fd.workflow.current?.id !== 'wf-locked'; i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  expect(fd.workflow.current?.id).toBe('wf-locked');
  await settle();
  return fd;
}

/** The Save button's unsaved marker. */
function saveShowsUnsaved(): boolean {
  return document.querySelector('[data-dirty="true"]') !== null;
}

describe('App: unsaved marker on a locked editor', () => {
  it('still shows edits made before the lock arrived', async () => {
    const fd = await mountApp('locked-dirty', {});
    fd.workflow.updateName('renamed');
    await settle();
    expect(fd.workflow.isDirty).toBe(true);
    expect(saveShowsUnsaved()).toBe(true);

    fd.lock.set({ reasons: [{ kind: 'in_use', message: 'Used.' }], actions: [] });
    await settle();
    // The edits are still unsaved (the leave prompt and Run say so); so does Save.
    expect(fd.workflow.isDirty).toBe(true);
    expect(saveShowsUnsaved()).toBe(true);
    fd.destroy();
  });

  it('shows nothing in read-only mode', async () => {
    const fd = await mountApp('readonly-dirty', { mode: 'readonly' });
    fd.workflow.updateName('renamed');
    await settle();
    expect(fd.workflow.isDirty).toBe(true);
    expect(saveShowsUnsaved()).toBe(false);
    fd.destroy();
  });
});

describe('App: Ctrl/Cmd+S on a locked editor', () => {
  it('saves nothing and says the editor is locked', async () => {
    const fd = createFlowDropInstance({ id: 'locked-save-shortcut' });
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(App, {
      target,
      props: {
        instance: fd,
        workflow,
        showNavbar: true,
        lock: { reasons: [{ kind: 'in_use', message: 'Used.' }], actions: [] },
        portConfig: DEFAULT_PORT_CONFIG,
        features: { showToasts: true, autoSaveDraft: false }
      } as never
    });
    for (let i = 0; i < 300 && fd.workflow.current?.id !== 'wf-locked'; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(fd.workflow.current?.id).toBe('wf-locked');
    await settle();
    fetchMock.mockClear();

    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
    await settle();

    expect(event.defaultPrevented).toBe(true);
    expect(showInfo).toHaveBeenCalledWith(defaultMessages.lock.saveRefused, expect.anything());
    // Nothing went to the server.
    expect(fetchMock).not.toHaveBeenCalled();
    fd.destroy();
  });
});
