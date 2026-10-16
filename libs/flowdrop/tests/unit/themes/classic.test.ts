import { describe, it, expect } from 'vitest';
import {
  classicTheme,
  defaultTheme,
  normalizeThemeName,
  resolveTheme
} from '../../../src/lib/themes/index';

describe('Classic theme (formerly "default")', () => {
  it('resolves by its new name', () => {
    expect(resolveTheme('classic')).toBe(classicTheme);
    expect(classicTheme.name).toBe('classic');
  });

  it('still resolves the old name "default"', () => {
    expect(resolveTheme('default')).toBe(classicTheme);
    expect(defaultTheme).toBe(classicTheme);
  });

  it('merges inline overrides over the old name like the new one', () => {
    const viaOld = resolveTheme({ name: 'default', skin: { tokens: { primary: '#e11d48' } } });
    const viaNew = resolveTheme({ name: 'classic', skin: { tokens: { primary: '#e11d48' } } });
    expect(viaOld).toEqual(viaNew);
  });

  it('normalizes only the old name', () => {
    expect(normalizeThemeName('default')).toBe('classic');
    expect(normalizeThemeName('graphite')).toBe('graphite');
    expect(normalizeThemeName('my-theme')).toBe('my-theme');
  });
});
