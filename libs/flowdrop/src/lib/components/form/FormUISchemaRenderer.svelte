<!--
  FormUISchemaRenderer Component
  Recursively renders UISchema elements: VerticalLayout, Group, and Control.

  This component bridges the UISchema tree and the existing FormField components.
  It resolves Control scopes to property keys and delegates field rendering to FormField.

  Rendering logic:
  - Control -> resolve scope to key, render FormField
  - VerticalLayout -> vertical flex container with recursive children
  - Group -> FormFieldset wrapping recursive children
-->

<script lang="ts">
  import type { UISchemaElement, UISchemaGroup } from '$lib/types/uischema.js';
  import type { ConfigSchema, WorkflowNode, WorkflowEdge, AuthProvider } from '$lib/types/index.js';
  import type { FieldSchema } from './types.js';
  import { resolveScopeToKey } from '$lib/utils/uischema.js';
  // Use the registry-based light field factory so the UISchema renderer (and
  // SchemaForm/ConfigForm above it) never statically pull in CodeMirror.
  import FormField from './FormFieldLight.svelte';
  import FormFieldset from './FormFieldset.svelte';
  import Self from './FormUISchemaRenderer.svelte';

  interface Props {
    /** The UISchema element to render */
    element: UISchemaElement;
    /** The data schema (for resolving field definitions) */
    schema: ConfigSchema;
    /** Current form values */
    values: Record<string, unknown>;
    /** Required field keys from the schema */
    requiredFields?: string[];
    /** Base animation index for staggered animations */
    animationIndexBase?: number;
    /** Callback when a field value changes */
    onFieldChange: (key: string, value: unknown) => void;
    /** Convert a property to FieldSchema (handles template variable injection etc.) */
    toFieldSchema: (property: Record<string, unknown>) => FieldSchema;
    /** Current workflow node (optional, passed through to FormField) */
    node?: WorkflowNode;
    /** All workflow nodes (optional, passed through to FormField) */
    nodes?: WorkflowNode[];
    /** All workflow edges (optional, passed through to FormField) */
    edges?: WorkflowEdge[];
    /** Workflow ID (optional, passed through to FormField) */
    workflowId?: string;
    /** Auth provider (optional, passed through to FormField) */
    authProvider?: AuthProvider;
  }

  let {
    element,
    schema,
    values,
    requiredFields = [],
    animationIndexBase = 0,
    onFieldChange,
    toFieldSchema,
    node,
    nodes,
    edges,
    workflowId,
    authProvider
  }: Props = $props();

  function isRequired(key: string): boolean {
    return requiredFields.includes(key);
  }

  /**
   * A layout that mixes loose controls with groups (a node's own fields beside
   * General / Execution / Ports) gets those controls a section of their own, so
   * they do not float above the first group without a heading.
   */
  const SETTINGS_GROUP: UISchemaGroup = {
    type: 'Group',
    label: 'Settings',
    collapsible: false,
    defaultOpen: true,
    elements: []
  };
  const layoutSections = $derived.by(() => {
    if (element.type !== 'VerticalLayout') return [];
    const children = element.elements;
    const lead = children.findIndex((child) => child.type !== 'Control');
    const hasGroup = children.some((child) => child.type === 'Group');
    if (!hasGroup || lead <= 0) {
      return children.map((child, idx) => ({ child, idx }));
    }
    return [
      {
        child: { ...SETTINGS_GROUP, elements: children.slice(0, lead) } as UISchemaElement,
        idx: 0
      },
      ...children.slice(lead).map((child, i) => ({ child, idx: lead + i }))
    ];
  });
</script>

{#if element.type === 'Control'}
  {@const key = resolveScopeToKey(element.scope)}
  {#if key && schema.properties[key]}
    {@const fieldSchema = toFieldSchema(schema.properties[key] as Record<string, unknown>)}
    <FormField
      fieldKey={key}
      schema={fieldSchema}
      value={values[key]}
      required={isRequired(key)}
      animationIndex={animationIndexBase}
      {node}
      {nodes}
      {edges}
      {workflowId}
      {authProvider}
      onChange={(val) => onFieldChange(key, val)}
    />
  {/if}
{:else if element.type === 'VerticalLayout'}
  <div class="form-uischema-layout form-uischema-layout--vertical">
    {#each layoutSections as { child, idx } (idx)}
      <Self
        element={child}
        {schema}
        {values}
        {requiredFields}
        animationIndexBase={animationIndexBase + idx}
        {onFieldChange}
        {toFieldSchema}
        {node}
        {nodes}
        {edges}
        {workflowId}
        {authProvider}
      />
    {/each}
  </div>
{:else if element.type === 'Group'}
  <FormFieldset group={element}>
    <div class="form-uischema-layout form-uischema-layout--vertical">
      {#each element.elements as child, idx (idx)}
        <Self
          element={child}
          {schema}
          {values}
          {requiredFields}
          animationIndexBase={animationIndexBase + idx}
          {onFieldChange}
          {toFieldSchema}
          {node}
          {nodes}
          {edges}
          {workflowId}
          {authProvider}
        />
      {/each}
    </div>
  </FormFieldset>
{/if}

<style>
  .form-uischema-layout--vertical {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xl);
  }
</style>
