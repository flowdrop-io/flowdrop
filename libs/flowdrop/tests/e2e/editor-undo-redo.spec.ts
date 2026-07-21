/**
 * E2E Test: Undo/Redo
 *
 * Tests keyboard shortcuts for undo (Ctrl+Z) and redo (Ctrl+Shift+Z / Ctrl+Y)
 * after performing workflow operations like node deletion.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoEditor, assertStatusBar, selectNode } from './helpers/editor-helpers';

/** Poll the status bar until it reports exactly `expected` nodes. */
async function expectNodeCount(page: Page, expected: number): Promise<void> {
  const statusBar = page.locator('.flowdrop-status-bar');
  await expect(statusBar).toContainText(`${expected} nodes`, { timeout: 5000 });
}

test.describe('Undo/Redo', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('Ctrl+Z undoes node deletion', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Should start with 2 nodes, 1 edge
    await assertStatusBar(page, 2, 1);

    // Select and delete a node
    await selectNode(page, 0);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // Verify deletion happened
    await assertStatusBar(page, 1, 0);

    // Undo with Ctrl/Cmd+Z
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+z`);
    await page.waitForTimeout(1000);

    // Should be restored
    await assertStatusBar(page, 2, 1);
  });

  test('Ctrl+Shift+Z redoes after undo', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Delete a node
    await selectNode(page, 0);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);
    await assertStatusBar(page, 1, 0);

    // Undo
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+z`);
    await page.waitForTimeout(1000);
    await assertStatusBar(page, 2, 1);

    // Redo with Ctrl/Cmd+Shift+Z
    await page.keyboard.press(`${modifier}+Shift+z`);
    await page.waitForTimeout(1000);
    await assertStatusBar(page, 1, 0);
  });

  // Multi-step coverage (issue #39 asked for ≥3 sequential edits end-to-end).
  // The single-change tests above can't catch an off-by-one that only appears
  // after two or more sequential edits. Deletions commit through the editor's
  // post-change `pushHistory` path; the config-edit path (which carried the #39
  // off-by-one) is covered in editor-config.spec.ts. Here we assert three
  // sequential deletions each undo/redo by exactly one committed change.
  test('multi-step undo/redo moves one change at a time', async ({ page }) => {
    await gotoEditor(page, 'complex'); // 4 nodes, 3 edges
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

    await expectNodeCount(page, 4);

    // Three sequential deletions — always delete the first node so indices are
    // simple. Each deletion is one committed history step.
    for (const remaining of [3, 2, 1]) {
      await selectNode(page, 0);
      await page.keyboard.press('Backspace');
      await expectNodeCount(page, remaining);
    }

    // Undo three times: each undo restores exactly one node (never skips a step).
    for (const restored of [2, 3, 4]) {
      await page.keyboard.press(`${modifier}+z`);
      await expectNodeCount(page, restored);
    }

    // Redo three times: each redo re-applies exactly one deletion.
    for (const remaining of [3, 2, 1]) {
      await page.keyboard.press(`${modifier}+Shift+z`);
      await expectNodeCount(page, remaining);
    }
  });

  test('Ctrl+Y also triggers redo', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Delete a node
    await selectNode(page, 0);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);
    await assertStatusBar(page, 1, 0);

    // Undo
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+z`);
    await page.waitForTimeout(1000);
    await assertStatusBar(page, 2, 1);

    // Redo with Ctrl/Cmd+Y
    await page.keyboard.press(`${modifier}+y`);
    await page.waitForTimeout(1000);
    await assertStatusBar(page, 1, 0);
  });
});
