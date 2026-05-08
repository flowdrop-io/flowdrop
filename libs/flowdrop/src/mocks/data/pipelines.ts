/**
 * Mock pipeline execution data for MSW mock server
 * Provides sample pipeline states and job data for API testing
 */

import type { NodeExecutionStatus } from '../../lib/types/index.js';

/**
 * Pipeline status type
 */
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Job status interface
 */
export interface JobStatus {
  id: string;
  node_id: string;
  status: NodeExecutionStatus;
  execution_count: number;
  started?: string;
  completed?: string;
  execution_time?: number;
  error_message?: string;
}

/**
 * Node status interface
 */
export interface NodeStatus {
  status: NodeExecutionStatus;
  last_executed?: string;
  execution_time?: number;
  error?: string;
}

/**
 * Job status summary interface
 */
export interface JobStatusSummary {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

/**
 * Pipeline execution interface
 */
export interface Pipeline {
  id: string;
  workflow_id: string;
  status: PipelineStatus;
  created: string;
  updated: string;
  jobs: JobStatus[];
  node_statuses: Record<string, NodeStatus>;
  job_status_summary: JobStatusSummary;
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  node_id?: string;
  context?: Record<string, unknown>;
}

/**
 * Sample pipeline executions
 */
export const mockPipelines = new Map<string, Pipeline>([
  // Completed pipeline
  [
    'pipeline-001',
    {
      id: 'pipeline-001',
      workflow_id: '550e8400-e29b-41d4-a716-446655440001',
      status: 'completed',
      created: '2024-01-15T10:00:00Z',
      updated: '2024-01-15T10:05:30Z',
      jobs: [
        {
          id: 'job-001-1',
          node_id: 'node-input-1',
          status: 'completed',
          execution_count: 1,
          started: '2024-01-15T10:00:00Z',
          completed: '2024-01-15T10:00:01Z',
          execution_time: 1000
        },
        {
          id: 'job-001-2',
          node_id: 'node-openai-1',
          status: 'completed',
          execution_count: 1,
          started: '2024-01-15T10:00:01Z',
          completed: '2024-01-15T10:05:00Z',
          execution_time: 299000
        },
        {
          id: 'job-001-3',
          node_id: 'node-output-1',
          status: 'completed',
          execution_count: 1,
          started: '2024-01-15T10:05:00Z',
          completed: '2024-01-15T10:05:30Z',
          execution_time: 30000
        }
      ],
      node_statuses: {
        'node-input-1': {
          status: 'completed',
          last_executed: '2024-01-15T10:00:01Z',
          execution_time: 1000
        },
        'node-openai-1': {
          status: 'completed',
          last_executed: '2024-01-15T10:05:00Z',
          execution_time: 299000
        },
        'node-output-1': {
          status: 'completed',
          last_executed: '2024-01-15T10:05:30Z',
          execution_time: 30000
        }
      },
      job_status_summary: {
        total: 3,
        pending: 0,
        running: 0,
        completed: 3,
        failed: 0,
        cancelled: 0
      }
    }
  ],

  // Running pipeline
  [
    'pipeline-002',
    {
      id: 'pipeline-002',
      workflow_id: '550e8400-e29b-41d4-a716-446655440002',
      status: 'running',
      created: '2024-01-15T11:00:00Z',
      updated: '2024-01-15T11:02:00Z',
      jobs: [
        {
          id: 'job-002-1',
          node_id: 'node-file-1',
          status: 'completed',
          execution_count: 1,
          started: '2024-01-15T11:00:00Z',
          completed: '2024-01-15T11:00:30Z',
          execution_time: 30000
        },
        {
          id: 'job-002-2',
          node_id: 'node-split-1',
          status: 'completed',
          execution_count: 1,
          started: '2024-01-15T11:00:30Z',
          completed: '2024-01-15T11:01:00Z',
          execution_time: 30000
        },
        {
          id: 'job-002-3',
          node_id: 'node-data-ops-1',
          status: 'running',
          execution_count: 1,
          started: '2024-01-15T11:01:00Z'
        },
        {
          id: 'job-002-4',
          node_id: 'node-save-1',
          status: 'pending',
          execution_count: 0
        }
      ],
      node_statuses: {
        'node-file-1': {
          status: 'completed',
          last_executed: '2024-01-15T11:00:30Z',
          execution_time: 30000
        },
        'node-split-1': {
          status: 'completed',
          last_executed: '2024-01-15T11:01:00Z',
          execution_time: 30000
        },
        'node-data-ops-1': {
          status: 'running',
          last_executed: '2024-01-15T11:01:00Z'
        },
        'node-save-1': {
          status: 'pending'
        }
      },
      job_status_summary: {
        total: 4,
        pending: 1,
        running: 1,
        completed: 2,
        failed: 0,
        cancelled: 0
      }
    }
  ],

  // Failed pipeline
  [
    'pipeline-003',
    {
      id: 'pipeline-003',
      workflow_id: '550e8400-e29b-41d4-a716-446655440003',
      status: 'failed',
      created: '2024-01-15T09:00:00Z',
      updated: '2024-01-15T09:03:00Z',
      jobs: [
        {
          id: 'job-003-1',
          node_id: 'node-chat-input',
          status: 'completed',
          execution_count: 1,
          started: '2024-01-15T09:00:00Z',
          completed: '2024-01-15T09:00:05Z',
          execution_time: 5000
        },
        {
          id: 'job-003-2',
          node_id: 'node-search',
          status: 'failed',
          execution_count: 3,
          started: '2024-01-15T09:00:05Z',
          completed: '2024-01-15T09:03:00Z',
          execution_time: 175000,
          error_message: 'Connection timeout: Unable to reach Drupal Search API'
        }
      ],
      node_statuses: {
        'node-chat-input': {
          status: 'completed',
          last_executed: '2024-01-15T09:00:05Z',
          execution_time: 5000
        },
        'node-search': {
          status: 'failed',
          last_executed: '2024-01-15T09:03:00Z',
          execution_time: 175000,
          error: 'Connection timeout: Unable to reach Drupal Search API'
        },
        'node-analyzer': {
          status: 'skipped'
        },
        'node-editor': {
          status: 'skipped'
        },
        'node-draft': {
          status: 'skipped'
        },
        'node-response': {
          status: 'skipped'
        }
      },
      job_status_summary: {
        total: 2,
        pending: 0,
        running: 0,
        completed: 1,
        failed: 1,
        cancelled: 0
      }
    }
  ],

  // demo-foreach-loop: completed pipeline (all 5 fruits processed)
  [
    'pipeline-foreach-001',
    {
      id: 'pipeline-foreach-001',
      workflow_id: 'demo-foreach-loop',
      status: 'completed',
      created: '2024-03-10T08:00:00Z',
      updated: '2024-03-10T08:00:12Z',
      jobs: [
        {
          id: 'job-foreach-001-1',
          node_id: 'json_loader.1',
          status: 'completed',
          execution_count: 1,
          started: '2024-03-10T08:00:00Z',
          completed: '2024-03-10T08:00:00Z',
          execution_time: 120
        },
        {
          id: 'job-foreach-001-2',
          node_id: 'foreach.1',
          status: 'completed',
          execution_count: 5,
          started: '2024-03-10T08:00:00Z',
          completed: '2024-03-10T08:00:11Z',
          execution_time: 11200
        },
        {
          id: 'job-foreach-001-3',
          node_id: 'process_item.1',
          status: 'completed',
          execution_count: 5,
          started: '2024-03-10T08:00:01Z',
          completed: '2024-03-10T08:00:11Z',
          execution_time: 10000
        }
      ],
      node_statuses: {
        'json_loader.1': {
          status: 'completed',
          last_executed: '2024-03-10T08:00:00Z',
          execution_time: 120
        },
        'foreach.1': {
          status: 'completed',
          last_executed: '2024-03-10T08:00:11Z',
          execution_time: 11200
        },
        'process_item.1': {
          status: 'completed',
          last_executed: '2024-03-10T08:00:11Z',
          execution_time: 10000
        },
        'notes.1': { status: 'idle' }
      },
      job_status_summary: {
        total: 3,
        pending: 0,
        running: 0,
        completed: 3,
        failed: 0,
        cancelled: 0
      }
    }
  ],

  // demo-foreach-loop: failed on 3rd item (Cherry)
  [
    'pipeline-foreach-002',
    {
      id: 'pipeline-foreach-002',
      workflow_id: 'demo-foreach-loop',
      status: 'failed',
      created: '2024-03-10T09:15:00Z',
      updated: '2024-03-10T09:15:08Z',
      jobs: [
        {
          id: 'job-foreach-002-1',
          node_id: 'json_loader.1',
          status: 'completed',
          execution_count: 1,
          started: '2024-03-10T09:15:00Z',
          completed: '2024-03-10T09:15:00Z',
          execution_time: 95
        },
        {
          id: 'job-foreach-002-2',
          node_id: 'foreach.1',
          status: 'failed',
          execution_count: 3,
          started: '2024-03-10T09:15:00Z',
          completed: '2024-03-10T09:15:08Z',
          execution_time: 8200
        },
        {
          id: 'job-foreach-002-3',
          node_id: 'process_item.1',
          status: 'failed',
          execution_count: 3,
          started: '2024-03-10T09:15:01Z',
          completed: '2024-03-10T09:15:08Z',
          execution_time: 7100,
          error_message: 'TypeError: Cannot read properties of undefined (processing item "Cherry")'
        }
      ],
      node_statuses: {
        'json_loader.1': {
          status: 'completed',
          last_executed: '2024-03-10T09:15:00Z',
          execution_time: 95
        },
        'foreach.1': {
          status: 'failed',
          last_executed: '2024-03-10T09:15:08Z',
          execution_time: 8200,
          error: 'Loop aborted: child node failed on iteration 3 (continueOnError is false)'
        },
        'process_item.1': {
          status: 'failed',
          last_executed: '2024-03-10T09:15:08Z',
          execution_time: 7100,
          error: 'TypeError: Cannot read properties of undefined (processing item "Cherry")'
        },
        'notes.1': { status: 'idle' }
      },
      job_status_summary: {
        total: 3,
        pending: 0,
        running: 0,
        completed: 1,
        failed: 2,
        cancelled: 0
      }
    }
  ],

  // demo-foreach-loop: currently running (processing 4th item "Date")
  [
    'pipeline-foreach-003',
    {
      id: 'pipeline-foreach-003',
      workflow_id: 'demo-foreach-loop',
      status: 'running',
      created: '2024-03-10T10:30:00Z',
      updated: '2024-03-10T10:30:07Z',
      jobs: [
        {
          id: 'job-foreach-003-1',
          node_id: 'json_loader.1',
          status: 'completed',
          execution_count: 1,
          started: '2024-03-10T10:30:00Z',
          completed: '2024-03-10T10:30:00Z',
          execution_time: 108
        },
        {
          id: 'job-foreach-003-2',
          node_id: 'foreach.1',
          status: 'running',
          execution_count: 4,
          started: '2024-03-10T10:30:00Z'
        },
        {
          id: 'job-foreach-003-3',
          node_id: 'process_item.1',
          status: 'running',
          execution_count: 4,
          started: '2024-03-10T10:30:07Z'
        }
      ],
      node_statuses: {
        'json_loader.1': {
          status: 'completed',
          last_executed: '2024-03-10T10:30:00Z',
          execution_time: 108
        },
        'foreach.1': {
          status: 'running',
          last_executed: '2024-03-10T10:30:07Z'
        },
        'process_item.1': {
          status: 'running',
          last_executed: '2024-03-10T10:30:07Z'
        },
        'notes.1': { status: 'idle' }
      },
      job_status_summary: {
        total: 3,
        pending: 0,
        running: 2,
        completed: 1,
        failed: 0,
        cancelled: 0
      }
    }
  ],

  // demo-foreach-loop: cancelled after 2 items
  [
    'pipeline-foreach-004',
    {
      id: 'pipeline-foreach-004',
      workflow_id: 'demo-foreach-loop',
      status: 'cancelled',
      created: '2024-03-10T11:45:00Z',
      updated: '2024-03-10T11:45:05Z',
      jobs: [
        {
          id: 'job-foreach-004-1',
          node_id: 'json_loader.1',
          status: 'completed',
          execution_count: 1,
          started: '2024-03-10T11:45:00Z',
          completed: '2024-03-10T11:45:00Z',
          execution_time: 115
        },
        {
          id: 'job-foreach-004-2',
          node_id: 'foreach.1',
          status: 'cancelled',
          execution_count: 2,
          started: '2024-03-10T11:45:00Z',
          completed: '2024-03-10T11:45:05Z',
          execution_time: 5100
        },
        {
          id: 'job-foreach-004-3',
          node_id: 'process_item.1',
          status: 'cancelled',
          execution_count: 2,
          started: '2024-03-10T11:45:01Z',
          completed: '2024-03-10T11:45:05Z',
          execution_time: 4000
        }
      ],
      node_statuses: {
        'json_loader.1': {
          status: 'completed',
          last_executed: '2024-03-10T11:45:00Z',
          execution_time: 115
        },
        'foreach.1': {
          status: 'cancelled',
          last_executed: '2024-03-10T11:45:05Z',
          execution_time: 5100
        },
        'process_item.1': {
          status: 'cancelled',
          last_executed: '2024-03-10T11:45:05Z',
          execution_time: 4000
        },
        'notes.1': { status: 'idle' }
      },
      job_status_summary: {
        total: 3,
        pending: 0,
        running: 0,
        completed: 1,
        failed: 0,
        cancelled: 2
      }
    }
  ],

  // Pending pipeline
  [
    'pipeline-004',
    {
      id: 'pipeline-004',
      workflow_id: '550e8400-e29b-41d4-a716-446655440004',
      status: 'pending',
      created: '2024-01-15T12:00:00Z',
      updated: '2024-01-15T12:00:00Z',
      jobs: [
        {
          id: 'job-004-1',
          node_id: 'node-agent-input',
          status: 'pending',
          execution_count: 0
        },
        {
          id: 'job-004-2',
          node_id: 'node-agent',
          status: 'pending',
          execution_count: 0
        },
        {
          id: 'job-004-3',
          node_id: 'node-agent-output',
          status: 'pending',
          execution_count: 0
        }
      ],
      node_statuses: {
        'node-agent-input': { status: 'pending' },
        'node-agent': { status: 'pending' },
        'node-http-tool': { status: 'idle' },
        'node-json-tool': { status: 'idle' },
        'node-calc-tool': { status: 'idle' },
        'node-agent-output': { status: 'pending' }
      },
      job_status_summary: {
        total: 3,
        pending: 3,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      }
    }
  ]
]);

/**
 * Pipeline logs storage
 */
export const pipelineLogs: Map<string, LogEntry[]> = new Map([
  [
    'pipeline-001',
    [
      {
        timestamp: '2024-01-15T10:00:00Z',
        level: 'info',
        message: 'Pipeline execution started',
        context: { workflow_id: '550e8400-e29b-41d4-a716-446655440001' }
      },
      {
        timestamp: '2024-01-15T10:00:00Z',
        level: 'info',
        message: 'Node execution started',
        node_id: 'node-input-1'
      },
      {
        timestamp: '2024-01-15T10:00:01Z',
        level: 'info',
        message: 'Node execution completed successfully',
        node_id: 'node-input-1',
        context: { execution_time: 1000 }
      },
      {
        timestamp: '2024-01-15T10:00:01Z',
        level: 'info',
        message: 'Node execution started',
        node_id: 'node-openai-1'
      },
      {
        timestamp: '2024-01-15T10:02:00Z',
        level: 'debug',
        message: 'OpenAI API request sent',
        node_id: 'node-openai-1',
        context: { model: 'gpt-4o-mini', tokens_requested: 1000 }
      },
      {
        timestamp: '2024-01-15T10:05:00Z',
        level: 'info',
        message: 'Node execution completed successfully',
        node_id: 'node-openai-1',
        context: { execution_time: 299000, tokens_used: 450 }
      },
      {
        timestamp: '2024-01-15T10:05:00Z',
        level: 'info',
        message: 'Node execution started',
        node_id: 'node-output-1'
      },
      {
        timestamp: '2024-01-15T10:05:30Z',
        level: 'info',
        message: 'Node execution completed successfully',
        node_id: 'node-output-1',
        context: { execution_time: 30000 }
      },
      {
        timestamp: '2024-01-15T10:05:30Z',
        level: 'info',
        message: 'Pipeline execution completed successfully',
        context: { total_execution_time: 330000 }
      }
    ]
  ],
  [
    'pipeline-002',
    [
      {
        timestamp: '2024-01-15T11:00:00Z',
        level: 'info',
        message: 'Pipeline execution started',
        context: { workflow_id: '550e8400-e29b-41d4-a716-446655440002' }
      },
      {
        timestamp: '2024-01-15T11:00:00Z',
        level: 'info',
        message: 'File upload processing started',
        node_id: 'node-file-1'
      },
      {
        timestamp: '2024-01-15T11:00:30Z',
        level: 'info',
        message: 'File upload completed',
        node_id: 'node-file-1',
        context: { file_size: '2.5MB', file_type: 'csv' }
      },
      {
        timestamp: '2024-01-15T11:00:30Z',
        level: 'info',
        message: 'Text splitting started',
        node_id: 'node-split-1'
      },
      {
        timestamp: '2024-01-15T11:01:00Z',
        level: 'info',
        message: 'Text splitting completed',
        node_id: 'node-split-1',
        context: { chunks_created: 15 }
      },
      {
        timestamp: '2024-01-15T11:01:00Z',
        level: 'info',
        message: 'Data filtering started',
        node_id: 'node-data-ops-1'
      }
    ]
  ],
  [
    'pipeline-foreach-001',
    [
      { timestamp: '2024-03-10T08:00:00Z', level: 'info', message: 'Pipeline execution started', context: { workflow_id: 'demo-foreach-loop' } },
      { timestamp: '2024-03-10T08:00:00Z', level: 'info', message: 'Node execution started', node_id: 'json_loader.1' },
      { timestamp: '2024-03-10T08:00:00Z', level: 'info', message: 'Node execution completed', node_id: 'json_loader.1', context: { items_loaded: 5, execution_time: 120 } },
      { timestamp: '2024-03-10T08:00:00Z', level: 'info', message: 'ForEach loop started', node_id: 'foreach.1', context: { total_items: 5 } },
      { timestamp: '2024-03-10T08:00:01Z', level: 'debug', message: 'Iteration 1/5: processing "Apple"', node_id: 'foreach.1', context: { index: 0, item: 'Apple' } },
      { timestamp: '2024-03-10T08:00:01Z', level: 'info', message: 'Node execution started', node_id: 'process_item.1', context: { item: 'Apple' } },
      { timestamp: '2024-03-10T08:00:03Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Apple', execution_time: 2100 } },
      { timestamp: '2024-03-10T08:00:03Z', level: 'debug', message: 'Iteration 2/5: processing "Banana"', node_id: 'foreach.1', context: { index: 1, item: 'Banana' } },
      { timestamp: '2024-03-10T08:00:03Z', level: 'info', message: 'Node execution started', node_id: 'process_item.1', context: { item: 'Banana' } },
      { timestamp: '2024-03-10T08:00:05Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Banana', execution_time: 1900 } },
      { timestamp: '2024-03-10T08:00:05Z', level: 'debug', message: 'Iteration 3/5: processing "Cherry"', node_id: 'foreach.1', context: { index: 2, item: 'Cherry' } },
      { timestamp: '2024-03-10T08:00:05Z', level: 'info', message: 'Node execution started', node_id: 'process_item.1', context: { item: 'Cherry' } },
      { timestamp: '2024-03-10T08:00:07Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Cherry', execution_time: 2200 } },
      { timestamp: '2024-03-10T08:00:07Z', level: 'debug', message: 'Iteration 4/5: processing "Date"', node_id: 'foreach.1', context: { index: 3, item: 'Date' } },
      { timestamp: '2024-03-10T08:00:07Z', level: 'info', message: 'Node execution started', node_id: 'process_item.1', context: { item: 'Date' } },
      { timestamp: '2024-03-10T08:00:09Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Date', execution_time: 1800 } },
      { timestamp: '2024-03-10T08:00:09Z', level: 'debug', message: 'Iteration 5/5: processing "Elderberry"', node_id: 'foreach.1', context: { index: 4, item: 'Elderberry' } },
      { timestamp: '2024-03-10T08:00:09Z', level: 'info', message: 'Node execution started', node_id: 'process_item.1', context: { item: 'Elderberry' } },
      { timestamp: '2024-03-10T08:00:11Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Elderberry', execution_time: 2000 } },
      { timestamp: '2024-03-10T08:00:11Z', level: 'info', message: 'ForEach loop completed — all 5 items processed', node_id: 'foreach.1', context: { total_iterations: 5 } },
      { timestamp: '2024-03-10T08:00:12Z', level: 'info', message: 'Pipeline execution completed successfully', context: { total_execution_time: 12000 } }
    ]
  ],
  [
    'pipeline-foreach-002',
    [
      { timestamp: '2024-03-10T09:15:00Z', level: 'info', message: 'Pipeline execution started', context: { workflow_id: 'demo-foreach-loop' } },
      { timestamp: '2024-03-10T09:15:00Z', level: 'info', message: 'Node execution started', node_id: 'json_loader.1' },
      { timestamp: '2024-03-10T09:15:00Z', level: 'info', message: 'Node execution completed', node_id: 'json_loader.1', context: { items_loaded: 5, execution_time: 95 } },
      { timestamp: '2024-03-10T09:15:00Z', level: 'info', message: 'ForEach loop started', node_id: 'foreach.1', context: { total_items: 5 } },
      { timestamp: '2024-03-10T09:15:01Z', level: 'debug', message: 'Iteration 1/5: processing "Apple"', node_id: 'foreach.1', context: { index: 0, item: 'Apple' } },
      { timestamp: '2024-03-10T09:15:01Z', level: 'info', message: 'Node execution started', node_id: 'process_item.1', context: { item: 'Apple' } },
      { timestamp: '2024-03-10T09:15:03Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Apple', execution_time: 2000 } },
      { timestamp: '2024-03-10T09:15:03Z', level: 'debug', message: 'Iteration 2/5: processing "Banana"', node_id: 'foreach.1', context: { index: 1, item: 'Banana' } },
      { timestamp: '2024-03-10T09:15:03Z', level: 'info', message: 'Node execution started', node_id: 'process_item.1', context: { item: 'Banana' } },
      { timestamp: '2024-03-10T09:15:05Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Banana', execution_time: 1800 } },
      { timestamp: '2024-03-10T09:15:05Z', level: 'debug', message: 'Iteration 3/5: processing "Cherry"', node_id: 'foreach.1', context: { index: 2, item: 'Cherry' } },
      { timestamp: '2024-03-10T09:15:05Z', level: 'info', message: 'Node execution started', node_id: 'process_item.1', context: { item: 'Cherry' } },
      { timestamp: '2024-03-10T09:15:07Z', level: 'warning', message: 'Unexpected data shape for item "Cherry"', node_id: 'process_item.1', context: { item: 'Cherry' } },
      { timestamp: '2024-03-10T09:15:08Z', level: 'error', message: 'TypeError: Cannot read properties of undefined (processing item "Cherry")', node_id: 'process_item.1', context: { item: 'Cherry', attempt: 1 } },
      { timestamp: '2024-03-10T09:15:08Z', level: 'error', message: 'Loop aborted: child node failed on iteration 3 (continueOnError is false)', node_id: 'foreach.1' },
      { timestamp: '2024-03-10T09:15:08Z', level: 'error', message: 'Pipeline execution failed', context: { failed_node: 'process_item.1', iteration: 3 } }
    ]
  ],
  [
    'pipeline-foreach-003',
    [
      { timestamp: '2024-03-10T10:30:00Z', level: 'info', message: 'Pipeline execution started', context: { workflow_id: 'demo-foreach-loop' } },
      { timestamp: '2024-03-10T10:30:00Z', level: 'info', message: 'Node execution started', node_id: 'json_loader.1' },
      { timestamp: '2024-03-10T10:30:00Z', level: 'info', message: 'Node execution completed', node_id: 'json_loader.1', context: { items_loaded: 5, execution_time: 108 } },
      { timestamp: '2024-03-10T10:30:00Z', level: 'info', message: 'ForEach loop started', node_id: 'foreach.1', context: { total_items: 5 } },
      { timestamp: '2024-03-10T10:30:01Z', level: 'debug', message: 'Iteration 1/5: processing "Apple"', node_id: 'foreach.1', context: { index: 0, item: 'Apple' } },
      { timestamp: '2024-03-10T10:30:03Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Apple', execution_time: 1950 } },
      { timestamp: '2024-03-10T10:30:03Z', level: 'debug', message: 'Iteration 2/5: processing "Banana"', node_id: 'foreach.1', context: { index: 1, item: 'Banana' } },
      { timestamp: '2024-03-10T10:30:05Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Banana', execution_time: 2050 } },
      { timestamp: '2024-03-10T10:30:05Z', level: 'debug', message: 'Iteration 3/5: processing "Cherry"', node_id: 'foreach.1', context: { index: 2, item: 'Cherry' } },
      { timestamp: '2024-03-10T10:30:07Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Cherry', execution_time: 1900 } },
      { timestamp: '2024-03-10T10:30:07Z', level: 'debug', message: 'Iteration 4/5: processing "Date"', node_id: 'foreach.1', context: { index: 3, item: 'Date' } },
      { timestamp: '2024-03-10T10:30:07Z', level: 'info', message: 'Node execution started', node_id: 'process_item.1', context: { item: 'Date' } }
    ]
  ],
  [
    'pipeline-foreach-004',
    [
      { timestamp: '2024-03-10T11:45:00Z', level: 'info', message: 'Pipeline execution started', context: { workflow_id: 'demo-foreach-loop' } },
      { timestamp: '2024-03-10T11:45:00Z', level: 'info', message: 'Node execution started', node_id: 'json_loader.1' },
      { timestamp: '2024-03-10T11:45:00Z', level: 'info', message: 'Node execution completed', node_id: 'json_loader.1', context: { items_loaded: 5, execution_time: 115 } },
      { timestamp: '2024-03-10T11:45:00Z', level: 'info', message: 'ForEach loop started', node_id: 'foreach.1', context: { total_items: 5 } },
      { timestamp: '2024-03-10T11:45:01Z', level: 'debug', message: 'Iteration 1/5: processing "Apple"', node_id: 'foreach.1', context: { index: 0, item: 'Apple' } },
      { timestamp: '2024-03-10T11:45:03Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Apple', execution_time: 2000 } },
      { timestamp: '2024-03-10T11:45:03Z', level: 'debug', message: 'Iteration 2/5: processing "Banana"', node_id: 'foreach.1', context: { index: 1, item: 'Banana' } },
      { timestamp: '2024-03-10T11:45:05Z', level: 'info', message: 'Node execution completed', node_id: 'process_item.1', context: { item: 'Banana', execution_time: 1980 } },
      { timestamp: '2024-03-10T11:45:05Z', level: 'warning', message: 'Pipeline cancellation requested by user', context: { completed_iterations: 2, remaining: 3 } },
      { timestamp: '2024-03-10T11:45:05Z', level: 'info', message: 'Pipeline execution cancelled', context: { completed_iterations: 2 } }
    ]
  ],
  [
    'pipeline-003',
    [
      {
        timestamp: '2024-01-15T09:00:00Z',
        level: 'info',
        message: 'Pipeline execution started',
        context: { workflow_id: '550e8400-e29b-41d4-a716-446655440003' }
      },
      {
        timestamp: '2024-01-15T09:00:00Z',
        level: 'info',
        message: 'Chat input received',
        node_id: 'node-chat-input'
      },
      {
        timestamp: '2024-01-15T09:00:05Z',
        level: 'info',
        message: 'Search query initiated',
        node_id: 'node-search'
      },
      {
        timestamp: '2024-01-15T09:01:05Z',
        level: 'warning',
        message: 'Search API connection slow, retrying...',
        node_id: 'node-search',
        context: { attempt: 1 }
      },
      {
        timestamp: '2024-01-15T09:02:05Z',
        level: 'warning',
        message: 'Search API connection slow, retrying...',
        node_id: 'node-search',
        context: { attempt: 2 }
      },
      {
        timestamp: '2024-01-15T09:03:00Z',
        level: 'error',
        message: 'Connection timeout: Unable to reach Drupal Search API',
        node_id: 'node-search',
        context: { attempt: 3, max_attempts: 3 }
      },
      {
        timestamp: '2024-01-15T09:03:00Z',
        level: 'error',
        message: 'Pipeline execution failed',
        context: { failed_node: 'node-search' }
      }
    ]
  ]
]);

/**
 * Get all pipelines for a workflow
 */
export function getPipelinesForWorkflow(workflowId: string): Pipeline[] {
  return Array.from(mockPipelines.values()).filter((p) => p.workflow_id === workflowId);
}

/**
 * Get a pipeline by ID
 */
export function getPipelineById(id: string): Pipeline | undefined {
  return mockPipelines.get(id);
}

/**
 * Get logs for a pipeline
 */
export function getPipelineLogs(
  pipelineId: string,
  level?: 'debug' | 'info' | 'warning' | 'error'
): LogEntry[] {
  const logs = pipelineLogs.get(pipelineId) || [];
  if (level) {
    return logs.filter((log) => log.level === level);
  }
  return logs;
}

/**
 * Create a new pipeline execution
 */
export function createPipeline(workflowId: string): Pipeline {
  const id = `pipeline-${Date.now()}`;
  const now = new Date().toISOString();

  const pipeline: Pipeline = {
    id,
    workflow_id: workflowId,
    status: 'pending',
    created: now,
    updated: now,
    jobs: [],
    node_statuses: {},
    job_status_summary: {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    }
  };

  mockPipelines.set(id, pipeline);
  return pipeline;
}

/**
 * Update pipeline status
 */
export function updatePipelineStatus(id: string, status: PipelineStatus): Pipeline | undefined {
  const pipeline = mockPipelines.get(id);
  if (!pipeline) {
    return undefined;
  }

  pipeline.status = status;
  pipeline.updated = new Date().toISOString();
  return pipeline;
}
