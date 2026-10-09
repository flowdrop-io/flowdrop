/**
 * E2E Test: the navbar's Workflow button and the wordmark menu (G6d).
 *
 * Workflow settings has its own ghost button, pressed while the panel is open;
 * the Save menu holds only tasks, and navigation (dashboard, back to workflows)
 * lives in the wordmark's menu. `?navbarActions=1` supplies consumer actions
 * with two `navigation` entries.
 */

import { test, expect } from '@playwright/test';

async function open(page: import('@playwright/test').Page, query = '') {
  await page.goto(`/test/editor${query}`);
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
}

test.describe('Workflow button and wordmark menu', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('the Workflow button toggles the panel and reads as pressed while it is open', async ({
    page
  }) => {
    await open(page);
    const button = page.getByTestId('navbar-workflow-button');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('workflow-settings-panel')).toHaveCount(0);

    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('workflow-settings-panel')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();

    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('workflow-settings-panel')).toHaveCount(0);
  });

  test('the Save menu holds tasks only; navigation is in the wordmark menu', async ({ page }) => {
    await open(page, '?navbarActions=1');
    const navbar = page.locator('.flowdrop-app-layout .flowdrop-navbar').last();

    await navbar.locator('.flowdrop-navbar__dropdown-trigger').click();
    await expect(page.getByRole('menuitem')).toHaveText([
      'Save and run test',
      'Doctor',
      'Pipelines'
    ]);
    await page.keyboard.press('Escape');

    await navbar.getByTestId('navbar-wordmark-menu').click();
    await expect(page.getByRole('menuitem')).toHaveText([
      'FlowDrop dashboard',
      'Back to workflows'
    ]);
    await expect(page.getByRole('menuitem', { name: 'Back to workflows' })).toHaveAttribute(
      'href',
      '#workflows'
    );
  });
});
