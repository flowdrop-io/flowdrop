/**
 * E2E Test: the Console is a terminal surface. Highlighting is presentation
 * only: the panel's text is exactly the plain command output.
 */
import { test, expect } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

const LIST_NODES = [
  'ID           Label        Type       ',
  '-----------  -----------  -----------',
  'node-input   Text Input   text_input ',
  'node-output  Text Output  text_output'
].join('\n');

test.describe('Console terminal surface', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('highlighted output keeps the plain text exactly', async ({ page }) => {
    await gotoEditor(page);
    await page.getByTestId('console-strip').click();
    const input = page.locator('.console-input__field');
    for (const cmd of ['list nodes', 'get node-input', 'get messenger.2']) {
      await input.fill(cmd);
      await input.press('Enter');
    }

    const entries = page.locator('.console-output__entry');
    await expect(entries).toHaveCount(6);
    // Input entries: prompt, then the typed line.
    await expect(entries.nth(0)).toHaveText('> list nodes');
    // Formatted table: byte-for-byte the formatter's output.
    expect(await entries.nth(1).locator('pre').innerText()).toBe(LIST_NODES);
    await expect(entries.nth(3).locator('.console-output__text')).toHaveText(
      'node-input config: defaultValue = "hello", placeholder = "Enter text..."'
    );
    await expect(entries.nth(5).locator('.console-output__text')).toHaveText(
      'Node not found: messenger.2. Nodes in this workflow: node-input, node-output.'
    );

    // ...while roles are present.
    await expect(entries.nth(0).locator('.console-output__tok--verb')).toHaveText('list');
    await expect(entries.nth(1).locator('.console-output__tok--header')).toHaveCount(1);
    await expect(entries.nth(1).locator('.console-output__tok--id')).toHaveCount(2);
    await expect(entries.nth(3).locator('.console-output__tok--string')).toHaveCount(2);
    await expect(entries.nth(5).locator('.console-output__tok--error')).toHaveCount(1);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`the panel body is ink in a ${scheme} app, the strip stays chrome`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await gotoEditor(page);
      await page.getByTestId('console-strip').click();
      const bg = await page
        .locator('.command-console')
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      const [r, g, b] = bg.match(/\d+/g)!.map(Number);
      expect(r + g + b).toBeLessThan(120); // dark ink
      const stripBg = await page
        .getByTestId('console-strip')
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(stripBg).not.toBe(bg);
      const font = await page
        .locator('.console-output')
        .evaluate((el) => getComputedStyle(el).fontFamily);
      expect(font).toMatch(/mono|Menlo|Consolas|monospace/i);
    });
  }

  test('a command after the first gets 8px of space above it', async ({ page }) => {
    await gotoEditor(page);
    await page.getByTestId('console-strip').click();
    const input = page.locator('.console-input__field');
    for (const cmd of ['list nodes', 'list edges']) {
      await input.fill(cmd);
      await input.press('Enter');
    }
    const margins = await page
      .locator('.console-output__entry--input')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).marginTop));
    expect(margins).toEqual(['0px', '8px']);
  });
});
