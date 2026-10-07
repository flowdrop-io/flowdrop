/**
 * E2E Test: status badges, hot edges and the `edited` mark.
 *
 * Badges and hot edges follow the shown run: in Test mode always, in Edit mode
 * only while a run goes. The `edited` mark is Test mode only, on nodes that
 * have a last run and whose config changed since the run started. The backend
 * is stubbed at the network edge, as in editor-test-mode.spec.ts.
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

type Status = 'idle' | 'running' | 'completed' | 'failed';

interface Backend {
  /** What the stubbed pipeline reports for each node from now on. */
  setStatuses: (input: Status, output: Status) => void;
  /** Whether pipeline reads fail from now on. */
  failReads: (fail: boolean) => void;
}

async function stubBackend(page: Page): Promise<Backend> {
  let input: Status = 'completed';
  let output: Status = 'running';
  let sent = false;
  let failing = false;
  let session: 'running' | 'completed' = 'running';
  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/flowdrop', '');
    const method = request.method();

    // A run with unsaved edits is "Save & send": the save has to work.
    if (/^\/workflows\/[^/]+$/.test(path) && method === 'PUT') {
      return route.fulfill(json({ id: 'wf-1' }));
    }
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
                {
                  id: 'm2',
                  sessionId: 'sess-1',
                  role: 'assistant',
                  content: 'Working on it',
                  timestamp: '2026-01-01T00:00:02Z',
                  sequenceNumber: 2,
                  executionId: 'run-1'
                }
              ]
            : [],
          { hasMore: false, sessionStatus: sent ? session : 'idle' }
        )
      );
    }
    if (/\/pipeline\/run-1$/.test(path)) {
      if (failing) return route.fulfill({ status: 500, body: 'boom' });
      return route.fulfill(
        json({
          jobs: [],
          node_statuses: {
            'node-input': { status: input, executions: 1 },
            'node-output': { status: output, executions: output === 'idle' ? 0 : 1 }
          }
        })
      );
    }
    return route.fallback();
  });
  return {
    setStatuses: (i, o) => {
      input = i;
      output = o;
      session = o === 'running' ? 'running' : 'completed';
    },
    failReads: (fail) => (failing = fail)
  };
}

const modeSwitch = (page: Page) => page.getByRole('group', { name: 'Editor mode' });
const testButton = (page: Page) => modeSwitch(page).getByRole('button', { name: 'Test' });
const editButton = (page: Page) => modeSwitch(page).getByRole('button', { name: 'Edit' });
const node = (page: Page, id: string) => page.locator(`.svelte-flow__node[data-id="${id}"]`);
const hotEdges = (page: Page) => page.locator('.svelte-flow__edge path.flowdrop-edge--hot');

/**
 * The fixture's own edge uses bare port ids, which xyflow does not draw, so the
 * test draws a real one: output port of Text Input to input port of Text Output.
 */
async function connectNodes(page: Page): Promise<void> {
  const from = page.locator('.svelte-flow__handle[data-handleid="node-input-output-value"]');
  const to = page.locator('.svelte-flow__handle[data-handleid="node-output-input-value"]');
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error('port handles not found');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('.svelte-flow__edge')).toHaveCount(1);
}

async function sendMessage(page: Page): Promise<void> {
  const box = page.getByTestId('docked-playground').getByPlaceholder('Type your message...');
  await box.fill('hi');
  await box.press('Enter');
}

test.describe('Run badges', () => {
  let backend: Backend;

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
    backend = await stubBackend(page);
    await gotoEditor(page);
  });

  test('Edit mode at rest has no badges, no hot edges and no edited marks', async ({ page }) => {
    await expect(page.locator('.node-status-overlay')).toHaveCount(0);
    await expect(hotEdges(page)).toHaveCount(0);
    await expect(page.getByTestId('node-edited')).toHaveCount(0);
  });

  test('a Test mode run shows status-only badges and heats the edge it passed', async ({
    page
  }) => {
    await connectNodes(page);
    await testButton(page).click();
    await sendMessage(page);

    const inputBadge = node(page, 'node-input').locator('.node-status-overlay');
    const outputBadge = node(page, 'node-output').locator('.node-status-overlay');
    await expect(inputBadge).toHaveAttribute('data-status', 'completed', { timeout: 10000 });
    await expect(outputBadge).toHaveAttribute('data-status', 'running');
    // Status only: no label text, no numbers on the canvas.
    await expect(inputBadge).toHaveText('');
    // The source completed and the target is running: the run passed the edge.
    await expect(hotEdges(page)).toHaveCount(1);

    // The target never ran: the edge goes cold, and its badge is gone.
    backend.setStatuses('completed', 'idle');
    await expect(hotEdges(page)).toHaveCount(0, { timeout: 10000 });

    // Both completed: hot again.
    backend.setStatuses('completed', 'completed');
    await expect(hotEdges(page)).toHaveCount(1, { timeout: 10000 });
  });

  test('a failed read keeps the badges on screen', async ({ page }) => {
    await testButton(page).click();
    await sendMessage(page);
    const inputBadge = node(page, 'node-input').locator('.node-status-overlay');
    await expect(inputBadge).toHaveAttribute('data-status', 'completed', { timeout: 10000 });

    backend.failReads(true);
    backend.setStatuses('failed', 'idle');
    // Give the poll a few ticks to hit the failing endpoint.
    await page.waitForTimeout(2500);
    await expect(inputBadge).toHaveAttribute('data-status', 'completed');
  });

  test('editing a node after its run marks it edited, in Test mode only', async ({ page }) => {
    backend.setStatuses('completed', 'completed');
    await testButton(page).click();
    await sendMessage(page);
    await expect(node(page, 'node-input').locator('.node-status-overlay')).toBeVisible({
      timeout: 10000
    });
    await expect(page.getByTestId('node-edited')).toHaveCount(0);

    // Moving a node does not count.
    const box = await node(page, 'node-input').boundingBox();
    if (!box) throw new Error('node not found');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 80, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByTestId('node-edited')).toHaveCount(0);

    // Changing its config does.
    await node(page, 'node-input').dblclick({ force: true });
    const defaultValue = page.locator('.config-form input#defaultValue');
    await defaultValue.click();
    await defaultValue.press('End');
    await defaultValue.pressSequentially('!');
    await defaultValue.blur();
    await expect(node(page, 'node-input').getByTestId('node-edited')).toHaveText('edited');
    await expect(node(page, 'node-output').getByTestId('node-edited')).toHaveCount(0);

    // Edit mode has no marks.
    await editButton(page).click();
    await expect(page.getByTestId('node-edited')).toHaveCount(0);
    await testButton(page).click();
    await expect(node(page, 'node-input').getByTestId('node-edited')).toBeVisible();
  });
});
