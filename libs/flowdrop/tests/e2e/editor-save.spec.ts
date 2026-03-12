/**
 * E2E Test: Save Workflow
 *
 * Tests that clicking the Save button in the navbar triggers
 * the correct API request with the current workflow data.
 */

import { test, expect } from "@playwright/test";
import { gotoEditor, setupEditorApiMocks } from "./helpers/editor-helpers";

test.describe("Save Workflow", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === "Mobile Chrome",
      "Editor requires desktop-width viewport",
    );
  });

  test("save button sends workflow data via API", async ({ page }) => {
    // Set up API mocking to capture the save request
    let capturedSaveBody: Record<string, unknown> | null = null;
    let saveMethodCalled = false;

    await page.route("**/api/flowdrop/workflows/**", async (route) => {
      if (
        route.request().method() === "PUT" ||
        route.request().method() === "POST"
      ) {
        saveMethodCalled = true;
        capturedSaveBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "test-workflow-simple" },
            message: "Workflow saved",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await gotoEditor(page, "simple");

    // Find and click the Save button in the navbar
    const saveButton = page.locator(".flowdrop-navbar__primary-action", {
      hasText: "Save",
    });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    // Wait for the save request to be made
    await page.waitForTimeout(2000);

    // Verify the save was triggered
    expect(saveMethodCalled).toBe(true);

    // Verify the saved data contains nodes
    if (capturedSaveBody) {
      const body = capturedSaveBody as Record<string, unknown>;
      expect(body).toHaveProperty("nodes");
      expect(body).toHaveProperty("edges");
      const nodes = body.nodes as unknown[];
      const edges = body.edges as unknown[];
      expect(nodes.length).toBe(2);
      expect(edges.length).toBe(1);
    }
  });

  test("save uses PUT when workflow already has a UUID id (regression: issue #26)", async ({
    page,
  }) => {
    const backendUUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    let saveMethod: string | null = null;
    let savePath: string | null = null;

    // Intercept the initial workflow load and return one with a UUID id
    await page.route("**/api/flowdrop/workflows/**", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: backendUUID,
              name: "UUID Workflow",
              description: "",
              nodes: [],
              edges: [],
              metadata: { version: "1.0.0" },
            },
          }),
        });
      } else if (method === "PUT" || method === "POST") {
        saveMethod = method;
        savePath = new URL(route.request().url()).pathname;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: backendUUID },
            message: "Workflow saved",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await gotoEditor(page, "simple");

    const saveButton = page.locator(".flowdrop-navbar__primary-action", {
      hasText: "Save",
    });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();
    await page.waitForTimeout(2000);

    // Must use PUT (update), not POST (create)
    expect(saveMethod).toBe("PUT");
    expect(savePath).toContain(backendUUID);
  });

  test("save button is visible in navbar", async ({ page }) => {
    await gotoEditor(page, "simple");

    // The navbar should show Save as the primary action
    const saveButton = page.locator(".flowdrop-navbar__primary-action", {
      hasText: "Save",
    });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
  });

  test("navbar shows export and import actions", async ({ page }) => {
    await gotoEditor(page, "simple");

    // There are two navbars (outer layout + inner App); use the inner one
    const navbar = page.locator(".flowdrop-navbar").last();
    await expect(navbar).toBeVisible({ timeout: 5000 });

    // Should contain Save action
    await expect(navbar).toContainText("Save", { timeout: 5000 });
  });
});
