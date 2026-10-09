<!--
  Form Elements Test Page

  Fixture: every form field kind in one editor scope, laid out as inspector-width
  columns. Skin from `?theme=`, light/dark from `?scheme=` or the page's colour
  scheme. For screenshots and the browser-level form checks.
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { initializeSettings } from '$lib/stores/settingsStore.svelte.js';
  import { provideInstance } from '$lib/stores/getInstance.svelte.js';
  import { createFlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
  import { themeScope } from '$lib/utils/themeScope.svelte.js';
  import { resolveTheme } from '$lib/themes/index.js';
  import { buildScopedSkinCss } from '$lib/themes/scopedSkinCss.js';
  import FormField from '$lib/components/form/FormField.svelte';
  import SchemaForm from '$lib/components/SchemaForm.svelte';
  import type { FieldSchema } from '$lib/components/form/types.js';
  import type { ConfigSchema, WorkflowNode } from '$lib/types/index.js';
  import type { UISchemaElement } from '$lib/types/uischema.js';

  // SSR has no default instance: give the fixture its own.
  provideInstance(createFlowDropInstance());

  const SCOPE = 'forms-fixture';

  const themeName = $derived(
    ($page.url.searchParams.get('theme') ?? undefined) as 'default' | 'graphite' | undefined
  );

  onMount(() => {
    const scheme = $page.url.searchParams.get('scheme');
    if (scheme === 'dark' || scheme === 'light') {
      void initializeSettings({ defaults: { theme: { preference: scheme } } });
    }
    const resolved = resolveTheme(themeName);
    const css = buildScopedSkinCss(SCOPE, resolved.skin, resolved.config?.display);
    if (!css) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  });

  interface Item {
    key: string;
    schema: FieldSchema;
    value: unknown;
    required?: boolean;
  }

  const options = [
    { const: 'gpt', title: 'GPT' },
    { const: 'claude', title: 'Claude' },
    { const: 'mistral', title: 'Mistral' }
  ];

  const basic: Item[] = [
    {
      key: 'text',
      schema: { type: 'string', title: 'Name', placeholder: 'Workflow name' },
      value: 'Support triage'
    },
    {
      key: 'text_help',
      schema: {
        type: 'string',
        title: 'Endpoint',
        description: 'Base URL of the service, without a trailing slash.',
        placeholder: 'https://'
      },
      value: ''
    },
    {
      key: 'text_required',
      schema: { type: 'string', title: 'API key', placeholder: 'sk-...' },
      value: '',
      required: true
    },
    {
      key: 'text_disabled',
      schema: { type: 'string', title: 'Locked id', readOnly: true },
      value: 'node-8f31'
    },
    {
      key: 'textarea',
      schema: {
        type: 'string',
        format: 'multiline',
        title: 'System prompt',
        description: 'Sent before every conversation.'
      },
      value: 'You are a helpful assistant.\nAnswer briefly.'
    },
    {
      key: 'number',
      schema: { type: 'number', title: 'Max retries', minimum: 0, maximum: 10 },
      value: 3
    },
    {
      key: 'range',
      schema: {
        type: 'number',
        format: 'range',
        title: 'Temperature',
        minimum: 0,
        maximum: 2,
        step: 0.1,
        description: 'Lower is more deterministic.'
      },
      value: 0.7
    },
    {
      key: 'toggle',
      schema: {
        type: 'boolean',
        title: 'Stream output',
        description: 'Send tokens as they arrive.'
      },
      value: true
    },
    {
      key: 'toggle_off',
      schema: { type: 'boolean', title: 'Show timestamp' },
      value: false
    },
    {
      key: 'toggle_disabled',
      schema: { type: 'boolean', title: 'Managed by admin', readOnly: true },
      value: true
    },
    {
      key: 'checkbox_group',
      schema: {
        type: 'array',
        enum: ['read', 'write', 'delete', 'admin'],
        multiple: true,
        title: 'Permissions'
      },
      value: ['read', 'write']
    },
    {
      key: 'select_enum',
      schema: { type: 'string', enum: ['plain', 'markdown', 'html'], title: 'Format' },
      value: 'markdown'
    },
    {
      key: 'select_options',
      schema: { type: 'string', oneOf: options, title: 'Model', description: 'Provider default.' },
      value: 'claude'
    },
    {
      key: 'select_disabled',
      schema: { type: 'string', oneOf: options, title: 'Model (read only)', readOnly: true },
      value: 'gpt'
    },
    {
      key: 'autocomplete',
      schema: {
        type: 'string',
        format: 'autocomplete',
        title: 'Variable',
        placeholder: 'Search variables',
        autocomplete: { url: '/api/nope', fetchOnMount: false }
      } as FieldSchema,
      value: ''
    },
    {
      key: 'no_title',
      schema: { type: 'string' },
      value: 'Untitled key shows humanised'
    }
  ];

  const editors: Item[] = [
    {
      key: 'code',
      schema: { type: 'object', format: 'json', title: 'Headers (JSON)' },
      value: { Accept: 'application/json', 'X-Trace': 'on' }
    },
    {
      key: 'markdown',
      schema: { type: 'string', format: 'markdown', title: 'Description' },
      value: '# Heading\n\nSome **bold** text and a list:\n\n- one\n- two'
    },
    {
      key: 'template',
      schema: {
        type: 'string',
        format: 'template',
        title: 'Message template',
        variables: {} as never
      } as FieldSchema,
      value: 'Hello {{ name }}, your order {{ order_id }} shipped.'
    }
  ];

  const arrays: Item[] = [
    {
      key: 'branches',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          title: 'Branch',
          properties: {
            name: { type: 'string' },
            value: { type: 'string', title: 'Match value' }
          }
        }
      },
      value: [
        { name: 'urgent', value: 'high' },
        { name: 'normal', value: 'medium' },
        { name: 'default', value: '' }
      ]
    },
    {
      key: 'tags',
      schema: {
        type: 'array',
        title: 'Tags',
        items: { type: 'string', title: 'Tag' },
        minItems: 1,
        maxItems: 5
      },
      value: ['billing', 'refund']
    },
    {
      key: 'empty_list',
      schema: {
        type: 'array',
        title: 'Headers',
        items: { type: 'object', title: 'Header', properties: { key: { type: 'string' } } }
      },
      value: []
    },
    {
      key: 'locked_list',
      schema: {
        type: 'array',
        title: 'Locked list',
        readOnly: true,
        items: { type: 'string', title: 'Entry' }
      },
      value: ['a', 'b']
    }
  ];

  const portsNode = {
    id: 'n1',
    type: 'universalNode',
    position: { x: 0, y: 0 },
    data: {
      label: 'Switch',
      config: {},
      metadata: {
        id: 'switch',
        name: 'Switch',
        type: 'default',
        inputs: [{ id: 'in', name: 'in', type: 'input', dataType: 'string', label: 'In' }],
        outputs: [
          { id: 'a', name: 'a', type: 'output', dataType: 'string', label: 'Urgent' },
          { id: 'b', name: 'b', type: 'output', dataType: 'string', label: 'Normal' }
        ]
      }
    }
  } as unknown as WorkflowNode;

  const portsItem: Item = {
    key: 'ports',
    schema: { type: 'object', format: 'ports', description: 'Choose which ports show.' },
    value: {}
  };

  const uiSchemaConfig: ConfigSchema = {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Title' },
      mode: { type: 'string', enum: ['fast', 'balanced', 'thorough'], title: 'Mode' },
      retries: { type: 'integer', title: 'Retries', minimum: 0 },
      verbose: { type: 'boolean', title: 'Verbose logging' },
      notes: { type: 'string', format: 'multiline', title: 'Notes' }
    },
    required: ['title']
  };
  const uiSchema: UISchemaElement = {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/title' },
      {
        type: 'Group',
        label: 'General',
        collapsible: true,
        defaultOpen: true,
        elements: [
          { type: 'Control', scope: '#/properties/mode' },
          { type: 'Control', scope: '#/properties/retries' }
        ]
      },
      {
        type: 'Group',
        label: 'Execution',
        description: 'Advanced',
        collapsible: true,
        defaultOpen: false,
        elements: [{ type: 'Control', scope: '#/properties/verbose' }]
      },
      {
        type: 'Group',
        label: 'Static group',
        collapsible: false,
        elements: [{ type: 'Control', scope: '#/properties/notes' }]
      }
    ]
  } as UISchemaElement;
  let uiValues = $state<Record<string, unknown>>({
    title: 'Triage',
    mode: 'balanced',
    retries: 2,
    verbose: false,
    notes: ''
  });

  let values = $state<Record<string, unknown>>(
    Object.fromEntries([...basic, ...editors, ...arrays, portsItem].map((i) => [i.key, i.value]))
  );
</script>

{#snippet field(item: Item, node?: WorkflowNode)}
  <FormField
    fieldKey={item.key}
    schema={item.schema}
    value={values[item.key]}
    required={item.required ?? false}
    {node}
    onChange={(v) => (values[item.key] = v)}
  />
{/snippet}

<div
  class="flowdrop-root"
  use:themeScope
  data-fd-scope={SCOPE}
  data-testid="forms-fixture"
  style="padding: 2rem; background: var(--fd-background); color: var(--fd-foreground); min-height: 100vh;"
>
  <div
    style="display: grid; grid-template-columns: repeat(3, 380px); gap: 2rem 3rem; align-items: start;"
  >
    <div
      data-testid="forms-basic"
      style="display: flex; flex-direction: column; gap: var(--fd-space-xl);"
    >
      {#each basic as item (item.key)}
        {@render field(item)}
      {/each}
    </div>
    <div style="display: flex; flex-direction: column; gap: var(--fd-space-xl);">
      <div
        data-testid="forms-arrays"
        style="display: flex; flex-direction: column; gap: var(--fd-space-xl);"
      >
        {#each arrays as item (item.key)}
          {@render field(item)}
        {/each}
      </div>
      <div data-testid="forms-ports">
        {@render field(portsItem, portsNode)}
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: var(--fd-space-xl);">
      <div
        data-testid="forms-editors"
        style="display: flex; flex-direction: column; gap: var(--fd-space-xl);"
      >
        {#each editors as item (item.key)}
          {@render field(item)}
        {/each}
      </div>
      <div data-testid="forms-uischema">
        <SchemaForm
          schema={uiSchemaConfig}
          {uiSchema}
          values={uiValues}
          onChange={(v) => (uiValues = v)}
        />
      </div>
    </div>
  </div>
</div>
