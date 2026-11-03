/**
 * Palette keyboard add: Enter adds on key down, Space on key up, and a held
 * key adds once.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import NodeSidebar from '$lib/components/NodeSidebar.svelte';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { NodeMetadata } from '$lib/types/index.js';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

let app: ReturnType<typeof mount> | null = null;

afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

const nodeType = {
  node_type_id: 'text_input',
  name: 'Text Input',
  category: 'inputs',
  inputs: [],
  outputs: [],
  configSchema: { type: 'object', properties: {} }
} as unknown as NodeMetadata;

function render() {
  const onadd = vi.fn();
  const fd = {
    categories: {
      getLabel: (c: string) => c,
      getColor: () => 'var(--fd-primary)',
      getIcon: () => 'mdi:cube',
      getOrder: () => [],
      categories: []
    },
    messages: () => ({})
  };
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(NodeSidebar, {
    target,
    props: { nodes: [nodeType], onadd, categoriesDefaultOpen: true },
    context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
  });
  flushSync();
  const item = target.querySelector<HTMLElement>('.flowdrop-node-item');
  return { item, onadd };
}

function key(el: HTMLElement, type: 'keydown' | 'keyup', k: string, repeat = false) {
  const event = new KeyboardEvent(type, { key: k, repeat, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

describe('NodeSidebar keyboard add', () => {
  it('adds on Enter keydown once, ignoring repeats', () => {
    const { item, onadd } = render();
    expect(item).not.toBeNull();
    key(item!, 'keydown', 'Enter');
    key(item!, 'keydown', 'Enter', true);
    key(item!, 'keydown', 'Enter', true);
    key(item!, 'keyup', 'Enter');
    expect(onadd).toHaveBeenCalledTimes(1);
  });

  it('adds on Space keyup, not keydown, and stops the page scrolling', () => {
    const { item, onadd } = render();
    const down = key(item!, 'keydown', ' ');
    expect(down.defaultPrevented).toBe(true);
    expect(onadd).not.toHaveBeenCalled();
    key(item!, 'keydown', ' ', true);
    key(item!, 'keyup', ' ');
    expect(onadd).toHaveBeenCalledTimes(1);
  });
});
