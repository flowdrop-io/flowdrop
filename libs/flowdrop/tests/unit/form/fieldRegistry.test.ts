/**
 * Unit Tests - Field Registry
 *
 * Tests for the form field component registry, including matchers and registration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	fieldComponentRegistry,
	hiddenFieldMatcher,
	checkboxGroupMatcher,
	enumSelectMatcher,
	textareaMatcher,
	rangeMatcher,
	textFieldMatcher,
	numberFieldMatcher,
	toggleMatcher,
	selectOptionsMatcher,
	arrayMatcher,
	autocompleteMatcher,
	type FieldMatcher
} from '$lib/form/fieldRegistry.js';
import type { FieldSchema } from '$lib/components/form/types.js';

describe('Field Registry', () => {
	beforeEach(() => {
		fieldComponentRegistry.clear();
	});

	describe('register', () => {
		it('should register a field component', () => {
			const mockComponent = {} as never;
			const mockMatcher: FieldMatcher = () => true;

			fieldComponentRegistry.register('test', { component: mockComponent, matcher: mockMatcher, priority: 10 });

			expect(fieldComponentRegistry.has('test')).toBe(true);
			expect(fieldComponentRegistry.getKeys()).toContain('test');
		});

		it('should track registry size correctly', () => {
			const mockComponent = {} as never;
			const mockMatcher: FieldMatcher = () => true;

			expect(fieldComponentRegistry.size).toBe(0);

			fieldComponentRegistry.register('type1', { component: mockComponent, matcher: mockMatcher, priority: 0 });
			expect(fieldComponentRegistry.size).toBe(1);

			fieldComponentRegistry.register('type2', { component: mockComponent, matcher: mockMatcher, priority: 0 });
			expect(fieldComponentRegistry.size).toBe(2);
		});
	});

	describe('unregister', () => {
		it('should unregister a field component', () => {
			const mockComponent = {} as never;
			const mockMatcher: FieldMatcher = () => true;

			fieldComponentRegistry.register('test', { component: mockComponent, matcher: mockMatcher, priority: 0 });
			expect(fieldComponentRegistry.has('test')).toBe(true);

			const removed = fieldComponentRegistry.unregister('test');

			expect(removed).toBe(true);
			expect(fieldComponentRegistry.has('test')).toBe(false);
		});

		it('should return false when unregistering non-existent type', () => {
			const removed = fieldComponentRegistry.unregister('nonexistent');

			expect(removed).toBe(false);
		});
	});

	describe('resolveFieldComponent', () => {
		it('should resolve matching component by priority', () => {
			const highPriorityComponent = { name: 'high' } as never;
			const lowPriorityComponent = { name: 'low' } as never;
			const alwaysTrueMatcher: FieldMatcher = () => true;

			fieldComponentRegistry.register('low', { component: lowPriorityComponent, matcher: alwaysTrueMatcher, priority: 10 });
			fieldComponentRegistry.register('high', { component: highPriorityComponent, matcher: alwaysTrueMatcher, priority: 100 });

			const schema: FieldSchema = { type: 'string' };
			const result = fieldComponentRegistry.resolveFieldComponent(schema);

			expect(result?.component).toBe(highPriorityComponent);
		});

		it('should return null when no matcher matches', () => {
			const mockComponent = {} as never;
			const neverMatcher: FieldMatcher = () => false;

			fieldComponentRegistry.register('test', { component: mockComponent, matcher: neverMatcher, priority: 0 });

			const schema: FieldSchema = { type: 'string' };
			const result = fieldComponentRegistry.resolveFieldComponent(schema);

			expect(result).toBeNull();
		});
	});

	describe('Built-in Matchers', () => {
		describe('hiddenFieldMatcher', () => {
			it('should match hidden format', () => {
				const schema: FieldSchema = { type: 'string', format: 'hidden' };
				expect(hiddenFieldMatcher(schema)).toBe(true);
			});

			it('should not match other formats', () => {
				const schema: FieldSchema = { type: 'string', format: 'multiline' };
				expect(hiddenFieldMatcher(schema)).toBe(false);
			});
		});

		describe('checkboxGroupMatcher', () => {
			it('should match enum with multiple', () => {
				const schema: FieldSchema = {
					type: 'string',
					enum: ['a', 'b', 'c'],
					multiple: true
				};
				expect(checkboxGroupMatcher(schema)).toBe(true);
			});

			it('should not match enum without multiple', () => {
				const schema: FieldSchema = {
					type: 'string',
					enum: ['a', 'b', 'c']
				};
				expect(checkboxGroupMatcher(schema)).toBe(false);
			});
		});

		describe('enumSelectMatcher', () => {
			it('should match enum without multiple', () => {
				const schema: FieldSchema = {
					type: 'string',
					enum: ['a', 'b', 'c']
				};
				expect(enumSelectMatcher(schema)).toBe(true);
			});

			it('should not match enum with multiple', () => {
				const schema: FieldSchema = {
					type: 'string',
					enum: ['a', 'b', 'c'],
					multiple: true
				};
				expect(enumSelectMatcher(schema)).toBe(false);
			});
		});

		describe('textareaMatcher', () => {
			it('should match string with multiline format', () => {
				const schema: FieldSchema = { type: 'string', format: 'multiline' };
				expect(textareaMatcher(schema)).toBe(true);
			});

			it('should not match string without multiline format', () => {
				const schema: FieldSchema = { type: 'string' };
				expect(textareaMatcher(schema)).toBe(false);
			});
		});

		describe('rangeMatcher', () => {
			it('should match number with range format', () => {
				const schema: FieldSchema = { type: 'number', format: 'range' };
				expect(rangeMatcher(schema)).toBe(true);
			});

			it('should match integer with range format', () => {
				const schema: FieldSchema = { type: 'integer', format: 'range' };
				expect(rangeMatcher(schema)).toBe(true);
			});

			it('should not match number without range format', () => {
				const schema: FieldSchema = { type: 'number' };
				expect(rangeMatcher(schema)).toBe(false);
			});
		});

		describe('textFieldMatcher', () => {
			it('should match string without format', () => {
				const schema: FieldSchema = { type: 'string' };
				expect(textFieldMatcher(schema)).toBe(true);
			});

			it('should not match string with format', () => {
				const schema: FieldSchema = { type: 'string', format: 'multiline' };
				expect(textFieldMatcher(schema)).toBe(false);
			});
		});

		describe('numberFieldMatcher', () => {
			it('should match number type', () => {
				const schema: FieldSchema = { type: 'number' };
				expect(numberFieldMatcher(schema)).toBe(true);
			});

			it('should match integer type', () => {
				const schema: FieldSchema = { type: 'integer' };
				expect(numberFieldMatcher(schema)).toBe(true);
			});

			it('should not match number with range format', () => {
				const schema: FieldSchema = { type: 'number', format: 'range' };
				expect(numberFieldMatcher(schema)).toBe(false);
			});
		});

		describe('toggleMatcher', () => {
			it('should match boolean type', () => {
				const schema: FieldSchema = { type: 'boolean' };
				expect(toggleMatcher(schema)).toBe(true);
			});

			it('should not match other types', () => {
				const schema: FieldSchema = { type: 'string' };
				expect(toggleMatcher(schema)).toBe(false);
			});
		});

		describe('selectOptionsMatcher', () => {
			it('should match schema with oneOf (standard JSON Schema)', () => {
				const schema: FieldSchema = {
					type: 'string',
					oneOf: [
						{ const: 'a', title: 'Option A' },
						{ const: 'b', title: 'Option B' }
					]
				};
				expect(selectOptionsMatcher(schema)).toBe(true);
			});

			it('should match schema with options (legacy, deprecated)', () => {
				const schema: FieldSchema = {
					type: 'string',
					options: [{ label: 'A', value: 'a' }]
				};
				expect(selectOptionsMatcher(schema)).toBe(true);
			});

			it('should not match schema without oneOf or options', () => {
				const schema: FieldSchema = { type: 'string' };
				expect(selectOptionsMatcher(schema)).toBe(false);
			});

			it('should not match empty oneOf array', () => {
				const schema: FieldSchema = {
					type: 'string',
					oneOf: []
				};
				expect(selectOptionsMatcher(schema)).toBe(false);
			});
		});

		describe('arrayMatcher', () => {
			it('should match array type with items', () => {
				const schema: FieldSchema = {
					type: 'array',
					items: { type: 'string' }
				};
				expect(arrayMatcher(schema)).toBe(true);
			});

			it('should not match array type without items', () => {
				const schema: FieldSchema = { type: 'array' };
				expect(arrayMatcher(schema)).toBe(false);
			});
		});

		describe('autocompleteMatcher', () => {
			it('should match autocomplete format with url', () => {
				const schema: FieldSchema = {
					type: 'string',
					format: 'autocomplete',
					autocomplete: {
						url: '/api/users/search'
					}
				};
				expect(autocompleteMatcher(schema)).toBe(true);
			});

			it('should match autocomplete with full config', () => {
				const schema: FieldSchema = {
					type: 'string',
					format: 'autocomplete',
					autocomplete: {
						url: '/api/users/search',
						queryParam: 'q',
						minChars: 2,
						debounceMs: 300,
						fetchOnFocus: true,
						labelField: 'name',
						valueField: 'id',
						allowFreeText: false
					}
				};
				expect(autocompleteMatcher(schema)).toBe(true);
			});

			it('should not match autocomplete format without url', () => {
				const schema: FieldSchema = {
					type: 'string',
					format: 'autocomplete',
					autocomplete: {} as never
				};
				expect(autocompleteMatcher(schema)).toBe(false);
			});

			it('should not match autocomplete format without autocomplete config', () => {
				const schema: FieldSchema = {
					type: 'string',
					format: 'autocomplete'
				};
				expect(autocompleteMatcher(schema)).toBe(false);
			});

			it('should not match other formats', () => {
				const schema: FieldSchema = {
					type: 'string',
					format: 'multiline'
				};
				expect(autocompleteMatcher(schema)).toBe(false);
			});

			it('should not match string type without format', () => {
				const schema: FieldSchema = {
					type: 'string'
				};
				expect(autocompleteMatcher(schema)).toBe(false);
			});
		});
	});

	describe('fieldComponentRegistry class API', () => {
		describe('subscribe', () => {
			it('should notify listeners on register', () => {
				let callCount = 0;
				const unsubscribe = fieldComponentRegistry.subscribe(() => callCount++);

				fieldComponentRegistry.register('test-sub', { component: {} as never, matcher: () => true, priority: 0 });
				expect(callCount).toBe(1);

				unsubscribe();
				fieldComponentRegistry.register('test-sub2', { component: {} as never, matcher: () => true, priority: 0 });
				expect(callCount).toBe(1); // No longer called
			});

			it('should notify listeners on unregister', () => {
				fieldComponentRegistry.register('test-unsub', { component: {} as never, matcher: () => true, priority: 0 });

				let callCount = 0;
				const unsubscribe = fieldComponentRegistry.subscribe(() => callCount++);

				fieldComponentRegistry.unregister('test-unsub');
				expect(callCount).toBe(1);

				unsubscribe();
			});

			it('should notify listeners on clear', () => {
				let callCount = 0;
				const unsubscribe = fieldComponentRegistry.subscribe(() => callCount++);

				fieldComponentRegistry.clear();
				expect(callCount).toBe(1);

				unsubscribe();
			});
		});

		describe('onClear', () => {
			it('should call onClear callbacks when clear is called', () => {
				let cleared = false;
				const unsubscribe = fieldComponentRegistry.onClear(() => {
					cleared = true;
				});

				fieldComponentRegistry.register('test-onclear', { component: {} as never, matcher: () => true, priority: 0 });
				expect(cleared).toBe(false);

				fieldComponentRegistry.clear();
				expect(cleared).toBe(true);

				unsubscribe();
			});

			it('should call onClear before subscribe listeners', () => {
				const order: string[] = [];
				const unsub1 = fieldComponentRegistry.onClear(() => order.push('onClear'));
				const unsub2 = fieldComponentRegistry.subscribe(() => order.push('listener'));

				fieldComponentRegistry.clear();
				expect(order).toEqual(['onClear', 'listener']);

				unsub1();
				unsub2();
			});
		});

		describe('resolveFieldComponent via class', () => {
			it('should resolve via the singleton instance', () => {
				fieldComponentRegistry.register('test-resolve', { component: {} as never, matcher: (s) => s.format === 'test', priority: 50 });

				const result = fieldComponentRegistry.resolveFieldComponent({
					format: 'test'
				} as FieldSchema);
				expect(result).not.toBeNull();
				expect(result!.priority).toBe(50);
			});
		});
	});
});
