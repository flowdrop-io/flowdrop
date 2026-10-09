/**
 * E2E Test: the workflow's Playground settings tab.
 *
 * The chat binding (which input the message goes to, which node ports print
 * as replies) moved off interface `turn` marks into `workflow.playground`
 * (fdnpm 2.11.0, FlowDrop for Drupal 2.7.0). These check what a person sees:
 * the tab exists only for a backend that sends the settings, an unset
 * workflow says it has no chat, a choice lands in the workflow, and a
 * workflow still chatting through `turn` marks can move them in one step.
 *
 * The test page simulates the backend with `?playground=none|turn`.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Open the workflow-settings panel with the navbar's Workflow button. */
async function openWorkflowSettings(page: Page): Promise<void> {
  await page.getByTestId('navbar-workflow-button').click();
  await expect(page.getByRole('tab', { name: 'Interface' })).toBeVisible();
}

async function gotoEditorWith(page: Page, playground?: 'none' | 'turn'): Promise<void> {
  await page.goto(playground ? `/test/editor?playground=${playground}` : '/test/editor');
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
}

test.describe('Playground settings tab', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('is not offered when the backend sends no Playground settings', async ({ page }) => {
    await gotoEditorWith(page);
    await openWorkflowSettings(page);
    await expect(page.getByRole('tab', { name: 'Playground' })).toHaveCount(0);
  });

  test('says a workflow has no chat until someone sets it up, and takes a reply', async ({
    page
  }) => {
    await gotoEditorWith(page, 'none');
    await openWorkflowSettings(page);
    await page.getByRole('tab', { name: 'Playground' }).click();

    const panel = page.getByTestId('workflow-playground-settings');
    await expect(panel.getByText('Not set up')).toBeVisible();

    await panel.getByRole('checkbox', { name: 'Text Input · Value' }).check();
    await expect(panel.getByText('Not set up')).toHaveCount(0);
    await expect(panel.getByRole('checkbox', { name: 'Text Input · Value' })).toBeChecked();

    // Unchecking the only choice leaves nothing stored: back to "Not set up".
    await panel.getByRole('checkbox', { name: 'Text Input · Value' }).uncheck();
    await expect(panel.getByText('Not set up')).toBeVisible();
  });

  test('moves deprecated interface turn marks into the settings', async ({ page }) => {
    await gotoEditorWith(page, 'turn');
    await openWorkflowSettings(page);

    // The Interface tab shows the old mark read-only, with a way to the new home.
    await page.getByRole('tab', { name: 'Interface' }).click();
    await page.getByTestId('wf-entry-menu').first().click();
    await page.getByRole('menuitemcheckbox', { name: 'More options' }).click();
    await expect(page.locator('.wf-interface__turn-deprecated')).toBeVisible();
    await page.getByRole('button', { name: 'Open Playground settings' }).click();

    const panel = page.getByTestId('workflow-playground-settings');
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: 'Move them here' }).click();

    await expect(panel.getByRole('combobox', { name: 'Message goes to' })).toHaveValue('message');
    await expect(panel.getByRole('button', { name: 'Move them here' })).toHaveCount(0);
    // Message bound, no reply chosen: the tab warns before anyone sends.
    await expect(panel.getByText('Nothing will print.')).toBeVisible();

    await page.getByRole('tab', { name: 'Interface' }).click();
    await expect(page.locator('.wf-interface__turn-deprecated')).toHaveCount(0);
  });
});

test.describe('Inspector follows the selection', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('a node wins over open workflow settings, and closing it returns to the tabs', async ({
    page
  }) => {
    await gotoEditorWith(page, 'none');
    await openWorkflowSettings(page);
    await expect(page.getByRole('tab', { name: 'Playground' })).toBeVisible();

    // Select a node: its config shows instead of the workflow tabs.
    await page.locator('.svelte-flow__node').first().dblclick({ force: true });
    await expect(page.locator('.config-panel').first()).toContainText('Text Input');
    await expect(page.getByRole('tab', { name: 'Interface' })).toHaveCount(0);

    // Deselect: the workflow tabs are back, Playground among them.
    const pane = page.locator('.svelte-flow__pane');
    const box = await pane.boundingBox();
    if (!box) throw new Error('Canvas pane not found');
    await page.mouse.click(box.x + 50, box.y + box.height - 50);
    await expect(page.getByRole('tab', { name: 'Interface' })).toBeVisible();
    await page.getByRole('tab', { name: 'Playground' }).click();
    await expect(page.getByTestId('workflow-playground-settings')).toBeVisible();
  });
});
