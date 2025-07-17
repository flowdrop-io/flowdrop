<!--
  FlowDrop Demo Page
  Demonstrates the FlowDrop library with sample data
  Styled with BEM syntax
-->

<script lang="ts">
    import { onMount } from "svelte";
    import WorkflowEditor from "$lib/components/WorkflowEditor.svelte";
    import { api } from "$lib/services/api.js";
    import type { NodeMetadata, Workflow } from "$lib/types/index.js";
    import { getDefaultIcon } from '$lib/utils/icons.js';
  
    let nodes = $state<NodeMetadata[]>([]);
    let workflow = $state<Workflow | undefined>(undefined);
    let error = $state<string | null>(null);
    let loading = $state(true);
  
    /**
     * Fetch node types from the server
     */
    async function fetchNodeTypes(): Promise<void> {
      try {
        loading = true;
        error = null;
        
        console.log("Fetching node types from server...");
        const fetchedNodes = await api.nodes.getNodes();
        
        console.log("✅ Fetched", fetchedNodes.length, "node types from server");
        nodes = fetchedNodes;
        
      } catch (err) {
        console.error("❌ Failed to fetch node types:", err);
        error = err instanceof Error ? err.message : "Failed to load node types";
      } finally {
        loading = false;
      }
    }
  
    /**
     * Retry loading node types
     */
    function retryLoad(): void {
      fetchNodeTypes();
    }
  
    // Load node types on mount
    onMount(() => {
      fetchNodeTypes();
    });
  
    /**
     * Handle workflow export
     */
    function handleWorkflowExport(): void {
      if (!workflow) return;
      
      const dataStr = JSON.stringify(workflow, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${workflow.name}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  </script>
  
  <svelte:head>
    <title>FlowDrop - LLM Workflow Editor</title>
    <meta name="description" content="A modern drag-and-drop workflow editor for LLM applications" />
  </svelte:head>
  
  <div class="flowdrop-app" style="min-height: 1200px;">
    <!-- Header -->
    <div class="flowdrop-navbar">
      <div class="flowdrop-navbar__start">
        <!-- Logo and Title -->
        <div class="flowdrop-flex flowdrop-gap--3">
          <div class="flowdrop-logo flowdrop-logo--header">
            FD
          </div>
          <div>
            <h1 class="flowdrop-text--lg flowdrop-font--bold">FlowDrop</h1>
            <p class="flowdrop-text--xs flowdrop-text--gray">LLM Workflow Editor</p>
          </div>
        </div>
      </div>
  
      <div class="flowdrop-navbar__center">
        <!-- TODO: Add navigation -->
      </div>
  
      <div class="flowdrop-navbar__end">
       <!-- TODO: Add user menu -->
      </div>
    </div>
  
    <!-- Main Content -->
    <main class="flowdrop-main" style="height: calc(100vh - 60px);">
      <!-- Status Display -->
      {#if loading}
        <div class="flowdrop-status flowdrop-status--loading">
          <div class="flowdrop-status__content">
            <div class="flowdrop-flex flowdrop-gap--3">
              <div class="flowdrop-spinner"></div>
              <span class="flowdrop-text--sm flowdrop-font--medium">Loading node types...</span>
            </div>
          </div>
        </div>
      {:else if error}
        <div class="flowdrop-status flowdrop-status--error">
          <div class="flowdrop-status__content">
            <div class="flowdrop-flex flowdrop-gap--3">
              <div class="flowdrop-status__indicator flowdrop-status__indicator--error"></div>
              <span class="flowdrop-text--sm flowdrop-font--medium">Error: {error}</span>
            </div>
            <div class="flowdrop-flex flowdrop-gap--2">
              <button
                class="flowdrop-btn flowdrop-btn--sm flowdrop-btn--outline"
                onclick={retryLoad}
                type="button"
              >
                Retry
              </button>
              <button
                class="flowdrop-btn flowdrop-btn--ghost flowdrop-btn--sm"
                onclick={() => error = null}
                type="button"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      {/if}
  
      <!-- Workflow Editor -->
      <div class="flowdrop-editor-container" style="height: {(loading || error) ? 'calc(100% - 60px)' : '100%'};">
        <WorkflowEditor 
          nodes={nodes}
          workflow={workflow}
        />
      </div>
    </main>
  </div>
  
  <style>
    .flowdrop-app {
      background: linear-gradient(135deg, #f9fafb 0%, #e0e7ff 50%, #c7d2fe 100%);
    }
    
    .flowdrop-navbar {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      background-color: #ffffff;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .flowdrop-navbar__start {
      display: flex;
      align-items: center;
    }
    
    .flowdrop-logo {
      width: 2rem;
      height: 2rem;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.875rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    
    .flowdrop-logo--header {
      width: 40px;
      height: 40px;
      font-size: 1.25rem;
      margin-top: 15px;
    }
    
    .flowdrop-main {
      position: relative;
    }
    
    .flowdrop-status {
      background-color: #eff6ff;
      border-bottom: 1px solid #bfdbfe;
      padding: 1rem;
    }
    
    .flowdrop-status--error {
      background-color: #fef2f2;
      border-bottom: 1px solid #fecaca;
    }
    
    .flowdrop-status__content {
      max-width: 80rem;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .flowdrop-status__indicator {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
    }
    
    .flowdrop-status__indicator--error {
      background-color: #ef4444;
    }
    
    .flowdrop-editor-container {
      position: relative;
    }
    
    /* Ensure full height for screens larger than 1200px */
    @media (min-height: 1200px) {
      :global(html), :global(body) {
        height: 100%;
      }
      
      :global(#svelte) {
        height: 100%;
      }
    }
  </style>