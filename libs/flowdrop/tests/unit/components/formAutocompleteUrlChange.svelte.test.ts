/**
 * FormAutocomplete logs a refused URL once, but once per URL: a field whose
 * `autocomplete.url` changes (a schema swapped in place) logs the new one too.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormAutocomplete from '$lib/components/form/FormAutocomplete.svelte';
import { setLogLevel } from '$lib/utils/logger.js';

describe('FormAutocomplete refused URL log', () => {
  let error: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let mounted: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn(async () => new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);
    setLogLevel('error');
    error = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (mounted) unmount(mounted);
    mounted = null;
    document.body.innerHTML = '';
    setLogLevel('none');
    error.mockRestore();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('logs again when the URL changes to another refused one', async () => {
    const props = $state({
      id: 'f',
      value: '',
      onChange: () => {},
      autocomplete: { url: '../one', minChars: 0 }
    });
    const target = document.createElement('div');
    document.body.appendChild(target);
    mounted = mount(FormAutocomplete, { target, props: props as never });
    const input = target.querySelector('input') as HTMLInputElement;

    const type = async (letter: string): Promise<void> => {
      input.value = letter;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      flushSync();
      await vi.runAllTimersAsync();
    };

    await type('a');
    await type('ab');
    props.autocomplete = { url: '../two', minChars: 0 };
    flushSync();
    await type('abc');
    await type('abcd');

    expect(fetchMock).not.toHaveBeenCalled();
    const lines = error.mock.calls.map((c) => String(c[0]));
    expect(lines.filter((l) => l.includes('../one'))).toHaveLength(1);
    expect(lines.filter((l) => l.includes('../two'))).toHaveLength(1);
  });
});
