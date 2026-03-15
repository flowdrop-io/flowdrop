/**
 * Minimal MSW handlers for documentation demos.
 * Provides just enough API mocking for the editor to function.
 */

import { http, HttpResponse } from 'msw';
import { demoWorkflow, demoNodes } from './data';

const API_BASE = '/api/flowdrop';

// In-memory workflow store (starts with the demo workflow)
let currentWorkflow = structuredClone(demoWorkflow);

export const handlers = [
  // Health check
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: 'healthy', version: '1.0.0' });
  }),

  // Runtime config
  http.get('/api/config', () => {
    return HttpResponse.json({
      apiBaseUrl: '/api/flowdrop',
      theme: 'auto',
      timeout: 30000,
      authType: 'none',
      version: '1.0.0',
      environment: 'demo'
    });
  }),

  // Port configuration
  http.get(`${API_BASE}/port-config`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        dataTypes: {
          string: { color: '#22c55e', label: 'String' },
          number: { color: '#3b82f6', label: 'Number' },
          boolean: { color: '#f59e0b', label: 'Boolean' },
          array: { color: '#8b5cf6', label: 'Array' },
          json: { color: '#06b6d4', label: 'JSON' },
          mixed: { color: '#6b7280', label: 'Mixed' },
          tool: { color: '#ec4899', label: 'Tool' },
          trigger: { color: '#f97316', label: 'Trigger' }
        },
        compatibility: {
          string: ['string', 'mixed'],
          number: ['number', 'mixed'],
          boolean: ['boolean', 'mixed'],
          array: ['array', 'mixed'],
          json: ['json', 'mixed', 'string'],
          mixed: ['string', 'number', 'boolean', 'array', 'json', 'mixed'],
          tool: ['tool'],
          trigger: ['trigger']
        }
      },
      message: 'Port configuration loaded successfully'
    });
  }),

  // Categories
  http.get(`${API_BASE}/categories`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'ai', name: 'AI & ML', icon: 'mdi:brain', color: '#9C27B0' },
        { id: 'agents', name: 'Agents', icon: 'mdi:account-cog', color: '#06b6d4' },
        { id: 'inputs', name: 'Inputs', icon: 'mdi:import', color: '#22c55e' },
        { id: 'outputs', name: 'Outputs', icon: 'mdi:export', color: '#ef4444' },
        { id: 'processing', name: 'Processing', icon: 'mdi:cog', color: '#3b82f6' },
        { id: 'content', name: 'Content', icon: 'mdi:file-document', color: '#FF9800' },
        { id: 'logic', name: 'Logic', icon: 'mdi:source-branch', color: '#f59e0b' },
        { id: 'control', name: 'Control', icon: 'mdi:stop-circle', color: '#dc2626' },
        { id: 'helpers', name: 'Helpers', icon: 'mdi:wrench', color: '#fbbf24' }
      ],
      message: 'Categories loaded successfully'
    });
  }),

  // Get all nodes
  http.get(`${API_BASE}/nodes`, () => {
    return HttpResponse.json(
      {
        success: true,
        data: demoNodes,
        message: `Found ${demoNodes.length} node types`
      },
      {
        headers: {
          'X-Total-Count': String(demoNodes.length),
          'Content-Type': 'application/json'
        }
      }
    );
  }),

  // Get node by ID
  http.get(`${API_BASE}/nodes/:id`, ({ params }) => {
    const node = demoNodes.find((n) => n.id === params.id);
    if (!node) {
      return HttpResponse.json({ success: false, error: 'Node type not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true, data: node });
  }),

  // Get all workflows
  http.get(`${API_BASE}/workflows`, () => {
    return HttpResponse.json(
      {
        success: true,
        data: [currentWorkflow],
        message: 'Found 1 workflows'
      },
      {
        headers: { 'X-Total-Count': '1', 'Content-Type': 'application/json' }
      }
    );
  }),

  // Get workflow by ID
  http.get(`${API_BASE}/workflows/:id`, () => {
    return HttpResponse.json({
      success: true,
      data: currentWorkflow,
      message: 'Workflow retrieved successfully'
    });
  }),

  // Create workflow
  http.post(`${API_BASE}/workflows`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    currentWorkflow = {
      ...currentWorkflow,
      name: (body.name as string) || currentWorkflow.name,
      description: (body.description as string) || currentWorkflow.description,
      nodes: (body.nodes as typeof currentWorkflow.nodes) || currentWorkflow.nodes,
      edges: (body.edges as typeof currentWorkflow.edges) || currentWorkflow.edges
    };
    return HttpResponse.json(
      { success: true, data: currentWorkflow, message: 'Workflow created' },
      { status: 201 }
    );
  }),

  // Update workflow
  http.put(`${API_BASE}/workflows/:id`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    currentWorkflow = {
      ...currentWorkflow,
      ...(body.name && { name: body.name as string }),
      ...(body.description !== undefined && { description: body.description as string }),
      ...(body.nodes && { nodes: body.nodes as typeof currentWorkflow.nodes }),
      ...(body.edges && { edges: body.edges as typeof currentWorkflow.edges }),
      metadata: { ...currentWorkflow.metadata, updatedAt: new Date().toISOString() }
    };
    return HttpResponse.json({ success: true, data: currentWorkflow, message: 'Workflow updated' });
  }),

  // Validate workflow
  http.post(`${API_BASE}/workflows/validate`, () => {
    return HttpResponse.json({
      success: true,
      data: { valid: true, errors: [], warnings: [], suggestions: [] }
    });
  }),

  // Dynamic schema (return empty)
  http.post(`${API_BASE}/dynamic-schema`, () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Variable suggestions (return empty)
  http.get(`${API_BASE}/variable-suggestions`, () => {
    return HttpResponse.json({ success: true, data: [] });
  })
];
