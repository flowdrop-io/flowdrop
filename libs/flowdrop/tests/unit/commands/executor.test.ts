import { describe, it, expect, vi } from "vitest";
import {
  executeCommand,
  toShortId,
  resolveNode,
} from "../../../src/lib/commands/executor.js";
import type {
  CommandContext,
  CommandDispatch,
  AddNodeResultData,
} from "../../../src/lib/commands/types.js";
import type {
  WorkflowNode,
  Workflow,
  NodeMetadata,
} from "../../../src/lib/types/index.js";
import { buildTypeMap } from "../../../src/lib/commands/types.js";

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
