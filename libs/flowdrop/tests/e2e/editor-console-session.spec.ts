/**
 * E2E Test: Console `session` commands.
 *
 * The editor Console drives a test session through the instance's run
 * controller. The backend is stubbed at the network edge: a session is created
 * on the first send, the turn is accepted, and the reply is what
 * `session status` then reads.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gotoEditor } from './helpers/editor-helpers';

const SESSION = {
  id: 'sess-1',
  workflowId: 'wf',
  name: 'Session 1',
  status: 'idle',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

const json = (data: unknown, extra: Record<string, unknown> = {}) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data, ...extra })
});

async function stubBackend(page: Page): Promise<{ turns: unknown[] }> {
  const turns: unknown[] = [];
  let replied = false;
  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/flowdrop', '');
    const method = request.method();

    if (/\/workflows\/[^/]+\/playground\/sessions$/.test(path)) {
      return route.fulfill(method === 'POST' ? json(SESSION) : json([]));
    }
    if (/\/playground\/sessions\/sess-1\/messages$/.test(path) && method === 'POST') {
      turns.push(request.postDataJSON());
      replied = true;
      return route.fulfill(
        json({
          id: 'm1',
          sessionId: 'sess-1',
          role: 'user',
          content: 'hi',
          timestamp: '2026-01-01T00:00:01Z',
          sequenceNumber: 1
        })
      );
    }
    if (/\/playground\/sessions\/sess-1\/messages$/.test(path)) {
      const data = replied
        ? [
            {
              id: 'm2',
              sessionId: 'sess-1',
              role: 'assistant',
              content: 'Hello from the stub',
              timestamp: '2026-01-01T00:00:02Z',
              sequenceNumber: 2
            }
          ]
        : [];
      return route.fulfill(json(data, { hasMore: false, sessionStatus: 'idle' }));
    }
    return route.fallback();
  });
  return { turns };
}

async function runInConsole(page: Page, line: string): Promise<void> {
  const input = page.locator('.console-input__field');
  await input.fill(line);
  await input.press('Enter');
}

test.describe('Console session commands', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'Editor requires desktop-width viewport');
  });

  test('session send creates a session and session status reads the reply', async ({ page }) => {
    const { turns } = await stubBackend(page);
    await gotoEditor(page);

    await page.keyboard.press('`');
    const output = page.locator('.command-console');
    await expect(page.locator('.console-input__field')).toBeVisible();

    await runInConsole(page, 'session status');
    await expect(output).toContainText('No test session yet');

    await runInConsole(page, 'session send "hi"');
    await expect(output).toContainText('Turn sent to "Session 1"');
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({ content: 'hi' });

    // The reply arrives through polling; status reads it once it has.
    await expect
      .poll(
        async () => {
          await runInConsole(page, 'session status');
          return output.innerText();
        },
        { timeout: 10000 }
      )
      .toContain('Latest reply: Hello from the stub');
  });

  test('a session line in a pasted batch is refused before anything runs', async ({ page }) => {
    await stubBackend(page);
    await gotoEditor(page);
    await page.keyboard.press('`');
    const output = page.locator('.command-console');

    await page.locator('.console-input__field').evaluate((el) => {
      const data = new DataTransfer();
      data.setData('text/plain', 'list nodes\nsession status');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
    });

    await expect(output).toContainText('session commands cannot be part of a batch');
  });
});
