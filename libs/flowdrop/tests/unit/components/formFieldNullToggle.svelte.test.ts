/**
 * A field whose type or enum admits null gets a "null" toggle on its label row.
 * On stores null and shows a muted "null" in place of the input; off brings the
 * earlier value back, or, when there was none, leaves the key absent. Fields that
 * do not admit null have no toggle, since saving null there would fail validation.
 * A required field with `when_missing: skip` carries a short hint. Mounted for
 * real (client build, happy-dom).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormFieldLight from '$lib/components/form/FormFieldLight.svelte';
import ConfigForm from '$lib/components/ConfigForm.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { FieldSchema } from '$lib/components/form/types.js';

let mounted: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

function render(schema: FieldSchema, initial: unknown, required = false) {
  const onChange = vi.fn();
  const props = $state({ fieldKey: 'f', schema, value: initial, required, onChange });
  // The parent form feeds the new value back, as ConfigForm does.
  props.onChange = vi.fn((v: unknown) => {
    onChange(v);
    props.value = v;
  });
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(FormFieldLight, {
    target,
    props: props as never,
    context: new Map([[FLOWDROP_INSTANCE_KEY, createFlowDropInstance()]])
  });
  flushSync();
  const toggle = () => target.querySelector<HTMLButtonElement>('button[aria-pressed]');
  const click = () => {
    toggle()!.click();
    flushSync();
  };
  return { target, onChange, toggle, click, props };
}

describe('null toggle visibility', () => {
  it('shows on a type array that lists null', () => {
    expect(render({ type: ['string', 'null'] }, 'x').toggle()).not.toBeNull();
  });

  it('shows on an enum that lists null', () => {
    expect(render({ type: 'string', enum: ['a', null] }, 'a').toggle()).not.toBeNull();
  });

  it('does not show where null is not admitted', () => {
    expect(render({ type: 'string' }, 'x').toggle()).toBeNull();
    expect(render({ type: ['string', 'integer'] }, 'x').toggle()).toBeNull();
    expect(render({ type: 'string', enum: ['a', 'b'] }, 'a').toggle()).toBeNull();
    expect(render({}, undefined).toggle()).toBeNull();
  });

  it('is a labelled button with a tooltip', () => {
    const btn = render({ type: ['string', 'null'] }, 'x').toggle()!;
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-label')).toBe('Set to null');
    expect(btn.getAttribute('title')).toBeTruthy();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('null toggle behaviour', () => {
  it('turning it on stores null and shows the muted null state instead of the input', () => {
    const t = render({ type: ['string', 'null'] }, 'hello');
    expect(t.target.querySelector('input')).not.toBeNull();
    t.click();
    expect(t.onChange).toHaveBeenLastCalledWith(null);
    expect(t.toggle()!.getAttribute('aria-pressed')).toBe('true');
    expect(t.target.querySelector('input')).toBeNull();
    expect(t.target.querySelector('[data-null-value]')?.textContent).toBe('null');
  });

  it('turning it off brings the previous value back', () => {
    const t = render({ type: ['integer', 'null'] }, 7);
    t.click();
    t.click();
    expect(t.onChange).toHaveBeenLastCalledWith(7);
    expect(t.toggle()!.getAttribute('aria-pressed')).toBe('false');
  });

  it('turning it off with no previous value leaves the key absent', () => {
    const t = render({ type: ['string', 'null'] }, undefined);
    t.click();
    expect(t.onChange).toHaveBeenLastCalledWith(null);
    t.click();
    expect(t.onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('keeps an empty string as a previous value, not as absent', () => {
    const t = render({ type: ['string', 'null'] }, '');
    t.click();
    t.click();
    expect(t.onChange).toHaveBeenLastCalledWith('');
  });

  it('shows on for a config that already holds null, and off restores absent', () => {
    const t = render({ type: ['string', 'null'] }, null);
    expect(t.toggle()!.getAttribute('aria-pressed')).toBe('true');
    expect(t.target.querySelector('[data-null-value]')).not.toBeNull();
    t.click();
    expect(t.onChange).toHaveBeenLastCalledWith(undefined);
  });
});

describe('when_missing hint', () => {
  it('shows on a required field with when_missing: skip', () => {
    const t = render({ type: 'string', when_missing: 'skip' }, '', true);
    expect(t.target.textContent).toContain('Skipped when empty');
  });

  it('does not show for fail, for an absent when_missing, or when not required', () => {
    expect(
      render({ type: 'string', when_missing: 'fail' }, '', true).target.textContent
    ).not.toContain('Skipped');
    unmount(mounted!);
    expect(render({ type: 'string' }, '', true).target.textContent).not.toContain('Skipped');
    unmount(mounted!);
    expect(
      render({ type: 'string', when_missing: 'skip' }, '', false).target.textContent
    ).not.toContain('Skipped');
  });
});

describe('null toggle inside ConfigForm', () => {
  const nullableSchema = {
    type: 'object',
    properties: { limit: { type: ['integer', 'null'], title: 'Limit' } }
  } as never;

  function mountForm(values: Record<string, unknown>) {
    const onChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    mounted = mount(ConfigForm, {
      target,
      props: { schema: nullableSchema, values, onChange, commitMode: 'live' }
    });
    flushSync();
    const toggle = () =>
      target.querySelector<HTMLButtonElement>('button[aria-label="Set to null"]')!;
    const last = () => onChange.mock.calls.at(-1)![0] as Record<string, unknown>;
    return { toggle, last, onChange };
  }

  it('turning off a null that was loaded removes the key', () => {
    const { toggle, last } = mountForm({ limit: null });
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    toggle().click();
    flushSync();
    expect('limit' in last()).toBe(false);
  });

  it('turning on stores null, turning off restores the typed value', () => {
    const { toggle, last } = mountForm({ limit: 5 });
    toggle().click();
    flushSync();
    expect(last().limit).toBeNull();
    toggle().click();
    flushSync();
    expect(last().limit).toBe(5);
  });
});
