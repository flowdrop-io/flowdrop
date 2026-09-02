<!--
  WebMCPConfirm

  The built-in approval dialog for mutating editor tools called by a browser
  agent. Lists what is about to run and asks the person at the keyboard.
  Mounted imperatively by `gate.ts` into the host's container (default
  `document.body`), one at a time; a second request while one is open is
  refused upstream with a `busy` error rather than stacking dialogs.
-->

<script lang="ts">
  interface Props {
    /** Editor / workflow name, so two editors on one page are distinguishable. */
    editorName: string;
    /** One human-readable line per command (see `describeCommand`). */
    lines: string[];
    /** Called exactly once with the decision. */
    onResolve: (approved: boolean) => void;
  }

  let { editorName, lines, onResolve }: Props = $props();

  let approveButton = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    approveButton?.focus();
  });

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onResolve(false);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fd-webmcp-confirm" data-testid="flowdrop-webmcp-confirm">
  <div
    class="fd-webmcp-confirm__dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="fd-webmcp-confirm-title"
    aria-describedby="fd-webmcp-confirm-list"
  >
    <h2 id="fd-webmcp-confirm-title" class="fd-webmcp-confirm__title">
      A browser agent wants to change “{editorName}”
    </h2>
    <p class="fd-webmcp-confirm__hint">
      {lines.length === 1 ? '1 change' : `${lines.length} changes`} — applied together, undone together.
    </p>
    <ol id="fd-webmcp-confirm-list" class="fd-webmcp-confirm__list">
      {#each lines as line, i (i)}
        <li class="fd-webmcp-confirm__line">{line}</li>
      {/each}
    </ol>
    <div class="fd-webmcp-confirm__actions">
      <button
        type="button"
        class="fd-webmcp-confirm__button fd-webmcp-confirm__button--reject"
        data-testid="flowdrop-webmcp-reject"
        onclick={() => onResolve(false)}
      >
        Reject
      </button>
      <button
        type="button"
        class="fd-webmcp-confirm__button fd-webmcp-confirm__button--approve"
        data-testid="flowdrop-webmcp-approve"
        bind:this={approveButton}
        onclick={() => onResolve(true)}
      >
        Apply
      </button>
    </div>
  </div>
</div>

<style>
  .fd-webmcp-confirm {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 0.4);
    font-family: inherit;
  }

  .fd-webmcp-confirm__dialog {
    min-width: 20rem;
    max-width: min(36rem, calc(100vw - 2rem));
    max-height: calc(100vh - 2rem);
    overflow: auto;
    padding: var(--fd-space-lg, 1rem);
    border: 1px solid var(--fd-border, #d4d4d8);
    border-radius: var(--fd-radius-lg, 0.75rem);
    background: var(--fd-background, #fff);
    color: var(--fd-foreground, #18181b);
    box-shadow: var(--fd-shadow-xl, 0 20px 40px rgb(0 0 0 / 0.25));
  }

  .fd-webmcp-confirm__title {
    margin: 0 0 var(--fd-space-xs, 0.25rem);
    font-size: var(--fd-text-md, 1rem);
    font-weight: 600;
  }

  .fd-webmcp-confirm__hint {
    margin: 0 0 var(--fd-space-md, 0.75rem);
    font-size: var(--fd-text-sm, 0.875rem);
    color: var(--fd-muted-foreground, #71717a);
  }

  .fd-webmcp-confirm__list {
    margin: 0 0 var(--fd-space-lg, 1rem);
    padding: var(--fd-space-sm, 0.5rem) var(--fd-space-sm, 0.5rem) var(--fd-space-sm, 0.5rem)
      var(--fd-space-xl, 1.5rem);
    border-radius: var(--fd-radius-md, 0.5rem);
    background: var(--fd-muted, #f4f4f5);
    font-family: var(--fd-font-mono, ui-monospace, monospace);
    font-size: var(--fd-text-sm, 0.875rem);
  }

  .fd-webmcp-confirm__line {
    padding: 0.125rem 0;
    overflow-wrap: anywhere;
  }

  .fd-webmcp-confirm__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--fd-space-sm, 0.5rem);
  }

  .fd-webmcp-confirm__button {
    padding: var(--fd-space-xs, 0.375rem) var(--fd-space-md, 0.75rem);
    border: 1px solid var(--fd-border, #d4d4d8);
    border-radius: var(--fd-control-radius, 0.375rem);
    background: var(--fd-background, #fff);
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .fd-webmcp-confirm__button--approve {
    border-color: var(--fd-primary, #2563eb);
    background: var(--fd-primary, #2563eb);
    color: var(--fd-primary-foreground, #fff);
  }

  .fd-webmcp-confirm__button--approve:hover {
    background: var(--fd-primary-hover, #1d4ed8);
  }

  .fd-webmcp-confirm__button:focus-visible {
    outline: 2px solid var(--fd-primary, #2563eb);
    outline-offset: 2px;
  }
</style>
