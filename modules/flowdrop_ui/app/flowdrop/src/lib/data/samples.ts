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
        dataType: "text",
        description: "User entered text"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
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
        dataType: "text",
        required: true,
        description: "Message to display"
      }
    ],
    outputs: [],
    configSchema: {
      type: "object",
      properties: {
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
        dataType: "text",
        required: true,
        description: "Text to display"
      }
    ],
    outputs: [],
    configSchema: {
      type: "object",
      properties: {
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
        dataType: "text",
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
        dataType: "text",
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
        dataType: "text",
        required: true,
        description: "Input prompt for the model"
      },
      {
        id: "system_message",
        name: "System Message",
        type: "input",
        dataType: "text",
        required: false,
        description: "System message to set behavior"
      }
    ],
    outputs: [
      {
        id: "response",
        name: "Response",
        type: "output",
        dataType: "text",
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
        dataType: "text",
        required: true,
        description: "Input prompt for the model"
      }
    ],
    outputs: [
      {
        id: "response",
        name: "Response",
        type: "output",
        dataType: "text",
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
        dataType: "text",
        required: true,
        description: "Input prompt for the model"
      }
    ],
    outputs: [
      {
        id: "response",
        name: "Response",
        type: "output",
        dataType: "text",
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
        dataType: "text",
        required: true,
        description: "Text to split"
      }
    ],
    outputs: [
      {
        id: "chunks",
        name: "Chunks",
        type: "output",
        dataType: "array",
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
        dataType: "text",
        required: true,
        description: "Text to extract from"
      }
    ],
    outputs: [
      {
        id: "matches",
        name: "Matches",
        type: "output",
        dataType: "array",
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
        dataType: "text",
        required: true,
        description: "Text to evaluate"
      },
      {
        id: "match_text",
        name: "Match Text",
        type: "input",
        dataType: "text",
        required: true,
        description: "Text to compare against"
      }
    ],
    outputs: [
      {
        id: "true_result",
        name: "True",
        type: "output",
        dataType: "text",
        description: "Output when condition is true"
      },
      {
        id: "false_result",
        name: "False",
        type: "output",
        dataType: "text",
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
        dataType: "array",
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
        dataType: "array",
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
        dataType: "text",
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
        dataType: "text",
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
    name: "Calculator",
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
        dataType: "text",
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
        dataType: "text",
        required: false,
        description: "Input date string"
      }
    ],
    outputs: [
      {
        id: "formatted_date",
        name: "Formatted Date",
        type: "output",
        dataType: "text",
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
        dataType: "text",
        required: true,
        description: "Text to embed"
      }
    ],
    outputs: [
      {
        id: "embeddings",
        name: "Embeddings",
        type: "output",
        dataType: "array",
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
        dataType: "text",
        required: true,
        description: "Text to embed"
      }
    ],
    outputs: [
      {
        id: "embeddings",
        name: "Embeddings",
        type: "output",
        dataType: "array",
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
        dataType: "text",
        required: true,
        description: "Message to add to buffer"
      }
    ],
    outputs: [
      {
        id: "history",
        name: "History",
        type: "output",
        dataType: "array",
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
        dataType: "text",
        required: true,
        description: "User message for agent"
      },
      {
        id: "tools",
        name: "Tools",
        type: "input",
        dataType: "array",
        required: false,
        description: "Tools available to agent"
      }
    ],
    outputs: [
      {
        id: "response",
        name: "Response",
        type: "output",
        dataType: "text",
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
        dataType: "array",
        required: true,
        description: "Embeddings to store"
      },
      {
        id: "query",
        name: "Query",
        type: "input",
        dataType: "text",
        required: false,
        description: "Query for similarity search"
      }
    ],
    outputs: [
      {
        id: "results",
        name: "Results",
        type: "output",
        dataType: "array",
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
        dataType: "array",
        required: true,
        description: "Embeddings to store"
      },
      {
        id: "query",
        name: "Query",
        type: "input",
        dataType: "text",
        required: false,
        description: "Query for similarity search"
      }
    ],
    outputs: [
      {
        id: "results",
        name: "Results",
        type: "output",
        dataType: "array",
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
  description: "A basic workflow demonstrating text input, processing, and model response",
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
      target: "split-text-1",
      sourceHandle: "text",
      targetHandle: "text"
    } as WorkflowEdge,
    {
      id: uuidv4(),
      source: "split-text-1",
      target: "openai-1",
      sourceHandle: "chunks",
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