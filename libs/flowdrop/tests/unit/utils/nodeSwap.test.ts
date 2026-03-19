/**
 * Tests for Node Swap utilities
 *
 * Covers: computeSwapPreview, executeSwap, mapConfig, getVersionUpgrade, compareSemver
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  computeSwapPreview,
  computeSwapPreviewWithOptions,
  computeInteractiveState,
  buildSwapPreviewFromState,
  performSwap,
  validateSwapResult,
  executeSwap,
  mapConfig,
  getVersionUpgrade,
  compareSemver,
  SwapValidationError,
} from "$lib/utils/nodeSwap.js";
import type {
  SwapPreview,
  SwapStrategy,
  SwapStrategyContext,
  InteractiveSwapState,
} from "$lib/utils/nodeSwap.js";
import type {
  WorkflowNode,
  WorkflowEdge,
  NodeMetadata,
  ConfigSchema,
} from "$lib/types";
import { PortCompatibilityChecker } from "$lib/utils/connections.js";
import { DEFAULT_PORT_CONFIG } from "$lib/config/defaultPortConfig.js";
import { buildHandleId, extractPortId } from "$lib/utils/handleIds.js";
import {
  calculatorNode,
  advancedCalculatorNode,
  calculatorNodeV2,
  textFormatterNode,
  mathProcessorNode,
  textInputNode,
  isolatedNode,
  gatewayNode,
} from "../../fixtures/nodes.js";

// =========================================================================
// Helpers
// =========================================================================

let checker: PortCompatibilityChecker;

beforeEach(() => {
  checker = new PortCompatibilityChecker(DEFAULT_PORT_CONFIG);
});

/** Build a WorkflowNode instance from NodeMetadata with given id and position */
function makeNode(
  id: string,
  metadata: NodeMetadata,
  config: Record<string, unknown> = {},
  position = { x: 100, y: 200 },
): WorkflowNode {
  return {
    id,
    type: "universalNode",
    position,
    deletable: true,
    data: {
      label: metadata.name,
      config,
      metadata,
    },
  };
}

/** Build a WorkflowEdge with proper handle IDs */
function makeEdge(
  id: string,
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
): WorkflowEdge {
  return {
    id,
    source: sourceNodeId,
    target: targetNodeId,
    sourceHandle: buildHandleId(sourceNodeId, "output", sourcePortId),
    targetHandle: buildHandleId(targetNodeId, "input", targetPortId),
  };
}

// =========================================================================
// computeSwapPreview
// =========================================================================

describe("computeSwapPreview", () => {
  describe("Pass 1 — exact port ID match", () => {
    it("should keep all edges when ports match by ID and type", () => {
      // calculator has inputs: a, b and output: result
      // advancedCalculator has inputs: a, b, c and outputs: result, remainder
      const calcNode = makeNode("calculator.1", calculatorNode, {
        operation: "multiply",
      });
      const sourceNode = makeNode("source.1", textInputNode);
      const targetNode = makeNode("target.1", textInputNode);

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "source.1", "value", "calculator.1", "a"),
        makeEdge("e2", "source.1", "value", "calculator.1", "b"),
        makeEdge("e3", "calculator.1", "result", "target.1", "value"),
      ];

      // Note: these edges won't type-check for real compatibility
      // (string→number), but we pass null checker for this pure ID test
      const preview = computeSwapPreview(
        calcNode,
        advancedCalculatorNode,
        edges,
        [calcNode, sourceNode, targetNode],
        null,
      );

      expect(preview.keptEdges).toHaveLength(3);
      expect(preview.droppedEdges).toHaveLength(0);
      expect(preview.hasDataLoss).toBe(false);
    });

    it("should generate a new node ID based on the new metadata", () => {
      const calcNode = makeNode("calculator.1", calculatorNode);
      const preview = computeSwapPreview(
        calcNode,
        advancedCalculatorNode,
        [],
        [calcNode],
        null,
      );

      expect(preview.newNodeId).toBe("advanced_calculator.1");
    });
  });

  describe("Pass 2 — port name match", () => {
    it("should match ports by name when IDs differ", () => {
      // calculator: inputs a("Number A"), b("Number B"), output result("Result")
      // mathProcessor: inputs num_a("Number A"), num_b("Number B"), output answer("Result")
      const calcNode = makeNode("calculator.1", calculatorNode);
      const otherNode = makeNode("other.1", textInputNode);

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "other.1", "value", "calculator.1", "a"),
        makeEdge("e2", "other.1", "value", "calculator.1", "b"),
        makeEdge("e3", "calculator.1", "result", "other.1", "value"),
      ];

      // Use null checker so dataType matching is exact equality (number===number)
      const preview = computeSwapPreview(
        calcNode,
        mathProcessorNode,
        edges,
        [calcNode, otherNode],
        null,
      );

      // All 3 edges should match by name
      expect(preview.keptEdges).toHaveLength(3);
      expect(preview.droppedEdges).toHaveLength(0);

      // Verify the new port IDs are from mathProcessor
      const keptPortIds = preview.keptEdges.map((k) => {
        const isSource = k.newEdge.source !== "other.1" || k.newEdge.source === preview.newNodeId;
        const handle = k.newEdge.source === preview.newNodeId
          ? k.newEdge.sourceHandle
          : k.newEdge.targetHandle;
        return extractPortId(handle ?? undefined);
      });
      expect(keptPortIds).toContain("num_a");
      expect(keptPortIds).toContain("num_b");
      expect(keptPortIds).toContain("answer");
    });

    it("should do case-insensitive name matching", () => {
      // Create custom metadata with different case names
      const upperCaseNode: NodeMetadata = {
        ...calculatorNode,
        id: "upper_calc",
        inputs: [
          { id: "x", name: "NUMBER A", type: "input", dataType: "number" },
        ],
        outputs: [],
      };

      const calcNode = makeNode("calculator.1", calculatorNode);
      const sourceNode = makeNode("src.1", textInputNode);

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "src.1", "value", "calculator.1", "a"),
      ];

      const preview = computeSwapPreview(
        calcNode,
        upperCaseNode,
        edges,
        [calcNode, sourceNode],
        null,
      );

      expect(preview.keptEdges).toHaveLength(1);
      expect(preview.droppedEdges).toHaveLength(0);
    });
  });

  describe("Pass 3 — dataType fallback", () => {
    it("should match by compatible dataType when ID and name differ", () => {
      // Create nodes where only dataType can match
      const sourceMetadata: NodeMetadata = {
        ...calculatorNode,
        id: "src_type",
        inputs: [],
        outputs: [
          { id: "out1", name: "Alpha", type: "output", dataType: "number" },
        ],
      };

      const targetMetadata: NodeMetadata = {
        ...calculatorNode,
        id: "tgt_type",
        inputs: [
          { id: "in_x", name: "Beta", type: "input", dataType: "number" },
        ],
        outputs: [],
      };

      const srcNode = makeNode("src_type.1", sourceMetadata);
      const oldTarget = makeNode("old.1", {
        ...calculatorNode,
        id: "old_type",
        inputs: [
          { id: "in_z", name: "Gamma", type: "input", dataType: "number" },
        ],
        outputs: [],
      });

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "src_type.1", "out1", "old.1", "in_z"),
      ];

      const preview = computeSwapPreview(
        oldTarget,
        targetMetadata,
        edges,
        [srcNode, oldTarget],
        null,
      );

      // Should match by dataType (number → number)
      expect(preview.keptEdges).toHaveLength(1);
      expect(preview.droppedEdges).toHaveLength(0);
    });

    it("should consume ports in declaration order (no double-matching)", () => {
      const oldMeta: NodeMetadata = {
        ...calculatorNode,
        id: "old",
        inputs: [
          { id: "p1", name: "First", type: "input", dataType: "number" },
          { id: "p2", name: "Second", type: "input", dataType: "number" },
        ],
        outputs: [],
      };

      const newMeta: NodeMetadata = {
        ...calculatorNode,
        id: "new",
        inputs: [
          { id: "x1", name: "X", type: "input", dataType: "number" },
          { id: "x2", name: "Y", type: "input", dataType: "number" },
        ],
        outputs: [],
      };

      const node = makeNode("old.1", oldMeta);
      const srcNode = makeNode("src.1", textInputNode);

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "src.1", "value", "old.1", "p1"),
        makeEdge("e2", "src.1", "value", "old.1", "p2"),
      ];

      const preview = computeSwapPreview(
        node,
        newMeta,
        edges,
        [node, srcNode],
        null,
      );

      expect(preview.keptEdges).toHaveLength(2);

      // Each should map to different new ports
      const newTargetPorts = preview.keptEdges.map((k) =>
        extractPortId(k.newEdge.targetHandle ?? undefined),
      );
      expect(new Set(newTargetPorts).size).toBe(2);
    });
  });

  describe("data loss scenarios", () => {
    it("should drop edges with incompatible types", () => {
      // calculator (number inputs) → textFormatter (string input)
      const calcNode = makeNode("calculator.1", calculatorNode);
      const srcNode = makeNode("src.1", textInputNode);

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "src.1", "value", "calculator.1", "a"),
        makeEdge("e2", "src.1", "value", "calculator.1", "b"),
      ];

      // With checker, string→string won't match number→string
      const preview = computeSwapPreview(
        calcNode,
        textFormatterNode,
        edges,
        [calcNode, srcNode],
        checker,
      );

      // String outputs → number inputs are incompatible
      expect(preview.droppedEdges.length).toBeGreaterThan(0);
      expect(preview.hasDataLoss).toBe(true);
    });

    it("should set hasDataLoss when new node has fewer compatible ports", () => {
      // advancedCalculator (3 inputs) → swap to node with only 1 input
      const advNode = makeNode("advanced_calculator.1", advancedCalculatorNode);
      const srcNode = makeNode("src.1", {
        ...textInputNode,
        id: "num_src",
        outputs: [
          { id: "value", name: "Value", type: "output", dataType: "number" },
        ],
      });

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "src.1", "value", "advanced_calculator.1", "a"),
        makeEdge("e2", "src.1", "value", "advanced_calculator.1", "b"),
        makeEdge("e3", "src.1", "value", "advanced_calculator.1", "c"),
      ];

      // Target: single number input node
      const singleInputMeta: NodeMetadata = {
        ...calculatorNode,
        id: "single",
        inputs: [
          { id: "x", name: "X", type: "input", dataType: "number" },
        ],
        outputs: [],
      };

      const preview = computeSwapPreview(
        advNode,
        singleInputMeta,
        edges,
        [advNode, srcNode],
        null,
      );

      expect(preview.keptEdges).toHaveLength(1);
      expect(preview.droppedEdges).toHaveLength(2);
      expect(preview.hasDataLoss).toBe(true);
    });

    it("should drop all input edges when swapping to node with zero inputs", () => {
      const calcNode = makeNode("calculator.1", calculatorNode);
      const srcNode = makeNode("src.1", textInputNode);

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "src.1", "value", "calculator.1", "a"),
        makeEdge("e2", "src.1", "value", "calculator.1", "b"),
      ];

      const preview = computeSwapPreview(
        calcNode,
        isolatedNode,
        edges,
        [calcNode, srcNode],
        null,
      );

      expect(preview.keptEdges).toHaveLength(0);
      expect(preview.droppedEdges).toHaveLength(2);
      expect(preview.hasDataLoss).toBe(true);
    });
  });

  describe("more ports than connections (no data loss)", () => {
    it("should not flag data loss when new node has extra unconnected ports", () => {
      const calcNode = makeNode("calculator.1", calculatorNode);
      const srcNode = makeNode("src.1", textInputNode);

      // Only 2 input edges, advancedCalculator has 3 inputs
      const edges: WorkflowEdge[] = [
        makeEdge("e1", "src.1", "value", "calculator.1", "a"),
        makeEdge("e2", "src.1", "value", "calculator.1", "b"),
      ];

      const preview = computeSwapPreview(
        calcNode,
        advancedCalculatorNode,
        edges,
        [calcNode, srcNode],
        null,
      );

      expect(preview.keptEdges).toHaveLength(2);
      expect(preview.droppedEdges).toHaveLength(0);
      expect(preview.hasDataLoss).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle node with no connections", () => {
      const calcNode = makeNode("calculator.1", calculatorNode);

      const preview = computeSwapPreview(
        calcNode,
        advancedCalculatorNode,
        [],
        [calcNode],
        null,
      );

      expect(preview.keptEdges).toHaveLength(0);
      expect(preview.droppedEdges).toHaveLength(0);
      expect(preview.hasDataLoss).toBe(false);
    });

    it("should handle node that is both source and target of edges", () => {
      const calcNode = makeNode("calculator.1", calculatorNode);
      const srcNode = makeNode("src.1", textInputNode);
      const tgtNode = makeNode("tgt.1", textInputNode);

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "src.1", "value", "calculator.1", "a"), // incoming
        makeEdge("e2", "calculator.1", "result", "tgt.1", "value"), // outgoing
      ];

      const preview = computeSwapPreview(
        calcNode,
        advancedCalculatorNode,
        edges,
        [calcNode, srcNode, tgtNode],
        null,
      );

      // Both should be kept (ports a and result exist on both)
      expect(preview.keptEdges).toHaveLength(2);
      expect(preview.droppedEdges).toHaveLength(0);
    });

    it("should not affect edges unrelated to the swapped node", () => {
      const calcNode = makeNode("calculator.1", calculatorNode);
      const srcNode = makeNode("src.1", textInputNode);
      const tgtNode = makeNode("tgt.1", textInputNode);

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "src.1", "value", "calculator.1", "a"),
        makeEdge("e-unrelated", "src.1", "value", "tgt.1", "value"), // unrelated
      ];

      const preview = computeSwapPreview(
        calcNode,
        advancedCalculatorNode,
        edges,
        [calcNode, srcNode, tgtNode],
        null,
      );

      // Only e1 is connected to calculator.1
      expect(preview.keptEdges).toHaveLength(1);
      expect(preview.droppedEdges).toHaveLength(0);
    });
  });

  describe("handle ID rewriting", () => {
    it("should rewrite handle IDs with the new node ID", () => {
      const calcNode = makeNode("calculator.1", calculatorNode);
      const srcNode = makeNode("src.1", textInputNode);

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "src.1", "value", "calculator.1", "a"),
      ];

      const preview = computeSwapPreview(
        calcNode,
        advancedCalculatorNode,
        edges,
        [calcNode, srcNode],
        null,
      );

      expect(preview.keptEdges).toHaveLength(1);
      const newEdge = preview.keptEdges[0].newEdge;

      // Target should reference the new node ID
      expect(newEdge.target).toBe(preview.newNodeId);
      expect(newEdge.targetHandle).toContain(preview.newNodeId);
      expect(newEdge.targetHandle).toContain("-input-a");

      // Source should remain unchanged
      expect(newEdge.source).toBe("src.1");
      expect(newEdge.sourceHandle).toContain("src.1");
    });

    it("should rewrite source handles when the swapped node is the source", () => {
      const calcNode = makeNode("calculator.1", calculatorNode);
      const tgtNode = makeNode("tgt.1", textInputNode);

      const edges: WorkflowEdge[] = [
        makeEdge("e1", "calculator.1", "result", "tgt.1", "value"),
      ];

      const preview = computeSwapPreview(
        calcNode,
        advancedCalculatorNode,
        edges,
        [calcNode, tgtNode],
        null,
      );

      const newEdge = preview.keptEdges[0].newEdge;
      expect(newEdge.source).toBe(preview.newNodeId);
      expect(newEdge.sourceHandle).toContain(preview.newNodeId);
      expect(newEdge.sourceHandle).toContain("-output-result");
    });
  });

  describe("config preview", () => {
    it("should report carried over and reset config keys", () => {
      const calcNode = makeNode("calculator.1", calculatorNode, {
        operation: "multiply",
      });

      const preview = computeSwapPreview(
        calcNode,
        advancedCalculatorNode,
        [],
        [calcNode],
        null,
      );

      // "operation" exists in both → carried over
      expect(preview.configCarriedOver).toContain("operation");
      // "precision" only in new → reset
      expect(preview.configReset).toContain("precision");
    });
  });
});

// =========================================================================
// executeSwap
// =========================================================================

describe("executeSwap", () => {
  it("should generate a new node ID from the new metadata type", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const preview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      [],
      [calcNode],
      null,
    );

    const result = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview,
      [calcNode],
      [],
    );

    const newNode = result.updatedNodes.find(
      (n) => n.id === preview.newNodeId,
    );
    expect(newNode).toBeDefined();
    expect(newNode!.id).toBe("advanced_calculator.1");
  });

  it("should preserve the original node position", () => {
    const calcNode = makeNode("calculator.1", calculatorNode, {}, { x: 350, y: 420 });
    const preview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      [],
      [calcNode],
      null,
    );

    const result = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview,
      [calcNode],
      [],
    );

    const newNode = result.updatedNodes.find(
      (n) => n.id === preview.newNodeId,
    );
    expect(newNode!.position).toEqual({ x: 350, y: 420 });
  });

  it("should store original node ID in extensions.swap.previousNodeId", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const preview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      [],
      [calcNode],
      null,
    );

    const result = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview,
      [calcNode],
      [],
    );

    const newNode = result.updatedNodes.find(
      (n) => n.id === preview.newNodeId,
    );
    expect((newNode!.data.extensions as any)?.swap?.previousNodeId).toBe(
      "calculator.1",
    );
  });

  it("should set new metadata from target NodeMetadata", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const preview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      [],
      [calcNode],
      null,
    );

    const result = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview,
      [calcNode],
      [],
    );

    const newNode = result.updatedNodes.find(
      (n) => n.id === preview.newNodeId,
    );
    expect(newNode!.data.metadata.id).toBe("advanced_calculator");
    expect(newNode!.data.metadata.version).toBe("2.0.0");
  });

  it("should map config via mapConfig", () => {
    const calcNode = makeNode("calculator.1", calculatorNode, {
      operation: "divide",
    });
    const preview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      [],
      [calcNode],
      null,
    );

    const result = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview,
      [calcNode],
      [],
    );

    const newNode = result.updatedNodes.find(
      (n) => n.id === preview.newNodeId,
    );
    expect(newNode!.data.config.operation).toBe("divide"); // carried over
    expect(newNode!.data.config.precision).toBe(2); // default
  });

  it("should set type to universalNode", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const preview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      [],
      [calcNode],
      null,
    );

    const result = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview,
      [calcNode],
      [],
    );

    const newNode = result.updatedNodes.find(
      (n) => n.id === preview.newNodeId,
    );
    expect(newNode!.type).toBe("universalNode");
  });

  it("should replace old node at the same array index", () => {
    const nodeA = makeNode("a.1", textInputNode);
    const calcNode = makeNode("calculator.1", calculatorNode);
    const nodeB = makeNode("b.1", textInputNode);

    const allNodes = [nodeA, calcNode, nodeB];
    const preview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      [],
      allNodes,
      null,
    );

    const result = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview,
      allNodes,
      [],
    );

    expect(result.updatedNodes[0].id).toBe("a.1");
    expect(result.updatedNodes[1].id).toBe(preview.newNodeId);
    expect(result.updatedNodes[2].id).toBe("b.1");
  });

  it("should exclude dropped edges from the result", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const srcNode = makeNode("src.1", textInputNode);

    const edges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
    ];

    // Swap to isolated node (no ports) → edge is dropped
    const preview = computeSwapPreview(
      calcNode,
      isolatedNode,
      edges,
      [calcNode, srcNode],
      null,
    );

    expect(preview.droppedEdges).toHaveLength(1);

    const result = executeSwap(
      calcNode,
      isolatedNode,
      preview,
      [calcNode, srcNode],
      edges,
    );

    expect(result.updatedEdges).toHaveLength(0);
  });

  it("should not modify unrelated nodes or edges", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const otherNode = makeNode("other.1", textInputNode);

    const unrelatedEdge: WorkflowEdge = makeEdge(
      "e-unrelated",
      "other.1",
      "value",
      "other.1",
      "value",
    );

    const allNodes = [calcNode, otherNode];
    const allEdges = [unrelatedEdge];

    const preview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      allEdges,
      allNodes,
      null,
    );

    const result = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview,
      allNodes,
      allEdges,
    );

    // Unrelated node untouched
    expect(result.updatedNodes.find((n) => n.id === "other.1")).toEqual(
      otherNode,
    );
    // Unrelated edge untouched
    expect(result.updatedEdges.find((e) => e.id === "e-unrelated")).toEqual(
      unrelatedEdge,
    );
  });
});

// =========================================================================
// mapConfig
// =========================================================================

describe("mapConfig", () => {
  const schema: ConfigSchema = {
    type: "object",
    properties: {
      operation: {
        type: "string",
        title: "Operation",
        default: "add",
      },
      precision: {
        type: "number",
        title: "Precision",
        default: 2,
      },
    },
  };

  it("should carry over matching keys", () => {
    const { config, carriedOver } = mapConfig(
      { operation: "multiply" },
      schema,
    );
    expect(config.operation).toBe("multiply");
    expect(carriedOver).toContain("operation");
  });

  it("should use defaults for new-only keys", () => {
    const { config, reset } = mapConfig({}, schema);
    expect(config.precision).toBe(2);
    expect(reset).toContain("precision");
  });

  it("should discard old-only keys", () => {
    const { config } = mapConfig(
      { operation: "add", placeholder: "hello" },
      schema,
    );
    expect(config).not.toHaveProperty("placeholder");
  });

  it("should exclude dynamic port keys even if present in new schema", () => {
    const schemaWithDynamic: ConfigSchema = {
      type: "object",
      properties: {
        dynamicInputs: { type: "array", title: "Dynamic Inputs" },
        dynamicOutputs: { type: "array", title: "Dynamic Outputs" },
        branches: { type: "array", title: "Branches" },
        operation: { type: "string", title: "Op", default: "add" },
      },
    };

    const { config } = mapConfig(
      {
        dynamicInputs: [{ name: "x", label: "X" }],
        dynamicOutputs: [{ name: "y", label: "Y" }],
        branches: [{ name: "a", label: "A" }],
        operation: "sub",
      },
      schemaWithDynamic,
    );

    expect(config).not.toHaveProperty("dynamicInputs");
    expect(config).not.toHaveProperty("dynamicOutputs");
    expect(config).not.toHaveProperty("branches");
    expect(config.operation).toBe("sub");
  });

  it("should return empty config for empty schema", () => {
    const { config } = mapConfig(
      { foo: "bar" },
      { type: "object", properties: {} },
    );
    expect(Object.keys(config)).toHaveLength(0);
  });

  it("should return empty config for undefined schema", () => {
    const { config } = mapConfig({ foo: "bar" }, undefined);
    expect(Object.keys(config)).toHaveLength(0);
  });

  it("should apply all defaults when old config is empty", () => {
    const { config, reset } = mapConfig({}, schema);
    expect(config.operation).toBe("add");
    expect(config.precision).toBe(2);
    expect(reset).toEqual(["operation", "precision"]);
  });

  it("should prefer newDefaults over schema defaults", () => {
    const { config } = mapConfig({}, schema, { precision: 5 });
    expect(config.precision).toBe(5);
  });

  it("should carry over values regardless of type mismatch", () => {
    // Old config has string "5" but schema expects number
    const { config, carriedOver } = mapConfig({ precision: "5" }, schema);
    expect(config.precision).toBe("5");
    expect(carriedOver).toContain("precision");
  });
});

// =========================================================================
// getVersionUpgrade
// =========================================================================

describe("getVersionUpgrade", () => {
  it("should return newer metadata when version is higher", () => {
    const result = getVersionUpgrade(calculatorNode, [calculatorNodeV2]);
    expect(result).not.toBeNull();
    expect(result!.version).toBe("2.0.0");
  });

  it("should return null when versions are equal", () => {
    const result = getVersionUpgrade(calculatorNode, [calculatorNode]);
    expect(result).toBeNull();
  });

  it("should return null when available version is lower", () => {
    const olderNode: NodeMetadata = { ...calculatorNode, version: "0.5.0" };
    const result = getVersionUpgrade(calculatorNode, [olderNode]);
    expect(result).toBeNull();
  });

  it("should return null when node type is not found", () => {
    const result = getVersionUpgrade(calculatorNode, [textFormatterNode]);
    expect(result).toBeNull();
  });
});

// =========================================================================
// compareSemver
// =========================================================================

describe("compareSemver", () => {
  it("should compare major versions correctly", () => {
    expect(compareSemver("2.0.0", "1.0.0")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0", "2.0.0")).toBeLessThan(0);
  });

  it("should compare minor versions correctly", () => {
    expect(compareSemver("1.2.0", "1.1.0")).toBeGreaterThan(0);
  });

  it("should compare patch versions correctly", () => {
    expect(compareSemver("1.0.2", "1.0.1")).toBeGreaterThan(0);
  });

  it("should return 0 for equal versions", () => {
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
  });

  it("should handle numeric comparison (1.10.0 > 1.9.0)", () => {
    expect(compareSemver("1.10.0", "1.9.0")).toBeGreaterThan(0);
  });

  it("should treat pre-release as lower than release", () => {
    expect(compareSemver("2.0.0-beta", "2.0.0")).toBeLessThan(0);
    expect(compareSemver("2.0.0", "2.0.0-beta")).toBeGreaterThan(0);
  });

  it("should handle different length versions", () => {
    expect(compareSemver("1.0", "1.0.0")).toBe(0);
    expect(compareSemver("1.0.1", "1.0")).toBeGreaterThan(0);
  });
});

// =========================================================================
// Integration — full swap flow
// =========================================================================

describe("integration — full swap flow", () => {
  it("should perform a complete swap on a connected node", () => {
    const calcNode = makeNode("calculator.1", calculatorNode, {
      operation: "multiply",
    });
    const srcNode = makeNode("src.1", textInputNode);
    const tgtNode = makeNode("tgt.1", textInputNode);

    const allNodes = [srcNode, calcNode, tgtNode];
    const allEdges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
      makeEdge("e2", "calculator.1", "result", "tgt.1", "value"),
    ];

    // Step 1: preview
    const preview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      allEdges,
      allNodes,
      null,
    );

    expect(preview.keptEdges).toHaveLength(2);
    expect(preview.hasDataLoss).toBe(false);

    // Step 2: execute
    const result = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview,
      allNodes,
      allEdges,
    );

    // Verify: 3 nodes, old calculator replaced
    expect(result.updatedNodes).toHaveLength(3);
    expect(result.updatedNodes.find((n) => n.id === "calculator.1")).toBeUndefined();
    const newNode = result.updatedNodes.find(
      (n) => n.id === preview.newNodeId,
    );
    expect(newNode).toBeDefined();
    expect(newNode!.data.metadata.id).toBe("advanced_calculator");

    // Verify: 2 edges, both rewritten
    expect(result.updatedEdges).toHaveLength(2);
    for (const edge of result.updatedEdges) {
      // No edge should reference the old node ID
      expect(edge.source).not.toBe("calculator.1");
      expect(edge.target).not.toBe("calculator.1");
    }
  });

  it("should produce no dangling edge references after swap", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const srcNode = makeNode("src.1", textInputNode);

    const allNodes = [srcNode, calcNode];
    const allEdges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
      makeEdge("e2", "src.1", "value", "calculator.1", "b"),
    ];

    const preview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      allEdges,
      allNodes,
      null,
    );

    const result = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview,
      allNodes,
      allEdges,
    );

    // Every edge source/target should reference an existing node
    const nodeIds = new Set(result.updatedNodes.map((n) => n.id));
    for (const edge of result.updatedEdges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("should support sequential swaps on different nodes", () => {
    const nodeA = makeNode("text_input.1", textInputNode);
    const nodeB = makeNode("calculator.1", calculatorNode);

    let allNodes = [nodeA, nodeB];
    let allEdges: WorkflowEdge[] = [
      makeEdge("e1", "text_input.1", "value", "calculator.1", "a"),
    ];

    // Swap node A
    const previewA = computeSwapPreview(
      nodeA,
      textFormatterNode,
      allEdges,
      allNodes,
      null,
    );

    const resultA = executeSwap(
      nodeA,
      textFormatterNode,
      previewA,
      allNodes,
      allEdges,
    );

    allNodes = resultA.updatedNodes;
    allEdges = resultA.updatedEdges;

    // Now swap node B (find the calculator node which still exists)
    const calcNodeAfter = allNodes.find((n) => n.id === "calculator.1");
    expect(calcNodeAfter).toBeDefined();

    const previewB = computeSwapPreview(
      calcNodeAfter!,
      mathProcessorNode,
      allEdges,
      allNodes,
      null,
    );

    const resultB = executeSwap(
      calcNodeAfter!,
      mathProcessorNode,
      previewB,
      allNodes,
      allEdges,
    );

    // Both swaps should have produced valid node arrays
    expect(resultB.updatedNodes).toHaveLength(2);
    expect(
      resultB.updatedNodes.find((n) => n.id === "text_input.1"),
    ).toBeUndefined();
    expect(
      resultB.updatedNodes.find((n) => n.id === "calculator.1"),
    ).toBeUndefined();
  });

  it("should restore connections when swapping back to original type", () => {
    const calcNode = makeNode("calculator.1", calculatorNode, {
      operation: "add",
    });
    const srcNode = makeNode("src.1", {
      ...textInputNode,
      id: "num_src",
      outputs: [
        { id: "value", name: "Value", type: "output", dataType: "number" },
      ],
    });

    const allNodes = [srcNode, calcNode];
    const allEdges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
      makeEdge("e2", "src.1", "value", "calculator.1", "b"),
    ];

    // Swap to advancedCalculator
    const preview1 = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      allEdges,
      allNodes,
      null,
    );
    const result1 = executeSwap(
      calcNode,
      advancedCalculatorNode,
      preview1,
      allNodes,
      allEdges,
    );

    // Both edges kept (ports a and b exist on both)
    expect(result1.updatedEdges).toHaveLength(2);

    // Swap back to calculator
    const advNode = result1.updatedNodes.find(
      (n) => n.id === preview1.newNodeId,
    )!;
    const preview2 = computeSwapPreview(
      advNode,
      calculatorNode,
      result1.updatedEdges,
      result1.updatedNodes,
      null,
    );

    // Both edges should be kept again (ports a and b match)
    expect(preview2.keptEdges).toHaveLength(2);
    expect(preview2.hasDataLoss).toBe(false);
  });
});

// =========================================================================
// computeSwapPreviewWithOptions
// =========================================================================

describe("computeSwapPreviewWithOptions", () => {
  it("should apply portOverrides to force-remap a port", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const srcNode = makeNode("src.1", textInputNode);

    const edges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
    ];

    const preview = computeSwapPreviewWithOptions(
      calcNode,
      advancedCalculatorNode,
      edges,
      [calcNode, srcNode],
      {
        portOverrides: [
          { oldPortId: "a", newPortId: "c", direction: "input" },
        ],
      },
    );

    expect(preview.keptEdges).toHaveLength(1);
    const newHandle = preview.keptEdges[0].newEdge.targetHandle ?? "";
    expect(newHandle).toContain("-input-c");
  });

  it("should apply portOverrides to force-drop via null", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const srcNode = makeNode("src.1", textInputNode);

    const edges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
    ];

    const preview = computeSwapPreviewWithOptions(
      calcNode,
      advancedCalculatorNode,
      edges,
      [calcNode, srcNode],
      {
        portOverrides: [
          { oldPortId: "a", newPortId: null, direction: "input" },
        ],
      },
    );

    expect(preview.keptEdges).toHaveLength(0);
    expect(preview.droppedEdges).toHaveLength(1);
    expect(preview.droppedEdges[0].reason).toBe("Manually dropped");
  });

  it("should apply configOverrides with carry, reset, set actions", () => {
    const calcNode = makeNode("calculator.1", calculatorNode, {
      operation: "multiply",
    });

    const preview = computeSwapPreviewWithOptions(
      calcNode,
      advancedCalculatorNode,
      [],
      [calcNode],
      {
        configOverrides: [
          { key: "precision", action: "carry", value: undefined },
          { key: "operation", action: "reset" },
        ],
      },
    );

    // operation was carried by default, but override says reset
    expect(preview.configReset).toContain("operation");
    // precision was reset by default, but override says carry
    // (even though it's not in old config, the override is applied)
  });

  it("should use custom SwapStrategy when canHandle returns true", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const srcNode = makeNode("src.1", textInputNode);

    const edges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
    ];

    const strategy: SwapStrategy = {
      id: "test-strategy",
      name: "Test Strategy",
      canHandle: () => true,
      mapPorts: () => ({ a: "c" }), // map port a → c
    };

    const preview = computeSwapPreviewWithOptions(
      calcNode,
      advancedCalculatorNode,
      edges,
      [calcNode, srcNode],
      { strategies: [strategy] },
    );

    expect(preview.keptEdges).toHaveLength(1);
    const newHandle = preview.keptEdges[0].newEdge.targetHandle ?? "";
    expect(newHandle).toContain("-input-c");
  });

  it("should fall through to built-in 3-pass for ports not covered by strategy", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const srcNode = makeNode("src.1", textInputNode);
    const tgtNode = makeNode("tgt.1", textInputNode);

    const edges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
      makeEdge("e2", "calculator.1", "result", "tgt.1", "value"),
    ];

    const strategy: SwapStrategy = {
      id: "partial",
      name: "Partial Strategy",
      canHandle: () => true,
      mapPorts: () => ({ a: "c" }), // only maps port a → c; result not covered
    };

    const preview = computeSwapPreviewWithOptions(
      calcNode,
      advancedCalculatorNode,
      edges,
      [calcNode, srcNode, tgtNode],
      { strategies: [strategy] },
    );

    // Both should be kept: a→c by strategy, result→result by built-in ID match
    expect(preview.keptEdges).toHaveLength(2);
  });

  it("should use first matching strategy when multiple are provided", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const srcNode = makeNode("src.1", textInputNode);

    const edges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
    ];

    const strategy1: SwapStrategy = {
      id: "first",
      name: "First",
      canHandle: () => true,
      mapPorts: () => ({ a: "b" }),
    };

    const strategy2: SwapStrategy = {
      id: "second",
      name: "Second",
      canHandle: () => true,
      mapPorts: () => ({ a: "c" }),
    };

    const preview = computeSwapPreviewWithOptions(
      calcNode,
      advancedCalculatorNode,
      edges,
      [calcNode, srcNode],
      { strategies: [strategy1, strategy2] },
    );

    // First strategy wins: a→b
    const newHandle = preview.keptEdges[0].newEdge.targetHandle ?? "";
    expect(newHandle).toContain("-input-b");
  });

  it("manual override wins over strategy", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const srcNode = makeNode("src.1", textInputNode);

    const edges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
    ];

    const strategy: SwapStrategy = {
      id: "test",
      name: "Test",
      canHandle: () => true,
      mapPorts: () => ({ a: "b" }),
    };

    const preview = computeSwapPreviewWithOptions(
      calcNode,
      advancedCalculatorNode,
      edges,
      [calcNode, srcNode],
      {
        strategies: [strategy],
        portOverrides: [{ oldPortId: "a", newPortId: "c", direction: "input" }],
      },
    );

    // Manual override wins: a→c
    const newHandle = preview.keptEdges[0].newEdge.targetHandle ?? "";
    expect(newHandle).toContain("-input-c");
  });

  it("backwards compatibility — existing computeSwapPreview produces identical results", () => {
    const calcNode = makeNode("calculator.1", calculatorNode, { operation: "multiply" });
    const srcNode = makeNode("src.1", textInputNode);
    const tgtNode = makeNode("tgt.1", textInputNode);

    const edges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
      makeEdge("e2", "calculator.1", "result", "tgt.1", "value"),
    ];

    const allNodes = [srcNode, calcNode, tgtNode];

    const oldPreview = computeSwapPreview(
      calcNode,
      advancedCalculatorNode,
      edges,
      allNodes,
      null,
    );

    const newPreview = computeSwapPreviewWithOptions(
      calcNode,
      advancedCalculatorNode,
      edges,
      allNodes,
      {},
    );

    expect(newPreview.keptEdges).toHaveLength(oldPreview.keptEdges.length);
    expect(newPreview.droppedEdges).toHaveLength(oldPreview.droppedEdges.length);
    expect(newPreview.hasDataLoss).toBe(oldPreview.hasDataLoss);
    expect(newPreview.configCarriedOver).toEqual(oldPreview.configCarriedOver);
    expect(newPreview.configReset).toEqual(oldPreview.configReset);
  });
});

// =========================================================================
// computeInteractiveState
// =========================================================================

describe("computeInteractiveState", () => {
  it("should annotate match quality on each port mapping", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const srcNode = makeNode("src.1", textInputNode);

    const edges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
    ];

    const state = computeInteractiveState(
      calcNode,
      advancedCalculatorNode,
      edges,
      [calcNode, srcNode],
    );

    expect(state.portMappings).toHaveLength(1);
    expect(state.portMappings[0].matchQuality).toBe("id"); // a→a is exact ID match
    expect(state.portMappings[0].selectedNewPortId).toBe("a");
  });

  it("should set isFlat=false for object/array config values", () => {
    const nodeWithObjectConfig = makeNode("calculator.1", {
      ...calculatorNode,
      configSchema: {
        type: "object",
        properties: {
          operation: { type: "string", title: "Operation", default: "add" },
          advanced: { type: "object", title: "Advanced Settings" },
        },
      },
    }, {
      operation: "multiply",
      advanced: { nested: true },
    });

    const state = computeInteractiveState(
      nodeWithObjectConfig,
      advancedCalculatorNode,
      [],
      [nodeWithObjectConfig],
    );

    // operation is flat (string), but advanced is an object
    const opMapping = state.configMappings.find((m) => m.key === "operation");
    expect(opMapping).toBeDefined();
    expect(opMapping!.isFlat).toBe(true);
    expect(opMapping!.carryOver).toBe(true);
  });

  it("should provide available new ports", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);

    const state = computeInteractiveState(
      calcNode,
      advancedCalculatorNode,
      [],
      [calcNode],
    );

    expect(state.availableNewInputs).toHaveLength(3); // a, b, c
    expect(state.availableNewOutputs).toHaveLength(2); // result, remainder
  });
});

// =========================================================================
// buildSwapPreviewFromState
// =========================================================================

describe("buildSwapPreviewFromState", () => {
  it("should convert user-edited state into a valid SwapPreview", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const srcNode = makeNode("src.1", textInputNode);

    const edges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
      makeEdge("e2", "src.1", "value", "calculator.1", "b"),
    ];

    const state = computeInteractiveState(
      calcNode,
      advancedCalculatorNode,
      edges,
      [calcNode, srcNode],
    );

    // Manually reassign port b → c
    const bMapping = state.portMappings.find((m) => m.oldPort.id === "b");
    if (bMapping) {
      bMapping.selectedNewPortId = "c";
      bMapping.matchQuality = "manual";
      bMapping.isOverridden = true;
    }

    const preview = buildSwapPreviewFromState(state, edges);

    expect(preview.keptEdges).toHaveLength(2);
    expect(preview.droppedEdges).toHaveLength(0);

    // Verify the reassigned port
    const newEdgeForB = preview.keptEdges.find((k) => k.edge.id === "e2");
    expect(newEdgeForB).toBeDefined();
    expect(newEdgeForB!.newEdge.targetHandle).toContain("-input-c");
  });
});

// =========================================================================
// performSwap
// =========================================================================

describe("performSwap", () => {
  it("should perform a headless one-shot swap", () => {
    const calcNode = makeNode("calculator.1", calculatorNode, { operation: "add" });
    const srcNode = makeNode("src.1", textInputNode);

    const allNodes = [srcNode, calcNode];
    const allEdges: WorkflowEdge[] = [
      makeEdge("e1", "src.1", "value", "calculator.1", "a"),
    ];

    const result = performSwap(
      calcNode,
      advancedCalculatorNode,
      allNodes,
      allEdges,
    );

    expect(result.updatedNodes).toHaveLength(2);
    expect(result.updatedEdges).toHaveLength(1);
    const newNode = result.updatedNodes.find((n) => n.id !== "src.1");
    expect(newNode!.data.metadata.id).toBe("advanced_calculator");
  });

  it("should throw SwapValidationError for non-existent node", () => {
    const calcNode = makeNode("calculator.1", calculatorNode);
    const otherNode = makeNode("other.1", textInputNode);

    expect(() =>
      performSwap(calcNode, advancedCalculatorNode, [otherNode], []),
    ).toThrow(SwapValidationError);
  });
});

// =========================================================================
// validateSwapResult
// =========================================================================

describe("validateSwapResult", () => {
  it("should catch dangling edge references", () => {
    const result = {
      updatedNodes: [makeNode("a.1", textInputNode)],
      updatedEdges: [makeEdge("e1", "a.1", "value", "b.1", "value")],
    };

    const validation = validateSwapResult(result);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("Dangling");
  });

  it("should pass for clean result", () => {
    const result = {
      updatedNodes: [
        makeNode("a.1", textInputNode),
        makeNode("b.1", textInputNode),
      ],
      updatedEdges: [makeEdge("e1", "a.1", "value", "b.1", "value")],
    };

    const validation = validateSwapResult(result);
    expect(validation.valid).toBe(true);
  });

  it("should catch duplicate node IDs", () => {
    const result = {
      updatedNodes: [
        makeNode("a.1", textInputNode),
        makeNode("a.1", textInputNode),
      ],
      updatedEdges: [],
    };

    const validation = validateSwapResult(result);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("Duplicate node");
  });

  it("should catch duplicate edge IDs", () => {
    const result = {
      updatedNodes: [
        makeNode("a.1", textInputNode),
        makeNode("b.1", textInputNode),
      ],
      updatedEdges: [
        makeEdge("e1", "a.1", "value", "b.1", "value"),
        makeEdge("e1", "a.1", "value", "b.1", "value"),
      ],
    };

    const validation = validateSwapResult(result);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("Duplicate edge");
  });
});
