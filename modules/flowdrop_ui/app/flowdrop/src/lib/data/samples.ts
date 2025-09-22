/**
 * Sample data for FlowDrop development and testing
 * Full set matching Langflow's default categories and node types
 */

import type { NodeMetadata, Workflow, WorkflowNode, WorkflowEdge } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";
import { CATEGORY_ICONS } from "../utils/icons.js";

/**
 * Sample node data for development and testing
 * These represent the available node types in the workflow editor
 */
export const sampleNodes: NodeMetadata[] = [
  // ===== INPUTS CATEGORY =====
  {
    id: uuidv4(),
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
          enum: ["simple", "default"],
          enumNames: ["Simple (compact layout)", "Default (standard workflow node)"]
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
    id: uuidv4(),
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
          enum: ["simple", "default"],
          enumNames: ["Simple Node (compact/normal)", "Default Node (standard)"]
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
    id: uuidv4(),
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
          enum: ["simple", "default"],
          enumNames: ["Simple Node (compact/normal)", "Default Node (standard)"]
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
    id: uuidv4(),
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
          enum: ["simple", "default"],
          enumNames: ["Simple Node (compact/normal)", "Default Node (standard)"]
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
    id: uuidv4(),
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
          enum: ["simple", "default"],
          enumNames: ["Simple Node (compact/normal)", "Default Node (standard)"]
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
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
    id: uuidv4(),
    name: "Simple Agent",
    version: "1.0.0",
    description: "Agent for tool orchestration",
    category: "agents",
    icon: "mdi:account-cog",
    color: "#06b6d4",
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
        dataType: "json[]",
        required: false,
        description: "Tools available to agent"
      }
    ],
    outputs: [
      {
        id: "response",
        name: "Response",
        type: "output",
        dataType: "string",
        description: "Agent response"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
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
    id: uuidv4(),
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
    id: uuidv4(),
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
  }
];

// Export category icons for use in other components
export { CATEGORY_ICONS as categoryIcons };

/**
 * Sample workflow for development
 * Updated to use the new node types
 */
export const sampleWorkflow: Workflow = {
  id: uuidv4(),
  name: "Simple Chat Workflow",
  description: "A basic workflow demonstrating direct text input to AI model response",
  nodes: [
    {
      id: uuidv4(),
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
      id: uuidv4(),
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
      id: uuidv4(),
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
      id: uuidv4(),
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
      id: uuidv4(),
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
      id: uuidv4(),
      source: "text-input-1",
      target: "openai-1",
      sourceHandle: "text",
      targetHandle: "prompt"
    } as WorkflowEdge,
    {
      id: uuidv4(),
      source: "openai-1",
      target: "chat-output-1",
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