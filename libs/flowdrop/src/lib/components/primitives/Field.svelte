<!--
  Field — wraps one form control with its label, type tag, help and error.

  The control is the caller's: `children` receives `{ id, describedBy, invalid }`
  so the caller puts `id`, `aria-describedby` and `aria-invalid` on its own
  input. Help and error are both announced (both ids are in `describedBy`);
  the error is shown in the error colour. `required`
  shows a marker next to the label (the caller sets the control's `required`).

  `examples` renders a row of small mono buttons; clicking one calls
  `onexample(value)` (e.g. to fill a JSON field from the interface definition).

  @internal Not exported from any package entry; the API may still change.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';
  import { getMessages } from '../../messages/context.js';

  interface Props {
    /** Visible label text. */
    label: string;
    /** Small mono tag after the label, e.g. `array`, `string`. */
    typeTag?: string;
    /** Muted help text under the control. */
    help?: string;
    /** Error text under the control; sets `invalid`. */
    error?: string;
    /** Shows the required marker. */
    required?: boolean;
    /** Control id; generated when absent. */
    id?: string;
    /** Example values rendered as chips under the control. */
    examples?: string[];
    /** Called with the example the user picked. */
    onexample?: (value: string) => void;
    /** Extra classes on the root. */
    class?: string;
    /** The control. */
    children: Snippet<[{ id: string; describedBy: string | undefined; invalid: boolean }]>;
  }

  let {
    label,
    typeTag,
    help,
    error,
    required = false,
    id,
    examples,
    onexample,
    class: className = '',
    children
  }: Props = $props();

  const getMsgs = getMessages();
  const generated = $props.id();

  const controlId = $derived(id ?? `flowdrop-field-${generated}`);
  const helpId = $derived(`${controlId}-help`);
  const errorId = $derived(`${controlId}-error`);
  const invalid = $derived(!!error);
  const describedBy = $derived(
    [help ? helpId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined
  );
</script>

<div class="flowdrop-ui-field {className}" class:flowdrop-ui-field--invalid={invalid}>
  <div class="flowdrop-ui-field__head">
    <label class="flowdrop-ui-field__label" for={controlId}>
      {label}
      {#if required}
        <span class="flowdrop-ui-field__required" title={getMsgs().field.required}>*</span>
      {/if}
    </label>
    {#if typeTag}
      <span class="flowdrop-ui-field__tag">{typeTag}</span>
    {/if}
  </div>

  {@render children({ id: controlId, describedBy, invalid })}

  {#if examples?.length}
    <div class="flowdrop-ui-field__examples" role="group" aria-label={getMsgs().field.examples}>
      {#each examples as example (example)}
        <Button
          size="sm"
          variant="secondary"
          class="flowdrop-ui-field__example"
          title={example}
          onclick={() => onexample?.(example)}
        >
          {example}
        </Button>
      {/each}
    </div>
  {/if}

  {#if help}
    <p class="flowdrop-ui-field__help" id={helpId}>{help}</p>
  {/if}
  {#if error}
    <p class="flowdrop-ui-field__error" id={errorId} role="alert">{error}</p>
  {/if}
</div>

<style>
  .flowdrop-ui-field {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-2xs);
    min-width: 0;
    font-family: var(--fd-font-sans);
  }

  .flowdrop-ui-field__head {
    display: flex;
    align-items: baseline;
    gap: var(--fd-space-xs);
    min-width: 0;
  }

  .flowdrop-ui-field__label {
    color: var(--fd-foreground);
    font-size: var(--fd-field-label-size, var(--fd-text-xs));
    font-weight: 600;
    line-height: 1.3;
  }

  .flowdrop-ui-field__required {
    color: var(--fd-error);
  }

  .flowdrop-ui-field__tag {
    padding: var(--fd-field-tag-pad, 0 var(--fd-space-2xs));
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-field-tag-bg, var(--fd-muted));
    color: var(--fd-muted-foreground);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
    line-height: 1.5;
  }

  .flowdrop-ui-field__examples {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-2xs);
  }

  .flowdrop-ui-field :global(.flowdrop-ui-field__example) {
    max-width: 100%;
    border-radius: var(--fd-radius-full);
    border-style: var(--fd-field-example-border-style, solid);
    background-color: var(--fd-field-example-bg, var(--fd-background));
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
  }

  .flowdrop-ui-field__help,
  .flowdrop-ui-field__error {
    margin: 0;
    font-size: var(--fd-field-help-size);
    line-height: 1.4;
  }

  .flowdrop-ui-field__help {
    color: var(--fd-muted-foreground);
  }

  .flowdrop-ui-field__error {
    color: var(--fd-error);
  }
</style>
