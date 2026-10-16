/**
 * Network stub for the Doctor: `POST /workflow/{id}/diagnose` and
 * `POST /workflow/{id}/remedy`. Like the real server it reads the DRAFT it is
 * sent: the three diagnostics of `?workflow=doctor` (an unknown config key, a
 * missing required key, a node type that is not installed) are found on the
 * draft's own nodes, so a remedy that is applied (or undone) changes what the
 * next diagnose answers. Calls are recorded.
 */

import type { Page } from '@playwright/test';

interface DraftNode {
  id: string;
  data: { config?: Record<string, unknown>; metadata?: { node_type_id?: string } };
}
interface DraftEdge {
  id: string;
  source: string;
  target: string;
}
export interface Draft {
  nodes: DraftNode[];
  edges: DraftEdge[];
}

export interface DoctorStub {
  diagnoseDrafts: Draft[];
  remedyRequests: Array<{ code: string; target: string; remedy: string; params?: unknown }>;
  /** Answer the next remedy with 409 (the problem is gone). */
  conflictNext: boolean;
  /** Answer the next remedy with an operation the editor does not know. */
  unknownOpNext: boolean;
}

interface Remedy {
  id: string;
  label: string;
  description: string;
  destructive: boolean;
  params?: unknown;
}
interface Problem {
  id: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  node: string;
  remedies: Remedy[];
}

const removeNode: Remedy = {
  id: 'remove_node',
  label: 'Remove node',
  description: 'Remove this node and its connections.',
  destructive: true
};

export function problemsOf(draft: Draft): Problem[] {
  const problems: Problem[] = [];
  for (const node of draft.nodes) {
    const config = node.data.config ?? {};
    if (node.data.metadata?.node_type_id === 'ghost') {
      problems.push({
        id: `R1:${node.id}`,
        code: 'R1_PLUGIN_MISSING',
        severity: 'error',
        message: 'The node type "ghost" is not installed.',
        node: node.id,
        remedies: [
          {
            id: 'replace_node_type',
            label: 'Replace node type',
            description: 'Use an installed node type; the config is kept.',
            destructive: false,
            params: { choices: { text_output: 'Text Output', text_input: 'Text Input' } }
          },
          removeNode
        ]
      });
    }
    if (node.id === 'node-output' && !('format' in config)) {
      problems.push({
        id: `R6:${node.id}`,
        code: 'R6_CONFIG_REQUIRED',
        severity: 'error',
        message: '"format" is required.',
        node: node.id,
        remedies: [
          {
            id: 'reset_config',
            label: 'Reset',
            description: 'Set it to its default.',
            destructive: false
          },
          removeNode
        ]
      });
    }
    if ('legacy_flag' in config) {
      problems.push({
        id: `W:${node.id}`,
        code: 'W_CONFIG_UNKNOWN',
        severity: 'warning',
        message: 'Unknown key "legacy_flag".',
        node: node.id,
        remedies: [
          {
            id: 'remove_config_key',
            label: 'Remove',
            description: 'Remove the key.',
            destructive: false
          }
        ]
      });
    }
  }
  return problems;
}

function operationsFor(
  draft: Draft,
  problem: Problem,
  remedy: string,
  params: { node_type_id?: string } | undefined
): unknown[] {
  switch (remedy) {
    case 'remove_config_key':
      return [{ op: 'updateNodeConfig', nodeId: problem.node, patch: {}, unset: ['legacy_flag'] }];
    case 'reset_config':
      return [
        { op: 'updateNodeConfig', nodeId: problem.node, patch: { format: 'plain' }, unset: [] }
      ];
    case 'replace_node_type':
      return [
        {
          op: 'updateNodeData',
          nodeId: problem.node,
          // The server answers the whole `metadata` value, as the vocabulary says.
          patch: {
            metadata: {
              ...draft.nodes.find((n) => n.id === problem.node)?.data.metadata,
              node_type_id: params?.node_type_id
            }
          },
          unset: []
        }
      ];
    case 'remove_node':
      return [
        ...draft.edges
          .filter((e) => e.source === problem.node || e.target === problem.node)
          .map((e) => ({ op: 'removeEdge', edgeId: e.id })),
        { op: 'removeNode', nodeId: problem.node }
      ];
    default:
      return [];
  }
}

const json = (data: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data })
});

export async function stubDoctor(page: Page): Promise<DoctorStub> {
  const stub: DoctorStub = {
    diagnoseDrafts: [],
    remedyRequests: [],
    conflictNext: false,
    unknownOpNext: false
  };

  await page.route('**/api/flowdrop/workflow/*/diagnose', async (route) => {
    const draft = route.request().postDataJSON() as Draft;
    stub.diagnoseDrafts.push(draft);
    return route.fulfill(json({ problems: problemsOf(draft) }));
  });

  await page.route('**/api/flowdrop/workflow/*/remedy', async (route) => {
    const body = route.request().postDataJSON() as {
      draft: Draft;
      code: string;
      target: string;
      remedy: string;
      params?: unknown;
    };
    stub.remedyRequests.push({
      code: body.code,
      target: body.target,
      remedy: body.remedy,
      params: body.params
    });
    if (stub.conflictNext) {
      stub.conflictNext = false;
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Gone', error_code: 'CONFLICT' })
      });
    }
    if (stub.unknownOpNext) {
      stub.unknownOpNext = false;
      return route.fulfill(
        json({
          operations: [
            { op: 'updateNodeConfig', nodeId: 'node-input', patch: {}, unset: ['legacy_flag'] },
            { op: 'teleportNode', nodeId: 'node-input' }
          ]
        })
      );
    }
    const problem = problemsOf(body.draft).find((p) => p.id === body.target);
    if (!problem) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Gone', error_code: 'CONFLICT' })
      });
    }
    return route.fulfill(
      json({ operations: operationsFor(body.draft, problem, body.remedy, body.params) })
    );
  });

  return stub;
}
