/**
 * Command helpers shared by the executor and the command-family modules:
 * node and port lookup, the teaching error messages, and value parsing.
 *
 * @module commands/helpers
 */

import type { Branch, DynamicPort, WorkflowNode } from '../types/index.js';
import type { CommandContext, CommandErrorCode, CommandResultError } from './types.js';

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Convert an internal namespaced node ID to a DSL short ID.
 * "agentspec.llm_node.1" → "llm_node.1"
 * "llm_node.1" → "llm_node.1" (no namespace, unchanged)
 */
export function toShortId(internalId: string): string {
  // Node IDs are <namespace>.<typeId>.<number> or <typeId>.<number>
  // The namespace is the first segment if there are 3+ dot-separated parts
  // and the last segment is a number
  const parts = internalId.split('.');
  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      // Strip the first segment (namespace)
      return parts.slice(1).join('.');
    }
  }
  return internalId;
}

/**
 * Convert a namespaced type ID to a short type ID.
 * "agentspec.llm_node" → "llm_node"
 * "llm_node" → "llm_node" (no namespace, unchanged)
 */
export function toShortTypeId(typeId: string): string {
  const dotIndex = typeId.indexOf('.');
  if (dotIndex !== -1) {
    return typeId.substring(dotIndex + 1);
  }
  return typeId;
}

/**
 * Resolve a DSL short ID (e.g. "llm_node.1") to the actual workflow node.
 * Tries direct match first, then looks for a namespaced match.
 */
export function resolveNode(shortId: string, nodes: WorkflowNode[]): WorkflowNode | undefined {
  // Direct match
  const direct = nodes.find((n) => n.id === shortId);
  if (direct) return direct;

  // Namespaced match: node ID ends with ".<shortId>"
  return nodes.find((n) => n.id.endsWith(`.${shortId}`));
}

// ============================================================================
// Teaching errors (D7 of the browser-agent plan)
// ============================================================================
//
// A failed command names the valid alternatives, because for a browser agent
// the error text is the only channel there is: an unknown node lists the
// nodes, an unknown type points at list_types and names near misses, an
// unknown port lists the node's ports, an unknown config key lists the keys.
// Lists are capped so a large workflow cannot turn one error into a dump.

export const MAX_LISTED = 15;

export function listCapped(items: string[]): string {
  if (items.length === 0) return 'none';
  const shown = items.slice(0, MAX_LISTED);
  const rest = items.length - shown.length;
  return shown.join(', ') + (rest > 0 ? `, … and ${rest} more` : '');
}

/** Near misses for an unknown id: same prefix, or one contains the other. */
export function nearMisses(needle: string, haystack: string[]): string[] {
  const n = needle.toLowerCase();
  const stem = n.split(/[._-]/)[0];
  return haystack
    .filter((h) => {
      const l = h.toLowerCase();
      return l.includes(n) || n.includes(l) || (stem.length >= 3 && l.startsWith(stem));
    })
    .slice(0, 5);
}

export function nodeNotFoundMessage(nodeId: string, nodes: WorkflowNode[]): string {
  const ids = nodes.map((n) => toShortId(n.id));
  return nodes.length === 0
    ? `Node not found: ${nodeId}. The workflow has no nodes yet — add_node first.`
    : `Node not found: ${nodeId}. Nodes in this workflow: ${listCapped(ids)}.`;
}

export function typeNotFoundMessage(typeId: string, context: CommandContext): string {
  const ids = context.nodeTypes.map((m) => toShortTypeId(m.node_type_id));
  const near = nearMisses(typeId, ids);
  const hint =
    near.length > 0
      ? ` Did you mean: ${near.join(', ')}?`
      : ' Call list_types (or search_types) for the ids this editor accepts.';
  return `Unknown node type: ${typeId}.${hint}`;
}

/**
 * Every port id a node exposes in one direction, static and config-driven.
 * `branches: false` leaves out a gateway's branches: they are wired, but they
 * are not ports the interface or the Ports tab can take.
 */
export function portIds(
  node: WorkflowNode,
  direction: 'input' | 'output',
  { branches = true }: { branches?: boolean } = {}
): string[] {
  const metadata = node.data?.metadata;
  const config = node.data?.config;
  if (direction === 'output') {
    return [
      ...(metadata?.outputs ?? []).map((p) => p.id),
      ...(branches ? ((config?.branches as Branch[] | undefined) ?? []).map((b) => b.name) : []),
      ...((config?.dynamicOutputs as DynamicPort[] | undefined) ?? []).map((p) => p.name)
    ];
  }
  return [
    ...(metadata?.inputs ?? []).map((p) => p.id),
    ...((config?.dynamicInputs as DynamicPort[] | undefined) ?? []).map((p) => p.name)
  ];
}

export function portNotFoundMessage(
  node: WorkflowNode,
  portId: string,
  direction: 'input' | 'output',
  options: { branches?: boolean } = {}
): string {
  const short = toShortId(node.id);
  const wanted = portIds(node, direction, options);
  const other = portIds(node, direction === 'input' ? 'output' : 'input', options);
  const otherWord = direction === 'input' ? 'outputs' : 'inputs';
  return (
    `Port '${portId}' not found on node ${short}. ` +
    `Its ${direction}s: ${listCapped(wanted)}; its ${otherWord}: ${listCapped(other)}.`
  );
}

export function configKeys(node: WorkflowNode): string[] {
  const schemaKeys = Object.keys(node.data?.metadata?.configSchema?.properties ?? {});
  const valueKeys = Object.keys((node.data?.config as Record<string, unknown> | undefined) ?? {});
  return Array.from(new Set([...schemaKeys, ...valueKeys]));
}

/**
 * Parse a raw value string into the appropriate JS type.
 * Priority: quoted string (preserved) > JSON > number > boolean > raw string
 */
export function parseConfigValue(raw: string): unknown {
  // Double-quoted string — JSON-unescape so \n, \t, \\ etc. work
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }

  // Single-quoted string — strip quotes (no escape processing)
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1);
  }

  // Try JSON (arrays, objects, null)
  if (raw.startsWith('[') || raw.startsWith('{') || raw === 'null') {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through
    }
  }

  // Number
  if (raw !== '' && !isNaN(Number(raw))) {
    return Number(raw);
  }

  // Boolean
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  // Raw string
  return raw;
}

/** A failed command result. */
export function fail(code: CommandErrorCode, error: string): CommandResultError {
  return { ok: false, code, error };
}

/** The result of a command that found no workflow. */
export function noWorkflow(): CommandResultError {
  return fail('NO_WORKFLOW', 'No workflow loaded');
}

// ============================================================================
// Typed ids (the editor Console)
// ============================================================================

/**
 * Resolve a typed id against known ids; the one resolver every Console command
 * uses.
 *
 * An exact match wins. Otherwise a unique prefix is accepted, except where a
 * prefix is not safe: a purely numeric id (`12` is a prefix of `123`) and any
 * action that cannot be undone (`exact: true`) need the full id. A refusal for
 * that reason names the id the prefix would have meant.
 */
export function resolveIdPrefix(
  ids: string[],
  typed: string,
  noun: string,
  options: { exact?: boolean } = {}
): { ok: true; id: string } | { ok: false; error: string } {
  if (ids.includes(typed)) return { ok: true, id: typed };
  const matches = ids.filter((id) => id.startsWith(typed));
  if (matches.length === 0) return { ok: false, error: `No ${noun} matches "${typed}".` };
  if (options.exact || /^\d+$/.test(typed)) {
    const reason = options.exact
      ? 'This action needs the full id.'
      : 'A numeric id must be typed in full.';
    const shown = matches.slice(0, 5).join(', ');
    const more = matches.length > 5 ? ` and ${matches.length - 5} more` : '';
    return {
      ok: false,
      error: `No ${noun} has the id "${typed}". ${reason} (${matches.length === 1 ? 'did you mean' : 'candidates:'} ${shown}${more})`
    };
  }
  if (matches.length === 1) return { ok: true, id: matches[0] };
  const shown = matches.slice(0, 5).join(', ');
  const more = matches.length > 5 ? ` and ${matches.length - 5} more` : '';
  return {
    ok: false,
    error: `"${typed}" matches ${matches.length} ${noun}s (${shown}${more}). Type more of the id.`
  };
}

/**
 * The error for a port the interface or ports commands cannot find. A
 * gateway's branch is told apart: it exists and can be wired, but it is
 * always drawn, so it cannot be published, bound, hidden or moved, and the
 * list of ports to try never offers it.
 */
export function configurablePortNotFound(
  node: WorkflowNode,
  portId: string,
  direction: 'input' | 'output'
): CommandResultError {
  const isBranch = ((node.data?.config?.branches as Branch[] | undefined) ?? []).some(
    (branch) => branch.name === portId
  );
  return isBranch
    ? fail(
        'INVALID_ARGUMENT',
        `'${portId}' is a branch of ${toShortId(node.id)}. Branches are always drawn in authored order, so the interface, the Ports tab and chat replies do not take them.`
      )
    : fail('PORT_NOT_FOUND', portNotFoundMessage(node, portId, direction, { branches: false }));
}
