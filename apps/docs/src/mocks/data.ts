/**
 * Demo mock data for interactive documentation demos.
 * Curated subset of the full FlowDrop mock data.
 */

/** Demo workflow: AI-Powered Content Enhancement */
export const demoWorkflow = {
  id: 'demo_tool_workflow',
  name: 'Demo: AI-Powered Tool Workflow',
  description: 'Demonstrates the use of AI tools in a workflow',
  nodes: [
    {
      id: 'content_loader.1',
      type: 'universalNode',
      position: { x: -240, y: 70 },
      data: {
        label: 'Content Loader',
        config: {
          nodeType: 'tool',
          contentType: 'article',
          status: 'published',
          limit: 50,
          fields: ['title', 'body']
        },
        metadata: {
          id: 'content_loader',
          name: 'Content Loader',
          type: 'tool',
          supportedTypes: ['tool', 'default'],
          description: 'Load content from the site for batch processing',
          category: 'content',
          icon: 'mdi:database-import',
          color: '#FF9800',
          version: '1.0.0',
          tags: ['content', 'drupal', 'batch', 'loader'],
          inputs: [
            {
              id: 'tool',
              name: 'Tool',
              type: 'input',
              dataType: 'tool',
              required: false,
              description: 'Available Tools'
            },
            {
              id: 'filters',
              name: 'Additional Filters',
              type: 'input',
              dataType: 'json',
              required: false,
              description: 'Additional filtering criteria'
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
              id: 'content_items',
              name: 'content_items',
              type: 'output',
              dataType: 'array',
              required: false,
              description: 'Array of loaded content items'
            },
            {
              id: 'total_count',
              name: 'total_count',
              type: 'output',
              dataType: 'number',
              required: false,
              description: 'Total number of items loaded'
            }
          ],
          config: {
            contentType: 'article',
            status: 'published',
            limit: 50,
            fields: ['title', 'body']
          },
          configSchema: {
            type: 'object',
            properties: {
              nodeType: {
                type: 'string',
                title: 'Node Type',
                default: 'tool',
                oneOf: [
                  { const: 'tool', title: 'Tool Node' },
                  { const: 'default', title: 'Default Node' }
                ]
              },
              contentType: {
                type: 'string',
                title: 'Content Type',
                enum: ['article', 'page', 'blog_post', 'news'],
                default: 'article'
              },
              status: {
                type: 'string',
                title: 'Publication Status',
                enum: ['published', 'unpublished', 'all'],
                default: 'published'
              },
              limit: { type: 'integer', title: 'Limit', minimum: 1, maximum: 1000, default: 50 }
            }
          }
        },
        nodeId: 'content_loader.1'
      },
      deletable: true,
      measured: { width: 288, height: 120 }
    },
    {
      id: 'ai_content_analyzer.1',
      type: 'universalNode',
      position: { x: 160, y: -10 },
      data: {
        label: 'AI Content Analyzer',
        config: {
          nodeType: 'tool',
          targetText: 'XB',
          replacementText: 'Canvas',
          analysisMode: 'context_aware',
          confidenceThreshold: 0.8
        },
        metadata: {
          id: 'ai_content_analyzer',
          name: 'AI Content Analyzer',
          type: 'tool',
          supportedTypes: ['tool', 'default'],
          description: 'AI-powered content analysis for smart text processing',
          category: 'ai',
          icon: 'mdi:brain',
          color: '#9C27B0',
          version: '1.0.0',
          tags: ['ai', 'analysis', 'content'],
          inputs: [
            {
              id: 'content',
              name: 'Content to Analyze',
              type: 'input',
              dataType: 'mixed',
              required: false,
              description: 'Text content for AI analysis'
            },
            {
              id: 'tool',
              name: 'Tool',
              type: 'input',
              dataType: 'tool',
              required: false,
              description: 'Available Tools'
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
              name: 'analyzed_content',
              type: 'output',
              dataType: 'array',
              required: false,
              description: 'Content items with AI analysis results'
            },
            {
              id: 'total_analyzed',
              name: 'total_analyzed',
              type: 'output',
              dataType: 'number',
              required: false,
              description: 'Total number of items analyzed'
            }
          ],
          config: {
            targetText: 'XB',
            replacementText: 'Canvas',
            analysisMode: 'context_aware',
            confidenceThreshold: 0.8
          },
          configSchema: {
            type: 'object',
            properties: {
              nodeType: {
                type: 'string',
                title: 'Node Type',
                default: 'tool',
                oneOf: [
                  { const: 'tool', title: 'Tool Node' },
                  { const: 'default', title: 'Default Node' }
                ]
              },
              targetText: { type: 'string', title: 'Target Text', default: 'XB' },
              replacementText: { type: 'string', title: 'Replacement Text', default: 'Canvas' },
              analysisMode: {
                type: 'string',
                title: 'Analysis Mode',
                enum: ['acronym_detection', 'sentence_flow', 'context_aware'],
                default: 'context_aware'
              },
              confidenceThreshold: {
                type: 'number',
                title: 'Confidence',
                format: 'range',
                minimum: 0,
                maximum: 1,
                step: 0.01,
                default: 0.8
              }
            }
          }
        },
        nodeId: 'ai_content_analyzer.1'
      },
      deletable: true,
      measured: { width: 288, height: 142 }
    },
    {
      id: 'simple_agent.1',
      type: 'universalNode',
      position: { x: 610, y: -220 },
      data: {
        label: 'Simple Agent',
        config: { systemPrompt: 'You are a helpful assistant.', temperature: 0.7, maxTokens: 1000 },
        metadata: {
          id: 'simple_agent',
          name: 'Simple Agent',
          type: 'default',
          supportedTypes: ['default'],
          description: 'Agent for tool orchestration',
          category: 'agents',
          icon: 'mdi:account-cog',
          color: '#06b6d4',
          version: '1.0.0',
          tags: ['agent', 'orchestration', 'tools'],
          inputs: [
            {
              id: 'message',
              name: 'Message',
              type: 'input',
              dataType: 'string',
              required: false,
              description: 'The message for the agent to process'
            },
            {
              id: 'tools',
              name: 'Tools',
              type: 'input',
              dataType: 'array',
              required: false,
              description: 'Tools available to the agent'
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
              id: 'response',
              name: 'response',
              type: 'output',
              dataType: 'json',
              required: false,
              description: 'The agent response'
            },
            {
              id: 'message',
              name: 'message',
              type: 'output',
              dataType: 'string',
              required: false,
              description: 'The input message'
            }
          ],
          config: { model: 'gpt-3.5-turbo', temperature: 0.7, maxIterations: 5 },
          configSchema: {
            type: 'object',
            properties: {
              systemPrompt: {
                type: 'string',
                title: 'System Prompt',
                format: 'multiline',
                default: 'You are a helpful assistant.'
              },
              temperature: {
                type: 'number',
                format: 'range',
                title: 'Temperature',
                minimum: 0,
                maximum: 1,
                step: 0.1,
                default: 0.7
              },
              maxTokens: { type: 'integer', title: 'Max Tokens', default: 1000 }
            }
          }
        },
        nodeId: 'simple_agent.1'
      },
      deletable: true,
      measured: { width: 288, height: 815 }
    },
    {
      id: 'text_input.1',
      type: 'universalNode',
      position: { x: 0, y: -200 },
      data: {
        label: 'Text Input',
        config: { nodeType: 'simple', placeholder: 'Enter text...', defaultValue: '' },
        metadata: {
          id: 'text_input',
          name: 'Text Input',
          type: 'simple',
          supportedTypes: ['simple', 'square', 'default'],
          description: 'Simple text input for user data',
          category: 'inputs',
          icon: 'mdi:text',
          color: '#22c55e',
          version: '1.0.0',
          tags: ['input', 'text'],
          inputs: [],
          outputs: [
            {
              id: 'text',
              name: 'text',
              type: 'output',
              dataType: 'string',
              required: false,
              description: 'The input text value'
            }
          ],
          config: { placeholder: 'Enter text here...', defaultValue: '' },
          configSchema: {
            type: 'object',
            properties: {
              nodeType: {
                type: 'string',
                title: 'Node Type',
                default: 'simple',
                oneOf: [
                  { const: 'simple', title: 'Simple' },
                  { const: 'square', title: 'Square' },
                  { const: 'default', title: 'Default' }
                ]
              },
              placeholder: { type: 'string', title: 'Placeholder', default: 'Enter text...' }
            }
          }
        },
        nodeId: 'text_input.1'
      },
      deletable: true,
      measured: { width: 288, height: 88 }
    },
    {
      id: 'text_output.1',
      type: 'universalNode',
      position: { x: 1080, y: 410 },
      data: {
        label: 'Text Output',
        config: { nodeType: 'simple', maxLength: 1000, format: 'plain' },
        metadata: {
          id: 'text_output',
          name: 'Text Output',
          type: 'simple',
          supportedTypes: ['square', 'simple', 'default'],
          description: 'Simple text output for displaying data',
          category: 'outputs',
          icon: 'mdi:text-box',
          color: '#ef4444',
          version: '1.0.0',
          tags: ['output', 'text', 'display'],
          inputs: [
            {
              id: 'text',
              name: 'Text Input',
              type: 'input',
              dataType: 'string',
              required: false,
              description: 'The text to output'
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
          outputs: [],
          config: { format: 'plain', maxLength: 1000 },
          configSchema: {
            type: 'object',
            properties: {
              nodeType: {
                type: 'string',
                title: 'Node Type',
                default: 'simple',
                oneOf: [
                  { const: 'simple', title: 'Simple' },
                  { const: 'square', title: 'Square' },
                  { const: 'default', title: 'Default' }
                ]
              },
              maxLength: {
                type: 'integer',
                title: 'Maximum Length',
                default: 1000,
                minimum: 1,
                maximum: 10000
              },
              format: {
                type: 'string',
                title: 'Text Format',
                default: 'plain',
                enum: ['plain', 'html', 'markdown']
              }
            }
          }
        },
        nodeId: 'text_output.1'
      },
      deletable: true,
      measured: { width: 288, height: 88 }
    }
  ],
  edges: [
    {
      id: 'e-content_loader-ai_analyzer',
      source: 'content_loader.1',
      target: 'ai_content_analyzer.1',
      data: {
        metadata: { edgeType: 'data' },
        targetNodeType: 'universalNode',
        targetCategory: 'ai'
      },
      sourceHandle: 'content_loader.1-output-tool',
      targetHandle: 'ai_content_analyzer.1-input-tool',
      style: 'stroke: grey;',
      markerEnd: { type: 'arrowclosed', width: 16, height: 16, color: 'grey' }
    },
    {
      id: 'e-ai_analyzer-agent',
      source: 'ai_content_analyzer.1',
      target: 'simple_agent.1',
      data: {
        metadata: { edgeType: 'data' },
        targetNodeType: 'universalNode',
        targetCategory: 'agents'
      },
      sourceHandle: 'ai_content_analyzer.1-output-tool',
      targetHandle: 'simple_agent.1-input-tools',
      style: 'stroke: grey;',
      markerEnd: { type: 'arrowclosed', width: 16, height: 16, color: 'grey' }
    },
    {
      id: 'e-text_input-agent',
      source: 'text_input.1',
      target: 'simple_agent.1',
      data: {
        metadata: { edgeType: 'data' },
        targetNodeType: 'universalNode',
        targetCategory: 'agents'
      },
      sourceHandle: 'text_input.1-output-text',
      targetHandle: 'simple_agent.1-input-message',
      style: 'stroke: grey;',
      markerEnd: { type: 'arrowclosed', width: 16, height: 16, color: 'grey' }
    },
    {
      id: 'e-agent-text_output',
      source: 'simple_agent.1',
      target: 'text_output.1',
      data: {
        metadata: { edgeType: 'data' },
        targetNodeType: 'universalNode',
        targetCategory: 'outputs'
      },
      sourceHandle: 'simple_agent.1-output-message',
      targetHandle: 'text_output.1-input-text',
      style: 'stroke: grey;',
      markerEnd: { type: 'arrowclosed', width: 16, height: 16, color: 'grey' }
    }
  ],
  metadata: {
    version: '1.0.0',
    createdAt: '2025-11-12T21:29:32.473Z',
    updatedAt: '2025-11-12T21:29:32.473Z'
  }
};

/** Curated node types for the sidebar in interactive demos */
export const demoNodes = [
  // Extract unique node metadata from the demo workflow
  ...demoWorkflow.nodes.map((n) => n.data.metadata),
  // Additional nodes for the sidebar
  {
    id: 'gateway',
    name: 'Gateway',
    type: 'gateway',
    supportedTypes: ['gateway'],
    description: 'Conditional routing based on rules',
    category: 'logic',
    icon: 'mdi:source-branch',
    color: '#f59e0b',
    version: '1.0.0',
    tags: ['logic', 'routing', 'conditional'],
    inputs: [
      {
        id: 'input',
        name: 'Input',
        type: 'input',
        dataType: 'mixed',
        required: false,
        description: 'Data to evaluate'
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
        dataType: 'mixed',
        required: false,
        description: 'Route when condition is true'
      },
      {
        id: 'false',
        name: 'False',
        type: 'output',
        dataType: 'mixed',
        required: false,
        description: 'Route when condition is false'
      }
    ],
    config: {},
    configSchema: {
      type: 'object',
      properties: {
        condition: { type: 'string', title: 'Condition', description: 'Expression to evaluate' }
      }
    }
  },
  {
    id: 'terminal',
    name: 'Terminal',
    type: 'terminal',
    supportedTypes: ['terminal'],
    description: 'End point of a workflow execution path',
    category: 'control',
    icon: 'mdi:stop-circle',
    color: '#dc2626',
    version: '1.0.0',
    tags: ['terminal', 'end', 'stop'],
    inputs: [
      {
        id: 'result',
        name: 'Result',
        type: 'input',
        dataType: 'mixed',
        required: false,
        description: 'Final result'
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
    outputs: [],
    config: {},
    configSchema: { type: 'object', properties: {} }
  },
  {
    id: 'json_transformer',
    name: 'JSON Transformer',
    type: 'tool',
    supportedTypes: ['tool', 'default'],
    description: 'Transform JSON data using configurable rules',
    category: 'processing',
    icon: 'mdi:code-json',
    color: '#3b82f6',
    version: '1.0.0',
    tags: ['json', 'transform', 'data'],
    inputs: [
      {
        id: 'input',
        name: 'Input Data',
        type: 'input',
        dataType: 'json',
        required: false,
        description: 'JSON data to transform'
      },
      {
        id: 'tool',
        name: 'Tool',
        type: 'input',
        dataType: 'tool',
        required: false,
        description: 'Available Tools'
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
        id: 'output',
        name: 'output',
        type: 'output',
        dataType: 'json',
        required: false,
        description: 'Transformed JSON output'
      }
    ],
    config: {},
    configSchema: {
      type: 'object',
      properties: {
        nodeType: {
          type: 'string',
          title: 'Node Type',
          default: 'tool',
          oneOf: [
            { const: 'tool', title: 'Tool Node' },
            { const: 'default', title: 'Default Node' }
          ]
        },
        template: {
          type: 'string',
          title: 'Transform Template',
          format: 'multiline',
          description: 'JSONPath or transformation template'
        }
      }
    }
  },
  {
    id: 'notes',
    name: 'Notes',
    type: 'idea',
    supportedTypes: ['idea'],
    description: 'Add notes and documentation to your workflow',
    category: 'helpers',
    icon: 'mdi:note-text',
    color: '#fbbf24',
    version: '1.0.0',
    tags: ['notes', 'documentation', 'comment'],
    inputs: [],
    outputs: [],
    config: {},
    configSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', title: 'Note Text', format: 'multiline', default: '' }
      }
    }
  }
];
