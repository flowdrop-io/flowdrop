<!--
  Editor E2E Test Page

  Mounts the FlowDrop App component with controlled props for E2E testing.
  Supports query params to control the initial workflow state:
    - ?workflow=empty   -> empty canvas (no nodes)
    - ?workflow=complex  -> branching workflow with 4 nodes, 3 edges
    - (default)          -> simple workflow with 2 nodes, 1 edge
    - ?mode=readonly|locked -> editor mode (default 'edit')
    - ?editorMode=test   -> start in Test mode (the Edit | Test axis, not `mode`)
    - ?workflow=inspector -> three nodes with the real fddo inspector shapes: a Chat
                           Output-like node (loose controls, then General / Execution /
                           Ports groups, several ports), a node with no ports, and a
                           subworkflow executor with an external workflow link
    - ?workflow=config   -> the config-form shapes: a Switch-like gateway whose
                           `default_branch` carries `x-item-ref` (a row mark in the branch
                           list), a second one with `default_branch` wired to an input, one
                           whose default names no branch, a node with a two-field array
                           (headers) and an If/Else-like gateway with read-only branches
    - ?workflow=interface -> a workflow whose interface publishes three ports: an input
                           `amount` (ok), an input `items` declared `array` on a number
                           port (type mismatch tag), and an output `message`; the
                           Calculator's `result` output is left unpublished so the
                           expose flow can be driven from it
    - ?workflow=doctor   -> three nodes the stubbed Doctor (tests/e2e/helpers/doctor-stub.ts)
                           finds a problem on each: an unknown config key, a missing
                           required key and a node whose type is not installed
    - ?workflow=caption  -> a text input plus two captions (short, long); also
                           offers the caption node type
    - ?caption=1         -> offer the caption node type (the pane menu then has
                           "Add caption"); without it the type list has none
    - ?contextMenu=extra -> pass a `contextMenu.items` that appends a
      "Test extra entry" item; running it sets window.__contextMenuExtraRan
    - ?sessions=1        -> the endpoint config carries the `sessions` group
                           (per-session calls under /sessions/{id}, incl. the
                           runs endpoint), as a FlowDrop 2.7.0 backend sends it
    - ?playground=none   -> the workflow carries Playground settings with no
                           chat bound (a FlowDrop 2.7.0 backend), so the
                           settings surface shows the Playground tab
    - ?playground=turn   -> as `none`, plus an interface input that still has
                           the deprecated `turn: message`
    - ?playground=form   -> as `none`, plus one required interface input and no
                           message port, so Test mode runs as a form (Run button)
    - ?playground=chatform -> a chat bound to a `message` input, plus the required
                           `topic` input: Test mode folds the inputs into a row
                           above the composer
    - ?playground=chat   -> a chat bound to a `message` input and one reply port, no
                           other inputs: Test mode runs as a plain conversation
    - ?hostScheme=light|dark|auto[&hostLabel=..] -> simulate a host passing
      the colorScheme.host mount option (window.__setHostScheme(v) pushes live changes)
    - ?webmcpBridge=fake -> install a fake desktop-bridge widget (no network) and offer three
                           tools through it, so the bridge button shows in the zoom controls.
                           Connect with token `hold` (stays connecting; window.__fakeBridge.settle()
                           finishes it), `fail` (registration error) or anything else (connects)
    - ?adminLinks=1      -> the host gives admin URL templates for the Runs list
                           (`features.adminLinks`): the footer "Open in admin" and
                           a link on each row
    - ?settingsDefaults=light|dark|auto -> seed host settings defaults
      before mounting, mirroring mountFlowDropApp({ settings }) — used by
      the settings persistence tests

  Used by: tests/e2e/editor-*.spec.ts
-->

<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import '$lib/styles/fonts/inter.css';
  import App from '$lib/components/App.svelte';
  import { initializeSettings } from '$lib/stores/settingsStore.svelte.js';
  import type { Workflow, NodeMetadata } from '$lib/types/index.js';
  import type {
    ColorSchemeOption,
    SettingsCategory,
    ThemePreference
  } from '$lib/types/settings.js';
  import type { ContextMenuOptions } from '$lib/editor/contextMenu.js';
  import { defaultEndpointConfig, sessionsEndpoints } from '$lib/config/endpoints.js';
  import { installBridgedModelContext } from '$lib/webmcp/bridge.js';
  import { createFakeBridgeWidget } from '$lib/webmcp/fakeWidget.js';
  import {
    createChainedTriggerWorkflow,
    demoNodeTypesShowcaseWorkflow
  } from '../../../mocks/data/workflows.js';

  // --- Query param for workflow variant ---
  let workflowVariant = $derived($page.url.searchParams.get('workflow') ?? 'simple');

  // --- Query param for UI theme (?theme=default|minimal|drafter|graphite) ---
  // Absent: no theme prop, so the persisted settings theme applies (the settings e2e relies on it).
  let themeName = $derived(
    ($page.url.searchParams.get('theme') ?? undefined) as
      | 'default'
      | 'minimal'
      | 'drafter'
      | 'graphite'
      | undefined
  );

  // --- Query param for the Runs list's admin links (?adminLinks=1) ---
  let features = $derived(
    $page.url.searchParams.get('adminLinks')
      ? {
          adminLinks: {
            runs: '/admin/flowdrop/pipelines?workflow={workflowId}',
            run: '/admin/flowdrop/pipelines/{pipelineId}'
          }
        }
      : undefined
  );

  // --- Query param for editor mode (?mode=readonly|locked) ---
  let editorMode = $derived(
    (['readonly', 'locked'].includes($page.url.searchParams.get('mode') ?? '')
      ? $page.url.searchParams.get('mode')
      : 'edit') as 'edit' | 'readonly' | 'locked'
  );

  // --- Query param for the Edit | Test axis (?editorMode=test) ---
  let editorTestMode = $derived(
    $page.url.searchParams.get('editorMode') === 'test' ? ('test' as const) : undefined
  );

  // --- Consumer context-menu entry (?contextMenu=extra) ---
  let contextMenu = $derived<ContextMenuOptions | undefined>(
    $page.url.searchParams.get('contextMenu') === 'extra'
      ? {
          items: (_ctx, defaults) => [
            ...defaults,
            {
              id: 'test-extra',
              label: 'Test extra entry',
              run: () => {
                (window as unknown as Record<string, unknown>).__contextMenuExtraRan = true;
              }
            }
          ]
        }
      : undefined
  );

  // --- Host settings defaults (settings persistence e2e) ---
  // Seeded during component init, before <App> mounts — the same ordering
  // mountFlowDropApp uses (initializeSettings before mount()).
  // ?hostScheme=light|dark|auto[&hostLabel=...] simulates an embedding page that
  // passes the `colorScheme.host` mount option; window.__setHostScheme(v)
  // pushes a live change through its `subscribe`.
  if (browser) {
    const query = new URLSearchParams(window.location.search);
    const pref = query.get('settingsDefaults');
    const hostScheme = query.get('hostScheme');
    let colorScheme: ColorSchemeOption | undefined;
    if (hostScheme === 'light' || hostScheme === 'dark' || hostScheme === 'auto') {
      const listeners = new Set<(v: 'light' | 'dark' | 'auto') => void>();
      (window as unknown as Record<string, unknown>).__setHostScheme = (
        v: 'light' | 'dark' | 'auto'
      ) => listeners.forEach((cb) => cb(v));
      colorScheme = {
        host: {
          value: hostScheme,
          label: query.get('hostLabel') ?? 'Match host',
          subscribe: (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
          }
        }
      };
    }
    const hasPref = pref === 'light' || pref === 'dark' || pref === 'auto';
    if (hasPref || colorScheme) {
      void initializeSettings({
        ...(hasPref && { defaults: { theme: { preference: pref as ThemePreference } } }),
        ...(colorScheme && { colorScheme })
      });
    }
  }

  // --- ?webmcpBridge=fake: the desktop bridge, with a fake widget (see fakeWidget.ts) ---
  if (browser && new URLSearchParams(window.location.search).get('webmcpBridge') === 'fake') {
    const widget = createFakeBridgeWidget();
    (window as unknown as Record<string, unknown>).__fakeBridge = widget;
    const context = installBridgedModelContext(widget);
    const tool = (name: string, description: string) => ({
      name,
      description,
      inputSchema: {
        type: 'object' as const,
        properties: {},
        additionalProperties: false as const
      },
      execute: async () => ({ content: [{ type: 'text' as const, text: '{}' }] })
    });
    void context?.registerTool(tool('flowdrop_list_nodes', 'List the nodes of the workflow'));
    void context?.registerTool(tool('flowdrop_add_node', 'Add a node'));
    void context?.registerTool(tool('flowdrop_connect', 'Connect two ports'));
  }

  // --- The `sessions` endpoint group (?sessions=1) ---
  let endpointConfig = $derived(
    $page.url.searchParams.get('sessions') === '1'
      ? {
          ...defaultEndpointConfig,
          endpoints: { ...defaultEndpointConfig.endpoints, sessions: sessionsEndpoints }
        }
      : undefined
  );

  // --- Settings categories (?settingsCategories=ui shows a one-tab modal, as a host that offers only UI settings) ---
  let settingsCategories = $derived(
    $page.url.searchParams.get('settingsCategories')?.split(',') as SettingsCategory[] | undefined
  );

  // --- Caption node type is only offered on request (?caption=1 or ?workflow=caption) ---
  let offerCaption = $derived(
    $page.url.searchParams.get('caption') === '1' || workflowVariant === 'caption'
  );

  // --- Consumer navbar actions (?navbarActions=1): a Save menu with tasks and `navigation` entries ---
  let navbarActions = $derived(
    $page.url.searchParams.get('navbarActions') === '1'
      ? [
          { label: 'Save', href: '#save', icon: 'heroicons:document-arrow-down' },
          { label: 'Save and run test', href: '#save-run', icon: 'heroicons:play' },
          { label: 'Doctor', href: '#doctor', icon: 'heroicons:heart', group: 'Checks' },
          { label: 'Pipelines', href: '#pipelines', icon: 'heroicons:queue-list', group: 'Checks' },
          {
            label: 'FlowDrop dashboard',
            href: '#dashboard',
            icon: 'heroicons:squares-2x2',
            navigation: true
          },
          {
            label: 'Back to workflows',
            href: '#workflows',
            icon: 'heroicons:arrow-left',
            navigation: true
          }
        ]
      : undefined
  );

  // --- White-label logo (?branding=1 name + image; =alt adds logoAlt; =name name only; =wide a logo far wider than the start column) ---
  const brandingSvg = (width: number) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40" viewBox="0 0 ${width} 40"><rect width="${width}" height="40" fill="#0a7"/></svg>`
    )}`;
  let branding = $derived.by(() => {
    const variant = $page.url.searchParams.get('branding');
    if (!variant) return undefined;
    if (variant === 'name') return { name: 'Acme Studio' };
    return {
      logo: brandingSvg(variant === 'wide' ? 1200 : 200),
      name: 'Acme Studio',
      ...(variant === 'alt' ? { logoAlt: 'Acme logo' } : {}),
      href: 'https://example.com/acme'
    };
  });

  const captionNodeType: NodeMetadata = {
    node_type_id: 'caption',
    name: 'Caption',
    description: 'Short high-contrast text that names or marks nearby nodes',
    category: 'tools',
    version: '1.0.0',
    type: 'caption',
    supportedTypes: ['caption'],
    icon: 'mdi:format-title',
    inputs: [],
    outputs: [],
    configSchema: { type: 'object', properties: {} },
    tags: ['caption']
  };

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

  const doctorWorkflow: Workflow = {
    id: 'test-workflow-doctor',
    name: 'Doctor Test Workflow',
    description: 'One unknown config key, one missing required key, one missing plugin',
    nodes: [
      {
        id: 'node-input',
        type: 'universalNode',
        position: { x: 80, y: 160 },
        data: {
          label: 'Text Input',
          config: { defaultValue: 'hello', legacy_flag: true },
          metadata: testNodeTypes[0]
        }
      },
      {
        id: 'node-output',
        type: 'universalNode',
        position: { x: 520, y: 160 },
        data: { label: 'Text Output', config: {}, metadata: testNodeTypes[1] }
      },
      {
        id: 'node-ghost',
        type: 'universalNode',
        position: { x: 520, y: 360 },
        data: {
          label: 'Ghost',
          config: { keep: 1 },
          metadata: { ...testNodeTypes[1], node_type_id: 'ghost', name: 'Ghost' }
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-input',
        target: 'node-output',
        sourceHandle: 'node-input-output-value',
        targetHandle: 'node-output-input-value'
      },
      {
        id: 'edge-2',
        source: 'node-input',
        target: 'node-ghost',
        sourceHandle: 'node-input-output-value',
        targetHandle: 'node-ghost-input-value'
      }
    ],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  };

  const interfaceWorkflow: Workflow = {
    id: 'test-workflow-interface',
    name: 'Interface Test Workflow',
    description: 'Published ports, a type mismatch and an unpublished output',
    nodes: [
      {
        id: 'node-input',
        type: 'universalNode',
        position: { x: 80, y: 120 },
        data: { label: 'Text Input', config: {}, metadata: testNodeTypes[0] }
      },
      {
        id: 'node-calc',
        type: 'universalNode',
        position: { x: 760, y: 120 },
        data: { label: 'Calculator', config: { operation: 'add' }, metadata: testNodeTypes[2] }
      },
      {
        id: 'node-output',
        type: 'universalNode',
        position: { x: 1200, y: 160 },
        data: { label: 'Text Output', config: {}, metadata: testNodeTypes[1] }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-calc',
        target: 'node-output',
        sourceHandle: 'node-calc-output-result',
        targetHandle: 'node-output-input-value'
      }
    ],
    interface: {
      inputs: [
        {
          id: 'amount',
          dataType: 'number',
          bindings: [{ nodeId: 'node-calc', portId: 'a' }]
        },
        {
          id: 'items',
          dataType: 'array',
          bindings: [{ nodeId: 'node-calc', portId: 'b' }]
        }
      ],
      outputs: [
        {
          id: 'message',
          dataType: 'string',
          bindings: [{ nodeId: 'node-input', portId: 'value' }]
        }
      ]
    },
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

  // Workflow with an existing short caption and a long one (clamp + tooltip)
  const captionWorkflow: Workflow = {
    id: 'test-workflow-caption',
    name: 'Caption Workflow',
    description: 'A node and two captions for in-place editing tests',
    nodes: [
      {
        id: 'node-input',
        type: 'universalNode',
        position: { x: 200, y: 300 },
        data: {
          label: 'Text Input',
          config: { defaultValue: '' },
          metadata: testNodeTypes[0]
        }
      },
      {
        id: 'caption-short',
        type: 'universalNode',
        position: { x: 200, y: 200 },
        data: { label: 'Inputs', config: {}, metadata: captionNodeType }
      },
      {
        id: 'caption-long',
        type: 'universalNode',
        position: { x: 600, y: 200 },
        data: {
          label:
            'This caption is far too long for two lines of a five hundred pixel wide label so the clamp has to cut it off with an ellipsis and keep the full text in the tooltip instead of growing taller',
          config: {},
          metadata: captionNodeType
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

  // Notes variant (?workflow=notes): one note per type, a long one and a plain-text one,
  // for the notes look and the zoom-tier checks.
  const noteMetadata = demoNodeTypesShowcaseWorkflow.nodes.find(
    (n) => n.data.metadata.type === 'note'
  )!.data.metadata;
  const noteNode = (
    id: string,
    x: number,
    y: number,
    noteType: string,
    content: string
  ): Workflow['nodes'][number] => ({
    id,
    type: 'universalNode',
    position: { x, y },
    data: { label: 'Notes', config: { content, noteType }, metadata: noteMetadata }
  });
  const notesWorkflow: Workflow = {
    id: 'test-workflow-notes',
    name: 'Notes Workflow',
    description: 'Notes of every type, a long note and a plain note',
    nodes: [
      noteNode(
        'note-info',
        80,
        80,
        'info',
        '# Workflow notes\n\n## Why two triggers?\n\nInsert and update fire **separately**; both feed *Data Shaper*.\n\n- Insert: new entity\n- Update: existing entity\n- Delete is ignored'
      ),
      noteNode(
        'note-plain',
        440,
        80,
        'note',
        '# Workflow notes\n\nWhen content is edited or updated, a message is shown to the user.\n\nThis demo runs the workflow automatically after an entity insert or update.'
      ),
      noteNode(
        'note-warning',
        800,
        80,
        'warning',
        '## Rate limits\n\nThe API allows 100 requests per minute. Bulk runs are throttled.'
      ),
      noteNode(
        'note-success',
        80,
        460,
        'success',
        '## Verified\n\nChecked against production data on Monday.'
      ),
      noteNode(
        'note-error',
        440,
        460,
        'error',
        '## Known problem\n\nThe Loop Back path never ends when the list is empty.'
      ),
      noteNode(
        'note-long',
        800,
        340,
        'info',
        '# A long note\n\nThis note has a good deal of text so the wrapping, the grid snapping of the height and the zoom tier title can be checked together. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n## Details\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. `inline_code_example_with_a_very_long_identifier_name` stays inside.\n\n1. First step\n2. Second step\n3. Third step'
      )
    ],
    edges: [],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  };

  // The shapes fddo sends for Chat Output (loose controls, then General / Execution /
  // Ports groups; several ports), a node with no ports, and the subworkflow executor
  // (external workflow link). Used by the inspector tests and screenshots.
  const chatOutputNodeType: NodeMetadata = {
    node_type_id: 'chat_output',
    name: 'Chat Output',
    description: 'Output chat messages in various formats',
    category: 'outputs',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:chat-outline',
    inputs: [
      { id: 'message', name: 'Message', type: 'input', dataType: 'string', required: true },
      { id: 'format', name: 'Format', type: 'input', dataType: 'string' },
      { id: 'timestamp', name: 'Timestamp', type: 'input', dataType: 'boolean' },
      { id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger' }
    ],
    outputs: [
      { id: 'message', name: 'message', type: 'output', dataType: 'string' },
      { id: 'format', name: 'format', type: 'output', dataType: 'string' },
      { id: 'timestamp', name: 'timestamp', type: 'output', dataType: 'boolean' },
      { id: 'loop_back', name: 'Loop back', type: 'output', dataType: 'trigger' },
      { id: 'trigger', name: 'Trigger', type: 'output', dataType: 'trigger' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          title: 'Format',
          enum: ['plain', 'markdown'],
          default: 'markdown'
        },
        show_timestamp: {
          type: 'boolean',
          title: 'Show timestamp',
          description: 'Adds the send time under each reply',
          default: false
        },
        instance_title: {
          type: 'string',
          title: 'Title',
          description: 'Overrides the node title.'
        },
        max_retries: { type: 'integer', title: 'Max retries', default: 0 }
      }
    },
    uiSchema: {
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: '#/properties/format' },
        { type: 'Control', scope: '#/properties/show_timestamp' },
        {
          type: 'Group',
          label: 'General',
          collapsible: true,
          defaultOpen: true,
          elements: [{ type: 'Control', scope: '#/properties/instance_title' }]
        },
        {
          type: 'Group',
          label: 'Execution',
          collapsible: true,
          defaultOpen: false,
          elements: [{ type: 'Control', scope: '#/properties/max_retries' }]
        }
      ]
    },
    tags: ['output', 'chat']
  };
  const noPortsNodeType: NodeMetadata = {
    node_type_id: 'note_settings',
    name: 'Settings Only',
    description: 'A node with settings and no ports',
    category: 'tools',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:cog',
    inputs: [],
    outputs: [],
    configSchema: {
      type: 'object',
      properties: { label_text: { type: 'string', title: 'Label text' } }
    },
    tags: []
  };
  const subworkflowNodeType: NodeMetadata = {
    node_type_id: 'workflow_executor',
    name: 'Workflow Executor',
    description: 'Runs another workflow as a step',
    category: 'tools',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:sitemap',
    inputs: [{ id: 'values', name: 'Values', type: 'input', dataType: 'array' }],
    outputs: [{ id: 'message', name: 'message', type: 'output', dataType: 'string' }],
    configSchema: {
      type: 'object',
      properties: {
        instance_title: { type: 'string', title: 'Title', description: 'Overrides the node title.' }
      }
    },
    configEdit: {
      externalEditLink: {
        url: 'https://example.com/workflows/{workflowId}',
        label: 'Edit Workflow',
        description: 'Open the referenced workflow in the editor',
        parameterMapping: { workflowId: 'workflowId' },
        openInNewTab: true
      }
    },
    tags: []
  };
  const inspectorNodeTypes = [chatOutputNodeType, noPortsNodeType, subworkflowNodeType];
  const inspectorWorkflow: Workflow = {
    id: 'test-workflow-inspector',
    name: 'Inspector Workflow',
    description: 'Nodes with the fddo inspector shapes',
    nodes: [
      {
        id: 'chat_output.2',
        type: 'universalNode',
        position: { x: 0, y: 40 },
        data: { label: 'Chat Output', config: {}, metadata: chatOutputNodeType }
      },
      {
        id: 'note_settings.1',
        type: 'universalNode',
        position: { x: 500, y: 420 },
        data: { label: 'Settings Only', config: {}, metadata: noPortsNodeType }
      },
      {
        id: 'workflow_executor.1',
        type: 'universalNode',
        position: { x: 500, y: 40 },
        data: { label: 'Run workflow: Calculator', config: {}, metadata: subworkflowNodeType }
      }
    ],
    edges: [],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  };

  // Straight wires (G8f): an entity trigger feeding Data Shaper through its trigger pin and
  // its first data row. Every handle centre is a multiple of 20 from the node top, so
  // Data Shaper at the trigger's y has both wires straight; it starts 80px lower.
  const entityTriggerNodeType: NodeMetadata = {
    node_type_id: 'entity_trigger',
    name: 'Entity Insert',
    description: 'Fires when an entity is inserted',
    category: 'inputs',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:database-plus',
    inputs: [{ id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger' }],
    outputs: [
      { id: 'entity', name: 'entity', type: 'output', dataType: 'object' },
      { id: 'trigger', name: 'Trigger', type: 'output', dataType: 'trigger' }
    ],
    configSchema: { type: 'object', properties: {} },
    tags: []
  };
  const dataShaperNodeType: NodeMetadata = {
    node_type_id: 'data_shaper',
    name: 'Data Shaper',
    description: 'Reshapes an entity into the fields you need',
    category: 'processing',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:shape-outline',
    inputs: [
      { id: 'entity', name: 'Entity', type: 'input', dataType: 'object', required: true },
      { id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger' }
    ],
    outputs: [
      { id: 'shaped', name: 'shaped', type: 'output', dataType: 'object' },
      { id: 'trigger', name: 'Trigger', type: 'output', dataType: 'trigger' }
    ],
    configSchema: { type: 'object', properties: {} },
    tags: []
  };
  const straightWorkflow: Workflow = {
    id: 'test-workflow-straight',
    name: 'Straight Wires Workflow',
    description: 'A source and Data Shaper, wired by trigger and by data',
    nodes: [
      {
        id: 'entity_trigger.1',
        type: 'universalNode',
        position: { x: 100, y: 120 },
        data: { label: 'Entity Insert', config: {}, metadata: entityTriggerNodeType }
      },
      {
        id: 'data_shaper.1',
        type: 'universalNode',
        position: { x: 520, y: 200 },
        data: { label: 'Data Shaper', config: {}, metadata: dataShaperNodeType }
      }
    ],
    edges: [
      {
        id: 'e-data',
        source: 'entity_trigger.1',
        target: 'data_shaper.1',
        sourceHandle: 'entity_trigger.1-output-entity',
        targetHandle: 'data_shaper.1-input-entity'
      },
      {
        id: 'e-trigger',
        source: 'entity_trigger.1',
        target: 'data_shaper.1',
        sourceHandle: 'entity_trigger.1-output-trigger',
        targetHandle: 'data_shaper.1-input-trigger'
      }
    ],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  };

  // Config-form shapes (?workflow=config): an array that a scalar field points at
  // (`x-item-ref`), a two-field array, and read-only items.
  const switchSchema = {
    type: 'object',
    properties: {
      branches: {
        type: 'array',
        title: 'Branches',
        description: 'Matched in order. Each branch adds an output on the node.',
        items: {
          type: 'object',
          title: 'branch',
          properties: {
            name: { type: 'string', title: 'Name' },
            value: { type: 'string', title: 'Value' }
          }
        }
      },
      default_branch: {
        type: 'string',
        title: 'Default branch',
        description: 'Branch to use when no value matches',
        'x-item-ref': { array: 'branches', key: 'name' }
      }
    }
  } as const;
  const switchNodeType: NodeMetadata = {
    node_type_id: 'switch_gateway',
    name: 'Switch Gateway',
    description: 'Routes on the value of an input',
    category: 'logic',
    version: '1.0.0',
    type: 'gateway',
    icon: 'mdi:call-split',
    inputs: [
      { id: 'value', name: 'Value', type: 'input', dataType: 'mixed', required: true },
      { id: 'default_branch', name: 'Default branch', type: 'input', dataType: 'string' },
      { id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger' }
    ],
    outputs: [{ id: 'trigger', name: 'Trigger', type: 'output', dataType: 'trigger' }],
    configSchema: switchSchema as unknown as NodeMetadata['configSchema'],
    tags: []
  };
  const headersNodeType: NodeMetadata = {
    node_type_id: 'http_request',
    name: 'HTTP Request',
    description: 'Calls a URL',
    category: 'tools',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:web',
    inputs: [{ id: 'url', name: 'URL', type: 'input', dataType: 'string', required: true }],
    outputs: [{ id: 'body', name: 'Body', type: 'output', dataType: 'string' }],
    configSchema: {
      type: 'object',
      properties: {
        method: { type: 'string', title: 'Method', enum: ['GET', 'POST'], default: 'GET' },
        timeout: { type: 'integer', title: 'Timeout (s)', default: 30 },
        headers: {
          type: 'array',
          title: 'Headers',
          items: {
            type: 'object',
            title: 'Header',
            properties: {
              name: { type: 'string', title: 'Name' },
              value: { type: 'string', title: 'Value' }
            }
          }
        }
      }
    },
    tags: []
  };
  const ifElseNodeType: NodeMetadata = {
    node_type_id: 'if_else',
    name: 'If/Else',
    description: 'Routes on a comparison',
    category: 'logic',
    version: '1.0.0',
    type: 'gateway',
    icon: 'mdi:source-branch',
    inputs: [{ id: 'text', name: 'Text', type: 'input', dataType: 'string', required: true }],
    outputs: [],
    configSchema: {
      type: 'object',
      properties: {
        match_text: {
          type: 'string',
          title: 'Match text',
          description: 'The text to match against'
        },
        operator: {
          type: 'string',
          title: 'Operator',
          enum: ['equals', 'contains', 'starts_with'],
          default: 'equals'
        },
        instance_title: {
          type: 'string',
          title: 'Title',
          description: 'Overrides the node title.'
        },
        case_sensitive: {
          type: 'boolean',
          title: 'Case sensitive',
          description: 'Whether string comparisons are case sensitive',
          default: false
        },
        branches: {
          type: 'array',
          title: 'Branches',
          description: 'Set by this node',
          readOnly: true,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Name' },
              value: { type: 'string', title: 'Value' }
            }
          }
        }
      }
    },
    uiSchema: {
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: '#/properties/match_text' },
        { type: 'Control', scope: '#/properties/operator' },
        { type: 'Control', scope: '#/properties/case_sensitive' },
        { type: 'Control', scope: '#/properties/branches' },
        {
          type: 'Group',
          label: 'General',
          collapsible: true,
          defaultOpen: false,
          elements: [{ type: 'Control', scope: '#/properties/instance_title' }]
        }
      ]
    },
    tags: []
  };
  const configNodeTypes = [chatOutputNodeType, switchNodeType, headersNodeType, ifElseNodeType];
  const switchBranches = [
    { name: 'Default', value: 'default' },
    { name: 'Article', value: 'article' },
    { name: 'Page', value: 'page' }
  ];
  const configMeta = {
    schemaVersion: '1.0.0',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };
  const configWorkflow: Workflow = {
    id: 'test-workflow-config',
    name: 'Config Forms Workflow',
    description: 'Nodes with item refs, a two-field array and read-only items',
    nodes: [
      {
        id: 'switch_gateway.1',
        type: 'universalNode',
        position: { x: 0, y: 0 },
        data: {
          label: 'Switch Gateway',
          config: { branches: switchBranches, default_branch: 'default' },
          metadata: switchNodeType
        }
      },
      {
        id: 'switch_gateway.2',
        type: 'universalNode',
        position: { x: 500, y: 0 },
        data: {
          label: 'Switch (wired default)',
          config: { branches: switchBranches, default_branch: 'article' },
          metadata: switchNodeType
        }
      },
      {
        id: 'switch_gateway.3',
        type: 'universalNode',
        position: { x: 1000, y: 0 },
        data: {
          label: 'Switch (dangling default)',
          config: { branches: switchBranches, default_branch: 'gone' },
          metadata: switchNodeType
        }
      },
      {
        id: 'http_request.1',
        type: 'universalNode',
        position: { x: 0, y: 500 },
        data: {
          label: 'HTTP Request',
          config: {
            method: 'POST',
            timeout: 30,
            headers: [
              { name: 'Accept', value: 'application/json' },
              { name: 'X-Trace', value: 'on' }
            ]
          },
          metadata: headersNodeType
        }
      },
      {
        id: 'if_else.1',
        type: 'universalNode',
        position: { x: 500, y: 500 },
        data: {
          label: 'If/Else',
          config: {
            match_text: 'article',
            operator: 'equals',
            branches: [
              { name: 'True', value: 'true' },
              { name: 'False', value: 'false' }
            ]
          },
          metadata: ifElseNodeType
        }
      },
      {
        id: 'chat_output.1',
        type: 'universalNode',
        position: { x: 1000, y: 500 },
        data: { label: 'Chat Output', config: {}, metadata: chatOutputNodeType }
      }
    ],
    edges: [
      {
        id: 'edge-default-branch',
        source: 'chat_output.1',
        target: 'switch_gateway.2',
        sourceHandle: 'chat_output.1-output-message',
        targetHandle: 'switch_gateway.2-input-default_branch'
      }
    ],
    metadata: configMeta
  };

  const workflows: Record<string, Workflow> = {
    straight: straightWorkflow,
    inspector: inspectorWorkflow,
    config: configWorkflow,
    caption: captionWorkflow,
    notes: notesWorkflow,
    simple: simpleWorkflow,
    interface: interfaceWorkflow,
    doctor: doctorWorkflow,
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
  let baseWorkflow = $derived(
    workflowVariant === 'perf'
      ? createChainedTriggerWorkflow(perfCount, 'perf-chain')
      : (workflows[workflowVariant] ?? simpleWorkflow)
  );
  // --- Playground settings, as a FlowDrop 2.7.0 backend sends them ---
  let playgroundVariant = $derived($page.url.searchParams.get('playground'));
  let selectedWorkflow = $derived.by((): Workflow => {
    if (
      playgroundVariant !== 'none' &&
      playgroundVariant !== 'turn' &&
      playgroundVariant !== 'form' &&
      playgroundVariant !== 'chatform' &&
      playgroundVariant !== 'chat'
    ) {
      return baseWorkflow;
    }
    const withSettings: Workflow = {
      ...baseWorkflow,
      playground: { chat: null, source: 'none' }
    };
    if (playgroundVariant === 'turn') {
      withSettings.interface = {
        inputs: [
          {
            id: 'message',
            dataType: 'string',
            bindings: [{ nodeId: 'node-output', portId: 'value' }],
            turn: 'message'
          }
        ]
      };
    }
    if (playgroundVariant === 'form') {
      withSettings.interface = {
        inputs: [
          {
            id: 'topic',
            dataType: 'string',
            bindings: [{ nodeId: 'node-input', portId: 'value' }],
            required: true
          }
        ]
      };
    }
    if (playgroundVariant === 'chat') {
      withSettings.interface = {
        inputs: [
          { id: 'msg', dataType: 'string', bindings: [{ nodeId: 'node-input', portId: 'value' }] }
        ]
      };
      withSettings.playground = {
        chat: {
          message: 'msg',
          history: null,
          session_id: null,
          message_id: null,
          replies: [{ node_id: 'node-output', port: 'value' }],
          sub_workflow_replies: false
        },
        source: 'settings'
      };
    }
    if (playgroundVariant === 'chatform') {
      withSettings.interface = {
        inputs: [
          { id: 'msg', dataType: 'string', bindings: [{ nodeId: 'node-input', portId: 'value' }] },
          {
            id: 'topic',
            dataType: 'string',
            bindings: [{ nodeId: 'node-input', portId: 'value' }],
            required: true
          }
        ]
      };
      withSettings.playground = {
        chat: {
          message: 'msg',
          history: null,
          session_id: null,
          message_id: null,
          replies: [{ node_id: 'node-output', port: 'value' }],
          sub_workflow_replies: false
        },
        source: 'settings'
      };
    }
    return withSettings;
  });
</script>

<svelte:head>
  <title>Editor E2E Test - FlowDrop</title>
</svelte:head>

<div class="editor-test-page" data-testid="editor-test">
  <div class="editor-test-page__status" data-testid="workflow-variant">
    Variant: {workflowVariant}
  </div>
  <App
    height="100%"
    width="100%"
    showNavbar={true}
    nodes={[
      ...testNodeTypes,
      ...(offerCaption ? [captionNodeType] : []),
      ...(workflowVariant === 'inspector' ? inspectorNodeTypes : []),
      ...(workflowVariant === 'config' ? configNodeTypes : [])
    ]}
    workflow={selectedWorkflow}
    theme={themeName}
    mode={editorMode}
    editorMode={editorTestMode}
    {endpointConfig}
    {features}
    {contextMenu}
    {branding}
    {navbarActions}
    {settingsCategories}
  />
</div>

<style>
  /* Fill the demo shell's main, not the viewport: the shell has its own navbar
     above, and a 100vh page overflowed it by that much, so Playwright's dragTo
     scrolled the shell mid-drag. */
  .editor-test-page {
    height: 100%;
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
