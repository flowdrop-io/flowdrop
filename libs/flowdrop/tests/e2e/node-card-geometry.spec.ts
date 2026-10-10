/**
 * The straight-wire contract, measured on real nodes (Graphite G8a/G8b).
 *
 * /test/cards renders the review's stress cards at 100% zoom. Every handle
 * centre must be a multiple of 20 from the node top, the header is 60px, exec
 * pins sit at y = 20, the first row at y = 80 (140 with the description band),
 * the pitch is 40, the width is 280 or 320, and the 1px border does not add to
 * the box (the live node used to be 581px tall for a 580px box).
 */
import { test, expect, type Page } from '@playwright/test';

const CARDS = [
  'data_shaper.2',
  'entity_extractor.1',
  'slack_notify.1',
  'workflow_executor.1',
  'types.1',
  'node_insert.1',
  'chain_a.1',
  'chain_b.1',
  // Graphite G8d: gateways and the tool follow the same card
  'switch.1',
  'if_else.1',
  'unnamed.1',
  'tool.1'
];

interface Measured {
  width: number;
  height: number;
  handles: { id: string; x: number; y: number }[];
  header: number | null;
}

async function measure(page: Page, nodeId: string): Promise<Measured> {
  return page.evaluate((id) => {
    const node = document.querySelector<HTMLElement>(`.svelte-flow__node[data-id="${id}"]`)!;
    const box = node.getBoundingClientRect();
    const handles = [...node.querySelectorAll<HTMLElement>('.svelte-flow__handle')].map((h) => {
      const r = h.getBoundingClientRect();
      return {
        id: h.getAttribute('data-handleid') ?? '',
        x: Math.round((r.left + r.width / 2 - box.left) * 100) / 100,
        y: Math.round((r.top + r.height / 2 - box.top) * 100) / 100
      };
    });
    const header = node.querySelector<HTMLElement>('.flowdrop-workflow-node__header');
    return {
      width: box.width,
      height: box.height,
      handles,
      header: header ? header.getBoundingClientRect().height : null
    };
  }, nodeId);
}

async function open(page: Page, query = ''): Promise<void> {
  await page.setViewportSize({ width: 1800, height: 1400 });
  await page.goto(`/test/cards?theme=graphite&zoom=1${query}`);
  await page.waitForSelector('.svelte-flow__node[data-id="exit.1"] .svelte-flow__handle');
  // handle bounds settle after the first measure
  await page.waitForTimeout(300);
}

for (const descriptions of [false, true]) {
  test.describe(`node card geometry, descriptions ${descriptions ? 'on' : 'off'}`, () => {
    test.beforeEach(async ({ page }) => {
      await open(page, descriptions ? '&descriptions=1' : '');
    });

    for (const id of CARDS) {
      test(`${id}: on the 20px grid`, async ({ page }) => {
        const m = await measure(page, id);
        expect([280, 320]).toContain(m.width);
        expect(m.height % 20).toBe(0);
        expect(m.header).toBe(60);

        const first = descriptions ? 140 : 80;
        const rows = new Set<number>();
        for (const h of m.handles) {
          expect(h.y % 20, `${h.id} y=${h.y}`).toBe(0);
          expect(h.x === 0 || h.x === m.width, `${h.id} x=${h.x}`).toBe(true);
          if (h.id.endsWith('-trigger')) {
            expect(h.y, `${h.id} is a header pin`).toBe(20);
          } else {
            expect((h.y - first) % 40, `${h.id} sits on a row`).toBe(0);
            expect(h.y).toBeGreaterThanOrEqual(first);
            rows.add(h.y);
          }
        }
      });
    }

    test('a branch trigger stays a row, the completion trigger is a pin', async ({ page }) => {
      const m = await measure(page, 'types.1');
      const byId = Object.fromEntries(m.handles.map((h) => [h.id, h]));
      expect(byId['types.1-output-trigger'].y).toBe(20);
      expect(byId['types.1-input-trigger'].y).toBe(20);
      // branch triggers sink below data ports (reserved-port ordering) but stay rows
      const first = descriptions ? 140 : 80;
      expect(byId['types.1-output-result'].y).toBe(first);
      expect(byId['types.1-output-true'].y).toBe(first + 40);
      expect(byId['types.1-output-false'].y).toBe(first + 80);
    });

    test('inputs and outputs share rows', async ({ page }) => {
      const m = await measure(page, 'data_shaper.2');
      const byId = Object.fromEntries(m.handles.map((h) => [h.id, h]));
      expect(byId['data_shaper.2-input-in'].y).toBe(byId['data_shaper.2-output-data'].y);
      expect(byId['data_shaper.2-output-valid'].y - byId['data_shaper.2-output-data'].y).toBe(40);
    });
  });
}

test('the description band moves every row by the same 60px and changes nothing else', async ({
  page
}) => {
  await open(page);
  const off = await Promise.all(CARDS.map((id) => measure(page, id)));
  await open(page, '&descriptions=1');
  const on = await Promise.all(CARDS.map((id) => measure(page, id)));
  CARDS.forEach((id, i) => {
    expect(on[i].height - off[i].height, id).toBe(60);
    expect(on[i].width, id).toBe(off[i].width);
    off[i].handles.forEach((h, k) => {
      // matched by position: two unnamed branches share one handle id
      const moved = on[i].handles[k];
      expect(moved.id).toBe(h.id);
      expect(moved.y - h.y, h.id).toBe(h.id.endsWith('-trigger') ? 0 : 60);
    });
  });
});

test('straight wire: aligned nodes make the chain wires horizontal', async ({ page }) => {
  await open(page);
  const a = await measure(page, 'chain_a.1');
  const b = await measure(page, 'chain_b.1');
  const out = a.handles.find((h) => h.id === 'chain_a.1-output-prompt')!;
  const inn = b.handles.find((h) => h.id === 'chain_b.1-input-message')!;
  expect(out.y).toBe(inn.y);
});

test.describe('Gateway and Tool on the card (G8d)', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('a switch with 5 branches: trigger pin, one branch per row, on the grid', async ({
    page
  }) => {
    const m = await measure(page, 'switch.1');
    const byId = Object.fromEntries(m.handles.map((h) => [h.id, h]));
    expect(m.width).toBe(280);
    expect(m.height).toBe(60 + 5 * 40);
    expect(byId['switch.1-input-trigger'].y).toBe(20);
    expect(byId['switch.1-input-value'].y).toBe(80);
    ['draft', 'review', 'published', 'archived', 'default'].forEach((b, i) => {
      expect(byId[`switch.1-output-${b}`].y, b).toBe(80 + i * 40);
      expect(byId[`switch.1-output-${b}`].x).toBe(280);
    });
  });

  test('if/else: True and False are rows 1 and 2', async ({ page }) => {
    const m = await measure(page, 'if_else.1');
    const byId = Object.fromEntries(m.handles.map((h) => [h.id, h]));
    expect(byId['if_else.1-output-True'].y).toBe(80);
    expect(byId['if_else.1-output-False'].y).toBe(120);
    expect(byId['if_else.1-input-data'].y).toBe(80);
  });

  test('two empty-named branches render as two rows and do not crash (B1)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page);
    const m = await measure(page, 'unnamed.1');
    const outs = m.handles.filter((h) => h.id === 'unnamed.1-output-');
    expect(outs.map((h) => h.y)).toEqual([80, 120]);
    expect(errors.filter((e) => /each_key_duplicate/.test(e))).toEqual([]);
  });

  test('a tool is one row on the card, under the 60px header', async ({ page }) => {
    const m = await measure(page, 'tool.1');
    expect(m.header).toBe(60);
    expect(m.height).toBe(100);
    expect(m.handles.map((h) => h.y)).toEqual([80, 80]);
  });

  test('the glyph and the title are targetable in every card type', async ({ page }) => {
    for (const id of ['switch.1', 'tool.1', 'simple.1', 'square.1', 'start.1']) {
      const node = page.locator(`.svelte-flow__node[data-id="${id}"]`);
      await expect(node.locator('[data-fd-glyph]'), id).toHaveCount(1);
    }
    for (const id of ['switch.1', 'tool.1', 'simple.1', 'start.1']) {
      const node = page.locator(`.svelte-flow__node[data-id="${id}"]`);
      await expect(node.locator('[data-fd-title]'), id).toHaveCount(1);
    }
  });
});

test.describe('Simple, Square and Terminal keep their shape on the grid (G8d)', () => {
  const SHAPES: Record<string, { width: number; height: number }> = {
    'simple.1': { width: 280, height: 80 },
    'simple.2': { width: 280, height: 120 },
    'square.1': { width: 80, height: 80 },
    'square.2': { width: 80, height: 120 },
    'start.1': { width: 80, height: 120 },
    'end.1': { width: 80, height: 120 },
    'exit.1': { width: 80, height: 120 }
  };

  for (const descriptions of [false, true]) {
    test.describe(`descriptions ${descriptions ? 'on' : 'off'}`, () => {
      test.beforeEach(async ({ page }) => {
        await open(page, descriptions ? '&descriptions=1' : '');
      });

      for (const [id, size] of Object.entries(SHAPES)) {
        test(`${id}: ${size.width}x${size.height}, every handle centre a multiple of 20`, async ({
          page
        }) => {
          const m = await measure(page, id);
          expect(m.width).toBe(size.width);
          expect(m.height).toBe(size.height);
          expect(m.handles.length).toBeGreaterThan(0);
          for (const h of m.handles) {
            expect(h.y % 20, `${h.id} y=${h.y}`).toBe(0);
            // Simple and Square handles sit on the box edge; a terminal's follow the circle.
            if (!id.match(/^(start|end|exit)/)) {
              expect(h.x === 0 || h.x === m.width, `${h.id} x=${h.x}`).toBe(true);
            }
          }
        });
      }

      test('node positions are on the 20px grid', async ({ page }) => {
        const pos = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('.svelte-flow__node')].map((n) => {
            const t = new DOMMatrix(getComputedStyle(n).transform);
            return { id: n.dataset.id, x: t.m41, y: t.m42 };
          })
        );
        for (const p of pos) {
          expect(p.x % 20, `${p.id} x`).toBe(0);
          expect(p.y % 20, `${p.id} y`).toBe(0);
        }
      });
    });
  }
});
