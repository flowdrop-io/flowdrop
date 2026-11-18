/**
 * A cleared field removes its config key (#72).
 *
 * An empty value is a value: `""` or `[]` counts as provided for a required
 * field and beats the default. So when a field is emptied (by the autocomplete
 * cascade, or by a person) the key leaves the config. Removal happens at the
 * moment of the clear, carried through the edits buffer; a `""` or `[]` that is
 * already stored is never touched.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ConfigForm from '$lib/components/ConfigForm.svelte';
import SchemaForm from '$lib/components/SchemaForm.svelte';
import { REMOVE_KEY } from '$lib/utils/formMerge.js';
import type { ConfigSchema } from '$lib/types/index.js';

type Config = Record<string, unknown>;

const autocomplete = (extra: Record<string, unknown> = {}) => ({
  format: 'autocomplete',
  autocomplete: { url: '/api/options', ...extra }
});

const schema: ConfigSchema = {
  type: 'object',
  required: ['project'],
  properties: {
    account: { type: 'string', title: 'Account' },
    note: { type: 'string', title: 'Note' },
    body: { type: 'string', format: 'multiline', title: 'Body' },
    count: { type: 'number', title: 'Count' },
    mode: { type: 'string', title: 'Mode', enum: ['fast', 'slow'] },
    level: { type: 'string', title: 'Level', enum: ['', 'low', 'high'] },
    flag: { type: 'boolean', title: 'Flag' },
    payload: { type: 'string', title: 'Payload' },
    project: {
      type: 'string',
      title: 'Project',
      ...autocomplete({ params: { account: 'account' } })
    },
    assignees: {
      type: 'array',
      title: 'Assignees',
      ...autocomplete({ params: { account: 'account' }, multiple: true })
    },
    label: { type: 'string', title: 'Label', default: 'fallback' }
  }
} as unknown as ConfigSchema;

let app: ReturnType<typeof mount> | null = null;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"data":[]}')));
});
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

function mountConfigForm(values: Config, extra: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(ConfigForm, {
    target,
    props: { schema, values, onChange, commitMode: 'live', ...extra }
  });
  flushSync();
  const last = (): Config => onChange.mock.calls.at(-1)![0] as Config;
  return { target, onChange, last };
}

function type(target: HTMLElement, id: string, value: string, event = 'input'): void {
  const el = target.querySelector<HTMLInputElement>(`#${id}`)!;
  el.value = value;
  el.dispatchEvent(new Event(event, { bubbles: true }));
  flushSync();
}

const stored: Config = {
  account: 'acme',
  note: 'n',
  body: 'b',
  count: 3,
  mode: 'fast',
  level: 'low',
  flag: true,
  payload: '{"a":1}',
  project: 'ama',
  assignees: ['x', 'y']
};

describe('autocomplete cascade removes the dependent key', () => {
  it('removes a single and a multiple dependent when the parent changes', () => {
    const { target, last } = mountConfigForm(stored);
    type(target, 'account', 'globex');
    const config = last();
    expect(config.account).toBe('globex');
    expect('project' in config).toBe(false);
    expect('assignees' in config).toBe(false);
    // untouched keys stay
    expect(config.note).toBe('n');
  });

  it('shows the cleared dependent as empty again', () => {
    const { target } = mountConfigForm(stored);
    type(target, 'account', 'globex');
    expect(target.querySelector('.form-autocomplete__clear')).toBeNull();
  });
});

describe('a person clearing a field by hand removes its key', () => {
  it('text', () => {
    const { target, last } = mountConfigForm(stored);
    type(target, 'note', '');
    expect('note' in last()).toBe(false);
    expect(last().body).toBe('b');
  });

  it('textarea', () => {
    const { target, last } = mountConfigForm(stored);
    type(target, 'body', '');
    expect('body' in last()).toBe(false);
  });

  it('number', () => {
    const { target, last } = mountConfigForm(stored);
    type(target, 'count', '');
    expect('count' in last()).toBe(false);
  });

  it('select, when an empty value comes out of one with no empty option', () => {
    const { target, last } = mountConfigForm(stored);
    type(target, 'mode', '', 'change');
    expect('mode' in last()).toBe(false);
  });

  it('select keeps an empty option the author listed, as a value', () => {
    const { target, last } = mountConfigForm(stored);
    type(target, 'level', '', 'change');
    expect(last().level).toBe('');
  });

  it('select keeps a real choice', () => {
    const { target, last } = mountConfigForm(stored);
    type(target, 'mode', 'slow', 'change');
    expect(last().mode).toBe('slow');
  });

  it('single autocomplete (clear button)', () => {
    const { target, last } = mountConfigForm(stored);
    target.querySelectorAll<HTMLButtonElement>('.form-autocomplete__clear')[0].click();
    flushSync();
    expect('project' in last()).toBe(false);
  });

  it('multiple autocomplete with no items left', () => {
    const { target, last } = mountConfigForm({ ...stored, assignees: ['x'] });
    const clear = target.querySelectorAll<HTMLButtonElement>('.form-autocomplete__clear');
    clear[clear.length - 1].click();
    flushSync();
    expect('assignees' in last()).toBe(false);
  });

  it('typing a value after a clear writes it again', () => {
    const { target, last } = mountConfigForm(stored);
    type(target, 'note', '');
    type(target, 'note', 'again');
    expect(last().note).toBe('again');
  });

  it('removes the key in blur mode, on focus-out', () => {
    const { target, onChange } = mountConfigForm(stored, { commitMode: 'blur' });
    type(target, 'note', '');
    target.querySelector('#note')!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    flushSync();
    const config = onChange.mock.calls.at(-1)![0] as Config;
    expect('note' in config).toBe(false);
    expect(config.body).toBe('b');
  });
});

describe('values that are real values are untouched', () => {
  it('a checkbox set to false stays false', () => {
    const { target, last } = mountConfigForm(stored);
    const toggle = target.querySelector<HTMLInputElement>('#flag')!;
    toggle.click();
    flushSync();
    expect(last().flag).toBe(false);
  });

  it('a null stays null (it is not a clear)', () => {
    const { target, last } = mountConfigForm({ ...stored, note: null });
    type(target, 'count', '7');
    expect(last().note).toBeNull();
  });
});

describe('a stored empty value survives opening and saving (spec: no dropping empties)', () => {
  const empties: Config = { account: 'acme', note: '', count: 3, project: '', assignees: [] };

  it('onChange for an unrelated edit keeps "" and []', () => {
    const { target, last } = mountConfigForm(empties);
    type(target, 'count', '4');
    const config = last();
    expect(config.note).toBe('');
    expect(config.project).toBe('');
    expect(config.assignees).toEqual([]);
  });

  it('explicit save without edits keeps "" and []', () => {
    const onSave = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(ConfigForm, { target, props: { schema, values: empties, onSave } });
    flushSync();
    target.querySelector<HTMLButtonElement>('.config-form__button--primary')!.click();
    flushSync();
    const config = onSave.mock.calls[0][0] as Config;
    expect(config.note).toBe('');
    expect(config.project).toBe('');
    expect(config.assignees).toEqual([]);
  });

  it('explicit save keeps a stored list in a multiple autocomplete', () => {
    const onSave = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(ConfigForm, { target, props: { schema, values: stored, onSave } });
    flushSync();
    target.querySelector<HTMLButtonElement>('.config-form__button--primary')!.click();
    flushSync();
    expect((onSave.mock.calls[0][0] as Config).assignees).toEqual(['x', 'y']);
  });

  it('explicit save leaves never-filled keys absent and removes cleared ones', () => {
    const onSave = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(ConfigForm, { target, props: { schema, values: stored, onSave } });
    flushSync();
    type(target, 'note', '');
    target.querySelector<HTMLButtonElement>('.config-form__button--primary')!.click();
    flushSync();
    const config = onSave.mock.calls[0][0] as Config;
    expect('note' in config).toBe(false);
    expect(config.body).toBe('b');
  });

  it('explicit save does not add "" for a field that was never filled', () => {
    const onSave = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(ConfigForm, { target, props: { schema, values: { account: 'a' }, onSave } });
    flushSync();
    target.querySelector<HTMLButtonElement>('.config-form__button--primary')!.click();
    flushSync();
    const config = onSave.mock.calls[0][0] as Config;
    expect('note' in config).toBe(false);
    expect('count' in config).toBe(false);
  });
});

describe('the host never sees the removal marker', () => {
  it('no value in any onChange config is the sentinel', () => {
    const { target, onChange } = mountConfigForm(stored);
    type(target, 'note', '');
    type(target, 'account', 'globex');
    for (const [config] of onChange.mock.calls) {
      for (const value of Object.values(config as Config)) expect(value).not.toBe(REMOVE_KEY);
    }
    expect(onChange).toHaveBeenCalled();
  });

  it('SchemaForm: onChange gets no sentinel and no cleared key', () => {
    const onChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(SchemaForm, { target, props: { schema, values: stored, onChange } });
    flushSync();
    type(target, 'note', '');
    type(target, 'account', 'globex');
    const config = onChange.mock.calls.at(-1)![0] as Config;
    expect('note' in config).toBe(false);
    expect('project' in config).toBe(false);
    expect('assignees' in config).toBe(false);
    for (const value of Object.values(config)) expect(value).not.toBe(REMOVE_KEY);
  });

  it('SchemaForm: save drops cleared keys, keeps stored empties', () => {
    const onSave = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(SchemaForm, {
      target,
      props: { schema, values: { ...stored, body: '' }, onSave }
    });
    flushSync();
    type(target, 'note', '');
    target.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    flushSync();
    const config = onSave.mock.calls[0][0] as Config;
    expect('note' in config).toBe(false);
    expect(config.body).toBe('');
  });
});

describe('a cleared field with a schema default', () => {
  it('stays empty, shows the default as placeholder and leaves the key absent', () => {
    const { target, last } = mountConfigForm({ ...stored, label: 'mine' });
    type(target, 'label', '');
    expect('label' in last()).toBe(false);
    const input = target.querySelector<HTMLInputElement>('#label')!;
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('fallback');
  });

  it('lets a new value be typed after the clear', () => {
    const { target, last } = mountConfigForm({ ...stored, label: 'mine' });
    type(target, 'label', '');
    type(target, 'label', 'n');
    expect(last().label).toBe('n');
    expect(target.querySelector<HTMLInputElement>('#label')!.value).toBe('n');
  });
});
