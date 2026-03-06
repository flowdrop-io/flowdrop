/**
 * E2E Test: Undo/Redo
 *
 * Tests keyboard shortcuts for undo (Ctrl+Z) and redo (Ctrl+Shift+Z / Ctrl+Y)
 * after performing workflow operations like node deletion.
 */

import { test, expect } from '@playwright/test';
import { gotoEditor, assertStatusBar, selectNode } from './helpers/editor-helpers';

test.describe('Undo/Redo', () => {
	test.beforeEach(({}, testInfo) => {
		test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
	});

	test('Ctrl+Z undoes node deletion', async ({ page }) => {
		await gotoEditor(page, 'simple');

		// Should start with 2 nodes, 1 edge
		await assertStatusBar(page, 2, 1);

		// Select and delete a node
		await selectNode(page, 0);
		await page.keyboard.press('Backspace');
		await page.waitForTimeout(500);

		// Verify deletion happened
		await assertStatusBar(page, 1, 0);

		// Undo with Ctrl/Cmd+Z
		const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
		await page.keyboard.press(`${modifier}+z`);
		await page.waitForTimeout(1000);

		// Should be restored
		await assertStatusBar(page, 2, 1);
	});

	test('Ctrl+Shift+Z redoes after undo', async ({ page }) => {
		await gotoEditor(page, 'simple');

		// Delete a node
		await selectNode(page, 0);
		await page.keyboard.press('Backspace');
		await page.waitForTimeout(500);
		await assertStatusBar(page, 1, 0);

		// Undo
		const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
		await page.keyboard.press(`${modifier}+z`);
		await page.waitForTimeout(1000);
		await assertStatusBar(page, 2, 1);

		// Redo with Ctrl/Cmd+Shift+Z
		await page.keyboard.press(`${modifier}+Shift+z`);
		await page.waitForTimeout(1000);
		await assertStatusBar(page, 1, 0);
	});

	test('Ctrl+Y also triggers redo', async ({ page }) => {
		await gotoEditor(page, 'simple');

		// Delete a node
		await selectNode(page, 0);
		await page.keyboard.press('Backspace');
		await page.waitForTimeout(500);
		await assertStatusBar(page, 1, 0);

		// Undo
		const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
		await page.keyboard.press(`${modifier}+z`);
		await page.waitForTimeout(1000);
		await assertStatusBar(page, 2, 1);

		// Redo with Ctrl/Cmd+Y
		await page.keyboard.press(`${modifier}+y`);
		await page.waitForTimeout(1000);
		await assertStatusBar(page, 1, 0);
	});
});
