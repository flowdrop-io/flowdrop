/**
 * E2E Test: the Edit-mode run bar.
 *
 * A run started from the Console (`session run`) shows the bar at the top of
 * the canvas; Stop stops it; a finished run's bar fades. At rest there is no
 * bar. The backend is stubbed at the network edge, as in
 * editor-console-session.spec.ts.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

const SESSION = {
  id: 'sess-1',
  workflowId: 'wf',
  name: 'Session 1',
  status: 'idle',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

const json = (data: unknown, extra: Record<string, unknown> = {}) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data, ...extra })
});

interface Stub {
  /** Requests the stub saw, by name. */
  seen: { launches: number; stops: number };
  /** The run ends by itself: the session reports completed from now on. */
  finish: () => void;
}

async function stubBackend(page: Page): Promise<Stub> {
  const seen = { launches: 0, stops: 0 };
  let sessionStatus: 'idle' | 'running' | 'completed' = 'idle';
  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/flowdrop', '');
    const method = request.method();

    if (/\/workflows\/[^/]+\/playground\/sessions$/.test(path)) {
      return route.fulfill(method === 'POST' ? json(SESSION) : json([]));
    }
    if (/\/workflow\/[^/]+\/run$/.test(path) && method === 'POST') {
      seen.launches++;
      sessionStatus = 'running';
      return route.fulfill(json({ pipelineId: 'p1', status: 'running' }));
    }
    if (/\/playground\/sessions\/sess-1\/stop$/.test(path) && method === 'POST') {
      seen.stops++;
      sessionStatus = 'idle';
      return route.fulfill(json({}));
    }
    if (/\/playground\/sessions\/sess-1\/messages$/.test(path) && method === 'GET') {
      return route.fulfill(json([], { hasMore: false, sessionStatus }));
    }
    return route.fallback();
  });
  return {
    seen,
    finish: () => {
      sessionStatus = 'completed';
    }
  };
}

async function runInConsole(page: Page, line: string): Promise<void> {
  const input = page.locator('.console-input__field');
  await input.fill(line);
  await input.press('Enter');
}

async function startRun(page: Page): Promise<void> {
  await page.keyboard.press('`');
  await expect(page.locator('.console-input__field')).toBeVisible();
  await runInConsole(page, 'session run');
  await expect(page.locator('.command-console')).toContainText('Run started');
}

test.describe('Run bar', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('there is no bar at rest', async ({ page }) => {
    await stubBackend(page);
    await gotoEditor(page);
    await expect(page.locator('.flowdrop-run-bar')).toHaveCount(0);
  });

  test('session run shows the bar; it reads Done at the end and then fades', async ({ page }) => {
    const stub = await stubBackend(page);
    await gotoEditor(page);
    await startRun(page);

    const bar = page.locator('.flowdrop-run-bar');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText('Running');
    expect(stub.seen.launches).toBe(1);

    stub.finish();
    await expect(bar).toContainText('Done', { timeout: 10000 });
    await expect(bar.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Run finished.' })).toHaveCount(1);

    // Faded out and gone, with the editor back at rest.
    await expect(bar).toHaveCount(0, { timeout: 10000 });
  });

  test('Stop stops the run', async ({ page }) => {
    const stub = await stubBackend(page);
    await gotoEditor(page);
    await startRun(page);

    const stop = page.getByRole('button', { name: 'Stop the run' });
    await expect(stop).toBeVisible();
    await stop.focus();
    await page.keyboard.press('Enter');

    await expect.poll(() => stub.seen.stops).toBe(1);
    await expect(page.locator('.flowdrop-run-bar')).toContainText('Stopped');
    await expect(page.locator('.flowdrop-run-bar')).toHaveCount(0, { timeout: 10000 });
  });

  test('stays inside the canvas, clear of the minimap, at a narrow width', async ({ page }) => {
    await stubBackend(page);
    await page.setViewportSize({ width: 820, height: 700 });
    await gotoEditor(page);
    await startRun(page);

    const bar = await page.locator('.flowdrop-run-bar').boundingBox();
    const canvas = await page.locator('.flowdrop-canvas').boundingBox();
    expect(bar).not.toBeNull();
    expect(canvas).not.toBeNull();
    expect(bar!.x).toBeGreaterThanOrEqual(canvas!.x);
    expect(bar!.x + bar!.width).toBeLessThanOrEqual(canvas!.x + canvas!.width);

    const minimap = await page.locator('.svelte-flow__minimap').boundingBox();
    if (minimap) {
      const overlaps =
        bar!.x < minimap.x + minimap.width &&
        bar!.x + bar!.width > minimap.x &&
        bar!.y < minimap.y + minimap.height &&
        bar!.y + bar!.height > minimap.y;
      expect(overlaps).toBe(false);
    }
  });
});
