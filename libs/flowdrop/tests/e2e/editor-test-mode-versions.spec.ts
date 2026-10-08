/**
 * E2E Test: Test mode freshness and sessions.
 *
 * The docked Playground lists only the sessions the Playground created, shows
 * a "Saved, new version" divider where the workflow changed, reads "Save &
 * send" while the workflow has unsaved edits (saving first, sending nothing
 * when the save fails) and keeps the conversation through a save. The backend
 * is stubbed at the network edge; the test page serves the `sessions` endpoint
 * group (`?sessions=1`), as a FlowDrop 2.7.0 server does.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openNodeConfig, waitForEditor, waitForSidebar } from './helpers/editor-helpers';

const WORKFLOW_ID = 'test-workflow-simple';

const session = (id: string, name: string, marked: boolean) => ({
  id,
  workflowId: WORKFLOW_ID,
  name,
  status: 'idle',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  thirdPartySettings: marked ? { flowdrop_playground: { created: true } } : {}
});

const message = (id: string, seq: number, role: 'user' | 'assistant', run: string) => ({
  id,
  sessionId: 'sess-a',
  role,
  content: `${role} ${seq}`,
  timestamp: `2026-01-01T00:00:0${seq}Z`,
  sequenceNumber: seq,
  executionId: run
});

const json = (data: unknown, extra: Record<string, unknown> = {}) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data, ...extra })
});

interface Backend {
  /** What the stub saw, in order: 'save', 'turn'. */
  log: string[];
  /** The save is refused from now on. */
  failSaves: () => void;
  /** The runs endpoint answers 404, as an older server does. */
  withoutRuns: () => void;
}

async function stubBackend(page: Page): Promise<Backend> {
  const log: string[] = [];
  let version = 'v2';
  let saveFails = false;
  let hasRuns = true;

  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/flowdrop', '');
    const method = request.method();

    if (path === `/workflows/${WORKFLOW_ID}/playground/sessions` && method === 'GET') {
      return route.fulfill(
        json([session('sess-a', 'Marked session', true), session('sess-b', 'Other session', false)])
      );
    }
    if (path === `/workflows/${WORKFLOW_ID}` && method === 'PUT') {
      if (saveFails) {
        return route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'The workflow is invalid' })
        });
      }
      log.push('save');
      version = 'v3';
      return route.fulfill(json({ id: WORKFLOW_ID }));
    }
    if (path === '/sessions/sess-a' && method === 'GET') {
      return route.fulfill(json(session('sess-a', 'Marked session', true)));
    }
    if (path === '/sessions/sess-a/messages' && method === 'GET') {
      const polling = url.searchParams.has('since');
      return route.fulfill(
        json(
          polling
            ? []
            : [
                message('m1', 1, 'user', 'run-1'),
                message('m2', 2, 'assistant', 'run-1'),
                message('m3', 3, 'user', 'run-2'),
                message('m4', 4, 'assistant', 'run-2')
              ],
          { hasMore: false, sessionStatus: 'idle' }
        )
      );
    }
    if (path === '/sessions/sess-a/runs' && method === 'GET') {
      if (!hasRuns) return route.fulfill({ status: 404, body: '{}' });
      const run = (id: string, workflowVersion: string) => ({
        id,
        startedAt: null,
        completedAt: null,
        status: 'completed',
        workflowVersion,
        message: null,
        inputs: {},
        inputsTruncated: false
      });
      return route.fulfill(
        json({ workflowVersion: version, runs: [run('run-1', 'v1'), run('run-2', 'v2')] })
      );
    }
    if (path === '/sessions/sess-a/turn' && method === 'POST') {
      log.push('turn');
      return route.fulfill(
        json({ sessionId: 'sess-a', userMessageId: 5, pipelineId: 'run-3', status: 'running' })
      );
    }
    return route.fallback();
  });

  return {
    log,
    failSaves: () => (saveFails = true),
    withoutRuns: () => (hasRuns = false)
  };
}

async function gotoTestMode(page: Page): Promise<void> {
  await page.goto('/test/editor?sessions=1');
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await waitForEditor(page);
  await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
  await waitForSidebar(page);
  await page
    .getByRole('group', { name: 'Editor mode' })
    .getByRole('button', { name: 'Test' })
    .click();
  await expect(page.getByTestId('docked-playground')).toBeVisible();
}

/** Open the history chip and pick a session. */
async function openSession(page: Page, name: string): Promise<void> {
  await page.getByTestId('playground-history').click();
  await page.getByRole('menuitemradio', { name }).click();
  await expect(page.getByTestId('playground-history')).toContainText(name);
}

/** Edit a node's config, so the workflow has unsaved edits, and go back to the Playground. */
async function makeAnEdit(page: Page): Promise<void> {
  await openNodeConfig(page, 0);
  const field = page.locator('.config-form input#defaultValue');
  await field.click();
  await field.press('End');
  await field.pressSequentially(' edited');
  await field.blur();
}

const dock = (page: Page) => page.getByTestId('docked-playground');
const sendButton = (page: Page) => dock(page).locator('.chat-input__send-btn');

test.describe('Test mode: sessions and freshness', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('the history lists only sessions the Playground created', async ({ page }) => {
    await stubBackend(page);
    await gotoTestMode(page);

    await page.getByTestId('playground-history').click();

    await expect(page.getByRole('menuitemradio', { name: 'Marked session' })).toBeVisible();
    await expect(page.getByRole('menuitemradio', { name: 'Other session' })).toHaveCount(0);
  });

  test('a conversation loaded from the server shows a divider where the version changed', async ({
    page
  }) => {
    await stubBackend(page);
    await gotoTestMode(page);
    await openSession(page, 'Marked session');

    const dividers = dock(page).getByTestId('version-divider');
    await expect(dividers).toHaveCount(1);
    await expect(dividers).toContainText('Saved — new version');
    // Between the first run's answer and the second run's question.
    const order = await dock(page)
      .locator('[role="log"] > *')
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          node.getAttribute('data-testid') === 'version-divider' ? 'divider' : 'message'
        )
      );
    expect(order.indexOf('divider')).toBeGreaterThan(0);
    expect(order.indexOf('divider')).toBeLessThan(order.length - 1);
  });

  test('a server without the runs endpoint shows no dividers and no error', async ({ page }) => {
    const backend = await stubBackend(page);
    backend.withoutRuns();
    await gotoTestMode(page);
    await openSession(page, 'Marked session');

    await expect(dock(page).getByText('user 1')).toBeVisible();
    await expect(dock(page).getByTestId('version-divider')).toHaveCount(0);
    await expect(dock(page).locator('.playground__error')).toHaveCount(0);
  });

  test('Send reads Save & send with unsaved edits, saves first, and the conversation survives', async ({
    page
  }) => {
    const backend = await stubBackend(page);
    await gotoTestMode(page);
    await openSession(page, 'Marked session');
    await expect(dock(page).getByTestId('version-divider')).toHaveCount(1);
    await expect(sendButton(page)).toHaveText('Send');

    await makeAnEdit(page);
    await expect(sendButton(page)).toHaveText('Save & send');

    await dock(page).getByPlaceholder('Type your message...').fill('hello');
    await sendButton(page).click();

    await expect.poll(() => backend.log).toEqual(['save', 'turn']);
    // Saved: the button is plain again, the conversation is where it was, and a
    // divider marks the new version below it.
    await expect(sendButton(page)).toHaveText('Send');
    await expect(page.getByTestId('playground-history')).toContainText('Marked session');
    await expect(dock(page).getByText('assistant 4')).toBeVisible();
    await expect(dock(page).getByTestId('version-divider')).toHaveCount(2);
  });

  test('a failed save sends nothing, keeps the text and says why', async ({ page }) => {
    const backend = await stubBackend(page);
    await gotoTestMode(page);
    await openSession(page, 'Marked session');
    await makeAnEdit(page);
    backend.failSaves();

    const input = dock(page).getByPlaceholder('Type your message...');
    await input.fill('hello');
    await sendButton(page).click();

    await expect(dock(page).locator('.playground__error')).toContainText('not saved');
    await expect(input).toHaveValue('hello');
    expect(backend.log).toEqual([]);
    await expect(sendButton(page)).toHaveText('Save & send');
  });
});
