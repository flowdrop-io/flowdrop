/**
 * Playground slash commands — the composer's out-of-band control lane.
 *
 * @module playground/commands
 */

export type {
  SlashCommand,
  SlashCommandName,
  SlashCommandDescriptor,
  CommandLabel,
  CommandLabels,
  ParseResult,
  CommandOutcome
} from './types.js';

export type { CommandHandlers, CommandContext, CommandMessages } from './dispatch.js';

export type { ParsedArgs } from './args.js';
export type { CommandSuggestion } from './suggest.js';

export { suggestCommands } from './suggest.js';

export { parseSlashCommand, isKnownCommand, isCommandInput, tokenize } from './parser.js';

export { parseArgs } from './args.js';

export { dispatchCommand, describeLaunchResult } from './dispatch.js';

export {
  COMMAND_NAMES,
  COMMAND_DESCRIPTORS,
  SIGNAL_COMMANDS,
  getDescriptor,
  getAvailableCommands,
  isCommandAvailable
} from './registry.js';
