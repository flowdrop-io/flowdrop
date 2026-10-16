/**
 * Network stub for the Runs list: the workflow's pipelines (paged, newest
 * first as the server answers), one pipeline's node statuses, its status, and
 * the cancel and re-run POSTs. Calls are recorded so a test can assert on them.
 */

import type { Page } from '@playwright/test';

export interface StubRun {
  id: number;
  status: string;
  createdAt: string;
  lastExecuted: string | null;
  /** Node statuses `GET /pipeline/{id}` reports. */
  nodes: Record<string, string>;
  failedJobs?: number;
}

export interface RunsStub {
  runs: StubRun[];
  /** `limit`/`offset` of each list read. */
  listCalls: Array<{ limit: number | null; offset: number | null }>;
  cancelled: string[];
  rerun: string[];
}

const json = (data: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data })
});

/** An ISO time `minutes` before now. */
export function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function sampleRuns(): StubRun[] {
  return [
    {
      id: 106,
      status: 'running',
      createdAt: ago(2),
      lastExecuted: null,
      nodes: { 'node-input': 'completed', 'node-output': 'running' }
    },
    {
      id: 105,
      status: 'completed',
      createdAt: ago(60),
      lastExecuted: ago(59),
      nodes: { 'node-input': 'completed', 'node-output': 'completed' }
    },
    {
      id: 104,
      status: 'paused',
      createdAt: ago(60 * 20),
      lastExecuted: null,
      nodes: { 'node-input': 'completed', 'node-output': 'idle' }
    },
    {
      id: 103,
      status: 'failed',
      createdAt: ago(60 * 22),
      lastExecuted: ago(60 * 22 - 1),
      failedJobs: 1,
      nodes: { 'node-input': 'completed', 'node-output': 'failed' }
    },
    {
      id: 102,
      status: 'cancelled',
      createdAt: ago(60 * 50),
      lastExecuted: ago(60 * 50 - 3),
      nodes: { 'node-input': 'completed', 'node-output': 'idle' }
    }
  ];
}

export async function stubRuns(
  page: Page,
  initial: StubRun[] = sampleRuns(),
  opts: { cancelFails?: boolean } = {}
): Promise<RunsStub> {
  const stub: RunsStub = { runs: initial, listCalls: [], cancelled: [], rerun: [] };
  const session = {
    id: 'sess-1',
    workflowId: 'test-workflow-simple',
    name: 'Session 1',
    status: 'idle',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  await page.route('**/api/flowdrop/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/flowdrop', '');
    const method = request.method();

    if (/\/workflow\/[^/]+\/pipelines$/.test(path) && method === 'GET') {
      const limit = url.searchParams.get('limit');
      const offset = url.searchParams.get('offset');
      stub.listCalls.push({
        limit: limit === null ? null : Number(limit),
        offset: offset === null ? null : Number(offset)
      });
      const sorted = [...stub.runs].sort((a, b) => b.id - a.id);
      const page = sorted.slice(Number(offset ?? 0), Number(offset ?? 0) + Number(limit ?? 100));
      return route.fulfill(
        json({
          workflow_id: 'test-workflow-simple',
          pipelines: page.map((r) => ({
            id: r.id,
            name: `Run ${r.id}`,
            status: r.status,
            createdAt: r.createdAt,
            lastExecuted: r.lastExecuted,
            executionCount: 2,
            job_status_summary: { total: 2, failed: r.failedJobs ?? 0 },
            node_statuses: {}
          })),
          count: page.length
        })
      );
    }
    const detail = /\/pipeline\/(\d+)$/.exec(path);
    if (detail && method === 'GET') {
      const run = stub.runs.find((r) => String(r.id) === detail[1]);
      if (!run) return route.fulfill({ status: 404, body: '{}' });
      return route.fulfill(
        json({
          status: run.status,
          jobs: [],
          node_statuses: Object.fromEntries(
            Object.entries(run.nodes).map(([id, status]) => [
              id,
              { status, executions: status === 'idle' ? 0 : 1 }
            ])
          )
        })
      );
    }
    const status = /\/pipeline\/(\d+)\/status$/.exec(path);
    if (status && method === 'GET') {
      const run = stub.runs.find((r) => String(r.id) === status[1]);
      return route.fulfill(json({ id: status[1], status: run?.status ?? 'pending' }));
    }
    const cancel = /\/pipeline\/(\d+)\/cancel$/.exec(path);
    if (cancel && method === 'POST') {
      if (opts.cancelFails) {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'The run already finished.' })
        });
      }
      stub.cancelled.push(cancel[1]);
      const run = stub.runs.find((r) => String(r.id) === cancel[1]);
      if (run) {
        run.status = 'cancelled';
        run.lastExecuted = new Date().toISOString();
      }
      return route.fulfill(json({ pipeline_id: cancel[1], status: 'cancelled' }));
    }
    const rerun = /\/pipeline\/(\d+)\/rerun$/.exec(path);
    if (rerun && method === 'POST') {
      stub.rerun.push(rerun[1]);
      const id = Math.max(...stub.runs.map((r) => r.id)) + 1;
      stub.runs.push({
        id,
        status: 'running',
        createdAt: new Date().toISOString(),
        lastExecuted: null,
        nodes: { 'node-input': 'running', 'node-output': 'idle' }
      });
      return route.fulfill(json({ pipeline_id: id, status: 'running' }));
    }
    if (/\/workflows\/[^/]+\/playground\/sessions$/.test(path)) {
      return route.fulfill(method === 'POST' ? json(session) : json([]));
    }
    return route.fallback();
  });
  return stub;
}
