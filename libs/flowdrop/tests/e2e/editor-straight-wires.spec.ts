/**
 * Straight wires (Graphite G8f): magnetic alignment while dragging, Alt to
 * switch it off, the Straighten wires command, and undo as one step.
 *
 * ?workflow=straight: Entity Insert at (100, 120) feeds Data Shaper at (520, 200)
 * through the trigger pin (y = 20) and the first data row (y = 80). Data Shaper
 * is 80px too low; at y = 120 both wires are straight.
 */
import { test, expect, type Page } from '@playwright/test';

const SHAPER = '.svelte-flow__node[data-id="data_shaper.1"]';

async function open(page: Page, settings?: Record<string, unknown>): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  if (settings) {
    await page.addInitScript((editor) => {
      localStorage.setItem('flowdrop-settings', JSON.stringify({ editor }));
    }, settings);
  }
  await page.goto('/test/editor?theme=graphite&workflow=straight');
  await page.waitForSelector(`${SHAPER} .svelte-flow__handle`);
  await page.waitForTimeout(800);
}

async function shaperY(page: Page): Promise<number> {
  return page.evaluate((sel) => {
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(
      document.querySelector<HTMLElement>(sel)!.style.transform
    );
    return Number(m![2]);
  }, SHAPER);
}

async function zoomOf(page: Page): Promise<number> {
  return page.evaluate(() =>
    parseFloat(
      document
        .querySelector<HTMLElement>('.svelte-flow__viewport')!
        .style.transform.split('scale(')[1]
    )
  );
}

/** Drag Data Shaper's header up by `flowPx` flow units (pointer still down when `hold`). */
async function dragUp(page: Page, flowPx: number, hold = false): Promise<void> {
  const box = (await page
    .locator(`${SHAPER} .flowdrop-workflow-node__header`)
    .first()
    .boundingBox())!;
  const zoom = await zoomOf(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - (flowPx * zoom) / 2, { steps: 5 });
  await page.mouse.move(x, y - flowPx * zoom, { steps: 5 });
  await page.waitForTimeout(200);
  if (!hold) await page.mouse.up();
}

test.describe('Straight wires', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('dragging Data Shaper to its source straightens trigger and data wires, undo restores', async ({
    page
  }) => {
    await open(page);
    expect(await shaperY(page)).toBe(200);

    await dragUp(page, 80, true);
    // Both wires are straight at once, and both show a guide.
    await expect(page.getByTestId('straight-guide')).toHaveCount(2);
    await page.mouse.up();
    await expect(page.getByTestId('straight-guide')).toHaveCount(0);
    expect(await shaperY(page)).toBe(120);

    // The two wires really are level: the handle centres share a y.
    const ys = await page.evaluate(() =>
      ['entity_trigger.1-output-entity', 'data_shaper.1-input-entity'].map((id) => {
        const r = document.querySelector(`[data-handleid="${id}"]`)!.getBoundingClientRect();
        return Math.round(r.top + r.height / 2);
      })
    );
    expect(ys[0]).toBe(ys[1]);

    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+z`);
    await expect.poll(() => shaperY(page)).toBe(200);
  });

  test('without grid snapping the node still snaps within 10px, and Alt turns it off', async ({
    page
  }) => {
    await open(page, { snapToGrid: false });
    await dragUp(page, 80);
    expect(await shaperY(page)).toBe(120);

    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+z`);
    await expect.poll(() => shaperY(page)).toBe(200);

    await page.keyboard.down('Alt');
    await dragUp(page, 80);
    await page.keyboard.up('Alt');
    const y = await shaperY(page);
    expect(y).not.toBe(120);
    // xyflow's drag threshold costs a few px, so the pointer lands about 7px short: inside the magnet, off the line.
    expect(y).toBeGreaterThan(120);
    expect(y).toBeLessThan(130);
  });

  test('Straighten wires from the node menu moves it in one undo step; Shift+S does the same', async ({
    page
  }) => {
    await open(page);
    await page
      .locator(`${SHAPER} .flowdrop-workflow-node__header`)
      .first()
      .click({ button: 'right' });
    await page.getByRole('menuitem', { name: /Straighten wires/ }).click();
    await expect.poll(() => shaperY(page)).toBe(120);

    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+z`);
    await expect.poll(() => shaperY(page)).toBe(200);

    await page.locator(`${SHAPER} .flowdrop-workflow-node__header`).first().click();
    await page.keyboard.press('Shift+S');
    await expect.poll(() => shaperY(page)).toBe(120);
  });
});
