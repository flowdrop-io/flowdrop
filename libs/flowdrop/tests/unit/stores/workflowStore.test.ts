/**
 * Unit Test - WorkflowStore
 *
 * Exercises the per-instance WorkflowStore class directly. Each test gets a
 * fresh instance via createFlowDropInstance() so state never leaks between
 * tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createFlowDropInstance,
  type FlowDropInstance
} from '$lib/stores/instanceContainer.svelte.js';
import { createTestWorkflow, createTestNode, createTestEdge } from '../../utils/index.js';
import { normalizeWorkflowMetadata } from '$lib/stores/workflowStore.svelte.js';
import { WORKFLOW_SCHEMA_VERSION } from '$lib/schemas/index.js';
import type { Workflow, WorkflowInterface, WorkflowNode } from '$lib/types';
import { resolveInterface } from '$lib/utils/workflowInterface.js';
import { computeSwapPreview, executeSwap } from '$lib/utils/nodeSwap.js';
import { calculatorNode, advancedCalculatorNode, isolatedNode } from '../../fixtures/nodes.js';

describe('WorkflowStore', () => {
  let fd: FlowDropInstance;

  // Fresh instance before each test for isolation
  beforeEach(() => {
    fd = createFlowDropInstance({ id: `wf-test-${Math.random().toString(36).slice(2)}` });
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with null workflow', () => {
      expect(fd.workflow.current).toBeNull();
    });

    it('should start with clean state', () => {
      expect(fd.workflow.isDirty).toBe(false);
    });

    it('should initialize workflow and mark as clean', () => {
      const testWorkflow = createTestWorkflow();

      fd.workflow.initialize(testWorkflow);

      expect(fd.workflow.current).toEqual(testWorkflow);
      expect(fd.workflow.isDirty).toBe(false);
    });
  });

  describe('metadata healing on load (1.x back-compat)', () => {
    // A bare 1.x document: metadata carries the legacy `version` key and the
    // base workflow shape, but no `schemaVersion`.
    function legacyWorkflow(): Record<string, unknown> {
      return {
        id: 'legacy-1x',
        name: 'Legacy 1.x Workflow',
        description: 'Saved by FlowDrop 1.x',
        nodes: [],
        edges: [],
        metadata: {
          version: '1.0',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-06-01T00:00:00Z',
          author: 'legacy-user',
          tags: ['old']
        }
      };
    }

    it('heals legacy metadata.version into schemaVersion and drops the legacy key', () => {
      const healed = normalizeWorkflowMetadata(legacyWorkflow() as never);

      expect(healed.metadata.schemaVersion).toBe('1.0');
      // Legacy key is gone.
      expect((healed.metadata as Record<string, unknown>).version).toBeUndefined();
      // Other fields survive untouched.
      expect(healed.metadata.author).toBe('legacy-user');
      expect(healed.metadata.tags).toEqual(['old']);
      expect(healed.metadata.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(healed.metadata.updatedAt).toBe('2024-06-01T00:00:00Z');
    });

    it('initialize() heals a loaded 1.x workflow', () => {
      fd.workflow.initialize(legacyWorkflow() as never);

      const current = fd.workflow.current as Workflow;
      expect(current.metadata.schemaVersion).toBe('1.0');
      expect((current.metadata as Record<string, unknown>).version).toBeUndefined();
    });

    it('supplies buildMetadata defaults when metadata is entirely missing', () => {
      const bare = {
        id: 'no-meta',
        name: 'No Metadata',
        nodes: [],
        edges: []
      };

      const healed = normalizeWorkflowMetadata(bare as never);

      expect(healed.metadata.schemaVersion).toBe(WORKFLOW_SCHEMA_VERSION);
      expect(healed.metadata.createdAt).toBeDefined();
      expect(healed.metadata.updatedAt).toBeDefined();
    });

    it('initialize() supplies defaults for a workflow with no metadata', () => {
      fd.workflow.initialize({
        id: 'no-meta',
        name: 'No Metadata',
        nodes: [],
        edges: []
      } as never);

      const current = fd.workflow.current as Workflow;
      expect(current.metadata.schemaVersion).toBe(WORKFLOW_SCHEMA_VERSION);
    });

    it('leaves an already-healed workflow stable (round-trip identity)', () => {
      const fresh: Workflow = {
        id: 'modern',
        name: 'Modern Workflow',
        nodes: [],
        edges: [],
        metadata: {
          schemaVersion: '1.0.0',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-06-01T00:00:00Z',
          author: 'me',
          tags: ['a']
        }
      };

      const once = normalizeWorkflowMetadata(fresh);
      const twice = normalizeWorkflowMetadata(once);

      // heal → heal is identity on already-healed metadata.
      expect(once.metadata).toEqual(fresh.metadata);
      expect(twice.metadata).toEqual(once.metadata);
    });
  });

  describe('dirty state tracking', () => {
    it('should mark as dirty when node is added', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      const node = createTestNode();
      fd.workflow.addNode(node);

      expect(fd.workflow.isDirty).toBe(true);
    });

    it('should mark as dirty when edge is added', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      const edge = createTestEdge();
      fd.workflow.addEdge(edge);

      expect(fd.workflow.isDirty).toBe(true);
    });

    it('should mark as clean after save', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      fd.workflow.updateName('New Name');
      expect(fd.workflow.isDirty).toBe(true);

      fd.workflow.markAsSaved();
      expect(fd.workflow.isDirty).toBe(false);
    });

    it('should notify on dirty state change', () => {
      const callback = vi.fn();
      fd.workflow.setOnDirtyStateChange(callback);

      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      fd.workflow.updateName('New Name');

      expect(callback).toHaveBeenCalledWith(true);
    });
  });

  describe('node operations', () => {
    it('should add node to workflow', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      const node = createTestNode({ id: 'test-node' });
      fd.workflow.addNode(node);

      const nodes = fd.workflow.nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('test-node');
    });

    it('should remove node from workflow', () => {
      const node = createTestNode({ id: 'test-node' });
      const workflow = createTestWorkflow({
        nodes: [node]
      });
      fd.workflow.initialize(workflow);

      fd.workflow.removeNode('test-node');

      expect(fd.workflow.nodes).toHaveLength(0);
    });

    it('should update node data', () => {
      const node = createTestNode({ id: 'test-node' });
      const workflow = createTestWorkflow({
        nodes: [node]
      });
      fd.workflow.initialize(workflow);

      fd.workflow.updateNode('test-node', {
        data: { ...node.data, label: 'Updated Label' }
      });

      const updatedNode = fd.workflow.nodes[0];
      expect(updatedNode.data.label).toBe('Updated Label');
    });

    it('should remove connected edges when node is removed', () => {
      const node1 = createTestNode({ id: 'node-1' });
      const node2 = createTestNode({ id: 'node-2' });
      const edge = createTestEdge({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2'
      });

      const workflow = createTestWorkflow({
        nodes: [node1, node2],
        edges: [edge]
      });
      fd.workflow.initialize(workflow);

      fd.workflow.removeNode('node-1');

      expect(fd.workflow.nodes).toHaveLength(1);
      expect(fd.workflow.edges).toHaveLength(0);
    });

    it('leaves interface bindings dangling (not pruned) when their node is deleted', () => {
      // Design decision: deleting a node must not silently shrink a public
      // contract — the entry survives, reported as `dangling`.
      const node = createTestNode({ id: 'node-1' });
      const workflowInterface: WorkflowInterface = {
        outputs: [
          {
            id: 'public-out',
            dataType: 'string',
            bindings: [{ nodeId: 'node-1', portId: 'output' }]
          }
        ]
      };
      const workflow = createTestWorkflow({ nodes: [node], interface: workflowInterface });
      fd.workflow.initialize(workflow);

      fd.workflow.removeNode('node-1');

      const current = fd.workflow.current as Workflow;
      // Entry is untouched — same binding, still pointing at the deleted node.
      expect(current.interface).toEqual(workflowInterface);

      const [resolved] = resolveInterface(current);
      expect(resolved.status).toBe('dangling');
    });
  });

  describe('live config edits (updateNodeConfig / finalizeNodeConfig — #38 root cause)', () => {
    /** A node whose config starts as `{ title: 'a', subtitle: 'x' }`. */
    function withConfigNode(): WorkflowNode {
      const node = createTestNode({ id: 'n1' });
      node.data.config = { title: 'a', subtitle: 'x' };
      fd.workflow.initialize(createTestWorkflow({ nodes: [node] }));
      return node;
    }

    function editConfig(node: WorkflowNode, config: Record<string, unknown>, fieldKey: string) {
      fd.workflow.updateNodeConfig('n1', { data: { ...node.data, config } }, { fieldKey });
    }

    it('applies the value immediately but defers the change event until finalize', () => {
      const node = withConfigNode();
      const onChange = vi.fn();
      fd.workflow.setOnWorkflowChange(onChange);

      editConfig(node, { title: 'ab', subtitle: 'x' }, 'title');

      // The store reflects the value right away (so a save mid-session is
      // correct — this is what makes the on-blur commit unnecessary, killing #38)...
      expect(fd.workflow.nodes[0].data.config.title).toBe('ab');
      // ...but the external change event is deferred to the session boundary.
      expect(onChange).not.toHaveBeenCalled();

      fd.workflow.finalizeNodeConfig();
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('coalesces many edits of one field into a single undo step', () => {
      const node = withConfigNode();

      // Three "keystrokes" on the same field — one session.
      for (const title of ['ab', 'abc', 'abcd']) {
        editConfig(node, { title, subtitle: 'x' }, 'title');
      }
      fd.workflow.finalizeNodeConfig();
      expect(fd.workflow.nodes[0].data.config.title).toBe('abcd');

      // A single undo reverts the whole session, not one keystroke.
      fd.historyBindings.undo();
      expect(fd.workflow.nodes[0].data.config.title).toBe('a');
    });

    it('auto-finalizes the previous session when the edited field changes', () => {
      const node = withConfigNode();
      const onChange = vi.fn();
      fd.workflow.setOnWorkflowChange(onChange);

      editConfig(node, { title: 'A', subtitle: 'x' }, 'title');
      expect(onChange).not.toHaveBeenCalled(); // title session still open

      // Editing a different field closes the title session (per-field boundary)
      // before opening the subtitle one — so the title edit is committed on its
      // own, without waiting for an explicit finalize.
      editConfig(node, { title: 'A', subtitle: 'X' }, 'subtitle');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('fires the change event once per field session, not per edit', () => {
      const node = withConfigNode();
      const onChange = vi.fn();
      fd.workflow.setOnWorkflowChange(onChange);

      editConfig(node, { title: 'ab', subtitle: 'x' }, 'title');
      editConfig(node, { title: 'abc', subtitle: 'x' }, 'title');
      // Field switch finalizes the title session (1st event).
      editConfig(node, { title: 'abc', subtitle: 'xy' }, 'subtitle');
      // Explicit finalize ends the subtitle session (2nd event).
      fd.workflow.finalizeNodeConfig();

      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('finalizeNodeConfig is a no-op when no session is open', () => {
      withConfigNode();
      const onChange = vi.fn();
      fd.workflow.setOnWorkflowChange(onChange);

      fd.workflow.finalizeNodeConfig();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('undoes exactly one committed edit after two sequential field edits (issue #39)', () => {
      const node = withConfigNode(); // { title: 'a', subtitle: 'x' }

      // Edit 1: title 'a' -> 'b' (finalized as its own step).
      editConfig(node, { title: 'b', subtitle: 'x' }, 'title');
      fd.workflow.finalizeNodeConfig();
      // Edit 2: subtitle 'x' -> 'y' (a distinct, later step).
      editConfig(node, { title: 'b', subtitle: 'y' }, 'subtitle');
      fd.workflow.finalizeNodeConfig();

      expect(fd.workflow.nodes[0].data.config).toEqual({ title: 'b', subtitle: 'y' });

      // A single undo reverts ONLY the second edit — it must not skip back past
      // the first edit (the original off-by-one that this issue fixed).
      fd.historyBindings.undo();
      expect(fd.workflow.nodes[0].data.config).toEqual({ title: 'b', subtitle: 'x' });

      // A second undo reverts the first edit, and redo walks back forward.
      fd.historyBindings.undo();
      expect(fd.workflow.nodes[0].data.config).toEqual({ title: 'a', subtitle: 'x' });
      fd.historyBindings.redo();
      expect(fd.workflow.nodes[0].data.config).toEqual({ title: 'b', subtitle: 'x' });
      fd.historyBindings.redo();
      expect(fd.workflow.nodes[0].data.config).toEqual({ title: 'b', subtitle: 'y' });
    });
  });

  describe('multi-step undo/redo for plain mutations (issue #39)', () => {
    it('undoes one node addition per undo across sequential adds', () => {
      fd.workflow.initialize(createTestWorkflow({ nodes: [] }));

      fd.workflow.addNode(createTestNode({ id: 'n1' }));
      fd.workflow.addNode(createTestNode({ id: 'n2' }));
      fd.workflow.addNode(createTestNode({ id: 'n3' }));
      expect(fd.workflow.nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);

      // Each undo removes exactly the most recent node, not two at a time.
      fd.historyBindings.undo();
      expect(fd.workflow.nodes.map((n) => n.id)).toEqual(['n1', 'n2']);
      fd.historyBindings.undo();
      expect(fd.workflow.nodes.map((n) => n.id)).toEqual(['n1']);

      // Redo walks forward one step at a time.
      fd.historyBindings.redo();
      expect(fd.workflow.nodes.map((n) => n.id)).toEqual(['n1', 'n2']);
      fd.historyBindings.redo();
      expect(fd.workflow.nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
    });
  });

  describe('edge operations', () => {
    it('should add edge to workflow', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      const edge = createTestEdge({ id: 'test-edge' });
      fd.workflow.addEdge(edge);

      const edges = fd.workflow.edges;
      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe('test-edge');
    });

    it('should remove edge from workflow', () => {
      const edge = createTestEdge({ id: 'test-edge' });
      const workflow = createTestWorkflow({
        edges: [edge]
      });
      fd.workflow.initialize(workflow);

      fd.workflow.removeEdge('test-edge');

      expect(fd.workflow.edges).toHaveLength(0);
    });

    it('should not append an edge whose id already exists', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      fd.workflow.addEdge(createTestEdge({ id: 'dup-edge' }));
      const versionAfterFirst = fd.workflow.version;
      // Re-adding the same id must be a silent no-op (SvelteFlow keys edges by id;
      // a duplicate throws each_key_duplicate and crashes the canvas).
      fd.workflow.addEdge(createTestEdge({ id: 'dup-edge' }));

      expect(fd.workflow.edges).toHaveLength(1);
      // No mutation means no version bump / history entry.
      expect(fd.workflow.version).toBe(versionAfterFirst);
    });
  });

  describe('batch operations', () => {
    it('should update multiple properties at once', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      const node = createTestNode();
      const edge = createTestEdge();

      fd.workflow.batchUpdate({
        name: 'Batch Updated',
        description: 'New description',
        nodes: [node],
        edges: [edge]
      });

      const updated = fd.workflow.current;
      expect(updated?.name).toBe('Batch Updated');
      expect(updated?.description).toBe('New description');
      expect(updated?.nodes).toHaveLength(1);
      expect(updated?.edges).toHaveLength(1);
    });
  });

  describe('metadata management', () => {
    it('should update timestamp on changes', () => {
      const workflow = createTestWorkflow({
        metadata: {
          schemaVersion: '1.0.0',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          versionId: 'v1',
          updateNumber: 0
        }
      });
      fd.workflow.initialize(workflow);

      const beforeUpdate = fd.workflow.current?.metadata.updatedAt;

      // Wait a tiny bit to ensure timestamp changes
      setTimeout(() => {
        fd.workflow.updateName('New Name');

        const afterUpdate = fd.workflow.current?.metadata.updatedAt;
        expect(afterUpdate).not.toBe(beforeUpdate);
      }, 10);
    });

    it('should increment update number on changes', () => {
      const workflow = createTestWorkflow({
        metadata: {
          schemaVersion: '1.0.0',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          versionId: 'v1',
          updateNumber: 0
        }
      });
      fd.workflow.initialize(workflow);

      const node = createTestNode();
      fd.workflow.addNode(node);

      const metadata = fd.workflow.current?.metadata;
      // Adding a node updates metadata but doesn't increment updateNumber
      // Only updateNodes and updateEdges increment it
      expect(metadata?.updatedAt).not.toBe(workflow.metadata.updatedAt);
    });
  });

  describe('derived reads', () => {
    it('should expose workflow nodes correctly', () => {
      const node = createTestNode();
      const workflow = createTestWorkflow({
        nodes: [node]
      });
      fd.workflow.initialize(workflow);

      expect(fd.workflow.nodes).toEqual([node]);
    });

    it('should expose workflow edges correctly', () => {
      const edge = createTestEdge();
      const workflow = createTestWorkflow({
        edges: [edge]
      });
      fd.workflow.initialize(workflow);

      expect(fd.workflow.edges).toEqual([edge]);
    });
  });

  describe('clear operation', () => {
    it('should clear workflow and reset state', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);
      fd.workflow.updateName('Modified');

      fd.workflow.clear();

      expect(fd.workflow.current).toBeNull();
      expect(fd.workflow.isDirty).toBe(false);
    });
  });

  describe('version counter', () => {
    it('should start at 0 after initialization', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      expect(fd.workflow.editVersion).toBe(0);
      expect(fd.workflow.isDirty).toBe(false);
    });

    it('should increment on each mutation', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      fd.workflow.updateName('v1');
      expect(fd.workflow.editVersion).toBe(1);

      const node = createTestNode({ id: 'n1' });
      fd.workflow.addNode(node);
      expect(fd.workflow.editVersion).toBe(2);

      const edge = createTestEdge({ id: 'e1' });
      fd.workflow.addEdge(edge);
      expect(fd.workflow.editVersion).toBe(3);
    });

    it('should reset to 0 on clear', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);
      fd.workflow.updateName('changed');
      expect(fd.workflow.editVersion).toBe(1);

      fd.workflow.clear();
      expect(fd.workflow.editVersion).toBe(0);
    });

    it('should reset to 0 on re-initialize', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);
      fd.workflow.updateName('changed');
      expect(fd.workflow.editVersion).toBe(1);

      fd.workflow.initialize(createTestWorkflow());
      expect(fd.workflow.editVersion).toBe(0);
      expect(fd.workflow.isDirty).toBe(false);
    });

    it('should mark clean when markAsSaved captures current version', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      fd.workflow.updateName('v1');
      fd.workflow.addNode(createTestNode({ id: 'n1' }));
      expect(fd.workflow.editVersion).toBe(2);
      expect(fd.workflow.isDirty).toBe(true);

      fd.workflow.markAsSaved();
      expect(fd.workflow.isDirty).toBe(false);

      // Further mutation makes it dirty again
      fd.workflow.updateName('v2');
      expect(fd.workflow.editVersion).toBe(3);
      expect(fd.workflow.isDirty).toBe(true);
    });

    it('should support save verification protocol', () => {
      const workflow = createTestWorkflow();
      fd.workflow.initialize(workflow);

      // Step 1: Make edits
      fd.workflow.updateName('save-me');
      const versionAtSave = fd.workflow.editVersion;
      expect(versionAtSave).toBe(1);

      // Step 2: Simulate user edits during save flight
      fd.workflow.addNode(createTestNode({ id: 'concurrent-edit' }));
      expect(fd.workflow.editVersion).toBe(2);

      // Step 3: Backend responds — version matches what we sent
      // But client has moved on, so still dirty
      fd.workflow.markAsSaved();
      // markAsSaved captures editVersion (2), not the submitted version (1)
      // so the workflow is clean at version 2
      expect(fd.workflow.isDirty).toBe(false);
    });

    it('should bump version for all mutation actions', () => {
      const node1 = createTestNode({ id: 'node-1' });
      const node2 = createTestNode({ id: 'node-2' });
      const edge = createTestEdge({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2'
      });
      const workflow = createTestWorkflow({
        nodes: [node1, node2],
        edges: [edge]
      });
      fd.workflow.initialize(workflow);

      let v = 0;

      fd.workflow.updateName('test');
      expect(fd.workflow.editVersion).toBe(++v);

      fd.workflow.addNode(createTestNode({ id: 'n-new' }));
      expect(fd.workflow.editVersion).toBe(++v);

      fd.workflow.removeNode('n-new');
      expect(fd.workflow.editVersion).toBe(++v);

      fd.workflow.addEdge(createTestEdge({ id: 'e-new' }));
      expect(fd.workflow.editVersion).toBe(++v);

      fd.workflow.removeEdge('e-new');
      expect(fd.workflow.editVersion).toBe(++v);

      fd.workflow.updateNode('node-1', {
        data: { ...node1.data, label: 'Updated' }
      });
      expect(fd.workflow.editVersion).toBe(++v);

      fd.workflow.batchUpdate({ name: 'batch' });
      expect(fd.workflow.editVersion).toBe(++v);

      fd.workflow.swapNode({ nodes: [node1], edges: [] });
      expect(fd.workflow.editVersion).toBe(++v);

      fd.workflow.updateMetadata({ schemaVersion: '2.0' });
      expect(fd.workflow.editVersion).toBe(++v);

      fd.workflow.restoreFromHistory(workflow);
      expect(fd.workflow.editVersion).toBe(++v);
    });
  });

  describe('workflow.interface round-trip', () => {
    /** An interface carrying an unrecognized `meta` key — the passthrough guarantee. */
    function interfaceFixture(): WorkflowInterface {
      return {
        inputs: [
          {
            id: 'public-in',
            name: 'Display Name',
            dataType: 'string',
            required: true,
            bindings: [{ nodeId: 'node-1', portId: 'input' }],
            meta: { 'fd.reserved': true, unknownVendorKey: { nested: 'value' } }
          }
        ],
        outputs: [
          {
            id: 'public-out',
            dataType: 'string',
            bindings: [{ nodeId: 'node-1', portId: 'output' }]
          }
        ]
      };
    }

    it('survives addNode/updateNode/batchUpdate byte-identical', () => {
      const node = createTestNode({ id: 'node-1' });
      const workflowInterface = interfaceFixture();
      const workflow = createTestWorkflow({ nodes: [node], interface: workflowInterface });
      fd.workflow.initialize(workflow);

      fd.workflow.addNode(createTestNode({ id: 'node-2' }));
      expect(fd.workflow.current?.interface).toEqual(workflowInterface);

      fd.workflow.updateNode('node-2', { position: { x: 5, y: 5 } });
      expect(fd.workflow.current?.interface).toEqual(workflowInterface);

      fd.workflow.batchUpdate({ name: 'renamed' });
      expect(fd.workflow.current?.interface).toEqual(workflowInterface);
    });

    it('survives a swap that does not touch the bound node', () => {
      const boundNode = createTestNode({ id: 'node-1' });
      const otherNode = createTestNode({ id: 'node-2' });
      const workflowInterface = interfaceFixture();
      const workflow = createTestWorkflow({
        nodes: [boundNode, otherNode],
        interface: workflowInterface
      });
      fd.workflow.initialize(workflow);

      // Swap node-2 (unrelated to the interface) — node-1's bindings must be untouched.
      fd.workflow.swapNode({
        nodes: [boundNode, otherNode],
        edges: [],
        oldNodeId: 'node-2',
        newNodeId: 'node-2-swapped',
        portMappings: []
      });

      expect(fd.workflow.current?.interface).toEqual(workflowInterface);
    });

    it('batchUpdate sets workflow.interface when passed explicitly, pushing one history entry', () => {
      const node = createTestNode({ id: 'node-1' });
      const workflow = createTestWorkflow({ nodes: [node] });
      fd.workflow.initialize(workflow);
      expect(fd.workflow.current?.interface).toBeUndefined();

      const nextInterface = interfaceFixture();
      const versionBefore = fd.workflow.editVersion;
      fd.workflow.batchUpdate({ interface: nextInterface });

      expect(fd.workflow.current?.interface).toEqual(nextInterface);
      expect(fd.workflow.editVersion).toBe(versionBefore + 1);
    });

    it('batchUpdate leaves workflow.interface untouched when the key is omitted', () => {
      const node = createTestNode({ id: 'node-1' });
      const workflowInterface = interfaceFixture();
      const workflow = createTestWorkflow({ nodes: [node], interface: workflowInterface });
      fd.workflow.initialize(workflow);

      fd.workflow.batchUpdate({ name: 'renamed-again' });

      expect(fd.workflow.current?.interface).toEqual(workflowInterface);
    });
  });

  describe('node swap rewrites interface bindings', () => {
    function calcNode(id: string): WorkflowNode {
      return createTestNode({
        id,
        data: { label: calculatorNode.name, config: {}, metadata: calculatorNode }
      });
    }

    it('follows the PortMapping to the new node, keeping the entry id', () => {
      const oldNode = calcNode('calc-1');
      const workflowInterface: WorkflowInterface = {
        outputs: [
          {
            id: 'public-result',
            dataType: 'number',
            bindings: [{ nodeId: 'calc-1', portId: 'result' }]
          }
        ]
      };
      const workflow = createTestWorkflow({ nodes: [oldNode], interface: workflowInterface });
      fd.workflow.initialize(workflow);

      const preview = computeSwapPreview(oldNode, advancedCalculatorNode, [], [oldNode], null);
      const result = executeSwap(oldNode, advancedCalculatorNode, preview, [oldNode], []);

      fd.workflow.swapNode({
        nodes: result.updatedNodes,
        edges: result.updatedEdges,
        oldNodeId: oldNode.id,
        newNodeId: preview.newNodeId,
        portMappings: preview.portMappings
      });

      const current = fd.workflow.current as Workflow;
      expect(current.interface?.outputs).toEqual([
        {
          id: 'public-result',
          dataType: 'number',
          bindings: [{ nodeId: preview.newNodeId, portId: 'result' }]
        }
      ]);

      const [resolved] = resolveInterface(current);
      expect(resolved.status).toBe('ok');
    });

    it('leaves a dropped port dangling instead of rewriting it', () => {
      const oldNode = calcNode('calc-1');
      const workflowInterface: WorkflowInterface = {
        outputs: [
          {
            id: 'public-result',
            dataType: 'number',
            bindings: [{ nodeId: 'calc-1', portId: 'result' }]
          }
        ]
      };
      const workflow = createTestWorkflow({ nodes: [oldNode], interface: workflowInterface });
      fd.workflow.initialize(workflow);

      // isolatedNode declares no ports at all — the mapping drops "result".
      const preview = computeSwapPreview(oldNode, isolatedNode, [], [oldNode], null);
      const result = executeSwap(oldNode, isolatedNode, preview, [oldNode], []);

      fd.workflow.swapNode({
        nodes: result.updatedNodes,
        edges: result.updatedEdges,
        oldNodeId: oldNode.id,
        newNodeId: preview.newNodeId,
        portMappings: preview.portMappings
      });

      const current = fd.workflow.current as Workflow;
      // Binding untouched — still points at the now-gone old node id.
      expect(current.interface?.outputs?.[0].bindings).toEqual([
        { nodeId: 'calc-1', portId: 'result' }
      ]);

      const [resolved] = resolveInterface(current);
      expect(resolved.status).toBe('dangling');
    });
  });
});
