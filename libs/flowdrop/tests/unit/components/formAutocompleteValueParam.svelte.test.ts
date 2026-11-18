/**
 * `autocomplete.valueParam`: a saved value's label is looked up with
 * `url?{valueParam}=<value>` on mount, one request per value, under the same
 * URL and auth rules as the suggestions request.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import FormAutocomplete from '$lib/components/form/FormAutocomplete.svelte';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { AutocompleteConfig } from '$lib/types/index.js';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

let mounted: ReturnType<typeof mount> | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

const ANSWERS: Record<string, { label: string; value: string }[]> = {
  'wf-1': [{ label: 'Nightly import', value: 'wf-1' }],
  'wf-2': [{ label: 'Weekly report', value: 'wf-2' }]
};

function render(
  value: string | string[],
  autocomplete: Partial<AutocompleteConfig> = {},
  context: Map<string, unknown> = new Map()
) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(FormAutocomplete, {
    target,
    context,
    props: {
      id: 'f',
      value,
      autocomplete: { url: '/options', valueParam: 'value', ...autocomplete },
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

const urls = () => fetchMock.mock.calls.map((c) => String(c[0]));
const headersOf = (i: number) =>
  ((fetchMock.mock.calls[i][1] as RequestInit).headers ?? {}) as Record<string, string>;

describe('FormAutocomplete valueParam', () => {
  beforeEach(() => {
    fetchMock = vi.fn(async (input: RequestInfo) => {
      const value = new URL(String(input), 'http://localhost').searchParams.get('value') ?? '';
      return new Response(JSON.stringify(ANSWERS[value] ?? []), {
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    if (mounted) unmount(mounted);
    mounted = null;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('looks the label up on mount, even without fetchOnFocus', async () => {
    const target = render('wf-1');
    await settle();
    expect(urls()).toEqual(['/options?value=wf-1']);
    expect(tags(target)).toEqual(['Nightly import']);
  });

  it('does not look up the empty query when valueParam is set', async () => {
    render('wf-1', { fetchOnFocus: true, minChars: 0 });
    await settle();
    expect(urls()).toEqual(['/options?value=wf-1']);
  });

  it('sends nothing without valueParam', async () => {
    const target = render('wf-1', { valueParam: undefined });
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tags(target)).toEqual(['wf-1']);
  });

  it('sends nothing for an empty field', async () => {
    render('');
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the raw value for an unknown value and asks only once', async () => {
    const target = render('wf-unknown');
    await settle();
    expect(tags(target)).toEqual(['wf-unknown']);
    expect(urls()).toEqual(['/options?value=wf-unknown']);
  });

  it('keeps the raw value when the request fails', async () => {
    fetchMock.mockImplementation(async () => new Response('no', { status: 500 }));
    const target = render('wf-1');
    await settle();
    expect(tags(target)).toEqual(['wf-1']);
    expect(target.textContent).not.toContain('HTTP 500');
  });

  it('ignores response entries for other values', async () => {
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify(ANSWERS['wf-2']), { status: 200 })
    );
    const target = render('wf-1');
    await settle();
    expect(tags(target)).toEqual(['wf-1']);
  });

  it('looks up each value in multiple mode, one request per value', async () => {
    const target = render(['wf-1', 'wf-2', 'wf-x'], { multiple: true });
    await settle();
    expect(urls().sort()).toEqual([
      '/options?value=wf-1',
      '/options?value=wf-2',
      '/options?value=wf-x'
    ]);
    expect(tags(target)).toEqual(['Nightly import', 'Weekly report', 'wf-x']);
  });

  it('does not look up a value whose label is already known', async () => {
    const target = render('wf-1');
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // A picked value is cached; no further lookups happen for it.
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(tags(target)).toEqual(['Nightly import']);
  });

  it('adds the parameter after an existing query string', async () => {
    render('wf-1', { url: '/options?kind=wf' });
    await settle();
    expect(urls()).toEqual(['/options?kind=wf&value=wf-1']);
  });

  it('adds the parameter before a #fragment', async () => {
    render('wf-1', { url: '/options?kind=wf#top' });
    await settle();
    expect(urls()).toEqual(['/options?kind=wf&value=wf-1']);
  });

  it('encodes the value', async () => {
    render('a b&c');
    await settle();
    expect(urls()).toEqual(['/options?value=a%20b%26c']);
  });

  it('sends the dependency params with the lookup', async () => {
    const form = { org: 'acme' };
    render('wf-1', { params: { org: 'org' } }, new Map([['flowdrop:getFormValues', () => form]]));
    await settle();
    expect(urls()).toEqual(['/options?value=wf-1&org=acme']);
  });

  it('fetches nothing for a refused URL', async () => {
    const target = render('wf-1', { url: '/opt\tions' });
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tags(target)).toEqual(['wf-1']);
  });

  it('resolves a URL without a leading slash against the API base', async () => {
    const fd = { api: { config: { baseUrl: 'https://api.example/v1' }, authProvider: undefined } };
    render('wf-1', { url: 'workflows/options' }, new Map([[FLOWDROP_INSTANCE_KEY, fd]]));
    await settle();
    expect(urls()).toEqual(['https://api.example/v1/workflows/options?value=wf-1']);
  });

  it('aborts the lookup on unmount', async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_input: RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init?.signal ?? undefined;
          signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')));
        })
    );
    render('wf-1');
    await settle();
    expect(signal?.aborted).toBe(false);
    unmount(mounted!);
    mounted = null;
    expect(signal?.aborted).toBe(true);
  });

  describe('auth', () => {
    const instanceAuth = { getAuthHeaders: async () => ({ Authorization: 'Bearer inst' }) };
    const instance = (baseUrl: string) =>
      new Map<string, unknown>([
        [FLOWDROP_INSTANCE_KEY, { api: { config: { baseUrl }, authProvider: instanceAuth } }]
      ]);

    it('sends the instance auth under the API base', async () => {
      render('wf-1', { url: 'https://api.example/v1/options' }, instance('https://api.example/v1'));
      await settle();
      expect(headersOf(0).Authorization).toBe('Bearer inst');
    });

    it('sends the instance auth to the page origin', async () => {
      render('wf-1', { url: '/options' }, instance('https://api.example/v1'));
      await settle();
      expect(headersOf(0).Authorization).toBe('Bearer inst');
    });

    it('sends no instance auth to another host', async () => {
      render(
        'wf-1',
        { url: 'https://elsewhere.example/options' },
        instance('https://api.example/v1')
      );
      await settle();
      expect(urls()).toEqual(['https://elsewhere.example/options?value=wf-1']);
      expect(headersOf(0).Authorization).toBeUndefined();
    });
  });
});
