/**
 * PipelineStatus polls the pipeline every 5 s while it runs. The poll must
 * stop when the pipeline stops running and when the component unmounts.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PipelineStatus from '$lib/components/PipelineStatus.svelte';
import type { EnhancedFlowDropApiClient } from '$lib/api/enhanced-client.js';
import type { Workflow } from '$lib/types/index.js';

// The embedded editor is not under test, and too heavy for happy-dom.
vi.mock('$lib/components/App.svelte', () => ({ default: () => {} }));
vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

let mounted: ReturnType<typeof mount> | null = null;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

const workflow = { id: 'wf', name: 'wf', nodes: [], edges: [] } as unknown as Workflow;

function render(statuses: string[]) {
  let call = 0;
  const getPipelineData = vi.fn(async () => ({
    status: statuses[Math.min(call++, statuses.length - 1)],
    job_status_summary: { total: 1 }
  }));
  const apiClient = { getPipelineData } as unknown as EnhancedFlowDropApiClient;
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(PipelineStatus, { target, props: { pipelineId: 'p1', workflow, apiClient } });
  flushSync();
  return { getPipelineData };
}

async function tick(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  flushSync();
}

describe('PipelineStatus polling', () => {
  it('polls while running and stops when unmounted', async () => {
    const { getPipelineData } = render(['running']);
    await tick(0);
    expect(getPipelineData).toHaveBeenCalledTimes(1);
    await tick(5000);
    expect(getPipelineData).toHaveBeenCalledTimes(2);
    unmount(mounted!);
    mounted = null;
    await tick(20000);
    expect(getPipelineData).toHaveBeenCalledTimes(2);
  });

  it('stops polling once the pipeline is no longer running', async () => {
    const { getPipelineData } = render(['running', 'completed']);
    await tick(0);
    await tick(5000);
    expect(getPipelineData).toHaveBeenCalledTimes(2);
    await tick(20000);
    expect(getPipelineData).toHaveBeenCalledTimes(2);
  });
});
