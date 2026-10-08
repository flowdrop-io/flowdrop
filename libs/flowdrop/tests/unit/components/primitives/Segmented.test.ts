import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Segmented from '$lib/components/primitives/Segmented.svelte';

const options = [
  { value: 'edit', label: 'Edit' },
  { value: 'test', label: 'Test' },
  { value: 'x', label: 'Third' }
];

let instance: ReturnType<typeof mount> | null = null;
function render(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Segmented, {
    target,
    props: { options, ariaLabel: 'Mode', ...props } as never
  });
  flushSync();
  return Array.from(target.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  document.body.innerHTML = '';
});
const key = (el: HTMLElement, k: string) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  flushSync();
};

describe('primitives/Segmented', () => {
  it('is a radiogroup with aria-checked and roving tabindex', () => {
    const radios = render({ value: 'test' });
    expect(document.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Mode');
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('falls back to the first option as tab stop when nothing is selected', () => {
    const radios = render({});
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
  });

  it('click selects and calls onchange', () => {
    const onchange = vi.fn();
    const radios = render({ value: 'edit', onchange });
    radios[1].click();
    flushSync();
    expect(onchange).toHaveBeenCalledWith('test');
    expect(radios[1].getAttribute('aria-checked')).toBe('true');
  });

  it('arrow keys move selection and focus, wrapping', () => {
    const onchange = vi.fn();
    const radios = render({ value: 'edit', onchange });
    radios[0].focus();
    key(radios[0], 'ArrowRight');
    expect(onchange).toHaveBeenLastCalledWith('test');
    expect(document.activeElement).toBe(radios[1]);
    key(radios[1], 'End');
    expect(onchange).toHaveBeenLastCalledWith('x');
    key(radios[2], 'ArrowRight');
    expect(onchange).toHaveBeenLastCalledWith('edit');
    key(radios[0], 'ArrowLeft');
    expect(onchange).toHaveBeenLastCalledWith('x');
    key(radios[2], 'Home');
    expect(onchange).toHaveBeenLastCalledWith('edit');
  });
});
