/**
 * `mountFlowDropApp` passes `navbarEnd` on to the editor. App itself is replaced
 * by a stub that records its props: what is under test is the mount function's
 * forwarding, not the navbar (the e2e test covers that).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import type { Workflow } from '../../../src/lib/types/index.js';
import { DEFAULT_PORT_CONFIG } from '../../../src/lib/config/defaultPortConfig.js';

const received: Record<string, unknown>[] = [];

vi.mock('../../../src/lib/components/App.svelte', () => ({
  default: (_anchor: unknown, props: Record<string, unknown>) => {
    received.push(props);
  }
}));

const { mountFlowDropApp } = await import('../../../src/lib/svelte-app.js');

const workflow: Workflow = {
  id: 'wf-navbar-end',
  name: 'Navbar end',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
};

window.matchMedia = ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {}
  }) as unknown as MediaQueryList) as typeof window.matchMedia;

afterEach(() => {
  received.length = 0;
  document.body.innerHTML = '';
});

describe('mountFlowDropApp({ navbarEnd })', () => {
  it('passes the snippet to the editor', async () => {
    const navbarEnd = createRawSnippet(() => ({ render: () => '<span>Ada</span>' }));
    const el = document.createElement('div');
    document.body.appendChild(el);
    const app = await mountFlowDropApp(el, {
      workflow,
      portConfig: DEFAULT_PORT_CONFIG,
      categories: [],
      features: { showToasts: false, autoSaveDraft: false },
      showNavbar: true,
      navbarEnd
    });

    expect(received[0].navbarEnd).toBe(navbarEnd);
    app.destroy();
  });
});
