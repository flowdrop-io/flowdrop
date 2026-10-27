/**
 * E2E Test: the Doctor (Problems indicator, popover, node badges, remedies).
 *
 * The backend is stubbed at the network edge (helpers/doctor-stub.ts) and reads
 * the draft it is sent, so a remedy, and its undo, change what the next
 * diagnose finds. `?workflow=doctor` carries one problem of each kind: an
 * unknown config key (warning), a missing required key (error), a node type
 * that is not installed (error).
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { stubDoctor } from './helpers/doctor-stub';
import { waitForEditor } from './helpers/editor-helpers';

const trigger = (page: Page) => page.getByTestId('doctor-trigger');
const popover = (page: Page) => page.getByTestId('doctor-popover');
const problemRow = (page: Page, code: string) =>
  page.locator(`[data-testid="doctor-problem"][data-code="${code}"]`);
const badge = (page: Page, id: string) =>
  page.locator(`.svelte-flow__node[data-id="${id}"] [data-testid="node-problem"]`);
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

async function gotoDoctor(page: Page): Promise<void> {
  await page.goto('/test/editor?workflow=doctor');
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await waitForEditor(page);
  await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
}

test.describe('Doctor', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('is absent when the backend has no Doctor route', async ({ page }) => {
    await gotoDoctor(page);
    await page.waitForTimeout(500);
    await expect(trigger(page)).toHaveCount(0);
    await expect(page.getByTestId('node-problem')).toHaveCount(0);
  });

  test('each of the three diagnostics shows on the canvas', async ({ page }) => {
    await stubDoctor(page);
    await gotoDoctor(page);

    await expect(trigger(page)).toContainText('3 problems');
    // The worst severity colours the indicator.
    await expect(trigger(page)).toHaveAttribute('data-severity', 'error');

    await expect(badge(page, 'node-input')).toHaveAttribute('data-severity', 'warning');
    await expect(badge(page, 'node-output')).toHaveAttribute('data-severity', 'error');
    await expect(badge(page, 'node-ghost')).toHaveAttribute('data-severity', 'error');
    await expect(badge(page, 'node-ghost')).toHaveAttribute('aria-label', 'Error: 1 problem');
  });

  test('the popover lists the problems; a node name selects the node', async ({ page }) => {
    await stubDoctor(page);
    await gotoDoctor(page);

    await trigger(page).click();
    await expect(popover(page)).toBeVisible();
    await expect(page.getByTestId('doctor-problem')).toHaveCount(3);
    await expect(problemRow(page, 'W_CONFIG_UNKNOWN')).toContainText('Unknown key "legacy_flag"');
    await expect(problemRow(page, 'W_CONFIG_UNKNOWN')).toContainText('Text Input');

    await problemRow(page, 'R1_PLUGIN_MISSING').getByTestId('doctor-node-link').click();
    // The node's inspector opens.
    await expect(page.locator('.config-panel').first()).toBeVisible();

    // Escape closes it and focus returns to the indicator.
    await page.keyboard.press('Escape');
    await expect(popover(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
  });

  test('a remedy applies as one edit and Ctrl/Cmd+Z restores the previous workflow exactly', async ({
    page
  }) => {
    const stub = await stubDoctor(page);
    await gotoDoctor(page);
    await expect(trigger(page)).toContainText('3 problems');
    const before = stub.diagnoseDrafts.at(-1)!;

    await trigger(page).click();
    await problemRow(page, 'W_CONFIG_UNKNOWN').getByTestId('doctor-remedy').click();
    await expect(trigger(page)).toContainText('2 problems');
    expect(stub.remedyRequests).toEqual([
      { code: 'W_CONFIG_UNKNOWN', target: 'W:node-input', remedy: 'remove_config_key' }
    ]);
    await expect(badge(page, 'node-input')).toHaveCount(0);
    expect(stub.diagnoseDrafts.at(-1)!.nodes[0].data.config).toEqual({ defaultValue: 'hello' });

    await page.keyboard.press(`${modifier}+z`);
    await expect(trigger(page)).toContainText('3 problems');
    await expect(badge(page, 'node-input')).toBeVisible();
    // The draft the Doctor saw after the undo is the one it saw before the remedy.
    const after = stub.diagnoseDrafts.at(-1)!;
    expect(after.nodes).toEqual(before.nodes);
    expect(after.edges).toEqual(before.edges);
  });

  test('a destructive remedy asks inline first; one undo brings the node back', async ({
    page
  }) => {
    const stub = await stubDoctor(page);
    await gotoDoctor(page);
    await expect(trigger(page)).toContainText('3 problems');

    await trigger(page).click();
    await problemRow(page, 'R6_CONFIG_REQUIRED').locator('[data-remedy="remove_node"]').click();
    const ask = problemRow(page, 'R6_CONFIG_REQUIRED').getByTestId('doctor-ask');
    await expect(ask).toContainText('This removes something');
    expect(stub.remedyRequests).toEqual([]);

    // Cancel leaves everything as it was.
    await ask.getByTestId('doctor-cancel').click();
    await expect(page.locator('.svelte-flow__node')).toHaveCount(3);

    await problemRow(page, 'R6_CONFIG_REQUIRED').locator('[data-remedy="remove_node"]').click();
    await ask.getByTestId('doctor-confirm').click();
    await expect(page.locator('.svelte-flow__node')).toHaveCount(2);
    await expect(trigger(page)).toContainText('2 problems');

    await page.keyboard.press(`${modifier}+z`);
    await expect(page.locator('.svelte-flow__node')).toHaveCount(3);
    await expect(trigger(page)).toContainText('3 problems');
  });

  test('a remedy that needs a choice shows it in the row', async ({ page }) => {
    const stub = await stubDoctor(page);
    await gotoDoctor(page);
    await trigger(page).click();

    const row = problemRow(page, 'R1_PLUGIN_MISSING');
    await row.locator('[data-remedy="replace_node_type"]').click();
    const confirm = row.getByTestId('doctor-confirm');
    await expect(confirm).toBeDisabled();
    await row.getByTestId('doctor-choice').selectOption('text_output');
    await confirm.click();

    await expect(trigger(page)).toContainText('2 problems');
    expect(stub.remedyRequests[0]).toMatchObject({
      remedy: 'replace_node_type',
      params: { node_type_id: 'text_output' }
    });
    await expect(badge(page, 'node-ghost')).toHaveCount(0);
  });

  test('a 409 says the problem is already gone and checks again', async ({ page }) => {
    const stub = await stubDoctor(page);
    await gotoDoctor(page);
    await trigger(page).click();

    stub.conflictNext = true;
    await problemRow(page, 'W_CONFIG_UNKNOWN').getByTestId('doctor-remedy').click();
    await expect(page.getByTestId('doctor-notice')).toContainText('already gone');
    // Nothing changed on the canvas.
    await expect(badge(page, 'node-input')).toBeVisible();
  });

  test('an operation the editor does not know aborts the remedy: nothing changes', async ({
    page
  }) => {
    const stub = await stubDoctor(page);
    await gotoDoctor(page);
    await trigger(page).click();

    stub.unknownOpNext = true;
    await problemRow(page, 'W_CONFIG_UNKNOWN').getByTestId('doctor-remedy').click();
    await expect(page.getByTestId('doctor-notice')).toContainText('could not be applied');
    await expect(trigger(page)).toContainText('3 problems');
    await expect(badge(page, 'node-input')).toBeVisible();
    // Not even the valid first operation was applied.
    expect(stub.diagnoseDrafts.at(-1)!.nodes[0].data.config).toEqual({
      defaultValue: 'hello',
      legacy_flag: true
    });
  });

  test('a remedy marked automatic is applied once after an edit, with an Undo toast', async ({
    page
  }) => {
    let diagnoses = 0;
    const remedies: unknown[] = [];
    const automatic = {
      id: 'auto',
      code: 'AUTO_FIX',
      severity: 'info',
      message: 'Can be tidied.',
      node: 'node-input',
      remedies: [
        {
          id: 'set_flag',
          label: 'Tidy',
          destructive: false,
          params: { automatic: true }
        }
      ]
    };
    await page.route('**/api/flowdrop/workflow/*/diagnose', async (route) => {
      diagnoses += 1;
      const problems = diagnoses > 1 && remedies.length === 0 ? [automatic] : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { problems } })
      });
    });
    await page.route('**/api/flowdrop/workflow/*/remedy', async (route) => {
      remedies.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            operations: [{ op: 'setWorkflowPayload', key: 'playground', value: { chat: null } }]
          }
        })
      });
    });
    await gotoDoctor(page);
    await expect.poll(() => diagnoses).toBeGreaterThan(0);

    // An edit after load: the next check finds the problem.
    const box = (await page.locator('.svelte-flow__node').first().boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + 50, { steps: 8 });
    await page.mouse.up();

    // The test page mounts two toasters, stacked: take the top one.
    const toast = page.locator('.flowdrop-toast-row').filter({ hasText: 'Done: Tidy' }).last();
    await expect(toast).toBeVisible({ timeout: 10000 });
    await expect(toast.getByRole('button', { name: 'Undo' })).toBeVisible();
    // The remedy ran once, and the next check (the problem is gone) does not ask again.
    await page.waitForTimeout(1500);
    expect(remedies).toHaveLength(1);
  });
  test('a failing check says so and offers Retry', async ({ page }) => {
    await page.route('**/api/flowdrop/workflow/*/diagnose', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Boom' })
      })
    );
    await gotoDoctor(page);
    await expect(page.getByTestId('doctor-unavailable')).toContainText('Check unavailable');
    await expect(page.getByTestId('doctor-retry')).toBeVisible();
  });

  test('a slow check shows Checking... and then the problems', async ({ page }) => {
    await stubDoctor(page);
    await page.route('**/api/flowdrop/workflow/*/diagnose', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fallback();
    });
    await gotoDoctor(page);
    await expect(page.getByTestId('doctor-checking')).toContainText('Checking...');
    await expect(trigger(page)).toContainText('3 problems', { timeout: 10000 });
  });
});
