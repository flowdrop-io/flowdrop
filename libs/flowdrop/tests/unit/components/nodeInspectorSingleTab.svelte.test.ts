/**
 * Regression test for flowdrop-io/flowdrop#34, second report (2.18.0).
 *
 * A node type with ports but no `configSchema` gets only the injected ports
 * field, so the inspector has a single tab: Ports. The inspector used to fall
 * back to a Config tab the form did not have, hiding the Ports panel, and with
 * one tab there is no tab bar to switch, so the panel looked empty.
 *
 * `configFormNodeSettings.test.ts` renders ConfigForm alone and could not see
 * this; `NodeInspectorBody` mounts it inside NodeInspector as the editor does.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import NodeInspectorBody from '$lib/stories/NodeInspectorBody.svelte';
import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { FLOWDROP_INSTANCE_KEY } from '$lib/stores/getInstance.svelte.js';
import type { ConfigSchema, NodePort, WorkflowNode } from '$lib/types/index.js';

const inPort: NodePort = { id: 'data', name: 'Data', type: 'input', dataType: 'mixed' };
const outPort: NodePort = { id: 'out', name: 'Out', type: 'output', dataType: 'mixed' };

function makeNode(configSchema?: ConfigSchema): WorkflowNode {
  return {
    id: 'echo.1',
    type: 'workflowNode',
    position: { x: 0, y: 0 },
    data: {
      label: 'Echo',
      config: {},
      metadata: {
        id: 'echo',
        name: 'Echo',
        node_type_id: 'echo',
        inputs: [inPort],
        outputs: [outPort],
        ...(configSchema ? { configSchema } : {})
      }
    }
  } as unknown as WorkflowNode;
}

let app: ReturnType<typeof mount> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function mountInspector(node: WorkflowNode): HTMLElement {
  const target = document.createElement('div');
  document.body.appendChild(target);
  app = mount(NodeInspectorBody, {
    target,
    props: { node },
    context: new Map([[FLOWDROP_INSTANCE_KEY, createFlowDropInstance()]])
  });
  flushSync();
  return target;
}

function panel(target: HTMLElement, key: string): HTMLElement | null {
  return target.querySelector<HTMLElement>(`.config-form__section[data-section="${key}"]`);
}

describe('NodeInspector with a single form tab (#34)', () => {
  it('shows the Ports panel for a node with ports and no config schema', () => {
    const target = mountInspector(makeNode());

    const ports = panel(target, 'ports');
    expect(ports).not.toBeNull();
    expect(ports!.style.display).not.toBe('none');
    expect(ports!.querySelector('.fd-ports')).not.toBeNull();
    // One tab, so no tab bar.
    expect(target.querySelector('[data-testid="node-inspector-tabs"]')).toBeNull();
  });

  it('still opens on Config when the node has its own fields', () => {
    const schema: ConfigSchema = {
      type: 'object',
      properties: { greeting: { type: 'string', title: 'Greeting' } }
    };
    const target = mountInspector(makeNode(schema));

    expect(panel(target, 'config')!.style.display).not.toBe('none');
    expect(panel(target, 'ports')!.style.display).toBe('none');
    expect(target.querySelector('[data-testid="node-inspector-tabs"]')).not.toBeNull();
  });
});
