<!--
  FlowDrop Main Entry Page
  Shows a table of workflows with management operations
  - Displays workflows in a table format
  - Each row has title, description, and operations dropdown
  - Operations include: Edit, Delete, View Execution, Playground
  - Quick search functionality at the top
-->

<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    buildEndpointUrl,
    defaultEndpointConfig,
    type EndpointConfig,
  } from "$lib/config/endpoints.js";
  import Icon from "@iconify/svelte";
  import {
    apiToasts,
    workflowToasts,
    showConfirmation,
  } from "$lib/services/toastService.js";

  let { data } = $props();

  // Get API configuration from server-loaded runtime config
  // svelte-ignore state_referenced_locally — page remounts on navigation
  let endpointConfig = $state<EndpointConfig>({
    ...defaultEndpointConfig,
    baseUrl: data.runtimeConfig.apiBaseUrl,
  });

  /**
   * Workflow display type
   */
  interface WorkflowDisplay {
    id: string;
    title: string;
    description: string;
    status: string;
    lastModified: string;
    nodes: number;
    connections: number;
  }

  // Workflow data state
  let workflows = $state<WorkflowDisplay[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let searchQuery = $state("");
  let viewMode = $state<"list" | "grid">("list");
  let filteredWorkflows = $derived(
    (Array.isArray(workflows) ? workflows : []).filter(
      (workflow) =>
        workflow.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  // Fetch workflows from API
  async function fetchWorkflows() {
    try {
      loading = true;
      error = null;

      // Use configured endpoint (config is loaded from server)
      const url = buildEndpointUrl(
        endpointConfig,
        endpointConfig.endpoints.workflows.list,
      );
      console.log("Fetching workflows from:", url); // Debug log
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extract workflows from the API response structure
      const apiWorkflows = data?.data || [];
      workflows = apiWorkflows.map(
        (workflow: {
          id: string;
          name: string;
          description: string;
          status?: string;
          changed?: number;
          nodes?: unknown[];
          edges?: unknown[];
        }) => ({
          id: workflow.id,
          title: workflow.name,
          description: workflow.description,
          status: workflow.status || "Active", // Default to Active if no status
          lastModified: workflow.changed
            ? new Date(workflow.changed * 1000).toISOString().split("T")[0]
            : "Unknown",
          nodes: workflow.nodes?.length || 0,
          connections: workflow.edges?.length || 0,
        }),
      );

      // Show success toast if workflows were loaded
      if (workflows.length > 0) {
        apiToasts.success(
          "Workflows loaded",
          `${workflows.length} workflows found`,
        );
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to fetch workflows";
      apiToasts.error(
        "Load workflows",
        err instanceof Error ? err.message : "Unknown error",
      );

      // Fallback to sample data
      workflows = [
        {
          id: "1",
          title: "Content Analysis Pipeline",
          description:
            "Analyze content for quality issues and provide recommendations",
          status: "Active",
          lastModified: "2024-01-15",
          nodes: 5,
          connections: 4,
        },
        {
          id: "workflow-2",
          title: "Multi-Agent Content Management",
          description:
            "Orchestrate multiple AI agents for content management tasks",
          status: "Draft",
          lastModified: "2024-01-14",
          nodes: 8,
          connections: 6,
        },
      ];
    } finally {
      loading = false;
    }
  }

  // Load workflows on mount
  onMount(() => {
    fetchWorkflows();
  });

  let selectedWorkflow = $state<string | null>(null);

  /**
   * Handle workflow operations from dropdown menu
   * @param workflowId - The ID of the workflow to perform operation on
   * @param operation - The operation to perform (edit, delete, view-execution, playground)
   */
  function handleOperation(workflowId: string, operation: string) {
    selectedWorkflow = null; // Close dropdown

    switch (operation) {
      case "edit":
        goto(`/workflow/${workflowId}/edit`);
        break;
      case "delete": {
        // Find the workflow to get its name
        const workflow = workflows.find((w) => w.id === workflowId);
        const workflowName = workflow?.title || "Unknown";

        // Show confirmation toast
        showConfirmation(`Are you sure you want to delete "${workflowName}"?`);
        // Note: Action buttons removed due to svelte-5-french-toast limitations
        // Handle delete logic here
        workflowToasts.deleted(workflowName);
        // Remove from local state
        workflows = workflows.filter((w) => w.id !== workflowId);
        break;
      }
      case "view-execution":
        goto(`/workflow/${workflowId}/pipelines`);
        break;
      case "playground":
        goto(`/workflow/${workflowId}/playground`);
        break;
    }
  }
</script>

<svelte:head>
  <title>Workflows - FlowDrop</title>
</svelte:head>

<div class="workflows-page">
  <!-- Header Section -->
  <div class="workflows-header">
    <div class="workflows-header__content">
      <div class="workflows-header__controls">
        <div class="workflows-search">
          <div class="flowdrop-search">
            <input
              type="text"
              placeholder="Search workflows..."
              bind:value={searchQuery}
              class="flowdrop-search__input"
            />
            <div class="flowdrop-search__icon">
              <Icon icon="mdi:magnify" class="w-4 h-4" />
            </div>
          </div>

          <div class="workflows-view-toggle">
            <button
              class="view-toggle {viewMode === 'list'
                ? 'view-toggle--active'
                : ''}"
              aria-label="List view"
              onclick={() => (viewMode = "list")}
            >
              <svg
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                style="color: #374151;"
              >
                <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"></path>
              </svg>
            </button>
            <button
              class="view-toggle {viewMode === 'grid'
                ? 'view-toggle--active'
                : ''}"
              aria-label="Grid view"
              onclick={() => (viewMode = "grid")}
            >
              <svg
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                style="color: #374151;"
              >
                <path
                  d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Workflows List -->
  <div class="workflows-content">
    {#if loading}
      <div class="workflows-loading">
        <div class="workflows-loading__content">
          <div class="workflows-loading__spinner"></div>
          <span>Loading workflows...</span>
        </div>
      </div>
    {:else if error}
      <div class="workflows-error">
        <div class="workflows-error__content">
          <div class="workflows-error__icon">
            <Icon icon="mdi:alert-circle" class="w-8 h-8" />
          </div>
          <h3>Failed to load workflows</h3>
          <p>{error}</p>
          <button
            class="flowdrop-btn flowdrop-btn--primary"
            onclick={fetchWorkflows}
          >
            Try Again
          </button>
        </div>
      </div>
    {:else}
      <div class="workflows-list workflows-list--{viewMode}">
        {#each filteredWorkflows as workflow (workflow.id)}
          <div
            class="workflow-card"
            role="button"
            tabindex="0"
            onclick={() => goto(`/workflow/${workflow.id}/edit`)}
            onkeydown={(e) =>
              e.key === "Enter" && goto(`/workflow/${workflow.id}/edit`)}
          >
            <div class="workflow-card__icon">
              <Icon icon="mdi:file-document" class="w-5 h-5" />
            </div>

            <div class="workflow-card__content">
              <div class="workflow-card__header">
                <h3 class="workflow-card__title">{workflow.title}</h3>
                <span class="workflow-card__time"
                  >Edited {workflow.lastModified}</span
                >
              </div>
              <p class="workflow-card__description">{workflow.description}</p>
              <div class="workflow-card__meta">
                <span class="workflow-meta workflow-meta--nodes"
                  >{workflow.nodes} nodes</span
                >
                <span class="workflow-meta workflow-meta--connections"
                  >{workflow.connections} connections</span
                >
                <span
                  class="workflow-status workflow-status--{workflow.status.toLowerCase()}"
                  >{workflow.status}</span
                >
              </div>
            </div>

            <div class="workflow-card__actions">
              <div class="workflow-dropdown">
                <button
                  class="workflow-dropdown__trigger"
                  onclick={(e) => {
                    e.stopPropagation();
                    selectedWorkflow =
                      selectedWorkflow === workflow.id ? null : workflow.id;
                  }}
                  aria-label="Open workflow options menu"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                    ></path>
                  </svg>
                </button>

                {#if selectedWorkflow === workflow.id}
                  <div class="workflow-dropdown__menu">
                    <button
                      class="workflow-dropdown__item"
                      onclick={() => handleOperation(workflow.id, "edit")}
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        ></path>
                      </svg>
                      Edit
                    </button>
                    <button
                      class="workflow-dropdown__item"
                      onclick={() =>
                        handleOperation(workflow.id, "view-execution")}
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        ></path>
                      </svg>
                      View Execution
                    </button>
                    <button
                      class="workflow-dropdown__item"
                      onclick={() => handleOperation(workflow.id, "playground")}
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        ></path>
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      Playground
                    </button>
                    <div class="workflow-dropdown__divider"></div>
                    <button
                      class="workflow-dropdown__item workflow-dropdown__item--danger"
                      onclick={() => handleOperation(workflow.id, "delete")}
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path>
                      </svg>
                      Delete
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}

        {#if filteredWorkflows.length === 0}
          <div class="workflows-empty">
            <div class="workflows-empty__content">
              <div class="workflows-empty__icon">
                <Icon icon="mdi:file-document-outline" class="w-12 h-12" />
              </div>
              <h3>No workflows found</h3>
              <p>
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Create your first workflow to get started"}
              </p>
              {#if !searchQuery}
                <button
                  class="flowdrop-btn flowdrop-btn--primary"
                  onclick={() => goto("/workflow/create")}
                >
                  Create Your First Workflow
                </button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .workflows-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    background: var(--fd-muted);
  }

  .workflows-header {
    background: var(--fd-background);
    border-bottom: 1px solid var(--fd-border);
    padding: var(--fd-space-xl) var(--fd-space-4xl);
  }

  .workflows-header__content {
    max-width: 80rem;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .workflows-header__title p {
    color: var(--fd-muted-foreground);
    margin: 0;
  }

  .workflows-filters {
    background: transparent;
    padding: var(--fd-space-3xl) var(--fd-space-4xl) var(--fd-space-xl)
      var(--fd-space-4xl);
  }

  .workflows-search {
    max-width: 80rem;
    margin: 0 auto;
  }

  .flowdrop-search {
    position: relative;
    max-width: 400px;
  }

  .flowdrop-search__input {
    width: 100%;
    padding: var(--fd-space-md) var(--fd-space-xl) var(--fd-space-md) 2.5rem;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    font-size: var(--fd-text-sm);
    background: var(--fd-background);
    color: var(--fd-foreground);
  }

  .flowdrop-search__input::placeholder {
    color: var(--fd-muted-foreground);
  }

  .flowdrop-search__input:focus {
    outline: none;
    border-color: var(--fd-primary);
    box-shadow: 0 0 0 3px var(--fd-primary-muted);
  }

  .flowdrop-search__icon {
    position: absolute;
    left: var(--fd-space-md);
    top: 50%;
    transform: translateY(-50%);
    color: var(--fd-muted-foreground);
  }

  .flowdrop-search__icon :global(svg) {
    width: 1rem;
    height: 1rem;
  }

  .workflows-content {
    flex: 1;
    padding: var(--fd-space-xl) var(--fd-space-4xl);
    overflow-y: auto;
  }

  .workflows-table-container {
    max-width: 80rem;
    margin: 0 auto;
    background: var(--fd-card);
    border-radius: var(--fd-radius-2xl);
    box-shadow: var(--fd-shadow-md);
    overflow: hidden;
  }

  .workflows-table {
    width: 100%;
    border-collapse: collapse;
  }

  .workflow-row {
    transition: all var(--fd-transition-normal);
  }

  .workflow-row:hover {
    background: var(--fd-muted);
    transform: translateY(-1px);
    box-shadow: var(--fd-shadow-md);
  }

  .workflow-title h3 {
    font-size: var(--fd-text-lg);
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0 0 var(--fd-space-3xs) 0;
    line-height: 1.4;
  }

  .workflow-description p {
    color: var(--fd-muted-foreground);
    margin: 0;
    font-size: var(--fd-text-sm);
    line-height: 1.5;
    max-width: 400px;
  }

  .status-badge {
    padding: var(--fd-space-3xs) var(--fd-space-md);
    border-radius: var(--fd-radius-lg);
    font-size: var(--fd-text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .status-badge--active {
    background: var(--fd-success-muted);
    color: var(--fd-success);
  }

  .status-badge--draft {
    background: var(--fd-warning-muted);
    color: var(--fd-warning);
  }

  .workflow-date {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
  }

  .workflow-nodes,
  .workflow-connections {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 600;
    text-align: center;
    background: var(--fd-secondary);
    padding: var(--fd-space-3xs) var(--fd-space-xs);
    border-radius: var(--fd-radius-md);
    display: inline-block;
    min-width: 2rem;
  }

  .workflow-operations {
    text-align: right;
  }

  .workflow-dropdown {
    position: relative;
    display: inline-block;
  }

  .workflow-dropdown__trigger {
    background: var(--fd-muted);
    border: 1px solid var(--fd-border);
    padding: var(--fd-space-md);
    cursor: pointer;
    color: var(--fd-muted-foreground);
    border-radius: var(--fd-radius-lg);
    transition: all var(--fd-transition-normal);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.5rem;
    min-height: 2.5rem;
  }

  .workflow-dropdown__trigger:hover {
    background: var(--fd-secondary);
    color: var(--fd-foreground);
    border-color: var(--fd-border-strong);
    transform: scale(1.05);
  }

  .workflow-dropdown__trigger svg {
    width: 1rem;
    height: 1rem;
  }

  .workflow-dropdown__menu {
    position: absolute;
    right: 0;
    top: 100%;
    background: var(--fd-card);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-xl);
    box-shadow: var(--fd-shadow-xl);
    z-index: 50;
    min-width: 220px;
    margin-top: var(--fd-space-md);
    overflow: hidden;
  }

  .workflow-dropdown__item {
    display: flex;
    align-items: center;
    gap: var(--fd-space-md);
    width: 100%;
    padding: var(--fd-space-md) var(--fd-space-2xl);
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    transition: all var(--fd-transition-normal);
    border-bottom: 1px solid var(--fd-border-muted);
  }

  .workflow-dropdown__item:last-child {
    border-bottom: none;
  }

  .workflow-dropdown__item svg {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
  }

  .workflow-dropdown__item:hover {
    background: var(--fd-muted);
    color: var(--fd-foreground);
    transform: translateX(2px);
  }

  .workflow-dropdown__item:hover svg {
    color: var(--fd-foreground);
  }

  .workflow-dropdown__item--danger {
    color: var(--fd-error);
  }

  .workflow-dropdown__item--danger:hover {
    background: var(--fd-error-muted);
    color: var(--fd-error-hover);
  }

  .workflow-dropdown__item--danger svg {
    color: var(--fd-error);
  }

  .workflow-dropdown__item--danger:hover svg {
    color: var(--fd-error-hover);
  }

  .workflow-dropdown__divider {
    height: 1px;
    background: var(--fd-border);
    margin: var(--fd-space-xs) 0;
  }

  .workflows-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .workflows-empty__content {
    text-align: center;
    max-width: 400px;
  }

  .workflows-empty__icon {
    margin-bottom: var(--fd-space-xl);
    color: var(--fd-muted-foreground);
  }

  .workflows-empty__icon :global(svg) {
    width: 3rem;
    height: 3rem;
  }

  .workflows-empty__content h3 {
    font-size: var(--fd-text-xl);
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0 0 var(--fd-space-xs) 0;
  }

  .workflows-empty__content p {
    color: var(--fd-muted-foreground);
    margin: 0 0 var(--fd-space-3xl) 0;
  }

  .workflows-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .workflows-loading__content {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xl);
    color: var(--fd-muted-foreground);
  }

  .workflows-loading__spinner {
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid var(--fd-border);
    border-top: 2px solid var(--fd-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .workflows-error {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .workflows-error__content {
    text-align: center;
    max-width: 400px;
  }

  .workflows-error__icon {
    margin-bottom: var(--fd-space-xl);
    color: var(--fd-error);
  }

  .workflows-error__content h3 {
    font-size: var(--fd-text-xl);
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0 0 var(--fd-space-xs) 0;
  }

  .workflows-error__content p {
    color: var(--fd-muted-foreground);
    margin: 0 0 var(--fd-space-3xl) 0;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .flowdrop-btn {
    padding: var(--fd-space-xs) var(--fd-space-xl);
    border-radius: var(--fd-radius-md);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all var(--fd-transition-normal);
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
  }

  .flowdrop-btn--primary {
    background: var(--fd-primary);
    color: var(--fd-primary-foreground);
    border-color: var(--fd-primary);
  }

  .flowdrop-btn--primary:hover {
    background: var(--fd-primary-hover);
    border-color: var(--fd-primary-hover);
  }

  .flowdrop-btn__icon {
    font-size: var(--fd-text-base);
  }

  /* New Card-Based Styles */
  .workflows-header__tabs {
    display: flex;
    gap: var(--fd-space-xs);
  }

  .workflows-tab {
    padding: var(--fd-space-xs) var(--fd-space-xl);
    border: none;
    background: none;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all var(--fd-transition-normal);
  }

  .workflows-tab--active {
    color: var(--fd-foreground);
    border-bottom-color: var(--fd-foreground);
  }

  .workflows-tab:hover {
    color: var(--fd-foreground);
  }

  .workflows-header__controls {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xl);
  }

  .workflows-search {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xl);
  }

  .workflows-view-toggle {
    display: flex;
    gap: var(--fd-space-3xs);
    background: var(--fd-secondary);
    border-radius: var(--fd-radius-lg);
    padding: var(--fd-space-3xs);
  }

  .view-toggle {
    padding: var(--fd-space-xs);
    border: none;
    background: none;
    color: var(--fd-muted-foreground);
    cursor: pointer;
    border-radius: var(--fd-radius-md);
    transition: all var(--fd-transition-normal);
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .view-toggle--active {
    background: var(--fd-background);
    color: var(--fd-foreground);
    box-shadow: var(--fd-shadow-sm);
  }

  .view-toggle:hover {
    color: var(--fd-foreground);
  }

  .view-toggle svg {
    color: inherit;
  }

  .workflows-list {
    max-width: 80rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .workflows-list--grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--fd-space-xl);
  }

  .workflows-list--grid .workflow-card {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    padding: var(--fd-space-2xl);
    position: relative;
  }

  .workflows-list--grid .workflow-card__icon {
    width: 2rem;
    height: 2rem;
    margin-bottom: var(--fd-space-md);
  }

  .workflows-list--grid .workflow-card__header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--fd-space-xs);
    margin-bottom: var(--fd-space-xs);
  }

  .workflows-list--grid .workflow-card__actions {
    position: absolute;
    top: var(--fd-space-xl);
    right: var(--fd-space-xl);
  }

  .workflow-card {
    background: var(--fd-card);
    border-radius: var(--fd-radius-lg);
    padding: var(--fd-space-xl);
    display: flex;
    align-items: center;
    gap: var(--fd-space-md);
    transition: all var(--fd-transition-normal);
    border: 1px solid var(--fd-border);
    cursor: pointer;
  }

  .workflow-card:hover {
    border-color: var(--fd-border-strong);
    box-shadow: var(--fd-shadow-md);
  }

  /* Squircle icon wrapper - Apple-style rounded square with tinted background */
  .workflow-card__icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fd-primary);
    flex-shrink: 0;
    background: color-mix(in srgb, var(--fd-primary) 15%, transparent);
    transition: all var(--fd-transition-normal);
  }

  .workflow-card:hover .workflow-card__icon {
    background: color-mix(in srgb, var(--fd-primary) 22%, transparent);
    transform: scale(1.05);
  }

  .workflow-card__content {
    flex: 1;
    min-width: 0;
  }

  .workflow-card__header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-md);
    margin-bottom: var(--fd-space-3xs);
  }

  .workflow-card__title {
    font-size: var(--fd-text-base);
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0;
  }

  .workflow-card__time {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 500;
  }

  .workflow-card__description {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    line-height: 1.4;
    margin: 0 0 var(--fd-space-xs) 0;
    max-width: 500px;
  }

  .workflow-card__meta {
    display: flex;
    align-items: center;
    gap: var(--fd-space-md);
  }

  .workflow-meta {
    color: var(--fd-muted-foreground);
    font-size: 0.625rem;
    font-weight: 500;
    background: var(--fd-secondary);
    padding: 0.125rem var(--fd-space-3xs);
    border-radius: var(--fd-radius-sm);
  }

  .workflow-status {
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.125rem var(--fd-space-3xs);
    border-radius: var(--fd-radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .workflow-status--active {
    background: var(--fd-success-muted);
    color: var(--fd-success);
  }

  .workflow-status--draft {
    background: var(--fd-warning-muted);
    color: var(--fd-warning);
  }

  .workflow-card__actions {
    flex-shrink: 0;
  }
</style>
