/**
 * Which URL FormAutocomplete fetches. The API base is the instance's
 * `api.config.baseUrl` (same in every form); SchemaForm's `baseUrl`
 * (`flowdrop:getBaseUrl`) only prefixes `/path` URLs. Mounted for real (client
 * build, happy-dom). See resolveAutocompleteUrl for the rule itself.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormAutocomplete from '$lib/components/form/FormAutocomplete.svelte';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';
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
  context: Record<string, string> = {}
): HTMLDivElement {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const entries: [unknown, unknown][] = [];
  if (apiBase !== undefined) {
    const fd = createFlowDropInstance();
    if (apiBase !== null) {
      fd.api.configure({ baseUrl: apiBase, endpoints: {} } as unknown as EndpointConfig);
    }
    entries.push([FLOWDROP_INSTANCE_KEY, fd]);
  }
  for (const [key, value] of Object.entries(context)) entries.push([key, () => value]);
  mounted = mount(FormAutocomplete, {
    target,
    props: { id: 'f', onChange: () => {}, ...props } as never,
    context: new Map(entries)
  });
  return target;
}

/** Mount with `url`, type one letter, and return the URL that was fetched. */
async function fetchedUrl(
  url: string,
  apiBase: string | null | undefined,
  context: Record<string, string> = {}
): Promise<string> {
  const target = mountField({ value: '', autocomplete: { url, minChars: 0 } }, apiBase, context);
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

  it('under SchemaForm: a path without a leading slash resolves against the API base, not the prefix', async () => {
    expect(
      await fetchedUrl('secrets/options', API_BASE, { 'flowdrop:getBaseUrl': '/prefix' })
    ).toBe('https://site/api/flowdrop/secrets/options?q=a');
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
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /^https:\/\/site\/api\/flowdrop\/secrets\/options\?/
    );
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

    it('uses the URL as given and warns once', async () => {
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

    it('does not warn for site-relative or absolute URLs', async () => {
      await fetchedUrl('/api/users/search', null);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
