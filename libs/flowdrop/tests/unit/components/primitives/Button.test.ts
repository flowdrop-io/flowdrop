import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Button from '$lib/components/primitives/Button.svelte';
import LegacyButton from '$lib/components/Button.svelte';

const label = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));

let instance: ReturnType<typeof mount> | null = null;
function render(C: typeof Button | typeof LegacyButton, props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(C as typeof Button, {
    target,
    props: { children: label('Go'), ...props } as never
  });
  flushSync();
  return target.querySelector('button') as HTMLButtonElement;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  document.body.innerHTML = '';
});

describe('primitives/Button', () => {
  it('renders variant and size classes, defaults to type=button', () => {
    const b = render(Button, { variant: 'primary', size: 'sm' });
    expect(b.className).toContain('flowdrop-ui-button--primary');
    expect(b.className).toContain('flowdrop-ui-button--sm');
    expect(b.type).toBe('button');
  });

  it('fires onclick', () => {
    const onclick = vi.fn();
    render(Button, { onclick }).click();
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('does not fire when disabled', () => {
    const onclick = vi.fn();
    render(Button, { onclick, disabled: true }).click();
    expect(onclick).not.toHaveBeenCalled();
  });

  it('loading sets aria-busy, shows spinner and blocks click', () => {
    const onclick = vi.fn();
    const b = render(Button, { onclick, loading: true });
    expect(b.getAttribute('aria-busy')).toBe('true');
    expect(b.querySelector('.flowdrop-ui-button__spinner')).not.toBeNull();
    b.click();
    expect(onclick).not.toHaveBeenCalled();
  });

  it('renders leading and trailing icon snippets', () => {
    const b = render(Button, {
      leadingIcon: createRawSnippet(() => ({ render: () => '<i data-t="lead"></i>' })),
      trailingIcon: createRawSnippet(() => ({ render: () => '<i data-t="trail"></i>' }))
    });
    expect(b.querySelector('[data-t="lead"]')).not.toBeNull();
    expect(b.querySelector('[data-t="trail"]')).not.toBeNull();
  });

  it('passes aria-label and title', () => {
    const b = render(Button, { ariaLabel: 'Do it', title: 'Tip' });
    expect(b.getAttribute('aria-label')).toBe('Do it');
    expect(b.title).toBe('Tip');
  });
});

describe('components/Button wrapper', () => {
  it('maps outline to secondary and lg to md', () => {
    const b = render(LegacyButton, { variant: 'outline', size: 'lg' });
    expect(b.className).toContain('flowdrop-ui-button--secondary');
    expect(b.className).toContain('flowdrop-ui-button--md');
  });

  it('keeps primary/sm and forwards class + onclick', () => {
    const onclick = vi.fn();
    const b = render(LegacyButton, { variant: 'primary', size: 'sm', class: 'extra', onclick });
    expect(b.className).toContain('flowdrop-ui-button--primary');
    expect(b.className).toContain('flowdrop-ui-button--sm');
    expect(b.className).toContain('extra');
    b.click();
    expect(onclick).toHaveBeenCalledOnce();
  });
});
