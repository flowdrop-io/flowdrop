<!--
  @component
  The interface inputs as raw JSON.
  The user sees it when they choose "JSON view" in the Playground's ... menu. It edits the same values as the typed form, keyed by entry id. Text that is not a JSON object is held back with a note, and the form keeps its last good values.

  **Use it for** pasting or editing all inputs at once.
  **Not for** the normal typed form; use `InputFields` instead.
-->

<script lang="ts">
  import { untrack } from 'svelte';
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** Current values, keyed by entry id. */
    values: Record<string, unknown>;
    /** Called with the complete values when the text is a valid JSON object. */
    onChange: (values: Record<string, unknown>) => void;
    /** Make the text box read-only. Default: false. */
    disabled?: boolean;
  }

  let { values, onChange, disabled = false }: Props = $props();

  const labels = $derived(m().playground.jsonInput);

  // Seeded once from the form's values; typing owns the text after that.
  let text = $state(untrack(() => JSON.stringify(values, null, 2)));
  let error = $state<string | null>(null);

  function handleInput(event: Event): void {
    text = (event.currentTarget as HTMLTextAreaElement).value;
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        error = labels.notObject;
        return;
      }
      error = null;
      onChange(parsed as Record<string, unknown>);
    } catch {
      error = labels.invalid;
    }
  }
</script>

<section class="interface-json-input" aria-label={labels.label}>
  <textarea
    class="interface-json-input__text"
    aria-label={labels.label}
    aria-invalid={error !== null}
    spellcheck="false"
    {disabled}
    value={text}
    oninput={handleInput}
  ></textarea>
  {#if error}
    <p class="interface-json-input__error" role="alert">{error}</p>
  {/if}
</section>

<style>
  .interface-json-input {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .interface-json-input__text {
    box-sizing: border-box;
    width: 100%;
    min-height: 120px;
    resize: vertical;
    padding: var(--fd-space-sm);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background: var(--fd-background);
    color: var(--fd-foreground);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    line-height: 1.5;
  }

  .interface-json-input__text[aria-invalid='true'] {
    border-color: var(--fd-error);
  }

  .interface-json-input__error {
    margin: 0;
    color: var(--fd-error);
    font-size: var(--fd-text-xs);
  }
</style>
