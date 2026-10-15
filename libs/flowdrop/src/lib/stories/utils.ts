/**
 * Shared story utilities
 * Reusable mock data factories for Storybook stories
 */

import type {
  NodeExecutionInfo,
  NodeExecutionStatus,
  NodeMetadata,
  NodePort,
  WorkflowNode
} from '$lib/types/index.js';
import {
  createFlowDropInstance,
  type FlowDropInstance
} from '$lib/stores/instanceContainer.svelte.js';
import type {
  ConfirmationConfig,
  ChoiceConfig,
  TextConfig,
  ReviewConfig,
  ReviewChange
} from '$lib/types/interrupt.js';

/** Fields of a node on the canvas, with the node type's metadata given as a partial. */
export type SampleNodeOverrides = Omit<Partial<WorkflowNode['data']>, 'metadata'> & {
  metadata?: Partial<NodeMetadata>;
};

/**
 * A node type as a backend would report it. Pass only what the story is about;
 * the rest is a plain one-in, one-out processing node.
 */
export function createNodeMetadata(overrides: Partial<NodeMetadata> = {}): NodeMetadata {
  return {
    node_type_id: 'sample-node',
    name: 'Sample node',
    description: 'A sample node for stories',
    category: 'processing',
    version: '1.0.0',
    type: 'default',
    inputs: [{ id: 'input', name: 'Input', type: 'input', dataType: 'string', required: false }],
    outputs: [{ id: 'output', name: 'Output', type: 'output', dataType: 'string' }],
    ...overrides
  };
}

/** The `data` of a node on the canvas, as the editor passes it to a node card. */
export function createSampleNodeData(overrides: SampleNodeOverrides = {}): WorkflowNode['data'] {
  const { metadata, ...rest } = overrides;
  const meta = createNodeMetadata(metadata);
  return {
    label: meta.name,
    config: {},
    ...rest,
    metadata: meta
  };
}

export function createTerminalNodeData(
  variant: 'start' | 'end' | 'exit' = 'start'
): WorkflowNode['data'] {
  const anyPort = (type: 'input' | 'output'): NodePort => ({
    id: type,
    name: type === 'input' ? 'Input' : 'Output',
    type,
    dataType: 'any',
    required: false
  });
  const terminal = (
    label: string,
    description: string,
    extra: Partial<NodeMetadata>
  ): WorkflowNode['data'] =>
    createSampleNodeData({
      label,
      config: { variant },
      metadata: {
        node_type_id: variant,
        name: label,
        description,
        category: 'triggers',
        type: 'terminal',
        tags: [variant],
        ...extra
      }
    });
  switch (variant) {
    case 'start':
      return terminal('Start', 'Workflow start point', {
        inputs: [],
        outputs: [anyPort('output')]
      });
    case 'end':
      return terminal('End', 'Workflow end point', { inputs: [anyPort('input')], outputs: [] });
    case 'exit':
      return terminal('Exit', 'Early exit point', {
        inputs: [anyPort('input')],
        outputs: []
      });
  }
}

/** One node of a story canvas (see NodeDecorator). */
export interface StoryNode {
  id: string;
  data: WorkflowNode['data'];
  /** Top-left corner on the canvas; default 0, 0. */
  x?: number;
  y?: number;
  selected?: boolean;
}

/** One run status for a node: a bare status, or a status with more of what a run records. */
export type StorySeed =
  | NodeExecutionStatus
  | (Partial<NodeExecutionInfo> & { status: NodeExecutionStatus });

/** Run statuses to show, by node id. */
export type StoryStatuses = Record<string, StorySeed>;

/** The full status record the instance's store holds. */
export function toExecutionInfo(seed: StorySeed): NodeExecutionInfo {
  const given = typeof seed === 'string' ? { status: seed } : seed;
  return {
    executionCount: 1,
    isExecuting: given.status === 'running',
    ...given
  };
}

/**
 * A fresh instance for one story, so statuses and Test mode seeded here never
 * reach another story (the page-default instance is shared).
 */
export function createStoryInstance(): FlowDropInstance {
  return createFlowDropInstance({ id: `story-${++storyInstances}` });
}
let storyInstances = 0;

/**
 * Put run state on an instance without a backend: the same store the run
 * controller fills while a run is shown, and the same switch the editor flips
 * in Test mode. Call it again to change what is shown.
 *
 * @param statuses Run status per node id. A node with none is "not in this run".
 * @param testMode Edit mode shows the pill only; Test mode also draws the status border and
 *   dims the nodes the run did not reach.
 */
export function seedRunState(
  fd: FlowDropInstance,
  statuses: StoryStatuses | undefined,
  testMode: boolean
): void {
  const entries = Object.entries(statuses ?? {});
  if (entries.length === 0) {
    fd.playground.clearNodeStatuses();
  } else {
    fd.playground.setNodeStatuses(
      Object.fromEntries(entries.map(([id, seed]) => [id, toExecutionInfo(seed)])),
      { workflowId: 'story-workflow', pipelineId: 'story-run' }
    );
  }
  fd.editedNodes.setVisible(testMode);
}

/** The canvas zoom a story opens at, and what it draws there. */
export const ZOOM_LEVELS = {
  /** Full card: header, description, ports with names. */
  full: 1,
  /** Header and pill rows; no description. */
  outline: 0.6,
  /** Only the icon tile, as a block. */
  glyph: 0.35,
  /** One flat block per node, status as an outline. */
  map: 0.2
} as const;

export function createConfirmationConfig(
  overrides?: Partial<ConfirmationConfig>
): ConfirmationConfig {
  return {
    message: 'Are you sure you want to proceed with this action?',
    confirmLabel: 'Yes, proceed',
    cancelLabel: 'Cancel',
    ...overrides
  };
}

export function createChoiceConfig(overrides?: Partial<ChoiceConfig>): ChoiceConfig {
  return {
    message: 'Select a priority level for this task:',
    options: [
      { value: 'low', label: 'Low', description: 'Non-urgent task' },
      { value: 'medium', label: 'Medium', description: 'Normal priority' },
      { value: 'high', label: 'High', description: 'Urgent task' }
    ],
    multiple: false,
    ...overrides
  };
}

export function createTextConfig(overrides?: Partial<TextConfig>): TextConfig {
  return {
    message: 'Please provide additional details:',
    placeholder: 'Enter your response here...',
    multiline: false,
    ...overrides
  };
}

export function createReviewConfig(overrides?: Partial<ReviewConfig>): ReviewConfig {
  return {
    message: 'Review the following changes before submitting:',
    changes: [
      {
        field: 'title',
        label: 'Title',
        original: 'Old Title',
        proposed: 'New Title'
      },
      {
        field: 'description',
        label: 'Description',
        original: 'Old description text',
        proposed: 'Updated description text'
      },
      {
        field: 'status',
        label: 'Status',
        original: 'draft',
        proposed: 'published'
      }
    ],
    ...overrides
  };
}

export function createReviewChange(overrides?: Partial<ReviewChange>): ReviewChange {
  return {
    field: 'title',
    label: 'Title',
    original: 'Original value',
    proposed: 'Proposed value',
    ...overrides
  };
}
