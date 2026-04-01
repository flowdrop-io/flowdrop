<!--
  ConsoleInput Component
  Single-line command input with prompt prefix, Enter-to-submit, Escape-to-close
  Styled with BEM syntax matching CommandConsole pattern
-->

<script lang="ts">
  interface Props {
    /** Whether the console is currently visible/open */
    open: boolean;
    /** Called when user submits a command (Enter key) */
    onSubmit: (value: string) => void;
    /** Called when user pastes multiple lines */
    onBatchSubmit?: (lines: string[]) => void;
    /** Called when user presses Escape to close the console */
    onClose: () => void;
  }

  let { open, onSubmit, onBatchSubmit, onClose }: Props = $props();

  let inputValue = $state("");
  let inputElement: HTMLInputElement | undefined = $state();

  // Command history state
  const MAX_HISTORY = 100;
  let history: string[] = $state([]);
  let historyIndex = $state(-1);
  let savedInput = $state("");

  $effect(() => {
    if (open && inputElement) {
      inputElement.focus();
    }
  });

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
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const value = inputValue.trim();
      if (value) {
        addToHistory(value);
        onSubmit(value);
        inputValue = "";
        historyIndex = -1;
        savedInput = "";
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
    }
  }

  function handleInput() {
    // Typing resets history navigation
    historyIndex = -1;
  }
</script>

<div class="console-input">
  <span class="console-input__prompt">&gt;</span>
  <input
    bind:this={inputElement}
    bind:value={inputValue}
    class="console-input__field"
    type="text"
    placeholder="Type a command..."
    spellcheck="false"
    autocomplete="off"
    onkeydown={handleKeydown}
    oninput={handleInput}
    onpaste={handlePaste}
  />
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

  .console-input__field {
    flex: 1;
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
