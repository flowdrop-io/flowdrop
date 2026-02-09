/**
 * E2E Test: Auth Propagation to Autocomplete
 *
 * Verifies that when FlowDrop is mounted with an AuthProvider, the auth headers
 * flow through the full component chain to autocomplete API requests:
 *   mountFlowDropApp -> App.svelte -> ConfigForm -> FormAutocomplete -> fetch
 *
 * The MSW handler at /api/flowdrop/autocomplete/auth-users requires a valid
 * Bearer token and returns 401 without it.
 *
 * @see https://github.com/flowdrop-io/flowdrop/issues/21
 */

import { test, expect } from '@playwright/test';

test.describe('Auth Autocomplete Propagation', () => {
	test('autocomplete includes auth headers and loads suggestions', async ({ page }) => {
		// Navigate to the test route with auth enabled
		await page.goto('/test/auth-autocomplete');

		// Verify the test page loaded with auth enabled
		const authStatus = page.getByTestId('auth-status');
		await expect(authStatus).toHaveText('Auth: enabled');

		// Wait for the editor to be ready
		await page.waitForSelector('[data-testid="auth-autocomplete-test"]');

		// Click the pre-populated node to open the config panel
		// The node should be visible on the canvas
		const node = page.locator('.svelte-flow__node').first();
		await expect(node).toBeVisible({ timeout: 10000 });
		await node.click();

		// Wait for the config panel to open
		const configPanel = page.locator('.config-panel, .config-sidebar').first();
		await expect(configPanel).toBeVisible({ timeout: 5000 });

		// Find the assignee autocomplete input
		const autocompleteInput = configPanel.locator('.form-autocomplete__input').first();
		await expect(autocompleteInput).toBeVisible({ timeout: 5000 });

		// Focus the autocomplete field - this triggers fetchOnFocus
		await autocompleteInput.click();

		// Wait for the dropdown to show suggestions (not an error)
		// If auth headers are missing, the MSW handler returns 401
		// and the dropdown would show an error message
		const dropdown = page.locator('.form-autocomplete__popover').first();

		// Assert that suggestions loaded successfully (at least one option visible)
		const option = dropdown.locator('.form-autocomplete__option').first();
		await expect(option).toBeVisible({ timeout: 10000 });

		// Verify it's actual user data (from the mock), not an error
		const optionText = await option.textContent();
		expect(optionText).toBeTruthy();

		// Verify no error state is shown
		const errorMessage = dropdown.locator('.form-autocomplete__status--error');
		await expect(errorMessage).not.toBeVisible();
	});

	test('autocomplete shows error without auth provider', async ({ page }) => {
		// Navigate to the test route with auth disabled via ?noauth
		await page.goto('/test/auth-autocomplete?noauth');

		// Verify the test page loaded without auth
		const authStatus = page.getByTestId('auth-status');
		await expect(authStatus).toHaveText('Auth: disabled');

		// Wait for the editor to be ready
		await page.waitForSelector('[data-testid="auth-autocomplete-test"]');

		// Click the pre-populated node to open the config panel
		const node = page.locator('.svelte-flow__node').first();
		await expect(node).toBeVisible({ timeout: 10000 });
		await node.click();

		// Wait for the config panel to open
		const configPanel = page.locator('.config-panel, .config-sidebar').first();
		await expect(configPanel).toBeVisible({ timeout: 5000 });

		// Find the assignee autocomplete input
		const autocompleteInput = configPanel.locator('.form-autocomplete__input').first();
		await expect(autocompleteInput).toBeVisible({ timeout: 5000 });

		// Focus the autocomplete field - this triggers fetchOnFocus
		await autocompleteInput.click();

		// The MSW handler should return 401 since no auth headers are sent
		// This should result in an error state in the dropdown
		const dropdown = page.locator('.form-autocomplete__popover').first();

		// Wait for the error to appear (HTTP 401 response)
		const errorMessage = dropdown.locator('.form-autocomplete__status--error');
		await expect(errorMessage).toBeVisible({ timeout: 10000 });

		// Verify no successful options are shown
		const option = dropdown.locator('.form-autocomplete__option');
		await expect(option).not.toBeVisible();
	});
});
