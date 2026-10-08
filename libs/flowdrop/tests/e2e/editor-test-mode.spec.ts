/**
 * E2E Test: Test mode (the Edit | Test switch).
 *
 * Test mode docks the Playground in the left slot, leaves the canvas the rest
 * (a node opens its inspector as a sheet over it), and lets badges follow a run. The backend is stubbed at
 * the network edge: one session, one turn, and a pipeline whose status the
 * test controls.
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

interface Backend {
  /** What the stubbed session reports from now on. */
  setStatus: (status: 'running' | 'completed') => void;
}

async function stubBackend(page: Page): Promise<Backend> {
  let status: 'running' | 'completed' = 'running';
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
          { hasMore: false, sessionStatus: sent ? status : 'idle' }
        )
      );
    }
    if (/\/pipeline\/run-1$/.test(path)) {
      return route.fulfill(
        json({
          jobs: [],
          node_statuses: {
            'node-input': { status, executions: 1 }
          }
        })
      );
    }
    return route.fallback();
  });
  return { setStatus: (next) => (status = next) };
}

const modeSwitch = (page: Page) => page.getByRole('group', { name: 'Editor mode' });
const testButton = (page: Page) => modeSwitch(page).getByRole('button', { name: 'Test' });
const editButton = (page: Page) => modeSwitch(page).getByRole('button', { name: 'Edit' });

async function clickBackground(page: Page): Promise<void> {
  const box = await page.locator('.svelte-flow__pane').boundingBox();
  if (!box) throw new Error('Canvas pane not found');
  await page.mouse.click(box.x + 50, box.y + box.height - 50);
}

test.describe('Test mode', () => {
  let backend: Backend;

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
    backend = await stubBackend(page);
    await gotoEditor(page);
  });

  test('Edit mode at rest is the editor as it was, plus the switch', async ({ page }) => {
    await expect(modeSwitch(page)).toBeVisible();
    await expect(editButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(testButton(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.flowdrop-sidebar')).toBeVisible();
    await expect(page.getByTestId('docked-playground')).toHaveCount(0);
    await expect(page.locator('.config-panel')).toHaveCount(0);
    await expect(page.getByTestId('test-run-dot')).toHaveCount(0);
  });

  test('Test docks the Playground on the left and leaves the canvas the rest', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await testButton(page).click();

    const dock = page.getByTestId('docked-playground');
    await expect(dock).toBeVisible();
    // Where the node library was: left of the canvas.
    const dockBox = await dock.boundingBox();
    const paneBox = await page.locator('.svelte-flow__pane').boundingBox();
    expect(dockBox && paneBox && dockBox.x + dockBox.width <= paneBox.x + 1).toBe(true);
    // Compact: no 760px minimum.
    expect(dockBox!.width).toBeLessThan(500);
    await expect(page.locator('.flowdrop-sidebar')).toHaveCount(0);

    // With nothing selected there is no right column and no inspector: the
    // canvas takes the width.
    await expect(page.locator('.flowdrop-main-layout__sidebar--right')).toHaveCount(0);
    await expect(page.getByTestId('inspector-sheet')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Interface' })).toHaveCount(0);
    expect(paneBox!.width).toBeGreaterThanOrEqual(1060);

    // The chat box is the Playground's own.
    await expect(dock.getByPlaceholder('Type your message...')).toBeVisible();
  });

  test('clicking a node opens its sheet on Last run over the canvas; Esc or the pane closes it', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await testButton(page).click();
    const pane = page.locator('.svelte-flow__pane');
    const before = await pane.boundingBox();
    const sheet = page.getByTestId('inspector-sheet');
    await expect(sheet).toHaveCount(0);

    await page.locator('.svelte-flow__node').first().click({ force: true });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Text Input');
    await expect(sheet).toHaveAccessibleName(/Text Input/);
    await expect(sheet.getByRole('tab', { name: 'Last run' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    // An overlay, not a column: 360px wide, flush right, and the canvas did not reflow.
    const box = await sheet.boundingBox();
    expect(Math.round(box!.width)).toBe(360);
    expect(Math.round(box!.x + box!.width)).toBe(1440);
    expect((await pane.boundingBox())!.width).toBe(before!.width);
    await expect(page.locator('.flowdrop-main-layout__sidebar--right')).toHaveCount(0);

    // Another node switches the sheet to it; it stays open.
    // (It may lie under the sheet, so the click is dispatched on the node itself.)
    await page.locator('.svelte-flow__node').nth(1).dispatchEvent('click');
    await expect(sheet).toBeVisible();
    await expect(sheet).not.toContainText('Text Input');

    // Esc closes it...
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);

    // ...and so does a click on empty canvas.
    await page.locator('.svelte-flow__node').first().click({ force: true });
    await expect(sheet).toBeVisible();
    await clickBackground(page);
    await expect(sheet).toHaveCount(0);

    // Its close button too.
    await page.locator('.svelte-flow__node').first().click({ force: true });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Close panel' }).click();
    await expect(sheet).toHaveCount(0);
  });

  test('Esc typed in a field of the sheet does not close it', async ({ page }) => {
    await testButton(page).click();
    const sheet = page.getByTestId('inspector-sheet');
    await page.locator('.svelte-flow__node').first().click({ force: true });
    await sheet.getByRole('tab', { name: 'Config' }).click();
    const field = sheet.locator('input[type="text"], textarea').first();
    await field.focus();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeVisible();
  });

  test('double-clicking a node still opens its sheet, and keeps it open', async ({ page }) => {
    await testButton(page).click();
    const sheet = page.getByTestId('inspector-sheet');
    await page.locator('.svelte-flow__node').first().dblclick({ force: true });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Text Input');
  });

  test('dragging a node does not open the sheet', async ({ page }) => {
    await testButton(page).click();
    const box = await page.locator('.svelte-flow__node').first().boundingBox();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 40, y + 40, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByTestId('inspector-sheet')).toHaveCount(0);
  });

  test('a Console placed in the sidebar opens at the bottom in Test mode, with no right column', async ({
    page
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'flowdrop-settings',
        JSON.stringify({ ui: { consoleOpen: false, consolePlacement: 'sidebar' } })
      );
    });
    await page.goto('/test/editor?editorMode=test');
    await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
    await expect(page.getByTestId('docked-playground')).toBeVisible();
    await expect(page.locator('.command-console')).toHaveCount(0);

    await page.locator('.svelte-flow__pane').click({ position: { x: 300, y: 300 } });
    await page.keyboard.press('`');
    await expect(page.locator('.command-console')).toBeVisible();
    await expect(page.locator('.flowdrop-main-layout__sidebar--right')).toHaveCount(0);
  });

  test('N opens the node library as a popover; Esc closes it and stays in Test mode', async ({
    page
  }) => {
    // N does nothing in Edit mode, where the library is the sidebar.
    await clickBackground(page);
    await page.keyboard.press('n');
    await expect(page.getByTestId('node-library-popover')).toHaveCount(0);

    await testButton(page).click();
    await page.keyboard.press('n');
    const popover = page.getByTestId('node-library-popover');
    await expect(popover).toBeVisible();
    await expect(popover.getByPlaceholder('Search components')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(popover).toHaveCount(0);
    await expect(testButton(page)).toHaveAttribute('aria-pressed', 'true');

    // Typing an n in the search box searches; it does not toggle the popover.
    await clickBackground(page);
    await page.keyboard.press('N');
    await expect(popover).toBeVisible();
    await popover.getByPlaceholder('Search components').fill('calc');
    await expect(popover).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popover).toHaveCount(0);
  });

  test('back to Edit restores the layout of today', async ({ page }) => {
    await testButton(page).click();
    await expect(page.getByTestId('docked-playground')).toBeVisible();
    await page.keyboard.press('n');
    await expect(page.getByTestId('node-library-popover')).toBeVisible();

    await editButton(page).click();
    await expect(page.getByTestId('docked-playground')).toHaveCount(0);
    await expect(page.getByTestId('node-library-popover')).toHaveCount(0);
    await expect(page.locator('.flowdrop-sidebar')).toBeVisible();
    await expect(page.locator('.config-panel')).toHaveCount(0);
  });

  test('badges follow a live run, and the dot marks it from Edit mode until it ends', async ({
    page
  }) => {
    await testButton(page).click();
    const dock = page.getByTestId('docked-playground');
    await dock.getByPlaceholder('Type your message...').fill('hi');
    await dock.getByPlaceholder('Type your message...').press('Enter');

    // Test mode: the node shows the run's status.
    const badge = page.locator('.svelte-flow__node').first().locator('.node-status-overlay');
    await expect(badge).toBeVisible({ timeout: 10000 });
    const bordered = page.locator('.universal-node--status-border');
    await expect(bordered.first()).toBeVisible();

    // Edit mode, run still going: a dot on Test, the pill stays, the border does not take its colour.
    await editButton(page).click();
    await expect(page.getByTestId('test-run-dot')).toBeVisible();
    await expect(badge).toBeVisible();
    await expect(bordered).toHaveCount(0);

    // The run ends: the dot and the badges go, Edit mode is at rest again.
    backend.setStatus('completed');
    await expect(page.getByTestId('test-run-dot')).toHaveCount(0, { timeout: 10000 });
    await expect(badge).toHaveCount(0);

    // Back in Test mode the finished run's badges are shown again.
    await testButton(page).click();
    await expect(badge).toBeVisible({ timeout: 10000 });
  });

  test('the editorMode prop starts the editor in Test mode', async ({ page }) => {
    await page.goto('/test/editor?editorMode=test');
    await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
    await expect(page.getByTestId('docked-playground')).toBeVisible();
    await expect(testButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('inspector-sheet')).toHaveCount(0);
    await editButton(page).click();
    await expect(page.locator('.flowdrop-sidebar')).toBeVisible();
  });

  test('a read-only editor has no Test switch', async ({ page }) => {
    await page.goto('/test/editor?mode=readonly&editorMode=test');
    await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
    await expect(modeSwitch(page)).toHaveCount(0);
    await expect(page.getByTestId('docked-playground')).toHaveCount(0);
  });

  for (const width of [1000, 740]) {
    test(`at ${width}px the Playground is a drawer and a node's sheet overlays the canvas`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await testButton(page).click();
      const drawer = page.getByTestId('test-drawer');
      await expect(drawer).toBeVisible();
      await expect(page.locator('.flowdrop-main-layout__sidebar--right')).toHaveCount(0);

      // The drawer covers the canvas's left edge: put it away to reach a node.
      await page.getByRole('button', { name: 'Hide Playground' }).click();
      await expect(drawer).toBeHidden();
      await page.locator('.svelte-flow__node').first().click({ force: true });
      const sheet = page.getByTestId('inspector-sheet');
      await expect(sheet).toBeVisible();
      const box = await sheet.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
    });
  }
});
