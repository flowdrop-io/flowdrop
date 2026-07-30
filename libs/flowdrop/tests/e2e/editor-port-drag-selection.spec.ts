/**
 * E2E Test: dragging from a port must not text-select the UI
 *
 * Regression test for #37 (Safari/WebKit): dragging from a node's port handle to
 * draw a connection started a browser text-selection drag. The canvas itself is
 * `user-select: none`, so WebKit anchored the selection at the nearest selectable
 * text outside the canvas (sidebar, toolbar, status bar) and extended it as the
 * pointer moved, painting a selection across the editor.
 *
 * Verified to fail on webkit without the fix and pass with it. Chromium and
 * Firefox never start the gesture, so there the assertion is a guard only.
 */

import { test, expect } from '@playwright/test';
import { gotoEditor, assertStatusBar } from './helpers/editor-helpers';

/** Drag from (x, y) by (dx, dy) and report the text selected mid-drag. */
async function selectionDuringDrag(
  page: import('@playwright/test').Page,
  x: number,
  y: number,
  dx: number,
  dy: number
): Promise<string> {
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 8 });
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  const selection = await page.evaluate(() => window.getSelection()?.toString() ?? '');
  await page.mouse.up();
  await page.keyboard.press('Escape');
  return selection;
}

test.describe('Port drag text selection', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('dragging from a port selects no text', async ({ page }) => {
    await gotoEditor(page, 'complex');

    const handle = page.locator('.svelte-flow__handle.source').first();
    await expect(handle).toBeVisible({ timeout: 10000 });
    const box = await handle.boundingBox();
    if (!box) throw new Error('Source handle has no bounding box');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // Drag past each edge of the canvas — towards the sidebar, the status bar
    // and the toolbar — since those hold the selectable text WebKit reached for.
    for (const [dx, dy] of [
      [-400, 0],
      [0, 400],
      [0, -400]
    ]) {
      expect(await selectionDuringDrag(page, x, y, dx, dy)).toBe('');
    }
  });

  test('port drag still creates a connection', async ({ page }) => {
    await gotoEditor(page, 'disconnected');
    await assertStatusBar(page, 2, 0);

    const source = await page.locator('.svelte-flow__handle.source').first().boundingBox();
    const target = await page.locator('.svelte-flow__handle.target').first().boundingBox();
    if (!source || !target) throw new Error('Handles have no bounding box');

    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
    await page.mouse.up();

    await assertStatusBar(page, 2, 1);
  });
});
