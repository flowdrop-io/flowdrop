// Node + category definitions for tutorial step 4.
// https://flowdrop.io docs: /tutorial/04-multiple-nodes-and-categories
//
// Six nodes across six categories, exercising the different visual `type`s.
// The docs abbreviate ports/config with "// ...ports and config"; here they're
// filled in so the workflow described in the "Try it" section actually works:
//
//   Text Input → AI Content Analyzer → Text Output
//
// (string output → "Content to Analyze" input, "analyzed_content" → Text Input)

export const nodes = [
  // ---- Inputs --------------------------------------------------------------
  {
    id: 'text_input',
    name: 'Text Input',
    type: 'simple',
    description: 'Simple text input for user data',
    category: 'inputs',
    icon: 'mdi:text',
    color: '#22c55e',
    version: '1.0.0',
    inputs: [],
    outputs: [{ id: 'text', name: 'text', type: 'output', dataType: 'string' }],
    configSchema: {
      type: 'object',
      properties: {
        placeholder: { type: 'string', title: 'Placeholder', default: 'Enter text...' }
      }
    }
  },

  // ---- Outputs -------------------------------------------------------------
  {
    id: 'text_output',
    name: 'Text Output',
    type: 'simple',
    description: 'Displays a text result',
    category: 'outputs',
    icon: 'mdi:text-box',
    color: '#ef4444',
    version: '1.0.0',
    inputs: [{ id: 'text', name: 'Text Input', type: 'input', dataType: 'string' }],
    outputs: [],
    configSchema: { type: 'object', properties: {} }
  },

  // ---- AI & ML -------------------------------------------------------------
  {
    id: 'ai_content_analyzer',
    name: 'AI Content Analyzer',
    type: 'tool',
    description: 'Analyzes incoming content with an AI model',
    category: 'ai',
    icon: 'mdi:brain',
    color: '#9C27B0',
    version: '1.0.0',
    inputs: [{ id: 'content', name: 'Content to Analyze', type: 'input', dataType: 'string' }],
    outputs: [
      { id: 'analyzed_content', name: 'analyzed_content', type: 'output', dataType: 'string' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          title: 'Model',
          enum: ['gpt-4o', 'claude-opus-4-8', 'gemini-1.5-pro'],
          default: 'claude-opus-4-8'
        }
      }
    }
  },

  // ---- Processing ----------------------------------------------------------
  {
    id: 'json_transformer',
    name: 'JSON Transformer',
    type: 'tool',
    description: 'Transforms a JSON payload',
    category: 'processing',
    icon: 'mdi:code-json',
    color: '#3b82f6',
    version: '1.0.0',
    inputs: [{ id: 'input', name: 'input', type: 'input', dataType: 'json' }],
    outputs: [{ id: 'output', name: 'output', type: 'output', dataType: 'json' }],
    configSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', title: 'Transform expression' }
      }
    }
  },

  // ---- Logic ---------------------------------------------------------------
  {
    id: 'gateway',
    name: 'Gateway',
    type: 'gateway',
    description: 'Conditional branching',
    category: 'logic',
    icon: 'mdi:source-branch',
    color: '#f59e0b',
    version: '1.0.0',
    inputs: [{ id: 'in', name: 'in', type: 'input', dataType: 'mixed' }],
    outputs: [
      { id: 'true', name: 'true', type: 'output', dataType: 'mixed' },
      { id: 'false', name: 'false', type: 'output', dataType: 'mixed' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        condition: { type: 'string', title: 'Condition' }
      }
    }
  },

  // ---- Helpers -------------------------------------------------------------
  {
    id: 'notes',
    name: 'Notes',
    type: 'idea',
    description: 'A sticky note for documentation',
    category: 'helpers',
    icon: 'mdi:note-text',
    color: '#fbbf24',
    version: '1.0.0',
    inputs: [],
    outputs: [],
    configSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', title: 'Note', default: 'Write a note…' }
      }
    }
  }
];

export const categories = [
  { id: 'inputs', name: 'Inputs', icon: 'mdi:import', color: '#22c55e' },
  { id: 'outputs', name: 'Outputs', icon: 'mdi:export', color: '#ef4444' },
  { id: 'ai', name: 'AI & ML', icon: 'mdi:brain', color: '#9C27B0' },
  { id: 'processing', name: 'Processing', icon: 'mdi:cog', color: '#3b82f6' },
  { id: 'logic', name: 'Logic', icon: 'mdi:source-branch', color: '#f59e0b' },
  { id: 'helpers', name: 'Helpers', icon: 'mdi:wrench', color: '#fbbf24' }
];
