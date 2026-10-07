import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildAliasMaps, parseTokenDeclarations } from '../../../scripts/parse-token-aliases.mjs';
import { LIGHT_ALIASES, DARK_ALIASES } from '../../../src/lib/styles/tokenAliases.js';

const styles = resolve(__dirname, '../../../src/lib/styles');
const read = (f: string) => readFileSync(resolve(styles, f), 'utf8');

describe('tokenAliases.ts', () => {
  it('matches tokens.css + base.css (run `pnpm run generate:token-aliases` if this fails)', () => {
    const maps = buildAliasMaps([read('tokens.css'), read('base.css')]);
    expect(LIGHT_ALIASES).toEqual(maps.light);
    expect(DARK_ALIASES).toEqual(maps.dark);
  });

  it('finds the known aliases', () => {
    expect(LIGHT_ALIASES['panel-bg']).toBe('var(--fd-background)');
    expect(LIGHT_ALIASES['note-border']).toBe('var(--fd-node-border)');
    expect(LIGHT_ALIASES['interrupt-pending-border']).toBe('var(--fd-warning)');
    expect(DARK_ALIASES['interrupt-selected-decline-bg']).toBe('rgba(248, 113, 113, 0.15)');
  });
});

describe('parseTokenDeclarations', () => {
  it('reads :root and dark blocks, ignores comments and multi-line values', () => {
    const { light, dark } = parseTokenDeclarations(`
      :root { --fd-a: 1; /* var(--fd-x) */ --fd-b: linear-gradient(
        135deg, var(--fd-a) 0%, red 100%); }
      .x { --fd-c: 3; }
      [data-theme='dark'] { --fd-a: 2; }
    `);
    expect(light).toEqual({ a: '1', b: 'linear-gradient(135deg, var(--fd-a) 0%, red 100%)' });
    expect(dark).toEqual({ a: '2' });
  });
});
