import type { Workflow } from '../types.js';
import { getNodeById } from './nodes.js';

/** In-memory workflow storage */
const workflowMap = new Map<string, Workflow>();

/**
 * Sample workflow: Simple Chat Pipeline
 * text_input -> chat_model -> text_output
 */
const simpleChatPipeline: Workflow = {
  id: 'sample_chat_pipeline',
  name: 'Simple Chat Pipeline',
  description:
    'A basic chat pipeline that takes text input, sends it to an AI model, and displays the response.',
  nodes: [
    {
      id: 'text_input.1',
      type: 'universalNode',
      position: { x: 0, y: 100 },
      data: {
        label: 'User Input',
        config: { defaultValue: '', placeholder: 'Ask something...' },
        metadata: getNodeById('text_input')!
      }
    },
    {
      id: 'chat_model.1',
      type: 'universalNode',
      position: { x: 300, y: 100 },
      data: {
        label: 'AI Model',
        config: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024 },
        metadata: getNodeById('chat_model')!
      }
    },
    {
      id: 'text_output.1',
      type: 'universalNode',
      position: { x: 600, y: 100 },
      data: {
        label: 'Response',
        config: { format: 'markdown' },
        metadata: getNodeById('text_output')!
      }
    }
  ],
  edges: [
    {
      id: 'e-input-model',
      source: 'text_input.1',
      target: 'chat_model.1',
      sourceHandle: 'text',
      targetHandle: 'prompt'
    },
    {
      id: 'e-model-output',
      source: 'chat_model.1',
      target: 'text_output.1',
      sourceHandle: 'response',
      targetHandle: 'text'
    }
  ],
  metadata: {
    version: '1.0.0',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    author: 'FlowDrop',
    tags: ['example', 'chat', 'simple']
  }
};

/**
 * Sample workflow: Content Processing
 * text_input -> ai_content_analyzer -> text_formatter -> chat_output
 */
const contentProcessing: Workflow = {
  id: 'sample_content_processing',
  name: 'Content Processing Pipeline',
  description: 'Analyzes text content using AI and formats the results for display.',
  nodes: [
    {
      id: 'text_input.1',
      type: 'universalNode',
      position: { x: 0, y: 100 },
      data: {
        label: 'Content Input',
        config: { defaultValue: '', placeholder: 'Paste content here...', multiline: true },
        metadata: getNodeById('text_input')!
      }
    },
    {
      id: 'ai_content_analyzer.1',
      type: 'universalNode',
      position: { x: 300, y: 100 },
      data: {
        label: 'Content Analyzer',
        config: { analysisType: 'full', language: 'en' },
        metadata: getNodeById('ai_content_analyzer')!
      }
    },
    {
      id: 'text_formatter.1',
      type: 'universalNode',
      position: { x: 600, y: 100 },
      data: {
        label: 'Format Results',
        config: { operation: 'none', prefix: '## Analysis\n\n', suffix: '' },
        metadata: getNodeById('text_formatter')!
      }
    },
    {
      id: 'chat_output.1',
      type: 'universalNode',
      position: { x: 900, y: 100 },
      data: {
        label: 'Display Results',
        config: { role: 'assistant' },
        metadata: getNodeById('chat_output')!
      }
    }
  ],
  edges: [
    {
      id: 'e-input-analyzer',
      source: 'text_input.1',
      target: 'ai_content_analyzer.1',
      sourceHandle: 'text',
      targetHandle: 'content'
    },
    {
      id: 'e-analyzer-formatter',
      source: 'ai_content_analyzer.1',
      target: 'text_formatter.1',
      sourceHandle: 'analyzed_content',
      targetHandle: 'text'
    },
    {
      id: 'e-formatter-output',
      source: 'text_formatter.1',
      target: 'chat_output.1',
      sourceHandle: 'formatted',
      targetHandle: 'message'
    }
  ],
  metadata: {
    version: '1.0.0',
    createdAt: '2026-01-20T14:30:00.000Z',
    updatedAt: '2026-02-01T09:15:00.000Z',
    author: 'FlowDrop',
    tags: ['example', 'ai', 'content', 'analysis']
  }
};

// Initialize with sample data
workflowMap.set(simpleChatPipeline.id, simpleChatPipeline);
workflowMap.set(contentProcessing.id, contentProcessing);

export function getAllWorkflows(): Workflow[] {
  return Array.from(workflowMap.values());
}

export function getWorkflowById(id: string): Workflow | undefined {
  return workflowMap.get(id);
}

export function createWorkflow(input: {
  name: string;
  description?: string;
  nodes?: Workflow['nodes'];
  edges?: Workflow['edges'];
  tags?: string[];
}): Workflow {
  const now = new Date().toISOString();
  const workflow: Workflow = {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
    nodes: input.nodes ?? [],
    edges: input.edges ?? [],
    metadata: {
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      tags: input.tags
    }
  };
  workflowMap.set(workflow.id, workflow);
  return workflow;
}

export function updateWorkflow(
  id: string,
  updates: {
    name?: string;
    description?: string;
    nodes?: Workflow['nodes'];
    edges?: Workflow['edges'];
    metadata?: Partial<Workflow['metadata']>;
  }
): Workflow | undefined {
  const existing = workflowMap.get(id);
  if (!existing) return undefined;

  const updated: Workflow = {
    ...existing,
    name: updates.name ?? existing.name,
    description: updates.description ?? existing.description,
    nodes: updates.nodes ?? existing.nodes,
    edges: updates.edges ?? existing.edges,
    metadata: {
      ...existing.metadata,
      ...updates.metadata,
      updatedAt: new Date().toISOString()
    }
  };
  workflowMap.set(id, updated);
  return updated;
}

export function deleteWorkflow(id: string): boolean {
  return workflowMap.delete(id);
}
