import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import IconButton from '$lib/components/primitives/IconButton.svelte';

let instance: ReturnType<typeof mount> | null = null;
function render(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(IconButton, {
    target,
    props: {
      ariaLabel: 'Settings',
      children: createRawSnippet(() => ({ render: () => '<svg></svg>' })),
      ...props
    } as never
  });
  flushSync();
  return target.querySelector('button') as HTMLButtonElement;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  document.body.innerHTML = '';
});

describe('primitives/IconButton', () => {
  it('has an accessible label and default ghost/md classes', () => {
    const b = render({});
    expect(b.getAttribute('aria-label')).toBe('Settings');
    expect(b.className).toContain('flowdrop-ui-icon-button--ghost');
    expect(b.className).toContain('flowdrop-ui-icon-button--md');
  });

  it('omits aria-pressed unless active is set', () => {
    expect(render({}).hasAttribute('aria-pressed')).toBe(false);
  });

  it('exposes aria-pressed for active true and false', () => {
    expect(render({ active: true }).getAttribute('aria-pressed')).toBe('true');
    unmount(instance!);
    document.body.innerHTML = '';
    expect(render({ active: false }).getAttribute('aria-pressed')).toBe('false');
  });

  it('click and disabled', () => {
    const onclick = vi.fn();
    render({ onclick }).click();
    expect(onclick).toHaveBeenCalledOnce();
    unmount(instance!);
    document.body.innerHTML = '';
    const off = vi.fn();
    render({ onclick: off, disabled: true }).click();
    expect(off).not.toHaveBeenCalled();
  });
});
