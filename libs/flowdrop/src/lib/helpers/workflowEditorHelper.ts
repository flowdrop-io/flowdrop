/**
 * Workflow Editor Helper
 * Contains business logic for workflow operations
 */

import type {
  WorkflowNode as WorkflowNodeType,
  NodeMetadata,
  Workflow,
  WorkflowEdge,
  NodeExecutionInfo
} from '../types/index.js';
import { hasCycles, hasInvalidCycles } from '../utils/connections.js';
import { v4 as uuidv4 } from 'uuid';
import { getDefaultInstance, type FlowDropInstance } from '../stores/instanceContainer.svelte.js';
import type { ApiContext } from '../stores/apiContext.js';
import type { AuthProvider } from '../types/auth.js';
import { nodeExecutionService } from '../services/nodeExecutionService.js';
import type { EndpointConfig } from '../config/endpoints.js';
import { WorkflowAdapter } from '../adapters/WorkflowAdapter.js';
import { AgentSpecAdapter } from '../adapters/agentspec/AgentSpecAdapter.js';
import { validateForAgentSpecExport } from '../adapters/agentspec/validator.js';
import { extractPortId } from '../utils/handleIds.js';
import { logger } from '../utils/logger.js';
import { generateNodeId, extractConfigDefaults } from '../utils/nodeIds.js';
import {
  applyConnectionStyling as applyConnectionStylingUtil,
  updateEdgeStyles as updateEdgeStylesUtil,
  isGatewayBranch as isGatewayBranchUtil,
  getPortDataType as getPortDataTypeUtil,
  getEdgeCategory as getEdgeCategoryUtil,
  getEdgeCategoryWithLoopback as getEdgeCategoryWithLoopbackUtil
} from '../utils/edgeStyling.js';

export { generateNodeId, extractConfigDefaults } from '../utils/nodeIds.js';

/**
 * Edge category type for styling purposes
 * - trigger: For control flow connections (dataType: "trigger")
 * - tool: Dashed amber line for tool connections (dataType: "tool")
 * - loopback: Dashed gray line for loop iteration connections (targets loop_back port)
 * - data: Normal gray line for all other data connections
 */
export type EdgeCategory = 'trigger' | 'tool' | 'loopback' | 'data';

/**
 * Edge styling configuration based on source port data type.
 * Delegates to standalone functions in utils/edgeStyling.ts.
 */
export class EdgeStylingHelper {
  static extractPortIdFromHandle(handleId: string | undefined): string | null {
    return extractPortId(handleId);
  }

  static isGatewayBranch(node: WorkflowNodeType, portId: string): boolean {
    return isGatewayBranchUtil(node, portId);
  }

  static getPortDataType(
    node: WorkflowNodeType,
    portId: string,
    portType: 'input' | 'output'
  ): string | null {
    return getPortDataTypeUtil(node, portId, portType);
  }

  static getEdgeCategory(sourcePortDataType: string | null): EdgeCategory {
    return getEdgeCategoryUtil(sourcePortDataType);
  }

  static getEdgeCategoryWithLoopback(
    edge: WorkflowEdge,
    sourcePortDataType: string | null
  ): EdgeCategory {
    return getEdgeCategoryWithLoopbackUtil(edge, sourcePortDataType);
  }

  static applyConnectionStyling(
    edge: WorkflowEdge,
    sourceNode: WorkflowNodeType,
    targetNode: WorkflowNodeType
  ): void {
    applyConnectionStylingUtil(edge, sourceNode, targetNode);
  }

  static updateEdgeStyles(edges: WorkflowEdge[], nodes: WorkflowNodeType[]): WorkflowEdge[] {
    return updateEdgeStylesUtil(edges, nodes);
  }
}

/**
 * Node operations helper
 */
export class NodeOperationsHelper {
  /**
   * Load nodes from API
   */
  static async loadNodesFromApi(
    api: ApiContext,
    providedNodes?: NodeMetadata[]
  ): Promise<NodeMetadata[]> {
    // If nodes are provided via props, use them
    if (providedNodes && providedNodes.length > 0) {
      return providedNodes;
    }

    // Otherwise, load from API
    try {
      const fetchedNodes = await api.client.getAvailableNodes();
      return fetchedNodes;
    } catch (error) {
      logger.error('Failed to load nodes from API:', error);

      // Use fallback sample nodes
      return [
        {
          id: 'text-input',
          name: 'Text Input',
          category: 'inputs',
          description: 'Simple text input field',
          version: '1.0.0',
          icon: 'mdi:text-box',
          inputs: [],
          outputs: [{ id: 'text', name: 'text', type: 'output', dataType: 'string' }]
        },
        {
          id: 'text-output',
          name: 'Text Output',
          category: 'outputs',
          description: 'Display text output',
          version: '1.0.0',
          icon: 'mdi:text-box-outline',
          inputs: [{ id: 'text', name: 'text', type: 'input', dataType: 'string' }],
          outputs: []
        }
      ];
    }
  }

  /**
   * Load node execution information for all nodes in the workflow
   */
  static async loadNodeExecutionInfo(
    api: ApiContext,
    workflow: Workflow | null,
    pipelineId?: string
  ): Promise<Record<string, NodeExecutionInfo>> {
    if (!workflow?.nodes) return {};

    // Only load execution info if we have a pipelineId (for pipeline status mode)
    if (!pipelineId) return {};

    try {
      const nodeIds = workflow.nodes.map((node) => node.id);
      const executionInfo = await nodeExecutionService.getMultipleNodeExecutionInfo(
        api.config,
        nodeIds,
        pipelineId
      );

      return executionInfo;
    } catch (error) {
      logger.error('Failed to load node execution info:', error);
      return {};
    }
  }

  /**
   * Create a new node from dropped data
   */
  static createNodeFromDrop(
    nodeTypeData: string,
    position: { x: number; y: number },
    existingNodes: WorkflowNodeType[] = []
  ): WorkflowNodeType | null {
    try {
      const parsedData = JSON.parse(nodeTypeData);

      // Handle both old format (with type: "node") and new format (direct NodeMetadata)
      let nodeType: NodeMetadata;
      let nodeData: {
        label: string;
        config: Record<string, unknown>;
        metadata: NodeMetadata;
      };

      if (parsedData.type === 'node') {
        // Old format from sidebar
        nodeType = parsedData.nodeData.metadata;
        nodeData = parsedData.nodeData;
      } else {
        // New format (direct NodeMetadata)
        nodeType = parsedData;

        nodeData = {
          label: nodeType.name,
          config: extractConfigDefaults(nodeType.configSchema),
          metadata: nodeType
        };
      }

      // Generate node ID based on node type and existing nodes
      const newNodeId = generateNodeId(nodeType.id, existingNodes);

      // All nodes use "universalNode" type
      // UniversalNode component handles internal switching based on metadata and config
      const newNode: WorkflowNodeType = {
        id: newNodeId,
        type: 'universalNode',
        position, // Use the position calculated from the drop event
        deletable: true,
        data: {
          ...nodeData,
          nodeId: newNodeId // Use the same ID
        }
      };

      return newNode;
    } catch (error) {
      logger.error('Error parsing node data:', error);
      return null;
    }
  }
}

/**
 * Workflow operations helper
 */
export class WorkflowOperationsHelper {
  /**
   * Generate workflow metadata for updates
   */
  static generateMetadata(existingMetadata?: Workflow['metadata']): Workflow['metadata'] {
    const now = new Date().toISOString();
    return {
      schemaVersion: '1.0.0',
      createdAt: now,
      ...(existingMetadata ?? {}),
      updatedAt: now,
      versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      updateNumber: (existingMetadata?.updateNumber || 0) + 1
    };
  }

  /**
   * Update workflow with new nodes/edges and generate new metadata
   */
  static updateWorkflow(
    workflow: Workflow,
    nodes: WorkflowNodeType[],
    edges: WorkflowEdge[]
  ): Workflow {
    return {
      ...workflow,
      nodes,
      edges,
      metadata: this.generateMetadata(workflow.metadata)
    };
  }

  /**
   * Clear workflow (remove all nodes and edges)
   */
  static clearWorkflow(workflow: Workflow): Workflow {
    return {
      ...workflow,
      nodes: [],
      edges: [],
      metadata: this.generateMetadata(workflow.metadata)
    };
  }

  /**
   * Update node configuration
   */
  static updateNodeConfig(
    workflow: Workflow,
    nodeId: string,
    newConfig: Record<string, unknown>
  ): Workflow {
    return {
      ...workflow,
      nodes: workflow.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: { ...node.data, config: { ...newConfig } }
            }
          : node
      ),
      metadata: this.generateMetadata(workflow.metadata)
    };
  }

  /**
   * Add a new node to the workflow
   */
  static addNode(workflow: Workflow, node: WorkflowNodeType): Workflow {
    return {
      ...workflow,
      nodes: [...workflow.nodes, node],
      metadata: this.generateMetadata(workflow.metadata)
    };
  }

  /**
   * Save workflow to backend
   *
   * @param api - The instance's API context (endpoints + client)
   * @param workflow - The workflow to save
   * @param instance - The FlowDrop instance whose store should be synced when
   *   the server assigns a new ID; defaults to the page-default instance
   */
  static async saveWorkflow(
    api: ApiContext,
    workflow: Workflow | null,
    instance?: FlowDropInstance
  ): Promise<Workflow | null> {
    if (!workflow) {
      logger.warn('No workflow data available to save');
      return null;
    }

    try {
      // Determine new vs existing BEFORE the uuidv4() fallback: a present id (any
      // format) means the workflow came from a backend and must be updated. Only
      // a missing id means "truly new".
      const isExistingWorkflow = !!workflow.id;
      const workflowId = workflow.id || uuidv4();

      const workflowToSave: Workflow = {
        id: workflowId,
        name: workflow.name || 'Untitled Workflow',
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        metadata: {
          schemaVersion: workflow.metadata?.schemaVersion || '1.0.0',
          createdAt: workflow.metadata?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      const savedWorkflow = isExistingWorkflow
        ? await api.client.updateWorkflow(workflowToSave.id, workflowToSave)
        : await api.client.saveWorkflow(workflowToSave);

      // Update the workflow ID if it changed (new workflow)
      if (savedWorkflow.id && savedWorkflow.id !== workflowToSave.id) {
        const fd = instance ?? getDefaultInstance();
        fd.workflow.batchUpdate({
          nodes: workflowToSave.nodes,
          edges: workflowToSave.edges,
          name: workflowToSave.name,
          metadata: {
            ...workflowToSave.metadata,
            ...savedWorkflow.metadata
          }
        });
      }

      return savedWorkflow;
    } catch (error) {
      logger.error('Failed to save workflow:', error);
      throw error;
    }
  }

  /**
   * Export workflow as JSON file
   */
  static exportWorkflow(workflow: Workflow | null): void {
    if (!workflow) {
      logger.warn('No workflow data available to export');
      return;
    }

    // Use the same ID logic as saveWorkflow
    const workflowId = workflow.id || uuidv4();

    const workflowToExport: Workflow = {
      id: workflowId,
      name: workflow.name || 'Untitled Workflow',
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
      metadata: {
        schemaVersion: workflow.metadata?.schemaVersion || '1.0.0',
        createdAt: workflow.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const dataStr = JSON.stringify(workflowToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflowToExport.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export workflow as Agent Spec JSON file.
   *
   * Converts the FlowDrop workflow to Agent Spec format and triggers a download.
   * Validates the workflow for Agent Spec compatibility first.
   *
   * @param workflow - The FlowDrop workflow to export
   * @returns Validation result (check .valid before assuming success)
   */
  static exportAsAgentSpec(workflow: Workflow | null): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    if (!workflow) {
      return {
        valid: false,
        errors: ['No workflow data available to export'],
        warnings: []
      };
    }

    // Convert to StandardWorkflow first
    const workflowAdapter = new WorkflowAdapter();
    const standardWorkflow = workflowAdapter.fromSvelteFlow(workflow);

    // Validate for Agent Spec
    const validation = validateForAgentSpecExport(standardWorkflow);
    if (!validation.valid) {
      return validation;
    }

    // Convert to Agent Spec
    const agentSpecAdapter = new AgentSpecAdapter();
    const agentSpecJson = agentSpecAdapter.exportJSON(standardWorkflow);

    // Trigger download
    const dataBlob = new Blob([agentSpecJson], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow.name || 'workflow'}-agentspec.json`;
    link.click();
    URL.revokeObjectURL(url);

    return validation;
  }

  /**
   * Import a workflow from an Agent Spec JSON or YAML file.
   *
   * Reads the file, detects format, converts to FlowDrop format,
   * and returns a Workflow ready for the editor.
   *
   * @param file - The file to import (JSON or YAML)
   * @returns Promise resolving to the imported FlowDrop Workflow
   */
  static async importFromAgentSpec(file: File): Promise<Workflow> {
    const text = await file.text();

    const agentSpecAdapter = new AgentSpecAdapter();
    const workflowAdapter = new WorkflowAdapter();

    // Parse the Agent Spec data
    const standardWorkflow = agentSpecAdapter.importJSON(text);

    // Convert to SvelteFlow format
    return workflowAdapter.toSvelteFlow(standardWorkflow);
  }

  /**
   * Check if workflow has invalid cycles (excludes valid loopback cycles)
   * Valid loopback cycles are used for ForEach node iteration and should not
   * trigger a warning.
   *
   * @param nodes - Array of workflow nodes
   * @param edges - Array of workflow edges
   * @returns True if there are invalid (non-loopback) cycles
   */
  static checkWorkflowCycles(nodes: WorkflowNodeType[], edges: WorkflowEdge[]): boolean {
    return hasInvalidCycles(nodes, edges);
  }

  /**
   * Check if workflow has any cycles (including valid loopback cycles)
   * Use this when you need to detect ALL cycles regardless of type.
   *
   * @param nodes - Array of workflow nodes
   * @param edges - Array of workflow edges
   * @returns True if any cycle exists
   */
  static checkWorkflowHasAnyCycles(nodes: WorkflowNodeType[], edges: WorkflowEdge[]): boolean {
    return hasCycles(nodes, edges);
  }
}

/**
 * Configuration helper
 */
export class ConfigurationHelper {
  /**
   * Configure API endpoints (and optionally the auth provider) on the given
   * instance's API context.
   */
  static configureEndpoints(
    api: ApiContext,
    config: EndpointConfig,
    authProvider?: AuthProvider
  ): void {
    api.configure(config, authProvider);
  }
}
