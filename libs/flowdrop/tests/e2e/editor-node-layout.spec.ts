/**
 * Node layout commands in the Console: `layout node inspect` and
 * `layout node beautify`, on the canvas's own measurement.
 *
 * ?workflow=tangled: Form -> Classify / Lookup (one over the other) -> Compose (two wires
 * cross) -> Loop (loop_back from Send) -> Send, with a caption above Compose.
 */
import { test, expect, type Page } from '@playwright/test';

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
const node = (id: string) => `.svelte-flow__node[data-id="${id}"]`;

async function open(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/test/editor?theme=graphite&workflow=tangled');
  await page.waitForSelector(`${node('compose.1')} .svelte-flow__handle`);
  await page.waitForTimeout(800);
  await page.getByTestId('console-strip').click();
}

/** Run a console line and return the plain text of the entry it produced. */
async function run(page: Page, line: string): Promise<string> {
  const entries = page.locator('.console-output__entry');
  const before = await entries.count();
  const input = page.locator('.console-input__field');
  await input.fill(line);
  await input.press('Enter');
  // The typed line, then its output.
  await expect(entries).toHaveCount(before + 2);
  return entries.nth(before + 1).innerText();
}

async function y(page: Page, id: string): Promise<number> {
  return page.evaluate((sel) => {
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(
      document.querySelector<HTMLElement>(sel)!.style.transform
    );
    return Number(m![2]);
  }, node(id));
}

/** Every node's position, by id, as rendered. */
async function positions(page: Page): Promise<Record<string, [number, number]>> {
  return page.evaluate(() => {
    const out: Record<string, [number, number]> = {};
    for (const el of document.querySelectorAll<HTMLElement>('.svelte-flow__node')) {
      const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform);
      if (m) out[el.dataset.id!] = [Number(m[1]), Number(m[2])];
    }
    return out;
  });
}

/** Port labels of a card, top to bottom, as rendered. */
async function inputOrder(page: Page, id: string): Promise<string[]> {
  return page.evaluate(
    (sel) =>
      [...document.querySelectorAll(`${sel} .svelte-flow__handle.target`)]
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
        .map((h) => (h.getAttribute('data-handleid') ?? '').split('-input-')[1]),
    node(id)
  );
}

test.describe('Node layout commands', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('layout node inspect prints the header and one line per wire', async ({ page }) => {
    await open(page);
    const text = await run(page, 'layout node inspect compose.1');
    const lines = text.split('\n');
    expect(lines[0]).toMatch(/^compose\.1 {2}y=160 {2}inputs: contact, label {2}outputs: reply$/);
    expect(text).toMatch(/in {2}contact ← lookup\.1\.contact/);
    expect(text).toMatch(/in {2}label {3}← classify\.1\.label/);
    expect(text).toMatch(/out reply {3}→ loop\.1\.items/);
    expect(lines[lines.length - 1]).toMatch(/overlap|spacing/);
  });

  test('--gap-x / --gap-y change what inspect reports as too close', async ({ page }) => {
    await open(page);
    const conflicts = async (flags: string): Promise<string> => {
      const text = await run(page, `layout node inspect compose.1${flags}`);
      return text.split('\n').pop()!.trim();
    };
    // Gaps of 0 leave only real overlaps; a huge gap makes every neighbour too close.
    const tight = await conflicts(' --gap-x 0 --gap-y 0');
    const wide = await conflicts(' --gap-x 600 --gap-y 400');
    expect(tight).not.toMatch(/spacing with/);
    expect(wide).toMatch(/spacing with/);

    const refused = await run(page, 'layout node inspect compose.1 --gap-y 30');
    expect(refused).toMatch(/multiple of the \d+ px grid/);
  });

  test('layout node beautify ports reorders the card and prints the score', async ({ page }) => {
    await open(page);
    expect(await inputOrder(page, 'compose.1')).toEqual(['contact', 'label']);

    const text = await run(page, 'layout node beautify compose.1 ports');
    const lines = text.split('\n');
    expect(lines[0]).toBe('compose.1: inputs reordered label, contact (was contact, label)');
    expect(lines[1]).toMatch(/^ {2}straight \d+ → \d+ · crossings \d+ → \d+/);

    await expect.poll(() => inputOrder(page, 'compose.1')).toEqual(['label', 'contact']);
    // Ports only: the card stays where it was.
    expect(await y(page, 'compose.1')).toBe(160);

    await page.locator('.console-input__field').blur();
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(() => inputOrder(page, 'compose.1')).toEqual(['contact', 'label']);
  });

  test('--dry-run reports the move and changes nothing on the canvas', async ({ page }) => {
    await open(page);
    const before = [await y(page, 'lookup.1'), await y(page, 'compose.1')];
    const order = await inputOrder(page, 'compose.1');

    const text = await run(page, 'layout node beautify lookup.1 clear --dry-run');
    expect(text).toMatch(/^lookup\.1: would move (up|down) \d+ \(y 200 → -?\d+\)/);

    await page.waitForTimeout(300);
    expect([await y(page, 'lookup.1'), await y(page, 'compose.1')]).toEqual(before);
    expect(await inputOrder(page, 'compose.1')).toEqual(order);
    // Nothing was written to history either: undo has no step to take.
    const undo = await run(page, 'undo');
    expect(undo.toLowerCase()).not.toContain('moved');
  });

  test('one undo reverts a beautify move', async ({ page }) => {
    await open(page);
    expect(await y(page, 'lookup.1')).toBe(200);

    const text = await run(page, 'layout node beautify lookup.1 clear');
    expect(text).toMatch(/^lookup\.1: moved (up|down) \d+/);
    const moved = await y(page, 'lookup.1');
    expect(moved).not.toBe(200);

    await page.locator('.console-input__field').blur();
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(() => y(page, 'lookup.1')).toBe(200);
  });

  test('layout beautify prints the log and the score, and one undo restores every node', async ({
    page
  }) => {
    await open(page);
    const before = await positions(page);
    const order = await inputOrder(page, 'compose.1');

    const text = await run(page, 'layout beautify');
    const lines = text.split('\n');
    expect(lines[0]).toMatch(/^# phase \d: /);
    expect(lines.some((l) => /^compose\.1: (moved|inputs reordered) /.test(l))).toBe(true);
    // The canvas's own geometry: the crossings and the overlap are gone.
    expect(lines[lines.length - 1]).toMatch(
      /^sweep: straight \d+ → \d+ · crossings 3 → 0 · overlaps 1 → 0 · spacing 1 too close → ok$/
    );

    await expect.poll(() => positions(page)).not.toEqual(before);

    await page.locator('.console-input__field').blur();
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(() => positions(page)).toEqual(before);
    await expect.poll(() => inputOrder(page, 'compose.1')).toEqual(order);
  });

  test('layout beautify --dry-run prints the steps and moves nothing', async ({ page }) => {
    await open(page);
    const before = await positions(page);
    const text = await run(page, 'layout beautify --dry-run');
    expect(text).toMatch(/^# phase \d: /);
    expect(text).toMatch(/\ncompose\.1: would move (up|down) \d+/);
    expect(text.split('\n').pop()).toMatch(/^would give: /);
    await page.waitForTimeout(300);
    expect(await positions(page)).toEqual(before);
  });
});
