<!--
  ConsoleInput Component
  Single-line command input with prompt prefix, Enter-to-submit, Escape-to-close
  Includes autocomplete for command verbs and node type IDs
  Styled with BEM syntax matching CommandConsole pattern
-->

<script lang="ts">
  import type { NodeMetadata } from "$lib/types/index.js";
  import ConsoleAutocomplete, { type Suggestion } from "./ConsoleAutocomplete.svelte";

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

  let inputValue = $state("");
  let inputElement: HTMLInputElement | undefined = $state();

  // Command history state
  const MAX_HISTORY = 100;
  let history: string[] = $state([]);
  let historyIndex = $state(-1);
  let savedInput = $state("");

  // Autocomplete state
  let acVisible = $state(false);
  let acSelectedIndex = $state(0);
  let acSuggestions: Suggestion[] = $state([]);

  const COMMAND_VERBS = [
    "add", "delete", "rename", "set", "get", "info", "config", "select",
    "connect", "disconnect", "list", "undo", "redo", "help", "clear",
    "swap", "move", "layout",
  ];

  $effect(() => {
    if (open && inputElement) {
      inputElement.focus();
    }
  });

  function computeSuggestions(value: string): Suggestion[] {
    if (!value) return [];

    // Check if we're in a position where node type IDs should be suggested
    const nodeTypeContext = getNodeTypeContext(value);
    if (nodeTypeContext !== null) {
      const prefix = nodeTypeContext.toLowerCase();
      return nodeTypes
        .filter((nt) => nt.id.toLowerCase().startsWith(prefix))
        .map((nt) => ({
          value: nt.id,
          label: nt.id,
          detail: `${nt.name} (${nt.category})`,
        }))
        .slice(0, 50);
    }

    // Check if we're at verb position (no space in input yet)
    if (!value.includes(" ")) {
      const prefix = value.toLowerCase();
      return COMMAND_VERBS
        .filter((v) => v.startsWith(prefix))
        .map((v) => ({ value: v, label: v }));
    }

    return [];
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

  function updateAutocomplete() {
    const suggestions = computeSuggestions(inputValue);
    acSuggestions = suggestions;
    acSelectedIndex = 0;
    acVisible = suggestions.length > 0;
  }

  function dismissAutocomplete() {
    acVisible = false;
    acSuggestions = [];
    acSelectedIndex = 0;
  }

  function acceptSuggestion(suggestion: Suggestion) {
    // Replace the relevant part of input with the suggestion value
    const nodeTypeContext = getNodeTypeContext(inputValue);
    if (nodeTypeContext !== null) {
      // Replace the partial after the command prefix
      const prefixEnd = inputValue.length - nodeTypeContext.length;
      inputValue = inputValue.slice(0, prefixEnd) + suggestion.value;
    } else {
      // Replace the whole input (verb position)
      inputValue = suggestion.value;
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

  function handlePaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData("text/plain");
    if (!text || !text.includes("\n")) return;

    // Multi-line paste: prevent default and batch-submit
    event.preventDefault();
    const lines = text
      .split("\n")
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

    inputValue = "";
    historyIndex = -1;
    savedInput = "";
    dismissAutocomplete();
  }

  function handleKeydown(event: KeyboardEvent) {
    // When autocomplete is visible, intercept navigation keys
    if (acVisible && acSuggestions.length > 0) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        acSelectedIndex = acSelectedIndex > 0
          ? acSelectedIndex - 1
          : acSuggestions.length - 1;
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        acSelectedIndex = acSelectedIndex < acSuggestions.length - 1
          ? acSelectedIndex + 1
          : 0;
        return;
      }
      if (event.key === "Tab" || event.key === "Enter") {
        event.preventDefault();
        acceptSuggestion(acSuggestions[acSelectedIndex]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        dismissAutocomplete();
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const value = inputValue.trim();
      if (value) {
        addToHistory(value);
        onSubmit(value);
        inputValue = "";
        historyIndex = -1;
        savedInput = "";
        dismissAutocomplete();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowUp") {
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
    } else if (event.key === "ArrowDown") {
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

<div class="console-input">
  <span class="console-input__prompt">&gt;</span>
  <div class="console-input__wrapper">
    <ConsoleAutocomplete
      suggestions={acSuggestions}
      visible={acVisible}
      selectedIndex={acSelectedIndex}
      onAccept={acceptSuggestion}
    />
    <input
      bind:this={inputElement}
      bind:value={inputValue}
      class="console-input__field"
      type="text"
      placeholder="Type a command..."
      spellcheck="false"
      autocomplete="off"
      role="combobox"
      aria-expanded={acVisible}
      aria-controls="console-autocomplete-listbox"
      aria-activedescendant={acVisible && acSuggestions.length > 0 ? `console-autocomplete-option-${acSelectedIndex}` : undefined}
      onkeydown={handleKeydown}
      oninput={handleInput}
      onpaste={handlePaste}
      onblur={() => dismissAutocomplete()}
    />
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
</style>
