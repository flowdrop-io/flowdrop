/**
 * The schema default is shown (placeholder, or "Default (...)" in a select)
 * only while the value is absent. A stored `''` is a value and beats the default.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormFieldLight from '$lib/components/form/FormFieldLight.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { FieldSchema } from '$lib/components/form/types.js';

let mounted: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

function render(schema: FieldSchema, value: unknown) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(FormFieldLight, {
    target,
    props: { fieldKey: 'f', schema, value, onChange: () => {} } as never,
    context: new Map([[FLOWDROP_INSTANCE_KEY, createFlowDropInstance()]])
  });
  flushSync();
  return target;
}

describe('default placeholder', () => {
  it.each([
    ['text', { type: 'string', default: 'd' } as FieldSchema],
    ['textarea', { type: 'string', format: 'multiline', default: 'd' } as FieldSchema],
    ['number', { type: 'number', default: 7 } as FieldSchema]
  ])('%s shows the default when absent, not for a stored empty string', (_, schema) => {
    const el = () => document.querySelector<HTMLInputElement>('#f')!;
    render(schema, undefined);
    expect(el().placeholder).toBe(String(schema.default));
    unmount(mounted!);
    mounted = null;
    render(schema, '');
    expect(el().placeholder).toBe('');
  });
});

describe('select default label', () => {
  const schema: FieldSchema = { type: 'string', enum: ['a', 'b'], default: 'b' };

  it('reads "Default (b)" for an absent value', () => {
    const select = render(schema, undefined).querySelector('select')!;
    expect(select.options[0].textContent).toBe('Default (b)');
  });

  it('reads a dash for a stored empty string', () => {
    const select = render(schema, '').querySelector('select')!;
    expect(select.options[0].textContent).toBe('—');
  });
});
