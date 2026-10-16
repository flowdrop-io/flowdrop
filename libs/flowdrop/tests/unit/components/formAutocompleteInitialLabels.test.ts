/**
 * Regression test: a preloaded `FormAutocomplete` value showed its raw value
 * (e.g. `org-acme`) instead of its label until the field was focused, because
 * labels were only learned from suggestions fetched on focus. When the config
 * allows an empty-query fetch (`fetchOnFocus`, `minChars: 0`), the component
 * now runs it on mount to resolve the labels. Mounted for real (happy-dom).
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import FormAutocomplete from '$lib/components/form/FormAutocomplete.svelte';
import type { AutocompleteConfig } from '$lib/types/index.js';

// Tags render an Iconify icon; keep its network lookup out of the test.
vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

const OPTIONS = [
  { label: 'Acme Corp', value: 'org-acme' },
  { label: 'Globex Industries', value: 'org-globex' }
];

let mounted: ReturnType<typeof mount> | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

function render(value: string | string[], autocomplete: Partial<AutocompleteConfig> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(FormAutocomplete, {
    target,
    props: {
      id: 'f',
      value,
      autocomplete: { url: '/suggest', fetchOnFocus: true, minChars: 0, ...autocomplete },
      onChange: vi.fn()
    }
  });
  return target;
}

async function settle() {
  for (let i = 0; i < 5; i++) {
    await tick();
    await new Promise((r) => setTimeout(r, 0));
  }
  flushSync();
}

function tags(target: HTMLElement): string[] {
  return [...target.querySelectorAll('.form-autocomplete__tag-label')].map(
    (el) => el.textContent ?? ''
  );
}

describe('FormAutocomplete labels for preloaded values', () => {
  beforeEach(() => {
    fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(OPTIONS), {
          headers: { 'Content-Type': 'application/json' }
        })
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    if (mounted) unmount(mounted);
    mounted = null;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('shows the label of a preloaded value without focusing the field', async () => {
    const target = render('org-acme');
    await settle();
    expect(tags(target)).toEqual(['Acme Corp']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('resolves every preloaded value in multiple mode with one request', async () => {
    const target = render(['org-acme', 'org-globex'], { multiple: true });
    await settle();
    expect(tags(target)).toEqual(['Acme Corp', 'Globex Industries']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when the field is empty', async () => {
    render('');
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not fetch when the config does not allow an empty query', async () => {
    const target = render('org-acme', { fetchOnFocus: false });
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tags(target)).toEqual(['org-acme']);
  });

  it('does not retry when the endpoint does not return the value', async () => {
    const target = render('org-unknown');
    await settle();
    expect(tags(target)).toEqual(['org-unknown']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
