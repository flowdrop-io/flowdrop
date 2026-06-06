/**
 * Node Execution Service
 * Handles fetching and managing node execution information from the backend
 */

import type { NodeExecutionInfo, NodeJobExecution } from '../types/index.js';
import { getEndpointConfig } from './api.js';
import { buildEndpointUrl } from '../config/endpoints.js';
import {
  NODE_EXECUTION_CACHE_TIMEOUT_MS,
  PIPELINE_API_UNAVAILABLE_DURATION_MS
} from '../config/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Internal type for pipeline job data from the API response
 */
interface PipelineJob {
  id?: string;
  label?: string;
  node_id: string;
  status: string;
  execution_count?: number;
  started?: string;
  completed?: string;
  last_executed?: string;
  execution_time?: number;
  execution_time_us?: number;
  error?: string;
  error_message?: string;
}

/**
 * Internal type for a node_statuses entry from the API response.
 *
 * The backend resolves one representative entry per node: status comes from
 * the latest job (loop iterations create multiple jobs per node), timing
 * from the most recent job that actually ran, and `executions` /
 * `status_counts` carry the full per-iteration picture.
 */
interface NodeStatusEntry {
  status: string;
  last_executed?: string | null;
  execution_time?: number | null;
  execution_time_us?: number | null;
  error?: string | null;
  executions?: number;
  status_counts?: Record<string, number>;
}

/**
 * Service for managing node execution information
 */
export class NodeExecutionService {
  private static instance: NodeExecutionService;
  private cache: Map<string, NodeExecutionInfo> = new Map();
  private cacheTimeout = NODE_EXECUTION_CACHE_TIMEOUT_MS;
  private lastFetch: number = 0;
  private apiUnavailable: boolean = false;
  private apiUnavailableUntil: number = 0;

  private constructor() {}

  public static getInstance(): NodeExecutionService {
    if (!NodeExecutionService.instance) {
      NodeExecutionService.instance = new NodeExecutionService();
    }
    return NodeExecutionService.instance;
  }

  /**
   * Get execution information for a specific node from pipeline data
   */
  async getNodeExecutionInfo(
    nodeId: string,
    pipelineId?: string
  ): Promise<NodeExecutionInfo | null> {
    if (!pipelineId) {
      return null;
    }

    try {
      const endpointConfig = getEndpointConfig();
      if (!endpointConfig) throw new Error('Endpoint config not available');
      const url = buildEndpointUrl(endpointConfig, endpointConfig.endpoints.pipelines.get, {
        id: pipelineId
      });
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const pipelineData = raw.data ?? raw;
      const jobs: PipelineJob[] = pipelineData.jobs || [];
      const nodeStatuses: Record<string, NodeStatusEntry> = pipelineData.node_statuses || {};

      const executionInfo = this.buildNodeExecutionInfo(nodeId, nodeStatuses[nodeId], jobs);

      this.cache.set(nodeId, executionInfo);
      return executionInfo;
    } catch (error) {
      logger.error('Failed to fetch node execution info:', error);
      return null;
    }
  }

  /**
   * Get execution information for multiple nodes from pipeline data
   */
  async getMultipleNodeExecutionInfo(
    nodeIds: string[],
    pipelineId?: string
  ): Promise<Record<string, NodeExecutionInfo>> {
    if (!pipelineId) {
      return {};
    }

    // Check if API is temporarily unavailable
    if (this.apiUnavailable && Date.now() < this.apiUnavailableUntil) {
      const defaultExecutionInfo: Record<string, NodeExecutionInfo> = {};
      nodeIds.forEach((nodeId) => {
        defaultExecutionInfo[nodeId] = {
          status: 'idle',
          executionCount: 0,
          isExecuting: false
        };
      });
      return defaultExecutionInfo;
    }

    try {
      const endpointConfig = getEndpointConfig();
      if (!endpointConfig) throw new Error('Endpoint config not available');
      const url = buildEndpointUrl(endpointConfig, endpointConfig.endpoints.pipelines.get, {
        id: pipelineId
      });
      const response = await fetch(url);

      if (!response.ok) {
        // If the endpoint returns 404, it means the pipeline API is not available
        // Mark API as unavailable for 5 minutes to prevent repeated calls
        if (response.status === 404) {
          logger.warn(`Pipeline API endpoint not available for pipeline ${pipelineId}`);
          this.apiUnavailable = true;
          this.apiUnavailableUntil = Date.now() + PIPELINE_API_UNAVAILABLE_DURATION_MS;
          const defaultExecutionInfo: Record<string, NodeExecutionInfo> = {};
          nodeIds.forEach((nodeId) => {
            defaultExecutionInfo[nodeId] = {
              status: 'idle',
              executionCount: 0,
              isExecuting: false
            };
          });
          return defaultExecutionInfo;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const result = raw.data ?? raw;
      const jobs: PipelineJob[] = result.jobs || [];
      const nodeStatuses: Record<string, NodeStatusEntry> = result.node_statuses || {};

      const executionInfoMap: Record<string, NodeExecutionInfo> = {};

      nodeIds.forEach((nodeId) => {
        executionInfoMap[nodeId] = this.buildNodeExecutionInfo(nodeId, nodeStatuses[nodeId], jobs);
        if (executionInfoMap[nodeId].status !== 'idle' || executionInfoMap[nodeId].jobs) {
          this.cache.set(nodeId, executionInfoMap[nodeId]);
        }
      });

      return executionInfoMap;
    } catch (error) {
      logger.error('Failed to fetch multiple node execution info:', error);
      // Return default values instead of empty object to prevent repeated calls
      const defaultExecutionInfo: Record<string, NodeExecutionInfo> = {};
      nodeIds.forEach((nodeId) => {
        defaultExecutionInfo[nodeId] = {
          status: 'idle',
          executionCount: 0,
          isExecuting: false
        };
      });
      return defaultExecutionInfo;
    }
  }

  /**
   * Get all node execution counts
   */
  async getAllNodeExecutionCounts(): Promise<Record<string, number>> {
    try {
      const endpointConfig = getEndpointConfig();
      if (!endpointConfig) throw new Error('Endpoint config not available');
      const url = buildEndpointUrl(endpointConfig, '/node-execution-counts');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }

      return {};
    } catch (error) {
      logger.error('Failed to fetch all node execution counts:', error);
      return {};
    }
  }

  /**
   * Get cached execution info for a node
   */
  getCachedNodeExecutionInfo(nodeId: string): NodeExecutionInfo | null {
    return this.cache.get(nodeId) || null;
  }

  /**
   * Clear cache for a specific node
   */
  clearNodeCache(nodeId: string): void {
    this.cache.delete(nodeId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
    this.lastFetch = 0;
  }

  /**
   * Check if cache is stale
   */
  isCacheStale(): boolean {
    return Date.now() - this.lastFetch > this.cacheTimeout;
  }

  /**
   * Update execution info for a node (for real-time updates)
   */
  updateNodeExecutionInfo(nodeId: string, executionInfo: Partial<NodeExecutionInfo>): void {
    const existing = this.cache.get(nodeId);
    if (existing) {
      this.cache.set(nodeId, { ...existing, ...executionInfo });
    } else {
      this.cache.set(nodeId, {
        status: 'idle',
        executionCount: 0,
        isExecuting: false,
        ...executionInfo
      });
    }
  }

  /**
   * Build execution info for one node from the pipeline payload.
   *
   * The `node_statuses` entry is the backend-resolved summary (latest job's
   * status, timing from the most recent run, `executions` count); the per-job
   * history is attached from the `jobs` array so loop iterations stay
   * inspectable. Falls back to the node's jobs when no entry exists (older
   * backends).
   */
  private buildNodeExecutionInfo(
    nodeId: string,
    entry: NodeStatusEntry | undefined,
    jobs: PipelineJob[]
  ): NodeExecutionInfo {
    const nodeJobs = jobs.filter((job) => job.node_id === nodeId);

    if (!entry && nodeJobs.length === 0) {
      return {
        status: 'idle',
        executionCount: 0,
        isExecuting: false
      };
    }

    // Fallback for payloads without a node_statuses entry: the last job in
    // pipeline order mirrors the backend's latest-wins resolution.
    const lastJob = nodeJobs[nodeJobs.length - 1];
    const status = entry?.status ?? lastJob?.status ?? 'idle';
    const startedCount = nodeJobs.filter((job) => job.started).length;

    const executionInfo: NodeExecutionInfo = {
      status: this.mapJobStatusToExecutionStatus(status),
      executionCount: entry?.executions ?? startedCount,
      isExecuting: status === 'running' || nodeJobs.some((job) => job.status === 'running'),
      lastExecuted: entry?.last_executed ?? lastJob?.completed ?? lastJob?.started ?? undefined,
      lastExecutionDuration: entry?.execution_time ?? lastJob?.execution_time ?? undefined,
      lastExecutionDurationUs: entry?.execution_time_us ?? lastJob?.execution_time_us ?? undefined,
      lastError: entry?.error ?? lastJob?.error_message ?? undefined
    };

    if (nodeJobs.length > 0) {
      executionInfo.jobs = nodeJobs.map((job) => this.mapJobToNodeJobExecution(job));
    }

    return executionInfo;
  }

  /**
   * Map a pipeline job payload entry to a NodeJobExecution history item.
   */
  private mapJobToNodeJobExecution(job: PipelineJob): NodeJobExecution {
    let executionTime = job.execution_time;
    if (executionTime == null && job.started && job.completed) {
      const started = Date.parse(job.started);
      const completed = Date.parse(job.completed);
      if (!Number.isNaN(started) && !Number.isNaN(completed)) {
        executionTime = completed - started;
      }
    }

    return {
      id: job.id,
      label: job.label,
      status: this.mapJobStatusToExecutionStatus(job.status),
      started: job.started,
      completed: job.completed,
      executionTime,
      executionTimeUs:
        job.execution_time_us ?? (executionTime != null ? executionTime * 1000 : undefined),
      error: job.error_message ?? job.error
    };
  }

  /**
   * Map job status to execution status
   */
  private mapJobStatusToExecutionStatus(jobStatus: string): NodeExecutionInfo['status'] {
    switch (jobStatus) {
      case 'pending':
        return 'pending';
      case 'running':
        return 'running';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'cancelled':
        return 'cancelled';
      case 'skipped':
        return 'skipped';
      case 'paused':
        return 'paused';
      case 'interrupted':
        return 'interrupted';
      default:
        return 'idle';
    }
  }

  /**
   * Batch update execution info for multiple nodes
   */
  updateMultipleNodeExecutionInfo(updates: Record<string, Partial<NodeExecutionInfo>>): void {
    Object.entries(updates).forEach(([nodeId, executionInfo]) => {
      this.updateNodeExecutionInfo(nodeId, executionInfo);
    });
  }

  /**
   * Reset API availability status (useful for testing or when API becomes available)
   */
  resetApiAvailability(): void {
    this.apiUnavailable = false;
    this.apiUnavailableUntil = 0;
  }
}

// Export singleton instance
export const nodeExecutionService = NodeExecutionService.getInstance();
