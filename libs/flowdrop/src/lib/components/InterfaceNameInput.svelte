<!--
  InterfaceNameInput

  The inline field a workflow-interface name is typed in: sized to its text,
  mono, no box of its own (it sits inside an InterfaceTag). Enter saves, Escape
  cancels; leaving the field cancels too, so nothing is saved by accident. The
  id must be unique within its direction: the parent passes the error and this
  shows it, so the person sees why Enter did nothing.

  It takes focus and selects its text when it appears.
-->

<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { m } from '$lib/messages/index.js';

  interface Props {
    value: string;
    /** The reason `value` cannot be saved, when it cannot. */
    error?: string | null;
    onchange: (value: string) => void;
    onsubmit: () => void;
    oncancel: () => void;
    /** Test hook. */
    testId?: string;
  }

  const { value, error = null, onchange, onsubmit, oncancel, testId }: Props = $props();

  const focusAndSelect: Attachment<HTMLInputElement> = (el) => {
    el.focus({ preventScroll: true });
    el.select();
  };

  function handleKeydown(event: KeyboardEvent): void {
    // The canvas and the panels listen for these keys too (Escape clears the
    // selection, Backspace deletes it): this field owns them while it has focus.
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      onsubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      oncancel();
    }
  }
</script>

<input
  class="fd-iface-name nodrag nopan nowheel"
  type="text"
  {value}
  style:width="{Math.max(4, Array.from(value).length + 1)}ch"
  spellcheck="false"
  autocomplete="off"
  aria-label={m().workflowInterface.tagNameLabel}
  aria-invalid={error ? 'true' : undefined}
  aria-describedby={error ? 'fd-iface-name-error' : undefined}
  data-testid={testId ?? 'interface-name-input'}
  oninput={(event) => onchange(event.currentTarget.value)}
  onkeydown={handleKeydown}
  onblur={oncancel}
  {@attach focusAndSelect}
/>
{#if error}
  <span id="fd-iface-name-error" class="fd-iface-name__error" role="alert">{error}</span>
{:else}
  <span class="fd-iface-name__hint">{m().workflowInterface.tagNameHint}</span>
{/if}

<style>
  .fd-iface-name {
    min-width: 0;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: none;
    color: var(--fd-foreground);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-iface-tag-id-size);
  }

  /* The message sits under the tag, out of its shape. */
  .fd-iface-name__error,
  .fd-iface-name__hint {
    position: absolute;
    top: calc(100% + var(--fd-space-3xs));
    left: 0;
    font-family: var(--fd-font-sans);
    font-size: var(--fd-text-meta);
    pointer-events: none;
  }

  .fd-iface-name__error {
    color: var(--fd-error);
  }

  .fd-iface-name__hint {
    color: var(--fd-muted-foreground);
  }
</style>
