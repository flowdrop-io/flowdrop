/**
 * E2E Test: the form-first Test mode panel.
 *
 * A workflow with interface inputs and no chat opens on an Inputs card: a
 * blue Run (Cmd/Ctrl+Enter from any field), "Fill from last run" and the
 * session's earlier runs below. With a chat as well, the inputs fold into a
 * row above the composer. The backend is stubbed at the network edge.
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

const json = (data: unknown, extra: Record<string, unknown> = {}) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data, ...extra })
});

const earlierRun = {
  id: 'm-1',
  sessionId: 'sess-1',
  role: 'user',
  content: '',
  timestamp: '2026-01-01T10:00:00Z',
  sequenceNumber: 1,
  metadata: { inputs: { topic: 'dogs' } }
};

/** Turn bodies the page posted, in order. */
async function stubBackend(page: Page): Promise<unknown[]> {
  const turns: unknown[] = [];
  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/flowdrop', '');
    const method = request.method();

    if (/\/workflows\/[^/]+\/playground\/sessions$/.test(path)) {
      return route.fulfill(method === 'POST' ? json(SESSION) : json([]));
    }
    if (/\/playground\/sessions\/sess-1\/messages$/.test(path) && method === 'POST') {
      turns.push(request.postDataJSON());
      return route.fulfill(
        json({ ...earlierRun, id: 'm-2', sequenceNumber: 2, metadata: { inputs: {} } })
      );
    }
    if (/\/playground\/sessions\/sess-1\/messages$/.test(path)) {
      return route.fulfill(json([earlierRun], { hasMore: false, sessionStatus: 'idle' }));
    }
    return route.fallback();
  });
  return turns;
}

async function openTestMode(page: Page, variant: string): Promise<void> {
  await page.goto(`/test/editor?playground=${variant}&editorMode=test`);
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await waitForEditor(page);
  await waitForSidebar(page).catch(() => {});
  await expect(page.getByTestId('docked-playground')).toBeVisible();
}

test.describe('Test mode: form-first inputs', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('Ctrl+Enter runs from a field; Fill from last run refills without running', async ({
    page
  }) => {
    const turns = await stubBackend(page);
    await openTestMode(page, 'form');
    const dock = page.getByTestId('docked-playground');

    // No "Ready to run" state, no resize handle.
    await expect(dock.getByText('Ready to run')).toHaveCount(0);
    await expect(dock.getByRole('separator')).toHaveCount(0);

    const field = dock.getByRole('textbox').first();
    await field.fill('dogs');
    await field.press('Control+Enter');
    await expect.poll(() => turns.length).toBe(1);
    expect(turns[0]).toEqual({ inputs: { topic: 'dogs' } });

    // The turn's message carries its inputs: refill from it, without running.
    await field.fill('cats');
    await dock.getByRole('button', { name: 'Fill from last run' }).click();
    await expect(field).toHaveValue('dogs');
    expect(turns).toHaveLength(1);
  });

  test('chat + form: the inputs fold into a row above the composer', async ({ page }) => {
    await stubBackend(page);
    await openTestMode(page, 'chatform');
    const dock = page.getByTestId('docked-playground');

    const row = dock.getByRole('button', { name: /^Inputs/ });
    await expect(row).toHaveAttribute('aria-expanded', 'false');
    await expect(dock.getByRole('group', { name: 'Inputs' })).toHaveCount(0);

    await row.click();
    await expect(dock.getByRole('group', { name: 'Inputs' })).toBeVisible();
    await expect(dock.getByRole('textbox', { name: /topic/i })).toBeVisible();
    // The composer keeps its own Send.
    await expect(dock.getByRole('button', { name: 'Send message' })).toBeVisible();
  });
});
