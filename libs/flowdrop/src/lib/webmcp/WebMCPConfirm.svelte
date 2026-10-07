<!--
  WebMCPConfirm

  The built-in approval dialog for mutating editor tools called by a browser
  agent. Lists what is about to run and asks the person at the keyboard.
  Mounted imperatively by `gate.ts` into the host's container (default
  `document.body`), one at a time; a second request while one is open is
  refused upstream with a `busy` error rather than stacking dialogs.
-->

<script lang="ts">
  import { m } from '../messages/index.js';
  import { focusOnMount } from '../utils/focus.js';

  interface Props {
    /** The title — who wants to change which editor (see `GateRequest.title`). */
    title: string;
    /** One human-readable line per command (see `describeCommand`). */
    lines: string[];
    /**
     * Overrides the default "N changes — applied together, undone together"
     * hint, e.g. for `save`, which has no commands to count.
     */
    hint?: string;
    /**
     * Show the "apply further edits without asking" checkbox. Off for
     * consequential calls (`save`, `run`), which always ask.
     */
    offerRemember?: boolean;
    /** Called exactly once with the decision and whether to remember it for edits. */
    onResolve: (approved: boolean, remember?: boolean) => void;
  }

  let { title, lines, hint, offerRemember = false, onResolve }: Props = $props();

  let rejectButton = $state<HTMLButtonElement | null>(null);
  let approveButton = $state<HTMLButtonElement | null>(null);
  let rememberBox = $state<HTMLInputElement | null>(null);
  let remember = $state(false);

  // Focus starts on Apply and stays inside the dialog: Tab cycles Apply →
  // Reject → (checkbox) → Apply, Escape rejects. The handler sits on the
  // dialog itself, which holds focus through its controls, not on the window.
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onResolve(false);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const order = [approveButton, rejectButton, rememberBox].filter(
        (el): el is HTMLButtonElement | HTMLInputElement => el !== null
      );
      const i = order.indexOf(document.activeElement as HTMLButtonElement | HTMLInputElement);
      const step = event.shiftKey ? -1 : 1;
      order[(i + step + order.length) % order.length]?.focus();
    }
  }
</script>

<div class="flowdrop-portal fd-webmcp-confirm" data-testid="flowdrop-webmcp-confirm">
  <div
    class="fd-webmcp-confirm__dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="fd-webmcp-confirm-title"
    aria-describedby="fd-webmcp-confirm-list"
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <header class="fd-webmcp-confirm__header">
      <h2 id="fd-webmcp-confirm-title" class="fd-webmcp-confirm__title">
        {title}
      </h2>
      <p class="fd-webmcp-confirm__hint">
        {hint ?? m().webmcp.confirmCount({ count: lines.length })}
      </p>
    </header>
    <div class="fd-webmcp-confirm__body">
      <ol id="fd-webmcp-confirm-list" class="fd-webmcp-confirm__list" role="list">
        {#each lines as line, i (i)}
          <li class="fd-webmcp-confirm__line">
            <span class="fd-webmcp-confirm__step" aria-hidden="true">{i + 1}</span>
            <span class="fd-webmcp-confirm__text">{line}</span>
          </li>
        {/each}
      </ol>
      {#if offerRemember}
        <label class="fd-webmcp-confirm__remember">
          <input
            type="checkbox"
            data-testid="flowdrop-webmcp-remember"
            bind:this={rememberBox}
            bind:checked={remember}
          />
          <span>{m().webmcp.rememberEdits}</span>
        </label>
      {/if}
    </div>
    <footer class="fd-webmcp-confirm__actions">
      <button
        type="button"
        class="flowdrop-btn flowdrop-btn--outline fd-webmcp-confirm__button"
        data-testid="flowdrop-webmcp-reject"
        bind:this={rejectButton}
        onclick={() => onResolve(false)}
      >
        {m().webmcp.reject}
      </button>
      <button
        type="button"
        class="flowdrop-btn flowdrop-btn--primary fd-webmcp-confirm__button"
        data-testid="flowdrop-webmcp-approve"
        bind:this={approveButton}
        {@attach focusOnMount()}
        onclick={() => onResolve(true, remember)}
      >
        {m().webmcp.apply}
      </button>
    </footer>
  </div>
</div>

<style>
  /* Mounted on document.body, outside the editor tree. Tokens come from :root
     (tokens.css) and, for a skinned editor, from the editor's scope, which the
     gate copies onto the host element; the dark palette follows
     [data-theme='dark'] on <html>; the buttons are .flowdrop-btn from
     base.css. Everything else is set here, because the host page's own
     element rules (h2, p, ol, li, label) reach a dialog on <body>: every
     element below states its margin, padding, font and list style rather than
     trusting the UA defaults. The shell follows SettingsModal: blurred
     backdrop, header / body / footer, an enter animation. */
  .fd-webmcp-confirm {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--fd-space-xl, 1rem);
    background: rgb(0 0 0 / 0.5);
    backdrop-filter: blur(4px);
    font-family: var(--fd-font-sans, system-ui, sans-serif);
    font-size: var(--fd-text-sm, 0.875rem);
    font-weight: 400;
    line-height: var(--fd-leading-normal, 1.5);
    letter-spacing: normal;
    text-align: left;
    text-transform: none;
  }

  .fd-webmcp-confirm__dialog {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 36rem;
    max-height: calc(100vh - 2 * var(--fd-space-xl, 1rem));
    overflow: hidden;
    border: 1px solid var(--fd-border, #d4d4d8);
    border-radius: var(--fd-radius-lg, 0.5rem);
    background: var(--fd-background, #fff);
    color: var(--fd-foreground, #18181b);
    box-shadow: var(--fd-shadow-xl, 0 20px 40px rgb(0 0 0 / 0.25));
    animation: fd-webmcp-confirm-enter 0.2s ease-out;
  }

  .fd-webmcp-confirm__dialog:focus {
    outline: none;
  }

  @keyframes fd-webmcp-confirm-enter {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .fd-webmcp-confirm__header {
    flex-shrink: 0;
    padding: var(--fd-space-xl, 1rem) var(--fd-space-xl, 1rem) var(--fd-space-lg, 0.875rem);
    border-bottom: 1px solid var(--fd-border, #d4d4d8);
  }

  .fd-webmcp-confirm__title {
    margin: 0 0 var(--fd-space-2xs, 0.25rem);
    padding: 0;
    font-family: inherit;
    font-size: var(--fd-text-lg, 1.125rem);
    letter-spacing: normal;
    text-transform: none;
    font-weight: 600;
    line-height: var(--fd-leading-tight, 1.3);
    color: var(--fd-foreground, #18181b);
    overflow-wrap: anywhere;
  }

  .fd-webmcp-confirm__hint {
    margin: 0;
    padding: 0;
    font-size: var(--fd-text-sm, 0.875rem);
    color: var(--fd-muted-foreground, #71717a);
  }

  .fd-webmcp-confirm__body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--fd-space-xl, 1rem);
  }

  /* One row per command: a step number in its own column, sized to the
     widest number (12, 104…), so it never hangs outside the box the way an
     <ol> marker in a fixed gutter does. */
  .fd-webmcp-confirm__list {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--fd-border, #d4d4d8);
    border-radius: var(--fd-radius-md, 0.375rem);
    background: var(--fd-muted, #f4f4f5);
    overflow: hidden;
  }

  .fd-webmcp-confirm__line {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    align-items: baseline;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .fd-webmcp-confirm__line + .fd-webmcp-confirm__line {
    border-top: 1px solid var(--fd-border-muted, var(--fd-border, #e4e4e7));
  }

  .fd-webmcp-confirm__step {
    padding: var(--fd-space-xs, 0.5rem) var(--fd-space-sm, 0.625rem) var(--fd-space-xs, 0.5rem)
      var(--fd-space-md, 0.75rem);
    font-family: var(--fd-font-mono, ui-monospace, monospace);
    font-size: var(--fd-text-xs, 0.8125rem);
    font-variant-numeric: tabular-nums;
    line-height: var(--fd-leading-normal, 1.5);
    text-align: right;
    color: var(--fd-muted-foreground, #71717a);
    user-select: none;
  }

  .fd-webmcp-confirm__text {
    min-width: 0;
    padding: var(--fd-space-xs, 0.5rem) var(--fd-space-md, 0.75rem) var(--fd-space-xs, 0.5rem) 0;
    font-family: var(--fd-font-mono, ui-monospace, monospace);
    font-size: var(--fd-text-xs, 0.8125rem);
    line-height: var(--fd-leading-normal, 1.5);
    color: var(--fd-foreground, #18181b);
    overflow-wrap: anywhere;
  }

  .fd-webmcp-confirm__remember {
    display: flex;
    align-items: flex-start;
    gap: var(--fd-space-sm, 0.625rem);
    margin: var(--fd-space-lg, 0.875rem) 0 0;
    padding: 0;
    font-size: var(--fd-text-sm, 0.875rem);
    font-weight: 400;
    line-height: var(--fd-leading-normal, 1.5);
    letter-spacing: normal;
    text-transform: none;
    color: var(--fd-muted-foreground, #71717a);
    cursor: pointer;
  }

  .fd-webmcp-confirm__remember input {
    flex-shrink: 0;
    appearance: auto;
    width: 1rem;
    height: 1rem;
    margin: 0.2em 0 0;
    accent-color: var(--fd-primary, #2563eb);
    cursor: pointer;
  }

  .fd-webmcp-confirm__remember:hover {
    color: var(--fd-foreground, #18181b);
  }

  .fd-webmcp-confirm__actions {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    gap: var(--fd-space-sm, 0.625rem);
    padding: var(--fd-space-lg, 0.875rem) var(--fd-space-xl, 1rem);
    border-top: 1px solid var(--fd-border, #d4d4d8);
    background: var(--fd-muted, #f4f4f5);
  }

  /* The buttons are .flowdrop-btn from base.css; this only keeps them from
     inheriting the host page's button font when base.css is absent. */
  .fd-webmcp-confirm__button {
    font-family: inherit;
  }

  @media (max-width: 640px) {
    .fd-webmcp-confirm {
      padding: 0;
      align-items: flex-end;
    }

    .fd-webmcp-confirm__dialog {
      max-width: 100%;
      max-height: 100vh;
      border-radius: var(--fd-radius-lg, 0.5rem) var(--fd-radius-lg, 0.5rem) 0 0;
    }

    .fd-webmcp-confirm__actions {
      flex-direction: column-reverse;
    }
  }
</style>
