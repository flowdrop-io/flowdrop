/**
 * E2E Test: the Run button in the canvas toolbar (Edit mode).
 *
 * A dirty workflow is saved first; a workflow with inputs asks for them in a small form; a workflow
 * without inputs runs at once. The pill follows the run, and a refusal stays in the form. The
 * backend is stubbed at the network edge, as in editor-run-bar.spec.ts.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoEditor, waitForEditor } from './helpers/editor-helpers';

const json = (data: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data })
});

interface Stub {
  /** Requests seen, in order: "PUT save" and "POST run". */
  calls: string[];
  /** Bodies of the run requests. */
  runBodies: unknown[];
  /** The run answers with this refusal from now on. */
  refuse: (status: number, body: Record<string, unknown>) => void;
  /** The run status endpoint reports completed from now on. */
  complete: () => void;
}

async function stubBackend(page: Page): Promise<Stub> {
  const calls: string[] = [];
  const runBodies: unknown[] = [];
  let refusal: { status: number; body: Record<string, unknown> } | null = null;
  let status = 'running';
  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/flowdrop', '');
    const method = request.method();

    if (/\/workflow\/[^/]+\/run$/.test(path) && method === 'POST') {
      calls.push('POST run');
      runBodies.push(request.postDataJSON());
      if (refusal) {
        return route.fulfill({
          status: refusal.status,
          contentType: 'application/json',
          body: JSON.stringify(refusal.body)
        });
      }
      return route.fulfill(json({ pipelineId: 'p1', status: 'running' }));
    }
    if (/\/pipeline\/p1\/status$/.test(path)) {
      return route.fulfill(json({ status }));
    }
    if (/\/workflows\/[^/]+$/.test(path) && (method === 'PUT' || method === 'POST')) {
      calls.push('PUT save');
      return route.fulfill(json({ id: 'test-workflow-simple' }));
    }
    return route.fallback();
  });
  return {
    calls,
    runBodies,
    refuse: (code, body) => {
      refusal = { status: code, body };
    },
    complete: () => {
      status = 'completed';
    }
  };
}

async function dragFirstNode(page: Page): Promise<void> {
  const node = page.locator('.svelte-flow__node').first();
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + 68, { steps: 8 });
  await page.mouse.up();
}

async function gotoFormEditor(page: Page): Promise<void> {
  await page.goto('/test/editor?playground=form');
  await page.waitForSelector('[data-testid="editor-test"]', { timeout: 15000 });
  await waitForEditor(page);
  await page.waitForSelector('.svelte-flow__node', { timeout: 15000 });
}

const runButton = (page: Page) => page.locator('[data-testid="canvas-run"]');
const dialog = (page: Page) => page.locator('[data-testid="run-inputs-dialog"]');
const dialogRun = (page: Page) => dialog(page).getByRole('button', { name: /^Run/ });

test.describe('Run button', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('a dirty workflow is saved before the run starts', async ({ page }) => {
    const stub = await stubBackend(page);
    await gotoEditor(page);
    await dragFirstNode(page);
    await expect(
      page.locator('.flowdrop-navbar__primary-action', { hasText: 'Save' })
    ).toHaveAttribute('data-dirty', 'true');

    await runButton(page).click();

    await expect(page.locator('.flowdrop-run-bar')).toBeVisible();
    expect(stub.calls).toEqual(['PUT save', 'POST run']);
  });

  test('a workflow with a required input asks for it first', async ({ page }) => {
    const stub = await stubBackend(page);
    await gotoFormEditor(page);
    await runButton(page).click();

    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toContainText('Run ');

    // Empty: refused in the form, nothing is sent.
    await dialogRun(page).click();
    await expect(dialog(page).getByRole('alert')).toContainText('topic');
    expect(stub.runBodies).toHaveLength(0);

    await dialog(page).getByRole('textbox').first().fill('Ada');
    await dialogRun(page).click();

    await expect(dialog(page)).toBeHidden();
    expect(stub.runBodies).toEqual([{ inputs: { topic: 'Ada' }, origin: 'editor' }]);

    stub.complete();
    await expect(page.locator('.flowdrop-run-bar')).toContainText('Done', { timeout: 10000 });
  });

  test('a workflow without Playground settings or turn ports still asks for its inputs', async ({
    page
  }) => {
    const stub = await stubBackend(page);
    await gotoEditor(page, 'interface');
    await runButton(page).click();

    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toContainText('amount');
    await expect(dialog(page)).toContainText('items');
    expect(stub.runBodies).toHaveLength(0);
  });

  test('a second Run starts with the last values', async ({ page }) => {
    const stub = await stubBackend(page);
    await gotoFormEditor(page);
    await runButton(page).click();
    await dialog(page).getByRole('textbox').first().fill('Ada');
    await dialogRun(page).click();
    await expect(dialog(page)).toBeHidden();
    stub.complete();
    await expect(page.locator('.flowdrop-run-bar')).toContainText('Done', { timeout: 10000 });
    await expect(page.locator('.flowdrop-run-bar')).toHaveCount(0, { timeout: 10000 });

    await runButton(page).click();
    await expect(dialog(page).getByRole('textbox').first()).toHaveValue('Ada');
  });

  test('a refused run keeps the form open and names the reason', async ({ page }) => {
    const stub = await stubBackend(page);
    stub.refuse(409, {
      success: false,
      error_code: 'WORKFLOW_DISABLED',
      error: 'This workflow is turned off.'
    });
    await gotoFormEditor(page);
    await runButton(page).click();
    await dialog(page).getByRole('textbox').first().fill('Ada');
    await dialogRun(page).click();

    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByRole('alert')).toContainText('This workflow is turned off.');
  });

  test('Cancel closes the form without running', async ({ page }) => {
    const stub = await stubBackend(page);
    await gotoFormEditor(page);
    await runButton(page).click();
    await dialog(page).locator('[data-testid="run-inputs-cancel"]').click();
    await expect(dialog(page)).toBeHidden();
    expect(stub.runBodies).toHaveLength(0);
  });
});
