<!--
  Composer — auto-growing message input with a send (or stop) button.

  The textarea grows from one 40px row up to `maxRows`, then scrolls. Enter
  sends, Shift+Enter inserts a newline, and Enter while an IME composition is
  active (`isComposing` / keyCode 229) never sends. The component does not
  clear `value` after sending; the caller decides (clear it in `onsubmit`).

  `busy` turns the send button into a stop button (`onstop`) and blocks
  submitting. The long placeholder is truncated with an ellipsis on one line
  instead of being clipped mid-line.

  A host can intercept keys (`onkeydown` runs first; `preventDefault()` there
  keeps the composer's own Enter handling out), listen to `oninput` / `onblur`,
  and set extra attributes on the textarea (`inputProps`, e.g. combobox ARIA for
  a command palette). `sendDisabled` blocks the send button on top of the
  built-in blank/busy/disabled checks, and `sendLabel` renames it ("Save & send").
  The stop button is never greyed out by `disabled`: a run in flight must stay
  stoppable while the field is locked.

  @internal Not exported from any package entry; the API may still change.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import Icon from '@iconify/svelte';
  import { getMessages } from '../../messages/context.js';
  import IconButton from './IconButton.svelte';

  interface Props {
    /** Text content (bindable). */
    value?: string;
    /** Placeholder; defaults to the localized "Type a message". */
    placeholder?: string;
    /** Called with the current value on Enter / send click (value non-blank, not busy, not disabled). */
    onsubmit?: (value: string) => void;
    /** `default` = sans; `mono` = monospace (Console). */
    variant?: 'default' | 'mono';
    /** Disables the textarea and all buttons. */
    disabled?: boolean;
    /** A run is in flight: the send button becomes a stop button and submitting is blocked. */
    busy?: boolean;
    /** Called when the stop button is clicked (only shown while `busy` and when provided). */
    onstop?: () => void;
    /** Maximum visible rows before the textarea scrolls. */
    maxRows?: number;
    /** Replaces the plain attach button: any control(s) left of the send button ("Attach a run", ...). */
    attach?: Snippet;
    /** Shows a plain attach button when `attach` is not given. */
    onattach?: () => void;
    /** Small keyboard hint under the field, e.g. "Enter to send, Shift+Enter for a new line". */
    hint?: string;
    /** The textarea element (bindable), e.g. to focus it after a reply. */
    element?: HTMLTextAreaElement;
    /** Accessible name of the textarea (falls back to the placeholder). */
    ariaLabel?: string;
    /** Accessible name and tooltip of the send button. Defaults to the localized "Send". */
    sendLabel?: string;
    /** Blocks the send button (and Enter) beyond the built-in checks. */
    sendDisabled?: boolean;
    /** Runs on every keydown in the textarea before the composer's own Enter handling. */
    onkeydown?: (event: KeyboardEvent) => void;
    /** Runs on every input event of the textarea. */
    oninput?: (event: Event) => void;
    /** Runs when the textarea loses focus. */
    onblur?: (event: FocusEvent) => void;
    /** Extra attributes on the textarea (role, aria-*, autocomplete). */
    inputProps?: HTMLTextareaAttributes;
    /** Extra classes on the root. */
    class?: string;
  }

  let {
    value = $bindable(''),
    placeholder,
    onsubmit,
    variant = 'default',
    disabled = false,
    busy = false,
    onstop,
    maxRows = 8,
    attach,
    onattach,
    hint,
    element = $bindable(),
    ariaLabel,
    sendLabel,
    sendDisabled = false,
    onkeydown: onHostKeydown,
    oninput,
    onblur,
    inputProps,
    class: className = ''
  }: Props = $props();

  const getMsgs = getMessages();

  const placeholderText = $derived(placeholder ?? getMsgs().composer.placeholder);
  const canSend = $derived(!disabled && !busy && !sendDisabled && value.trim().length > 0);
  const showStop = $derived(busy && !!onstop);

  /** Resize to fit content, capped at `maxRows` lines. */
  function resize() {
    const el = element;
    if (!el) return;
    el.style.height = 'auto';
    const cs = getComputedStyle(el);
    const lineHeight = parseFloat(cs.lineHeight) || 0;
    const padding = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const border = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    const max = lineHeight > 0 ? lineHeight * maxRows + padding + border : Infinity;
    const wanted = el.scrollHeight + border;
    if (wanted > 0) {
      el.style.height = `${Math.min(wanted, max)}px`;
      el.style.overflowY = wanted > max ? 'auto' : 'hidden';
    } else {
      el.style.height = '';
    }
  }

  $effect(() => {
    // Re-measure whenever the text or the row cap changes.
    void value;
    void maxRows;
    resize();
  });

  function submit() {
    if (!canSend) return;
    onsubmit?.(value);
  }

  function onkeydown(event: KeyboardEvent) {
    onHostKeydown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== 'Enter' || event.shiftKey) return;
    // IME: Enter confirms a candidate; keyCode 229 covers Safari firing keydown after compositionend.
    if (event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    submit();
  }
</script>

<div
  class="flowdrop-ui-composer flowdrop-ui-composer--{variant} {className}"
  class:flowdrop-ui-composer--disabled={disabled}
>
  <div class="flowdrop-ui-composer__row">
    <textarea
      bind:this={element}
      bind:value
      class="flowdrop-ui-composer__input"
      rows="1"
      placeholder={placeholderText}
      aria-label={ariaLabel ?? placeholderText}
      {disabled}
      {onkeydown}
      {oninput}
      {onblur}
      {...inputProps}
    ></textarea>
    <div class="flowdrop-ui-composer__buttons">
      {#if attach}
        {@render attach()}
      {:else if onattach}
        <IconButton
          ariaLabel={getMsgs().composer.attach}
          title={getMsgs().composer.attach}
          {disabled}
          onclick={onattach}
        >
          <Icon icon="heroicons:paper-clip" />
        </IconButton>
      {/if}
      {#if showStop}
        <IconButton
          variant="primary"
          ariaLabel={getMsgs().composer.stop}
          title={getMsgs().composer.stop}
          onclick={onstop}
        >
          <Icon icon="heroicons:stop-solid" />
        </IconButton>
      {:else}
        <IconButton
          variant="primary"
          ariaLabel={sendLabel ?? getMsgs().composer.send}
          title={sendLabel ?? getMsgs().composer.send}
          disabled={!canSend}
          onclick={submit}
        >
          <Icon icon="heroicons:arrow-up" />
        </IconButton>
      {/if}
    </div>
  </div>
  {#if hint}
    <p class="flowdrop-ui-composer__hint">{hint}</p>
  {/if}
</div>

<style>
  .flowdrop-ui-composer {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
    box-sizing: border-box;
    width: 100%;
    font-family: var(--fd-font-sans);
  }

  .flowdrop-ui-composer--mono {
    font-family: var(--fd-font-mono);
  }

  .flowdrop-ui-composer__row {
    display: flex;
    align-items: flex-end;
    gap: var(--fd-space-xs);
    box-sizing: border-box;
    padding: var(--fd-composer-pad, calc(var(--fd-space-3xs) - 1px));
    border: 1px solid var(--fd-composer-border, var(--fd-border));
    border-radius: var(--fd-composer-radius, var(--fd-radius-lg));
    background: var(--fd-background);
  }

  .flowdrop-ui-composer__row:focus-within {
    border-color: var(--fd-ring);
    box-shadow: var(--fd-composer-focus-ring, none);
  }

  .flowdrop-ui-composer--disabled .flowdrop-ui-composer__row {
    opacity: 0.6;
  }

  .flowdrop-ui-composer__input {
    flex: 1 1 auto;
    min-width: 0;
    box-sizing: border-box;
    /* Row = 32px field + 2x3px padding + 2x1px border = 40px at rest. */
    min-height: var(--fd-composer-field-height, var(--fd-control-lg));
    margin: 0;
    /* A single line sits on the button's centre: (field - one line) / 2 above and below. */
    padding: calc((var(--fd-composer-field-height, var(--fd-control-lg)) - 1.4em) / 2)
      var(--fd-composer-input-pad-x, var(--fd-space-xs));
    border: 0;
    border-radius: var(--fd-radius-md);
    outline: none;
    background: transparent;
    color: var(--fd-foreground);
    font: inherit;
    font-size: var(--fd-text-sm);
    line-height: 1.4;
    resize: none;
    overflow-y: hidden;
  }

  .flowdrop-ui-composer--mono .flowdrop-ui-composer__input {
    font-size: var(--fd-text-xsm);
  }

  .flowdrop-ui-composer__input::placeholder {
    color: var(--fd-muted-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flowdrop-ui-composer__buttons {
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    flex: none;
    /* Keeps the buttons aligned to the last line, not the middle of a tall field. */
    height: var(--fd-composer-field-height, var(--fd-control-lg));
  }

  /* Nothing to send yet: the theme may quieten the button (Graphite: a grey chip, not a faded ink one). */
  .flowdrop-ui-composer__buttons :global(.flowdrop-ui-icon-button--primary:disabled) {
    background-color: var(--fd-composer-send-idle-bg, var(--fd-primary));
    border-color: var(--fd-composer-send-idle-bg, var(--fd-primary));
    color: var(--fd-composer-send-idle-fg, var(--fd-primary-foreground));
    opacity: var(--fd-composer-send-idle-opacity, 0.5);
  }

  .flowdrop-ui-composer__hint {
    margin: 0;
    padding-inline: var(--fd-space-xs);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-2xs);
  }
</style>
