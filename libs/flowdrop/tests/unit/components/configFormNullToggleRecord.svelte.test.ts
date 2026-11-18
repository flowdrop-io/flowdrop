/**
 * The null toggle's "off" in ConfigForm brings back what the key held right
 * before "on", from the form's own record:
 * - a record left over from before an undo never wins over a newer value;
 * - a value the field remembers from another node never reaches this node;
 * - a key that held nothing is removed, except a required key, which gets its
 *   default as an untouched one would (R6.b).
 * Every test feeds the committed config back into the form, as the editor does.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ConfigForm from '$lib/components/ConfigForm.svelte';

type Values = Record<string, unknown>;

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

const schema = { type: 'object', properties: { x: { type: ['string', 'null'], default: 'd' } } };

function mountForm(extra: Record<string, unknown>, commitMode: 'blur' | 'live' = 'blur') {
  const calls: Values[] = [];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const props = $state<Record<string, unknown>>({
    ...extra,
    commitMode,
    onChange: (c: Values) => {
      calls.push(c);
      props.values = c;
    }
  });
  app = mount(ConfigForm, { target, props: props as never });
  flushSync();
  const input = (id: string) => target.querySelector<HTMLInputElement>(`#${id}`)!;
  const type = (id: string, v: string) => {
    input(id).value = v;
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
  return { props, input, type, blur, toggle, last: () => calls.at(-1) ?? {} };
}

describe('null toggle "off" in ConfigForm', () => {
  it('restores the value from right before "on", not one from before an undo', () => {
    const f = mountForm({ schema, values: { x: 'A' } });
    f.toggle();
    expect(f.last().x).toBeNull();
    f.props.values = { x: 'A' }; // undo
    flushSync();
    f.type('x', 'B');
    f.blur('x');
    f.toggle();
    f.toggle();
    expect(f.last().x).toBe('B');
  });

  it('never writes a value from another node', () => {
    const nodeA = { id: 'a', data: { config: { x: 'A' }, metadata: { configSchema: schema } } };
    const nodeB = { id: 'b', data: { config: { x: null }, metadata: { configSchema: schema } } };
    const f = mountForm({ node: nodeA, schema, values: { x: 'A' } });
    f.toggle();
    expect(f.last().x).toBeNull();
    f.props.node = nodeB;
    f.props.values = { x: null };
    flushSync();
    f.toggle();
    expect('x' in f.last()).toBe(false);
  });

  it('gives a required key that held nothing its default', () => {
    const required = { ...schema, required: ['x'] };
    const f = mountForm({ schema: required, values: {} });
    f.toggle();
    f.toggle();
    expect(f.last().x).toBe('d');
  });

  it('removes an optional key that held nothing', () => {
    const f = mountForm({ schema, values: {} });
    f.toggle();
    f.toggle();
    expect('x' in f.last()).toBe(false);
  });
});
