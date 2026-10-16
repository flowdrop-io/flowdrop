/**
 * State tokens must stay distinguishable. In Graphite `primary-muted` and `muted`
 * were both #eceef1, so a hovered option and the chosen one merged into one shape.
 * Every pairing that carries a state (hover, chosen, pressed) must differ per skin and mode.
 */
import { describe, it, expect } from 'vitest';
import { graphiteSkin, slateSkin, drafterSkin } from '$lib/skins/index.js';

const PAIRS: [string, string][] = [
  ['muted', 'primary-muted'],
  ['primary', 'primary-hover'],
  ['secondary', 'secondary-hover'],
  ['accent', 'accent-hover']
];

const skins = { graphite: graphiteSkin, slate: slateSkin, drafter: drafterSkin };

describe('state tokens differ', () => {
  for (const [name, skin] of Object.entries(skins)) {
    for (const [mode, tokens] of [
      ['light', skin.tokens],
      ['dark', skin.darkTokens]
    ] as const) {
      for (const [a, b] of PAIRS) {
        it(`${name} ${mode}: ${a} vs ${b}`, () => {
          const x = tokens?.[a];
          const y = tokens?.[b];
          // A skin that leaves one side to the default is not merging anything.
          if (x === undefined || y === undefined) return;
          expect(x.toLowerCase(), `${a} and ${b} share a value`).not.toBe(y.toLowerCase());
        });
      }
    }
  }

  it('graphite sets both sides of the hover/chosen pair in both modes', () => {
    for (const tokens of [graphiteSkin.tokens, graphiteSkin.darkTokens]) {
      expect(tokens).toHaveProperty('muted');
      expect(tokens).toHaveProperty('primary-muted');
    }
  });
});
