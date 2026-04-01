<!--
  CommandConsole Component
  Bottom-panel REPL shell for the FlowDrop Command DSL
  Styled with BEM syntax matching ConfigPanel pattern
-->

<script lang="ts">
  import type { NodeMetadata } from "$lib/types/index.js";
  import { updateSettings } from "../../stores/settingsStore.svelte.js";

  interface Props {
    /** Available node types for command execution */
    nodeTypes: NodeMetadata[];
  }

  let { nodeTypes }: Props = $props();

  function closeConsole() {
    updateSettings({ ui: { consoleOpen: false } });
  }
</script>

<div class="command-console">
  <div class="command-console__header">
    <h2 class="command-console__title">Console</h2>
    <button
      class="command-console__close"
      onclick={closeConsole}
      aria-label="Close console"
      type="button"
    >
      &times;
    </button>
  </div>
  <div class="command-console__content">
    <!-- Console output and input will be added in later stories -->
  </div>
</div>

<style>
  .command-console {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--fd-background);
  }

  .command-console__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--fd-border);
    background-color: var(--fd-muted);
    flex-shrink: 0;
  }

  .command-console__title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .command-console__close {
    background: none;
    border: none;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    color: var(--fd-muted-foreground);
    padding: 0.25rem;
    border-radius: var(--fd-radius-sm);
    transition:
      color var(--fd-transition-fast),
      background-color var(--fd-transition-fast);
  }

  .command-console__close:hover {
    color: var(--fd-foreground);
    background-color: var(--fd-subtle);
  }

  .command-console__content {
    flex: 1;
    overflow-y: auto;
  }
</style>
