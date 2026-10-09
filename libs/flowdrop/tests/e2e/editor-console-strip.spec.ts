/**
 * E2E Test: the Console toggle is a strip along the canvas's bottom edge, and
 * the left column keeps a width per tab.
 */
import { test, expect } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

test.describe('Console strip', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('the strip toggles the Console and carries aria-expanded / aria-controls', async ({
    page
  }) => {
    await gotoEditor(page);
    const strip = page.getByTestId('console-strip');
    await expect(strip).toHaveAttribute('aria-expanded', 'false');
    // The old toggle in the Edit | Test group is gone.
    await expect(
      page.locator('.flowdrop-canvas-toolbar button[aria-label*="Console"]')
    ).toHaveCount(0);

    await strip.click();
    await expect(strip).toHaveAttribute('aria-expanded', 'true');
    const controls = await strip.getAttribute('aria-controls');
    await expect(page.locator(`[id="${controls}"]`)).toBeVisible();
    // No second close button on the panel.
    await expect(page.getByRole('button', { name: 'Close console' })).toHaveCount(0);

    await page.keyboard.press('`');
    await expect(strip).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('`');
    await expect(strip).toHaveAttribute('aria-expanded', 'true');
  });

  test('the empty state offers runnable examples', async ({ page }) => {
    await gotoEditor(page);
    await page.getByTestId('console-strip').click();
    const examples = page.getByTestId('console-examples');
    await expect(examples.getByRole('button')).toHaveCount(3);
    await examples.getByRole('button', { name: /list nodes/ }).click();
    await expect(page.locator('.command-console')).toContainText('> list nodes');
    await expect(examples).toHaveCount(0);
  });

  test('the panel height is saved', async ({ page }) => {
    await gotoEditor(page);
    await page.getByTestId('console-strip').click();
    const divider = page.locator('.flowdrop-main-layout__divider--bottom');
    await expect(divider).toHaveAttribute('aria-valuenow', '220');
    await divider.focus();
    await page.keyboard.press('Shift+ArrowUp');
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem('flowdrop-settings') ?? '{}').ui.consoleHeight
    );
    expect(saved).toBe(270);
  });
});

test.describe('Left column width', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('each tab keeps its own width, and it survives a reload', async ({ page }) => {
    await gotoEditor(page);
    const divider = page.locator('.flowdrop-main-layout__divider--left');
    await expect(divider).toHaveAttribute('aria-valuenow', '280');

    await divider.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(divider).toHaveAttribute('aria-valuenow', '330');

    await page.getByRole('tab', { name: 'AI Assistant' }).click();
    await expect(divider).toHaveAttribute('aria-valuenow', '380');
    await page.getByRole('tab', { name: 'Nodes' }).click();
    await expect(divider).toHaveAttribute('aria-valuenow', '330');

    await page.reload();
    await page.waitForSelector('.flowdrop-editor-main');
    await expect(divider).toHaveAttribute('aria-valuenow', '330');
  });
});
