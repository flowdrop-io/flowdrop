<!--
  Auth Autocomplete Test Page

  E2E test fixture that mounts FlowDrop with a StaticAuthProvider and a
  pre-populated workflow containing a task_assignment node.
  The node's assignee autocomplete points to an auth-required MSW endpoint.

  Used by: tests/e2e/auth-autocomplete.spec.ts
-->

<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import App from "$lib/components/App.svelte";
  import { StaticAuthProvider } from "$lib/types/auth.js";
  import { createEndpointConfig } from "$lib/config/endpoints.js";
  import { setEndpointConfig } from "$lib/services/api.js";
  import { workflowActions } from "$lib/stores/workflowStore.svelte.js";
  import type {
    Workflow,
    NodeMetadata,
    AuthProvider,
  } from "$lib/types/index.js";

  // Read ?noauth query param to control whether auth is provided
  let noAuth = $derived($page.url.searchParams.has("noauth"));

  // Auth provider: test token that the MSW auth-users handler expects
  let authProvider: AuthProvider | undefined = $derived(
    noAuth
      ? undefined
      : new StaticAuthProvider({
          type: "bearer",
          token: "test-auth-token-123",
        }),
  );

  // Node metadata for a task_assignment node with auth-required autocomplete
  const taskAssignmentNode: NodeMetadata = {
    id: "task_assignment_auth_test",
    name: "Task Assignment (Auth Test)",
    type: "default",
    description:
      "Task assignment node with auth-required autocomplete endpoint",
    category: "helpers",
    version: "1.0.0",
    inputs: [
      {
        id: "input",
        name: "Input",
        type: "input",
        dataType: "string",
        required: false,
      },
    ],
    outputs: [
      {
        id: "output",
        name: "Output",
        type: "output",
        dataType: "string",
      },
    ],
    config: {
      assignee: "",
    },
    configSchema: {
      type: "object",
      properties: {
        assignee: {
          type: "string",
          title: "Assignee",
          description: "Select a team member (requires auth)",
          format: "autocomplete",
          autocomplete: {
            url: "/api/flowdrop/autocomplete/auth-users",
            queryParam: "q",
            minChars: 0,
            debounceMs: 100,
            fetchOnFocus: true,
            labelField: "label",
            valueField: "value",
            allowFreeText: false,
          },
        },
      },
    },
  };

  // Pre-populated workflow with one task_assignment node
  const testWorkflow: Workflow = {
    id: "auth-test-workflow",
    name: "Auth Test Workflow",
    description: "Test workflow for auth autocomplete e2e test",
    nodes: [
      {
        id: "node-1",
        type: "universalNode",
        position: { x: 600, y: 200 },
        data: {
          nodeId: "node-1",
          label: "Task Assignment (Auth Test)",
          config: { assignee: "" },
          metadata: taskAssignmentNode,
        },
      },
    ],
    edges: [],
    metadata: {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  // Initialize endpoint config and workflow on mount
  onMount(() => {
    const endpointConfig = createEndpointConfig("/api/flowdrop");
    setEndpointConfig(endpointConfig);

    workflowActions.initialize(testWorkflow);
  });
</script>

<svelte:head>
  <title>Auth Autocomplete Test - FlowDrop</title>
</svelte:head>

<div class="auth-test-page" data-testid="auth-autocomplete-test">
  <div class="auth-test-page__status" data-testid="auth-status">
    {noAuth ? "Auth: disabled" : "Auth: enabled"}
  </div>
  <App
    height="100vh"
    width="100%"
    showNavbar={false}
    nodes={[taskAssignmentNode]}
    workflow={testWorkflow}
    {authProvider}
  />
</div>

<style>
  .auth-test-page {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .auth-test-page__status {
    position: fixed;
    top: 8px;
    right: 8px;
    z-index: 9999;
    padding: 4px 8px;
    font-size: 11px;
    font-family: monospace;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    border-radius: 4px;
  }
</style>
