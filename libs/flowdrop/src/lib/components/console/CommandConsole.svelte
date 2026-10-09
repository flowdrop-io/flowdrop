<!--
  CommandConsole Component
  Bottom-panel REPL shell for the FlowDrop Command DSL
  Styled with BEM syntax matching ConfigPanel pattern
-->

<script lang="ts">
  import type { NodeMetadata } from '$lib/types/index.js';
  import {
    parseCommand,
    executeCommand,
    executeBatch,
    parseSessionCommand,
    executeSessionCommand,
    isSessionLine,
    SESSION_HELP,
    type UIAction,
    type CommandContext,
    type CommandResultOk,
    type ListNodesResultData,
    type ListEdgesResultData,
    type ListTypesResultData,
    type SearchTypesResultData,
    type DescribeTypeResultData,
    type InfoResultData,
    type HelpResultData
  } from '../../commands/index.js';
  import { createStoreCommandContext } from '../../commands/storeIntegration.svelte.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { updateSettings, getUiSettings } from '../../stores/settingsStore.svelte.js';
  import Button from '../primitives/Button.svelte';
  import ConsoleInput from './ConsoleInput.svelte';
  import ConsoleOutput, { type ConsoleEntry } from './ConsoleOutput.svelte';
  import { m } from '$lib/messages/index.js';
  import {
    formatListNodes,
    formatListEdges,
    formatListTypes,
    formatSearchTypes,
    formatDescribeType,
    formatInfo,
    formatHelp
  } from './formatters.js';

  const SESSION_HEADING = 'Session (editor Console only):';

  interface Props {
    /** Available node types for command execution */
    nodeTypes: NodeMetadata[];
    /** Callback for UI actions (open config, select node) */
    onUIAction?: (action: UIAction) => void;
    /** Id of the panel element, so the toggle strip can point `aria-controls` at it */
    id?: string;
  }

  let { nodeTypes, onUIAction, id }: Props = $props();

  /**
   * Commands the empty state offers. Read-only on purpose: a click runs them,
   * and none of them can change the workflow.
   */
  const EXAMPLE_COMMANDS = ['list nodes', 'list types', 'help'] as const;

  const fd = getInstance();

  let outputEntries: ConsoleEntry[] = $state([]);

  // Recreated whenever nodeTypes changes; null while no workflow is loaded
  const commandContext: CommandContext | null = $derived(
    createStoreCommandContext(nodeTypes, onUIAction, fd)
  );

  /**
   * Attempts to format CommandResult data into a rich display string.
   * Returns null if the result has no formattable data.
   */
  function formatResultData(commandType: string, result: CommandResultOk): string | null {
    if (!result.data) return null;

    switch (commandType) {
      case 'list_nodes':
        return formatListNodes(result.data as ListNodesResultData);
      case 'list_edges':
        return formatListEdges(result.data as ListEdgesResultData);
      case 'list_types':
        return formatListTypes(result.data as ListTypesResultData);
      case 'search_types':
        return formatSearchTypes(result.data as SearchTypesResultData);
      case 'describe_type':
        return formatDescribeType(result.data as DescribeTypeResultData);
      case 'info':
        return formatInfo(result.data as InfoResultData);
      case 'help':
        return formatHelp(result.data as HelpResultData);
      default:
        return null;
    }
  }

  function closeConsole() {
    updateSettings({ ui: { consoleOpen: false } });
  }

  /**
   * Run a `session …` line. These are asynchronous and talk to the backend, so
   * they have their own lane: the input stays usable while one is in flight and
   * its result is added when it lands.
   */
  async function handleSessionSubmit(line: string) {
    const parsed = parseSessionCommand(line);
    if (!parsed.ok) {
      outputEntries.push({ type: 'error', text: parsed.error });
      return;
    }
    const result = await executeSessionCommand(parsed.command, fd.runs);
    outputEntries.push(
      result.ok ? { type: 'success', text: result.message } : { type: 'error', text: result.error }
    );
  }

  function handleCommandSubmit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Add the input entry to the output
    outputEntries.push({ type: 'input', text: trimmed });

    // Handle cls command (clear console output; use 'clear' to clear the canvas)
    if (trimmed.toLowerCase() === 'cls') {
      outputEntries = [];
      return;
    }

    // `help session` is answered here: the editing DSL does not know the verb.
    if (/^help\s+session$/i.test(trimmed)) {
      outputEntries.push({ type: 'formatted', text: formatHelp({ commands: SESSION_HELP }) });
      return;
    }

    // Session commands run in their own, asynchronous lane.
    if (isSessionLine(trimmed)) {
      void handleSessionSubmit(trimmed);
      return;
    }

    // Parse the command
    const parseResult = parseCommand(trimmed);
    if (!parseResult.ok) {
      outputEntries.push({ type: 'error', text: parseResult.error });
      return;
    }

    // Ensure we have a command context
    if (!commandContext) {
      outputEntries.push({ type: 'error', text: 'No workflow loaded' });
      return;
    }

    // Execute the command
    const result = executeCommand(parseResult.command, commandContext);
    if (result.ok) {
      const formatted = formatResultData(parseResult.command.type, result);
      if (formatted) {
        outputEntries.push({ type: 'formatted', text: formatted });
      } else {
        outputEntries.push({ type: 'success', text: result.message });
      }
      // The Console also knows the session commands; `help` lists them too.
      if (parseResult.command.type === 'help' && !parseResult.command.command) {
        outputEntries.push({
          type: 'formatted',
          text: `${SESSION_HEADING}\n${formatHelp({ commands: SESSION_HELP })}`
        });
      }
    } else {
      outputEntries.push({ type: 'error', text: result.error });
    }
  }

  function handleBatchSubmit(lines: string[]) {
    // A batch is all-or-nothing and synchronous; a run is neither. Refuse
    // before anything executes.
    if (lines.some(isSessionLine)) {
      for (const line of lines) outputEntries.push({ type: 'input', text: line });
      outputEntries.push({
        type: 'error',
        text: 'session commands cannot be part of a batch. Nothing was run; send them one at a time.'
      });
      return;
    }

    if (!commandContext) {
      outputEntries.push({ type: 'error', text: 'No workflow loaded' });
      return;
    }

    const totalCount = lines.length;

    // Parse all commands first
    const parsed: {
      line: string;
      command?: import('../../commands/index.js').Command;
      error?: string;
    }[] = [];
    for (const line of lines) {
      outputEntries.push({ type: 'input', text: line });

      if (line.toLowerCase() === 'cls') {
        outputEntries = [];
        parsed.length = 0;
        continue;
      }

      const parseResult = parseCommand(line);
      if (!parseResult.ok) {
        outputEntries.push({ type: 'error', text: parseResult.error });
        const succeeded = parsed.length;
        outputEntries.push({
          type: 'error',
          text: `Batch failed at command ${succeeded + 1}/${totalCount}: parse error`
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
        const formatted = formatResultData(commands[i].type, result);
        if (formatted) {
          outputEntries.push({ type: 'formatted', text: formatted });
        } else {
          outputEntries.push({ type: 'success', text: result.message });
        }
      } else {
        outputEntries.push({ type: 'error', text: result.error });
      }
    }

    // Show summary
    if (batchResult.ok) {
      outputEntries.push({
        type: 'success',
        text: `Batch: ${batchResult.completedCount}/${batchResult.totalCount} commands succeeded`
      });
    } else {
      outputEntries.push({
        type: 'error',
        text: `Batch failed at command ${batchResult.completedCount + 1}/${batchResult.totalCount}: ${batchResult.error}`
      });
    }
  }
</script>

<div class="command-console" {id} role="region" aria-label={m().layout.commandConsole}>
  <div class="command-console__content">
    {#if outputEntries.length === 0}
      <div class="command-console__examples" data-testid="console-examples">
        <span class="command-console__examples-label">{m().layout.consoleExamplesLabel}</span>
        {#each EXAMPLE_COMMANDS as example (example)}
          <Button
            variant="ghost"
            size="sm"
            class="command-console__example"
            onclick={() => handleCommandSubmit(example)}
          >
            <span aria-hidden="true">›</span>
            {example}
          </Button>
        {/each}
      </div>
    {/if}
    <ConsoleOutput entries={outputEntries} />
  </div>
  <ConsoleInput
    open={getUiSettings().consoleOpen}
    {nodeTypes}
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

  .command-console__examples {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-xs) var(--fd-space-md) 0;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
  }

  .command-console__examples-label {
    font-family: var(--fd-font-sans);
    font-size: var(--fd-text-meta);
  }

  .command-console__examples :global(.command-console__example) {
    height: auto;
    padding: 0 var(--fd-space-3xs);
    font-family: inherit;
    font-size: inherit;
    font-weight: normal;
  }

  .command-console__content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
