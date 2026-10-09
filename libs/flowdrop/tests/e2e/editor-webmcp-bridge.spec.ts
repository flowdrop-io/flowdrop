/**
 * E2E Test: the WebMCP desktop bridge button.
 *
 * A browser without WebMCP of its own reaches the editor's tools through a
 * bridge widget. The widget's own UI is hidden; the editor draws a button in
 * the zoom controls with a status dot and a popover (token field, Connect,
 * Disconnect, the tools offered). `?webmcpBridge=fake` installs a fake widget
 * (tokens: `hold` stays connecting, `fail` errors, anything else connects).
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { waitForEditor } from './helpers/editor-helpers';

const trigger = (page: Page) => page.getByTestId('webmcp-bridge-trigger');
const popover = (page: Page) => page.getByTestId('webmcp-bridge-popover');
const token = (page: Page) => page.getByTestId('webmcp-bridge-token');

async function open(page: Page, query = 'webmcpBridge=fake'): Promise<void> {
  await page.goto(`/test/editor?${query}`);
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await waitForEditor(page);
  await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
}

test.describe('WebMCP desktop bridge', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('is absent without a bridge', async ({ page }) => {
    await open(page, 'x=1');
    await expect(trigger(page)).toHaveCount(0);
  });

  test("stands beside the zoom controls and hides the widget's own UI", async ({ page }) => {
    await open(page);
    await expect(trigger(page)).toBeVisible();
    // Its own float, not one more button of the zoom group.
    await expect(
      page.locator('.svelte-flow__controls').getByTestId('webmcp-bridge-trigger')
    ).toHaveCount(0);
    const zoom = await page.locator('.svelte-flow__controls').boundingBox();
    const button = await trigger(page).boundingBox();
    expect(button!.x).toBeGreaterThan(zoom!.x + zoom!.width);
    await expect(trigger(page)).toHaveAttribute('data-status', 'disconnected');
    await expect(page.locator('[data-webmcp-widget]')).toBeHidden();
  });

  test('connects, shows the tools, and disconnects', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(popover(page)).toBeVisible();
    await expect(page.getByTestId('webmcp-bridge-connect')).toBeDisabled();

    await token(page).fill('hold');
    await page.getByTestId('webmcp-bridge-connect').click();
    await expect(trigger(page)).toHaveAttribute('data-status', 'connecting');

    await page.evaluate(() =>
      (window as unknown as { __fakeBridge: { settle(): void } }).__fakeBridge.settle()
    );
    await expect(trigger(page)).toHaveAttribute('data-status', 'connected');
    await expect(popover(page)).toContainText('3 tools offered');
    await page.getByTestId('webmcp-bridge-disconnect').click();
    await expect(trigger(page)).toHaveAttribute('data-status', 'disconnected');
    await expect(token(page)).toBeVisible();
  });

  test('a failed connect shows an error and keeps it', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await token(page).fill('fail');
    await page.getByTestId('webmcp-bridge-connect').click();
    await expect(trigger(page)).toHaveAttribute('data-status', 'error');
    await expect(page.getByTestId('webmcp-bridge-status')).toContainText('Registration failed');
  });

  test('Escape closes the popover and returns focus; so does a click outside', async ({ page }) => {
    await open(page);
    await trigger(page).click();
    await expect(popover(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popover(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');

    await trigger(page).click();
    await expect(popover(page)).toBeVisible();
    await page.mouse.click(700, 150);
    await expect(popover(page)).toHaveCount(0);
  });
});
