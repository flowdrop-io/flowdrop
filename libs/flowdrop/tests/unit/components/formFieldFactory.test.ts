// @vitest-environment node
/**
 * There is one field factory, the internal FieldFactory. FormFieldLight is it
 * with no heavy editors; FormField (`FormFieldFull` from `form/full`) is it plus
 * the statically bundled heavy editors.
 *
 * They used to be two parallel factories and drifted: the light one — the one
 * the config panel renders — lost the built-in autocomplete (2.0.0-beta.2) and
 * never honoured `readOnly`. These pin that the two cannot disagree again, and
 * that `readOnly` reaches every input. Server-rendered (see schemaFormSsr.test.ts
 * for why `node`).
 */

import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import FormFieldLight from '$lib/components/form/FormFieldLight.svelte';
import FormFieldFull from '$lib/components/form/FormField.svelte';
import FormTextarea from '$lib/components/form/FormTextarea.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { FieldSchema } from '$lib/components/form/types.js';

type Factory = typeof FormFieldLight | typeof FormFieldFull;

function html(
  factory: Factory,
  schema: FieldSchema,
  value: unknown = undefined,
  instance = createFlowDropInstance()
) {
  return render(factory, {
    props: { fieldKey: 'f', schema, value, onChange: () => {} },
    context: new Map([[FLOWDROP_INSTANCE_KEY, instance]])
  }).body.replace(/<!--[^>]*-->/g, ''); // hydration markers differ by nesting depth
}

const builtIns: Record<string, FieldSchema> = {
  text: { type: 'string', title: 'T' },
  textarea: { type: 'string', format: 'multiline' },
  number: { type: 'number', minimum: 0, maximum: 10, step: 2 },
  range: { type: 'integer', format: 'range', minimum: 0, maximum: 10 },
  toggle: { type: 'boolean' },
  'select-enum': { type: 'string', enum: ['a', 'b'] },
  'select-options': { type: 'string', oneOf: [{ const: 'a', title: 'A' }] },
  'checkbox-group': { type: 'string', enum: ['a', 'b'], multiple: true },
  autocomplete: { type: 'string', format: 'autocomplete', autocomplete: { url: '/u' } }
};

describe('one field factory', () => {
  it.each(Object.entries(builtIns))(
    'FormFieldFull renders %s exactly as FormFieldLight',
    (_, schema) => {
      expect(html(FormFieldFull, schema)).toBe(html(FormFieldLight, schema));
    }
  );

  it.each([
    ['json', { type: 'object', format: 'json' }],
    ['markdown', { type: 'string', format: 'markdown' }],
    ['template', { type: 'string', format: 'template' }],
    ['object without format', { type: 'object' }],
    ['object with a format nothing renders', { type: 'object', format: 'key-value' }]
  ] as [string, FieldSchema][])(
    '%s: Full has the editor built in, Light shows the registration hint',
    (_, schema) => {
      expect(html(FormFieldFull, schema)).not.toContain('Editor component not registered');
      expect(html(FormFieldLight, schema)).toContain('Editor component not registered');
    }
  );

  it('a component registered on the instance wins over the bundled editor', () => {
    const instance = createFlowDropInstance();
    instance.fields.register('host-json', {
      component: FormTextarea,
      matcher: (s) => s.format === 'json',
      priority: 1000
    });
    const body = html(FormFieldFull, { type: 'object', format: 'json' }, '', instance);
    expect(body).toContain('<textarea'); // the host's component, not CodeMirror
    expect(body).not.toContain('Editor component not registered');
  });

  it('an object with format ports still gets the ports widget, not the JSON editor', () => {
    const schema: FieldSchema = { type: 'object', format: 'ports' };
    expect(html(FormFieldFull, schema)).toBe(html(FormFieldLight, schema));
    expect(html(FormFieldLight, schema)).not.toContain('Editor component not registered');
  });

  it('FormFieldLight takes no editors, even from an untyped caller', () => {
    const body = render(FormFieldLight, {
      props: {
        fieldKey: 'f',
        schema: { type: 'string', format: 'markdown' },
        value: '',
        onChange: () => {},
        editors: { 'markdown-editor': FormTextarea }
      } as never,
      context: new Map([[FLOWDROP_INSTANCE_KEY, createFlowDropInstance()]])
    }).body;
    expect(body).toContain('Editor component not registered');
  });

  it('passes step to the number field', () => {
    expect(html(FormFieldLight, builtIns.number)).toMatch(/step="2"/);
  });
});

describe('schema.readOnly', () => {
  it.each(Object.entries(builtIns))('disables the %s input', (_, schema) => {
    expect(html(FormFieldLight, schema)).not.toMatch(/\sdisabled/);
    expect(html(FormFieldLight, { ...schema, readOnly: true })).toMatch(/\sdisabled/);
  });

  it('disables the textarea fallback of an unregistered heavy editor', () => {
    expect(html(FormFieldLight, { type: 'object', format: 'json', readOnly: true })).toMatch(
      /<textarea[^>]*\sdisabled/
    );
  });
});
