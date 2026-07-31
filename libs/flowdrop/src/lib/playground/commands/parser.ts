/**
 * Playground Slash Command Parser
 *
 * Pure, synchronous, dependency-free: given composer input, decide whether it
 * is a command, a message, or a typo. No network, no store, no config — so the
 * escape rule and the command grammar can be tested in isolation.
 *
 * @module playground/commands/parser
 */

import type { ParseResult, SlashCommandName } from './types.js';
import { COMMAND_NAMES } from './registry.js';

/**
 * The escape sequence for a message that genuinely starts with a slash.
 *
 * `//deploy the thing` sends the literal text `/deploy the thing`. Exactly one
 * leading slash is consumed, so `///x` sends `//x` — the rule composes rather
 * than special-casing depth.
 *
 * This must stay decided and documented: once users have sent messages
 * beginning with `/`, changing the escape silently rewrites their intent.
 */
const ESCAPE_PREFIX = '//';

/** Longest command name, used to bound the typo search. */
const MAX_NAME_LENGTH = Math.max(...COMMAND_NAMES.map((n) => n.length));

/**
 * Split a command body into tokens, keeping quoted runs together.
 *
 * Needed because launch arguments carry real prose — `/run --topic="Q2 revenue"`
 * is one argument, not two. Both quote styles are accepted so a value can
 * contain the other, and a quote may open mid-token (`--topic="a b"`) since
 * that is how flags are naturally written.
 *
 * An unterminated quote runs to end of input rather than failing: the user is
 * mid-typing, and refusing to parse would make the composer feel broken.
 */
export function tokenize(body: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false;

  for (const char of body) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      started = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
      continue;
    }

    current += char;
    started = true;
  }

  if (started) tokens.push(current);
  return tokens;
}

/**
 * Suggest commands for an unrecognised name.
 *
 * Deliberately conservative — prefix matches first, then single-edit
 * neighbours. A wrong suggestion is worse than none: the user is one keystroke
 * from running something they did not intend.
 */
function suggest(name: string): SlashCommandName[] {
  const lower = name.toLowerCase();
  if (!lower) return [...COMMAND_NAMES];

  const prefixed = COMMAND_NAMES.filter((n) => n.startsWith(lower));
  if (prefixed.length > 0) return prefixed;

  if (lower.length > MAX_NAME_LENGTH + 2) return [];
  return COMMAND_NAMES.filter((n) => isSingleEditApart(lower, n));
}

/**
 * True when `a` and `b` differ by at most one insertion, deletion,
 * substitution, **or transposition of adjacent characters**.
 *
 * The transposition arm matters more than the rest: `/stpo` for `/stop` is the
 * single most common way to mistype a short word, and plain Levenshtein scores
 * it as two edits — so omitting it would leave the most likely typo
 * unsuggested. This is Damerau-Levenshtein restricted to distance 1, which
 * stays cheap and predictable for strings this short.
 */
function isSingleEditApart(a: string, b: string): boolean {
  if (a === b) return true;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (longer.length - shorter.length > 1) return false;

  // Locate the first and last positions where the two disagree.
  let head = 0;
  while (head < shorter.length && shorter[head] === longer[head]) head++;

  let tail = 0;
  while (
    tail < shorter.length - head &&
    shorter[shorter.length - 1 - tail] === longer[longer.length - 1 - tail]
  ) {
    tail++;
  }

  // Characters left unmatched in the middle of each string.
  const shorterRemainder = shorter.length - head - tail;
  const longerRemainder = longer.length - head - tail;

  // One substitution (1/1), or one insertion/deletion (0/1).
  if (longerRemainder <= 1 && shorterRemainder <= 1) return true;

  // One transposition: exactly two mismatched characters, equal lengths, swapped.
  return (
    shorterRemainder === 2 &&
    longerRemainder === 2 &&
    shorter[head] === longer[head + 1] &&
    shorter[head + 1] === longer[head]
  );
}

/**
 * Parse composer input into a command, a message, or an unknown-command error.
 *
 * Unknown commands are **not** forwarded as messages. A typo like `/stpo` must
 * not silently launch a pipeline with `/stpo` as its input — the whole point of
 * the lane is that control traffic and pipeline data never cross.
 */
export function parseSlashCommand(input: string): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) return { kind: 'empty' };

  if (trimmed.startsWith(ESCAPE_PREFIX)) {
    return { kind: 'message', content: trimmed.slice(1) };
  }

  if (!trimmed.startsWith('/')) {
    return { kind: 'message', content: trimmed };
  }

  const body = trimmed.slice(1);
  const parts = tokenize(body);
  const rawName = parts[0] ?? '';
  const name = rawName.toLowerCase();

  if (!isKnownCommand(name)) {
    return { kind: 'unknown', name: rawName, suggestions: suggest(name) };
  }

  return {
    kind: 'command',
    command: { name, args: parts.slice(1), raw: trimmed }
  };
}

/** Type guard narrowing an arbitrary string to a known command name. */
export function isKnownCommand(name: string): name is SlashCommandName {
  return (COMMAND_NAMES as readonly string[]).includes(name);
}

/**
 * True when input would be routed to the control plane rather than sent as a
 * message. Used by the composer to keep commands submittable while a run is in
 * flight (when plain text is not).
 */
export function isCommandInput(input: string): boolean {
  const result = parseSlashCommand(input);
  return result.kind === 'command' || result.kind === 'unknown';
}
