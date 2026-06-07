/**
 * E2E Test: Settings persistence
 *
 * Covers the full browser persistence loop for user settings, focused on
 * the theme light/dark preference (the most-reported "never persists"
 * symptom):
 *
 *   change in settings modal -> data-theme applied -> localStorage written
 *   -> reload -> preference restored and re-applied
 *
 * Plus the host-defaults regression: a host passing settings defaults at
 * mount (?settingsDefaults=...) must seed first-run state without
 * clobbering a returning user's persisted choice.
 */

import { test, expect, type Locator, type Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

const STORAGE_KEY = 'flowdrop-settings';

// The test page renders the editor inside data-testid="editor-test". The
// surrounding site layout has its OWN navbar + settings modal, bound to the
// same page-global settings store. That means two of everything on the page,
// including duplicate control ids (#preference, #showGrid) — so getByLabel
// resolves the for/id association to the out-of-root control and finds
// nothing. Scope every interaction to the editor App and target controls by
// id within its open modal.
function editorRoot(page: Page): Locator {
  return page.getByTestId('editor-test');
}

/** The editor App's open settings <dialog> */
function openModal(page: Page): Locator {
  return editorRoot(page).locator('.flowdrop-settings-modal[open]');
}

/** Open the editor App's settings modal */
async function openSettings(page: Page): Promise<void> {
  await editorRoot(page).locator('.flowdrop-navbar__settings-btn').click();
  await expect(openModal(page)).toBeVisible({ timeout: 5000 });
}

/** Close the editor App's settings modal */
async function closeSettings(page: Page): Promise<void> {
  await openModal(page).locator('.flowdrop-settings-modal__close').click();
  await expect(openModal(page)).toHaveCount(0, { timeout: 5000 });
}

/** Read the persisted theme preference straight from localStorage */
async function persistedPreference(page: Page): Promise<string | undefined> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw)?.theme?.preference : undefined;
  }, STORAGE_KEY);
}

/** The data-theme attribute applied to <html> */
function appliedTheme(page: Page) {
  return page.locator('html').getAttribute('data-theme');
}

/** Open the settings modal and change the theme preference */
async function setThemePreference(page: Page, pref: 'light' | 'dark' | 'auto'): Promise<void> {
  await openSettings(page);
  const select = openModal(page).locator('select#preference');
  await expect(select).toBeVisible({ timeout: 5000 });
  await select.selectOption(pref);
  await closeSettings(page);
}

test.describe('Settings Persistence', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('changing the theme applies data-theme and writes localStorage', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Library default preference is 'dark'
    expect(await appliedTheme(page)).toBe('dark');

    await setThemePreference(page, 'light');

    expect(await appliedTheme(page)).toBe('light');
    expect(await persistedPreference(page)).toBe('light');
  });

  test('theme preference survives a reload', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await setThemePreference(page, 'light');

    await page.reload();
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });

    // Restored from localStorage and re-applied to the document
    expect(await appliedTheme(page)).toBe('light');
    expect(await persistedPreference(page)).toBe('light');

    // The settings modal reflects the persisted value too
    await openSettings(page);
    await expect(openModal(page).locator('select#preference')).toHaveValue('light');
  });

  test('host settings defaults seed the first run', async ({ page }) => {
    // Fresh profile, host mounts with a light default -> applied
    await page.goto('/test/editor?settingsDefaults=light');
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });

    expect(await appliedTheme(page)).toBe('light');
  });

  test('host settings defaults do NOT clobber the persisted user choice', async ({ page }) => {
    // Session 1: host default is dark, user switches to light
    await page.goto('/test/editor?settingsDefaults=dark');
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
    await setThemePreference(page, 'light');
    expect(await persistedPreference(page)).toBe('light');

    // Session 2 (reload with the same host default): the user's persisted
    // choice must win — this used to reset to the host default every load
    await page.goto('/test/editor?settingsDefaults=dark');
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });

    expect(await appliedTheme(page)).toBe('light');
    expect(await persistedPreference(page)).toBe('light');
  });

  test('non-theme settings persist across reload too', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Toggle "Show Grid" off in the Editor tab
    await openSettings(page);
    await openModal(page).getByRole('tab', { name: 'Editor' }).click();
    // "Show Grid" is a custom toggle: the real checkbox is visually hidden
    // off-viewport, so drive it through its visible track (the label wraps
    // both) and assert the underlying input flipped.
    const grid = openModal(page).locator('#showGrid');
    await expect(grid).toBeChecked();
    await openModal(page).locator('label.form-toggle:has(#showGrid) .form-toggle__track').click();
    await expect(grid).not.toBeChecked();
    await closeSettings(page);

    await page.reload();
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });

    const persisted = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
      STORAGE_KEY
    );
    expect(persisted?.editor?.showGrid).toBe(false);
  });
});
