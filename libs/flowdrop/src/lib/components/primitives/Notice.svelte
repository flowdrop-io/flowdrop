<!--
  @component
  Notice: an inline message (info, success, warning or error) with an optional title, body,
  actions and a dismiss button.

  Error and warning use `role="alert"` (read out at once: the user has to act or just lost
  something). Info and success use `role="status"` (polite). Pass `role` to change that: a
  warning that is on screen from the start should be `"status"` or `"note"` so it is not
  announced on load.

  **Use it for** a message that belongs to a part of the page: a failed save, a missing setting.
  **Not for** an empty list; use `EmptyState`. Not for run status; use `StatusPill`.

  Exported from `@flowdrop/flowdrop/ui`.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '@iconify/svelte';
  import { getMessages } from '../../messages/context.js';
  import IconButton from './IconButton.svelte';

  interface Props {
    /** Semantic tone; selects colour, icon and default ARIA role. */
    tone?: 'info' | 'success' | 'warning' | 'error';
    /** Bold first line. */
    title?: string;
    /** Body text / markup. */
    children?: Snippet;
    /** Action buttons under the body. */
    actions?: Snippet;
    /** When set, a dismiss (x) button is shown and calls this. */
    ondismiss?: () => void;
    /** Accessible label of the dismiss button. Defaults to the localized "Dismiss". */
    dismissLabel?: string;
    /** Override the default ARIA role (alert for error/warning, status otherwise). */
    role?: 'alert' | 'status' | 'note';
    /** Extra classes on the root. */
    class?: string;
  }

  let {
    tone = 'info',
    title,
    children,
    actions,
    ondismiss,
    dismissLabel,
    role,
    class: className = ''
  }: Props = $props();

  const getMsgs = getMessages();

  const ICONS = {
    info: 'heroicons:information-circle',
    success: 'heroicons:check-circle',
    warning: 'heroicons:exclamation-triangle',
    error: 'heroicons:exclamation-circle'
  } as const;

  const resolvedRole = $derived(
    role ?? (tone === 'error' || tone === 'warning' ? 'alert' : 'status')
  );
</script>

<div class="flowdrop-ui-notice flowdrop-ui-notice--{tone} {className}" role={resolvedRole}>
  <span class="flowdrop-ui-notice__icon" aria-hidden="true">
    <Icon icon={ICONS[tone]} />
  </span>
  <div class="flowdrop-ui-notice__content">
    {#if title}
      <p class="flowdrop-ui-notice__title">{title}</p>
    {/if}
    {#if children}
      <div class="flowdrop-ui-notice__body">{@render children()}</div>
    {/if}
    {#if actions}
      <div class="flowdrop-ui-notice__actions">{@render actions()}</div>
    {/if}
  </div>
  {#if ondismiss}
    <IconButton
      size="sm"
      class="flowdrop-ui-notice__dismiss"
      ariaLabel={dismissLabel ?? getMsgs().notice.dismiss}
      onclick={ondismiss}
    >
      <Icon icon="heroicons:x-mark" />
    </IconButton>
  {/if}
</div>

<style>
  .flowdrop-ui-notice {
    --_fg: var(--fd-info);
    --_bg: var(--fd-info-muted);

    display: flex;
    align-items: flex-start;
    gap: var(--fd-space-xs);
    box-sizing: border-box;
    padding: var(--fd-space-xs) var(--fd-space-md);
    border: 1px solid color-mix(in srgb, var(--_fg) 35%, transparent);
    border-radius: var(--fd-radius-lg);
    background: var(--_bg);
    color: var(--fd-foreground);
    font-family: var(--fd-font-sans);
    font-size: var(--fd-text-xsm);
    line-height: 1.4;
  }

  .flowdrop-ui-notice--success {
    --_fg: var(--fd-success);
    --_bg: var(--fd-success-muted);
  }
  .flowdrop-ui-notice--warning {
    --_fg: var(--fd-warning);
    --_bg: var(--fd-warning-muted);
  }
  .flowdrop-ui-notice--error {
    --_fg: var(--fd-error);
    --_bg: var(--fd-error-muted);
  }

  .flowdrop-ui-notice__icon {
    display: inline-flex;
    flex: none;
    margin-top: 1px;
    color: var(--_fg);
    font-size: var(--fd-text-base);
  }

  .flowdrop-ui-notice__content {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
    min-width: 0;
    flex: 1 1 auto;
    overflow-wrap: anywhere;
  }

  .flowdrop-ui-notice__title {
    margin: 0;
    font-weight: 600;
  }

  .flowdrop-ui-notice__body {
    color: var(--fd-foreground);
  }

  .flowdrop-ui-notice__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-xs);
    margin-top: var(--fd-space-3xs);
  }

  /* The dismiss button hugs the corner: negative margin keeps the 24px target inside the padding. */
  .flowdrop-ui-notice :global(.flowdrop-ui-notice__dismiss) {
    flex: none;
    margin: calc(var(--fd-space-3xs) * -1) calc(var(--fd-space-3xs) * -1) 0 0;
  }
</style>
