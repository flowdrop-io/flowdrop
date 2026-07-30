/**
 * Unit Test — AI-initiated layout changes are opt-out-able (issue #36)
 *
 * Two halves of the fix are pinned here:
 *  1. the `chatAllowLayoutChanges` behaviour setting exists with a documented
 *     default (the AI panel reads it to skip `layout …` commands), and
 *  2. the shipped DSL prompts no longer tell the assistant to tidy up the
 *     layout on its own — the root cause of a beautify nobody asked for.
 *
 * The prompt docs are the source the chat backend renders into its system
 * prompt, so a regression there silently reintroduces the bug; hence the
 * (deliberately loose) text assertions.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_BEHAVIOR_SETTINGS } from '../../../src/lib/types/settings.js';

// Vitest runs with the package root as cwd (import.meta.url isn't a file URL
// under the happy-dom environment).
const docsDir = resolve(process.cwd(), 'docs');
const prompts = ['dsl-system-prompt.md', 'dsl-llm-prompt.md'];

describe('chatAllowLayoutChanges setting', () => {
  it('defaults to allowed (opt-out, not a silent behaviour change)', () => {
    expect(DEFAULT_BEHAVIOR_SETTINGS.chatAllowLayoutChanges).toBe(true);
  });
});

describe('DSL prompts do not ask for unprompted layout changes', () => {
  it.each(prompts)('%s marks layout commands as user-requested only', (file) => {
    const text = readFileSync(resolve(docsDir, file), 'utf8').toLowerCase();

    // The prohibition is stated somewhere in the prompt.
    expect(text).toContain('user-requested only');

    // And the old "tidy up afterwards" instructions are gone.
    expect(text).not.toMatch(/use `layout auto` to auto-arrange after building/);
    expect(text).not.toMatch(/or use `layout auto` after building/);
  });
});
