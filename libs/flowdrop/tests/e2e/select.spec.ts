/**
 * E2E: the Select primitive's two renderings, driven by keyboard only.
 *
 * Native (short, flat list) stays the browser's <select>; the grouped, described
 * or long list is the searchable combobox (ARIA 1.2: focus stays on the input,
 * aria-activedescendant names the highlighted option). The editor scope also
 * carries `color-scheme` so native lists follow dark.
 */
import { test, expect, type Page } from '@playwright/test';

/** Focus a combobox and open it; retried because the dev server hydrates after first paint. */
const openByKeyboard = async (page: Page, id: string) => {
  await expect(async () => {
    await page.locator(id).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator(id)).toHaveAttribute('aria-expanded', 'true', { timeout: 500 });
  }).toPass();
};

const goto = async (page: Page, query = '') => {
  await page.goto(`/test/select${query}`);
  await expect(page.getByTestId('select-fixture')).toBeVisible();
};

test.describe('Select', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Fixture is laid out for desktop width');
  });

  test('short flat list is a real <select>, longer or grouped lists are comboboxes', async ({
    page
  }) => {
    await goto(page);
    await expect(page.locator('select#s-native')).toHaveCount(1);
    await expect(page.locator('input#s-grouped')).toHaveAttribute('role', 'combobox');
    await expect(page.locator('input#s-long')).toHaveAttribute('role', 'combobox');
    await expect(page.locator('input#s-forced')).toHaveAttribute('role', 'combobox');
  });

  test('keyboard only: open, filter, move, choose, with focus staying on the input', async ({
    page
  }) => {
    await goto(page);
    await openByKeyboard(page, '#s-grouped');
    const input = page.locator('#s-grouped');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.fd-combobox__list')).toBeVisible();

    await page.keyboard.type('chat');
    await expect(page.locator('.fd-combobox__status')).toHaveText('3 of 5');
    await expect(page.locator('.fd-combobox__option')).toHaveCount(3);
    await expect(page.locator('.fd-combobox__option mark').first()).toHaveText('chat');

    // First match is highlighted; the input still owns focus.
    const activeId = await input.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    await expect(page.locator(`#${activeId}`)).toContainText('chat_message');
    await expect(input).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(
      page.locator(`#${await input.getAttribute('aria-activedescendant')}`)
    ).toContainText('chat_reply');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('grouped-value')).toHaveText('c');
    await expect(input).toHaveValue('chat_message');
  });

  test('Escape closes without choosing; an empty filter says so', async ({ page }) => {
    await goto(page);
    const input = page.locator('#s-long');
    await openByKeyboard(page, '#s-long');
    await expect(page.locator('.fd-combobox__status')).toHaveText('42 of 42');
    await page.keyboard.type('zzz');
    await expect(page.getByText('No matches')).toBeVisible();
    await expect(page.locator('.fd-combobox__status')).toHaveText('0 of 42');
    await page.keyboard.press('Escape');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('long-value')).toHaveText('m3');
  });

  test('Tab leaves the field and closes the list', async ({ page }) => {
    await goto(page);
    await openByKeyboard(page, '#s-long');
    await page.keyboard.press('Tab');
    await expect(page.locator('#s-long')).toHaveAttribute('aria-expanded', 'false');
  });

  test('disabled comboboxes do not open', async ({ page }) => {
    await goto(page);
    await expect(page.locator('#s-disabled-search')).toBeDisabled();
  });

  test('the editor scope sets color-scheme from the resolved theme', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await goto(page, `?scheme=${scheme}`);
      await expect
        .poll(() =>
          page
            .getByTestId('select-fixture')
            .evaluate((el) => getComputedStyle(el).colorScheme.trim())
        )
        .toBe(scheme);
    }
  });
});
