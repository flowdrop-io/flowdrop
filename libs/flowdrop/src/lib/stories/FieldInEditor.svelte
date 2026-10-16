<!--
  @component
  Shows one form field the way the editor draws it: through the field factory,
  inside its label and help text, with its own value held in state.

  Pass the field's schema and a starting value. `full` uses the factory that has the code,
  markdown and template editors built in; without it those fields draw as a plain textarea,
  which is what the inspector shows until the host registers the editors.
-->

<script lang="ts">
  import FormField from '../components/form/FormField.svelte';
  import FormFieldLight from '../components/form/FormFieldLight.svelte';
  import type { FieldSchema } from '../components/form/types.js';
  import type { WorkflowEdge, WorkflowNode } from '../types/index.js';
  import InstanceDecorator from './InstanceDecorator.svelte';

  interface Props {
    /** The field's schema. */
    schema: FieldSchema;
    /** The starting value. */
    value?: unknown;
    /** Key and id of the field. @default 'field' */
    fieldKey?: string;
    /** Mark the field required. */
    required?: boolean;
    /** Use the factory with every editor built in. */
    full?: boolean;
    /** Width of the column the field sits in. @default '22rem' */
    width?: string;
    /** The node the field belongs to (template fields read its connected variables). */
    node?: WorkflowNode;
    /** All workflow nodes. */
    nodes?: WorkflowNode[];
    /** All workflow edges. */
    edges?: WorkflowEdge[];
    /** Called with every new value. */
    onChange?: (value: unknown) => void;
  }

  const {
    schema,
    value: initial,
    fieldKey = 'field',
    required = false,
    full = false,
    width = '22rem',
    node,
    nodes,
    edges,
    onChange
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let value = $state<unknown>(initial);

  function change(next: unknown): void {
    value = next;
    onChange?.(next);
  }
</script>

<InstanceDecorator {width}>
  {#if full}
    <FormField {fieldKey} {schema} {value} {required} {node} {nodes} {edges} onChange={change} />
  {:else}
    <FormFieldLight
      {fieldKey}
      {schema}
      {value}
      {required}
      {node}
      {nodes}
      {edges}
      onChange={change}
    />
  {/if}
</InstanceDecorator>
