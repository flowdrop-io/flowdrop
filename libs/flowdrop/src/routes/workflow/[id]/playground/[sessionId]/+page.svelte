<!--
  Playground Session Page

  Thin route wrapper around PlaygroundStudio. Session ID comes from the
  URL — changing it triggers PlaygroundStudio's internal {#key} remount.
-->

<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import PlaygroundStudio from '$lib/components/playground/PlaygroundStudio.svelte';
  import { createEndpointConfig } from '$lib/config/endpoints.js';
  import type { PlaygroundConfig } from '$lib/types/playground.js';

  let { data } = $props();

  // [id]/[sessionId] are required route segments — the params are always present here
  const workflowId = $derived($page.params.id!);
  const sessionId = $derived($page.params.sessionId!);

  const endpointConfig = $derived(
    createEndpointConfig(data.runtimeConfig.apiBaseUrl, {
      timeout: data.runtimeConfig.timeout
    })
  );

  function parseBoolParam(value: string | null): boolean | undefined {
    if (value === null) return undefined;
    return value === 'true' || value === '1';
  }

  const playgroundConfig: PlaygroundConfig = $derived({
    showChatInput: parseBoolParam($page.url.searchParams.get('showChatInput')),
    showRunButton: parseBoolParam($page.url.searchParams.get('showRunButton')),
    predefinedMessage: $page.url.searchParams.get('predefinedMessage') ?? undefined,
    autoRun: parseBoolParam($page.url.searchParams.get('autoRun')),
    sidebarWidth: $page.url.searchParams.get('sidebarWidth') ?? undefined
  });

  function handleSessionNavigate(newSessionId: string) {
    goto(
      resolve('/workflow/[id]/playground/[sessionId]', { id: workflowId, sessionId: newSessionId })
    );
  }
</script>

<svelte:head>
  <title>Playground - FlowDrop</title>
</svelte:head>

<div class="playground-page">
  <PlaygroundStudio
    {workflowId}
    {endpointConfig}
    mode="standalone"
    initialSessionId={sessionId}
    config={playgroundConfig}
    onSessionNavigate={handleSessionNavigate}
  />
</div>

<style>
  .playground-page {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
