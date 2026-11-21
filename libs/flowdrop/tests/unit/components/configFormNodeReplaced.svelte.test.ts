/**
 * In live mode the editor replaces the node object on every committed edit. A
 * node with ports gets a re-derived schema each time, and that must not reset
 * the form's in-flight edits or its null memory: only a different node, or a
 * different config schema of the node type, does.
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

function makeNode(configSchema: unknown, config: Values) {
  return {
    id: 'n1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: 'N',
      config,
      metadata: {
        id: 't',
        name: 'T',
        type: 'default',
        inputs: [{ id: 'in', name: 'in', type: 'input', dataType: 'string' }],
        outputs: [],
        configSchema
      }
    }
  };
}

/** Mounts in live mode with a node, replacing the node object on every commit as App does. */
function mountLive(configSchema: unknown, config: Values) {
  const calls: Values[] = [];
  const target = document.createElement('div');
  document.body.appendChild(target);
  // A raw holder: a $state proxy would wrap the shared schema once per node object
  // and make the schema's identity differ where the editor's does not.
  let node = $state.raw(makeNode(configSchema, config));
  const props = {
    get node() {
      return node;
    },
    commitMode: 'live',
    onChange: (c: Values) => {
      calls.push(c);
      node = makeNode(configSchema, c);
    }
  };
  app = mount(ConfigForm, { target, props: props as never });
  flushSync();
  const input = (id: string) => target.querySelector<HTMLInputElement>(`#${id}`)!;
  return {
    input,
    last: () => calls.at(-1) ?? {},
    type(id: string, v: string) {
      input(id).value = v;
      input(id).dispatchEvent(new Event('input', { bubbles: true }));
      flushSync();
    },
    toggle() {
      target.querySelector<HTMLButtonElement>('button[aria-pressed]')!.click();
      flushSync();
    }
  };
}

describe('ConfigForm with a node object replaced on every commit', () => {
  it('brings the value back when null is turned off again', () => {
    const f = mountLive(
      { type: 'object', properties: { limit: { type: ['integer', 'null'] } } },
      { limit: 5 }
    );
    f.toggle();
    expect(f.last().limit).toBeNull();
    f.toggle();
    expect(f.last().limit).toBe(5);
  });

  it('does not jump to the default while a required field is cleared mid-typing', () => {
    const f = mountLive(
      {
        type: 'object',
        required: ['r'],
        properties: { r: { type: 'string', default: 'd' } }
      },
      { r: 'x' }
    );
    f.type('r', '');
    expect(f.input('r').value).toBe('');
    f.type('r', 'y');
    expect(f.input('r').value).toBe('y');
  });
});
