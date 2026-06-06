<!--
  Multi-Instance Test Page

  Mounts TWO independent FlowDrop App components side by side, each with its
  own FlowDropInstance. Used to verify per-instance isolation manually and in
  E2E tests:
    - editing / adding nodes in one editor must not affect the other
    - undo/redo (Cmd/Ctrl+Z) in one editor must not touch the other's history
    - destroying one (navigating away) must not break the survivor

  Known page-global behavior (by design): theme, settings (incl. console/
  sidebar toggles), and port compatibility config are shared.
-->

<script lang="ts">
  import App from '$lib/components/App.svelte';
  import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
  import type { Workflow, NodeMetadata } from '$lib/types/index.js';

  const testNodeTypes: NodeMetadata[] = [
    {
      id: 'text_input',
      name: 'Text Input',
      description: 'Accept text input from user',
      category: 'inputs',
      version: '1.0.0',
      type: 'default',
      icon: 'mdi:text-box',
      color: '#3b82f6',
      inputs: [],
      outputs: [{ id: 'value', name: 'Value', type: 'output', dataType: 'string' }],
      configSchema: {
        type: 'object',
        properties: {
          defaultValue: { type: 'string', title: 'Default Value', default: '' }
        }
      },
      tags: ['input', 'text']
    },
    {
      id: 'text_output',
      name: 'Text Output',
      description: 'Display text output',
      category: 'outputs',
      version: '1.0.0',
      type: 'default',
      icon: 'mdi:text-box-check',
      color: '#10b981',
      inputs: [{ id: 'value', name: 'Value', type: 'input', dataType: 'string', required: true }],
      outputs: [],
      configSchema: { type: 'object', properties: {} },
      tags: ['output', 'text']
    }
  ];

  function makeWorkflow(suffix: string, x: number): Workflow {
    return {
      id: `multi-test-${suffix}`,
      name: `Workflow ${suffix.toUpperCase()}`,
      description: `Instance isolation test workflow ${suffix}`,
      nodes: [
        {
          id: `node-input-${suffix}`,
          type: 'universalNode',
          position: { x, y: 150 },
          data: {
            nodeId: `node-input-${suffix}`,
            label: `Text Input (${suffix.toUpperCase()})`,
            config: { defaultValue: suffix },
            metadata: testNodeTypes[0]
          }
        },
        {
          id: `node-output-${suffix}`,
          type: 'universalNode',
          position: { x: x + 350, y: 150 },
          data: {
            nodeId: `node-output-${suffix}`,
            label: `Text Output (${suffix.toUpperCase()})`,
            config: {},
            metadata: testNodeTypes[1]
          }
        }
      ],
      edges: [
        {
          id: `edge-${suffix}`,
          source: `node-input-${suffix}`,
          target: `node-output-${suffix}`,
          sourceHandle: 'value',
          targetHandle: 'value'
        }
      ],
      metadata: {
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    };
  }

  // Two explicit instances — the same thing mountFlowDropApp does per mount.
  const instanceA = createFlowDropInstance({ id: 'left' });
  const instanceB = createFlowDropInstance({ id: 'right' });

  const workflowA = makeWorkflow('a', 150);
  const workflowB = makeWorkflow('b', 150);
</script>

<div class="multi-test-page">
  <section class="multi-test-page__pane" data-testid="editor-a">
    <h2>Editor A (instance: left)</h2>
    <App
      instance={instanceA}
      height="100%"
      width="100%"
      showNavbar={true}
      navbarTitle="Editor A"
      nodes={testNodeTypes}
      workflow={workflowA}
    />
  </section>
  <section class="multi-test-page__pane" data-testid="editor-b">
    <h2>Editor B (instance: right)</h2>
    <App
      instance={instanceB}
      height="100%"
      width="100%"
      showNavbar={true}
      navbarTitle="Editor B"
      nodes={testNodeTypes}
      workflow={workflowB}
    />
  </section>
</div>

<style>
  .multi-test-page {
    display: flex;
    height: 100vh;
    gap: 2px;
  }

  .multi-test-page__pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .multi-test-page__pane h2 {
    margin: 0;
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
    background: #1e293b;
    color: #e2e8f0;
  }
</style>
