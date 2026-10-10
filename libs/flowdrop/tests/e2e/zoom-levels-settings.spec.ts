/**
 * Settings > Editor > Zoom levels: one row per tier below full (Outline, Glyph,
 * Map), each with a switch and a "starts below N%" select. The select options
 * are limited by the neighbouring rows that are on, so an invalid set cannot be
 * picked, and the choice is stored as `editor.zoomTiers`.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

const STORAGE_KEY = 'flowdrop-settings';

const editorRoot = (page: Page): Locator => page.getByTestId('editor-test');
const modal = (page: Page): Locator => editorRoot(page).locator('.flowdrop-settings-modal[open]');

async function openZoomLevels(page: Page): Promise<Locator> {
  await gotoEditor(page, 'simple');
  await editorRoot(page).locator('.flowdrop-navbar__settings-btn').click();
  await page.getByTestId('navbar-all-settings').click();
  await expect(modal(page)).toBeVisible({ timeout: 5000 });
  await modal(page).getByRole('tab', { name: 'Editor' }).click();
  const group = modal(page).getByRole('group', { name: 'Zoom levels' });
  await expect(group).toBeVisible();
  return group;
}

const stored = (page: Page): Promise<Record<string, number> | undefined> =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}')?.editor?.zoomTiers,
    STORAGE_KEY
  );

const rowSwitch = (group: Locator, name: string): Locator =>
  group.getByRole('switch', { name, exact: true });
const rowSelect = (group: Locator, name: string): Locator =>
  group.getByLabel(`${name} starts below`, { exact: true });

test.describe('Zoom levels setting', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('shows a row per tier below full, with the library default', async ({ page }) => {
    const group = await openZoomLevels(page);
    await expect(group.getByRole('switch')).toHaveCount(3);
    await expect(group.getByText('Full', { exact: true })).toHaveCount(0);
    for (const name of ['Outline', 'Glyph', 'Map']) {
      await expect(rowSwitch(group, name)).toBeChecked();
    }
    await expect(rowSelect(group, 'Outline')).toHaveValue('75');
    await expect(rowSelect(group, 'Glyph')).toHaveValue('45');
    await expect(rowSelect(group, 'Map')).toHaveValue('25');
  });

  test('turning a tier off stores the set without it', async ({ page }) => {
    const group = await openZoomLevels(page);
    await rowSwitch(group, 'Glyph').click();
    await expect(rowSelect(group, 'Glyph')).toBeDisabled();
    expect(await stored(page)).toEqual({ full: 0.75, outline: 0.25, map: 0 });
    // Back on: the row restores what it had.
    await rowSwitch(group, 'Glyph').click();
    await expect(rowSelect(group, 'Glyph')).toHaveValue('45');
    expect(await stored(page)).toEqual({ full: 0.75, outline: 0.45, glyph: 0.25, map: 0 });
  });

  test('the options are limited by the neighbouring rows', async ({ page }) => {
    const group = await openZoomLevels(page);
    const values = (name: string) =>
      rowSelect(group, name).evaluate((el) =>
        [...(el as HTMLSelectElement).options].map((o) => Number(o.value))
      );
    // Outline sits above Glyph (45): nothing at or below 45.
    expect(Math.min(...(await values('Outline')))).toBe(50);
    expect(Math.max(...(await values('Outline')))).toBe(90);
    // Map sits below Glyph (45) and cannot go under 20.
    expect(await values('Map')).toEqual([40, 35, 30, 25, 20]);
    // Glyph off: Outline may now go as low as just above Map (25).
    await rowSwitch(group, 'Glyph').click();
    expect(Math.min(...(await values('Outline')))).toBe(30);
  });

  test('picking a value changes the stored boundary', async ({ page }) => {
    const group = await openZoomLevels(page);
    await rowSelect(group, 'Outline').selectOption('60');
    expect(await stored(page)).toEqual({ full: 0.6, outline: 0.45, glyph: 0.25, map: 0 });
  });

  test('every tier off is { full: 0 } and the canvas keeps the full node', async ({ page }) => {
    const group = await openZoomLevels(page);
    for (const name of ['Outline', 'Glyph', 'Map']) await rowSwitch(group, name).click();
    expect(await stored(page)).toEqual({ full: 0 });
    await expect(page.locator('.flowdrop-root').first()).toHaveAttribute('data-fd-zoom', 'full');
  });
});
