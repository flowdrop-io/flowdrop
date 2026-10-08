/**
 * E2E Test: the Assistant in Edit mode's left slot, and runs attached to it.
 *
 * Edit mode has a Nodes | Assistant tab strip in the left slot; Test mode has
 * neither the strip nor the Assistant (the inspector rests on the workflow
 * tabs, even when the persisted console tab says chat). A failed run reaches
 * the Assistant from its node's Last run tab, which switches to Edit mode,
 * opens the Assistant and attaches the run; the chat request carries
 * `attachedRunId`. The backend is stubbed at the network edge.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

const RUN_ID = '4711';

const SESSION = {
  id: 'sess-1',
  workflowId: 'test-workflow-simple',
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

interface Backend {
  /** The bodies of the chat requests the stub received. */
  chatRequests: Array<Record<string, unknown>>;
}

async function stubBackend(page: Page, options: { runsEndpoint?: boolean } = {}): Promise<Backend> {
  const chatRequests: Array<Record<string, unknown>> = [];
  let sent = false;
  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/flowdrop', '');
    const method = request.method();

    if (/^\/workflows\/[^/]+\/chat\/messages$/.test(path) && method === 'POST') {
      chatRequests.push(request.postDataJSON());
      return route.fulfill(json({ content: 'I can see the run.', turnId: 't-1', done: true }));
    }
    if (/^\/workflows\/[^/]+$/.test(path) && method === 'PUT') {
      return route.fulfill(json({ id: 'wf-1' }));
    }
    if (/\/workflows\/[^/]+\/playground\/sessions$/.test(path)) {
      // A session the Playground created, for the history (`?sessions=1`).
      const marked = { ...SESSION, thirdPartySettings: { flowdrop_playground: { created: true } } };
      return route.fulfill(method === 'POST' ? json(SESSION) : json([marked]));
    }
    if (path === '/sessions/sess-1' && method === 'GET') {
      return route.fulfill(json(SESSION));
    }
    if (path === '/sessions/sess-1/messages' && method === 'GET') {
      return route.fulfill(json([], { hasMore: false, sessionStatus: 'idle' }));
    }
    if (/\/sessions\/sess-1\/runs$/.test(path)) {
      if (options.runsEndpoint === false) return route.fulfill({ status: 404, body: '' });
      return route.fulfill(
        json({
          workflowVersion: 'v1',
          runs: [
            {
              id: RUN_ID,
              startedAt: '2026-01-01T00:00:01Z',
              completedAt: '2026-01-01T00:00:02Z',
              status: 'failed',
              workflowVersion: 'v1',
              message: 'hi',
              inputs: {},
              inputsTruncated: false
            }
          ]
        })
      );
    }
    if (/\/playground\/sessions\/sess-1\/messages$/.test(path) && method === 'POST') {
      sent = true;
      return route.fulfill(
        json({
          id: 'm1',
          sessionId: 'sess-1',
          role: 'user',
          content: 'hi',
          timestamp: '2026-01-01T00:00:01Z',
          sequenceNumber: 1,
          executionId: RUN_ID
        })
      );
    }
    if (/\/playground\/sessions\/sess-1\/messages$/.test(path)) {
      return route.fulfill(
        json(
          sent
            ? [
                {
                  id: 'm2',
                  sessionId: 'sess-1',
                  role: 'assistant',
                  content: 'Failed',
                  timestamp: '2026-01-01T00:00:02Z',
                  sequenceNumber: 2,
                  executionId: RUN_ID,
                  nodeId: 'node-input',
                  metadata: { nodeLabel: 'Text Input' }
                }
              ]
            : [],
          { hasMore: false, sessionStatus: sent ? 'failed' : 'idle' }
        )
      );
    }
    if (new RegExp(`/pipeline/${RUN_ID}$`).test(path)) {
      return route.fulfill(
        json({
          jobs: [
            {
              id: 'job-1',
              node_id: 'node-input',
              status: 'failed',
              started: '2026-01-01T00:00:01Z',
              completed: '2026-01-01T00:00:02Z',
              error: 'Fetch failed: url has no scheme',
              input_data: { text: 'drupal.org' }
            }
          ],
          node_statuses: { 'node-input': { status: 'failed', executions: 1 } }
        })
      );
    }
    return route.fallback();
  });
  return { chatRequests };
}

const modeSwitch = (page: Page) => page.getByRole('group', { name: 'Editor mode' });
const testButton = (page: Page) => modeSwitch(page).getByRole('button', { name: 'Test' });
const editButton = (page: Page) => modeSwitch(page).getByRole('button', { name: 'Edit' });
const leftTab = (page: Page, name: string) =>
  page.getByTestId('left-slot').getByRole('tab', { name });

async function runAndFail(page: Page): Promise<void> {
  await testButton(page).click();
  const box = page.getByTestId('docked-playground').getByPlaceholder('Type your message...');
  await box.fill('hi');
  await box.press('Enter');
  await expect(page.getByTestId('message-node-link')).toHaveCount(1, { timeout: 10000 });
}

test.describe('Assistant in the left slot', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('Edit mode has Nodes | Assistant; Test mode has neither strip nor Assistant', async ({
    page
  }) => {
    await stubBackend(page);
    await gotoEditor(page);

    await expect(leftTab(page, 'Nodes')).toHaveAttribute('aria-selected', 'true');
    await expect(leftTab(page, 'Assistant')).toBeVisible();
    await leftTab(page, 'Assistant').click();
    await expect(page.getByTestId('assistant-attach')).toBeVisible();
    await leftTab(page, 'Nodes').click();
    await expect(page.locator('.flowdrop-sidebar').first()).toBeVisible();

    await testButton(page).click();
    await expect(page.getByTestId('docked-playground')).toBeVisible();
    await expect(page.getByTestId('assistant-attach')).toBeHidden();
    await expect(page.getByRole('tab', { name: 'Assistant' })).toHaveCount(0);

    // Back in Edit mode the strip is back.
    await editButton(page).click();
    await expect(leftTab(page, 'Nodes')).toBeVisible();
  });

  test('Test mode opens on the inspector even when the console tab was last on chat', async ({
    page
  }) => {
    await stubBackend(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        'flowdrop-settings',
        JSON.stringify({
          ui: { consoleOpen: true, consolePlacement: 'sidebar', bottomPanelTab: 'chat' }
        })
      );
    });
    await page.goto('/test/editor?editorMode=test');
    await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
    await expect(page.getByTestId('docked-playground')).toBeVisible();
    // The right panel is on the workflow tabs, not on a console or the Assistant.
    await expect(page.getByRole('tab', { name: 'Interface' })).toBeVisible();
    await expect(page.getByTestId('assistant-attach')).toBeHidden();
  });

  test('a failed run: Last run → Ask the Assistant → Edit mode, Assistant tab, chip, attachedRunId', async ({
    page
  }) => {
    const backend = await stubBackend(page);
    await gotoEditor(page);
    await runAndFail(page);

    await page.getByTestId('message-node-link').click();
    await expect(page.getByTestId('node-last-run-error')).toContainText('url has no scheme');
    await page.getByTestId('last-run-ask-assistant').click();

    await expect(testButton(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(leftTab(page, 'Assistant')).toHaveAttribute('aria-selected', 'true');
    const chip = page.getByTestId('assistant-run-chip');
    await expect(chip).toBeVisible();
    await expect(chip).toContainText(`Run #${RUN_ID}`);
    await expect(page.getByTestId('assistant-run-chip-status')).toContainText('failed');

    await page.getByPlaceholder('Describe what you want to build...').fill('why did it fail?');
    await page.getByPlaceholder('Describe what you want to build...').press('Enter');
    await expect.poll(() => backend.chatRequests.length, { timeout: 10000 }).toBe(1);
    expect(backend.chatRequests[0].attachedRunId).toBe(RUN_ID);

    // Detaching drops it from the next request.
    await page.getByTestId('assistant-run-detach').click();
    await expect(chip).toHaveCount(0);
    await page.getByPlaceholder('Describe what you want to build...').fill('and now?');
    await page.getByPlaceholder('Describe what you want to build...').press('Enter');
    await expect.poll(() => backend.chatRequests.length, { timeout: 10000 }).toBe(2);
    expect(backend.chatRequests[1]).not.toHaveProperty('attachedRunId');
  });

  /** Test mode on the sessions endpoint group, with the stub's session open. */
  async function openTestSession(page: Page): Promise<void> {
    await page.goto('/test/editor?sessions=1');
    await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
    await testButton(page).click();
    await page.locator('.control-panel__session-chip').click();
    await page.getByRole('menuitem', { name: 'Session 1' }).click();
    await editButton(page).click();
  }

  test('+ Attach a run lists the test session runs', async ({ page }) => {
    const backend = await stubBackend(page);
    await openTestSession(page);

    await leftTab(page, 'Assistant').click();
    await page.getByTestId('assistant-attach-add').click();
    await page
      .getByTestId('assistant-attach-list')
      .getByRole('button', { name: /Run #4711/ })
      .click();
    const chip = page.getByTestId('assistant-run-chip');
    await expect(chip).toContainText(`Run #${RUN_ID}`);
    await expect(page.getByTestId('assistant-run-chip-status')).toContainText('failed');
    expect(backend.chatRequests).toHaveLength(0);
  });

  test('+ Attach a run says so when the server has no runs endpoint', async ({ page }) => {
    await stubBackend(page, { runsEndpoint: false });
    await openTestSession(page);
    await leftTab(page, 'Assistant').click();
    await page.getByTestId('assistant-attach-add').click();
    await expect(page.getByTestId('assistant-attach-empty')).toContainText('does not list runs');
  });
});
