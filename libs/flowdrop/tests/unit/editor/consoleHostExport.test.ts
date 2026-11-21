/** `CommandConsole`'s `editorHost` prop is typed `ConsoleHost`: a host can name it from `./editor`. */

import { describe, it, expect } from 'vitest';
import type { ConsoleHost } from '../../../src/lib/editor/index.js';

describe('./editor entry', () => {
  it('exports the ConsoleHost type (checked by svelte-check)', () => {
    const host: ConsoleHost = {};
    expect(host).toEqual({});
  });
});
