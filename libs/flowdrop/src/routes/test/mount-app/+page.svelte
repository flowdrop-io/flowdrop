<!--
  Mount App Test Page

  E2E test fixture that mounts FlowDrop through mountFlowDropApp() with a
  two-node workflow and exposes the mounted app as window.__mountedApp.

  ?drafts=1 turns draft auto-save on (session storage, a 500 ms interval, toasts on).

  Used by: tests/e2e/editor-save.spec.ts (leave-page confirmation),
           tests/e2e/editor-draft-restore.spec.ts (draft offer)
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { mountFlowDropApp, type MountedFlowDropApp } from '$lib/svelte-app.js';
  import type { Workflow, NodeMetadata } from '$lib/types/index.js';

  let container: HTMLDivElement;

  const textType: NodeMetadata = {
    node_type_id: 'text_input',
    name: 'Text Input',
    description: 'Text input',
    type: 'default',
    category: 'inputs',
    version: '1.0.0',
    inputs: [],
    outputs: [{ id: 'value', name: 'Value', type: 'output', dataType: 'string' }],
    configSchema: { type: 'object', properties: {} }
  };

  const makeNode = (id: string, x: number) => ({
    id,
    type: 'universalNode',
    position: { x, y: 200 },
    data: { label: id, config: {}, metadata: textType }
  });

  const workflow = {
    id: 'mount-app-workflow',
    name: 'Mount app workflow',
    nodes: [makeNode('a.1', 100), makeNode('b.1', 500)],
    edges: [{ id: 'e1', source: 'a.1', target: 'b.1' }],
    metadata: { schemaVersion: '1.0.0', createdAt: '', updatedAt: '' }
  } as Workflow;

  onMount(() => {
    const drafts = new URLSearchParams(window.location.search).has('drafts');
    let app: MountedFlowDropApp | undefined;
    void mountFlowDropApp(container, {
      workflow,
      nodes: [textType],
      height: '100vh',
      ...(drafts ? { draftStorage: 'session' as const } : {}),
      features: drafts
        ? { autoSaveDraft: true, autoSaveDraftInterval: 500, showToasts: true }
        : { autoSaveDraft: false, showToasts: false }
    }).then((mounted) => {
      app = mounted;
      (window as unknown as { __mountedApp: MountedFlowDropApp }).__mountedApp = mounted;
    });
    return () => app?.destroy();
  });
</script>

<svelte:head>
  <title>Mount App Test - FlowDrop</title>
</svelte:head>

<div bind:this={container} data-testid="mount-app-test"></div>
