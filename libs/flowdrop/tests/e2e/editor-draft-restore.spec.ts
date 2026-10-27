/**
 * E2E Test: Draft restore
 *
 * Changes made in the editor are written to a draft. After a reload the
 * editor offers them back: Restore puts them over the workflow.
 */

import { test, expect, type Page } from '@playwright/test';

const nodePositions = (page: Page) =>
  page.evaluate(() => {
    const app = (
      window as unknown as {
        __mountedApp: {
          getWorkflow: () => { nodes: Array<{ id: string; position: { x: number; y: number } }> };
        };
      }
    ).__mountedApp;
    return app.getWorkflow().nodes.map((n) => [n.id, n.position.x, n.position.y]);
  });

test.describe('Draft restore', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('a reload offers the unsaved changes back and Restore brings them', async ({ page }) => {
    await page.goto('/test/mount-app?drafts=1');
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
    await page.waitForFunction(() => '__mountedApp' in window);

    const original = await nodePositions(page);
    await page.evaluate(() =>
      (
        window as unknown as { __mountedApp: { runCommand: (c: string) => Promise<unknown> } }
      ).__mountedApp.runCommand('layout auto')
    );
    const moved = await nodePositions(page);
    expect(moved).not.toEqual(original);

    // Past the auto-save interval, so the draft is in session storage.
    await expect
      .poll(() =>
        page.evaluate(() =>
          Object.keys(sessionStorage).some((key) => key.startsWith('flowdrop:draft:'))
        )
      )
      .toBe(true);

    await page.reload();
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
    await page.waitForFunction(() => '__mountedApp' in window);
    expect(await nodePositions(page)).toEqual(original);

    await expect(page.getByText(/Unsaved changes from/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Restore' }).last().click();
    expect(await nodePositions(page)).toEqual(moved);
  });
});
