/**
 * A node's config holds only what its authors set, plus the defaults of its
 * required keys (#72, maintainer decision 2026-11-18).
 *
 * - An optional key nobody set stays absent: its default applies when the node
 *   runs (spec CFG-3), and writing it would fill an absent key, which the
 *   spec's "Absent, null and empty" convention rules out.
 * - A required key nobody set gets its default written: R6.b refuses a save
 *   whose config lacks a required key, and a default does not count.
 * - A cleared key stays absent across commits, even with a default, until the
 *   config holds the key again (undo, a change made elsewhere).
 *
 * Every test feeds the committed config back into the form, as the editor does.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ConfigForm from '$lib/components/ConfigForm.svelte';

type Values = Record<string, unknown>;

const schema = {
  type: 'object',
  properties: {
    label: { type: 'string', title: 'Label', default: 'fallback' },
    mode: { type: 'string', title: 'Mode', default: 'fast' },
    other: { type: 'string', title: 'Other' }
  },
  required: ['mode']
};

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function mountForm(values: Values, commitMode: 'blur' | 'live' = 'blur') {
  const calls: Values[] = [];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const props = $state<Record<string, unknown>>({
    schema,
    values,
    commitMode,
    onChange: (c: Values) => {
      calls.push(c);
      props.values = c;
    }
  });
  app = mount(ConfigForm, { target, props: props as never });
  flushSync();
  const input = (id: string) => target.querySelector<HTMLInputElement>(`#${id}`)!;
  const type = (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
  };
  const blur = (id: string) => {
    input(id).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    flushSync();
  };
  const last = () => calls.at(-1)!;
  return { target, props, input, type, blur, last, calls };
}

describe('defaults in a node config', () => {
  it('writes the required default but leaves an optional key with a default absent', () => {
    const f = mountForm({});
    f.type('other', 'o');
    f.blur('other');
    expect(f.last()).toEqual({ other: 'o', mode: 'fast' });
    expect('label' in f.last()).toBe(false);
    // The optional field still shows its default, which is what applies.
    expect(f.input('label').value).toBe('fallback');
  });

  it('keeps a cleared optional field absent after the next commit', () => {
    const f = mountForm({ label: 'mine' });
    f.type('label', '');
    f.blur('label');
    expect('label' in f.last()).toBe(false);
    f.type('other', 'o');
    f.blur('other');
    expect('label' in f.last()).toBe(false);
    expect(f.input('label').value).toBe('');
    expect(f.input('label').placeholder).toBe('fallback');
  });

  it('keeps a cleared required field absent after the next commit', () => {
    const f = mountForm({ mode: 'slow' });
    f.type('mode', '');
    f.blur('mode');
    f.type('other', 'o');
    f.blur('other');
    expect('mode' in f.last()).toBe(false);
  });

  it('gives a kept clear up when the config holds the key again (undo)', () => {
    const f = mountForm({ label: 'mine' });
    f.type('label', '');
    f.blur('label');
    // Undo, or a change made elsewhere, puts the key back.
    f.props.values = { label: 'mine' };
    flushSync();
    expect(f.input('label').value).toBe('mine');
    f.type('other', 'o');
    f.blur('other');
    expect(f.last().label).toBe('mine');
  });

  it('keeps a stored value equal to the default', () => {
    const f = mountForm({ label: 'fallback' });
    f.type('other', 'o');
    f.blur('other');
    expect(f.last().label).toBe('fallback');
  });

  it('behaves the same in live mode', () => {
    const f = mountForm({ label: 'mine' }, 'live');
    f.type('label', '');
    f.type('other', 'o');
    f.blur('other');
    expect('label' in f.last()).toBe(false);
    expect(f.last().mode).toBe('fast');
  });
});
