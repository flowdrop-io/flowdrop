/**
 * Command Argument Parsing
 *
 * Turns `/run --topic=foo --tone=formal` into named launch inputs.
 *
 * Deliberately thin: the client does **not** validate these. A workflow's
 * launch inputs are declared server-side as a manifest, and the backend already
 * gates them — unknown keys and wrong types are refused there, with per-input
 * error locators. Re-implementing that here would create a second, divergent
 * schema and reject inputs the backend would have accepted.
 *
 * @module playground/commands/args
 */

/** Result of reading flags off a command's argument list. */
export interface ParsedArgs {
  /** Named `--key=value` inputs, in source order. */
  inputs: Record<string, string>;
  /** Tokens that were not flags, joined — used as free text (e.g. a reason). */
  rest: string;
}

/**
 * Parse `--key=value` flags out of a token list.
 *
 * Supported forms:
 * - `--key=value` — the canonical form
 * - `--key value` — two tokens, when the next token is not itself a flag
 * - `--key` — a bare flag, treated as the string `"true"`
 *
 * Values arrive already unquoted by the tokenizer, so `--topic="Q2 revenue"`
 * yields `{topic: 'Q2 revenue'}`.
 */
export function parseArgs(tokens: readonly string[]): ParsedArgs {
  const inputs: Record<string, string> = {};
  const rest: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (!token.startsWith('--') || token.length <= 2) {
      rest.push(token);
      continue;
    }

    const body = token.slice(2);
    const equals = body.indexOf('=');

    if (equals !== -1) {
      inputs[body.slice(0, equals)] = body.slice(equals + 1);
      continue;
    }

    // `--key value`, unless the next token is another flag.
    const next = tokens[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      inputs[body] = next;
      i++;
      continue;
    }

    inputs[body] = 'true';
  }

  return { inputs, rest: rest.join(' ') };
}
