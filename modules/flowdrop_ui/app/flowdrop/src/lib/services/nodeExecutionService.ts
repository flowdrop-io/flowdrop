/**
 * Node Execution Service
 * Handles fetching and managing node execution information from the backend
 */

import type { NodeExecutionInfo } from '../types/index.js';
import { getEndpointConfig } from './api.js';
import { buildEndpointUrl } from '../config/endpoints.js';

/**
 * Service for managing node execution information
 */
export class NodeExecutionService {
  private static instance: NodeExecutionService;
  private cache: Map<string, NodeExecutionInfo> = new Map();
  private cacheTimeout = 30000; // 30 seconds
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
  async getNodeExecutionInfo(nodeId: string, pipelineId?: string): Promise<NodeExecutionInfo | null> {
    if (!pipelineId) {
      console.warn('Pipeline ID is required to fetch node execution info');
      return null;
    }

    try {
      const endpointConfig = getEndpointConfig();
      const url = buildEndpointUrl(endpointConfig, endpointConfig.endpoints.pipelines.get, { id: pipelineId });
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const pipelineData = await response.json();
      const jobs = pipelineData.jobs || [];
      const nodeStatuses = pipelineData.node_statuses || {};
      
      // Find the job for this node
      const nodeJob = jobs.find((job: any) => job.node_id === nodeId);
      const nodeStatus = nodeStatuses[nodeId];
      
      if (!nodeJob && !nodeStatus) {
        return {
          status: 'idle',
          executionCount: 0,
          isExecuting: false
        };
      }

      const executionInfo: NodeExecutionInfo = {
        status: this.mapJobStatusToExecutionStatus(nodeStatus?.status || nodeJob?.status || 'idle'),
        executionCount: nodeJob?.execution_count || 0,
        isExecuting: nodeStatus?.status === 'running' || nodeJob?.status === 'running',
        lastExecuted: nodeJob?.last_executed || nodeStatus?.last_executed,
        lastExecutionDuration: nodeJob?.execution_time || nodeStatus?.execution_time,
        lastError: nodeJob?.error || nodeStatus?.error
      };

      this.cache.set(nodeId, executionInfo);
      return executionInfo;
    } catch (error) {
      console.error('Failed to fetch node execution info:', error);
      return null;
    }
  }

  /**
   * Get execution information for multiple nodes from pipeline data
   */
  async getMultipleNodeExecutionInfo(nodeIds: string[], pipelineId?: string): Promise<Record<string, NodeExecutionInfo>> {
    if (!pipelineId) {
      console.warn('Pipeline ID is required to fetch node execution info');
      return {};
    }

    // Check if API is temporarily unavailable
    if (this.apiUnavailable && Date.now() < this.apiUnavailableUntil) {
      console.log('API temporarily unavailable, returning cached/default values');
      const defaultExecutionInfo: Record<string, NodeExecutionInfo> = {};
      nodeIds.forEach(nodeId => {
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
      const url = buildEndpointUrl(endpointConfig, endpointConfig.endpoints.pipelines.get, { id: pipelineId });
      const response = await fetch(url);
      
      if (!response.ok) {
        // If the endpoint returns 404, it means the pipeline API is not available
        // Mark API as unavailable for 5 minutes to prevent repeated calls
        if (response.status === 404) {
          console.warn(`Pipeline API endpoint not available for pipeline ${pipelineId}`);
          this.apiUnavailable = true;
          this.apiUnavailableUntil = Date.now() + (5 * 60 * 1000); // 5 minutes
          const defaultExecutionInfo: Record<string, NodeExecutionInfo> = {};
          nodeIds.forEach(nodeId => {
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

      const result = await response.json();
      const jobs = result.jobs || [];
      
      const executionInfoMap: Record<string, NodeExecutionInfo> = {};
      
      // Initialize all nodes with default values
      nodeIds.forEach(nodeId => {
        executionInfoMap[nodeId] = {
          status: 'idle',
          executionCount: 0,
          isExecuting: false
        };
      });
      
      // Update with actual job data
      jobs.forEach((job: any) => {
        const nodeId = job.node_id;
        if (nodeIds.includes(nodeId)) {
          executionInfoMap[nodeId] = {
            status: this.mapJobStatusToExecutionStatus(job.status),
            executionCount: job.execution_count || 0,
            isExecuting: job.status === 'running',
            lastExecuted: job.completed || job.started,
            lastExecutionDuration: job.execution_time,
            lastError: job.error_message
          };
          
          // Update cache
          this.cache.set(nodeId, executionInfoMap[nodeId]);
        }
      });
      
      return executionInfoMap;
    } catch (error) {
      console.error('Failed to fetch multiple node execution info:', error);
      // Return default values instead of empty object to prevent repeated calls
      const defaultExecutionInfo: Record<string, NodeExecutionInfo> = {};
      nodeIds.forEach(nodeId => {
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
      console.error('Failed to fetch all node execution counts:', error);
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
