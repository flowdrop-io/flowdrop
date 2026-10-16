/**
 * Which URL FormAutocomplete fetches, given the context its container provides:
 * ConfigForm provides the API base (`flowdrop:getApiBaseUrl`), SchemaForm its
 * `baseUrl` prop (`flowdrop:getBaseUrl`). Mounted for real (client build,
 * happy-dom). See resolveAutocompleteUrl for the rule itself.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormAutocomplete from '$lib/components/form/FormAutocomplete.svelte';

let mounted: ReturnType<typeof mount> | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

/** Mount with `url`, type one letter, and return the URL that was fetched. */
async function fetchedUrl(url: string, context: Record<string, string>): Promise<string> {
  const target = document.createElement('div');
  document.body.appendChild(target);
  mounted = mount(FormAutocomplete, {
    target,
    props: { id: 'f', value: '', autocomplete: { url, minChars: 0 }, onChange: () => {} },
    context: new Map(Object.entries(context).map(([key, value]) => [key, () => value]))
  });
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

  const api = { 'flowdrop:getApiBaseUrl': 'https://site/api/flowdrop' };

  it('under ConfigForm: a site-relative path is used as given', async () => {
    expect(await fetchedUrl('/api/users/search', api)).toBe('/api/users/search?q=a');
  });

  it('under ConfigForm: a path without a leading slash resolves against the API base', async () => {
    expect(await fetchedUrl('secrets/options', api)).toBe(
      'https://site/api/flowdrop/secrets/options?q=a'
    );
  });

  it('under SchemaForm: the baseUrl prop still prefixes site-relative paths', async () => {
    expect(await fetchedUrl('/users', { 'flowdrop:getBaseUrl': '/api' })).toBe('/api/users?q=a');
  });

  it('with no container context: the URL is used as given', async () => {
    expect(await fetchedUrl('secrets/options', {})).toBe('secrets/options?q=a');
  });
});
