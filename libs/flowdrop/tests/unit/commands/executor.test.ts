import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  executeCommand,
  toShortId,
  toShortTypeId,
  resolveNode,
} from "../../../src/lib/commands/executor.js";
import type {
  CommandContext,
  CommandDispatch,
  AddNodeResultData,
  GetConfigResultData,
  InfoResultData,
  ListNodesResultData,
  ListEdgesResultData,
  ListTypesResultData,
  HelpResultData,
} from "../../../src/lib/commands/types.js";
import type {
  WorkflowNode,
  WorkflowEdge,
  Workflow,
  NodeMetadata,
  PortConfig,
} from "../../../src/lib/types/index.js";
import { buildTypeMap } from "../../../src/lib/commands/types.js";
import { initializePortCompatibility } from "../../../src/lib/utils/connections.js";

// ============================================================================
// Port Compatibility Setup (needed for connect tests)
// ============================================================================

const mockPortConfig: PortConfig = {
  version: "1.0.0",
  defaultDataType: "string",
  dataTypes: [
    { id: "trigger", name: "Trigger", description: "Control flow", color: "#8b5cf6", category: "basic", enabled: true },
    { id: "string", name: "String", description: "Text data", color: "#10b981", category: "basic", enabled: true },
    { id: "number", name: "Number", description: "Numeric data", color: "#3b82f6", category: "numeric", enabled: true },
    { id: "tool", name: "Tool", description: "Tool call", color: "#f59e0b", category: "basic", enabled: true },
  ],
  compatibilityRules: [
    { from: "string", to: "string" },
    { from: "number", to: "number" },
    { from: "trigger", to: "trigger" },
    { from: "tool", to: "tool" },
  ],
};

// Initialize once for all tests that use validateConnection
beforeAll(() => {
  initializePortCompatibility(mockPortConfig);
});

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockMetadata(
  id: string,
  name: string,
  overrides?: Partial<NodeMetadata>,
): NodeMetadata {
  return {
    id,
    name,
    category: "ai",
    inputs: [],
    outputs: [],
    configSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          default: "gpt-4",
        },
        temperature: {
          type: "number",
          default: 0.7,
        },
      },
    },
    ...overrides,
  } as NodeMetadata;
}

function createMockNode(
  id: string,
  metadata: NodeMetadata,
  overrides?: Partial<WorkflowNode>,
): WorkflowNode {
  return {
    id,
    type: "universalNode",
    position: { x: 100, y: 100 },
    deletable: true,
    data: {
      label: metadata.name,
      config: { model: "gpt-4", temperature: 0.7 },
      metadata,
      nodeId: id,
    },
    ...overrides,
  } as WorkflowNode;
}

function createMockDispatch(): CommandDispatch {
  return {
    addNode: vi.fn(),
    removeNode: vi.fn(),
    updateNode: vi.fn(),
    addEdge: vi.fn(),
    removeEdge: vi.fn(),
    batchUpdate: vi.fn(),
    undo: vi.fn().mockReturnValue(true),
    redo: vi.fn().mockReturnValue(true),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    cancelTransaction: vi.fn(),
  };
}

function createMockContext(
  workflow: Workflow | null,
  nodeTypes: NodeMetadata[],
  dispatch?: CommandDispatch,
): CommandContext {
  return {
    getWorkflow: () => workflow,
    nodeTypes,
    typeMap: buildTypeMap(nodeTypes),
    dispatch: dispatch ?? createMockDispatch(),
  };
}

function createMockWorkflow(
  nodes: WorkflowNode[] = [],
  edges: Workflow["edges"] = [],
): Workflow {
  return {
    id: "test-workflow",
    name: "Test Workflow",
    nodes,
    edges,
  };
}

// ============================================================================
// Helper Tests
// ============================================================================

describe("toShortId", () => {
  it("strips namespace from namespaced ID", () => {
    expect(toShortId("agentspec.llm_node.1")).toBe("llm_node.1");
  });

  it("returns unchanged for non-namespaced ID", () => {
    expect(toShortId("llm_node.1")).toBe("llm_node.1");
  });

  it("strips namespace from multi-segment type", () => {
    expect(toShortId("agentspec.boolean_gateway.2")).toBe(
      "boolean_gateway.2",
    );
  });

  it("returns unchanged for single segment", () => {
    expect(toShortId("someNode")).toBe("someNode");
  });
});

describe("resolveNode", () => {
  const metadata = createMockMetadata("agentspec.llm_node", "LLM Node");
  const node = createMockNode("agentspec.llm_node.1", metadata);
  const nodes = [node];

  it("resolves by exact ID", () => {
    expect(resolveNode("agentspec.llm_node.1", nodes)).toBe(node);
  });

  it("resolves by short ID", () => {
    expect(resolveNode("llm_node.1", nodes)).toBe(node);
  });

  it("returns undefined for non-existent ID", () => {
    expect(resolveNode("llm_node.99", nodes)).toBeUndefined();
  });
});

// ============================================================================
// add_node
// ============================================================================

describe("executeCommand — add_node", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node");
  const nodeTypes = [llmMetadata];

  it("adds a node with auto-position on empty canvas", () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: "add_node", nodeTypeId: "llm_node" },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify dispatch was called
    expect(dispatch.addNode).toHaveBeenCalledOnce();
    const addedNode = (dispatch.addNode as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowNode;

    // Node structure must match drag-and-drop parity
    expect(addedNode.id).toBe("agentspec.llm_node.1");
    expect(addedNode.type).toBe("universalNode");
    expect(addedNode.deletable).toBe(true);
    expect(addedNode.data.nodeId).toBe("agentspec.llm_node.1");
    expect(addedNode.data.label).toBe("LLM Node");
    expect(addedNode.data.metadata).toBe(llmMetadata);
    expect(addedNode.data.config).toEqual({ model: "gpt-4", temperature: 0.7 });

    // Auto-positioned on empty canvas
    expect(addedNode.position).toEqual({ x: 100, y: 100 });

    // Result data uses short IDs
    const data = result.data as AddNodeResultData;
    expect(data.nodeId).toBe("llm_node.1");
    expect(data.type).toBe("llm_node");
    expect(data.label).toBe("LLM Node");
    expect(data.position).toEqual({ x: 100, y: 100 });
  });

  it("adds a node at explicit position", () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "add_node",
        nodeTypeId: "llm_node",
        position: { x: 200, y: 300 },
      },
      context,
    );

    expect(result.ok).toBe(true);
    const addedNode = (dispatch.addNode as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowNode;
    expect(addedNode.position).toEqual({ x: 200, y: 300 });
  });

  it("auto-positions relative to existing nodes", () => {
    const dispatch = createMockDispatch();
    const existingNode = createMockNode("agentspec.llm_node.1", llmMetadata, {
      position: { x: 400, y: 200 },
    });
    const workflow = createMockWorkflow([existingNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: "add_node", nodeTypeId: "llm_node" },
      context,
    );

    expect(result.ok).toBe(true);
    const addedNode = (dispatch.addNode as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowNode;
    expect(addedNode.position).toEqual({ x: 650, y: 200 });

    // Second node gets .2
    expect(addedNode.id).toBe("agentspec.llm_node.2");
    const data = (result as { ok: true; data: AddNodeResultData }).data;
    expect(data.nodeId).toBe("llm_node.2");
  });

  it("returns NODE_TYPE_NOT_FOUND for unknown type", () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand(
      { type: "add_node", nodeTypeId: "nonexistent_type" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_TYPE_NOT_FOUND");
    expect(result.error).toContain("nonexistent_type");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: "add_node", nodeTypeId: "llm_node" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });

  it("resolves full namespaced type ID", () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: "add_node", nodeTypeId: "agentspec.llm_node" },
      context,
    );

    expect(result.ok).toBe(true);
    expect(dispatch.addNode).toHaveBeenCalledOnce();
  });

  it("populates config from configSchema defaults", () => {
    const dispatch = createMockDispatch();
    const metaWithConfig = createMockMetadata(
      "agentspec.api_node",
      "API Node",
      {
        configSchema: {
          type: "object",
          properties: {
            url: { type: "string", default: "https://example.com" },
            method: { type: "string", default: "GET" },
            timeout: { type: "number", default: 30 },
          },
        },
      },
    );
    const context = createMockContext(
      createMockWorkflow(),
      [metaWithConfig],
      dispatch,
    );

    executeCommand(
      { type: "add_node", nodeTypeId: "api_node" },
      context,
    );

    const addedNode = (dispatch.addNode as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowNode;
    expect(addedNode.data.config).toEqual({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
    });
  });

  it("handles metadata with no configSchema", () => {
    const dispatch = createMockDispatch();
    const metaNoConfig = createMockMetadata(
      "agentspec.simple_node",
      "Simple Node",
      { configSchema: undefined },
    );
    const context = createMockContext(
      createMockWorkflow(),
      [metaNoConfig],
      dispatch,
    );

    executeCommand(
      { type: "add_node", nodeTypeId: "simple_node" },
      context,
    );

    const addedNode = (dispatch.addNode as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowNode;
    expect(addedNode.data.config).toEqual({});
  });
});

// ============================================================================
// delete_node
// ============================================================================

describe("executeCommand — delete_node", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node");
  const nodeTypes = [llmMetadata];

  it("deletes a node by short ID", () => {
    const dispatch = createMockDispatch();
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: "delete_node", nodeId: "llm_node.1" },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain("llm_node.1");
    // dispatch.removeNode called with the full internal ID
    expect(dispatch.removeNode).toHaveBeenCalledWith(
      "agentspec.llm_node.1",
    );
  });

  it("deletes a node by full ID", () => {
    const dispatch = createMockDispatch();
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: "delete_node", nodeId: "agentspec.llm_node.1" },
      context,
    );

    expect(result.ok).toBe(true);
    expect(dispatch.removeNode).toHaveBeenCalledWith(
      "agentspec.llm_node.1",
    );
  });

  it("returns NODE_NOT_FOUND for missing node", () => {
    const context = createMockContext(
      createMockWorkflow(),
      nodeTypes,
    );

    const result = executeCommand(
      { type: "delete_node", nodeId: "llm_node.99" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_NOT_FOUND");
    expect(result.error).toContain("llm_node.99");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: "delete_node", nodeId: "llm_node.1" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });
});

// ============================================================================
// toShortTypeId
// ============================================================================

describe("toShortTypeId", () => {
  it("strips namespace from type ID", () => {
    expect(toShortTypeId("agentspec.llm_node")).toBe("llm_node");
  });

  it("returns unchanged for non-namespaced type ID", () => {
    expect(toShortTypeId("llm_node")).toBe("llm_node");
  });
});

// ============================================================================
// rename_node
// ============================================================================

describe("executeCommand — rename_node", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node");
  const nodeTypes = [llmMetadata];

  it("renames a node", () => {
    const dispatch = createMockDispatch();
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: "rename_node", nodeId: "llm_node.1", label: "My Custom LLM" },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain("My Custom LLM");
    expect(dispatch.updateNode).toHaveBeenCalledWith(
      "agentspec.llm_node.1",
      expect.objectContaining({
        data: expect.objectContaining({ label: "My Custom LLM" }),
      }),
    );
  });

  it("preserves other data fields when renaming", () => {
    const dispatch = createMockDispatch();
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand(
      { type: "rename_node", nodeId: "llm_node.1", label: "New Name" },
      context,
    );

    const updateCall = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0];
    const updatedData = updateCall[1].data;
    expect(updatedData.config).toEqual({ model: "gpt-4", temperature: 0.7 });
    expect(updatedData.metadata).toBe(llmMetadata);
  });

  it("returns NODE_NOT_FOUND for missing node", () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand(
      { type: "rename_node", nodeId: "llm_node.99", label: "Test" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_NOT_FOUND");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: "rename_node", nodeId: "llm_node.1", label: "Test" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });
});

// ============================================================================
// set_config
// ============================================================================

describe("executeCommand — set_config", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node");
  const nodeTypes = [llmMetadata];

  it("sets a string config value", () => {
    const dispatch = createMockDispatch();
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: "set_config", nodeId: "llm_node.1", key: "model", value: "gpt-4o" },
      context,
    );

    expect(result.ok).toBe(true);
    const updateCall = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0];
    const updatedConfig = updateCall[1].data.config;
    expect(updatedConfig.model).toBe("gpt-4o");
    expect(updatedConfig.temperature).toBe(0.7); // preserved
  });

  it("parses number values", () => {
    const dispatch = createMockDispatch();
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand(
      { type: "set_config", nodeId: "llm_node.1", key: "temperature", value: "0.9" },
      context,
    );

    const updatedConfig = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0][1].data.config;
    expect(updatedConfig.temperature).toBe(0.9);
    expect(typeof updatedConfig.temperature).toBe("number");
  });

  it("parses boolean values", () => {
    const dispatch = createMockDispatch();
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand(
      { type: "set_config", nodeId: "llm_node.1", key: "streaming", value: "true" },
      context,
    );

    const updatedConfig = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0][1].data.config;
    expect(updatedConfig.streaming).toBe(true);
  });

  it("preserves quoted strings as strings", () => {
    const dispatch = createMockDispatch();
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand(
      { type: "set_config", nodeId: "llm_node.1", key: "name", value: '"42"' },
      context,
    );

    const updatedConfig = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0][1].data.config;
    expect(updatedConfig.name).toBe("42");
    expect(typeof updatedConfig.name).toBe("string");
  });

  it("parses JSON array values", () => {
    const dispatch = createMockDispatch();
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand(
      { type: "set_config", nodeId: "llm_node.1", key: "tags", value: '["a","b"]' },
      context,
    );

    const updatedConfig = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0][1].data.config;
    expect(updatedConfig.tags).toEqual(["a", "b"]);
  });

  it("returns NODE_NOT_FOUND for missing node", () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand(
      { type: "set_config", nodeId: "llm_node.99", key: "model", value: "gpt-4" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_NOT_FOUND");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: "set_config", nodeId: "llm_node.1", key: "model", value: "gpt-4" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });
});

// ============================================================================
// get_config
// ============================================================================

describe("executeCommand — get_config", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node");
  const nodeTypes = [llmMetadata];

  it("returns config value for existing key", () => {
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand(
      { type: "get_config", nodeId: "llm_node.1", key: "model" },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as GetConfigResultData;
    expect(data.nodeId).toBe("llm_node.1");
    expect(data.key).toBe("model");
    expect(data.value).toBe("gpt-4");
  });

  it("returns CONFIG_KEY_NOT_FOUND for missing key", () => {
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand(
      { type: "get_config", nodeId: "llm_node.1", key: "nonexistent" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("CONFIG_KEY_NOT_FOUND");
    expect(result.error).toContain("nonexistent");
  });

  it("returns NODE_NOT_FOUND for missing node", () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand(
      { type: "get_config", nodeId: "llm_node.99", key: "model" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_NOT_FOUND");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: "get_config", nodeId: "llm_node.1", key: "model" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });
});

// ============================================================================
// info
// ============================================================================

describe("executeCommand — info", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node", {
    inputs: [
      { id: "prompt", name: "Prompt", type: "input", dataType: "string" },
    ],
    outputs: [
      { id: "llm_output", name: "LLM Output", type: "output", dataType: "string" },
    ],
  });
  const apiMetadata = createMockMetadata("agentspec.api_node", "API Node", {
    inputs: [
      { id: "body", name: "Body", type: "input", dataType: "string" },
    ],
    outputs: [],
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it("returns full node info with ports", () => {
    const node = createMockNode("agentspec.llm_node.1", llmMetadata, {
      position: { x: 200, y: 300 },
    });
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand(
      { type: "info", nodeId: "llm_node.1" },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as InfoResultData;
    expect(data.nodeId).toBe("llm_node.1");
    expect(data.label).toBe("LLM Node");
    expect(data.type).toBe("llm_node");
    expect(data.position).toEqual({ x: 200, y: 300 });
    expect(data.config).toEqual({ model: "gpt-4", temperature: 0.7 });
    expect(data.inputs).toEqual([
      { portId: "prompt", name: "Prompt", dataType: "string" },
    ]);
    expect(data.outputs).toEqual([
      { portId: "llm_output", name: "LLM Output", dataType: "string" },
    ]);
  });

  it("includes connected edges", () => {
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const edge = {
      id: "edge-1",
      source: "agentspec.llm_node.1",
      target: "agentspec.api_node.1",
      sourceHandle: "agentspec.llm_node.1-output-llm_output",
      targetHandle: "agentspec.api_node.1-input-body",
    };
    const workflow = createMockWorkflow([llmNode, apiNode], [edge as any]);
    const context = createMockContext(workflow, nodeTypes);

    // Info on source node
    const result = executeCommand(
      { type: "info", nodeId: "llm_node.1" },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as InfoResultData;
    expect(data.connectedEdges).toHaveLength(1);
    expect(data.connectedEdges[0]).toEqual({
      edgeId: "edge-1",
      direction: "outgoing",
      remoteNodeId: "api_node.1",
      remotePort: "body",
      localPort: "llm_output",
    });

    // Info on target node — should show incoming
    const result2 = executeCommand(
      { type: "info", nodeId: "api_node.1" },
      context,
    );

    expect(result2.ok).toBe(true);
    if (!result2.ok) return;
    const data2 = result2.data as InfoResultData;
    expect(data2.connectedEdges).toHaveLength(1);
    expect(data2.connectedEdges[0]).toEqual({
      edgeId: "edge-1",
      direction: "incoming",
      remoteNodeId: "llm_node.1",
      remotePort: "llm_output",
      localPort: "body",
    });
  });

  it("returns empty connectedEdges for isolated node", () => {
    const node = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand(
      { type: "info", nodeId: "llm_node.1" },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as InfoResultData;
    expect(data.connectedEdges).toEqual([]);
  });

  it("returns NODE_NOT_FOUND for missing node", () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand(
      { type: "info", nodeId: "llm_node.99" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_NOT_FOUND");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: "info", nodeId: "llm_node.1" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });
});

// ============================================================================
// connect
// ============================================================================

describe("executeCommand — connect", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node", {
    inputs: [
      { id: "prompt", name: "Prompt", type: "input", dataType: "string" },
    ],
    outputs: [
      { id: "llm_output", name: "LLM Output", type: "output", dataType: "string" },
    ],
  });
  const apiMetadata = createMockMetadata("agentspec.api_node", "API Node", {
    inputs: [
      { id: "body", name: "Body", type: "input", dataType: "string" },
    ],
    outputs: [
      { id: "response", name: "Response", type: "output", dataType: "string" },
    ],
  });
  const triggerMetadata = createMockMetadata("agentspec.trigger_node", "Trigger Node", {
    inputs: [],
    outputs: [
      { id: "trigger_out", name: "Trigger Out", type: "output", dataType: "trigger" },
    ],
  });
  const nodeTypes = [llmMetadata, apiMetadata, triggerMetadata];

  it("creates a valid connection between compatible ports", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "connect",
        sourceNodeId: "llm_node.1",
        sourcePort: "llm_output",
        targetNodeId: "api_node.1",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain("llm_node.1");
    expect(result.message).toContain("api_node.1");

    // Verify dispatch.addEdge was called
    expect(dispatch.addEdge).toHaveBeenCalledOnce();
    const edge = (dispatch.addEdge as ReturnType<typeof vi.fn>).mock.calls[0][0] as WorkflowEdge;

    // Edge structure
    expect(edge.source).toBe("agentspec.llm_node.1");
    expect(edge.target).toBe("agentspec.api_node.1");
    expect(edge.sourceHandle).toBe("agentspec.llm_node.1-output-llm_output");
    expect(edge.targetHandle).toBe("agentspec.api_node.1-input-body");

    // Edge ID format
    expect(edge.id).toBe(
      "agentspec.llm_node.1-agentspec.llm_node.1-output-llm_output-agentspec.api_node.1-agentspec.api_node.1-input-body",
    );

    // Styling was applied (edge should have style, class, markerEnd)
    expect(edge.style).toBeDefined();
    expect(edge.class).toBeDefined();
    expect(edge.data?.metadata?.edgeType).toBeDefined();
  });

  it("returns error when source port direction is reversed", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    // Attempt to connect input→output (reversed)
    const result = executeCommand(
      {
        type: "connect",
        sourceNodeId: "api_node.1",
        sourcePort: "body",       // body is an input
        targetNodeId: "llm_node.1",
        targetPort: "llm_output", // llm_output is an output
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_CONNECTION");
    expect(result.error).toContain("reversed");
    expect(dispatch.addEdge).not.toHaveBeenCalled();
  });

  it("returns PORT_NOT_FOUND for missing source port", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "connect",
        sourceNodeId: "llm_node.1",
        sourcePort: "nonexistent_port",
        targetNodeId: "api_node.1",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PORT_NOT_FOUND");
    expect(result.error).toContain("nonexistent_port");
  });

  it("returns PORT_NOT_FOUND for missing target port", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "connect",
        sourceNodeId: "llm_node.1",
        sourcePort: "llm_output",
        targetNodeId: "api_node.1",
        targetPort: "nonexistent_port",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PORT_NOT_FOUND");
    expect(result.error).toContain("nonexistent_port");
  });

  it("returns INVALID_CONNECTION for incompatible data types", () => {
    const dispatch = createMockDispatch();
    const triggerNode = createMockNode("agentspec.trigger_node.1", triggerMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const workflow = createMockWorkflow([triggerNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    // trigger_out (trigger type) → body (string type) — incompatible
    const result = executeCommand(
      {
        type: "connect",
        sourceNodeId: "trigger_node.1",
        sourcePort: "trigger_out",
        targetNodeId: "api_node.1",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_CONNECTION");
    expect(result.error).toContain("Incompatible");
    expect(dispatch.addEdge).not.toHaveBeenCalled();
  });

  it("returns NODE_NOT_FOUND for missing source node", () => {
    const dispatch = createMockDispatch();
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const workflow = createMockWorkflow([apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "connect",
        sourceNodeId: "llm_node.99",
        sourcePort: "llm_output",
        targetNodeId: "api_node.1",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_NOT_FOUND");
  });

  it("returns NODE_NOT_FOUND for missing target node", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([llmNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "connect",
        sourceNodeId: "llm_node.1",
        sourcePort: "llm_output",
        targetNodeId: "api_node.99",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_NOT_FOUND");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      {
        type: "connect",
        sourceNodeId: "llm_node.1",
        sourcePort: "llm_output",
        targetNodeId: "api_node.1",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });

  it("returns error when source port is input (not output)", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "connect",
        sourceNodeId: "llm_node.1",
        sourcePort: "prompt",       // input port, not output
        targetNodeId: "api_node.1",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_CONNECTION");
    expect(result.error).toContain("input");
    expect(result.error).toContain("not an output");
  });
});

// ============================================================================
// disconnect_ports
// ============================================================================

describe("executeCommand — disconnect_ports", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node", {
    inputs: [
      { id: "prompt", name: "Prompt", type: "input", dataType: "string" },
    ],
    outputs: [
      { id: "llm_output", name: "LLM Output", type: "output", dataType: "string" },
    ],
  });
  const apiMetadata = createMockMetadata("agentspec.api_node", "API Node", {
    inputs: [
      { id: "body", name: "Body", type: "input", dataType: "string" },
    ],
    outputs: [],
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it("disconnects a specific edge between two ports", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const edge = {
      id: "edge-1",
      source: "agentspec.llm_node.1",
      target: "agentspec.api_node.1",
      sourceHandle: "agentspec.llm_node.1-output-llm_output",
      targetHandle: "agentspec.api_node.1-input-body",
    } as WorkflowEdge;
    const workflow = createMockWorkflow([llmNode, apiNode], [edge]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "disconnect_ports",
        sourceNodeId: "llm_node.1",
        sourcePort: "llm_output",
        targetNodeId: "api_node.1",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain("Disconnected");
    expect(dispatch.removeEdge).toHaveBeenCalledWith("edge-1");
  });

  it("returns EDGE_NOT_FOUND when no matching edge exists", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]); // no edges
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "disconnect_ports",
        sourceNodeId: "llm_node.1",
        sourcePort: "llm_output",
        targetNodeId: "api_node.1",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("EDGE_NOT_FOUND");
  });

  it("returns NODE_NOT_FOUND for missing source node", () => {
    const dispatch = createMockDispatch();
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const workflow = createMockWorkflow([apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "disconnect_ports",
        sourceNodeId: "llm_node.99",
        sourcePort: "llm_output",
        targetNodeId: "api_node.1",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_NOT_FOUND");
  });

  it("returns NODE_NOT_FOUND for missing target node", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([llmNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: "disconnect_ports",
        sourceNodeId: "llm_node.1",
        sourcePort: "llm_output",
        targetNodeId: "api_node.99",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_NOT_FOUND");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      {
        type: "disconnect_ports",
        sourceNodeId: "llm_node.1",
        sourcePort: "llm_output",
        targetNodeId: "api_node.1",
        targetPort: "body",
      },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });
});

// ============================================================================
// disconnect_node
// ============================================================================

describe("executeCommand — disconnect_node", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node", {
    inputs: [
      { id: "prompt", name: "Prompt", type: "input", dataType: "string" },
    ],
    outputs: [
      { id: "llm_output", name: "LLM Output", type: "output", dataType: "string" },
    ],
  });
  const apiMetadata = createMockMetadata("agentspec.api_node", "API Node", {
    inputs: [
      { id: "body", name: "Body", type: "input", dataType: "string" },
    ],
    outputs: [
      { id: "response", name: "Response", type: "output", dataType: "string" },
    ],
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it("removes all edges connected to a node", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const edge1 = {
      id: "edge-1",
      source: "agentspec.llm_node.1",
      target: "agentspec.api_node.1",
      sourceHandle: "agentspec.llm_node.1-output-llm_output",
      targetHandle: "agentspec.api_node.1-input-body",
    } as WorkflowEdge;
    const edge2 = {
      id: "edge-2",
      source: "agentspec.api_node.1",
      target: "agentspec.llm_node.1",
      sourceHandle: "agentspec.api_node.1-output-response",
      targetHandle: "agentspec.llm_node.1-input-prompt",
    } as WorkflowEdge;
    const workflow = createMockWorkflow([llmNode, apiNode], [edge1, edge2]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: "disconnect_node", nodeId: "llm_node.1" },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain("2 edge(s)");
    expect(dispatch.removeEdge).toHaveBeenCalledTimes(2);
    expect(dispatch.removeEdge).toHaveBeenCalledWith("edge-1");
    expect(dispatch.removeEdge).toHaveBeenCalledWith("edge-2");
  });

  it("succeeds with 0 edges when node is isolated", () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const workflow = createMockWorkflow([llmNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: "disconnect_node", nodeId: "llm_node.1" },
      context,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain("0 edge(s)");
    expect(dispatch.removeEdge).not.toHaveBeenCalled();
  });

  it("returns NODE_NOT_FOUND for missing node", () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand(
      { type: "disconnect_node", nodeId: "llm_node.99" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NODE_NOT_FOUND");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: "disconnect_node", nodeId: "llm_node.1" },
      context,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });
});

// ============================================================================
// List Nodes
// ============================================================================

describe("executeCommand — list_nodes", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node");
  const apiMetadata = createMockMetadata("agentspec.api_node", "API Node");
  const nodeTypes = [llmMetadata, apiMetadata];

  it("returns all nodes with short IDs, labels, and types", () => {
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata, {
      data: { ...createMockNode("agentspec.api_node.1", apiMetadata).data, label: "My API" },
    });
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: "list_nodes" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListNodesResultData;
    expect(data.nodes).toHaveLength(2);
    expect(data.nodes[0]).toEqual({
      nodeId: "llm_node.1",
      label: "LLM Node",
      type: "llm_node",
    });
    expect(data.nodes[1]).toEqual({
      nodeId: "api_node.1",
      label: "My API",
      type: "api_node",
    });
  });

  it("returns empty list for empty workflow", () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: "list_nodes" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListNodesResultData;
    expect(data.nodes).toHaveLength(0);
    expect(result.message).toContain("No nodes");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: "list_nodes" }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });
});

// ============================================================================
// List Edges
// ============================================================================

describe("executeCommand — list_edges", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node", {
    outputs: [{ id: "llm_output", name: "LLM Output", dataType: "string" }],
  });
  const apiMetadata = createMockMetadata("agentspec.api_node", "API Node", {
    inputs: [{ id: "body", name: "Body", dataType: "string" }],
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it("returns all edges with short IDs and port names", () => {
    const llmNode = createMockNode("agentspec.llm_node.1", llmMetadata);
    const apiNode = createMockNode("agentspec.api_node.1", apiMetadata);
    const edge: WorkflowEdge = {
      id: "edge-1",
      source: "agentspec.llm_node.1",
      target: "agentspec.api_node.1",
      sourceHandle: "agentspec.llm_node.1-output-llm_output",
      targetHandle: "agentspec.api_node.1-input-body",
    };
    const workflow = createMockWorkflow([llmNode, apiNode], [edge]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: "list_edges" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListEdgesResultData;
    expect(data.edges).toHaveLength(1);
    expect(data.edges[0]).toEqual({
      edgeId: "edge-1",
      sourceNodeId: "llm_node.1",
      sourcePort: "llm_output",
      targetNodeId: "api_node.1",
      targetPort: "body",
    });
  });

  it("returns empty list when no edges", () => {
    const workflow = createMockWorkflow([createMockNode("agentspec.llm_node.1", llmMetadata)]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: "list_edges" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListEdgesResultData;
    expect(data.edges).toHaveLength(0);
    expect(result.message).toContain("No edges");
  });

  it("returns NO_WORKFLOW when no workflow loaded", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: "list_edges" }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_WORKFLOW");
  });
});

// ============================================================================
// List Types
// ============================================================================

describe("executeCommand — list_types", () => {
  const llmMetadata = createMockMetadata("agentspec.llm_node", "LLM Node");
  const apiMetadata = createMockMetadata("agentspec.api_node", "API Node", {
    category: "integration",
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it("returns all types with short IDs, names, and categories", () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: "list_types" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListTypesResultData;
    expect(data.types).toHaveLength(2);
    expect(data.types[0]).toEqual({
      typeId: "llm_node",
      name: "LLM Node",
      category: "ai",
    });
    expect(data.types[1]).toEqual({
      typeId: "api_node",
      name: "API Node",
      category: "integration",
    });
  });

  it("returns short type IDs that match what add command accepts", () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: "list_types" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListTypesResultData;
    // Each typeId should be resolvable via typeMap
    for (const t of data.types) {
      expect(context.typeMap.has(t.typeId)).toBe(true);
    }
  });

  it("does not require a workflow (context.nodeTypes is sufficient)", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: "list_types" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListTypesResultData;
    expect(data.types).toHaveLength(2);
  });
});

// ============================================================================
// Help
// ============================================================================

describe("executeCommand — help", () => {
  const nodeTypes: NodeMetadata[] = [];

  it("returns all commands when no argument given", () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: "help" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as HelpResultData;
    expect(data.commands.length).toBeGreaterThan(10);
    expect(result.message).toContain("Available commands");
    // Verify structure
    for (const cmd of data.commands) {
      expect(cmd).toHaveProperty("name");
      expect(cmd).toHaveProperty("syntax");
      expect(cmd).toHaveProperty("description");
    }
  });

  it("returns specific command help when argument given", () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: "help", command: "add" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as HelpResultData;
    expect(data.commands.length).toBe(1);
    expect(data.commands[0].name).toBe("add");
    expect(data.commands[0].syntax).toContain("add");
    expect(result.message).toContain("Help for 'add'");
  });

  it("returns multiple entries for commands with variants (disconnect)", () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: "help", command: "disconnect" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as HelpResultData;
    expect(data.commands.length).toBe(2);
    expect(data.commands.every((c) => c.name === "disconnect")).toBe(true);
  });

  it("returns all commands for unknown command name", () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: "help", command: "nonexistent" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as HelpResultData;
    expect(data.commands.length).toBeGreaterThan(10);
  });

  it("does not require a workflow", () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: "help" }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as HelpResultData;
    expect(data.commands.length).toBeGreaterThan(0);
  });
});
