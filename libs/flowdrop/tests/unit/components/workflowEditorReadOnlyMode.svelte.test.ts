/**
 * `WorkflowEditor mode="readonly"` mounted on its own (no App) still tells the
 * agent surfaces: `fd.readOnly` is provided while it is mounted and withdrawn
 * when it unmounts, so `createToolRuntime` refuses an agent edit.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';

vi.mock('@iconify/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@iconify/svelte')>();
  actual.disableCache?.('all');
  actual._api?.setFetch?.(async () => new Response('{}', { status: 404 }));
  return actual;
});

const { default: WorkflowEditor } = await import('$lib/components/WorkflowEditor.svelte');
const { createFlowDropInstance } = await import('$lib/stores/instanceContainer.svelte.js');
const { createToolRuntime } = await import('$lib/webmcp/runtime.js');

const textIn = {
  node_type_id: 'text_input',
  name: 'Text Input',
  category: 'inputs',
  inputs: [],
  outputs: [{ id: 'value', name: 'Value', type: 'output', dataType: 'string' }],
  configSchema: { type: 'object', properties: {} }
};

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    flushSync();
    await tick();
    await new Promise((r) => setTimeout(r, 5));
  }
}

function setup(id: string, mode: 'edit' | 'readonly' | 'locked') {
  const fd = createFlowDropInstance({ id });
  fd.workflow.initialize({
    id: 'wf',
    name: 'wf',
    nodes: [],
    edges: [],
    metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
  } as never);
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(WorkflowEditor, { target, props: { instance: fd, mode } as never });
  return fd;
}

const parse = (res: { content: Array<{ text: string }> }) => JSON.parse(res.content[0].text);

describe('WorkflowEditor mode', () => {
  it.each(['readonly', 'locked'] as const)(
    'mode="%s" makes the agent runtime refuse an edit',
    async (mode) => {
      const fd = setup(`ro-editor-${mode}`, mode);
      await settle();
      expect(fd.readOnly).toBe(true);
      const runtime = createToolRuntime({ instance: fd, nodeTypes: [textIn as never] });
      const res = await runtime.runTool('add_node', { nodeTypeId: 'text_input' });
      expect(res.isError).toBe(true);
      expect(parse(res as never).code).toBe('LOCKED');
      expect(fd.workflow.nodes).toHaveLength(0);
      runtime.dispose();
      fd.destroy();
    }
  );

  it('mode="edit" leaves the runtime working, and unmounting withdraws the flag', async () => {
    const fd = setup('ro-editor-edit', 'edit');
    await settle();
    expect(fd.readOnly).toBe(false);
    const runtime = createToolRuntime({
      instance: fd,
      nodeTypes: [textIn as never],
      approval: async () => true
    });
    expect(
      parse((await runtime.runTool('add_node', { nodeTypeId: 'text_input' })) as never).ok
    ).toBe(true);
    runtime.dispose();
    unmount(app!);
    app = null;
    fd.destroy();
  });

  it('withdraws on unmount', async () => {
    const fd = setup('ro-editor-unmount', 'readonly');
    await settle();
    expect(fd.readOnly).toBe(true);
    unmount(app!);
    app = null;
    expect(fd.readOnly).toBe(false);
    fd.destroy();
  });
});
