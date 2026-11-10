/**
 * The default instance outlives a mount, so a lock a host set for one mount
 * must not open the next mount locked.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { DEFAULT_PORT_CONFIG } from '../../../src/lib/config/defaultPortConfig.js';

vi.mock('../../../src/lib/components/WorkflowEditor.svelte', () => ({
  default: () => {}
}));
vi.mock('../../../src/lib/components/App.svelte', () => ({
  default: () => {}
}));

const { mountWorkflowEditor, mountFlowDropApp } = await import('../../../src/lib/svelte-app.js');

window.matchMedia = ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {}
  }) as unknown as MediaQueryList) as typeof window.matchMedia;

const lock = {
  reasons: [{ kind: 'in_use', message: 'Two forms use it.' }],
  actions: []
};

afterEach(() => {
  document.body.innerHTML = '';
});

function target(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('default instance lock across mounts', () => {
  it('mountWorkflowEditor: a lock does not survive destroy()', async () => {
    const first = await mountWorkflowEditor(target(), {
      portConfig: DEFAULT_PORT_CONFIG,
      categories: [],
      lock
    });
    expect(first.instance.lock.isLocked).toBe(true);
    first.destroy();

    const second = await mountWorkflowEditor(target(), {
      portConfig: DEFAULT_PORT_CONFIG,
      categories: []
    });
    expect(second.instance.lock.isLocked).toBe(false);
    expect(second.instance.workflow.locked).toBe(false);
    second.destroy();
  });

  it('mountFlowDropApp: a lock set during a mount does not survive destroy()', async () => {
    const first = await mountFlowDropApp(target(), {
      portConfig: DEFAULT_PORT_CONFIG,
      categories: []
    });
    first.setLock(lock);
    expect(first.instance.lock.isLocked).toBe(true);
    first.destroy();

    const second = await mountFlowDropApp(target(), {
      portConfig: DEFAULT_PORT_CONFIG,
      categories: []
    });
    expect(second.instance.lock.isLocked).toBe(false);
    second.destroy();
  });
});
