<script lang="ts">
  /**
   * Toast body: status glyph, title, optional body, reasons and an action.
   *
   * svelte-5-french-toast renders a component message as
   * `<toast.message {toast} {...toast.props} />`, so this receives the live
   * toast (for its id) plus the props the service passes. The service uses a
   * "blank" toast, so the library draws no icon of its own: the glyph sits on
   * the first line, next to the title, instead of centred on the whole block.
   *
   * The message is built from parts (title = what happened, body = why,
   * details = the server's reasons, action = what to do next) rather than one
   * joined string. Errors and warnings stay until closed; a success is one
   * line and goes by itself, so it has no close button (`dismissible`).
   *
   * The reason list is keyed by index on purpose: two reasons may share their
   * wording, and keying on the text throws `each_key_duplicate` — in
   * production too. The list never changes for the life of a toast.
   */
  import { toast as toastApi, type Toast } from 'svelte-5-french-toast';
  import Button from '../primitives/Button.svelte';
  import type { ToastAction, ToastKind } from '../../services/toastQueue.js';

  interface Props {
    toast: Toast;
    /** The headline: what happened. */
    text: string;
    /** Why it happened, one short paragraph. */
    body?: string;
    details?: readonly string[];
    action?: ToastAction;
    kind?: ToastKind;
    dismissible?: boolean;
  }

  let {
    toast,
    text,
    body,
    details = [],
    action,
    kind = 'info',
    dismissible = true
  }: Props = $props();

  function runAction(): void {
    action?.onClick();
    toastApi.dismiss(toast.id);
  }
</script>

<div class="flowdrop-toast-row" data-kind={kind}>
  <span class="flowdrop-toast-glyph" aria-hidden="true">
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      {#if kind === 'success'}
        <path d="M4.5 8.4l2.4 2.4 4.6-5.2" />
      {:else if kind === 'error'}
        <path d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2" />
      {:else if kind === 'warning'}
        <path d="M8 4.4v4.2" />
        <path d="M8 11.3v.01" />
      {:else}
        <path d="M8 7.4v4" />
        <path d="M8 4.7v.01" />
      {/if}
    </svg>
  </span>
  <div class="flowdrop-toast-text">
    <p class="flowdrop-toast-headline">{text}</p>
    {#if body}
      <p class="flowdrop-toast-body">{body}</p>
    {/if}
    {#if details.length}
      <ul class="flowdrop-toast-details">
        {#each details as detail, i (i)}
          <li>{detail}</li>
        {/each}
      </ul>
    {/if}
    {#if action}
      <div class="flowdrop-toast-actions">
        <Button variant="ghost" size="sm" onclick={runAction}>{action.label}</Button>
      </div>
    {/if}
  </div>
  {#if dismissible}
    <button
      type="button"
      class="flowdrop-toast-close"
      aria-label="Dismiss"
      onclick={() => toastApi.dismiss(toast.id)}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        <path
          d="M4 4l8 8M12 4l-8 8"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          fill="none"
        />
      </svg>
    </button>
  {/if}
</div>
