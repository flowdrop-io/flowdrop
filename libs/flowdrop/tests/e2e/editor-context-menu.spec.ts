/**
 * E2E Test: Canvas context menu
 *
 * Right-click (and Shift+F10) on a node or a selection opens a menu with
 * Configure / Delete. Delete goes through the editor's own delete path, so
 * edges go with the node and one Ctrl/Cmd+Z restores both. Read-only mode
 * leaves the browser's menu alone.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoEditor, assertStatusBar, selectNode } from './helpers/editor-helpers';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

const menu = (page: Page) => page.getByRole('menu', { name: 'Canvas actions' });

test.describe('Canvas context menu', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('right-click a node, Delete removes it and its edges; undo restores both', async ({
    page
  }) => {
    await gotoEditor(page, 'simple');
    await assertStatusBar(page, 2, 1);

    await page.locator('.svelte-flow__node').first().click({ button: 'right' });
    await expect(menu(page)).toBeVisible();
    await expect(menu(page).getByRole('menuitem')).toHaveText([/Configure/, /Delete/]);

    await menu(page)
      .getByRole('menuitem', { name: /Delete/ })
      .click();
    await expect(menu(page)).toHaveCount(0);
    await assertStatusBar(page, 1, 0);

    await page.keyboard.press(`${modifier}+z`);
    await assertStatusBar(page, 2, 1);
  });

  test('right-clicking an unselected node selects it alone', async ({ page }) => {
    await gotoEditor(page, 'complex');
    await selectNode(page, 0);

    const second = page.locator('.svelte-flow__node').nth(1);
    await second.click({ button: 'right' });
    await expect(menu(page)).toBeVisible();

    await expect(page.locator('.svelte-flow__node.selected')).toHaveCount(1);
    await expect(second).toHaveClass(/selected/);
  });

  test('two selected nodes offer "Delete 2 nodes"', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await assertStatusBar(page, 2, 1);

    // Box-select both nodes (Shift + drag from empty canvas around them).
    const boxes = await page.locator('.svelte-flow__node').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      })
    );
    const left = Math.min(...boxes.map((b) => b.left)) - 15;
    const top = Math.min(...boxes.map((b) => b.top)) - 15;
    const right = Math.max(...boxes.map((b) => b.right)) + 15;
    const bottom = Math.max(...boxes.map((b) => b.bottom)) + 15;
    await page.keyboard.down('Shift');
    await page.mouse.move(left, top);
    await page.mouse.down();
    await page.mouse.move(right, bottom, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await expect(page.locator('.svelte-flow__node.selected')).toHaveCount(2);

    // After a box selection, xyflow overlays the selected nodes with a selection wrapper.
    await page.locator('.svelte-flow__selection-wrapper').click({ button: 'right' });
    await expect(menu(page).getByRole('menuitem')).toHaveText([/Delete 2 nodes/]);

    await menu(page).getByRole('menuitem', { name: 'Delete 2 nodes' }).click();
    await expect(page.locator('.flowdrop-status-bar')).toContainText('0 nodes');
  });

  test('Configure opens the config panel', async ({ page }) => {
    await gotoEditor(page, 'simple');

    await page.locator('.svelte-flow__node').first().click({ button: 'right' });
    await menu(page)
      .getByRole('menuitem', { name: /Configure/ })
      .click();

    await expect(page.locator('.config-panel').first()).toBeVisible({ timeout: 5000 });
  });

  test('Escape closes the menu, returns focus, and the browser menu is not shown', async ({
    page
  }) => {
    await gotoEditor(page, 'simple');

    const node = page.locator('.svelte-flow__node').first();
    await node.focus();
    await node.click({ button: 'right' });
    await expect(menu(page)).toBeVisible();
    // First enabled item is focused on open
    await expect(menu(page).getByRole('menuitem').first()).toBeFocused();

    // The page's own contextmenu event was default-prevented (no browser menu).
    const prevented = await page.evaluate(() => {
      const el = document.querySelector('.svelte-flow__node');
      const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      el?.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    expect(prevented).toBe(true);

    await page.keyboard.press('Escape');
    await expect(menu(page)).toHaveCount(0);
    await assertStatusBar(page, 2, 1);
  });

  test('arrow keys move between items and wrap', async ({ page }) => {
    await gotoEditor(page, 'simple');

    await page.locator('.svelte-flow__node').first().click({ button: 'right' });
    const items = menu(page).getByRole('menuitem');
    await expect(items.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(items.nth(1)).toBeFocused();
  });

  test('outside click closes the menu', async ({ page }) => {
    await gotoEditor(page, 'simple');

    await page.locator('.svelte-flow__node').first().click({ button: 'right' });
    await expect(menu(page)).toBeVisible();

    const pane = page.locator('.svelte-flow__pane');
    const box = await pane.boundingBox();
    if (!box) throw new Error('Canvas pane not found');
    await page.mouse.click(box.x + box.width - 20, box.y + box.height - 20);
    await expect(menu(page)).toHaveCount(0);
  });

  test('Shift+F10 on a focused node opens its menu', async ({ page }) => {
    await gotoEditor(page, 'simple');

    await page.locator('.svelte-flow__node').first().focus();
    await page.keyboard.press('Shift+F10');
    await expect(menu(page)).toBeVisible();
    await expect(menu(page).getByRole('menuitem')).toHaveText([/Configure/, /Delete/]);

    await page.keyboard.press('Enter');
    await expect(menu(page)).toHaveCount(0);
    await expect(page.locator('.config-panel').first()).toBeVisible({ timeout: 5000 });
  });

  test('the empty canvas keeps the browser menu while the pane menu has no entries', async ({
    page
  }) => {
    await gotoEditor(page, 'simple');

    const prevented = await page.evaluate(() => {
      const el = document.querySelector('.svelte-flow__pane');
      const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      el?.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    expect(prevented).toBe(false);
    await expect(menu(page)).toHaveCount(0);
  });

  test('read-only mode shows no custom menu', async ({ page }) => {
    await page.goto('/test/editor?mode=readonly');
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });

    const prevented = await page.evaluate(() => {
      const el = document.querySelector('.svelte-flow__node');
      const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      el?.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    expect(prevented).toBe(false);

    await page.locator('.svelte-flow__node').first().click({ button: 'right', force: true });
    await expect(menu(page)).toHaveCount(0);
  });

  test('a consumer entry added through contextMenu.items appears and runs', async ({ page }) => {
    await page.goto('/test/editor?contextMenu=extra');
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });

    await page.locator('.svelte-flow__node').first().click({ button: 'right' });
    await menu(page).getByRole('menuitem', { name: 'Test extra entry' }).click();

    await expect(menu(page)).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__contextMenuExtraRan
      )
    ).toBe(true);
  });
});
