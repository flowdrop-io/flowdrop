/**
 * Turn a raw schema key into a readable label: "branches" -> "Branches",
 * "max_retries" -> "Max retries", "maxRetries" -> "Max retries".
 *
 * Only a fallback: a schema `title` is always shown as written.
 */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!spaced) return key;
  // Keep acronyms ("API"), lower-case the rest, capitalise the first letter.
  const sentence = spaced
    .split(' ')
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
