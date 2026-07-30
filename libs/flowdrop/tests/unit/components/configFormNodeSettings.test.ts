// @vitest-environment node
/**
 * Regression test for "editor shows no config when a node has no config"
 * (https://github.com/flowdrop-io/flowdrop/issues/34).
 *
 * <ConfigForm> renders its whole form inside one `{:else if configSchema}`
 * branch, so a node type contributing no `configSchema` fell through to the
 * "No configuration options available for this node." empty state — taking the
 * node-level settings the editor owns (port order + exposure, historically the
 * "Display Settings" panel) down with it. Nothing in the panel was editable.
 *
 * The fix injects the reserved `ports` field into the effective schema
 * (utils/nodeFormSchema.ts), so such a node has a schema of exactly its
 * node-level settings and the panel renders them.
 *
 * Why the `node` environment: same reason as `schemaFormSsr.test.ts` — without
 * `window`, components load through the server branch and `render()` exercises
 * the real markup-producing path.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import ConfigForm from '$lib/components/ConfigForm.svelte';
import { PORTS_CONFIG_KEY, withPortsControl, withPortsField } from '$lib/utils/nodeFormSchema.js';
import { mergeWithDefaults } from '$lib/utils/formMerge.js';
import type { ConfigSchema, NodePort, WorkflowNode } from '$lib/types/index.js';
import type { UISchemaElement } from '$lib/types/uischema.js';

const inPort: NodePort = { id: 'in', name: 'In', type: 'input', dataType: 'string' };
const outPort: NodePort = { id: 'out', name: 'Out', type: 'output', dataType: 'string' };

const greetingSchema: ConfigSchema = {
  type: 'object',
  properties: { greeting: { type: 'string', title: 'Greeting', default: 'hi' } }
};

/** A node as the editor holds it: metadata from the type, config from the instance. */
function makeNode(options: {
  configSchema?: ConfigSchema;
  uiSchema?: UISchemaElement;
  ports?: boolean;
  config?: Record<string, unknown>;
}): WorkflowNode {
  return {
    id: 'n1',
    type: 'workflowNode',
    position: { x: 0, y: 0 },
    data: {
      label: 'Test node',
      ...(options.config ? { config: options.config } : {}),
      metadata: {
        node_type_id: 'test',
        inputs: options.ports === false ? [] : [inPort],
        outputs: options.ports === false ? [] : [outPort],
        ...(options.configSchema ? { configSchema: options.configSchema } : {}),
        ...(options.uiSchema ? { uiSchema: options.uiSchema } : {})
      }
    }
  } as unknown as WorkflowNode;
}

describe('ConfigForm — node-level settings for a node with no config (issue #34)', () => {
  it('renders the port settings for a node whose type declares no configSchema', () => {
    const body = render(ConfigForm, { props: { node: makeNode({}) } }).body;

    // The form rendered at all — this is the branch that used to be skipped.
    expect(body).toContain('config-form__fields');
    expect(body).not.toContain('No configuration options available');
    // ...and it rendered the ports widget, with the node's ports in it.
    expect(body).toContain('fd-ports');
    expect(body).toContain('>In<');
    expect(body).toContain('>Out<');
  });

  it('renders both the type fields and the port settings for config: {}', () => {
    const node = makeNode({ configSchema: greetingSchema, config: {} });
    const body = render(ConfigForm, { props: { node } }).body;

    // The type's own field falls back to its schema default...
    expect(body).toContain('id="greeting"');
    expect(body).toContain('value="hi"');
    // ...and the node-level settings render alongside it.
    expect(body).toContain('fd-ports');
  });

  it('renders the port settings through an authored uiSchema, which lists only its own controls', () => {
    const node = makeNode({
      configSchema: greetingSchema,
      config: {},
      uiSchema: {
        type: 'VerticalLayout',
        elements: [{ type: 'Control', scope: '#/properties/greeting' }]
      }
    });
    const body = render(ConfigForm, { props: { node } }).body;

    expect(body).toContain('id="greeting"');
    expect(body).toContain('fd-ports');
  });

  it('still shows the empty state for a node with neither a schema nor ports', () => {
    const body = render(ConfigForm, { props: { node: makeNode({ ports: false }) } }).body;

    expect(body).toContain('No configuration options available');
    expect(body).not.toContain('fd-ports');
  });

  it('does not inject into the standalone schema/values mode (no node)', () => {
    const body = render(ConfigForm, { props: { schema: greetingSchema, values: {} } }).body;

    expect(body).toContain('id="greeting"');
    expect(body).not.toContain('fd-ports');
  });

  it('opening the panel emits nothing — the injected field is display-only', () => {
    let changes = 0;
    const node = makeNode({});
    // `render()` is lazy — read `.body` to force the component to run.
    expect(render(ConfigForm, { props: { node, onChange: () => changes++ } }).body).toContain(
      'fd-ports'
    );

    expect(changes).toBe(0);
    // The stored config is likewise untouched: no `ports` key materialised.
    expect(node.data.config).toBeUndefined();
  });
});

describe('withPortsField / withPortsControl', () => {
  it('appends the ports field last, leaving the authored schema untouched', () => {
    const result = withPortsField(greetingSchema, makeNode({ configSchema: greetingSchema }));

    expect(Object.keys(result?.properties ?? {})).toEqual(['greeting', PORTS_CONFIG_KEY]);
    expect(result?.properties[PORTS_CONFIG_KEY].format).toBe('ports');
    // Input not mutated — ConfigForm compares schema identity to decide when to
    // drop its in-flight edits buffer.
    expect(Object.keys(greetingSchema.properties)).toEqual(['greeting']);
  });

  it('carries no default, so merely rendering the field cannot create a value', () => {
    const schema = withPortsField(greetingSchema, makeNode({ configSchema: greetingSchema }));

    expect(schema?.properties[PORTS_CONFIG_KEY].default).toBeUndefined();
    expect(mergeWithDefaults(schema, {}, {})[PORTS_CONFIG_KEY]).toBeUndefined();
  });

  it('leaves a schema that already declares `ports` alone (the backend stays authoritative)', () => {
    const authored: ConfigSchema = {
      type: 'object',
      properties: { ports: { type: 'object', format: 'ports', title: 'Authored ports' } }
    };
    const node = makeNode({ configSchema: authored });

    expect(withPortsField(authored, node)).toBe(authored);
    expect(withPortsControl(undefined, false)).toBeUndefined();
  });

  it('injects for a node whose ports are all dynamic (declared via config fields)', () => {
    const schema: ConfigSchema = {
      type: 'object',
      properties: { dynamicInputs: { type: 'array' } }
    };
    const node = makeNode({ configSchema: schema, ports: false });

    expect(withPortsField(schema, node)?.properties[PORTS_CONFIG_KEY]).toBeDefined();
  });

  it('wraps an authored uiSchema rather than editing it, adding a collapsed ports group', () => {
    const authored: UISchemaElement = {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/greeting' }]
    };
    const result = withPortsControl(authored, true);

    expect(result).toEqual({
      type: 'VerticalLayout',
      elements: [
        authored,
        {
          type: 'Group',
          label: 'Ports',
          collapsible: true,
          defaultOpen: false,
          elements: [{ type: 'Control', scope: '#/properties/ports' }]
        }
      ]
    });
  });
});
