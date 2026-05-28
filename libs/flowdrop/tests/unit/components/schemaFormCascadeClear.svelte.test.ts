/**
 * Regression test for the dependent-autocomplete clearing-on-undo bug
 * (https://github.com/flowdrop-io/flowdrop/issues/33).
 *
 * The pre-fix `FormAutocomplete` had a $effect that fired `onChange('')` any
 * time a `params`-mapped dependency changed. It could not distinguish "user
 * changed the parent field" from "external state arrived" (undo, redo,
 * programmatic reset, collab edit), so undo of a parent field cascaded a
 * value-clear on its dependents — even though the undone snapshot held them
 * populated.
 *
 * The fix moves the value-clear from the child to the parent form's
 * `handleFieldChange`. That codepath only runs on user-driven edits; undo and
 * external prop replacement flow in via `values` / `initialConfig` and never
 * reach it. This file pins both invariants:
 *
 *   - user-driven edits transitively clear dependents (matches old behavior)
 *   - prop-driven replacement (undo, programmatic) preserves dependents
 *
 * The `.svelte.test.ts` filename is load-bearing for rune support — see
 * `schemaFormMerge.svelte.test.ts` for the convention.
 */

import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { mergeWithDefaults, cascadeClearAutocompleteDependents } from '$lib/utils/formMerge.js';

type AutocompleteSchema = {
  type: 'object';
  properties: Record<
    string,
    {
      type: string;
      default?: unknown;
      autocomplete?: { params?: Record<string, string>; multiple?: boolean };
    }
  >;
};

describe('cascadeClearAutocompleteDependents (issue #33)', () => {
  it('returns empty when no field depends on the changed key', () => {
    const schema: AutocompleteSchema = {
      type: 'object',
      properties: {
        account: { type: 'string' },
        unrelated: { type: 'string' }
      }
    };
    expect(cascadeClearAutocompleteDependents(schema, 'account')).toEqual({});
  });

  it('clears immediate dependents to "" (single-value autocomplete)', () => {
    const schema: AutocompleteSchema = {
      type: 'object',
      properties: {
        account: { type: 'string' },
        project: {
          type: 'string',
          autocomplete: { params: { account: 'account' } }
        }
      }
    };
    expect(cascadeClearAutocompleteDependents(schema, 'account')).toEqual({
      project: ''
    });
  });

  it('clears multi-select dependents to []', () => {
    const schema: AutocompleteSchema = {
      type: 'object',
      properties: {
        account: { type: 'string' },
        assignees: {
          type: 'array',
          autocomplete: { params: { account: 'account' }, multiple: true }
        }
      }
    };
    expect(cascadeClearAutocompleteDependents(schema, 'account')).toEqual({
      assignees: []
    });
  });

  it('cascades transitively (A → B → C all clear when A changes)', () => {
    const schema: AutocompleteSchema = {
      type: 'object',
      properties: {
        organization: { type: 'string' },
        project: {
          type: 'string',
          autocomplete: { params: { organization: 'organization' } }
        },
        issue_type: {
          type: 'string',
          autocomplete: { params: { project: 'project' } }
        },
        assignee: {
          type: 'string',
          autocomplete: { params: { project: 'project' } }
        }
      }
    };
    expect(cascadeClearAutocompleteDependents(schema, 'organization')).toEqual({
      project: '',
      issue_type: '',
      assignee: ''
    });
  });

  it('does not clear siblings that depend on a different field', () => {
    const schema: AutocompleteSchema = {
      type: 'object',
      properties: {
        account: { type: 'string' },
        region: { type: 'string' },
        project: {
          type: 'string',
          autocomplete: { params: { account: 'account' } }
        },
        zone: {
          type: 'string',
          autocomplete: { params: { region: 'region' } }
        }
      }
    };
    expect(cascadeClearAutocompleteDependents(schema, 'account')).toEqual({
      project: ''
    });
  });

  it('does not clear the changed key itself', () => {
    const schema: AutocompleteSchema = {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          autocomplete: { params: { other: 'other' } }
        },
        other: { type: 'string' }
      }
    };
    // Changing `account` shouldn't return `account` in the cleared set, even
    // though `account` itself declares params.
    expect(cascadeClearAutocompleteDependents(schema, 'account')).toEqual({});
  });

  it('handles an empty schema without crashing', () => {
    expect(cascadeClearAutocompleteDependents(undefined, 'anything')).toEqual({});
    expect(cascadeClearAutocompleteDependents({}, 'anything')).toEqual({});
  });
});

describe('SchemaForm / ConfigForm undo invariant (issue #33)', () => {
  // The two scenarios that exercise the actual bug fix: a user-driven edit
  // must transitively clear dependents (the same shape the child used to do),
  // while a prop-driven replacement (undo, programmatic, collab) must leave
  // dependents intact.

  it('user-driven edit via handleFieldChange clears dependents transitively', () => {
    const cleanup = $effect.root(() => {
      const schema: AutocompleteSchema = {
        type: 'object',
        properties: {
          organization: { type: 'string' },
          project: {
            type: 'string',
            autocomplete: { params: { organization: 'organization' } }
          },
          issue_type: {
            type: 'string',
            autocomplete: { params: { project: 'project' } }
          }
        }
      };
      const values = $state<Record<string, unknown>>({
        organization: 'acme',
        project: 'ama',
        issue_type: 'story'
      });
      const edits = $state<Record<string, unknown>>({});

      const formValues = $derived(mergeWithDefaults(schema, values, edits));
      const read = () => formValues;

      // Sanity: starting state shows all three values.
      expect(read()).toEqual({
        organization: 'acme',
        project: 'ama',
        issue_type: 'story'
      });

      // User picks a new organization. The form's handleFieldChange would
      // write the new value, then apply the cascade. Replicate that here.
      const previousOrg = formValues.organization;
      edits.organization = 'globex';
      if (previousOrg !== 'globex') {
        const cleared = cascadeClearAutocompleteDependents(schema, 'organization');
        for (const [k, v] of Object.entries(cleared)) edits[k] = v;
      }
      flushSync();

      expect(read()).toEqual({
        organization: 'globex',
        project: '',
        issue_type: ''
      });
    });
    cleanup();
  });

  it('prop-driven values replacement (undo) preserves dependent values', () => {
    // The scenario from issue #33: user changes organization → project &
    // issue_type clear (correctly). Then undo. Store reverts organization to
    // 'acme' and project/issue_type to their previous populated values. The
    // form must show the reverted state — the cascade must NOT fire on this
    // prop replacement.
    const cleanup = $effect.root(() => {
      const schema: AutocompleteSchema = {
        type: 'object',
        properties: {
          organization: { type: 'string' },
          project: {
            type: 'string',
            autocomplete: { params: { organization: 'organization' } }
          },
          issue_type: {
            type: 'string',
            autocomplete: { params: { project: 'project' } }
          }
        }
      };
      const values = $state<Record<string, unknown>>({
        organization: 'acme',
        project: 'ama',
        issue_type: 'story'
      });
      const edits = $state<Record<string, unknown>>({});

      const formValues = $derived(mergeWithDefaults(schema, values, edits));
      const read = () => formValues;

      // User-driven change + commit: store catches up, edits buffer is
      // discharged (see ConfigForm.handleFormBlur).
      edits.organization = 'globex';
      const cleared = cascadeClearAutocompleteDependents(schema, 'organization');
      for (const [k, v] of Object.entries(cleared)) edits[k] = v;
      flushSync();
      expect(read()).toEqual({
        organization: 'globex',
        project: '',
        issue_type: ''
      });

      // Commit boundary — parent absorbs the new values, edits discharged.
      values.organization = 'globex';
      values.project = '';
      values.issue_type = '';
      edits.organization = undefined as unknown as string;
      delete edits.organization;
      delete edits.project;
      delete edits.issue_type;
      flushSync();

      // Ctrl+Z: store reverts all three fields back to their pre-change
      // snapshot. handleFieldChange is NOT called — this is a prop update —
      // so no cascade runs. The form follows the prop cleanly.
      values.organization = 'acme';
      values.project = 'ama';
      values.issue_type = 'story';
      flushSync();

      expect(read()).toEqual({
        organization: 'acme',
        project: 'ama',
        issue_type: 'story'
      });
    });
    cleanup();
  });
});
