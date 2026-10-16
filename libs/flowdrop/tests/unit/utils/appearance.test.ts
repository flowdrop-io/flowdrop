import { describe, it, expect } from 'vitest';
import { appearanceChoices } from '../../../src/lib/utils/appearance.js';

const labels = { light: 'Light', dark: 'Dark', system: 'System' };

describe('appearanceChoices', () => {
  it('without a host: Light, Dark, System (unchanged)', () => {
    expect(appearanceChoices(null, labels)).toEqual([
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'auto', label: 'System' }
    ]);
  });

  it("with a host: the host's own label first, verbatim", () => {
    expect(appearanceChoices({ label: 'Match host' }, labels)).toEqual([
      { value: 'host', label: 'Match host' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' }
    ]);
  });
});
