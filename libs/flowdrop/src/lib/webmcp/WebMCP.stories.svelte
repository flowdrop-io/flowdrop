<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import WebMCPFakeAgent from '../stories/WebMCPFakeAgent.svelte';

  // Inline fixtures: importing from src/mocks would make svelte-package emit
  // declaration files outside src/lib.
  const port = (id, name, type, dataType) => ({ id, name, type, dataType });
  const nodes = [
    {
      node_type_id: 'chat_model',
      name: 'Chat Model',
      description: 'Chat completion using an LLM provider',
      category: 'ai',
      version: '1.0.0',
      type: 'default',
      icon: 'mdi:robot',
      inputs: [port('message', 'Message', 'input', 'string')],
      outputs: [port('response', 'Response', 'output', 'string')],
      configSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', title: 'Model', default: 'gpt-4o' },
          temperature: { type: 'number', title: 'Temperature', default: 0.7 }
        }
      }
    },
    {
      node_type_id: 'chat_output',
      name: 'Chat Output',
      description: 'Show a message to the user',
      category: 'outputs',
      version: '1.0.0',
      type: 'default',
      icon: 'mdi:message-text',
      inputs: [port('message', 'Message', 'input', 'string')],
      outputs: [],
      configSchema: { type: 'object', properties: {} }
    },
    {
      node_type_id: 'text_input',
      name: 'Text Input',
      description: 'Accept text from the user',
      category: 'inputs',
      version: '1.0.0',
      type: 'default',
      icon: 'mdi:text-box',
      inputs: [],
      outputs: [port('value', 'Value', 'output', 'string')],
      configSchema: {
        type: 'object',
        properties: { defaultValue: { type: 'string', title: 'Default value', default: '' } }
      }
    }
  ];

  const workflow = {
    id: 'webmcp-demo',
    name: 'WebMCP demo',
    nodes: [
      {
        id: 'text_input.1',
        type: 'default',
        position: { x: 80, y: 120 },
        data: { label: 'Text Input', config: {}, metadata: nodes[2] }
      }
    ],
    edges: [],
    metadata: {
      schemaVersion: '1.0.0',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  };

  const { Story } = defineMeta({
    title: 'Integrations/WebMCP',
    component: WebMCPFakeAgent,
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component:
            'The editor’s commands registered as WebMCP editor tools, driven by a fake browser agent in the side panel. ' +
            'Pick a tool, invoke it, and approve or reject the change in the dialog that the real agent would trigger.'
        }
      }
    },
    args: { nodes, workflow }
  });
</script>

<Story name="Fake agent — confirm gate" args={{ approval: 'confirm' }} />

<Story name="Fake agent — auto approval" args={{ approval: 'auto' }} />
