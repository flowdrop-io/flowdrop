/**
 * Unit Tests - mergeMessages
 *
 * Verifies the deep-merge contract used to compose `defaultMessages` with a
 * consumer-supplied `MessagesOverride`. The merge is the only piece of the
 * messages module with non-trivial logic, so it carries the test load.
 */

import { describe, it, expect } from 'vitest';
import { mergeMessages, defaultMessages } from '$lib/messages/index.js';
import type { Messages, MessagesOverride } from '$lib/messages/index.js';

describe('mergeMessages', () => {
  it('returns the base reference when partial is undefined', () => {
    const result = mergeMessages(defaultMessages, undefined);
    expect(result).toBe(defaultMessages);
  });

  it('overrides a single leaf string', () => {
    const result = mergeMessages(defaultMessages, { common: { save: 'Apply' } });
    expect(result.common.save).toBe('Apply');
    expect(result.common.cancel).toBe(defaultMessages.common.cancel);
  });

  it('does not mutate the base tree', () => {
    const baseSnapshot = JSON.parse(JSON.stringify(defaultMessages));
    mergeMessages(defaultMessages, { common: { save: 'Apply' } });
    expect(defaultMessages).toEqual(baseSnapshot);
  });

  it('preserves keys that are absent from the partial', () => {
    const result = mergeMessages(defaultMessages, { common: { save: 'Apply' } });
    for (const key of Object.keys(defaultMessages.common) as Array<
      keyof typeof defaultMessages.common
    >) {
      if (key === 'save') continue;
      expect(result.common[key]).toBe(defaultMessages.common[key]);
    }
  });

  it('merges deeply nested branches', () => {
    type NestedBase = {
      a: { b: { c: string; d: string }; e: string };
    };
    const base: NestedBase = { a: { b: { c: 'c', d: 'd' }, e: 'e' } };
    const partial = { a: { b: { c: 'C' } } };

    const result = mergeMessages(
      base as unknown as Messages,
      partial as MessagesOverride
    ) as unknown as NestedBase;

    expect(result.a.b.c).toBe('C');
    expect(result.a.b.d).toBe('d');
    expect(result.a.e).toBe('e');
  });

  it('preserves a function leaf when not overridden', () => {
    const fn = ({ name }: { name: string }) => `Hello, ${name}`;
    const base = { greet: fn } as unknown as Messages;
    const result = mergeMessages(base, {}) as unknown as { greet: typeof fn };
    expect(result.greet).toBe(fn);
  });

  it('replaces a function leaf with another function', () => {
    const original = ({ name }: { name: string }) => `Hello, ${name}`;
    const replacement = ({ name }: { name: string }) => `Hi ${name}!`;
    const base = { greet: original } as unknown as Messages;
    const partial = { greet: replacement } as unknown as MessagesOverride;

    const result = mergeMessages(base, partial) as unknown as { greet: typeof replacement };
    expect(result.greet({ name: 'A' })).toBe('Hi A!');
  });

  it('replaces a function leaf with a plain string', () => {
    const original = ({ name }: { name: string }) => `Hello, ${name}`;
    const base = { greet: original } as unknown as Messages;
    const partial = { greet: 'Hi there' } as unknown as MessagesOverride;

    const result = mergeMessages(base, partial) as unknown as { greet: string };
    expect(result.greet).toBe('Hi there');
  });

  it('does not treat arrays as plain object branches', () => {
    const base = { items: ['a', 'b', 'c'] } as unknown as Messages;
    const partial = { items: ['X'] } as unknown as MessagesOverride;

    const result = mergeMessages(base, partial) as unknown as { items: string[] };
    expect(result.items).toEqual(['X']);
  });

  it('ignores unknown keys when present (forward-compat with stale overrides)', () => {
    const partial = {
      common: { save: 'Apply' },
      futureBranch: { willExist: 'someday' }
    } as unknown as MessagesOverride;

    const result = mergeMessages(defaultMessages, partial);
    expect(result.common.save).toBe('Apply');
    // The unknown branch is copied through but doesn't break typed access.
    expect(
      (result as unknown as { futureBranch: { willExist: string } }).futureBranch.willExist
    ).toBe('someday');
  });
});
