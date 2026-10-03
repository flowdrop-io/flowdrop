/**
 * Regression test for fdnpm #32: `FormAutocomplete` in free-text single mode
 * used to call `onChange` on every keystroke, flooding the parent form's edits
 * buffer and history. The fix (6aa75980) commits only on intent signals:
 * Enter and blur (option selection already committed). Mounted for real
 * (client build, happy-dom).
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormAutocomplete from '$lib/components/form/FormAutocomplete.svelte';

let mounted: ReturnType<typeof mount> | null = null;

function render(value = '') {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const onChange = vi.fn();
  mounted = mount(FormAutocomplete, {
    target,
    props: {
      id: 'f',
      value,
      autocomplete: { url: '/suggest', allowFreeText: true },
      onChange
    }
  });
  const input = target.querySelector('input') as HTMLInputElement;
  return { input, onChange };
}

function type(input: HTMLInputElement, text: string) {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
}

describe('FormAutocomplete free-text commit (issue #32)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('[]', { headers: { 'Content-Type': 'application/json' } }))
    );
  });

  afterEach(() => {
    if (mounted) unmount(mounted);
    mounted = null;
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not commit per keystroke', () => {
    const { input, onChange } = render();
    for (const text of ['h', 'he', 'hel', 'hell', 'hello']) type(input, text);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits the typed text once on Enter', () => {
    const { input, onChange } = render();
    type(input, 'hello');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('commits the typed text once on blur', () => {
    const { input, onChange } = render();
    type(input, 'hello');
    input.dispatchEvent(new Event('blur'));
    expect(onChange).not.toHaveBeenCalled(); // blur commit is delayed
    vi.advanceTimersByTime(250);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('does not commit on blur when the text equals the current value', () => {
    const { input, onChange } = render('same');
    type(input, 'same');
    input.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(250);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not commit on blur when the box is empty (the value lives in the chip)', () => {
    const { input, onChange } = render('same');
    type(input, '');
    input.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(250);
    expect(onChange).not.toHaveBeenCalled();
  });
});
