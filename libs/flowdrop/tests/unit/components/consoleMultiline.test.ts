/** Which typed commands open the Console's multi-line editor on Shift+Enter or a multi-line paste. */

import { describe, it, expect } from 'vitest';
import { matchMultilineCommand } from '../../../src/lib/components/console/multilinePrefix.js';

describe('matchMultilineCommand', () => {
  it('matches every command that takes a free-text value', () => {
    expect(matchMultilineCommand('set a.1:prompt ')).toEqual({
      prefix: 'set a.1:prompt',
      value: ''
    });
    expect(matchMultilineCommand('session send hello')).toEqual({
      prefix: 'session send',
      value: 'hello'
    });
    expect(matchMultilineCommand('workflow description ')).toEqual({
      prefix: 'workflow description',
      value: ''
    });
    expect(matchMultilineCommand('workflow name My flow')).toEqual({
      prefix: 'workflow name',
      value: 'My flow'
    });
    expect(matchMultilineCommand('interface set input q:description Ask')).toEqual({
      prefix: 'interface set input q:description',
      value: 'Ask'
    });
  });

  it('leaves other commands to run line by line', () => {
    for (const input of [
      'workflow',
      'workflow format flowdrop',
      'workflow names',
      'interface set input q',
      'interface list',
      'list nodes'
    ]) {
      expect(matchMultilineCommand(input), input).toBeNull();
    }
  });
});
