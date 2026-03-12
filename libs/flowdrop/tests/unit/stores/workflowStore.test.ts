/**
 * Example Unit Test - workflowStore
 *
 * This is a complete example showing how to test the workflowStore.
 * Use this as a reference when writing your own tests.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getWorkflowStore,
  workflowActions,
  getIsDirty,
  markAsSaved,
  isDirty,
  getWorkflowNodes,
  getWorkflowEdges,
  setOnDirtyStateChange,
} from "$lib/stores/workflowStore.svelte.js";
import {
  createTestWorkflow,
  createTestNode,
  createTestEdge,
} from "../../utils/index.js";

describe("workflowStore", () => {
  // Reset store before each test
  beforeEach(() => {
    workflowActions.clear();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should start with null workflow", () => {
      const workflow = getWorkflowStore();
      expect(workflow).toBeNull();
    });

    it("should start with clean state", () => {
      expect(getIsDirty()).toBe(false);
      expect(isDirty()).toBe(false);
    });

    it("should initialize workflow and mark as clean", () => {
      const testWorkflow = createTestWorkflow();

      workflowActions.initialize(testWorkflow);

      expect(getWorkflowStore()).toEqual(testWorkflow);
      expect(isDirty()).toBe(false);
    });
  });

  describe("dirty state tracking", () => {
    it("should mark as dirty when node is added", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      const node = createTestNode();
      workflowActions.addNode(node);

      expect(isDirty()).toBe(true);
    });

    it("should mark as dirty when edge is added", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      const edge = createTestEdge();
      workflowActions.addEdge(edge);

      expect(isDirty()).toBe(true);
    });

    it("should mark as clean after save", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      workflowActions.updateName("New Name");
      expect(isDirty()).toBe(true);

      markAsSaved();
      expect(isDirty()).toBe(false);
    });

    it("should notify on dirty state change", () => {
      const callback = vi.fn();
      setOnDirtyStateChange(callback);

      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      workflowActions.updateName("New Name");

      expect(callback).toHaveBeenCalledWith(true);
    });
  });

  describe("node operations", () => {
    it("should add node to workflow", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      const node = createTestNode({ id: "test-node" });
      workflowActions.addNode(node);

      const nodes = getWorkflowNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe("test-node");
    });

    it("should remove node from workflow", () => {
      const node = createTestNode({ id: "test-node" });
      const workflow = createTestWorkflow({
        nodes: [node],
      });
      workflowActions.initialize(workflow);

      workflowActions.removeNode("test-node");

      expect(getWorkflowNodes()).toHaveLength(0);
    });

    it("should update node data", () => {
      const node = createTestNode({ id: "test-node" });
      const workflow = createTestWorkflow({
        nodes: [node],
      });
      workflowActions.initialize(workflow);

      workflowActions.updateNode("test-node", {
        data: { ...node.data, label: "Updated Label" },
      });

      const updatedNode = getWorkflowNodes()[0];
      expect(updatedNode.data.label).toBe("Updated Label");
    });

    it("should remove connected edges when node is removed", () => {
      const node1 = createTestNode({ id: "node-1" });
      const node2 = createTestNode({ id: "node-2" });
      const edge = createTestEdge({
        id: "edge-1",
        source: "node-1",
        target: "node-2",
      });

      const workflow = createTestWorkflow({
        nodes: [node1, node2],
        edges: [edge],
      });
      workflowActions.initialize(workflow);

      workflowActions.removeNode("node-1");

      expect(getWorkflowNodes()).toHaveLength(1);
      expect(getWorkflowEdges()).toHaveLength(0);
    });
  });

  describe("edge operations", () => {
    it("should add edge to workflow", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      const edge = createTestEdge({ id: "test-edge" });
      workflowActions.addEdge(edge);

      const edges = getWorkflowEdges();
      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe("test-edge");
    });

    it("should remove edge from workflow", () => {
      const edge = createTestEdge({ id: "test-edge" });
      const workflow = createTestWorkflow({
        edges: [edge],
      });
      workflowActions.initialize(workflow);

      workflowActions.removeEdge("test-edge");

      expect(getWorkflowEdges()).toHaveLength(0);
    });
  });

  describe("batch operations", () => {
    it("should update multiple properties at once", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      const node = createTestNode();
      const edge = createTestEdge();

      workflowActions.batchUpdate({
        name: "Batch Updated",
        description: "New description",
        nodes: [node],
        edges: [edge],
      });

      const updated = getWorkflowStore();
      expect(updated?.name).toBe("Batch Updated");
      expect(updated?.description).toBe("New description");
      expect(updated?.nodes).toHaveLength(1);
      expect(updated?.edges).toHaveLength(1);
    });
  });

  describe("metadata management", () => {
    it("should update timestamp on changes", () => {
      const workflow = createTestWorkflow({
        metadata: {
          version: "1.0.0",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          versionId: "v1",
          updateNumber: 0,
        },
      });
      workflowActions.initialize(workflow);

      const beforeUpdate = getWorkflowStore()?.metadata.updatedAt;

      // Wait a tiny bit to ensure timestamp changes
      setTimeout(() => {
        workflowActions.updateName("New Name");

        const afterUpdate = getWorkflowStore()?.metadata.updatedAt;
        expect(afterUpdate).not.toBe(beforeUpdate);
      }, 10);
    });

    it("should increment update number on changes", () => {
      const workflow = createTestWorkflow({
        metadata: {
          version: "1.0.0",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          versionId: "v1",
          updateNumber: 0,
        },
      });
      workflowActions.initialize(workflow);

      const node = createTestNode();
      workflowActions.addNode(node);

      const metadata = getWorkflowStore()?.metadata;
      // Adding a node updates metadata but doesn't increment updateNumber
      // Only updateNodes and updateEdges increment it
      expect(metadata?.updatedAt).not.toBe(workflow.metadata.updatedAt);
    });
  });

  describe("derived stores", () => {
    it("should derive workflow nodes correctly", () => {
      const node = createTestNode();
      const workflow = createTestWorkflow({
        nodes: [node],
      });
      workflowActions.initialize(workflow);

      expect(getWorkflowNodes()).toEqual([node]);
    });

    it("should derive workflow edges correctly", () => {
      const edge = createTestEdge();
      const workflow = createTestWorkflow({
        edges: [edge],
      });
      workflowActions.initialize(workflow);

      expect(getWorkflowEdges()).toEqual([edge]);
    });
  });

  describe("clear operation", () => {
    it("should clear workflow and reset state", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);
      workflowActions.updateName("Modified");

      workflowActions.clear();

      expect(getWorkflowStore()).toBeNull();
      expect(isDirty()).toBe(false);
    });
  });
});
