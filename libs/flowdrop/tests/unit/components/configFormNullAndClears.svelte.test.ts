/**
 * ConfigForm: what the null toggle brings back, which clears yield to the
 * config, and what a different node resets. Mounted for real (client build,
 * happy-dom); the host feeds each committed config back as `values`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ConfigForm from '$lib/components/ConfigForm.svelte';
import type { ConfigSchema } from '$lib/types/index.js';

type Values = Record<string, unknown>;

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function mountForm(
  schema: unknown,
  values: Values,
  opts: { mode?: 'blur' | 'live'; node?: unknown } = {}
) {
  const calls: Values[] = [];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const props = $state<Record<string, unknown>>({
    schema,
    values,
    commitMode: opts.mode ?? 'blur',
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
  const toggle = () => {
    target.querySelector<HTMLButtonElement>('button[aria-pressed]')!.click();
    flushSync();
  };
  return { target, props, input, type, blur, toggle, last: () => calls.at(-1) ?? {} };
}

describe('the null toggle off brings back what was stored', () => {
  const schema = {
    type: 'object',
    properties: { x: { type: ['string', 'null'], default: 'd' } }
  };

  it('an untouched optional key with a default goes back to absent', () => {
    const f = mountForm(schema, {});
    f.toggle();
    expect(f.last().x).toBeNull();
    f.toggle();
    expect('x' in f.last()).toBe(false);
  });

  it('a stored value comes back', () => {
    const f = mountForm(schema, { x: 'mine' });
    f.toggle();
    expect(f.last().x).toBeNull();
    f.toggle();
    expect(f.last().x).toBe('mine');
  });

  it('a stored empty string comes back as an empty string', () => {
    const f = mountForm(schema, { x: '' });
    f.toggle();
    f.toggle();
    expect(f.last().x).toBe('');
  });

  it('an edited, uncommitted value comes back', () => {
    const f = mountForm(schema, { x: 'mine' });
    f.type('x', 'typed');
    f.toggle();
    f.toggle();
    expect(f.last().x).toBe('typed');
  });
});

describe('a clear still waiting for its blur', () => {
  const schema = {
    type: 'object',
    properties: { x: { type: 'string' }, y: { type: 'string' } }
  };

  it('is not refilled by an outside change to another key', () => {
    const f = mountForm(schema, { x: 'keep', y: '1' });
    f.type('x', '');
    f.props.values = { x: 'keep', y: '2' };
    flushSync();
    expect(f.input('x').value).toBe('');
    f.blur('x');
    expect('x' in f.last()).toBe(false);
    expect(f.last().y).toBe('2');
  });

  it('a committed clear still yields when the config holds the key again (undo)', () => {
    const f = mountForm(schema, { x: 'keep', y: '1' });
    f.type('x', '');
    f.blur('x');
    expect('x' in f.last()).toBe(false);
    f.props.values = { x: 'keep', y: '1' };
    flushSync();
    expect(f.input('x').value).toBe('keep');
    f.type('y', '2');
    f.blur('y');
    expect(f.last().x).toBe('keep');
  });

  it('a typed value after a committed clear is not dropped as a stale clear', () => {
    const f = mountForm(schema, { x: 'keep', y: '1' });
    f.type('x', '');
    f.blur('x');
    f.type('x', 'again');
    f.blur('x');
    expect(f.last().x).toBe('again');
    // now a fresh clear, uncommitted, while the config holds x
    f.type('x', '');
    f.props.values = { x: 'again', y: '5' };
    flushSync();
    expect(f.input('x').value).toBe('');
    f.blur('x');
    expect('x' in f.last()).toBe(false);
  });
});

describe('a different node resets the buffer', () => {
  it('a kept clear does not show on another node with the same schema object', () => {
    const schema = {
      type: 'object',
      properties: { x: { type: 'string', default: 'd' }, y: { type: 'string' } }
    } as unknown as ConfigSchema;
    const nodeA = { id: 'a', data: { config: { x: 'A' }, metadata: { configSchema: schema } } };
    const nodeB = { id: 'b', data: { config: { y: 'B' }, metadata: { configSchema: schema } } };
    const target = document.createElement('div');
    document.body.appendChild(target);
    const props = $state<Record<string, unknown>>({
      node: nodeA,
      values: { x: 'A' },
      schema,
      onChange: (c: Values) => {
        props.values = c;
      }
    });
    app = mount(ConfigForm, { target, props: props as never });
    flushSync();
    const x = () => target.querySelector<HTMLInputElement>('#x')!;
    x().value = '';
    x().dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    x().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    flushSync();
    props.node = nodeB;
    props.values = { y: 'B' };
    flushSync();
    expect(x().value).toBe('d');
  });
});
