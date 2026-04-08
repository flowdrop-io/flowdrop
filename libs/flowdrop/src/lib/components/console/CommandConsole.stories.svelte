<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CommandConsole from './CommandConsole.svelte';
  import { fn } from 'storybook/test';

  const mockNodeTypes = [
    {
      id: 'llm_chat',
      name: 'LLM Chat',
      description: 'Chat completion using an LLM provider',
      category: 'AI',
      version: '1.0.0',
      inputs: [
        { id: 'prompt', name: 'Prompt', type: 'input', dataType: 'string' },
        { id: 'context', name: 'Context', type: 'input', dataType: 'string' }
      ],
      outputs: [
        {
          id: 'response',
          name: 'Response',
          type: 'output',
          dataType: 'string'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', default: 'gpt-4' },
          temperature: { type: 'number', default: 0.7 },
          maxTokens: { type: 'number', default: 1024 }
        }
      }
    },
    {
      id: 'http_request',
      name: 'HTTP Request',
      description: 'Send HTTP requests to external APIs',
      category: 'Integration',
      version: '1.0.0',
      inputs: [
        { id: 'url', name: 'URL', type: 'input', dataType: 'string' },
        { id: 'body', name: 'Body', type: 'input', dataType: 'object' }
      ],
      outputs: [
        {
          id: 'response',
          name: 'Response',
          type: 'output',
          dataType: 'object'
        },
        {
          id: 'status',
          name: 'Status Code',
          type: 'output',
          dataType: 'number'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          method: { type: 'string', default: 'GET' },
          headers: { type: 'object', default: {} },
          timeout: { type: 'number', default: 30000 }
        }
      }
    },
    {
      id: 'text_template',
      name: 'Text Template',
      description: 'Render text templates with variable substitution',
      category: 'Transform',
      version: '1.0.0',
      inputs: [
        {
          id: 'variables',
          name: 'Variables',
          type: 'input',
          dataType: 'object'
        }
      ],
      outputs: [{ id: 'text', name: 'Text', type: 'output', dataType: 'string' }],
      configSchema: {
        type: 'object',
        properties: {
          template: { type: 'string', default: '' },
          delimiter: { type: 'string', default: '{{' }
        }
      }
    }
  ];

  const { Story } = defineMeta({
    title: 'Editor/CommandConsole',
    component: CommandConsole,
    tags: ['autodocs'],
    parameters: {
      layout: 'padded'
    },
    args: {
      nodeTypes: mockNodeTypes,
      onUIAction: fn()
    }
  });
</script>

<Story
  name="Default"
  args={{
    nodeTypes: mockNodeTypes
  }}
/>
