<!--
  @component
  The small form Run opens for a workflow that has inputs: a modal titled "Run {workflow name}" with
  one field per input (the Playground's `InterfaceInputForm`), a Run button (Cmd/Ctrl+Enter) and Cancel.

  The dialog only draws and reports; the host (App) owns the values, starts the run and closes it.
  A refused run keeps the dialog open and names the reason under the Run button.

  **Use it for** asking for a workflow's inputs before a run starts from the canvas.
  **Not for** the Playground's own inputs card (use `InterfaceInputForm` there).
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import InterfaceInputForm from './playground/InterfaceInputForm.svelte';
  import PanelHeader from './primitives/PanelHeader.svelte';
  import IconButton from './primitives/IconButton.svelte';
  import Button from './primitives/Button.svelte';
  import type { WorkflowInterfaceEntry } from '../types/index.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** Whether the dialog is open. */
    open: boolean;
    /** The workflow's name, shown in the title. */
    workflowName: string;
    /** The input entries to ask for. */
    entries: WorkflowInterfaceEntry[];
    /** Current values, keyed by entry id. */
    values: Record<string, unknown>;
    /** Called with the complete values on every change. */
    onChange: (values: Record<string, unknown>) => void;
    /** Start the run with the current values. */
    onRun: () => void;
    /** The run is being started: Run shows a spinner. */
    runBusy?: boolean;
    /** Why the last Run did not start. */
    error?: string | null;
    /** Close the dialog without running. */
    onClose: () => void;
  }

  let {
    open,
    workflowName,
    entries,
    values,
    onChange,
    onRun,
    runBusy = false,
    error = null,
    onClose
  }: Props = $props();

  // Unique per instance so two editors on one page do not share a DOM id.
  const uid = $props.id();
  const titleId = `${uid}-run-inputs-title`;

  const labels = $derived(m().runInputsDialog);

  let dialogRef = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (!dialogRef) return;
    if (open && !dialogRef.open) dialogRef.showModal();
    else if (!open && dialogRef.open) dialogRef.close();
  });

  /** Whether the press that led to the click began on the backdrop (the dialog element itself). */
  let pressedOnBackdrop = false;

  function handlePointerDown(event: PointerEvent): void {
    pressedOnBackdrop = event.target === dialogRef;
  }

  // A text selection that starts in a field and ends over the backdrop clicks
  // the dialog too: close only when the press began there as well.
  function handleBackdropClick(event: MouseEvent): void {
    const started = pressedOnBackdrop;
    pressedOnBackdrop = false;
    if (started && event.target === dialogRef) onClose();
  }

  // The native close event also fires for Escape.
  function handleDialogClose(): void {
    if (open) onClose();
  }
</script>

<!-- native <dialog> backdrop click-to-close pattern -->
<dialog
  bind:this={dialogRef}
  class="flowdrop-scope flowdrop-run-inputs"
  data-testid="run-inputs-dialog"
  onpointerdown={handlePointerDown}
  onclick={handleBackdropClick}
  onclose={handleDialogClose}
  aria-labelledby={titleId}
>
  <div class="flowdrop-run-inputs__container">
    <PanelHeader title={labels.title({ name: workflowName })} {titleId}>
      {#snippet actions()}
        <IconButton ariaLabel={labels.close} title={m().common.close} onclick={onClose}>
          <Icon icon="mdi:close" />
        </IconButton>
      {/snippet}
    </PanelHeader>

    <div class="flowdrop-run-inputs__content">
      {#if open}
        <InterfaceInputForm {entries} {values} {onChange} {onRun} {runBusy} {error} />
      {/if}
    </div>

    <div class="flowdrop-run-inputs__footer">
      <Button variant="ghost" data-testid="run-inputs-cancel" onclick={onClose}>
        {m().common.cancel}
      </Button>
    </div>
  </div>
</dialog>

<style>
  .flowdrop-run-inputs {
    position: fixed;
    inset: 0;
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background-color: transparent;
    overflow: hidden;
  }

  .flowdrop-run-inputs::backdrop {
    background-color: var(--fd-backdrop);
    backdrop-filter: blur(4px);
  }

  .flowdrop-run-inputs[open] {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .flowdrop-run-inputs__container {
    display: flex;
    flex-direction: column;
    width: 90vw;
    max-width: 560px;
    max-height: min(80vh, 640px);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-modal-radius);
    box-shadow: var(--fd-shadow-lg);
    overflow: hidden;
  }

  .flowdrop-run-inputs__container :global(.flowdrop-ui-panel-header) {
    height: var(--fd-modal-header-height);
  }

  .flowdrop-run-inputs__container :global(.flowdrop-ui-panel-header__title) {
    font-size: var(--fd-modal-title-size);
  }

  .flowdrop-run-inputs__content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }

  /* The form is a card for the Playground; inside the dialog it fills the width. */
  .flowdrop-run-inputs__content :global(.interface-input-form) {
    max-width: none;
    padding: var(--fd-space-md);
  }

  .flowdrop-run-inputs__footer {
    display: flex;
    justify-content: flex-end;
    padding: var(--fd-space-sm) var(--fd-space-md);
    border-top: 1px solid var(--fd-border);
  }

  @media (max-width: 640px) {
    .flowdrop-run-inputs__container {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      border-radius: 0;
    }
  }
</style>
