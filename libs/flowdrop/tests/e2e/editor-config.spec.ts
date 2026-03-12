/**
 * E2E Test: Node Configuration
 *
 * Tests opening the config panel by double-clicking a node,
 * verifying config content, editing fields, and closing the panel.
 */

import { test, expect } from "@playwright/test";
import {
  gotoEditor,
  openNodeConfig,
  clickCanvas,
} from "./helpers/editor-helpers";

test.describe("Node Configuration", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === "Mobile Chrome",
      "Config sidebar not available on mobile viewports",
    );
  });

  test("double-click node opens config panel", async ({ page }) => {
    await gotoEditor(page, "simple");

    // Config panel should not be visible initially
    const configPanel = page.locator(".config-panel");
    await expect(configPanel).not.toBeVisible();

    // Double-click the first node
    await openNodeConfig(page, 0);

    // Config panel should now be visible
    await expect(configPanel.first()).toBeVisible();
  });

  test("config panel shows node title", async ({ page }) => {
    await gotoEditor(page, "simple");

    // Open config for the first node (Text Input)
    await openNodeConfig(page, 0);

    // Panel should show the node's label
    const panelTitle = page.locator(".config-panel");
    await expect(panelTitle).toContainText("Text Input", { timeout: 5000 });
  });

  test("config panel shows node details (type, category)", async ({ page }) => {
    await gotoEditor(page, "simple");

    await openNodeConfig(page, 0);

    const configPanel = page.locator(".config-panel").first();

    // Should show type and category in the details section
    await expect(configPanel).toContainText("default", { timeout: 5000 });
    await expect(configPanel).toContainText("inputs", { timeout: 5000 });
  });

  test("config panel contains form fields from configSchema", async ({
    page,
  }) => {
    await gotoEditor(page, "simple");

    // Open the Text Input node which has defaultValue and placeholder fields
    await openNodeConfig(page, 0);

    const configPanel = page.locator(".config-panel").first();

    // Should show the config form with field labels
    await expect(configPanel).toContainText("Default Value", { timeout: 5000 });
  });

  test("clicking canvas background closes config panel", async ({ page }) => {
    await gotoEditor(page, "simple");

    // Open config panel
    await openNodeConfig(page, 0);
    const configPanel = page.locator(".config-panel").first();
    await expect(configPanel).toBeVisible();

    // Click on the canvas background — use the bottom-left area to avoid nodes
    const pane = page.locator(".svelte-flow__pane");
    const box = await pane.boundingBox();
    if (box) {
      // Click bottom-left corner of canvas where no nodes are
      await page.mouse.click(box.x + 50, box.y + box.height - 50);
    }

    // Config panel should close
    await expect(configPanel).not.toBeVisible({ timeout: 5000 });
  });

  test("pressing Escape closes config panel", async ({ page }) => {
    await gotoEditor(page, "simple");

    // Open config panel
    await openNodeConfig(page, 0);
    const configPanel = page.locator(".config-panel").first();
    await expect(configPanel).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Config panel should close
    await expect(configPanel).not.toBeVisible({ timeout: 5000 });
  });
});
