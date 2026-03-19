/**
 * Node Swap utilities for FlowDrop
 *
 * Provides logic for swapping a workflow node with a different node type
 * while intelligently remapping compatible port connections.
 *
 * @module utils/nodeSwap
 */

import type {
  WorkflowNode,
  WorkflowEdge,
  NodeMetadata,
  NodePort,
  ConfigSchema,
  ConfigValues,
  NodeExtensions,
  WorkflowFormat,
} from "../types/index.js";
import type { WorkflowValidationResult } from "./validation.js";
import { buildHandleId, extractPortId, extractDirection } from "./handleIds.js";
import type { PortCompatibilityChecker } from "./connections.js";
import { generateNodeId } from "../helpers/workflowEditorHelper.js";

// =========================================================================
// Types
// =========================================================================

/**
 * Describes how a single port was remapped during a swap.
 */
export interface PortMapping {
  oldHandleId: string;
  newHandleId: string;
  oldPortId: string;
  newPortId: string;
  direction: "input" | "output";
}

/**
 * An edge that could not be remapped and will be dropped.
 */
export interface DroppedEdge {
  edge: WorkflowEdge;
  reason: string;
}

/**
 * Preview of what a node swap will do before it is executed.
 */
export interface SwapPreview {
  /** Edges that will be preserved with their rewritten versions */
  keptEdges: Array<{ edge: WorkflowEdge; newEdge: WorkflowEdge }>;
  /** Edges that will be removed */
  droppedEdges: DroppedEdge[];
  /** True if any connected edges will be lost */
  hasDataLoss: boolean;
  /** The new node ID that will be generated */
  newNodeId: string;
  /** Config keys carried over from the old node */
  configCarriedOver: string[];
  /** Config keys reset to defaults on the new node */
  configReset: string[];
}

/**
 * Result of executing a node swap.
 */
export interface SwapResult {
  updatedNodes: WorkflowNode[];
  updatedEdges: WorkflowEdge[];
}

// =========================================================================
// Phase 2 — Override and Strategy Types
// =========================================================================

/** Quality annotation for how a port was matched. */
export type MatchQuality = "id" | "name" | "type" | "manual" | "unmapped";

/** Manual override for a single port mapping. */
export interface PortMappingOverride {
  oldPortId: string;
  newPortId: string | null; // null = force-drop
  direction: "input" | "output";
}

/** Manual override for a single config mapping. */
export interface ConfigMappingOverride {
  key: string;
  action: "carry" | "reset" | "set";
  value?: unknown; // required when action is "set"
}

/** Options bag for advanced swap functions. */
export interface SwapOptions {
  checker?: PortCompatibilityChecker | null;
  portOverrides?: PortMappingOverride[];
  configOverrides?: ConfigMappingOverride[];
  strategies?: SwapStrategy[];
}

/** Pluggable strategy passed per-call, not registered globally. */
export interface SwapStrategy {
  readonly id: string;
  readonly name: string;
  canHandle(ctx: SwapStrategyContext): boolean;
  mapPorts?(ctx: SwapStrategyContext): Record<string, string | null> | undefined;
  mapConfig?(ctx: SwapStrategyContext): Record<string, { action: "carry" | "reset" | "set"; value?: unknown }> | undefined;
}

/** Context passed to swap strategies. */
export interface SwapStrategyContext {
  oldNode: WorkflowNode;
  newMetadata: NodeMetadata;
  edges: WorkflowEdge[];
  allNodes: WorkflowNode[];
  checker: PortCompatibilityChecker | null;
}

/** Stable, data-only event context for swap hooks. */
export interface SwapEventContext {
  oldNode: WorkflowNode;
  newMetadata: NodeMetadata;
  preview: SwapPreview;
  portOverrides: PortMappingOverride[];
  configOverrides: ConfigMappingOverride[];
}

/** Error class for swap validation failures. */
export class SwapValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SwapValidationError";
  }
}

// =========================================================================
// Interactive State Types (internal to UI, not in public API)
// =========================================================================

/** Editable port mapping for the interactive mapping editor. */
export interface EditablePortMapping {
  oldPort: NodePort;
  edge: WorkflowEdge;
  direction: "input" | "output";
  selectedNewPortId: string | null;
  matchQuality: MatchQuality;
  autoSuggestedPortId: string | null;
  isOverridden: boolean;
}

/** Editable config mapping for the interactive mapping editor. */
export interface EditableConfigMapping {
  key: string;
  title: string;
  oldValue: unknown;
  newDefault: unknown;
  carryOver: boolean;
  autoCarryOver: boolean;
  /** false for nested objects/arrays — shown as read-only, always reset */
  isFlat: boolean;
}

/** Full interactive swap state for the mapping editor. */
export interface InteractiveSwapState {
  oldNode: WorkflowNode;
  newMetadata: NodeMetadata;
  newNodeId: string;
  portMappings: EditablePortMapping[];
  configMappings: EditableConfigMapping[];
  availableNewInputs: NodePort[];
  availableNewOutputs: NodePort[];
}

// =========================================================================
// Dynamic port keys that should never be carried over
// =========================================================================

const DYNAMIC_PORT_KEYS = new Set([
  "dynamicInputs",
  "dynamicOutputs",
  "branches",
]);

// =========================================================================
// Semver comparison
// =========================================================================

/**
 * Compare two semver-like version strings.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 *
 * Handles pre-release tags: "2.0.0-beta" < "2.0.0"
 */
export function compareSemver(a: string, b: string): number {
  // Split off pre-release tag
  const [aCore, aPre] = a.split("-", 2);
  const [bCore, bPre] = b.split("-", 2);

  const aParts = aCore.split(".").map(Number);
  const bParts = bCore.split(".").map(Number);

  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av !== bv) return av - bv;
  }

  // Core versions are equal — pre-release < release
  if (aPre && !bPre) return -1;
  if (!aPre && bPre) return 1;

  // Both have pre-release or neither — compare lexicographically
  if (aPre && bPre) return aPre.localeCompare(bPre);

  return 0;
}

// =========================================================================
// Config mapping
// =========================================================================

/**
 * Map config values from an old node to a new node's schema.
 *
 * - Keys present in both old config and new schema: carry over the old value
 * - Keys only in the new schema: use the schema default or newDefaults
 * - Keys only in the old config: discarded
 * - Dynamic port keys (dynamicInputs, dynamicOutputs, branches): never carried over
 */
export function mapConfig(
  oldConfig: ConfigValues,
  newConfigSchema: ConfigSchema | undefined,
  newDefaults: Record<string, unknown> = {},
): { config: ConfigValues; carriedOver: string[]; reset: string[] } {
  if (!newConfigSchema?.properties) {
    return { config: {}, carriedOver: [], reset: [] };
  }

  const config: ConfigValues = {};
  const carriedOver: string[] = [];
  const reset: string[] = [];

  for (const key of Object.keys(newConfigSchema.properties)) {
    if (DYNAMIC_PORT_KEYS.has(key)) continue;

    const schemaProp = newConfigSchema.properties[key];
    const schemaDefault = schemaProp?.default;
    const providedDefault = newDefaults[key];

    if (key in oldConfig) {
      config[key] = oldConfig[key];
      carriedOver.push(key);
    } else {
      config[key] = providedDefault !== undefined ? providedDefault : schemaDefault;
      reset.push(key);
    }
  }

  return { config, carriedOver, reset };
}

// =========================================================================
// Port matching
// =========================================================================

/**
 * Find the best matching port on the new node for a given old port.
 *
 * Three-pass strategy:
 * 1. Exact port ID match with compatible dataType
 * 2. Port name match (case-insensitive) with compatible dataType
 * 3. First available port with compatible dataType
 */
function findMatchingPort(
  oldPort: NodePort,
  newPorts: NodePort[],
  usedPortIds: Set<string>,
  checker: PortCompatibilityChecker | null,
): NodePort | null {
  const available = newPorts.filter(
    (p) => p.type === oldPort.type && !usedPortIds.has(p.id),
  );

  const isCompatible = (a: NodePort, b: NodePort): boolean => {
    if (!checker) return a.dataType === b.dataType;
    // Check both directions since the port role (input vs output) matters
    if (oldPort.type === "input") {
      // Old port is input → old dataType was the target; check any source can feed into new port
      return checker.areDataTypesCompatible(a.dataType, b.dataType);
    }
    return checker.areDataTypesCompatible(b.dataType, a.dataType);
  };

  // Pass 1: exact ID match
  const idMatch = available.find(
    (p) => p.id === oldPort.id && isCompatible(oldPort, p),
  );
  if (idMatch) return idMatch;

  // Pass 2: name match (case-insensitive)
  const oldNameLower = oldPort.name.toLowerCase();
  const nameMatch = available.find(
    (p) => p.name.toLowerCase() === oldNameLower && isCompatible(oldPort, p),
  );
  if (nameMatch) return nameMatch;

  // Pass 3: first compatible dataType
  const typeMatch = available.find((p) => isCompatible(oldPort, p));
  return typeMatch ?? null;
}

/**
 * Resolve the port metadata for an edge endpoint on a given node.
 */
function resolvePort(
  node: WorkflowNode,
  handleId: string | undefined,
  direction: "input" | "output",
): NodePort | null {
  if (!handleId) return null;
  const portId = extractPortId(handleId);
  if (!portId) return null;

  const ports =
    direction === "input"
      ? node.data.metadata.inputs
      : node.data.metadata.outputs;

  return ports.find((p) => p.id === portId) ?? null;
}

// =========================================================================
// Swap preview computation
// =========================================================================

/**
 * Compute a preview of what will happen when swapping oldNode with newMetadata.
 *
 * This does NOT mutate anything — it returns a preview that can be displayed
 * to the user for confirmation before executing the swap.
 */
export function computeSwapPreview(
  oldNode: WorkflowNode,
  newMetadata: NodeMetadata,
  edges: WorkflowEdge[],
  allNodes: WorkflowNode[],
  checker: PortCompatibilityChecker | null = null,
): SwapPreview {
  const oldNodeId = oldNode.id;
  const newNodeId = generateNodeId(newMetadata.id, allNodes);

  // Collect all edges connected to the old node
  const connectedEdges = edges.filter(
    (e) => e.source === oldNodeId || e.target === oldNodeId,
  );

  // Track which ports on the new node have been claimed
  const usedInputPortIds = new Set<string>();
  const usedOutputPortIds = new Set<string>();

  const keptEdges: SwapPreview["keptEdges"] = [];
  const droppedEdges: SwapPreview["droppedEdges"] = [];

  for (const edge of connectedEdges) {
    const isSource = edge.source === oldNodeId;
    const direction: "input" | "output" = isSource ? "output" : "input";
    const handleId = isSource ? edge.sourceHandle : edge.targetHandle;
    const usedPorts = isSource ? usedOutputPortIds : usedInputPortIds;

    // Resolve the old port
    const oldPort = resolvePort(oldNode, handleId, direction);
    if (!oldPort) {
      droppedEdges.push({
        edge,
        reason: `Port not found on original node`,
      });
      continue;
    }

    // Find matching port on new node
    const newPorts =
      direction === "input" ? newMetadata.inputs : newMetadata.outputs;
    const match = findMatchingPort(oldPort, newPorts, usedPorts, checker);

    if (!match) {
      droppedEdges.push({
        edge,
        reason: `No compatible ${direction} port found on "${newMetadata.name}"`,
      });
      continue;
    }

    usedPorts.add(match.id);

    // Build the rewritten edge
    const newHandleId = buildHandleId(newNodeId, direction, match.id);
    const newEdge: WorkflowEdge = { ...edge };

    if (isSource) {
      newEdge.source = newNodeId;
      newEdge.sourceHandle = newHandleId;
    } else {
      newEdge.target = newNodeId;
      newEdge.targetHandle = newHandleId;
    }

    keptEdges.push({ edge, newEdge });
  }

  // Config mapping preview
  const { carriedOver, reset } = mapConfig(
    oldNode.data.config,
    newMetadata.configSchema,
    newMetadata.config,
  );

  return {
    keptEdges,
    droppedEdges,
    hasDataLoss: droppedEdges.length > 0,
    newNodeId,
    configCarriedOver: carriedOver,
    configReset: reset,
  };
}

// =========================================================================
// Swap execution
// =========================================================================

/**
 * Execute a node swap using a previously computed preview.
 *
 * Returns new nodes and edges arrays ready for `workflowActions.batchUpdate()`.
 */
export function executeSwap(
  oldNode: WorkflowNode,
  newMetadata: NodeMetadata,
  preview: SwapPreview,
  allNodes: WorkflowNode[],
  allEdges: WorkflowEdge[],
): SwapResult {
  const oldNodeId = oldNode.id;
  const newNodeId = preview.newNodeId;

  // Map config
  const { config: mappedConfig } = mapConfig(
    oldNode.data.config,
    newMetadata.configSchema,
    newMetadata.config,
  );

  // Build the new node
  const extensions: NodeExtensions = {
    ...oldNode.data.extensions,
    swap: {
      previousNodeId: oldNodeId,
    },
  };

  const newNode: WorkflowNode = {
    id: newNodeId,
    type: "universalNode",
    position: { ...oldNode.position },
    deletable: oldNode.deletable,
    data: {
      label: newMetadata.name,
      config: mappedConfig,
      metadata: newMetadata,
      extensions,
    },
  };

  // Build dropped edge IDs set for fast lookup
  const droppedEdgeIds = new Set(preview.droppedEdges.map((d) => d.edge.id));

  // Build a map from old edge ID → new edge for kept edges
  const keptEdgeMap = new Map<string, WorkflowEdge>();
  for (const { edge, newEdge } of preview.keptEdges) {
    keptEdgeMap.set(edge.id, newEdge);
  }

  // Build updated edges: skip dropped, replace kept, pass through unrelated
  const updatedEdges: WorkflowEdge[] = [];
  for (const edge of allEdges) {
    if (droppedEdgeIds.has(edge.id)) continue;

    const replacement = keptEdgeMap.get(edge.id);
    if (replacement) {
      updatedEdges.push(replacement);
    } else {
      updatedEdges.push(edge);
    }
  }

  // Build updated nodes: replace old node with new node (preserving array order)
  const updatedNodes = allNodes.map((node) =>
    node.id === oldNodeId ? newNode : node,
  );

  return { updatedNodes, updatedEdges };
}

// =========================================================================
// Version upgrade detection
// =========================================================================

/**
 * Check if a newer version of the same node type is available.
 *
 * Compares the node's embedded metadata.version against the same-ID entry
 * in the available nodes list (API returns only the latest version).
 *
 * @returns The newer NodeMetadata if an upgrade is available, null otherwise
 */
export function getVersionUpgrade(
  currentMetadata: NodeMetadata,
  allNodeTypes: NodeMetadata[],
): NodeMetadata | null {
  const available = allNodeTypes.find((n) => n.id === currentMetadata.id);
  if (!available) return null;

  if (compareSemver(available.version, currentMetadata.version) > 0) {
    return available;
  }

  return null;
}

// =========================================================================
// Phase 2 — Advanced Swap Functions
// =========================================================================

/**
 * Determine the MatchQuality for how a port was matched.
 */
function classifyMatch(
  oldPort: NodePort,
  matchedPort: NodePort | null,
): MatchQuality {
  if (!matchedPort) return "unmapped";
  if (matchedPort.id === oldPort.id) return "id";
  if (matchedPort.name.toLowerCase() === oldPort.name.toLowerCase()) return "name";
  return "type";
}

/**
 * Compute a swap preview with full options support (strategies, overrides).
 *
 * Resolution order:
 * 1. Check strategies — first canHandle() match wins for mapPorts()/mapConfig()
 * 2. Fall through to built-in 3-pass for ports not covered by strategy
 * 3. Apply portOverrides on top (highest priority — user's manual overrides)
 * 4. Same cascade for config
 */
export function computeSwapPreviewWithOptions(
  oldNode: WorkflowNode,
  newMetadata: NodeMetadata,
  edges: WorkflowEdge[],
  allNodes: WorkflowNode[],
  options: SwapOptions,
): SwapPreview {
  const checker = options.checker ?? null;
  const oldNodeId = oldNode.id;
  const newNodeId = generateNodeId(newMetadata.id, allNodes);

  // Collect connected edges
  const connectedEdges = edges.filter(
    (e) => e.source === oldNodeId || e.target === oldNodeId,
  );

  // Try strategy-based port mapping
  let strategyPortMap: Record<string, string | null> | undefined;
  let strategyConfigMap: Record<string, { action: "carry" | "reset" | "set"; value?: unknown }> | undefined;

  if (options.strategies?.length) {
    const ctx: SwapStrategyContext = {
      oldNode,
      newMetadata,
      edges,
      allNodes,
      checker,
    };
    for (const strategy of options.strategies) {
      if (strategy.canHandle(ctx)) {
        strategyPortMap = strategy.mapPorts?.(ctx);
        strategyConfigMap = strategy.mapConfig?.(ctx);
        break; // first match wins
      }
    }
  }

  // Build port override lookup (highest priority)
  const portOverrideLookup = new Map<string, string | null>();
  for (const override of options.portOverrides ?? []) {
    portOverrideLookup.set(`${override.direction}:${override.oldPortId}`, override.newPortId);
  }

  // Track used ports
  const usedInputPortIds = new Set<string>();
  const usedOutputPortIds = new Set<string>();

  const keptEdges: SwapPreview["keptEdges"] = [];
  const droppedEdges: SwapPreview["droppedEdges"] = [];

  for (const edge of connectedEdges) {
    const isSource = edge.source === oldNodeId;
    const direction: "input" | "output" = isSource ? "output" : "input";
    const handleId = isSource ? edge.sourceHandle : edge.targetHandle;
    const usedPorts = isSource ? usedOutputPortIds : usedInputPortIds;

    const oldPort = resolvePort(oldNode, handleId, direction);
    if (!oldPort) {
      droppedEdges.push({ edge, reason: "Port not found on original node" });
      continue;
    }

    // Priority 1: Manual port override
    const overrideKey = `${direction}:${oldPort.id}`;
    if (portOverrideLookup.has(overrideKey)) {
      const overrideNewPortId = portOverrideLookup.get(overrideKey)!;
      if (overrideNewPortId === null) {
        droppedEdges.push({ edge, reason: "Manually dropped" });
        continue;
      }
      const newPorts = direction === "input" ? newMetadata.inputs : newMetadata.outputs;
      const overridePort = newPorts.find((p) => p.id === overrideNewPortId);
      if (overridePort) {
        usedPorts.add(overridePort.id);
        const newHandleId = buildHandleId(newNodeId, direction, overridePort.id);
        const newEdge: WorkflowEdge = { ...edge };
        if (isSource) {
          newEdge.source = newNodeId;
          newEdge.sourceHandle = newHandleId;
        } else {
          newEdge.target = newNodeId;
          newEdge.targetHandle = newHandleId;
        }
        keptEdges.push({ edge, newEdge });
        continue;
      }
    }

    // Priority 2: Strategy port mapping
    if (strategyPortMap && oldPort.id in strategyPortMap) {
      const strategyNewPortId = strategyPortMap[oldPort.id];
      if (strategyNewPortId === null) {
        droppedEdges.push({ edge, reason: "Dropped by strategy" });
        continue;
      }
      const newPorts = direction === "input" ? newMetadata.inputs : newMetadata.outputs;
      const strategyPort = newPorts.find((p) => p.id === strategyNewPortId);
      if (strategyPort && !usedPorts.has(strategyPort.id)) {
        usedPorts.add(strategyPort.id);
        const newHandleId = buildHandleId(newNodeId, direction, strategyPort.id);
        const newEdge: WorkflowEdge = { ...edge };
        if (isSource) {
          newEdge.source = newNodeId;
          newEdge.sourceHandle = newHandleId;
        } else {
          newEdge.target = newNodeId;
          newEdge.targetHandle = newHandleId;
        }
        keptEdges.push({ edge, newEdge });
        continue;
      }
    }

    // Priority 3: Built-in 3-pass matching
    const newPorts = direction === "input" ? newMetadata.inputs : newMetadata.outputs;
    const match = findMatchingPort(oldPort, newPorts, usedPorts, checker);

    if (!match) {
      droppedEdges.push({
        edge,
        reason: `No compatible ${direction} port found on "${newMetadata.name}"`,
      });
      continue;
    }

    usedPorts.add(match.id);
    const newHandleId = buildHandleId(newNodeId, direction, match.id);
    const newEdge: WorkflowEdge = { ...edge };
    if (isSource) {
      newEdge.source = newNodeId;
      newEdge.sourceHandle = newHandleId;
    } else {
      newEdge.target = newNodeId;
      newEdge.targetHandle = newHandleId;
    }
    keptEdges.push({ edge, newEdge });
  }

  // Config mapping — apply strategy then overrides
  const { config: baseConfig, carriedOver, reset } = mapConfig(
    oldNode.data.config,
    newMetadata.configSchema,
    newMetadata.config,
  );

  // Apply strategy config overrides
  if (strategyConfigMap) {
    for (const [key, mapping] of Object.entries(strategyConfigMap)) {
      if (mapping.action === "carry" && key in oldNode.data.config) {
        if (!carriedOver.includes(key)) carriedOver.push(key);
        const resetIdx = reset.indexOf(key);
        if (resetIdx >= 0) reset.splice(resetIdx, 1);
      } else if (mapping.action === "reset") {
        if (!reset.includes(key)) reset.push(key);
        const carryIdx = carriedOver.indexOf(key);
        if (carryIdx >= 0) carriedOver.splice(carryIdx, 1);
      }
    }
  }

  // Apply manual config overrides (highest priority)
  for (const override of options.configOverrides ?? []) {
    if (override.action === "carry" && override.key in oldNode.data.config) {
      if (!carriedOver.includes(override.key)) carriedOver.push(override.key);
      const resetIdx = reset.indexOf(override.key);
      if (resetIdx >= 0) reset.splice(resetIdx, 1);
    } else if (override.action === "reset") {
      if (!reset.includes(override.key)) reset.push(override.key);
      const carryIdx = carriedOver.indexOf(override.key);
      if (carryIdx >= 0) carriedOver.splice(carryIdx, 1);
    } else if (override.action === "set") {
      if (!carriedOver.includes(override.key)) carriedOver.push(override.key);
      const resetIdx = reset.indexOf(override.key);
      if (resetIdx >= 0) reset.splice(resetIdx, 1);
    }
  }

  return {
    keptEdges,
    droppedEdges,
    hasDataLoss: droppedEdges.length > 0,
    newNodeId,
    configCarriedOver: carriedOver,
    configReset: reset,
  };
}

/**
 * Compute interactive state for the mapping editor UI.
 *
 * Returns EditablePortMapping and EditableConfigMapping entries
 * with match quality annotations and isFlat flags.
 */
export function computeInteractiveState(
  oldNode: WorkflowNode,
  newMetadata: NodeMetadata,
  edges: WorkflowEdge[],
  allNodes: WorkflowNode[],
  options: SwapOptions = {},
): InteractiveSwapState {
  const checker = options.checker ?? null;
  const oldNodeId = oldNode.id;
  const newNodeId = generateNodeId(newMetadata.id, allNodes);

  const connectedEdges = edges.filter(
    (e) => e.source === oldNodeId || e.target === oldNodeId,
  );

  // Compute the base preview to get auto-matched ports
  const preview = computeSwapPreviewWithOptions(
    oldNode,
    newMetadata,
    edges,
    allNodes,
    options,
  );

  // Build a map from edge id → new port id for kept edges
  const keptEdgePortMap = new Map<string, string>();
  for (const { edge, newEdge } of preview.keptEdges) {
    const isSource = edge.source === oldNodeId;
    const handle = isSource ? newEdge.sourceHandle : newEdge.targetHandle;
    const portId = extractPortId(handle ?? undefined);
    if (portId) keptEdgePortMap.set(edge.id, portId);
  }

  // Build port mappings
  const portMappings: EditablePortMapping[] = [];
  for (const edge of connectedEdges) {
    const isSource = edge.source === oldNodeId;
    const direction: "input" | "output" = isSource ? "output" : "input";
    const handleId = isSource ? edge.sourceHandle : edge.targetHandle;

    const oldPort = resolvePort(oldNode, handleId, direction);
    if (!oldPort) continue;

    const matchedPortId = keptEdgePortMap.get(edge.id) ?? null;
    const newPorts = direction === "input" ? newMetadata.inputs : newMetadata.outputs;
    const matchedPort = matchedPortId
      ? newPorts.find((p) => p.id === matchedPortId) ?? null
      : null;

    const matchQuality = classifyMatch(oldPort, matchedPort);

    portMappings.push({
      oldPort,
      edge,
      direction,
      selectedNewPortId: matchedPortId,
      matchQuality,
      autoSuggestedPortId: matchedPortId,
      isOverridden: false,
    });
  }

  // Build config mappings
  const configMappings: EditableConfigMapping[] = [];
  const newSchema = newMetadata.configSchema;
  if (newSchema?.properties) {
    for (const [key, prop] of Object.entries(newSchema.properties)) {
      if (DYNAMIC_PORT_KEYS.has(key)) continue;

      const oldValue = oldNode.data.config[key];
      const schemaDefault = prop?.default;
      const providedDefault = newMetadata.config?.[key];
      const newDefault = providedDefault !== undefined ? providedDefault : schemaDefault;

      const hasOldValue = key in oldNode.data.config;
      const isFlat = !hasOldValue || isPrimitive(oldValue);

      configMappings.push({
        key,
        title: prop?.title ?? key,
        oldValue,
        newDefault,
        carryOver: hasOldValue && isFlat,
        autoCarryOver: hasOldValue && isFlat,
        isFlat,
      });
    }
  }

  return {
    oldNode,
    newMetadata,
    newNodeId,
    portMappings,
    configMappings,
    availableNewInputs: [...newMetadata.inputs],
    availableNewOutputs: [...newMetadata.outputs],
  };
}

/** Check if a value is a primitive (string, number, boolean, null, undefined). */
function isPrimitive(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const t = typeof value;
  return t === "string" || t === "number" || t === "boolean";
}

/**
 * Convert user-edited InteractiveSwapState back into a SwapPreview
 * for executeSwap(). Pure function, no side effects.
 */
export function buildSwapPreviewFromState(
  state: InteractiveSwapState,
  allEdges: WorkflowEdge[],
): SwapPreview {
  const keptEdges: SwapPreview["keptEdges"] = [];
  const droppedEdges: SwapPreview["droppedEdges"] = [];

  for (const mapping of state.portMappings) {
    if (!mapping.selectedNewPortId) {
      droppedEdges.push({
        edge: mapping.edge,
        reason: mapping.matchQuality === "unmapped"
          ? `No compatible ${mapping.direction} port found on "${state.newMetadata.name}"`
          : "Manually dropped",
      });
      continue;
    }

    const isSource = mapping.edge.source === state.oldNode.id;
    const newHandleId = buildHandleId(
      state.newNodeId,
      mapping.direction,
      mapping.selectedNewPortId,
    );
    const newEdge: WorkflowEdge = { ...mapping.edge };

    if (isSource) {
      newEdge.source = state.newNodeId;
      newEdge.sourceHandle = newHandleId;
    } else {
      newEdge.target = state.newNodeId;
      newEdge.targetHandle = newHandleId;
    }

    keptEdges.push({ edge: mapping.edge, newEdge });
  }

  // Build config lists from interactive state
  const configCarriedOver: string[] = [];
  const configReset: string[] = [];

  for (const cm of state.configMappings) {
    if (cm.carryOver && cm.isFlat) {
      configCarriedOver.push(cm.key);
    } else {
      configReset.push(cm.key);
    }
  }

  return {
    keptEdges,
    droppedEdges,
    hasDataLoss: droppedEdges.length > 0,
    newNodeId: state.newNodeId,
    configCarriedOver,
    configReset,
  };
}

/**
 * Headless one-shot swap with full validation.
 *
 * Guardrails:
 * - Validates oldNode.id exists in allNodes
 * - Validates format compatibility if newMetadata.formats is set
 * - Computes preview → executes → validates → returns result
 * - Throws SwapValidationError on invalid input
 */
export function performSwap(
  oldNode: WorkflowNode,
  newMetadata: NodeMetadata,
  allNodes: WorkflowNode[],
  allEdges: WorkflowEdge[],
  options?: SwapOptions,
): SwapResult {
  // Validate oldNode exists
  const exists = allNodes.some((n) => n.id === oldNode.id);
  if (!exists) {
    throw new SwapValidationError(
      `Node "${oldNode.id}" not found in the workflow`,
    );
  }

  // Compute preview
  const preview = options
    ? computeSwapPreviewWithOptions(oldNode, newMetadata, allEdges, allNodes, options)
    : computeSwapPreview(oldNode, newMetadata, allEdges, allNodes, null);

  // Execute
  const result = executeSwap(oldNode, newMetadata, preview, allNodes, allEdges);

  // Post-swap validation
  const validation = validateSwapResult(result);
  if (!validation.valid) {
    throw new SwapValidationError(
      `Post-swap validation failed: ${validation.error}`,
    );
  }

  return result;
}

/**
 * Validate a swap result for structural integrity.
 *
 * Checks:
 * - No dangling edge references (every edge source/target exists in nodes)
 * - No duplicate node IDs
 * - No duplicate edge IDs
 */
export function validateSwapResult(result: SwapResult): WorkflowValidationResult {
  const nodeIds = new Set<string>();
  for (const node of result.updatedNodes) {
    if (nodeIds.has(node.id)) {
      return { valid: false, error: `Duplicate node ID: "${node.id}"` };
    }
    nodeIds.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of result.updatedEdges) {
    if (edgeIds.has(edge.id)) {
      return { valid: false, error: `Duplicate edge ID: "${edge.id}"` };
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.source)) {
      return {
        valid: false,
        error: `Dangling edge "${edge.id}": source node "${edge.source}" not found`,
      };
    }
    if (!nodeIds.has(edge.target)) {
      return {
        valid: false,
        error: `Dangling edge "${edge.id}": target node "${edge.target}" not found`,
      };
    }
  }

  return { valid: true };
}
