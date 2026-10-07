/**
 * The status badge is status only: no hover details panel (one fact, one home:
 * durations, errors and job history are in the inspector's Last run tab).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import NodeStatusOverlay from '$lib/components/NodeStatusOverlay.svelte';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

describe('NodeStatusOverlay', () => {
  it('has the status word as tooltip and accessible name, and no details panel on hover', () => {
    app = mount(NodeStatusOverlay, {
      target: document.body,
      props: {
        nodeId: 'n1',
        executionInfo: {
          status: 'failed',
          executionCount: 3,
          isExecuting: false,
          lastError: 'Connection timeout',
          lastExecutionDuration: 30000,
          lastExecuted: new Date().toISOString()
        }
      }
    });
    const badge = document.querySelector('.node-status-overlay') as HTMLElement;
    expect(badge.title).toBe('Failed');
    expect(badge.getAttribute('aria-label')).toContain('Failed');
    badge.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    flushSync();
    expect(document.querySelector('.node-status-overlay__details')).toBeNull();
    expect(badge.textContent?.trim()).toBe('');
  });
});
