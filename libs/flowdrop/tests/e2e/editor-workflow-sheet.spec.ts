/**
 * E2E Test: workflow settings as a floating sheet, and Fit View with interface tags.
 *
 * Workflow settings always open as the floating sheet (distinct from node
 * config), in Edit and in Test mode: 420 px by default, resizable from its
 * left edge (360 min, half the canvas or 640 max), the width remembered in
 * `ui.sheetWidths.workflow`. Fit View includes interface tags and leaves the
 * part of the canvas under an open sheet free.
 */

import { test, expect, type Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

test.describe('Workflow settings sheet', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  const sheet = (page: Page) => page.getByTestId('inspector-sheet');
  const resizer = (page: Page) => page.getByTestId('inspector-sheet-resizer');

  test('opens as a 420px sheet in Edit mode, with no docked column', async ({ page }) => {
    await gotoEditor(page);
    await page.getByTestId('navbar-workflow-button').click();
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page)).toHaveAttribute('data-kind', 'workflow');
    await expect(sheet(page).getByTestId('workflow-settings-panel')).toBeVisible();
    await expect(page.locator('.flowdrop-main-layout__sidebar--right')).toHaveCount(0);
    expect((await sheet(page).boundingBox())?.width).toBe(420);
    await expect(page.getByTestId('navbar-workflow-button')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('a node still opens in the placement, and replaces the sheet', async ({ page }) => {
    await gotoEditor(page);
    await page.getByTestId('navbar-workflow-button').click();
    await expect(sheet(page)).toBeVisible();
    await page.locator('.svelte-flow__node').first().dblclick({ force: true });
    await expect(sheet(page)).toHaveCount(0);
    await expect(page.locator('.flowdrop-main-layout__sidebar--right .config-panel')).toBeVisible();
    await expect(page.getByTestId('navbar-workflow-button')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  test('Esc closes it; a click on empty canvas does not (Edit mode)', async ({ page }) => {
    await gotoEditor(page);
    await page.getByTestId('navbar-workflow-button').click();
    await expect(sheet(page)).toBeVisible();

    const box = await page.locator('.svelte-flow__pane').boundingBox();
    if (!box) throw new Error('Canvas pane not found');
    await page.mouse.click(box.x + 60, box.y + box.height - 60);
    await expect(sheet(page)).toBeVisible();

    // Focus on the canvas region (not a field), then Esc.
    await page.getByTestId('inspector-sheet-resizer').focus();
    await page.keyboard.press('Escape');
    await expect(sheet(page)).toHaveCount(0);
    await expect(page.getByTestId('navbar-workflow-button')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  test('resizes from its left edge with the keyboard and remembers the width', async ({ page }) => {
    await gotoEditor(page);
    await page.getByTestId('navbar-workflow-button').click();
    const handle = resizer(page);
    await expect(handle).toHaveAttribute('role', 'separator');
    await expect(handle).toHaveAttribute('aria-valuemin', '360');
    await expect(handle).toHaveAttribute('aria-valuenow', '420');

    await handle.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(handle).toHaveAttribute('aria-valuenow', '452');
    expect((await sheet(page).boundingBox())?.width).toBe(452);

    // Clamped to the floor.
    await page.keyboard.press('Home');
    await expect(handle).toHaveAttribute('aria-valuenow', '360');
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '360');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(handle).toHaveAttribute('aria-valuenow', '408');

    await page.reload();
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
    await page.getByTestId('navbar-workflow-button').click();
    await expect(resizer(page)).toHaveAttribute('aria-valuenow', '408');
    expect((await sheet(page).boundingBox())?.width).toBe(408);
  });

  test('resizes by dragging the left edge, within the clamp', async ({ page }) => {
    await gotoEditor(page);
    await page.getByTestId('navbar-workflow-button').click();
    const edge = await resizer(page).boundingBox();
    if (!edge) throw new Error('resizer missing');
    const y = edge.y + edge.height / 2;
    const x = edge.x + edge.width / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 40, y, { steps: 5 });
    await page.mouse.up();
    await expect(resizer(page)).toHaveAttribute('aria-valuenow', '460');

    // Far past the maximum: capped at min(half the canvas, 640).
    const edge2 = await resizer(page).boundingBox();
    if (!edge2) throw new Error('resizer missing');
    await page.mouse.move(edge2.x + 2, y);
    await page.mouse.down();
    await page.mouse.move(edge2.x - 800, y, { steps: 5 });
    await page.mouse.up();
    const max = Number(await resizer(page).getAttribute('aria-valuemax'));
    expect(max).toBeLessThanOrEqual(640);
    await expect(resizer(page)).toHaveAttribute('aria-valuenow', String(max));
  });

  test('is a sheet in Test mode too, and a pane click does not close it', async ({ page }) => {
    await page.goto('/test/editor?editorMode=test');
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
    await page.getByTestId('navbar-workflow-button').click();
    await expect(sheet(page)).toHaveAttribute('data-kind', 'workflow');
    expect((await sheet(page).boundingBox())?.width).toBe(420);
    const box = await page.locator('.svelte-flow__pane').boundingBox();
    if (!box) throw new Error('Canvas pane not found');
    await page.mouse.click(box.x + 60, box.y + box.height - 60);
    await expect(sheet(page)).toBeVisible();
  });
});

test.describe('Fit View with interface tags', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  /** Every interface tag lies inside the canvas pane (and clear of `rightInset`). */
  async function expectTagsInView(page: Page, rightInset = 0): Promise<void> {
    const pane = await page.locator('.svelte-flow__pane').boundingBox();
    if (!pane) throw new Error('Canvas pane not found');
    const tags = page.getByTestId('interface-tag');
    const count = await tags.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await tags.nth(i).boundingBox();
      if (!box) throw new Error('tag has no box');
      expect(box.x).toBeGreaterThanOrEqual(pane.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(pane.x + pane.width - rightInset + 1);
    }
  }

  test('puts every tag inside the viewport', async ({ page }) => {
    await gotoEditor(page, 'interface');
    // Initial fit (fitViewOnLoad) already includes the tags.
    await page.waitForTimeout(400);
    await expectTagsInView(page);

    // Shift the view away, then press Fit View.
    await page.getByRole('button', { name: /zoom in/i }).click();
    await page.getByRole('button', { name: /zoom in/i }).click();
    await page.getByRole('button', { name: /fit view/i }).click();
    await page.waitForTimeout(500);
    await expectTagsInView(page);
  });

  test('leaves the part under an open sheet free', async ({ page }) => {
    await gotoEditor(page, 'interface');
    await page.getByTestId('navbar-workflow-button').click();
    await expect(page.getByTestId('inspector-sheet')).toBeVisible();
    await page.getByRole('button', { name: /fit view/i }).click();
    await page.waitForTimeout(500);
    const sheetBox = await page.getByTestId('inspector-sheet').boundingBox();
    const pane = await page.locator('.svelte-flow__pane').boundingBox();
    if (!sheetBox || !pane) throw new Error('missing boxes');
    await expectTagsInView(page, pane.x + pane.width - sheetBox.x);
  });
});
