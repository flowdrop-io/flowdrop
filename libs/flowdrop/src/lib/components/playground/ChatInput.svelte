<!--
  ChatInput Component

  The Composer + slash-command palette, or the Run button for a workflow with
  no chat. Shared by ChatPanel (conversational) and ControlPanel
  (orchestration controls).

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
  import { performRun } from '../../playground/runAction.js';
  import Button from '../primitives/Button.svelte';
  import Composer from '../primitives/Composer.svelte';
  import Notice from '../primitives/Notice.svelte';
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
    /**
     * Runs before a send or Run goes out; resolves `false` to hold it back
     * (the typed text stays). The editor's Playground saves the workflow here.
     * Slash commands skip it.
     */
    beforeSend?: () => Promise<boolean>;
    /**
     * `beforeSend` has something to do now (unsaved edits): the button says so,
     * "Save & send" or "Save & run".
     */
    saveFirst?: boolean;
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
    sessionOptional = false,
    beforeSend,
    saveFirst = false
  }: Props = $props();

  const actions = $derived(m().playground.actions);
  const chat = $derived(m().playground.chat);
  const states = $derived(m().playground.states);

  const commandMessages = $derived(m().playground.commands);

  const resolvedPlaceholder = $derived(placeholder ?? chat.placeholder);
  const resolvedPredefinedMessage = $derived(predefinedMessage ?? chat.predefinedRun);

  const noInputsAvailable = $derived(!showTextarea && !showRunButton);

  let inputValue = $state('');
  /** `beforeSend` is running: the composer waits for it. */
  let preparing = $state(false);
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

  function acceptSuggestion(suggestion: CommandSuggestion): void {
    inputValue = suggestion.value;
    paletteDismissed = true;
    paletteCursor = 0;
    tick().then(() => inputField?.focus({ preventScroll: true }));
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
      !preparing &&
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

  /** Run `beforeSend`; `false` means hold the send back. */
  async function prepare(): Promise<boolean> {
    if (!beforeSend) return true;
    preparing = true;
    try {
      return await beforeSend();
    } finally {
      preparing = false;
    }
  }

  async function handleSend(): Promise<void> {
    const trimmedValue = inputValue.trim();
    if (!canSubmit) return;

    if (beforeSend && !inputIsCommand && !(await prepare())) return;

    onDismissCommandFeedback?.();
    onSendMessage?.(trimmedValue);
    inputValue = '';

    tick().then(() => inputField?.focus({ preventScroll: true }));
  }

  function handleKeydown(event: KeyboardEvent): void {
    // IME: Enter / arrows pick a candidate, not a palette entry (keyCode 229 is Safari).
    if (event.isComposing || event.keyCode === 229) return;
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

    // Plain Enter is the Composer's: it submits through `onsubmit`.
  }

  function handleStop(): void {
    onStopExecution?.();
  }

  function handleRun(): Promise<void> {
    return performRun({
      playground: fd.playground,
      preparing,
      beforeSend,
      setPreparing: (value) => (preparing = value),
      awaitEnableRun,
      onRunWorkflow,
      onSendMessage,
      predefinedMessage,
      defaultMessage: resolvedPredefinedMessage
    });
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
  }
</script>

<div class="chat-input">
  {#if noInputsAvailable}
    <Notice tone="info" role="note" class="chat-input__no-inputs">{states.viewOnlyHelp}</Notice>
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
        <Notice
          class="chat-input__command-feedback chat-input__command-feedback--{commandFeedback.status}"
          tone={commandFeedback.status === 'ok'
            ? 'success'
            : commandFeedback.status === 'error'
              ? 'error'
              : 'info'}
          role="status"
          dismissLabel={commandMessages.dismiss}
          ondismiss={() => onDismissCommandFeedback?.()}
        >
          <span class="chat-input__command-feedback-text">{commandFeedback.message}</span>
        </Notice>
      {/if}
    </div>
    <div class="chat-input__container" class:chat-input__container--run-only={!showTextarea}>
      {#if showTextarea}
        <!-- Positioning context for the command palette, which sits above the composer. -->
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
          <Composer
            bind:value={inputValue}
            bind:element={inputField}
            placeholder={resolvedPlaceholder}
            disabled={fd.playground.isExecuting ||
              preparing ||
              (!sessionOptional && !fd.playground.currentSession)}
            busy={fd.playground.isExecuting}
            onstop={handleStop}
            sendDisabled={!canSubmit}
            sendLabel={saveFirst ? actions.saveAndSendTitle : actions.sendTitle}
            hint={preparing ? actions.saving : saveFirst ? actions.saveFirstHint : undefined}
            onsubmit={() => void handleSend()}
            onkeydown={handleKeydown}
            oninput={handleInput}
            onblur={() => (paletteDismissed = true)}
            inputProps={{
              autocomplete: 'off',
              role: enableCommands ? 'combobox' : undefined,
              'aria-expanded': enableCommands ? paletteVisible : undefined,
              'aria-controls': enableCommands ? listboxId : undefined,
              'aria-activedescendant': paletteVisible
                ? `${listboxId}-option-${paletteIndex}`
                : undefined
            }}
          />
        </div>
      {:else if fd.playground.isExecuting}
        <Button
          variant="danger"
          onclick={handleStop}
          title={actions.stopTitle}
          ariaLabel={actions.stopTitle}
        >
          {#snippet leadingIcon()}<Icon icon="mdi:stop" />{/snippet}
          {actions.stop}
        </Button>
      {:else if showRunButton}
        {@const runTitle = fd.playground.canRun
          ? saveFirst
            ? actions.saveAndRunTitle
            : actions.runTitle
          : actions.runWaitingTitle}
        <Button
          variant="primary"
          onclick={handleRun}
          disabled={!fd.playground.canRun || preparing}
          loading={preparing}
          title={runTitle}
          ariaLabel={runTitle}
        >
          {#snippet leadingIcon()}<Icon icon="mdi:play" />{/snippet}
          {preparing ? actions.saving : saveFirst ? actions.saveAndRun : actions.run}
        </Button>
      {/if}
    </div>
    {#if fd.playground.launchError}
      <Notice tone="error" class="chat-input__launch-error">{fd.playground.launchError}</Notice>
    {/if}
  {/if}
</div>

<style>
  .chat-input {
    flex-shrink: 0;
    padding: var(--fd-space-xs) var(--fd-space-sm) var(--fd-space-sm);
    background-color: var(--fd-background);
  }

  .chat-input__container {
    display: flex;
    align-items: flex-end;
    max-width: 760px;
    margin: 0 auto;
  }

  .chat-input__container--run-only {
    justify-content: flex-end;
  }

  .chat-input__wrapper {
    flex: 1;
    /* Lets the field shrink so a narrow dock keeps the buttons inside. */
    min-width: 0;
    /* Positioning context for the command palette, which sits above the composer. */
    position: relative;
  }

  .chat-input :global(.chat-input__command-feedback),
  .chat-input :global(.chat-input__launch-error) {
    max-width: 760px;
    margin: 0 auto var(--fd-space-xs);
  }

  .chat-input__command-feedback-text {
    /* /help returns a newline-separated list — keep its shape. */
    white-space: pre-wrap;
  }

  .chat-input :global(.chat-input__launch-error) {
    margin: var(--fd-space-xs) auto 0;
    overflow-wrap: anywhere;
  }
</style>
