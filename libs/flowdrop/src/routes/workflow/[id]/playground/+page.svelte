<!--
  Playground Index

  Redirects to the most recent session for this workflow.
  If no sessions exist, creates one first then redirects.
  Users always land at /playground/[sessionId].
-->

<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  import { playgroundService } from '$lib/services/playgroundService.js';
  import { createEndpointConfig } from '$lib/config/endpoints.js';
  import { getDefaultInstance } from '$lib/stores/instanceContainer.svelte.js';
  import { NoAuthProvider, StaticAuthProvider } from '$lib/types/auth.js';

  let { data } = $props();

  // [id] is a required route segment — the param is always present here
  const workflowId = $page.params.id!;

  let error = $state<string | null>(null);

  onMount(async () => {
    const endpointConfig = createEndpointConfig(data.runtimeConfig.apiBaseUrl, {
      timeout: data.runtimeConfig.timeout
    });
    const authProvider =
      data.runtimeConfig.authType && data.runtimeConfig.authType !== 'none'
        ? new StaticAuthProvider({
            type: data.runtimeConfig.authType,
            token: data.runtimeConfig.authToken
          })
        : new NoAuthProvider();
    const api = getDefaultInstance().api;
    api.configure(endpointConfig, authProvider);

    try {
      const sessions = await playgroundService.listSessions(
        api.config,
        workflowId,
        undefined,
        api.authProvider
      );
      const mostRecent =
        sessions.length > 0
          ? [...sessions].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).pop()!
          : null;
      const target = mostRecent
        ? mostRecent.id
        : (
            await playgroundService.createSession(
              api.config,
              workflowId,
              'Session 1',
              undefined,
              api.authProvider
            )
          ).id;

      goto(
        resolve('/workflow/[id]/playground/[sessionId]', { id: workflowId, sessionId: target }),
        {
          replaceState: true
        }
      );
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load playground';
    }
  });
</script>

<svelte:head>
  <title>Playground - FlowDrop</title>
</svelte:head>

<div class="playground-redirect">
  {#if error}
    <Icon
      icon="mdi:alert-circle"
      class="playground-redirect__icon playground-redirect__icon--error"
    />
    <p class="playground-redirect__text">Failed to open playground: {error}</p>
    <a href={resolve('/')} class="playground-redirect__link">Go to home</a>
  {:else}
    <Icon icon="mdi:loading" class="playground-redirect__icon playground-redirect__icon--spin" />
    <p class="playground-redirect__text">Opening playground…</p>
  {/if}
</div>

<style>
  .playground-redirect {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--fd-space-md);
    color: var(--fd-muted-foreground);
  }

  :global(.playground-redirect__icon) {
    font-size: var(--fd-space-6xl);
  }

  :global(.playground-redirect__icon--spin) {
    animation: spin 1s linear infinite;
  }

  :global(.playground-redirect__icon--error) {
    color: var(--fd-error);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .playground-redirect__text {
    font-size: var(--fd-text-sm);
    margin: 0;
  }

  .playground-redirect__link {
    font-size: var(--fd-text-sm);
    color: var(--fd-primary);
    text-decoration: none;
  }

  .playground-redirect__link:hover {
    text-decoration: underline;
  }
</style>
