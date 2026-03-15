import type { NodeMetadata } from '../types.js';

/**
 * Curated sample node definitions for the example server.
 * These cover key categories and node types to demonstrate the FlowDrop editor.
 */
export const nodes: NodeMetadata[] = [
  {
    id: 'text_input',
    name: 'Text Input',
    type: 'default',
    supportedTypes: ['default'],
    description: 'Accept text input from users or other sources',
    category: 'inputs',
    icon: 'mdi:text-box',
    color: '#4CAF50',
    version: '1.0.0',
    tags: ['input', 'text', 'string'],
    inputs: [
      {
        id: 'trigger',
        name: 'Trigger',
        type: 'input',
        dataType: 'trigger',
        required: false,
        description: 'Trigger input'
      }
    ],
    outputs: [
      {
        id: 'text',
        name: 'Text',
        type: 'output',
        dataType: 'string',
        required: false,
        description: 'The text value'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        defaultValue: {
          type: 'string',
          title: 'Default Value',
          description: 'Default text value',
          default: ''
        },
        placeholder: {
          type: 'string',
          title: 'Placeholder',
          description: 'Placeholder text shown when empty',
          default: 'Enter text...'
        },
        multiline: {
          type: 'boolean',
          title: 'Multiline',
          description: 'Allow multiple lines of text',
          default: false
        }
      }
    }
  },
  {
    id: 'file_input',
    name: 'File Input',
    type: 'default',
    supportedTypes: ['default'],
    description: 'Upload and process files as workflow input',
    category: 'inputs',
    icon: 'mdi:file-upload',
    color: '#4CAF50',
    version: '1.0.0',
    tags: ['input', 'file', 'upload'],
    inputs: [
      {
        id: 'trigger',
        name: 'Trigger',
        type: 'input',
        dataType: 'trigger',
        required: false,
        description: 'Trigger input'
      }
    ],
    outputs: [
      {
        id: 'file',
        name: 'File',
        type: 'output',
        dataType: 'file',
        required: false,
        description: 'The uploaded file'
      },
      {
        id: 'content',
        name: 'Content',
        type: 'output',
        dataType: 'string',
        required: false,
        description: 'Extracted text content'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        acceptedTypes: {
          type: 'string',
          title: 'Accepted File Types',
          description: 'Comma-separated list of accepted MIME types',
          default: '*/*'
        },
        maxSize: {
          type: 'number',
          title: 'Max File Size (MB)',
          description: 'Maximum file size in megabytes',
          default: 10,
          minimum: 1,
          maximum: 100
        }
      }
    }
  },
  {
    id: 'text_output',
    name: 'Text Output',
    type: 'default',
    supportedTypes: ['default'],
    description: 'Display text output from workflow processing',
    category: 'outputs',
    icon: 'mdi:text-box-check',
    color: '#2196F3',
    version: '1.0.0',
    tags: ['output', 'text', 'display'],
    inputs: [
      {
        id: 'text',
        name: 'Text',
        type: 'input',
        dataType: 'string',
        required: true,
        description: 'Text to display'
      }
    ],
    outputs: [],
    configSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          title: 'Display Format',
          description: 'How to format the output',
          default: 'plain',
          enum: ['plain', 'markdown', 'html', 'json']
        }
      }
    }
  },
  {
    id: 'chat_output',
    name: 'Chat Output',
    type: 'default',
    supportedTypes: ['default'],
    description: 'Display messages in a chat-style interface',
    category: 'outputs',
    icon: 'mdi:chat',
    color: '#2196F3',
    version: '1.0.0',
    tags: ['output', 'chat', 'message'],
    inputs: [
      {
        id: 'message',
        name: 'Message',
        type: 'input',
        dataType: 'string',
        required: true,
        description: 'Message to display'
      },
      {
        id: 'metadata',
        name: 'Metadata',
        type: 'input',
        dataType: 'json',
        required: false,
        description: 'Additional message metadata'
      }
    ],
    outputs: [],
    configSchema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          title: 'Role',
          description: 'Message role',
          default: 'assistant',
          enum: ['user', 'assistant', 'system']
        }
      }
    }
  },
  {
    id: 'chat_model',
    name: 'Chat Model',
    type: 'default',
    supportedTypes: ['default'],
    description: 'Connect to an AI language model for text generation',
    category: 'models',
    icon: 'mdi:robot',
    color: '#3F51B5',
    version: '1.0.0',
    tags: ['ai', 'model', 'llm', 'chat', 'generation'],
    inputs: [
      {
        id: 'prompt',
        name: 'Prompt',
        type: 'input',
        dataType: 'string',
        required: true,
        description: 'The prompt to send to the model'
      },
      {
        id: 'system',
        name: 'System Message',
        type: 'input',
        dataType: 'string',
        required: false,
        description: 'System message for model behavior'
      },
      {
        id: 'tool',
        name: 'Tool',
        type: 'input',
        dataType: 'tool',
        required: false,
        description: 'Available tools'
      }
    ],
    outputs: [
      {
        id: 'response',
        name: 'Response',
        type: 'output',
        dataType: 'string',
        required: false,
        description: 'Model response text'
      },
      {
        id: 'tool',
        name: 'Tool',
        type: 'output',
        dataType: 'tool',
        required: false,
        description: 'Tool calls from model'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          title: 'Model',
          description: 'AI model to use',
          default: 'gpt-4',
          enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']
        },
        temperature: {
          type: 'number',
          title: 'Temperature',
          description: 'Controls randomness (0 = deterministic, 1 = creative)',
          default: 0.7,
          minimum: 0,
          maximum: 2
        },
        maxTokens: {
          type: 'number',
          title: 'Max Tokens',
          description: 'Maximum number of tokens to generate',
          default: 1024,
          minimum: 1,
          maximum: 128000
        }
      }
    }
  },
  {
    id: 'prompt_template',
    name: 'Prompt Template',
    type: 'simple',
    supportedTypes: ['simple', 'default'],
    description: 'Create reusable prompt templates with variable substitution',
    category: 'prompts',
    icon: 'mdi:message-text',
    color: '#FF9800',
    version: '1.0.0',
    tags: ['prompt', 'template', 'text'],
    inputs: [
      {
        id: 'variables',
        name: 'Variables',
        type: 'input',
        dataType: 'json',
        required: false,
        description: 'Template variables as key-value pairs'
      }
    ],
    outputs: [
      {
        id: 'prompt',
        name: 'Prompt',
        type: 'output',
        dataType: 'string',
        required: false,
        description: 'The rendered prompt text'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          title: 'Template',
          description: 'Prompt template with {{variable}} placeholders',
          default: 'You are a helpful assistant. {{instructions}}',
          format: 'textarea'
        }
      }
    }
  },
  {
    id: 'ai_content_analyzer',
    name: 'AI Content Analyzer',
    type: 'tool',
    supportedTypes: ['tool', 'default'],
    description: 'AI-powered content analysis for smart text processing and context understanding',
    category: 'ai',
    icon: 'mdi:brain',
    color: '#9C27B0',
    version: '1.0.0',
    tags: ['ai', 'analysis', 'content', 'context'],
    inputs: [
      {
        id: 'content',
        name: 'Content',
        type: 'input',
        dataType: 'string',
        required: true,
        description: 'Content to analyze'
      },
      {
        id: 'tool',
        name: 'Tool',
        type: 'input',
        dataType: 'tool',
        required: false,
        description: 'Available tools'
      },
      {
        id: 'trigger',
        name: 'Trigger',
        type: 'input',
        dataType: 'trigger',
        required: false,
        description: ''
      }
    ],
    outputs: [
      {
        id: 'tool',
        name: 'Tool',
        type: 'output',
        dataType: 'tool',
        required: false,
        description: 'Available tools'
      },
      {
        id: 'analyzed_content',
        name: 'Analysis Result',
        type: 'output',
        dataType: 'json',
        required: false,
        description: 'Analysis results including sentiment, entities, and summary'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        analysisType: {
          type: 'string',
          title: 'Analysis Type',
          description: 'Type of analysis to perform',
          default: 'full',
          enum: ['sentiment', 'entities', 'summary', 'full']
        },
        language: {
          type: 'string',
          title: 'Language',
          description: 'Content language',
          default: 'en',
          enum: ['en', 'es', 'fr', 'de', 'ja', 'zh']
        }
      }
    }
  },
  {
    id: 'http_request',
    name: 'HTTP Request',
    type: 'tool',
    supportedTypes: ['tool', 'default'],
    description: 'Make HTTP requests to external APIs and services',
    category: 'tools',
    icon: 'mdi:web',
    color: '#FF9800',
    version: '1.0.0',
    tags: ['http', 'api', 'request', 'rest'],
    inputs: [
      {
        id: 'body',
        name: 'Request Body',
        type: 'input',
        dataType: 'json',
        required: false,
        description: 'Request body for POST/PUT requests'
      },
      {
        id: 'tool',
        name: 'Tool',
        type: 'input',
        dataType: 'tool',
        required: false,
        description: 'Available tools'
      }
    ],
    outputs: [
      {
        id: 'tool',
        name: 'Tool',
        type: 'output',
        dataType: 'tool',
        required: false,
        description: 'Available tools'
      },
      {
        id: 'response',
        name: 'Response',
        type: 'output',
        dataType: 'json',
        required: false,
        description: 'HTTP response data'
      },
      {
        id: 'status',
        name: 'Status Code',
        type: 'output',
        dataType: 'number',
        required: false,
        description: 'HTTP response status code'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          title: 'URL',
          description: 'Request URL',
          default: ''
        },
        method: {
          type: 'string',
          title: 'Method',
          description: 'HTTP method',
          default: 'GET',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
        },
        headers: {
          type: 'string',
          title: 'Headers',
          description: 'HTTP headers as JSON',
          default: '{}',
          format: 'textarea'
        }
      }
    }
  },
  {
    id: 'calculator',
    name: 'Calculator',
    type: 'tool',
    supportedTypes: ['tool', 'default'],
    description: 'Perform mathematical calculations and expressions',
    category: 'tools',
    icon: 'mdi:calculator',
    color: '#FF9800',
    version: '1.0.0',
    tags: ['math', 'calculate', 'expression'],
    inputs: [
      {
        id: 'expression',
        name: 'Expression',
        type: 'input',
        dataType: 'string',
        required: true,
        description: 'Mathematical expression to evaluate'
      },
      {
        id: 'tool',
        name: 'Tool',
        type: 'input',
        dataType: 'tool',
        required: false,
        description: 'Available tools'
      }
    ],
    outputs: [
      {
        id: 'tool',
        name: 'Tool',
        type: 'output',
        dataType: 'tool',
        required: false,
        description: 'Available tools'
      },
      {
        id: 'result',
        name: 'Result',
        type: 'output',
        dataType: 'number',
        required: false,
        description: 'Calculation result'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        precision: {
          type: 'number',
          title: 'Decimal Precision',
          description: 'Number of decimal places',
          default: 2,
          minimum: 0,
          maximum: 20
        }
      }
    }
  },
  {
    id: 'conditional_router',
    name: 'Conditional Router',
    type: 'gateway',
    supportedTypes: ['gateway'],
    description: 'Route workflow execution based on conditions',
    category: 'logic',
    icon: 'mdi:source-branch',
    color: '#9C27B0',
    version: '1.0.0',
    tags: ['logic', 'condition', 'router', 'branch'],
    inputs: [
      {
        id: 'value',
        name: 'Value',
        type: 'input',
        dataType: 'string',
        required: true,
        description: 'Value to evaluate'
      },
      {
        id: 'trigger',
        name: 'Trigger',
        type: 'input',
        dataType: 'trigger',
        required: false,
        description: ''
      }
    ],
    outputs: [
      {
        id: 'true',
        name: 'True',
        type: 'output',
        dataType: 'trigger',
        required: false,
        description: 'Triggered when condition is true'
      },
      {
        id: 'false',
        name: 'False',
        type: 'output',
        dataType: 'trigger',
        required: false,
        description: 'Triggered when condition is false'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        condition: {
          type: 'string',
          title: 'Condition',
          description: 'Condition expression to evaluate',
          default: ''
        },
        operator: {
          type: 'string',
          title: 'Operator',
          description: 'Comparison operator',
          default: 'equals',
          enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'regex']
        },
        compareValue: {
          type: 'string',
          title: 'Compare Value',
          description: 'Value to compare against',
          default: ''
        }
      }
    }
  },
  {
    id: 'text_formatter',
    name: 'Text Formatter',
    type: 'default',
    supportedTypes: ['default'],
    description: 'Format and transform text with various operations',
    category: 'processing',
    icon: 'mdi:format-text',
    color: '#009688',
    version: '1.0.0',
    tags: ['text', 'format', 'transform', 'string'],
    inputs: [
      {
        id: 'text',
        name: 'Text',
        type: 'input',
        dataType: 'string',
        required: true,
        description: 'Text to format'
      }
    ],
    outputs: [
      {
        id: 'formatted',
        name: 'Formatted Text',
        type: 'output',
        dataType: 'string',
        required: false,
        description: 'The formatted text'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          title: 'Operation',
          description: 'Text transformation to apply',
          default: 'none',
          enum: ['none', 'uppercase', 'lowercase', 'capitalize', 'trim', 'slugify', 'reverse']
        },
        prefix: {
          type: 'string',
          title: 'Prefix',
          description: 'Text to prepend',
          default: ''
        },
        suffix: {
          type: 'string',
          title: 'Suffix',
          description: 'Text to append',
          default: ''
        }
      }
    }
  },
  {
    id: 'json_parser',
    name: 'JSON Parser',
    type: 'default',
    supportedTypes: ['default'],
    description: 'Parse, extract, and transform JSON data',
    category: 'data',
    icon: 'mdi:code-json',
    color: '#FF5722',
    version: '1.0.0',
    tags: ['json', 'parse', 'data', 'extract'],
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'input',
        dataType: 'string',
        required: true,
        description: 'JSON string or data to parse'
      }
    ],
    outputs: [
      {
        id: 'output',
        name: 'Parsed Data',
        type: 'output',
        dataType: 'json',
        required: false,
        description: 'Parsed JSON data'
      },
      {
        id: 'value',
        name: 'Extracted Value',
        type: 'output',
        dataType: 'string',
        required: false,
        description: 'Value at the specified path'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          title: 'JSON Path',
          description: 'Path to extract (e.g., "data.items[0].name")',
          default: ''
        }
      }
    }
  },
  {
    id: 'conversation_memory',
    name: 'Conversation Memory',
    type: 'default',
    supportedTypes: ['default'],
    description: 'Store and retrieve conversation history for AI context',
    category: 'memories',
    icon: 'mdi:brain',
    color: '#2196F3',
    version: '1.0.0',
    tags: ['memory', 'conversation', 'history', 'context'],
    inputs: [
      {
        id: 'message',
        name: 'Message',
        type: 'input',
        dataType: 'string',
        required: false,
        description: 'New message to add to history'
      }
    ],
    outputs: [
      {
        id: 'history',
        name: 'History',
        type: 'output',
        dataType: 'array',
        required: false,
        description: 'Conversation history messages'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        maxMessages: {
          type: 'number',
          title: 'Max Messages',
          description: 'Maximum number of messages to keep',
          default: 50,
          minimum: 1,
          maximum: 1000
        },
        sessionKey: {
          type: 'string',
          title: 'Session Key',
          description: 'Key to identify the conversation session',
          default: 'default'
        }
      }
    }
  },
  {
    id: 'start_trigger',
    name: 'Start Trigger',
    type: 'terminal',
    supportedTypes: ['terminal'],
    description: 'Starting point for workflow execution',
    category: 'triggers',
    icon: 'mdi:play-circle',
    color: '#00BCD4',
    version: '1.0.0',
    tags: ['trigger', 'start', 'begin'],
    inputs: [],
    outputs: [
      {
        id: 'trigger',
        name: 'Trigger',
        type: 'output',
        dataType: 'trigger',
        required: false,
        description: 'Starts the workflow'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          title: 'Label',
          description: 'Display label for the trigger',
          default: 'Start'
        }
      }
    }
  },
  {
    id: 'for_each_loop',
    name: 'For Each Loop',
    type: 'default',
    supportedTypes: ['default'],
    description: 'Iterate over an array and process each item',
    category: 'processing',
    icon: 'mdi:repeat',
    color: '#009688',
    version: '1.0.0',
    tags: ['loop', 'iterate', 'array', 'batch'],
    inputs: [
      {
        id: 'items',
        name: 'Items',
        type: 'input',
        dataType: 'array',
        required: true,
        description: 'Array of items to iterate over'
      },
      {
        id: 'trigger',
        name: 'Trigger',
        type: 'input',
        dataType: 'trigger',
        required: false,
        description: ''
      }
    ],
    outputs: [
      {
        id: 'item',
        name: 'Current Item',
        type: 'output',
        dataType: 'string',
        required: false,
        description: 'The current item being processed'
      },
      {
        id: 'index',
        name: 'Index',
        type: 'output',
        dataType: 'number',
        required: false,
        description: 'Current iteration index'
      },
      {
        id: 'done',
        name: 'Done',
        type: 'output',
        dataType: 'trigger',
        required: false,
        description: 'Triggered when all items are processed'
      }
    ],
    configSchema: {
      type: 'object',
      properties: {
        batchSize: {
          type: 'number',
          title: 'Batch Size',
          description: 'Number of items to process in parallel',
          default: 1,
          minimum: 1,
          maximum: 100
        }
      }
    }
  }
];

export function getNodeById(id: string): NodeMetadata | undefined {
  return nodes.find((node) => node.id === id);
}

export function getNodesByCategory(category: string): NodeMetadata[] {
  return nodes.filter((node) => node.category === category);
}

export function searchNodes(query: string): NodeMetadata[] {
  const q = query.toLowerCase();
  return nodes.filter(
    (node) =>
      node.name.toLowerCase().includes(q) ||
      node.description.toLowerCase().includes(q) ||
      node.tags?.some((tag) => tag.toLowerCase().includes(q))
  );
}
