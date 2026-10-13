/**
 * Loopbacks as return lanes (Settings > Editor > "Draw loopbacks as return lanes").
 *
 * ?workflow=lanes: nested loops (d>a wraps c>b), two loops side by side (f>e, h>g) and two
 * loopbacks into one port (j>i, k>i). With the setting on a loopback runs under its loop body
 * and nested lanes never cross; with it off the wire is the bezier it always was.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const STORAGE_KEY = 'flowdrop-settings';
const node = (id: string) => `.svelte-flow__node[data-id="${id}"]`;
const edgePath = (id: string) => `.svelte-flow__edge[data-id="${id}"] path.svelte-flow__edge-path`;

/** Loopback wire id and the cards of its loop body. */
const LOOPS: Record<string, string[]> = {
  'd.out>a.loop_back': ['a', 'b', 'c', 'd'],
  'c.out>b.loop_back': ['b', 'c'],
  'f.out>e.loop_back': ['e', 'f'],
  'h.out>g.loop_back': ['g', 'h'],
  'j.out>i.loop_back': ['i', 'j'],
  'k.out>i.loop_back': ['i', 'k']
};

async function open(page: Page, lanes: boolean): Promise<void> {
  await page.addInitScript(
    ([key, on]) => {
      localStorage.setItem(key as string, JSON.stringify({ editor: { loopbackLanes: on } }));
    },
    [STORAGE_KEY, lanes]
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/test/editor?workflow=lanes');
  await page.waitForSelector(`${node('k')} .svelte-flow__handle`);
  await page.waitForTimeout(800);
}

/** A card's box in flow units, as rendered. */
async function box(page: Page, id: string): Promise<[number, number, number, number]> {
  return page.evaluate((sel) => {
    const el = document.querySelector<HTMLElement>(sel)!;
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform)!;
    return [Number(m[1]), Number(m[2]), el.offsetWidth, el.offsetHeight];
  }, node(id));
}

/** The wire's path sampled every 2 flow units. */
async function sample(page: Page, id: string): Promise<Array<[number, number]>> {
  return page.evaluate((sel) => {
    const path = document.querySelector<SVGPathElement>(sel)!;
    const length = path.getTotalLength();
    const points: Array<[number, number]> = [];
    for (let at = 0; at <= length; at += 2) {
      const p = path.getPointAtLength(at);
      points.push([p.x, p.y]);
    }
    return points;
  }, edgePath(id));
}

/** How many sampled points lie inside a card's box (shrunk 3 so the handles it touches do not count). */
async function insideCards(page: Page, id: string, cards: string[]): Promise<number> {
  const points = await sample(page, id);
  let inside = 0;
  for (const card of cards) {
    const [x, y, w, h] = await box(page, card);
    inside += points.filter(
      ([px, py]) => px > x + 3 && px < x + w - 3 && py > y + 3 && py < y + h - 3
    ).length;
  }
  return inside;
}

/** Whether two sampled polylines cross (segments strictly inside both). */
function crosses(a: Array<[number, number]>, b: Array<[number, number]>): boolean {
  const cross = (p1: number[], p2: number[], p3: number[], p4: number[]): boolean => {
    const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
    if (Math.abs(d) < 1e-9) return false;
    const ua = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
    const ub = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
    return ua > 0.01 && ua < 0.99 && ub > 0.01 && ub < 0.99;
  };
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      if (cross(a[i], a[i + 1], b[j], b[j + 1])) return true;
    }
  }
  return false;
}

test.describe('Loopbacks as return lanes', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('off: a loopback is the bezier, and it runs through its loop body', async ({ page }) => {
    await open(page, false);
    await expect(page.locator('.flowdrop-edge--lane')).toHaveCount(0);
    for (const [id, cards] of Object.entries(LOOPS)) {
      expect(await page.locator(edgePath(id)).getAttribute('d')).toContain(' C ');
      expect(await insideCards(page, id, cards)).toBeGreaterThan(0);
    }
  });

  test('on: every loopback is a lane that stays out of its loop body', async ({ page }) => {
    await open(page, true);
    await expect(page.locator('.flowdrop-edge--lane')).toHaveCount(Object.keys(LOOPS).length);
    for (const [id, cards] of Object.entries(LOOPS)) {
      const d = (await page.locator(edgePath(id)).getAttribute('d')) ?? '';
      expect(d).not.toContain(' C ');
      expect(await insideCards(page, id, cards)).toBe(0);
    }
    // Forward wires are untouched.
    expect(await page.locator(edgePath('a.out>b.in')).getAttribute('d')).toContain(' C ');
  });

  test('on: a lane runs under the lowest card of its body', async ({ page }) => {
    await open(page, true);
    const [, y, , h] = await box(page, 'c');
    const points = await sample(page, 'c.out>b.loop_back');
    expect(Math.max(...points.map((p) => p[1]))).toBeGreaterThanOrEqual(y + h + 40 - 1);
  });

  test('on: nested lanes do not cross; the outer lane is below the inner one', async ({ page }) => {
    await open(page, true);
    const outer = await sample(page, 'd.out>a.loop_back');
    const inner = await sample(page, 'c.out>b.loop_back');
    expect(crosses(outer, inner)).toBe(false);
    expect(Math.max(...outer.map((p) => p[1]))).toBeGreaterThan(
      Math.max(...inner.map((p) => p[1]))
    );
  });

  test('on: loops side by side share a track', async ({ page }) => {
    await open(page, true);
    const left = await sample(page, 'f.out>e.loop_back');
    const right = await sample(page, 'h.out>g.loop_back');
    expect(Math.max(...left.map((p) => p[1]))).toBeCloseTo(Math.max(...right.map((p) => p[1])), 0);
  });

  test('on: two loopbacks into one port share the final climb', async ({ page }) => {
    await open(page, true);
    const a = await sample(page, 'j.out>i.loop_back');
    const b = await sample(page, 'k.out>i.loop_back');
    // The last point is the arrow base; the climb is the vertical run before the last bend.
    const climbX = (pts: Array<[number, number]>) => pts[pts.length - 12][0];
    expect(climbX(a)).toBeCloseTo(climbX(b), 0);
  });

  test('the setting switches the drawing live', async ({ page }) => {
    await open(page, false);
    const root: Locator = page.getByTestId('editor-test');
    await root.locator('.flowdrop-navbar__settings-btn').click();
    await page.getByTestId('navbar-all-settings').click();
    const modal: Locator = root.locator('.flowdrop-settings-modal[open]');
    await modal.getByRole('tab', { name: 'Editor' }).click();
    await modal.getByRole('switch', { name: 'Draw loopbacks as return lanes' }).click();
    await modal.getByRole('button', { name: 'Close settings' }).click();
    await expect(page.locator('.flowdrop-edge--lane')).toHaveCount(Object.keys(LOOPS).length);
  });
});
