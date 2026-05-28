/**
 * Regression test for the dependent-autocomplete clearing bug
 * (https://github.com/flowdrop-io/flowdrop/issues/31).
 *
 * The host forms (SchemaForm / ConfigForm) used to initialise their internal
 * `formValues` as `$state({})` and populate it from props via a post-mount
 * `$effect`. Children rendered before that effect ran, so a FormAutocomplete
 * with `params` would capture an empty `getFormValues()` snapshot, then see
 * its fingerprint flip from `{}` → populated and fire `onChange('')` — wiping
 * the dependent field's preloaded value.
 *
 * The structural fix replaces the `$state + $effect` pair with a `$derived`
 * value computed from props + a separate `edits` map. The invariant under
 * test: the first read of the merged form values, immediately after the
 * derived is set up, already reflects the provided prop values. There is no
 * intermediate empty tick that a child could snapshot.
 *
 * The `.svelte.test.ts` filename is load-bearing for rune support — see
 * `tests/unit/messages/reactivity.svelte.test.ts` for the convention.
 */

import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { mergeWithDefaults } from '$lib/utils/formMerge.js';

type Schema = {
  type: 'object';
  properties: Record<string, { type: string; default?: unknown }>;
};

describe('SchemaForm / ConfigForm merge invariant (issue #31)', () => {
  it('formValues reflects prop values on the first read — no empty placeholder tick', () => {
    const cleanup = $effect.root(() => {
      const schema: Schema = {
        type: 'object',
        properties: {
          account: { type: 'string' },
          issue_type: { type: 'string' }
        }
      };
      const values = $state<Record<string, unknown>>({
        account: 'acc-1',
        issue_type: 'bug'
      });
      const edits = $state<Record<string, unknown>>({});

      const formValues = $derived(mergeWithDefaults(schema, values, edits));
      const read = () => formValues;

      // Snapshotting at construction time — equivalent to a child component
      // capturing `getFormValues()` during its own init — must already see the
      // populated values. This is the exact moment the bug used to fail.
      expect(read()).toEqual({ account: 'acc-1', issue_type: 'bug' });
    });
    cleanup();
  });

  it('edits override props but unedited keys keep the prop value', () => {
    const cleanup = $effect.root(() => {
      const schema: Schema = {
        type: 'object',
        properties: {
          account: { type: 'string' },
          issue_type: { type: 'string' }
        }
      };
      const values = $state<Record<string, unknown>>({
        account: 'acc-1',
        issue_type: 'bug'
      });
      const edits = $state<Record<string, unknown>>({});

      const formValues = $derived(mergeWithDefaults(schema, values, edits));
      const read = () => formValues;

      edits.issue_type = 'task';
      flushSync();
      expect(read()).toEqual({ account: 'acc-1', issue_type: 'task' });
    });
    cleanup();
  });

  it('falls back to schema defaults when neither prop nor edit provides a value', () => {
    const cleanup = $effect.root(() => {
      const schema: Schema = {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          label: { type: 'string', default: 'untitled' }
        }
      };
      const values = $state<Record<string, unknown>>({});
      const edits = $state<Record<string, unknown>>({});

      const formValues = $derived(mergeWithDefaults(schema, values, edits));
      const read = () => formValues;

      expect(read()).toEqual({ enabled: true, label: 'untitled' });
    });
    cleanup();
  });

  it('prop value of explicit null/false/0/"" overrides the schema default', () => {
    const cleanup = $effect.root(() => {
      const schema: Schema = {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          count: { type: 'number', default: 10 },
          label: { type: 'string', default: 'untitled' }
        }
      };
      const values = $state<Record<string, unknown>>({
        enabled: false,
        count: 0,
        label: ''
      });
      const edits = $state<Record<string, unknown>>({});

      const formValues = $derived(mergeWithDefaults(schema, values, edits));
      const read = () => formValues;

      expect(read()).toEqual({ enabled: false, count: 0, label: '' });
    });
    cleanup();
  });

  it('prop churn (new values object, same keys) preserves user edits', () => {
    // The pre-fix code re-merged on every `values` reference change and lost
    // edits. The new design only resets edits on schema-reference change.
    const cleanup = $effect.root(() => {
      const schema: Schema = {
        type: 'object',
        properties: { account: { type: 'string' } }
      };
      let values = $state<Record<string, unknown>>({ account: 'acc-1' });
      const edits = $state<Record<string, unknown>>({});

      const formValues = $derived(mergeWithDefaults(schema, values, edits));
      const read = () => formValues;

      edits.account = 'acc-99';
      flushSync();
      expect(read()).toEqual({ account: 'acc-99' });

      // Parent re-renders and passes a freshly-constructed values object with
      // the same contents — the user's edit must survive.
      values = { account: 'acc-1' };
      flushSync();
      expect(read()).toEqual({ account: 'acc-99' });
    });
    cleanup();
  });

  it('discharging edits on commit lets undo flow through the prop', () => {
    // Mirrors ConfigForm.handleFormBlur, which now does `edits = {}` after
    // calling onChange. Without the discharge, edits would override the
    // reverted prop value after undo and the form would show stale state.
    const cleanup = $effect.root(() => {
      const schema: Schema = {
        type: 'object',
        properties: { field: { type: 'string' } }
      };
      const values = $state<Record<string, unknown>>({ field: 'a' });
      let edits = $state<Record<string, unknown>>({});

      const formValues = $derived(mergeWithDefaults(schema, values, edits));
      const read = () => formValues;

      // 1. User types 'b'
      edits.field = 'b';
      flushSync();
      expect(read()).toEqual({ field: 'b' });

      // 2. Blur — parent absorbs the commit (values prop catches up),
      //    edits buffer is discharged.
      values.field = 'b';
      edits = {};
      flushSync();
      expect(read()).toEqual({ field: 'b' });

      // 3. Ctrl+Z — store reverts. With discharged edits, the form follows.
      values.field = 'a';
      flushSync();
      expect(read()).toEqual({ field: 'a' });
    });
    cleanup();
  });
});
