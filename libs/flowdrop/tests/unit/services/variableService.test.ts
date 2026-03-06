/**
 * Unit Tests - Variable Service
 *
 * Tests for the service that derives available template variables from connected
 * upstream nodes' output schemas.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	getAvailableVariables,
	getChildVariables,
	getArrayIndexSuggestions,
	isArrayVariable,
	hasChildren,
	mergeVariableSchemas
} from '$lib/services/variableService.js';
import type {
	WorkflowNode,
	WorkflowEdge,
	VariableSchema,
	NodePort
} from '$lib/types/index.js';

vi.mock('$lib/utils/logger.js', () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

// --- Helpers ---

function makePort(overrides: Partial<NodePort> = {}): NodePort {
	return {
		id: 'output',
		name: 'Output',
		type: 'output',
		dataType: 'string',
		...overrides
	} as NodePort;
}

function makeNode(
	id: string,
	outputs: NodePort[] = [],
	inputs: NodePort[] = []
): WorkflowNode {
	return {
		id,
		type: 'default',
		position: { x: 0, y: 0 },
		data: {
			label: id,
			config: {},
			metadata: {
				id,
				name: id,
				description: '',
				category: 'processing',
				version: '1.0.0',
				type: 'default',
				inputs,
				outputs,
				configSchema: { type: 'object', properties: {} }
			}
		}
	} as WorkflowNode;
}

function makeEdge(
	source: string,
	target: string,
	sourcePortId: string,
	targetPortId: string
): WorkflowEdge {
	return {
		id: `${source}->${target}`,
		source,
		target,
		sourceHandle: `${source}-output-${sourcePortId}`,
		targetHandle: `${target}-input-${targetPortId}`
	};
}

// --- Tests ---

describe('variableService', () => {
	describe('getAvailableVariables', () => {
		it('returns an empty variables map when there are no edges', () => {
			const node = makeNode('node-2');
			const result = getAvailableVariables(node, [node], []);
			expect(result.variables).toEqual({});
		});

		it('skips trigger-typed source ports', () => {
			const triggerPort = makePort({ id: 'trigger', dataType: 'trigger' });
			const upstream = makeNode('upstream', [triggerPort]);
			const downstream = makeNode('downstream', [], [makePort({ id: 'in', type: 'input' })]);
			const edge = makeEdge('upstream', 'downstream', 'trigger', 'in');

			const result = getAvailableVariables(downstream, [upstream, downstream], [edge]);
			expect(result.variables).toEqual({});
		});

		it('skips trigger-typed target ports', () => {
			const dataPort = makePort({ id: 'data', dataType: 'string' });
			const upstream = makeNode('upstream', [dataPort]);
			const triggerInput = makePort({ id: 'trigger', type: 'input', dataType: 'trigger' });
			const downstream = makeNode('downstream', [], [triggerInput]);
			const edge = makeEdge('upstream', 'downstream', 'data', 'trigger');

			const result = getAvailableVariables(downstream, [upstream, downstream], [edge]);
			expect(result.variables).toEqual({});
		});

		it('unpacks schema properties as top-level variables when schema is present', () => {
			const outputPort = makePort({
				id: 'json',
				name: 'JSON Output',
				dataType: 'object',
				schema: {
					type: 'object',
					properties: {
						name: { type: 'string', title: 'Name' },
						age: { type: 'number', title: 'Age' }
					}
				}
			});
			const upstream = makeNode('upstream', [outputPort]);
			const downstream = makeNode('downstream', [], [makePort({ id: 'input', type: 'input' })]);
			const edge = makeEdge('upstream', 'downstream', 'json', 'input');

			const result = getAvailableVariables(downstream, [upstream, downstream], [edge]);

			expect(Object.keys(result.variables)).toContain('name');
			expect(Object.keys(result.variables)).toContain('age');
			expect(result.variables.name.type).toBe('string');
			expect(result.variables.age.type).toBe('number');
		});

		it('uses port as a single variable when there is no schema and includePortName is false', () => {
			const outputPort = makePort({ id: 'data', name: 'Data Output', dataType: 'string' });
			const upstream = makeNode('upstream', [outputPort]);
			const downstream = makeNode('downstream', [], [makePort({ id: 'data', type: 'input' })]);
			const edge = makeEdge('upstream', 'downstream', 'data', 'data');

			const result = getAvailableVariables(downstream, [upstream, downstream], [edge]);

			expect(Object.keys(result.variables)).toContain('data');
			expect(result.variables.data.type).toBe('string');
		});

		it('respects targetPortIds filter — excludes unspecified ports', () => {
			const port1 = makePort({ id: 'text', name: 'Text', dataType: 'string' });
			const port2 = makePort({ id: 'context', name: 'Context', dataType: 'object' });
			const upstream = makeNode('upstream', [port1, port2]);

			const input1 = makePort({ id: 'text', type: 'input', dataType: 'string' });
			const input2 = makePort({ id: 'context', type: 'input', dataType: 'object' });
			const downstream = makeNode('downstream', [], [input1, input2]);

			const edge1 = makeEdge('upstream', 'downstream', 'text', 'text');
			const edge2 = makeEdge('upstream', 'downstream', 'context', 'context');

			const result = getAvailableVariables(
				downstream,
				[upstream, downstream],
				[edge1, edge2],
				{ targetPortIds: ['text'] }
			);

			expect(Object.keys(result.variables)).toContain('text');
			expect(Object.keys(result.variables)).not.toContain('context');
		});

		it('returns empty variables when targetPortIds is an empty array', () => {
			const outputPort = makePort({ id: 'data', dataType: 'string' });
			const upstream = makeNode('upstream', [outputPort]);
			const downstream = makeNode('downstream', [], [makePort({ id: 'data', type: 'input' })]);
			const edge = makeEdge('upstream', 'downstream', 'data', 'data');

			const result = getAvailableVariables(
				downstream,
				[upstream, downstream],
				[edge],
				{ targetPortIds: [] }
			);

			expect(result.variables).toEqual({});
		});

		it('preserves nested object types from schema properties', () => {
			const outputPort = makePort({
				id: 'result',
				dataType: 'object',
				schema: {
					type: 'object',
					properties: {
						user: {
							type: 'object',
							title: 'User',
							properties: {
								name: { type: 'string', title: 'Name' },
								email: { type: 'string', title: 'Email' }
							}
						}
					}
				}
			});
			const upstream = makeNode('upstream', [outputPort]);
			const downstream = makeNode('downstream', [], [makePort({ id: 'input', type: 'input' })]);
			const edge = makeEdge('upstream', 'downstream', 'result', 'input');

			const result = getAvailableVariables(downstream, [upstream, downstream], [edge]);

			expect(result.variables.user.type).toBe('object');
			expect(result.variables.user.properties?.name.type).toBe('string');
		});

		it('ignores edges where the source node does not exist', () => {
			const downstream = makeNode('downstream', [], [makePort({ id: 'input', type: 'input' })]);
			const ghostEdge: WorkflowEdge = {
				id: 'ghost->downstream',
				source: 'ghost',
				target: 'downstream',
				sourceHandle: 'ghost-output-data',
				targetHandle: 'downstream-input-input'
			};

			const result = getAvailableVariables(downstream, [downstream], [ghostEdge]);
			expect(result.variables).toEqual({});
		});
	});

	describe('getChildVariables', () => {
		const schema: VariableSchema = {
			variables: {
				user: {
					name: 'user',
					label: 'User',
					type: 'object',
					properties: {
						name: { name: 'name', label: 'Name', type: 'string' },
						address: {
							name: 'address',
							label: 'Address',
							type: 'object',
							properties: {
								city: { name: 'city', label: 'City', type: 'string' },
								zip: { name: 'zip', label: 'ZIP', type: 'string' }
							}
						}
					}
				},
				items: {
					name: 'items',
					label: 'Items',
					type: 'array',
					items: {
						name: 'item',
						label: 'Item',
						type: 'object',
						properties: {
							id: { name: 'id', label: 'ID', type: 'integer' }
						}
					}
				},
				score: { name: 'score', label: 'Score', type: 'number' }
			}
		};

		it('returns top-level children for a root variable', () => {
			const children = getChildVariables(schema, 'user');
			const names = children.map((c) => c.name);
			expect(names).toContain('name');
			expect(names).toContain('address');
		});

		it('returns nested children for a dotted path', () => {
			const children = getChildVariables(schema, 'user.address');
			const names = children.map((c) => c.name);
			expect(names).toContain('city');
			expect(names).toContain('zip');
		});

		it('returns empty array for a path that does not exist', () => {
			expect(getChildVariables(schema, 'nonexistent')).toEqual([]);
		});

		it('returns empty array for a leaf variable (no properties)', () => {
			expect(getChildVariables(schema, 'score')).toEqual([]);
		});

		it('navigates into array items using bracket notation', () => {
			const children = getChildVariables(schema, 'items[0]');
			const names = children.map((c) => c.name);
			expect(names).toContain('id');
		});

		it('navigates into array items using wildcard notation', () => {
			const children = getChildVariables(schema, 'items[*]');
			expect(children.map((c) => c.name)).toContain('id');
		});
	});

	describe('getArrayIndexSuggestions', () => {
		it('returns [0], [1], [2], and [*] with the default maxIndex', () => {
			const suggestions = getArrayIndexSuggestions();
			expect(suggestions).toEqual(['0]', '1]', '2]', '*]']);
		});

		it('respects a custom maxIndex', () => {
			const suggestions = getArrayIndexSuggestions(4);
			expect(suggestions).toEqual(['0]', '1]', '2]', '3]', '4]', '*]']);
		});

		it('returns only [0] and [*] when maxIndex is 0', () => {
			const suggestions = getArrayIndexSuggestions(0);
			expect(suggestions).toEqual(['0]', '*]']);
		});
	});

	describe('isArrayVariable', () => {
		const schema: VariableSchema = {
			variables: {
				items: {
					name: 'items',
					label: 'Items',
					type: 'array',
					items: { name: 'item', label: 'Item', type: 'string' }
				},
				user: {
					name: 'user',
					label: 'User',
					type: 'object',
					properties: {
						tags: { name: 'tags', label: 'Tags', type: 'array' }
					}
				},
				score: { name: 'score', label: 'Score', type: 'number' }
			}
		};

		it('returns true for a top-level array variable', () => {
			expect(isArrayVariable(schema, 'items')).toBe(true);
		});

		it('returns false for a non-array top-level variable', () => {
			expect(isArrayVariable(schema, 'score')).toBe(false);
		});

		it('returns true for a nested array variable', () => {
			expect(isArrayVariable(schema, 'user.tags')).toBe(true);
		});

		it('returns false for a path that does not exist', () => {
			expect(isArrayVariable(schema, 'nonexistent')).toBe(false);
		});
	});

	describe('hasChildren', () => {
		const schema: VariableSchema = {
			variables: {
				user: {
					name: 'user',
					label: 'User',
					type: 'object',
					properties: {
						name: { name: 'name', label: 'Name', type: 'string' }
					}
				},
				score: { name: 'score', label: 'Score', type: 'number' }
			}
		};

		it('returns true when the variable has nested properties', () => {
			expect(hasChildren(schema, 'user')).toBe(true);
		});

		it('returns false for a leaf variable', () => {
			expect(hasChildren(schema, 'score')).toBe(false);
		});

		it('returns false for a path that does not exist', () => {
			expect(hasChildren(schema, 'nonexistent')).toBe(false);
		});
	});

	describe('mergeVariableSchemas', () => {
		it('combines non-overlapping variables from both schemas', () => {
			const primary: VariableSchema = {
				variables: { a: { name: 'a', label: 'A', type: 'string' } }
			};
			const secondary: VariableSchema = {
				variables: { b: { name: 'b', label: 'B', type: 'number' } }
			};

			const merged = mergeVariableSchemas(primary, secondary);
			expect(Object.keys(merged.variables)).toContain('a');
			expect(Object.keys(merged.variables)).toContain('b');
		});

		it('gives precedence to primary schema on key conflicts', () => {
			const primary: VariableSchema = {
				variables: { x: { name: 'x', label: 'Primary X', type: 'string' } }
			};
			const secondary: VariableSchema = {
				variables: { x: { name: 'x', label: 'Secondary X', type: 'number' } }
			};

			const merged = mergeVariableSchemas(primary, secondary);
			expect(merged.variables.x.label).toBe('Primary X');
			expect(merged.variables.x.type).toBe('string');
		});

		it('handles empty primary schema', () => {
			const primary: VariableSchema = { variables: {} };
			const secondary: VariableSchema = {
				variables: { b: { name: 'b', label: 'B', type: 'boolean' } }
			};

			const merged = mergeVariableSchemas(primary, secondary);
			expect(merged.variables.b.label).toBe('B');
		});

		it('handles empty secondary schema', () => {
			const primary: VariableSchema = {
				variables: { a: { name: 'a', label: 'A', type: 'string' } }
			};
			const secondary: VariableSchema = { variables: {} };

			const merged = mergeVariableSchemas(primary, secondary);
			expect(merged.variables.a.label).toBe('A');
		});

		it('does not mutate the input schemas', () => {
			const primary: VariableSchema = {
				variables: { a: { name: 'a', label: 'A', type: 'string' } }
			};
			const secondary: VariableSchema = {
				variables: { b: { name: 'b', label: 'B', type: 'number' } }
			};

			const primaryVarsBefore = { ...primary.variables };
			const secondaryVarsBefore = { ...secondary.variables };

			mergeVariableSchemas(primary, secondary);

			expect(primary.variables).toEqual(primaryVarsBefore);
			expect(secondary.variables).toEqual(secondaryVarsBefore);
		});
	});
});
