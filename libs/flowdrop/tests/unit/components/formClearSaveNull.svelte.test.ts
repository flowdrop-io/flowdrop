/**
 * Clearing, explicit Save and the null toggle, through the real forms
 * (`ConfigForm` and `SchemaForm`, mounted in happy-dom):
 *
 * - a nullable field (`['string', 'null']`, `['integer', 'null']`) clears like
 *   its plain type: the key leaves the config;
 * - turning the null toggle on and off over a stored `''` leaves the `''`;
 * - Save builds the config from the form's state, not from the DOM: an
 *   autocomplete's search box (which holds search text) never replaces its value;
 * - in blur mode the null toggle commits at once, as a button WebKit does not focus.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ConfigForm from '$lib/components/ConfigForm.svelte';
import SchemaForm from '$lib/components/SchemaForm.svelte';

type Values = Record<string, unknown>;

const schema = {
  type: 'object',
  properties: {
    ncount: { type: ['integer', 'null'], title: 'Count' },
    nnote: { type: ['string', 'null'], title: 'Note' },
    project: {
      type: 'string',
      title: 'Project',
      format: 'autocomplete',
      autocomplete: { url: '/api/options' }
    },
    tags: {
      type: 'array',
      title: 'Tags',
      format: 'autocomplete',
      autocomplete: { url: '/api/options', multiple: true }
    },
    plain: { type: 'string', title: 'Plain' }
  }
} as never;

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

function input(target: HTMLElement, id: string, value: string) {
  const el = target.querySelector<HTMLInputElement>('#' + id)!;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
}

function nullToggle(target: HTMLElement, label: string) {
  const row = Array.from(target.querySelectorAll('.form-field')).find((f) =>
    f.querySelector('.form-field__label-text')?.textContent?.trim().startsWith(label)
  )!;
  return row.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
}

type Kind = 'config' | 'schema';

function mountForm(kind: Kind, values: Values, extra: Record<string, unknown> = {}) {
  const calls: Values[] = [];
  const saves: Values[] = [];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const props = $state<Record<string, unknown>>({
    schema,
    values,
    ...(kind === 'config' ? { commitMode: 'live' } : { showActions: true }),
    onChange: (c: Values) => calls.push(c),
    onSave: (c: Values) => saves.push(c),
    ...extra
  });
  app = mount(kind === 'config' ? ConfigForm : SchemaForm, { target, props: props as never });
  flushSync();
  const save = () => {
    const sel =
      kind === 'config' ? '.config-form__button--primary' : '.schema-form__button--primary';
    target.querySelector<HTMLButtonElement>(sel)!.click();
    flushSync();
  };
  return { target, calls, saves, save, props, last: () => calls.at(-1)! };
}

describe.each<Kind>(['config', 'schema'])('%s form: nullable fields', (kind) => {
  it('clearing a nullable string and a nullable integer removes the key', () => {
    const t = mountForm(kind, { ncount: 3, nnote: 'x' });
    input(t.target, 'nnote', '');
    expect('nnote' in t.last()).toBe(false);
    input(t.target, 'ncount', '');
    expect('ncount' in t.last()).toBe(false);
    expect(t.last().ncount).not.toBe('');
  });

  it('null on then off over a stored "" keeps the ""', () => {
    const t = mountForm(kind, { nnote: '' });
    nullToggle(t.target, 'Note').click();
    flushSync();
    expect(t.last().nnote).toBeNull();
    t.props.values = t.last(); // the host takes the commit, as the editor does
    flushSync();
    nullToggle(t.target, 'Note').click();
    flushSync();
    expect(t.last().nnote).toBe('');
  });

  it('null on then off over a value restores the value', () => {
    const t = mountForm(kind, { ncount: 4 });
    nullToggle(t.target, 'Count').click();
    flushSync();
    t.props.values = t.last(); // the host takes the commit, as the editor does
    flushSync();
    nullToggle(t.target, 'Count').click();
    flushSync();
    expect(t.last().ncount).toBe(4);
  });
});

describe.each<Kind>(['config', 'schema'])('%s form: explicit Save', (kind) => {
  const stubFetch = () =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"data":[]}')));

  // ConfigForm shows its Save footer only when there is no onChange.
  const saveForm = (k: Kind, v: Values) => mountForm(k, v, { onChange: undefined });

  it('keeps a single autocomplete value and a multiple list with no edits', () => {
    stubFetch();
    const t = saveForm(kind, { project: 'ama', tags: ['x', 'y'] });
    t.save();
    expect(t.saves[0].project).toBe('ama');
    expect(t.saves[0].tags).toEqual(['x', 'y']);
  });

  it('keeps the list when text is typed into a multiple autocomplete search box', () => {
    stubFetch();
    const t = saveForm(kind, { project: 'ama', tags: ['x'] });
    input(t.target, 'tags', 'fo');
    t.save();
    expect(t.saves[0].tags).toEqual(['x']);
    expect(t.saves[0].project).toBe('ama');
  });

  it('keeps text typed into a field and saved without a blur', () => {
    stubFetch();
    const t = saveForm(kind, {});
    input(t.target, 'plain', 'typed');
    t.save();
    expect(t.saves[0].plain).toBe('typed');
  });

  it('saves a number typed into a nullable integer as a number', () => {
    stubFetch();
    const t = saveForm(kind, {});
    input(t.target, 'ncount', '12');
    t.save();
    expect(t.saves[0].ncount).toBe(12);
  });
});

describe('config form in blur mode: the null toggle commits at once', () => {
  function mountBlur(values: Values) {
    const calls: Values[] = [];
    const target = document.createElement('div');
    document.body.appendChild(target);
    const props = $state<Record<string, unknown>>({
      schema,
      values,
      commitMode: 'blur',
      onChange: (c: Values) => {
        calls.push(c);
        // The parent feeds the committed config back, as the editor does.
        props.values = c;
      }
    });
    app = mount(ConfigForm, { target, props: props as never });
    flushSync();
    return { target, calls };
  }

  it('commits null on, and the restore off, without a focus-out', () => {
    const t = mountBlur({ nnote: 'x', ncount: 5 });
    nullToggle(t.target, 'Note').click();
    flushSync();
    expect(t.calls).toHaveLength(1);
    expect(t.calls[0].nnote).toBeNull();
    nullToggle(t.target, 'Note').click();
    flushSync();
    expect(t.calls).toHaveLength(2);
    expect(t.calls[1].nnote).toBe('x');
  });

  it('commits turning off a null that was loaded', () => {
    const t = mountBlur({ ncount: null });
    nullToggle(t.target, 'Count').click();
    flushSync();
    expect(t.calls).toHaveLength(1);
    expect('ncount' in t.calls[0]).toBe(false);
  });

  it('still waits for focus-out when typing in a text field', () => {
    const t = mountBlur({});
    input(t.target, 'plain', 'abc');
    expect(t.calls).toHaveLength(0);
  });
});
