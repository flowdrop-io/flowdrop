/**
 * E2E Test: the Runs list in Test mode.
 *
 * A "Runs" control in the canvas toolbar lists the workflow's past runs from
 * the pipelines list endpoint (paged). Opening a run shows its node statuses on
 * the canvas; Re-run and Cancel are the only actions; admin links are drawn
 * only when the host gives URL templates. The backend is stubbed at the
 * network edge (helpers/runs-stub.ts).
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';
import { ago, sampleRuns, stubRuns, type StubRun } from './helpers/runs-stub';

const modeSwitch = (page: Page) => page.getByRole('radiogroup', { name: 'Editor mode' });
const testButton = (page: Page) => modeSwitch(page).getByRole('radio', { name: 'Test' });
const trigger = (page: Page) => page.getByTestId('runs-trigger');
const rows = (page: Page) => page.getByTestId('run-row');
const row = (page: Page, id: number) =>
  page.locator(`[data-testid="run-row"][data-run-id="${id}"]`);
const node = (page: Page, id: string) => page.locator(`.svelte-flow__node[data-id="${id}"]`);

test.describe('Runs list', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('is a Test mode control: absent in Edit mode', async ({ page }) => {
    await stubRuns(page);
    await gotoEditor(page);
    await expect(trigger(page)).toHaveCount(0);
    await testButton(page).click();
    await expect(trigger(page)).toBeVisible();
    await modeSwitch(page).getByRole('radio', { name: 'Edit' }).click();
    await expect(trigger(page)).toHaveCount(0);
  });

  test('lists the runs newest first, with status, time and duration', async ({ page }) => {
    const stub = await stubRuns(page);
    await gotoEditor(page);
    await testButton(page).click();
    await trigger(page).click();

    await expect(page.getByRole('list', { name: 'Runs of this workflow' })).toBeVisible();
    await expect(rows(page)).toHaveCount(5);
    await expect(rows(page).first()).toHaveAttribute('data-run-id', '106');
    // 20 per page, from the start.
    expect(stub.listCalls[0]).toEqual({ limit: 20, offset: 0 });

    // A finished run shows its duration (1 minute); a running one shows none.
    await expect(row(page, 105)).toContainText('Done');
    await expect(row(page, 105)).toContainText('1m');
    await expect(row(page, 106)).toContainText('Running');
    await expect(row(page, 106).locator('.fd-runs__duration')).toHaveText('');
    await expect(row(page, 103)).toContainText('Failed');
    await expect(row(page, 102)).toContainText('Cancelled');
  });

  test('opening a past run shows its node statuses on the canvas', async ({ page }) => {
    await stubRuns(page);
    await gotoEditor(page);
    await testButton(page).click();
    await trigger(page).click();

    await row(page, 103).click();
    // The popover closes and focus is back on the trigger.
    await expect(page.getByTestId('runs-popover')).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await expect(node(page, 'node-input').locator('.node-status-overlay')).toHaveAttribute(
      'data-status',
      'completed',
      { timeout: 10000 }
    );
    await expect(node(page, 'node-output').locator('.node-status-overlay')).toHaveAttribute(
      'data-status',
      'failed'
    );

    // Another run replaces them, and the list marks the one shown.
    await trigger(page).click();
    await expect(row(page, 103)).toHaveAttribute('aria-current', 'true');
    await row(page, 105).click();
    await expect(node(page, 'node-output').locator('.node-status-overlay')).toHaveAttribute(
      'data-status',
      'completed',
      { timeout: 10000 }
    );
  });

  test('the trigger names the shown run, and clearing it goes back', async ({ page }) => {
    await stubRuns(page);
    await gotoEditor(page);
    await testButton(page).click();
    await expect(trigger(page)).toHaveText('Runs');
    await expect(page.getByTestId('runs-clear')).toHaveCount(0);

    await trigger(page).click();
    await row(page, 103).click();
    await expect(page.getByTestId('runs-shown')).toContainText('Run · Failed');
    await expect(node(page, 'node-output').locator('.node-status-overlay')).toHaveAttribute(
      'data-status',
      'failed',
      { timeout: 10000 }
    );

    await page.getByRole('button', { name: 'Stop showing this run' }).click();
    await expect(trigger(page)).toHaveText('Runs');
    await expect(page.getByTestId('runs-clear')).toHaveCount(0);
    await expect(node(page, 'node-output').locator('.node-status-overlay')).toHaveCount(0);
  });

  test('pages with Load more', async ({ page }) => {
    const many: StubRun[] = Array.from({ length: 25 }, (_, i) => ({
      id: 200 - i,
      status: 'completed',
      createdAt: ago(100 + i),
      lastExecuted: ago(99 + i),
      nodes: { 'node-input': 'completed', 'node-output': 'completed' }
    }));
    const stub = await stubRuns(page, many);
    await gotoEditor(page);
    await testButton(page).click();
    await trigger(page).click();

    await expect(rows(page)).toHaveCount(20);
    await page.getByTestId('runs-load-more').click();
    await expect(rows(page)).toHaveCount(25);
    expect(stub.listCalls.at(-1)).toEqual({ limit: 20, offset: 20 });
    // A short page was the end.
    await expect(page.getByTestId('runs-load-more')).toHaveCount(0);
  });

  test('Re-run starts a run, shows it and lists it', async ({ page }) => {
    const stub = await stubRuns(page);
    await gotoEditor(page);
    await testButton(page).click();
    await trigger(page).click();

    // Re-run is for finished runs only; Cancel for the others.
    await expect(row(page, 105).locator('xpath=..').getByTestId('run-rerun')).toHaveCount(1);
    await expect(row(page, 106).locator('xpath=..').getByTestId('run-rerun')).toHaveCount(0);

    await row(page, 105).hover();
    await page.getByRole('button', { name: 'Re-run run 105' }).click();
    await expect.poll(() => stub.rerun).toEqual(['105']);
    // The new run is the shown run: its statuses are on the canvas.
    await expect(node(page, 'node-input').locator('.node-status-overlay')).toHaveAttribute(
      'data-status',
      'running',
      { timeout: 10000 }
    );
    await trigger(page).click();
    await expect(rows(page).first()).toHaveAttribute('data-run-id', '107');
  });

  test('Cancel stops a run that has not finished and the list follows', async ({ page }) => {
    const stub = await stubRuns(page);
    await gotoEditor(page);
    await testButton(page).click();
    await trigger(page).click();

    await expect(row(page, 105).locator('xpath=..').getByTestId('run-cancel')).toHaveCount(0);
    await row(page, 106).hover();
    await page.getByRole('button', { name: 'Cancel run 106' }).click();
    await expect.poll(() => stub.cancelled).toEqual(['106']);
    await expect(row(page, 106)).toContainText('Cancelled');
    await expect(row(page, 106).locator('xpath=..').getByTestId('run-cancel')).toHaveCount(0);
  });

  test('a refused cancel says why', async ({ page }) => {
    await stubRuns(page, sampleRuns(), { cancelFails: true });
    await gotoEditor(page);
    await testButton(page).click();
    await trigger(page).click();
    await row(page, 106).hover();
    await page.getByRole('button', { name: 'Cancel run 106' }).click();
    await expect(page.getByTestId('runs-error')).toHaveText('The run already finished.');
  });

  test('shows an empty state', async ({ page }) => {
    await stubRuns(page, []);
    await gotoEditor(page);
    await testButton(page).click();
    await trigger(page).click();
    await expect(page.getByText('No runs yet')).toBeVisible();
  });

  test('keyboard: arrows move between runs, Enter opens, Escape closes', async ({ page }) => {
    await stubRuns(page);
    await gotoEditor(page);
    await testButton(page).click();
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    await expect(rows(page)).toHaveCount(5);
    await rows(page).first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(rows(page).nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(rows(page).last()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('runs-popover')).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
  });

  test('admin links are drawn only when the host gives templates', async ({ page }) => {
    await stubRuns(page);
    await gotoEditor(page);
    await testButton(page).click();
    await trigger(page).click();
    await expect(page.getByTestId('runs-admin-link')).toHaveCount(0);
    await expect(page.getByTestId('run-admin-link')).toHaveCount(0);

    await page.goto('/test/editor?adminLinks=1');
    await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
    await testButton(page).click();
    await trigger(page).click();
    await expect(page.getByTestId('runs-admin-link')).toHaveAttribute(
      'href',
      '/admin/flowdrop/pipelines?workflow=test-workflow-simple'
    );
    await expect(page.getByTestId('run-admin-link').first()).toHaveAttribute(
      'href',
      /\/admin\/flowdrop\/pipelines\/106$/
    );
  });
});
