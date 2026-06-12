// A pre-built workflow to load into the editor, so clicking "Save" has
// something to persist. This mirrors the data structure documented in
// /tutorial/05-saving-workflows:
//
//   - nodes: each canvas node has an id, type ("universalNode"), position,
//     and a `data` block (label, config, metadata, nodeId).
//   - edges: each connection has source/target node ids and the specific
//     port handles, formatted as `{nodeId}-{direction}-{portId}`.

import { nodes as palette } from './nodes.js';

// Look up a full node definition to embed as `data.metadata`.
const def = (id) => palette.find((n) => n.id === id);

export const prebuiltWorkflow = {
  id: 'tutorial-workflow',
  name: 'Tutorial workflow',
  description: 'Text Input → AI Content Analyzer → Text Output',
  nodes: [
    {
      id: 'text_input.1',
      type: 'universalNode',
      position: { x: 0, y: 100 },
      data: {
        label: 'Text Input',
        config: { placeholder: 'Enter text...' },
        metadata: def('text_input'),
        nodeId: 'text_input.1'
      }
    },
    {
      id: 'ai_content_analyzer.1',
      type: 'universalNode',
      position: { x: 320, y: 100 },
      data: {
        label: 'AI Content Analyzer',
        config: { model: 'claude-opus-4-8' },
        metadata: def('ai_content_analyzer'),
        nodeId: 'ai_content_analyzer.1'
      }
    },
    {
      id: 'text_output.1',
      type: 'universalNode',
      position: { x: 640, y: 100 },
      data: {
        label: 'Text Output',
        config: {},
        metadata: def('text_output'),
        nodeId: 'text_output.1'
      }
    }
  ],
  edges: [
    {
      id: 'e-text_input-ai_analyzer',
      source: 'text_input.1',
      target: 'ai_content_analyzer.1',
      sourceHandle: 'text_input.1-output-text',
      targetHandle: 'ai_content_analyzer.1-input-content'
    },
    {
      id: 'e-ai_analyzer-text_output',
      source: 'ai_content_analyzer.1',
      target: 'text_output.1',
      sourceHandle: 'ai_content_analyzer.1-output-analyzed_content',
      targetHandle: 'text_output.1-input-text'
    }
  ]
};
