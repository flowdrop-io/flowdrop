import { describe, it, expect } from 'vitest';
import {
  classifyWarning,
  compare,
  normalize,
  totals
  // @ts-expect-error plain .mjs without types
} from '../../../scripts/style-ratchet-lib.mjs';

describe('style ratchet', () => {
  it('classifies stylelint warnings by rule and property', () => {
    const w = (rule: string, text = '') => ({ rule, text });
    expect(classifyWarning(w('color-no-hex'))).toBe('colour');
    expect(classifyWarning(w('function-disallowed-list'))).toBe('colour');
    const bad = (p: string) =>
      w('declaration-property-value-allowed-list', `Disallowed value "1px" for property "${p}"`);
    expect(classifyWarning(bad('font-size'))).toBe('font-size');
    expect(classifyWarning(bad('border-top-left-radius'))).toBe('radius');
    expect(classifyWarning(bad('box-shadow'))).toBe('shadow');
    expect(classifyWarning(w('something-else'))).toBeNull();
  });

  it('normalizes: sorted keys, no zeros, no empty files', () => {
    const out = normalize({ b: { x: 0 }, a: { z: 1, y: 2 } });
    expect(JSON.stringify(out)).toBe('{"a":{"y":2,"z":1}}');
  });

  it('flags increases, new files and decreases separately', () => {
    const baseline = { 'a.svelte': { colour: 3, button: 1 }, 'b.svelte': { radius: 2 } };
    const current = { 'a.svelte': { colour: 4 }, 'c.svelte': { shadow: 1 } };
    const { increases, decreases } = compare(baseline, current);
    expect(increases).toEqual([
      { file: 'a.svelte', rule: 'colour', from: 3, to: 4 },
      { file: 'c.svelte', rule: 'shadow', from: 0, to: 1 }
    ]);
    expect(decreases).toEqual([
      { file: 'a.svelte', rule: 'button', from: 1, to: 0 },
      { file: 'b.svelte', rule: 'radius', from: 2, to: 0 }
    ]);
  });

  it('is clean when nothing changed, and sums totals per rule', () => {
    const counts = { a: { colour: 2 }, b: { colour: 1, button: 3 } };
    expect(compare(counts, counts)).toEqual({ increases: [], decreases: [] });
    expect(totals(counts)).toMatchObject({ colour: 3, button: 3, radius: 0 });
  });
});
