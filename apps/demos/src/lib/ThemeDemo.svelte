<script lang="ts">
  import { onMount } from 'svelte';
  import {
    mountFlowDropApp,
    unmountFlowDropApp,
    type MountedFlowDropApp
  } from '@flowdrop/flowdrop/editor';
  import { createEndpointConfig } from '@flowdrop/flowdrop/core';
  import type { FlowDropTheme, FlowDropThemeName } from '@flowdrop/flowdrop/core';

  let { theme, instanceId }: { theme: FlowDropTheme | FlowDropThemeName; instanceId: string } =
    $props();

  // Every demo reads from the same source of truth: the prerendered static API
  // under /api/flowdrop (backed by src/lib/sample-data). The editor fetches its
  // node registry, port config and categories from there via endpointConfig;
  // we fetch the workflow the same way. No backend, but the real API client
  // code path runs end to end. Mutations (save/run) have no endpoint, so they
  // fail — which is the intended "browser-only" behaviour.
  const API_BASE = '/api/flowdrop';
  const endpointConfig = createEndpointConfig(API_BASE);

  let container: HTMLDivElement;

  onMount(() => {
    let app: MountedFlowDropApp | undefined;
    void (async () => {
      const res = await fetch(`${API_BASE}/workflows`);
      const body = await res.json();
      const workflow = body?.data?.[0];

      app = await mountFlowDropApp(container, {
        theme,
        endpointConfig,
        workflow,
        showNavbar: false,
        // App defaults height to '100vh'; here it lives inside our flex layout
        // (navbar above it), so fill the container to avoid a viewport scrollbar.
        height: '100%',
        instanceId,
        eventHandlers: { onApiError: () => true }
      });
    })();

    return () => {
      if (app) unmountFlowDropApp(app);
    };
  });
</script>

<div class="editor-frame" bind:this={container}></div>

<style>
  .editor-frame {
    flex: 1 1 auto;
    min-height: 0;
    position: relative;
  }
</style>
