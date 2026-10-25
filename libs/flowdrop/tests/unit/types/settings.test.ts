import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_FIELD_SCHEMA,
  SETTINGS_CATEGORIES
} from '$lib/types/settings.js';

describe('SETTINGS_FIELD_SCHEMA', () => {
  it('covers every category', () => {
    expect(Object.keys(SETTINGS_FIELD_SCHEMA).sort()).toEqual([...SETTINGS_CATEGORIES].sort());
  });

  for (const category of SETTINGS_CATEGORIES) {
    describe(category, () => {
      const defaults = DEFAULT_SETTINGS[category] as unknown as Record<string, unknown>;
      const schema = SETTINGS_FIELD_SCHEMA[category];

      it('has an entry for every default key and no others', () => {
        expect(Object.keys(schema).sort()).toEqual(Object.keys(defaults).sort());
      });

      it('matches the type of each default', () => {
        for (const [key, entry] of Object.entries(schema)) {
          expect(typeof defaults[key], `${category}.${key}`).toBe(entry.type);
          expect(entry.label.length, `${category}.${key} label`).toBeGreaterThan(0);
        }
      });

      it('keeps string defaults inside their enum', () => {
        for (const [key, entry] of Object.entries(schema)) {
          if (entry.enum) {
            expect(entry.enum, `${category}.${key}`).toContain(defaults[key]);
          }
        }
      });

      it('keeps number defaults inside their bounds', () => {
        for (const [key, entry] of Object.entries(schema)) {
          const value = defaults[key];
          if (typeof value !== 'number') continue;
          if (entry.minimum !== undefined) expect(value).toBeGreaterThanOrEqual(entry.minimum);
          if (entry.maximum !== undefined) expect(value).toBeLessThanOrEqual(entry.maximum);
        }
      });
    });
  }
});
