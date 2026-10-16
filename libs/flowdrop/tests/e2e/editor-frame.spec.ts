/**
 * The editor's frame: a 48 px navbar, no status bar, the node count beside the
 * zoom controls, and a 120×72 minimap that hides on a canvas under 800 px.
 */

import { test, expect } from '@playwright/test';
import { gotoEditor, canvasCountLocator } from './helpers/editor-helpers';

test.describe('Editor frame', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('navbar is 48 px tall and the status bar is gone', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoEditor(page, 'simple');

    const navbar = page.locator('.flowdrop-navbar').last();
    expect((await navbar.boundingBox())?.height).toBe(48);
    await expect(page.locator('.flowdrop-status-bar')).toHaveCount(0);
  });

  test('node count sits in the zoom control', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await gotoEditor(page, 'simple');

    const controls = page.locator('.svelte-flow__controls');
    await expect(controls.locator('.fd-zoom-status__count')).toHaveText('2 nodes');
    await expect(canvasCountLocator(page)).toHaveAttribute('title', '2 nodes · 1 connection');
  });

  test('minimap is 120×72 on a wide canvas', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await gotoEditor(page, 'simple');

    const box = await page.locator('.svelte-flow__minimap').boundingBox();
    expect(Math.round(box?.width ?? 0)).toBe(120);
    expect(Math.round(box?.height ?? 0)).toBe(72);
  });

  test('minimap hides when the canvas is under 800 px, and returns when it widens', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await gotoEditor(page, 'simple');
    await expect(page.locator('.svelte-flow__minimap')).toBeVisible();

    // The 320 px sidebar leaves a canvas under 800 px at a 1000 px window.
    await page.setViewportSize({ width: 1000, height: 900 });
    await expect(page.locator('.svelte-flow__minimap')).toHaveCount(0);

    await page.setViewportSize({ width: 1600, height: 900 });
    await expect(page.locator('.svelte-flow__minimap')).toBeVisible();
  });

  test('navbar does not wrap or clip at 768 px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    await gotoEditor(page, 'simple');

    const navbar = page.locator('.flowdrop-navbar').last();
    const box = await navbar.boundingBox();
    expect(box?.height).toBe(48);
    const overflow = await navbar.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await navbar.screenshot({ path: 'test-results/u7-navbar-768.png' });
    await page.screenshot({ path: 'test-results/u7-editor-768.png' });
  });
});
