/**
 * Regression test: a preloaded `FormAutocomplete` value showed its raw value
 * (e.g. `org-acme`) instead of its label until the field was focused, because
 * labels were only learned from suggestions fetched on focus. When the config
 * allows an empty-query fetch (`fetchOnFocus`, `minChars: 0`), the component
 * now runs it on mount to resolve the labels. Mounted for real (happy-dom).
 *
 * The lookup is its own request: an undo or a search while it is in flight
 * must not lose it, and it must not stand in for the suggestions focus loads.
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

  it('focusing after the lookup still loads suggestions', async () => {
    const target = render('org-acme');
    await settle();
    target.querySelector('input')!.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the endpoint does not return the value', async () => {
    const target = render('org-unknown');
    await settle();
    expect(tags(target)).toEqual(['org-unknown']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

/** A fetch the test settles by hand; aborting rejects it like a browser does. */
type Pending = { url: string; signal: AbortSignal; resolve: (body: unknown) => void };

describe('FormAutocomplete requests in flight', () => {
  let pending: Pending[];

  beforeEach(() => {
    pending = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (input: RequestInfo, init?: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            const signal = init!.signal!;
            signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError'))
            );
            pending.push({
              url: String(input),
              signal,
              resolve: (body) =>
                resolve(
                  new Response(JSON.stringify(body), {
                    headers: { 'Content-Type': 'application/json' }
                  })
                )
            });
          })
      )
    );
  });

  afterEach(() => {
    if (mounted) unmount(mounted);
    mounted = null;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  const live = () => pending.filter((p) => !p.signal.aborted);

  it('looks up the restored value when an undo lands during the lookup', async () => {
    const form = $state<Record<string, unknown>>({ org: 'acme' });
    const props = $state({
      id: 'f',
      value: 'u1',
      autocomplete: { url: '/suggest', fetchOnFocus: true, params: { org: 'org' } },
      onChange: vi.fn()
    });
    const target = document.createElement('div');
    document.body.appendChild(target);
    mounted = mount(FormAutocomplete, {
      target,
      props,
      context: new Map([['flowdrop:getFormValues', () => form]])
    });
    await settle();

    // Undo restores the parent field and this field together.
    form.org = 'globex';
    props.value = 'u2';
    await settle();

    expect(live().map((p) => p.url)).toEqual(['/suggest?q=&org=globex']);
    live()[0].resolve([{ label: 'User Two', value: 'u2' }]);
    await settle();
    expect(tags(target)).toEqual(['User Two']);
  });

  it('a search typed during the lookup does not cancel it', async () => {
    const target = render('org-acme', { debounceMs: 0 });
    await settle();
    const input = target.querySelector('input')!;
    input.value = 'glo';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    const [lookup, search] = live();
    expect(search.url).toBe('/suggest?q=glo');
    search.resolve([OPTIONS[1]]);
    lookup.resolve(OPTIONS);
    await settle();
    expect(tags(target)).toEqual(['Acme Corp']);
    // The lookup did not replace the search's suggestions.
    expect(
      [...target.querySelectorAll('.form-autocomplete__option-label')].map((el) => el.textContent)
    ).toEqual(['Globex Industries']);
  });

  it('keeps loading while a newer search is in flight', async () => {
    const target = render('', { debounceMs: 0 });
    await settle();
    const input = target.querySelector('input')!;
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await settle();
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    // The focus request was aborted and has settled; the search is still out.
    expect(live().map((p) => p.url)).toEqual(['/suggest?q=a']);
    expect(target.querySelector('.form-autocomplete__spinner')).not.toBeNull();
  });
});
