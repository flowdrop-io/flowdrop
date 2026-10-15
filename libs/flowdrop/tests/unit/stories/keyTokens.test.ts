import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseTokens } from '../../../src/lib/stories/tokens/parseTokens';
import { allKeyTokenNames } from '../../../src/lib/stories/foundations/keyTokens';
import { readComponentHeader } from '../../../.storybook/componentDescriptions';

const css = readFileSync(resolve(__dirname, '../../../src/lib/styles/tokens.css'), 'utf8');
const declared = new Set(parseTokens(css).map((t) => t.name));

describe('Foundations key tokens', () => {
  it('names only tokens that tokens.css declares', () => {
    const missing = allKeyTokenNames().filter((name) => !declared.has(name));
    expect(missing).toEqual([]);
  });

  it('names only public tokens', () => {
    const internal = parseTokens(css)
      .filter((t) => t.visibility === 'internal')
      .map((t) => t.name);
    expect(allKeyTokenNames().filter((n) => internal.includes(n))).toEqual([]);
  });
});

describe('readComponentHeader', () => {
  it('returns the dedented @component text', () => {
    const src = `<!--\n  @component\n  First line.\n\n  **Use it for** things.\n-->\n<script></script>`;
    expect(readComponentHeader(src)).toBe('First line.\n\n**Use it for** things.');
  });

  it('ignores a plain header comment', () => {
    expect(readComponentHeader('<!--\n  Just a note.\n-->')).toBeNull();
  });
});
