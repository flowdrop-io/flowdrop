/**
 * Sample data for FlowDrop development and testing
 * Full set matching Langflow's default categories and node types
 */

import type { NodeMetadata, Workflow, WorkflowNode, WorkflowEdge } from "../types/index.js";
import { CATEGORY_ICONS } from "../utils/icons.js";

/**
 * Sample node data for development and testing
 * These represent the available node types in the workflow editor
 */
export const sampleNodes: NodeMetadata[] = [
  // ===== INPUTS CATEGORY =====
  {
    id: "sample-text-input",
    name: "Text Input",
    type: "simple",
    supportedTypes: ["simple", "default"],
    version: "1.0.0",
    description: "User text input field",
    category: "inputs",
    icon: "mdi:text-box",
    color: "#10b981",
    inputs: [],
    outputs: [
      {
        id: "text",
        name: "Text",
        type: "output",
        dataType: "string",
        description: "User entered text"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "simple",
          enum: ["simple", "square", "default"],
          enumNames: ["Simple (compact layout)", "Square (square layout)", "Default (standard workflow node)"]
        },
        placeholder: {
          type: "string",
          title: "Placeholder",
          description: "Placeholder text for the input field",
          default: "Enter text..."
        },
        defaultValue: {
          type: "string",
          title: "Default Value",
          description: "Default text value",
          default: ""
        }
      }
    },
    tags: ["input", "text", "user"]
  },
  {
    id: "sample-file-upload",
    name: "File Upload",
    type: "simple",
    supportedTypes: ["simple", "default"],
    version: "1.0.0",
    description: "File upload input with drag and drop support",
    category: "inputs",
    icon: "mdi:file-upload",
    color: "#f59e0b",
    inputs: [],
    outputs: [
      {
        id: "file",
        name: "File",
        type: "output",
        dataType: "file",
        description: "Uploaded file data"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "simple",
          enum: ["simple", "square", "default"],
          enumNames: ["Simple (compact layout)", "Square (square layout)", "Default (standard workflow node)"]
        },
        accept: {
          type: "string",
          title: "Accepted File Types",
          description: "Comma-separated list of accepted file types",
          default: "*"
        },
        maxSize: {
          type: "number",
          title: "Maximum File Size (MB)",
          description: "Maximum file size in megabytes",
          default: 10
        }
      }
    },
    tags: ["input", "file", "upload"]
  },
  {
    id: "sample-webhook",
    name: "Webhook",
    type: "simple",
    supportedTypes: ["simple", "default"],
    version: "1.0.0",
    description: "Receive data from external webhooks",
    category: "inputs",
    icon: "mdi:webhook",
    color: "#8b5cf6",
    inputs: [],
    outputs: [
      {
        id: "data",
        name: "Data",
        type: "output",
        dataType: "json",
        description: "Webhook payload data"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "simple",
          enum: ["simple", "square", "default"],
          enumNames: ["Simple (compact layout)", "Square (square layout)", "Default (standard workflow node)"]
        },
        endpoint: {
          type: "string",
          title: "Endpoint",
          description: "Webhook endpoint URL",
          default: ""
        },
        method: {
          type: "string",
          title: "HTTP Method",
          description: "HTTP method for the webhook",
          default: "POST",
          enum: ["GET", "POST", "PUT", "DELETE"]
        }
      }
    },
    tags: ["input", "webhook", "external"]
  },

  // ===== OUTPUTS CATEGORY =====
  {
    id: "sample-chat-output",
    name: "Chat Output",
    type: "simple",
    supportedTypes: ["simple", "default"],
    version: "1.0.0",
    description: "Display chat-style output with formatting",
    category: "outputs",
    icon: "mdi:chat",
    color: "#8b5cf6",
    inputs: [
      {
        id: "message",
        name: "Message",
        type: "input",
        dataType: "string",
        required: true,
        description: "Message to display"
      }
    ],
    outputs: [],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "simple",
          enum: ["simple", "square", "default"],
          enumNames: ["Simple (compact layout)", "Square (square layout)", "Default (standard workflow node)"]
        },
        showTimestamp: {
          type: "boolean",
          title: "Show Timestamp",
          description: "Display timestamp with messages",
          default: true
        },
        maxLength: {
          type: "number",
          title: "Maximum Length",
          description: "Maximum message length",
          default: 2000
        },
        markdown: {
          type: "boolean",
          title: "Markdown Support",
          description: "Enable markdown formatting",
          default: true
        }
      }
    },
    tags: ["output", "chat", "display"]
  },
  {
    id: "sample-text-output",
    name: "Text Output",
    type: "simple",
    supportedTypes: ["simple", "default"],
    version: "1.0.0",
    description: "Display plain text output",
    category: "outputs",
    icon: "mdi:text-box",
    color: "#10b981",
    inputs: [
      {
        id: "text",
        name: "Text",
        type: "input",
        dataType: "string",
        required: true,
        description: "Text to display"
      }
    ],
    outputs: [],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "simple",
          enum: ["simple", "square", "default"],
          enumNames: ["Simple (compact layout)", "Square (square layout)", "Default (standard workflow node)"]
        },
        showTimestamp: {
          type: "boolean",
          title: "Show Timestamp",
          description: "Display timestamp with output",
          default: false
        },
        maxLength: {
          type: "number",
          title: "Maximum Length",
          description: "Maximum text length",
          default: 1000
        }
      }
    },
    tags: ["output", "text", "display"]
  },

  // ===== PROMPTS CATEGORY =====
  {
    id: "sample-prompt",
    name: "Prompt",
    type: "simple",
    supportedTypes: ["simple", "default"],
    version: "1.0.0",
    description: "Template-based prompt with variables",
    category: "prompts",
    icon: "mdi:message-text",
    color: "#f59e0b",
    inputs: [
      {
        id: "variables",
        name: "Variables",
        type: "input",
        dataType: "json",
        required: false,
        description: "Variables to inject into template"
      }
    ],
    outputs: [
      {
        id: "prompt",
        name: "Prompt",
        type: "output",
        dataType: "string",
        description: "Formatted prompt text"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "simple",
          enum: ["simple", "square", "default"],
          enumNames: ["Simple (compact layout)", "Square (square layout)", "Default (standard workflow node)"]
        },
        template: {
          type: "string",
          title: "Template",
          description: "Prompt template with variables",
          default: "You are a helpful assistant. {input}"
        },
        variables: {
          type: "array",
          title: "Variables",
          description: "List of available variables",
          default: []
        }
      }
    },
    tags: ["prompt", "template", "variables"]
  },
  {
    id: "sample-structured-output",
    name: "Structured Output",
    type: "default",
    supportedTypes: ["default"],
    version: "1.0.0",
    description: "Generate structured output from models",
    category: "prompts",
    icon: "mdi:table",
    color: "#6366f1",
    inputs: [
      {
        id: "model",
        name: "Model",
        type: "input",
        dataType: "json",
        required: true,
        description: "Model to use"
      },
      {
        id: "message",
        name: "Message",
        type: "input",
        dataType: "string",
        required: true,
        description: "Input message"
      }
    ],
    outputs: [
      {
        id: "dataframe",
        name: "DataFrame",
        type: "output",
        dataType: "json",
        description: "Structured output as DataFrame"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        schema: {
          type: "object",
          title: "Schema",
          description: "JSON schema for structured output",
          default: {}
        },
        outputType: {
          type: "string",
          title: "Output Type",
          description: "Type of structured output",
          default: "json",
          enum: ["json", "xml", "yaml"]
        }
      }
    },
    tags: ["prompt", "structured", "output", "schema"]
  },

  // ===== MODELS CATEGORY =====
  {
    id: "sample-openai",
    name: "OpenAI",
    type: "default",
    supportedTypes: ["default"],
    version: "1.0.0",
    description: "OpenAI GPT models for text generation",
    category: "models",
    icon: "mdi:robot",
    color: "#10a37f",
    inputs: [
      {
        id: "prompt",
        name: "Prompt",
        type: "input",
        dataType: "string",
        required: true,
        description: "Input prompt for the model"
      },
      {
        id: "system_message",
        name: "System Message",
        type: "input",
        dataType: "string",
        required: false,
        description: "System message to set behavior"
      }
    ],
    outputs: [
      {
        id: "response",
        name: "Response",
        type: "output",
        dataType: "string",
        description: "Model response"
      },
      {
        id: "usage",
        name: "Usage",
        type: "output",
        dataType: "json",
        description: "Token usage information"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          title: "Model",
          description: "OpenAI model to use",
          default: "gpt-3.5-turbo",
          enum: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]
        },
        temperature: {
          type: "number",
          title: "Temperature",
          description: "Creativity level (0-2)",
          default: 0.7,
          minimum: 0,
          maximum: 2
        },
        maxTokens: {
          type: "number",
          title: "Max Tokens",
          description: "Maximum tokens to generate",
          default: 1000,
          minimum: 1,
          maximum: 4000
        },
        apiKey: {
          type: "string",
          title: "API Key",
          description: "OpenAI API key",
          default: ""
        }
      }
    },
    tags: ["model", "openai", "gpt", "chat"]
  },
  {
    id: "sample-anthropic",
    name: "Anthropic",
    type: "default",
    supportedTypes: ["default"],
    version: "1.0.0",
    description: "Anthropic Claude models for text generation",
    category: "models",
    icon: "mdi:brain",
    color: "#7c3aed",
    inputs: [
      {
        id: "prompt",
        name: "Prompt",
        type: "input",
        dataType: "string",
        required: true,
        description: "Input prompt for the model"
      }
    ],
    outputs: [
      {
        id: "response",
        name: "Response",
        type: "output",
        dataType: "string",
        description: "Model response"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          title: "Model",
          description: "Anthropic model to use",
          default: "claude-3-sonnet-20240229",
          enum: ["claude-3-sonnet-20240229", "claude-3-opus-20240229", "claude-3-haiku-20240307"]
        },
        temperature: {
          type: "number",
          title: "Temperature",
          description: "Creativity level (0-1)",
          default: 0.7,
          minimum: 0,
          maximum: 1
        },
        maxTokens: {
          type: "number",
          title: "Max Tokens",
          description: "Maximum tokens to generate",
          default: 1000,
          minimum: 1,
          maximum: 4000
        },
        apiKey: {
          type: "string",
          title: "API Key",
          description: "Anthropic API key",
          default: ""
        }
      }
    },
    tags: ["model", "anthropic", "claude"]
  },
  {
    id: "sample-groq",
    name: "Groq",
    type: "default",
    supportedTypes: ["default"],
    version: "1.0.0",
    description: "Groq fast inference models",
    category: "models",
    icon: "mdi:lightning-bolt",
    color: "#f97316",
    inputs: [
      {
        id: "prompt",
        name: "Prompt",
        type: "input",
        dataType: "string",
        required: true,
        description: "Input prompt for the model"
      }
    ],
    outputs: [
      {
        id: "response",
        name: "Response",
        type: "output",
        dataType: "string",
        description: "Model response"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          title: "Model",
          description: "Groq model to use",
          default: "llama-3.1-8b-instant",
          enum: ["llama-3.1-8b-instant", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"]
        },
        temperature: {
          type: "number",
          title: "Temperature",
          description: "Creativity level (0-1)",
          default: 0.7,
          minimum: 0,
          maximum: 1
        },
        maxTokens: {
          type: "number",
          title: "Max Tokens",
          description: "Maximum tokens to generate",
          default: 1000,
          minimum: 1,
          maximum: 4000
        },
        apiKey: {
          type: "string",
          title: "API Key",
          description: "Groq API key",
          default: ""
        }
      }
    },
    tags: ["model", "groq", "fast", "inference"]
  },

  // ===== PROCESSING CATEGORY =====
  {
    id: "sample-split-text",
    name: "Split Text",
    type: "default",
    supportedTypes: ["default"],
    version: "1.0.0",
    description: "Split text into chunks for processing",
    category: "processing",
    icon: "mdi:content-cut",
    color: "#f59e0b",
    inputs: [
      {
        id: "text",
        name: "Text",
        type: "input",
        dataType: "string",
        required: true,
        description: "Text to split"
      }
    ],
    outputs: [
      {
        id: "chunks",
        name: "Chunks",
        type: "output",
        dataType: "string[]",
        description: "Split text chunks"
      },
      {
        id: "dataframe",
        name: "DataFrame",
        type: "output",
        dataType: "json",
        description: "Chunks as structured data"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        chunkSize: {
          type: "number",
          title: "Chunk Size",
          description: "Size of each text chunk",
          default: 1000,
          minimum: 1,
          maximum: 10000
        },
        chunkOverlap: {
          type: "number",
          title: "Chunk Overlap",
          description: "Overlap between chunks",
          default: 200,
          minimum: 0,
          maximum: 1000
        },
        separator: {
          type: "string",
          title: "Separator",
          description: "Text separator for splitting",
          default: "\n"
        }
      }
    },
    tags: ["processing", "text", "split", "chunking"]
  },
  {
    id: "sample-data-operations",
    name: "Data Operations",
    version: "1.0.0",
    description: "Perform operations on Data objects",
    category: "processing",
    icon: "mdi:database-cog",
    color: "#6366f1",
    inputs: [
      {
        id: "data",
        name: "Data",
        type: "input",
        dataType: "json",
        required: true,
        description: "Data to operate on"
      }
    ],
    outputs: [
      {
        id: "result",
        name: "Result",
        type: "output",
        dataType: "json",
        description: "Processed data result"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          title: "Operation",
          description: "Data operation to perform",
          default: "select_keys",
          enum: ["select_keys", "filter", "sort", "group"]
        },
        keys: {
          type: "array",
          title: "Keys",
          description: "Keys to select or filter by",
          default: []
        },
        filterKey: {
          type: "string",
          title: "Filter Key",
          description: "Key to filter by",
          default: ""
        },
        filterValue: {
          type: "string",
          title: "Filter Value",
          description: "Value to filter by",
          default: ""
        }
      }
    },
    tags: ["processing", "data", "operations"]
  },
  {
    id: "sample-dataframe-operations",
    name: "DataFrame Operations",
    version: "1.0.0",
    description: "Perform operations on DataFrames",
    category: "processing",
    icon: "mdi:table-cog",
    color: "#84cc16",
    inputs: [
      {
        id: "dataframe",
        name: "DataFrame",
        type: "input",
        dataType: "json",
        required: true,
        description: "DataFrame to operate on"
      }
    ],
    outputs: [
      {
        id: "result",
        name: "Result",
        type: "output",
        dataType: "json",
        description: "Processed DataFrame"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          title: "Operation",
          description: "DataFrame operation to perform",
          default: "filter",
          enum: ["filter", "sort", "group", "aggregate"]
        },
        columnName: {
          type: "string",
          title: "Column Name",
          description: "Column to operate on",
          default: ""
        },
        filterValue: {
          type: "string",
          title: "Filter Value",
          description: "Value to filter by",
          default: ""
        },
        ascending: {
          type: "boolean",
          title: "Ascending",
          description: "Sort in ascending order",
          default: true
        }
      }
    },
    tags: ["processing", "dataframe", "table", "operations"]
  },
  {
    id: "sample-regex-extractor",
    name: "Regex Extractor",
    version: "1.0.0",
    description: "Extract patterns using regular expressions",
    category: "processing",
    icon: "mdi:regex",
    color: "#ec4899",
    inputs: [
      {
        id: "text",
        name: "Text",
        type: "input",
        dataType: "string",
        required: true,
        description: "Text to extract from"
      }
    ],
    outputs: [
      {
        id: "matches",
        name: "Matches",
        type: "output",
        dataType: "string[]",
        description: "Extracted matches"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          title: "Pattern",
          description: "Regular expression pattern",
          default: ""
        },
        flags: {
          type: "string",
          title: "Flags",
          description: "Regex flags",
          default: "g",
          enum: ["g", "i", "m", "gi", "gm", "im", "gim"]
        }
      }
    },
    tags: ["processing", "regex", "extract", "pattern"]
  },
  {
    id: "sample-smart-function",
    name: "Smart Function",
    version: "1.0.0",
    description: "Use models to generate data processing functions",
    category: "processing",
    icon: "mdi:function-variant",
    color: "#06b6d4",
    inputs: [
      {
        id: "data",
        name: "Data",
        type: "input",
        dataType: "json",
        required: true,
        description: "Data to process"
      },
      {
        id: "model",
        name: "Model",
        type: "input",
        dataType: "json",
        required: true,
        description: "Model for function generation"
      }
    ],
    outputs: [
      {
        id: "filtered_data",
        name: "Filtered Data",
        type: "output",
        dataType: "json",
        description: "Processed data"
      },
      {
        id: "dataframe",
        name: "DataFrame",
        type: "output",
        dataType: "json",
        description: "Processed data as DataFrame"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        filter_instruction: {
          type: "string",
          title: "Filter Instruction",
          description: "Instruction for filtering data",
          default: ""
        },
        sample_size: {
          type: "number",
          title: "Sample Size",
          description: "Number of samples to process",
          default: 1000,
          minimum: 1,
          maximum: 10000
        },
        max_size: {
          type: "number",
          title: "Max Size",
          description: "Maximum size of filtered data",
          default: 10000,
          minimum: 1,
          maximum: 100000
        }
      }
    },
    tags: ["processing", "smart", "function", "model"]
  },

  // ===== LOGIC CATEGORY =====
  {
    id: "sample-if-else",
    name: "If-Else",
    version: "1.0.0",
    description: "Conditional routing based on text comparison",
    category: "logic",
    icon: "mdi:git-branch",
    color: "#06b6d4",
    inputs: [
      {
        id: "input_text",
        name: "Input Text",
        type: "input",
        dataType: "string",
        required: true,
        description: "Text to evaluate"
      },
      {
        id: "match_text",
        name: "Match Text",
        type: "input",
        dataType: "string",
        required: true,
        description: "Text to compare against"
      }
    ],
    outputs: [
      {
        id: "true_result",
        name: "True",
        type: "output",
        dataType: "string",
        description: "Output when condition is true"
      },
      {
        id: "false_result",
        name: "False",
        type: "output",
        dataType: "string",
        description: "Output when condition is false"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        operator: {
          type: "string",
          title: "Operator",
          description: "Comparison operator",
          default: "equals",
          enum: ["equals", "not_equals", "greater_than", "less_than", "contains"]
        },
        caseSensitive: {
          type: "boolean",
          title: "Case Sensitive",
          description: "Whether comparison is case sensitive",
          default: false
        }
      }
    },
    tags: ["conditional", "logic", "routing", "if-else"]
  },
  {
    id: "sample-loop",
    name: "Loop",
    version: "1.0.0",
    description: "Iterate over data items",
    category: "logic",
    icon: "mdi:loop",
    color: "#8b5cf6",
    inputs: [
      {
        id: "data",
        name: "Data",
        type: "input",
        dataType: "json[]",
        required: true,
        description: "Data to iterate over"
      }
    ],
    outputs: [
      {
        id: "item",
        name: "Item",
        type: "output",
        dataType: "json",
        description: "Current item in iteration"
      },
      {
        id: "done",
        name: "Done",
        type: "output",
        dataType: "json",
        description: "Aggregated results when complete"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        maxIterations: {
          type: "number",
          title: "Max Iterations",
          description: "Maximum number of loop iterations",
          default: 100,
          minimum: 1,
          maximum: 1000
        }
      }
    },
    tags: ["conditional", "logic", "loop", "iteration"]
  },

  // ===== DATA CATEGORY =====
  {
    id: "sample-data-to-dataframe",
    name: "Data to DataFrame",
    version: "1.0.0",
    description: "Convert Data objects to DataFrame",
    category: "data",
    icon: "mdi:table-plus",
    color: "#10b981",
    inputs: [
      {
        id: "data_list",
        name: "Data List",
        type: "input",
        dataType: "json[]",
        required: true,
        description: "List of Data objects to convert"
      }
    ],
    outputs: [
      {
        id: "dataframe",
        name: "DataFrame",
        type: "output",
        dataType: "json",
        description: "Converted DataFrame"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        includeText: {
          type: "boolean",
          title: "Include Text",
          description: "Include text in DataFrame conversion",
          default: true
        }
      }
    },
    tags: ["data", "dataframe", "convert", "table"]
  },
  {
    id: "sample-message-to-data",
    name: "Message to Data",
    version: "1.0.0",
    description: "Convert Message objects to Data objects",
    category: "data",
    icon: "mdi:message-arrow-right",
    color: "#f59e0b",
    inputs: [
      {
        id: "message",
        name: "Message",
        type: "input",
        dataType: "string",
        required: true,
        description: "Message to convert"
      }
    ],
    outputs: [
      {
        id: "data",
        name: "Data",
        type: "output",
        dataType: "json",
        description: "Converted Data object"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          title: "Format",
          description: "Input data format",
          default: "auto",
          enum: ["auto", "json", "csv", "xml"]
        }
      }
    },
    tags: ["data", "message", "convert"]
  },
  {
    id: "sample-save-to-file",
    name: "Save to File",
    version: "1.0.0",
    description: "Save data to various file formats",
    category: "data",
    icon: "mdi:content-save",
    color: "#ef4444",
    inputs: [
      {
        id: "data",
        name: "Data",
        type: "input",
        dataType: "json",
        required: true,
        description: "Data to save"
      }
    ],
    outputs: [
      {
        id: "confirmation",
        name: "Confirmation",
        type: "output",
        dataType: "string",
        description: "Save confirmation message"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        fileFormat: {
          type: "string",
          title: "File Format",
          description: "Output file format",
          default: "json",
          enum: ["json", "csv", "txt", "xml"]
        },
        filePath: {
          type: "string",
          title: "File Path",
          description: "Output file path",
          default: "./output/data.json"
        }
      }
    },
    tags: ["data", "save", "file", "export"]
  },

  // ===== TOOLS CATEGORY =====
  {
    id: "sample-http-request",
    name: "HTTP Request",
    type: "tool",
    supportedTypes: ["tool", "default"],
    version: "1.0.0",
    description: "Advanced HTTP client with full request/response handling, similar to n8n",
    category: "tools",
    icon: "mdi:web",
    color: "#3b82f6",
    inputs: [
      {
        id: "url",
        name: "URL",
        type: "input",
        dataType: "string",
        required: false,
        description: "Request URL (can be set in config or via input)"
      },
      {
        id: "headers",
        name: "Headers",
        type: "input",
        dataType: "json",
        required: false,
        description: "Additional HTTP headers as JSON object"
      },
      {
        id: "body",
        name: "Body",
        type: "input",
        dataType: "mixed",
        required: false,
        description: "Request body (JSON, string, or form data)"
      },
      {
        id: "query_params",
        name: "Query Parameters",
        type: "input",
        dataType: "json",
        required: false,
        description: "URL query parameters as JSON object"
      }
    ],
    outputs: [
      {
        id: "response",
        name: "Response",
        type: "output",
        dataType: "json",
        description: "Complete HTTP response object"
      },
      {
        id: "body",
        name: "Body",
        type: "output",
        dataType: "mixed",
        description: "Response body (parsed JSON or raw text)"
      },
      {
        id: "headers",
        name: "Headers",
        type: "output",
        dataType: "json",
        description: "Response headers as JSON object"
      },
      {
        id: "status_code",
        name: "Status Code",
        type: "output",
        dataType: "number",
        description: "HTTP status code"
      },
      {
        id: "status_text",
        name: "Status Text",
        type: "output",
        dataType: "string",
        description: "HTTP status text"
      },
      {
        id: "tool",
        name: "Tool Interface",
        type: "output",
        dataType: "tool",
        description: "Tool interface for agent connections - provides tool metadata and callable interface"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "tool",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        method: {
          type: "string",
          title: "HTTP Method",
          description: "HTTP request method",
          default: "GET",
          enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
        },
        url: {
          type: "string",
          title: "URL",
          description: "Request URL (overridden by input if provided)",
          default: "https://api.example.com/endpoint"
        },
        authentication: {
          type: "string",
          title: "Authentication",
          description: "Authentication method",
          default: "none",
          enum: ["none", "basic", "bearer", "api_key", "oauth2"]
        },
        auth_username: {
          type: "string",
          title: "Username",
          description: "Username for basic authentication",
          default: ""
        },
        auth_password: {
          type: "string",
          title: "Password",
          description: "Password for basic authentication",
          default: "",
          format: "password"
        },
        auth_token: {
          type: "string",
          title: "Bearer Token",
          description: "Bearer token for authentication",
          default: "",
          format: "password"
        },
        api_key_header: {
          type: "string",
          title: "API Key Header",
          description: "Header name for API key authentication",
          default: "X-API-Key"
        },
        api_key_value: {
          type: "string",
          title: "API Key Value",
          description: "API key value",
          default: "",
          format: "password"
        },
        content_type: {
          type: "string",
          title: "Content Type",
          description: "Request content type",
          default: "application/json",
          enum: [
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data",
            "text/plain",
            "text/xml",
            "application/xml"
          ]
        },
        timeout: {
          type: "integer",
          title: "Timeout (seconds)",
          description: "Request timeout in seconds",
          default: 30,
          minimum: 1,
          maximum: 300
        },
        follow_redirects: {
          type: "boolean",
          title: "Follow Redirects",
          description: "Automatically follow HTTP redirects",
          default: true
        },
        ssl_verify: {
          type: "boolean",
          title: "Verify SSL",
          description: "Verify SSL certificates",
          default: true
        },
        retry_attempts: {
          type: "integer",
          title: "Retry Attempts",
          description: "Number of retry attempts on failure",
          default: 0,
          minimum: 0,
          maximum: 5
        },
        retry_delay: {
          type: "integer",
          title: "Retry Delay (ms)",
          description: "Delay between retry attempts in milliseconds",
          default: 1000,
          minimum: 100,
          maximum: 10000
        },
        response_format: {
          type: "string",
          title: "Response Format",
          description: "How to parse the response body",
          default: "auto",
          enum: ["auto", "json", "text", "binary", "xml"]
        },
        include_response_headers: {
          type: "boolean",
          title: "Include Response Headers",
          description: "Include response headers in output",
          default: true
        },
        custom_headers: {
          type: "string",
          title: "Custom Headers (JSON)",
          description: "Custom headers as JSON string",
          default: "{}",
          format: "multiline"
        },
        user_agent: {
          type: "string",
          title: "User Agent",
          description: "Custom User-Agent header",
          default: "FlowDrop-HTTP-Client/1.0"
        },
        proxy_url: {
          type: "string",
          title: "Proxy URL",
          description: "HTTP proxy URL (optional)",
          default: ""
        },
        ignore_ssl_issues: {
          type: "boolean",
          title: "Ignore SSL Issues",
          description: "Ignore SSL certificate errors (not recommended for production)",
          default: false
        }
      }
    },
    tags: ["tools", "http", "api", "request", "n8n", "automation", "integration"]
  },
  {
    id: "sample-json",
    name: "JSON",
    type: "tool",
    supportedTypes: ["tool", "default"],
    version: "1.0.0",
    description: "Parse, manipulate, and transform JSON data like n8n's JSON node",
    category: "tools",
    icon: "mdi:code-json",
    color: "#f59e0b",
    inputs: [
      {
        id: "json_input",
        name: "JSON Input",
        type: "input",
        dataType: "mixed",
        required: false,
        description: "JSON data to process"
      }
    ],
    outputs: [
      {
        id: "json_output",
        name: "JSON Output",
        type: "output",
        dataType: "json",
        description: "Processed JSON data"
      },
      {
        id: "tool",
        name: "Tool Interface",
        type: "output",
        dataType: "tool",
        description: "Tool interface for agent connections - provides tool metadata and callable interface"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "tool",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        operation: {
          type: "string",
          title: "Operation",
          description: "JSON operation to perform",
          default: "parse",
          enum: ["parse", "stringify", "extract", "merge", "filter", "transform", "validate"]
        },
        json_path: {
          type: "string",
          title: "JSON Path",
          description: "JSONPath expression for extraction (e.g., $.data.items[*].name)",
          default: "$"
        },
        merge_strategy: {
          type: "string",
          title: "Merge Strategy",
          description: "How to merge JSON objects",
          default: "deep",
          enum: ["shallow", "deep", "overwrite"]
        },
        filter_expression: {
          type: "string",
          title: "Filter Expression",
          description: "JavaScript expression for filtering (e.g., item.price > 100)",
          default: ""
        },
        transform_expression: {
          type: "string",
          title: "Transform Expression",
          description: "JavaScript expression for transformation",
          default: "",
          format: "multiline"
        },
        pretty_print: {
          type: "boolean",
          title: "Pretty Print",
          description: "Format JSON output with indentation",
          default: true
        },
        validate_schema: {
          type: "string",
          title: "JSON Schema",
          description: "JSON Schema for validation (optional)",
          default: "",
          format: "multiline"
        }
      }
    },
    tags: ["tools", "json", "data", "transform", "n8n", "parse"]
  },
  {
    id: "sample-set",
    name: "Set",
    type: "tool",
    supportedTypes: ["tool", "default"],
    version: "1.0.0",
    description: "Set and manipulate data values like n8n's Set node",
    category: "tools",
    icon: "mdi:variable",
    color: "#10b981",
    inputs: [
      {
        id: "input_data",
        name: "Input Data",
        type: "input",
        dataType: "mixed",
        required: false,
        description: "Input data to process"
      }
    ],
    outputs: [
      {
        id: "output_data",
        name: "Output Data",
        type: "output",
        dataType: "json",
        description: "Processed output data"
      },
      {
        id: "tool",
        name: "Tool Interface",
        type: "output",
        dataType: "tool",
        description: "Tool interface for agent connections - provides tool metadata and callable interface"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "tool",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        operation: {
          type: "string",
          title: "Operation",
          description: "Set operation to perform",
          default: "set",
          enum: ["set", "append", "prepend", "remove", "rename", "copy", "move"]
        },
        keep_only_set: {
          type: "boolean",
          title: "Keep Only Set Fields",
          description: "Only keep the fields that are being set",
          default: false
        },
        values: {
          type: "string",
          title: "Values (JSON)",
          description: "Values to set as JSON object",
          default: "{\n  \"key1\": \"value1\",\n  \"key2\": \"{{ $json.input_field }}\",\n  \"timestamp\": \"{{ new Date().toISOString() }}\"\n}",
          format: "multiline"
        },
        include_binary_data: {
          type: "boolean",
          title: "Include Binary Data",
          description: "Include binary data in output",
          default: false
        },
        dot_notation: {
          type: "boolean",
          title: "Use Dot Notation",
          description: "Support dot notation for nested properties (e.g., user.name)",
          default: true
        }
      }
    },
    tags: ["tools", "set", "data", "transform", "n8n", "variables"]
  },
  {
    id: "sample-calculator",
    name: "Calculator",
    type: "tool",
    supportedTypes: ["tool", "default"],
    version: "1.0.0",
    description: "Perform mathematical calculations",
    category: "tools",
    icon: "mdi:calculator",
    color: "#6366f1",
    inputs: [
      {
        id: "expression",
        name: "Expression",
        type: "input",
        dataType: "string",
        required: true,
        description: "Mathematical expression to evaluate"
      }
    ],
    outputs: [
      {
        id: "result",
        name: "Result",
        type: "output",
        dataType: "number",
        description: "Calculation result"
      },
      {
        id: "tool",
        name: "Tool Interface",
        type: "output",
        dataType: "tool",
        description: "Tool interface for agent connections - provides tool metadata and callable interface"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "tool",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        operation: {
          type: "string",
          title: "Operation",
          description: "Mathematical operation to perform",
          default: "add",
          enum: ["add", "subtract", "multiply", "divide", "power", "sqrt", "average", "min", "max", "median", "mode"]
        },
        precision: {
          type: "integer",
          title: "Precision",
          description: "Number of decimal places",
          default: 2,
          minimum: 0,
          maximum: 10
        }
      }
    },
    tags: ["tools", "calculator", "math", "compute"]
  },
  {
    id: "sample-date-time",
    name: "Date & Time",
    type: "tool",
    supportedTypes: ["tool", "default"],
    version: "1.0.0",
    description: "Handle date and time operations",
    category: "tools",
    icon: "mdi:calendar-clock",
    color: "#84cc16",
    inputs: [
      {
        id: "date",
        name: "Date",
        type: "input",
        dataType: "string",
        required: false,
        description: "Input date string"
      }
    ],
    outputs: [
      {
        id: "formatted_date",
        name: "Formatted Date",
        type: "output",
        dataType: "string",
        description: "Formatted date string"
      },
      {
        id: "timestamp",
        name: "Timestamp",
        type: "output",
        dataType: "number",
        description: "Unix timestamp"
      },
      {
        id: "tool",
        name: "Tool Interface",
        type: "output",
        dataType: "tool",
        description: "Tool interface for agent connections - provides tool metadata and callable interface"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "tool",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        format: {
          type: "string",
          title: "Format",
          description: "Date/time format",
          default: "YYYY-MM-DD"
        },
        timezone: {
          type: "string",
          title: "Timezone",
          description: "Timezone for date operations",
          default: "UTC"
        }
      }
    },
    tags: ["tools", "date", "time", "format"]
  },
  {
    id: "sample-notes",
    name: "Notes",
    type: "note",
    supportedTypes: ["note"],
    version: "1.0.0",
    description: "Add documentation and comments to your workflow with Markdown support",
    category: "tools",
    icon: "mdi:note-text",
    color: "#fbbf24",
    inputs: [],
    outputs: [],
    configSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          title: "Note Content",
          description: "Documentation or comment text (supports Markdown)",
          default: "# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!"
        },
        noteType: {
          type: "string",
          title: "Note Type",
          description: "Visual style and color of the note",
          default: "info",
          enum: ["info", "warning", "success", "error", "note"]
        }
      }
    },
    tags: ["tools", "notes", "documentation", "comments", "markdown"]
  },
  {
    id: "sample-simple-node",
    name: "Simple Node",
    type: "tool",
    supportedTypes: ["tool", "default"],
    version: "1.0.0",
    description: "A simple node with optional input and output ports",
    category: "tools",
    icon: "mdi:square",
    color: "#6366f1",
    inputs: [
      {
        id: "input",
        name: "Input",
        type: "input",
        dataType: "mixed",
        required: false,
        description: "Optional input data"
      }
    ],
    outputs: [
      {
        id: "output",
        name: "Output",
        type: "output",
        dataType: "mixed",
        description: "Optional output data"
      },
      {
        id: "tool",
        name: "Tool Interface",
        type: "output",
        dataType: "tool",
        description: "Tool interface for agent connections - provides tool metadata and callable interface"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "tool",
          enum: ["tool", "default"],
          enumNames: ["Tool (specialized for agent tools)", "Default (standard workflow node)"]
        },
        icon: {
          type: "string",
          title: "Icon",
          description: "Icon to display in the node (Iconify icon name)",
          default: "mdi:square"
        },
        color: {
          type: "string",
          title: "Color",
          description: "Background color of the node",
          default: "#6366f1"
        },
        layout: {
          type: "string",
          title: "Layout",
          description: "Layout style of the simple node",
          default: "normal",
          enum: ["compact", "normal"]
        },
        label: {
          type: "string",
          title: "Label",
          description: "Custom label for the node",
          default: "Simple Node"
        },
        description: {
          type: "string",
          title: "Description",
          description: "Description of what this simple node does",
          default: "",
          format: "multiline"
        }
      }
    },
    tags: ["tools", "simple", "custom", "visual", "node"]
  },

  // ===== EMBEDDINGS CATEGORY =====
  {
    id: "sample-openai-embeddings",
    name: "OpenAI Embeddings",
    version: "1.0.0",
    description: "Generate embeddings using OpenAI models",
    category: "embeddings",
    icon: "mdi:vector-point",
    color: "#10a37f",
    inputs: [
      {
        id: "text",
        name: "Text",
        type: "input",
        dataType: "string",
        required: true,
        description: "Text to embed"
      }
    ],
    outputs: [
      {
        id: "embeddings",
        name: "Embeddings",
        type: "output",
        dataType: "number[]",
        description: "Generated embeddings"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          title: "Model",
          description: "OpenAI embedding model",
          default: "text-embedding-3-small",
          enum: ["text-embedding-3-small", "text-embedding-3-large"]
        },
        apiKey: {
          type: "string",
          title: "API Key",
          description: "OpenAI API key",
          default: ""
        }
      }
    },
    tags: ["embeddings", "openai", "vector"]
  },
  {
    id: "sample-huggingface-embeddings",
    name: "HuggingFace Embeddings",
    version: "1.0.0",
    description: "Generate embeddings using HuggingFace models",
    category: "embeddings",
    icon: "mdi:vector-square",
    color: "#f59e0b",
    inputs: [
      {
        id: "text",
        name: "Text",
        type: "input",
        dataType: "string",
        required: true,
        description: "Text to embed"
      }
    ],
    outputs: [
      {
        id: "embeddings",
        name: "Embeddings",
        type: "output",
        dataType: "number[]",
        description: "Generated embeddings"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          title: "Model",
          description: "HuggingFace model name",
          default: "sentence-transformers/all-MiniLM-L6-v2"
        },
        apiToken: {
          type: "string",
          title: "API Token",
          description: "HuggingFace API token",
          default: ""
        }
      }
    },
    tags: ["embeddings", "huggingface", "vector"]
  },

  // ===== MEMORIES CATEGORY =====
  {
    id: "sample-conversation-buffer",
    name: "Conversation Buffer",
    version: "1.0.0",
    description: "Store conversation history",
    category: "memories",
    icon: "mdi:chat-history",
    color: "#8b5cf6",
    inputs: [
      {
        id: "message",
        name: "Message",
        type: "input",
        dataType: "string",
        required: true,
        description: "Message to add to buffer"
      }
    ],
    outputs: [
      {
        id: "history",
        name: "History",
        type: "output",
        dataType: "string[]",
        description: "Conversation history"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        maxTokens: {
          type: "number",
          title: "Max Tokens",
          description: "Maximum tokens in buffer",
          default: 2000,
          minimum: 100,
          maximum: 10000
        },
        returnMessages: {
          type: "boolean",
          title: "Return Messages",
          description: "Return messages in response",
          default: true
        }
      }
    },
    tags: ["memory", "conversation", "history", "buffer"]
  },

  // ===== AGENTS CATEGORY =====
  {
    id: "sample-simple-agent",
    name: "Simple Agent",
    version: "1.0.0",
    description: "Agent for tool orchestration",
    category: "agents",
    icon: "mdi:account-cog",
    color: "#06b6d4",
    type: "default",
    supportedTypes: ["default", "tool"],
    inputs: [
      {
        id: "message",
        name: "Message",
        type: "input",
        dataType: "string",
        required: true,
        description: "User message for agent"
      },
      {
        id: "tools",
        name: "Tools",
        type: "input",
        dataType: "tool",
        required: false,
        description: "Tool interfaces available to agent - connect to tool output ports"
      }
    ],
    outputs: [
      {
        id: "response",
        name: "Response",
        type: "output",
        dataType: "string",
        description: "Agent response"
      },
      {
        id: "tools",
        name: "Tools",
        type: "input",
        dataType: "tool",
        required: false,
        description: "Tool interfaces available to agent - connect to tool output ports"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "default",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        model: {
          type: "string",
          title: "Model",
          description: "Chat model to use",
          default: "gpt-3.5-turbo",
          enum: ["gpt-3.5-turbo", "gpt-4", "claude-3-sonnet"]
        },
        temperature: {
          type: "number",
          title: "Temperature",
          description: "Creativity level (0-1)",
          default: 0.7,
          minimum: 0,
          maximum: 1
        },
        maxIterations: {
          type: "number",
          title: "Max Iterations",
          description: "Maximum agent iterations",
          default: 5,
          minimum: 1,
          maximum: 20
        }
      }
    },
    tags: ["agent", "orchestration", "tools"]
  },

  // ===== VECTOR STORES CATEGORY =====
  {
    id: "sample-chroma-vector-store",
    name: "Chroma Vector Store",
    version: "1.0.0",
    description: "Store and retrieve vectors using Chroma",
    category: "vector stores",
    icon: "mdi:database",
    color: "#84cc16",
    inputs: [
      {
        id: "embeddings",
        name: "Embeddings",
        type: "input",
        dataType: "number[]",
        required: true,
        description: "Embeddings to store"
      },
      {
        id: "query",
        name: "Query",
        type: "input",
        dataType: "string",
        required: false,
        description: "Query for similarity search"
      }
    ],
    outputs: [
      {
        id: "results",
        name: "Results",
        type: "output",
        dataType: "json[]",
        description: "Search results"
      },
      {
        id: "metadata",
        name: "Metadata",
        type: "output",
        dataType: "json",
        description: "Vector store metadata"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        collectionName: {
          type: "string",
          title: "Collection Name",
          description: "Chroma collection name",
          default: "default"
        },
        persistDirectory: {
          type: "string",
          title: "Persist Directory",
          description: "Directory to persist data",
          default: "./chroma_db"
        },
        distanceFunction: {
          type: "string",
          title: "Distance Function",
          description: "Distance function for similarity",
          default: "cosine",
          enum: ["cosine", "euclidean", "manhattan"]
        }
      }
    },
    tags: ["integration", "vector-store", "chroma", "embeddings"]
  },
  {
    id: "sample-pinecone-vector-store",
    name: "Pinecone Vector Store",
    version: "1.0.0",
    description: "Store and retrieve vectors using Pinecone",
    category: "vector stores",
    icon: "mdi:database-search",
    color: "#f59e0b",
    inputs: [
      {
        id: "embeddings",
        name: "Embeddings",
        type: "input",
        dataType: "number[]",
        required: true,
        description: "Embeddings to store"
      },
      {
        id: "query",
        name: "Query",
        type: "input",
        dataType: "string",
        required: false,
        description: "Query for similarity search"
      }
    ],
    outputs: [
      {
        id: "results",
        name: "Results",
        type: "output",
        dataType: "json[]",
        description: "Search results"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        indexName: {
          type: "string",
          title: "Index Name",
          description: "Pinecone index name",
          default: "default"
        },
        apiKey: {
          type: "string",
          title: "API Key",
          description: "Pinecone API key",
          default: ""
        },
        environment: {
          type: "string",
          title: "Environment",
          description: "Pinecone environment",
          default: "us-west1-gcp"
        }
      }
    },
    tags: ["integration", "vector-store", "pinecone", "embeddings"]
  },

  // ===== DEMO: AI-POWERED CONTENT MANAGEMENT NODES =====
  {
    id: "demo-chat-input",
    name: "Chat Input",
    type: "simple",
    supportedTypes: ["simple", "default"],
    version: "1.0.0",
    description: "Accept chat instructions from content managers about what content changes to make",
    category: "inputs",
    icon: "mdi:message-text-outline",
    color: "#10b981",
    inputs: [],
    outputs: [
      {
        id: "user_message",
        name: "User Message",
        type: "output",
        dataType: "string",
        description: "Content manager's instructions for content review"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "simple",
          enum: ["simple", "default"],
          enumNames: ["Simple (compact layout)", "Default (standard workflow node)"]
        },
        placeholder: {
          type: "string",
          title: "Placeholder Text",
          description: "Placeholder text shown in the chat input",
          default: "Enter your content management instructions..."
        },
        welcomeMessage: {
          type: "string",
          title: "Welcome Message",
          description: "Initial message shown to content managers",
          default: "Hi! I can help you review and update your Drupal content. What would you like me to do?"
        },
        maxLength: {
          type: "number",
          title: "Maximum Message Length",
          description: "Maximum characters allowed in a single message",
          default: 1000,
          minimum: 100,
          maximum: 5000
        }
      }
    },
    tags: ["demo", "content-management", "input", "chat", "drupal"]
  },
  {
    id: "demo-drupal-search-rag",
    name: "Drupal Search API RAG",
    type: "tool",
    supportedTypes: ["tool", "default"],
    version: "1.0.0",
    description: "Search and retrieve content from Drupal using Search API with AI-powered relevance",
    category: "tools",
    icon: "mdi:database-search-outline",
    color: "#0678be",
    inputs: [
      {
        id: "search_query",
        name: "Search Query",
        type: "input",
        dataType: "string",
        required: true,
        description: "Search terms to find relevant content"
      },
      {
        id: "content_types",
        name: "Content Types",
        type: "input",
        dataType: "json",
        required: false,
        description: "Array of content types to search (e.g., ['article', 'page', 'blog'])"
      }
    ],
    outputs: [
      {
        id: "content_results",
        name: "Content Results",
        type: "output",
        dataType: "json",
        description: "Array of matching content items with metadata"
      },
      {
        id: "search_metadata",
        name: "Search Metadata",
        type: "output",
        dataType: "json",
        description: "Search statistics and relevance information"
      },
      {
        id: "tool",
        name: "Tool Interface",
        type: "output",
        dataType: "tool",
        description: "Tool interface for agent connections - provides tool metadata and callable interface"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "tool",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        searchIndex: {
          type: "string",
          title: "Search API Index",
          description: "Name of the Drupal Search API index to query",
          default: "content_index"
        },
        maxResults: {
          type: "number",
          title: "Maximum Results",
          description: "Maximum number of content items to return",
          default: 10,
          minimum: 1,
          maximum: 100
        },
        includeFields: {
          type: "array",
          title: "Include Fields",
          description: "Content fields to include in results",
          default: ["title", "body", "field_tags", "created", "changed"]
        },
        useAiRanking: {
          type: "boolean",
          title: "Use AI-Powered Ranking",
          description: "Use AI to improve search result relevance",
          default: true
        },
        contentStatus: {
          type: "string",
          title: "Content Status",
          description: "Filter by publication status",
          default: "published",
          enum: ["published", "unpublished", "all"]
        }
      }
    },
    tags: ["demo", "content-management", "drupal", "search", "rag", "ai"]
  },
  {
    id: "demo-ai-content-analyzer",
    name: "AI Content Analyzer",
    type: "default",
    supportedTypes: ["default", "tool"],
    version: "1.0.0",
    description: "Analyze content for issues like acronym misuse, formatting problems, or content quality",
    category: "agents",
    icon: "mdi:text-search",
    color: "#7c3aed",
    inputs: [
      {
        id: "content",
        name: "Content",
        type: "input",
        dataType: "json",
        required: true,
        description: "Content to analyze"
      },
      {
        id: "analysis_prompt",
        name: "Analysis Instructions",
        type: "input",
        dataType: "string",
        required: true,
        description: "Instructions for what to analyze in the content"
      },
      {
        id: "tools",
        name: "Tools",
        type: "input",
        dataType: "tool",
        required: false,
        description: "Tools available to agent"
      }
    ],
    outputs: [
      {
        id: "analysis_results",
        name: "Analysis Results",
        type: "output",
        dataType: "json",
        description: "Detailed analysis findings with recommendations"
      },
      {
        id: "issues_found",
        name: "Issues Found",
        type: "output",
        dataType: "json",
        description: "Array of specific issues identified"
      },
      {
        id: "confidence_score",
        name: "Confidence Score",
        type: "output",
        dataType: "number",
        description: "AI confidence in the analysis (0-1)"
      },
      {
        id: "tools",
        name: "Tools",
        type: "input",
        dataType: "tool",
        required: false,
        description: "Tools available to agent"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "default",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        model: {
          type: "string",
          title: "AI Model",
          description: "AI model to use for content analysis",
          default: "gpt-4",
          enum: ["gpt-3.5-turbo", "gpt-4", "claude-3-sonnet", "claude-3-haiku"]
        },
        analysisType: {
          type: "string",
          title: "Analysis Type",
          description: "Type of content analysis to perform",
          default: "comprehensive",
          enum: ["acronym_detection", "grammar_check", "style_review", "comprehensive"]
        },
        strictness: {
          type: "string",
          title: "Analysis Strictness",
          description: "How strict should the analysis be",
          default: "balanced",
          enum: ["lenient", "balanced", "strict"]
        },
        includeExamples: {
          type: "boolean",
          title: "Include Examples",
          description: "Include specific examples in analysis results",
          default: true
        },
        customRules: {
          type: "string",
          title: "Custom Analysis Rules",
          description: "Custom rules or guidelines for content analysis",
          default: "",
          format: "multiline"
        }
      }
    },
    tags: ["demo", "content-management", "ai", "analysis", "quality-control"]
  },
  {
    id: "demo-ai-content-editor",
    name: "AI Content Editor",
    type: "default",
    supportedTypes: ["default", "tool"],
    version: "1.0.0",
    description: "Make AI-powered edits to content based on analysis results and user instructions",
    category: "agents",
    icon: "mdi:file-edit-outline",
    color: "#f59e0b",
    inputs: [
      {
        id: "original_content",
        name: "Original Content",
        type: "input",
        dataType: "json",
        required: true,
        description: "Original content to be edited"
      },
      {
        id: "analysis_results",
        name: "Analysis Results",
        type: "input",
        dataType: "json",
        required: true,
        description: "Issues and recommendations from content analysis"
      },
      {
        id: "edit_instructions",
        name: "Edit Instructions",
        type: "input",
        dataType: "string",
        required: true,
        description: "Specific instructions for how to edit the content"
      },
      {
        id: "tools",
        name: "Tools",
        type: "input",
        dataType: "tool",
        required: false,
        description: "Tools available to agent"
      }
    ],
    outputs: [
      {
        id: "edited_content",
        name: "Edited Content",
        type: "output",
        dataType: "json",
        description: "Content with AI-suggested edits applied"
      },
      {
        id: "edit_summary",
        name: "Edit Summary",
        type: "output",
        dataType: "json",
        description: "Summary of changes made with explanations"
      },
      {
        id: "change_log",
        name: "Change Log",
        type: "output",
        dataType: "json",
        description: "Detailed log of all changes made"
      },
      {
        id: "tools",
        name: "Tools",
        type: "input",
        dataType: "tool",
        required: false,
        description: "Tools available to agent"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "default",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        model: {
          type: "string",
          title: "AI Model",
          description: "AI model to use for content editing",
          default: "gpt-4",
          enum: ["gpt-3.5-turbo", "gpt-4", "claude-3-sonnet", "claude-3-haiku"]
        },
        editingStyle: {
          type: "string",
          title: "Editing Style",
          description: "Style of editing to apply",
          default: "conservative",
          enum: ["minimal", "conservative", "moderate", "comprehensive"]
        },
        preserveFormatting: {
          type: "boolean",
          title: "Preserve HTML Formatting",
          description: "Maintain existing HTML tags and formatting",
          default: true
        },
        requireApproval: {
          type: "boolean",
          title: "Require Human Approval",
          description: "Flag all changes for human review before applying",
          default: true
        },
        trackChanges: {
          type: "boolean",
          title: "Track Changes",
          description: "Create detailed tracking of all modifications",
          default: true
        }
      }
    },
    tags: ["demo", "content-management", "ai", "editing", "automation"]
  },
  {
    id: "demo-draft-creator",
    name: "Draft Creator",
    type: "tool",
    supportedTypes: ["tool", "default"],
    version: "1.0.0",
    description: "Create draft versions of edited content in Drupal for human review and approval",
    category: "tools",
    icon: "mdi:file-document-edit-outline",
    color: "#10b981",
    inputs: [
      {
        id: "edited_content",
        name: "Edited Content",
        type: "input",
        dataType: "json",
        required: true,
        description: "Content with AI edits to save as draft"
      },
      {
        id: "edit_summary",
        name: "Edit Summary",
        type: "input",
        dataType: "json",
        required: true,
        description: "Summary of changes made"
      },
      {
        id: "original_node_id",
        name: "Original Node ID",
        type: "input",
        dataType: "number",
        required: true,
        description: "Drupal node ID of the original content"
      }
    ],
    outputs: [
      {
        id: "draft_node_id",
        name: "Draft Node ID",
        type: "output",
        dataType: "number",
        description: "Node ID of the created draft"
      },
      {
        id: "draft_url",
        name: "Draft URL",
        type: "output",
        dataType: "string",
        description: "URL to view the draft content"
      },
      {
        id: "review_url",
        name: "Review URL",
        type: "output",
        dataType: "string",
        description: "URL for content reviewers to approve/reject changes"
      },
      {
        id: "tool",
        name: "Tool Interface",
        type: "output",
        dataType: "tool",
        description: "Tool interface for agent connections - provides tool metadata and callable interface"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "tool",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        draftWorkflow: {
          type: "string",
          title: "Draft Workflow",
          description: "Drupal workflow to use for draft content",
          default: "editorial",
          enum: ["editorial", "simple", "custom"]
        },
        assignReviewer: {
          type: "boolean",
          title: "Auto-assign Reviewer",
          description: "Automatically assign a content reviewer",
          default: true
        },
        reviewerRole: {
          type: "string",
          title: "Reviewer Role",
          description: "User role to assign for content review",
          default: "editor",
          enum: ["editor", "content_manager", "administrator"]
        },
        notifyReviewer: {
          type: "boolean",
          title: "Notify Reviewer",
          description: "Send email notification to assigned reviewer",
          default: true
        },
        retainOriginal: {
          type: "boolean",
          title: "Retain Original",
          description: "Keep original content unchanged until draft is approved",
          default: true
        },
        addRevisionLog: {
          type: "boolean",
          title: "Add Revision Log",
          description: "Add detailed revision log entry",
          default: true
        }
      }
    },
    tags: ["demo", "content-management", "drupal", "draft", "workflow", "review"]
  },
  {
    id: "demo-date-format-converter",
    name: "Date Format Converter",
    type: "tool",
    supportedTypes: ["tool", "default"],
    version: "1.0.0",
    description: "Extract and convert dates in content to new formats (demo review step)",
    category: "tools",
    icon: "mdi:calendar-edit",
    color: "#84cc16",
    inputs: [
      {
        id: "content",
        name: "Content",
        type: "input",
        dataType: "json",
        required: true,
        description: "Content containing dates to convert"
      }
    ],
    outputs: [
      {
        id: "converted_content",
        name: "Converted Content",
        type: "output",
        dataType: "json",
        description: "Content with dates converted to new format"
      },
      {
        id: "dates_found",
        name: "Dates Found",
        type: "output",
        dataType: "json",
        description: "Array of dates found and their conversions"
      },
      {
        id: "conversion_log",
        name: "Conversion Log",
        type: "output",
        dataType: "json",
        description: "Log of all date conversions performed"
      },
      {
        id: "tool",
        name: "Tool Interface",
        type: "output",
        dataType: "tool",
        description: "Tool interface for agent connections - provides tool metadata and callable interface"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "tool",
          enum: ["tool", "default"],
          enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
        },
        inputFormat: {
          type: "string",
          title: "Input Date Format",
          description: "Expected format of dates in content",
          default: "MM/dd/yyyy",
          enum: ["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "auto-detect"]
        },
        outputFormat: {
          type: "string",
          title: "Output Date Format",
          description: "Desired format for converted dates",
          default: "MMMM d, yyyy",
          enum: ["MMMM d, yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "MMM d, yyyy", "d MMMM yyyy"]
        },
        includeTime: {
          type: "boolean",
          title: "Include Time",
          description: "Include time information in conversions",
          default: false
        },
        timezone: {
          type: "string",
          title: "Timezone",
          description: "Timezone for date conversions",
          default: "UTC",
          enum: ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London"]
        },
        onlyFutureDates: {
          type: "boolean",
          title: "Only Future Dates",
          description: "Only convert dates that are in the future",
          default: false
        }
      }
    },
    tags: ["demo", "content-management", "dates", "formatting", "conversion", "review-tool"]
  },
  {
    id: "demo-chat-response",
    name: "Chat Response",
    type: "simple",
    supportedTypes: ["simple", "default"],
    version: "1.0.0",
    description: "Display chat-style responses with workflow results and next steps for content managers",
    category: "outputs",
    icon: "mdi:message-reply-text",
    color: "#8b5cf6",
    inputs: [
      {
        id: "workflow_results",
        name: "Workflow Results",
        type: "input",
        dataType: "json",
        required: true,
        description: "Results from the content management workflow"
      },
      {
        id: "summary_message",
        name: "Summary Message",
        type: "input",
        dataType: "string",
        required: true,
        description: "Human-readable summary of what was accomplished"
      }
    ],
    outputs: [],
    configSchema: {
      type: "object",
      properties: {
        nodeType: {
          type: "string",
          title: "Node Type",
          description: "Choose the visual representation for this node",
          default: "simple",
          enum: ["simple", "default"],
          enumNames: ["Simple (compact layout)", "Default (standard workflow node)"]
        },
        showTimestamp: {
          type: "boolean",
          title: "Show Timestamp",
          description: "Display timestamp with responses",
          default: true
        },
        includeActionButtons: {
          type: "boolean",
          title: "Include Action Buttons",
          description: "Show action buttons for next steps",
          default: true
        },
        responseStyle: {
          type: "string",
          title: "Response Style",
          description: "Style of the chat response",
          default: "professional",
          enum: ["casual", "professional", "technical", "friendly"]
        },
        showWorkflowSummary: {
          type: "boolean",
          title: "Show Workflow Summary",
          description: "Include a summary of workflow steps completed",
          default: true
        },
        enableMarkdown: {
          type: "boolean",
          title: "Enable Markdown",
          description: "Allow markdown formatting in responses",
          default: true
        }
      }
    },
    tags: ["demo", "content-management", "output", "chat", "response", "summary"]
  }
];

// Export category icons for use in other components
export { CATEGORY_ICONS as categoryIcons };

/**
 * Demo mode configuration
 */
export interface DemoConfig {
  enabled: boolean;
  mode: "content-management" | "all";
}

/**
 * Demo node whitelist - Multi-agent content management scenario
 * Main Agent + Specialized Sub-Agents + Tools
 */
const DEMO_ALLOWED_NODE_IDS = [
  // === MAIN CONVERSATIONAL AGENT ===
  "demo-chat-input",           // User input interface
  "sample-simple-agent",       // Main conversational agent (orchestrator)
  "demo-chat-response",        // Response back to user
  
  // === SPECIALIZED SUB-AGENTS ===
  "demo-ai-content-analyzer",  // Content analysis agent
  "demo-ai-content-editor",    // Content editing agent
  
  // === TOOLS (for sub-agents to use) ===
  "demo-drupal-search-rag",    // RAG tool for content search
  "demo-draft-creator",        // Draft creation tool
  "demo-date-format-converter", // Date formatting tool
  
  // === SUPPORTING NODES ===
  "sample-openai",             // AI model for agents
  "sample-anthropic",          // Alternative AI model
  "sample-notes",              // Documentation
  "sample-prompt",             // Prompt templates
  "sample-text-input",         // Alternative input method
  "sample-chat-output",        // Alternative output method
  
  // === TOOL INTERFACE NODES ===
  "sample-http-request",       // For external API calls
  "sample-json",               // JSON processing tool
  "sample-set"                 // Data manipulation tool
];

/**
 * Filter nodes based on demo configuration
 * @param nodes - All available nodes
 * @param config - Demo configuration
 * @returns Filtered array of nodes
 */
export function filterNodesForDemo(nodes: NodeMetadata[], config: DemoConfig): NodeMetadata[] {
  if (!config.enabled) {
    return nodes;
  }

  switch (config.mode) {
    case "content-management":
      // Show only specifically whitelisted nodes for the demo
      return nodes.filter(node => DEMO_ALLOWED_NODE_IDS.includes(node.id));
    
    case "all":
    default:
      return nodes;
  }
}

/**
 * Get the list of allowed demo node IDs
 */
export function getDemoAllowedNodeIds(): string[] {
  return [...DEMO_ALLOWED_NODE_IDS];
}

/**
 * Check if a node is allowed in demo mode
 */
export function isNodeAllowedInDemo(nodeId: string): boolean {
  return DEMO_ALLOWED_NODE_IDS.includes(nodeId);
}

/**
 * Get demo-specific nodes only
 */
export function getDemoNodes(): NodeMetadata[] {
  return sampleNodes.filter(node => node.tags?.includes("demo"));
}

/**
 * Get nodes by category with demo filtering
 */
export function getNodesByCategory(
  category: string, 
  demoConfig?: DemoConfig
): NodeMetadata[] {
  const nodes = demoConfig ? filterNodesForDemo(sampleNodes, demoConfig) : sampleNodes;
  return nodes.filter(node => node.category === category);
}

/**
 * Search nodes with demo filtering
 */
export function searchNodes(
  query: string, 
  demoConfig?: DemoConfig
): NodeMetadata[] {
  const nodes = demoConfig ? filterNodesForDemo(sampleNodes, demoConfig) : sampleNodes;
  const searchTerm = query.toLowerCase();
  
  return nodes.filter(node => 
    node.name.toLowerCase().includes(searchTerm) ||
    node.description.toLowerCase().includes(searchTerm) ||
    node.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}

/**
 * Sample workflow for development
 * Updated to use the new node types
 */
export const sampleWorkflow: Workflow = {
  id: "sample-simple-chat-workflow",
  name: "Simple Chat Workflow",
  description: "A basic workflow demonstrating direct text input to AI model response",
  nodes: [
    {
      id: "sample-workflow-text-input",
      type: "text-input",
      position: { x: 100, y: 100 },
      data: {
        label: "Text Input",
        config: {
          placeholder: "Enter your question...",
          defaultValue: "Hello, how are you?"
        },
        metadata: sampleNodes.find(n => n.name === "Text Input")!
      }
    } as WorkflowNode,
    {
      id: "sample-workflow-split-text",
      type: "split-text",
      position: { x: 300, y: 100 },
      data: {
        label: "Split Text",
        config: {
          chunkSize: 500,
          chunkOverlap: 100,
          separator: "\n"
        },
        metadata: sampleNodes.find(n => n.name === "Split Text")!
      }
    } as WorkflowNode,
    {
      id: "sample-workflow-openai",
      type: "openai",
      position: { x: 500, y: 100 },
      data: {
        label: "OpenAI",
        config: {
          model: "gpt-3.5-turbo",
          temperature: 0.7,
          maxTokens: 1000
        },
        metadata: sampleNodes.find(n => n.name === "OpenAI")!
      }
    } as WorkflowNode,
    {
      id: "sample-workflow-note",
      type: "note",
      position: { x: 500, y: 300 },
      data: {
        label: "Workflow Notes",
        config: {
          content: "# Simple Chat Workflow\n\nThis workflow demonstrates a basic chat interaction:\n\n1. **Text Input** - User enters a question\n2. **OpenAI** - Processes the input and generates a response\n3. **Chat Output** - Displays the final response\n\n## Port Types Used\n- **string** - Text data flows between all nodes\n- Only compatible types can connect (string → string)\n\n## Usage\n- Drag a Notes node to add documentation\n- Double-click to edit in Markdown\n- Choose from 5 different note types",
          noteType: "info"
        },
        metadata: sampleNodes.find(n => n.name === "Notes")!
      }
    } as WorkflowNode,
    {
      id: "sample-workflow-chat-output",
      type: "chat-output",
      position: { x: 700, y: 100 },
      data: {
        label: "Chat Output",
        config: {
          showTimestamp: true,
          maxLength: 2000,
          markdown: true
        },
        metadata: sampleNodes.find(n => n.name === "Chat Output")!
      }
    } as WorkflowNode
  ],
  edges: [
    {
      id: "sample-workflow-edge-1",
      source: "sample-workflow-text-input",
      target: "sample-workflow-openai",
      sourceHandle: "text",
      targetHandle: "prompt"
    } as WorkflowEdge,
    {
      id: "sample-workflow-edge-2",
      source: "sample-workflow-openai",
      target: "sample-workflow-chat-output",
      sourceHandle: "response",
      targetHandle: "message"
    } as WorkflowEdge
  ],
  metadata: {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: "FlowDrop",
    tags: ["sample", "chat", "demo", "langflow-style"]
  }
};
