/**
 * The Console's autocomplete rows come from, or must match, the help lists:
 * a suggestion never names a command that does not exist.
 */

import { describe, it, expect } from 'vitest';
import { SUBCOMMAND_MAP } from '../../../src/lib/components/console/subcommands.js';
import { COMMAND_HELP } from '../../../src/lib/commands/executor.js';
import { CONSOLE_HELP } from '../../../src/lib/commands/console.js';

const syntaxes = [...COMMAND_HELP, ...CONSOLE_HELP].map((row) => row.syntax);

/** Every way a help row spells its first words: `ports hide|show` covers `ports hide` and `ports show`. */
function covers(command: string): boolean {
  return syntaxes.some((syntax) => {
    const words = syntax.split(/\s+/);
    const given = command.split(' ');
    return given.every((word, i) =>
      (words[i] ?? '')
        .replace(/^\[|\]$/g, '')
        .split('|')
        .includes(word)
    );
  });
}

describe('Console autocomplete rows', () => {
  for (const [verb, options] of Object.entries(SUBCOMMAND_MAP)) {
    for (const option of options) {
      it(`"${verb} ${option.value}" exists in the help`, () => {
        expect(covers(`${verb} ${option.value}`)).toBe(true);
      });
    }
  }

  it('offers workflow format and no workflow set', () => {
    const values = SUBCOMMAND_MAP.workflow.map((o) => o.value);
    expect(values).toContain('format');
    expect(values).not.toContain('set');
  });

  it('describes interface pull as the help does', () => {
    const pull = SUBCOMMAND_MAP.interface.find((o) => o.value === 'pull');
    const help = COMMAND_HELP.find((row) => row.syntax.startsWith('interface pull'));
    expect(pull?.detail).toBe(help?.description);
  });
});
