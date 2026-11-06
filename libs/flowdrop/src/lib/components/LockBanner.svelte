<!--
  @component
  LockBanner: the strip above the canvas that says why the workflow is read-only
  and offers the actions the host chose (for example "Edit anyway").

  It draws nothing while the editor is not locked. Reasons are plain text, each
  with an optional "Learn more" link; the buttons report their id to the host
  through `fd.lock` (`onLockAction`).

  **Use it for** the one place the editor explains a lock.
  **Not for** other messages; use `Notice`.
-->

<script lang="ts">
  import { getInstance } from '../stores/getInstance.svelte.js';
  import Notice from './primitives/Notice.svelte';
  import Button from './primitives/Button.svelte';
  import { m } from '../messages/index.js';

  const fd = getInstance();
  const lock = $derived(fd.lock.current);
  const lockMessages = $derived(m().lock);

  /** Only http(s) and site-relative links are made clickable. */
  function safeUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (/^\/(?!\/)/.test(url)) return url;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : null;
    } catch {
      return null;
    }
  }
</script>

{#if lock}
  <div class="flowdrop-lock-banner" data-testid="lock-banner">
    <Notice tone="info" title={lockMessages.title} role="status">
      {#each lock.reasons as reason, index (index)}
        <p class="flowdrop-lock-banner__reason" data-kind={reason.kind}>
          {reason.message}
          {#if safeUrl(reason.url)}
            <a href={safeUrl(reason.url)} target="_blank" rel="noopener noreferrer"
              >{lockMessages.learnMore}</a
            >
          {/if}
        </p>
      {/each}
      {#snippet actions()}
        {#each lock.actions as action (action.id)}
          <Button
            size="sm"
            variant={action.primary ? 'primary' : 'secondary'}
            data-testid="lock-action-{action.id}"
            onclick={() => fd.lock.fire(action.id)}
          >
            {action.label}
          </Button>
        {/each}
      {/snippet}
    </Notice>
  </div>
{/if}

<style>
  .flowdrop-lock-banner {
    flex: none;
    padding: var(--fd-space-xs) var(--fd-space-md) 0;
  }

  .flowdrop-lock-banner__reason {
    margin: 0;
  }

  .flowdrop-lock-banner__reason + .flowdrop-lock-banner__reason {
    margin-top: var(--fd-space-3xs);
  }

  .flowdrop-lock-banner__reason a {
    color: var(--fd-primary);
    white-space: nowrap;
  }
</style>
