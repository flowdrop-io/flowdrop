import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import EmptyState from '$lib/components/primitives/EmptyState.svelte';

let instance: ReturnType<typeof mount> | null = null;
let target: HTMLElement;
function render(props: Record<string, unknown>) {
  target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(EmptyState, { target, props: props as never });
  flushSync();
  return target;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  target?.remove();
});

describe('primitives/EmptyState', () => {
  it('renders only the title by default, md size', () => {
    const t = render({ title: 'Nothing' });
    expect(t.querySelector('.flowdrop-ui-empty__title')?.textContent).toBe('Nothing');
    expect(t.querySelector('.flowdrop-ui-empty__description')).toBeNull();
    expect(t.querySelector('.flowdrop-ui-empty__icon')).toBeNull();
    expect(t.querySelector('.flowdrop-ui-empty__actions')).toBeNull();
    expect(t.firstElementChild!.classList.contains('flowdrop-ui-empty--md')).toBe(true);
  });

  it('renders description, size and actions', () => {
    const t = render({
      title: 'T',
      description: 'Why',
      size: 'sm',
      actions: createRawSnippet(() => ({ render: () => '<button>Go</button>' }))
    });
    expect(t.querySelector('.flowdrop-ui-empty__description')?.textContent).toBe('Why');
    expect(t.querySelector('.flowdrop-ui-empty__actions button')?.textContent).toBe('Go');
    expect(t.firstElementChild!.classList.contains('flowdrop-ui-empty--sm')).toBe(true);
  });

  it('hides the icon from assistive tech', () => {
    const t = render({ title: 'T', icon: 'mdi:inbox' });
    expect(t.querySelector('.flowdrop-ui-empty__icon')?.getAttribute('aria-hidden')).toBe('true');
  });
});
