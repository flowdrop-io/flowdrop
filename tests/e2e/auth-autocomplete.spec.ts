/**
 * E2E Test: Auth Propagation to Autocomplete
 *
 * Verifies that when FlowDrop is mounted with an AuthProvider, the auth headers
 * flow through the full component chain to autocomplete API requests:
 *   mountFlowDropApp -> App.svelte -> ConfigForm -> FormAutocomplete -> fetch
 *
 * Uses Playwright's page.route() to intercept API calls and verify auth headers,
 * rather than relying on MSW in the production build.
 *
 * @see https://github.com/flowdrop-io/flowdrop/issues/21
 */

import { test, expect } from '@playwright/test';

/** Mock user data returned when auth is valid */
const MOCK_USERS = [
	{ label: 'Alice Johnson', value: 'alice' },
	{ label: 'Bob Smith', value: 'bob' },
	{ label: 'Carol Williams', value: 'carol' }
];

/** The token the test route's StaticAuthProvider uses */
const EXPECTED_TOKEN = 'test-auth-token-123';

test.describe('Auth Autocomplete Propagation', () => {
	// Skip mobile viewports - the config sidebar requires desktop-width layout
	test.beforeEach(({}, testInfo) => {
		test.skip(testInfo.project.name === 'Mobile Chrome', 'Config sidebar not available on mobile viewports');
	});

	test('autocomplete includes auth headers and loads suggestions', async ({ page }) => {
		// Intercept the autocomplete API call to verify auth headers and return mock data
		let capturedAuthHeader: string | null = null;
		await page.route('**/api/flowdrop/autocomplete/auth-users*', async (route) => {
			capturedAuthHeader = route.request().headers()['authorization'] ?? null;

			if (capturedAuthHeader === `Bearer ${EXPECTED_TOKEN}`) {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_USERS)
				});
			} else {
				await route.fulfill({
					status: 401,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Unauthorized' })
				});
			}
		});

		// Navigate to the test route with auth enabled
		await page.goto('/test/auth-autocomplete');

		// Verify the test page loaded with auth enabled
		const authStatus = page.getByTestId('auth-status');
		await expect(authStatus).toHaveText('Auth: enabled');

		// Wait for the editor to be ready
		await page.waitForSelector('[data-testid="auth-autocomplete-test"]');

		// Double-click the pre-populated node to open the config panel
		const node = page.locator('.svelte-flow__node').first();
		await expect(node).toBeVisible({ timeout: 10000 });
		await node.dblclick({ force: true });

		// Wait for the config panel to open
		const configPanel = page.locator('.config-panel').first();
		await expect(configPanel).toBeVisible({ timeout: 5000 });

		// Find the assignee autocomplete input
		const autocompleteInput = configPanel.locator('.form-autocomplete__input').first();
		await expect(autocompleteInput).toBeVisible({ timeout: 5000 });

		// Focus the autocomplete field - this triggers fetchOnFocus
		await autocompleteInput.click();

		// Wait for the dropdown to show suggestions
		const dropdown = page.locator('.form-autocomplete__popover').first();

		// Assert that suggestions loaded successfully (at least one option visible)
		const option = dropdown.locator('.form-autocomplete__option').first();
		await expect(option).toBeVisible({ timeout: 10000 });

		// Verify it's actual user data from our mock
		const optionText = await option.textContent();
		expect(optionText).toContain('Alice');

		// Verify auth header was sent correctly
		expect(capturedAuthHeader).toBe(`Bearer ${EXPECTED_TOKEN}`);

		// Verify no error state is shown
		const errorMessage = dropdown.locator('.form-autocomplete__status--error');
		await expect(errorMessage).not.toBeVisible();
	});

	test('autocomplete shows error without auth provider', async ({ page }) => {
		// Intercept the autocomplete API call - return 401 for requests without auth
		await page.route('**/api/flowdrop/autocomplete/auth-users*', async (route) => {
			const authHeader = route.request().headers()['authorization'];

			if (authHeader && authHeader === `Bearer ${EXPECTED_TOKEN}`) {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_USERS)
				});
			} else {
				await route.fulfill({
					status: 401,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Unauthorized' })
				});
			}
		});

		// Navigate to the test route with auth disabled via ?noauth
		await page.goto('/test/auth-autocomplete?noauth');

		// Verify the test page loaded without auth
		const authStatus = page.getByTestId('auth-status');
		await expect(authStatus).toHaveText('Auth: disabled');

		// Wait for the editor to be ready
		await page.waitForSelector('[data-testid="auth-autocomplete-test"]');

		// Double-click the pre-populated node to open the config panel
		const node = page.locator('.svelte-flow__node').first();
		await expect(node).toBeVisible({ timeout: 10000 });
		await node.dblclick({ force: true });

		// Wait for the config panel to open
		const configPanel = page.locator('.config-panel').first();
		await expect(configPanel).toBeVisible({ timeout: 5000 });

		// Find the assignee autocomplete input
		const autocompleteInput = configPanel.locator('.form-autocomplete__input').first();
		await expect(autocompleteInput).toBeVisible({ timeout: 5000 });

		// Focus the autocomplete field - this triggers fetchOnFocus
		await autocompleteInput.click();

		// The API should return 401 since no auth headers are sent
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
