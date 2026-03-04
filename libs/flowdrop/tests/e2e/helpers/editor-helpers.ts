/**
 * Shared helpers for editor E2E tests
 *
 * Reusable functions for navigating, interacting with, and asserting
 * against the FlowDrop workflow editor in Playwright tests.
 */

import { type Page, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Navigation & Waiting
// ---------------------------------------------------------------------------

/** Wait for the SvelteFlow canvas to be ready */
export async function waitForEditor(page: Page): Promise<void> {
	await page.waitForSelector('.svelte-flow__pane', { timeout: 15000 });
}

/**
 * Wait for the sidebar to finish loading node types.
 * The sidebar shows "Loading from server..." while nodes are being fetched.
 * Once loaded, it shows category sections with `.flowdrop-details` elements.
 * Note: Node items inside categories are hidden by default (collapsed accordions).
 */
export async function waitForSidebar(page: Page): Promise<void> {
	await page.waitForSelector('.flowdrop-details', { timeout: 15000 });
}

/**
 * Navigate to the editor test route and wait for it to be fully ready.
 *
 * For non-empty workflows: waits for nodes to render on canvas.
 * For empty workflows: waits for the empty state banner.
 * Always waits for the sidebar to finish loading.
 */
export async function gotoEditor(
	page: Page,
	variant: 'simple' | 'empty' | 'complex' | 'disconnected' = 'simple'
): Promise<void> {
	const url = variant === 'simple' ? '/test/editor' : `/test/editor?workflow=${variant}`;
	await page.goto(url);
	await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
	await waitForEditor(page);

	// Wait for App's async onMount to finish initializing
	if (variant === 'empty') {
		// For empty workflows, wait for the banner to appear
		await page.waitForSelector('text=Drag components here to start building', { timeout: 15000 });
	} else {
		// For workflows with nodes, wait for at least one node to render
		await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
	}

	// Wait for sidebar to finish loading node types
	await waitForSidebar(page);
}

// ---------------------------------------------------------------------------
// Counting
// ---------------------------------------------------------------------------

/** Get the count of visible nodes on the canvas */
export async function getNodeCount(page: Page): Promise<number> {
	return page.locator('.svelte-flow__node').count();
}

/**
 * Get the edge count from the status bar text.
 * SvelteFlow renders edges as SVG elements that may not be immediately
 * queryable via DOM selectors, so we read the count from the status bar
 * which reflects the internal state.
 */
export async function getEdgeCount(page: Page): Promise<number> {
	const statusBar = page.locator('.flowdrop-status-bar');
	const text = await statusBar.textContent({ timeout: 5000 });
	const match = text?.match(/(\d+)\s*connections/);
	return match ? parseInt(match[1], 10) : 0;
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/** Assert the status bar shows expected node and edge counts */
export async function assertStatusBar(
	page: Page,
	expectedNodes: number,
	expectedEdges: number
): Promise<void> {
	const statusBar = page.locator('.flowdrop-status-bar');
	await expect(statusBar).toContainText(`${expectedNodes} nodes`, { timeout: 5000 });
	await expect(statusBar).toContainText(`${expectedEdges} connections`, { timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

/** Double-click a node to open its config panel */
export async function openNodeConfig(page: Page, nodeIndex = 0): Promise<void> {
	const node = page.locator('.svelte-flow__node').nth(nodeIndex);
	await expect(node).toBeVisible({ timeout: 10000 });
	await node.dblclick({ force: true });
	await expect(page.locator('.config-panel').first()).toBeVisible({ timeout: 5000 });
}

/** Click on the canvas background to deselect / close panels */
export async function clickCanvas(page: Page): Promise<void> {
	const pane = page.locator('.svelte-flow__pane');
	const box = await pane.boundingBox();
	if (!box) throw new Error('Canvas pane not found');
	// Click the center of the pane
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Select a node by clicking on it */
export async function selectNode(page: Page, nodeIndex = 0): Promise<void> {
	const node = page.locator('.svelte-flow__node').nth(nodeIndex);
	await expect(node).toBeVisible({ timeout: 10000 });
	await node.click();
}

// ---------------------------------------------------------------------------
// API Mocking
// ---------------------------------------------------------------------------

/** Set up standard API route interceptions that editor tests need */
export async function setupEditorApiMocks(page: Page): Promise<void> {
	// Intercept workflow save (PUT)
	await page.route('**/api/flowdrop/workflows/**', async (route) => {
		if (route.request().method() === 'PUT') {
			const body = route.request().postDataJSON();
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					data: { ...body, id: body?.id || 'test-workflow-id' },
					message: 'Workflow saved'
				})
			});
		} else if (route.request().method() === 'POST') {
			const body = route.request().postDataJSON();
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					data: { ...body, id: 'new-workflow-id' },
					message: 'Workflow created'
				})
			});
		} else {
			await route.continue();
		}
	});

	// Intercept port config
	await page.route('**/api/flowdrop/config**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ success: true, data: {} })
		});
	});
}
