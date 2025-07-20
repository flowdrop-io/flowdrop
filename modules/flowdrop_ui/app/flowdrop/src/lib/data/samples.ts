/**
 * Sample data for FlowDrop development and testing
 * Full set matching Langflow's default categories and node types
 */

import type { NodeMetadata, Workflow, WorkflowNode, WorkflowEdge } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";
import { CATEGORY_ICONS } from "../utils/icons.js";

/**
 * Sample node definitions for development
 * Full set matching Langflow's default categories
 */
export const sampleNodes: NodeMetadata[] = [
  // ===== INPUTS CATEGORY =====
  {
    id: uuidv4(),
    name: "Text Input",
    version: "1.0.0",
    description: "Simple text input for user data",
    category: "inputs",
    icon: "mdi:text",
    color: "#22c55e",
    inputs: [],
    outputs: [
      {
        id: "text",
        name: "Text",
        type: "output",
        dataType: "string",
        description: "The input text value"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        placeholder: {
          type: "string",
          title: "Placeholder Text",
          description: "Text to show when input is empty",
          default: "Enter text here..."
        },
        defaultValue: {
          type: "string",
          title: "Default Value",
          description: "Initial value for the text input",
          default: ""
        },
        multiline: {
          type: "boolean",
          title: "Multiline",
          description: "Allow multiple lines of text",
          default: false
        },
        maxLength: {
          type: "number",
          title: "Maximum Length",
          description: "Maximum number of characters allowed",
          default: 1000,
          minimum: 1,
          maximum: 10000
        },
        showLabel: {
          type: "boolean",
          title: "Show Label",
          description: "Display the input label",
          default: true
        }
      },
      required: ["placeholder"]
    },
    tags: ["input", "text", "user-input"]
  },
  {
    id: uuidv4(),
    name: "File",
    version: "1.0.0",
    description: "Upload and process files of various formats",
    category: "inputs",
    icon: "mdi:file-upload",
    color: "#ef4444",
    inputs: [],
    outputs: [
      {
        id: "data",
        name: "Data",
        type: "output",
        dataType: "file",
        description: "File content as Data object"
      },
      {
        id: "text",
        name: "Text",
        type: "output",
        dataType: "text",
        description: "File content as text"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        allowedTypes: {
          type: "array",
          title: "Allowed File Types",
          description: "File extensions that can be uploaded",
          default: ["txt", "pdf", "docx", "csv", "json"],
          items: {
            type: "string"
          }
        },
        maxSize: {
          type: "number",
          title: "Maximum File Size",
          description: "Maximum file size in bytes",
          default: 10485760,
          minimum: 1024,
          maximum: 104857600
        }
      },
      required: ["allowedTypes"]
    },
    tags: ["input", "file", "upload", "document"]
  },
  {
    id: uuidv4(),
    name: "URL",
    version: "1.0.0",
    description: "Fetch content from URLs",
    category: "inputs",
    icon: "mdi:link",
    color: "#3b82f6",
    inputs: [],
    outputs: [
      {
        id: "data",
        name: "Data",
        type: "output",
        dataType: "text",
        description: "Fetched content as text"
      },
      {
        id: "dataframe",
        name: "DataFrame",
        type: "output",
        dataType: "json",
        description: "Structured data from URL"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          title: "URLs",
          description: "List of URLs to fetch",
          default: [],
          items: {
            type: "string"
          }
        },
        maxDepth: {
          type: "number",
          title: "Maximum Depth",
          description: "Maximum depth for recursive fetching",
          default: 1,
          minimum: 1,
          maximum: 10
        },
        format: {
          type: "string",
          title: "Output Format",
          description: "Format of the fetched content",
          default: "text",
          enum: ["text", "json", "html"]
        },
        timeout: {
          type: "number",
          title: "Timeout",
          description: "Request timeout in seconds",
          default: 30,
          minimum: 1,
          maximum: 300
        }
      },
      required: ["urls"]
    },
    tags: ["input", "url", "web", "fetch"]
  },
  {
    id: uuidv4(),
    name: "API Request",
    version: "1.0.0",
    description: "Make HTTP requests to APIs",
    category: "inputs",
    icon: "mdi:api",
    color: "#8b5cf6",
    inputs: [],
    outputs: [
      {
        id: "data",
        name: "Data",
        type: "output",
        dataType: "json",
        description: "API response data"
      },
      {
        id: "dataframe",
        name: "DataFrame",
        type: "output",
        dataType: "json",
        description: "Response as structured data"
      }
    ],
    configSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          title: "API URLs",
          description: "List of API endpoints to call",
          default: [],
          items: {
            type: "string"
          }
        },
        method: {
          type: "string",
          title: "HTTP Method",
          description: "HTTP method to use for the request",
          default: "GET",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"]
        },
        headers: {
          type: "object",
          title: "Headers",
          description: "HTTP headers to include in the request",
          default: {}
        },
        body: {
          type: "object",
          title: "Request Body",
          description: "Request body data",
          default: {}
        },
        timeout: {
          type: "number",
          title: "Timeout",
          description: "Request timeout in seconds",
          default: 30,
          minimum: 1,
          maximum: 300
        }
      },
      required: ["urls", "method"]
    },
    tags: ["input", "api", "http", "rest"]
  },
  {
    id: uuidv4(),
    name: "Webhook",
    version: "1.0.0",
    description: "Receive data from external webhooks",
    category: "inputs",
    icon: "mdi:webhook",
    color: "#06b6d4",
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
      endpoint: "",
      method: "POST"
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
      showTimestamp: true,
      maxLength: 2000,
      markdown: true
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
      showTimestamp: false,
      maxLength: 1000
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
      template: "You are a helpful assistant. {input}",
      variables: []
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
      schema: {},
      outputType: "json"
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
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      maxTokens: 1000,
      apiKey: ""
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
      model: "claude-3-sonnet-20240229",
      temperature: 0.7,
      maxTokens: 1000,
      apiKey: ""
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
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      maxTokens: 1000,
      apiKey: ""
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
      chunkSize: 1000,
      chunkOverlap: 200,
      separator: "\n"
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
      operation: "select_keys",
      keys: [],
      filterKey: "",
      filterValue: ""
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
      operation: "filter",
      columnName: "",
      filterValue: "",
      ascending: true
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
      pattern: "",
      flags: "g"
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
      filter_instruction: "",
      sample_size: 1000,
      max_size: 10000
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
      operator: "equals",
      caseSensitive: false
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
      maxIterations: 100
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
      includeText: true
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
    configSchema: {},
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
      fileFormat: "json",
      filePath: "./output/data.json"
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
      format: "YYYY-MM-DD",
      timezone: "UTC"
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
      model: "text-embedding-3-small",
      apiKey: ""
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
      model: "sentence-transformers/all-MiniLM-L6-v2",
      apiToken: ""
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
      maxTokens: 2000,
      returnMessages: true
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
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      maxIterations: 5
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
      collectionName: "default",
      persistDirectory: "./chroma_db",
      distanceFunction: "cosine"
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
      indexName: "default",
      apiKey: "",
      environment: "us-west1-gcp"
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