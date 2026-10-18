/**
 * A Group's `defaultOpen` is where the fold starts, not a value it is held to.
 * The config form rebuilds its UI schema on every keystroke, so the fieldset
 * receives a fresh `group` object each time; a fold the user opened must stay
 * open through that.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import FormFieldset from '$lib/components/form/FormFieldset.svelte';
import type { UISchemaGroup } from '$lib/types/uischema.js';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

let mounted: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = null;
  document.body.innerHTML = '';
});

function group(defaultOpen: boolean): UISchemaGroup {
  return { type: 'Group', label: 'General', defaultOpen, elements: [] };
}

function render(defaultOpen: boolean): {
  props: { group: UISchemaGroup };
  details: HTMLDetailsElement;
} {
  const props = $state({
    group: group(defaultOpen),
    children: createRawSnippet(() => ({ render: () => '<input />' }))
  });
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(FormFieldset, { target, props });
  flushSync();
  return { props, details: target.querySelector('details')! };
}

describe('FormFieldset open state', () => {
  it('starts from defaultOpen', () => {
    expect(render(false).details.open).toBe(false);
    unmount(mounted!);
    mounted = null;
    expect(render(true).details.open).toBe(true);
  });

  it('keeps a user-opened fold open when the group object is rebuilt', () => {
    const { props, details } = render(false);
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    flushSync();

    props.group = { ...group(false), description: 'rebuilt' };
    flushSync();

    expect(details.open).toBe(true);
  });

  it('keeps a user-closed fold closed when the group object is rebuilt', () => {
    const { props, details } = render(true);
    details.open = false;
    details.dispatchEvent(new Event('toggle'));
    flushSync();

    props.group = { ...group(true), description: 'rebuilt' };
    flushSync();

    expect(details.open).toBe(false);
  });
});
