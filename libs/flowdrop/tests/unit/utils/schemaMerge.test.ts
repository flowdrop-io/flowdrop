import { describe, it, expect } from 'vitest';
import { applyFetchedSchema } from '../../../src/lib/utils/schemaMerge.js';
import type { ConfigSchema } from '../../../src/lib/types/index.js';

const base: ConfigSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    retries: { type: 'number', title: 'Retries', default: 3 }
  },
  required: ['name']
};

const fetched: ConfigSchema = {
  type: 'object',
  properties: {
    retries: { type: 'number', title: 'Retries (server)', maximum: 10 },
    timeout: { type: 'number', title: 'Timeout' }
  },
  required: ['timeout']
};

describe('applyFetchedSchema', () => {
  it('defaults to replace: fetched schema wins wholesale', () => {
    expect(applyFetchedSchema(base, fetched, {})).toEqual(fetched);
    expect(applyFetchedSchema(base, fetched, { mergeStrategy: 'replace' })).toEqual(fetched);
  });

  it('returns the fetched schema when there is no static schema to combine with', () => {
    expect(applyFetchedSchema(undefined, fetched, { mergeStrategy: 'merge' })).toEqual(fetched);
  });

  describe('merge (no target)', () => {
    const result = applyFetchedSchema(base, fetched, { mergeStrategy: 'merge' });

    it('keeps static-only fields', () => {
      expect(result.properties.name).toEqual({ type: 'string', title: 'Name' });
    });

    it('lets fetched fields win per key, replacing the whole field', () => {
      expect(result.properties.retries).toEqual({
        type: 'number',
        title: 'Retries (server)',
        maximum: 10
      });
    });

    it('adds fetched-only fields', () => {
      expect(result.properties.timeout).toEqual({ type: 'number', title: 'Timeout' });
    });

    it('unions required from both', () => {
      expect(result.required?.sort()).toEqual(['name', 'timeout']);
    });

    it('does not mutate the inputs', () => {
      expect(base.properties.retries).toEqual({ type: 'number', title: 'Retries', default: 3 });
      expect(base.required).toEqual(['name']);
    });
  });

  describe('target', () => {
    const sectioned: ConfigSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        advanced: {
          type: 'object',
          title: 'Advanced',
          properties: {
            existing: { type: 'string' }
          }
        }
      }
    };

    it('replaces only the targeted property, leaving the rest static', () => {
      const result = applyFetchedSchema(sectioned, fetched, { target: 'advanced' });
      // Untargeted field untouched.
      expect(result.properties.name).toEqual({ type: 'string' });
      // Targeted property replaced by the fetched schema (default replace).
      expect(result.properties.advanced).toEqual(fetched);
    });

    it('merges into the targeted property when strategy is merge', () => {
      const result = applyFetchedSchema(sectioned, fetched, {
        target: 'advanced',
        mergeStrategy: 'merge'
      });
      const advanced = result.properties.advanced as ConfigSchema & { title?: string };
      // Existing attributes on the target node are preserved.
      expect(advanced.title).toBe('Advanced');
      // Existing child kept, fetched children merged in.
      expect(advanced.properties?.existing).toEqual({ type: 'string' });
      expect(advanced.properties?.timeout).toEqual({ type: 'number', title: 'Timeout' });
      expect(result.properties.name).toEqual({ type: 'string' });
    });

    it('descends a dot-path to a nested property', () => {
      const nested: ConfigSchema = {
        type: 'object',
        properties: {
          advanced: {
            type: 'object',
            properties: {
              retry: { type: 'object', title: 'Retry', properties: {} }
            }
          }
        }
      };
      const result = applyFetchedSchema(nested, fetched, {
        target: 'advanced.retry',
        mergeStrategy: 'replace'
      });
      const retry = (result.properties.advanced as ConfigSchema).properties?.retry;
      expect(retry).toEqual(fetched);
    });

    it('does not mutate the input when targeting', () => {
      applyFetchedSchema(sectioned, fetched, { target: 'advanced' });
      expect((sectioned.properties.advanced as ConfigSchema).properties).toEqual({
        existing: { type: 'string' }
      });
    });
  });
});
