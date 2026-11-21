import { describe, it, expect, vi } from 'vitest';
import {
  executeCommand,
  toShortId,
  toShortTypeId,
  resolveNode
} from '../../../src/lib/commands/executor.js';
import type {
  Command,
  CommandContext,
  CommandDispatch,
  AddNodeResultData,
  GetConfigResultData,
  InfoResultData,
  ListNodesResultData,
  ListEdgesResultData,
  ListTypesResultData,
  HelpResultData
} from '../../../src/lib/commands/types.js';
import type {
  WorkflowNode,
  WorkflowEdge,
  Workflow,
  NodeMetadata,
  ConfigProperty
} from '../../../src/lib/types/index.js';
import { buildTypeMap } from '../../../src/lib/commands/types.js';
import { parseCommand } from '../../../src/lib/commands/parser.js';

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
        },
        temperature: {
          type: 'number',
          default: 0.7
        }
      }
    },
    ...overrides
  } as NodeMetadata;
}

function createMockNode(
  id: string,
  metadata: NodeMetadata,
  overrides?: Partial<WorkflowNode>
): WorkflowNode {
  return {
    id,
    type: 'universalNode',
    position: { x: 100, y: 100 },
    deletable: true,
    data: {
      label: metadata.name,
      config: { model: 'gpt-4', temperature: 0.7 },
      metadata
    },
    ...overrides
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
    editInterface: vi.fn(),
    undo: vi.fn().mockReturnValue(true),
    redo: vi.fn().mockReturnValue(true),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    cancelTransaction: vi.fn()
  };
}

function createMockContext(
  workflow: Workflow | null,
  nodeTypes: NodeMetadata[],
  dispatch?: CommandDispatch
): CommandContext {
  return {
    getWorkflow: () => workflow,
    nodeTypes,
    typeMap: buildTypeMap(nodeTypes),
    dispatch: dispatch ?? createMockDispatch()
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

// ============================================================================
// Helper Tests
// ============================================================================

describe('toShortId', () => {
  it('strips namespace from namespaced ID', () => {
    expect(toShortId('agentspec.llm_node.1')).toBe('llm_node.1');
  });

  it('returns unchanged for non-namespaced ID', () => {
    expect(toShortId('llm_node.1')).toBe('llm_node.1');
  });

  it('strips namespace from multi-segment type', () => {
    expect(toShortId('agentspec.boolean_gateway.2')).toBe('boolean_gateway.2');
  });

  it('returns unchanged for single segment', () => {
    expect(toShortId('someNode')).toBe('someNode');
  });
});

describe('resolveNode', () => {
  const metadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const node = createMockNode('agentspec.llm_node.1', metadata);
  const nodes = [node];

  it('resolves by exact ID', () => {
    expect(resolveNode('agentspec.llm_node.1', nodes)).toBe(node);
  });

  it('resolves by short ID', () => {
    expect(resolveNode('llm_node.1', nodes)).toBe(node);
  });

  it('returns undefined for non-existent ID', () => {
    expect(resolveNode('llm_node.99', nodes)).toBeUndefined();
  });
});

// ============================================================================
// add_node
// ============================================================================

describe('executeCommand — add_node', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const nodeTypes = [llmMetadata];

  it('adds a node with auto-position on empty canvas', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'add_node', nodeTypeId: 'llm_node' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify dispatch was called
    expect(dispatch.addNode).toHaveBeenCalledOnce();
    const addedNode = (dispatch.addNode as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowNode;

    // Node structure must match drag-and-drop parity
    expect(addedNode.id).toBe('agentspec.llm_node.1');
    expect(addedNode.type).toBe('universalNode');
    expect(addedNode.deletable).toBe(true);
    expect(addedNode.id).toBe('agentspec.llm_node.1');
    expect(addedNode.data.label).toBe('LLM Node');
    expect(addedNode.data.metadata).toBe(llmMetadata);
    expect(addedNode.data.config).toEqual({ model: 'gpt-4', temperature: 0.7 });

    // Auto-positioned on empty canvas
    expect(addedNode.position).toEqual({ x: 100, y: 100 });

    // Result data uses short IDs
    const data = result.data as AddNodeResultData;
    expect(data.nodeId).toBe('llm_node.1');
    expect(data.type).toBe('llm_node');
    expect(data.label).toBe('LLM Node');
    expect(data.position).toEqual({ x: 100, y: 100 });
  });

  it('adds a node at explicit position', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'add_node',
        nodeTypeId: 'llm_node',
        position: { x: 200, y: 300 }
      },
      context
    );

    expect(result.ok).toBe(true);
    const addedNode = (dispatch.addNode as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowNode;
    expect(addedNode.position).toEqual({ x: 200, y: 300 });
  });

  it('auto-positions relative to existing nodes', () => {
    const dispatch = createMockDispatch();
    const existingNode = createMockNode('agentspec.llm_node.1', llmMetadata, {
      position: { x: 400, y: 200 }
    });
    const workflow = createMockWorkflow([existingNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'add_node', nodeTypeId: 'llm_node' }, context);

    expect(result.ok).toBe(true);
    const addedNode = (dispatch.addNode as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowNode;
    expect(addedNode.position).toEqual({ x: 650, y: 200 });

    // Second node gets .2
    expect(addedNode.id).toBe('agentspec.llm_node.2');
    const data = (result as { ok: true; data: AddNodeResultData }).data;
    expect(data.nodeId).toBe('llm_node.2');
  });

  it('returns NODE_TYPE_NOT_FOUND for unknown type', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand({ type: 'add_node', nodeTypeId: 'nonexistent_type' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_TYPE_NOT_FOUND');
    expect(result.error).toContain('nonexistent_type');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'add_node', nodeTypeId: 'llm_node' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });

  it('resolves full namespaced type ID', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'add_node', nodeTypeId: 'agentspec.llm_node' }, context);

    expect(result.ok).toBe(true);
    expect(dispatch.addNode).toHaveBeenCalledOnce();
  });

  it('populates config from configSchema defaults', () => {
    const dispatch = createMockDispatch();
    const metaWithConfig = createMockMetadata('agentspec.api_node', 'API Node', {
      configSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', default: 'https://example.com' },
          method: { type: 'string', default: 'GET' },
          timeout: { type: 'number', default: 30 }
        }
      }
    });
    const context = createMockContext(createMockWorkflow(), [metaWithConfig], dispatch);

    executeCommand({ type: 'add_node', nodeTypeId: 'api_node' }, context);

    const addedNode = (dispatch.addNode as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowNode;
    expect(addedNode.data.config).toEqual({
      url: 'https://example.com',
      method: 'GET',
      timeout: 30
    });
  });

  it('handles metadata with no configSchema', () => {
    const dispatch = createMockDispatch();
    const metaNoConfig = createMockMetadata('agentspec.simple_node', 'Simple Node', {
      configSchema: undefined
    });
    const context = createMockContext(createMockWorkflow(), [metaNoConfig], dispatch);

    executeCommand({ type: 'add_node', nodeTypeId: 'simple_node' }, context);

    const addedNode = (dispatch.addNode as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowNode;
    expect(addedNode.data.config).toEqual({});
  });
});

// ============================================================================
// delete_node
// ============================================================================

describe('executeCommand — delete_node', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const nodeTypes = [llmMetadata];

  it('deletes a node by short ID', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'delete_node', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('llm_node.1');
    // dispatch.removeNode called with the full internal ID
    expect(dispatch.removeNode).toHaveBeenCalledWith('agentspec.llm_node.1');
  });

  it('deletes a node by full ID', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'delete_node', nodeId: 'agentspec.llm_node.1' }, context);

    expect(result.ok).toBe(true);
    expect(dispatch.removeNode).toHaveBeenCalledWith('agentspec.llm_node.1');
  });

  it('returns NODE_NOT_FOUND for missing node', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand({ type: 'delete_node', nodeId: 'llm_node.99' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
    expect(result.error).toContain('llm_node.99');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'delete_node', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// toShortTypeId
// ============================================================================

describe('toShortTypeId', () => {
  it('strips namespace from type ID', () => {
    expect(toShortTypeId('agentspec.llm_node')).toBe('llm_node');
  });

  it('returns unchanged for non-namespaced type ID', () => {
    expect(toShortTypeId('llm_node')).toBe('llm_node');
  });
});

// ============================================================================
// rename_node
// ============================================================================

describe('executeCommand — rename_node', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const nodeTypes = [llmMetadata];

  it('renames a node', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'rename_node', nodeId: 'llm_node.1', label: 'My Custom LLM' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('My Custom LLM');
    expect(dispatch.updateNode).toHaveBeenCalledWith(
      'agentspec.llm_node.1',
      expect.objectContaining({
        data: expect.objectContaining({ label: 'My Custom LLM' })
      })
    );
  });

  it('preserves other data fields when renaming', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand({ type: 'rename_node', nodeId: 'llm_node.1', label: 'New Name' }, context);

    const updateCall = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0];
    const updatedData = updateCall[1].data;
    expect(updatedData.config).toEqual({ model: 'gpt-4', temperature: 0.7 });
    expect(updatedData.metadata).toBe(llmMetadata);
  });

  it('returns NODE_NOT_FOUND for missing node', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand(
      { type: 'rename_node', nodeId: 'llm_node.99', label: 'Test' },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: 'rename_node', nodeId: 'llm_node.1', label: 'Test' },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// set_config
// ============================================================================

describe('executeCommand — set_config', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const nodeTypes = [llmMetadata];

  it('sets a string config value', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'model',
        value: 'gpt-4o'
      },
      context
    );

    expect(result.ok).toBe(true);
    const updateCall = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0];
    const updatedConfig = updateCall[1].data.config;
    expect(updatedConfig.model).toBe('gpt-4o');
    expect(updatedConfig.temperature).toBe(0.7); // preserved
  });

  it('parses number values', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'temperature',
        value: '0.9'
      },
      context
    );

    const updatedConfig = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0][1].data
      .config;
    expect(updatedConfig.temperature).toBe(0.9);
    expect(typeof updatedConfig.temperature).toBe('number');
  });

  it('parses boolean values', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'streaming',
        value: 'true'
      },
      context
    );

    const updatedConfig = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0][1].data
      .config;
    expect(updatedConfig.streaming).toBe(true);
  });

  it('preserves quoted strings as strings', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand(
      { type: 'set_config', nodeId: 'llm_node.1', key: 'name', value: '"42"' },
      context
    );

    const updatedConfig = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0][1].data
      .config;
    expect(updatedConfig.name).toBe('42');
    expect(typeof updatedConfig.name).toBe('string');
  });

  it('parses JSON array values', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'tags',
        value: '["a","b"]'
      },
      context
    );

    const updatedConfig = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0][1].data
      .config;
    expect(updatedConfig.tags).toEqual(['a', 'b']);
  });

  it('returns NODE_NOT_FOUND for missing node', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.99',
        key: 'model',
        value: 'gpt-4'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'model',
        value: 'gpt-4'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// set_config — ConfigSchema validation (US-017)
// ============================================================================

describe('executeCommand — set_config validation', () => {
  const enumMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node', {
    configSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          default: 'gpt-4',
          enum: ['gpt-4', 'gpt-4o', 'claude-3']
        },
        temperature: {
          type: 'number',
          default: 0.7
        },
        stream: {
          type: 'boolean',
          default: false
        },
        // Backend node config schemas send a JSON Schema type array here;
        // `ConfigProperty.type` stays a single literal, so the fixture casts
        // through `unknown` the way a real backend payload would arrive.
        flexible: {
          type: ['string', 'boolean'] as unknown as ConfigProperty['type'],
          default: 'x'
        },
        count: {
          type: ['integer'] as unknown as ConfigProperty['type']
        },
        anything: { type: [] as unknown as ConfigProperty['type'] },
        maybe: { type: ['string', 'null'] as unknown as ConfigProperty['type'] },
        maybeMode: {
          type: ['string', 'null'] as unknown as ConfigProperty['type'],
          enum: ['a', null]
        }
      }
    }
  });
  const nodeTypes = [enumMetadata];

  function makeNode() {
    return createMockNode('agentspec.llm_node.1', enumMetadata, {
      data: {
        label: 'LLM Node',
        config: { model: 'gpt-4', temperature: 0.7, stream: false, flexible: 'x', count: 1 },
        metadata: enumMetadata
      }
    });
  }

  it('succeeds with warning for enum violation (advisory mode)', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'model',
        value: 'gpt-5'
      },
      context
    );

    // Advisory: command succeeds
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // But has warnings
    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    expect(data.warnings).toBeDefined();
    expect(data.warnings!.length).toBe(1);
    expect(data.warnings![0].type).toBe('enum');
    expect(data.warnings![0].allowedValues).toEqual(['gpt-4', 'gpt-4o', 'claude-3']);

    // Value was still applied
    const updatedConfig = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0][1].data
      .config;
    expect(updatedConfig.model).toBe('gpt-5');
  });

  it('rejects enum violation in strict mode', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'model',
        value: 'gpt-5',
        strict: true
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('CONFIG_VALIDATION_ERROR');
    expect(result.error).toContain('gpt-4');
    expect(result.error).toContain('gpt-4o');
    expect(result.error).toContain('claude-3');

    // Value was NOT applied
    expect(dispatch.updateNode as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('succeeds with warning for type mismatch (advisory mode)', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    // Setting a number field with a string value (not parseable as number)
    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'temperature',
        value: 'hot'
      },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    expect(data.warnings).toBeDefined();
    expect(data.warnings!.length).toBe(1);
    expect(data.warnings![0].type).toBe('type_mismatch');
    expect(data.warnings![0].expectedType).toBe('number');
    expect(data.warnings![0].actualType).toBe('string');

    // Value was still applied
    const updatedConfig = (dispatch.updateNode as ReturnType<typeof vi.fn>).mock.calls[0][1].data
      .config;
    expect(updatedConfig.temperature).toBe('hot');
  });

  it('rejects type mismatch in strict mode', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'temperature',
        value: 'hot',
        strict: true
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('CONFIG_VALIDATION_ERROR');
    expect(result.error).toContain('number');
    expect(result.error).toContain('string');
    expect(dispatch.updateNode as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('no validation when configSchema is missing', () => {
    const noSchemaMetadata = createMockMetadata('agentspec.basic_node', 'Basic Node', {
      configSchema: undefined
    });
    const node = createMockNode('agentspec.basic_node.1', noSchemaMetadata, {
      data: {
        label: 'Basic Node',
        config: {},
        metadata: noSchemaMetadata
      }
    });
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, [noSchemaMetadata], dispatch);

    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'basic_node.1',
        key: 'anything',
        value: 'whatever'
      },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // No warnings when no schema
    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    expect(data.warnings).toBeUndefined();

    // Value applied
    expect(dispatch.updateNode as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it('no validation warning when value matches schema', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'model',
        value: 'gpt-4o'
      },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    expect(data.warnings).toBeUndefined();
  });

  it('a key not in the schema is stored with an unknown_key warning that lists the declared keys', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'llm_node.1',
        key: 'custom_field',
        value: 'anything'
      },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Stored anyway — hosts keep config open.
    expect(dispatch.updateNode as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    expect(data.warnings).toHaveLength(1);
    expect(data.warnings![0].type).toBe('unknown_key');
    expect(data.warnings![0].knownKeys).toContain('model');
    expect(data.warnings![0].message).toContain('model');
  });

  it('strict mode refuses a key the schema does not declare', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const context = createMockContext(createMockWorkflow([node]), nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'set_config', nodeId: 'llm_node.1', key: 'custom_field', value: 'x', strict: true },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('CONFIG_VALIDATION_ERROR');
    expect(dispatch.updateNode as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('warns on boolean type mismatch', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    // "yes" is a string, not a boolean
    const result = executeCommand(
      { type: 'set_config', nodeId: 'llm_node.1', key: 'stream', value: 'yes' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    expect(data.warnings).toBeDefined();
    expect(data.warnings![0].type).toBe('type_mismatch');
    expect(data.warnings![0].expectedType).toBe('boolean');
  });

  it('accepts a string for a property with a JSON Schema type array, no warning', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'set_config', nodeId: 'llm_node.1', key: 'flexible', value: 'yes' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    expect(data.warnings).toBeUndefined();
  });

  it('accepts a boolean for a property with a JSON Schema type array, no warning', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'set_config', nodeId: 'llm_node.1', key: 'flexible', value: 'true' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    expect(data.warnings).toBeUndefined();
  });

  it('rejects a number for a property with a JSON Schema type array, with a joined message', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'set_config', nodeId: 'llm_node.1', key: 'flexible', value: '5' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    expect(data.warnings).toBeDefined();
    expect(data.warnings![0].type).toBe('type_mismatch');
    expect(data.warnings![0].message).toBe("Expected type 'string' or 'boolean' but got 'number'");
  });

  it('accepts a number for a single-element JSON Schema type array (integer)', () => {
    const dispatch = createMockDispatch();
    const node = makeNode();
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'set_config', nodeId: 'llm_node.1', key: 'count', value: '42' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    expect(data.warnings).toBeUndefined();
  });

  const warningsFor = (key: string, value: string) => {
    const node = createMockNode('agentspec.llm_node.1', enumMetadata, {
      data: { label: 'LLM Node', config: {}, metadata: enumMetadata }
    });
    const context = createMockContext(createMockWorkflow([node]), nodeTypes, createMockDispatch());
    const result = executeCommand(
      { type: 'set_config', nodeId: 'llm_node.1', key, value },
      context
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return [];
    const data = result.data as import('../../../src/lib/commands/types.js').SetConfigResultData;
    return data.warnings ?? [];
  };

  it('puts no type constraint on a property whose type is an empty array (R6.d)', () => {
    expect(warningsFor('anything', 'hello')).toEqual([]);
    expect(warningsFor('anything', '5')).toEqual([]);
    expect(warningsFor('anything', 'null')).toEqual([]);
  });

  it('fails null against a type that does not admit null (R6.i)', () => {
    const warnings = warningsFor('temperature', 'null');
    expect(warnings.map((w) => w.type)).toEqual(['type_mismatch']);
    expect(warnings[0].actualType).toBe('null');
  });

  it('accepts null for a type array that lists null, and an enum that lists null', () => {
    expect(warningsFor('maybe', 'null')).toEqual([]);
    expect(warningsFor('maybeMode', 'null')).toEqual([]);
  });

  it('fails null against an enum that does not list it', () => {
    expect(warningsFor('model', 'null').map((w) => w.type)).toContain('enum');
  });
});

// ============================================================================
// get_config
// ============================================================================

describe('executeCommand — get_config', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const nodeTypes = [llmMetadata];

  it('returns config value for existing key', () => {
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand(
      { type: 'get_config', nodeId: 'llm_node.1', key: 'model' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as GetConfigResultData;
    if (!('key' in data)) throw new Error('expected the single-key shape');
    expect(data.nodeId).toBe('llm_node.1');
    expect(data.key).toBe('model');
    expect(data.value).toBe('gpt-4');
  });

  it('returns CONFIG_KEY_NOT_FOUND for missing key', () => {
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand(
      { type: 'get_config', nodeId: 'llm_node.1', key: 'nonexistent' },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('CONFIG_KEY_NOT_FOUND');
    expect(result.error).toContain('nonexistent');
  });

  it('returns NODE_NOT_FOUND for missing node', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand(
      { type: 'get_config', nodeId: 'llm_node.99', key: 'model' },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: 'get_config', nodeId: 'llm_node.1', key: 'model' },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// info
// ============================================================================

describe('executeCommand — info', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node', {
    inputs: [{ id: 'prompt', name: 'Prompt', type: 'input', dataType: 'string' }],
    outputs: [
      {
        id: 'llm_output',
        name: 'LLM Output',
        type: 'output',
        dataType: 'string'
      }
    ]
  });
  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node', {
    inputs: [{ id: 'body', name: 'Body', type: 'input', dataType: 'string' }],
    outputs: []
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it('returns full node info with ports', () => {
    const node = createMockNode('agentspec.llm_node.1', llmMetadata, {
      position: { x: 200, y: 300 }
    });
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'info', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as InfoResultData;
    expect(data.nodeId).toBe('llm_node.1');
    expect(data.label).toBe('LLM Node');
    expect(data.type).toBe('llm_node');
    expect(data.position).toEqual({ x: 200, y: 300 });
    expect(data.config).toEqual({ model: 'gpt-4', temperature: 0.7 });
    expect(data.inputs).toEqual([{ portId: 'prompt', name: 'Prompt', dataType: 'string' }]);
    expect(data.outputs).toEqual([
      { portId: 'llm_output', name: 'LLM Output', dataType: 'string' }
    ]);
  });

  it('includes connected edges', () => {
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const edge: WorkflowEdge = {
      id: 'edge-1',
      source: 'agentspec.llm_node.1',
      target: 'agentspec.api_node.1',
      sourceHandle: 'agentspec.llm_node.1-output-llm_output',
      targetHandle: 'agentspec.api_node.1-input-body'
    };
    const workflow = createMockWorkflow([llmNode, apiNode], [edge]);
    const context = createMockContext(workflow, nodeTypes);

    // Info on source node
    const result = executeCommand({ type: 'info', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as InfoResultData;
    expect(data.connectedEdges).toHaveLength(1);
    expect(data.connectedEdges[0]).toEqual({
      edgeId: 'edge-1',
      direction: 'outgoing',
      remoteNodeId: 'api_node.1',
      remotePort: 'body',
      localPort: 'llm_output'
    });

    // Info on target node — should show incoming
    const result2 = executeCommand({ type: 'info', nodeId: 'api_node.1' }, context);

    expect(result2.ok).toBe(true);
    if (!result2.ok) return;
    const data2 = result2.data as InfoResultData;
    expect(data2.connectedEdges).toHaveLength(1);
    expect(data2.connectedEdges[0]).toEqual({
      edgeId: 'edge-1',
      direction: 'incoming',
      remoteNodeId: 'llm_node.1',
      remotePort: 'llm_output',
      localPort: 'body'
    });
  });

  it('returns empty connectedEdges for isolated node', () => {
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'info', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as InfoResultData;
    expect(data.connectedEdges).toEqual([]);
  });

  it('returns NODE_NOT_FOUND for missing node', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand({ type: 'info', nodeId: 'llm_node.99' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'info', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// connect
// ============================================================================

describe('executeCommand — connect', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node', {
    inputs: [{ id: 'prompt', name: 'Prompt', type: 'input', dataType: 'string' }],
    outputs: [
      {
        id: 'llm_output',
        name: 'LLM Output',
        type: 'output',
        dataType: 'string'
      }
    ]
  });
  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node', {
    inputs: [{ id: 'body', name: 'Body', type: 'input', dataType: 'string' }],
    outputs: [{ id: 'response', name: 'Response', type: 'output', dataType: 'string' }]
  });
  const triggerMetadata = createMockMetadata('agentspec.trigger_node', 'Trigger Node', {
    inputs: [],
    outputs: [
      {
        id: 'trigger_out',
        name: 'Trigger Out',
        type: 'output',
        dataType: 'trigger'
      }
    ]
  });
  const nodeTypes = [llmMetadata, apiMetadata, triggerMetadata];

  it('creates a valid connection between compatible ports', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('llm_node.1');
    expect(result.message).toContain('api_node.1');

    // Verify dispatch.addEdge was called
    expect(dispatch.addEdge).toHaveBeenCalledOnce();
    const edge = (dispatch.addEdge as ReturnType<typeof vi.fn>).mock.calls[0][0] as WorkflowEdge;

    // Edge structure
    expect(edge.source).toBe('agentspec.llm_node.1');
    expect(edge.target).toBe('agentspec.api_node.1');
    expect(edge.sourceHandle).toBe('agentspec.llm_node.1-output-llm_output');
    expect(edge.targetHandle).toBe('agentspec.api_node.1-input-body');

    // Edge ID format
    expect(edge.id).toBe(
      'agentspec.llm_node.1-agentspec.llm_node.1-output-llm_output-agentspec.api_node.1-agentspec.api_node.1-input-body'
    );

    // Styling was applied (edge should have style, class, markerEnd)
    expect(edge.style).toBeDefined();
    expect(edge.class).toBeDefined();
    expect(edge.data?.metadata?.edgeType).toBeDefined();
  });

  it('returns error when source port direction is reversed', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    // Attempt to connect input→output (reversed)
    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'api_node.1',
        sourcePort: 'body', // body is an input
        targetNodeId: 'llm_node.1',
        targetPort: 'llm_output' // llm_output is an output
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INVALID_CONNECTION');
    expect(result.error).toContain('reversed');
    expect(dispatch.addEdge).not.toHaveBeenCalled();
  });

  it('returns PORT_NOT_FOUND for missing source port', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'nonexistent_port',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('PORT_NOT_FOUND');
    expect(result.error).toContain('nonexistent_port');
  });

  it('returns PORT_NOT_FOUND for missing target port', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.1',
        targetPort: 'nonexistent_port'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('PORT_NOT_FOUND');
    expect(result.error).toContain('nonexistent_port');
  });

  it('allows connecting ports of different data types (matches canvas behavior)', () => {
    const dispatch = createMockDispatch();
    const triggerNode = createMockNode('agentspec.trigger_node.1', triggerMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const workflow = createMockWorkflow([triggerNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    // trigger_out (trigger type) → body (string type)
    // The canvas editor allows cross-type connections freely; DSL executor matches this behavior.
    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'trigger_node.1',
        sourcePort: 'trigger_out',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(true);
    expect(dispatch.addEdge).toHaveBeenCalled();
  });

  it('returns NODE_NOT_FOUND for missing source node', () => {
    const dispatch = createMockDispatch();
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const workflow = createMockWorkflow([apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'llm_node.99',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NODE_NOT_FOUND for missing target node', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([llmNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.99',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });

  it('returns error when source port is input (not output)', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'prompt', // input port, not output
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INVALID_CONNECTION');
    expect(result.error).toContain('input');
    expect(result.error).toContain('not an output');
  });

  // N2: config-driven ports (dynamicOutputs/dynamicInputs) are not in
  // metadata.outputs/inputs, but connect must still resolve them.
  it('resolves a config-driven dynamicOutputs port as a source', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    llmNode.data.config = {
      ...llmNode.data.config,
      dynamicOutputs: [{ name: 'extra_out', label: 'Extra Out', dataType: 'string' }]
    };
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'extra_out',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(true);
    expect(dispatch.addEdge).toHaveBeenCalledOnce();
    const edge = (dispatch.addEdge as ReturnType<typeof vi.fn>).mock.calls[0][0] as WorkflowEdge;
    expect(edge.sourceHandle).toBe('agentspec.llm_node.1-output-extra_out');
  });

  it('resolves a config-driven dynamicInputs port as a target', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    apiNode.data.config = {
      ...apiNode.data.config,
      dynamicInputs: [{ name: 'extra_in', label: 'Extra In', dataType: 'string' }]
    };
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.1',
        targetPort: 'extra_in'
      },
      context
    );

    expect(result.ok).toBe(true);
    expect(dispatch.addEdge).toHaveBeenCalledOnce();
    const edge = (dispatch.addEdge as ReturnType<typeof vi.fn>).mock.calls[0][0] as WorkflowEdge;
    expect(edge.targetHandle).toBe('agentspec.api_node.1-input-extra_in');
  });

  // N3: re-applying an existing connection (e.g. a second AI-assistant Apply)
  // must be an idempotent no-op, never a duplicate edge (which crashes the
  // canvas with `each_key_duplicate`).
  it('treats an already-existing connection as an idempotent no-op', () => {
    // First connect to capture the deterministic edge it produces.
    const firstDispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const firstContext = createMockContext(
      createMockWorkflow([llmNode, apiNode]),
      nodeTypes,
      firstDispatch
    );
    const command = {
      type: 'connect' as const,
      sourceNodeId: 'llm_node.1',
      sourcePort: 'llm_output',
      targetNodeId: 'api_node.1',
      targetPort: 'body'
    };
    executeCommand(command, firstContext);
    const existingEdge = (firstDispatch.addEdge as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as WorkflowEdge;

    // Re-run against a workflow that already holds that edge.
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow([llmNode, apiNode], [existingEdge]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(command, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('Already connected');
    expect(dispatch.addEdge).not.toHaveBeenCalled();
  });
});

// ============================================================================
// disconnect_ports
// ============================================================================

describe('executeCommand — disconnect_ports', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node', {
    inputs: [{ id: 'prompt', name: 'Prompt', type: 'input', dataType: 'string' }],
    outputs: [
      {
        id: 'llm_output',
        name: 'LLM Output',
        type: 'output',
        dataType: 'string'
      }
    ]
  });
  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node', {
    inputs: [{ id: 'body', name: 'Body', type: 'input', dataType: 'string' }],
    outputs: []
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it('disconnects a specific edge between two ports', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const edge = {
      id: 'edge-1',
      source: 'agentspec.llm_node.1',
      target: 'agentspec.api_node.1',
      sourceHandle: 'agentspec.llm_node.1-output-llm_output',
      targetHandle: 'agentspec.api_node.1-input-body'
    } as WorkflowEdge;
    const workflow = createMockWorkflow([llmNode, apiNode], [edge]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'disconnect_ports',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('Disconnected');
    expect(dispatch.removeEdge).toHaveBeenCalledWith('edge-1');
  });

  it('returns EDGE_NOT_FOUND when no matching edge exists', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const workflow = createMockWorkflow([llmNode, apiNode]); // no edges
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'disconnect_ports',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('EDGE_NOT_FOUND');
  });

  it('returns NODE_NOT_FOUND for missing source node', () => {
    const dispatch = createMockDispatch();
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const workflow = createMockWorkflow([apiNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'disconnect_ports',
        sourceNodeId: 'llm_node.99',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NODE_NOT_FOUND for missing target node', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([llmNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'disconnect_ports',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.99',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      {
        type: 'disconnect_ports',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'llm_output',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// disconnect_node
// ============================================================================

describe('executeCommand — disconnect_node', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node', {
    inputs: [{ id: 'prompt', name: 'Prompt', type: 'input', dataType: 'string' }],
    outputs: [
      {
        id: 'llm_output',
        name: 'LLM Output',
        type: 'output',
        dataType: 'string'
      }
    ]
  });
  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node', {
    inputs: [{ id: 'body', name: 'Body', type: 'input', dataType: 'string' }],
    outputs: [{ id: 'response', name: 'Response', type: 'output', dataType: 'string' }]
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it('removes all edges connected to a node', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const edge1 = {
      id: 'edge-1',
      source: 'agentspec.llm_node.1',
      target: 'agentspec.api_node.1',
      sourceHandle: 'agentspec.llm_node.1-output-llm_output',
      targetHandle: 'agentspec.api_node.1-input-body'
    } as WorkflowEdge;
    const edge2 = {
      id: 'edge-2',
      source: 'agentspec.api_node.1',
      target: 'agentspec.llm_node.1',
      sourceHandle: 'agentspec.api_node.1-output-response',
      targetHandle: 'agentspec.llm_node.1-input-prompt'
    } as WorkflowEdge;
    const workflow = createMockWorkflow([llmNode, apiNode], [edge1, edge2]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'disconnect_node', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('2 edge(s)');
    expect(dispatch.removeEdge).toHaveBeenCalledTimes(2);
    expect(dispatch.removeEdge).toHaveBeenCalledWith('edge-1');
    expect(dispatch.removeEdge).toHaveBeenCalledWith('edge-2');
  });

  it('succeeds with 0 edges when node is isolated', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([llmNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'disconnect_node', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('0 edge(s)');
    expect(dispatch.removeEdge).not.toHaveBeenCalled();
  });

  it('returns NODE_NOT_FOUND for missing node', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);

    const result = executeCommand({ type: 'disconnect_node', nodeId: 'llm_node.99' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'disconnect_node', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// List Nodes
// ============================================================================

describe('executeCommand — list_nodes', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node');
  const nodeTypes = [llmMetadata, apiMetadata];

  it('returns all nodes with short IDs, labels, and types', () => {
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata, {
      data: {
        ...createMockNode('agentspec.api_node.1', apiMetadata).data,
        label: 'My API'
      }
    });
    const workflow = createMockWorkflow([llmNode, apiNode]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'list_nodes' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListNodesResultData;
    expect(data.nodes).toHaveLength(2);
    expect(data.nodes[0]).toEqual({
      nodeId: 'llm_node.1',
      label: 'LLM Node',
      type: 'llm_node'
    });
    expect(data.nodes[1]).toEqual({
      nodeId: 'api_node.1',
      label: 'My API',
      type: 'api_node'
    });
  });

  it('returns empty list for empty workflow', () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'list_nodes' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListNodesResultData;
    expect(data.nodes).toHaveLength(0);
    expect(result.message).toContain('No nodes');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'list_nodes' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// List Edges
// ============================================================================

describe('executeCommand — list_edges', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node', {
    outputs: [{ id: 'llm_output', name: 'LLM Output', dataType: 'string' }]
  });
  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node', {
    inputs: [{ id: 'body', name: 'Body', dataType: 'string' }]
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it('returns all edges with short IDs and port names', () => {
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const edge: WorkflowEdge = {
      id: 'edge-1',
      source: 'agentspec.llm_node.1',
      target: 'agentspec.api_node.1',
      sourceHandle: 'agentspec.llm_node.1-output-llm_output',
      targetHandle: 'agentspec.api_node.1-input-body'
    };
    const workflow = createMockWorkflow([llmNode, apiNode], [edge]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'list_edges' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListEdgesResultData;
    expect(data.edges).toHaveLength(1);
    expect(data.edges[0]).toEqual({
      edgeId: 'edge-1',
      sourceNodeId: 'llm_node.1',
      sourcePort: 'llm_output',
      targetNodeId: 'api_node.1',
      targetPort: 'body'
    });
  });

  it('returns empty list when no edges', () => {
    const workflow = createMockWorkflow([createMockNode('agentspec.llm_node.1', llmMetadata)]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'list_edges' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListEdgesResultData;
    expect(data.edges).toHaveLength(0);
    expect(result.message).toContain('No edges');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'list_edges' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// List Types
// ============================================================================

describe('executeCommand — list_types', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node', {
    category: 'integration'
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it('returns all types with short IDs, names, and categories', () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'list_types' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListTypesResultData;
    expect(data.types).toHaveLength(2);
    expect(data.types[0]).toEqual({
      typeId: 'llm_node',
      name: 'LLM Node',
      category: 'ai'
    });
    expect(data.types[1]).toEqual({
      typeId: 'api_node',
      name: 'API Node',
      category: 'integration'
    });
  });

  it('returns short type IDs that match what add command accepts', () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'list_types' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListTypesResultData;
    // Each typeId should be resolvable via typeMap
    for (const t of data.types) {
      expect(context.typeMap.has(t.typeId)).toBe(true);
    }
  });

  it('does not require a workflow (context.nodeTypes is sufficient)', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'list_types' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListTypesResultData;
    expect(data.types).toHaveLength(2);
  });
});

// ============================================================================
// Help
// ============================================================================

describe('executeCommand — help', () => {
  const nodeTypes: NodeMetadata[] = [];

  it('returns all commands when no argument given', () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'help' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as HelpResultData;
    expect(data.commands.length).toBeGreaterThan(10);
    expect(result.message).toContain('Available commands');
    // Verify structure
    for (const cmd of data.commands) {
      expect(cmd).toHaveProperty('name');
      expect(cmd).toHaveProperty('syntax');
      expect(cmd).toHaveProperty('description');
    }
  });

  it('returns specific command help when argument given', () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'help', command: 'add' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as HelpResultData;
    expect(data.commands.length).toBe(1);
    expect(data.commands[0].name).toBe('add');
    expect(data.commands[0].syntax).toContain('add');
    expect(result.message).toContain("Help for 'add'");
  });

  it('returns multiple entries for commands with variants (disconnect)', () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'help', command: 'disconnect' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as HelpResultData;
    expect(data.commands.length).toBe(2);
    expect(data.commands.every((c) => c.name === 'disconnect')).toBe(true);
  });

  it('returns all commands for unknown command name', () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'help', command: 'nonexistent' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as HelpResultData;
    expect(data.commands.length).toBeGreaterThan(10);
  });

  it('does not require a workflow', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'help' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as HelpResultData;
    expect(data.commands.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// undo
// ============================================================================

describe('executeCommand — undo', () => {
  const nodeTypes: NodeMetadata[] = [];

  it('calls dispatch.undo() and returns success', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'undo' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toBe('Undone');
    expect(dispatch.undo).toHaveBeenCalledOnce();
  });

  it('returns UNDO_UNAVAILABLE when dispatch.undo() returns false', () => {
    const dispatch = createMockDispatch();
    (dispatch.undo as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'undo' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('UNDO_UNAVAILABLE');
    expect(result.error).toContain('Nothing to undo');
  });

  it('does not require a workflow', () => {
    const dispatch = createMockDispatch();
    const context = createMockContext(null, nodeTypes, dispatch);

    const result = executeCommand({ type: 'undo' }, context);

    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// redo
// ============================================================================

describe('executeCommand — redo', () => {
  const nodeTypes: NodeMetadata[] = [];

  it('calls dispatch.redo() and returns success', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'redo' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toBe('Redone');
    expect(dispatch.redo).toHaveBeenCalledOnce();
  });

  it('returns REDO_UNAVAILABLE when dispatch.redo() returns false', () => {
    const dispatch = createMockDispatch();
    (dispatch.redo as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'redo' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('REDO_UNAVAILABLE');
    expect(result.error).toContain('Nothing to redo');
  });

  it('does not require a workflow', () => {
    const dispatch = createMockDispatch();
    const context = createMockContext(null, nodeTypes, dispatch);

    const result = executeCommand({ type: 'redo' }, context);

    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// clear
// ============================================================================

describe('executeCommand — clear', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node');
  const nodeTypes = [llmMetadata, apiMetadata];

  it('removes all nodes and edges via batchUpdate', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const apiNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const edge = {
      id: 'edge-1',
      source: 'agentspec.llm_node.1',
      target: 'agentspec.api_node.1'
    } as WorkflowEdge;
    const workflow = createMockWorkflow([llmNode, apiNode], [edge]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'clear' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('2 node(s)');
    expect(result.message).toContain('1 edge(s)');
    expect(dispatch.batchUpdate).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('succeeds on empty workflow', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'clear' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('0 node(s)');
    expect(result.message).toContain('0 edge(s)');
    expect(dispatch.batchUpdate).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  function chatWorkflow(): Workflow {
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    return {
      ...createMockWorkflow([llmNode]),
      interface: {
        inputs: [
          {
            id: 'message',
            dataType: 'string',
            required: true,
            bindings: [{ nodeId: 'agentspec.llm_node.1', portId: 'prompt' }]
          }
        ],
        outputs: [
          {
            id: 'answer',
            dataType: 'string',
            bindings: [{ nodeId: 'agentspec.llm_node.1', portId: 'text' }]
          }
        ]
      },
      playground: {
        chat: {
          message: 'message',
          history: null,
          session_id: null,
          message_id: null,
          replies: [{ node_id: 'agentspec.llm_node.1', port: 'text' }],
          sub_workflow_replies: false
        }
      }
    };
  }

  it('keeps the interface unbound and says the Playground replies are dropped', () => {
    const dispatch = createMockDispatch();
    const context = createMockContext(chatWorkflow(), nodeTypes, dispatch);

    const result = executeCommand({ type: 'clear' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('Kept the interface (1 input(s), 1 output(s)), now unbound');
    expect(result.message).toContain('Dropped the Playground replies');
    expect(result.message).toContain('clear --all');
    expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);
    const update = vi.mocked(dispatch.batchUpdate).mock.calls[0][0];
    expect(update.nodes).toEqual([]);
    expect(update.edges).toEqual([]);
    expect(update.interface?.inputs).toEqual([
      { id: 'message', dataType: 'string', required: true, bindings: [] }
    ]);
    expect(update.interface?.outputs).toEqual([{ id: 'answer', dataType: 'string', bindings: [] }]);
    expect(update).not.toHaveProperty('playground');
  });

  it('with --all removes the interface and the Playground chat settings', () => {
    const dispatch = createMockDispatch();
    const context = createMockContext(chatWorkflow(), nodeTypes, dispatch);

    const result = executeCommand({ type: 'clear', all: true }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('removed the interface and the Playground chat settings');
    const update = vi.mocked(dispatch.batchUpdate).mock.calls[0][0];
    expect(update.interface).toEqual({ inputs: [], outputs: [] });
    expect(update.playground?.chat).toBeNull();
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'clear' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// config_open
// ============================================================================

describe('executeCommand — config_open', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const nodeTypes = [llmMetadata];

  it('calls emitUIAction with open_config when handler provided', () => {
    const dispatch = createMockDispatch();
    const emitUIAction = vi.fn();
    dispatch.emitUIAction = emitUIAction;
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([llmNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'config_open', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('Opened config');
    expect(emitUIAction).toHaveBeenCalledWith({
      type: 'open_config',
      nodeId: 'agentspec.llm_node.1'
    });
    expect(result.uiActionPending).toBeUndefined();
  });

  it('returns uiActionPending when emitUIAction not provided', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([llmNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'config_open', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.uiActionPending).toBe(true);
  });

  it('returns NODE_NOT_FOUND for missing node', () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'config_open', nodeId: 'llm_node.99' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'config_open', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// select_node
// ============================================================================

describe('executeCommand — select_node', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const nodeTypes = [llmMetadata];

  it('calls emitUIAction with select_node when handler provided', () => {
    const dispatch = createMockDispatch();
    const emitUIAction = vi.fn();
    dispatch.emitUIAction = emitUIAction;
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([llmNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'select_node', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('Selected');
    expect(emitUIAction).toHaveBeenCalledWith({
      type: 'select_node',
      nodeId: 'agentspec.llm_node.1'
    });
    expect(result.uiActionPending).toBeUndefined();
  });

  it('returns uiActionPending when emitUIAction not provided', () => {
    const dispatch = createMockDispatch();
    const llmNode = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([llmNode]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'select_node', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.uiActionPending).toBe(true);
  });

  it('returns NODE_NOT_FOUND for missing node', () => {
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand({ type: 'select_node', nodeId: 'llm_node.99' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'select_node', nodeId: 'llm_node.1' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });
});

// ============================================================================
// swap_node
// ============================================================================

describe('executeCommand — swap_node', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node', {
    inputs: [{ id: 'prompt', name: 'Prompt', type: 'input', dataType: 'string' }],
    outputs: [
      {
        id: 'llm_output',
        name: 'LLM Output',
        type: 'output',
        dataType: 'string'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', default: 'gpt-4' },
        temperature: { type: 'number', default: 0.7 }
      }
    }
  });

  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node', {
    inputs: [{ id: 'body', name: 'Body', type: 'input', dataType: 'string' }],
    outputs: [{ id: 'response', name: 'Response', type: 'output', dataType: 'string' }],
    configSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', default: 'https://example.com' },
        model: { type: 'string', default: 'default-model' }
      }
    }
  });

  // A type with different ports (number ports won't match string ports)
  const calcMetadata = createMockMetadata('agentspec.calculator', 'Calculator', {
    inputs: [
      { id: 'a', name: 'A', type: 'input', dataType: 'number' },
      { id: 'b', name: 'B', type: 'input', dataType: 'number' }
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'output', dataType: 'number' }],
    configSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', default: 'add' }
      }
    }
  });

  const nodeTypes = [llmMetadata, apiMetadata, calcMetadata];

  it('swaps a node type and dispatches via batchUpdate', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata, {
      data: {
        label: 'LLM Node',
        config: { model: 'gpt-4', temperature: 0.7 },
        metadata: llmMetadata
      }
    });
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'swap_node', nodeId: 'llm_node.1', newTypeId: 'api_node' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('Swapped');
    expect(result.message).toContain('llm_node.1');
    expect(result.message).toContain('api_node');

    const data = result.data as import('../../../src/lib/commands/types.js').SwapNodeResultData;
    expect(data.oldNodeId).toBe('llm_node.1');
    expect(data.newType).toBe('api_node');
    expect(dispatch.batchUpdate).toHaveBeenCalled();
  });

  it('uses dispatch.swapNode when available', () => {
    const dispatch = createMockDispatch();
    dispatch.swapNode = vi.fn();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata, {
      data: {
        label: 'LLM Node',
        config: { model: 'gpt-4', temperature: 0.7 },
        metadata: llmMetadata
      }
    });
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'swap_node', nodeId: 'llm_node.1', newTypeId: 'api_node' },
      context
    );

    expect(result.ok).toBe(true);
    expect(dispatch.swapNode).toHaveBeenCalled();
    expect(dispatch.batchUpdate).not.toHaveBeenCalled();
  });

  it('reports dropped edges when ports are incompatible', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata, {
      data: {
        label: 'LLM Node',
        config: { model: 'gpt-4', temperature: 0.7 },
        metadata: llmMetadata
      }
    });
    const otherNode = createMockNode('agentspec.api_node.1', apiMetadata);
    // Edge into llm_node.1's prompt port (string→string) — calculator only has number inputs
    const edge: WorkflowEdge = {
      id: 'edge-1',
      source: 'agentspec.api_node.1',
      target: 'agentspec.llm_node.1',
      sourceHandle: 'agentspec.api_node.1-output-response',
      targetHandle: 'agentspec.llm_node.1-input-prompt'
    } as WorkflowEdge;
    const workflow = createMockWorkflow([node, otherNode], [edge]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'swap_node', nodeId: 'llm_node.1', newTypeId: 'calculator' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').SwapNodeResultData;
    expect(data.droppedEdges).toBeGreaterThan(0);
    expect(data.hasDataLoss).toBe(true);
    expect(result.message).toContain('dropped');
  });

  it('names each dropped edge in the message and result data', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata, {
      data: {
        label: 'LLM Node',
        config: {},
        metadata: llmMetadata
      }
    });
    const otherNode = createMockNode('agentspec.api_node.1', apiMetadata);
    const edge: WorkflowEdge = {
      id: 'edge-1',
      source: 'agentspec.api_node.1',
      target: 'agentspec.llm_node.1',
      sourceHandle: 'agentspec.api_node.1-output-response',
      targetHandle: 'agentspec.llm_node.1-input-prompt'
    } as WorkflowEdge;
    const workflow = createMockWorkflow([node, otherNode], [edge]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'swap_node', nodeId: 'llm_node.1', newTypeId: 'calculator' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').SwapNodeResultData;
    expect(data.droppedEdgeDetails).toHaveLength(1);
    expect(data.droppedEdgeDetails[0]).toBe('api_node.1:response → llm_node.1:prompt');
    expect(result.message).toContain('api_node.1:response → llm_node.1:prompt');
  });

  it('truncates the inline dropped-edge list at 5 but keeps all in result data', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata, {
      data: {
        label: 'LLM Node',
        config: {},
        metadata: llmMetadata
      }
    });
    // 7 string edges into llm_node.1's llm_output — calculator has no string ports
    const sources = Array.from({ length: 7 }, (_, i) =>
      createMockNode(`agentspec.api_node.${i + 1}`, apiMetadata)
    );
    const edges: WorkflowEdge[] = sources.map(
      (src, i) =>
        ({
          id: `edge-${i}`,
          source: 'agentspec.llm_node.1',
          target: src.id,
          sourceHandle: 'agentspec.llm_node.1-output-llm_output',
          targetHandle: `${src.id}-input-body`
        }) as WorkflowEdge
    );
    const workflow = createMockWorkflow([node, ...sources], edges);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'swap_node', nodeId: 'llm_node.1', newTypeId: 'calculator' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').SwapNodeResultData;
    expect(data.droppedEdges).toBe(7);
    expect(data.droppedEdgeDetails).toHaveLength(7);
    expect(result.message).toContain('7 edge(s) dropped');
    expect(result.message).toContain('… and 2 more');
    // Only 5 edges named inline
    const namedCount = (result.message.match(/llm_node\.1:llm_output/g) ?? []).length;
    expect(namedCount).toBe(5);
  });

  it('gives the replacement node a real id so its handles render', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata, {
      data: {
        label: 'LLM Node',
        config: {},
        metadata: llmMetadata
      }
    });
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'swap_node', nodeId: 'llm_node.1', newTypeId: 'api_node' },
      context
    );

    expect(result.ok).toBe(true);
    const update = (dispatch.batchUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const newNode = update.nodes.find(
      (n: WorkflowNode) => n.data.metadata.node_type_id === 'agentspec.api_node'
    );
    expect(newNode).toBeDefined();
    expect(newNode.id).toBeTruthy();
  });

  it('reports config carried over and reset', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata, {
      data: {
        label: 'LLM Node',
        config: { model: 'gpt-4', temperature: 0.7 },
        metadata: llmMetadata
      }
    });
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'swap_node', nodeId: 'llm_node.1', newTypeId: 'api_node' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').SwapNodeResultData;
    // "model" exists in both llm_node and api_node — should be carried over
    expect(data.configCarriedOver).toContain('model');
    // "url" is only in api_node — should be reset
    expect(data.configReset).toContain('url');
  });

  it('returns NODE_NOT_FOUND for missing node', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow();
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'swap_node', nodeId: 'llm_node.99', newTypeId: 'api_node' },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NODE_TYPE_NOT_FOUND for unknown new type', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'swap_node',
        nodeId: 'llm_node.1',
        newTypeId: 'nonexistent_type'
      },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_TYPE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: 'swap_node', nodeId: 'llm_node.1', newTypeId: 'api_node' },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });

  it('swaps node with no edges (isolated node)', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata, {
      data: {
        label: 'LLM Node',
        config: { model: 'gpt-4', temperature: 0.7 },
        metadata: llmMetadata
      }
    });
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'swap_node', nodeId: 'llm_node.1', newTypeId: 'api_node' },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').SwapNodeResultData;
    expect(data.keptEdges).toBe(0);
    expect(data.droppedEdges).toBe(0);
    expect(data.hasDataLoss).toBe(false);
  });
});

// ============================================================================
// move_node
// ============================================================================

describe('move_node', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const nodeTypes = [llmMetadata];

  it('moves node to specified position', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      { type: 'move_node', nodeId: 'llm_node.1', position: { x: 500, y: 300 } },
      context
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('Moved');
    expect(result.message).toContain('500');
    expect(result.message).toContain('300');
    expect(dispatch.updateNode).toHaveBeenCalledWith('agentspec.llm_node.1', {
      position: { x: 500, y: 300 }
    });
  });

  it('supports negative coordinates', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand(
      {
        type: 'move_node',
        nodeId: 'llm_node.1',
        position: { x: -100, y: -200 }
      },
      context
    );

    expect(result.ok).toBe(true);
    expect(dispatch.updateNode).toHaveBeenCalledWith('agentspec.llm_node.1', {
      position: { x: -100, y: -200 }
    });
  });

  it('returns NODE_NOT_FOUND for missing node', () => {
    const workflow = createMockWorkflow([]);
    const context = createMockContext(workflow, nodeTypes);

    const result = executeCommand(
      { type: 'move_node', nodeId: 'llm_node.99', position: { x: 0, y: 0 } },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand(
      { type: 'move_node', nodeId: 'llm_node.1', position: { x: 0, y: 0 } },
      context
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });

  it('resolves short ID to namespaced internal ID', () => {
    const dispatch = createMockDispatch();
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand(
      { type: 'move_node', nodeId: 'llm_node.1', position: { x: 200, y: 400 } },
      context
    );

    // Should resolve short ID "llm_node.1" to full "agentspec.llm_node.1"
    expect(dispatch.updateNode).toHaveBeenCalledWith('agentspec.llm_node.1', expect.anything());
  });
});

// ============================================================================
// auto_layout
// ============================================================================

describe('executeCommand — auto_layout', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');
  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node');
  const nodeTypes = [llmMetadata, apiMetadata];

  it('applies horizontal layout to nodes', () => {
    const dispatch = createMockDispatch();
    const node1 = createMockNode('agentspec.llm_node.1', llmMetadata, {
      position: { x: 500, y: 200 }
    });
    const node2 = createMockNode('agentspec.api_node.1', apiMetadata, {
      position: { x: 600, y: 300 }
    });
    const edge = {
      id: 'e1',
      source: 'agentspec.llm_node.1',
      target: 'agentspec.api_node.1'
    } as WorkflowEdge;
    const workflow = createMockWorkflow([node1, node2], [edge]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'auto_layout' }, context);

    expect(result.ok).toBe(true);
    expect(result.message).toContain('2 nodes');
    expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);

    const updatedNodes = (dispatch.batchUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .nodes as WorkflowNode[];
    expect(updatedNodes).toHaveLength(2);
    // Nodes should have different x positions (layered)
    const positions = updatedNodes.map((n) => n.position);
    expect(positions[0].x).not.toBe(positions[1].x);
  });

  it('uses measured dimensions for size-aware layout', () => {
    const dispatch = createMockDispatch();
    const node1 = createMockNode('agentspec.llm_node.1', llmMetadata, {
      position: { x: 0, y: 0 }
    });
    const node2 = createMockNode('agentspec.api_node.1', apiMetadata, {
      position: { x: 100, y: 0 }
    });
    // Simulate measured dimensions (set by @xyflow/svelte after render)
    (node1 as { measured?: { width: number; height: number } }).measured = {
      width: 280,
      height: 200
    };
    (node2 as { measured?: { width: number; height: number } }).measured = {
      width: 220,
      height: 150
    };
    const edge = {
      id: 'e1',
      source: 'agentspec.llm_node.1',
      target: 'agentspec.api_node.1'
    } as WorkflowEdge;
    const workflow = createMockWorkflow([node1, node2], [edge]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'auto_layout' }, context);

    expect(result.ok).toBe(true);
    expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);

    const updatedNodes = (dispatch.batchUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .nodes as WorkflowNode[];
    const positions = updatedNodes.map((n) => n.position);
    // With node1 width=280 and gap=80, node2 x should be >= 360
    expect(positions[1].x - positions[0].x).toBeGreaterThanOrEqual(280 + 80);
  });

  it('handles empty workflow', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow([], []);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'auto_layout' }, context);

    expect(result.ok).toBe(true);
    expect(result.message).toContain('No nodes');
    expect(dispatch.batchUpdate).not.toHaveBeenCalled();
  });

  it('returns NO_WORKFLOW when no workflow loaded', () => {
    const context = createMockContext(null, nodeTypes);

    const result = executeCommand({ type: 'auto_layout' }, context);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_WORKFLOW');
  });

  it('starts from a real entry when an edge-less node comes first (#45)', () => {
    const dispatch = createMockDispatch();
    const note = createMockNode('agentspec.llm_node.note', llmMetadata, {
      position: { x: 0, y: 0 }
    });
    const a = createMockNode('agentspec.llm_node.a', llmMetadata, { position: { x: 300, y: 0 } });
    const b = createMockNode('agentspec.api_node.b', apiMetadata, { position: { x: 100, y: 0 } });
    const c = createMockNode('agentspec.api_node.c', apiMetadata, { position: { x: 200, y: 0 } });
    const edges = [
      { id: 'e1', source: a.id, target: b.id },
      { id: 'e2', source: b.id, target: c.id }
    ] as WorkflowEdge[];
    const context = createMockContext(
      createMockWorkflow([note, a, b, c], edges),
      nodeTypes,
      dispatch
    );

    const result = executeCommand({ type: 'auto_layout' }, context);
    expect(result.ok).toBe(true);

    const updated = (dispatch.batchUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .nodes as WorkflowNode[];
    const x = (id: string) => updated.find((n) => n.id === id)!.position.x;
    // A, B, C are left to right in three distinct columns
    expect(x(a.id)).toBeLessThan(x(b.id));
    expect(x(b.id)).toBeLessThan(x(c.id));
  });

  it('still lays out a workflow of only edge-less nodes', () => {
    const dispatch = createMockDispatch();
    const n1 = createMockNode('agentspec.llm_node.1', llmMetadata);
    const n2 = createMockNode('agentspec.llm_node.2', llmMetadata);
    const context = createMockContext(createMockWorkflow([n1, n2], []), nodeTypes, dispatch);

    const result = executeCommand({ type: 'auto_layout' }, context);
    expect(result.ok).toBe(true);
    const updated = (dispatch.batchUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .nodes as WorkflowNode[];
    expect(updated).toHaveLength(2);
  });

  it('handles disconnected nodes', () => {
    const dispatch = createMockDispatch();
    const node1 = createMockNode('agentspec.llm_node.1', llmMetadata, {
      position: { x: 0, y: 0 }
    });
    const node2 = createMockNode('agentspec.api_node.1', apiMetadata, {
      position: { x: 100, y: 0 }
    });
    // No edges — nodes are disconnected
    const workflow = createMockWorkflow([node1, node2], []);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    const result = executeCommand({ type: 'auto_layout' }, context);

    expect(result.ok).toBe(true);
    expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);

    const updatedNodes = (dispatch.batchUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .nodes as WorkflowNode[];
    expect(updatedNodes).toHaveLength(2);
  });

  it('uses batchUpdate for single undo', () => {
    const dispatch = createMockDispatch();
    const node1 = createMockNode('agentspec.llm_node.1', llmMetadata);
    const workflow = createMockWorkflow([node1]);
    const context = createMockContext(workflow, nodeTypes, dispatch);

    executeCommand({ type: 'auto_layout' }, context);

    // Should use batchUpdate (not individual updateNode calls) for single undo
    expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);
    expect(dispatch.updateNode).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Teaching errors (D7) — a failure names the valid alternatives
// ============================================================================

describe('teaching errors', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node', {
    outputs: [{ id: 'text', name: 'Text', type: 'output', dataType: 'string' }]
  });
  const apiMetadata = createMockMetadata('agentspec.api_node', 'API Node', {
    inputs: [{ id: 'body', name: 'Body', type: 'input', dataType: 'string' }]
  });
  const nodeTypes = [llmMetadata, apiMetadata];

  it('an unknown node lists the nodes in the workflow', () => {
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const context = createMockContext(createMockWorkflow([node]), nodeTypes);
    const result = executeCommand({ type: 'delete_node', nodeId: 'nope.9' }, context);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_NOT_FOUND');
    expect(result.error).toContain('llm_node.1');
  });

  it('an unknown node on an empty canvas points at add_node', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);
    const result = executeCommand({ type: 'info', nodeId: 'nope.9' }, context);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('add_node');
  });

  it('an unknown type names near misses', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);
    const result = executeCommand({ type: 'add_node', nodeTypeId: 'llm' }, context);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_TYPE_NOT_FOUND');
    expect(result.error).toContain('Did you mean: llm_node');
  });

  it('an unknown type with no near miss points at list_types', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);
    const result = executeCommand({ type: 'add_node', nodeTypeId: 'zzz' }, context);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('list_types');
  });

  it('an unknown port lists the ports on that node, both directions', () => {
    const a = createMockNode('agentspec.llm_node.1', llmMetadata);
    const b = createMockNode('agentspec.api_node.1', apiMetadata);
    const context = createMockContext(createMockWorkflow([a, b]), nodeTypes);
    const result = executeCommand(
      {
        type: 'connect',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'output',
        targetNodeId: 'api_node.1',
        targetPort: 'body'
      },
      context
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('PORT_NOT_FOUND');
    expect(result.error).toContain("'output' not found on node llm_node.1");
    expect(result.error).toContain('Its outputs: text');
    expect(result.error).toContain('its inputs: none');
  });

  it('a missing edge lists the edges leaving the source node', () => {
    const a = createMockNode('agentspec.llm_node.1', llmMetadata);
    const b = createMockNode('agentspec.api_node.1', apiMetadata);
    const edge = {
      id: 'e1',
      source: 'agentspec.llm_node.1',
      target: 'agentspec.api_node.1',
      sourceHandle: 'agentspec.llm_node.1-output-text',
      targetHandle: 'agentspec.api_node.1-input-body'
    };
    const context = createMockContext(createMockWorkflow([a, b], [edge]), nodeTypes);
    const result = executeCommand(
      {
        type: 'disconnect_ports',
        sourceNodeId: 'llm_node.1',
        sourcePort: 'text',
        targetNodeId: 'api_node.1',
        targetPort: 'nope'
      },
      context
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('EDGE_NOT_FOUND');
    expect(result.error).toContain('llm_node.1:text → api_node.1:body');
  });

  it('an unknown config key lists the keys', () => {
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const context = createMockContext(createMockWorkflow([node]), nodeTypes);
    const result = executeCommand(
      { type: 'get_config', nodeId: 'llm_node.1', key: 'nope' },
      context
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('CONFIG_KEY_NOT_FOUND');
    expect(result.error).toContain('model');
    expect(result.error).toContain('temperature');
  });
});

// ============================================================================
// describe_type / search_types / get_config without a key
// ============================================================================

describe('executeCommand — describe_type', () => {
  const http = createMockMetadata('http_request', 'HTTP Request', {
    description: 'Fetch a URL',
    category: 'integration',
    tags: ['http', 'fetch'],
    inputs: [
      { id: 'url', name: 'URL', type: 'input', dataType: 'string', required: true },
      { id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger' }
    ],
    outputs: [
      { id: 'body', name: 'Body', type: 'output', dataType: 'string', description: 'Response body' }
    ],
    configSchema: {
      type: 'object',
      required: ['method'],
      properties: {
        method: {
          type: 'string',
          title: 'Method',
          enum: ['GET', 'POST'],
          default: 'GET',
          description: 'HTTP verb'
        },
        requiresConfirmation: {
          // fddo serves this reserved key as a JSON Schema type array on purpose.
          type: ['string', 'boolean'] as unknown as 'string',
          default: 'inherit'
        }
      }
    },
    confirmation: { policy: 'ask', source: 'policy', authorControls: ['waive', 'require'] },
    can: { add: true },
    agent: { usage: 'Pair with html_to_markdown to read a page.' }
  } as Partial<NodeMetadata>);
  const nodeTypes = [http];

  it('returns ports, config schema, and the host pass-through fields', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);
    const result = executeCommand({ type: 'describe_type', nodeTypeId: 'http_request' }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').DescribeTypeResultData;
    expect(data.typeId).toBe('http_request');
    expect(data.description).toBe('Fetch a URL');
    expect(data.tags).toEqual(['http', 'fetch']);
    expect(data.inputs).toEqual([
      { portId: 'url', name: 'URL', dataType: 'string', required: true },
      { portId: 'trigger', name: 'Trigger', dataType: 'trigger' }
    ]);
    expect(data.outputs).toEqual([
      { portId: 'body', name: 'Body', dataType: 'string', description: 'Response body' }
    ]);
    expect(data.config).toEqual([
      {
        key: 'method',
        type: 'string',
        title: 'Method',
        description: 'HTTP verb',
        enum: ['GET', 'POST'],
        default: 'GET',
        required: true
      },
      { key: 'requiresConfirmation', type: ['string', 'boolean'], default: 'inherit' }
    ]);
    expect(data.confirmation).toEqual({
      policy: 'ask',
      source: 'policy',
      authorControls: ['waive', 'require']
    });
    expect(data.can).toEqual({ add: true });
    expect(data.agent).toEqual({ usage: 'Pair with html_to_markdown to read a page.' });
  });

  it('omits the pass-through fields when the host does not publish them', () => {
    const plain = createMockMetadata('agentspec.llm_node', 'LLM Node');
    const context = createMockContext(createMockWorkflow(), [plain]);
    const result = executeCommand({ type: 'describe_type', nodeTypeId: 'llm_node' }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').DescribeTypeResultData;
    expect(data).not.toHaveProperty('confirmation');
    expect(data).not.toHaveProperty('can');
    expect(data).not.toHaveProperty('agent');
    expect(data).not.toHaveProperty('description');
    expect(data.config.map((c) => c.key)).toEqual(['model', 'temperature']);
  });

  it('is NODE_TYPE_NOT_FOUND for an unknown type', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);
    const result = executeCommand({ type: 'describe_type', nodeTypeId: 'nope' }, context);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NODE_TYPE_NOT_FOUND');
  });
});

describe('executeCommand — oneOf allowed values', () => {
  // The fddo entity_query shape: one oneOf entry per entity type.
  const entityQuery = createMockMetadata('entity_query', 'Entity Query', {
    configSchema: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          title: 'Entity Type',
          description: 'The entity type to query (node, taxonomy_term, user, etc.)',
          oneOf: [
            { const: 'ai_file', title: 'AI File' },
            { const: 'block_content', title: 'Content block' },
            { const: 'node' }
          ],
          default: 'node'
        },
        both: {
          type: 'string',
          enum: ['a', 'b'],
          oneOf: [{ const: 'z', title: 'Z' }]
        },
        nested: {
          type: 'string',
          oneOf: [{ type: 'string', minLength: 1 }, { const: 'x' }]
        }
      }
    } as unknown as NodeMetadata['configSchema']
  });
  const nodeTypes = [entityQuery];

  function makeNode() {
    return createMockNode('entity_query.1', entityQuery, {
      data: { label: 'Entity Query', config: {}, metadata: entityQuery }
    });
  }

  it('describe_type reports the consts as enum, with their titles', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);
    const result = executeCommand({ type: 'describe_type', nodeTypeId: 'entity_query' }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as import('../../../src/lib/commands/types.js').DescribeTypeResultData;
    expect(data.config[0]).toEqual({
      key: 'entity_type',
      type: 'string',
      title: 'Entity Type',
      description: 'The entity type to query (node, taxonomy_term, user, etc.)',
      enum: ['ai_file', 'block_content', 'node'],
      enumTitles: { ai_file: 'AI File', block_content: 'Content block' },
      default: 'node'
    });
  });

  it('enum wins over oneOf, and a oneOf of sub-schemas is ignored', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);
    const result = executeCommand({ type: 'describe_type', nodeTypeId: 'entity_query' }, context);
    if (!result.ok) throw new Error('describe_type failed');
    const data = result.data as import('../../../src/lib/commands/types.js').DescribeTypeResultData;
    const both = data.config.find((c) => c.key === 'both')!;
    expect(both.enum).toEqual(['a', 'b']);
    expect(both).not.toHaveProperty('enumTitles');
    const nested = data.config.find((c) => c.key === 'nested')!;
    expect(nested).not.toHaveProperty('enum');
    expect(nested).not.toHaveProperty('enumTitles');
  });

  it('set_config warns for a value outside the consts, and accepts one inside', () => {
    const dispatch = createMockDispatch();
    const context = createMockContext(createMockWorkflow([makeNode()]), nodeTypes, dispatch);

    const bad = executeCommand(
      { type: 'set_config', nodeId: 'entity_query.1', key: 'entity_type', value: 'article' },
      context
    );
    expect(bad.ok).toBe(true);
    if (!bad.ok) return;
    const warnings = (bad.data as import('../../../src/lib/commands/types.js').SetConfigResultData)
      .warnings;
    expect(warnings).toHaveLength(1);
    expect(warnings![0].type).toBe('enum');
    expect(warnings![0].allowedValues).toEqual(['ai_file', 'block_content', 'node']);

    const good = executeCommand(
      { type: 'set_config', nodeId: 'entity_query.1', key: 'entity_type', value: 'ai_file' },
      context
    );
    expect(good.ok).toBe(true);
    if (!good.ok) return;
    expect(
      (good.data as import('../../../src/lib/commands/types.js').SetConfigResultData).warnings
    ).toBeUndefined();
  });

  it('set_config rejects a value outside the consts in strict mode', () => {
    const dispatch = createMockDispatch();
    const context = createMockContext(createMockWorkflow([makeNode()]), nodeTypes, dispatch);
    const result = executeCommand(
      {
        type: 'set_config',
        nodeId: 'entity_query.1',
        key: 'entity_type',
        value: 'article',
        strict: true
      },
      context
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('CONFIG_VALIDATION_ERROR');
    expect(dispatch.updateNode).not.toHaveBeenCalled();
  });

  it('set_config does not constrain a oneOf of sub-schemas', () => {
    const context = createMockContext(createMockWorkflow([makeNode()]), nodeTypes);
    const result = executeCommand(
      { type: 'set_config', nodeId: 'entity_query.1', key: 'nested', value: 'anything' },
      context
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      (result.data as import('../../../src/lib/commands/types.js').SetConfigResultData).warnings
    ).toBeUndefined();
  });
});

describe('executeCommand — search_types', () => {
  const http = createMockMetadata('http_request', 'HTTP Request', {
    description: 'Fetch a URL over HTTP',
    category: 'integration',
    tags: ['network']
  });
  const md = createMockMetadata('html_to_markdown', 'HTML to Markdown', {
    description: 'Convert HTML',
    category: 'text'
  });
  const nodeTypes = [http, md];

  it('matches id, name, description and tags case-insensitively', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);
    const ids = (q: string) => {
      const r = executeCommand({ type: 'search_types', query: q }, context);
      if (!r.ok) throw new Error(r.error);
      return (
        r.data as import('../../../src/lib/commands/types.js').SearchTypesResultData
      ).types.map((t) => t.typeId);
    };
    expect(ids('MARKDOWN')).toEqual(['html_to_markdown']);
    expect(ids('fetch')).toEqual(['http_request']);
    expect(ids('network')).toEqual(['http_request']);
    expect(ids('ht')).toEqual(['http_request', 'html_to_markdown']);
  });

  it('says so when nothing matches, and points at list_types', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);
    const result = executeCommand({ type: 'search_types', query: 'zzz' }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.data as { types: unknown[] }).types).toEqual([]);
    expect(result.message).toContain('list_types');
  });

  it('refuses a blank query instead of dumping the catalog', () => {
    const context = createMockContext(createMockWorkflow(), nodeTypes);
    const result = executeCommand({ type: 'search_types', query: '   ' }, context);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('EMPTY_QUERY');
    expect(result.error).toContain('list_types');
  });
});

describe('executeCommand — list_types carries description and tags', () => {
  it('adds description and tags only when present', () => {
    const withMeta = createMockMetadata('a', 'A', { description: 'Does A', tags: ['x'] });
    const bare = createMockMetadata('b', 'B');
    const context = createMockContext(createMockWorkflow(), [withMeta, bare]);
    const result = executeCommand({ type: 'list_types' }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as ListTypesResultData;
    expect(data.types[0]).toEqual({
      typeId: 'a',
      name: 'A',
      category: 'ai',
      description: 'Does A',
      tags: ['x']
    });
    expect(data.types[1]).toEqual({ typeId: 'b', name: 'B', category: 'ai' });
  });
});

describe('executeCommand — get_config with the schema', () => {
  const llmMetadata = createMockMetadata('agentspec.llm_node', 'LLM Node');

  it('without a key returns every value and the schema', () => {
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const context = createMockContext(createMockWorkflow([node]), [llmMetadata]);
    const result = executeCommand({ type: 'get_config', nodeId: 'llm_node.1' }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as GetConfigResultData;
    if ('key' in data) throw new Error('expected the all-values shape');
    expect(data.values).toEqual({ model: 'gpt-4', temperature: 0.7 });
    expect(data.schema).toEqual([
      { key: 'model', type: 'string', default: 'gpt-4' },
      { key: 'temperature', type: 'number', default: 0.7 }
    ]);
    expect(data).not.toHaveProperty('key');
  });

  it("with a key returns the value and that key's schema entry", () => {
    const node = createMockNode('agentspec.llm_node.1', llmMetadata);
    const context = createMockContext(createMockWorkflow([node]), [llmMetadata]);
    const result = executeCommand(
      { type: 'get_config', nodeId: 'llm_node.1', key: 'model' },
      context
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as GetConfigResultData;
    if (!('key' in data)) throw new Error('expected the single-key shape');
    expect(data.value).toBe('gpt-4');
    expect(data.schema).toEqual({ key: 'model', type: 'string', default: 'gpt-4' });
  });

  it('a declared key with no value yet reads as undefined, not CONFIG_KEY_NOT_FOUND', () => {
    const node = createMockNode('agentspec.llm_node.1', llmMetadata, {
      data: { label: 'LLM', config: {}, metadata: llmMetadata }
    } as Partial<WorkflowNode>);
    const context = createMockContext(createMockWorkflow([node]), [llmMetadata]);
    const result = executeCommand(
      { type: 'get_config', nodeId: 'llm_node.1', key: 'model' },
      context
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as GetConfigResultData;
    if (!('key' in data)) throw new Error('expected the single-key shape');
    expect(data.value).toBeUndefined();
    expect(data.schema).toEqual({ key: 'model', type: 'string', default: 'gpt-4' });
  });
});

describe('executeCommand — locked editor', () => {
  const meta = createMockMetadata('llm_node', 'LLM');
  const lockedContext = () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow([createMockNode('n1', meta)]);
    return {
      dispatch,
      context: { ...createMockContext(workflow, [meta], dispatch), isLocked: () => true }
    };
  };

  it('refuses a change with the LOCKED code and touches nothing', () => {
    const { dispatch, context } = lockedContext();
    const result = executeCommand({ type: 'delete_node', nodeId: 'n1' } as Command, context);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('LOCKED');
    expect(dispatch.removeNode).not.toHaveBeenCalled();
  });

  it('lets a dry run through: it changes nothing', () => {
    const { context } = lockedContext();
    const dry = executeCommand({ type: 'beautify_layout', dryRun: true } as Command, context);
    if (!dry.ok) expect(dry.code).not.toBe('LOCKED');
    const real = executeCommand({ type: 'beautify_layout' } as Command, context);
    expect(!real.ok && real.code).toBe('LOCKED');
  });

  it('does not let dryRun on another command through', () => {
    const { dispatch, context } = lockedContext();
    const result = executeCommand(
      { type: 'delete_node', nodeId: 'n1', dryRun: true } as unknown as Command,
      context
    );
    expect(!result.ok && result.code).toBe('LOCKED');
    expect(dispatch.removeNode).not.toHaveBeenCalled();
  });

  it('still runs reads and view commands', () => {
    const { context } = lockedContext();
    expect(executeCommand({ type: 'list_nodes' } as Command, context).ok).toBe(true);
    const view = executeCommand({ type: 'select_node', nodeId: 'n1' } as Command, context);
    if (!view.ok) expect(view.code).not.toBe('LOCKED');
  });

  it('behaves as before when the context says nothing about locking', () => {
    const dispatch = createMockDispatch();
    const workflow = createMockWorkflow([createMockNode('n1', meta)]);
    const result = executeCommand(
      { type: 'delete_node', nodeId: 'n1' } as Command,
      createMockContext(workflow, [meta], dispatch)
    );
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// Editor parity: interface, ports, duplicate, workflow, playground
// ============================================================================

describe('editor parity commands', () => {
  const llmType = createMockMetadata('agentspec.llm_node', 'LLM Node', {
    inputs: [
      { id: 'prompt', name: 'Prompt', type: 'input', dataType: 'string', required: true },
      { id: 'ctx', name: 'Context', type: 'input', dataType: 'array', description: 'Extra rows' }
    ],
    outputs: [
      { id: 'text', name: 'Text', type: 'output', dataType: 'string' },
      { id: 'raw', name: 'Raw', type: 'output', dataType: 'object' },
      { id: 'sticky', name: 'Sticky', type: 'output', dataType: 'string', exposureLocked: true }
    ]
  });
  const echoType = createMockMetadata('agentspec.echo', 'Echo', {
    inputs: [{ id: 'message', name: 'Message', type: 'input', dataType: 'string' }],
    outputs: [{ id: 'message', name: 'Message', type: 'output', dataType: 'string' }]
  });
  const types = [llmType, echoType];
  const LLM = 'agentspec.llm_node.1';
  const ECHO = 'agentspec.echo.1';

  const handle = (node: string, dir: 'input' | 'output', port: string) => `${node}-${dir}-${port}`;

  function wf(extra: Partial<Workflow> = {}): Workflow {
    return {
      ...createMockWorkflow(
        [createMockNode(LLM, llmType), createMockNode(ECHO, echoType)],
        [
          {
            id: 'e1',
            source: LLM,
            target: ECHO,
            sourceHandle: handle(LLM, 'output', 'text'),
            targetHandle: handle(ECHO, 'input', 'message')
          } as WorkflowEdge
        ]
      ),
      ...extra
    };
  }

  function setup(workflow: Workflow, extra: Partial<CommandContext> = {}) {
    const dispatch = createMockDispatch();
    dispatch.editInterface = vi.fn();
    const context: CommandContext = {
      ...createMockContext(workflow, types, dispatch),
      ...extra
    };
    const run = (command: Command) => executeCommand(command, context);
    return { dispatch, context, run };
  }

  const errorOf = (result: ReturnType<typeof executeCommand>) => {
    expect(result.ok).toBe(false);
    return result as Extract<typeof result, { ok: false }>;
  };

  const boundInput = (extra: Record<string, unknown> = {}) => ({
    id: 'q',
    dataType: 'string',
    bindings: [{ nodeId: LLM, portId: 'prompt' }],
    ...extra
  });

  // --------------------------------------------------------------------------
  describe('interface list', () => {
    it('reports entries with short node ids and the resolved status', () => {
      const { run } = setup(
        wf({
          interface: {
            inputs: [boundInput({ required: true, turn: 'message' })],
            outputs: [{ id: 'free', dataType: 'string', bindings: [] }]
          }
        })
      );
      const result = run({ type: 'interface_list' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const data =
        result.data as import('../../../src/lib/commands/types.js').InterfaceListResultData;
      expect(data.inputs[0]).toMatchObject({
        id: 'q',
        dataType: 'string',
        required: true,
        turn: 'message',
        status: 'ok',
        bindings: [{ nodeId: 'llm_node.1', port: 'prompt' }]
      });
      expect(data.outputs[0]).toMatchObject({ id: 'free', status: 'unbound', bindings: [] });
      expect(result.message).toContain('q (string) -> llm_node.1:prompt');
    });

    it('says none for an empty interface', () => {
      const result = setup(wf()).run({ type: 'interface_list' });
      expect(result.ok && result.message).toContain('Inputs: none');
    });
  });

  // --------------------------------------------------------------------------
  describe('interface expose', () => {
    it('publishes an output port under its own id, taking type and name from the port', () => {
      const { dispatch, run } = setup(wf());
      const result = run({ type: 'interface_expose', nodeId: 'llm_node.1', port: 'raw' });
      expect(result.ok).toBe(true);
      expect(dispatch.editInterface).toHaveBeenCalledTimes(1);
      const [next, edit] = (dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(edit).toBeUndefined();
      expect(next.outputs).toEqual([
        expect.objectContaining({
          id: 'raw',
          dataType: 'object',
          name: 'Raw',
          bindings: [{ nodeId: LLM, portId: 'raw' }]
        })
      ]);
      expect(next.inputs).toBeUndefined();
    });

    it('takes the id from `as`', () => {
      const { dispatch, run } = setup(wf());
      run({ type: 'interface_expose', nodeId: 'llm_node.1', port: 'prompt', id: 'question' });
      const [next] = (dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(next.inputs[0]).toMatchObject({ id: 'question', dataType: 'string' });
    });

    it('refuses a taken id and suggests `as`', () => {
      const { dispatch, run } = setup(
        wf({ interface: { outputs: [{ id: 'raw', dataType: 'string', bindings: [] }] } })
      );
      const err = errorOf(run({ type: 'interface_expose', nodeId: 'llm_node.1', port: 'raw' }));
      expect(err.code).toBe('INVALID_ARGUMENT');
      expect(err.error).toContain('as <id>');
      expect(dispatch.editInterface).not.toHaveBeenCalled();
    });

    it('refuses an input that already has an incoming edge', () => {
      const { dispatch, run } = setup(wf());
      const err = errorOf(
        run({ type: 'interface_expose', nodeId: 'echo.1', port: 'message', side: 'input' })
      );
      expect(err.error).toContain('incoming edge');
      expect(dispatch.editInterface).not.toHaveBeenCalled();
    });

    it('asks which side when the port id exists on both', () => {
      const { run } = setup(wf());
      const err = errorOf(run({ type: 'interface_expose', nodeId: 'echo.1', port: 'message' }));
      expect(err.error).toContain('both sides');
      const ok = run({
        type: 'interface_expose',
        nodeId: 'echo.1',
        port: 'message',
        side: 'output'
      });
      expect(ok.ok).toBe(true);
    });

    it('refuses a port that is already published', () => {
      const { run } = setup(wf({ interface: { inputs: [boundInput()] } }));
      const err = errorOf(run({ type: 'interface_expose', nodeId: 'llm_node.1', port: 'prompt' }));
      expect(err.error).toContain("already published as input 'q'");
    });

    it('refuses an unknown node and an unknown port', () => {
      const { run } = setup(wf());
      expect(errorOf(run({ type: 'interface_expose', nodeId: 'nope.1', port: 'x' })).code).toBe(
        'NODE_NOT_FOUND'
      );
      expect(
        errorOf(run({ type: 'interface_expose', nodeId: 'llm_node.1', port: 'nope' })).code
      ).toBe('PORT_NOT_FOUND');
    });

    it('refuses a port hidden on the canvas', () => {
      const hidden = createMockNode(LLM, llmType, {
        data: {
          label: 'LLM Node',
          metadata: llmType,
          config: { ports: { outputs: [{ id: 'raw', exposed: false }] } }
        }
      } as Partial<WorkflowNode>);
      const { run } = setup({ ...wf(), nodes: [hidden, createMockNode(ECHO, echoType)] });
      const err = errorOf(run({ type: 'interface_expose', nodeId: 'llm_node.1', port: 'raw' }));
      expect(err.error).toContain('cannot be published');
    });
  });

  // --------------------------------------------------------------------------
  describe('interface add / remove / rename', () => {
    it('adds an unbound custom entry and says it is unbound', () => {
      const { dispatch, run } = setup(wf());
      const result = run({
        type: 'interface_add',
        side: 'input',
        id: 'topic',
        dataType: 'string'
      });
      expect(result.ok && result.message).toContain('unbound');
      const [next] = (dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(next.inputs).toEqual([{ id: 'topic', dataType: 'string', bindings: [] }]);
    });

    it('allows an entry with no data type and warns about an unknown one', () => {
      const { run } = setup(wf());
      const plain = run({ type: 'interface_add', side: 'output', id: 'o' });
      expect(plain.ok).toBe(true);
      const odd = run({ type: 'interface_add', side: 'output', id: 'p', dataType: 'strng' });
      expect(odd.ok && odd.message).toContain('not a built-in data type');
    });

    it('refuses a duplicate or empty id, per side', () => {
      const { run } = setup(wf({ interface: { inputs: [boundInput()] } }));
      expect(errorOf(run({ type: 'interface_add', side: 'input', id: 'q' })).error).toContain(
        'already taken'
      );
      expect(run({ type: 'interface_add', side: 'output', id: 'q' }).ok).toBe(true);
      expect(errorOf(run({ type: 'interface_add', side: 'input', id: '  ' })).error).toContain(
        'must not be empty'
      );
    });

    it.each([
      ['Total', 'lowercase letters, digits'],
      ['my.query', 'lowercase letters, digits'],
      ['a b', 'lowercase letters, digits'],
      ['__interrupt_id__', 'reserved by the runtime']
    ])('refuses add, rename and expose with the id %j', (id, reason) => {
      const { run } = setup(wf({ interface: { inputs: [boundInput()] } }));
      expect(errorOf(run({ type: 'interface_add', side: 'output', id })).error).toContain(reason);
      expect(
        errorOf(run({ type: 'interface_rename', side: 'input', id: 'q', newId: id })).error
      ).toContain(reason);
      const fresh = setup(wf({ interface: { inputs: [] } })).run;
      expect(
        errorOf(fresh({ type: 'interface_expose', nodeId: 'llm_node.1', port: 'prompt', id })).error
      ).toContain(reason);
    });

    it('names the rule when an id is refused', () => {
      const { run } = setup(wf({ interface: { inputs: [boundInput()] } }));
      expect(errorOf(run({ type: 'interface_add', side: 'output', id: 'Total' })).error).toContain(
        'R4.a'
      );
    });

    it('removes an entry; removing an input reports the id edit for the chat binding', () => {
      const { dispatch, run } = setup(wf({ interface: { inputs: [boundInput()] } }));
      expect(run({ type: 'interface_remove', side: 'input', id: 'q' }).ok).toBe(true);
      const [next, edit] = (dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(next).toEqual({ inputs: undefined, outputs: undefined });
      expect(edit).toEqual({ kind: 'remove', id: 'q' });
    });

    it('names the existing ids when the entry is not found', () => {
      const { run } = setup(wf({ interface: { inputs: [boundInput()] } }));
      const err = errorOf(run({ type: 'interface_remove', side: 'input', id: 'zzz' }));
      expect(err.error).toContain('q');
    });

    it('renames an entry and reports the rename edit for an input only', () => {
      const { dispatch, run } = setup(
        wf({
          interface: {
            inputs: [boundInput()],
            outputs: [{ id: 'o', dataType: 'string', bindings: [] }]
          }
        })
      );
      run({ type: 'interface_rename', side: 'input', id: 'q', newId: 'question' });
      run({ type: 'interface_rename', side: 'output', id: 'o', newId: 'out' });
      const calls = (dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0].inputs[0].id).toBe('question');
      expect(calls[0][1]).toEqual({ kind: 'rename', id: 'q', to: 'question' });
      expect(calls[1][1]).toBeUndefined();
    });

    it('refuses to rename onto a taken id', () => {
      const { run } = setup(
        wf({
          interface: {
            inputs: [boundInput(), { id: 'r', dataType: 'string', bindings: [] }]
          }
        })
      );
      expect(
        errorOf(run({ type: 'interface_rename', side: 'input', id: 'q', newId: 'r' })).error
      ).toContain('already taken');
    });
  });

  // --------------------------------------------------------------------------
  describe('interface bind / unbind', () => {
    const draft = (dataType = '') =>
      wf({ interface: { inputs: [{ id: 'q', dataType, bindings: [] }] } });

    it('binds and fills an empty data type from the port', () => {
      const { dispatch, run } = setup(draft());
      const result = run({
        type: 'interface_bind',
        side: 'input',
        id: 'q',
        target: { nodeId: 'llm_node.1', port: 'prompt' }
      });
      expect(result.ok).toBe(true);
      const [next] = (dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(next.inputs[0]).toEqual({
        id: 'q',
        dataType: 'string',
        bindings: [{ nodeId: LLM, portId: 'prompt' }]
      });
    });

    it('keeps a declared type and only warns when the lane disagrees', () => {
      const { dispatch, run } = setup(draft('number'));
      const result = run({
        type: 'interface_bind',
        side: 'input',
        id: 'q',
        target: { nodeId: 'llm_node.1', port: 'prompt' }
      });
      expect(result.ok && result.message).toContain('declared number');
      const [next] = (dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(next.inputs[0].dataType).toBe('number');
    });

    it('warns when the input port already has an incoming edge', () => {
      const { run } = setup(
        wf({ interface: { inputs: [{ id: 'm', dataType: 'string', bindings: [] }] } })
      );
      const result = run({
        type: 'interface_bind',
        side: 'input',
        id: 'm',
        target: { nodeId: 'echo.1', port: 'message' }
      });
      expect(result.ok && result.message).toContain('incoming edge');
    });

    it('refuses a hidden port, an unknown port and an unknown node', () => {
      const hidden = createMockNode(LLM, llmType, {
        data: {
          label: 'LLM Node',
          metadata: llmType,
          config: { ports: { inputs: [{ id: 'ctx', exposed: false }] } }
        }
      } as Partial<WorkflowNode>);
      const { run } = setup({ ...draft(), nodes: [hidden, createMockNode(ECHO, echoType)] });
      const bind = (nodeId: string, port: string) =>
        run({ type: 'interface_bind', side: 'input', id: 'q', target: { nodeId, port } });
      expect(errorOf(bind('llm_node.1', 'ctx')).error).toContain('hidden');
      expect(errorOf(bind('llm_node.1', 'zzz')).code).toBe('PORT_NOT_FOUND');
      expect(errorOf(bind('zzz.1', 'x')).code).toBe('NODE_NOT_FOUND');
    });

    it('unbinds', () => {
      const { dispatch, run } = setup(wf({ interface: { inputs: [boundInput()] } }));
      const result = run({ type: 'interface_bind', side: 'input', id: 'q', target: null });
      expect(result.ok).toBe(true);
      const [next] = (dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(next.inputs[0].bindings).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  describe('interface set', () => {
    const set = (field: string, value: string, side: 'input' | 'output' = 'input', extra = {}) =>
      ({ type: 'interface_set', side, id: 'q', field, value, ...extra }) as Command;
    const entry = (e: Record<string, unknown> = {}) =>
      wf({
        interface: {
          inputs: [boundInput(e)],
          outputs: [{ id: 'o', dataType: 'string', bindings: [] }]
        }
      });
    const written = (d: CommandDispatch) =>
      (d.editInterface as ReturnType<typeof vi.fn>).mock.calls[0][0];

    it('sets name and description as text and clears them when empty', () => {
      const { dispatch, run } = setup(entry({ name: 'Old', description: 'Old text' }));
      expect(run(set('name', '"New name"')).ok).toBe(true);
      expect(written(dispatch).inputs[0].name).toBe('New name');
      for (const token of ['none', 'NONE', '""']) {
        const cleared = setup(entry({ name: 'Old' }));
        expect(cleared.run(set('name', token)).ok).toBe(true);
        expect('name' in written(cleared.dispatch).inputs[0]).toBe(false);
      }
      const nulled = setup(entry({ description: 'x' }));
      nulled.run(set('description', 'none'));
      expect('description' in written(nulled.dispatch).inputs[0]).toBe(false);
    });

    it('never clears on a missing value, and the quoted word none stays text', () => {
      const { dispatch, run } = setup(entry({ name: 'Old' }));
      const refused = errorOf(run(set('name', '')));
      expect(refused.code).toBe('INVALID_ARGUMENT');
      expect(refused.error).toContain('none');
      expect(dispatch.editInterface).not.toHaveBeenCalled();
      run(set('name', '"none"'));
      expect(written(dispatch).inputs[0].name).toBe('none');
    });

    it('writes nothing, and makes no undo step, when the value is already there', () => {
      const { dispatch, run } = setup(entry({ name: 'Same' }));
      const result = run(set('name', 'Same'));
      expect(result.ok && result.message).toContain('already');
      expect(dispatch.editInterface).not.toHaveBeenCalled();
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('keeps a bare number as text for a text field', () => {
      const { dispatch, run } = setup(entry());
      run(set('name', '42'));
      expect(written(dispatch).inputs[0].name).toBe('42');
    });

    it('sets dataType, refuses to clear it and warns on an unknown one', () => {
      const { dispatch, run } = setup(entry());
      expect(run(set('dataType', 'number')).ok).toBe(true);
      expect(written(dispatch).inputs[0].dataType).toBe('number');
      expect(errorOf(run(set('dataType', 'none'))).error).toContain('cannot be cleared');
      const odd = run(set('dataType', 'strng'));
      expect(odd.ok && odd.message).toContain('not a built-in');
    });

    it('sets required on inputs only, and drops the key when false', () => {
      const { dispatch, run } = setup(entry());
      run(set('required', 'true'));
      expect(written(dispatch).inputs[0].required).toBe(true);
      const off = setup(entry({ required: true }));
      off.run(set('required', 'false'));
      expect('required' in written(off.dispatch).inputs[0]).toBe(false);
      expect(errorOf(run(set('required', 'true', 'output', { id: 'o' }))).error).toContain(
        'inputs only'
      );
      expect(errorOf(run(set('required', 'maybe'))).error).toContain('true or false');
    });

    it('parses the default like set does and clears it with none', () => {
      const { dispatch, run } = setup(entry());
      run(set('default', '{"a":1}'));
      expect(written(dispatch).inputs[0].defaultValue).toEqual({ a: 1 });
      const cleared = setup(entry({ defaultValue: 5 }));
      cleared.run(set('default', 'none'));
      expect('defaultValue' in written(cleared.dispatch).inputs[0]).toBe(false);
    });

    it('takes examples as a list on inputs and refuses anything else', () => {
      const { dispatch, run } = setup(entry());
      run(set('examples', '["a","b"]'));
      expect(written(dispatch).inputs[0].examples).toEqual(['a', 'b']);
      expect(errorOf(run(set('examples', 'a'))).error).toContain('JSON list');
      expect(errorOf(run(set('examples', '[1]', 'output', { id: 'o' }))).error).toContain(
        'inputs only'
      );
    });

    it('no longer sets the deprecated turn or limit', () => {
      const { dispatch, run } = setup(entry());
      for (const field of ['turn', 'limit']) {
        expect(errorOf(run(set(field, 'message'))).error).toContain('Unknown field');
      }
      expect(dispatch.editInterface).not.toHaveBeenCalled();
    });

    it('accepts a """ block through the parser as a plain string', () => {
      const { dispatch, run } = setup(entry());
      const parsed = parseCommand('interface set input q:description """line 1\nline 2"""');
      expect(parsed.ok).toBe(true);
      if (parsed.ok) run(parsed.command);
      expect(written(dispatch).inputs[0].description).toBe('line 1\nline 2');
    });

    it('refuses an unknown entry', () => {
      const { run } = setup(entry());
      expect(errorOf(run(set('name', 'x', 'input', { id: 'zzz' }))).code).toBe('INVALID_ARGUMENT');
    });
  });

  // --------------------------------------------------------------------------
  describe('interface pull / move', () => {
    it('pulls name, type, description and required from the bound port', () => {
      const { dispatch, run } = setup(
        wf({
          interface: {
            inputs: [
              {
                id: 'c',
                name: 'Mine',
                dataType: 'string',
                bindings: [{ nodeId: LLM, portId: 'ctx' }]
              }
            ]
          }
        })
      );
      expect(run({ type: 'interface_pull', side: 'input', id: 'c' }).ok).toBe(true);
      const [next] = (dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(next.inputs[0]).toMatchObject({
        id: 'c',
        name: 'Context',
        dataType: 'array',
        description: 'Extra rows'
      });
    });

    it('refuses to pull for an unbound entry', () => {
      const { run } = setup(
        wf({ interface: { inputs: [{ id: 'q', dataType: '', bindings: [] }] } })
      );
      expect(errorOf(run({ type: 'interface_pull', side: 'input', id: 'q' })).error).toContain(
        'not bound'
      );
    });

    it('moves an entry to a 1-based position and refuses an out-of-range one', () => {
      const three = ['a', 'b', 'c'].map((id) => ({ id, dataType: 'string', bindings: [] }));
      const { dispatch, run } = setup(wf({ interface: { inputs: three } }));
      expect(run({ type: 'interface_move', side: 'input', id: 'c', position: 1 }).ok).toBe(true);
      const [next] = (dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(next.inputs.map((e: { id: string }) => e.id)).toEqual(['c', 'a', 'b']);
      for (const position of [0, 4]) {
        expect(
          errorOf(run({ type: 'interface_move', side: 'input', id: 'a', position })).error
        ).toContain('out of range');
      }
    });
  });

  describe('interface writes', () => {
    it('always go through editInterface, so the chat binding follows an id edit', () => {
      const { dispatch, run } = setup(wf());
      run({ type: 'interface_add', side: 'input', id: 'q' });
      expect(dispatch.editInterface).toHaveBeenCalledWith(
        { inputs: [{ id: 'q', dataType: '', bindings: [] }], outputs: undefined },
        undefined
      );
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('without editInterface (a 2.18 dispatch), write through batchUpdate with the chat following', () => {
      const { dispatch, run } = setup(
        wf({
          interface: { inputs: [{ id: 'q', dataType: 'string', bindings: [] }] },
          playground: { chat: { message: 'q' } as never }
        })
      );
      delete (dispatch as { editInterface?: unknown }).editInterface;
      expect(run({ type: 'interface_rename', side: 'input', id: 'q', newId: 'question' }).ok).toBe(
        true
      );
      const [update] = (dispatch.batchUpdate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(update.interface.inputs[0].id).toBe('question');
      expect(update.playground.chat.message).toBe('question');
    });

    it('report the chat edit for a rename or a removal unless another input keeps the id', () => {
      const twins = wf({
        interface: {
          inputs: [
            { id: 'q', dataType: 'string', bindings: [] },
            { id: 'q', dataType: 'string', bindings: [] }
          ]
        }
      });
      const kept = setup(twins);
      kept.run({ type: 'interface_remove', side: 'input', id: 'q' });
      expect(
        (kept.dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0][1]
      ).toBeUndefined();
      const gone = setup(
        wf({ interface: { inputs: [{ id: 'q', dataType: 'string', bindings: [] }] } })
      );
      gone.run({ type: 'interface_remove', side: 'input', id: 'q' });
      expect((gone.dispatch.editInterface as ReturnType<typeof vi.fn>).mock.calls[0][1]).toEqual({
        kind: 'remove',
        id: 'q'
      });
    });

    it('refuse an id with a space, so every verb can address it', () => {
      const { dispatch, run } = setup(
        wf({ interface: { inputs: [{ id: 'q', dataType: 'string', bindings: [] }] } })
      );
      expect(
        errorOf(run({ type: 'interface_add', side: 'input', id: 'my question' })).error
      ).toContain('lowercase letters');
      expect(
        errorOf(run({ type: 'interface_rename', side: 'input', id: 'q', newId: 'my question' }))
          .error
      ).toContain('lowercase letters');
      expect(dispatch.editInterface).not.toHaveBeenCalled();
    });

    it('make no write and no undo step when the edit changes nothing', () => {
      const { dispatch, run } = setup(
        wf({
          interface: {
            inputs: [
              { id: 'a', dataType: 'string', bindings: [] },
              { id: 'b', dataType: 'string', bindings: [{ nodeId: LLM, portId: 'prompt' }] }
            ]
          }
        })
      );
      for (const command of [
        { type: 'interface_rename', side: 'input', id: 'a', newId: 'a' },
        { type: 'interface_bind', side: 'input', id: 'a', target: null },
        { type: 'interface_bind', side: 'input', id: 'b', target: { nodeId: LLM, port: 'prompt' } },
        { type: 'interface_move', side: 'input', id: 'a', position: 1 }
      ] as Command[]) {
        const result = run(command);
        expect(result.ok && result.message).toMatch(/already/);
      }
      expect(dispatch.editInterface).not.toHaveBeenCalled();
    });
  });

  describe('locked editor', () => {
    it('refuses every new mutation with LOCKED and still runs the reads', () => {
      const { dispatch, run } = setup(wf({ playground: { chat: null } }), { isLocked: () => true });
      const mutations: Command[] = [
        { type: 'interface_expose', nodeId: 'llm_node.1', port: 'raw' },
        { type: 'interface_add', side: 'input', id: 'q' },
        { type: 'interface_remove', side: 'input', id: 'q' },
        { type: 'interface_rename', side: 'input', id: 'q', newId: 'r' },
        { type: 'interface_bind', side: 'input', id: 'q', target: null },
        { type: 'interface_set', side: 'input', id: 'q', field: 'name', value: 'x' },
        { type: 'interface_pull', side: 'input', id: 'q' },
        { type: 'interface_move', side: 'input', id: 'q', position: 1 },
        { type: 'ports_exposure', nodeId: 'llm_node.1', mode: 'hide' },
        { type: 'ports_move', nodeId: 'llm_node.1', port: 'text', position: 1 },
        { type: 'duplicate_node', nodeId: 'llm_node.1' },
        { type: 'workflow_set', field: 'name', value: 'x' },
        { type: 'playground_chat', edit: { kind: 'off' } }
      ];
      for (const command of mutations) {
        const err = errorOf(run(command));
        expect(err.code, command.type).toBe('LOCKED');
      }
      expect(dispatch.editInterface).not.toHaveBeenCalled();
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
      expect(dispatch.updateNode).not.toHaveBeenCalled();
      expect(dispatch.addNode).not.toHaveBeenCalled();
      for (const type of ['interface_list', 'workflow_get', 'playground_get'] as const) {
        expect(run({ type }).ok, type).toBe(true);
      }
      expect(run({ type: 'ports_list', nodeId: 'llm_node.1' }).ok).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  describe('ports', () => {
    const configWritten = (d: CommandDispatch, call = 0) =>
      (d.updateNode as ReturnType<typeof vi.fn>).mock.calls[call][1].data.config;

    it('lists ports with exposure and the reason a shown port cannot be hidden', () => {
      const { run } = setup(wf({ interface: { inputs: [boundInput()] } }));
      const result = run({ type: 'ports_list', nodeId: 'llm_node.1' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const ports = (
        result.data as import('../../../src/lib/commands/types.js').PortsListResultData
      ).ports;
      const by = (side: string, id: string) => ports.find((p) => p.side === side && p.port === id);
      expect(by('input', 'prompt')).toMatchObject({ exposed: true, hideBlock: 'published' });
      expect(by('output', 'text')).toMatchObject({ exposed: true, hideBlock: 'wired' });
      expect(by('output', 'sticky')).toMatchObject({ exposed: true, hideBlock: 'locked' });
      expect(by('output', 'raw')).toMatchObject({ exposed: true });
      expect(by('output', 'raw')?.hideBlock).toBeUndefined();
    });

    it('hides the unconnected ports of a node in one write and keeps the others', () => {
      const { dispatch, run } = setup(wf({ interface: { inputs: [boundInput()] } }));
      const result = run({ type: 'ports_exposure', nodeId: 'llm_node.1', mode: 'hide' });
      expect(result.ok).toBe(true);
      expect(dispatch.updateNode).toHaveBeenCalledTimes(1);
      const config = configWritten(dispatch);
      const hidden = [...(config.ports.inputs ?? []), ...(config.ports.outputs ?? [])]
        .filter((e: { exposed?: boolean }) => e.exposed === false)
        .map((e: { id: string }) => e.id);
      // prompt is published, text is wired, sticky is locked: only ctx and raw go.
      expect(hidden.sort()).toEqual(['ctx', 'raw']);
      expect(config.model).toBe('gpt-4');
    });

    it('does not write when there is nothing to hide or show', () => {
      const { dispatch, run } = setup(wf());
      const show = run({ type: 'ports_exposure', nodeId: 'llm_node.1', mode: 'show' });
      expect(show.ok && show.message).toContain('no hidden port');
      expect(dispatch.updateNode).not.toHaveBeenCalled();
    });

    it('shows every hidden port and drops the `ports` key when no override is left', () => {
      const node = createMockNode(LLM, llmType, {
        data: {
          label: 'LLM Node',
          metadata: llmType,
          config: {
            model: 'gpt-4',
            ports: {
              inputs: [{ id: 'prompt' }, { id: 'ctx', exposed: false }],
              outputs: [{ id: 'text' }, { id: 'raw', exposed: false }, { id: 'sticky' }]
            }
          }
        }
      } as Partial<WorkflowNode>);
      const { dispatch, run } = setup({ ...wf(), nodes: [node, createMockNode(ECHO, echoType)] });
      expect(run({ type: 'ports_exposure', nodeId: 'llm_node.1', mode: 'show' }).ok).toBe(true);
      const config = configWritten(dispatch);
      expect('ports' in config).toBe(false);
      expect(config.model).toBe('gpt-4');
    });

    it('hides a single port', () => {
      const { dispatch, run } = setup(wf());
      const result = run({
        type: 'ports_exposure',
        nodeId: 'llm_node.1',
        mode: 'hide',
        port: 'raw'
      });
      expect(result.ok).toBe(true);
      expect(configWritten(dispatch).ports.outputs).toContainEqual({ id: 'raw', exposed: false });
    });

    it('refuses to hide a wired, a published and a locked port, with the reason', () => {
      const { dispatch, run } = setup(wf({ interface: { inputs: [boundInput()] } }));
      const hide = (port: string) =>
        errorOf(run({ type: 'ports_exposure', nodeId: 'llm_node.1', mode: 'hide', port }));
      expect(hide('text').error).toContain('1 wire(s)');
      expect(hide('prompt').error).toContain("published on the interface as 'q'");
      expect(hide('sticky').error).toContain('always shown');
      expect(dispatch.updateNode).not.toHaveBeenCalled();
    });

    it('treats an already hidden / already shown port as a no-op', () => {
      const { dispatch, run } = setup(wf());
      const shown = run({
        type: 'ports_exposure',
        nodeId: 'llm_node.1',
        mode: 'show',
        port: 'raw'
      });
      expect(shown.ok && shown.message).toContain('already shown');
      expect(dispatch.updateNode).not.toHaveBeenCalled();
    });

    it('shows a single hidden port', () => {
      const node = createMockNode(LLM, llmType, {
        data: {
          label: 'LLM Node',
          metadata: llmType,
          config: { ports: { outputs: [{ id: 'text' }, { id: 'raw', exposed: false }] } }
        }
      } as Partial<WorkflowNode>);
      const { dispatch, run } = setup({ ...wf(), nodes: [node, createMockNode(ECHO, echoType)] });
      expect(
        run({ type: 'ports_exposure', nodeId: 'llm_node.1', mode: 'show', port: 'raw' }).ok
      ).toBe(true);
      expect('ports' in configWritten(dispatch)).toBe(false);
    });

    it('asks for the side when a port id exists on both', () => {
      const { run } = setup(wf());
      const err = errorOf(
        run({ type: 'ports_exposure', nodeId: 'echo.1', mode: 'hide', port: 'message' })
      );
      expect(err.error).toContain('both sides');
    });

    it('reorders a port within its side, 1-based', () => {
      const { dispatch, run } = setup(wf());
      expect(
        run({ type: 'ports_move', nodeId: 'llm_node.1', port: 'sticky', position: 1 }).ok
      ).toBe(true);
      expect(configWritten(dispatch).ports.outputs.map((e: { id: string }) => e.id)).toEqual([
        'sticky',
        'text',
        'raw'
      ]);
      const bad = errorOf(
        run({ type: 'ports_move', nodeId: 'llm_node.1', port: 'text', position: 9 })
      );
      expect(bad.error).toContain('out of range');
    });

    it('refuses an unknown node and an unknown port', () => {
      const { run } = setup(wf());
      expect(errorOf(run({ type: 'ports_list', nodeId: 'zzz.1' })).code).toBe('NODE_NOT_FOUND');
      expect(
        errorOf(run({ type: 'ports_move', nodeId: 'llm_node.1', port: 'zzz', position: 1 })).code
      ).toBe('PORT_NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  describe('duplicate', () => {
    it('copies the node with its label, a cloned config and a free id, offset two grid cells', () => {
      const { dispatch, run } = setup(wf());
      const result = run({ type: 'duplicate_node', nodeId: 'llm_node.1' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toMatchObject({ nodeId: 'llm_node.2', sourceNodeId: 'llm_node.1' });
      const added = (dispatch.addNode as ReturnType<typeof vi.fn>).mock.calls[0][0] as WorkflowNode;
      expect(added.id).toBe('agentspec.llm_node.2');
      expect(added.position).toEqual({ x: 140, y: 140 });
      expect(added.data.label).toBe('LLM Node');
      expect(added.data.config).toEqual({ model: 'gpt-4', temperature: 0.7 });
      const source = wf().nodes[0];
      expect(added.data.config).not.toBe(source.data.config);
    });

    it('follows the editor grid setting', () => {
      const { dispatch, run } = setup(wf(), { layoutGaps: { gapX: 120, gapY: 40, gridSize: 10 } });
      run({ type: 'duplicate_node', nodeId: 'llm_node.1' });
      const added = (dispatch.addNode as ReturnType<typeof vi.fn>).mock.calls[0][0] as WorkflowNode;
      expect(added.position).toEqual({ x: 120, y: 120 });
    });

    it('refuses an unknown node', () => {
      expect(errorOf(setup(wf()).run({ type: 'duplicate_node', nodeId: 'zzz.1' })).code).toBe(
        'NODE_NOT_FOUND'
      );
    });
  });

  // --------------------------------------------------------------------------
  describe('workflow', () => {
    it('reads name, description, format, formats and custom settings', () => {
      const { run } = setup(
        wf({
          description: 'About',
          config: { owner: 'me' },
          metadata: { format: 'agentspec' } as Workflow['metadata']
        }),
        { formatOptions: () => ['flowdrop', 'agentspec'] }
      );
      const result = run({ type: 'workflow_get' });
      expect(result.ok && result.data).toEqual({
        name: 'Test Workflow',
        description: 'About',
        format: 'agentspec',
        formats: ['flowdrop', 'agentspec'],
        config: { owner: 'me' }
      });
    });

    it('sets the name and refuses an empty one', () => {
      const { dispatch, run } = setup(wf());
      run({ type: 'workflow_set', field: 'name', value: '  New  ' });
      expect(dispatch.batchUpdate).toHaveBeenCalledWith({ name: 'New' });
      const err = errorOf(run({ type: 'workflow_set', field: 'name', value: '   ' }));
      expect(err.code).toBe('INVALID_ARGUMENT');
      expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);
    });

    it('stores an empty description', () => {
      const { dispatch, run } = setup(wf({ description: 'x' }));
      const result = run({ type: 'workflow_set', field: 'description', value: '' });
      expect(result.ok && result.message).toContain('cleared');
      expect(dispatch.batchUpdate).toHaveBeenCalledWith({ description: '' });
    });

    it('sets a registered format and warns about nodes that do not support it', () => {
      const picky = createMockMetadata('agentspec.picky', 'Picky', { formats: ['flowdrop'] });
      const base = wf();
      const { dispatch, run } = setup(
        { ...base, nodes: [...base.nodes, createMockNode('agentspec.picky.1', picky)] },
        { formatOptions: () => ['flowdrop', 'agentspec'] }
      );
      const result = run({ type: 'workflow_set', field: 'format', value: 'agentspec' });
      expect(result.ok && result.message).toContain('picky.1');
      expect(dispatch.batchUpdate).toHaveBeenCalledWith({ metadata: { format: 'agentspec' } });
    });

    it('refuses an unknown format, a single-format editor and an editor that does not say', () => {
      const set = (context: Partial<CommandContext>) =>
        errorOf(setup(wf(), context).run({ type: 'workflow_set', field: 'format', value: 'zzz' }));
      expect(set({ formatOptions: () => ['flowdrop', 'agentspec'] }).error).toContain('Formats:');
      expect(set({ formatOptions: () => ['flowdrop'] }).error).toContain('single workflow format');
      expect(set({}).error).toContain('does not say');
    });
  });

  // --------------------------------------------------------------------------
  describe('playground', () => {
    const inputs = ['message', 'history', 'sid', 'mid'].map((id) => ({
      id,
      dataType: 'string',
      bindings: []
    }));
    const withChat = (chat: unknown, extra: Partial<Workflow> = {}) =>
      wf({
        interface: { inputs },
        playground: { chat: chat as never },
        ...extra
      });
    const lastPlayground = (d: CommandDispatch) =>
      (d.batchUpdate as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0];

    it('reports unavailable for a backend without Playground settings', () => {
      const { dispatch, run } = setup(wf());
      const read = run({ type: 'playground_get' });
      expect(read.ok && read.data).toEqual({ available: false });
      expect(errorOf(run({ type: 'playground_chat', edit: { kind: 'off' } })).error).toContain(
        '2.7.0'
      );
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('reads the binding with short node ids, its source and issues', () => {
      const { run } = setup(
        withChat({
          message: 'message',
          history: { input: 'history', limit: 6 },
          session_id: null,
          message_id: null,
          replies: [{ node_id: LLM, port: 'text' }],
          sub_workflow_replies: false
        })
      );
      const result = run({ type: 'playground_get' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toMatchObject({
        available: true,
        source: 'settings',
        chat: {
          message: 'message',
          history: { input: 'history', limit: 6 },
          replies: [{ nodeId: 'llm_node.1', port: 'text' }]
        },
        issues: []
      });
    });

    it('binds the message input, then unbinds it with none', () => {
      const { dispatch, run } = setup(withChat(null));
      const bound = run({
        type: 'playground_chat',
        edit: { kind: 'input', key: 'message', id: 'message' }
      });
      expect(bound.ok && bound.message).toContain("bound to 'message'");
      expect(bound.ok && bound.message).toContain('no reply is');
      expect(lastPlayground(dispatch).playground.chat).toMatchObject({ message: 'message' });
      expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);
    });

    it('refuses an input the interface does not have, and one bound twice', () => {
      const { run } = setup(
        withChat({
          message: 'message',
          history: null,
          session_id: null,
          message_id: null,
          replies: [],
          sub_workflow_replies: false
        })
      );
      expect(
        errorOf(
          run({ type: 'playground_chat', edit: { kind: 'input', key: 'session_id', id: 'zzz' } })
        ).error
      ).toContain('not an input of the interface');
      expect(
        errorOf(
          run({
            type: 'playground_chat',
            edit: { kind: 'input', key: 'session_id', id: 'message' }
          })
        ).error
      ).toContain('already bound');
    });

    it('binds history with a limit, defaulting to the current or 10, and sets the limit alone', () => {
      const { dispatch, run } = setup(withChat(null));
      run({ type: 'playground_chat', edit: { kind: 'input', key: 'history', id: 'history' } });
      expect(lastPlayground(dispatch).playground.chat.history).toEqual({
        input: 'history',
        limit: 10
      });
      run({
        type: 'playground_chat',
        edit: { kind: 'input', key: 'history', id: 'history', limit: 4 }
      });
      expect(lastPlayground(dispatch).playground.chat.history.limit).toBe(4);
      expect(
        errorOf(
          run({
            type: 'playground_chat',
            edit: { kind: 'input', key: 'history', id: 'history', limit: 0 }
          })
        ).error
      ).toContain('at least 1');
      expect(
        errorOf(run({ type: 'playground_chat', edit: { kind: 'limit', limit: 3 } })).error
      ).toContain('No history input');
    });

    it('adds and removes replies, checking the node and the output port', () => {
      const { dispatch, run } = setup(withChat(null));
      expect(
        run({
          type: 'playground_chat',
          edit: { kind: 'reply', mode: 'add', nodeId: 'llm_node.1', port: 'text' }
        }).ok
      ).toBe(true);
      expect(lastPlayground(dispatch).playground.chat.replies).toEqual([
        { node_id: LLM, port: 'text' }
      ]);
      expect(
        errorOf(
          run({
            type: 'playground_chat',
            edit: { kind: 'reply', mode: 'add', nodeId: 'llm_node.1', port: 'zzz' }
          })
        ).code
      ).toBe('PORT_NOT_FOUND');
      expect(
        errorOf(
          run({
            type: 'playground_chat',
            edit: { kind: 'reply', mode: 'remove', nodeId: 'llm_node.1', port: 'text' }
          })
        ).error
      ).toContain('not a reply');
      expect(
        errorOf(
          run({
            type: 'playground_chat',
            edit: { kind: 'reply', mode: 'add', nodeId: 'zzz.1', port: 'text' }
          })
        ).code
      ).toBe('NODE_NOT_FOUND');
    });

    it('removes a reply that is set', () => {
      const { dispatch, run } = setup(
        withChat({
          message: null,
          history: null,
          session_id: null,
          message_id: null,
          replies: [{ node_id: LLM, port: 'text' }],
          sub_workflow_replies: false
        })
      );
      expect(
        run({
          type: 'playground_chat',
          edit: { kind: 'reply', mode: 'remove', nodeId: 'llm_node.1', port: 'text' }
        }).ok
      ).toBe(true);
      // a binding that binds nothing is stored as no chat
      expect(lastPlayground(dispatch).playground.chat).toBeNull();
    });

    it('adds a reply only on a port the settings panel lists, as the UI does', () => {
      const hidden = withChat(null);
      const llmNode = hidden.nodes.find((n) => n.id === LLM) as WorkflowNode;
      llmNode.data = {
        ...llmNode.data,
        config: { ports: { outputs: [{ id: 'raw', exposed: false }] } }
      };
      const { dispatch, run } = setup(hidden);
      const refused = errorOf(
        run({
          type: 'playground_chat',
          edit: { kind: 'reply', mode: 'add', nodeId: 'llm_node.1', port: 'raw' }
        })
      );
      expect(refused.code).toBe('INVALID_ARGUMENT');
      expect(refused.error).toContain('hidden');
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('removes a reply left on a node that was deleted', () => {
      const { dispatch, run } = setup(
        withChat({
          message: null,
          history: null,
          session_id: null,
          message_id: null,
          replies: [{ node_id: 'agentspec.gone.3', port: 'out' }],
          sub_workflow_replies: false
        })
      );
      expect(
        run({
          type: 'playground_chat',
          edit: { kind: 'reply', mode: 'remove', nodeId: 'gone.3', port: 'out' }
        }).ok
      ).toBe(true);
      expect(lastPlayground(dispatch).playground.chat).toBeNull();
    });

    it('turns sub-workflow replies on and switches the chat off', () => {
      const { dispatch, run } = setup(withChat(null));
      run({ type: 'playground_chat', edit: { kind: 'sub_replies', on: true } });
      expect(lastPlayground(dispatch).playground.chat.sub_workflow_replies).toBe(true);
      const on = setup(withChat({ message: 'q', replies: [], sub_workflow_replies: true }));
      on.run({ type: 'playground_chat', edit: { kind: 'off' } });
      expect(lastPlayground(on.dispatch).playground.chat).toBeNull();
    });

    it('makes no write for an edit that changes nothing', () => {
      const { dispatch, run } = setup(withChat(null));
      const result = run({ type: 'playground_chat', edit: { kind: 'sub_replies', on: false } });
      expect(result.ok && result.message).toContain('No change');
      expect(dispatch.batchUpdate).not.toHaveBeenCalled();
    });

    it('moves deprecated turn marks into the settings and clears them from the interface', () => {
      const marked = wf({
        playground: { chat: null },
        interface: {
          inputs: [{ id: 'q', dataType: 'string', bindings: [], turn: 'message' }],
          outputs: [
            {
              id: 'a',
              dataType: 'string',
              bindings: [{ nodeId: LLM, portId: 'text' }],
              turn: 'reply'
            }
          ]
        }
      });
      const { dispatch, run } = setup(marked);
      expect(run({ type: 'playground_chat', edit: { kind: 'move_turns' } }).ok).toBe(true);
      const update = lastPlayground(dispatch);
      expect(update.playground.chat).toMatchObject({
        message: 'q',
        replies: [{ node_id: LLM, port: 'text' }]
      });
      expect('turn' in update.interface.inputs[0]).toBe(false);
      expect('turn' in update.interface.outputs[0]).toBe(false);
      expect(dispatch.batchUpdate).toHaveBeenCalledTimes(1);
    });

    it('moves the marks along with the first edit, so clearing never falls back to them', () => {
      const marked = wf({
        playground: { chat: null },
        interface: {
          inputs: [{ id: 'q', dataType: 'string', bindings: [], turn: 'message' }]
        }
      });
      const { dispatch, run } = setup(marked);
      const result = run({ type: 'playground_chat', edit: { kind: 'off' } });
      expect(result.ok && result.message).toContain('moved into the settings');
      const update = lastPlayground(dispatch);
      expect(update.playground.chat).toBeNull();
      expect('turn' in update.interface.inputs[0]).toBe(false);
    });

    it('refuses move_turns when no mark declares a chat', () => {
      const { run } = setup(withChat(null));
      expect(
        errorOf(run({ type: 'playground_chat', edit: { kind: 'move_turns' } })).error
      ).toContain('nothing to move');
    });
  });

  describe('help', () => {
    it('lists the new commands', () => {
      const result = executeCommand({ type: 'help' }, createMockContext(null, []));
      const names =
        (result.ok && (result.data as HelpResultData).commands.map((c) => c.name)) || [];
      for (const name of ['interface', 'ports', 'duplicate', 'workflow', 'playground']) {
        expect(names).toContain(name);
      }
      const one = executeCommand(
        { type: 'help', command: 'interface' },
        createMockContext(null, [])
      );
      expect(one.ok && (one.data as HelpResultData).commands.length).toBeGreaterThan(5);
    });
  });
});

describe('executeCommand — branch ports and integer config', () => {
  it('says a gateway branch is not an interface or Ports port, and does not offer it as one', () => {
    const gate = createMockMetadata('agentspec.gate', 'Gate', {
      inputs: [{ id: 'in', name: 'In', type: 'input', dataType: 'string' }],
      outputs: [{ id: 'done', name: 'Done', type: 'output', dataType: 'string' }]
    });
    const node = createMockNode('agentspec.gate.1', gate, {
      data: { label: 'Gate', config: { branches: [{ name: 'yes' }] }, metadata: gate }
    } as Partial<WorkflowNode>);
    const dispatch = createMockDispatch();
    const context = createMockContext(createMockWorkflow([node]), [gate], dispatch);
    for (const command of [
      { type: 'interface_expose', nodeId: 'gate.1', port: 'yes' },
      { type: 'ports_exposure', nodeId: 'gate.1', mode: 'hide', port: 'yes' },
      { type: 'ports_move', nodeId: 'gate.1', port: 'yes', position: 1 }
    ] as Command[]) {
      const result = executeCommand(command, context);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('branch');
        expect(result.error).not.toContain('Its outputs');
      }
    }
    const unknown = executeCommand(
      { type: 'ports_exposure', nodeId: 'gate.1', mode: 'hide', port: 'zzz' },
      context
    );
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.code).toBe('PORT_NOT_FOUND');
      expect(unknown.error).toContain('done');
      expect(unknown.error).not.toContain('yes');
    }
  });

  it('checks an integer config type with Number.isInteger', () => {
    const m = createMockMetadata('agentspec.count', 'Count', {
      configSchema: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          many: { type: ['integer', 'null'] },
          anything: { type: [] }
        }
      }
    } as Partial<NodeMetadata>);
    const node = createMockNode('agentspec.count.1', m, {
      data: { label: 'Count', config: {}, metadata: m }
    } as Partial<WorkflowNode>);
    const context = createMockContext(createMockWorkflow([node]), [m]);
    const warn = (key: string, value: string) => {
      const result = executeCommand({ type: 'set_config', nodeId: 'count.1', key, value }, context);
      expect(result.ok).toBe(true);
      return result.ok
        ? (result.data as import('../../../src/lib/commands/types.js').SetConfigResultData).warnings
        : undefined;
    };
    expect(warn('n', '3')).toBeUndefined();
    expect(warn('n', '1.5')?.[0]).toMatchObject({ type: 'type_mismatch', expectedType: 'integer' });
    expect(warn('n', '1.5')?.[0].message).toContain('non-integer');
    expect(warn('many', '2')).toBeUndefined();
    expect(warn('many', 'null')).toBeUndefined();
    expect(warn('many', '2.5')?.[0].type).toBe('type_mismatch');
    // An empty `type` array is no usable type, as in the config form: any value.
    expect(warn('anything', '{"a":1}')).toBeUndefined();
    expect(warn('anything', '2.5')).toBeUndefined();
  });
});
