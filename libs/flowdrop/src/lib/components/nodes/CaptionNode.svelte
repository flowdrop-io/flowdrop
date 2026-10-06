<!--
  Caption Node Component

  A short, high-contrast line of text (one or two lines) that names or marks
  nearby nodes. Text lives in `data.label`. It has no ports, no config panel
  and no status overlay; it is edited in place (double-click, Enter on the
  focused node, or the context menu) and the editor owns the write through
  `data.onInlineCommit`.
-->

<script lang="ts">
  import { tick, untrack } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { on } from 'svelte/events';
  import { m } from '$lib/messages/index.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { getEditorSettings } from '../../stores/settingsStore.svelte.js';
  import { snapCaptionWidth } from '../../utils/captionText.js';
  import { focusWhenVisible } from '../../utils/focus.js';

  interface Props {
    id: string;
    data: {
      label: string;
      /**
       * Called when an edit ends: the text as typed (the editor cleans it), or
       * `null` when the edit was cancelled. The editor decides whether
       * anything is written.
       */
      onInlineCommit?: (id: string, text: string | null) => void;
    };
    selected?: boolean;
  }

  let props: Props = $props();

  const fd = getInstance();
  const caption = $derived(m().nodes.caption);

  const FALLBACK_MAX_WIDTH = 500;
  /** Horizontal padding on each side, mirrors the CSS. */
  const PADDING_X = 10;

  let rootEl: HTMLDivElement | undefined = $state();
  let editorEl: HTMLDivElement | undefined = $state();
  let textEl: HTMLDivElement | undefined = $state();

  /**
   * One-line widths of the two measure spans, in px. `bind:offsetWidth` is
   * unscaled by the viewport zoom (a bounding rect is not) and updates when a
   * web font arrives, so the width below needs no font-loading hook.
   */
  let textW = $state(0);
  let placeholderW = $state(0);
  /** The node's max width, read from CSS once the node is in the DOM. */
  let maxWidth = $state(FALLBACK_MAX_WIDTH);

  let editing = $state(false);
  /** Text as typed while editing; drives live width measurement. */
  let draft = $state('');
  /** The text is cut off by the two-line clamp. */
  let clipped = $state(false);

  const label = $derived(props.data.label ?? '');
  const shownText = $derived(editing ? draft : label);
  const showPlaceholder = $derived(editing && draft === '');

  /**
   * Width in px, snapped to the grid; undefined until the text has been
   * measured, so the CSS minimum applies. While editing, the node is never
   * narrower than the placeholder, so a new caption opens wide enough to show
   * it on one line.
   */
  const width = $derived(
    textW === 0 && !editing
      ? undefined
      : snapCaptionWidth(
          Math.max(textW, editing ? placeholderW : 0) + 2 * PADDING_X,
          getEditorSettings().gridSize,
          maxWidth
        )
  );

  $effect(() => {
    if (!rootEl) return;
    const parsed = parseFloat(
      getComputedStyle(rootEl).getPropertyValue('--fd-caption-node-max-width')
    );
    maxWidth = Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_MAX_WIDTH;
  });

  // The tooltip shows the full text only when the clamp cuts it. Width and
  // label are what decide that, so they are what re-runs the check.
  $effect(() => {
    void width;
    void label;
    clipped = !!textEl && textEl.scrollHeight > textEl.clientHeight + 1;
  });

  // ---------------------------------------------------------------------------
  // In-place editing
  // ---------------------------------------------------------------------------

  /** Set once an edit has ended so the blur that follows it does not commit again. */
  let finished = true;

  function startEditing(): void {
    if (editing) return;
    draft = label;
    finished = false;
    editing = true;
  }

  function requestEdit(): void {
    fd.inlineEdit.request(props.id);
  }

  // Take edit requests addressed to this node; a request made before this
  // mounted runs as soon as it registers.
  $effect(() => {
    const id = props.id;
    return untrack(() => fd.inlineEdit.register(id, startEditing));
  });

  /** Select everything in the box, once it has focus. */
  function selectContents(box: HTMLElement): void {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(box);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function finish(save: boolean, refocusNode: boolean): void {
    if (finished) return;
    finished = true;
    const text = save ? (editorEl?.textContent ?? '') : null;
    const wrapper = rootEl?.closest<HTMLElement>('.svelte-flow__node') ?? null;
    editing = false;
    props.data.onInlineCommit?.(props.id, text);
    if (refocusNode) {
      // Keep keyboard users on the node.
      void tick().then(() => wrapper?.isConnected && wrapper.focus({ preventScroll: true }));
    }
  }

  function insertPlainText(text: string): void {
    const clean = text.replace(/\s+/g, ' ');
    if (!document.execCommand('insertText', false, clean)) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(clean));
      range.collapse(false);
    }
  }

  /**
   * Sets up the edit box: fills it with the current text and wires native
   * listeners. Keys must not reach xyflow's Delete/Backspace and arrow
   * handling, and `on()` (unlike an `onkeydown` attribute) is not delegated, so
   * a real stopPropagation keeps them away. The box exists only while editing,
   * so this runs once per edit.
   */
  const editable: Attachment<HTMLDivElement> = (node) => {
    // `plaintext-only` where supported; otherwise plain `true` plus paste
    // handling below, which never lets markup in.
    node.contentEditable = 'plaintext-only';
    if (node.contentEditable !== 'plaintext-only') node.contentEditable = 'true';
    node.textContent = untrack(() => label);

    // Keep pointer interaction inside the box from selecting or dragging the node.
    const stop = (event: Event): void => event.stopPropagation();

    const removers = [
      on(node, 'keydown', (event) => {
        event.stopPropagation();
        if (event.isComposing) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          finish(true, true);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          finish(false, true);
        }
      }),
      on(node, 'keyup', stop),
      on(node, 'beforeinput', (event) => {
        // Newlines are never stored.
        if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
          event.preventDefault();
        }
      }),
      on(node, 'input', () => {
        draft = node.textContent ?? '';
      }),
      on(node, 'paste', (event) => {
        event.preventDefault();
        insertPlainText(event.clipboardData?.getData('text/plain') ?? '');
      }),
      on(node, 'drop', (event) => event.preventDefault()),
      on(node, 'blur', () => finish(true, false)),
      on(node, 'dblclick', stop)
    ];
    return () => removers.forEach((remove) => remove());
  };
</script>

<!-- Presentational: focus, selection and keyboard activation live on xyflow's
     node wrapper (see UniversalNode). Double-click is a mouse convenience. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flowdrop-caption-node"
  class:flowdrop-caption-node--selected={props.selected}
  class:flowdrop-caption-node--editing={editing}
  bind:this={rootEl}
  style:width={width === undefined ? undefined : `${width}px`}
  ondblclick={requestEdit}
>
  <!-- Invisible one-line copy of the text; its natural width sets the node width. -->
  <span class="flowdrop-caption-node__measure" aria-hidden="true" bind:offsetWidth={textW}
    >{shownText}</span
  >
  {#if editing}
    <span class="flowdrop-caption-node__measure" aria-hidden="true" bind:offsetWidth={placeholderW}
      >{caption.placeholder}</span
    >
  {/if}

  {#if editing}
    <div
      class="flowdrop-caption-node__text flowdrop-caption-node__text--editing nodrag nopan nowheel"
      class:flowdrop-caption-node__text--empty={showPlaceholder}
      role="textbox"
      tabindex="0"
      aria-label={caption.editLabel}
      data-placeholder={caption.placeholder}
      bind:this={editorEl}
      {@attach editable}
      {@attach focusWhenVisible(selectContents)}
    ></div>
  {:else}
    <div class="flowdrop-caption-node__text" title={clipped ? label : undefined} bind:this={textEl}>
      {label}
    </div>
  {/if}
</div>

<style>
  .flowdrop-caption-node {
    position: relative;
    box-sizing: border-box;
    min-width: 40px;
    max-width: var(--fd-caption-node-max-width, 500px);
    min-height: 40px;
    padding: 10px;
    border-radius: 6px;
    background: var(--fd-caption-node-bg);
    color: var(--fd-caption-node-fg);
    font-family: var(--fd-font-mono);
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
  }

  .flowdrop-caption-node--selected {
    outline: 2px solid var(--fd-ring, currentColor);
    outline-offset: 2px;
  }

  .flowdrop-caption-node__measure {
    position: absolute;
    top: 0;
    left: 0;
    width: max-content;
    max-width: none;
    white-space: nowrap;
    visibility: hidden;
    pointer-events: none;
    font: inherit;
  }

  .flowdrop-caption-node__text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    text-overflow: ellipsis;
    min-height: 20px;
  }

  /* The clamp is lifted while typing so the whole text is visible. */
  .flowdrop-caption-node__text--editing {
    display: block;
    line-clamp: none;
    -webkit-line-clamp: unset;
    overflow: visible;
    outline: none;
    cursor: text;
    white-space: pre-wrap;
    user-select: text;
  }

  .flowdrop-caption-node__text--empty::before {
    content: attr(data-placeholder);
    opacity: 0.55;
    pointer-events: none;
  }
</style>
