/**
 * E2E Test: Editor Rendering Performance
 *
 * Loads a large workflow (500 default nodes chained via trigger ports) and
 * measures how long the editor takes to mount and render it. This is an
 * example/benchmark harness, not a hard pass/fail gate — the thresholds are
 * generous and exist mainly to catch order-of-magnitude regressions. Actual
 * timings are logged so they can be tracked over time.
 *
 * The workflow is built by createChainedTriggerWorkflow() and is also served
 * by MSW at GET /api/flowdrop/workflows/perf-500-chain.
 *
 * Run just this file:  pnpm exec playwright test editor-performance
 */

import { test, expect } from '@playwright/test';
import { waitForEditor, getNodeCount } from './helpers/editor-helpers';

const NODE_COUNT = 500;

// Generous ceilings — tune to your hardware/CI. Intended to flag regressions,
// not to assert a specific frame budget.
const MOUNT_BUDGET_MS = 20_000;

test.describe('Editor Performance — large graph', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test(`renders ${NODE_COUNT} trigger-chained nodes within budget`, async ({ page }) => {
    const start = Date.now();

    await page.goto(`/test/editor?workflow=perf&count=${NODE_COUNT}`);
    await page.waitForSelector('[data-testid="editor-test"]', { timeout: 30_000 });
    await waitForEditor(page);

    // First node painted
    await page.waitForSelector('.svelte-flow__node', { timeout: 30_000 });
    const firstNodeMs = Date.now() - start;

    // All nodes present in the DOM. NOTE: the editor does NOT set
    // onlyRenderVisibleElements, so every node is mounted regardless of
    // viewport — this waits for the full set.
    await expect
      .poll(() => getNodeCount(page), { timeout: MOUNT_BUDGET_MS, intervals: [250] })
      .toBe(NODE_COUNT);
    const allNodesMs = Date.now() - start;

    // Browser-side paint/load timing for context.
    const nav = await page.evaluate(() => {
      const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return entry
        ? {
            domContentLoaded: Math.round(entry.domContentLoadedEventEnd),
            load: Math.round(entry.loadEventEnd)
          }
        : null;
    });

    // Status bar reflects node count and the trigger-chain connections (N-1).
    const statusBar = page.locator('.flowdrop-status-bar');
    if (await statusBar.count()) {
      await expect(statusBar).toContainText(`${NODE_COUNT} nodes`, { timeout: 5000 });
      await expect(statusBar).toContainText(`${NODE_COUNT - 1} connections`, { timeout: 5000 });
    }

    console.log('\n── Editor perf (large graph) ──────────────────────────');
    console.log(`  nodes:                 ${NODE_COUNT}`);
    console.log(`  first node painted:    ${firstNodeMs} ms`);
    console.log(`  all nodes in DOM:      ${allNodesMs} ms`);
    if (nav) {
      console.log(`  DOMContentLoaded:      ${nav.domContentLoaded} ms`);
      console.log(`  load event:            ${nav.load} ms`);
    }
    console.log('───────────────────────────────────────────────────────\n');

    expect(allNodesMs).toBeLessThan(MOUNT_BUDGET_MS);
  });

  test('panning a large graph stays responsive', async ({ page }) => {
    await page.goto(`/test/editor?workflow=perf&count=${NODE_COUNT}`);
    await waitForEditor(page);
    await page.waitForSelector('.svelte-flow__node', { timeout: 30_000 });

    const pane = page.locator('.svelte-flow__pane');
    const box = await pane.boundingBox();
    if (!box) throw new Error('canvas pane not found');

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Drag-pan the canvas and time it. xyflow moves the viewport via a single
    // CSS transform, so this should not scale with node count.
    const start = Date.now();
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(cx - i * 30, cy - i * 20);
    }
    await page.mouse.up();
    const panMs = Date.now() - start;

    console.log(`\n  pan (${NODE_COUNT} nodes, 10 steps): ${panMs} ms\n`);

    // Editor should still be interactive afterwards.
    expect(await getNodeCount(page)).toBe(NODE_COUNT);
  });
});
