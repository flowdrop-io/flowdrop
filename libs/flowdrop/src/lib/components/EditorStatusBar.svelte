<!--
  EditorStatusBar — the dismissible error banner shown above the editor canvas
  when node types fail to load (endpoint missing or unreachable).

  Extracted from App.svelte so it can be storied/tested in isolation. The action
  buttons route through the shared Button primitive; all colours come from design
  tokens, so the banner stays in sync with the rest of the editor chrome.
-->
<script lang="ts">
  import Button from './Button.svelte';
  import CloseIcon from './icons/CloseIcon.svelte';

  interface Props {
    /** The error message to display (rendered after an "Error:" prefix). */
    error: string;
    /** Retry loading node types. */
    onRetry: () => void;
    /** Prompt for / set a new backend API URL. */
    onSetApiUrl: () => void;
    /** Run a connectivity test against the configured endpoint. */
    onTestApi: () => void;
    /** Dismiss the banner. */
    onDismiss: () => void;
  }

  let { error, onRetry, onSetApiUrl, onTestApi, onDismiss }: Props = $props();
</script>

<!-- aria-live announces the API error dynamically without requiring focus -->
<div class="flowdrop-status flowdrop-status--error" aria-live="polite" aria-atomic="true">
  <div class="flowdrop-status__content">
    <div class="flowdrop-status__message">
      <div class="flowdrop-status__indicator"></div>
      <span class="flowdrop-status__text">Error: {error}</span>
    </div>
    <div class="flowdrop-status__actions">
      <Button variant="primary" size="sm" onclick={onRetry}>Retry</Button>
      <Button variant="outline" size="sm" onclick={onSetApiUrl}>Set API URL</Button>
      <Button variant="outline" size="sm" onclick={onTestApi}>Test API</Button>
      <Button variant="ghost" size="sm" ariaLabel="Dismiss error" onclick={onDismiss}>
        <span class="flowdrop-status__dismiss-icon"><CloseIcon /></span>
      </Button>
    </div>
  </div>
</div>

<style>
  .flowdrop-status {
    padding: var(--fd-space-xl);
  }

  .flowdrop-status--error {
    background-color: var(--fd-error-muted);
    border-bottom: 1px solid var(--fd-error);
  }

  .flowdrop-status__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fd-space-md);
  }

  .flowdrop-status__message {
    display: flex;
    align-items: center;
    gap: var(--fd-space-md);
    min-width: 0;
  }

  .flowdrop-status__indicator {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: var(--fd-error);
  }

  .flowdrop-status__text {
    font-size: var(--fd-text-sm);
    line-height: 1.25rem;
    font-weight: 500;
  }

  .flowdrop-status__actions {
    display: flex;
    gap: var(--fd-space-xs);
    flex-shrink: 0;
  }

  .flowdrop-status__dismiss-icon {
    display: inline-flex;
  }

  .flowdrop-status__dismiss-icon :global(svg) {
    width: 0.875rem;
    height: 0.875rem;
  }
</style>
