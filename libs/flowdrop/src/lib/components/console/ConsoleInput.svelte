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
    /** Called when user presses Escape to close the console */
    onClose: () => void;
  }

  let { open, onSubmit, onClose }: Props = $props();

  let inputValue = $state("");
  let inputElement: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (open && inputElement) {
      inputElement.focus();
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const value = inputValue.trim();
      if (value) {
        onSubmit(value);
        inputValue = "";
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
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
