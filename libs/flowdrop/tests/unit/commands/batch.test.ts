import { describe, it, expect, vi } from 'vitest';
import { executeBatch } from '../../../src/lib/commands/batch.js';
import type { Command, CommandContext, CommandDispatch } from '../../../src/lib/commands/types.js';
import type { WorkflowNode, Workflow, NodeMetadata } from '../../../src/lib/types/index.js';
import { buildTypeMap } from '../../../src/lib/commands/types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockMetadata(
  id: string,
  name: string,
  overrides?: Partial<NodeMetadata>
): NodeMetadata {
  return {
    node_type_id: id,
    name,
    category: 'ai',
    inputs: [],
    outputs: [],
    configSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          default: 'gpt-4'
        }
      }
    },
    ...overrides
  } as NodeMetadata;
}

function createMockNode(id: string, metadata: NodeMetadata): WorkflowNode {
  return {
    id,
    type: 'universalNode',
    position: { x: 100, y: 100 },
    deletable: true,
    data: {
      label: metadata.name,
      config: { model: 'gpt-4' },
      metadata
    }
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
    cancelTransaction: vi.fn()
  };
}

function createMockWorkflow(nodes: WorkflowNode[] = [], edges: Workflow['edges'] = []): Workflow {
  return {
    id: 'test-workflow',
    name: 'Test Workflow',
    nodes,
    edges
  };
}

const llmMeta = createMockMetadata('agentspec.llm_node', 'LLM Node');
const apiMeta = createMockMetadata('agentspec.api_node', 'API Node');
const nodeTypes = [llmMeta, apiMeta];

function createMockContext(workflow: Workflow | null, dispatch?: CommandDispatch): CommandContext {
  return {
    getWorkflow: () => workflow,
    nodeTypes,
    typeMap: buildTypeMap(nodeTypes),
    dispatch: dispatch ?? createMockDispatch()
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('executeBatch', () => {
  it('executes all commands and commits on success', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, dispatch);

    const commands: Command[] = [
      { type: 'add_node', nodeTypeId: 'llm_node' },
      { type: 'add_node', nodeTypeId: 'api_node' }
    ];

    const result = executeBatch(commands, context);

    expect(result.ok).toBe(true);
    expect(result.completedCount).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].ok).toBe(true);
    expect(result.results[1].ok).toBe(true);
    expect(result.error).toBeUndefined();

    expect(dispatch.startTransaction).toHaveBeenCalledOnce();
    expect(dispatch.startTransaction).toHaveBeenCalledWith('batch: 2 commands');
    expect(dispatch.commitTransaction).toHaveBeenCalledOnce();
    expect(dispatch.cancelTransaction).not.toHaveBeenCalled();
    expect(dispatch.addNode).toHaveBeenCalledTimes(2);
  });

  it('stops and cancels on first error', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, dispatch);

    const commands: Command[] = [
      { type: 'add_node', nodeTypeId: 'llm_node' },
      { type: 'delete_node', nodeId: 'nonexistent.1' }, // will fail — node not found
      { type: 'add_node', nodeTypeId: 'api_node' } // should not execute
    ];

    const result = executeBatch(commands, context);

    expect(result.ok).toBe(false);
    expect(result.completedCount).toBe(1); // only the add succeeded
    expect(result.totalCount).toBe(3);
    expect(result.results).toHaveLength(2); // add result + delete error
    expect(result.results[0].ok).toBe(true);
    expect(result.results[1].ok).toBe(false);
    expect(result.error).toBeDefined();

    expect(dispatch.startTransaction).toHaveBeenCalledOnce();
    expect(dispatch.cancelTransaction).toHaveBeenCalledOnce();
    expect(dispatch.commitTransaction).not.toHaveBeenCalled();
  });

  it('returns success for empty batch', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, dispatch);

    const result = executeBatch([], context);

    expect(result.ok).toBe(true);
    expect(result.completedCount).toBe(0);
    expect(result.totalCount).toBe(0);
    expect(result.results).toHaveLength(0);

    expect(dispatch.startTransaction).not.toHaveBeenCalled();
    expect(dispatch.commitTransaction).not.toHaveBeenCalled();
    expect(dispatch.cancelTransaction).not.toHaveBeenCalled();
  });

  it('handles single-command batch', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, dispatch);

    const commands: Command[] = [{ type: 'add_node', nodeTypeId: 'llm_node' }];

    const result = executeBatch(commands, context);

    expect(result.ok).toBe(true);
    expect(result.completedCount).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.results).toHaveLength(1);

    expect(dispatch.startTransaction).toHaveBeenCalledWith('batch: 1 command');
    expect(dispatch.commitTransaction).toHaveBeenCalledOnce();
  });

  it('re-reads workflow before each command (avoids stale state)', () => {
    const dispatch = createMockDispatch();
    const node1 = createMockNode('agentspec.llm_node.1', llmMeta);

    // Start with empty workflow, then after first add the workflow has the node
    let callCount = 0;
    const getWorkflow = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        // First command sees empty workflow
        return createMockWorkflow();
      }
      // Second command sees workflow with node from first add
      return createMockWorkflow([node1]);
    });

    const context: CommandContext = {
      getWorkflow,
      nodeTypes,
      typeMap: buildTypeMap(nodeTypes),
      dispatch
    };

    const commands: Command[] = [
      { type: 'add_node', nodeTypeId: 'llm_node' },
      { type: 'add_node', nodeTypeId: 'llm_node' }
    ];

    const result = executeBatch(commands, context);

    expect(result.ok).toBe(true);
    expect(result.completedCount).toBe(2);
    // getWorkflow is called by executeCommand for each command
    expect(getWorkflow).toHaveBeenCalledTimes(2);
  });

  it('error at step 1 cancels immediately with no completed commands', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, dispatch);

    const commands: Command[] = [
      { type: 'delete_node', nodeId: 'nonexistent.1' }, // fails immediately
      { type: 'add_node', nodeTypeId: 'llm_node' }
    ];

    const result = executeBatch(commands, context);

    expect(result.ok).toBe(false);
    expect(result.completedCount).toBe(0);
    expect(result.totalCount).toBe(2);
    expect(result.results).toHaveLength(1); // only the failed command
    expect(result.results[0].ok).toBe(false);

    expect(dispatch.startTransaction).toHaveBeenCalledOnce();
    expect(dispatch.cancelTransaction).toHaveBeenCalledOnce();
    expect(dispatch.commitTransaction).not.toHaveBeenCalled();
  });

  it('propagates NO_WORKFLOW error from executor', () => {
    const dispatch = createMockDispatch();
    const context = createMockContext(null, dispatch); // null workflow

    const commands: Command[] = [{ type: 'add_node', nodeTypeId: 'llm_node' }];

    const result = executeBatch(commands, context);

    expect(result.ok).toBe(false);
    expect(result.completedCount).toBe(0);
    expect(result.error).toContain('No workflow');
  });
});
