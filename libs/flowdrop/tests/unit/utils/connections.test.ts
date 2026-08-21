/**
 * Unit Tests - Connection Utilities
 *
 * Tests for connection validation, port compatibility, and cycle detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PortCompatibilityChecker,
  validateConnection,
  hasCycles,
  getExecutionOrder
} from '$lib/utils/connections.js';
import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
import { createTestNode, createTestWorkflow } from '../../utils/index.js';
import { testNodes } from '../../fixtures/index.js';
import type { PortConfig } from '$lib/types';

describe('Connection Utilities', () => {
  // Sample port configuration
  const mockPortConfig: PortConfig = {
    version: '1.0.0',
    defaultDataType: 'string',
    dataTypes: [
      {
        id: 'trigger',
        name: 'Trigger',
        description: 'Control flow',
        color: '#8b5cf6',
        category: 'basic',
        enabled: true
      },
      {
        id: 'string',
        name: 'String',
        description: 'Text data',
        color: '#10b981',
        category: 'basic',
        enabled: true
      },
      {
        id: 'number',
        name: 'Number',
        description: 'Numeric data',
        color: '#3b82f6',
        category: 'numeric',
        enabled: true
      },
      {
        id: 'mixed',
        name: 'Mixed',
        description: 'Any data type',
        color: '#6b7280',
        category: 'special',
        enabled: true,
        aliases: ['any']
      }
    ],
    compatibilityRules: [
      { from: 'string', to: 'mixed' },
      { from: 'number', to: 'mixed' },
      { from: 'number', to: 'string' } // Numbers can convert to strings
    ]
  };

  // The SHIPPED defaults, not a fixture. The mock above proves the checker
  // honours whatever rules it is given; this proves the rules FlowDrop
  // actually ships say what they are meant to. The two are different
  // questions and only the second one caught the bug: `mixed` shipped with
  // no rules in either direction, so a `mixed` port refused a `string` wire
  // — on library defaults, on every port in the nineteen backend files that
  // declared the lane, and on every dynamic port left at its default.
  describe('DEFAULT_PORT_CONFIG', () => {
    const checker = new PortCompatibilityChecker(DEFAULT_PORT_CONFIG);
    const lanes = DEFAULT_PORT_CONFIG.dataTypes.map((t) => t.id);
    const dataLanes = lanes.filter((id) => id !== 'tool');

    it('declares the sink and has retired `any`', () => {
      expect(lanes).toContain('mixed');
      expect(lanes).not.toContain('any');
      expect(DEFAULT_PORT_CONFIG.defaultDataType).toBe('mixed');
    });

    it('declares every lane the editor can be handed', () => {
      // A lane absent here is not "unstyled" — buildCompatibilityMap() seeds
      // itself from this list, so an absent lane is compatible with nothing,
      // not even another port of its own lane. `messages` was absent.
      expect(lanes).toContain('messages');
      expect(lanes).toContain('trigger');
      expect(lanes).toContain('tool');
    });

    it.each(dataLanes)('wires %s into the sink and back out of it', (id) => {
      expect(checker.areDataTypesCompatible(id, 'mixed')).toBe(true);
      expect(checker.areDataTypesCompatible('mixed', id)).toBe(true);
    });

    it.each(dataLanes)('wires %s into the control sink', (id) => {
      // What a loopback or trigger input accepts.
      expect(checker.areDataTypesCompatible(id, 'trigger')).toBe(true);
    });

    it('keeps `tool` self-compatible only', () => {
      expect(checker.areDataTypesCompatible('tool', 'tool')).toBe(true);
      expect(checker.areDataTypesCompatible('tool', 'mixed')).toBe(false);
      expect(checker.areDataTypesCompatible('mixed', 'tool')).toBe(false);
      expect(checker.areDataTypesCompatible('tool', 'trigger')).toBe(false);
    });

    it('lets `messages` flow one way into array and json', () => {
      expect(checker.areDataTypesCompatible('messages', 'array')).toBe(true);
      expect(checker.areDataTypesCompatible('messages', 'json')).toBe(true);
      // The reverse is deliberately absent: an array/json port carries no
      // guarantee of provider-message shape.
      expect(checker.areDataTypesCompatible('array', 'messages')).toBe(false);
      expect(checker.areDataTypesCompatible('json', 'messages')).toBe(false);
    });
  });

  describe('PortCompatibilityChecker', () => {
    let checker: PortCompatibilityChecker;

    beforeEach(() => {
      checker = new PortCompatibilityChecker(mockPortConfig);
    });

    describe('areDataTypesCompatible', () => {
      it('should allow same type connections', () => {
        expect(checker.areDataTypesCompatible('string', 'string')).toBe(true);
        expect(checker.areDataTypesCompatible('number', 'number')).toBe(true);
      });

      it('should follow compatibility rules', () => {
        expect(checker.areDataTypesCompatible('string', 'mixed')).toBe(true);
        expect(checker.areDataTypesCompatible('number', 'mixed')).toBe(true);
        expect(checker.areDataTypesCompatible('number', 'string')).toBe(true);
      });

      it('should reject incompatible types', () => {
        expect(checker.areDataTypesCompatible('string', 'number')).toBe(false);
        expect(checker.areDataTypesCompatible('trigger', 'string')).toBe(false);
      });

      it('should handle mixed/any type', () => {
        // String to mixed/any works due to compatibility rules
        expect(checker.areDataTypesCompatible('string', 'mixed')).toBe(true);
        // But alias "any" needs the compatibility rule too
        // Since we have string->mixed rule and mixed has alias "any"
        // string->any should work through mixed
      });

      it('should handle aliases in same-type comparisons', () => {
        // Aliases are compatible with their main type
        expect(checker.areDataTypesCompatible('mixed', 'any')).toBe(true);
        expect(checker.areDataTypesCompatible('any', 'mixed')).toBe(true);
      });
    });

    describe('getCompatibleTypes', () => {
      it('should return compatible types for a source type', () => {
        const compatible = checker.getCompatibleTypes('string');
        expect(compatible).toContain('string');
        expect(compatible).toContain('mixed');
      });

      it('should return all types for mixed', () => {
        const compatible = checker.getCompatibleTypes('number');
        expect(compatible).toContain('number');
        expect(compatible).toContain('mixed');
        expect(compatible).toContain('string');
      });

      it('should return empty array for unknown type', () => {
        const compatible = checker.getCompatibleTypes('unknown' as never);
        expect(compatible).toEqual([]);
      });
    });

    describe('getDataTypeConfig', () => {
      it('should retrieve data type config by ID', () => {
        const config = checker.getDataTypeConfig('string');
        expect(config).toBeDefined();
        expect(config?.id).toBe('string');
        expect(config?.name).toBe('String');
      });

      it('should retrieve data type config by alias', () => {
        const config = checker.getDataTypeConfig('any');
        expect(config).toBeDefined();
        expect(config?.id).toBe('mixed');
      });

      it('should return undefined for unknown type', () => {
        const config = checker.getDataTypeConfig('unknown');
        expect(config).toBeUndefined();
      });
    });

    describe('getEnabledDataTypes', () => {
      it('should return all enabled data types', () => {
        const enabled = checker.getEnabledDataTypes();
        expect(enabled).toHaveLength(4);
        expect(enabled.every((dt) => dt.enabled !== false)).toBe(true);
      });

      it('should filter out disabled types', () => {
        const configWithDisabled: PortConfig = {
          ...mockPortConfig,
          dataTypes: [
            ...mockPortConfig.dataTypes,
            {
              id: 'disabled',
              name: 'Disabled',
              description: 'Disabled type',
              color: '#000',
              category: 'test',
              enabled: false
            }
          ]
        };

        const checker2 = new PortCompatibilityChecker(configWithDisabled);
        const enabled = checker2.getEnabledDataTypes();
        expect(enabled.find((dt) => dt.id === 'disabled')).toBeUndefined();
      });
    });
  });

  describe('PortCompatibilityChecker.reinitialize', () => {
    it('rebuilds the compatibility map from a new port config', () => {
      const checker = new PortCompatibilityChecker(mockPortConfig);
      expect(checker.areDataTypesCompatible('string', 'string')).toBe(true);

      checker.reinitialize({
        version: '1.0.0',
        defaultDataType: 'number',
        dataTypes: [
          { id: 'number', name: 'Number', description: '', color: '#000', enabled: true }
        ],
        compatibilityRules: [{ from: 'number', to: 'number' }]
      });

      expect(checker.areDataTypesCompatible('number', 'number')).toBe(true);
      // 'string' no longer exists in the rebuilt map
      expect(checker.areDataTypesCompatible('string', 'string')).toBe(false);
    });
  });

  describe('validateConnection', () => {
    // Instance-scoped checker threaded explicitly into validateConnection.
    let checker: PortCompatibilityChecker;
    beforeEach(() => {
      checker = new PortCompatibilityChecker(mockPortConfig);
    });

    it('should validate a valid connection', () => {
      const node1 = createTestNode({
        id: 'node-1',
        data: {
          label: 'Node 1',
          config: {},
          metadata: testNodes.calculator
        }
      });

      const node2 = createTestNode({
        id: 'node-2',
        data: {
          label: 'Node 2',
          config: {},
          metadata: testNodes.calculator
        }
      });

      const result = validateConnection(
        checker,
        'node-1',
        'result',
        'node-2',
        'a',
        [node1, node2],
        [testNodes.calculator]
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject self-connection', () => {
      const node = createTestNode({
        id: 'node-1',
        data: {
          label: 'Node 1',
          config: {},
          metadata: testNodes.calculator
        }
      });

      const result = validateConnection(
        checker,
        'node-1',
        'result',
        'node-1',
        'a',
        [node],
        [testNodes.calculator]
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot connect node to itself');
    });

    it('should reject connection to non-existent source node', () => {
      const node = createTestNode({ id: 'node-1' });

      const result = validateConnection(
        checker,
        'non-existent',
        'output',
        'node-1',
        'input',
        [node],
        []
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Source node not found');
    });

    it('should reject connection to non-existent target node', () => {
      const node = createTestNode({ id: 'node-1' });

      const result = validateConnection(
        checker,
        'node-1',
        'output',
        'non-existent',
        'input',
        [node],
        []
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target node not found');
    });

    it('should reject connection with non-existent source port', () => {
      const node1 = createTestNode({
        id: 'node-1',
        data: {
          label: 'Node 1',
          config: {},
          metadata: testNodes.calculator
        }
      });

      const node2 = createTestNode({
        id: 'node-2',
        data: {
          label: 'Node 2',
          config: {},
          metadata: testNodes.calculator
        }
      });

      const result = validateConnection(
        checker,
        'node-1',
        'non-existent-port',
        'node-2',
        'a',
        [node1, node2],
        [testNodes.calculator]
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Source port not found');
    });

    it('should reject connection with non-existent target port', () => {
      const node1 = createTestNode({
        id: 'node-1',
        data: {
          label: 'Node 1',
          config: {},
          metadata: testNodes.calculator
        }
      });

      const node2 = createTestNode({
        id: 'node-2',
        data: {
          label: 'Node 2',
          config: {},
          metadata: testNodes.calculator
        }
      });

      const result = validateConnection(
        checker,
        'node-1',
        'result',
        'node-2',
        'non-existent-port',
        [node1, node2],
        [testNodes.calculator]
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target port not found');
    });
  });

  describe('hasCycles', () => {
    it('should detect no cycles in linear workflow', () => {
      const workflow = createTestWorkflow({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' }),
          createTestNode({ id: 'node-3' })
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'edge-2',
            source: 'node-2',
            target: 'node-3',
            sourceHandle: 'out',
            targetHandle: 'in'
          }
        ]
      });

      expect(hasCycles(workflow.nodes, workflow.edges)).toBe(false);
    });

    it('should detect cycle in workflow', () => {
      const workflow = createTestWorkflow({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' }),
          createTestNode({ id: 'node-3' })
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'edge-2',
            source: 'node-2',
            target: 'node-3',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'edge-3',
            source: 'node-3',
            target: 'node-1',
            sourceHandle: 'out',
            targetHandle: 'in'
          }
        ]
      });

      expect(hasCycles(workflow.nodes, workflow.edges)).toBe(true);
    });

    it('should detect self-loop cycle', () => {
      const workflow = createTestWorkflow({
        nodes: [createTestNode({ id: 'node-1' })],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-1',
            sourceHandle: 'out',
            targetHandle: 'in'
          }
        ]
      });

      expect(hasCycles(workflow.nodes, workflow.edges)).toBe(true);
    });

    it('should handle workflow with no edges', () => {
      const workflow = createTestWorkflow({
        nodes: [createTestNode({ id: 'node-1' }), createTestNode({ id: 'node-2' })],
        edges: []
      });

      expect(hasCycles(workflow.nodes, workflow.edges)).toBe(false);
    });

    it('should handle branching workflow without cycles', () => {
      const workflow = createTestWorkflow({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' }),
          createTestNode({ id: 'node-3' }),
          createTestNode({ id: 'node-4' })
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'edge-2',
            source: 'node-1',
            target: 'node-3',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'edge-3',
            source: 'node-2',
            target: 'node-4',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'edge-4',
            source: 'node-3',
            target: 'node-4',
            sourceHandle: 'out',
            targetHandle: 'in'
          }
        ]
      });

      expect(hasCycles(workflow.nodes, workflow.edges)).toBe(false);
    });
  });

  describe('getExecutionOrder', () => {
    it('should return correct order for linear workflow', () => {
      const workflow = createTestWorkflow({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' }),
          createTestNode({ id: 'node-3' })
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'edge-2',
            source: 'node-2',
            target: 'node-3',
            sourceHandle: 'out',
            targetHandle: 'in'
          }
        ]
      });

      const order = getExecutionOrder(workflow.nodes, workflow.edges);

      expect(order).toEqual(['node-1', 'node-2', 'node-3']);
    });

    it('should handle multiple start nodes', () => {
      const workflow = createTestWorkflow({
        nodes: [
          createTestNode({ id: 'node-1' }),
          createTestNode({ id: 'node-2' }),
          createTestNode({ id: 'node-3' })
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-3',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'edge-2',
            source: 'node-2',
            target: 'node-3',
            sourceHandle: 'out',
            targetHandle: 'in'
          }
        ]
      });

      const order = getExecutionOrder(workflow.nodes, workflow.edges);

      expect(order).toHaveLength(3);
      expect(order[2]).toBe('node-3'); // node-3 must be last
      expect(order.slice(0, 2)).toContain('node-1');
      expect(order.slice(0, 2)).toContain('node-2');
    });

    it('should handle workflow with no edges', () => {
      const workflow = createTestWorkflow({
        nodes: [createTestNode({ id: 'node-1' }), createTestNode({ id: 'node-2' })],
        edges: []
      });

      const order = getExecutionOrder(workflow.nodes, workflow.edges);

      expect(order).toHaveLength(2);
      expect(order).toContain('node-1');
      expect(order).toContain('node-2');
    });

    it('should handle complex branching workflow', () => {
      const workflow = createTestWorkflow({
        nodes: [
          createTestNode({ id: 'start' }),
          createTestNode({ id: 'branch-1' }),
          createTestNode({ id: 'branch-2' }),
          createTestNode({ id: 'merge' }),
          createTestNode({ id: 'end' })
        ],
        edges: [
          {
            id: 'e1',
            source: 'start',
            target: 'branch-1',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'e2',
            source: 'start',
            target: 'branch-2',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'e3',
            source: 'branch-1',
            target: 'merge',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'e4',
            source: 'branch-2',
            target: 'merge',
            sourceHandle: 'out',
            targetHandle: 'in'
          },
          {
            id: 'e5',
            source: 'merge',
            target: 'end',
            sourceHandle: 'out',
            targetHandle: 'in'
          }
        ]
      });

      const order = getExecutionOrder(workflow.nodes, workflow.edges);

      expect(order[0]).toBe('start');
      expect(order[4]).toBe('end');
      expect(order[3]).toBe('merge');
      // branch-1 and branch-2 should be before merge
      const mergeIndex = order.indexOf('merge');
      const branch1Index = order.indexOf('branch-1');
      const branch2Index = order.indexOf('branch-2');
      expect(branch1Index).toBeLessThan(mergeIndex);
      expect(branch2Index).toBeLessThan(mergeIndex);
    });
  });
});
