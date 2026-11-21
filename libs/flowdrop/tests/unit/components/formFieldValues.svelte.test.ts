/**
 * What a field stores and shows for its value: enum and oneOf members keep their
 * original type (R6.e.2), `null` is never an option and never the text "null",
 * a stored null always shows as null, and an object value is never printed as
 * "[object Object]". Mounted for real (client build, happy-dom).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormFieldLight from '$lib/components/form/FormFieldLight.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import { getSchemaOptions, type FieldSchema } from '$lib/components/form/types.js';

let mounted: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

function render(schema: FieldSchema, value: unknown) {
  const onChange = vi.fn();
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(FormFieldLight, {
    target,
    props: { fieldKey: 'f', schema, value, onChange } as never,
    context: new Map([[FLOWDROP_INSTANCE_KEY, createFlowDropInstance()]])
  });
  flushSync();
  return { target, onChange };
}

function choose(target: HTMLElement, value: string) {
  const select = target.querySelector<HTMLSelectElement>('select')!;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  flushSync();
}

describe('enum and oneOf members keep their type', () => {
  it('a single enum select stores the number, not its text', () => {
    const t = render({ type: 'integer', enum: [1, 2] }, undefined);
    choose(t.target, '2');
    expect(t.onChange).toHaveBeenLastCalledWith(2);
  });

  it('a boolean enum stores the boolean', () => {
    const t = render({ type: 'boolean', enum: [true, false] }, undefined);
    choose(t.target, 'false');
    expect(t.onChange).toHaveBeenLastCalledWith(false);
  });

  it('a oneOf select stores the const as declared', () => {
    const t = render(
      {
        type: 'integer',
        oneOf: [
          { const: 10, title: 'Ten' },
          { const: 20, title: 'Twenty' }
        ]
      },
      undefined
    );
    choose(t.target, '20');
    expect(t.onChange).toHaveBeenLastCalledWith(20);
  });

  it('a multiple enum stores numbers', () => {
    const t = render({ type: 'array', enum: [1, 2, 3], multiple: true }, [1]);
    const boxes = t.target.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(boxes[0].checked).toBe(true);
    boxes[2].click();
    flushSync();
    expect(t.onChange).toHaveBeenLastCalledWith([1, 3]);
  });

  it('strings stay strings, and the empty option still clears', () => {
    const t = render({ type: 'string', enum: ['a', 'b'] }, 'a');
    choose(t.target, 'b');
    expect(t.onChange).toHaveBeenLastCalledWith('b');
    choose(t.target, '');
    expect(t.onChange).toHaveBeenLastCalledWith('');
  });

  it('a stored number selects its option', () => {
    const t = render({ type: 'integer', enum: [1, 2] }, 2);
    expect(t.target.querySelector<HTMLSelectElement>('select')!.value).toBe('2');
  });
});

describe('oneOf with a null const', () => {
  const schema = {
    type: ['string', 'null'],
    oneOf: [
      { const: 'a', title: 'A' },
      { const: null, title: 'None' }
    ]
  } as FieldSchema;

  it('getSchemaOptions drops the null member', () => {
    expect(getSchemaOptions(schema).map((o) => o.value)).toEqual(['a']);
  });

  it('offers no "null" option; the toggle stores null', () => {
    const t = render(schema, 'a');
    const values = Array.from(t.target.querySelectorAll('select option')).map(
      (o) => (o as HTMLOptionElement).value
    );
    expect(values).not.toContain('null');
    expect(t.target.querySelector('button[aria-pressed]')).not.toBeNull();
  });

  it('shows no toggle when the type does not admit null', () => {
    const t = render({ type: 'string', oneOf: [{ const: 'a' }, { const: null }] }, 'a');
    expect(t.target.querySelector('button[aria-pressed]')).toBeNull();
  });
});

describe('a stored null the schema does not admit', () => {
  it.each([
    ['text', { type: 'string' }],
    ['number', { type: 'integer' }],
    ['select', { type: 'string', enum: ['a', 'b'] }],
    ['toggle', { type: 'boolean' }]
  ] as [string, FieldSchema][])('%s shows the muted null, with no toggle', (_, schema) => {
    const t = render({ ...schema, default: undefined }, null);
    expect(t.target.querySelector('[data-null-value]')?.textContent).toBe('null');
    expect(t.target.querySelector('button[aria-pressed]')).toBeNull();
  });

  it('editing replaces it', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const props = $state({
      fieldKey: 'f',
      schema: { type: 'string' } as FieldSchema,
      value: null as unknown,
      onChange: (v: unknown) => {
        props.value = v;
      }
    });
    mounted = mount(FormFieldLight, {
      target,
      props: props as never,
      context: new Map([[FLOWDROP_INSTANCE_KEY, createFlowDropInstance()]])
    });
    flushSync();
    expect(target.querySelector('[data-null-value]')).not.toBeNull();
    const input = target.querySelector<HTMLInputElement>('#f')!;
    input.value = 'x';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    expect(target.querySelector('[data-null-value]')).toBeNull();
  });

  it('an absent value shows no null', () => {
    expect(
      render({ type: 'string' }, undefined).target.querySelector('[data-null-value]')
    ).toBeNull();
  });
});

describe('an object value is never "[object Object]"', () => {
  it('a string field holding an object shows it as JSON', () => {
    const t = render({ type: 'string' }, { a: 1 });
    expect(t.target.querySelector<HTMLInputElement>('#f')!.value).toBe('{"a":1}');
  });

  it('an unknown type word gets the JSON textarea fallback, not a text input', () => {
    for (const type of ['mixed', 'json', 'banana', ['boolean', 'string']]) {
      const t = render({ type } as FieldSchema, { a: 1 });
      const area = t.target.querySelector<HTMLTextAreaElement>('textarea');
      expect(area).not.toBeNull();
      expect(area!.value).toContain('"a": 1');
      expect(t.target.querySelector('input[type="text"]')).toBeNull();
      unmount(mounted!);
      mounted = null;
    }
  });
});
