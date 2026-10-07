<!--
  EditorModeSwitch

  The Edit | Test switch in the navbar. In Edit mode the Test button carries a
  dot while a test run is going or waiting for someone: the one test signal
  Edit mode has.
-->

<script lang="ts">
  import type { EditorMode } from '../stores/editorModeStore.svelte.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    mode: EditorMode;
    onChange: (mode: EditorMode) => void;
    /** A test run is going or waiting. Shown as a dot on Test, in Edit mode only. */
    runActive?: boolean;
  }

  let { mode, onChange, runActive = false }: Props = $props();

  const nav = $derived(m().navigation.editorMode);
</script>

<div class="editor-mode-switch" role="group" aria-label={nav.label}>
  <button
    type="button"
    class="editor-mode-switch__option"
    aria-pressed={mode === 'edit'}
    onclick={() => onChange('edit')}
  >
    {nav.edit}
  </button>
  <button
    type="button"
    class="editor-mode-switch__option"
    aria-pressed={mode === 'test'}
    onclick={() => onChange('test')}
  >
    {nav.test}
    {#if runActive && mode === 'edit'}
      <span class="editor-mode-switch__dot" title={nav.runActive} data-testid="test-run-dot"></span>
    {/if}
  </button>
</div>

<style>
  .editor-mode-switch {
    display: inline-flex;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    overflow: hidden;
    background-color: var(--fd-background);
  }

  .editor-mode-switch__option {
    position: relative;
    padding: 0.3rem 0.9rem;
    border: 0;
    background: transparent;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color var(--fd-transition-fast),
      color var(--fd-transition-fast);
  }

  .editor-mode-switch__option:hover {
    color: var(--fd-foreground);
  }

  .editor-mode-switch__option[aria-pressed='true'] {
    background-color: var(--fd-primary);
    color: var(--fd-primary-foreground, #fff);
  }

  .editor-mode-switch__option:focus-visible {
    outline: 2px solid var(--fd-primary);
    outline-offset: -2px;
  }

  .editor-mode-switch__dot {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: var(--fd-warning, #d97706);
    box-shadow: 0 0 0 2px var(--fd-background);
  }
</style>
