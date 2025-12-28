/**
 * Mock workflow data for MSW mock server
 * Provides sample workflows for API testing and documentation
 */

import type { Workflow, WorkflowNode, WorkflowEdge } from "../../lib/types/index.js";

/** Workflow metadata type extracted from Workflow interface */
type WorkflowMetadata = NonNullable<Workflow["metadata"]>;

/**
 * Demo workflow: AI-Powered Content Enhancement
 * Demonstrates intelligent content processing using AI to distinguish context and make smart replacements
 */
export const demoAIContentWorkflow: Workflow = {
	id: "demo_ai_content",
	name: "Demo: AI-Powered Content Enhancement",
	description: "Demonstrates intelligent content processing using AI to distinguish context and make smart replacements",
	nodes: [
		{
			id: "content_loader.1",
			type: "universalNode",
			position: { x: -240, y: 70 },
			data: {
				label: "Content Loader",
				config: {
					nodeType: "tool",
					contentType: "article",
					status: "published",
					limit: 50,
					fields: ["title", "body"]
				},
				metadata: {
					id: "content_loader",
					name: "Content Loader",
					type: "tool",
					supportedTypes: ["tool", "default"],
					description: "Load content from the site for batch processing",
					category: "content",
					icon: "mdi:database-import",
					color: "#FF9800",
					version: "1.0.0",
					enabled: true,
					tags: ["content", "drupal", "batch", "loader"],
					executor_plugin: "content_loader",
					inputs: [
						{
							id: "tool",
							name: "Tool",
							type: "input",
							dataType: "tool",
							required: false,
							description: "Available Tools"
						},
						{
							id: "filters",
							name: "Additional Filters",
							type: "input",
							dataType: "json",
							required: false,
							description: "Additional filtering criteria"
						},
						{
							id: "trigger",
							name: "Trigger",
							type: "input",
							dataType: "trigger",
							required: false,
							description: ""
						}
					],
					outputs: [
						{
							id: "tool",
							name: "Tool",
							type: "output",
							dataType: "tool",
							required: false,
							description: "Available tools"
						},
						{
							id: "content_items",
							name: "content_items",
							type: "output",
							dataType: "array",
							required: false,
							description: "Array of loaded content items"
						},
						{
							id: "total_count",
							name: "total_count",
							type: "output",
							dataType: "number",
							required: false,
							description: "Total number of items loaded"
						},
						{
							id: "content_type",
							name: "content_type",
							type: "output",
							dataType: "string",
							required: false,
							description: "The content type that was loaded"
						},
						{
							id: "loaded_at",
							name: "loaded_at",
							type: "output",
							dataType: "string",
							required: false,
							description: "Timestamp when content was loaded"
						}
					],
					config: {
						contentType: "article",
						status: "published",
						limit: 50,
						fields: ["title", "body"]
					},
					configSchema: {
						type: "object",
						properties: {
							nodeType: {
								type: "select",
								title: "Node Type",
								description: "Choose the visual representation for this node",
								default: "tool",
								enum: ["tool", "default"],
								enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
							},
							contentType: {
								type: "string",
								title: "Content Type",
								description: "The content type to load",
								enum: ["article", "page", "blog_post", "news"],
								default: "article"
							},
							status: {
								type: "string",
								title: "Publication Status",
								description: "Filter by publication status",
								enum: ["published", "unpublished", "all"],
								default: "published"
							},
							limit: {
								type: "integer",
								title: "Limit",
								description: "Maximum number of items to load",
								minimum: 1,
								maximum: 1000,
								default: 50
							},
							fields: {
								type: "array",
								title: "Fields to Load",
								description: "Which fields to include in the output",
								items: {
									type: "string",
									enum: ["title", "body", "summary", "author", "created", "tags"]
								},
								default: ["title", "body"]
							}
						}
					}
				},
				nodeId: "content_loader.1"
			},
			deletable: true,
			measured: { width: 288, height: 120 },
			selected: false,
			dragging: false
		},
		{
			id: "ai_content_analyzer.1",
			type: "universalNode",
			position: { x: 160, y: -10 },
			data: {
				label: "AI Content Analyzer",
				config: {
					nodeType: "tool",
					targetText: "XB",
					replacementText: "Canvas",
					analysisMode: "context_aware",
					confidenceThreshold: 0.8
				},
				metadata: {
					id: "ai_content_analyzer",
					name: "AI Content Analyzer",
					type: "tool",
					supportedTypes: ["tool", "default"],
					description: "AI-powered content analysis for smart text processing and context understanding",
					category: "ai",
					icon: "mdi:brain",
					color: "#9C27B0",
					version: "1.0.0",
					enabled: true,
					tags: ["ai", "analysis", "content", "context", "smart-processing"],
					executor_plugin: "ai_content_analyzer",
					inputs: [
						{
							id: "content",
							name: "Content to Analyze",
							type: "input",
							dataType: "mixed",
							required: false,
							description: "Text content or array of content items for AI analysis"
						},
						{
							id: "tool",
							name: "Tool",
							type: "input",
							dataType: "tool",
							required: false,
							description: "Available Tools"
						},
						{
							id: "trigger",
							name: "Trigger",
							type: "input",
							dataType: "trigger",
							required: false,
							description: ""
						}
					],
					outputs: [
						{
							id: "tool",
							name: "Tool",
							type: "output",
							dataType: "tool",
							required: false,
							description: "Available tools"
						},
						{
							id: "analyzed_content",
							name: "analyzed_content",
							type: "output",
							dataType: "array",
							required: false,
							description: "Content items with AI analysis results"
						},
						{
							id: "total_analyzed",
							name: "total_analyzed",
							type: "output",
							dataType: "number",
							required: false,
							description: "Total number of items analyzed"
						},
						{
							id: "total_replacements",
							name: "total_replacements",
							type: "output",
							dataType: "number",
							required: false,
							description: "Total number of replacements made"
						},
						{
							id: "analysis_mode",
							name: "analysis_mode",
							type: "output",
							dataType: "string",
							required: false,
							description: "The analysis mode used"
						},
						{
							id: "confidence_threshold",
							name: "confidence_threshold",
							type: "output",
							dataType: "number",
							required: false,
							description: "Confidence threshold used for replacements"
						},
						{
							id: "analyzed_at",
							name: "analyzed_at",
							type: "output",
							dataType: "string",
							required: false,
							description: "Timestamp when analysis was completed"
						}
					],
					config: {
						targetText: "XB",
						replacementText: "Canvas",
						analysisMode: "context_aware",
						confidenceThreshold: 0.8
					},
					configSchema: {
						type: "object",
						properties: {
							nodeType: {
								type: "select",
								title: "Node Type",
								description: "Choose the visual representation for this node",
								default: "tool",
								enum: ["tool", "default"],
								enumNames: ["Tool Node (with metadata port)", "Default Node (standard ports)"]
							},
							targetText: {
								type: "string",
								title: "Target Text",
								description: "Text to analyze and potentially replace",
								default: "XB"
							},
							replacementText: {
								type: "string",
								title: "Replacement Text",
								description: "Text to replace with when appropriate",
								default: "Canvas"
							},
							analysisMode: {
								type: "string",
								title: "Analysis Mode",
								description: "Type of AI analysis to perform",
								enum: ["acronym_detection", "sentence_flow", "context_aware"],
								default: "context_aware"
							},
							confidenceThreshold: {
								type: "number",
								title: "Confidence Threshold",
								description: "Minimum confidence level for making replacements (0-1)",
								minimum: 0,
								maximum: 1,
								default: 0.8
							}
						}
					}
				},
				nodeId: "ai_content_analyzer.1"
			},
			deletable: true,
			measured: { width: 288, height: 142 },
			selected: false,
			dragging: false
		},
		{
			id: "simple_agent.1",
			type: "universalNode",
			position: { x: 610, y: -220 },
			data: {
				label: "Simple Agent",
				config: {
					systemPrompt: "You are a helpful assistant.",
					temperature: 0.7,
					maxTokens: 1000
				},
				metadata: {
					id: "simple_agent",
					name: "Simple Agent",
					type: "default",
					supportedTypes: ["default"],
					description: "Agent for tool orchestration",
					category: "agents",
					icon: "mdi:account-cog",
					color: "#06b6d4",
					version: "1.0.0",
					enabled: true,
					tags: ["agent", "orchestration", "tools"],
					executor_plugin: "simple_agent",
					inputs: [
						{
							id: "message",
							name: "Message",
							type: "input",
							dataType: "string",
							required: false,
							description: "The message for the agent to process"
						},
						{
							id: "tools",
							name: "Tools",
							type: "input",
							dataType: "array",
							required: false,
							description: "Tools available to the agent",
							defaultValue: []
						},
						{
							id: "trigger",
							name: "Trigger",
							type: "input",
							dataType: "trigger",
							required: false,
							description: ""
						}
					],
					outputs: [
						{
							id: "response",
							name: "response",
							type: "output",
							dataType: "json",
							required: false,
							description: "The agent response"
						},
						{
							id: "system_prompt",
							name: "system_prompt",
							type: "output",
							dataType: "string",
							required: false,
							description: "The system prompt used"
						},
						{
							id: "temperature",
							name: "temperature",
							type: "output",
							dataType: "number",
							required: false,
							description: "The temperature setting"
						},
						{
							id: "max_tokens",
							name: "max_tokens",
							type: "output",
							dataType: "number",
							required: false,
							description: "The maximum tokens allowed"
						},
						{
							id: "tools_used",
							name: "tools_used",
							type: "output",
							dataType: "array",
							required: false,
							description: "The tools used by the agent"
						},
						{
							id: "message",
							name: "message",
							type: "output",
							dataType: "string",
							required: false,
							description: "The input message"
						}
					],
					config: {
						model: "gpt-3.5-turbo",
						temperature: 0.7,
						maxIterations: 5
					},
					configSchema: {
						type: "object",
						properties: {
							systemPrompt: {
								type: "string",
								title: "System Prompt",
								description: "System prompt for the agent",
								format: "multiline",
								default: "You are a helpful assistant."
							},
							temperature: {
								type: "number",
								title: "Temperature",
								description: "Temperature for response generation (0.0 to 1.0)",
								default: 0.7
							},
							maxTokens: {
								type: "integer",
								title: "Max Tokens",
								description: "Maximum tokens for response",
								default: 1000
							}
						}
					}
				},
				nodeId: "simple_agent.1"
			},
			deletable: true,
			measured: { width: 288, height: 815 },
			selected: false,
			dragging: false
		},
		{
			id: "text_input.1",
			type: "universalNode",
			position: { x: 0, y: -200 },
			data: {
				label: "Text Input",
				config: {
					nodeType: "simple",
					placeholder: "Enter text...",
					defaultValue: ""
				},
				metadata: {
					id: "text_input",
					name: "Text Input",
					type: "simple",
					supportedTypes: ["simple", "square", "default"],
					description: "Simple text input for user data",
					category: "inputs",
					icon: "mdi:text",
					color: "#22c55e",
					version: "1.0.0",
					enabled: true,
					tags: ["input", "text", "user-input"],
					executor_plugin: "text_input",
					inputs: [],
					outputs: [
						{
							id: "text",
							name: "text",
							type: "output",
							dataType: "string",
							required: false,
							description: "The input text value"
						}
					],
					config: {
						placeholder: "Enter text here...",
						defaultValue: "",
						multiline: false
					},
					configSchema: {
						type: "object",
						properties: {
							nodeType: {
								type: "select",
								title: "Node Type",
								description: "Choose the visual representation for this node",
								default: "simple",
								enum: ["simple", "square", "default"],
								enumNames: ["Simple (compact layout)", "Square (square layout)", "Default"]
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
					}
				},
				nodeId: "text_input.1"
			},
			deletable: true,
			measured: { width: 288, height: 88 },
			selected: false,
			dragging: false
		},
		{
			id: "text_output.1",
			type: "universalNode",
			position: { x: 1080, y: 410 },
			data: {
				label: "Text Output",
				config: {
					nodeType: "simple",
					maxLength: 1000,
					format: "plain"
				},
				metadata: {
					id: "text_output",
					name: "Text Output",
					type: "simple",
					supportedTypes: ["square", "simple", "default"],
					description: "Simple text output for displaying data",
					category: "outputs",
					icon: "mdi:text-box",
					color: "#ef4444",
					version: "1.0.0",
					enabled: true,
					tags: ["output", "text", "display"],
					executor_plugin: "text_output",
					inputs: [
						{
							id: "text",
							name: "Text Input",
							type: "input",
							dataType: "string",
							required: false,
							description: "The text to output"
						},
						{
							id: "trigger",
							name: "Trigger",
							type: "input",
							dataType: "trigger",
							required: false,
							description: ""
						}
					],
					outputs: [],
					config: {
						format: "plain",
						maxLength: 1000,
						showTimestamp: false
					},
					configSchema: {
						type: "object",
						properties: {
							nodeType: {
								type: "select",
								title: "Node Type",
								description: "Choose the visual representation for this node",
								default: "simple",
								enum: ["simple", "square", "default"],
								enumNames: ["Simple (compact layout)", "Square (square layout)", "Default"]
							},
							maxLength: {
								type: "integer",
								title: "Maximum Length",
								description: "Maximum length of output text",
								default: 1000,
								minimum: 1,
								maximum: 10000
							},
							format: {
								type: "string",
								title: "Text Format",
								description: "Text formatting option",
								default: "plain",
								enum: ["plain", "html", "markdown"]
							}
						}
					}
				},
				nodeId: "text_output.1"
			},
			deletable: true,
			measured: { width: 288, height: 88 },
			selected: false,
			dragging: false
		}
	] as WorkflowNode[],
	edges: [
		{
			id: "xy-edge__ai_content_analyzer.1ai_content_analyzer.1-output-tool-simple_agent.1simple_agent.1-input-tools",
			source: "ai_content_analyzer.1",
			target: "simple_agent.1",
			data: {
				metadata: { edgeType: "data" },
				targetNodeType: "universalNode",
				targetCategory: "agents"
			},
			sourceHandle: "ai_content_analyzer.1-output-tool",
			targetHandle: "simple_agent.1-input-tools",
			style: "stroke: grey;",
			markerEnd: {
				type: "arrowclosed",
				width: 16,
				height: 16,
				color: "grey"
			}
		},
		{
			id: "xy-edge__content_loader.1content_loader.1-output-tool-ai_content_analyzer.1ai_content_analyzer.1-input-tool",
			source: "content_loader.1",
			target: "ai_content_analyzer.1",
			data: {
				metadata: { edgeType: "data" },
				targetNodeType: "universalNode",
				targetCategory: "ai"
			},
			sourceHandle: "content_loader.1-output-tool",
			targetHandle: "ai_content_analyzer.1-input-tool",
			style: "stroke: grey;",
			markerEnd: {
				type: "arrowclosed",
				width: 16,
				height: 16,
				color: "grey"
			}
		},
		{
			id: "xy-edge__text_input.1text_input.1-output-text-simple_agent.1simple_agent.1-input-message",
			source: "text_input.1",
			target: "simple_agent.1",
			data: {
				metadata: { edgeType: "data" },
				targetNodeType: "universalNode",
				targetCategory: "agents"
			},
			sourceHandle: "text_input.1-output-text",
			targetHandle: "simple_agent.1-input-message",
			style: "stroke: grey;",
			markerEnd: {
				type: "arrowclosed",
				width: 16,
				height: 16,
				color: "grey"
			}
		},
		{
			id: "xy-edge__simple_agent.1simple_agent.1-output-message-text_output.1text_output.1-input-text",
			source: "simple_agent.1",
			target: "text_output.1",
			data: {
				metadata: { edgeType: "data" },
				targetNodeType: "universalNode",
				targetCategory: "outputs"
			},
			sourceHandle: "simple_agent.1-output-message",
			targetHandle: "text_output.1-input-text",
			style: "stroke: grey;",
			markerEnd: {
				type: "arrowclosed",
				width: 16,
				height: 16,
				color: "grey"
			}
		}
	] as WorkflowEdge[],
	metadata: {
		version: "1.0.0",
		createdAt: "2025-11-12T21:29:32.473Z",
		updatedAt: "2025-11-12T21:29:32.473Z"
	}
};

/**
 * All mock workflows as a Map for easy lookup
 */
export const mockWorkflows: Map<string, Workflow> = new Map([
	[demoAIContentWorkflow.id, demoAIContentWorkflow]
]);

/**
 * Get all workflows as an array
 */
export function getAllWorkflows(): Workflow[] {
	return Array.from(mockWorkflows.values());
}

/**
 * Get a workflow by ID
 */
export function getWorkflowById(id: string): Workflow | undefined {
	return mockWorkflows.get(id);
}

/**
 * Create a new workflow with generated ID and metadata
 */
export function createWorkflow(data: {
	name: string;
	description?: string;
	nodes?: WorkflowNode[];
	edges?: WorkflowEdge[];
	tags?: string[];
}): Workflow {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	const workflow: Workflow = {
		id,
		name: data.name,
		description: data.description || "",
		nodes: data.nodes || [],
		edges: data.edges || [],
		metadata: {
			version: "1.0.0",
			createdAt: now,
			updatedAt: now,
			author: "API User",
			tags: data.tags || []
		}
	};

	mockWorkflows.set(id, workflow);
	return workflow;
}

/**
 * Update an existing workflow
 */
export function updateWorkflow(
	id: string,
	updates: Partial<Omit<Workflow, "id" | "metadata">> & { metadata?: Partial<WorkflowMetadata> }
): Workflow | undefined {
	const existing = mockWorkflows.get(id);
	if (!existing) {
		return undefined;
	}

	const updated: Workflow = {
		...existing,
		...updates,
		id, // Ensure ID cannot be changed
		metadata: {
			...existing.metadata,
			...updates.metadata,
			updatedAt: new Date().toISOString()
		}
	};

	mockWorkflows.set(id, updated);
	return updated;
}

/**
 * Delete a workflow by ID
 */
export function deleteWorkflow(id: string): boolean {
	return mockWorkflows.delete(id);
}
