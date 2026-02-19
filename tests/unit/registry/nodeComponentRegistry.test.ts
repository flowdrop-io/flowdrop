import { describe, it, expect, beforeEach } from 'vitest';
import {
	nodeComponentRegistry,
	type NodeComponentRegistration
} from '../../../src/lib/registry/nodeComponentRegistry.js';
import {
	registerBuiltinNodes,
	areBuiltinsRegistered,
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
	beforeEach(() => {
		nodeComponentRegistry.clear();
	});

	describe('onClear resets builtinsRegistered flag', () => {
		it('should allow re-registration of builtins after clear()', () => {
			// Register builtins
			registerBuiltinNodes();
			expect(areBuiltinsRegistered()).toBe(true);
			expect(nodeComponentRegistry.size).toBe(BUILTIN_NODE_TYPES.length);

			// Clear the registry — onClear callback should reset the flag
			nodeComponentRegistry.clear();
			expect(areBuiltinsRegistered()).toBe(false);
			expect(nodeComponentRegistry.size).toBe(0);

			// Re-register — this should work now (was broken before the fix)
			registerBuiltinNodes();
			expect(areBuiltinsRegistered()).toBe(true);
			expect(nodeComponentRegistry.size).toBe(BUILTIN_NODE_TYPES.length);
		});
	});

	describe('extends BaseRegistry', () => {
		it('should support subscribe/unsubscribe', () => {
			let callCount = 0;
			const unsubscribe = nodeComponentRegistry.subscribe(() => callCount++);

			nodeComponentRegistry.register(createMockRegistration('test1'));
			expect(callCount).toBe(1);

			nodeComponentRegistry.register(createMockRegistration('test2'));
			expect(callCount).toBe(2);

			unsubscribe();
			nodeComponentRegistry.register(createMockRegistration('test3'));
			expect(callCount).toBe(2); // No longer called
		});

		it('should support onClear callback', () => {
			let cleared = false;
			const unsubscribe = nodeComponentRegistry.onClear(() => {
				cleared = true;
			});

			nodeComponentRegistry.register(createMockRegistration('test'));
			expect(cleared).toBe(false);

			nodeComponentRegistry.clear();
			expect(cleared).toBe(true);

			unsubscribe();
		});
	});

	describe('getMetadata', () => {
		it('should return metadata without the component field', () => {
			nodeComponentRegistry.register(createMockRegistration('test'));
			const metadata = nodeComponentRegistry.getMetadata('test');

			expect(metadata).toBeDefined();
			expect(metadata!.type).toBe('test');
			expect(metadata!.displayName).toBe('Test test');
			expect(metadata!.category).toBe('custom');
			// The metadata should not contain the component
			expect('component' in metadata!).toBe(false);
		});

		it('should return undefined for non-existent type', () => {
			expect(nodeComponentRegistry.getMetadata('missing')).toBeUndefined();
		});
	});

	describe('getTypes aliases getKeys', () => {
		it('should return the same result as getKeys', () => {
			nodeComponentRegistry.register(createMockRegistration('a'));
			nodeComponentRegistry.register(createMockRegistration('b'));
			expect(nodeComponentRegistry.getTypes()).toEqual(nodeComponentRegistry.getKeys());
		});
	});

	describe('clear resets defaultType', () => {
		it('should reset defaultType to workflowNode after clear()', () => {
			nodeComponentRegistry.register(createMockRegistration('custom'));
			nodeComponentRegistry.setDefaultType('custom');
			expect(nodeComponentRegistry.getDefaultType()).toBe('custom');

			nodeComponentRegistry.clear();
			expect(nodeComponentRegistry.getDefaultType()).toBe('workflowNode');
		});
	});
});
