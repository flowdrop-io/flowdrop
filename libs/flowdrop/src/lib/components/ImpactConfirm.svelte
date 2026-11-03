<!--
  ImpactConfirm

  The dialog shown before a workflow save that breaks or changes what uses the
  workflow: lists the affected things by severity and asks the person at the
  keyboard. Mounted imperatively by `services/impactGate.ts` into the host's
  container (default `document.body`), one at a time.
-->

<script lang="ts">
  import { m } from '../messages/index.js';
  import Button from './primitives/Button.svelte';
  import { focusOnMount } from '../utils/focus.js';
  import type { ImpactItem, ImpactReport, ImpactSeverity } from '../types/impact.js';

  interface Props {
    /** What the check found. `null` when the check itself failed (see `error`). */
    report: ImpactReport | null;
    /** The reason the check failed; shown as one line instead of the list. */
    error?: string;
    /** Called exactly once: `true` to save, `false` to cancel. */
    onResolve: (save: boolean) => void;
  }

  let { report, error, onResolve }: Props = $props();

  const severities: ImpactSeverity[] = ['breaks', 'changes', 'info'];

  const groups = $derived(
    severities
      .map((severity) => ({
        severity,
        items: (report?.items ?? []).filter((item: ImpactItem) => item.severity === severity)
      }))
      .filter((group) => group.items.length > 0)
  );

  // Focus starts on Save anyway and stays inside the dialog: Tab cycles the two
  // buttons, Escape cancels.
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onResolve(false);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const order = [
        ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
      ];
      const i = order.indexOf(document.activeElement as HTMLButtonElement);
      const step = event.shiftKey ? -1 : 1;
      order[(i + step + order.length) % order.length]?.focus();
    }
  }
</script>

<div class="flowdrop-portal fd-impact-confirm" data-testid="flowdrop-impact-confirm">
  <div
    class="fd-impact-confirm__dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="fd-impact-confirm-title"
    aria-describedby="fd-impact-confirm-body"
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <header class="fd-impact-confirm__header">
      <h2 id="fd-impact-confirm-title" class="fd-impact-confirm__title">
        {m().impact.title}
      </h2>
    </header>
    <div id="fd-impact-confirm-body" class="fd-impact-confirm__body">
      {#if error}
        <p class="fd-impact-confirm__error" data-testid="flowdrop-impact-error">
          {m().impact.failed({ message: error })}
        </p>
      {/if}
      {#each groups as group (group.severity)}
        <section class="fd-impact-confirm__group" data-severity={group.severity}>
          <h3 class="fd-impact-confirm__group-title">{m().impact[group.severity]}</h3>
          <ul class="fd-impact-confirm__list" role="list">
            {#each group.items as item, i (i)}
              <li class="fd-impact-confirm__item">
                <span class="fd-impact-confirm__severity"
                  >{m().impact.severity[group.severity]}</span
                >
                <span class="fd-impact-confirm__text">
                  {#if item.url}
                    <a
                      class="fd-impact-confirm__label"
                      href={item.url}
                      target="_blank"
                      rel="noopener">{item.label}</a
                    >
                  {:else}
                    <span class="fd-impact-confirm__label">{item.label}</span>
                  {/if}
                  <span class="fd-impact-confirm__message">{item.message}</span>
                </span>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>
    <footer class="fd-impact-confirm__actions">
      <Button data-testid="flowdrop-impact-cancel" onclick={() => onResolve(false)}>
        {m().impact.cancel}
      </Button>
      <Button
        variant="primary"
        data-testid="flowdrop-impact-save"
        {@attach focusOnMount()}
        onclick={() => onResolve(true)}
      >
        {m().impact.save}
      </Button>
    </footer>
  </div>
</div>

<style>
  /* Mounted on document.body, outside the editor tree. Tokens come from :root
     (tokens.css) and, for a skinned editor, from the editor's scope, which the
     helper copies onto the host element; the dark palette follows
     [data-theme='dark'] on the host element; the buttons are the Button primitive. Everything else is set here, because the host page's own element
     rules (h2, h3, p, ul, li, a) reach a dialog on <body>: every element below
     states its margin, padding, font and list style. */
  .fd-impact-confirm {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
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

  .fd-impact-confirm__dialog:focus {
    outline: none;
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
