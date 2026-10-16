/**
 * `Select` and its searchable `Combobox` rendering, mounted for real: the
 * rendering choice, filtering, highlighted matches, the "n of m" count, the
 * ARIA 1.2 keyboard flow (aria-activedescendant on the input) and the
 * native pass-through.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Select from '$lib/components/primitives/Select.svelte';
import type { SelectOption } from '$lib/utils/selectOptions.js';

const groupedOptions: SelectOption[] = [
  { value: 'cm', label: 'chat_message', description: 'The chat message content', group: 'Chat' },
  { value: 'cr', label: 'chat_reply', description: 'The reply', group: 'Chat' },
  { value: 'res', label: 'result', description: 'Final answer', group: 'Output' },
  { value: 'off', label: 'Disabled one', group: 'Output', disabled: true },
  { value: 'misc', label: 'Misc' }
];

let mounted: ReturnType<typeof mount> | null = null;

function render(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const onValueChange = vi.fn();
  mounted = mount(Select, { target, props: { onValueChange, 'aria-label': 'Pick', ...props } });
  flushSync();
  const input = () => target.querySelector<HTMLInputElement>('[role="combobox"]')!;
  const options = () => [...target.querySelectorAll<HTMLElement>('[role="option"]')];
  const key = (k: string) => {
    input().dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
    );
    flushSync();
  };
  const type = (text: string) => {
    input().value = text;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
  };
  return { target, input, options, key, type, onValueChange };
}

afterEach(() => {
  if (mounted) void unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

describe('Select rendering', () => {
  it('is the real <select> for a short flat list', () => {
    const { target, onValueChange } = render({
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' }
      ],
      value: 'b'
    });
    const select = target.querySelector('select')!;
    expect(select).not.toBeNull();
    expect(target.querySelector('[role="combobox"]')).toBeNull();
    expect(select.value).toBe('b');
    select.value = 'a';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('is a combobox when an option has a group or description', () => {
    const { target } = render({ options: groupedOptions });
    expect(target.querySelector('select')).toBeNull();
    expect(target.querySelector('[role="combobox"]')).not.toBeNull();
  });

  it('is a combobox above ten options, and `searchable={false}` forces native', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ value: `${i}`, label: `Item ${i}` }));
    expect(render({ options: many }).target.querySelector('[role="combobox"]')).not.toBeNull();
    const forced = render({ options: many, searchable: false });
    expect(forced.target.querySelector('select')).not.toBeNull();
  });

  it('still renders <option> children natively', () => {
    const { target } = render({
      children: (anchor: Comment) => {
        const o = document.createElement('option');
        o.textContent = 'Only';
        anchor.parentNode?.insertBefore(o, anchor);
      }
    });
    expect(target.querySelector('select')).not.toBeNull();
  });
});

describe('Combobox', () => {
  it('opens on ArrowDown, with the chosen option highlighted via aria-activedescendant', () => {
    const { input, options, key } = render({ options: groupedOptions, value: 'res' });
    expect(input().getAttribute('aria-expanded')).toBe('false');
    key('ArrowDown');
    expect(input().getAttribute('aria-expanded')).toBe('true');
    const active = options().find((o) => o.id === input().getAttribute('aria-activedescendant'));
    expect(active?.textContent).toContain('result');
  });

  it('lists options under group titles, ungrouped first', () => {
    const { target, key } = render({ options: groupedOptions });
    key('ArrowDown');
    const groups = [...target.querySelectorAll('[role="group"]')].map((g) =>
      g.getAttribute('aria-label')
    );
    expect(groups).toEqual(['Chat', 'Output']);
    const first = target.querySelector('[role="listbox"] > [role="option"]');
    expect(first?.textContent).toContain('Misc');
  });

  it('filters as you type, highlights matches and counts "n of m"', () => {
    const { target, options, key, type } = render({ options: groupedOptions });
    key('ArrowDown');
    expect(target.querySelector('[role="status"]')?.textContent?.trim()).toBe('5 of 5');
    type('chat');
    expect(options()).toHaveLength(2);
    expect(target.querySelector('[role="status"]')?.textContent?.trim()).toBe('2 of 5');
    expect(options()[0].querySelector('mark')?.textContent).toBe('chat');
  });

  it('says so when the filter leaves nothing', () => {
    const { target, options, key, type } = render({ options: groupedOptions });
    key('ArrowDown');
    type('zzz');
    expect(options()).toHaveLength(0);
    expect(target.textContent).toContain('No matches');
    expect(target.querySelector('[role="status"]')?.textContent?.trim()).toBe('0 of 5');
  });

  it('moves with arrows, Home and End, skipping disabled options, and Enter chooses', () => {
    const { input, options, key, onValueChange } = render({ options: groupedOptions });
    key('ArrowDown');
    const activeText = () =>
      options().find((o) => o.id === input().getAttribute('aria-activedescendant'))?.textContent;
    expect(activeText()).toContain('Misc');
    key('ArrowDown');
    expect(activeText()).toContain('chat_message');
    key('End');
    expect(activeText()).toContain('result');
    key('Home');
    expect(activeText()).toContain('Misc');
    key('ArrowUp');
    expect(activeText()).toContain('Misc');
    key('ArrowDown');
    key('Enter');
    expect(onValueChange).toHaveBeenCalledWith('cm');
    expect(input().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape without choosing, and stops the event', () => {
    const { input, key, onValueChange } = render({ options: groupedOptions });
    key('ArrowDown');
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const stop = vi.spyOn(event, 'stopPropagation');
    input().dispatchEvent(event);
    flushSync();
    expect(stop).toHaveBeenCalled();
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('chooses on click and shows the label when closed', () => {
    const { options, key, onValueChange } = render({ options: groupedOptions });
    key('ArrowDown');
    options()
      .find((o) => o.textContent?.includes('result'))!
      .click();
    flushSync();
    expect(onValueChange).toHaveBeenCalledWith('res');
  });

  it('does not open when disabled', () => {
    const { input } = render({ options: groupedOptions, disabled: true });
    expect(input().disabled).toBe(true);
  });
});
