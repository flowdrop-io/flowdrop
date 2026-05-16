import { EnhancedFlowDropApiClient } from '$lib/api/enhanced-client.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';
import type { NodeExecutionStatus, KanbanColumnDef } from '$lib/types/index.js';
import { logger } from '$lib/utils/logger.js';

export type NodeStatus = NodeExecutionStatus;

const KNOWN_STATUSES = new Set<string>([
  'idle', 'pending', 'running', 'paused', 'interrupted',
  'completed', 'skipped', 'failed', 'cancelled'
]);

export interface NodeStatusData {
  status: string;
  last_executed?: string | null;
  execution_time?: number | null;
  error?: string | null;
}

export function resolveStatus(raw: NodeStatusData | undefined): NodeStatus {
  if (!raw) return 'pending';
  const s = raw.status || 'pending';
  if (!KNOWN_STATUSES.has(s)) {
    logger.warn(`[FlowDrop] Unknown node status from server: "${s}" — falling back to "pending"`);
    return 'pending';
  }
  return s as NodeStatus;
}

/**
 * Creates a reactive pipeline data fetcher.
 * `endpointConfig` is used once to construct the API client — it must be stable.
 * `getPipelineId` is called on every fetch so pipeline ID changes are picked up.
 */
export function createPipelineDataFetcher(
  getPipelineId: () => string,
  endpointConfig: EndpointConfig
) {
  const client = new EnhancedFlowDropApiClient(endpointConfig);
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
        // Server sends statuses as string[]; trust the server and cast at this
        // boundary. resolveStatus() handles unknown values at read time.
        kanbanConfig = data.kanban_config.columns.map((col) => ({
          key: col.key,
          label: col.label,
          statuses: col.statuses as NodeExecutionStatus[],
          icon: col.icon,
          color: col.color,
        }));
      }
    } catch {
      isError = true;
    } finally {
      isLoading = false;
    }
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
    fetchData
  };
}
