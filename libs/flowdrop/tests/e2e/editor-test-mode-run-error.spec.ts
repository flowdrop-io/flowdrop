/**
 * E2E Test: a refused Run is reported under the Run button.
 *
 * In Test mode a workflow with an interface form runs from a Run button. When
 * the server refuses the run (a 400 naming the problem), the message belongs
 * next to the button that was clicked, not in a banner above the panel. The
 * backend is stubbed at the network edge.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { waitForEditor, waitForSidebar } from './helpers/editor-helpers';

const WORKFLOW_ID = 'test-workflow-simple';
const SESSION = {
  id: 'sess-1',
  workflowId: WORKFLOW_ID,
  name: 'Session 1',
  status: 'idle',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};
const REFUSAL = 'Input "extra" is not declared by the workflow interface.';

const json = (data: unknown, extra: Record<string, unknown> = {}) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data, ...extra })
});

async function stubBackend(page: Page): Promise<void> {
  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/flowdrop', '');
    const method = request.method();

    if (/\/workflows\/[^/]+\/playground\/sessions$/.test(path)) {
      return route.fulfill(method === 'POST' ? json(SESSION) : json([]));
    }
    if (/\/playground\/sessions\/sess-1\/messages$/.test(path) && method === 'POST') {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: REFUSAL, message: REFUSAL })
      });
    }
    if (/\/playground\/sessions\/sess-1\/messages$/.test(path)) {
      return route.fulfill(json([], { hasMore: false, sessionStatus: 'idle' }));
    }
    return route.fallback();
  });
}

test.describe('Test mode: a refused Run', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
    await stubBackend(page);
    await page.goto('/test/editor?playground=form&editorMode=test');
    await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
    await waitForEditor(page);
    await waitForSidebar(page).catch(() => {});
    await expect(page.getByTestId('docked-playground')).toBeVisible();
  });

  test('missing required inputs are named under Run, and clear when typing', async ({ page }) => {
    const dock = page.getByTestId('docked-playground');
    await dock.getByRole('button', { name: /^Run/ }).click();

    const alert = dock.getByRole('alert').filter({ hasText: 'topic' });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Fill in the required inputs');

    // Under the button, not above the panel.
    const runBox = await dock.getByRole('button', { name: /^Run/ }).boundingBox();
    const alertBox = await alert.boundingBox();
    expect(alertBox!.y).toBeGreaterThan(runBox!.y + runBox!.height - 1);
    await expect(page.locator('.playground__error')).toHaveCount(0);

    await dock.getByRole('textbox').first().fill('cats');
    await expect(alert).toHaveCount(0);
  });

  test('a refusal from the server is shown as is under Run', async ({ page }) => {
    const dock = page.getByTestId('docked-playground');
    await dock.getByRole('textbox').first().fill('cats');
    await dock.getByRole('button', { name: /^Run/ }).click();

    await expect(dock.getByRole('alert').filter({ hasText: REFUSAL })).toBeVisible();
    await expect(page.locator('.playground__error')).toHaveCount(0);
  });
});
