/**
 * MSW handlers for Workflows API endpoints
 * Implements CRUD operations for workflows
 */

import { http, HttpResponse } from 'msw';
import {
  getAllWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow
} from '../data/index.js';
import type {
  PlaygroundChatBinding,
  Workflow,
  WorkflowResponse,
  WorkflowsResponse
} from '../../lib/types/index.js';
import { normalizePlaygroundChat, resolvePlaygroundChat } from '../../lib/utils/playgroundChat.js';

/** Base API path for flowdrop endpoints */
const API_BASE = '/api/flowdrop';

/**
 * The workflow as the server sends it: with a `playground` key whose `resolved`
 * binding and `source` are computed from the stored `chat` and the interface.
 *
 * Only for mock workflows that carry a `playground` key (they stand for a
 * FlowDrop 2.7.0 backend); the others are sent as they are, so the demo
 * Playground keeps its pre-settings (`legacy`) behaviour for them.
 */
export function withPlaygroundView(workflow: Workflow): Workflow {
  if (workflow.playground === undefined) return workflow;
  const chat = workflow.playground.chat ?? null;
  const stored: Workflow = { ...workflow, playground: { chat } };
  const resolved = resolvePlaygroundChat(stored);
  return {
    ...workflow,
    playground: {
      chat,
      resolved: resolved?.binding,
      source: resolved?.source ?? 'none'
    }
  };
}

/**
 * Reads `playground.chat` from a save request. `undefined` = the key is absent
 * (leave the stored settings alone), `null` = clear, else the normalised binding.
 */
function chatFromSaveBody(body: Record<string, unknown>): PlaygroundChatBinding | null | undefined {
  const playground = body.playground;
  if (typeof playground !== 'object' || playground === null || !('chat' in playground)) {
    return undefined;
  }
  const chat = (playground as { chat: unknown }).chat;
  return chat === null || chat === undefined ? null : normalizePlaygroundChat(chat);
}

/** Names in the binding that the workflow's interface does not declare. */
function chatProblems(chat: PlaygroundChatBinding, workflow: Workflow): string[] {
  const inputIds = new Set((workflow.interface?.inputs ?? []).map((entry) => entry.id));
  const named: [string, string | null][] = [
    ['message', chat.message],
    ['history', chat.history?.input ?? null],
    ['session_id', chat.session_id],
    ['message_id', chat.message_id]
  ];
  return named
    .filter(([, id]) => id !== null && !inputIds.has(id))
    .map(([field, id]) => `${field}: the workflow has no interface input "${id}"`);
}

/**
 * GET /api/flowdrop/workflows
 * Retrieve all workflows with optional filtering and pagination
 */
export const getWorkflowsHandler = http.get(`${API_BASE}/workflows`, ({ request }) => {
  const url = new URL(request.url);

  // Parse query parameters
  const search = url.searchParams.get('search');
  const tags = url.searchParams.get('tags');
  let limit = parseInt(url.searchParams.get('limit') || '50');
  let offset = parseInt(url.searchParams.get('offset') || '0');
  const sort = url.searchParams.get('sort') || 'updated_at';
  const order = url.searchParams.get('order') || 'desc';

  // Validate limit and offset
  if (isNaN(limit) || limit < 1 || limit > 100) {
    limit = 50;
  }
  if (isNaN(offset) || offset < 0) {
    offset = 0;
  }

  let workflows = getAllWorkflows();

  // Filter by search query
  if (search && search.trim()) {
    const searchLower = search.toLowerCase().slice(0, 100);
    workflows = workflows.filter(
      (workflow) =>
        workflow.name.toLowerCase().includes(searchLower) ||
        (workflow.description && workflow.description.toLowerCase().includes(searchLower))
    );
  }

  // Filter by tags
  if (tags) {
    const tagList = tags.split(',').map((t) => t.trim().toLowerCase());
    workflows = workflows.filter((workflow) =>
      workflow.metadata?.tags?.some((tag) => tagList.includes(tag.toLowerCase()))
    );
  }

  // Sort workflows
  workflows = [...workflows].sort((a, b) => {
    let valueA: string | undefined;
    let valueB: string | undefined;

    switch (sort) {
      case 'created_at':
        valueA = a.metadata?.createdAt;
        valueB = b.metadata?.createdAt;
        break;
      case 'name':
        valueA = a.name;
        valueB = b.name;
        break;
      case 'updated_at':
      default:
        valueA = a.metadata?.updatedAt;
        valueB = b.metadata?.updatedAt;
        break;
    }

    const comparison = (valueA || '').localeCompare(valueB || '');
    return order === 'desc' ? -comparison : comparison;
  });

  // Apply pagination
  const totalCount = workflows.length;
  const paginatedWorkflows = workflows.slice(offset, offset + limit);

  const response: WorkflowsResponse = {
    success: true,
    data: paginatedWorkflows,
    message: `Found ${paginatedWorkflows.length} workflows`
  };

  return HttpResponse.json(response, {
    headers: {
      'X-Total-Count': totalCount.toString(),
      'X-Page-Size': limit.toString(),
      'X-Page-Offset': offset.toString(),
      'Content-Type': 'application/json'
    }
  });
});

/**
 * POST /api/flowdrop/workflows
 * Create a new workflow
 */
export const createWorkflowHandler = http.post(`${API_BASE}/workflows`, async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return HttpResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: { field: 'name', message: 'Name is required' }
        },
        { status: 400 }
      );
    }

    // Create the workflow
    const workflow = createWorkflow({
      name: body.name as string,
      description: body.description as string | undefined,
      nodes: body.nodes as Workflow['nodes'] | undefined,
      edges: body.edges as Workflow['edges'] | undefined,
      tags: body.tags as string[] | undefined
    });

    const chat = chatFromSaveBody(body);
    const created =
      chat !== undefined
        ? (updateWorkflow(workflow.id, { playground: { chat } }) ?? workflow)
        : workflow;

    const response: WorkflowResponse = {
      success: true,
      data: withPlaygroundView(created),
      message: 'Workflow created successfully'
    };

    return HttpResponse.json(response, { status: 201 });
  } catch {
    return HttpResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        code: 'BAD_REQUEST'
      },
      { status: 400 }
    );
  }
});

/**
 * GET /api/flowdrop/workflows/:id
 * Retrieve a specific workflow by ID
 */
export const getWorkflowByIdHandler = http.get(`${API_BASE}/workflows/:id`, ({ params }) => {
  const { id } = params;
  const workflowId = Array.isArray(id) ? id[0] : id;

  // Validate ID is not empty
  if (!workflowId || workflowId.trim() === '') {
    return HttpResponse.json(
      {
        success: false,
        error: 'Workflow ID is required',
        code: 'BAD_REQUEST'
      },
      { status: 400 }
    );
  }

  const workflow = getWorkflowById(workflowId);

  if (!workflow) {
    return HttpResponse.json(
      {
        success: false,
        error: 'Workflow not found',
        code: 'NOT_FOUND'
      },
      { status: 404 }
    );
  }

  const response: WorkflowResponse = {
    success: true,
    data: withPlaygroundView(workflow),
    message: `Workflow "${workflow.name}" retrieved successfully`
  };

  return HttpResponse.json(response);
});

/**
 * PUT /api/flowdrop/workflows/:id
 * Update an existing workflow
 */
export const updateWorkflowHandler = http.put(
  `${API_BASE}/workflows/:id`,
  async ({ params, request }) => {
    const { id } = params;
    const workflowId = Array.isArray(id) ? id[0] : id;

    // Validate ID is not empty
    if (!workflowId || workflowId.trim() === '') {
      return HttpResponse.json(
        {
          success: false,
          error: 'Workflow ID is required',
          code: 'BAD_REQUEST'
        },
        { status: 400 }
      );
    }

    try {
      const body = (await request.json()) as Record<string, unknown>;

      const chat = chatFromSaveBody(body);
      const existing = getWorkflowById(workflowId);
      if (chat && existing) {
        const problems = chatProblems(chat, existing);
        if (problems.length > 0) {
          return HttpResponse.json(
            {
              success: false,
              error: 'Invalid Playground settings',
              code: 'VALIDATION_ERROR',
              problems
            },
            { status: 422 }
          );
        }
      }
      const updated = updateWorkflow(workflowId, {
        ...(chat !== undefined ? { playground: { chat } } : {}),
        name: body.name as string | undefined,
        description: body.description as string | undefined,
        nodes: body.nodes as Workflow['nodes'] | undefined,
        edges: body.edges as Workflow['edges'] | undefined,
        metadata: body.metadata as Workflow['metadata'] | undefined
      });

      if (!updated) {
        return HttpResponse.json(
          {
            success: false,
            error: 'Workflow not found',
            code: 'NOT_FOUND'
          },
          { status: 404 }
        );
      }

      const response: WorkflowResponse = {
        success: true,
        data: withPlaygroundView(updated),
        message: 'Workflow updated successfully'
      };

      return HttpResponse.json(response);
    } catch {
      return HttpResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          code: 'BAD_REQUEST'
        },
        { status: 400 }
      );
    }
  }
);

/**
 * DELETE /api/flowdrop/workflows/:id
 * Delete a workflow by ID
 */
export const deleteWorkflowHandler = http.delete(`${API_BASE}/workflows/:id`, ({ params }) => {
  const { id } = params;
  const workflowId = Array.isArray(id) ? id[0] : id;

  // Validate ID is not empty
  if (!workflowId || workflowId.trim() === '') {
    return HttpResponse.json(
      {
        success: false,
        error: 'Workflow ID is required',
        code: 'BAD_REQUEST'
      },
      { status: 400 }
    );
  }

  const deleted = deleteWorkflow(workflowId);

  if (!deleted) {
    return HttpResponse.json(
      {
        success: false,
        error: 'Workflow not found',
        code: 'NOT_FOUND'
      },
      { status: 404 }
    );
  }

  return HttpResponse.json({
    success: true,
    message: 'Workflow deleted successfully'
  });
});

/**
 * POST /api/flowdrop/workflows/validate
 * Validate a workflow structure
 */
export const validateWorkflowHandler = http.post(
  `${API_BASE}/workflows/validate`,
  async ({ request }) => {
    try {
      const workflow = (await request.json()) as Workflow;

      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      // Validate basic structure
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        errors.push('Workflow must have a nodes array');
      }
      if (!workflow.edges || !Array.isArray(workflow.edges)) {
        errors.push('Workflow must have an edges array');
      }

      // Validate nodes
      if (workflow.nodes) {
        const nodeIds = new Set<string>();
        for (const node of workflow.nodes) {
          if (!node.id) {
            errors.push('All nodes must have an id');
          } else if (nodeIds.has(node.id)) {
            errors.push(`Duplicate node ID: ${node.id}`);
          } else {
            nodeIds.add(node.id);
          }

          if (!node.type) {
            errors.push(`Node ${node.id || 'unknown'} must have a type`);
          }
          if (!node.position) {
            warnings.push(`Node ${node.id || 'unknown'} is missing position`);
          }
        }

        // Validate edges reference valid nodes
        if (workflow.edges) {
          for (const edge of workflow.edges) {
            if (!nodeIds.has(edge.source)) {
              errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
            }
            if (!nodeIds.has(edge.target)) {
              errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
            }
          }
        }

        // Check for orphaned nodes (no connections)
        if (workflow.edges && workflow.nodes.length > 1) {
          const connectedNodes = new Set<string>();
          for (const edge of workflow.edges) {
            connectedNodes.add(edge.source);
            connectedNodes.add(edge.target);
          }
          for (const node of workflow.nodes) {
            if (!connectedNodes.has(node.id)) {
              warnings.push(`Node "${node.data?.label || node.id}" has no connections`);
            }
          }
        }

        // Suggestions
        if (workflow.nodes.length === 0) {
          suggestions.push('Add nodes to your workflow to get started');
        }
        if (workflow.nodes.length > 0 && workflow.edges?.length === 0) {
          suggestions.push('Connect your nodes with edges to create a workflow');
        }
      }

      return HttpResponse.json({
        success: true,
        data: {
          valid: errors.length === 0,
          errors,
          warnings,
          suggestions
        }
      });
    } catch {
      return HttpResponse.json(
        {
          success: false,
          error: 'Invalid workflow data',
          code: 'BAD_REQUEST'
        },
        { status: 400 }
      );
    }
  }
);

/**
 * GET /api/flowdrop/workflows/:id/export
 * Export a workflow in JSON or YAML format
 */
export const exportWorkflowHandler = http.get(
  `${API_BASE}/workflows/:id/export`,
  ({ params, request }) => {
    const { id } = params;
    const workflowId = Array.isArray(id) ? id[0] : id;
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';

    const workflow = getWorkflowById(workflowId);

    if (!workflow) {
      return HttpResponse.json(
        {
          success: false,
          error: 'Workflow not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    if (format === 'yaml') {
      // Simple YAML conversion (in real implementation, use a YAML library)
      const yamlContent = `# FlowDrop Workflow Export
id: ${workflow.id}
name: ${workflow.name}
description: ${workflow.description || ''}
metadata:
  schemaVersion: ${workflow.metadata?.schemaVersion ?? ''}
  createdAt: ${workflow.metadata?.createdAt ?? ''}
  updatedAt: ${workflow.metadata?.updatedAt ?? ''}
  author: ${workflow.metadata?.author || ''}
nodes: ${JSON.stringify(workflow.nodes, null, 2)}
edges: ${JSON.stringify(workflow.edges, null, 2)}
`;
      return new HttpResponse(yamlContent, {
        headers: {
          'Content-Type': 'application/x-yaml',
          'Content-Disposition': `attachment; filename="${workflow.name}.yaml"`
        }
      });
    }

    // Default JSON export
    return HttpResponse.json(workflow, {
      headers: {
        'Content-Disposition': `attachment; filename="${workflow.name}.json"`
      }
    });
  }
);

/**
 * POST /api/flowdrop/workflows/import
 * Import a workflow from JSON
 */
export const importWorkflowHandler = http.post(
  `${API_BASE}/workflows/import`,
  async ({ request }) => {
    try {
      const importData = (await request.json()) as Workflow;

      // Create a new workflow with the imported data
      const workflow = createWorkflow({
        name: importData.name || 'Imported Workflow',
        description: importData.description,
        nodes: importData.nodes,
        edges: importData.edges,
        tags: importData.metadata?.tags
      });

      const response: WorkflowResponse = {
        success: true,
        data: workflow,
        message: 'Workflow imported successfully'
      };

      return HttpResponse.json(response, { status: 201 });
    } catch {
      return HttpResponse.json(
        {
          success: false,
          error: 'Invalid workflow data',
          code: 'BAD_REQUEST'
        },
        { status: 400 }
      );
    }
  }
);

/**
 * Export all workflow handlers
 */
export const workflowHandlers = [
  getWorkflowsHandler,
  createWorkflowHandler,
  getWorkflowByIdHandler,
  updateWorkflowHandler,
  deleteWorkflowHandler,
  validateWorkflowHandler,
  exportWorkflowHandler,
  importWorkflowHandler
];
