/**
 * The status overlay: a labelled pill at screen size (icon + label + count when
 * above 1), an outline + count badge below 35% zoom. Hover carries the count and
 * the last error line only; timing is not drawn (it lives in the inspector's
 * Last run tab).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import NodeStatusOverlay from '$lib/components/NodeStatusOverlay.svelte';
import type { NodeExecutionInfo } from '$lib/types/index.js';

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

const info = (over: Partial<NodeExecutionInfo>): NodeExecutionInfo => ({
  status: 'completed',
  executionCount: 1,
  isExecuting: false,
  ...over
});

function render(executionInfo: NodeExecutionInfo, zoom?: number) {
  app = mount(NodeStatusOverlay, {
    target: document.body,
    props: { nodeId: 'n1', executionInfo, zoom }
  });
  return document.querySelector('.node-status-overlay') as HTMLElement | null;
}

describe('NodeStatusOverlay', () => {
  it('draws a labelled pill with the status word', () => {
    const root = render(info({ status: 'failed', lastError: 'Connection timeout' }));
    expect(root?.dataset.status).toBe('failed');
    expect(root?.getAttribute('aria-label')).toContain('Failed');
    expect(root?.querySelector('.flowdrop-ui-status-pill__label')?.textContent).toBe('Failed');
  });

  it('maps interrupted and paused to "Waiting for you", cancelled to skipped', () => {
    expect(render(info({ status: 'interrupted' }))?.dataset.status).toBe('waiting');
    unmount(app!);
    document.body.innerHTML = '';
    expect(render(info({ status: 'paused' }))?.dataset.status).toBe('waiting');
    expect(document.querySelector('.flowdrop-ui-status-pill__label')?.textContent).toBe(
      'Waiting for you'
    );
    unmount(app!);
    document.body.innerHTML = '';
    expect(render(info({ status: 'cancelled' }))?.dataset.status).toBe('skipped');
  });

  it('draws nothing for idle and pending', () => {
    expect(render(info({ status: 'idle', executionCount: 0 }))).toBeNull();
    unmount(app!);
    expect(render(info({ status: 'pending' }))).toBeNull();
  });

  it('shows the count only when above 1, from the job history when known', () => {
    render(info({ executionCount: 1 }));
    expect(document.querySelector('.flowdrop-ui-status-pill__count')).toBeNull();
    unmount(app!);
    document.body.innerHTML = '';
    render(info({ executionCount: 3 }));
    expect(document.querySelector('.flowdrop-ui-status-pill__count')?.textContent).toBe('3');
  });

  it('counter-scales the pill against the zoom, clamped to 2.2', () => {
    render(info({}), 0.5);
    expect(document.querySelector<HTMLElement>('.flowdrop-ui-status-pill')?.style.transform).toBe(
      'scale(2)'
    );
    unmount(app!);
    document.body.innerHTML = '';
    render(info({}), 0.4);
    expect(document.querySelector<HTMLElement>('.flowdrop-ui-status-pill')?.style.transform).toBe(
      'scale(2.2)'
    );
  });

  it('hover text is the count and the last error line, with no timing', () => {
    render(
      info({
        status: 'failed',
        executionCount: 3,
        lastError: 'Connection timeout\nstack line',
        lastExecutionDuration: 30000,
        lastExecuted: new Date().toISOString()
      })
    );
    const hover = document.querySelector<HTMLElement>('.node-status-overlay__pill')!.title;
    expect(hover).toBe('Failed\n3 runs\nConnection timeout');
  });

  it('below 35% zoom: outline and a count badge instead of the pill', () => {
    render(info({ status: 'failed', executionCount: 4 }), 0.3);
    expect(document.querySelector('.flowdrop-ui-status-pill')).toBeNull();
    expect(document.querySelector('.node-status-overlay__outline')).not.toBeNull();
    expect(document.querySelector('.node-status-overlay__badge')?.textContent?.trim()).toBe('4');
  });

  it('at exactly 35% the pill is still drawn', () => {
    render(info({}), 0.35);
    expect(document.querySelector('.flowdrop-ui-status-pill')).not.toBeNull();
  });
});
