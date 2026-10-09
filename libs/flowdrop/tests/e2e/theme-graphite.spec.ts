/**
 * E2E: the Graphite theme, chosen in the settings panel.
 *
 * Asserts what the theme is for: the editor root takes Inter, the primary
 * action is ink (not the default blue), the accent is blue, and the choice
 * survives a reload. Switching back to Default restores the stock look.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

const editorRoot = (page: Page): Locator => page.getByTestId('editor-test');
const modal = (page: Page): Locator => editorRoot(page).locator('.flowdrop-settings-modal[open]');

async function chooseUiTheme(page: Page, value: string): Promise<void> {
  // The gear is a menu now: Appearance, then "All settings…".
  await editorRoot(page).locator('.flowdrop-navbar__settings-btn').click();
  await page.getByTestId('navbar-all-settings').click();
  await expect(modal(page)).toBeVisible({ timeout: 5000 });
  await modal(page).getByRole('tab', { name: 'UI', exact: true }).click();
  // The theme picker is a radiogroup of swatches, one per registered theme.
  const name = value.charAt(0).toUpperCase() + value.slice(1);
  const swatch = modal(page).getByRole('radio', { name, exact: true });
  await expect(swatch).toBeAttached();
  await swatch.check({ force: true });
  await modal(page).getByRole('button', { name: 'Close settings' }).click();
  await expect(modal(page)).toHaveCount(0, { timeout: 5000 });
}

/** Resolved value of a --fd-* token on the editor's scope element. */
const token = (page: Page, name: string) =>
  page
    .locator('.flowdrop-root')
    .first()
    .evaluate((el, n) => getComputedStyle(el).getPropertyValue(`--fd-${n}`).trim(), name);

const fontFamily = (page: Page) =>
  page
    .locator('.flowdrop-root')
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);

test.describe('Graphite theme', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('is listed in settings and applies Inter, ink primary and blue accent', async ({ page }) => {
    await gotoEditor(page, 'simple');
    expect(await fontFamily(page)).not.toContain('Inter Variable');

    await chooseUiTheme(page, 'graphite');

    await expect.poll(() => fontFamily(page)).toContain('Inter Variable');
    expect(await token(page, 'primary')).toBe('#16191f');
    expect(await token(page, 'accent')).toBe('#2457d6');

    // The opt-in @font-face the test page imports resolves to a real woff2.
    const loaded = await page.evaluate(async () => {
      await document.fonts.load('13px "Inter Variable"');
      return document.fonts.check('13px "Inter Variable"');
    });
    expect(loaded).toBe(true);
  });

  test('a visible primary button is ink, and the choice survives a reload', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await chooseUiTheme(page, 'graphite');

    const primaryBg = () =>
      page
        .locator('.flowdrop-root')
        .first()
        .evaluate((el) => {
          const probe = document.createElement('button');
          probe.style.backgroundColor = 'var(--fd-primary)';
          el.appendChild(probe);
          const bg = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return bg;
        });
    expect(await primaryBg()).toBe('rgb(22, 25, 31)');

    await page.reload();
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
    await expect.poll(() => fontFamily(page)).toContain('Inter Variable');
    expect(await token(page, 'primary')).toBe('#16191f');
  });

  test('dark mode uses the dark graphite palette', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await chooseUiTheme(page, 'graphite');
    // The colour scheme is data-theme on the editor scope, not on <html>.
    await page.evaluate(() =>
      document.querySelector('.flowdrop-root')?.setAttribute('data-theme', 'dark')
    );
    await expect.poll(() => token(page, 'primary')).toBe('#eceef2');
    expect(await token(page, 'background')).toBe('#16181d');
  });

  test('switching back to Default drops the graphite look', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await chooseUiTheme(page, 'graphite');
    await expect.poll(() => token(page, 'primary')).toBe('#16191f');
    await chooseUiTheme(page, 'default');
    await expect.poll(() => fontFamily(page)).not.toContain('Inter Variable');
    expect(await token(page, 'primary')).not.toBe('#16191f');
  });
});
