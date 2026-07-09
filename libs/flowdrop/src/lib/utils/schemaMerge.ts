/**
 * Combines a dynamically-fetched config schema with a node's static schema.
 *
 * Dynamic schema used to be all-or-nothing: the fetched schema replaced the
 * whole form, so an endpoint had to re-serve every field even to drive one, and
 * a narrower response silently dropped fields (and their values) the form no
 * longer rendered. `applyFetchedSchema` lets the fetch instead *layer onto* the
 * static schema — merging fields or targeting a single region — so the rest of
 * the form stays exactly as authored.
 *
 * Kept as a standalone pure function so it can be unit-tested directly against
 * the same code `ConfigForm` runs, rather than through the component.
 */
import type { ConfigSchema, DynamicSchemaEndpoint } from '../types/index.js';

/**
 * Loose view of a JSON-Schema object node. Both `ConfigSchema` and an
 * object-typed `ConfigProperty` are structurally compatible with this, which is
 * what lets the same splice logic descend from the root into nested properties.
 */
type SchemaNode = {
  properties?: Record<string, SchemaNode>;
  required?: string[];
  [key: string]: unknown;
};

/** Union two `required` arrays, dropping duplicates; `undefined` when neither has entries. */
function unionRequired(a?: string[], b?: string[]): string[] | undefined {
  if (!a?.length && !b?.length) return undefined;
  return Array.from(new Set([...(a ?? []), ...(b ?? [])]));
}

/**
 * Layers `fetched` onto `base`: fetched top-level attributes win, `properties`
 * are shallow-merged per key (a field is wholly static or wholly fetched, never
 * half of each), and `required` is unioned.
 */
function mergeNodes(base: SchemaNode, fetched: SchemaNode): SchemaNode {
  const merged: SchemaNode = { ...base, ...fetched };

  if (base.properties || fetched.properties) {
    merged.properties = { ...(base.properties ?? {}), ...(fetched.properties ?? {}) };
  }

  const required = unionRequired(base.required, fetched.required);
  if (required) merged.required = required;
  else delete merged.required;

  return merged;
}

/**
 * Places `fetched` at `segments` within `base`, cloning each node along the
 * path so the input is never mutated. At the leaf the strategy decides between
 * replacing the existing node outright and merging into it.
 */
function spliceAtPath(
  base: SchemaNode,
  fetched: SchemaNode,
  segments: string[],
  strategy: 'replace' | 'merge'
): SchemaNode {
  if (segments.length === 0) {
    return strategy === 'merge' ? mergeNodes(base, fetched) : fetched;
  }

  const [head, ...rest] = segments;
  const properties = base.properties ?? {};
  const existing = (properties[head] ?? {}) as SchemaNode;

  return {
    ...base,
    properties: {
      ...properties,
      [head]: spliceAtPath(existing, fetched, rest, strategy)
    }
  };
}

/**
 * Resolves the schema `ConfigForm` should render from a node's static schema
 * and a freshly-fetched dynamic schema, per the endpoint's `mergeStrategy` and
 * `target`.
 *
 * @param base - The node's static schema (`schema` prop or `metadata.configSchema`), if any
 * @param fetched - The schema returned by the dynamic endpoint
 * @param endpoint - Supplies `mergeStrategy` (default `"replace"`) and optional `target`
 * @returns The effective schema to render
 */
export function applyFetchedSchema(
  base: ConfigSchema | undefined,
  fetched: ConfigSchema,
  endpoint: Pick<DynamicSchemaEndpoint, 'mergeStrategy' | 'target'>
): ConfigSchema {
  const strategy = endpoint.mergeStrategy ?? 'replace';

  // Nothing to combine with: the fetched schema is the whole form.
  if (!base) return fetched;

  const segments = endpoint.target ? endpoint.target.split('.').filter(Boolean) : [];

  return spliceAtPath(
    base as unknown as SchemaNode,
    fetched as unknown as SchemaNode,
    segments,
    strategy
  ) as unknown as ConfigSchema;
}
