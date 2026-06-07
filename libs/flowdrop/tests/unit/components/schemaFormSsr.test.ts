// @vitest-environment node
/**
 * SSR regression test for the standalone <SchemaForm>.
 *
 * Background: the multi-instance refactor re-routed the form leaf components
 * (FormField / FormFieldLight / FormTemplateEditor) from module singletons to
 * `getInstance()`, which *throws* during SSR when no FlowDrop instance is in
 * context (stores/getInstance.svelte.ts). A bare <SchemaForm> — a public
 * component meant to be used without an <App>/<WorkflowEditor> ancestor — then
 * crashed every server render with HTTP 500.
 *
 * The fix makes the standalone container (SchemaForm, likewise ConfigForm)
 * self-provide an instance via `provideInstance()`, which on the server creates
 * a fresh per-render instance (no cross-request leakage) and re-provides it via
 * context so the strict leaf `getInstance()` calls resolve. Leaves stay strict.
 *
 * Why the `node` environment: vitest's default `happy-dom` environment defines
 * `window`, so Svelte compiles/loads the *client* branch of components and
 * `svelte/server`'s `render()` mismatches (effect_orphan / get_first_child).
 * Under `node` there is no `window`, components load through the server branch,
 * and `render()` exercises the real SSR code path — the exact path that 500'd.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import SchemaForm from '$lib/components/SchemaForm.svelte';
import FormField from '$lib/components/form/FormField.svelte';
import type { ConfigSchema } from '$lib/types/index.js';

const schema: ConfigSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    age: { type: 'number', title: 'Age' },
    active: { type: 'boolean', title: 'Active' }
  },
  required: ['name']
};

describe('SchemaForm SSR (standalone, no <App> ancestor)', () => {
  it('renders on the server without throwing the "No FlowDrop instance" error', () => {
    // Guard: we are genuinely on the SSR path (the branch that used to throw).
    expect(typeof window).toBe('undefined');

    // `render()` evaluates the component lazily, so force execution by reading
    // `.body` inside the assertion — that is where the leaf getInstance() runs.
    let body = '';
    expect(() => {
      body = render(SchemaForm, { props: { schema } }).body;
    }).not.toThrow();

    // The form container rendered, and its child <FormField>s resolved the
    // instance SchemaForm self-provided (no throw === resolution succeeded).
    expect(body).toContain('schema-form');
    expect(body).toContain('id="name"');
    expect(body).toContain('id="age"');
  });

  it('renders the empty state for a schema with no properties (still no throw)', () => {
    expect(() => render(SchemaForm, { props: { schema: { type: 'object' } } }).body).not.toThrow();
  });

  it('leaf <FormField> stays strict: it throws when rendered without a provider', () => {
    // Confirms the fix lives in the container, not in a leaf try/catch-and-swallow.
    expect(typeof window).toBe('undefined');
    // `render()` evaluates the component lazily — read `.body` to force it.
    expect(
      () =>
        render(FormField, {
          props: {
            fieldKey: 'name',
            schema: { type: 'string', title: 'Name' },
            value: '',
            onChange: () => {}
          }
        }).body
    ).toThrow(/No FlowDrop instance/);
  });
});
