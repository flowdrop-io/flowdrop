/**
 * A select inside an array row stores the declared enum member (`2`, not
 * `"2"`) and does not offer `null` as a text option, in the row list and in the
 * sub-form of a larger item.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormArray from '$lib/components/form/FormArray.svelte';
import type { FieldSchema } from '$lib/components/form/types.js';

let mounted: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

const level: FieldSchema = { type: ['integer', 'null'], enum: [1, 2, null] };

function render(itemSchema: FieldSchema, value: unknown[]) {
  const onChange = vi.fn();
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(FormArray, { target, props: { id: 'a', value, itemSchema, onChange } as never });
  flushSync();
  return { target, onChange };
}

function pick(select: HTMLSelectElement, v: string) {
  select.value = v;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  flushSync();
}

describe.each([
  ['row list', { type: 'object', properties: { name: { type: 'string' }, level } } as FieldSchema],
  [
    'sub-form',
    {
      type: 'object',
      properties: {
        name: { type: 'string' },
        note: { type: 'string' },
        other: { type: 'string' },
        level
      }
    } as FieldSchema
  ]
])('select in a %s', (_, itemSchema) => {
  it('stores the enum member, not its text', () => {
    const { target, onChange } = render(itemSchema, [{ name: 'x', level: 1 }]);
    pick(target.querySelector('select')!, '2');
    expect(onChange).toHaveBeenLastCalledWith([{ name: 'x', level: 2 }]);
  });

  it('does not offer null as an option', () => {
    const { target } = render(itemSchema, [{ name: 'x', level: 1 }]);
    const values = [...target.querySelectorAll('select option')].map(
      (o) => (o as HTMLOptionElement).value
    );
    expect(values).toEqual(['1', '2']);
  });
});
