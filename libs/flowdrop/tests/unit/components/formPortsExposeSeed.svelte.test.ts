/**
 * Exposing a port from the node form offers the id the canvas offers: the port
 * id folded to the id alphabet, suffixed while it is taken on that side.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FormPorts from '$lib/components/form/FormPorts.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';

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

const metadata = {
  id: 't',
  name: 'T',
  type: 'default',
  inputs: [{ id: 'userQuery', name: 'User query', type: 'input', dataType: 'string' }],
  outputs: []
};
const node = {
  id: 'n1',
  type: 'default',
  position: { x: 0, y: 0 },
  data: { label: 'N', config: {}, metadata }
};

function open(taken: string[]) {
  const fd = createFlowDropInstance({ id: `expose-seed-${taken.length}` });
  fd.workflow.initialize({
    id: 'w',
    name: 'W',
    nodes: [node],
    edges: [],
    interface: { inputs: taken.map((id) => ({ id, dataType: 'string', bindings: [] })) }
  } as never);
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(FormPorts, {
    target,
    props: { id: 'ports', value: {}, onChange: () => {}, node } as never,
    context: new Map([[FLOWDROP_INSTANCE_KEY, fd]])
  });
  flushSync();
  target
    .querySelector<HTMLButtonElement>('[data-testid="port-interface-menu-inputs-userQuery"]')!
    .click();
  flushSync();
  document.querySelector<HTMLElement>('[data-testid="port-interface-expose"]')!.click();
  flushSync();
  return { target, fd };
}

describe('FormPorts expose', () => {
  it('offers the folded port id', () => {
    const { target, fd } = open([]);
    expect(target.querySelector<HTMLInputElement>('input[type="text"]')!.value).toBe('user_query');
    fd.destroy();
  });

  it('offers a suffixed id while the folded one is taken', () => {
    const { target, fd } = open(['user_query']);
    expect(target.querySelector<HTMLInputElement>('input[type="text"]')!.value).toBe(
      'user_query_2'
    );
    fd.destroy();
  });
});
