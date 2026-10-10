/**
 * Zoom tiers (editor.zoomTiers): `data-fd-zoom` on .flowdrop-root flips full /
 * outline / glyph / map at 75%, 45% and 25% (the library set), a configured set
 * with a tier turned off skips it, and a zoom sweep from 15% to 150% moves no
 * handle and no edge: geometry never depends on the tier. Every drawing is in
 * fixed flow px, so a title's font size is the same at every zoom of its tier.
 */
import { test, expect, type Page } from '@playwright/test';

const ZOOMS = [1.5, 1, 0.8, 0.76, 0.74, 0.5, 0.46, 0.44, 0.3, 0.26, 0.24, 0.2, 0.15];

type Tier = 'full' | 'outline' | 'glyph' | 'map';

function tierOf(z: number): Tier {
  return z >= 0.75 ? 'full' : z >= 0.45 ? 'outline' : z >= 0.25 ? 'glyph' : 'map';
}

async function open(page: Page, zoom: number, zoomTiers?: string): Promise<void> {
  await page.setViewportSize({ width: 1800, height: 1100 });
  const tiers = zoomTiers ? `&zoomTiers=${zoomTiers}` : '';
  await page.goto(`/test/cards?theme=graphite&zoom=${zoom}${tiers}`);
  // Attached, not visible: open handles are hidden in the zoomed-out tiers.
  await page.waitForSelector('.svelte-flow__node[data-id="exit.1"] .svelte-flow__handle', {
    state: 'attached'
  });
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

test('the tier flips at 75%, 45% and 25%', async ({ page }) => {
  for (const zoom of [1, 0.76, 0.74, 0.5, 0.46, 0.44, 0.3, 0.26, 0.24, 0.2]) {
    await open(page, zoom);
    const root = page.locator('.flowdrop-root');
    await expect(root, `zoom ${zoom}`).toHaveAttribute('data-fd-zoom', tierOf(zoom));
    // The zoom itself is no longer published: nothing in CSS divides by it.
    const value = await root.evaluate((el) =>
      (el as HTMLElement).style.getPropertyValue('--fd-zoom')
    );
    expect(value).toBe('');
  }
});

test('the outline view keeps the header and draws ports as unlabelled bars', async ({ page }) => {
  await open(page, 0.6);
  const card = page.locator('.svelte-flow__node[data-id="data_shaper.2"]');
  await expect(card.locator('[data-fd-title]')).toBeVisible();
  const title = await card
    .locator('[data-fd-title]')
    .evaluate((el) => getComputedStyle(el).fontSize);
  expect(title).toBe('20px');
  await expect(card.locator('.flowdrop-workflow-node__kind')).toBeHidden();
  const pill = card.locator('.flowdrop-workflow-node__pill').first();
  await expect(pill).toBeVisible();
  await expect(pill.locator('.flowdrop-workflow-node__pill-name')).toBeHidden();
  const h = await pill.evaluate((el) => getComputedStyle(el).height);
  expect(h).toBe('12px');
});

test('the glyph view shows the tile and the title, with no ports and no zoom maths', async ({
  page
}) => {
  const sizes: string[] = [];
  for (const zoom of [0.44, 0.3]) {
    await open(page, zoom);
    const card = page.locator('.svelte-flow__node[data-id="data_shaper.2"]');
    await expect(card.locator('[data-fd-glyph]')).toBeVisible();
    await expect(card.locator('[data-fd-title]')).toBeVisible();
    await expect(card.locator('.flowdrop-workflow-node__pill').first()).toBeHidden();
    const tile = await card.locator('[data-fd-glyph]').boundingBox();
    expect(tile!.width / zoom).toBeCloseTo(56, 0);
    sizes.push(
      await card.locator('[data-fd-title]').evaluate((el) => getComputedStyle(el).fontSize)
    );
  }
  // Fixed flow px: the same size at every zoom of the tier.
  expect(sizes).toEqual(['30px', '30px']);
});

test('the map view is a solid block with the glyph alone', async ({ page }) => {
  await open(page, 0.2);
  const card = page.locator('.svelte-flow__node[data-id="data_shaper.2"]');
  await expect(card.locator('[data-fd-title]')).toBeHidden();
  await expect(card.locator('[data-fd-glyph]')).toBeVisible();
  await expect(card.locator('.flowdrop-workflow-node__pill').first()).toBeHidden();
});

test('a configured set with only outline below full never reaches glyph or map', async ({
  page
}) => {
  for (const zoom of [1, 0.8, 0.6, 0.4, 0.2, 0.15]) {
    await open(page, zoom, 'full:0.75,outline:0');
    await expect(page.locator('.flowdrop-root'), `zoom ${zoom}`).toHaveAttribute(
      'data-fd-zoom',
      zoom >= 0.75 ? 'full' : 'outline'
    );
  }
});

test('{ full: 0 } keeps the full card at every zoom', async ({ page }) => {
  for (const zoom of [1, 0.4, 0.15]) {
    await open(page, zoom, 'full:0');
    await expect(page.locator('.flowdrop-root')).toHaveAttribute('data-fd-zoom', 'full');
  }
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
