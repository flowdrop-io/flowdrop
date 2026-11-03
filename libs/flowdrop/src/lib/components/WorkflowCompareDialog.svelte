<!--
  Workflow Compare Dialog

  Lists, in plain words, what differs between your version of a workflow and
  the saved one, and lets the person keep theirs, load the saved one, or cancel.
  Mount it when a comparison is wanted; it opens as a modal and puts focus back
  on the opener when it goes away.
-->

<script lang="ts">
  import Button from './primitives/Button.svelte';
  import { onMount } from 'svelte';
  import { m } from '$lib/messages/index.js';
  import type { WorkflowComparison } from '$lib/utils/workflowCompare.js';

  interface Props {
    comparison: WorkflowComparison;
    onKeepMine: () => void;
    onLoadTheirs: () => void;
    onClose: () => void;
  }

  let { comparison, onKeepMine, onLoadTheirs, onClose }: Props = $props();

  const uid = $props.id();
  const titleId = `${uid}-compare-title`;

  let dialogRef = $state<HTMLDialogElement | null>(null);

  onMount(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef?.showModal();
    return () => {
      if (dialogRef?.open) dialogRef.close();
      opener?.focus?.();
    };
  });

  const only = (n: number) => m().compare.wiresOnly({ n });

  const mineLines = $derived([
    ...comparison.nodesOnlyMine.map((n) => m().compare.stepOnly({ label: n.label })),
    ...(comparison.edgesOnlyMine > 0 ? [only(comparison.edgesOnlyMine)] : [])
  ]);
  const theirLines = $derived([
    ...comparison.nodesOnlyTheirs.map((n) => m().compare.stepOnly({ label: n.label })),
    ...(comparison.edgesOnlyTheirs > 0 ? [only(comparison.edgesOnlyTheirs)] : [])
  ]);
  const bothLines = $derived([
    ...(comparison.name
      ? [m().compare.name({ mine: comparison.name.mine, theirs: comparison.name.theirs })]
      : []),
    ...(comparison.description ? [m().compare.description] : []),
    ...comparison.nodesChanged.flatMap((n) =>
      n.what.map((w) =>
        w === 'settings'
          ? m().compare.stepSettings({ label: n.label })
          : w === 'label'
            ? m().compare.stepLabel({ label: n.label })
            : m().compare.stepPosition({ label: n.label })
      )
    ),
    ...(comparison.interfaceChanged ? [m().compare.interface] : []),
    ...(comparison.chatChanged ? [m().compare.chat] : [])
  ]);

  const groups = $derived([
    { heading: m().compare.onlyMine, lines: mineLines },
    { heading: m().compare.onlyTheirs, lines: theirLines },
    { heading: m().compare.changedInBoth, lines: bothLines }
  ]);
</script>

<dialog
  bind:this={dialogRef}
  class="flowdrop-scope flowdrop-compare-dialog"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    onClose();
  }}
>
  <div class="flowdrop-compare-dialog__container">
    <h2 id={titleId} class="flowdrop-compare-dialog__title">{m().compare.title}</h2>

    <div class="flowdrop-compare-dialog__body">
      {#if comparison.same}
        <p>{m().compare.none}</p>
      {:else}
        {#each groups as group (group.heading)}
          {#if group.lines.length > 0}
            <section>
              <h3 class="flowdrop-compare-dialog__heading">{group.heading}</h3>
              <ul>
                {#each group.lines as line, i (`${i}:${line}`)}
                  <li>{line}</li>
                {/each}
              </ul>
            </section>
          {/if}
        {/each}
      {/if}
    </div>

    <div class="flowdrop-compare-dialog__actions">
      <Button variant="primary" onclick={onKeepMine}>{m().compare.keepMine}</Button>
      <Button onclick={onLoadTheirs}>{m().compare.loadTheirs}</Button>
      <Button onclick={onClose}>{m().compare.cancel}</Button>
    </div>
  </div>
</dialog>

<style>
  .flowdrop-compare-dialog {
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
  }

  .flowdrop-compare-dialog::backdrop {
    background-color: var(--fd-backdrop);
  }

  .flowdrop-compare-dialog[open] {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .flowdrop-compare-dialog__container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 90vw;
    max-width: 560px;
    max-height: min(80vh, 640px);
    padding: 1.25rem;
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-modal-radius);
  }

  .flowdrop-compare-dialog__title {
    margin: 0;
    font-size: var(--fd-modal-title-size);
  }

  .flowdrop-compare-dialog__body {
    overflow-y: auto;
    min-height: 0;
  }

  .flowdrop-compare-dialog__heading {
    margin: 0 0 0.25rem;
    font-size: var(--fd-text-sm);
  }

  .flowdrop-compare-dialog__body ul {
    margin: 0 0 1rem;
    padding-left: 1.25rem;
  }

  .flowdrop-compare-dialog__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
  }
</style>
