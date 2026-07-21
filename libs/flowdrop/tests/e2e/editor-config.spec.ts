/**
 * E2E Test: Node Configuration
 *
 * Tests opening the config panel by double-clicking a node,
 * verifying config content, editing fields, and closing the panel.
 */

import { test, expect } from '@playwright/test';
import { gotoEditor, openNodeConfig } from './helpers/editor-helpers';

test.describe('Node Configuration', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === 'Mobile Chrome',
      'Config sidebar not available on mobile viewports'
    );
  });

  test('double-click node opens config panel', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Config panel should not be visible initially
    const configPanel = page.locator('.config-panel');
    await expect(configPanel).not.toBeVisible();

    // Double-click the first node
    await openNodeConfig(page, 0);

    // Config panel should now be visible
    await expect(configPanel.first()).toBeVisible();
  });

  test('config panel shows node title', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Open config for the first node (Text Input)
    await openNodeConfig(page, 0);

    // Panel should show the node's label
    const panelTitle = page.locator('.config-panel');
    await expect(panelTitle).toContainText('Text Input', { timeout: 5000 });
  });

  test('config panel shows node details (type, category)', async ({ page }) => {
    await gotoEditor(page, 'simple');

    await openNodeConfig(page, 0);

    const configPanel = page.locator('.config-panel').first();

    // Should show type and category in the details section
    await expect(configPanel).toContainText('default', { timeout: 5000 });
    await expect(configPanel).toContainText('inputs', { timeout: 5000 });
  });

  test('config panel contains form fields from configSchema', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Open the Text Input node which has defaultValue and placeholder fields
    await openNodeConfig(page, 0);

    const configPanel = page.locator('.config-panel').first();

    // Should show the config form with field labels
    await expect(configPanel).toContainText('Default Value', { timeout: 5000 });
  });

  test('clicking canvas background closes config panel', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Open config panel
    await openNodeConfig(page, 0);
    const configPanel = page.locator('.config-panel').first();
    await expect(configPanel).toBeVisible();

    // Click on the canvas background — use the bottom-left area to avoid nodes
    const pane = page.locator('.svelte-flow__pane');
    const box = await pane.boundingBox();
    if (box) {
      // Click bottom-left corner of canvas where no nodes are
      await page.mouse.click(box.x + 50, box.y + box.height - 50);
    }

    // Config panel should close
    await expect(configPanel).not.toBeVisible({ timeout: 5000 });
  });

  test('pressing Escape closes config panel', async ({ page }) => {
    await gotoEditor(page, 'simple');

    // Open config panel
    await openNodeConfig(page, 0);
    const configPanel = page.locator('.config-panel').first();
    await expect(configPanel).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Config panel should close
    await expect(configPanel).not.toBeVisible({ timeout: 5000 });
  });

  test('boolean toggle persists on save without focusing another field (regression: issue #38)', async ({
    page
  }) => {
    // Capture the workflow save payload so we can assert the toggled value made
    // it to the wire. This is the crux of #38: in WebKit/Safari a checkbox does
    // NOT receive focus on click, so the config form's on-blur (`focusout`)
    // commit never fires when the user clicks the app Save button next — the
    // staged edit is dropped and the stale value is saved. The fix commits
    // discrete controls immediately in `handleFieldChange`. Under `--project=webkit`
    // this test fails without the fix and passes with it; other browsers commit
    // on the natural blur regardless, so it's a cross-browser guard.
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

    // The Text Input node (index 0) has a boolean "Required" toggle.
    await openNodeConfig(page, 0);

    // The checkbox is a visually-hidden input inside a styled toggle label, so
    // click the label. `toBeChecked()` reads the input's state without needing
    // it to be visible.
    const toggleInput = page.locator('.config-form input#required[type="checkbox"]');
    const toggleLabel = page.locator('.config-form label.form-toggle');
    await expect(toggleLabel).toBeVisible({ timeout: 5000 });
    await expect(toggleInput).not.toBeChecked();

    // Flip the toggle. Crucially, do NOT click into any text field afterwards —
    // go straight to the app Save button, mirroring the reported repro.
    await toggleLabel.click();
    await expect(toggleInput).toBeChecked();

    const saveButton = page.locator('.flowdrop-navbar__primary-action', {
      hasText: 'Save'
    });
    await expect(saveButton).toBeVisible({ timeout: 5000 });

    // Read the payload straight off the awaited request (no dependence on the
    // route handler having run first — that ordering is racy under load).
    const saveRequestPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/api/flowdrop/workflows/') &&
        (req.method() === 'PUT' || req.method() === 'POST'),
      { timeout: 5000 }
    );
    await saveButton.click();
    const saveRequest = await saveRequestPromise;

    const body = saveRequest.postDataJSON() as {
      nodes: Array<{ id: string; data: { config: Record<string, unknown> } }>;
    };
    const inputNode = body.nodes.find((n) => n.id === 'node-input');
    expect(inputNode?.data.config.required).toBe(true);
  });

  test('typing in a config field is a single undo step, not one per keystroke (issue #38 root cause)', async ({
    page
  }) => {
    // The live-commit pipeline coalesces a field-editing session into one undo
    // entry via a history transaction. Without that coalescing, each keystroke
    // would be its own entry (and each would deep-clone the whole workflow —
    // the original editor freeze). We verify granularity: type several
    // characters, then a single undo restores the field's prior value in one
    // step.
    await page.route('**/api/flowdrop/workflows/**', async (route) => {
      const method = route.request().method();
      if (method === 'PUT' || method === 'POST') {
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
    await openNodeConfig(page, 0);

    // "Default Value" starts as "hello" in the simple fixture.
    const field = page.locator('.config-form input#defaultValue');
    await expect(field).toBeVisible({ timeout: 5000 });
    await expect(field).toHaveValue('hello');

    // Append several characters, then end the field session by blurring
    // (blur also moves focus off the input, so the undo shortcut below isn't
    // swallowed by the editor's "ignore shortcuts while typing" guard).
    await field.click();
    await field.press('End');
    await field.pressSequentially(' world');
    await expect(field).toHaveValue('hello world');
    await field.blur();

    // Live edit reached the store and stuck.
    await expect(field).toHaveValue('hello world');

    // A single undo must revert the whole " world" session at once, back to
    // "hello" — not drop a single character (which is what per-keystroke
    // history entries would produce).
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await expect(field).toHaveValue('hello');
  });

  test('a single undo reverts only the most recent field edit, not two at once (issue #39)', async ({
    page
  }) => {
    // Two sequential edits to *different* fields, each finalized as its own undo
    // step. The bug: because history stored pre-change snapshots and undo returned
    // the new stack top, one undo skipped a step and reverted BOTH edits. This
    // walks the full undo/redo path asserting each move is exactly one step.
    await page.route('**/api/flowdrop/workflows/**', async (route) => {
      const method = route.request().method();
      if (method === 'PUT' || method === 'POST') {
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
    await openNodeConfig(page, 0);

    // simple fixture: node-input config = { defaultValue: 'hello', placeholder: 'Enter text...' }
    const defaultValue = page.locator('.config-form input#defaultValue');
    const placeholder = page.locator('.config-form input#placeholder');
    await expect(defaultValue).toHaveValue('hello');
    await expect(placeholder).toHaveValue('Enter text...');

    // Edit 1: defaultValue 'hello' -> 'hello!', finalized by blurring.
    await defaultValue.click();
    await defaultValue.press('End');
    await defaultValue.pressSequentially('!');
    await defaultValue.blur();
    await expect(defaultValue).toHaveValue('hello!');

    // Edit 2: placeholder 'Enter text...' -> 'Enter text...?', finalized by blurring.
    await placeholder.click();
    await placeholder.press('End');
    await placeholder.pressSequentially('?');
    await placeholder.blur();
    await expect(placeholder).toHaveValue('Enter text...?');

    const undo = () => page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    const redo = () =>
      page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+Shift+z');

    // One undo reverts ONLY edit 2 — edit 1 must survive.
    await undo();
    await expect(placeholder).toHaveValue('Enter text...');
    await expect(defaultValue).toHaveValue('hello!');

    // A second undo reverts edit 1.
    await undo();
    await expect(defaultValue).toHaveValue('hello');
    await expect(placeholder).toHaveValue('Enter text...');

    // Redo walks forward one field edit at a time.
    await redo();
    await expect(defaultValue).toHaveValue('hello!');
    await expect(placeholder).toHaveValue('Enter text...');
    await redo();
    await expect(placeholder).toHaveValue('Enter text...?');
    await expect(defaultValue).toHaveValue('hello!');
  });
});
