<!--
  CommandConsole Component
  Bottom-panel REPL shell for the FlowDrop Command DSL
  Styled with BEM syntax matching ConfigPanel pattern
-->

<script lang="ts">
  import type { NodeMetadata } from "$lib/types/index.js";
  import {
    parseCommand,
    executeCommand,
    executeBatch,
    type UIAction,
    type CommandContext,
  } from "../../commands/index.js";
  import { createStoreCommandContext } from "../../commands/storeIntegration.svelte.js";
  import { updateSettings, getUiSettings } from "../../stores/settingsStore.svelte.js";
  import ConsoleInput from "./ConsoleInput.svelte";
  import ConsoleOutput, { type ConsoleEntry } from "./ConsoleOutput.svelte";

  interface Props {
    /** Available node types for command execution */
    nodeTypes: NodeMetadata[];
    /** Callback for UI actions (open config, select node) */
    onUIAction?: (action: UIAction) => void;
  }

  let { nodeTypes, onUIAction }: Props = $props();

  let outputEntries: ConsoleEntry[] = $state([]);
  let commandContext: CommandContext | null = $state(null);

  // Recreate context when nodeTypes changes
  $effect(() => {
    commandContext = createStoreCommandContext(nodeTypes, onUIAction);
  });

  function closeConsole() {
    updateSettings({ ui: { consoleOpen: false } });
  }

  function handleCommandSubmit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Add the input entry to the output
    outputEntries.push({ type: "input", text: trimmed });

    // Handle clear command
    if (trimmed.toLowerCase() === "clear") {
      outputEntries = [];
      return;
    }

    // Parse the command
    const parseResult = parseCommand(trimmed);
    if (!parseResult.ok) {
      outputEntries.push({ type: "error", text: parseResult.error });
      return;
    }

    // Ensure we have a command context
    if (!commandContext) {
      outputEntries.push({ type: "error", text: "No workflow loaded" });
      return;
    }

    // Execute the command
    const result = executeCommand(parseResult.command, commandContext);
    if (result.ok) {
      outputEntries.push({ type: "success", text: result.message });
    } else {
      outputEntries.push({ type: "error", text: result.error });
    }
  }

  function handleBatchSubmit(lines: string[]) {
    if (!commandContext) {
      outputEntries.push({ type: "error", text: "No workflow loaded" });
      return;
    }

    const totalCount = lines.length;

    // Parse all commands first
    const parsed: { line: string; command?: import("../../commands/index.js").Command; error?: string }[] = [];
    for (const line of lines) {
      outputEntries.push({ type: "input", text: line });

      if (line.toLowerCase() === "clear") {
        outputEntries = [];
        parsed.length = 0;
        continue;
      }

      const parseResult = parseCommand(line);
      if (!parseResult.ok) {
        outputEntries.push({ type: "error", text: parseResult.error });
        const succeeded = parsed.length;
        outputEntries.push({
          type: "error",
          text: `Batch failed at command ${succeeded + 1}/${totalCount}: parse error`,
        });
        return;
      }
      parsed.push({ line, command: parseResult.command });
    }

    if (parsed.length === 0) return;

    const commands = parsed.map((p) => p.command!);
    const batchResult = executeBatch(commands, commandContext);

    // Show individual results
    for (let i = 0; i < batchResult.results.length; i++) {
      const result = batchResult.results[i];
      if (result.ok) {
        outputEntries.push({ type: "success", text: result.message });
      } else {
        outputEntries.push({ type: "error", text: result.error });
      }
    }

    // Show summary
    if (batchResult.ok) {
      outputEntries.push({
        type: "success",
        text: `Batch: ${batchResult.completedCount}/${batchResult.totalCount} commands succeeded`,
      });
    } else {
      outputEntries.push({
        type: "error",
        text: `Batch failed at command ${batchResult.completedCount + 1}/${batchResult.totalCount}: ${batchResult.error}`,
      });
    }
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
    <ConsoleOutput entries={outputEntries} />
  </div>
  <ConsoleInput
    open={getUiSettings().consoleOpen}
    onSubmit={handleCommandSubmit}
    onBatchSubmit={handleBatchSubmit}
    onClose={closeConsole}
  />
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
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
