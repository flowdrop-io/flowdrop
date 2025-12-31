/**
 * Mock node data for MSW mock server
 * Contains actual FlowDrop node definitions from the API
 */

import type { NodeMetadata } from "../../lib/types/index.js";

/**
 * All available mock nodes - actual node definitions from FlowDrop API
 */
export const mockNodes: NodeMetadata[] = [
    {
        id: "ai_content_analyzer",
        name: "AI Content Analyzer",
        type: "tool",
        supportedTypes: ["tool", "default"],
        description: "AI-powered content analysis for smart text processing and context understanding",
        category: "ai",
        icon: "mdi:brain",
        color: "#9C27B0",
        version: "1.0.0",
        tags: ["ai", "analysis", "content", "context", "smart-processing"],
        inputs: [
            { id: "content", name: "Content to Analyze", type: "input", dataType: "mixed", required: false, description: "Text content or array of content items for AI analysis" },
            { id: "tool", name: "Tool", type: "input", dataType: "tool", required: false, description: "Available Tools" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "tool", name: "Tool", type: "output", dataType: "tool", required: false, description: "Available tools" },
            { id: "analyzed_content", name: "analyzed_content", type: "output", dataType: "array", required: false, description: "Content items with AI analysis results" },
            { id: "total_analyzed", name: "total_analyzed", type: "output", dataType: "number", required: false, description: "Total number of items analyzed" },
            { id: "total_replacements", name: "total_replacements", type: "output", dataType: "number", required: false, description: "Total number of replacements made" },
            { id: "analysis_mode", name: "analysis_mode", type: "output", dataType: "string", required: false, description: "The analysis mode used" },
            { id: "confidence_threshold", name: "confidence_threshold", type: "output", dataType: "number", required: false, description: "Confidence threshold used for replacements" },
            { id: "analyzed_at", name: "analyzed_at", type: "output", dataType: "string", required: false, description: "Timestamp when analysis was completed" }
        ],
        config: { targetText: "XB", replacementText: "Canvas", analysisMode: "context_aware", confidenceThreshold: 0.8 },
        configSchema: {
            type: "object",
            properties: {
                nodeType: { type: "select", title: "Node Type", description: "Choose the visual representation for this node", default: "tool", enum: ["tool", "default"], enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"] },
                targetText: { type: "string", title: "Target Text", description: "Text to analyze and potentially replace", default: "XB" },
                replacementText: { type: "string", title: "Replacement Text", description: "Text to replace with when appropriate", default: "Canvas" },
                analysisMode: { type: "string", title: "Analysis Mode", description: "Type of AI analysis to perform", enum: ["acronym_detection", "sentence_flow", "context_aware"], default: "context_aware" },
                confidenceThreshold: { type: "number", title: "Confidence Threshold", description: "Minimum confidence level for making replacements (0-1)", minimum: 0, maximum: 1, default: 0.8 }
            }
        }
    },
    {
        id: "calculator",
        name: "Calculator",
        type: "default",
        supportedTypes: ["default"],
        description: "Perform mathematical calculations",
        category: "tools",
        icon: "mdi:calculator",
        color: "#6366f1",
        version: "1.0.0",
        tags: ["tools", "calculator", "math", "compute"],
        inputs: [
            { id: "values", name: "Values", type: "input", dataType: "array", required: false, description: "Numeric values for calculation" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "result", name: "result", type: "output", dataType: "number", required: false, description: "The calculation result" },
            { id: "operation", name: "operation", type: "output", dataType: "string", required: false, description: "The operation performed" },
            { id: "values", name: "values", type: "output", dataType: "array", required: false, description: "The input values used" },
            { id: "precision", name: "precision", type: "output", dataType: "number", required: false, description: "The precision used" }
        ],
        configSchema: {
            type: "object",
            properties: {
                operation: { type: "string", title: "Operation", description: "Mathematical operation to perform", default: "add", enum: ["add", "subtract", "multiply", "divide", "power", "sqrt", "average", "min", "max", "median", "mode"] },
                precision: { type: "integer", title: "Precision", description: "Number of decimal places", default: 2 }
            }
        }
    },
    {
        id: "chat_model",
        name: "Chat Model",
        type: "default",
        supportedTypes: ["default"],
        description: "AI chat model for conversation and text generation",
        category: "models",
        icon: "mdi:robot",
        color: "#8b5cf6",
        version: "1.0.0",
        tags: ["model", "ai", "chat", "gpt"],
        inputs: [
            { id: "message", name: "Message", type: "input", dataType: "string", required: false, description: "The message to send to the model" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "response", name: "response", type: "output", dataType: "string", required: false, description: "The model response" },
            { id: "model", name: "model", type: "output", dataType: "string", required: false, description: "The model used" },
            { id: "temperature", name: "temperature", type: "output", dataType: "number", required: false, description: "The temperature setting" },
            { id: "tokens_used", name: "tokens_used", type: "output", dataType: "number", required: false, description: "Number of tokens used" }
        ],
        config: { model: "gpt-3.5-turbo", temperature: 0.7, maxTokens: 1000, systemPrompt: "" },
        configSchema: {
            type: "object",
            properties: {
                model: { type: "string", title: "Model", description: "The chat model to use", default: "gpt-3.5-turbo" },
                temperature: { type: "number", title: "Temperature", description: "Model temperature (0.0 to 2.0)", default: 0.7 },
                maxTokens: { type: "integer", title: "Max Tokens", description: "Maximum tokens in response", default: 1000 },
                systemPrompt: { type: "string", title: "System Prompt", description: "System prompt for the model", format: "multiline", default: "" }
            }
        }
    },
    {
        id: "chat_output",
        name: "Chat Output",
        type: "default",
        supportedTypes: ["default"],
        description: "Display chat-style output with formatting",
        category: "outputs",
        icon: "mdi:chat",
        color: "#8b5cf6",
        version: "1.0.0",
        tags: ["output", "chat", "display"],
        inputs: [
            { id: "message", name: "Chat Message", type: "input", dataType: "string", required: false, description: "The chat message to output" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "message", name: "message", type: "output", dataType: "string", required: false, description: "The chat message" },
            { id: "format", name: "format", type: "output", dataType: "string", required: false, description: "The message format" },
            { id: "timestamp", name: "timestamp", type: "output", dataType: "number", required: false, description: "The message timestamp" }
        ],
        config: { showTimestamp: true, maxLength: 2000, markdown: true },
        configSchema: {
            type: "object",
            properties: {
                message: { type: "string", title: "Message", description: "Default chat message", default: "" },
                format: { type: "string", title: "Format", description: "Message format (text, markdown, html)", default: "text" },
                showTimestamp: { type: "boolean", title: "Show Timestamp", description: "Whether to include timestamp", default: false }
            }
        }
    },
    {
        id: "content_classifier",
        name: "Content Classifier",
        type: "tool",
        supportedTypes: ["tool", "default"],
        description: "Classify content into categories (support, features, sales) for proper triage",
        category: "ai",
        icon: "mdi:tag-multiple",
        color: "#9C27B0",
        version: "1.0.0",
        tags: ["classification", "triage", "ai", "content-analysis"],
        inputs: [
            { id: "tool", name: "Tool", type: "input", dataType: "tool", required: false, description: "Available Tools" },
            { id: "structured_data", name: "Structured Data", type: "input", dataType: "json", required: false, description: "Processed form data for classification" },
            { id: "raw_data", name: "Raw Data", type: "input", dataType: "json", required: false, description: "Original form data" },
            { id: "submission_id", name: "Submission ID", type: "input", dataType: "string", required: false, description: "Unique submission identifier" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "tool", name: "Tool", type: "output", dataType: "tool", required: false, description: "Available tools" },
            { id: "submission_id", name: "submission_id", type: "output", dataType: "string", required: false, description: "Unique submission identifier" },
            { id: "primary_category", name: "primary_category", type: "output", dataType: "string", required: false, description: "Primary classification category" },
            { id: "confidence", name: "confidence", type: "output", dataType: "number", required: false, description: "Classification confidence score (0-1)" },
            { id: "category_scores", name: "category_scores", type: "output", dataType: "json", required: false, description: "Scores for all categories" },
            { id: "classification_reasoning", name: "classification_reasoning", type: "output", dataType: "string", required: false, description: "Explanation of the classification decision" },
            { id: "suggested_teams", name: "suggested_teams", type: "output", dataType: "array", required: false, description: "Recommended teams to handle this submission" },
            { id: "priority_level", name: "priority_level", type: "output", dataType: "string", required: false, description: "Priority level (normal, medium, high)" },
            { id: "keywords_found", name: "keywords_found", type: "output", dataType: "json", required: false, description: "Keywords that influenced classification" },
            { id: "classified_at", name: "classified_at", type: "output", dataType: "string", required: false, description: "Classification timestamp" }
        ],
        config: { classificationMode: "full_analysis", confidenceThreshold: 0.7, categories: ["support", "features", "sales", "general"] },
        configSchema: {
            type: "object",
            properties: {
                nodeType: { type: "select", title: "Node Type", description: "Choose the visual representation for this node", default: "tool", enum: ["tool", "default"], enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"] },
                classificationMode: { type: "string", title: "Classification Mode", description: "Type of analysis to perform", enum: ["keyword_only", "sentiment_analysis", "full_analysis"], default: "full_analysis" },
                confidenceThreshold: { type: "number", title: "Confidence Threshold", description: "Minimum confidence for classification (0-1)", minimum: 0, maximum: 1, default: 0.7 },
                categories: { type: "array", title: "Available Categories", description: "Categories to classify content into", items: { type: "string" }, default: ["support", "features", "sales", "general"] }
            }
        }
    },
    {
        id: "content_loader",
        name: "Content Loader",
        type: "tool",
        supportedTypes: ["tool", "default"],
        description: "Load content from the site for batch processing",
        category: "data",
        icon: "mdi:database-import",
        color: "#FF9800",
        version: "1.0.0",
        tags: ["content", "drupal", "batch", "loader"],
        inputs: [
            { id: "tool", name: "Tool", type: "input", dataType: "tool", required: false, description: "Available Tools" },
            { id: "filters", name: "Additional Filters", type: "input", dataType: "json", required: false, description: "Additional filtering criteria" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "tool", name: "Tool", type: "output", dataType: "tool", required: false, description: "Available tools" },
            { id: "content_items", name: "content_items", type: "output", dataType: "array", required: false, description: "Array of loaded content items" },
            { id: "total_count", name: "total_count", type: "output", dataType: "number", required: false, description: "Total number of items loaded" },
            { id: "content_type", name: "content_type", type: "output", dataType: "string", required: false, description: "The content type that was loaded" },
            { id: "loaded_at", name: "loaded_at", type: "output", dataType: "string", required: false, description: "Timestamp when content was loaded" }
        ],
        config: { contentType: "article", status: "published", limit: 50, fields: ["title", "body"] },
        configSchema: {
            type: "object",
            properties: {
                nodeType: { type: "select", title: "Node Type", description: "Choose the visual representation for this node", default: "tool", enum: ["tool", "default"], enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"] },
                contentType: { type: "string", title: "Content Type", description: "The content type to load", enum: ["article", "page", "blog_post", "news"], default: "article" },
                status: { type: "string", title: "Publication Status", description: "Filter by publication status", enum: ["published", "unpublished", "all"], default: "published" },
                limit: { type: "integer", title: "Limit", description: "Maximum number of items to load", minimum: 1, maximum: 1000, default: 50 },
                fields: { type: "array", title: "Fields to Load", description: "Which fields to include in the output", items: { type: "string", enum: ["title", "body", "summary", "author", "created", "tags"] }, default: ["title", "body"] }
            }
        }
    },
    {
        id: "conversation_buffer",
        name: "Conversation Buffer",
        type: "default",
        supportedTypes: ["default"],
        description: "Store conversation history",
        category: "memories",
        icon: "mdi:database",
        color: "#8b5cf6",
        version: "1.0.0",
        tags: ["memory", "conversation", "history", "buffer"],
        inputs: [
            { id: "message", name: "Message", type: "input", dataType: "string", required: false, description: "The message to add to the buffer" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "buffer", name: "buffer", type: "output", dataType: "mixed", required: false, description: "The conversation buffer" },
            { id: "operation", name: "operation", type: "output", dataType: "string", required: false, description: "The operation performed" },
            { id: "buffer_size", name: "buffer_size", type: "output", dataType: "number", required: false, description: "Number of messages in buffer" },
            { id: "max_messages", name: "max_messages", type: "output", dataType: "number", required: false, description: "Maximum messages allowed" },
            { id: "include_metadata", name: "include_metadata", type: "output", dataType: "boolean", required: false, description: "Whether metadata is included" },
            { id: "format", name: "format", type: "output", dataType: "string", required: false, description: "The output format" }
        ],
        config: { maxTokens: 2000, returnMessages: true },
        configSchema: { type: "object", properties: { operation: { type: "string", title: "Operation", description: "Buffer operation to perform", default: "add", enum: ["add", "clear", "get", "truncate"] }, maxMessages: { type: "integer", title: "Max Messages", description: "Maximum number of messages to keep", default: 10 }, includeMetadata: { type: "boolean", title: "Include Metadata", description: "Whether to include message metadata", default: true }, format: { type: "string", title: "Format", description: "Output format to use", default: "array", enum: ["array", "json", "text"] } } }
    },
    {
        id: "conversation_history",
        name: "Conversation History",
        type: "conversation_history",
        supportedTypes: ["conversation_history"],
        description: "Manages conversation history for AI agents and chat interfaces",
        category: "ai",
        icon: "mdi:message-text-clock",
        color: "#06b6d4",
        version: "1.0.0",
        tags: ["conversation", "history", "memory", "ai", "chat"],
        inputs: [
            { id: "action", name: "Action", type: "input", dataType: "string", required: false, description: "Action to perform on the conversation", defaultValue: "get" },
            { id: "conversationId", name: "Conversation ID", type: "input", dataType: "string", required: false, description: "ID of the conversation to operate on" },
            { id: "role", name: "Role", type: "input", dataType: "string", required: false, description: "Message role (for add action)", defaultValue: "user" },
            { id: "content", name: "Content", type: "input", dataType: "string", required: false, description: "Message content (for add action)" },
            { id: "systemPrompt", name: "System Prompt", type: "input", dataType: "string", required: false, description: "System prompt (for create action)" },
            { id: "toolCallId", name: "Tool Call ID", type: "input", dataType: "string", required: false, description: "Tool call ID (for tool role messages)" },
            { id: "metadata", name: "Metadata", type: "input", dataType: "json", required: false, description: "Additional metadata (for create action)" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "conversationId", name: "Conversation ID", type: "output", dataType: "string", required: false, description: "The conversation identifier" },
            { id: "messages", name: "Messages", type: "output", dataType: "array", required: false, description: "Conversation messages formatted for LLM" },
            { id: "messageCount", name: "Message Count", type: "output", dataType: "number", required: false, description: "Total number of messages in conversation" },
            { id: "found", name: "Found", type: "output", dataType: "boolean", required: false, description: "Whether the conversation was found (get action)" },
            { id: "created", name: "Created", type: "output", dataType: "boolean", required: false, description: "Whether a new conversation was created" },
            { id: "added", name: "Added", type: "output", dataType: "boolean", required: false, description: "Whether a message was added (add action)" },
            { id: "cleared", name: "Cleared", type: "output", dataType: "boolean", required: false, description: "Whether the history was cleared (clear action)" },
            { id: "deleted", name: "Deleted", type: "output", dataType: "boolean", required: false, description: "Whether the conversation was deleted" },
            { id: "systemPrompt", name: "System Prompt", type: "output", dataType: "string", required: false, description: "The system prompt if set" },
            { id: "metadata", name: "Metadata", type: "output", dataType: "json", required: false, description: "Conversation metadata" },
            { id: "error", name: "Error", type: "output", dataType: "string", required: false, description: "Error message if operation failed" }
        ],
        config: { strategy: "full", windowSize: 20 },
        configSchema: { type: "object", properties: { systemPrompt: { type: "string", title: "Default System Prompt", description: "Default system prompt for new conversations", default: "" }, strategy: { type: "string", title: "History Strategy", description: "How to manage conversation history", enum: ["full", "window"], default: "full" }, windowSize: { type: "integer", title: "Window Size", description: "Number of recent messages to keep (for window strategy)", default: 20, minimum: 1, maximum: 100 } } }
    },
    {
        id: "data_extractor",
        name: "Data Extractor",
        type: "default",
        supportedTypes: ["default"],
        description: "Extracts Data.",
        category: "processing",
        icon: "mdi:cog",
        color: "#007cba",
        version: "1.0.0",
        tags: [],
        inputs: [
            { id: "json", name: "JSON Input", type: "input", dataType: "string", required: false, description: "JSON string to extract data from (alternative to 'data' input)" },
            { id: "data", name: "Data Input", type: "input", dataType: "mixed", required: false, description: "Structured data (array/object) to extract from (alternative to 'json' input)" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "data", name: "data", type: "output", dataType: "mixed", required: false, description: "The extracted data from the JSON using the property path" },
            { id: "path", name: "path", type: "output", dataType: "string", required: false, description: "The property path used for extraction" },
            { id: "success", name: "success", type: "output", dataType: "boolean", required: false, description: "Whether the extraction was successful" }
        ],
        config: [],
        configSchema: { type: "object", properties: { path: { type: "string", title: "Property Path", description: "Property path to extract data (e.g., \"[users][0][name]\" or \"data.user.email\"). Leave empty to return entire JSON.", default: "" } } }
    },
    {
        id: "data_operations",
        name: "Data Operations",
        type: "default",
        supportedTypes: ["default"],
        description: "Perform operations on Data objects",
        category: "processing",
        icon: "mdi:database-cog",
        color: "#6366f1",
        version: "1.0.0",
        tags: ["processing", "data", "operations"],
        inputs: [
            { id: "data", name: "Data", type: "input", dataType: "array", required: false, description: "Data to process" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "result", name: "result", type: "output", dataType: "array", required: false, description: "The processed data result" },
            { id: "operation", name: "operation", type: "output", dataType: "string", required: false, description: "The operation performed" },
            { id: "input_count", name: "input_count", type: "output", dataType: "number", required: false, description: "Number of input items" },
            { id: "output_count", name: "output_count", type: "output", dataType: "number", required: false, description: "Number of output items" }
        ],
        config: { operation: "select_keys", keys: [], filterKey: "", filterValue: "" },
        configSchema: { type: "object", properties: { operation: { type: "string", title: "Operation", description: "Data operation to perform", default: "filter", enum: ["filter", "sort", "group", "map", "reduce", "unique", "slice", "merge"] }, key: { type: "string", title: "Key", description: "Key to operate on", default: "" }, value: { type: "mixed", title: "Value", description: "Value for the operation", default: "" }, condition: { type: "string", title: "Condition", description: "Condition for filtering", default: "equals", enum: ["equals", "not_equals", "contains", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "is_empty", "is_not_empty"] } } }
    },
    {
        id: "data_to_dataframe",
        name: "Data to DataFrame",
        type: "default",
        supportedTypes: ["default"],
        description: "Convert Data objects to DataFrame",
        category: "data",
        icon: "mdi:table-plus",
        color: "#10b981",
        version: "1.0.0",
        tags: ["data", "dataframe", "convert", "table"],
        inputs: [
            { id: "data", name: "Data", type: "input", dataType: "array", required: false, description: "The data to convert to dataframe" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "dataframe", name: "dataframe", type: "output", dataType: "json", required: false, description: "The dataframe structure" },
            { id: "format", name: "format", type: "output", dataType: "string", required: false, description: "The output format" },
            { id: "rows_count", name: "rows_count", type: "output", dataType: "number", required: false, description: "Number of rows in dataframe" },
            { id: "columns_count", name: "columns_count", type: "output", dataType: "number", required: false, description: "Number of columns in dataframe" },
            { id: "include_index", name: "include_index", type: "output", dataType: "boolean", required: false, description: "Whether index is included" },
            { id: "orient", name: "orient", type: "output", dataType: "string", required: false, description: "The orientation used" }
        ],
        config: { includeText: true },
        configSchema: { type: "object", properties: { format: { type: "string", title: "Format", description: "Output format to use", default: "json", enum: ["json", "csv", "parquet"] }, includeIndex: { type: "boolean", title: "Include Index", description: "Whether to include row indices", default: false }, orient: { type: "string", title: "Orientation", description: "Data orientation to use", default: "records", enum: ["records", "index", "columns", "split"] } } }
    },
    {
        id: "data_to_json",
        name: "Data to JSON",
        type: "default",
        supportedTypes: ["default"],
        description: "",
        category: "processing",
        icon: "mdi:cog",
        color: "#007cba",
        version: "1.0.0",
        tags: [],
        inputs: [
            { id: "data", name: "Data", type: "input", dataType: "mixed", required: false, description: "The structured data to encode as JSON (array/object)" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "json", name: "json", type: "output", dataType: "string", required: false, description: "The JSON string representation" },
            { id: "success", name: "success", type: "output", dataType: "boolean", required: false, description: "Whether the conversion was successful" }
        ],
        config: [],
        configSchema: { type: "object", properties: [] }
    },
    {
        id: "dataframe_operations",
        name: "DataFrame Operations",
        type: "default",
        supportedTypes: ["default"],
        description: "Perform operations on DataFrames",
        category: "processing",
        icon: "mdi:table-cog",
        color: "#84cc16",
        version: "1.0.0",
        tags: ["processing", "dataframe", "table", "operations"],
        inputs: [
            { id: "dataframe", name: "Dataframe", type: "input", dataType: "json", required: false, description: "The dataframe to operate on" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "result", name: "result", type: "output", dataType: "json", required: false, description: "The processed dataframe" },
            { id: "operation", name: "operation", type: "output", dataType: "string", required: false, description: "The operation performed" },
            { id: "input_rows", name: "input_rows", type: "output", dataType: "number", required: false, description: "Number of input rows" },
            { id: "output_rows", name: "output_rows", type: "output", dataType: "number", required: false, description: "Number of output rows" },
            { id: "columns", name: "columns", type: "output", dataType: "array", required: false, description: "The columns used" },
            { id: "rows", name: "rows", type: "output", dataType: "number", required: false, description: "The number of rows" }
        ],
        config: { operation: "filter", columnName: "", filterValue: "", ascending: true },
        configSchema: { type: "object", properties: { operation: { type: "string", title: "Operation", description: "Dataframe operation to perform", default: "head", enum: ["head", "tail", "select", "filter", "sort", "group", "aggregate", "merge"] }, columns: { type: "array", title: "Columns", description: "Columns to operate on", default: [] }, rows: { type: "integer", title: "Rows", description: "Number of rows for head/tail operations", default: 5 }, condition: { type: "string", title: "Condition", description: "Filter condition", default: "" } } }
    },
    {
        id: "date_time",
        name: "Date & Time",
        type: "default",
        supportedTypes: ["default"],
        description: "Handle date and time operations",
        category: "tools",
        icon: "mdi:calendar-clock",
        color: "#84cc16",
        version: "1.0.0",
        tags: ["tools", "date", "time", "format"],
        inputs: [
            { id: "datetime", name: "DateTime", type: "input", dataType: "string", required: false, description: "Optional datetime input to process" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "datetime", name: "datetime", type: "output", dataType: "string", required: false, description: "The formatted datetime" },
            { id: "timestamp", name: "timestamp", type: "output", dataType: "number", required: false, description: "The Unix timestamp" },
            { id: "format", name: "format", type: "output", dataType: "string", required: false, description: "The format used" },
            { id: "timezone", name: "timezone", type: "output", dataType: "string", required: false, description: "The timezone used" },
            { id: "operation", name: "operation", type: "output", dataType: "string", required: false, description: "The operation performed" },
            { id: "iso", name: "iso", type: "output", dataType: "string", required: false, description: "ISO 8601 formatted datetime" }
        ],
        config: { format: "YYYY-MM-DD", timezone: "UTC" },
        configSchema: { type: "object", properties: { operation: { type: "string", title: "Operation", description: "DateTime operation (current, timestamp, iso, unix, custom)", default: "current" }, format: { type: "string", title: "Format", description: "PHP date format string", default: "Y-m-d H:i:s" }, timezone: { type: "string", title: "Timezone", description: "Timezone to use", default: "UTC" }, customFormat: { type: "string", title: "Custom Format", description: "Custom date format for custom operation", default: "Y-m-d H:i:s" } } }
    },
    {
        id: "file_upload",
        name: "File Upload",
        type: "default",
        supportedTypes: ["default"],
        description: "Upload and process files of various formats",
        category: "inputs",
        icon: "mdi:file-upload",
        color: "#ef4444",
        version: "1.0.0",
        tags: ["input", "file", "upload", "document"],
        inputs: [
            { id: "files", name: "Files", type: "input", dataType: "array", required: false, description: "Array of files to upload with name and content" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "uploaded_files", name: "uploaded_files", type: "output", dataType: "array", required: false, description: "The uploaded files information" },
            { id: "errors", name: "errors", type: "output", dataType: "array", required: false, description: "Any errors that occurred" },
            { id: "directory", name: "directory", type: "output", dataType: "string", required: false, description: "The upload directory" },
            { id: "total_files", name: "total_files", type: "output", dataType: "number", required: false, description: "Total number of files uploaded" },
            { id: "total_errors", name: "total_errors", type: "output", dataType: "number", required: false, description: "Total number of errors" }
        ],
        config: { allowedTypes: ["txt", "pdf", "docx", "csv", "json"], maxSize: 10485760 },
        configSchema: { type: "object", properties: { directory: { type: "string", title: "Directory", description: "Directory to upload files to", default: "public://flowdrop/uploads/" }, allowedExtensions: { type: "array", title: "Allowed Extensions", description: "Allowed file extensions", items: { type: "string", title: "Extension", placeholder: "e.g., pdf" }, default: ["txt", "pdf", "doc", "docx"] }, maxFileSize: { type: "integer", title: "Max File Size", description: "Maximum file size in bytes", default: 10485760 }, overwrite: { type: "boolean", title: "Overwrite", description: "Whether to overwrite existing files", default: false } } }
    },
    {
        id: "form_data_receiver",
        name: "Form Data Receiver",
        type: "tool",
        supportedTypes: ["tool", "default"],
        description: "Receive and process form submission data from contact forms",
        category: "inputs",
        icon: "mdi:form-select",
        color: "#4CAF50",
        version: "1.0.0",
        tags: ["form", "input", "contact", "submission"],
        inputs: [
            { id: "tool", name: "Tool", type: "input", dataType: "tool", required: false, description: "Available Tools" },
            { id: "form_data", name: "Form Data", type: "input", dataType: "json", required: false, description: "Raw form submission data" },
            { id: "submission_id", name: "Submission ID", type: "input", dataType: "string", required: false, description: "Unique identifier for this submission" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "tool", name: "Tool", type: "output", dataType: "tool", required: false, description: "Available tools" },
            { id: "submission_id", name: "submission_id", type: "output", dataType: "string", required: false, description: "Unique submission identifier" },
            { id: "form_id", name: "form_id", type: "output", dataType: "string", required: false, description: "Form identifier" },
            { id: "raw_data", name: "raw_data", type: "output", dataType: "json", required: false, description: "Original form data as submitted" },
            { id: "structured_data", name: "structured_data", type: "output", dataType: "json", required: false, description: "Processed and structured form data" },
            { id: "validation_results", name: "validation_results", type: "output", dataType: "json", required: false, description: "Validation results for each field" },
            { id: "is_valid", name: "is_valid", type: "output", dataType: "boolean", required: false, description: "Whether the form data is valid" },
            { id: "received_at", name: "received_at", type: "output", dataType: "string", required: false, description: "Timestamp when form was received" },
            { id: "processing_metadata", name: "processing_metadata", type: "output", dataType: "json", required: false, description: "Additional metadata about the submission" }
        ],
        config: { formId: "contact_form", requiredFields: ["name", "email", "message"], validateEmail: true },
        configSchema: { type: "object", properties: { nodeType: { type: "select", title: "Node Type", description: "Choose the visual representation for this node", default: "tool", enum: ["tool", "default"], enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"] }, formId: { type: "string", title: "Form ID", description: "Identifier for the form type", default: "contact_form" }, requiredFields: { type: "array", title: "Required Fields", description: "List of required form fields", items: { type: "string" }, default: ["name", "email", "message"] }, validateEmail: { type: "boolean", title: "Validate Email", description: "Whether to validate email field format", default: true } } }
    },
    {
        id: "http_request",
        name: "HTTP Request",
        type: "default",
        supportedTypes: ["default"],
        description: "Make HTTP requests to external APIs and services",
        category: "tools",
        icon: "mdi:web",
        color: "#3b82f6",
        version: "1.0.0",
        tags: ["tool", "http", "api", "request"],
        inputs: [
            { id: "url", name: "URL", type: "input", dataType: "string", required: false, description: "The URL to request (overrides config)" },
            { id: "method", name: "HTTP Method", type: "input", dataType: "string", required: false, description: "The HTTP method to use (overrides config)" },
            { id: "headers", name: "Headers", type: "input", dataType: "json", required: false, description: "Additional headers to send" },
            { id: "body", name: "Request Body", type: "input", dataType: "string", required: false, description: "Request body (overrides config)" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "status_code", name: "status_code", type: "output", dataType: "number", required: false, description: "HTTP response status code" },
            { id: "headers", name: "headers", type: "output", dataType: "array", required: false, description: "HTTP response headers" },
            { id: "body", name: "body", type: "output", dataType: "string", required: false, description: "HTTP response body" },
            { id: "json", name: "json", type: "output", dataType: "array", required: false, description: "Parsed JSON response (if applicable)" },
            { id: "url", name: "url", type: "output", dataType: "string", required: false, description: "The URL that was requested" },
            { id: "method", name: "method", type: "output", dataType: "string", required: false, description: "The HTTP method used" },
            { id: "request_time", name: "request_time", type: "output", dataType: "string", required: false, description: "Timestamp when request was made" }
        ],
        config: { method: "GET", url: "", headers: [], timeout: 30, followRedirects: true },
        configSchema: { type: "object", properties: { url: { type: "string", title: "URL", description: "The URL to request", default: "" }, method: { type: "string", title: "HTTP Method", description: "The HTTP method to use", default: "GET", enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"] }, headers: { type: "object", title: "Headers", description: "HTTP headers to send", default: [] }, body: { type: "string", title: "Request Body", description: "Request body for POST/PUT requests", default: "" }, timeout: { type: "integer", title: "Timeout", description: "Request timeout in seconds", default: 30, minimum: 1, maximum: 300 }, follow_redirects: { type: "boolean", title: "Follow Redirects", description: "Whether to follow HTTP redirects", default: true } } }
    },
    {
        id: "huggingface_embeddings",
        name: "HuggingFace Embeddings",
        type: "default",
        supportedTypes: ["default"],
        description: "Generate embeddings using HuggingFace models",
        category: "embeddings",
        icon: "mdi:vector-square",
        color: "#f59e0b",
        version: "1.0.0",
        tags: ["embeddings", "huggingface", "vector"],
        inputs: [
            { id: "texts", name: "Texts", type: "input", dataType: "array", required: false, description: "Texts to generate embeddings for" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "embeddings", name: "embeddings", type: "output", dataType: "array", required: false, description: "The generated embeddings" },
            { id: "model", name: "model", type: "output", dataType: "string", required: false, description: "The model used" },
            { id: "usage", name: "usage", type: "output", dataType: "json", required: false, description: "Usage information" },
            { id: "texts_count", name: "texts_count", type: "output", dataType: "number", required: false, description: "Number of texts processed" },
            { id: "embedding_dimensions", name: "embedding_dimensions", type: "output", dataType: "number", required: false, description: "Number of dimensions in embeddings" },
            { id: "normalize", name: "normalize", type: "output", dataType: "boolean", required: false, description: "Whether embeddings were normalized" }
        ],
        config: { model: "sentence-transformers/all-MiniLM-L6-v2", apiToken: "" },
        configSchema: { type: "object", properties: { model: { type: "string", title: "Model", description: "Hugging Face model to use for embeddings", default: "sentence-transformers/all-MiniLM-L6-v2" }, apiKey: { type: "string", title: "API Key", description: "Hugging Face API key", default: "" }, maxLength: { type: "integer", title: "Max Length", description: "Maximum sequence length", default: 512 }, normalize: { type: "boolean", title: "Normalize", description: "Whether to normalize embeddings", default: true } } }
    },
    {
        id: "if_else",
        name: "If/Else",
        type: "gateway",
        supportedTypes: ["gateway"],
        description: "Simple conditional logic with text input, match text, and operator",
        category: "logic",
        icon: "mdi:code-braces",
        color: "#8b5cf6",
        version: "1.0.0",
        tags: ["logic", "if", "else", "conditional", "text", "comparison"],
        inputs: [
            { id: "data", name: "Input Data", type: "input", dataType: "mixed", required: false, description: "Optional input data (if not using textInput config)" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [],
        config: { textInput: "", matchText: "", operator: "equals", caseSensitive: false },
        configSchema: { type: "object", properties: { matchText: { type: "string", title: "Match Text", description: "The text to match against", default: "" }, operator: { type: "string", title: "Operator", description: "The comparison operator to use", default: "equals", enum: ["equals", "not_equals", "contains", "starts_with", "ends_with", "regex"] }, caseSensitive: { type: "boolean", title: "Case Sensitive", description: "Whether string comparisons are case sensitive", default: false }, branches: { type: "array", description: "The active branches", default: [{ name: "True", value: true }, { name: "False", value: false }], format: "hidden", items: { type: "object", properties: { name: { type: "string", description: "The name of the branch" }, value: { type: "boolean", description: "The value of the branch" } }, description: "The active branch" } } } }
    },
    {
        id: "json_to_data",
        name: "JSON to Data",
        type: "default",
        supportedTypes: ["default"],
        description: "",
        category: "processing",
        icon: "mdi:cog",
        color: "#007cba",
        version: "1.0.0",
        tags: [],
        inputs: [
            { id: "json", name: "JSON String", type: "input", dataType: "string", required: false, description: "The JSON string to decode" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "data", name: "data", type: "output", dataType: "mixed", required: false, description: "The decoded structured data (array/object)" },
            { id: "success", name: "success", type: "output", dataType: "boolean", required: false, description: "Whether the conversion was successful" }
        ],
        config: [],
        configSchema: { type: "object", properties: [] }
    },
    {
        id: "message_to_data",
        name: "Message to Data",
        type: "default",
        supportedTypes: ["default"],
        description: "Convert Message objects to Data objects",
        category: "data",
        icon: "mdi:message-arrow-right",
        color: "#f59e0b",
        version: "1.0.0",
        tags: ["data", "message", "convert"],
        inputs: [
            { id: "message", name: "Message", type: "input", dataType: "string", required: false, description: "The message to convert to data" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "data", name: "data", type: "output", dataType: "json", required: false, description: "The parsed data" },
            { id: "format", name: "format", type: "output", dataType: "string", required: false, description: "The format used for parsing" },
            { id: "extracted_fields", name: "extracted_fields", type: "output", dataType: "array", required: false, description: "The fields that were extracted" },
            { id: "original_message", name: "original_message", type: "output", dataType: "string", required: false, description: "The original message" }
        ],
        config: [],
        configSchema: { type: "object", properties: { format: { type: "string", title: "Format", description: "Data format to parse", default: "json", enum: ["json", "csv", "xml", "yaml", "key_value"] }, extractFields: { type: "array", title: "Extract Fields", description: "Specific fields to extract from the data", default: [] } } }
    },
    {
        id: "notes",
        name: "Notes",
        type: "note",
        supportedTypes: ["note"],
        description: "Add documentation and comments to your workflow with Markdown support",
        category: "tools",
        icon: "mdi:note-text",
        color: "#fbbf24",
        version: "1.0.0",
        tags: ["tools", "notes", "documentation", "comments", "markdown"],
        inputs: [{ id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }],
        outputs: [
            { id: "content", name: "Note Content", type: "output", dataType: "string", required: false, description: "The markdown content of the note" },
            { id: "noteType", name: "Note Type", type: "output", dataType: "string", required: false, description: "The visual type of the note (info, warning, success, error, note)" },
            { id: "message", name: "Message", type: "output", dataType: "string", required: false, description: "Status message about the note" }
        ],
        config: { content: "# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!", noteType: "info" },
        configSchema: { type: "object", properties: { content: { type: "string", title: "Note Content", description: "Documentation or comment text (supports Markdown)", format: "multiline", default: "# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!" }, noteType: { type: "string", title: "Note Type", description: "Visual style and color of the note", default: "info", enum: ["info", "warning", "success", "error", "note"] } } }
    },
    {
        id: "openai_chat",
        name: "OpenAI Chat",
        type: "default",
        supportedTypes: null,
        description: "OpenAI GPT models for text generation",
        category: "models",
        icon: "mdi:robot",
        color: "#10a37f",
        version: "1.0.0",
        tags: ["model", "openai", "gpt", "chat"],
        inputs: [],
        outputs: [],
        config: { model: "gpt-3.5-turbo", temperature: 0.7, maxTokens: 1000, apiKey: "" },
        configSchema: []
    },
    {
        id: "openai_embeddings",
        name: "OpenAI Embeddings",
        type: "default",
        supportedTypes: ["default"],
        description: "Generate embeddings using OpenAI models",
        category: "embeddings",
        icon: "mdi:vector-point",
        color: "#10a37f",
        version: "1.0.0",
        tags: ["embeddings", "openai", "vector"],
        inputs: [
            { id: "texts", name: "Texts", type: "input", dataType: "array", required: false, description: "Texts to generate embeddings for" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "embeddings", name: "embeddings", type: "output", dataType: "array", required: false, description: "The generated embeddings" },
            { id: "model", name: "model", type: "output", dataType: "string", required: false, description: "The model used" },
            { id: "usage", name: "usage", type: "output", dataType: "json", required: false, description: "Token usage information" },
            { id: "texts_count", name: "texts_count", type: "output", dataType: "number", required: false, description: "Number of texts processed" },
            { id: "embedding_dimensions", name: "embedding_dimensions", type: "output", dataType: "number", required: false, description: "Number of dimensions in embeddings" }
        ],
        config: { model: "text-embedding-3-small", apiKey: "" },
        configSchema: { type: "object", properties: { model: { type: "string", title: "Model", description: "OpenAI embedding model to use", default: "text-embedding-ada-002" }, apiKey: { type: "string", title: "API Key", description: "OpenAI API key", default: "" }, maxTokens: { type: "integer", title: "Max Tokens", description: "Maximum tokens per request", default: 8191 } } }
    },
    {
        id: "prompt_template",
        name: "Prompt Template",
        type: "default",
        supportedTypes: ["default"],
        description: "Create reusable prompt templates with variables",
        category: "prompts",
        icon: "mdi:message-text",
        color: "#f59e0b",
        version: "1.0.0",
        tags: ["prompt", "template", "variable"],
        inputs: [
            { id: "variables", name: "Input Variables", type: "input", dataType: "json", required: false, description: "Variables to substitute in the template" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "prompt", name: "prompt", type: "output", dataType: "string", required: false, description: "The generated prompt" },
            { id: "template", name: "template", type: "output", dataType: "string", required: false, description: "The original template" },
            { id: "variables", name: "variables", type: "output", dataType: "json", required: false, description: "The variables used" }
        ],
        config: { template: "You are a helpful assistant. {context}", variables: ["context"] },
        configSchema: { type: "object", properties: { template: { type: "string", title: "Template", description: "The prompt template with variables in {{variable}} format", default: "" }, variables: { type: "object", title: "Variables", description: "Default variables for the template", default: [] } } }
    },
    {
        id: "regex_extractor",
        name: "Regex Extractor",
        type: "default",
        supportedTypes: ["default"],
        description: "Extract patterns using regular expressions",
        category: "processing",
        icon: "mdi:regex",
        color: "#ec4899",
        version: "1.0.0",
        tags: ["processing", "regex", "extract", "pattern"],
        inputs: [
            { id: "text", name: "Text", type: "input", dataType: "string", required: false, description: "The text to extract from" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "matches", name: "matches", type: "output", dataType: "array", required: false, description: "The regex matches" },
            { id: "pattern", name: "pattern", type: "output", dataType: "string", required: false, description: "The regex pattern used" },
            { id: "flags", name: "flags", type: "output", dataType: "string", required: false, description: "The regex flags used" },
            { id: "match_all", name: "match_all", type: "output", dataType: "boolean", required: false, description: "Whether to match all occurrences" },
            { id: "total_matches", name: "total_matches", type: "output", dataType: "number", required: false, description: "The total number of matches" }
        ],
        config: { pattern: "", flags: "g" },
        configSchema: { type: "object", properties: { pattern: { type: "string", title: "Pattern", description: "The regex pattern to match", default: "" }, flags: { type: "string", title: "Flags", description: "Regex flags (i, m, s, x, etc.)", default: "" }, matchAll: { type: "boolean", title: "Match All", description: "Whether to match all occurrences", default: false } } }
    },
    {
        id: "save_to_file",
        name: "Save to File",
        type: "default",
        supportedTypes: ["default"],
        description: "Save data to various file formats",
        category: "data",
        icon: "mdi:content-save",
        color: "#ef4444",
        version: "1.0.0",
        tags: ["data", "save", "file", "export"],
        inputs: [
            { id: "content", name: "Content", type: "input", dataType: "mixed", required: false, description: "The content to save to file" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "success", name: "success", type: "output", dataType: "boolean", required: false, description: "Whether the file was saved successfully" },
            { id: "filename", name: "filename", type: "output", dataType: "string", required: false, description: "The filename used" },
            { id: "filepath", name: "filepath", type: "output", dataType: "string", required: false, description: "The full file path" },
            { id: "bytes_written", name: "bytes_written", type: "output", dataType: "number", required: false, description: "Number of bytes written" },
            { id: "format", name: "format", type: "output", dataType: "string", required: false, description: "The output format used" },
            { id: "append", name: "append", type: "output", dataType: "boolean", required: false, description: "Whether the file was appended to" }
        ],
        config: { fileFormat: "json", filePath: "./output/data.json" },
        configSchema: { type: "object", properties: { filename: { type: "string", title: "Filename", description: "The filename to save to", default: "output.txt" }, format: { type: "string", title: "Format", description: "Output format to use", default: "text", enum: ["text", "json"] }, append: { type: "boolean", title: "Append", description: "Whether to append to existing file", default: false }, directory: { type: "string", title: "Directory", description: "Directory to save file in", default: "public://flowdrop/" } } }
    },
    {
        id: "simple_agent",
        name: "Simple Agent",
        type: "default",
        supportedTypes: ["default"],
        description: "Agent for tool orchestration",
        category: "agents",
        icon: "mdi:account-cog",
        color: "#06b6d4",
        version: "1.0.0",
        tags: ["agent", "orchestration", "tools"],
        inputs: [
            { id: "message", name: "Message", type: "input", dataType: "string", required: false, description: "The message for the agent to process" },
            { id: "tools", name: "Tools", type: "input", dataType: "array", required: false, description: "Tools available to the agent", defaultValue: [] },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "response", name: "response", type: "output", dataType: "json", required: false, description: "The agent response" },
            { id: "system_prompt", name: "system_prompt", type: "output", dataType: "string", required: false, description: "The system prompt used" },
            { id: "temperature", name: "temperature", type: "output", dataType: "number", required: false, description: "The temperature setting" },
            { id: "max_tokens", name: "max_tokens", type: "output", dataType: "number", required: false, description: "The maximum tokens allowed" },
            { id: "tools_used", name: "tools_used", type: "output", dataType: "array", required: false, description: "The tools used by the agent" },
            { id: "message", name: "message", type: "output", dataType: "string", required: false, description: "The input message" }
        ],
        config: { model: "gpt-3.5-turbo", temperature: 0.7, maxIterations: 5 },
        configSchema: { type: "object", properties: { systemPrompt: { type: "string", title: "System Prompt", description: "System prompt for the agent", format: "multiline", default: "You are a helpful assistant." }, temperature: { type: "number", title: "Temperature", description: "Temperature for response generation (0.0 to 1.0)", default: 0.7 }, maxTokens: { type: "integer", title: "Max Tokens", description: "Maximum tokens for response", default: 1000 } } }
    },
    {
        id: "split_text",
        name: "Split Text",
        type: "default",
        supportedTypes: ["default"],
        description: "Split text into chunks for processing",
        category: "processing",
        icon: "mdi:content-cut",
        color: "#f59e0b",
        version: "1.0.0",
        tags: ["processing", "text", "split", "chunking"],
        inputs: [
            { id: "text", name: "Text", type: "input", dataType: "string", required: false, description: "The text to split" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "chunks", name: "chunks", type: "output", dataType: "array", required: false, description: "The text chunks" },
            { id: "method", name: "method", type: "output", dataType: "string", required: false, description: "The splitting method used" },
            { id: "chunk_size", name: "chunk_size", type: "output", dataType: "number", required: false, description: "The size of each chunk" },
            { id: "total_chunks", name: "total_chunks", type: "output", dataType: "number", required: false, description: "The total number of chunks" }
        ],
        config: { chunkSize: 1000, chunkOverlap: 200, separator: "\\\\n" },
        configSchema: { type: "object", properties: { method: { type: "string", title: "Method", description: "Splitting method to use", default: "words", enum: ["words", "characters", "sentences", "paragraphs"] }, chunkSize: { type: "integer", title: "Chunk Size", description: "Size of each chunk", default: 100 }, separator: { type: "string", title: "Separator", description: "Separator for word splitting", default: " " } } }
    },
    {
        id: "structured_output",
        name: "Structured Output",
        type: "default",
        supportedTypes: ["default"],
        description: "Generate structured output from models",
        category: "prompts",
        icon: "mdi:table",
        color: "#6366f1",
        version: "1.0.0",
        tags: ["prompt", "structured", "output", "schema"],
        inputs: [
            { id: "data", name: "Data", type: "input", dataType: "json", required: false, description: "The data to structure and output" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "output", name: "output", type: "output", dataType: "string", required: false, description: "The formatted output" },
            { id: "data", name: "data", type: "output", dataType: "json", required: false, description: "The structured data" },
            { id: "format", name: "format", type: "output", dataType: "string", required: false, description: "The output format used" },
            { id: "validation_errors", name: "validation_errors", type: "output", dataType: "array", required: false, description: "Any validation errors" },
            { id: "is_valid", name: "is_valid", type: "output", dataType: "boolean", required: false, description: "Whether the data is valid" }
        ],
        config: { schema: [], outputType: "json" },
        configSchema: { type: "object", properties: { format: { type: "string", title: "Format", description: "Output format to use", default: "json", enum: ["json", "xml", "yaml", "csv"] }, schema: { type: "object", title: "Schema", description: "Validation schema for the output", default: [] }, validate: { type: "boolean", title: "Validate", description: "Whether to validate against schema", default: true } } }
    },
    {
        id: "text_find_replace",
        name: "Text Find & Replace",
        type: "default",
        supportedTypes: ["default"],
        description: "Find and replace text in content with advanced options",
        category: "processing",
        icon: "mdi:find-replace",
        color: "#2196F3",
        version: "1.0.0",
        tags: ["text", "replace", "content", "processing"],
        inputs: [
            { id: "content", name: "Content to Process", type: "input", dataType: "mixed", required: false, description: "Text content or array of content items to process" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "processed_content", name: "processed_content", type: "output", dataType: "mixed", required: false, description: "The processed content with replacements made" },
            { id: "replacements_made", name: "replacements_made", type: "output", dataType: "number", required: false, description: "Total number of replacements made" },
            { id: "find_text", name: "find_text", type: "output", dataType: "string", required: false, description: "The text that was searched for" },
            { id: "replace_text", name: "replace_text", type: "output", dataType: "string", required: false, description: "The replacement text used" },
            { id: "processed_at", name: "processed_at", type: "output", dataType: "string", required: false, description: "Timestamp when processing completed" }
        ],
        config: { findText: "XB", replaceText: "Canvas", caseSensitive: false, useRegex: false, wholeWordsOnly: true },
        configSchema: { type: "object", properties: { findText: { type: "string", title: "Find Text", description: "Text to search for", default: "XB" }, replaceText: { type: "string", title: "Replace Text", description: "Text to replace with", default: "Canvas" }, caseSensitive: { type: "boolean", title: "Case Sensitive", description: "Whether the search should be case sensitive", default: false }, useRegex: { type: "boolean", title: "Use Regular Expressions", description: "Treat find text as a regular expression", default: false }, wholeWordsOnly: { type: "boolean", title: "Whole Words Only", description: "Only match whole words, not partial matches", default: true } } }
    },
    {
        id: "text_input",
        name: "Text Input",
        type: "simple",
        supportedTypes: ["simple", "square", "default"],
        description: "Simple text input for user data",
        category: "inputs",
        icon: "mdi:text",
        color: "#22c55e",
        version: "1.0.0",
        tags: ["input", "text", "user-input"],
        inputs: [],
        outputs: [{ id: "text", name: "text", type: "output", dataType: "string", required: false, description: "The input text value" }],
        config: { placeholder: "Enter text here...", defaultValue: "", multiline: false },
        configSchema: { type: "object", properties: { nodeType: { type: "select", title: "Node Type", description: "Choose the visual representation for this node", default: "simple", enum: ["simple", "square", "default"], enumNames: ["Simple (compact layout)", "Square (square layout)", "Default"] }, placeholder: { type: "string", title: "Placeholder", description: "Placeholder text for the input field", default: "Enter text..." }, defaultValue: { type: "string", title: "Default Value", description: "Default text value", default: "" } } }
    },
    {
        id: "text_output",
        name: "Text Output",
        type: "simple",
        supportedTypes: ["square", "simple", "default"],
        description: "Simple text output for displaying data",
        category: "outputs",
        icon: "mdi:text-box",
        color: "#ef4444",
        version: "1.0.0",
        tags: ["output", "text", "display"],
        inputs: [
            { id: "text", name: "Text Input", type: "input", dataType: "string", required: false, description: "The text to output" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [],
        config: { format: "plain", maxLength: 1000, showTimestamp: false },
        configSchema: { type: "object", properties: { nodeType: { type: "select", title: "Node Type", description: "Choose the visual representation for this node", default: "simple", enum: ["simple", "square", "default"], enumNames: ["Simple (compact layout)", "Square (square layout)", "Default"] }, maxLength: { type: "integer", title: "Maximum Length", description: "Maximum length of output text", default: 1000, minimum: 1, maximum: 10000 }, format: { type: "string", title: "Text Format", description: "Text formatting option", default: "plain", enum: ["plain", "html", "markdown"] } } }
    },
    {
        id: "trigger",
        name: "Trigger",
        type: "terminal",
        supportedTypes: ["terminal"],
        description: "",
        category: "processing",
        icon: "mdi:cog",
        color: "#007cba",
        version: "1.0.0",
        tags: [],
        inputs: [],
        outputs: [{ id: "output", name: "Output", type: "output", dataType: "json", required: false, description: "Trigger output containing entity data, event type, and metadata" }],
        config: { triggerData: [], enabled: 1, eventType: "entity.insert", entityTypes: ["node"], bundles: [], orchestrator: "default" },
        configSchema: { type: "object", properties: { triggerData: { type: "object", title: "Trigger Data", description: "Default data to use when the trigger is activated", default: [] }, workflowId: { type: "string", title: "Workflow ID", description: "The ID of the workflow to trigger", default: "" }, pipelineId: { type: "string", title: "Pipeline ID", description: "The ID of the pipeline to trigger", default: "" }, description: { type: "string", title: "Description", description: "Optional description for this trigger", default: "" }, enabled: { type: "boolean", title: "Enabled", description: "Whether this trigger is enabled", default: true }, variant: { type: "string", title: "Variant", description: "Terminal node variant (start for triggers)", enum: ["start"], default: "start" }, eventType: { type: "string", title: "Event Type", description: "The type of entity event to trigger on", enum: ["entity.insert", "entity.update", "entity.delete", "entity.presave", "user.login", "user.logout"], enumLabels: ["Entity Created", "Entity Updated", "Entity Deleted", "Before Entity Save", "User Login", "User Logout"], default: "entity.insert" }, entityTypes: { type: "array", title: "Entity Types", description: "Entity types to trigger on (empty = all content entities)", items: { type: "string" }, default: ["node"] }, bundles: { type: "array", title: "Bundles", description: "Content type bundles to trigger on (empty = all)", items: { type: "string" }, default: [] }, orchestrator: { type: "string", title: "Orchestrator", description: "Override the default orchestrator for this trigger. Use 'default' for automatic selection based on event type, or specify a custom orchestrator ID.", examples: ["default", "synchronous", "asynchronous"], default: "default" } }, required: [] }
    },
    {
        id: "url_fetch",
        name: "URL Fetch",
        type: "default",
        supportedTypes: ["default"],
        description: "Fetch content from URLs",
        category: "inputs",
        icon: "mdi:link",
        color: "#3b82f6",
        version: "1.0.0",
        tags: ["input", "url", "web", "fetch"],
        inputs: [
            { id: "url", name: "URL", type: "input", dataType: "string", required: false, description: "The URL to fetch" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "response", name: "response", type: "output", dataType: "json", required: false, description: "The HTTP response" },
            { id: "url", name: "url", type: "output", dataType: "string", required: false, description: "The URL that was fetched" },
            { id: "method", name: "method", type: "output", dataType: "string", required: false, description: "The HTTP method used" },
            { id: "timeout", name: "timeout", type: "output", dataType: "number", required: false, description: "The timeout used" },
            { id: "follow_redirects", name: "follow_redirects", type: "output", dataType: "boolean", required: false, description: "Whether redirects were followed" },
            { id: "parse_json", name: "parse_json", type: "output", dataType: "boolean", required: false, description: "Whether JSON was parsed" }
        ],
        config: { urls: [], maxDepth: 1, format: "text", timeout: 30 },
        configSchema: { type: "object", properties: { url: { type: "string", title: "URL", description: "The URL to fetch", default: "" }, method: { type: "string", title: "Method", description: "HTTP method to use", default: "GET", enum: ["GET", "POST", "PUT", "DELETE"] }, headers: { type: "object", title: "Headers", description: "HTTP headers to send", default: [] }, timeout: { type: "integer", title: "Timeout", description: "Request timeout in seconds", default: 30 }, followRedirects: { type: "boolean", title: "Follow Redirects", description: "Whether to follow HTTP redirects", default: true }, parseJson: { type: "boolean", title: "Parse JSON", description: "Whether to parse JSON response", default: false } } }
    },
    {
        id: "webhook",
        name: "Webhook",
        type: "default",
        supportedTypes: ["default"],
        description: "Receive data from external webhooks",
        category: "inputs",
        icon: "mdi:webhook",
        color: "#06b6d4",
        version: "1.0.0",
        tags: ["input", "webhook", "external"],
        inputs: [
            { id: "payload", name: "Payload", type: "input", dataType: "json", required: false, description: "The data to send in the webhook" },
            { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" }
        ],
        outputs: [
            { id: "response", name: "response", type: "output", dataType: "json", required: false, description: "The webhook response" },
            { id: "url", name: "url", type: "output", dataType: "string", required: false, description: "The webhook URL" },
            { id: "method", name: "method", type: "output", dataType: "string", required: false, description: "The HTTP method used" },
            { id: "payload", name: "payload", type: "output", dataType: "json", required: false, description: "The payload sent" },
            { id: "headers", name: "headers", type: "output", dataType: "json", required: false, description: "The headers sent" }
        ],
        config: { endpoint: "", method: "POST" },
        configSchema: { type: "object", properties: { url: { type: "string", title: "URL", description: "The webhook URL", default: "" }, method: { type: "string", title: "Method", description: "HTTP method to use", default: "POST", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] }, headers: { type: "object", title: "Headers", description: "HTTP headers to send", default: [] }, timeout: { type: "integer", title: "Timeout", description: "Request timeout in seconds", default: 30 } } }
    }
];

/**
 * Get a node by ID
 */
export function getNodeById(id: string): NodeMetadata | undefined {
    return mockNodes.find((node) => node.id === id);
}

/**
 * Filter nodes by category
 */
export function getNodesByCategory(category: string): NodeMetadata[] {
    if (category === "all") {
        return mockNodes;
    }
    return mockNodes.filter((node) => node.category === category);
}

/**
 * Search nodes by name, description, or tags
 */
export function searchNodes(query: string): NodeMetadata[] {
    const lowerQuery = query.toLowerCase();
    return mockNodes.filter(
        (node) =>
            node.name.toLowerCase().includes(lowerQuery) ||
            node.description.toLowerCase().includes(lowerQuery) ||
            node.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
}

/**
 * Total count of nodes
 */
export const mockNodesCount = mockNodes.length;

