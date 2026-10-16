/**
 * Doctor types: the problems a backend finds in the editor's draft and the
 * remedies it offers for them.
 *
 * `code` is an opaque string. The editor badges by `severity`, shows `message`
 * verbatim and offers exactly the `remedies` it is given; it hard-codes no
 * diagnostic.
 *
 * @module types/doctor
 */

import type { Workflow, WorkflowEdge, WorkflowNode } from './index.js';

export type DoctorSeverity = 'error' | 'warning' | 'info';

/** One fix the server offers for a problem. */
export interface DoctorRemedy {
  id: string;
  label: string;
  description?: string;
  /** The fix removes something: the editor asks first. */
  destructive: boolean;
  /**
   * What the remedy needs from the person. Today `choices` (value => label)
   * for a remedy that must be told which one (`replace_node_type`); the chosen
   * value goes back as `params[<name>]`.
   */
  params?: { choices?: Record<string, string> } & Record<string, unknown>;
}

/** One finding on the draft. */
export interface DoctorProblem {
  /** Stable for the same finding on the same draft; the `target` of a remedy. */
  id: string;
  code: string;
  severity: DoctorSeverity;
  message: string;
  /** The node, port (of that node) and edge the problem is about, when it is about one. */
  node?: string;
  port?: string;
  edge?: string;
  remedies: DoctorRemedy[];
}

/** The operation vocabulary a remedy answers with. Applied in order. */
export type DoctorOperation =
  | { op: 'removeEdge'; edgeId: string }
  | { op: 'removeNode'; nodeId: string }
  | { op: 'addNode'; node: WorkflowNode }
  | { op: 'updateNodeConfig'; nodeId: string; patch: Record<string, unknown>; unset: string[] }
  | { op: 'updateNodeData'; nodeId: string; patch: Record<string, unknown>; unset: string[] }
  | { op: 'updateNode'; nodeId: string; patch: Record<string, unknown>; unset: string[] }
  | { op: 'updateEdge'; edgeId: string; patch: Record<string, unknown>; unset: string[] }
  | { op: 'addEdge'; edge: WorkflowEdge }
  | { op: 'setInterface'; interface: NonNullable<Workflow['interface']> }
  | { op: 'setWorkflowPayload'; key: string; value: unknown };
