<!--
  InterfaceInputForm Component

  The form a workflow's interface inputs render as in the Playground: one
  field per input entry without a chat turn (the session fills turn ports, so
  they never appear here). Values are keyed by entry id, the name the server
  matches `inputs` on. Rendering is SchemaForm's; this component only builds
  the schema and frames it.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import SchemaForm from '../SchemaForm.svelte';
  import type { WorkflowInterfaceEntry } from '../../types/index.js';
  import { interfaceFormSchema } from '../../utils/workflowInterface.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** The interface input entries to render (inputs without a `turn`). */
    entries: WorkflowInterfaceEntry[];
    /** Current values, keyed by entry id. */
    values: Record<string, unknown>;
    /** Called with the complete values on every change. */
    onChange: (values: Record<string, unknown>) => void;
    /** Disable every field (e.g. while a turn runs). */
    disabled?: boolean;
  }

  let { entries, values, onChange, disabled = false }: Props = $props();

  const schema = $derived(interfaceFormSchema(entries));
  const labels = $derived(m().playground.inputForm);
</script>

<section class="interface-input-form" aria-label={labels.title}>
  <header class="interface-input-form__header">
    <Icon icon="mdi:form-textbox" />
    <span>{labels.title}</span>
  </header>
  <div class="interface-input-form__body">
    <SchemaForm {schema} {values} {onChange} {disabled} />
  </div>
</section>

<style>
  /* Grows into the control panel's free height and scrolls there, so the
     composer below it keeps its place however many inputs there are. */
  .interface-input-form {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    width: 100%;
    padding: var(--fd-space-md) var(--fd-space-3xl) 0;
    box-sizing: border-box;
  }

  .interface-input-form__header,
  .interface-input-form__body {
    max-width: 760px;
    margin-left: auto;
    margin-right: auto;
  }

  .interface-input-form__header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-muted-foreground);
    margin-bottom: var(--fd-space-sm);
    margin-top: 0;
  }
</style>
