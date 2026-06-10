<script lang="ts">
  import Icon from '@iconify/svelte';

  // Dismissible per page load — re-appears on reload so the "no backend" caveat
  // stays obvious by default without being permanently in the way.
  let dismissed = $state(false);
</script>

{#if !dismissed}
  <div class="demo-banner" role="status">
    <Icon icon="mdi:flask-outline" class="demo-banner__icon" width="18" height="18" />
    <p class="demo-banner__text">
      <strong>Browser-only demo — no backend.</strong>
      The editor runs entirely in your browser. Server-backed features —
      <em>saving workflows, running them, loading node registries from an API</em> — are disabled.
      Edits live only in this tab (drafts persist to <code>localStorage</code>).
    </p>
    <button
      class="demo-banner__close"
      onclick={() => (dismissed = true)}
      aria-label="Dismiss notice"
    >
      <Icon icon="mdi:close" width="16" height="16" />
    </button>
  </div>
{/if}

<style>
  .demo-banner {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: #fffbeb;
    border-bottom: 1px solid #fde68a;
    color: #92400e;
    font-size: 13px;
    line-height: 1.45;
  }

  .demo-banner :global(.demo-banner__icon) {
    flex: 0 0 auto;
    color: #d97706;
  }

  .demo-banner__text {
    margin: 0;
    flex: 1 1 auto;
  }
  .demo-banner__text strong {
    color: #78350f;
  }
  .demo-banner__text em {
    font-style: normal;
    font-weight: 600;
  }
  .demo-banner__text code {
    font-size: 12px;
    background: #fef3c7;
    padding: 1px 5px;
    border-radius: 5px;
  }

  .demo-banner__close {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #b45309;
    cursor: pointer;
  }
  .demo-banner__close:hover {
    background: #fef3c7;
  }
</style>
