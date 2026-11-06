/**
 * E2E Test: Editor lock
 *
 * A host can lock the editor (`lock`): the workflow turns read-only, a banner
 * lists why and offers actions, and pressing an action reaches the host. The
 * test page answers like a real host: it records each pressed action on
 * `window.__lockActions` and removes the lock on "edit".
 */

import { test, expect, type Page } from '@playwright/test';
import {
  assertStatusBar,
  selectNode,
  waitForEditor,
  waitForSidebar
} from './helpers/editor-helpers';

async function gotoLocked(page: Page): Promise<void> {
  await page.goto('/test/editor?lock=1');
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await waitForEditor(page);
  await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
  await waitForSidebar(page);
}

async function dragFirstNode(page: Page): Promise<void> {
  const box = await page.locator('.svelte-flow__node').first().boundingBox();
  if (!box) throw new Error('node has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + 90, { steps: 8 });
  await page.mouse.up();
}

test.describe('Editor lock', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('a locked editor shows why, refuses edits and blocks Save', async ({ page }) => {
    let saved = false;
    await page.route('**/api/flowdrop/workflows/**', async (route) => {
      if (['PUT', 'POST'].includes(route.request().method())) saved = true;
      await route.continue();
    });
    await gotoLocked(page);

    const banner = page.getByTestId('lock-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Two forms use this workflow.');
    await expect(banner).toContainText('A module provides this workflow.');
    await expect(banner.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      '/admin/flowdrop/workflows/test/usage'
    );

    // Dragging a node does nothing to the workflow. The view may pan under the
    // drag, so what must stay put is where the nodes sit relative to each other.
    const gap = async () => {
      const [a, b] = await Promise.all([
        page.locator('.svelte-flow__node').nth(0).boundingBox(),
        page.locator('.svelte-flow__node').nth(1).boundingBox()
      ]);
      if (!a || !b) throw new Error('node has no box');
      return { dx: Math.round(b.x - a.x), dy: Math.round(b.y - a.y) };
    };
    const gapBefore = await gap();
    await dragFirstNode(page);
    expect(await gap()).toEqual(gapBefore);

    // Deleting a selected node does nothing.
    await selectNode(page, 0);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);
    await assertStatusBar(page, 2, 1);

    // The toolbar that adds and tidies is gone, and Save is disabled.
    const save = page.locator('.flowdrop-navbar__primary-action', { hasText: 'Save' });
    await expect(save).toHaveAttribute('aria-disabled', 'true');
    await expect(save).toBeDisabled();
    await save.click({ force: true });
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+s`);
    await page.waitForTimeout(500);
    expect(saved).toBe(false);
  });

  test('an action reaches the host, and removing the lock restores editing', async ({ page }) => {
    await gotoLocked(page);

    // An action that does not unlock is only reported.
    await page.getByTestId('lock-action-later').click();
    expect(
      await page.evaluate(() => (window as never as { __lockActions: string[] }).__lockActions)
    ).toEqual(['later']);
    await expect(page.getByTestId('lock-banner')).toBeVisible();

    // "Edit" is answered by the host removing the lock.
    await page.getByTestId('lock-action-edit').click();
    await expect(page.getByTestId('lock-banner')).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as never as { __lockActions: string[] }).__lockActions)
    ).toEqual(['later', 'edit']);

    const save = page.locator('.flowdrop-navbar__primary-action', { hasText: 'Save' });
    await expect(save).not.toHaveAttribute('aria-disabled', 'true');

    // Dragging a node moves it again.
    const gapOf = async () => {
      const [x, y] = await Promise.all([
        page.locator('.svelte-flow__node').nth(0).boundingBox(),
        page.locator('.svelte-flow__node').nth(1).boundingBox()
      ]);
      if (!x || !y) throw new Error('node has no box');
      return Math.round(y.x - x.x);
    };
    const gapBefore = await gapOf();
    await dragFirstNode(page);
    expect(Math.abs((await gapOf()) - gapBefore)).toBeGreaterThan(40);
  });
});
