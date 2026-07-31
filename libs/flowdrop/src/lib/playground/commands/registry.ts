/**
 * Playground Slash Command Registry
 *
 * The single source of truth for which commands exist and when they are
 * offered. Availability is derived from the *configured endpoints*, never from
 * knowledge of a particular backend: FlowDrop ships as a standalone library and
 * may be pointed at any API implementing the shape.
 *
 * @module playground/commands/registry
 */

import type { EndpointConfig } from '../../config/endpoints.js';
import type { SlashCommandDescriptor, SlashCommandName } from './types.js';

/**
 * Canonical command list. Order is the order shown by `/help`.
 *
 * Declared as a plain tuple so the parser can bound its typo search and the
 * type system keeps {@link SlashCommandName} and this array in lockstep.
 */
export const COMMAND_NAMES = [
  'help',
  'run',
  'new',
  'stop',
  'reset',
  'delete',
  'pause',
  'resume',
  'cancel'
] as const satisfies readonly SlashCommandName[];

/**
 * Availability predicates.
 *
 * `playground.stopExecution`, `createSession` and `deleteSession` are required
 * keys in {@link EndpointConfig}, so their commands are available whenever a
 * config exists at all. `resetSession` is optional — the one place where the
 * "absence of an endpoint is absence of a command" rule currently bites.
 */
const hasPlayground = (config: EndpointConfig | null): boolean =>
  config?.endpoints?.playground != null;

/**
 * Signal commands exist only where the backend exposes a signal plane. The
 * whole block is optional, so this is the coarsest form of the availability
 * rule: no endpoints, no commands.
 */
const hasSignals = (config: EndpointConfig | null): boolean => config?.endpoints?.signals != null;

/**
 * Structure only — no display text. What each command *says* lives in
 * `m().playground.commands.catalog` so it can be translated; what each command
 * *is* lives here so pure logic never has to parse prose.
 */
export const COMMAND_DESCRIPTORS: readonly SlashCommandDescriptor[] = [
  {
    name: 'help',
    takesArgs: false,
    // Needs no backend — it only describes what is already configured.
    isAvailable: () => true
  },
  {
    name: 'run',
    takesArgs: true,
    isAvailable: (config) => config?.endpoints?.workflows?.run != null
  },
  {
    name: 'new',
    takesArgs: false,
    isAvailable: hasPlayground
  },
  {
    name: 'stop',
    takesArgs: false,
    isAvailable: hasPlayground
  },
  {
    name: 'reset',
    takesArgs: false,
    isAvailable: (config) =>
      hasPlayground(config) && config?.endpoints.playground.resetSession != null
  },
  {
    name: 'delete',
    takesArgs: false,
    isAvailable: hasPlayground
  },
  {
    name: 'pause',
    takesArgs: true,
    isAvailable: hasSignals
  },
  {
    name: 'resume',
    takesArgs: true,
    isAvailable: hasSignals
  },
  {
    name: 'cancel',
    takesArgs: true,
    isAvailable: hasSignals
  }
];

/**
 * Commands that act on a specific pipeline and cannot run without a resolved
 * target. Distinct from session commands, which act on the conversation.
 */
export const SIGNAL_COMMANDS: ReadonlySet<SlashCommandName> = new Set([
  'pause',
  'resume',
  'cancel'
]);

/** Look up a descriptor by name. */
export function getDescriptor(name: SlashCommandName): SlashCommandDescriptor | undefined {
  return COMMAND_DESCRIPTORS.find((d) => d.name === name);
}

/**
 * The commands offerable against a given configuration.
 *
 * Callers should gate both the palette and dispatch on this: a command that is
 * parseable but unavailable must report "not supported here", never issue a
 * request to an endpoint that was never configured.
 */
export function getAvailableCommands(config: EndpointConfig | null): SlashCommandDescriptor[] {
  return COMMAND_DESCRIPTORS.filter((d) => d.isAvailable(config));
}

/** True when the named command can run against this configuration. */
export function isCommandAvailable(name: SlashCommandName, config: EndpointConfig | null): boolean {
  return getDescriptor(name)?.isAvailable(config) ?? false;
}
