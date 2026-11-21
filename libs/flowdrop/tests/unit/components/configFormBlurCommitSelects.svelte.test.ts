/**
 * In blur mode a discrete control commits at once (a select never gets a
 * focus-out in WebKit): a `oneOf` select as well as an `enum` one, and a
 * boolean switch.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ConfigForm from '$lib/components/ConfigForm.svelte';

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function mountBlur(schema: unknown, values: Record<string, unknown>) {
  const calls: Record<string, unknown>[] = [];
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(ConfigForm, {
    target,
    props: {
      schema,
      values,
      commitMode: 'blur',
      onChange: (c: unknown) => calls.push(c as never)
    } as never
  });
  flushSync();
  return { target, calls };
}

describe('blur commit mode', () => {
  it('commits a oneOf select at once', () => {
    const { target, calls } = mountBlur(
      {
        type: 'object',
        properties: {
          size: {
            type: 'string',
            oneOf: [
              { const: 's', title: 'Small' },
              { const: 'l', title: 'Large' }
            ]
          }
        }
      },
      { size: 's' }
    );
    const select = target.querySelector<HTMLSelectElement>('select')!;
    select.value = 'l';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();
    expect(calls.at(-1)).toEqual({ size: 'l' });
  });

  it('commits an enum select at once', () => {
    const { target, calls } = mountBlur(
      { type: 'object', properties: { mode: { type: 'string', enum: ['a', 'b'] } } },
      { mode: 'a' }
    );
    const select = target.querySelector<HTMLSelectElement>('select')!;
    select.value = 'b';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();
    expect(calls.at(-1)).toEqual({ mode: 'b' });
  });

  it('commits a boolean switch at once, nullable or not', () => {
    const { target, calls } = mountBlur(
      { type: 'object', properties: { on: { type: ['boolean', 'null'] } } },
      { on: false }
    );
    target.querySelector<HTMLInputElement>('input[role="switch"]')!.click();
    flushSync();
    expect(calls.at(-1)).toEqual({ on: true });
  });

  it('leaves a select with an empty enum to commit on focus-out', () => {
    const { target, calls } = mountBlur(
      { type: 'object', properties: { a: { type: 'string', enum: [] } } },
      { a: 'x' }
    );
    const select = target.querySelector<HTMLSelectElement>('select')!;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    flushSync();
    expect(calls).toEqual([]);
  });
});
