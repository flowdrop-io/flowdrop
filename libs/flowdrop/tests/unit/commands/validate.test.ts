/**
 * validateCommand on a hand-built Command object: the Playground chat edit is
 * checked variant by variant, so a bad one never reaches the stored binding.
 */

import { describe, it, expect } from 'vitest';
import { validateCommand } from '../../../src/lib/commands/validate.js';

const chat = (edit: unknown) => validateCommand({ type: 'playground_chat', edit });

describe('validateCommand — playground_chat edits', () => {
  it('accepts every well-formed variant', () => {
    for (const edit of [
      { kind: 'input', key: 'message', id: 'q' },
      { kind: 'input', key: 'history', id: null, limit: 5 },
      { kind: 'limit', limit: 3 },
      { kind: 'reply', mode: 'add', nodeId: 'a.1', port: 'text' },
      { kind: 'sub_replies', on: true },
      { kind: 'off' },
      { kind: 'move_turns' }
    ]) {
      expect(chat(edit), JSON.stringify(edit)).toBeNull();
    }
  });

  it('refuses an unknown key, a string for a boolean and a missing field', () => {
    for (const edit of [
      { kind: 'input', key: 'nope', id: 'q' },
      { kind: 'input', key: 'message' },
      { kind: 'input', key: 'message', id: 5 },
      { kind: 'input', key: 'history', id: 'q', limit: 'many' },
      { kind: 'limit' },
      { kind: 'reply', mode: 'toggle', nodeId: 'a.1', port: 'text' },
      { kind: 'reply', mode: 'add', nodeId: 'a.1' },
      { kind: 'sub_replies', on: 'yes' },
      { kind: 'sub_replies' },
      { kind: 'colour' },
      'off',
      null
    ]) {
      expect(chat(edit), JSON.stringify(edit)).toMatch(/playground_chat: "edit" must be/);
    }
  });

  it('names what is wrong with the edit', () => {
    expect(chat({ kind: 'sub_replies', on: 'yes' })).toContain('"on" must be a boolean');
    expect(chat({ kind: 'input', key: 'nope', id: 'q' })).toContain('"key" must be one of');
  });

  it('uses `side`, the one word for input or output', () => {
    expect(validateCommand({ type: 'interface_remove', side: 'input', id: 'q' })).toBeNull();
    expect(validateCommand({ type: 'interface_remove', direction: 'input', id: 'q' })).toMatch(
      /"side" must be one of/
    );
    expect(
      validateCommand({ type: 'interface_set', side: 'input', id: 'q', field: 'turn', value: 'x' })
    ).toMatch(/"field" must be one of/);
  });
});
