import { untrack } from 'svelte';
import { EnhancedFlowDropApiClient } from '$lib/api/enhanced-client.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';
import type { NodeExecutionStatus, KanbanColumnDef } from '$lib/types/index.js';

export type NodeStatus = NodeExecutionStatus;

export interface NodeStatusData {
  status: string;
  last_executed?: string | null;
  execution_time?: number | null;
  error?: string | null;
}

const KNOWN_STATUSES = new Set<string>([
  'idle', 'pending', 'running', 'completed', 'failed',
  'cancelled', 'skipped', 'paused', 'interrupted'
]);

export function resolveStatus(raw: NodeStatusData | undefined): NodeStatus {
  if (!raw) return 'pending';
  if (KNOWN_STATUSES.has(raw.status)) return raw.status as NodeStatus;
  return 'pending';
}

export function createPipelineDataFetcher(
  getPipelineId: () => string,
  getEndpointConfig: () => EndpointConfig
) {
  const client = new EnhancedFlowDropApiClient(getEndpointConfig());
  let nodeStatusMap = $state<Record<string, NodeStatusData>>({});
  let kanbanConfig = $state<KanbanColumnDef[] | null>(null);
  let isLoading = $state(false);
  let isError = $state(false);

  async function fetchData() {
    try {
      isLoading = true;
      isError = false;
      const data = await client.getPipelineData(getPipelineId());
      const map: Record<string, NodeStatusData> = {};
      for (const [nodeId, info] of Object.entries(data.node_statuses)) {
        map[nodeId] = {
          status: info.status,
          last_executed: info.last_executed as string | null | undefined,
          execution_time: info.execution_time as number | null | undefined,
          error: info.error as string | null | undefined,
        };
      }
      nodeStatusMap = map;
      if (data.kanban_config?.columns) {
        kanbanConfig = data.kanban_config.columns as KanbanColumnDef[];
      }
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
    get kanbanConfig() {
      return kanbanConfig;
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
