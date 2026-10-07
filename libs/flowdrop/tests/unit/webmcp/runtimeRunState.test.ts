/**
 * The tool runtime routes `onRun` / `onRunStatus` through the instance's run
 * controller, so an agent's run is the run the editor shows.
 */

import { describe, it, expect } from 'vitest';
import { createToolRuntime } from '../../../src/lib/webmcp/runtime.js';
import { createFlowDropInstance } from '../../../src/lib/stores/instanceContainer.svelte.js';
import type { Workflow } from '../../../src/lib/types/index.js';

const workflow: Workflow = {
  id: 'wf-1',
  name: 'Runtime',
  nodes: [],
  edges: [],
  metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
};

const parse = (r: { content: Array<{ text: string }> }) =>
  JSON.parse(r.content[0].text) as Record<string, unknown>;

describe('tool runtime and fd.runs', () => {
  it('shows the run an agent starts, and moves with the status it reads', async () => {
    const instance = createFlowDropInstance({ id: 'rt-run-state' });
    instance.workflow.initialize(workflow);
    const statuses = ['paused', 'completed'];
    const runtime = createToolRuntime({
      instance,
      nodeTypes: [],
      approval: 'auto',
      hooks: {
        onRun: async () => ({ ok: true, data: { runId: 'r9', status: 'running' } }),
        onRunStatus: async (runId) => ({
          ok: true,
          data: { runId, status: statuses.shift() ?? 'completed' }
        })
      }
    });
    expect(instance.runs.activeRun).toBeNull();

    const started = parse(await runtime.runTool('run', {}));
    expect(started.ok).toBe(true);
    expect(instance.runs.activeRun).toMatchObject({
      origin: 'host',
      runId: 'r9',
      status: 'running'
    });

    const paused = parse(await runtime.runTool('run_status', { runId: 'r9' }));
    expect(paused.code).toBe('PENDING');
    expect(instance.runs.activeRun?.status).toBe('waiting');

    await runtime.runTool('run_status', { runId: 'r9' });
    expect(instance.runs.activeRun?.status).toBe('done');
    instance.destroy();
  });
});
