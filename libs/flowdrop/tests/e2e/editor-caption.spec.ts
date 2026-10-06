/**
 * E2E Test: Caption node
 *
 * A caption is short high-contrast text edited in place. It is added from the
 * pane context menu (when the node types include a caption), edited with a
 * double-click, Enter or the node menu, and clamps to two lines. A new caption
 * has no undo entry until its first save.
 */

import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { assertStatusBar } from './helpers/editor-helpers';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

const menu = (page: Page) => page.getByRole('menu', { name: 'Canvas actions' });
const editor = (page: Page) => page.getByRole('textbox', { name: 'Caption text' });

async function gotoCaptionEditor(page: Page, query: string): Promise<void> {
  await page.goto(`/test/editor?${query}`);
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await page.waitForSelector('.svelte-flow__pane', { timeout: 15000 });
  await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
  await page.waitForSelector('.flowdrop-details', { timeout: 15000 });
}

/** Right-click an empty spot on the canvas and choose "Add caption". */
async function addCaptionFromMenu(page: Page): Promise<void> {
  const box = await page.locator('.svelte-flow__pane').boundingBox();
  if (!box) throw new Error('Canvas pane not found');
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.8, { button: 'right' });
  await expect(menu(page).getByRole('menuitem')).toHaveText([/Add caption/]);
  await menu(page)
    .getByRole('menuitem', { name: /Add caption/ })
    .click();
  await expect(menu(page)).toHaveCount(0);
  await expect(editor(page)).toBeFocused();
}

function captionNode(page: Page, text: string): Locator {
  return page.locator('.svelte-flow__node').filter({ hasText: text });
}

test.describe('Caption node', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('add from the pane menu, type, Enter: one undo step removes it', async ({ page }) => {
    await gotoCaptionEditor(page, 'caption=1');
    await assertStatusBar(page, 2, 1);

    await addCaptionFromMenu(page);
    await assertStatusBar(page, 3, 1);

    await page.keyboard.type('Inputs');
    await page.keyboard.press('Enter');
    await expect(editor(page)).toHaveCount(0);
    await expect(captionNode(page, 'Inputs')).toBeVisible();
    await assertStatusBar(page, 3, 1);

    // Focus is back on the node wrapper, not lost.
    await expect(page.locator('.svelte-flow__node').last()).toBeFocused();

    await page.keyboard.press(`${modifier}+z`);
    await assertStatusBar(page, 2, 1);
  });

  test('Escape on a new caption leaves no node and no undo step', async ({ page }) => {
    await gotoCaptionEditor(page, 'caption=1');

    // One real history step first: delete a node.
    await page.locator('.svelte-flow__node').first().click();
    await page.keyboard.press('Backspace');
    await assertStatusBar(page, 1, 0);

    await addCaptionFromMenu(page);
    await assertStatusBar(page, 2, 0);
    await page.keyboard.type('never saved');
    await page.keyboard.press('Escape');
    await assertStatusBar(page, 1, 0);

    // The next undo reverts the delete: the cancelled caption added no step.
    await page.keyboard.press(`${modifier}+z`);
    await assertStatusBar(page, 2, 1);
  });

  test('an empty new caption is removed on blur', async ({ page }) => {
    await gotoCaptionEditor(page, 'caption=1');
    await addCaptionFromMenu(page);
    await assertStatusBar(page, 3, 1);

    const box = await page.locator('.svelte-flow__pane').boundingBox();
    if (!box) throw new Error('Canvas pane not found');
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.8);
    await expect(editor(page)).toHaveCount(0);
    await assertStatusBar(page, 2, 1);
  });

  test('the pane menu has no Add caption when the node types have no caption', async ({ page }) => {
    await gotoCaptionEditor(page, '');
    const prevented = await page.evaluate(() => {
      const el = document.querySelector('.svelte-flow__pane');
      const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      el?.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    expect(prevented).toBe(false);
    await expect(menu(page)).toHaveCount(0);
  });

  test('double-click edits an existing caption; Escape restores it', async ({ page }) => {
    await gotoCaptionEditor(page, 'workflow=caption');

    await captionNode(page, 'Inputs').dblclick();
    await expect(editor(page)).toBeFocused();
    await expect(editor(page)).toHaveText('Inputs');
    // The whole text is selected, so typing replaces it.
    await page.keyboard.type('Changed');
    await page.keyboard.press('Escape');

    await expect(editor(page)).toHaveCount(0);
    await expect(captionNode(page, 'Inputs')).toBeVisible();
    await expect(captionNode(page, 'Changed')).toHaveCount(0);
    await expect(page.locator('.config-panel')).toHaveCount(0);
  });

  test('editing an existing caption saves on Enter with one undo step', async ({ page }) => {
    await gotoCaptionEditor(page, 'workflow=caption');

    await captionNode(page, 'Inputs').dblclick();
    await page.keyboard.type('Outputs');
    await page.keyboard.press('Enter');
    await expect(captionNode(page, 'Outputs')).toBeVisible();

    await page.keyboard.press(`${modifier}+z`);
    await expect(captionNode(page, 'Inputs')).toBeVisible();
    await expect(captionNode(page, 'Outputs')).toHaveCount(0);
  });

  test('an emptied existing caption restores its text', async ({ page }) => {
    await gotoCaptionEditor(page, 'workflow=caption');

    await captionNode(page, 'Inputs').dblclick();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter');
    await expect(captionNode(page, 'Inputs')).toBeVisible();
  });

  test('Enter on a focused caption edits it and does not open the config panel', async ({
    page
  }) => {
    await gotoCaptionEditor(page, 'workflow=caption');

    await captionNode(page, 'Inputs').focus();
    await page.keyboard.press('Enter');
    await expect(editor(page)).toBeFocused();
    await expect(page.locator('.config-panel')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(captionNode(page, 'Inputs')).toBeFocused();
  });

  test('the node menu offers Edit text and Delete instead of Configure', async ({ page }) => {
    await gotoCaptionEditor(page, 'workflow=caption');

    await captionNode(page, 'Inputs').click({ button: 'right' });
    await expect(menu(page).getByRole('menuitem')).toHaveText([/Edit text/, /Delete/]);
    await menu(page)
      .getByRole('menuitem', { name: /Edit text/ })
      .click();
    await expect(editor(page)).toBeFocused();
  });

  test('Backspace and arrow keys while typing do not delete or move the node', async ({ page }) => {
    await gotoCaptionEditor(page, 'workflow=caption');
    await assertStatusBar(page, 3, 0);

    const node = page.locator('.svelte-flow__node[data-id="caption-short"]');
    const before = await node.boundingBox();
    await node.dblclick();
    await page.keyboard.type('abc');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Delete');
    // "abc" -> Backspace -> "ab" -> caret before "b" -> Delete -> "a"
    await expect(editor(page)).toHaveText('a');
    await assertStatusBar(page, 3, 0);

    await page.keyboard.press('Enter');
    await expect(node).toContainText('a');
    const after = await node.boundingBox();
    expect(after?.x).toBeCloseTo(before?.x ?? 0, 0);
    expect(after?.y).toBeCloseTo(before?.y ?? 0, 0);
  });

  test('ending an edit after moving the caret does not scroll the canvas area', async ({
    page
  }) => {
    await gotoCaptionEditor(page, 'workflow=caption');

    const node = page.locator('.svelte-flow__node[data-id="caption-short"]');
    const before = await node.boundingBox();
    await node.dblclick();
    await page.keyboard.type('abc');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Escape');
    await expect(node).toBeFocused();

    // WebKit used to scroll the overflowing main area to the orphaned caret.
    const scrollTop = await page.evaluate(() =>
      Math.max(
        0,
        ...Array.from(document.querySelectorAll<HTMLElement>('.flowdrop-main-layout__main')).map(
          (el) => el.scrollTop
        )
      )
    );
    expect(scrollTop).toBe(0);
    const after = await node.boundingBox();
    expect(after?.y).toBeCloseTo(before?.y ?? 0, 0);
  });

  test('arrow keys still move a selected caption when it is not being edited', async ({ page }) => {
    await gotoCaptionEditor(page, 'workflow=caption');

    const node = page.locator('.svelte-flow__node[data-id="caption-short"]');
    await node.click();
    await expect(node).toBeFocused();
    const before = await node.boundingBox();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => (await node.boundingBox())?.x ?? 0)
      .toBeGreaterThan((before?.x ?? 0) + 1);
  });

  test('pasted text and newlines are stored as one clean line', async ({ page }) => {
    await gotoCaptionEditor(page, 'workflow=caption');

    await captionNode(page, 'Inputs').dblclick();
    await page.evaluate(() => {
      const el = document.querySelector('[role="textbox"]') as HTMLElement;
      const data = new DataTransfer();
      data.setData('text/plain', '  one\n\ntwo\tthree  ');
      data.setData('text/html', '<b>bold</b>');
      el.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
      );
    });
    await page.keyboard.press('Enter');
    await expect(captionNode(page, 'one two three')).toBeVisible();
    await expect(page.locator('.svelte-flow__node b')).toHaveCount(0);
  });

  test('widths snap to the grid and long text clamps to two lines with a tooltip', async ({
    page
  }) => {
    await gotoCaptionEditor(page, 'workflow=caption');

    const short = captionNode(page, 'Inputs').locator('.flowdrop-caption-node');
    await expect.poll(() => short.evaluate((el) => (el as HTMLElement).offsetWidth)).toBe(80);
    const shortWidth = await short.evaluate((el) => (el as HTMLElement).offsetWidth);
    expect(shortWidth % 20).toBe(0);
    expect(shortWidth).toBeGreaterThanOrEqual(40);
    expect(await short.evaluate((el) => (el as HTMLElement).offsetHeight)).toBe(40);

    const long = page.locator('.flowdrop-caption-node').filter({ hasText: 'far too long' });
    await expect.poll(() => long.evaluate((el) => (el as HTMLElement).offsetWidth)).toBe(500);
    await expect.poll(() => long.evaluate((el) => (el as HTMLElement).offsetHeight)).toBe(60);
    // The tooltip is decided on hover, when it matters.
    await long.locator('.flowdrop-caption-node__text').hover();
    await expect(long.locator('.flowdrop-caption-node__text')).toHaveAttribute(
      'title',
      /far too long/
    );
  });
});
