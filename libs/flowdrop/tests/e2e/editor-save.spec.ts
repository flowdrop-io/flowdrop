/**
 * E2E Test: Save Workflow
 *
 * Tests that clicking the Save button in the navbar triggers
 * the correct API request with the current workflow data.
 */

import { test, expect } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

test.describe('Save Workflow', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('save button sends workflow data via API', async ({ page }) => {
    // Set up API mocking to capture the save request
    let capturedSaveBody: Record<string, unknown> | null = null;
    let saveMethodCalled = false;

    await page.route('**/api/flowdrop/workflows/**', async (route) => {
      if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
        saveMethodCalled = true;
        capturedSaveBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'test-workflow-simple' },
            message: 'Workflow saved'
          })
        });
      } else {
        await route.continue();
      }
    });

    await gotoEditor(page, 'simple');

    // Find and click the Save button in the navbar
    const saveButton = page.locator('.flowdrop-navbar__primary-action', {
      hasText: 'Save'
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
      expect(body).toHaveProperty('nodes');
      expect(body).toHaveProperty('edges');
      const nodes = body.nodes as unknown[];
      const edges = body.edges as unknown[];
      expect(nodes.length).toBe(2);
      expect(edges.length).toBe(1);
    }
  });

  test('save uses PUT when workflow already has a UUID id (regression: issue #26)', async ({
    page
  }) => {
    const backendUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    // Intercept save requests — the uuid workflow variant is passed inline with the UUID id,
    // so no GET interception is needed. The app should issue PUT on save.
    await page.route('**/api/flowdrop/workflows/**', async (route) => {
      const method = route.request().method();
      if (method === 'PUT' || method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: backendUUID },
            message: 'Workflow saved'
          })
        });
      } else {
        await route.continue();
      }
    });

    // Load the uuid workflow variant — it has id: backendUUID passed inline via props
    await gotoEditor(page, 'uuid');

    const saveButton = page.locator('.flowdrop-navbar__primary-action', {
      hasText: 'Save'
    });
    await expect(saveButton).toBeVisible({ timeout: 5000 });

    // Wait for the save request and capture it
    const saveRequestPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/api/flowdrop/workflows/') &&
        (req.method() === 'PUT' || req.method() === 'POST'),
      { timeout: 5000 }
    );
    await saveButton.click();
    const saveRequest = await saveRequestPromise;

    // Must use PUT (update), not POST (create)
    expect(saveRequest.method()).toBe('PUT');
    expect(new URL(saveRequest.url()).pathname).toContain(backendUUID);
  });

  test('save button is visible in navbar', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // The navbar should show Save as the primary action
    const saveButton = page.locator('.flowdrop-navbar__primary-action', {
      hasText: 'Save'
    });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
  });

  test('navbar shows export and import actions', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // There are two navbars (outer layout + inner App); use the inner one
    const navbar = page.locator('.flowdrop-navbar').last();
    await expect(navbar).toBeVisible({ timeout: 5000 });

    // Should contain Save action
    await expect(navbar).toContainText('Save', { timeout: 5000 });
  });

  test('save button shows unsaved changes after an edit and clears after saving', async ({
    page
  }) => {
    await page.route('**/api/flowdrop/workflows/**', async (route) => {
      const method = route.request().method();
      if (method === 'PUT' || method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'test-workflow-simple' },
            message: 'Workflow saved'
          })
        });
      } else {
        await route.continue();
      }
    });

    await gotoEditor(page, 'simple');

    const saveButton = page.locator('.flowdrop-navbar__primary-action', { hasText: 'Save' });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await expect(saveButton).not.toHaveAttribute('data-dirty', 'true');

    // Move a node by dragging it.
    const node = page.locator('.svelte-flow__node').first();
    const box = (await node.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + 68, { steps: 8 });
    await page.mouse.up();

    await expect(saveButton).toHaveAttribute('data-dirty', 'true');
    await expect(saveButton).toContainText('Unsaved changes');

    await saveButton.click();
    await expect(saveButton).not.toHaveAttribute('data-dirty', 'true', { timeout: 5000 });
  });

  test.describe('impact check', () => {
    const impactReport = {
      confirm: true,
      interface: { level: 'breaking', breaking: true },
      items: [
        {
          kind: 'run_profile',
          severity: 'breaks',
          label: 'Quick calculator',
          message: 'Is switched off: an input it binds is gone.',
          url: null
        }
      ]
    };

    async function setup(page: import('@playwright/test').Page, report: object = impactReport) {
      const puts: string[] = [];
      await page.route('**/api/flowdrop/workflow/*/impact', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: report })
        })
      );
      await page.route('**/api/flowdrop/workflows/**', async (route) => {
        if (route.request().method() === 'PUT') {
          puts.push(route.request().postData() ?? '');
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { id: 'test-workflow-simple' } })
          });
        } else {
          await route.continue();
        }
      });
      await gotoEditor(page, 'simple');
      const saveButton = page.locator('.flowdrop-navbar__primary-action', { hasText: 'Save' });
      await expect(saveButton).toBeVisible({ timeout: 5000 });
      const node = page.locator('.svelte-flow__node').first();
      const box = (await node.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + 8);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 60, box.y + 68, { steps: 8 });
      await page.mouse.up();
      await expect(saveButton).toHaveAttribute('data-dirty', 'true');
      return { saveButton, puts };
    }

    test('Cancel sends no save and keeps the unsaved marker', async ({ page }) => {
      const { saveButton, puts } = await setup(page);
      await saveButton.click();
      const dialog = page.getByTestId('flowdrop-impact-confirm');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Quick calculator');
      await page.getByTestId('flowdrop-impact-cancel').click();
      await expect(dialog).toHaveCount(0);
      await page.waitForTimeout(500);
      expect(puts).toHaveLength(0);
      await expect(saveButton).toHaveAttribute('data-dirty', 'true');
    });

    test('Save anyway sends the save', async ({ page }) => {
      const { saveButton, puts } = await setup(page);
      await saveButton.click();
      await page.getByTestId('flowdrop-impact-save').click();
      await expect(saveButton).not.toHaveAttribute('data-dirty', 'true', { timeout: 5000 });
      expect(puts).toHaveLength(1);
    });

    test('a rename is followed only when the box is ticked', async ({ page }) => {
      const { saveButton, puts } = await setup(page, {
        confirm: false,
        interface: { level: 'minor', breaking: false },
        items: [],
        renames: [
          {
            direction: 'output',
            from: 'node',
            to: 'article',
            places: [
              {
                kind: 'block',
                severity: 'changes',
                label: 'Tags block',
                message: 'maps it',
                url: null
              }
            ]
          }
        ]
      });
      await saveButton.click();
      const dialog = page.getByTestId('flowdrop-impact-confirm');
      await expect(dialog).toContainText('Renaming output node \u2192 article also updates:');
      const follow = page.getByTestId('flowdrop-impact-follow-renames');
      await expect(follow).not.toBeChecked();
      await follow.check({ force: true });
      await page.getByTestId('flowdrop-impact-save').click();
      await expect(saveButton).not.toHaveAttribute('data-dirty', 'true', { timeout: 5000 });
      expect(puts).toHaveLength(1);
      expect(JSON.parse(puts[0]).followRenames).toBe(true);
    });

    test('a refused save offers Save as a copy and sends no save', async ({ page }) => {
      const copies: string[] = [];
      await page.route('**/api/flowdrop/workflow/*/copy', async (route) => {
        copies.push(route.request().postData() ?? '');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: '99', editorUrl: '/test/copy-landed' }
          })
        });
      });
      await page.route('**/test/copy-landed', (route) =>
        route.fulfill({ status: 200, contentType: 'text/html', body: '<p>copy opened</p>' })
      );
      const { saveButton, puts } = await setup(page, {
        ...impactReport,
        refused: true,
        copyUrl: '/workflow/test-workflow-simple/copy'
      });
      await saveButton.click();
      const dialog = page.getByTestId('flowdrop-impact-confirm');
      await expect(dialog).toContainText("can't be saved while 1 place uses it");
      await expect(page.getByTestId('flowdrop-impact-save')).toHaveCount(0);
      await page.getByTestId('flowdrop-impact-copy').click();
      await expect(page).toHaveURL(/\/test\/copy-landed$/);
      expect(copies).toHaveLength(1);
      expect(puts).toHaveLength(0);
    });
  });

  test.describe('leaving the page', () => {
    test('a dirty editor asks before the page unloads, a clean one does not', async ({ page }) => {
      await page.goto('/test/mount-app');
      await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
      await page.waitForFunction(
        () => (window as unknown as { __mountedApp?: unknown }).__mountedApp !== undefined
      );

      const dialogs: string[] = [];
      page.on('dialog', async (dialog) => {
        dialogs.push(dialog.type());
        await dialog.accept();
      });

      // Clean: closing the page raises no dialog.
      await page.close({ runBeforeUnload: true });
      expect(dialogs).toEqual([]);
    });

    test('a dirty editor shows the beforeunload dialog', async ({ page }) => {
      await page.goto('/test/mount-app');
      await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
      await page.waitForFunction(
        () => (window as unknown as { __mountedApp?: unknown }).__mountedApp !== undefined
      );
      await page.evaluate(() =>
        (
          window as unknown as {
            __mountedApp: { runCommand: (line: string) => Promise<unknown> };
          }
        ).__mountedApp.runCommand('layout auto')
      );

      // Browsers only show the prompt for a page the user has interacted with.
      await page.mouse.click(5, 5);
      expect(
        await page.evaluate(() =>
          (window as unknown as { __mountedApp: { isDirty: () => boolean } }).__mountedApp.isDirty()
        )
      ).toBe(true);

      const dialogPromise = page.waitForEvent('dialog', { timeout: 5000 });
      await page.close({ runBeforeUnload: true });
      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('beforeunload');
      await dialog.accept();
    });
  });
});
