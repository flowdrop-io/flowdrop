/**
 * Test fixtures for node metadata
 *
 * Reusable node type definitions for testing.
 */

import type { NodeMetadata } from "$lib/types";

/**
 * Basic text input node
 */
export const textInputNode: NodeMetadata = {
  id: "text_input",
  name: "Text Input",
  description: "Accept text input from user",
  category: "inputs",
  version: "1.0.0",
  type: "default",
  icon: "mdi:text-box",
  color: "#3b82f6",
  inputs: [],
  outputs: [
    {
      id: "value",
      name: "Value",
      type: "output",
      dataType: "string",
      description: "The input text value",
    },
  ],
  configSchema: {
    type: "object",
    properties: {
      defaultValue: {
        type: "string",
        title: "Default Value",
        description: "Initial value for the input",
        default: "",
      },
      placeholder: {
        type: "string",
        title: "Placeholder",
        description: "Placeholder text",
        default: "Enter text...",
      },
      required: {
        type: "boolean",
        title: "Required",
        description: "Whether input is required",
        default: false,
      },
    },
  },
  tags: ["input", "text", "user-input"],
};

/**
 * Calculator node for testing processing
 */
export const calculatorNode: NodeMetadata = {
  id: "calculator",
  name: "Calculator",
  description: "Perform mathematical operations",
  category: "processing",
  version: "1.0.0",
  type: "default",
  icon: "mdi:calculator",
  color: "#10b981",
  inputs: [
    {
      id: "a",
      name: "Number A",
      type: "input",
      dataType: "number",
      required: true,
    },
    {
      id: "b",
      name: "Number B",
      type: "input",
      dataType: "number",
      required: true,
    },
  ],
  outputs: [
    {
      id: "result",
      name: "Result",
      type: "output",
      dataType: "number",
    },
  ],
  configSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        title: "Operation",
        enum: ["add", "subtract", "multiply", "divide"],
        default: "add",
      },
    },
    required: ["operation"],
  },
  tags: ["math", "calculator", "processing"],
};

/**
 * Gateway node for conditional branching
 */
export const gatewayNode: NodeMetadata = {
  id: "gateway",
  name: "Gateway",
  description: "Route data based on conditions",
  category: "control",
  version: "1.0.0",
  type: "gateway",
  icon: "mdi:call-split",
  color: "#f59e0b",
  inputs: [
    {
      id: "input",
      name: "Input",
      type: "input",
      dataType: "mixed",
      required: true,
    },
  ],
  outputs: [],
  configSchema: {
    type: "object",
    properties: {
      branches: {
        type: "array",
        title: "Branches",
        description: "Conditional branches",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              title: "Branch ID",
            },
            label: {
              type: "string",
              title: "Label",
            },
            condition: {
              type: "string",
              title: "Condition",
            },
            isDefault: {
              type: "boolean",
              title: "Default Branch",
              default: false,
            },
          },
          required: ["name", "label"],
        },
      },
    },
  },
  tags: ["control", "branching", "conditional"],
};

/**
 * Terminal node (start/end)
 */
export const terminalNode: NodeMetadata = {
  id: "terminal",
  name: "Terminal",
  description: "Workflow start or end point",
  category: "control",
  version: "1.0.0",
  type: "terminal",
  icon: "mdi:circle",
  color: "#8b5cf6",
  inputs: [],
  outputs: [
    {
      id: "trigger",
      name: "Trigger",
      type: "output",
      dataType: "trigger",
    },
  ],
  configSchema: {
    type: "object",
    properties: {
      terminalType: {
        type: "string",
        title: "Type",
        enum: ["start", "end", "exit"],
        default: "start",
      },
    },
  },
  tags: ["control", "terminal", "start", "end"],
};

/**
 * Note node for documentation
 */
export const noteNode: NodeMetadata = {
  id: "note",
  name: "Note",
  description: "Add documentation notes",
  category: "helpers",
  version: "1.0.0",
  type: "note",
  icon: "mdi:note-text",
  color: "#f97316",
  inputs: [],
  outputs: [],
  configSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        title: "Content",
        format: "multiline",
        default: "# Note\n\nAdd your notes here...",
      },
    },
  },
  tags: ["documentation", "note", "markdown"],
};

/**
 * Node with dynamic inputs/outputs
 */
export const dynamicNode: NodeMetadata = {
  id: "dynamic_processor",
  name: "Dynamic Processor",
  description: "Node with user-defined ports",
  category: "processing",
  version: "1.0.0",
  type: "default",
  icon: "mdi:tune",
  color: "#06b6d4",
  inputs: [
    {
      id: "data",
      name: "Data",
      type: "input",
      dataType: "mixed",
    },
  ],
  outputs: [
    {
      id: "output",
      name: "Output",
      type: "output",
      dataType: "mixed",
    },
  ],
  configSchema: {
    type: "object",
    properties: {
      dynamicInputs: {
        type: "array",
        title: "Dynamic Inputs",
        items: {
          type: "object",
          properties: {
            name: { type: "string", title: "Port ID" },
            label: { type: "string", title: "Label" },
            dataType: { type: "string", title: "Data Type", default: "string" },
            required: { type: "boolean", title: "Required", default: false },
          },
          required: ["name", "label"],
        },
      },
      dynamicOutputs: {
        type: "array",
        title: "Dynamic Outputs",
        items: {
          type: "object",
          properties: {
            name: { type: "string", title: "Port ID" },
            label: { type: "string", title: "Label" },
            dataType: { type: "string", title: "Data Type", default: "string" },
          },
          required: ["name", "label"],
        },
      },
    },
  },
  tags: ["dynamic", "flexible", "processing"],
};

// =========================================================================
// Swap-specific test fixtures
// =========================================================================

/**
 * Advanced calculator — overlapping ports/config with calculatorNode (for swap testing)
 */
export const advancedCalculatorNode: NodeMetadata = {
  id: "advanced_calculator",
  name: "Advanced Calculator",
  description: "Perform advanced mathematical operations",
  category: "processing",
  version: "2.0.0",
  type: "default",
  icon: "mdi:calculator-variant",
  color: "#10b981",
  inputs: [
    {
      id: "a",
      name: "Number A",
      type: "input",
      dataType: "number",
      required: true,
    },
    {
      id: "b",
      name: "Number B",
      type: "input",
      dataType: "number",
      required: true,
    },
    {
      id: "c",
      name: "Number C",
      type: "input",
      dataType: "number",
    },
  ],
  outputs: [
    {
      id: "result",
      name: "Result",
      type: "output",
      dataType: "number",
    },
    {
      id: "remainder",
      name: "Remainder",
      type: "output",
      dataType: "number",
    },
  ],
  configSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        title: "Operation",
        enum: ["add", "subtract", "multiply", "divide", "modulo"],
        default: "add",
      },
      precision: {
        type: "number",
        title: "Precision",
        default: 2,
      },
    },
  },
  tags: ["math", "calculator", "advanced"],
};

/**
 * Version upgrade of calculator (same id, higher version)
 */
export const calculatorNodeV2: NodeMetadata = {
  ...calculatorNode,
  version: "2.0.0",
  configSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        title: "Operation",
        enum: ["add", "subtract", "multiply", "divide", "power"],
        default: "add",
      },
      precision: {
        type: "number",
        title: "Precision",
        default: 2,
      },
    },
    required: ["operation"],
  },
};

/**
 * Node with completely different ports (for data loss testing)
 */
export const textFormatterNode: NodeMetadata = {
  id: "text_formatter",
  name: "Text Formatter",
  description: "Format text strings",
  category: "processing",
  version: "1.0.0",
  type: "default",
  icon: "mdi:format-text",
  color: "#f59e0b",
  inputs: [
    {
      id: "text",
      name: "Text",
      type: "input",
      dataType: "string",
      required: true,
    },
  ],
  outputs: [
    {
      id: "formatted",
      name: "Formatted",
      type: "output",
      dataType: "string",
    },
  ],
  configSchema: {
    type: "object",
    properties: {
      format: {
        type: "string",
        title: "Format",
        default: "uppercase",
      },
    },
  },
  tags: ["text", "formatting"],
};

/**
 * Node with ports that match by name but not ID (for name-based matching tests)
 */
export const mathProcessorNode: NodeMetadata = {
  id: "math_processor",
  name: "Math Processor",
  description: "Process mathematical expressions",
  category: "processing",
  version: "1.0.0",
  type: "default",
  icon: "mdi:function-variant",
  color: "#8b5cf6",
  inputs: [
    {
      id: "num_a",
      name: "Number A",
      type: "input",
      dataType: "number",
    },
    {
      id: "num_b",
      name: "Number B",
      type: "input",
      dataType: "number",
    },
  ],
  outputs: [
    {
      id: "answer",
      name: "Result",
      type: "output",
      dataType: "number",
    },
  ],
  configSchema: {
    type: "object",
    properties: {},
  },
  tags: ["math", "processing"],
};

/**
 * Node with no ports at all (for edge case testing)
 */
export const isolatedNode: NodeMetadata = {
  id: "isolated",
  name: "Isolated Node",
  description: "A node with no ports",
  category: "helpers",
  version: "1.0.0",
  type: "default",
  icon: "mdi:circle-outline",
  color: "#6b7280",
  inputs: [],
  outputs: [],
  configSchema: {
    type: "object",
    properties: {},
  },
  tags: ["isolated"],
};

/**
 * Collection of all test nodes
 */
export const testNodes = {
  textInput: textInputNode,
  calculator: calculatorNode,
  gateway: gatewayNode,
  terminal: terminalNode,
  note: noteNode,
  dynamic: dynamicNode,
  advancedCalculator: advancedCalculatorNode,
  calculatorV2: calculatorNodeV2,
  textFormatter: textFormatterNode,
  mathProcessor: mathProcessorNode,
  isolated: isolatedNode,
};

/**
 * Array of all test nodes (for API responses)
 */
export const testNodesList: NodeMetadata[] = Object.values(testNodes);
