/**
 * Enhanced API Client for FlowDrop
 * Uses configurable endpoints for all API actions
 */

import type { 
  NodeMetadata, 
  Workflow, 
  ExecutionResult,
  ApiResponse,
  NodesResponse,
  WorkflowResponse,
  WorkflowsResponse
} from "../types/index.js";
import type { EndpointConfig } from "../config/endpoints.js";
import { buildEndpointUrl, getEndpointMethod, getEndpointHeaders } from "../config/endpoints.js";

/**
 * Enhanced HTTP API client for FlowDrop with configurable endpoints
 */
export class EnhancedFlowDropApiClient {
  private config: EndpointConfig;

  constructor(config: EndpointConfig) {
    this.config = config;
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  private async request<T>(
    endpointKey: string,
    endpointPath: string,
    params?: Record<string, string>,
    options: RequestInit = {}
  ): Promise<T> {
    const url = buildEndpointUrl(this.config, endpointPath, params);
    const method = getEndpointMethod(this.config, endpointKey);
    const headers = getEndpointHeaders(this.config, endpointKey);
    
    const config: RequestInit = {
      method,
      headers,
      ...options,
    };

    let lastError: Error | null = null;
    const maxAttempts = this.config.retry?.enabled ? this.config.retry.maxAttempts : 1;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          console.error(`API request failed after ${maxAttempts} attempts:`, lastError);
          throw lastError;
        }
        
        // Wait before retry
        const delay = this.config.retry?.delay || 1000;
        const backoffDelay = this.config.retry?.backoff === 'exponential' 
          ? delay * Math.pow(2, attempt - 1) 
          : delay;
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
    
    throw lastError;
  }

  // Node API Methods
  async getAvailableNodes(): Promise<NodeMetadata[]> {
    const response = await this.request<NodesResponse>(
      'nodes.list',
      this.config.endpoints.nodes.list
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch available nodes");
    }

    return response.data;
  }

  async getNodesByCategory(category: string): Promise<NodeMetadata[]> {
    const response = await this.request<NodesResponse>(
      'nodes.byCategory',
      this.config.endpoints.nodes.byCategory,
      { category }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch nodes by category");
    }

    return response.data;
  }

  async getNodeMetadata(nodeId: string): Promise<NodeMetadata> {
    const response = await this.request<ApiResponse<NodeMetadata>>(
      'nodes.metadata',
      this.config.endpoints.nodes.metadata,
      { id: nodeId }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch node metadata");
    }

    return response.data;
  }

  // Workflow API Methods
  async saveWorkflow(workflow: Workflow): Promise<Workflow> {
    const response = await this.request<WorkflowResponse>(
      'workflows.create',
      this.config.endpoints.workflows.create,
      undefined,
      {
        method: 'POST',
        body: JSON.stringify(workflow),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to save workflow");
    }

    return response.data;
  }

  async updateWorkflow(workflowId: string, workflow: Partial<Workflow>): Promise<Workflow> {
    const response = await this.request<WorkflowResponse>(
      'workflows.update',
      this.config.endpoints.workflows.update,
      { id: workflowId },
      {
        method: 'PUT',
        body: JSON.stringify(workflow),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to update workflow");
    }

    return response.data;
  }

  async loadWorkflow(workflowId: string): Promise<Workflow> {
    const response = await this.request<WorkflowResponse>(
      'workflows.get',
      this.config.endpoints.workflows.get,
      { id: workflowId }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load workflow");
    }

    return response.data;
  }

  async listWorkflows(): Promise<Workflow[]> {
    const response = await this.request<WorkflowsResponse>(
      'workflows.list',
      this.config.endpoints.workflows.list
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to list workflows");
    }

    return response.data;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const response = await this.request<ApiResponse<void>>(
      'workflows.delete',
      this.config.endpoints.workflows.delete,
      { id: workflowId },
      { method: 'DELETE' }
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to delete workflow");
    }
  }

  async validateWorkflow(workflow: Workflow): Promise<{ valid: boolean; errors: string[] }> {
    const response = await this.request<ApiResponse<{ valid: boolean; errors: string[] }>>(
      'workflows.validate',
      this.config.endpoints.workflows.validate,
      undefined,
      {
        method: 'POST',
        body: JSON.stringify(workflow),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to validate workflow");
    }

    return response.data;
  }

  async exportWorkflow(workflowId: string): Promise<string> {
    const response = await this.request<ApiResponse<string>>(
      'workflows.export',
      this.config.endpoints.workflows.export,
      { id: workflowId }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to export workflow");
    }

    return response.data;
  }

  async importWorkflow(workflowJson: string): Promise<Workflow> {
    const response = await this.request<WorkflowResponse>(
      'workflows.import',
      this.config.endpoints.workflows.import,
      undefined,
      {
        method: 'POST',
        body: JSON.stringify({ workflow: workflowJson }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to import workflow");
    }

    return response.data;
  }

  // Execution API Methods
  async executeWorkflow(workflowId: string, inputs?: Record<string, unknown>): Promise<ExecutionResult> {
    const response = await this.request<ApiResponse<ExecutionResult>>(
      'executions.execute',
      this.config.endpoints.executions.execute,
      { id: workflowId },
      {
        method: 'POST',
        body: JSON.stringify({ inputs }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to execute workflow");
    }

    return response.data;
  }

  async getExecutionStatus(executionId: string): Promise<ExecutionResult> {
    const response = await this.request<ApiResponse<ExecutionResult>>(
      'executions.status',
      this.config.endpoints.executions.status,
      { id: executionId }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to get execution status");
    }

    return response.data;
  }

  async cancelExecution(executionId: string): Promise<void> {
    const response = await this.request<ApiResponse<void>>(
      'executions.cancel',
      this.config.endpoints.executions.cancel,
      { id: executionId },
      { method: 'POST' }
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to cancel execution");
    }
  }

  async getExecutionLogs(executionId: string): Promise<string[]> {
    const response = await this.request<ApiResponse<string[]>>(
      'executions.logs',
      this.config.endpoints.executions.logs,
      { id: executionId }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to get execution logs");
    }

    return response.data;
  }

  // Template API Methods
  async listTemplates(): Promise<Workflow[]> {
    const response = await this.request<WorkflowsResponse>(
      'templates.list',
      this.config.endpoints.templates.list
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to list templates");
    }

    return response.data;
  }

  async getTemplate(templateId: string): Promise<Workflow> {
    const response = await this.request<WorkflowResponse>(
      'templates.get',
      this.config.endpoints.templates.get,
      { id: templateId }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to get template");
    }

    return response.data;
  }

  // System API Methods
  async getSystemHealth(): Promise<{ status: string; timestamp: number }> {
    const response = await this.request<ApiResponse<{ status: string; timestamp: number }>>(
      'system.health',
      this.config.endpoints.system.health
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to get system health");
    }

    return response.data;
  }

  async getSystemConfig(): Promise<Record<string, any>> {
    const response = await this.request<ApiResponse<Record<string, any>>>(
      'system.config',
      this.config.endpoints.system.config
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to get system config");
    }

    return response.data;
  }

  async getSystemVersion(): Promise<{ version: string; build: string }> {
    const response = await this.request<ApiResponse<{ version: string; build: string }>>(
      'system.version',
      this.config.endpoints.system.version
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to get system version");
    }

    return response.data;
  }
} 