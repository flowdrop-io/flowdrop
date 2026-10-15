/**
 * Typed fixtures shared by the editor stories: node types, a small workflow and
 * a runs list, in the shapes a FlowDrop backend sends.
 *
 * Typed with the library types, so a renamed field breaks the type check
 * instead of a story.
 */

import type {
  NodeMetadata,
  NodePort,
  Workflow,
  WorkflowEdge,
  WorkflowNode
} from '../types/index.js';

const port = (
  id: string,
  name: string,
  type: NodePort['type'],
  dataType: string,
  extra: Partial<NodePort> = {}
): NodePort => ({ id, name, type, dataType, ...extra });

/** Node types in the built-in category ids (`inputs`, `models`, ...). */
export const nodeTypes: NodeMetadata[] = [
  {
    node_type_id: 'webhook_trigger',
    name: 'Webhook',
    description: 'Start the workflow when a request arrives',
    category: 'triggers',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:webhook',
    inputs: [],
    outputs: [port('payload', 'Payload', 'output', 'json')],
    configSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', title: 'Path', default: '/hooks/orders' }
      }
    }
  },
  {
    node_type_id: 'chat_input',
    name: 'Chat Input',
    description: 'Take a message from the person using the chat',
    category: 'inputs',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:message-text-outline',
    inputs: [],
    outputs: [port('message', 'Message', 'output', 'string')],
    configSchema: { type: 'object', properties: {} }
  },
  {
    node_type_id: 'prompt_template',
    name: 'Prompt Template',
    description: 'Fill a prompt with values from earlier nodes',
    category: 'prompts',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:text-box-edit-outline',
    inputs: [port('question', 'Question', 'input', 'string', { required: true })],
    outputs: [port('prompt', 'Prompt', 'output', 'string')],
    configSchema: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          title: 'Template',
          format: 'template',
          description: 'Use {{ question }} to insert the question.',
          default: 'Answer briefly.\n\n{{ question }}'
        }
      }
    }
  },
  {
    node_type_id: 'chat_model',
    name: 'Chat Model',
    description: 'Get a reply from a large language model',
    category: 'models',
    version: '1.2.0',
    type: 'default',
    icon: 'mdi:robot-outline',
    inputs: [
      port('prompt', 'Prompt', 'input', 'string', { required: true }),
      port('context', 'Context', 'input', 'string')
    ],
    outputs: [port('response', 'Response', 'output', 'string')],
    configSchema: {
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
          format: 'range',
          minimum: 0,
          maximum: 2,
          step: 0.1,
          default: 0.7
        },
        systemPrompt: {
          type: 'string',
          title: 'System prompt',
          format: 'multiline',
          description: 'Tell the model how to behave.',
          default: 'You are a helpful assistant.'
        },
        jsonMode: { type: 'boolean', title: 'Reply as JSON', default: false }
      }
    }
  },
  {
    node_type_id: 'http_request',
    name: 'HTTP Request',
    description: 'Call an external API',
    category: 'tools',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:web',
    inputs: [port('body', 'Body', 'input', 'json')],
    outputs: [
      port('response', 'Response', 'output', 'json'),
      port('status', 'Status code', 'output', 'number')
    ],
    configSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', title: 'URL', default: 'https://api.example.com/orders' },
        method: {
          type: 'string',
          title: 'Method',
          default: 'GET',
          enum: ['GET', 'POST', 'PUT', 'DELETE']
        },
        timeout: { type: 'integer', title: 'Timeout (ms)', default: 30000, minimum: 0 }
      }
    }
  },
  {
    node_type_id: 'branch',
    name: 'Branch',
    description: 'Send the flow down one path or another',
    category: 'logic',
    version: '1.0.0',
    type: 'gateway',
    icon: 'mdi:source-branch',
    inputs: [port('value', 'Value', 'input', 'any')],
    outputs: [port('yes', 'Yes', 'output', 'any'), port('no', 'No', 'output', 'any')],
    configSchema: {
      type: 'object',
      properties: { condition: { type: 'string', title: 'Condition', default: 'value != null' } }
    }
  },
  {
    node_type_id: 'text_splitter',
    name: 'Text Splitter',
    description: 'Cut long text into chunks',
    category: 'processing',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:content-cut',
    inputs: [port('text', 'Text', 'input', 'string')],
    outputs: [port('chunks', 'Chunks', 'output', 'array')],
    configSchema: {
      type: 'object',
      properties: { chunkSize: { type: 'integer', title: 'Chunk size', default: 800 } }
    }
  },
  {
    node_type_id: 'chat_output',
    name: 'Chat Output',
    description: 'Show a message to the person using the chat',
    category: 'outputs',
    version: '1.0.0',
    type: 'default',
    icon: 'mdi:message-reply-text-outline',
    inputs: [port('message', 'Message', 'input', 'string', { required: true })],
    outputs: [],
    configSchema: { type: 'object', properties: {} }
  }
];

const byId = (id: string): NodeMetadata => {
  const found = nodeTypes.find((n) => n.node_type_id === id);
  if (!found) throw new Error(`Unknown story node type: ${id}`);
  return found;
};

const node = (id: string, typeId: string, x: number, y: number, label?: string): WorkflowNode => ({
  id,
  type: 'default',
  position: { x, y },
  data: { label: label ?? byId(typeId).name, config: {}, metadata: byId(typeId) }
});

const edge = (
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string
): WorkflowEdge => ({
  id,
  source,
  target,
  sourceHandle: `${source}-output-${sourceHandle}`,
  targetHandle: `${target}-input-${targetHandle}`
});

/** A small chat workflow: input, prompt, model, output. */
export const chatWorkflow: Workflow = {
  id: 'support-chat',
  name: 'Support chat',
  description: 'Answers a customer question with a model.',
  nodes: [
    node('chat_input.1', 'chat_input', 40, 120),
    node('prompt_template.1', 'prompt_template', 340, 120),
    node('chat_model.1', 'chat_model', 640, 120),
    node('chat_output.1', 'chat_output', 960, 120)
  ],
  edges: [
    edge('e1', 'chat_input.1', 'message', 'prompt_template.1', 'question'),
    edge('e2', 'prompt_template.1', 'prompt', 'chat_model.1', 'prompt'),
    edge('e3', 'chat_model.1', 'response', 'chat_output.1', 'message')
  ],
  metadata: {
    schemaVersion: '1.0.0',
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-12T14:30:00Z'
  }
};

/** What `GET /workflow/{id}/pipelines` sends back, newest first. */
export function runsResponse(now: Date = new Date()): { success: true; data: unknown } {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const pipeline = (
    id: string,
    status: string,
    startedMinutesAgo: number,
    seconds: number | null,
    jobs: { total: number; failed: number }
  ) => ({
    id,
    status,
    createdAt: ago(startedMinutesAgo),
    lastExecuted: seconds === null ? null : ago(startedMinutesAgo - seconds / 60),
    executionCount: jobs.total,
    job_status_summary: jobs
  });
  return {
    success: true,
    data: {
      pipelines: [
        pipeline('142', 'running', 1, null, { total: 4, failed: 0 }),
        pipeline('141', 'completed', 12, 8, { total: 4, failed: 0 }),
        pipeline('140', 'failed', 55, 21, { total: 4, failed: 1 }),
        pipeline('139', 'completed', 60 * 26, 9, { total: 4, failed: 0 }),
        pipeline('138', 'cancelled', 60 * 27, 3, { total: 2, failed: 0 })
      ]
    }
  };
}
