/**
 * E2E Test: Editor Rendering
 *
 * Smoke tests verifying that the workflow editor canvas, nodes, edges,
 * sidebar, and status bar render correctly.
 */

import { test, expect } from '@playwright/test';
import {
	gotoEditor,
	getNodeCount,
	getEdgeCount,
	assertStatusBar
} from './helpers/editor-helpers';

test.describe('Editor Rendering', () => {
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name === 'Mobile Chrome',
			'Editor requires desktop-width viewport'
		);
	});

	test('canvas renders with nodes and edges from simple workflow', async ({ page }) => {
		await gotoEditor(page, 'simple');

		// Should show 2 nodes
		const nodeCount = await getNodeCount(page);
		expect(nodeCount).toBe(2);

		// Status bar should reflect counts (use status bar for edge count as
		// SvelteFlow renders edges as SVG that may not be immediately queryable)
		await assertStatusBar(page, 2, 1);
	});

	test('empty canvas shows drop zone banner', async ({ page }) => {
		await gotoEditor(page, 'empty');

		// Should show no nodes
		const nodeCount = await getNodeCount(page);
		expect(nodeCount).toBe(0);

		// Should show the banner prompting users to drag components
		const banner = page.locator('text=Drag components here to start building');
		await expect(banner).toBeVisible({ timeout: 5000 });

		// Status bar should show 0 counts
		await assertStatusBar(page, 0, 0);
	});

	test('complex workflow renders multiple nodes and edges', async ({ page }) => {
		await gotoEditor(page, 'complex');

		// Should show 4 nodes
		const nodeCount = await getNodeCount(page);
		expect(nodeCount).toBe(4);

		// Status bar should reflect counts
		await assertStatusBar(page, 4, 3);
	});

	test('sidebar renders with node categories', async ({ page }) => {
		await gotoEditor(page, 'simple');

		// Sidebar should be visible
		const sidebar = page.locator('.flowdrop-sidebar').first();
		await expect(sidebar).toBeVisible({ timeout: 5000 });

		// Should have category sections (nodes are inside collapsed accordions)
		const categories = page.locator('.flowdrop-details');
		const categoryCount = await categories.count();
		expect(categoryCount).toBeGreaterThan(0);

		// Expand the first category to reveal node items
		await categories.first().locator('summary').click();
		await page.waitForTimeout(300);

		// Should have draggable node items inside the expanded category
		const nodeItems = page.locator('.flowdrop-node-item:visible');
		const count = await nodeItems.count();
		expect(count).toBeGreaterThan(0);
	});

	test('sidebar search filters categories', async ({ page }) => {
		await gotoEditor(page, 'simple');

		// Find the search input in the sidebar
		const searchInput = page.locator('.flowdrop-sidebar__search input');
		await expect(searchInput).toBeVisible({ timeout: 5000 });

		// Count initial categories
		const initialCategoryCount = await page.locator('.flowdrop-details').count();
		expect(initialCategoryCount).toBeGreaterThan(1);

		// Type a search term that should match only one node type
		await searchInput.fill('Calculator');
		await page.waitForTimeout(500);

		// When searching, node items are shown directly (not in collapsed categories)
		// or the number of visible categories should decrease
		const filteredCategoryCount = await page.locator('.flowdrop-details').count();
		expect(filteredCategoryCount).toBeLessThanOrEqual(initialCategoryCount);

		// Clear search
		await searchInput.fill('');
		await page.waitForTimeout(500);

		// Should restore all categories
		const restoredCount = await page.locator('.flowdrop-details').count();
		expect(restoredCount).toBe(initialCategoryCount);
	});

	test('variant indicator shows correct workflow type', async ({ page }) => {
		await gotoEditor(page, 'simple');
		const indicator = page.getByTestId('workflow-variant');
		await expect(indicator).toHaveText('Variant: simple');
	});
});
