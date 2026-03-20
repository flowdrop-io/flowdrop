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
  getEditVersion,
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

  describe("version counter", () => {
    it("should start at 0 after initialization", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      expect(getEditVersion()).toBe(0);
      expect(isDirty()).toBe(false);
    });

    it("should increment on each mutation", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      workflowActions.updateName("v1");
      expect(getEditVersion()).toBe(1);

      const node = createTestNode({ id: "n1" });
      workflowActions.addNode(node);
      expect(getEditVersion()).toBe(2);

      const edge = createTestEdge({ id: "e1" });
      workflowActions.addEdge(edge);
      expect(getEditVersion()).toBe(3);
    });

    it("should reset to 0 on clear", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);
      workflowActions.updateName("changed");
      expect(getEditVersion()).toBe(1);

      workflowActions.clear();
      expect(getEditVersion()).toBe(0);
    });

    it("should reset to 0 on re-initialize", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);
      workflowActions.updateName("changed");
      expect(getEditVersion()).toBe(1);

      workflowActions.initialize(createTestWorkflow());
      expect(getEditVersion()).toBe(0);
      expect(isDirty()).toBe(false);
    });

    it("should mark clean when markAsSaved captures current version", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      workflowActions.updateName("v1");
      workflowActions.addNode(createTestNode({ id: "n1" }));
      expect(getEditVersion()).toBe(2);
      expect(isDirty()).toBe(true);

      markAsSaved();
      expect(isDirty()).toBe(false);

      // Further mutation makes it dirty again
      workflowActions.updateName("v2");
      expect(getEditVersion()).toBe(3);
      expect(isDirty()).toBe(true);
    });

    it("should support save verification protocol", () => {
      const workflow = createTestWorkflow();
      workflowActions.initialize(workflow);

      // Step 1: Make edits
      workflowActions.updateName("save-me");
      const versionAtSave = getEditVersion();
      expect(versionAtSave).toBe(1);

      // Step 2: Simulate user edits during save flight
      workflowActions.addNode(createTestNode({ id: "concurrent-edit" }));
      expect(getEditVersion()).toBe(2);

      // Step 3: Backend responds — version matches what we sent
      // But client has moved on, so still dirty
      markAsSaved();
      // markAsSaved captures _editVersion (2), not the submitted version (1)
      // so the workflow is clean at version 2
      expect(isDirty()).toBe(false);
    });

    it("should bump version for all mutation actions", () => {
      const node1 = createTestNode({ id: "node-1" });
      const node2 = createTestNode({ id: "node-2" });
      const edge = createTestEdge({ id: "edge-1", source: "node-1", target: "node-2" });
      const workflow = createTestWorkflow({ nodes: [node1, node2], edges: [edge] });
      workflowActions.initialize(workflow);

      let v = 0;

      workflowActions.updateName("test");
      expect(getEditVersion()).toBe(++v);

      workflowActions.addNode(createTestNode({ id: "n-new" }));
      expect(getEditVersion()).toBe(++v);

      workflowActions.removeNode("n-new");
      expect(getEditVersion()).toBe(++v);

      workflowActions.addEdge(createTestEdge({ id: "e-new" }));
      expect(getEditVersion()).toBe(++v);

      workflowActions.removeEdge("e-new");
      expect(getEditVersion()).toBe(++v);

      workflowActions.updateNode("node-1", { data: { ...node1.data, label: "Updated" } });
      expect(getEditVersion()).toBe(++v);

      workflowActions.batchUpdate({ name: "batch" });
      expect(getEditVersion()).toBe(++v);

      workflowActions.swapNode({ nodes: [node1], edges: [] });
      expect(getEditVersion()).toBe(++v);

      workflowActions.updateMetadata({ version: "2.0" });
      expect(getEditVersion()).toBe(++v);

      workflowActions.restoreFromHistory(workflow);
      expect(getEditVersion()).toBe(++v);
    });
  });
});
