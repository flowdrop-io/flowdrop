/**
 * E2E Test: the docked Playground's header (Test mode).
 *
 * Two controls and nothing else: the history chip (Conversations and the runs
 * of the open one, older-version runs marked) and the ⋯ menu (Expand steps by default,
 * Refresh, Reset, Playground settings). Both are keyboard menus. The backend
 * is stubbed at the network edge; the test page serves the `sessions` endpoint
 * group (`?sessions=1`) and simulates a backend with Playground settings
 * (`?playground=none`).
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { waitForEditor, waitForSidebar } from './helpers/editor-helpers';

const WORKFLOW_ID = 'test-workflow-simple';

const session = (id: string, name: string) => ({
  id,
  workflowId: WORKFLOW_ID,
  name,
  status: 'idle',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  thirdPartySettings: { flowdrop_playground: { created: true } }
});

const json = (data: unknown, extra: Record<string, unknown> = {}) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data, ...extra })
});

interface Backend {
  /** What the stub saw, in order. */
  log: string[];
}

async function stubBackend(page: Page): Promise<Backend> {
  const log: string[] = [];
  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/flowdrop', '');
    const method = request.method();

    if (path === `/workflows/${WORKFLOW_ID}/playground/sessions` && method === 'GET') {
      return route.fulfill(
        json([session('sess-a', 'First chat'), session('sess-b', 'Second chat')])
      );
    }
    if (/^\/sessions\/sess-[ab]$/.test(path) && method === 'GET') {
      return route.fulfill(json(session(path.slice(10), 'First chat')));
    }
    if (/^\/sessions\/sess-[ab]\/messages$/.test(path) && method === 'GET') {
      return route.fulfill(json([], { hasMore: false, sessionStatus: 'idle' }));
    }
    if (path === '/sessions/sess-a/runs' && method === 'GET') {
      const run = (id: string, workflowVersion: string, message: string) => ({
        id,
        startedAt: null,
        completedAt: null,
        status: 'completed',
        workflowVersion,
        message,
        inputs: {},
        inputsTruncated: false
      });
      return route.fulfill(
        json({
          workflowVersion: 'v2',
          runs: [run('run-1', 'v1', 'first question'), run('run-2', 'v2', 'second question')]
        })
      );
    }
    if (path === '/sessions/sess-a/reset' && method === 'POST') {
      log.push('reset');
      return route.fulfill(json({ success: true }));
    }
    return route.fallback();
  });
  return { log };
}

async function gotoTestMode(page: Page, playground: 'none' | 'turn' = 'none'): Promise<void> {
  await page.goto(`/test/editor?sessions=1&playground=${playground}`);
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await waitForEditor(page);
  await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
  await waitForSidebar(page);
  await page
    .getByRole('radiogroup', { name: 'Editor mode' })
    .getByRole('radio', { name: 'Test' })
    .click();
  await expect(page.getByTestId('docked-playground')).toBeVisible();
}

const dock = (page: Page) => page.getByTestId('docked-playground');
const chip = (page: Page) => page.getByTestId('playground-history');
const more = (page: Page) => page.getByTestId('playground-more');

async function openFirstConversation(page: Page): Promise<void> {
  await chip(page).click();
  await page.getByRole('menuitemradio', { name: 'First chat' }).click();
  await expect(chip(page)).toContainText('First chat');
}

test.describe('Test mode: the Playground header', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('has exactly the history chip and the ⋯ menu', async ({ page }) => {
    await stubBackend(page);
    await gotoTestMode(page);

    await expect(dock(page).getByTestId('playground-header').getByRole('button')).toHaveCount(2);
    await expect(chip(page)).toBeVisible();
    await expect(more(page)).toBeVisible();
    // What they replaced is gone from the dock.
    await expect(dock(page).getByRole('button', { name: /^Refresh$/ })).toHaveCount(0);
    await expect(dock(page).getByRole('button', { name: /^Logs$/ })).toHaveCount(0);
    await expect(dock(page).locator('.control-panel__header')).toHaveCount(0);
  });

  test('the chip lists conversations and runs, and marks older-version runs', async ({ page }) => {
    await stubBackend(page);
    await gotoTestMode(page);
    await openFirstConversation(page);

    await chip(page).click();
    const menu = page.getByRole('menu', { name: 'Conversation and run history' });
    await expect(menu.getByTestId('history-conversation')).toHaveCount(2);
    await expect(menu.getByRole('menuitem', { name: /New conversation/ })).toBeVisible();

    const runs = menu.getByTestId('history-run');
    await expect(runs).toHaveCount(2);
    // Newest first; the run that ran on the previous version is marked.
    await expect(runs.nth(0)).toContainText('Run 2');
    await expect(runs.nth(0)).not.toContainText('older version');
    await expect(runs.nth(1)).toContainText('Run 1');
    await expect(runs.nth(1)).toContainText('older version');
  });

  test('picking a run shows it in the chip', async ({ page }) => {
    await stubBackend(page);
    await gotoTestMode(page);
    await openFirstConversation(page);

    await chip(page).click();
    await page.getByTestId('history-run').nth(1).click();

    await expect(chip(page)).toContainText('First chat · #1');
    await chip(page).click();
    await expect(page.getByTestId('history-run').nth(1)).toHaveAttribute('aria-checked', 'true');
  });

  test('the chip is a keyboard menu: arrows move, Escape closes and returns focus', async ({
    page
  }) => {
    await stubBackend(page);
    await gotoTestMode(page);

    await chip(page).focus();
    await page.keyboard.press('ArrowDown');
    const menu = page.getByRole('menu', { name: 'Conversation and run history' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /New conversation/ })).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitemradio').first()).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(menu.getByRole('menuitem', { name: /New conversation/ })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(chip(page)).toBeFocused();
  });

  test('⋯ → Playground settings opens the inspector tab', async ({ page }) => {
    await stubBackend(page);
    await gotoTestMode(page);

    await more(page).click();
    await page.getByRole('menuitem', { name: /Playground settings/ }).click();

    await expect(page.getByTestId('workflow-playground-settings')).toBeVisible();
    // Focus goes back to the button, not lost.
    await expect(page.getByRole('menu', { name: 'More actions' })).toHaveCount(0);
  });

  test('⋯ → Reset stuck session calls /reset on the open conversation', async ({ page }) => {
    const backend = await stubBackend(page);
    await gotoTestMode(page);

    // Nothing to reset before a conversation is open.
    await more(page).click();
    await expect(page.getByRole('menuitem', { name: /Reset stuck session/ })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await openFirstConversation(page);
    await more(page).click();
    await page.getByRole('menuitem', { name: /Reset stuck session/ }).click();

    await expect.poll(() => backend.log).toEqual(['reset']);
  });

  test('⋯ → Expand steps by default toggles, and Escape closes the menu with focus back', async ({
    page
  }) => {
    await stubBackend(page);
    await gotoTestMode(page);

    await more(page).click();
    const steps = page.getByRole('menuitemcheckbox', { name: /Expand steps by default/ });
    await expect(steps).toHaveAttribute('aria-checked', 'false');
    await steps.click();

    await more(page).click();
    await expect(
      page.getByRole('menuitemcheckbox', { name: /Expand steps by default/ })
    ).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'More actions' })).toHaveCount(0);
    await expect(more(page)).toBeFocused();
  });

  test('Ctrl+Enter sends from the composer', async ({ page }) => {
    const sent: string[] = [];
    await stubBackend(page);
    await page.route('**/api/flowdrop/**', async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'POST' && /\/(turn|messages)$/.test(url.pathname)) {
        sent.push(url.pathname);
        return route.fulfill(
          json({ sessionId: 'sess-a', userMessageId: 1, pipelineId: 'run-3', status: 'running' })
        );
      }
      return route.fallback();
    });
    // A workflow with a chat binding (the test page's `turn` marks).
    await gotoTestMode(page, 'turn');
    await openFirstConversation(page);

    const input = dock(page).getByPlaceholder('Type your message...');
    await input.fill('hello');
    await input.press('Control+Enter');

    await expect.poll(() => sent.length).toBeGreaterThan(0);
  });
});
