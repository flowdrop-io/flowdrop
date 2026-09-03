/**
 * WebMCP adapter — argument validation.
 *
 * A hand-written validator for exactly the JSON Schema subset the tool
 * descriptors use. That subset is `ToolSchemaProperty` in `./types.ts`: the
 * type is the contract, and this file must understand every keyword it
 * declares — `VALIDATOR_KEYWORDS` lists them, and a test in
 * `tests/unit/webmcp` walks every schema and fails when a schema uses a key
 * this set lacks. Adding a keyword therefore means adding it in three places:
 * the type, the check below, and the set. No dependency is taken for this;
 * the schemas are small, hand-written, and never come from outside the
 * library.
 *
 * The runtime is supposed to validate too. Chrome's behaviour there is not
 * something to lean on yet, and validating here keeps behaviour identical
 * across runtimes and against the fake used in tests.
 *
 * @module webmcp/validate
 */

import { ToolArgumentError, type ToolInputSchema, type ToolSchemaProperty } from './types.js';

/**
 * Every schema keyword the validator understands. `description` is listed
 * because it is a keyword schemas use, even though it needs no check.
 */
export const VALIDATOR_KEYWORDS: ReadonlySet<keyof ToolSchemaProperty> = new Set<
  keyof ToolSchemaProperty
>([
  'type',
  'description',
  'enum',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'anyOf',
  'minimum',
  'maximum'
]);

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value: unknown, type: NonNullable<ToolSchemaProperty['type']>): boolean {
  switch (type) {
    case 'string':
    case 'boolean':
      return typeof value === type;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'object':
      return typeOf(value) === 'object';
    case 'array':
      return Array.isArray(value);
  }
}

function validateProperty(path: string, value: unknown, schema: ToolSchemaProperty): void {
  if (schema.anyOf) {
    if (!schema.anyOf.some((alt) => !alt.type || matchesType(value, alt.type))) {
      throw new ToolArgumentError(
        `${path}: expected one of ${schema.anyOf.map((a) => a.type).join(', ')}, got ${typeOf(value)}`
      );
    }
    return;
  }
  if (schema.type && !matchesType(value, schema.type)) {
    throw new ToolArgumentError(`${path}: expected ${schema.type}, got ${typeOf(value)}`);
  }
  if (schema.enum && !schema.enum.includes(value as string)) {
    throw new ToolArgumentError(
      `${path}: expected one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}, got ${JSON.stringify(value)}`
    );
  }
  if (schema.minimum !== undefined && (value as number) < schema.minimum) {
    throw new ToolArgumentError(`${path}: must be >= ${schema.minimum}`);
  }
  if (schema.maximum !== undefined && (value as number) > schema.maximum) {
    throw new ToolArgumentError(`${path}: must be <= ${schema.maximum}`);
  }
  if (schema.type === 'object' && schema.properties) {
    validateObject(path, value as Record<string, unknown>, schema);
  }
  if (schema.type === 'array' && schema.items) {
    (value as unknown[]).forEach((item, i) =>
      validateProperty(`${path}[${i}]`, item, schema.items!)
    );
  }
}

function validateObject(
  path: string,
  value: Record<string, unknown>,
  schema: Pick<ToolSchemaProperty, 'properties' | 'required' | 'additionalProperties'>
): void {
  const props = schema.properties ?? {};
  for (const key of schema.required ?? []) {
    if (value[key] === undefined) {
      throw new ToolArgumentError(`${path ? path + '.' : ''}${key} is required`);
    }
  }
  for (const [key, v] of Object.entries(value)) {
    if (v === undefined) continue;
    const prop = props[key];
    if (!prop) {
      if (schema.additionalProperties === false) {
        throw new ToolArgumentError(`${path ? path + '.' : ''}${key}: unknown property`);
      }
      continue;
    }
    validateProperty(`${path ? path + '.' : ''}${key}`, v, prop);
  }
}

/**
 * Validate raw tool input against a tool's schema and return it typed as an
 * argument object.
 *
 * @throws ToolArgumentError
 */
export function validateToolArgs(schema: ToolInputSchema, input: unknown): Record<string, unknown> {
  const args = input === undefined || input === null ? {} : input;
  if (typeOf(args) !== 'object') {
    throw new ToolArgumentError(`arguments must be an object, got ${typeOf(args)}`);
  }
  validateObject('', args as Record<string, unknown>, schema);
  return args as Record<string, unknown>;
}
