/**
 * E2E - navbar gear menu: Appearance (colour scheme) + the host colour scheme.
 *
 * The gear opens a menu: an Appearance switch, a hint, then "All settings…".
 * The scheme is data-theme on the editor's scope element, never on <html>.
 * `?hostScheme=light|dark|auto&hostLabel=…` on the test route simulates a host
 * that passes the `colorScheme.host` mount option.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';

const STORAGE_KEY = 'flowdrop-settings';

const root = (page: Page): Locator => page.locator('.flowdrop-root').first();
const gear = (page: Page): Locator =>
  page.getByTestId('editor-test').locator('.flowdrop-navbar__settings-btn');
const switchOf = (page: Page): Locator => page.getByTestId('navbar-appearance');
const choice = (page: Page, name: string): Locator =>
  switchOf(page).getByRole('menuitemradio', { name, exact: true });

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`/test/editor${query}`);
  await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
  // data-theme is applied on hydration
  await expect(root(page)).toHaveAttribute('data-theme', /light|dark/);
}

async function openMenu(page: Page): Promise<void> {
  await gear(page).click();
  await expect(switchOf(page)).toBeVisible();
}

test.describe('Appearance menu', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('the gear is a menu with Appearance and All settings', async ({ page }) => {
    await open(page);
    await openMenu(page);

    await expect(page.getByRole('menu', { name: 'Settings' })).toBeVisible();
    await expect(choice(page, 'Light')).toBeVisible();
    await expect(choice(page, 'Dark')).toBeVisible();
    await expect(choice(page, 'System')).toBeVisible();
    await expect(page.getByTestId('navbar-all-settings')).toContainText('All settings…');
    // Without a host scheme there is no fourth choice
    await expect(switchOf(page).getByRole('menuitemradio')).toHaveCount(3);
  });

  test('picking Dark sets data-theme on the editor, not on <html>, and survives a reload', async ({
    page
  }) => {
    await open(page);
    await openMenu(page);
    await choice(page, 'Dark').click();

    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    expect(await page.locator('html').getAttribute('data-theme')).toBeNull();
    await expect(choice(page, 'Dark')).toHaveAttribute('aria-checked', 'true');

    await page.reload();
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  });

  test('All settings opens the dialog, and so does Ctrl+,', async ({ page }) => {
    await open(page);
    await openMenu(page);
    await page.getByTestId('navbar-all-settings').click();
    await expect(page.locator('.flowdrop-settings-modal[open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.flowdrop-settings-modal[open]')).toHaveCount(0);

    await page.keyboard.press('Control+,');
    await expect(page.locator('.flowdrop-settings-modal[open]')).toBeVisible();
  });

  test('keyboard: the gear opens on Enter, arrows walk the choices, Escape closes', async ({
    page
  }) => {
    await open(page);
    await gear(page).focus();
    await page.keyboard.press('Enter');
    await expect(switchOf(page)).toBeVisible();
    await expect(choice(page, 'Light')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(choice(page, 'Dark')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('Escape');
    await expect(switchOf(page)).toHaveCount(0);
    await expect(gear(page)).toBeFocused();
  });
});

test.describe('Host colour scheme', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('is the default and follows the host value, with its label and a hint', async ({ page }) => {
    await open(page, '?hostScheme=dark&hostLabel=Match%20host');
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');

    await openMenu(page);
    await expect(switchOf(page).getByRole('menuitemradio')).toHaveText([
      'Match host',
      'Light',
      'Dark'
    ]);
    await expect(choice(page, 'Match host')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('navbar-appearance-hint')).toHaveText(
      'Match host · currently Dark'
    );
  });

  test('an explicit Light overrides the host and sticks across reloads', async ({ page }) => {
    await open(page, '?hostScheme=dark');
    await openMenu(page);
    await choice(page, 'Light').click();
    await expect(root(page)).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(root(page)).toHaveAttribute('data-theme', 'light');
    await openMenu(page);
    await expect(choice(page, 'Light')).toHaveAttribute('aria-checked', 'true');

    // And back to the host
    await choice(page, 'Match host').click();
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  });

  test('live host changes re-resolve while following the host', async ({ page }) => {
    await open(page, '?hostScheme=light');
    await page.evaluate(() =>
      (window as unknown as { __setHostScheme: (v: string) => void }).__setHostScheme('dark')
    );
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  });

  test('a host value of auto follows the operating system', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await open(page, '?hostScheme=auto');
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    await context.close();
  });

  test('a saved auto the user never chose moves to the host; an explicit Light stays', async ({
    page
  }) => {
    await page.addInitScript(
      ([key]) => {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify({ theme: { preference: 'auto' } }));
        }
      },
      [STORAGE_KEY]
    );
    await open(page, '?hostScheme=dark');
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    await openMenu(page);
    await expect(choice(page, 'Match host')).toHaveAttribute('aria-checked', 'true');
  });

  test('the settings dialog offers the same choices', async ({ page }) => {
    await open(page, '?hostScheme=dark&hostLabel=Match%20host');
    await openMenu(page);
    await page.getByTestId('navbar-all-settings').click();
    const modal = page.locator('.flowdrop-settings-modal[open]');
    await expect(modal.getByRole('radio', { name: 'Match host', exact: true })).toBeVisible();
    await expect(modal.getByRole('radio', { name: 'Light', exact: true })).toBeVisible();
    await expect(modal.getByRole('radio', { name: 'Dark', exact: true })).toBeVisible();
    await expect(modal.getByRole('radio', { name: 'System', exact: true })).toHaveCount(0);
  });
});
