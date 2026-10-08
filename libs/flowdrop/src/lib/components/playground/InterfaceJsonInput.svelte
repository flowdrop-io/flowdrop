<!--
  InterfaceJsonInput

  The workflow's interface inputs as JSON: the escape hatch beside the typed
  form (the Playground's ⋯ menu, "JSON view"). Edits the same values the form
  does, keyed by entry id. Text that does not parse as a JSON object is held
  back with a note; the form's last good values stay until it does.
-->

<script lang="ts">
  import { untrack } from 'svelte';
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** Current values, keyed by entry id. */
    values: Record<string, unknown>;
    /** Called with the complete values when the text is a valid JSON object. */
    onChange: (values: Record<string, unknown>) => void;
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
