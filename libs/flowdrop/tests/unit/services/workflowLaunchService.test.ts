import { describe, it, expect, vi, afterEach } from 'vitest';
import { WorkflowLaunchService } from '$lib/services/workflowLaunchService.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';

const config = {
  baseUrl: 'http://backend.test',
  endpoints: { workflows: { run: '/workflow/{workflowId}/run' } }
} as unknown as EndpointConfig;

function mockFetch() {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ data: { pipelineId: '7', status: 'running', queued: true } }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('WorkflowLaunchService: where the run started', () => {
  it('sends the origin when the editor names itself', async () => {
    const fetchMock = mockFetch();
    const result = await new WorkflowLaunchService().launch(config, 'wf', { origin: 'editor' });
    expect(result).toMatchObject({ status: 'launched', pipelineId: '7', queued: true });
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(init.body))).toEqual({ origin: 'editor' });
  });

  it('sends no origin by default', async () => {
    const fetchMock = mockFetch();
    await new WorkflowLaunchService().launch(config, 'wf', {});
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(init.body))).toEqual({});
  });
});
