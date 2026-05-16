import { untrack } from 'svelte';
import { EnhancedFlowDropApiClient } from '$lib/api/enhanced-client.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed';

export function resolveStatus(raw: string | undefined): NodeStatus {
  if (raw === 'running') return 'running';
  if (raw === 'completed') return 'completed';
  if (raw === 'failed' || raw === 'cancelled') return 'failed';
  return 'pending';
}

export function createPipelineDataFetcher(
  getPipelineId: () => string,
  getEndpointConfig: () => EndpointConfig
) {
  const client = new EnhancedFlowDropApiClient(getEndpointConfig());
  let nodeStatusMap = $state<Record<string, string>>({});
  let isLoading = $state(false);
  let isError = $state(false);

  async function fetchData() {
    try {
      isLoading = true;
      isError = false;
      const data = await client.getPipelineData(getPipelineId());
      const map: Record<string, string> = {};
      for (const [nodeId, info] of Object.entries(data.node_statuses)) {
        map[nodeId] = info.status;
      }
      nodeStatusMap = map;
    } catch {
      isError = true;
    } finally {
      isLoading = false;
    }
  }

  function connectRefreshTrigger(getTrigger: () => number) {
    let last = untrack(getTrigger);
    $effect(() => {
      const t = getTrigger();
      if (t <= 0 || t === last) return;
      last = t;
      const timer = setTimeout(fetchData, 300);
      return () => clearTimeout(timer);
    });
  }

  return {
    get nodeStatusMap() {
      return nodeStatusMap;
    },
    get isLoading() {
      return isLoading;
    },
    get isError() {
      return isError;
    },
    fetchData,
    connectRefreshTrigger
  };
}
