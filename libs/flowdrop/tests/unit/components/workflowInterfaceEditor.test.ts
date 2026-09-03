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
import BindablePortListbox from '$lib/components/BindablePortListbox.svelte';
import { rankBindablePorts } from '$lib/utils/workflowInterface.js';
import { PortCompatibilityChecker } from '$lib/utils/connections.js';
import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
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

const checker = new PortCompatibilityChecker(DEFAULT_PORT_CONFIG);

describe('WorkflowInterfaceEditor', () => {
  it('renders an empty side as just its insertion slot — the add action, no placeholder text', () => {
    const workflow = makeWorkflow([makeNode('node-1', [makePort('in-1')], [])]);
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).not.toContain('declared yet');
    expect(body).toContain('Add input');
    expect(body).toContain('Add output');
  });

  it('keeps the insertion slot after the entries, where the next one will land', () => {
    const port = makePort('in-a', 'string', { type: 'input' });
    const workflow = makeWorkflow([makeNode('node-1', [port], [])], {
      inputs: [{ id: 'first-in', dataType: 'string', bindings: [] }]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body.indexOf('Add input')).toBeGreaterThan(body.indexOf('first-in'));
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
    // The "Bound port" control is a closed picker on an unbound entry; the
    // candidates it will unfold are the listbox's, checked below.
    expect(body).toContain('Not bound');

    const list = render(BindablePortListbox, {
      props: {
        direction: 'inputs',
        candidates: rankBindablePorts(workflow, 'input'),
        checker,
        idPrefix: 'test',
        onConfirm: () => {}
      }
    }).body;
    // The exposed port is offered as a binding option...
    expect(list).toContain('in-a');
    // ...the not-exposed one is not (decision 3: external ⊂ internal).
    expect(list).not.toContain('in-b');
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

  it('renders each fact once — the unbound status is not echoed by the issue list', () => {
    const workflow = makeWorkflow([], {
      inputs: [{ id: 'draft-in', dataType: 'string', bindings: [] }]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    // The status dot repeats the prose in its title tooltip; count visible text only.
    const visible = body.replace(/title="[^"]*"/g, '');
    expect(visible.split('has no bindings yet').length - 1).toBe(1);
  });

  it('renders a type mismatch inline under the Data type field with a quick fix, not as footer prose', () => {
    const port = makePort('in-a', 'number', { type: 'input' });
    const node = makeNode('node-1', [port], []);
    const workflow = makeWorkflow([node], {
      inputs: [
        { id: 'typed-in', dataType: 'string', bindings: [{ nodeId: 'node-1', portId: 'in-a' }] }
      ]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).toContain("Doesn't match the bound port's type (number).");
    expect(body).toContain('Use port type');
    // The long-form sentence must not also render in the card footer (the dot's
    // title tooltip is the one allowed carrier of it).
    const visible = body.replace(/title="[^"]*"/g, '');
    expect(visible).not.toContain('declares a data type that does not match');
  });

  it('names the competing source inline when a bound input port already has an incoming edge', () => {
    const inPort = makePort('in-a', 'string', { type: 'input' });
    const outPort = makePort('out-a', 'string', { type: 'output' });
    const target = makeNode('node-1', [inPort], []);
    const feeder = makeNode('feeder-1', [], [outPort]);
    const base = makeWorkflow([target, feeder], {
      inputs: [
        { id: 'busy-in', dataType: 'string', bindings: [{ nodeId: 'node-1', portId: 'in-a' }] }
      ]
    });
    const workflow: Workflow = {
      ...base,
      edges: [
        {
          id: 'e1',
          source: 'feeder-1',
          target: 'node-1',
          sourceHandle: 'feeder-1-output-out-a',
          targetHandle: 'node-1-input-in-a'
        }
      ]
    };
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).toContain('This port already receives a value from "feeder-1".');
    expect(body).not.toContain('two sources for one value');
  });

  it('renders example values on input entries with add/remove affordances', () => {
    const workflow = makeWorkflow([], {
      inputs: [
        {
          id: 'with-examples',
          dataType: 'string',
          bindings: [],
          examples: ['hello', 42]
        }
      ],
      outputs: [{ id: 'out-plain', dataType: 'string', bindings: [] }]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).toContain('Examples');
    expect(body).toContain('value="hello"');
    expect(body).toContain('value="42"');
    expect(body).toContain('Add example');
    // Outputs carry no examples editor — exactly one "Add example" affordance.
    expect(body.split('Add example').length - 1).toBe(1);
  });

  it('keeps identity + binding primary and tucks the rest behind a More options disclosure', () => {
    const port = makePort('in-a', 'string', { type: 'input' });
    const node = makeNode('node-1', [port], []);
    const workflow = makeWorkflow([node], {
      inputs: [
        { id: 'bound-in', dataType: 'string', bindings: [{ nodeId: 'node-1', portId: 'in-a' }] }
      ]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).toContain('More options');
    // The secondary fields live inside the disclosure, after its summary.
    const summaryAt = body.indexOf('More options');
    expect(body.indexOf('Data type')).toBeGreaterThan(summaryAt);
    expect(body.indexOf('Description')).toBeGreaterThan(summaryAt);
    // A resolved binding offers the pull-from-port affordance, inside the disclosure.
    expect(body.indexOf('Pull from port')).toBeGreaterThan(summaryAt);
    // The bound port is said back in the control: node › port.
    expect(body).toContain('in-a');
  });

  it('offers no pull button for an unbound entry', () => {
    const workflow = makeWorkflow([], {
      inputs: [{ id: 'draft-in', dataType: 'string', bindings: [] }]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).not.toContain('Pull from port');
  });

  it('opens the disclosure automatically on a type mismatch so the inline fix is visible', () => {
    const port = makePort('in-a', 'number', { type: 'input' });
    const node = makeNode('node-1', [port], []);
    const workflow = makeWorkflow([node], {
      inputs: [
        { id: 'typed-in', dataType: 'string', bindings: [{ nodeId: 'node-1', portId: 'in-a' }] }
      ]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    expect(body).toMatch(/<details[^>]*class="wf-interface__more[^"]*"[^>]*open/);
  });

  it('offers the configured data-type vocabulary as select options', () => {
    const workflow = makeWorkflow([], {
      inputs: [{ id: 'typed-in', dataType: 'string', bindings: [] }]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: {
        workflow,
        onChange: () => {},
        dataTypes: [
          { id: 'string', name: 'String' },
          { id: 'number', name: 'Number' }
        ]
      }
    }).body;

    // The current value renders with selected="", so match tolerantly.
    expect(body).toMatch(/<option value="string"[^>]*>String<\/option>/);
    expect(body).toMatch(/<option value="number"[^>]*>Number<\/option>/);
  });

  it('keeps a stored dataType outside the vocabulary as an extra option instead of dropping it', () => {
    const workflow = makeWorkflow([], {
      inputs: [{ id: 'custom-in', dataType: 'drupal_entity', bindings: [] }]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: {
        workflow,
        onChange: () => {},
        dataTypes: [{ id: 'string', name: 'String' }]
      }
    }).body;

    expect(body).toMatch(/<option value="drupal_entity"[^>]*>drupal_entity<\/option>/);
  });

  it('falls back to the default port-config vocabulary when no dataTypes prop is given', () => {
    const workflow = makeWorkflow([], {
      inputs: [{ id: 'plain-in', dataType: '', bindings: [] }]
    });
    const body = render(WorkflowInterfaceEditor, {
      props: { workflow, onChange: () => {} }
    }).body;

    // A built-in from DEFAULT_PORT_CONFIG plus the empty-value placeholder.
    expect(body).toContain('<option value="string">String</option>');
    expect(body).toContain('Select a data type…');
  });
});
