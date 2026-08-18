// @vitest-environment node
/**
 * Render smoke tests for `WorkflowInterfaceEditor` — the canonical panel
 * editor for `Workflow.interface` (Phase 3 of
 * `.claude/plans/workflow-interface.md`).
 *
 * `@vitest-environment node` + `svelte/server`'s `render()` mirrors
 * `configFormNodeSettings.test.ts`: without `window`, the component loads
 * through the server branch and `render()` exercises the real
 * markup-producing path rather than mounting into a DOM this suite doesn't
 * otherwise need.
 *
 * The editor is stateless (props in, `onChange` out), so these tests assert
 * on rendered markup only — interaction (add/remove/reorder/binding-pick) is
 * covered at the pure-helper level in `workflowInterface.test.ts`, which the
 * component composes without adding logic of its own.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import WorkflowInterfaceEditor from '$lib/components/WorkflowInterfaceEditor.svelte';
import type { NodePort, Workflow, WorkflowNode } from '$lib/types/index.js';

function makePort(id: string, dataType = 'string', overrides: Partial<NodePort> = {}): NodePort {
  return { id, name: id, type: 'input', dataType, ...overrides };
}

function makeNode(id: string, inputs: NodePort[], outputs: NodePort[]): WorkflowNode {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      metadata: {
        node_type_id: 'test_node',
        name: 'Test Node',
        description: 'A node for testing',
        category: 'processing',
        version: '1.0.0',
        type: 'default',
        inputs,
        outputs
      }
    }
  };
}

function makeWorkflow(nodes: WorkflowNode[], workflowInterface?: Workflow['interface']): Workflow {
  return {
    id: 'wf-1',
    name: 'Test Workflow',
    nodes,
    edges: [],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString()
    },
    interface: workflowInterface
  };
}

describe('WorkflowInterfaceEditor', () => {
  it('renders the empty state with add affordances when there is no interface', () => {
    const workflow = makeWorkflow([makeNode('node-1', [makePort('in-1')], [])]);
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).toContain('No inputs declared yet.');
    expect(body).toContain('No outputs declared yet.');
    expect(body).toContain('Add input');
    expect(body).toContain('Add output');
  });

  it('renders an entry row with its id and a binding picker limited to exposed ports', () => {
    const exposedPort = makePort('in-a', 'string', { type: 'input' });
    const hiddenPort = makePort('in-b', 'string', { type: 'input', exposedByDefault: false });
    const node = makeNode('node-1', [exposedPort, hiddenPort], []);
    const workflow = makeWorkflow([node], {
      inputs: [{ id: 'public-in', dataType: 'string', bindings: [] }]
    });

    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).toContain('public-in');
    // The exposed port is offered as a binding option...
    expect(body).toContain('in-a');
    // ...the not-exposed one is not (decision 3: external ⊂ internal).
    expect(body).not.toContain('in-b');
  });

  it('renders the unbound status in words for a draft entry', () => {
    const workflow = makeWorkflow([], {
      inputs: [{ id: 'draft-in', dataType: 'string', bindings: [] }]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).toContain('no bindings yet');
  });

  it('renders the dangling status in words when a binding points at a missing node', () => {
    const workflow = makeWorkflow([], {
      inputs: [{ id: 'gone', dataType: 'string', bindings: [{ nodeId: 'ghost', portId: 'x' }] }]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).toContain('no longer exists');
  });

  it('renders a read-only meta disclosure without exposing an edit control', () => {
    const workflow = makeWorkflow([], {
      inputs: [
        {
          id: 'with-meta',
          dataType: 'string',
          bindings: [],
          meta: { 'fd.reserved': true, vendor: 'x' }
        }
      ]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).toContain('Server metadata (read-only)');
    expect(body).toContain('fd.reserved');
  });
});
