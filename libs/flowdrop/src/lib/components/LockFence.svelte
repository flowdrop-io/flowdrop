<!--
  @component
  LockFence: makes every form control inside it read-only while the editor is locked.

  It is a `<fieldset disabled>` that takes no space of its own, so inputs, selects
  and buttons inside stop answering, while text stays selectable. The workflow store
  refuses edits as well; this is what the person sees.

  **Use it for** wrapping a config form or panel body that edits the workflow.
  **Not for** navigation inside a panel (tabs stay usable on a locked workflow).
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getInstance } from '../stores/getInstance.svelte.js';

  let { children }: { children: Snippet } = $props();
  const fd = getInstance();
</script>

<fieldset class="flowdrop-lock-fence" disabled={fd.lock.isLocked}>
  {@render children()}
</fieldset>

<style>
  .flowdrop-lock-fence {
    display: contents;
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
</style>
