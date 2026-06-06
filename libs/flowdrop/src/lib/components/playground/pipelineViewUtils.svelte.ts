import { EnhancedFlowDropApiClient } from '$lib/api/enhanced-client.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';
import type { NodeExecutionStatus, KanbanColumnDef } from '$lib/types/index.js';
import { logger } from '$lib/utils/logger.js';

export type NodeStatus = NodeExecutionStatus;

const KNOWN_STATUSES = new Set<string>([
  'idle',
  'pending',
  'running',
  'paused',
  'interrupted',
  'completed',
  'skipped',
  'failed',
  'cancelled'
]);

export interface NodeStatusData {
  status: string;
  last_executed?: string | null;
  execution_time?: number | null;
  /** Precise duration in microseconds, from orchestrator-stamped job metadata */
  execution_time_us?: number | null;
  error?: string | null;
  /** Number of jobs for this node that actually ran (loop iterations) */
  executions?: number | null;
  /** Per-status job counts, e.g. { completed: 2, skipped: 1 } */
  status_counts?: Record<string, number> | null;
}

/**
 * One job from the pipeline payload. Loop-orchestrated workflows create one
 * job per iteration for the same node, so a node can have several of these —
 * the label carries the iteration suffix (e.g. "Invoke tool #2").
 */
export interface PipelineJobItem {
  id: string;
  label: string;
  nodeId: string;
  status: string;
  createdAt?: string | null;
  started?: string | null;
  completed?: string | null;
  /** Precise duration in microseconds, when the job ran to completion */
  executionTimeUs?: number | null;
  error?: string | null;
  retryCount?: number | null;
  maxRetries?: number | null;
  inputData?: unknown;
  outputData?: unknown;
}

function toJobItem(raw: Record<string, unknown>, index: number): PipelineJobItem {
  const started = typeof raw.started === 'string' ? raw.started : null;
  const completed = typeof raw.completed === 'string' ? raw.completed : null;

  // Prefer the orchestrator-stamped microsecond duration; fall back to the
  // second-granularity timestamps for jobs that predate the metadata stamp.
  let executionTimeUs: number | null =
    typeof raw.execution_time_us === 'number' ? raw.execution_time_us : null;
  if (executionTimeUs == null && started && completed) {
    const startMs = Date.parse(started);
    const endMs = Date.parse(completed);
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
      executionTimeUs = (endMs - startMs) * 1000;
    }
  }

  return {
    id: typeof raw.id === 'string' || typeof raw.id === 'number' ? String(raw.id) : `job-${index}`,
    label: typeof raw.label === 'string' ? raw.label : '',
    nodeId: typeof raw.node_id === 'string' ? raw.node_id : '',
    status: typeof raw.status === 'string' ? raw.status : 'idle',
    createdAt: typeof raw.created_at === 'string' ? raw.created_at : null,
    started,
    completed,
    executionTimeUs,
    error: typeof raw.error_message === 'string' ? raw.error_message : null,
    retryCount: typeof raw.retry_count === 'number' ? raw.retry_count : null,
    maxRetries: typeof raw.max_retries === 'number' ? raw.max_retries : null,
    inputData: raw.input_data ?? null,
    outputData: raw.output_data ?? null
  };
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
  let jobs = $state<PipelineJobItem[]>([]);
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
          execution_time_us: info.execution_time_us as number | null | undefined,
          error: info.error as string | null | undefined,
          executions: info.executions as number | null | undefined,
          status_counts: info.status_counts as Record<string, number> | null | undefined
        };
      }
      nodeStatusMap = map;
      jobs = (data.jobs ?? []).map(toJobItem);
      if (data.kanban_config?.columns) {
        // Server sends statuses as string[]; trust the server and cast at this
        // boundary. resolveStatus() handles unknown values at read time.
        kanbanConfig = data.kanban_config.columns.map((col) => ({
          key: col.key,
          label: col.label,
          statuses: col.statuses as NodeExecutionStatus[],
          icon: col.icon,
          color: col.color
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
    get jobs() {
      return jobs;
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
