import { describe, it, expect, beforeEach } from 'vitest';
import {
  NodeComponentRegistry,
  type NodeComponentRegistration
} from '../../../src/lib/registry/nodeComponentRegistry.js';
import {
  BUILTIN_NODE_COMPONENTS,
  BUILTIN_NODE_TYPES
} from '../../../src/lib/registry/builtinNodes.js';

// Minimal mock component for testing (satisfies Component<NodeComponentProps> structurally)
const mockComponent = (() => {}) as unknown as NodeComponentRegistration['component'];

function createMockRegistration(type: string): NodeComponentRegistration {
  return {
    type,
    displayName: `Test ${type}`,
    component: mockComponent,
    category: 'custom',
    source: 'test'
  };
}

describe('NodeComponentRegistry', () => {
  // Fresh, empty registry per test — no shared singleton state.
  let registry: NodeComponentRegistry;

  beforeEach(() => {
    registry = new NodeComponentRegistry();
  });

  describe('constructor seeding', () => {
    it('should seed from BUILTIN_NODE_COMPONENTS when provided', () => {
      const seeded = new NodeComponentRegistry({
        registrations: BUILTIN_NODE_COMPONENTS,
        defaultType: 'workflowNode'
      });
      expect(seeded.size).toBe(BUILTIN_NODE_TYPES.length);
      expect(seeded.getDefaultType()).toBe('workflowNode');
    });

    it('should start empty when no seed is given', () => {
      expect(registry.size).toBe(0);
    });
  });

  describe('extends BaseRegistry', () => {
    it('should support subscribe/unsubscribe', () => {
      let callCount = 0;
      const unsubscribe = registry.subscribe(() => callCount++);

      registry.register(createMockRegistration('test1'));
      expect(callCount).toBe(1);

      registry.register(createMockRegistration('test2'));
      expect(callCount).toBe(2);

      unsubscribe();
      registry.register(createMockRegistration('test3'));
      expect(callCount).toBe(2); // No longer called
    });

    it('should support onClear callback', () => {
      let cleared = false;
      const unsubscribe = registry.onClear(() => {
        cleared = true;
      });

      registry.register(createMockRegistration('test'));
      expect(cleared).toBe(false);

      registry.clear();
      expect(cleared).toBe(true);

      unsubscribe();
    });
  });

  describe('getMetadata', () => {
    it('should return metadata without the component field', () => {
      registry.register(createMockRegistration('test'));
      const metadata = registry.getMetadata('test');

      expect(metadata).toBeDefined();
      expect(metadata!.type).toBe('test');
      expect(metadata!.displayName).toBe('Test test');
      expect(metadata!.category).toBe('custom');
      // The metadata should not contain the component
      expect('component' in metadata!).toBe(false);
    });

    it('should return undefined for non-existent type', () => {
      expect(registry.getMetadata('missing')).toBeUndefined();
    });
  });

  describe('getTypes aliases getKeys', () => {
    it('should return the same result as getKeys', () => {
      registry.register(createMockRegistration('a'));
      registry.register(createMockRegistration('b'));
      expect(registry.getTypes()).toEqual(registry.getKeys());
    });
  });

  describe('clear resets defaultType', () => {
    it('should reset defaultType to workflowNode after clear()', () => {
      registry.register(createMockRegistration('custom'));
      registry.setDefaultType('custom');
      expect(registry.getDefaultType()).toBe('custom');

      registry.clear();
      expect(registry.getDefaultType()).toBe('workflowNode');
    });
  });
});
