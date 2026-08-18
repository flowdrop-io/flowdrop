/**
 * E2E Test: authoring examples on a workflow interface input.
 *
 * Regression guard for the examples list being unusable. `WorkflowInterfaceEditor`
 * rendered each card's `<details>` as `open={status?.status === 'type-mismatch'}` —
 * a plain reactive attribute. Every edit inside the card routes through
 * `onChange` and returns as a new `workflow`, which re-ran that attribute update
 * and forced the disclosure shut. Since the examples list lives inside the
 * disclosure, adding or committing an example collapsed the fields out from
 * under the author: focus fell to `<body>` and the keystrokes that followed
 * were silently dropped.
 *
 * These assert the user-facing contract — the field stays on screen, keeps
 * focus, and keeps what was typed — rather than the `open` attribute that
 * happens to implement it.
 *
 * This has to be an e2e test. The collapse only appears when a real edit round
 * trips through the store and back as a new prop, and only a real browser has
 * `<details>` toggle and focus semantics; the SSR render tests see neither.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

/**
 * Open the workflow-settings panel and switch to its Interface tab.
 *
 * The navbar renders the settings link twice — once in full mode and once in
 * the overflow dropdown — and CSS hides whichever does not apply at this
 * viewport, so open the dropdown when it is the live one and always click the
 * visible link.
 */
async function openInterfaceTab(page: Page): Promise<void> {
  const trigger = page.locator('.flowdrop-navbar__dropdown-trigger');
  if (await trigger.isVisible()) {
    await trigger.click();
  }
  await page.locator('a[href="#settings"]:visible').first().click();
  await page.getByRole('tab', { name: 'Interface' }).click();
  await expect(page.locator('.wf-interface')).toBeVisible();
}

/** Add an input entry and open its secondary-fields disclosure. */
async function addInputWithFieldsOpen(page: Page, nth = 0): Promise<void> {
  await page.getByRole('button', { name: 'Add input' }).click();
  await page.locator('.wf-interface__more').nth(nth).locator('summary').click();
  await expect(page.locator('.wf-interface__example-add').nth(nth)).toBeVisible();
}

test.describe('Interface editor — examples', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('an example field survives being added to and typed into', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await openInterfaceTab(page);
    await addInputWithFieldsOpen(page);

    // Adding an example is an edit — the fields must stay on screen.
    await page.locator('.wf-interface__example-add').first().click();
    const first = page.locator('.wf-interface__example-row input').first();
    await expect(first).toBeVisible();

    // Typing must land in the field and stay there, focus intact. This is what
    // the collapse broke: the field went away mid-word and the rest of the
    // keystrokes went to `<body>`.
    await first.click();
    await first.pressSequentially('alpha');
    await expect(first).toBeFocused();
    await expect(first).toHaveValue('alpha');

    // Committing the value is another edit, and must not disturb the fields.
    await first.blur();
    await expect(first).toBeVisible();
    await expect(first).toHaveValue('alpha');

    // A second example typed after a committed one is the shape that made the
    // editor unusable.
    await page.locator('.wf-interface__example-add').first().click();
    const second = page.locator('.wf-interface__example-row input').nth(1);
    await second.click();
    await second.pressSequentially('beta');
    await expect(second).toBeFocused();
    await expect(second).toHaveValue('beta');

    await second.blur();
    await expect(first).toHaveValue('alpha');
    await expect(second).toHaveValue('beta');
  });

  test('the author closing the fields is respected across edits', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await openInterfaceTab(page);
    await addInputWithFieldsOpen(page);

    const more = page.locator('.wf-interface__more').first();
    await more.locator('summary').click();
    await expect(page.locator('.wf-interface__example-add')).toBeHidden();

    // An edit elsewhere in the card must not re-open what the author closed.
    const id = page.locator('.wf-interface__entry input').first();
    await id.fill('renamed_input');
    await id.blur();
    await expect(page.locator('.wf-interface__example-add')).toBeHidden();
  });

  test('open fields travel with their entry when entries are reordered', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await openInterfaceTab(page);

    // Two entries, with only the second one's fields open.
    await page.getByRole('button', { name: 'Add input' }).click();
    await addInputWithFieldsOpen(page, 1);

    const cards = page.locator('.wf-interface__more');
    await expect(cards).toHaveCount(2);
    const isOpen = () =>
      cards.evaluateAll((els) => els.map((el) => (el as HTMLDetailsElement).open));
    expect(await isOpen()).toEqual([false, true]);

    // Move the open entry up. Its disclosure belongs to the entry, not to the
    // slot the entry used to sit in.
    await page
      .locator('.wf-interface__entry')
      .nth(1)
      .getByLabel(/Move .* up/i)
      .click();
    await expect.poll(isOpen).toEqual([true, false]);
  });

  test('removing an entry does not hand its open fields to a neighbour', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await openInterfaceTab(page);

    // Two entries, with only the first one's fields open.
    await addInputWithFieldsOpen(page, 0);
    await page.getByRole('button', { name: 'Add input' }).click();

    const cards = page.locator('.wf-interface__more');
    const isOpen = () =>
      cards.evaluateAll((els) => els.map((el) => (el as HTMLDetailsElement).open));
    expect(await isOpen()).toEqual([true, false]);

    // Drop the open entry. The survivor keeps its own closed state rather than
    // inheriting the removed row's.
    await page
      .locator('.wf-interface__entry')
      .first()
      .getByLabel(/^Remove interface entry/)
      .click();
    await expect(cards).toHaveCount(1);
    await expect.poll(isOpen).toEqual([false]);
  });
});
