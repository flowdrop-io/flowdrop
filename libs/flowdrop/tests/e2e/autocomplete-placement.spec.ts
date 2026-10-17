/**
 * E2E Test: Autocomplete dropdown placement
 *
 * When there is too little room below the field, the dropdown opens above it.
 * The popover must then sit directly on the field's top edge, not at the top of
 * the viewport (the UA `[popover] { inset: 0 }` used to win over the inline
 * `bottom` and pin it to y = 0).
 */

import { test, expect } from '@playwright/test';

const MOCK_USERS = [
  { label: 'Alice Johnson', value: 'alice' },
  { label: 'Bob Smith', value: 'bob' },
  { label: 'Carol Williams', value: 'carol' }
];

test.describe('Autocomplete placement', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === 'Mobile Chrome',
      'Config sidebar not available on mobile viewports'
    );
  });

  test('dropdown opened above the field is anchored to the field', async ({ page }) => {
    await page.route('**/api/flowdrop/autocomplete/auth-users*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USERS)
      })
    );

    await page.goto('/test/auth-autocomplete');
    await page.waitForSelector('[data-testid="auth-autocomplete-test"]');

    const node = page.locator('.svelte-flow__node').first();
    await expect(node).toBeVisible({ timeout: 10000 });
    await node.dblclick({ force: true });

    const configPanel = page.locator('.config-panel').first();
    await expect(configPanel).toBeVisible({ timeout: 5000 });

    const field = configPanel.locator('.form-autocomplete').first();
    await expect(field).toBeVisible({ timeout: 5000 });

    // Shrink the viewport so the space below the field is smaller than the
    // dropdown's max height (240px) and smaller than the space above it.
    const before = await field.boundingBox();
    expect(before).not.toBeNull();
    const viewport = page.viewportSize()!;
    await page.setViewportSize({
      width: viewport.width,
      height: Math.ceil(before!.y + before!.height + 120)
    });

    const box = (await field.boundingBox())!;
    expect(box.y).toBeGreaterThan(260);

    await field.locator('.form-autocomplete__input').click();

    const popover = page.locator('.form-autocomplete__popover').first();
    await expect(popover.locator('.form-autocomplete__option').first()).toBeVisible({
      timeout: 10000
    });

    // Focusing the field can scroll the panel, so measure the field again now
    // that the list is open, not the box from before the click.
    const field2 = (await field.boundingBox())!;
    const pop = (await popover.boundingBox())!;
    // Opened above, with its bottom edge just over the field's top edge.
    const gap = field2.y - (pop.y + pop.height);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(12);
  });
});
