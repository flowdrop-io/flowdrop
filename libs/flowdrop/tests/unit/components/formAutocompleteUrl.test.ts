/**
 * Which URL FormAutocomplete fetches. The API base is the instance's
 * `api.config.baseUrl` (same in every form); SchemaForm's `baseUrl`
 * (`flowdrop:getBaseUrl`) prefixes `/path` URLs and, when given, is the base
 * for no-slash URLs instead. Auth falls back to the instance's provider.
 * Mounted for real (client
 * build, happy-dom). See resolveAutocompleteUrl for the rule itself.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormAutocomplete from '$lib/components/form/FormAutocomplete.svelte';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';
import type { AuthProvider } from '$lib/types/index.js';
import { setLogLevel } from '$lib/utils/logger.js';

let mounted: ReturnType<typeof mount> | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

const API_BASE = 'https://site/api/flowdrop';

/**
 * Mount with an instance whose API base is `apiBase` (null: not configured;
 * undefined: no instance in context at all, as when the field is used alone).
 */
function mountField(
  props: { value: string; autocomplete: Record<string, unknown> },
  apiBase: string | null | undefined,
  context: Record<string, string> = {},
  extra: { instanceAuth?: AuthProvider; formAuth?: AuthProvider | null } = {}
): HTMLDivElement {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const entries: [unknown, unknown][] = [];
  if (apiBase !== undefined) {
    const fd = createFlowDropInstance();
    if (apiBase !== null) {
      fd.api.configure(
        { baseUrl: apiBase, endpoints: {} } as unknown as EndpointConfig,
        extra.instanceAuth
      );
    } else if (extra.instanceAuth) {
      fd.api.setAuthProvider(extra.instanceAuth);
    }
    entries.push([FLOWDROP_INSTANCE_KEY, fd]);
  }
  for (const [key, value] of Object.entries(context)) entries.push([key, () => value]);
  // formAuth: undefined = no context key; null = key present, getter returns undefined
  if (extra.formAuth !== undefined) {
    entries.push(['flowdrop:getAuthProvider', () => extra.formAuth ?? undefined]);
  }
  mounted = mount(FormAutocomplete, {
    target,
    props: { id: 'f', onChange: () => {}, ...props } as never,
    context: new Map(entries)
  });
  return target;
}

function authWith(token: string): AuthProvider {
  return {
    getAuthHeaders: async () => ({ Authorization: token }),
    onUnauthorized: async () => false,
    onForbidden: async () => {}
  } as unknown as AuthProvider;
}

/** Mount with `url`, type one letter, and return the URL that was fetched. */
async function fetchedUrl(
  url: string,
  apiBase: string | null | undefined,
  context: Record<string, string> = {},
  extra: Parameters<typeof mountField>[3] = {}
): Promise<string> {
  const target = mountField(
    { value: '', autocomplete: { url, minChars: 0 } },
    apiBase,
    context,
    extra
  );
  const input = target.querySelector('input') as HTMLInputElement;
  input.value = 'a';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
  await vi.runAllTimersAsync();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  return String(fetchMock.mock.calls[0][0]);
}

describe('FormAutocomplete URL resolution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn(
      async () => new Response('[]', { headers: { 'Content-Type': 'application/json' } })
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    if (mounted) unmount(mounted);
    mounted = null;
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('a site-relative path is used as given', async () => {
    expect(await fetchedUrl('/api/users/search', API_BASE)).toBe('/api/users/search?q=a');
  });

  it('a path without a leading slash resolves against the API base', async () => {
    expect(await fetchedUrl('secrets/options', API_BASE)).toBe(
      'https://site/api/flowdrop/secrets/options?q=a'
    );
  });

  it('under SchemaForm: the baseUrl prop still prefixes site-relative paths', async () => {
    expect(await fetchedUrl('/users', API_BASE, { 'flowdrop:getBaseUrl': '/api' })).toBe(
      '/api/users?q=a'
    );
  });

  it('under SchemaForm: a path without a leading slash resolves against the prop, not the API base', async () => {
    expect(
      await fetchedUrl('secrets/options', API_BASE, { 'flowdrop:getBaseUrl': '/prefix' })
    ).toBe('/prefix/secrets/options?q=a');
  });

  it('puts the query before a #fragment', async () => {
    expect(await fetchedUrl('secrets/options?kind=a#top', API_BASE)).toBe(
      'https://site/api/flowdrop/secrets/options?kind=a&q=a'
    );
    unmount(mounted!);
    mounted = null;
    fetchMock.mockClear();
    expect(await fetchedUrl('/users#top', API_BASE)).toBe('/users?q=a');
  });

  it('the label lookup of a filled field uses the same resolution', async () => {
    mountField(
      {
        value: 'x',
        autocomplete: { url: 'secrets/options', fetchOnFocus: true, minChars: 0 }
      },
      API_BASE,
      { 'flowdrop:getBaseUrl': '/prefix' }
    );
    flushSync();
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^\/prefix\/secrets\/options\?/);
  });

  it('the baseUrl prop wins over the instance API base for a path without a leading slash', async () => {
    expect(
      await fetchedUrl('users/search', API_BASE, { 'flowdrop:getBaseUrl': 'https://api.x' })
    ).toBe('https://api.x/users/search?q=a');
  });

  it('with no API base, the baseUrl prop is the base for a path without a leading slash', async () => {
    expect(await fetchedUrl('users/search', null, { 'flowdrop:getBaseUrl': 'https://api.x' })).toBe(
      'https://api.x/users/search?q=a'
    );
  });

  it('the baseUrl prop is the base when the field has no instance at all', async () => {
    expect(
      await fetchedUrl('users/search', undefined, { 'flowdrop:getBaseUrl': 'https://api.x' })
    ).toBe('https://api.x/users/search?q=a');
  });

  describe('auth', () => {
    const authOf = (): unknown =>
      (fetchMock.mock.calls[0][1] as { headers: Record<string, string> }).headers.Authorization;

    it('interrupt forms (no provider from the form) send the instance auth to the API base', async () => {
      await fetchedUrl(
        'users/search',
        API_BASE,
        {},
        { instanceAuth: authWith('inst'), formAuth: null }
      );
      expect(authOf()).toBe('inst');
    });

    it('the instance auth also goes to site-relative URLs', async () => {
      await fetchedUrl(
        '/api/users',
        API_BASE,
        {},
        { instanceAuth: authWith('inst'), formAuth: null }
      );
      expect(authOf()).toBe('inst');
    });

    it('the form provider wins over the instance auth', async () => {
      await fetchedUrl(
        'users/search',
        API_BASE,
        {},
        { instanceAuth: authWith('inst'), formAuth: authWith('form') }
      );
      expect(authOf()).toBe('form');
    });

    it('absolute URLs get no instance auth when the form has no provider', async () => {
      await fetchedUrl(
        'https://other.test/users',
        API_BASE,
        {},
        { instanceAuth: authWith('inst'), formAuth: null }
      );
      expect(authOf()).toBeUndefined();
      fetchMock.mockClear();
      if (mounted) unmount(mounted);
      mounted = null;
      await fetchedUrl(
        '//other.test/users',
        API_BASE,
        {},
        { instanceAuth: authWith('inst'), formAuth: null }
      );
      expect(authOf()).toBeUndefined();
    });

    it('with an API base too, a path the baseUrl prop sends to another host gets no instance auth', async () => {
      const url = await fetchedUrl(
        'users/search',
        API_BASE,
        { 'flowdrop:getBaseUrl': 'https://api.x' },
        { instanceAuth: authWith('inst'), formAuth: null }
      );
      expect(url).toBe('https://api.x/users/search?q=a');
      expect(authOf()).toBeUndefined();
    });

    it('a path resolved against a baseUrl prop on another host gets no instance auth', async () => {
      const url = await fetchedUrl(
        'users/search',
        null,
        { 'flowdrop:getBaseUrl': 'https://api.x' },
        { instanceAuth: authWith('inst'), formAuth: null }
      );
      expect(url).toBe('https://api.x/users/search?q=a');
      expect(authOf()).toBeUndefined();
    });

    it('an absolute URL under the absolute API base gets the instance auth', async () => {
      await fetchedUrl(
        `${API_BASE}/users`,
        API_BASE,
        {},
        { instanceAuth: authWith('inst'), formAuth: null }
      );
      expect(authOf()).toBe('inst');
    });

    it('an absolute URL on the page origin gets the instance auth', async () => {
      await fetchedUrl(
        `${location.origin}/api/users`,
        API_BASE,
        {},
        { instanceAuth: authWith('inst'), formAuth: null }
      );
      expect(authOf()).toBe('inst');
    });

    it('absolute URLs still get the form provider', async () => {
      await fetchedUrl(
        'https://other.test/users',
        API_BASE,
        {},
        { instanceAuth: authWith('inst'), formAuth: authWith('form') }
      );
      expect(authOf()).toBe('form');
    });
  });

  describe('refused URLs', () => {
    let error: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      setLogLevel('error');
      error = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      setLogLevel('none');
      error.mockRestore();
    });

    async function typeInto(target: HTMLElement, letters: string[]): Promise<void> {
      const input = target.querySelector('input') as HTMLInputElement;
      for (const letter of letters) {
        input.value = letter;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        flushSync();
        await vi.runAllTimersAsync();
      }
    }

    it.each(['../secrets', '?x=1', '#a', 'a/../b', '%2e%2e/secrets', '/\\other.test/opts'])(
      'fetches nothing for %j and logs one error',
      async (url) => {
        const target = mountField({ value: '', autocomplete: { url, minChars: 0 } }, API_BASE);
        await typeInto(target, ['a', 'ab']);
        expect(fetchMock).not.toHaveBeenCalled();
        const logged = error.mock.calls.filter((c) => String(c[0]).includes(url));
        expect(logged).toHaveLength(1);
        expect(target.querySelector('input')).not.toBeNull();
      }
    );

    it('fetches nothing for an empty URL and logs one error', async () => {
      const target = mountField({ value: '', autocomplete: { url: '', minChars: 0 } }, API_BASE);
      await typeInto(target, ['a', 'ab']);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledTimes(1);
    });

    it('the label lookup of a filled field fetches nothing and shares the one error', async () => {
      mountField(
        { value: 'x', autocomplete: { url: '../options', fetchOnFocus: true, minChars: 0 } },
        API_BASE
      );
      flushSync();
      await vi.runAllTimersAsync();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledTimes(1);
    });
  });

  describe('with no API base', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      setLogLevel('warn');
      warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      setLogLevel('none');
      warn.mockRestore();
    });

    it('uses the URL as given and warns once (no baseUrl prop either)', async () => {
      const target = mountField(
        { value: '', autocomplete: { url: 'secrets/options', minChars: 0 } },
        null
      );
      const input = target.querySelector('input') as HTMLInputElement;
      for (const letter of ['a', 'ab']) {
        input.value = letter;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        flushSync();
        await vi.runAllTimersAsync();
      }
      expect(String(fetchMock.mock.calls[0][0])).toBe('secrets/options?q=a');
      expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
      const warnings = warn.mock.calls.filter((c) => String(c[0]).includes('secrets/options'));
      expect(warnings).toHaveLength(1);
    });

    it('uses the URL as given with no instance in context (the field used alone)', async () => {
      expect(await fetchedUrl('secrets/options', undefined)).toBe('secrets/options?q=a');
    });

    it('does not warn when the baseUrl prop stands in for the base', async () => {
      await fetchedUrl('users/search', null, { 'flowdrop:getBaseUrl': 'https://api.x' });
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn for site-relative or absolute URLs', async () => {
      await fetchedUrl('/api/users/search', null);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
