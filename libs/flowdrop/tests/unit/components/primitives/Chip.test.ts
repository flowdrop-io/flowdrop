import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Chip from '$lib/components/primitives/Chip.svelte';

let instance: ReturnType<typeof mount> | null = null;
function render(props: Record<string, unknown> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Chip, {
    target,
    props: {
      children: createRawSnippet(() => ({ render: () => '<span>Hi</span>' })),
      ...props
    } as never
  });
  flushSync();
  return target;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  document.body.innerHTML = '';
});

describe('primitives/Chip', () => {
  it('renders tone and size classes and the title; not interactive', () => {
    const t = render({ tone: 'success', size: 'sm', title: 'tip' });
    const chip = t.querySelector('.flowdrop-ui-chip') as HTMLElement;
    expect(chip.className).toContain('flowdrop-ui-chip--success');
    expect(chip.className).toContain('flowdrop-ui-chip--sm');
    expect(chip.title).toBe('tip');
    expect(t.querySelector('button')).toBeNull();
  });

  it('renders an accessible remove button that calls onremove', () => {
    const onremove = vi.fn();
    const t = render({ onremove, removeLabel: 'Remove tag' });
    const btn = t.querySelector('button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Remove tag');
    btn.click();
    expect(onremove).toHaveBeenCalledOnce();
  });
});
