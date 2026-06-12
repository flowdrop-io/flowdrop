// Node + category definitions for tutorial step 5.
// A trimmed palette (input → AI → output) — enough to load and save a workflow.

export const nodes = [
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
        model: { type: 'string', title: 'Model', default: 'claude-opus-4-8' }
      }
    }
  },
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
  }
];

export const categories = [
  { id: 'inputs', name: 'Inputs', icon: 'mdi:import', color: '#22c55e' },
  { id: 'ai', name: 'AI & ML', icon: 'mdi:brain', color: '#9C27B0' },
  { id: 'outputs', name: 'Outputs', icon: 'mdi:export', color: '#ef4444' }
];
