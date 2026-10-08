/**
 * E2E Test: white-label navbar branding
 *
 * `branding` replaces the FlowDrop wordmark with a consumer logo (image URL),
 * names it from `logoAlt` (default: the appName message), optionally links it,
 * and clamps it so a wide logo cannot push the 48px navbar into wrapping.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// The test route's own layout renders a first navbar; the editor's is the last one.
const navbar = (page: Page) => page.locator('.flowdrop-app-layout .flowdrop-navbar').last();
const start = (page: Page) => navbar(page).locator('.flowdrop-navbar__start');

async function gotoEditor(page: Page, query: string): Promise<void> {
  await page.goto(`/test/editor?${query}`);
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await navbar(page).waitFor({ timeout: 15000 });
}

test.describe('Navbar branding', () => {
  test('keeps the FlowDrop wordmark, named by appName, without branding', async ({ page }) => {
    await gotoEditor(page, 'workflow=simple');
    const logo = start(page).getByRole('img', { name: 'FlowDrop' });
    await expect(logo).toBeVisible();
    await expect(start(page).locator('.flowdrop-logo--image')).toHaveCount(0);
    await expect(start(page).locator('a')).toHaveCount(0);
    await expect(page).toHaveTitle('FlowDrop - Visual Workflow Manager');
  });

  test('shows the consumer logo with alt text and a link', async ({ page }) => {
    await gotoEditor(page, 'workflow=simple&branding=1');
    const logo = start(page).getByRole('img', { name: 'Acme Studio' });
    await expect(logo).toBeVisible();
    await expect(start(page).locator('svg')).toHaveCount(0);
    const link = start(page).locator('a');
    await expect(link).toHaveAttribute('href', 'https://example.com/acme');
    const box = await logo.boundingBox();
    expect(box?.height).toBeLessThanOrEqual(24);
  });

  test('a very wide logo is clamped and the navbar does not wrap at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    await gotoEditor(page, 'workflow=simple&branding=wide');
    const logo = start(page).locator('.flowdrop-logo--image');
    await expect(logo).toBeVisible();
    const startBox = await start(page).boundingBox();
    const box = await logo.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(startBox!.width);
    const navBox = await navbar(page).boundingBox();
    expect(navBox!.height).toBeLessThanOrEqual(48);
  });
});
