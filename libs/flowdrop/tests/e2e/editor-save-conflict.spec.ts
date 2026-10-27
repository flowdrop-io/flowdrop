/**
 * E2E Test: a save that clashes with someone else's
 *
 * A 409 CONFLICT offers Keep mine, Load theirs and Compare instead of a plain
 * error. Keep mine sends the save again with the server's revision; Compare
 * lists what exists only in the saved version.
 */

import { test, expect } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

test.describe('Save conflict', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('Keep mine sends the save again with the server revision', async ({ page }) => {
    const bodies: Array<Record<string, unknown>> = [];
    let puts = 0;

    await page.route('**/api/flowdrop/workflows/**', async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.continue();
        return;
      }
      puts += 1;
      bodies.push(route.request().postDataJSON());
      if (puts === 1) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Conflict',
            error_code: 'CONFLICT',
            details: { current: '200', sent: '100' }
          })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'test-workflow-simple', revision: '201' }
        })
      });
    });

    await gotoEditor(page, 'simple');
    await page.locator('.flowdrop-navbar__primary-action', { hasText: 'Save' }).click();

    // The test page mounts two toasters (layout and editor), stacked: take the top one (the last).
    await expect(
      page.getByText('Someone saved this workflow after you opened it.').last()
    ).toBeVisible();
    await page.getByRole('button', { name: 'Keep mine' }).last().click();

    await expect.poll(() => puts).toBe(2);
    expect(bodies[1].revision).toBe('200');
  });

  test('Compare lists a step that exists only in the saved version', async ({ page }) => {
    await page.route('**/api/flowdrop/workflows/**', async (route) => {
      const method = route.request().method();
      if (method === 'PUT') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Conflict',
            error_code: 'CONFLICT',
            details: { current: '200', sent: '100' }
          })
        });
        return;
      }
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-workflow-simple',
              name: 'Simple',
              nodes: [
                {
                  id: 'only-saved',
                  type: 'default',
                  position: { x: 0, y: 0 },
                  data: { label: 'Saved only step', config: {}, metadata: {} }
                }
              ],
              edges: [],
              revision: '200'
            }
          })
        });
        return;
      }
      await route.continue();
    });

    await gotoEditor(page, 'simple');
    await page.locator('.flowdrop-navbar__primary-action', { hasText: 'Save' }).click();

    await page.getByRole('button', { name: 'Compare' }).last().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Only in the saved version')).toBeVisible();
    await expect(dialog.getByText('Step "Saved only step"')).toBeVisible();
  });
});
