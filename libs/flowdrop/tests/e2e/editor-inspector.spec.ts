/**
 * E2E Test: node inspector tabs, ports tab, external workflow row, pop-out.
 */

import { test, expect, type Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === 'Mobile Chrome', 'Config sidebar not on mobile');
});

async function open(page: Page, nodeId: string) {
  await page.locator(`.svelte-flow__node[data-id="${nodeId}"]`).dblclick({ force: true });
  await expect(page.locator('.config-panel').first()).toBeVisible();
}

const portRows = (page: Page, group: 'inputs' | 'outputs') =>
  page.locator(`[data-port-row^="${group}:"] .fd-ports__name`);

test.describe('Node inspector', () => {
  test('tabs: Config | Ports | Execution, one panel at a time', async ({ page }) => {
    await gotoEditor(page, 'inspector');
    await open(page, 'chat_output.2');

    for (const name of ['Config', 'Ports', 'Execution']) {
      await expect(page.getByRole('tab', { name })).toBeVisible();
    }
    await expect(page.getByLabel('Format', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Max retries', { exact: true })).toBeHidden();

    await page.getByRole('tab', { name: 'Execution' }).click();
    await expect(page.getByLabel('Max retries', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Format', { exact: true })).toBeHidden();

    await page.getByRole('tab', { name: 'Ports' }).click();
    await expect(page.locator('[data-port-row^="inputs:"]')).toHaveCount(4);
    await expect(page.locator('[data-port-row^="outputs:"]')).toHaveCount(5);
  });

  test('a node with no ports has no Ports tab and no strip when only Config remains', async ({
    page
  }) => {
    await gotoEditor(page, 'inspector');
    await open(page, 'note_settings.1');
    await expect(page.getByRole('tab', { name: 'Ports' })).toHaveCount(0);
    await expect(page.getByRole('tablist', { name: 'Node tabs' })).toHaveCount(0);
  });

  test('the eye button hides and shows a port', async ({ page }) => {
    await gotoEditor(page, 'inspector');
    await open(page, 'chat_output.2');
    await page.getByRole('tab', { name: 'Ports' }).click();

    const hide = page.getByRole('button', { name: 'Hide port Format' }).first();
    await hide.click();
    await expect(page.getByRole('button', { name: 'Show port Format' }).first()).toBeVisible();
    await expect(page.locator('[data-port-row="inputs:format"]')).toHaveClass(/--hidden/);

    await page.getByRole('button', { name: 'Show port Format' }).first().click();
    await expect(page.getByRole('button', { name: 'Hide port Format' }).first()).toBeVisible();
  });

  test('a locked port shows as on, with a lock, and explains itself instead of toggling', async ({
    page
  }) => {
    await gotoEditor(page, 'inspector');
    await open(page, 'chat_output.2');
    await page.getByRole('tab', { name: 'Ports' }).click();

    for (const group of ['inputs', 'outputs'] as const) {
      const locked = page.getByTestId(`port-locked-${group}-trigger`);
      const row = page.locator(`[data-port-row="${group}:trigger"]`);
      await expect(locked).toBeVisible();
      await expect(locked).toHaveAttribute('aria-label', 'Trigger is always shown');
      await expect(row).not.toHaveClass(/--hidden/);

      const hint = row.getByText('Always shown. The node type decides this port.');
      await expect(hint).toHaveCount(0);
      await locked.click();
      await expect(hint).toBeVisible();
      await expect(locked).toHaveAttribute('aria-expanded', 'true');
      await locked.press('Escape');
      await expect(hint).toHaveCount(0);
      await expect(row).not.toHaveClass(/--hidden/);
    }
    await expect(page.getByRole('button', { name: 'Hide port Trigger' })).toHaveCount(0);
  });

  test('a wired port says why it cannot hide; once unwired it hides', async ({ page }) => {
    await gotoEditor(page, 'inspector');
    await open(page, 'chat_output.2');
    await page.getByRole('tab', { name: 'Ports' }).click();
    const edge = page.locator('.svelte-flow__edge[data-id="inspector-edge-format"]');
    await expect(edge).toHaveCount(1);

    const row = page.locator('[data-port-row="outputs:format"]');
    const blocked = page.getByTestId('port-wired-outputs-format');
    await expect(blocked).toBeVisible();
    await expect(blocked).toHaveAttribute('aria-label', "format is connected and can't be hidden");
    await expect(row.getByRole('button', { name: 'Hide port format' })).toHaveCount(0);

    await blocked.click();
    await expect(
      row.getByText('Connected (1). Remove its connection on the canvas to hide it.')
    ).toBeVisible();
    await expect(edge).toHaveCount(1);
    await expect(row).not.toHaveClass(/--hidden/);

    // Delete the wire on the canvas: the eye works again. Select the edge by
    // keyboard, not by a click on its path: a missed click leaves focus on the
    // body, where WebKit's Backspace navigates away and the edge "disappears"
    // with the page.
    await page.locator('.svelte-flow__pane').click({ position: { x: 5, y: 5 } });
    await edge.focus();
    await page.keyboard.press('Enter');
    await expect(edge).toHaveClass(/selected/);
    await page.keyboard.press('Backspace');
    await expect(edge).toHaveCount(0);
    await expect(page.locator('.svelte-flow__node[data-id="chat_output.2"]')).toHaveCount(1);
    // Selecting the edge leaves the node; open it again.
    await open(page, 'chat_output.2');
    await page.getByRole('tab', { name: 'Ports' }).click();
    await expect(blocked).toHaveCount(0);
    await expect(row.getByText(/Connected \(/)).toHaveCount(0);
    await row.getByRole('button', { name: 'Hide port format' }).click();
    await expect(row).toHaveClass(/--hidden/);
  });

  test('Alt+ArrowDown / Alt+ArrowUp on a focused row reorders it', async ({ page }) => {
    await gotoEditor(page, 'inspector');
    await open(page, 'chat_output.2');
    await page.getByRole('tab', { name: 'Ports' }).click();

    const row = page.locator('[data-port-row="inputs:message"]');
    await row.focus();
    await page.keyboard.press('Alt+ArrowDown');
    await expect(portRows(page, 'inputs')).toHaveText([
      'Format',
      'Message',
      'Timestamp',
      'Trigger'
    ]);
    // Focus stays on the moved row, so the next press moves it again.
    await expect(page.locator('[data-port-row="inputs:message"]')).toBeFocused();
    await page.keyboard.press('Alt+ArrowUp');
    await expect(portRows(page, 'inputs')).toHaveText([
      'Message',
      'Format',
      'Timestamp',
      'Trigger'
    ]);
  });

  test('a subworkflow node shows "Runs <name>" as a link in the meta area', async ({ page }) => {
    await gotoEditor(page, 'inspector');
    await open(page, 'workflow_executor.1');
    const link = page.getByTestId('external-config-link');
    // The meta line shows the category label, not its key.
    await expect(page.locator('.readonly-details__meta')).toContainText('Tools');
    await expect(link).toHaveText('Calculator');
    await expect(link.locator('xpath=..')).toContainText('Runs');
    await expect(link).toHaveAttribute('href', /example\.com\/workflows/);
    await expect(page.getByText('External Configuration')).toHaveCount(0);
    await expect(page.getByText('Edit Workflow')).toHaveCount(0);
  });

  test('pop-out collapses the docked rail and shows the same tabs', async ({ page }) => {
    await gotoEditor(page, 'inspector');
    await open(page, 'chat_output.2');
    await page
      .getByRole('button', { name: /larger|pop out/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('tab', { name: 'Ports' })).toBeVisible();
    await expect(page.getByText('Configuration is open in a larger window')).toHaveCount(0);
    await expect(page.locator('.flowdrop-main-layout__sidebar--right')).toBeHidden();

    await dialog.getByRole('tab', { name: 'Ports' }).click();
    await expect(dialog.locator('[data-port-row^="inputs:"]')).toHaveCount(4);
  });
});
