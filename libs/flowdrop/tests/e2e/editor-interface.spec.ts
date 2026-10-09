/**
 * E2E Test: editing a workflow's interface entries.
 *
 * Regression guard for two ways this surface could not be edited at all, both
 * caused by an edit failing to survive its own round trip through the store.
 *
 * 1. **Examples could not be authored.** Each card's `<details>` was rendered as
 *    `open={status?.status === 'type-mismatch'}`, a plain reactive attribute.
 *    Every edit inside the card comes back as a new `workflow`, which re-ran
 *    that attribute and forced the disclosure shut. The examples list lives
 *    inside it, so adding or committing an example collapsed the fields out from
 *    under the author: focus fell to `<body>` and the keystrokes that followed
 *    were silently dropped.
 * 2. **The interface's last entry could not be removed.** `commit` reported an
 *    emptied interface as `undefined`, which the store reads as "no interface
 *    supplied, leave it alone", so the removal never landed and the row stayed.
 *    Reported from a real workflow as "I cannot delete the output entry".
 *
 * Since 2.6.0 "Add input" / "Add output" opens an inline two-step composer
 * ("Bind it to an existing port?") instead of dropping in a blank row; its
 * "No, add a custom entry" path adds the same empty, unbound entry the button
 * used to, so the helpers below take that path.
 *
 * These assert the user-facing contract — the field stays on screen, keeps
 * focus, keeps what was typed, and the row actually goes away — rather than the
 * attributes that happen to implement it.
 *
 * This has to be e2e. Both bugs need a real edit to round trip through the
 * store and back as a new prop, and the first also needs a real browser's
 * `<details>` and focus semantics; the SSR render tests see neither.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

/** Open the workflow-settings panel (the navbar's Workflow button) and switch to its Interface tab. */
async function openInterfaceTab(page: Page): Promise<void> {
  await page.getByTestId('navbar-workflow-button').click();
  await page.getByRole('tab', { name: 'Interface' }).click();
  await expect(page.locator('.wf-interface')).toBeVisible();
}

/**
 * Add an empty, unbound entry through the composer's "No, add a custom entry"
 * path. (The other path, "Yes, bind to a port", opens the port picker.)
 */
async function addCustomEntry(page: Page, side: 'input' | 'output'): Promise<void> {
  await page.getByRole('button', { name: side === 'input' ? 'Add input' : 'Add output' }).click();
  await page.getByRole('button', { name: /^No, add a custom entry/ }).click();
}

/** Run an item of the nth entry's overflow menu (reorder, More options, Remove). */
async function entryMenu(page: Page, nth: number, item: string | RegExp): Promise<void> {
  await page.locator('.wf-interface__entry').nth(nth).getByTestId('wf-entry-menu').click();
  await page
    .getByRole(item === 'More options' ? 'menuitemcheckbox' : 'menuitem', { name: item })
    .click();
}

/** Add an input entry and open its secondary fields. */
async function addInputWithFieldsOpen(page: Page, nth = 0): Promise<void> {
  await addCustomEntry(page, 'input');
  await entryMenu(page, nth, 'More options');
  await expect(
    page.locator('.wf-interface__entry').nth(nth).locator('.wf-interface__example-add')
  ).toBeVisible();
}

test.describe('Interface editor', () => {
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

    await entryMenu(page, 0, 'More options');
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
    await addCustomEntry(page, 'input');
    await addInputWithFieldsOpen(page, 1);

    const entries = page.locator('.wf-interface__entry');
    await expect(entries).toHaveCount(2);
    const isOpen = () =>
      entries.evaluateAll((els) =>
        els.map((el) => el.querySelector('.wf-interface__more')?.hasAttribute('hidden') === false)
      );
    expect(await isOpen()).toEqual([false, true]);

    // Move the open entry up. Its disclosure belongs to the entry, not to the
    // slot the entry used to sit in.
    await entryMenu(page, 1, 'Move up');
    await expect.poll(isOpen).toEqual([true, false]);
  });

  test('the interface last entry can be removed', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await openInterfaceTab(page);

    // One entry on one side, nothing on the other: removing it empties the
    // whole interface. That used to be unremovable — `commit` reported the
    // emptied interface as `undefined`, which the store reads as "no interface
    // key supplied, leave it alone", so the row never left. Reproduced from a
    // real workflow as "I cannot delete the output entry".
    await addCustomEntry(page, 'output');
    await expect(page.locator('.wf-interface__entry')).toHaveCount(1);

    await entryMenu(page, 0, 'Remove');

    await expect(page.locator('.wf-interface__entry')).toHaveCount(0);
    // An empty side is just its insertion slot since 2.6.0 — the "No outputs
    // declared yet." placeholder is gone.
    await expect(page.getByRole('button', { name: 'Add output' })).toBeVisible();
  });

  test('removing an entry does not hand its open fields to a neighbour', async ({ page }) => {
    await gotoEditor(page, 'simple');
    await openInterfaceTab(page);

    // Two entries, with only the first one's fields open.
    await addInputWithFieldsOpen(page, 0);
    await addCustomEntry(page, 'input');

    const cards = page.locator('.wf-interface__entry');
    const isOpen = () =>
      cards.evaluateAll((els) =>
        els.map((el) => el.querySelector('.wf-interface__more')?.hasAttribute('hidden') === false)
      );
    expect(await isOpen()).toEqual([true, false]);

    // Drop the open entry. The survivor keeps its own closed state rather than
    // inheriting the removed row's.
    await entryMenu(page, 0, 'Remove');
    await expect(cards).toHaveCount(1);
    await expect.poll(isOpen).toEqual([false]);
  });
});
