<!--
  Editor E2E Test Page

  Mounts the FlowDrop App component with controlled props for E2E testing.
  Supports query params to control the initial workflow state:
    - ?workflow=empty   -> empty canvas (no nodes)
    - ?workflow=complex  -> branching workflow with 4 nodes, 3 edges
    - (default)          -> simple workflow with 2 nodes, 1 edge
    - ?settingsDefaults=light|dark|auto -> seed host settings defaults
      before mounting, mirroring mountFlowDropApp({ settings }) — used by
      the settings persistence tests

  Used by: tests/e2e/editor-*.spec.ts
-->

<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import App from '$lib/components/App.svelte';
  import { initializeSettings } from '$lib/stores/settingsStore.svelte.js';
  import type { Workflow, NodeMetadata } from '$lib/types/index.js';
  import type { ThemePreference } from '$lib/types/settings.js';
  import { createChainedTriggerWorkflow } from '../../../mocks/data/workflows.js';

  // --- Query param for workflow variant ---
  let workflowVariant = $derived($page.url.searchParams.get('workflow') ?? 'simple');

  // --- Query param for UI theme (?theme=default|minimal|drafter) ---
  let themeName = $derived(
    ($page.url.searchParams.get('theme') ?? 'default') as 'default' | 'minimal' | 'drafter'
  );

  // --- Host settings defaults (settings persistence e2e) ---
  // Seeded during component init, before <App> mounts — the same ordering
  // mountFlowDropApp uses (initializeSettings before mount()).
  if (browser) {
    const pref = new URLSearchParams(window.location.search).get('settingsDefaults');
    if (pref === 'light' || pref === 'dark' || pref === 'auto') {
      void initializeSettings({ defaults: { theme: { preference: pref as ThemePreference } } });
    }
  }

  // --- Node type definitions (inlined to avoid import path issues) ---
  const testNodeTypes: NodeMetadata[] = [
    {
      node_type_id: 'text_input',
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
          defaultValue: { type: 'string', title: 'Default Value', default: '' },
          placeholder: {
            type: 'string',
            title: 'Placeholder',
            default: 'Enter text...'
          },
          // Discrete boolean control — regression coverage for #38 (WebKit
          // on-blur commit). See editor-config.spec.ts.
          required: { type: 'boolean', title: 'Required', default: false }
        }
      },
      tags: ['input', 'text']
    },
    {
      node_type_id: 'text_output',
      name: 'Text Output',
      description: 'Display text output',
      category: 'outputs',
      version: '1.0.0',
      type: 'default',
      icon: 'mdi:text-box-check',
      color: '#10b981',
      inputs: [
        {
          id: 'value',
          name: 'Value',
          type: 'input',
          dataType: 'string',
          required: true
        }
      ],
      outputs: [],
      configSchema: {
        type: 'object',
        properties: {}
      },
      tags: ['output', 'text']
    },
    {
      node_type_id: 'calculator',
      name: 'Calculator',
      description: 'Perform mathematical operations',
      category: 'processing',
      version: '1.0.0',
      type: 'default',
      icon: 'mdi:calculator',
      color: '#f59e0b',
      inputs: [
        {
          id: 'a',
          name: 'Number A',
          type: 'input',
          dataType: 'number',
          required: true
        },
        {
          id: 'b',
          name: 'Number B',
          type: 'input',
          dataType: 'number',
          required: true
        }
      ],
      outputs: [{ id: 'result', name: 'Result', type: 'output', dataType: 'number' }],
      configSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            title: 'Operation',
            enum: ['add', 'subtract', 'multiply', 'divide'],
            default: 'add'
          }
        },
        required: ['operation']
      },
      tags: ['math', 'processing']
    },
    {
      node_type_id: 'gateway',
      name: 'Gateway',
      description: 'Route data based on conditions',
      category: 'control',
      version: '1.0.0',
      type: 'gateway',
      icon: 'mdi:call-split',
      color: '#8b5cf6',
      inputs: [
        {
          id: 'input',
          name: 'Input',
          type: 'input',
          dataType: 'mixed',
          required: true
        }
      ],
      outputs: [],
      configSchema: {
        type: 'object',
        properties: {
          branches: {
            type: 'array',
            title: 'Branches',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', title: 'Branch ID' },
                label: { type: 'string', title: 'Label' },
                condition: { type: 'string', title: 'Condition' }
              },
              required: ['name', 'label']
            }
          }
        }
      },
      tags: ['control', 'branching']
    },
    {
      node_type_id: 'terminal',
      name: 'Terminal',
      description: 'Workflow start or end point',
      category: 'control',
      version: '1.0.0',
      type: 'terminal',
      icon: 'mdi:circle',
      color: '#6366f1',
      inputs: [],
      outputs: [{ id: 'trigger', name: 'Trigger', type: 'output', dataType: 'trigger' }],
      configSchema: {
        type: 'object',
        properties: {
          terminalType: {
            type: 'string',
            title: 'Type',
            enum: ['start', 'end'],
            default: 'start'
          }
        }
      },
      tags: ['control', 'terminal']
    }
  ];

  // --- Workflow variants ---
  const simpleWorkflow: Workflow = {
    id: 'test-workflow-simple',
    name: 'Simple Test Workflow',
    description: 'Two connected nodes for E2E testing',
    nodes: [
      {
        id: 'node-input',
        type: 'universalNode',
        position: { x: 200, y: 200 },
        data: {
          label: 'Text Input',
          config: { defaultValue: 'hello', placeholder: 'Enter text...' },
          metadata: testNodeTypes[0]
        }
      },
      {
        id: 'node-output',
        type: 'universalNode',
        position: { x: 600, y: 200 },
        data: {
          label: 'Text Output',
          config: {},
          metadata: testNodeTypes[1]
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-input',
        target: 'node-output',
        sourceHandle: 'value',
        targetHandle: 'value'
      }
    ],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  };

  const emptyWorkflow: Workflow = {
    id: '',
    name: 'Untitled Workflow',
    description: '',
    nodes: [],
    edges: [],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  };

  const complexWorkflow: Workflow = {
    id: 'test-workflow-complex',
    name: 'Complex Test Workflow',
    description: 'Branching workflow for E2E testing',
    nodes: [
      {
        id: 'node-start',
        type: 'universalNode',
        position: { x: 100, y: 200 },
        data: {
          label: 'Start',
          config: { terminalType: 'start' },
          metadata: testNodeTypes[4]
        }
      },
      {
        id: 'node-input',
        type: 'universalNode',
        position: { x: 350, y: 200 },
        data: {
          label: 'Text Input',
          config: { defaultValue: '' },
          metadata: testNodeTypes[0]
        }
      },
      {
        id: 'node-calc',
        type: 'universalNode',
        position: { x: 600, y: 100 },
        data: {
          label: 'Calculator',
          config: { operation: 'add' },
          metadata: testNodeTypes[2]
        }
      },
      {
        id: 'node-output',
        type: 'universalNode',
        position: { x: 600, y: 300 },
        data: {
          label: 'Text Output',
          config: {},
          metadata: testNodeTypes[1]
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-start',
        target: 'node-input',
        sourceHandle: 'trigger',
        targetHandle: 'value'
      },
      {
        id: 'edge-2',
        source: 'node-input',
        target: 'node-calc',
        sourceHandle: 'value',
        targetHandle: 'a'
      },
      {
        id: 'edge-3',
        source: 'node-input',
        target: 'node-output',
        sourceHandle: 'value',
        targetHandle: 'value'
      }
    ],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  };

  // Workflow with a UUID id (simulates a backend-saved workflow for save/PUT regression tests)
  const uuidWorkflow: Workflow = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'UUID Test Workflow',
    description: 'Workflow with a backend UUID id for save regression testing',
    nodes: [
      {
        id: 'node-input',
        type: 'universalNode',
        position: { x: 200, y: 200 },
        data: {
          label: 'Text Input',
          config: { defaultValue: 'hello', placeholder: 'Enter text...' },
          metadata: testNodeTypes[0]
        }
      },
      {
        id: 'node-output',
        type: 'universalNode',
        position: { x: 600, y: 200 },
        data: {
          label: 'Text Output',
          config: {},
          metadata: testNodeTypes[1]
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-input',
        target: 'node-output',
        sourceHandle: 'value',
        targetHandle: 'value'
      }
    ],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  };

  // Workflow with 2 disconnected nodes (for connection testing)
  const disconnectedWorkflow: Workflow = {
    id: 'test-workflow-disconnected',
    name: 'Disconnected Workflow',
    description: 'Two nodes with no edges for connection testing',
    nodes: [
      {
        id: 'node-input',
        type: 'universalNode',
        position: { x: 200, y: 200 },
        data: {
          label: 'Text Input',
          config: { defaultValue: '' },
          metadata: testNodeTypes[0]
        }
      },
      {
        id: 'node-output',
        type: 'universalNode',
        position: { x: 600, y: 200 },
        data: {
          label: 'Text Output',
          config: {},
          metadata: testNodeTypes[1]
        }
      }
    ],
    edges: [],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  };

  const workflows: Record<string, Workflow> = {
    simple: simpleWorkflow,
    empty: emptyWorkflow,
    complex: complexWorkflow,
    disconnected: disconnectedWorkflow,
    uuid: uuidWorkflow
  };

  // Performance variant: ?workflow=perf builds N default nodes chained via
  // trigger ports (default 500, override with ?count=N). Used by
  // tests/e2e/editor-performance.spec.ts.
  let perfCount = $derived(
    Math.min(5000, Math.max(1, Number($page.url.searchParams.get('count')) || 500))
  );
  let selectedWorkflow = $derived(
    workflowVariant === 'perf'
      ? createChainedTriggerWorkflow(perfCount, 'perf-chain')
      : (workflows[workflowVariant] ?? simpleWorkflow)
  );
</script>

<svelte:head>
  <title>Editor E2E Test - FlowDrop</title>
</svelte:head>

<div class="editor-test-page" data-testid="editor-test">
  <div class="editor-test-page__status" data-testid="workflow-variant">
    Variant: {workflowVariant}
  </div>
  <App
    height="100vh"
    width="100%"
    showNavbar={true}
    nodes={testNodeTypes}
    workflow={selectedWorkflow}
    theme={themeName}
  />
</div>

<style>
  .editor-test-page {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .editor-test-page__status {
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
