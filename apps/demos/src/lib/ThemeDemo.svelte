<script lang="ts">
  import { onMount } from 'svelte';
  import {
    mountFlowDropApp,
    unmountFlowDropApp,
    type MountedFlowDropApp
  } from '@flowdrop/flowdrop/editor';
  import type { FlowDropTheme, FlowDropThemeName } from '@flowdrop/flowdrop/core';
  import { nodes, portConfig, categories, sampleWorkflow } from './sample-data/index.js';

  let { theme, instanceId }: { theme: FlowDropTheme | FlowDropThemeName; instanceId: string } =
    $props();

  let container: HTMLDivElement;

  onMount(() => {
    let app: MountedFlowDropApp | undefined;
    // Fully client-side: workflow, nodes, portConfig and categories are all
    // supplied inline, so the editor makes zero network calls. Drafts persist
    // to localStorage, keyed per instanceId so the demos never share state.
    // onApiError returns true to swallow the toast a manual Save would trigger
    // (there is no backend in a static demo).
    void mountFlowDropApp(container, {
      theme,
      nodes,
      portConfig,
      categories,
      workflow: sampleWorkflow,
      showNavbar: false,
      // App defaults height to '100vh'; here it lives inside our flex layout
      // (navbar + banner above it), so fill the container instead to avoid
      // overflowing the viewport and triggering a scrollbar.
      height: '100%',
      instanceId,
      eventHandlers: { onApiError: () => true }
    }).then((mounted) => {
      app = mounted;
    });

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
