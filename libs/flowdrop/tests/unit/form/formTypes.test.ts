/**
 * Unit Tests - Form Types Utility Functions
 *
 * Tests for normalizeOptions, getSchemaOptions, isFieldOptionArray,
 * isOneOfArray, and oneOfToOptions from form/types.ts
 */

import { describe, it, expect } from "vitest";
import {
	normalizeOptions,
	getSchemaOptions,
	isFieldOptionArray,
	isOneOfArray,
	oneOfToOptions,
	type FieldOption,
	type OneOfItem,
	type FieldSchema
} from "$lib/components/form/types.js";

describe("isFieldOptionArray", () => {
	it("should return true for FieldOption array", () => {
		const options: FieldOption[] = [
			{ value: "a", label: "A" },
			{ value: "b", label: "B" }
		];
		expect(isFieldOptionArray(options)).toBe(true);
	});

	it("should return false for string array", () => {
		const options = ["a", "b", "c"];
		expect(isFieldOptionArray(options)).toBe(false);
	});

	it("should return false for empty array", () => {
		expect(isFieldOptionArray([])).toBe(false);
	});
});

describe("isOneOfArray", () => {
	it("should return true for OneOfItem array", () => {
		const items: OneOfItem[] = [
			{ const: "draft", title: "Draft" },
			{ const: "published", title: "Published" }
		];
		expect(isOneOfArray(items)).toBe(true);
	});

	it("should return false for string array", () => {
		expect(isOneOfArray(["a", "b"])).toBe(false);
	});

	it("should return false for empty array", () => {
		expect(isOneOfArray([])).toBe(false);
	});

	it("should return false for objects without const", () => {
		expect(isOneOfArray([{ value: "a", label: "A" }])).toBe(false);
	});
});

describe("oneOfToOptions", () => {
	it("should convert OneOfItem array to FieldOption array", () => {
		const items: OneOfItem[] = [
			{ const: "draft", title: "Draft" },
			{ const: "published", title: "Published" }
		];
		expect(oneOfToOptions(items)).toEqual([
			{ value: "draft", label: "Draft" },
			{ value: "published", label: "Published" }
		]);
	});

	it("should use const as label when title is missing", () => {
		const items: OneOfItem[] = [{ const: "value1" }, { const: "value2" }];
		expect(oneOfToOptions(items)).toEqual([
			{ value: "value1", label: "value1" },
			{ value: "value2", label: "value2" }
		]);
	});

	it("should convert numeric const values to strings", () => {
		const items: OneOfItem[] = [
			{ const: 1, title: "One" },
			{ const: 2, title: "Two" }
		];
		expect(oneOfToOptions(items)).toEqual([
			{ value: "1", label: "One" },
			{ value: "2", label: "Two" }
		]);
	});

	it("should convert boolean const values to strings", () => {
		const items: OneOfItem[] = [
			{ const: true, title: "Yes" },
			{ const: false, title: "No" }
		];
		expect(oneOfToOptions(items)).toEqual([
			{ value: "true", label: "Yes" },
			{ value: "false", label: "No" }
		]);
	});
});

describe("normalizeOptions", () => {
	it("should normalize string array to FieldOption array", () => {
		expect(normalizeOptions(["a", "b"])).toEqual([
			{ value: "a", label: "a" },
			{ value: "b", label: "b" }
		]);
	});

	it("should pass through FieldOption array", () => {
		const options: FieldOption[] = [
			{ value: "a", label: "A" },
			{ value: "b", label: "B" }
		];
		expect(normalizeOptions(options)).toEqual(options);
	});

	it("should convert OneOfItem array", () => {
		const items: OneOfItem[] = [
			{ const: "draft", title: "Draft" },
			{ const: "published", title: "Published" }
		];
		expect(normalizeOptions(items)).toEqual([
			{ value: "draft", label: "Draft" },
			{ value: "published", label: "Published" }
		]);
	});

	it("should return empty array for empty input", () => {
		expect(normalizeOptions([])).toEqual([]);
	});

	it("should return empty array for null/undefined input", () => {
		expect(normalizeOptions(null as unknown as string[])).toEqual([]);
		expect(normalizeOptions(undefined as unknown as string[])).toEqual([]);
	});
});

describe("getSchemaOptions", () => {
	it("should return options from oneOf", () => {
		const schema: FieldSchema = {
			type: "string",
			oneOf: [
				{ const: "a", title: "A" },
				{ const: "b", title: "B" }
			]
		};
		expect(getSchemaOptions(schema)).toEqual([
			{ value: "a", label: "A" },
			{ value: "b", label: "B" }
		]);
	});

	it("should fall back to deprecated options property", () => {
		const schema: FieldSchema = {
			type: "string",
			options: [
				{ value: "x", label: "X" },
				{ value: "y", label: "Y" }
			]
		};
		expect(getSchemaOptions(schema)).toEqual([
			{ value: "x", label: "X" },
			{ value: "y", label: "Y" }
		]);
	});

	it("should prefer oneOf over options when both are present", () => {
		const schema: FieldSchema = {
			type: "string",
			oneOf: [{ const: "preferred", title: "Preferred" }],
			options: [{ value: "legacy", label: "Legacy" }]
		};
		expect(getSchemaOptions(schema)).toEqual([
			{ value: "preferred", label: "Preferred" }
		]);
	});

	it("should return empty array when no options exist", () => {
		const schema: FieldSchema = { type: "string" };
		expect(getSchemaOptions(schema)).toEqual([]);
	});

	it("should return empty array for empty oneOf", () => {
		const schema: FieldSchema = { type: "string", oneOf: [] };
		expect(getSchemaOptions(schema)).toEqual([]);
	});
});
