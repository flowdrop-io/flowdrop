/**
 * Node fixtures shared by the node, edge, status and zoom stories. Every one is
 * typed with the library's own types, so a renamed field fails the type check
 * instead of silently changing a story.
 */
import type { NodePort, WorkflowNode } from '$lib/types/index.js';
import { createSampleNodeData } from './utils.js';

const port = (
  type: 'input' | 'output',
  id: string,
  name: string,
  dataType: string,
  extra: Partial<NodePort> = {}
): NodePort => ({ id, name, type, dataType, required: false, ...extra });

/**
 * A typical node: what the editor draws most (the default card). One trigger in and out,
 * two data inputs, one data output.
 */
export function typicalNodeData(label = 'Summarise text'): WorkflowNode['data'] {
  return createSampleNodeData({
    label,
    metadata: {
      node_type_id: 'summarise_text',
      name: 'Summarise text',
      description: 'Shortens a text to a few sentences with a language model.',
      category: 'ai',
      icon: 'mdi:text-short',
      type: 'default',
      inputs: [
        port('input', 'trigger', 'Trigger', 'trigger'),
        port('input', 'text', 'Text', 'string', { required: true }),
        port('input', 'style', 'Style', 'string')
      ],
      outputs: [
        port('output', 'trigger', 'Done', 'trigger'),
        port('output', 'summary', 'Summary', 'string')
      ]
    }
  });
}

/** A node that only produces text: the left end of a data wire. */
export function textSourceData(): WorkflowNode['data'] {
  return createSampleNodeData({
    label: 'Text input',
    metadata: {
      node_type_id: 'text_input',
      name: 'Text input',
      description: 'A text the user types in.',
      category: 'inputs',
      icon: 'mdi:text',
      inputs: [],
      outputs: [port('output', 'output', 'Text', 'string')]
    }
  });
}

/** A node that only takes text: the right end of a data wire. */
export function textTargetData(): WorkflowNode['data'] {
  return createSampleNodeData({
    label: 'Text output',
    metadata: {
      node_type_id: 'text_output',
      name: 'Text output',
      description: 'Shows a text to the user.',
      category: 'outputs',
      icon: 'mdi:text-box',
      inputs: [port('input', 'input', 'Text', 'string')],
      outputs: []
    }
  });
}

/** The left end of a trigger wire (the order in which nodes run). */
export function triggerSourceData(): WorkflowNode['data'] {
  return createSampleNodeData({
    label: 'Fetch page',
    metadata: {
      node_type_id: 'fetch_page',
      name: 'Fetch page',
      description: 'Downloads a web page.',
      category: 'processing',
      icon: 'mdi:web',
      inputs: [],
      outputs: [port('output', 'trigger', 'Done', 'trigger')]
    }
  });
}

/** The right end of a trigger wire. */
export function triggerTargetData(): WorkflowNode['data'] {
  return createSampleNodeData({
    label: 'Send email',
    metadata: {
      node_type_id: 'send_email',
      name: 'Send email',
      description: 'Sends the result by email.',
      category: 'outputs',
      icon: 'mdi:email-outline',
      inputs: [port('input', 'trigger', 'Trigger', 'trigger')],
      outputs: []
    }
  });
}

/** The left end of a tool wire: a node that offers itself to an agent. */
export function toolSourceData(): WorkflowNode['data'] {
  return createSampleNodeData({
    label: 'Search the web',
    metadata: {
      node_type_id: 'web_search',
      name: 'Search the web',
      description: 'Lets an agent search the web.',
      category: 'tools',
      icon: 'mdi:magnify',
      type: 'tool',
      inputs: [],
      outputs: [port('output', 'tool', 'Tool', 'tool')]
    }
  });
}

/** The right end of a tool wire: an agent that can use tools. */
export function toolTargetData(): WorkflowNode['data'] {
  return createSampleNodeData({
    label: 'Research agent',
    metadata: {
      node_type_id: 'research_agent',
      name: 'Research agent',
      description: 'An agent that decides which tools to call.',
      category: 'agents',
      icon: 'mdi:robot-outline',
      inputs: [port('input', 'tool', 'Tools', 'tool')],
      outputs: []
    }
  });
}
