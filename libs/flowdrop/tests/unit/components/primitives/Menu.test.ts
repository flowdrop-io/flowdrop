import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Menu from '$lib/components/primitives/Menu.svelte';

let instance: ReturnType<typeof mount> | null = null;
function render(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Menu, { target, props: props as never });
  flushSync();
  return target;
}
afterEach(() => {
  if (instance) unmount(instance);
  instance = null;
  document.body.innerHTML = '';
});
const trigger = () => document.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
const popup = () => document.querySelector<HTMLElement>('[role="menu"]');
const menuItems = () => Array.from(document.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
const key = (el: Element, k: string) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  flushSync();
};
const tick = () => new Promise((r) => queueMicrotask(() => r(null)));
const onselect = vi.fn();
const items = [
  { label: 'Show steps', checked: true, onselect },
  { label: 'Refresh', onselect },
  { type: 'separator' },
  { label: 'Reset', disabled: true, onselect },
  { label: 'Settings', onselect }
];

describe('primitives/Menu', () => {
  it('renders a default ⋯ trigger with the default label, closed', () => {
    render({ items });
    expect(trigger().getAttribute('aria-label')).toBe('More actions');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(popup()).toBeNull();
  });

  it('opens on click with menu roles and checkable items', () => {
    render({ items, label: 'Actions' });
    trigger().click();
    flushSync();
    expect(popup()?.getAttribute('aria-label')).toBe('Actions');
    expect(menuItems().map((i) => i.getAttribute('role'))).toEqual([
      'menuitemcheckbox',
      'menuitem',
      'menuitem',
      'menuitem'
    ]);
    expect(menuItems()[0].getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector('[role="separator"]')).not.toBeNull();
  });

  it('ArrowDown on the trigger opens and focuses the first item', async () => {
    render({ items });
    trigger().focus();
    key(trigger(), 'ArrowDown');
    await tick();
    expect(document.activeElement).toBe(menuItems()[0]);
  });

  it('ArrowUp on the trigger focuses the last item', async () => {
    render({ items });
    key(trigger(), 'ArrowUp');
    await tick();
    expect(document.activeElement).toBe(menuItems().at(-1));
  });

  it('arrows wrap, skip disabled items, Home/End jump', async () => {
    render({ items });
    key(trigger(), 'ArrowDown');
    await tick();
    const [a, b, , d] = menuItems();
    expect(d.textContent).toContain('Settings');
    key(a, 'ArrowDown');
    expect(document.activeElement).toBe(b);
    key(b, 'ArrowDown');
    expect(document.activeElement?.textContent).toContain('Settings');
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement).toBe(a);
    key(a, 'End');
    expect(document.activeElement?.textContent).toContain('Settings');
    key(document.activeElement!, 'Home');
    expect(document.activeElement).toBe(a);
  });

  it('typeahead jumps to the item starting with the typed letter', async () => {
    render({ items });
    key(trigger(), 'ArrowDown');
    await tick();
    key(menuItems()[0], 's');
    expect(document.activeElement?.textContent).toContain('Settings');
  });

  it('choosing an item calls onselect and closes, returning focus', () => {
    onselect.mockClear();
    render({ items });
    trigger().click();
    flushSync();
    menuItems()[1].click();
    flushSync();
    expect(onselect).toHaveBeenCalledTimes(1);
    expect(popup()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('Escape closes, returns focus and does not bubble', () => {
    render({ items });
    trigger().click();
    flushSync();
    const outer = vi.fn();
    document.body.addEventListener('keydown', outer);
    key(menuItems()[0], 'Escape');
    document.body.removeEventListener('keydown', outer);
    expect(popup()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    expect(outer).not.toHaveBeenCalled();
  });

  it('closes on an outside click without taking focus', () => {
    render({ items });
    trigger().click();
    flushSync();
    document.body.click();
    flushSync();
    expect(popup()).toBeNull();
    expect(document.activeElement).not.toBe(trigger());
  });

  it('renders free-form children with close and a custom trigger', () => {
    render({
      label: 'Chip',
      testId: 'my-menu',
      triggerClass: 'custom',
      trigger: createRawSnippet(() => ({ render: () => '<span>Chip</span>' })),
      children: createRawSnippet(() => ({
        render: () => '<button type="button" role="menuitem">Free</button>'
      }))
    });
    expect(trigger().classList.contains('custom')).toBe(true);
    expect(trigger().dataset.testid).toBe('my-menu');
    trigger().click();
    flushSync();
    expect(menuItems().map((i) => i.textContent)).toEqual(['Free']);
  });
});
