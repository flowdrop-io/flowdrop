/**
 * The canvas -> store sync (`WorkflowOperationsHelper.updateWorkflow`) and the
 * save helper must never carry run status into the workflow. Status lives in
 * `fd.playground.nodeStatuses`.
 */

import { describe, it, expect, vi } from 'vitest';
import { WorkflowOperationsHelper } from '$lib/helpers/workflowEditorHelper.js';
import { ApiContext } from '$lib/stores/apiContext.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';
import { createTestNode, createTestWorkflow } from '../../utils/index.js';

const info = { status: 'completed', executionCount: 3, isExecuting: false };

function nodeWithStatus(id: string) {
  const node = createTestNode({ id });
  return { ...node, data: { ...node.data, executionInfo: info } };
}

describe('run status never reaches the workflow', () => {
  it('updateWorkflow (flow -> store sync) drops executionInfo', () => {
    const base = createTestWorkflow({ id: 'wf' });
    const synced = WorkflowOperationsHelper.updateWorkflow(
      base,
      [nodeWithStatus('a'), nodeWithStatus('b')] as never,
      []
    );
    expect(synced.nodes).toHaveLength(2);
    for (const node of synced.nodes) expect('executionInfo' in node.data).toBe(false);
  });

  it('saveWorkflow sends nodes without executionInfo', async () => {
    const api = new ApiContext();
    api.configure({ baseUrl: 'http://backend.test', endpoints: {} } as unknown as EndpointConfig);
    const update = vi.fn().mockImplementation(async (_id: string, wf: unknown) => wf);
    vi.spyOn(api, 'client', 'get').mockReturnValue({ updateWorkflow: update } as never);

    const wf = createTestWorkflow({ id: 'wf', nodes: [nodeWithStatus('a')] as never });
    await WorkflowOperationsHelper.saveWorkflow(api, wf);

    const sent = update.mock.calls[0][1] as { nodes: { data: object }[] };
    expect(sent.nodes).toHaveLength(1);
    expect('executionInfo' in sent.nodes[0].data).toBe(false);
  });
});
