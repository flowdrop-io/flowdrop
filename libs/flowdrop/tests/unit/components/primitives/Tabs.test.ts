import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Tabs, { tabId, tabPanelId } from '$lib/components/primitives/Tabs.svelte';

const tabs = [
  { value: 'a', label: 'Alpha', count: 2 },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' }
];

let instance: ReturnType<typeof mount> | null = null;
function render(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Tabs, { target, props: { tabs, ariaLabel: 'Views', ...props } as never });
  flushSync();
  return Array.from(target.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
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

describe('primitives/Tabs', () => {
  it('is a tablist with aria-selected and roving tabindex', () => {
    const els = render({ value: 'b' });
    expect(document.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Views');
    expect(els.map((e) => e.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(els.map((e) => e.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('falls back to the first tab as tab stop', () => {
    expect(render({}).map((e) => e.tabIndex)).toEqual([0, -1, -1]);
  });

  it('renders the count and wires ids with idBase', () => {
    const els = render({ value: 'a', idBase: 'pg' });
    expect(els[0].querySelector('.flowdrop-ui-tabs__count')?.textContent).toBe('2');
    expect(els[1].querySelector('.flowdrop-ui-tabs__count')).toBeNull();
    expect(els[1].id).toBe(tabId('pg', 'b'));
    expect(els[1].getAttribute('aria-controls')).toBe(tabPanelId('pg', 'b'));
  });

  it('click selects and calls onchange', () => {
    const onchange = vi.fn();
    const els = render({ value: 'a', onchange });
    els[2].click();
    flushSync();
    expect(onchange).toHaveBeenCalledWith('c');
    expect(els[2].getAttribute('aria-selected')).toBe('true');
  });

  it('arrow keys, Home and End move focus and selection, wrapping', () => {
    const onchange = vi.fn();
    const els = render({ value: 'a', onchange });
    els[0].focus();
    key(els[0], 'ArrowRight');
    expect(onchange).toHaveBeenLastCalledWith('b');
    expect(document.activeElement).toBe(els[1]);
    key(els[1], 'End');
    expect(onchange).toHaveBeenLastCalledWith('c');
    key(els[2], 'ArrowRight');
    expect(onchange).toHaveBeenLastCalledWith('a');
    key(els[0], 'ArrowLeft');
    expect(onchange).toHaveBeenLastCalledWith('c');
    key(els[2], 'Home');
    expect(onchange).toHaveBeenLastCalledWith('a');
  });
});
