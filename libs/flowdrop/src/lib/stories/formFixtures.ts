/**
 * Fixtures for the form stories: a node type with a realistic config form
 * (every field kind plus an Execution group), field schemas for the single-field
 * stories, and the editor registration the inspector expects.
 *
 * Typed with the library types, so a renamed field breaks the type check.
 */

import type {
  ConfigSchema,
  NodeExecutionInfo,
  NodeMetadata,
  Workflow,
  WorkflowNode
} from '../types/index.js';
import type { UISchemaElement } from '../types/uischema.js';
import type { FieldSchema } from '../components/form/types.js';
import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
import FormCodeEditor from '../components/form/FormCodeEditor.svelte';
import FormMarkdownEditor from '../components/form/FormMarkdownEditor.svelte';
import FormTemplateEditor from '../components/form/FormTemplateEditor.svelte';
import { registerCodeEditorFieldWithComponent } from '../form/code.js';
import { registerMarkdownEditorFieldWithComponent } from '../form/markdown.js';
import { chatWorkflow, nodeTypes } from './fixtures.js';

/**
 * Register the heavy editors on an instance, as the editor does at start-up.
 * Pass it to `InstanceDecorator`'s `setup`.
 */
export function registerEditors(fd: FlowDropInstance): void {
  registerCodeEditorFieldWithComponent(fd.fields, FormCodeEditor);
  registerMarkdownEditorFieldWithComponent(fd.fields, FormMarkdownEditor);
  if (!fd.fields.has('template-editor')) {
    fd.fields.register('template-editor', {
      component: FormTemplateEditor,
      matcher: (schema) => schema.format === 'template',
      priority: 100
    });
  }
}

const configSchema: ConfigSchema = {
  type: 'object',
  properties: {
    model: {
      type: 'string',
      title: 'Model',
      default: 'gpt-4o',
      oneOf: [
        { const: 'gpt-4o', title: 'GPT-4o' },
        { const: 'gpt-4o-mini', title: 'GPT-4o mini' },
        { const: 'claude-sonnet', title: 'Claude Sonnet' }
      ]
    },
    temperature: {
      type: 'number',
      title: 'Temperature',
      description: 'Lower is more predictable, higher is more creative.',
      format: 'range',
      minimum: 0,
      maximum: 2,
      step: 0.1,
      default: 0.7
    },
    systemPrompt: {
      type: 'string',
      title: 'System prompt',
      description: 'Use {{ question }} to insert the question.',
      format: 'template',
      default: 'You are a support agent. Answer briefly.\n\nQuestion: {{ question }}'
    },
    stream: { type: 'boolean', title: 'Stream the reply', default: true },
    tools: {
      type: 'string',
      title: 'Allowed tools',
      enum: ['search', 'calculator', 'calendar'],
      multiple: true,
      default: ['search']
    },
    headers: {
      type: 'array',
      title: 'Extra headers',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
          value: { type: 'string', title: 'Value' }
        }
      },
      default: [{ name: 'X-Team', value: 'support' }]
    },
    timeout: { type: 'integer', title: 'Timeout (seconds)', default: 30, minimum: 1 },
    retries: { type: 'integer', title: 'Retries', default: 2, minimum: 0, maximum: 5 }
  }
};

/** The inspector's Config and Execution tabs come from this UI schema's groups. */
const uiSchema: UISchemaElement = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: '#/properties/model' },
    { type: 'Control', scope: '#/properties/temperature' },
    { type: 'Control', scope: '#/properties/systemPrompt' },
    { type: 'Control', scope: '#/properties/stream' },
    { type: 'Control', scope: '#/properties/tools' },
    { type: 'Control', scope: '#/properties/headers' },
    {
      type: 'Group',
      label: 'Execution',
      elements: [
        { type: 'Control', scope: '#/properties/timeout' },
        { type: 'Control', scope: '#/properties/retries' }
      ]
    }
  ]
};

const chatModel = nodeTypes.find((n) => n.node_type_id === 'chat_model') as NodeMetadata;

/** The Chat Model node type with the fuller config form above. */
export const agentNodeType: NodeMetadata = { ...chatModel, configSchema, uiSchema };

/** The node the inspector shows: a Chat Model with some values already set. */
export const agentNode: WorkflowNode = {
  id: 'chat_model.1',
  type: 'default',
  position: { x: 640, y: 120 },
  data: {
    label: 'Chat Model',
    config: { model: 'claude-sonnet', temperature: 0.4, tools: ['search', 'calendar'] },
    metadata: agentNodeType
  }
};

/** The chat workflow with its Chat Model replaced by {@link agentNode}. */
export const agentWorkflow: Workflow = {
  ...chatWorkflow,
  nodes: chatWorkflow.nodes.map((n) => (n.id === agentNode.id ? agentNode : n))
};

/** What the Last run tab shows in Test mode. */
export const lastRunDone: NodeExecutionInfo = {
  status: 'completed',
  executionCount: 1,
  lastExecuted: '2026-10-14T14:32:10Z',
  lastExecutionDuration: 2310,
  isExecuting: false,
  output: { response: 'Your order shipped on Monday.' }
};

/** A failed Last run. */
export const lastRunFailed: NodeExecutionInfo = {
  status: 'failed',
  executionCount: 1,
  lastExecuted: '2026-10-14T14:32:10Z',
  lastExecutionDuration: 840,
  lastError: 'The model did not answer within 30 seconds.',
  isExecuting: false
};

/** One schema per field kind, as a node's `configSchema` would declare them. */
export const fieldSchemas = {
  text: { type: 'string', title: 'Subject', description: 'Shown in the email header.' },
  number: {
    type: 'integer',
    title: 'Max results',
    description: 'Between 1 and 50.',
    minimum: 1,
    maximum: 50
  },
  range: {
    type: 'number',
    title: 'Temperature',
    description: 'Lower is more predictable.',
    format: 'range',
    minimum: 0,
    maximum: 2,
    step: 0.1
  },
  toggle: { type: 'boolean', title: 'Stream the reply', description: 'Send words as they arrive.' },
  select: {
    type: 'string',
    title: 'Model',
    description: 'The model that answers.',
    oneOf: [
      { const: 'gpt-4o', title: 'GPT-4o' },
      { const: 'gpt-4o-mini', title: 'GPT-4o mini' },
      { const: 'claude-sonnet', title: 'Claude Sonnet' }
    ]
  },
  checkboxes: {
    type: 'string',
    title: 'Allowed tools',
    enum: ['search', 'calculator', 'calendar'],
    multiple: true
  },
  multiline: {
    type: 'string',
    title: 'Instructions',
    description: 'Plain text, several lines.',
    format: 'multiline'
  },
  template: {
    type: 'string',
    title: 'Prompt',
    description: 'Use {{ question }} to insert a value.',
    format: 'template'
  },
  json: {
    type: 'object',
    title: 'Response schema',
    description: 'JSON the model must follow.',
    format: 'json'
  },
  markdown: {
    type: 'string',
    title: 'Notes',
    description: 'Markdown for people reading this workflow.',
    format: 'markdown'
  },
  list: {
    type: 'array',
    title: 'Tags',
    items: { type: 'string', title: 'Tag' }
  },
  rows: {
    type: 'array',
    title: 'Extra headers',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        value: { type: 'string', title: 'Value' }
      }
    }
  }
} satisfies Record<string, FieldSchema>;
