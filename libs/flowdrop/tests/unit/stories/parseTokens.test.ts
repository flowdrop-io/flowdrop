import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseTokens,
  groupBySection,
  resolveLiteral
} from '../../../src/lib/stories/tokens/parseTokens';

const SAMPLE = `
/** header @public @internal --fd-ghost: nope; */
:root {
  /* Grays - tinted */
  --_gray-1: #fafafc; /* @internal */

  /* ----- SPACING SCALE (Named sizes) ----- */
  --fd-space-xs: 0.5rem; /* @public  8px */
  --fd-font-sans:
    system-ui,
    sans-serif; /* @public */
  --fd-plain: var(--_gray-1);
}
[data-theme='dark'] {
  /* ----- SURFACES ----- */
  --fd-background: #000; /* @public */
}
`;

describe('parseTokens', () => {
  const tokens = parseTokens(SAMPLE);
  const by = (n: string, theme = 'light') => tokens.find((t) => t.name === n && t.theme === theme)!;

  it('ignores declarations inside comments', () => {
    expect(tokens.find((t) => t.name === '--fd-ghost')).toBeUndefined();
  });

  it('reads markers, notes, sections and themes', () => {
    expect(by('--_gray-1')).toMatchObject({ visibility: 'internal', section: 'Grays - tinted' });
    expect(by('--fd-space-xs')).toMatchObject({
      visibility: 'public',
      note: '8px',
      section: 'SPACING SCALE (Named sizes)',
      category: 'spacing'
    });
    expect(by('--fd-background', 'dark')).toMatchObject({ theme: 'dark', section: 'SURFACES' });
  });

  it('handles multi-line values and unmarked tokens', () => {
    expect(by('--fd-font-sans').value).toBe('system-ui, sans-serif');
    expect(by('--fd-plain').visibility).toBe('public');
    expect(by('--fd-plain').category).toBe('colour');
  });

  it('resolves var() chains', () => {
    const light = new Map([
      ['--a', 'var(--b)'],
      ['--b', '#fff']
    ]);
    expect(resolveLiteral('var(--a)', light)).toBe('#fff');
  });

  it('groups by section in file order', () => {
    expect(groupBySection(tokens).map((g) => g.section)).toEqual([
      'Grays - tinted',
      'SPACING SCALE (Named sizes)',
      'SURFACES'
    ]);
  });
});

// Read with fs: vitest blanks CSS `?raw` imports unless css processing is on.
const tokensCss = readFileSync(resolve(process.cwd(), 'src/lib/styles/tokens.css'), 'utf8');

describe('real tokens.css', () => {
  const tokens = parseTokens(tokensCss);

  it('finds public and internal tokens in both themes', () => {
    expect(tokens.length).toBeGreaterThan(200);
    expect(tokens.some((t) => t.visibility === 'internal' && t.name.startsWith('--_'))).toBe(true);
    expect(tokens.some((t) => t.theme === 'dark' && t.name === '--fd-background')).toBe(true);
  });

  it('every --_ token is internal and every token has a section', () => {
    for (const t of tokens) {
      if (t.name.startsWith('--_')) expect(t.visibility).toBe('internal');
      expect(t.section, t.name).not.toBe('');
    }
  });

  it('categorizes the scales the Tokens pages render', () => {
    const cat = (n: string) => tokens.find((t) => t.name === n)?.category;
    expect(cat('--fd-space-md')).toBe('spacing');
    expect(cat('--fd-radius-lg')).toBe('radius');
    expect(cat('--fd-shadow-md')).toBe('shadow');
    expect(cat('--fd-text-sm')).toBe('text');
    expect(cat('--fd-control-md')).toBe('size');
    expect(cat('--fd-panel-header')).toBe('size');
    expect(cat('--fd-status-running')).toBe('status');
    expect(cat('--fd-primary')).toBe('colour');
  });
});
