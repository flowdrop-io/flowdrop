/**
 * The commands that take a free-text value which may run over several lines
 * (written as `"""…"""`): `set`, `session send`, `workflow name`,
 * `workflow description` and `interface set`. Shift+Enter and a multi-line
 * paste after one of them open the multi-line editor instead of running the
 * pasted lines as commands.
 */

const MULTILINE_COMMAND =
  /^(set\s+\S+?:\S+|session\s+send\b|workflow\s+(?:name|description)\b|interface\s+set\s+\S+\s+\S+?:\S+)\s*([\s\S]*)$/i;

/**
 * Split what is typed into the command part and the value typed so far, or
 * `null` when the command is not one that takes a multi-line value.
 */
export function matchMultilineCommand(input: string): { prefix: string; value: string } | null {
  const match = input.match(MULTILINE_COMMAND);
  return match ? { prefix: match[1], value: match[2] } : null;
}
