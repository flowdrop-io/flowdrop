<!--
  ChatInput Component

  The textarea + Run/Send/Stop button. Reusable input primitive shared by
  ChatPanel (conversational) and ControlPanel (orchestration controls).

  Reads execution state from playgroundStore. Owns its own input string and
  textarea ref; emits sent content via onSendMessage.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import { tick } from 'svelte';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { m } from '$lib/messages/index.js';
  import {
    isCommandInput,
    suggestCommands,
    type CommandOutcome,
    type CommandSuggestion
  } from '../../playground/commands/index.js';
  import { resolveRunAction } from '../../playground/runAction.js';
  import ConsoleAutocomplete from '../console/ConsoleAutocomplete.svelte';

  const fd = getInstance();

  interface Props {
    placeholder?: string;
    /** Show the textarea (default: true). When false, only the Run button is shown. */
    showTextarea?: boolean;
    /** Show the Run button when textarea is hidden (default: true) */
    showRunButton?: boolean;
    /**
     * Message sent when Run is clicked, for hosts that deliberately want the
     * run to begin with a specific chat turn.
     *
     * Setting this opts *out* of {@link onRunWorkflow}: an explicitly
     * configured message is a host's intentional choice and is honoured.
     * Leaving it unset is what lets Run launch without fabricating a turn.
     */
    predefinedMessage?: string;
    onSendMessage?: (content: string) => void;
    onStopExecution?: () => void;
    /**
     * Start a run without posting a chat message.
     *
     * Preferred over `onSendMessage` for the Run button. Sending a message to
     * start a run fabricates a user turn that enters the conversation and is
     * replayed as input on the following turn — indistinguishable downstream
     * from something the user actually typed. Hosts that provide this get a Run
     * button that launches instead.
     */
    onRunWorkflow?: () => void;
    /**
     * When true (the default, the original protocol for hosts using ChatInput
     * directly), a Run click locks Run until the backend posts a message with
     * `enableRun` metadata. The Playground turns it off for turn-port
     * workflows, whose server never sends that message.
     */
    awaitEnableRun?: boolean;
    /**
     * Enable the slash-command lane (default: false).
     *
     * Opt-in because the lane is only safe where the `onSendMessage` handler
     * actually dispatches commands. A surface that forwards input straight to a
     * backend (ChatPanel) would post `/stop` as literal text — faking a command
     * that nothing implements.
     */
    enableCommands?: boolean;
    /** Transient result of the last slash command. Never a session message. */
    commandFeedback?: CommandOutcome | null;
    onDismissCommandFeedback?: () => void;
    /**
     * The first send creates the session, so typing and sending are allowed
     * with none (the editor's Test mode: the test session is created on the
     * first run). By default a session must exist first.
     */
    sessionOptional?: boolean;
  }

  let {
    placeholder,
    showTextarea = true,
    showRunButton = true,
    predefinedMessage,
    onSendMessage,
    onStopExecution,
    onRunWorkflow,
    awaitEnableRun = true,
    enableCommands = false,
    commandFeedback = null,
    onDismissCommandFeedback,
    sessionOptional = false
  }: Props = $props();

  const actions = $derived(m().playground.actions);
  const chat = $derived(m().playground.chat);
  const states = $derived(m().playground.states);

  const commandMessages = $derived(m().playground.commands);

  const resolvedPlaceholder = $derived(placeholder ?? chat.placeholder);
  const resolvedPredefinedMessage = $derived(predefinedMessage ?? chat.predefinedRun);

  const noInputsAvailable = $derived(!showTextarea && !showRunButton);

  let inputValue = $state('');
  let inputField: HTMLTextAreaElement | undefined = $state();

  /**
   * Whether the current input is control traffic rather than pipeline data.
   *
   * Used only to relax the send gate (see {@link canSubmit}). Note that this
   * does *not* make commands typable during a run: the textarea is disabled
   * while `isExecuting`, and stopping a run is the Stop button's job.
   */
  const inputIsCommand = $derived(enableCommands && isCommandInput(inputValue));

  // Unique per instance so two playgrounds on one page don't collide, and
  // shared with the listbox so aria-controls/activedescendant stay consistent.
  const uid = $props.id();
  const listboxId = `${uid}-command-palette-listbox`;

  /**
   * Command palette state.
   *
   * `dismissed` is separate from "no suggestions": pressing Escape must keep the
   * palette shut while the user keeps typing the same command, and only a fresh
   * edit that changes the completion set should bring it back.
   */
  let paletteDismissed = $state(false);

  const paletteSuggestions = $derived(
    enableCommands ? suggestCommands(inputValue, fd.api.config, commandMessages.catalog) : []
  );
  const paletteVisible = $derived(!paletteDismissed && paletteSuggestions.length > 0);

  /**
   * Where the user has moved the highlight, and where it actually lands.
   *
   * Clamped on read rather than corrected in an effect: effects run *after* the
   * DOM updates, so a list that narrows under typing would render one frame
   * with `aria-activedescendant` pointing at an option that no longer exists.
   */
  let paletteCursor = $state(0);
  const paletteIndex = $derived(
    paletteSuggestions.length === 0 ? 0 : Math.min(paletteCursor, paletteSuggestions.length - 1)
  );

  /**
   * Match the textarea's height to its content, capped.
   *
   * Called from every path that changes `inputValue`, not just typing — the
   * height is a function of the content, so anything that sets the content owes
   * it an update.
   */
  function resizeTextarea(): void {
    if (!inputField) return;
    inputField.style.height = 'auto';
    inputField.style.height = `${Math.min(inputField.scrollHeight, 120)}px`;
  }

  function acceptSuggestion(suggestion: CommandSuggestion): void {
    inputValue = suggestion.value;
    paletteDismissed = true;
    paletteCursor = 0;
    tick().then(() => {
      resizeTextarea();
      inputField?.focus({ preventScroll: true });
    });
  }

  /**
   * Commands bypass the send gate; plain text still respects it.
   *
   * This matters for states that are not "executing" but still refuse messages
   * — `awaiting_input` most of all, where the textarea is live but
   * `canSendMessage` is false, so without this a command could be typed and
   * never submitted. Execution itself needs no special case: the button chain
   * already swaps Send for Stop while a run is in flight.
   */
  const canSubmit = $derived(
    inputValue.trim().length > 0 &&
      (inputIsCommand ||
        (sessionOptional
          ? !fd.playground.isExecuting && fd.playground.sessionStatus !== 'awaiting_input'
          : fd.playground.canSendMessage))
  );

  // A plain `let`, not `$state`: bookkeeping for the effect below, never read
  // during render, so writing it inside the effect creates no dependency.
  let wasExecuting = false;

  /** Auto-focus input when execution completes */
  $effect(() => {
    const nowExecuting = fd.playground.isExecuting;
    if (wasExecuting && !nowExecuting && inputField) {
      tick().then(() => inputField?.focus({ preventScroll: true }));
    }
    wasExecuting = nowExecuting;
  });

  function handleSend(): void {
    const trimmedValue = inputValue.trim();
    if (!canSubmit) return;

    onDismissCommandFeedback?.();
    onSendMessage?.(trimmedValue);
    inputValue = '';

    tick().then(() => {
      resizeTextarea();
      inputField?.focus({ preventScroll: true });
    });
  }

  function handleKeydown(event: KeyboardEvent): void {
    // The palette owns navigation keys while it is open, mirroring the editor
    // console so the two surfaces behave identically.
    if (paletteVisible) {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        paletteCursor = paletteIndex > 0 ? paletteIndex - 1 : paletteSuggestions.length - 1;
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        paletteCursor = paletteIndex < paletteSuggestions.length - 1 ? paletteIndex + 1 : 0;
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        acceptSuggestion(paletteSuggestions[paletteIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        // Escape must not reach an ancestor here: PlaygroundModal closes on
        // Escape, so without this, dismissing the palette would also close the
        // whole playground.
        event.stopPropagation();
        paletteDismissed = true;
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const suggestion = paletteSuggestions[paletteIndex];
        // Compare trimmed: a completion for an argument-taking command differs
        // from a fully typed name only by its trailing space, and `/run` +
        // Enter should start a run rather than silently insert a space.
        if (suggestion.value.trim() !== inputValue.trim()) {
          acceptSuggestion(suggestion);
          return;
        }
        handleSend();
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleStop(): void {
    onStopExecution?.();
  }

  function handleRun(): void {
    if (!fd.playground.canRun) return;
    if (awaitEnableRun) fd.playground.lockRunUntilEnabled();

    const action = resolveRunAction({
      canLaunch: onRunWorkflow != null,
      predefinedMessage,
      defaultMessage: resolvedPredefinedMessage
    });

    if (action.kind === 'launch') {
      onRunWorkflow?.();
      return;
    }

    onSendMessage?.(action.content);

    // A slash command (a `predefinedMessage` of `/help`, say) runs without
    // taking a turn, so no `enableRun` message will ever follow to free the lock.
    if (awaitEnableRun && isCommandInput(action.content)) fd.playground.releaseRunLock();
  }

  function handleInput(): void {
    // Typing re-opens the palette: a dismissal applies to the text it was
    // dismissed on, not to the rest of the session.
    paletteDismissed = false;
    // ...and restarts the highlight at the top, as the editor console does.
    // Without this the cursor survives a narrowing list: highlight the third
    // entry, type one more character, and you are now pointed at whatever
    // happens to be third in the *new* list, which is not what you were aiming
    // at. Clamping keeps it in range; only resetting keeps it meaningful.
    paletteCursor = 0;

    resizeTextarea();
  }
</script>

<div class="chat-input">
  {#if noInputsAvailable}
    <div class="chat-input__no-inputs">
      <Icon icon="mdi:information-outline" />
      <span>{states.viewOnlyHelp}</span>
    </div>
  {:else}
    <!--
      The live region is always present and only its *contents* come and go.
      A region inserted with its text already in place is usually announced by
      nothing at all — screen readers watch established regions for changes.

      One fixed politeness, too, rather than swapping role between `status` and
      `alert`: the `{#if}` reuses this node, and role changes on a live node are
      not reliably re-evaluated. Severity is carried visually instead.
    -->
    <div class="chat-input__command-feedback-region" role="status" aria-live="polite">
      {#if commandFeedback}
        <div
          class="chat-input__command-feedback chat-input__command-feedback--{commandFeedback.status}"
        >
          <span class="chat-input__command-feedback-text">{commandFeedback.message}</span>
          <button
            type="button"
            class="chat-input__command-feedback-dismiss"
            onclick={() => onDismissCommandFeedback?.()}
            aria-label={commandMessages.dismiss}
          >
            <Icon icon="mdi:close" />
          </button>
        </div>
      {/if}
    </div>
    <div class="chat-input__container" class:chat-input__container--run-only={!showTextarea}>
      {#if showTextarea}
        <div class="chat-input__wrapper">
          {#if enableCommands}
            <ConsoleAutocomplete
              suggestions={paletteSuggestions}
              visible={paletteVisible}
              selectedIndex={paletteIndex}
              onAccept={acceptSuggestion}
              {listboxId}
            />
          {/if}
          <!--
            `role="combobox"` on a <textarea> is a deliberate, non-conforming
            choice, recorded here so it is not "fixed" by guesswork later.

            ARIA in HTML permits no role on <textarea> other than its implicit
            `textbox`, and the ARIA 1.2 combobox pattern assumes a single-line
            input. But there is no conforming pattern for "multi-line composer
            with completions", and the strictly-valid alternative — implicit
            `textbox` plus `aria-activedescendant`, dropping `aria-expanded`
            (which `textbox` does not support) — leaves no way to announce that
            the palette opened at all.

            We take the announcement over the conformance, which is what
            comparable chat composers ship. Revisit if ARIA gains a real pattern
            for this, or if testing shows a screen reader handles it badly.
          -->
          <textarea
            bind:this={inputField}
            bind:value={inputValue}
            class="chat-input__textarea"
            placeholder={resolvedPlaceholder}
            rows="1"
            disabled={fd.playground.isExecuting ||
              (!sessionOptional && !fd.playground.currentSession)}
            onkeydown={handleKeydown}
            oninput={handleInput}
            onblur={() => (paletteDismissed = true)}
            autocomplete="off"
            role={enableCommands ? 'combobox' : undefined}
            aria-expanded={enableCommands ? paletteVisible : undefined}
            aria-controls={enableCommands ? listboxId : undefined}
            aria-activedescendant={paletteVisible
              ? `${listboxId}-option-${paletteIndex}`
              : undefined}
          ></textarea>
        </div>
      {/if}

      {#if fd.playground.isExecuting}
        <button
          type="button"
          class="chat-input__stop-btn"
          onclick={handleStop}
          title={actions.stopTitle}
          aria-label={actions.stopTitle}
        >
          <Icon icon="mdi:stop" />
          {actions.stop}
        </button>
      {:else if showTextarea}
        <button
          type="button"
          class="chat-input__send-btn"
          onclick={handleSend}
          disabled={!canSubmit}
          title={actions.sendTitle}
          aria-label={actions.sendTitle}
        >
          {actions.send}
        </button>
      {:else if showRunButton}
        {@const runLabel = fd.playground.canRun ? actions.runTitle : actions.runWaitingTitle}
        <button
          type="button"
          class="chat-input__run-btn"
          onclick={handleRun}
          disabled={!fd.playground.canRun}
          title={runLabel}
          aria-label={runLabel}
        >
          <Icon icon="mdi:play" />
          {actions.run}
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .chat-input {
    flex-shrink: 0;
    padding: var(--fd-space-xl) var(--fd-space-3xl) var(--fd-space-3xl);
    background-color: var(--fd-background);
    border-top: 1px solid var(--fd-border-muted);
  }

  .chat-input__container {
    display: flex;
    align-items: flex-end;
    gap: var(--fd-space-md);
    max-width: 760px;
    margin: 0 auto;
  }

  .chat-input__container--run-only {
    justify-content: flex-end;
  }

  .chat-input__command-feedback {
    display: flex;
    align-items: flex-start;
    gap: var(--fd-space-sm);
    max-width: 760px;
    margin: 0 auto var(--fd-space-sm);
    padding: var(--fd-space-sm) var(--fd-space-md);
    border-radius: var(--fd-radius-md);
    font-size: var(--fd-font-size-sm);
    line-height: 1.4;
  }

  .chat-input__command-feedback-text {
    flex: 1;
    /* /help returns a newline-separated list — keep its shape. */
    white-space: pre-wrap;
  }

  /*
   * Status tokens, not literals: `--fd-*-muted` is a translucent tint that is
   * redefined for dark mode, so these follow the theme. Hardcoded pastels do
   * not, and rendered as bright blocks on a dark UI.
   */
  .chat-input__command-feedback--ok {
    background-color: var(--fd-success-muted);
    color: var(--fd-success);
  }

  .chat-input__command-feedback--info {
    background-color: var(--fd-info-muted);
    color: var(--fd-info);
  }

  .chat-input__command-feedback--error {
    background-color: var(--fd-error-muted);
    color: var(--fd-error);
  }

  .chat-input__command-feedback-dismiss {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
  }

  .chat-input__command-feedback-dismiss:hover {
    opacity: 1;
  }

  .chat-input__wrapper {
    flex: 1;
    display: flex;
    align-items: flex-end;
    /* Positioning context for the command palette, which sits above the input. */
    position: relative;
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-xl);
    padding: var(--fd-space-sm) var(--fd-space-md);
    transition:
      border-color var(--fd-transition-fast),
      box-shadow var(--fd-transition-fast);
  }

  .chat-input__wrapper:focus-within {
    border-color: var(--fd-primary);
  }

  .chat-input__textarea {
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    font-family: inherit;
    font-size: var(--fd-text-base);
    line-height: var(--fd-leading-normal);
    max-height: 120px;
    background: transparent;
    color: var(--fd-foreground);
  }

  .chat-input__textarea::placeholder {
    color: var(--fd-muted-foreground);
  }

  .chat-input__textarea:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .chat-input__send-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--fd-space-sm) var(--fd-space-2xl);
    border: none;
    border-radius: var(--fd-radius-lg);
    background-color: var(--fd-foreground);
    color: var(--fd-background);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    flex-shrink: 0;
  }

  .chat-input__send-btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .chat-input__send-btn:disabled {
    background-color: var(--fd-foreground);
    color: var(--fd-background);
    opacity: 0.3;
    cursor: not-allowed;
  }

  .chat-input__stop-btn {
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-sm) var(--fd-space-xl);
    border: none;
    border-radius: var(--fd-radius-lg);
    background-color: var(--fd-error);
    color: var(--fd-error-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
    flex-shrink: 0;
  }

  .chat-input__stop-btn:hover {
    background-color: var(--fd-error-hover);
  }

  .chat-input__run-btn {
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-sm) var(--fd-space-2xl);
    border: none;
    border-radius: var(--fd-radius-lg);
    background-color: var(--fd-success);
    color: var(--fd-success-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    flex-shrink: 0;
  }

  .chat-input__run-btn:hover:not(:disabled) {
    background-color: var(--fd-success-hover);
  }

  .chat-input__run-btn:disabled {
    background-color: var(--fd-border);
    color: var(--fd-muted-foreground);
    cursor: not-allowed;
  }

  .chat-input__no-inputs {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-xl);
    background-color: var(--fd-muted);
    border-radius: var(--fd-radius-lg);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    max-width: 760px;
    margin: 0 auto;
  }

  @media (max-width: 640px) {
    .chat-input {
      padding: var(--fd-space-md) var(--fd-space-xl) var(--fd-space-xl);
    }

    .chat-input__container {
      gap: var(--fd-space-xs);
    }

    .chat-input__send-btn,
    .chat-input__stop-btn,
    .chat-input__run-btn {
      padding: var(--fd-space-xs) var(--fd-space-xl);
    }
  }
</style>
