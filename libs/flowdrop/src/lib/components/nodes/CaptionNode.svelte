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
  import { m } from '$lib/messages/index.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { getEditorSettings } from '../../stores/settingsStore.svelte.js';
  import { collapseCaptionText, snapCaptionWidth } from '../../utils/captionText.js';

  interface Props {
    id: string;
    data: {
      label: string;
      /**
       * Called when an edit ends: the cleaned text, or `null` when the edit
       * was cancelled. The editor decides whether anything is written.
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
  let measureEl: HTMLSpanElement | undefined = $state();
  let editorEl: HTMLDivElement | undefined = $state();

  let editing = $state(false);
  /** Text as typed while editing; drives live width measurement. */
  let draft = $state('');
  /** Width in px once measured; null renders at the CSS minimum until then. */
  let width = $state<number | null>(null);
  /** The text is cut off by the two-line clamp. */
  let clipped = $state(false);
  let textEl: HTMLDivElement | undefined = $state();

  const label = $derived(props.data.label ?? '');
  const shownText = $derived(editing ? draft : label);
  const showPlaceholder = $derived(editing && draft === '');

  function maxWidth(): number {
    if (!rootEl) return FALLBACK_MAX_WIDTH;
    const raw = getComputedStyle(rootEl).getPropertyValue('--fd-caption-node-max-width');
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_MAX_WIDTH;
  }

  /** Measure the one-line width of the text and snap the node to the grid. */
  function measure(): void {
    if (!measureEl) return;
    const natural = measureEl.getBoundingClientRect().width;
    // getBoundingClientRect is scaled by the viewport zoom; offsetWidth is not.
    const unscaled = measureEl.offsetWidth || natural;
    width = snapCaptionWidth(unscaled + 2 * PADDING_X, getEditorSettings().gridSize, maxWidth());
  }

  function measureClip(): void {
    clipped = !!textEl && textEl.scrollHeight > textEl.clientHeight + 1;
  }

  // Re-measure when the text or the grid changes, and once fonts have loaded.
  $effect(() => {
    void shownText;
    void getEditorSettings().gridSize;
    if (!measureEl) return;
    measure();
    void tick().then(measureClip);
  });

  $effect(() => {
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (cancelled) return;
      measure();
      measureClip();
    });
    return () => {
      cancelled = true;
    };
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

  // Take an edit request addressed to this node.
  $effect(() => {
    if (fd.inlineEdit.requested === props.id) {
      fd.inlineEdit.clear();
      untrack(startEditing);
    }
  });

  // Entering edit mode: fill the box, focus it, select everything. A node that
  // was just added is hidden by xyflow until it has been measured, and a hidden
  // element cannot take focus, so retry for a few frames.
  $effect(() => {
    if (!editing || !editorEl) return;
    const box = editorEl;
    box.textContent = untrack(() => label);

    let frames = 0;
    let raf = 0;
    function focusAndSelect(): void {
      box.focus({ preventScroll: true });
      if (document.activeElement !== box) {
        if (++frames < 30) raf = requestAnimationFrame(focusAndSelect);
        return;
      }
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(box);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    focusAndSelect();
    return () => cancelAnimationFrame(raf);
  });

  function finish(save: boolean, refocusNode: boolean): void {
    if (finished) return;
    finished = true;
    const text = save ? collapseCaptionText(editorEl?.textContent ?? '') : null;
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
   * Wires the edit box with native listeners: keys must not reach xyflow's
   * Delete/Backspace and arrow handling, and a real stopPropagation is needed
   * for that.
   */
  function editable(node: HTMLDivElement) {
    // `plaintext-only` where supported; otherwise plain `true` plus paste
    // handling below, which never lets markup in.
    node.contentEditable = 'plaintext-only';
    if (node.contentEditable !== 'plaintext-only') node.contentEditable = 'true';

    function onKeydown(event: KeyboardEvent): void {
      event.stopPropagation();
      if (event.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true, true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false, true);
      }
    }
    function onBeforeInput(event: InputEvent): void {
      // Newlines are never stored.
      if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
        event.preventDefault();
      }
    }
    function onInput(): void {
      draft = node.textContent ?? '';
    }
    function onPaste(event: ClipboardEvent): void {
      event.preventDefault();
      insertPlainText(event.clipboardData?.getData('text/plain') ?? '');
    }
    function onDrop(event: DragEvent): void {
      event.preventDefault();
    }
    function onBlur(): void {
      finish(true, false);
    }
    // Keep pointer interaction inside the box from selecting or dragging the node.
    function stop(event: Event): void {
      event.stopPropagation();
    }

    node.addEventListener('keydown', onKeydown);
    node.addEventListener('keyup', stop);
    node.addEventListener('beforeinput', onBeforeInput);
    node.addEventListener('input', onInput);
    node.addEventListener('paste', onPaste);
    node.addEventListener('drop', onDrop);
    node.addEventListener('blur', onBlur);
    node.addEventListener('dblclick', stop);
    return {
      destroy() {
        node.removeEventListener('keydown', onKeydown);
        node.removeEventListener('keyup', stop);
        node.removeEventListener('beforeinput', onBeforeInput);
        node.removeEventListener('input', onInput);
        node.removeEventListener('paste', onPaste);
        node.removeEventListener('drop', onDrop);
        node.removeEventListener('blur', onBlur);
        node.removeEventListener('dblclick', stop);
      }
    };
  }
</script>

<!-- Presentational: focus, selection and keyboard activation live on xyflow's
     node wrapper (see UniversalNode). Double-click is a mouse convenience. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flowdrop-caption-node"
  class:flowdrop-caption-node--selected={props.selected}
  class:flowdrop-caption-node--editing={editing}
  bind:this={rootEl}
  style:width={width === null ? undefined : `${width}px`}
  ondblclick={requestEdit}
>
  <!-- Invisible one-line copy of the text; its natural width sets the node width. -->
  <span class="flowdrop-caption-node__measure" aria-hidden="true" bind:this={measureEl}
    >{shownText}</span
  >

  {#if editing}
    <div
      class="flowdrop-caption-node__text flowdrop-caption-node__text--editing nodrag nopan nowheel"
      class:flowdrop-caption-node__text--empty={showPlaceholder}
      role="textbox"
      tabindex="0"
      aria-label={caption.editLabel}
      data-placeholder={caption.placeholder}
      bind:this={editorEl}
      use:editable
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
