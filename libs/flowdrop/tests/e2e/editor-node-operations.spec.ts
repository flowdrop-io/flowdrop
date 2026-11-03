/**
 * E2E Test: Node Operations
 *
 * Tests adding nodes via drag-and-drop from the sidebar,
 * selecting nodes, and deleting nodes.
 */

import { test, expect } from '@playwright/test';
import {
  gotoEditor,
  getNodeCount,
  assertNodeCount,
  assertStatusBar,
  selectNode
} from './helpers/editor-helpers';

test.describe('Node Operations', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('add node by dragging from sidebar to canvas', async ({ page }) => {
    await gotoEditor(page, 'empty');

    // Verify canvas starts empty
    expect(await getNodeCount(page)).toBe(0);

    // Expand the first category to reveal draggable node items
    const category = page.locator('.flowdrop-details').first();
    await category.locator('summary').click();
    await page.waitForTimeout(300);

    // Find a visible node item in the expanded category
    const nodeItem = page.locator('.flowdrop-node-item:visible').first();
    await expect(nodeItem).toBeVisible({ timeout: 5000 });

    // Find the canvas drop target
    const canvas = page.locator('.svelte-flow__pane');
    await expect(canvas).toBeVisible();

    // Drag the node item to the canvas
    await nodeItem.dragTo(canvas);

    // Wait for the node to appear
    await page.waitForTimeout(1000);

    // Should now have 1 node
    const nodeCount = await getNodeCount(page);
    expect(nodeCount).toBe(1);
  });

  test('click on a palette item adds one node', async ({ page }) => {
    await gotoEditor(page, 'empty');
    expect(await getNodeCount(page)).toBe(0);

    await page.locator('.flowdrop-details').first().locator('summary').click();
    const nodeItem = page.locator('.flowdrop-node-item:visible').first();
    await expect(nodeItem).toBeVisible({ timeout: 5000 });
    await nodeItem.click();

    await assertNodeCount(page, 1);
  });

  test('Enter on a focused palette item adds one node', async ({ page }) => {
    await gotoEditor(page, 'empty');
    expect(await getNodeCount(page)).toBe(0);

    await page.locator('.flowdrop-details').first().locator('summary').click();
    const nodeItem = page.locator('.flowdrop-node-item:visible').first();
    await expect(nodeItem).toBeVisible({ timeout: 5000 });
    await nodeItem.focus();
    await page.keyboard.press('Enter');

    await assertNodeCount(page, 1);
  });

  test('a palette click with a node selected adds the node to its right', async ({ page }) => {
    await gotoEditor(page, 'simple');
    const before = await getNodeCount(page);
    await selectNode(page, 0);
    const selectedBox = await page.locator('.svelte-flow__node.selected').first().boundingBox();
    expect(selectedBox).not.toBeNull();

    await page.locator('.flowdrop-details').first().locator('summary').click();
    const nodeItem = page.locator('.flowdrop-node-item:visible').first();
    await expect(nodeItem).toBeVisible({ timeout: 5000 });
    await nodeItem.click();

    await assertNodeCount(page, before + 1);
    const added = await page.locator('.svelte-flow__node.selected').first().boundingBox();
    expect(added).not.toBeNull();
    expect(added!.x).toBeGreaterThan(selectedBox!.x);
  });

  test('select a node by clicking it', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Click the first node
    const node = page.locator('.svelte-flow__node').first();
    await expect(node).toBeVisible({ timeout: 10000 });
    await node.click();

    // Node should get the selected class
    await expect(node).toHaveClass(/selected/, { timeout: 3000 });
  });

  test('delete selected node with Backspace key', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Should start with 2 nodes
    expect(await getNodeCount(page)).toBe(2);

    // Select the first node
    await selectNode(page, 0);

    // Press Backspace to delete
    await page.keyboard.press('Backspace');

    // Wait for deletion
    await page.waitForTimeout(500);

    // Should now have 1 node
    const remaining = await getNodeCount(page);
    expect(remaining).toBe(1);
  });

  test('deleting a node also removes its connected edges', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Should start with 2 nodes, 1 edge (use status bar for edge count)
    await assertStatusBar(page, 2, 1);

    // Select and delete the first node
    await selectNode(page, 0);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // Should have 1 node and 0 edges
    await assertStatusBar(page, 1, 0);
  });
});
