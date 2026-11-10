<!--
  ImpactConfirm

  The dialog shown before a workflow save that breaks or changes what uses the
  workflow: lists the affected things by severity and asks the person at the
  keyboard. Mounted imperatively by `services/impactGate.ts` into the host's
  container (default `document.body`), one at a time per editor.

  A native modal `<dialog>`: the page behind it is inert, Tab stays inside, and
  the item links are part of the Tab order. Focus starts on Cancel, so Enter
  never saves a breaking change by reflex.
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { getMessages } from '../messages/context.js';
  import type { Messages } from '../messages/types.js';
  import Button from './primitives/Button.svelte';
  import Checkbox from './primitives/Checkbox.svelte';
  import { safeLinkUrl } from '../utils/links.js';
  import type {
    ImpactAnswer,
    ImpactItem,
    ImpactRenamePlace,
    ImpactReport,
    ImpactSeverity,
    SavedCopy
  } from '../types/impact.js';

  interface Props {
    /** What the check found. `null` when the check itself failed (see `error`). */
    report: ImpactReport | null;
    /** The reason the check failed; shown as one line instead of the list. */
    error?: string;
    /** Called exactly once with what the person decided. */
    onResolve: (answer: ImpactAnswer) => void;
    /**
     * Saves the draft as a new workflow (the refused state's "Save as a copy").
     * Rejects with the reason when it fails; the dialog then stays open.
     */
    onSaveAsCopy?: () => Promise<SavedCopy>;
    /**
     * Throws away every unsaved edit and loads the saved version (the refused
     * state's "Discard my changes").
     */
    onDiscard?: () => Promise<void>;
  }

  let { report, error, onResolve, onSaveAsCopy, onDiscard }: Props = $props();

  // The getter is read at initialisation: the context is gone after an await.
  const readMessages = getMessages();
  const m = (): Messages => readMessages();

  const refused = $derived(report?.refused === true);
  const renames = $derived(report?.renames ?? []);
  const renamedPlaces = $derived(renames.reduce((n, r) => n + r.places.length, 0));
  const breakingCount = $derived(
    (report?.items ?? []).filter((item) => item.severity === 'breaks').length
  );
  // Opt-in: nothing a rename touches elsewhere changes unless the person asks.
  let followRenames = $state(false);
  let busy = $state<'copy' | 'discard' | null>(null);
  let actionError = $state('');

  // Unique per instance so two dialogs on one page do not share a DOM id.
  const uid = $props.id();
  const titleId = `${uid}-impact-title`;
  const bodyId = `${uid}-impact-body`;

  const severities: ImpactSeverity[] = ['breaks', 'changes', 'info'];

  const groups = $derived(
    severities
      .map((severity) => ({
        severity,
        items: (report?.items ?? []).filter((item: ImpactItem) => item.severity === severity)
      }))
      .filter((group) => group.items.length > 0)
  );

  let dialogRef = $state<HTMLDialogElement | null>(null);
  let cancelWrap = $state<HTMLElement | null>(null);
  let opener: HTMLElement | null = null;
  let resolved = false;

  onMount(() => {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialogRef && !dialogRef.open) dialogRef.showModal();
    // showModal focuses the first control (a link); the safe answer comes first.
    cancelWrap?.querySelector('button')?.focus();
  });

  function resolve(answer: ImpactAnswer): void {
    if (resolved) return;
    resolved = true;
    if (dialogRef?.open) dialogRef.close();
    if (opener?.isConnected) opener.focus();
    onResolve(answer);
  }

  function save(): void {
    // Only a box the person saw is an answer.
    resolve(renamedPlaces > 0 ? { action: 'save', followRenames } : { action: 'save' });
  }

  async function saveCopy(): Promise<void> {
    if (!onSaveAsCopy || busy) return;
    busy = 'copy';
    actionError = '';
    try {
      const copy = await onSaveAsCopy();
      resolve({ action: 'copied', copy });
    } catch (e) {
      actionError = m().impact.refused.copyFailed({
        message: e instanceof Error ? e.message : String(e)
      });
      busy = null;
    }
  }

  async function discard(): Promise<void> {
    if (!onDiscard || busy) return;
    busy = 'discard';
    actionError = '';
    try {
      await onDiscard();
      resolve({ action: 'discarded' });
    } catch (e) {
      actionError = m().impact.refused.discardFailed({
        message: e instanceof Error ? e.message : String(e)
      });
      busy = null;
    }
  }

  // Escape: the native cancel event. Resolve here and keep the browser from
  // closing the dialog a second time.
  function handleCancel(event: Event): void {
    event.preventDefault();
    if (busy) return;
    resolve({ action: 'cancel' });
  }

  // The browser can close the dialog without a cancel event (a second Escape
  // under CloseWatcher). Whoever is waiting for an answer still gets one.
  // `resolve` ignores this when the dialog was closed by an answer.
  function handleClose(): void {
    resolve({ action: 'cancel' });
  }
</script>

{#snippet label(text: string, url: string | null)}
  {@const href = safeLinkUrl(url)}
  {#if href}
    <a class="fd-impact-confirm__label" {href} target="_blank" rel="noopener">{text}</a>
  {:else}
    <span class="fd-impact-confirm__label">{text}</span>
  {/if}
{/snippet}

{#snippet itemRow(item: ImpactItem, severity: ImpactSeverity)}
  <li class="fd-impact-confirm__item">
    <span class="fd-impact-confirm__severity">{m().impact.severity[severity]}</span>
    <span class="fd-impact-confirm__text">
      {@render label(item.label, item.url)}
      <span class="fd-impact-confirm__message">{item.message}</span>
    </span>
  </li>
{/snippet}

{#snippet placeRow(place: ImpactRenamePlace)}
  <li class="fd-impact-confirm__item fd-impact-confirm__item--place">
    <span class="fd-impact-confirm__text">
      {@render label(place.label, place.url)}
      {#if place.enabled === false}
        <span class="fd-impact-confirm__message">{m().impact.renames.disabledPlace}</span>
      {/if}
      {#if place.message}
        <span class="fd-impact-confirm__message">{place.message}</span>
      {/if}
    </span>
  </li>
{/snippet}

<dialog
  bind:this={dialogRef}
  class="flowdrop-portal fd-impact-confirm"
  data-testid="flowdrop-impact-confirm"
  role="alertdialog"
  aria-labelledby={titleId}
  aria-describedby={bodyId}
  oncancel={handleCancel}
  onclose={handleClose}
>
  <div class="fd-impact-confirm__dialog">
    <header class="fd-impact-confirm__header">
      <h2 id={titleId} class="fd-impact-confirm__title">
        {refused ? m().impact.refused.title : m().impact.title}
      </h2>
    </header>
    <div id={bodyId} class="fd-impact-confirm__body">
      {#if refused}
        <p class="fd-impact-confirm__refused" data-testid="flowdrop-impact-refused">
          {m().impact.refused.body({ count: breakingCount })}
        </p>
        {#if report?.refusedMessage}
          <p class="fd-impact-confirm__message fd-impact-confirm__refused-message">
            {report.refusedMessage}
          </p>
        {/if}
      {/if}
      {#if error}
        <p class="fd-impact-confirm__error" data-testid="flowdrop-impact-error">
          {m().impact.failed({ message: error })}
        </p>
      {/if}
      {#each groups as group (group.severity)}
        <section class="fd-impact-confirm__group" data-severity={group.severity}>
          <h3 class="fd-impact-confirm__group-title">{m().impact[group.severity]}</h3>
          <ul class="fd-impact-confirm__list" role="list">
            {#each group.items as item (item)}
              {@render itemRow(item, group.severity)}
            {/each}
          </ul>
        </section>
      {/each}
      {#if !refused && renames.length > 0}
        <section class="fd-impact-confirm__group" data-testid="flowdrop-impact-renames">
          <h3 class="fd-impact-confirm__group-title">{m().impact.renames.heading}</h3>
          {#each renames as rename (rename.direction + rename.from)}
            <p class="fd-impact-confirm__rename-title">
              {m().impact.renames.title({
                kind: m().impact.renames[rename.direction],
                from: rename.from,
                to: rename.to
              })}
            </p>
            {#if rename.places.length > 0}
              <ul class="fd-impact-confirm__list" role="list">
                {#each rename.places as place (place)}
                  {@render placeRow(place)}
                {/each}
              </ul>
            {:else}
              <p class="fd-impact-confirm__message">{m().impact.renames.noPlaces}</p>
            {/if}
          {/each}
          {#if renamedPlaces > 0}
            <div class="fd-impact-confirm__follow">
              <Checkbox
                data-testid="flowdrop-impact-follow-renames"
                checked={followRenames}
                onchange={(checked) => (followRenames = checked)}
                label={m().impact.renames.follow({ count: renamedPlaces })}
              />
            </div>
          {/if}
        </section>
      {/if}
      {#if actionError}
        <p class="fd-impact-confirm__error" role="alert" data-testid="flowdrop-impact-action-error">
          {actionError}
        </p>
      {/if}
    </div>
    <footer class="fd-impact-confirm__actions">
      <span class="fd-impact-confirm__cancel" bind:this={cancelWrap}>
        <Button
          data-testid="flowdrop-impact-cancel"
          disabled={busy !== null}
          onclick={() => resolve({ action: 'cancel' })}
        >
          {refused ? m().impact.refused.keepEditing : m().impact.cancel}
        </Button>
      </span>
      {#if refused}
        {#if onDiscard}
          <Button data-testid="flowdrop-impact-discard" disabled={busy !== null} onclick={discard}>
            {busy === 'discard' ? m().impact.refused.discarding : m().impact.refused.discard}
          </Button>
        {/if}
        {#if onSaveAsCopy && report?.copyUrl}
          <Button
            variant="primary"
            data-testid="flowdrop-impact-copy"
            disabled={busy !== null}
            onclick={saveCopy}
          >
            {busy === 'copy' ? m().impact.refused.copying : m().impact.refused.copy}
          </Button>
        {/if}
      {:else}
        <Button variant="primary" data-testid="flowdrop-impact-save" onclick={save}>
          {renamedPlaces > 0 && !report?.confirm ? m().impact.saveRenames : m().impact.save}
        </Button>
      {/if}
    </footer>
  </div>
</dialog>

<style>
  /* Mounted on document.body, outside the editor tree. Tokens come from :root
     (tokens.css) and, for a skinned editor, from the editor's scope, which the
     helper copies onto the host element; the dark palette follows
     [data-theme='dark'] on the host element; the buttons are the Button primitive.
     Everything else is set here, because the host page's own element
     rules (h2, h3, p, ul, li, a) reach a dialog on <body>: every element below
     states its margin, padding, font and list style. */
  .fd-impact-confirm {
    position: fixed;
    inset: 0;
    z-index: 10000;
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    box-sizing: border-box;
    margin: 0;
    border: 0;
    color: inherit;
    align-items: center;
    justify-content: center;
    padding: var(--fd-space-xl, 1rem);
    background: color-mix(in srgb, var(--fd-foreground) 50%, transparent);
    backdrop-filter: blur(4px);
    font-family: var(--fd-font-sans, system-ui, sans-serif);
    font-size: var(--fd-text-sm, 0.875rem);
    font-weight: 400;
    line-height: var(--fd-leading-normal, 1.5);
    letter-spacing: normal;
    text-align: left;
    text-transform: none;
  }

  .fd-impact-confirm:not([open]) {
    display: none;
  }

  .fd-impact-confirm[open] {
    display: flex;
  }

  .fd-impact-confirm::backdrop {
    background: transparent;
  }

  .fd-impact-confirm__cancel {
    display: contents;
  }

  .fd-impact-confirm__dialog {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 36rem;
    max-height: calc(100vh - 2 * var(--fd-space-xl, 1rem));
    overflow: hidden;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg, 0.5rem);
    background: var(--fd-background);
    color: var(--fd-foreground);
    box-shadow: var(--fd-shadow-xl);
    animation: fd-impact-confirm-enter 0.2s ease-out;
  }

  @keyframes fd-impact-confirm-enter {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .fd-impact-confirm__header {
    flex-shrink: 0;
    padding: var(--fd-space-xl, 1rem) var(--fd-space-xl, 1rem) var(--fd-space-lg, 0.875rem);
    border-bottom: 1px solid var(--fd-border);
  }

  .fd-impact-confirm__title {
    margin: 0;
    padding: 0;
    font-family: inherit;
    font-size: var(--fd-text-lg, 1.125rem);
    letter-spacing: normal;
    text-transform: none;
    font-weight: 600;
    line-height: var(--fd-leading-tight, 1.3);
    color: var(--fd-foreground);
    overflow-wrap: anywhere;
  }

  .fd-impact-confirm__body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--fd-space-xl, 1rem);
  }

  .fd-impact-confirm__error {
    margin: 0;
    padding: 0;
    font-size: var(--fd-text-sm, 0.875rem);
    color: var(--fd-foreground);
    overflow-wrap: anywhere;
  }

  .fd-impact-confirm__refused,
  .fd-impact-confirm__refused-message,
  .fd-impact-confirm__rename-title {
    margin: 0 0 var(--fd-space-xs, 0.5rem);
    padding: 0;
    overflow-wrap: anywhere;
  }

  .fd-impact-confirm__refused {
    font-weight: 600;
  }

  .fd-impact-confirm__rename-title {
    margin-top: var(--fd-space-sm, 0.625rem);
  }

  .fd-impact-confirm__follow {
    margin-top: var(--fd-space-md, 0.75rem);
  }

  .fd-impact-confirm__error + .fd-impact-confirm__group,
  .fd-impact-confirm__refused-message + .fd-impact-confirm__group,
  .fd-impact-confirm__refused + .fd-impact-confirm__group {
    margin-top: var(--fd-space-lg, 0.875rem);
  }

  .fd-impact-confirm__group + .fd-impact-confirm__group {
    margin-top: var(--fd-space-lg, 0.875rem);
  }

  .fd-impact-confirm__group-title {
    margin: 0 0 var(--fd-space-xs, 0.5rem);
    padding: 0;
    font-family: inherit;
    font-size: var(--fd-text-sm, 0.875rem);
    font-weight: 600;
    letter-spacing: normal;
    text-transform: none;
    line-height: var(--fd-leading-tight, 1.3);
    color: var(--fd-foreground);
  }

  .fd-impact-confirm__list {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md, 0.375rem);
    background: var(--fd-muted);
    overflow: hidden;
  }

  .fd-impact-confirm__item {
    display: flex;
    align-items: baseline;
    gap: var(--fd-space-sm, 0.625rem);
    margin: 0;
    padding: var(--fd-space-xs, 0.5rem) var(--fd-space-md, 0.75rem);
    list-style: none;
  }

  .fd-impact-confirm__item + .fd-impact-confirm__item {
    border-top: 1px solid var(--fd-border-muted);
  }

  .fd-impact-confirm__severity {
    flex-shrink: 0;
    font-size: var(--fd-text-xs, 0.8125rem);
    font-weight: 600;
    text-transform: none;
    color: var(--fd-muted-foreground);
  }

  .fd-impact-confirm__text {
    min-width: 0;
    line-height: var(--fd-leading-normal, 1.5);
    overflow-wrap: anywhere;
  }

  .fd-impact-confirm__label {
    font-weight: 600;
    color: var(--fd-foreground);
  }

  a.fd-impact-confirm__label {
    color: var(--fd-primary);
    text-decoration: underline;
  }

  .fd-impact-confirm__message {
    color: var(--fd-muted-foreground);
  }

  .fd-impact-confirm__actions {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    gap: var(--fd-space-sm, 0.625rem);
    padding: var(--fd-space-lg, 0.875rem) var(--fd-space-xl, 1rem);
    border-top: 1px solid var(--fd-border);
    background: var(--fd-muted);
  }

  @media (max-width: 640px) {
    .fd-impact-confirm {
      padding: 0;
      align-items: flex-end;
    }

    .fd-impact-confirm__dialog {
      max-width: 100%;
      max-height: 100vh;
      border-radius: var(--fd-radius-lg, 0.5rem) var(--fd-radius-lg, 0.5rem) 0 0;
    }

    .fd-impact-confirm__actions {
      flex-direction: column-reverse;
    }
  }
</style>
