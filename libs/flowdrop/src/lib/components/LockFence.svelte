<!--
  @component
  LockFence: makes the form controls inside it read-only while the editor is locked.

  It tells every form field below it, through the form read-only context, that the
  form is read-only. Inputs, selects, switches, code editors and the buttons that
  add, move or remove things then stop answering, while text stays selectable and
  the buttons that only open, close or refresh something keep working. The workflow
  store refuses edits as well; this is what the person sees.

  **Use it for** wrapping a config form or panel body that edits the workflow.
  **Not for** navigation inside a panel (tabs stay usable on a locked workflow).
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getInstance } from '../stores/getInstance.svelte.js';
  import { provideFormReadOnly } from './form/readOnly.js';

  let { children }: { children: Snippet } = $props();
  const fd = getInstance();
  provideFormReadOnly(() => fd.lock.isLocked);
</script>

<div class="flowdrop-lock-fence" data-locked={fd.lock.isLocked ? '' : undefined}>
  {@render children()}
</div>

<style>
  .flowdrop-lock-fence {
    display: contents;
  }
</style>
