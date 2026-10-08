import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Card from '$lib/components/primitives/Card.svelte';

let instance: ReturnType<typeof mount> | null = null;
let target: HTMLElement;
const snip = (html: string) => createRawSnippet(() => ({ render: () => html }));
function render(props: Record<string, unknown>) {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Card, { target, props: props as never });
  flushSync();
  return target;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
});

describe('primitives/Card', () => {
  it('is a div with default variant and md padding', () => {
    const root = render({ children: snip('<p>x</p>') }).firstElementChild!;
    expect(root.tagName).toBe('DIV');
    expect(root.classList.contains('flowdrop-ui-card--default')).toBe(true);
    expect(root.classList.contains('flowdrop-ui-card--md')).toBe(true);
  });

  it('is a labelled section when ariaLabel is given', () => {
    const root = render({ ariaLabel: 'Interrupt' }).firstElementChild!;
    expect(root.tagName).toBe('SECTION');
    expect(root.getAttribute('aria-label')).toBe('Interrupt');
  });

  it('applies variant and padding classes', () => {
    const root = render({ variant: 'attention', padding: 'sm' }).firstElementChild!;
    expect(root.classList.contains('flowdrop-ui-card--attention')).toBe(true);
    expect(root.classList.contains('flowdrop-ui-card--sm')).toBe(true);
  });

  it('renders header, body and footer in order, only when given', () => {
    const t = render({
      header: snip('<b>H</b>'),
      footer: snip('<i>F</i>'),
      children: snip('<p>B</p>')
    });
    expect(
      Array.from(t.firstElementChild!.children).map((c) =>
        c.className.split(' ')[0].replace('flowdrop-ui-card__', '')
      )
    ).toEqual(['header', 'body', 'footer']);
    unmount(instance!);
    t.remove();
    const bare = render({});
    expect(bare.firstElementChild!.children).toHaveLength(0);
  });
});
