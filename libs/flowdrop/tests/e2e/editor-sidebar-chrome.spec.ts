/**
 * E2E: the Edit-mode left panel: header collapse button, expand control on the
 * canvas, "/" focusing the library search, and no totals footer.
 */
import { test, expect } from '@playwright/test';
import { waitForEditor, waitForSidebar } from './helpers/editor-helpers';

test.describe('Edit-mode sidebar chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/editor?theme=graphite');
    await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
    await waitForEditor(page);
    await waitForSidebar(page);
  });

  test('collapse lives in the panel header; the canvas offers expand', async ({ page }) => {
    const slot = page.getByTestId('left-slot');
    await expect(slot).toBeVisible();
    await slot.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(slot).toBeHidden();
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await expect(slot).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveCount(0);
  });

  test('"/" focuses the library search', async ({ page }) => {
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('/');
    await expect(page.locator('input[data-fd-library-search]')).toBeFocused();
  });

  test('the totals footer only appears while a search filters', async ({ page }) => {
    await expect(page.getByText(/Total:/)).toHaveCount(0);
    await page.locator('input[data-fd-library-search]').fill('text');
    await expect(page.getByText(/^\d+ of \d+$/)).toBeVisible();
  });
});
