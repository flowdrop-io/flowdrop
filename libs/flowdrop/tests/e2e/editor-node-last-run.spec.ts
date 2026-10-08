/**
 * E2E Test: message-to-node links and the inspector's Last run tab.
 *
 * In Test mode a reply's "via <node>" label is a link: it selects the node,
 * opens the inspector on Last run and hovering it lights the node. A reply from
 * a node that is no longer in the workflow stays plain. In Edit mode a node's
 * inspector has no tab strip. The backend is stubbed at the network edge.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

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

const reply = (id: string, seq: number, nodeId: string, nodeLabel: string) => ({
  id,
  sessionId: 'sess-1',
  role: 'assistant',
  content: `Answer from ${nodeLabel}`,
  timestamp: `2026-01-01T00:00:0${seq}Z`,
  sequenceNumber: seq,
  executionId: 'run-1',
  nodeId,
  metadata: { nodeLabel }
});

async function stubBackend(page: Page): Promise<void> {
  let sent = false;
  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/flowdrop', '');
    const method = request.method();

    if (/\/workflows\/[^/]+\/playground\/sessions$/.test(path)) {
      return route.fulfill(method === 'POST' ? json(SESSION) : json([]));
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
          executionId: 'run-1'
        })
      );
    }
    if (/\/playground\/sessions\/sess-1\/messages$/.test(path)) {
      return route.fulfill(
        json(
          sent
            ? [
                reply('m2', 2, 'node-input', 'Text Input'),
                reply('m3', 3, 'node-deleted', 'Gone Node')
              ]
            : [],
          { hasMore: false, sessionStatus: sent ? 'completed' : 'idle' }
        )
      );
    }
    if (/\/pipeline\/run-1$/.test(path)) {
      return route.fulfill(
        json({
          jobs: [
            {
              id: 'job-1',
              node_id: 'node-input',
              status: 'completed',
              started: '2026-01-01T00:00:01Z',
              completed: '2026-01-01T00:00:02Z',
              execution_time_us: 1_230_000,
              input_data: { text: 'hello there' },
              output_data: { text: 'HELLO THERE', usage: { input_tokens: 10, output_tokens: 32 } }
            }
          ],
          node_statuses: {
            'node-input': { status: 'completed', executions: 1, execution_time_us: 1_230_000 }
          }
        })
      );
    }
    return route.fallback();
  });
}

const modeSwitch = (page: Page) => page.getByRole('radiogroup', { name: 'Editor mode' });
const testButton = (page: Page) => modeSwitch(page).getByRole('radio', { name: 'Test' });

test.describe('Message links and Last run', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
    await stubBackend(page);
    await gotoEditor(page);
  });

  async function sendOne(page: Page) {
    await testButton(page).click();
    const dock = page.getByTestId('docked-playground');
    await dock.getByPlaceholder('Type your message...').fill('hi');
    await dock.getByPlaceholder('Type your message...').press('Enter');
    return dock;
  }

  test("a reply's node link opens the node on Last run; hovering lights the node", async ({
    page
  }) => {
    const dock = await sendOne(page);
    const link = dock.getByTestId('message-node-link');
    await expect(link).toHaveCount(1, { timeout: 10000 });

    const node = page.locator('.svelte-flow__node[data-id="node-input"]');
    await link.hover();
    await expect(node).toHaveClass(/fd-node-linked/);
    await page.mouse.move(5, 5);
    await expect(node).not.toHaveClass(/fd-node-linked/);

    await link.click();
    await expect(page.locator('.config-panel').first()).toContainText('Text Input');
    await expect(page.getByRole('tab', { name: 'Last run' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByTestId('node-last-run-status')).toHaveText('Completed');
    await expect(page.getByTestId('node-last-run-duration')).toHaveText('1.23s');
    await expect(page.getByTestId('node-last-run-tokens')).toHaveText('42');
    await expect(page.getByTestId('node-last-run-input')).toContainText('hello there');
    await expect(page.getByTestId('node-last-run-output')).toContainText('HELLO THERE');

    // Config is one click away and keeps the form.
    await page.getByRole('tab', { name: 'Config' }).click();
    await expect(page.getByRole('tab', { name: 'Config' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('the node that is open lights its messages', async ({ page }) => {
    const dock = await sendOne(page);
    await expect(dock.getByTestId('message-node-link')).toHaveCount(1, { timeout: 10000 });
    await page.locator('.svelte-flow__node[data-id="node-input"]').click({ force: true });
    await expect(dock.locator('.message-bubble--from-highlighted')).toHaveCount(1);
  });

  test('a reply from a node that is gone stays plain', async ({ page }) => {
    const dock = await sendOne(page);
    await expect(dock.getByText('via Gone Node')).toBeVisible({ timeout: 10000 });
    await expect(dock.getByTestId('message-node-link')).toHaveCount(1);
    await expect(dock.getByRole('button', { name: /Gone Node/ })).toHaveCount(0);
  });

  test('Edit mode shows a node with no tab strip', async ({ page }) => {
    await page.locator('.svelte-flow__node').first().dblclick({ force: true });
    await expect(page.locator('.config-panel').first()).toBeVisible();
    await expect(page.getByTestId('node-inspector-tabs')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Last run' })).toHaveCount(0);
  });

  test('Test mode shows Config | Last run, opening on an empty state for a node that did not run', async ({
    page
  }) => {
    await testButton(page).click();
    await page.locator('.svelte-flow__node').first().click({ force: true });
    await expect(page.getByTestId('node-inspector-tabs')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Last run' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByTestId('node-last-run-empty')).toBeVisible();
  });
});
