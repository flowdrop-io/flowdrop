/**
 * Command Completion
 *
 * Suggestions for the composer's `/` palette.
 *
 * Scope is deliberately narrow: **command names only**. Completing argument
 * *values* would mean knowing a workflow's declared launch inputs, which live
 * server-side — guessing them client-side would offer inputs the backend will
 * reject. Names are the part this client can complete honestly.
 *
 * @module playground/commands/suggest
 */

import type { EndpointConfig } from '../../config/endpoints.js';
import type { CommandLabels } from './types.js';
import { getAvailableCommands } from './registry.js';

/**
 * One completion. Shape matches the shared autocomplete listbox so the composer
 * and the editor console present suggestions identically.
 */
export interface CommandSuggestion {
  /** Text that replaces the input when accepted. */
  value: string;
  /** Primary text — the usage line, which shows the argument shape. */
  label: string;
  /** Secondary text — what the command does. */
  detail?: string;
}

/**
 * Compute completions for the current composer input.
 *
 * Returns nothing unless the input is an unescaped `/` command still being
 * named. In particular:
 *
 * - `hello` → nothing; this is a message, not a command.
 * - `//st` → nothing; the escape means the user is writing literal text.
 * - `/stop ` → nothing; the name is settled and arguments follow.
 */
export function suggestCommands(
  input: string,
  config: EndpointConfig | null,
  labels: CommandLabels
): CommandSuggestion[] {
  // Leading whitespace is tolerated when sending, so tolerate it here too.
  const trimmed = input.trimStart();

  if (!trimmed.startsWith('/')) return [];
  // `//` is the escape for a literal leading slash — not a command.
  if (trimmed.startsWith('//')) return [];

  const body = trimmed.slice(1);

  // A space means the name is complete; we do not complete argument values.
  if (/\s/.test(body)) return [];

  const prefix = body.toLowerCase();

  return getAvailableCommands(config)
    .filter((d) => d.name.startsWith(prefix))
    .map((d) => ({
      // Commands that take arguments get a trailing space, so accepting the
      // completion leaves the caret where the argument goes.
      value: `/${d.name}${d.takesArgs ? ' ' : ''}`,
      label: labels[d.name].usage,
      detail: labels[d.name].summary
    }));
}
