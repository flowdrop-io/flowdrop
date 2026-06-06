<!--
  ConsoleInput Component
  Single-line command input with prompt prefix, Enter-to-submit, Escape-to-close
  Includes autocomplete for command verbs and node type IDs
  Styled with BEM syntax matching CommandConsole pattern
-->

<script lang="ts">
  import type { NodeMetadata } from '$lib/types/index.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { toShortId, resolveNode } from '../../commands/index.js';
  import ConsoleAutocomplete, { type Suggestion } from './ConsoleAutocomplete.svelte';

  interface Props {
    /** Whether the console is currently visible/open */
    open: boolean;
    /** Available node types for autocomplete suggestions */
    nodeTypes?: NodeMetadata[];
    /** Called when user submits a command (Enter key) */
    onSubmit: (value: string) => void;
    /** Called when user pastes multiple lines */
    onBatchSubmit?: (lines: string[]) => void;
    /** Called when user presses Escape to close the console */
    onClose: () => void;
  }

  let { open, nodeTypes = [], onSubmit, onBatchSubmit, onClose }: Props = $props();

  const fd = getInstance();

  // Unique per component instance so two FlowDrop editors on one page
  // don't render colliding DOM ids; shared with the autocomplete listbox so
  // aria-controls/aria-activedescendant stay consistent.
  const uid = $props.id();
  const listboxId = `${uid}-console-autocomplete-listbox`;

  let inputValue = $state('');
  let inputElement: HTMLInputElement | undefined = $state();

  // Multiline value entry state
  let multilineMode = $state(false);
  let multilinePrefix = $state(''); // e.g. "set node1:prompt"
  let textareaValue = $state('');
  let textareaElement: HTMLTextAreaElement | undefined = $state();

  // Command history state
  const MAX_HISTORY = 100;
  let history: string[] = $state([]);
  let historyIndex = $state(-1);
  let savedInput = $state('');

  // Autocomplete state
  let acVisible = $state(false);
  let acSelectedIndex = $state(0);
  let acSuggestions: Suggestion[] = $state([]);

  const COMMAND_VERBS = [
    'add',
    'delete',
    'rename',
    'set',
    'get',
    'info',
    'config',
    'select',
    'connect',
    'disconnect',
    'list',
    'undo',
    'redo',
    'help',
    'clear',
    'cls',
    'swap',
    'move',
    'layout',
    'canvas'
  ];

  /** Verbs that take a nodeId as their first argument */
  const NODE_ID_VERBS = [
    'delete',
    'rename',
    'info',
    'config',
    'select',
    'set',
    'get',
    'disconnect',
    'swap',
    'move'
  ];

  $effect(() => {
    if (open && inputElement) {
      inputElement.focus();
    }
  });

  /**
   * Get node suggestions from the live workflow store.
   * Returns suggestions with short IDs and labels.
   */
  function getWorkflowNodeSuggestions(prefix: string): Suggestion[] {
    const workflow = fd.workflow.current;
    if (!workflow) return [];

    const lowerPrefix = prefix.toLowerCase();
    return workflow.nodes
      .map((node) => {
        const shortId = toShortId(node.id);
        return {
          value: shortId,
          label: shortId,
          detail: node.data.label
        };
      })
      .filter((s) => s.value.toLowerCase().startsWith(lowerPrefix))
      .slice(0, 50);
  }

  /**
   * Detect if cursor is at a position expecting a node ID.
   * Returns the partial text typed so far, or null if not at a nodeId position.
   */
  function getNodeIdContext(value: string): {
    partial: string;
    type: 'nodeId' | 'connectSource' | 'connectTarget';
  } | null {
    // "connect <source> to <partial>" — target node ID
    const connectToMatch = value.match(/^connect\s+\S+\s+to\s+(.*)$/i);
    if (connectToMatch) return { partial: connectToMatch[1], type: 'connectTarget' };

    // "connect <partial>" — source node ID (only if no "to" keyword yet)
    const connectMatch = value.match(/^connect\s+(?!.*\bto\b)(.*)$/i);
    if (connectMatch) return { partial: connectMatch[1], type: 'connectSource' };

    // Verbs that take nodeId as first arg: "verb <partial>"
    for (const verb of NODE_ID_VERBS) {
      const regex = new RegExp(`^${verb}\\s+(.*)$`, 'i');
      const match = value.match(regex);
      if (match) {
        // Only suggest if the partial doesn't already contain a space
        // (user has moved past the nodeId arg to further args)
        const partial = match[1];
        if (!partial.includes(' ') && !partial.includes(':')) {
          return { partial, type: 'nodeId' };
        }
        return null;
      }
    }

    return null;
  }

  /**
   * Detect if cursor is after a "<nodeId>:" pattern, indicating port or config key position.
   * Returns the nodeId, partial text after colon, and context type.
   */
  function getPortOrConfigContext(value: string): {
    nodeId: string;
    partial: string;
    type: 'outputPort' | 'inputPort' | 'configKey' | 'port';
  } | null {
    // "connect <nodeId>:<partial>" — output ports (source position, no "to" yet)
    const connectSourcePort = value.match(/^connect\s+(\S+?):(\S*)$/i);
    if (connectSourcePort && !/\bto\b/i.test(value)) {
      return {
        nodeId: connectSourcePort[1],
        partial: connectSourcePort[2],
        type: 'outputPort'
      };
    }

    // "connect <source> to <nodeId>:<partial>" — input ports (target position)
    const connectTargetPort = value.match(/^connect\s+\S+\s+to\s+(\S+?):(\S*)$/i);
    if (connectTargetPort) {
      return {
        nodeId: connectTargetPort[1],
        partial: connectTargetPort[2],
        type: 'inputPort'
      };
    }

    // "set <nodeId>:<partial>" — config keys
    const setMatch = value.match(/^set\s+(\S+?):(\S*)$/i);
    if (setMatch) {
      return { nodeId: setMatch[1], partial: setMatch[2], type: 'configKey' };
    }

    // "get <nodeId>:<partial>" — config keys
    const getMatch = value.match(/^get\s+(\S+?):(\S*)$/i);
    if (getMatch) {
      return { nodeId: getMatch[1], partial: getMatch[2], type: 'configKey' };
    }

    // "disconnect <nodeId>:<partial>" — all ports
    const disconnectMatch = value.match(/^disconnect\s+(\S+?):(\S*)$/i);
    if (disconnectMatch) {
      return {
        nodeId: disconnectMatch[1],
        partial: disconnectMatch[2],
        type: 'port'
      };
    }

    return null;
  }

  /**
   * Get port suggestions for a resolved node, filtered by direction and prefix.
   */
  function getPortSuggestions(
    nodeId: string,
    partial: string,
    filter: 'input' | 'output' | 'all'
  ): Suggestion[] {
    const workflow = fd.workflow.current;
    if (!workflow) return [];

    const node = resolveNode(nodeId, workflow.nodes);
    if (!node) return [];

    const metadata = node.data.metadata;
    if (!metadata) return [];

    const lowerPartial = partial.toLowerCase();
    const ports = [
      ...(filter === 'input' || filter === 'all' ? metadata.inputs : []),
      ...(filter === 'output' || filter === 'all' ? metadata.outputs : [])
    ];

    const staticSuggestions = ports
      .filter((p) => p.id.toLowerCase().startsWith(lowerPartial))
      .map((p) => ({
        value: p.id,
        label: p.id,
        detail: `${p.name} (${p.dataType})`
      }));

    // Gateway nodes (e.g. if_else) have dynamic branch outputs stored in config, not metadata
    const branchSuggestions: Suggestion[] = [];
    if ((filter === 'output' || filter === 'all') && metadata.type === 'gateway') {
      const branches = node.data.config?.branches as
        | Array<{ name: string; label?: string }>
        | undefined;
      if (branches) {
        for (const branch of branches) {
          if (branch.name.toLowerCase().startsWith(lowerPartial)) {
            branchSuggestions.push({
              value: branch.name,
              label: branch.name,
              detail: branch.label ? `branch: ${branch.label}` : 'branch'
            });
          }
        }
      }
    }

    return [...staticSuggestions, ...branchSuggestions].slice(0, 50);
  }

  /**
   * Get config key suggestions for a resolved node, filtered by prefix.
   */
  function getConfigKeySuggestions(nodeId: string, partial: string): Suggestion[] {
    const workflow = fd.workflow.current;
    if (!workflow) return [];

    const node = resolveNode(nodeId, workflow.nodes);
    if (!node) return [];

    const metadata = node.data.metadata;
    if (!metadata?.configSchema?.properties) return [];

    const lowerPartial = partial.toLowerCase();
    return Object.entries(metadata.configSchema.properties)
      .filter(([key]) => key.toLowerCase().startsWith(lowerPartial))
      .map(([key, prop]) => ({
        value: key,
        label: key,
        detail: typeof prop === 'object' && 'type' in prop ? String(prop.type) : undefined
      }))
      .slice(0, 50);
  }

  /** Sub-commands for verbs that have them */
  const SUBCOMMAND_MAP: Record<string, Array<{ value: string; detail?: string }>> = {
    layout: [
      { value: 'auto', detail: 'Re-arrange all nodes from scratch' },
      { value: 'beautify', detail: 'Normalize spacing, preserve arrangement' }
    ],
    list: [
      { value: 'nodes', detail: 'List all workflow nodes' },
      { value: 'edges', detail: 'List all connections' },
      { value: 'types', detail: 'List available node types' }
    ],
    canvas: [
      { value: 'fitview', detail: 'Fit all nodes into the viewport' },
      { value: 'zoom in', detail: 'Zoom in on the canvas' },
      { value: 'zoom out', detail: 'Zoom out on the canvas' },
      { value: 'zoom', detail: 'Set zoom level (e.g. canvas zoom 1.5)' },
      { value: 'pan', detail: 'Pan to position (e.g. canvas pan 100,200)' },
      { value: 'reset', detail: 'Reset viewport to default' }
    ]
  };

  function computeSuggestions(value: string): Suggestion[] {
    if (!value) return [];

    // Check if we're after "<nodeId>:" — port names or config keys
    const portConfigCtx = getPortOrConfigContext(value);
    if (portConfigCtx !== null) {
      if (portConfigCtx.type === 'configKey') {
        return getConfigKeySuggestions(portConfigCtx.nodeId, portConfigCtx.partial);
      }
      const filter =
        portConfigCtx.type === 'outputPort'
          ? 'output'
          : portConfigCtx.type === 'inputPort'
            ? 'input'
            : 'all';
      return getPortSuggestions(portConfigCtx.nodeId, portConfigCtx.partial, filter);
    }

    // Check if we're at a sub-command position (e.g. "layout <partial>")
    const subCmdContext = getSubcommandContext(value);
    if (subCmdContext !== null) {
      const prefix = subCmdContext.partial.toLowerCase();
      return subCmdContext.options
        .filter((opt) => opt.value.toLowerCase().startsWith(prefix))
        .map((opt) => ({
          value: opt.value,
          label: opt.value,
          detail: opt.detail
        }));
    }

    // Check if we're in a position where node type IDs should be suggested
    const nodeTypeContext = getNodeTypeContext(value);
    if (nodeTypeContext !== null) {
      const prefix = nodeTypeContext.toLowerCase();
      return nodeTypes
        .filter((nt) => nt.id.toLowerCase().startsWith(prefix))
        .map((nt) => ({
          value: nt.id,
          label: nt.id,
          detail: `${nt.name} (${nt.category})`
        }))
        .slice(0, 50);
    }

    // Check if we're at a position expecting a node ID from the workflow
    const nodeIdContext = getNodeIdContext(value);
    if (nodeIdContext !== null) {
      return getWorkflowNodeSuggestions(nodeIdContext.partial);
    }

    // Check if we're at verb position (no space in input yet)
    if (!value.includes(' ')) {
      const prefix = value.toLowerCase();
      return COMMAND_VERBS.filter((v) => v.startsWith(prefix)).map((v) => ({
        value: v,
        label: v
      }));
    }

    return [];
  }

  /**
   * Detect if cursor is at a sub-command position (e.g. "layout <partial>").
   * Returns the verb's sub-command options and the partial typed so far, or null.
   */
  function getSubcommandContext(value: string): {
    partial: string;
    options: Array<{ value: string; detail?: string }>;
  } | null {
    const match = value.match(/^(\w+)\s+(.*)$/i);
    if (!match) return null;
    const verb = match[1].toLowerCase();
    const partial = match[2];
    const options = SUBCOMMAND_MAP[verb];
    if (!options) return null;
    // Only suggest if the partial has no further spaces (still on sub-command)
    if (partial.includes(' ')) return null;
    return { partial, options };
  }

  /**
   * Returns the partial text after "add " or "swap <nodeId> with " if at a
   * node-type position, or null otherwise.
   */
  function getNodeTypeContext(value: string): string | null {
    // "add <partial>"
    const addMatch = value.match(/^add\s+(.*)$/i);
    if (addMatch) return addMatch[1];

    // "swap <nodeId> with <partial>"
    const swapMatch = value.match(/^swap\s+\S+\s+with\s+(.*)$/i);
    if (swapMatch) return swapMatch[1];

    return null;
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function updateAutocomplete() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const suggestions = computeSuggestions(inputValue);
      acSuggestions = suggestions;
      acSelectedIndex = 0;
      acVisible = suggestions.length > 0;
    }, 100);
  }

  function dismissAutocomplete() {
    acVisible = false;
    acSuggestions = [];
    acSelectedIndex = 0;
  }

  function acceptSuggestion(suggestion: Suggestion) {
    // Replace the relevant part of input with the suggestion value
    const portConfigCtx = getPortOrConfigContext(inputValue);
    if (portConfigCtx !== null) {
      // Replace the partial after the colon
      const prefixEnd = inputValue.length - portConfigCtx.partial.length;
      inputValue = inputValue.slice(0, prefixEnd) + suggestion.value;
      dismissAutocomplete();
      inputElement?.focus();
      return;
    }

    const subCmdContext = getSubcommandContext(inputValue);
    if (subCmdContext !== null) {
      // Replace the partial after the verb
      const prefixEnd = inputValue.length - subCmdContext.partial.length;
      inputValue = inputValue.slice(0, prefixEnd) + suggestion.value;
    } else {
      const nodeTypeContext = getNodeTypeContext(inputValue);
      if (nodeTypeContext !== null) {
        // Replace the partial after the command prefix (node type context)
        const prefixEnd = inputValue.length - nodeTypeContext.length;
        inputValue = inputValue.slice(0, prefixEnd) + suggestion.value;
      } else {
        const nodeIdContext = getNodeIdContext(inputValue);
        if (nodeIdContext !== null) {
          // Replace the partial after the command prefix (node ID context)
          const prefixEnd = inputValue.length - nodeIdContext.partial.length;
          inputValue = inputValue.slice(0, prefixEnd) + suggestion.value;
        } else {
          // Replace the whole input (verb position)
          inputValue = suggestion.value;
        }
      }
    }
    dismissAutocomplete();
    inputElement?.focus();
  }

  function addToHistory(command: string) {
    // Don't store duplicate consecutive commands
    if (history.length > 0 && history[history.length - 1] === command) {
      return;
    }
    history.push(command);
    // Drop oldest when full
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
  }

  /**
   * Enter multiline textarea mode for the given set-command prefix.
   * prefixText: e.g. "set node1:prompt", initialValue: partial value already typed
   */
  function enterMultilineMode(prefixText: string, initialValue: string) {
    multilinePrefix = prefixText;
    textareaValue = initialValue;
    multilineMode = true;
    inputValue = '';
    dismissAutocomplete();
    setTimeout(() => textareaElement?.focus(), 0);
  }

  function exitMultilineMode() {
    multilineMode = false;
    multilinePrefix = '';
    textareaValue = '';
    setTimeout(() => inputElement?.focus(), 0);
  }

  function submitMultilineValue() {
    const value = textareaValue;
    const prefix = multilinePrefix; // capture before exitMultilineMode clears it
    exitMultilineMode();
    if (!value.trim()) return;
    const command = `${prefix} """\n${value}\n"""`;
    addToHistory(command);
    onSubmit(command);
  }

  function handleTextareaKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submitMultilineValue();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      exitMultilineMode();
    }
  }

  function handlePaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text/plain');
    if (!text || !text.includes('\n')) return;

    // If already typing a set command, treat multiline paste as the value
    const setMatch = inputValue.match(/^(set\s+\S+?:\S+)\s*(.*)$/i);
    if (setMatch) {
      event.preventDefault();
      enterMultilineMode(setMatch[1], (setMatch[2] ? setMatch[2] + '\n' : '') + text);
      historyIndex = -1;
      savedInput = '';
      return;
    }

    // Multi-line paste: prevent default and batch-submit
    event.preventDefault();
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length <= 1) return;

    // Add each line to history
    for (const line of lines) {
      addToHistory(line);
    }

    if (onBatchSubmit) {
      onBatchSubmit(lines);
    }

    inputValue = '';
    historyIndex = -1;
    savedInput = '';
    dismissAutocomplete();
  }

  function handleKeydown(event: KeyboardEvent) {
    // When autocomplete is visible, intercept navigation keys
    if (acVisible && acSuggestions.length > 0) {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        acSelectedIndex = acSelectedIndex > 0 ? acSelectedIndex - 1 : acSuggestions.length - 1;
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        acSelectedIndex = acSelectedIndex < acSuggestions.length - 1 ? acSelectedIndex + 1 : 0;
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        acceptSuggestion(acSuggestions[acSelectedIndex]);
        return;
      }
      if (event.key === 'Enter') {
        const selected = acSuggestions[acSelectedIndex];
        // If accepting the suggestion wouldn't change the input, execute directly
        const before = inputValue;
        acceptSuggestion(selected);
        if (inputValue !== before) {
          event.preventDefault();
          return;
        }
        // Input unchanged — fall through to submit handler below
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissAutocomplete();
        return;
      }
    }

    if (event.key === 'Enter' && event.shiftKey) {
      // Shift+Enter on a set command → expand to multiline textarea
      const setMatch = inputValue.match(/^(set\s+\S+?:\S+)\s*(.*)$/i);
      if (setMatch) {
        event.preventDefault();
        enterMultilineMode(setMatch[1], setMatch[2]);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const value = inputValue.trim();
      if (value) {
        addToHistory(value);
        onSubmit(value);
        inputValue = '';
        historyIndex = -1;
        savedInput = '';
        dismissAutocomplete();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (history.length === 0) return;
      if (historyIndex === -1) {
        // Save current input before navigating history
        savedInput = inputValue;
        historyIndex = history.length - 1;
      } else if (historyIndex > 0) {
        historyIndex--;
      }
      inputValue = history[historyIndex];
      dismissAutocomplete();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === -1) return;
      if (historyIndex < history.length - 1) {
        historyIndex++;
        inputValue = history[historyIndex];
      } else {
        // Past newest entry — return to saved input
        historyIndex = -1;
        inputValue = savedInput;
      }
      dismissAutocomplete();
    }
  }

  function handleInput() {
    // Typing resets history navigation
    historyIndex = -1;
    updateAutocomplete();
  }
</script>

<div class="console-input" class:console-input--multiline={multilineMode}>
  <span class="console-input__prompt">&gt;</span>
  <div class="console-input__wrapper">
    {#if multilineMode}
      <div class="console-input__multiline-header">
        <span class="console-input__multiline-label">{multilinePrefix}</span>
        <span class="console-input__multiline-hint">Ctrl+Enter to submit · Esc to cancel</span>
      </div>
      <textarea
        bind:this={textareaElement}
        bind:value={textareaValue}
        class="console-input__textarea"
        rows={5}
        spellcheck={false}
        onkeydown={handleTextareaKeydown}
      ></textarea>
    {:else}
      <ConsoleAutocomplete
        suggestions={acSuggestions}
        visible={acVisible}
        selectedIndex={acSelectedIndex}
        onAccept={acceptSuggestion}
        {listboxId}
      />
      <input
        bind:this={inputElement}
        bind:value={inputValue}
        class="console-input__field"
        type="text"
        placeholder="Type a command... (set node:key + Shift+Enter for multiline)"
        spellcheck="false"
        autocomplete="off"
        role="combobox"
        aria-expanded={acVisible}
        aria-controls={listboxId}
        aria-activedescendant={acVisible && acSuggestions.length > 0
          ? `${listboxId}-option-${acSelectedIndex}`
          : undefined}
        onkeydown={handleKeydown}
        oninput={handleInput}
        onpaste={handlePaste}
        onblur={() => dismissAutocomplete()}
      />
    {/if}
  </div>
</div>

<style>
  .console-input {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-top: 1px solid var(--fd-border-muted);
    background-color: var(--fd-background);
    flex-shrink: 0;
  }

  .console-input__prompt {
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--fd-muted-foreground);
    margin-right: 0.5rem;
    user-select: none;
  }

  .console-input__wrapper {
    flex: 1;
    position: relative;
  }

  .console-input__field {
    width: 100%;
    background: none;
    border: none;
    outline: none;
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--fd-foreground);
    padding: 0;
    line-height: 1.5;
  }

  .console-input__field::placeholder {
    color: var(--fd-muted-foreground);
    opacity: 0.6;
  }

  .console-input--multiline {
    align-items: flex-start;
  }

  .console-input--multiline .console-input__prompt {
    margin-top: 0.125rem;
  }

  .console-input__multiline-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.25rem;
  }

  .console-input__multiline-label {
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--fd-foreground);
    font-weight: 500;
  }

  .console-input__multiline-hint {
    font-family: monospace;
    font-size: 0.75rem;
    color: var(--fd-muted-foreground);
    opacity: 0.7;
  }

  .console-input__textarea {
    width: 100%;
    background: none;
    border: 1px solid var(--fd-border-muted);
    border-radius: var(--fd-radius-sm);
    outline: none;
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--fd-foreground);
    padding: 0.375rem 0.5rem;
    line-height: 1.5;
    resize: vertical;
    min-height: 5rem;
  }

  .console-input__textarea:focus {
    border-color: var(--fd-border);
  }
</style>
