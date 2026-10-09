/**
 * Svelte action: give every inline `code` span inside a rendered reply a
 * `title` with its full text. Node references in Assistant replies are inline
 * code, drawn as chips that truncate with an ellipsis, so the title is the way
 * to read a long id in full. Code inside `pre` blocks is left alone.
 */
export function chipTitles(node: HTMLElement, _content?: unknown): { update: () => void } {
  const apply = (): void => {
    for (const code of node.querySelectorAll<HTMLElement>('code')) {
      if (code.closest('pre')) continue;
      const text = code.textContent ?? '';
      if (text && code.title !== text) code.title = text;
    }
  };
  apply();
  return { update: apply };
}
