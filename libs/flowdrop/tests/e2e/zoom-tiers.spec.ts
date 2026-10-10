/**
 * Zoom tiers (Graphite G8e): `data-fd-zoom` on .flowdrop-root flips full / glyph
 * / map at 66% and 25%, and a zoom sweep from 15% to 150% moves no handle and
 * no edge: geometry never depends on the tier.
 */
import { test, expect, type Page } from '@playwright/test';

const ZOOMS = [1.5, 1, 0.8, 0.67, 0.65, 0.5, 0.3, 0.26, 0.24, 0.2, 0.15];

function tierOf(z: number): 'full' | 'glyph' | 'map' {
  return z >= 0.66 ? 'full' : z >= 0.25 ? 'glyph' : 'map';
}

async function open(page: Page, zoom: number): Promise<void> {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.goto(`/test/cards?theme=graphite&zoom=${zoom}`);
  await page.waitForSelector('.svelte-flow__node[data-id="exit.1"] .svelte-flow__handle');
  await page.waitForTimeout(400);
}

/** Handle centres in node-local flow px, and every edge path. */
async function snapshot(page: Page, zoom: number) {
  return page.evaluate((z) => {
    const handles: Record<string, [number, number]> = {};
    for (const node of document.querySelectorAll<HTMLElement>('.svelte-flow__node')) {
      const box = node.getBoundingClientRect();
      for (const h of node.querySelectorAll<HTMLElement>('.svelte-flow__handle')) {
        const r = h.getBoundingClientRect();
        handles[`${node.dataset.id}/${h.dataset.handleid}`] = [
          Math.round(((r.left + r.width / 2 - box.left) / z) * 10) / 10 + 0,
          Math.round(((r.top + r.height / 2 - box.top) / z) * 10) / 10 + 0
        ];
      }
    }
    const edges = [...document.querySelectorAll('.svelte-flow__edge')].map(
      (e) =>
        e.getAttribute('data-id') +
        ':' +
        (e.querySelector('path')?.getAttribute('d') ?? '').replace(/-?\d+\.\d+/g, (n) =>
          // handle bounds are measured from the DOM: ignore sub-pixel noise
          String(Math.round(Number(n)))
        )
    );
    return { handles, edges };
  }, zoom);
}

test('the tier flips at 66% and 25%', async ({ page }) => {
  for (const zoom of [1, 0.67, 0.65, 0.3, 0.26, 0.24, 0.2]) {
    await open(page, zoom);
    const root = page.locator('.flowdrop-root');
    await expect(root, `zoom ${zoom}`).toHaveAttribute('data-fd-zoom', tierOf(zoom));
    if (tierOf(zoom) !== 'full') {
      const value = await root.evaluate((el) =>
        (el as HTMLElement).style.getPropertyValue('--fd-zoom')
      );
      expect(Number(value)).toBeCloseTo(zoom, 2);
    }
  }
});

test('the glyph view shows the glyph, the title and no ports', async ({ page }) => {
  await open(page, 0.4);
  const card = page.locator('.svelte-flow__node[data-id="data_shaper.2"]');
  await expect(card.locator('[data-fd-glyph]')).toBeVisible();
  await expect(card.locator('[data-fd-title]')).toBeVisible();
  await expect(card.locator('.flowdrop-workflow-node__pill').first()).toBeHidden();
  const size = await card
    .locator('[data-fd-title]')
    .evaluate((el) => getComputedStyle(el).fontSize);
  // 11 screen px at 40%
  expect(parseFloat(size) * 0.4).toBeCloseTo(11, 0);

  await open(page, 0.2);
  await expect(card.locator('[data-fd-title]')).toBeHidden();
  await expect(card.locator('[data-fd-glyph]')).toBeVisible();
});

test('a zoom sweep from 15% to 150% moves no handle and no edge', async ({ page }) => {
  await open(page, 1);
  const base = await snapshot(page, 1);
  expect(Object.keys(base.handles).length).toBeGreaterThan(40);
  expect(base.edges.length).toBeGreaterThan(4);
  for (const zoom of ZOOMS) {
    await open(page, zoom);
    const now = await snapshot(page, zoom);
    expect(now.handles, `handles at ${zoom}`).toEqual(base.handles);
    expect(now.edges, `edges at ${zoom}`).toEqual(base.edges);
  }
});
