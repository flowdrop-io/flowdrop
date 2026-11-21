/**
 * The sub-commands the Console input suggests after a verb. The editor verbs
 * (`interface`, `ports`, `workflow`) and the Console's own (`session`, `runs`)
 * read their rows from the help lists, so a suggestion cannot name a command
 * that does not exist or describe it wrongly.
 */

import { COMMAND_HELP } from '../../commands/executor.js';
import { CONSOLE_HELP } from '../../commands/console.js';

/**
 * The sub-commands of an editor verb, from its help rows: the word after the
 * verb in each syntax (`interface pull <input|output> <id>` gives `pull`,
 * `ports hide|show …` gives `hide` and `show`). The first row of a word gives
 * its description.
 */
function editorSubcommands(verb: string): Array<{ value: string; detail?: string }> {
  const seen = new Map<string, string>();
  for (const row of COMMAND_HELP) {
    if (row.name !== verb) continue;
    // `interface [list]`: an optional word still names a sub-command.
    const word = row.syntax.split(/\s+/)[1]?.replace(/^\[(\w[\w|]*)\]$/, '$1');
    if (!word || /^[<[-]/.test(word)) continue;
    for (const value of word.split('|')) {
      if (!seen.has(value)) seen.set(value, row.description);
    }
  }
  return [...seen].map(([value, detail]) => ({ value, detail }));
}

/** The sub-commands of a Console verb, from its help rows (`session send` gives `send`). */
function helpSubcommands(verb: string): Array<{ value: string; detail?: string }> {
  return CONSOLE_HELP.filter((row) => row.name.startsWith(`${verb} `)).map((row) => ({
    value: row.name.slice(verb.length + 1),
    detail: row.description
  }));
}

/** Sub-commands for verbs that have them */
export const SUBCOMMAND_MAP: Record<string, Array<{ value: string; detail?: string }>> = {
  layout: [
    { value: 'auto', detail: 'Re-arrange all nodes from scratch' },
    { value: 'beautify', detail: 'Tidy: columns, no overlaps, straight wires' }
  ],
  list: [
    { value: 'nodes', detail: 'List all workflow nodes' },
    { value: 'edges', detail: 'List all connections' },
    { value: 'types', detail: 'List available node types' }
  ],
  // The Console's own verbs: sub-commands and their text come from its one help list.
  session: helpSubcommands('session'),
  mode: [
    { value: 'edit', detail: 'Switch to Edit mode' },
    { value: 'test', detail: 'Switch to Test mode (needs a saved workflow)' }
  ],
  runs: [{ value: 'list', detail: 'List the workflow’s runs' }, ...helpSubcommands('runs')],
  interface: editorSubcommands('interface'),
  ports: editorSubcommands('ports'),
  workflow: editorSubcommands('workflow'),
  playground: [{ value: 'chat', detail: 'Configure the Playground chat binding' }],
  canvas: [
    { value: 'fitview', detail: 'Fit all nodes into the viewport' },
    { value: 'zoom in', detail: 'Zoom in on the canvas' },
    { value: 'zoom out', detail: 'Zoom out on the canvas' },
    { value: 'zoom', detail: 'Set zoom level (e.g. canvas zoom 1.5)' },
    { value: 'pan', detail: 'Pan to position (e.g. canvas pan 100,200)' },
    { value: 'reset', detail: 'Reset viewport to default' }
  ]
};
