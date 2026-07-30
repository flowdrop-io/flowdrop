/**
 * Node-level form contributions — the config fields the *editor* owns for every
 * node, independent of what the node type's own `configSchema` declares.
 *
 * Today that is the port order + exposure widget bound to the reserved
 * `config.ports` key (see {@link PORTS_CONFIG_KEY}). It is a library feature —
 * `PortsConfig` is read by the canvas, not by the engine — so the library
 * injects it rather than expecting every backend to serve it.
 *
 * Why this matters beyond convenience: `ConfigForm` renders its whole form only
 * when it has a schema, so a node type contributing no `configSchema` used to
 * fall straight through to "No configuration options available" and lose the
 * node-level settings with it (#34). Injecting here gives such a node a schema,
 * and the panel something to render.
 *
 * Kept as pure functions so they can be unit-tested directly against the same
 * code `ConfigForm` runs, rather than through the component.
 */
import type { ConfigSchema, WorkflowNode } from '../types/index.js';
import type { UISchemaElement } from '../types/uischema.js';

/**
 * Reserved config key holding the instance's `PortsConfig` (per-direction
 * ordered port list with optional exposure overrides).
 */
export const PORTS_CONFIG_KEY = 'ports';

/** Config properties whose presence means the node can grow ports at runtime. */
const DYNAMIC_PORT_KEYS = ['dynamicInputs', 'dynamicOutputs'] as const;

/**
 * Whether the node has anything for the ports widget to show: a static
 * metadata port, or a config field through which the author adds dynamic ones.
 *
 * Deliberately reads only `metadata` and the schema — never `data.config`.
 * `ConfigForm` drops its in-flight `edits` buffer whenever the effective schema
 * changes identity, so a decision that moved with config values would discard a
 * user's half-typed edit the moment it flipped.
 */
function hasConfigurablePorts(node: WorkflowNode, schema: ConfigSchema | undefined): boolean {
  const meta = node.data.metadata;
  if ((meta?.inputs?.length ?? 0) > 0 || (meta?.outputs?.length ?? 0) > 0) return true;
  const properties = schema?.properties;
  if (!properties) return false;
  return DYNAMIC_PORT_KEYS.some((key) => key in properties);
}

/**
 * Append the reserved `ports` property to a node's effective config schema.
 *
 * A no-op when there is no node (the standalone `schema`/`values` mode), when
 * the schema already declares `ports` (a backend that serves the field itself
 * stays authoritative), or when the node has no ports to configure — in which
 * case a schema-less node keeps falling through to the empty state, as it
 * should.
 *
 * @returns The schema to render — `base` untouched, or a copy with the field
 *   appended (last, so it renders below the node type's own fields).
 */
export function withPortsField(
  base: ConfigSchema | undefined,
  node: WorkflowNode | undefined
): ConfigSchema | undefined {
  if (!node) return base;
  if (base?.properties && PORTS_CONFIG_KEY in base.properties) return base;
  if (!hasConfigurablePorts(node, base)) return base;

  return {
    ...(base ?? { type: 'object', properties: {} }),
    properties: {
      ...(base?.properties ?? {}),
      [PORTS_CONFIG_KEY]: {
        type: 'object',
        // The signal FormField/FormFieldLight match to render <FormPorts>.
        format: 'ports',
        title: 'Ports',
        description: 'Order the node’s ports and choose which ones are exposed.'
      }
    }
  };
}

/**
 * Mirror {@link withPortsField} in the UI schema.
 *
 * The UISchema renderer draws only the controls the tree lists, so an injected
 * property is invisible unless a control is added for it. Wraps the authored
 * tree and the new control in a `VerticalLayout`, keeping the author's layout
 * intact and putting the ports control in its own collapsible group below it.
 *
 * @param uiSchema - The authored UI schema, if any. When absent, nothing to do:
 *   `ConfigForm` renders the schema's properties flat and picks the field up.
 * @param injected - Whether {@link withPortsField} actually added the property.
 */
export function withPortsControl(
  uiSchema: UISchemaElement | undefined,
  injected: boolean
): UISchemaElement | undefined {
  if (!uiSchema || !injected) return uiSchema;

  return {
    type: 'VerticalLayout',
    elements: [
      uiSchema,
      {
        type: 'Group',
        label: 'Ports',
        collapsible: true,
        defaultOpen: false,
        elements: [{ type: 'Control', scope: `#/properties/${PORTS_CONFIG_KEY}` }]
      }
    ]
  };
}
