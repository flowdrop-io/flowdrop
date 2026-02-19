/**
 * Mock workflow data for MSW mock server
 * Provides sample workflows for API testing and documentation
 */

import type { Workflow, WorkflowNode, WorkflowEdge } from '../../lib/types/index.js';
import { getNodeById } from './nodes.js';
import { getAgentSpecNodeMetadata } from '../../lib/adapters/agentspec/defaultNodeTypes.js';

/** Workflow metadata type extracted from Workflow interface */
type WorkflowMetadata = NonNullable<Workflow['metadata']>;

/**
 * Demo workflow: AI-Powered Content Enhancement
 * Demonstrates intelligent content processing using AI to distinguish context and make smart replacements
 */
export const demoAIContentWorkflow: Workflow = {
	id: 'demo_tool_workflow',
	name: 'Demo: AI-Powered Tool Workflow',
	description: 'Demonstrates the use of AI tools in a workflow',
	nodes: [
		{
			id: 'content_loader.1',
			type: 'universalNode',
			position: { x: -240, y: 70 },
			data: {
				label: 'Content Loader',
				config: {
					nodeType: 'tool',
					contentType: 'article',
					status: 'published',
					limit: 50,
					fields: ['title', 'body']
				},
				metadata: {
					id: 'content_loader',
					name: 'Content Loader',
					type: 'tool',
					supportedTypes: ['tool', 'default'],
					description: 'Load content from the site for batch processing',
					category: 'content',
					icon: 'mdi:database-import',
					color: '#FF9800',
					version: '1.0.0',
					tags: ['content', 'drupal', 'batch', 'loader'],
					inputs: [
						{
							id: 'tool',
							name: 'Tool',
							type: 'input',
							dataType: 'tool',
							required: false,
							description: 'Available Tools'
						},
						{
							id: 'filters',
							name: 'Additional Filters',
							type: 'input',
							dataType: 'json',
							required: false,
							description: 'Additional filtering criteria'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'tool',
							name: 'Tool',
							type: 'output',
							dataType: 'tool',
							required: false,
							description: 'Available tools'
						},
						{
							id: 'content_items',
							name: 'content_items',
							type: 'output',
							dataType: 'array',
							required: false,
							description: 'Array of loaded content items'
						},
						{
							id: 'total_count',
							name: 'total_count',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Total number of items loaded'
						},
						{
							id: 'content_type',
							name: 'content_type',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The content type that was loaded'
						},
						{
							id: 'loaded_at',
							name: 'loaded_at',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Timestamp when content was loaded'
						}
					],
					config: {
						contentType: 'article',
						status: 'published',
						limit: 50,
						fields: ['title', 'body']
					},
					configSchema: {
						type: 'object',
						properties: {
							nodeType: {
								type: 'string',
								title: 'Node Type',
								description: 'Choose the visual representation for this node',
								default: 'tool',
								oneOf: [
									{ const: 'tool', title: 'Tool Node (with metadata port)' },
									{ const: 'default', title: 'Default Node (standard ports)' }
								]
							},
							contentType: {
								type: 'string',
								title: 'Content Type',
								description: 'The content type to load',
								enum: ['article', 'page', 'blog_post', 'news'],
								default: 'article'
							},
							status: {
								type: 'string',
								title: 'Publication Status',
								description: 'Filter by publication status',
								enum: ['published', 'unpublished', 'all'],
								default: 'published'
							},
							limit: {
								type: 'integer',
								title: 'Limit',
								description: 'Maximum number of items to load',
								minimum: 1,
								maximum: 1000,
								default: 50
							},
							fields: {
								type: 'array',
								title: 'Fields to Load',
								description: 'Which fields to include in the output',
								items: {
									type: 'string',
									enum: ['title', 'body', 'summary', 'author', 'created', 'tags']
								},
								default: ['title', 'body']
							}
						}
					}
				},
				nodeId: 'content_loader.1'
			},
			deletable: true,
			measured: { width: 288, height: 120 },
			selected: false,
			dragging: false
		},
		{
			id: 'ai_content_analyzer.1',
			type: 'universalNode',
			position: { x: 160, y: -10 },
			data: {
				label: 'AI Content Analyzer',
				config: {
					nodeType: 'tool',
					targetText: 'XB',
					replacementText: 'Canvas',
					analysisMode: 'context_aware',
					confidenceThreshold: 0.8
				},
				metadata: {
					id: 'ai_content_analyzer',
					name: 'AI Content Analyzer',
					type: 'tool',
					supportedTypes: ['tool', 'default'],
					description:
						'AI-powered content analysis for smart text processing and context understanding',
					category: 'ai',
					icon: 'mdi:brain',
					color: '#9C27B0',
					version: '1.0.0',
					tags: ['ai', 'analysis', 'content', 'context', 'smart-processing'],
					inputs: [
						{
							id: 'content',
							name: 'Content to Analyze',
							type: 'input',
							dataType: 'mixed',
							required: false,
							description: 'Text content or array of content items for AI analysis'
						},
						{
							id: 'tool',
							name: 'Tool',
							type: 'input',
							dataType: 'tool',
							required: false,
							description: 'Available Tools'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'tool',
							name: 'Tool',
							type: 'output',
							dataType: 'tool',
							required: false,
							description: 'Available tools'
						},
						{
							id: 'analyzed_content',
							name: 'analyzed_content',
							type: 'output',
							dataType: 'array',
							required: false,
							description: 'Content items with AI analysis results'
						},
						{
							id: 'total_analyzed',
							name: 'total_analyzed',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Total number of items analyzed'
						},
						{
							id: 'total_replacements',
							name: 'total_replacements',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Total number of replacements made'
						},
						{
							id: 'analysis_mode',
							name: 'analysis_mode',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The analysis mode used'
						},
						{
							id: 'confidence_threshold',
							name: 'confidence_threshold',
							type: 'output',
							dataType: 'number',
							format: 'range',
							required: false,
							description: 'Confidence threshold used for replacements'
						},
						{
							id: 'analyzed_at',
							name: 'analyzed_at',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Timestamp when analysis was completed'
						}
					],
					config: {
						targetText: 'XB',
						replacementText: 'Canvas',
						analysisMode: 'context_aware',
						confidenceThreshold: 0.8
					},
					configSchema: {
						type: 'object',
						properties: {
							nodeType: {
								type: 'string',
								title: 'Node Type',
								description: 'Choose the visual representation for this node',
								default: 'tool',
								oneOf: [
									{ const: 'tool', title: 'Tool Node (with metadata port)' },
									{ const: 'default', title: 'Default Node (standard ports)' }
								]
							},
							targetText: {
								type: 'string',
								title: 'Target Text',
								description: 'Text to analyze and potentially replace',
								default: 'XB'
							},
							replacementText: {
								type: 'string',
								title: 'Replacement Text',
								description: 'Text to replace with when appropriate',
								default: 'Canvas'
							},
							analysisMode: {
								type: 'string',
								title: 'Analysis Mode',
								description: 'Type of AI analysis to perform',
								enum: ['acronym_detection', 'sentence_flow', 'context_aware'],
								default: 'context_aware'
							},
							confidenceThreshold: {
								type: 'number',
								title: 'Confidence Threshold',
								description: 'Minimum confidence level for making replacements (0-1)',
								format: 'range',
								minimum: 0,
								maximum: 1,
								step: 0.01,
								default: 0.8
							}
						}
					}
				},
				nodeId: 'ai_content_analyzer.1'
			},
			deletable: true,
			measured: { width: 288, height: 142 },
			selected: false,
			dragging: false
		},
		{
			id: 'simple_agent.1',
			type: 'universalNode',
			position: { x: 610, y: -220 },
			data: {
				label: 'Simple Agent',
				config: {
					systemPrompt: 'You are a helpful assistant.',
					temperature: 0.7,
					maxTokens: 1000
				},
				metadata: {
					id: 'simple_agent',
					name: 'Simple Agent',
					type: 'default',
					supportedTypes: ['default'],
					description: 'Agent for tool orchestration',
					category: 'agents',
					icon: 'mdi:account-cog',
					color: '#06b6d4',
					version: '1.0.0',
					tags: ['agent', 'orchestration', 'tools'],
					inputs: [
						{
							id: 'message',
							name: 'Message',
							type: 'input',
							dataType: 'string',
							required: false,
							description: 'The message for the agent to process'
						},
						{
							id: 'tools',
							name: 'Tools',
							type: 'input',
							dataType: 'array',
							required: false,
							description: 'Tools available to the agent',
							defaultValue: []
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'response',
							name: 'response',
							type: 'output',
							dataType: 'json',
							required: false,
							description: 'The agent response'
						},
						{
							id: 'system_prompt',
							name: 'system_prompt',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The system prompt used'
						},
						{
							id: 'temperature',
							name: 'temperature',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'The temperature setting'
						},
						{
							id: 'max_tokens',
							name: 'max_tokens',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'The maximum tokens allowed'
						},
						{
							id: 'tools_used',
							name: 'tools_used',
							type: 'output',
							dataType: 'array',
							required: false,
							description: 'The tools used by the agent'
						},
						{
							id: 'message',
							name: 'message',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The input message'
						}
					],
					config: {
						model: 'gpt-3.5-turbo',
						temperature: 0.7,
						maxIterations: 5
					},
					configSchema: {
						type: 'object',
						properties: {
							systemPrompt: {
								type: 'string',
								title: 'System Prompt',
								description: 'System prompt for the agent',
								format: 'multiline',
								default: 'You are a helpful assistant.'
							},
							temperature: {
								type: 'number',
								format: 'range',
								title: 'Temperature',
								description: 'Temperature for response generation (0.0 to 1.0)',
								minimum: 0,
								maximum: 1,
								step: 0.1,
								default: 0.7
							},
							maxTokens: {
								type: 'integer',
								title: 'Max Tokens',
								description: 'Maximum tokens for response',
								default: 1000
							}
						}
					}
				},
				nodeId: 'simple_agent.1'
			},
			deletable: true,
			measured: { width: 288, height: 815 },
			selected: false,
			dragging: false
		},
		{
			id: 'text_input.1',
			type: 'universalNode',
			position: { x: 0, y: -200 },
			data: {
				label: 'Text Input',
				config: {
					nodeType: 'simple',
					placeholder: 'Enter text...',
					defaultValue: ''
				},
				metadata: {
					id: 'text_input',
					name: 'Text Input',
					type: 'simple',
					supportedTypes: ['simple', 'square', 'default'],
					description: 'Simple text input for user data',
					category: 'inputs',
					icon: 'mdi:text',
					color: '#22c55e',
					version: '1.0.0',
					tags: ['input', 'text', 'user-input'],
					inputs: [],
					outputs: [
						{
							id: 'text',
							name: 'text',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The input text value'
						}
					],
					config: {
						placeholder: 'Enter text here...',
						defaultValue: '',
						multiline: false
					},
					configSchema: {
						type: 'object',
						properties: {
							nodeType: {
								type: 'string',
								title: 'Node Type',
								description: 'Choose the visual representation for this node',
								default: 'simple',
								oneOf: [
									{ const: 'simple', title: 'Simple (compact layout)' },
									{ const: 'square', title: 'Square (square layout)' },
									{ const: 'default', title: 'Default' }
								]
							},
							placeholder: {
								type: 'string',
								title: 'Placeholder',
								description: 'Placeholder text for the input field',
								default: 'Enter text...'
							},
							defaultValue: {
								type: 'string',
								title: 'Default Value',
								description: 'Default text value',
								default: ''
							}
						}
					}
				},
				nodeId: 'text_input.1'
			},
			deletable: true,
			measured: { width: 288, height: 88 },
			selected: false,
			dragging: false
		},
		{
			id: 'text_output.1',
			type: 'universalNode',
			position: { x: 1080, y: 410 },
			data: {
				label: 'Text Output',
				config: {
					nodeType: 'simple',
					maxLength: 1000,
					format: 'plain'
				},
				metadata: {
					id: 'text_output',
					name: 'Text Output',
					type: 'simple',
					supportedTypes: ['square', 'simple', 'default'],
					description: 'Simple text output for displaying data',
					category: 'outputs',
					icon: 'mdi:text-box',
					color: '#ef4444',
					version: '1.0.0',
					tags: ['output', 'text', 'display'],
					inputs: [
						{
							id: 'text',
							name: 'Text Input',
							type: 'input',
							dataType: 'string',
							required: false,
							description: 'The text to output'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [],
					config: {
						format: 'plain',
						maxLength: 1000,
						showTimestamp: false
					},
					configSchema: {
						type: 'object',
						properties: {
							nodeType: {
								type: 'string',
								title: 'Node Type',
								description: 'Choose the visual representation for this node',
								default: 'simple',
								oneOf: [
									{ const: 'simple', title: 'Simple (compact layout)' },
									{ const: 'square', title: 'Square (square layout)' },
									{ const: 'default', title: 'Default' }
								]
							},
							maxLength: {
								type: 'integer',
								title: 'Maximum Length',
								description: 'Maximum length of output text',
								default: 1000,
								minimum: 1,
								maximum: 10000
							},
							format: {
								type: 'string',
								title: 'Text Format',
								description: 'Text formatting option',
								default: 'plain',
								enum: ['plain', 'html', 'markdown']
							}
						}
					}
				},
				nodeId: 'text_output.1'
			},
			deletable: true,
			measured: { width: 288, height: 88 },
			selected: false,
			dragging: false
		}
	] as WorkflowNode[],
	edges: [
		{
			id: 'xy-edge__ai_content_analyzer.1ai_content_analyzer.1-output-tool-simple_agent.1simple_agent.1-input-tools',
			source: 'ai_content_analyzer.1',
			target: 'simple_agent.1',
			data: {
				metadata: { edgeType: 'data' },
				targetNodeType: 'universalNode',
				targetCategory: 'agents'
			},
			sourceHandle: 'ai_content_analyzer.1-output-tool',
			targetHandle: 'simple_agent.1-input-tools',
			style: 'stroke: grey;',
			markerEnd: {
				type: 'arrowclosed',
				width: 16,
				height: 16,
				color: 'grey'
			}
		},
		{
			id: 'xy-edge__content_loader.1content_loader.1-output-tool-ai_content_analyzer.1ai_content_analyzer.1-input-tool',
			source: 'content_loader.1',
			target: 'ai_content_analyzer.1',
			data: {
				metadata: { edgeType: 'data' },
				targetNodeType: 'universalNode',
				targetCategory: 'ai'
			},
			sourceHandle: 'content_loader.1-output-tool',
			targetHandle: 'ai_content_analyzer.1-input-tool',
			style: 'stroke: grey;',
			markerEnd: {
				type: 'arrowclosed',
				width: 16,
				height: 16,
				color: 'grey'
			}
		},
		{
			id: 'xy-edge__text_input.1text_input.1-output-text-simple_agent.1simple_agent.1-input-message',
			source: 'text_input.1',
			target: 'simple_agent.1',
			data: {
				metadata: { edgeType: 'data' },
				targetNodeType: 'universalNode',
				targetCategory: 'agents'
			},
			sourceHandle: 'text_input.1-output-text',
			targetHandle: 'simple_agent.1-input-message',
			style: 'stroke: grey;',
			markerEnd: {
				type: 'arrowclosed',
				width: 16,
				height: 16,
				color: 'grey'
			}
		},
		{
			id: 'xy-edge__simple_agent.1simple_agent.1-output-message-text_output.1text_output.1-input-text',
			source: 'simple_agent.1',
			target: 'text_output.1',
			data: {
				metadata: { edgeType: 'data' },
				targetNodeType: 'universalNode',
				targetCategory: 'outputs'
			},
			sourceHandle: 'simple_agent.1-output-message',
			targetHandle: 'text_output.1-input-text',
			style: 'stroke: grey;',
			markerEnd: {
				type: 'arrowclosed',
				width: 16,
				height: 16,
				color: 'grey'
			}
		}
	] as WorkflowEdge[],
	metadata: {
		version: '1.0.0',
		createdAt: '2025-11-12T21:29:32.473Z',
		updatedAt: '2025-11-12T21:29:32.473Z'
	}
};

/**
 * Mock workflow: Node Types Showcase
 * Demonstrates different node types and their capabilities
 */
export const demoNodeTypesShowcaseWorkflow: Workflow = {
	id: 'node-types-showcase',
	name: 'Demo: Node Types Showcase',
	description: 'Demonstrates different node types and their capabilities',
	nodes: [
		{
			id: 'ai_content_analyzer.1',
			type: 'universalNode',
			position: {
				x: -1590,
				y: -330
			},
			deletable: true,
			data: {
				label: 'AI Content Analyzer',
				config: {
					nodeType: 'tool',
					targetText: 'XB',
					replacementText: 'Canvas',
					analysisMode: 'context_aware',
					confidenceThreshold: 0.8
				},
				metadata: {
					id: 'ai_content_analyzer',
					name: 'AI Content Analyzer',
					type: 'tool',
					supportedTypes: ['tool', 'default'],
					description:
						'AI-powered content analysis for smart text processing and context understanding',
					category: 'ai',
					icon: 'mdi:brain',
					color: '#9C27B0',
					version: '1.0.0',
					tags: ['ai', 'analysis', 'content', 'context', 'smart-processing'],
					inputs: [
						{
							id: 'content',
							name: 'Content to Analyze',
							type: 'input',
							dataType: 'mixed',
							required: false,
							description: 'Text content or array of content items for AI analysis'
						},
						{
							id: 'tool',
							name: 'Tool',
							type: 'input',
							dataType: 'tool',
							required: false,
							description: 'Available Tools'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'tool',
							name: 'Tool',
							type: 'output',
							dataType: 'tool',
							required: false,
							description: 'Available tools'
						},
						{
							id: 'analyzed_content',
							name: 'analyzed_content',
							type: 'output',
							dataType: 'array',
							required: false,
							description: 'Content items with AI analysis results'
						},
						{
							id: 'total_analyzed',
							name: 'total_analyzed',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Total number of items analyzed'
						},
						{
							id: 'total_replacements',
							name: 'total_replacements',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Total number of replacements made'
						},
						{
							id: 'analysis_mode',
							name: 'analysis_mode',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The analysis mode used'
						},
						{
							id: 'confidence_threshold',
							name: 'confidence_threshold',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Confidence threshold used for replacements'
						},
						{
							id: 'analyzed_at',
							name: 'analyzed_at',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Timestamp when analysis was completed'
						}
					],
					config: {
						targetText: 'XB',
						replacementText: 'Canvas',
						analysisMode: 'context_aware',
						confidenceThreshold: 0.8
					},
					configSchema: {
						type: 'object',
						properties: {
							nodeType: {
								type: 'string',
								title: 'Node Type',
								description: 'Choose the visual representation for this node',
								default: 'tool',
								oneOf: [
									{ const: 'tool', title: 'Tool Node (with metadata port)' },
									{ const: 'default', title: 'Default Node (standard ports)' }
								]
							},
							targetText: {
								type: 'string',
								title: 'Target Text',
								description: 'Text to analyze and potentially replace',
								default: 'XB'
							},
							replacementText: {
								type: 'string',
								title: 'Replacement Text',
								description: 'Text to replace with when appropriate',
								default: 'Canvas'
							},
							analysisMode: {
								type: 'string',
								title: 'Analysis Mode',
								description: 'Type of AI analysis to perform',
								enum: ['acronym_detection', 'sentence_flow', 'context_aware'],
								default: 'context_aware'
							},
							confidenceThreshold: {
								type: 'number',
								title: 'Confidence Threshold',
								description: 'Minimum confidence level for making replacements (0-1)',
								format: 'range',
								minimum: 0,
								maximum: 1,
								step: 0.01,
								default: 0.8
							}
						}
					}
				},
				nodeId: 'ai_content_analyzer.1'
			},
			measured: {
				width: 288,
				height: 138
			},
			selected: false,
			dragging: false
		},
		{
			id: 'file_upload.1',
			type: 'universalNode',
			position: {
				x: -1260,
				y: -330
			},
			deletable: true,
			data: {
				label: 'File Upload',
				config: {
					directory: 'public://flowdrop/uploads/',
					allowedExtensions: ['txt', 'pdf', 'doc', 'docx'],
					maxFileSize: 10485760,
					overwrite: false
				},
				metadata: {
					id: 'file_upload',
					name: 'File Upload',
					type: 'default',
					supportedTypes: ['default'],
					description: 'Upload and process files of various formats',
					category: 'inputs',
					icon: 'mdi:file-upload',
					color: '#ef4444',
					version: '1.0.0',
					tags: ['input', 'file', 'upload', 'document'],
					inputs: [
						{
							id: 'files',
							name: 'Files',
							type: 'input',
							dataType: 'array',
							required: false,
							description: 'Array of files to upload with name and content'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'uploaded_files',
							name: 'uploaded_files',
							type: 'output',
							dataType: 'array',
							required: false,
							description: 'The uploaded files information'
						},
						{
							id: 'errors',
							name: 'errors',
							type: 'output',
							dataType: 'array',
							required: false,
							description: 'Any errors that occurred'
						},
						{
							id: 'directory',
							name: 'directory',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The upload directory'
						},
						{
							id: 'total_files',
							name: 'total_files',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Total number of files uploaded'
						},
						{
							id: 'total_errors',
							name: 'total_errors',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Total number of errors'
						}
					],
					config: {
						allowedTypes: ['txt', 'pdf', 'docx', 'csv', 'json'],
						maxSize: 10485760
					},
					configSchema: {
						type: 'object',
						properties: {
							directory: {
								type: 'string',
								title: 'Directory',
								description: 'Directory to upload files to',
								default: 'public://flowdrop/uploads/'
							},
							allowedExtensions: {
								type: 'array',
								title: 'Allowed Extensions',
								description: 'Allowed file extensions',
								default: ['txt', 'pdf', 'doc', 'docx']
							},
							maxFileSize: {
								type: 'integer',
								title: 'Max File Size',
								description: 'Maximum file size in bytes',
								default: 10485760
							},
							overwrite: {
								type: 'boolean',
								title: 'Overwrite',
								description: 'Whether to overwrite existing files',
								default: false
							}
						}
					}
				},
				nodeId: 'file_upload.1'
			},
			measured: {
				width: 288,
				height: 641
			},
			selected: false,
			dragging: false
		},
		{
			id: 'text_input.1',
			type: 'universalNode',
			position: {
				x: -1920,
				y: -330
			},
			deletable: true,
			data: {
				label: 'Text Input',
				config: {
					nodeType: 'simple',
					placeholder: 'Enter text...',
					defaultValue: ''
				},
				metadata: {
					id: 'text_input',
					name: 'Text Input',
					type: 'simple',
					supportedTypes: ['simple', 'square', 'default'],
					description: 'Simple text input for user data',
					category: 'inputs',
					icon: 'mdi:text',
					color: '#22c55e',
					version: '1.0.0',
					tags: ['input', 'text', 'user-input'],
					inputs: [],
					outputs: [
						{
							id: 'text',
							name: 'text',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The input text value'
						}
					],
					config: {
						placeholder: 'Enter text here...',
						defaultValue: '',
						multiline: false
					},
					configSchema: {
						type: 'object',
						properties: {
							nodeType: {
								type: 'string',
								title: 'Node Type',
								description: 'Choose the visual representation for this node',
								default: 'simple',
								oneOf: [
									{ const: 'simple', title: 'Simple (compact layout)' },
									{ const: 'square', title: 'Square (square layout)' },
									{ const: 'default', title: 'Default' }
								]
							},
							placeholder: {
								type: 'string',
								title: 'Placeholder',
								description: 'Placeholder text for the input field',
								default: 'Enter text...'
							},
							defaultValue: {
								type: 'string',
								title: 'Default Value',
								description: 'Default text value',
								default: ''
							}
						}
					}
				},
				nodeId: 'text_input.1'
			},
			measured: {
				width: 288,
				height: 88
			},
			selected: false,
			dragging: false
		},
		{
			id: 'if_else.1',
			type: 'universalNode',
			position: {
				x: -930,
				y: -330
			},
			deletable: true,
			data: {
				label: 'If/Else',
				config: {
					matchText: '',
					operator: 'equals',
					caseSensitive: false,
					branches: [
						{
							name: 'True',
							value: 'true'
						},
						{
							name: 'False',
							value: 'false'
						}
					]
				},
				metadata: {
					id: 'if_else',
					name: 'If/Else',
					type: 'gateway',
					supportedTypes: ['gateway'],
					description: 'Simple conditional logic with text input, match text, and operator',
					category: 'logic',
					icon: 'mdi:code-braces',
					color: '#8b5cf6',
					version: '1.0.0',
					tags: ['logic', 'if', 'else', 'conditional', 'text', 'comparison'],
					inputs: [
						{
							id: 'data',
							name: 'Input Data',
							type: 'input',
							dataType: 'mixed',
							required: false,
							description: 'Optional input data (if not using textInput config)'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [],
					config: {
						textInput: '',
						matchText: '',
						operator: 'equals',
						caseSensitive: false
					},
					configSchema: {
						type: 'object',
						properties: {
							matchText: {
								type: 'string',
								title: 'Match Text',
								description: 'The text to match against',
								default: ''
							},
							operator: {
								type: 'string',
								title: 'Operator',
								description: 'The comparison operator to use',
								default: 'equals',
								enum: ['equals', 'not_equals', 'contains', 'starts_with', 'ends_with', 'regex']
							},
							caseSensitive: {
								type: 'boolean',
								title: 'Case Sensitive',
								description: 'Whether string comparisons are case sensitive',
								default: false
							},
							branches: {
								type: 'array',
								description: 'The active branches',
								default: [
									{
										name: 'True',
										value: true
									},
									{
										name: 'False',
										value: false
									}
								],
								format: 'hidden',
								items: {
									type: 'object',
									properties: {
										name: {
											type: 'string',
											description: 'The name of the branch'
										},
										value: {
											type: 'boolean',
											description: 'The value of the branch'
										}
									},
									description: 'The active branch'
								}
							}
						}
					}
				},
				nodeId: 'if_else.1'
			},
			measured: {
				width: 288,
				height: 345
			},
			selected: false,
			dragging: false
		},
		{
			id: 'text_output.1',
			type: 'universalNode',
			position: {
				x: -1920,
				y: -200
			},
			deletable: true,
			data: {
				label: 'Text Output',
				config: {
					nodeType: 'simple',
					maxLength: 1000,
					format: 'plain'
				},
				metadata: {
					id: 'text_output',
					name: 'Text Output',
					type: 'simple',
					supportedTypes: ['square', 'simple', 'default'],
					description: 'Simple text output for displaying data',
					category: 'outputs',
					icon: 'mdi:text-box',
					color: '#ef4444',
					version: '1.0.0',
					tags: ['output', 'text', 'display'],
					inputs: [
						{
							id: 'text',
							name: 'Text Input',
							type: 'input',
							dataType: 'string',
							required: false,
							description: 'The text to output'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [],
					config: {
						format: 'plain',
						maxLength: 1000,
						showTimestamp: false
					},
					configSchema: {
						type: 'object',
						properties: {
							nodeType: {
								type: 'string',
								title: 'Node Type',
								description: 'Choose the visual representation for this node',
								default: 'simple',
								oneOf: [
									{ const: 'simple', title: 'Simple (compact layout)' },
									{ const: 'square', title: 'Square (square layout)' },
									{ const: 'default', title: 'Default' }
								]
							},
							maxLength: {
								type: 'integer',
								title: 'Maximum Length',
								description: 'Maximum length of output text',
								default: 1000,
								minimum: 1,
								maximum: 10000
							},
							format: {
								type: 'string',
								title: 'Text Format',
								description: 'Text formatting option',
								default: 'plain',
								enum: ['plain', 'html', 'markdown']
							}
						}
					}
				},
				nodeId: 'text_output.1'
			},
			measured: {
				width: 288,
				height: 88
			},
			selected: false,
			dragging: false
		},
		{
			id: 'trigger.1',
			type: 'universalNode',
			position: {
				x: -2160,
				y: -330
			},
			deletable: true,
			data: {
				label: 'Trigger',
				config: {
					triggerData: [],
					workflowId: '',
					pipelineId: '',
					description: '',
					variant: 'start',
					eventType: 'entity.insert',
					entityTypes: ['node'],
					bundles: [],
					orchestrator: 'default'
				},
				metadata: {
					id: 'trigger',
					name: 'Trigger',
					type: 'terminal',
					supportedTypes: ['terminal'],
					description: '',
					category: 'processing',
					icon: 'mdi:cog',
					color: '#007cba',
					version: '1.0.0',
					tags: [],
					inputs: [],
					outputs: [
						{
							id: 'output',
							name: 'Output',
							type: 'output',
							dataType: 'json',
							required: false,
							description: 'Trigger output containing entity data, event type, and metadata'
						}
					],
					config: {
						triggerData: [],
						enabled: 1,
						eventType: 'entity.insert',
						entityTypes: ['node'],
						bundles: [],
						orchestrator: 'default'
					},
					configSchema: {
						type: 'object',
						properties: {
							triggerData: {
								type: 'object',
								title: 'Trigger Data',
								description: 'Default data to use when the trigger is activated',
								default: []
							},
							workflowId: {
								type: 'string',
								title: 'Workflow ID',
								description: 'The ID of the workflow to trigger',
								default: ''
							},
							pipelineId: {
								type: 'string',
								title: 'Pipeline ID',
								description: 'The ID of the pipeline to trigger',
								default: ''
							},
							description: {
								type: 'string',
								title: 'Description',
								description: 'Optional description for this trigger',
								default: ''
							},
							enabled: {
								type: 'boolean',
								title: 'Enabled',
								description: 'Whether this trigger is enabled',
								default: true
							},
							variant: {
								type: 'string',
								title: 'Variant',
								description: 'Terminal node variant (start for triggers)',
								enum: ['start'],
								default: 'start'
							},
							eventType: {
								type: 'string',
								title: 'Event Type',
								description: 'The type of entity event to trigger on',
								oneOf: [
									{ const: 'entity.insert', title: 'Entity Created' },
									{ const: 'entity.update', title: 'Entity Updated' },
									{ const: 'entity.delete', title: 'Entity Deleted' },
									{ const: 'entity.presave', title: 'Before Entity Save' },
									{ const: 'user.login', title: 'User Login' },
									{ const: 'user.logout', title: 'User Logout' }
								],
								default: 'entity.insert'
							},
							entityTypes: {
								type: 'array',
								title: 'Entity Types',
								description: 'Entity types to trigger on (empty = all content entities)',
								items: {
									type: 'string'
								},
								default: ['node']
							},
							bundles: {
								type: 'array',
								title: 'Bundles',
								description: 'Content type bundles to trigger on (empty = all)',
								items: {
									type: 'string'
								},
								default: []
							},
							orchestrator: {
								type: 'string',
								title: 'Orchestrator',
								description:
									"Override the default orchestrator for this trigger. Use 'default' for automatic selection based on event type, or specify a custom orchestrator ID.",
								examples: ['default', 'synchronous', 'asynchronous'],
								default: 'default'
							}
						},
						required: []
					}
				},
				nodeId: 'trigger.1'
			},
			measured: {
				width: 72,
				height: 98
			},
			selected: false,
			dragging: false
		},
		{
			id: 'notes.1',
			type: 'universalNode',
			position: {
				x: -1640,
				y: -770
			},
			deletable: true,
			data: {
				label: 'Notes',
				config: {
					content:
						'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
					noteType: 'info'
				},
				metadata: {
					id: 'notes',
					name: 'Notes',
					type: 'note',
					supportedTypes: ['note'],
					description: 'Add documentation and comments to your workflow with Markdown support',
					category: 'tools',
					icon: 'mdi:note-text',
					color: '#fbbf24',
					version: '1.0.0',
					tags: ['tools', 'notes', 'documentation', 'comments', 'markdown'],
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'content',
							name: 'Note Content',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The markdown content of the note'
						},
						{
							id: 'noteType',
							name: 'Note Type',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The visual type of the note (info, warning, success, error, note)'
						},
						{
							id: 'message',
							name: 'Message',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Status message about the note'
						}
					],
					config: {
						content:
							'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
						noteType: 'info'
					},
					configSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								title: 'Note Content',
								description: 'Documentation or comment text (supports Markdown)',
								format: 'multiline',
								default:
									'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!'
							},
							noteType: {
								type: 'string',
								title: 'Note Type',
								description: 'Visual style and color of the note',
								default: 'info',
								enum: ['info', 'warning', 'success', 'error', 'note']
							}
						}
					}
				},
				nodeId: 'notes.1'
			},
			measured: {
				width: 500,
				height: 332
			},
			selected: false,
			dragging: false
		},
		{
			id: 'text_input.2',
			type: 'universalNode',
			position: {
				x: -2040,
				y: -330
			},
			deletable: true,
			data: {
				label: 'Text Input',
				config: {
					nodeType: 'square',
					placeholder: 'Enter text...',
					defaultValue: ''
				},
				metadata: {
					id: 'text_input',
					name: 'Text Input',
					type: 'simple',
					supportedTypes: ['simple', 'square', 'default'],
					description: 'Simple text input for user data',
					category: 'inputs',
					icon: 'mdi:text',
					color: '#22c55e',
					version: '1.0.0',
					tags: ['input', 'text', 'user-input'],
					inputs: [],
					outputs: [
						{
							id: 'text',
							name: 'text',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The input text value'
						}
					],
					config: {
						placeholder: 'Enter text here...',
						defaultValue: '',
						multiline: false
					},
					configSchema: {
						type: 'object',
						properties: {
							nodeType: {
								type: 'string',
								title: 'Node Type',
								description: 'Choose the visual representation for this node',
								default: 'simple',
								oneOf: [
									{ const: 'simple', title: 'Simple (compact layout)' },
									{ const: 'square', title: 'Square (square layout)' },
									{ const: 'default', title: 'Default' }
								]
							},
							placeholder: {
								type: 'string',
								title: 'Placeholder',
								description: 'Placeholder text for the input field',
								default: 'Enter text...'
							},
							defaultValue: {
								type: 'string',
								title: 'Default Value',
								description: 'Default text value',
								default: ''
							}
						}
					}
				},
				nodeId: 'text_input.2'
			},
			measured: {
				width: 80,
				height: 80
			},
			selected: false,
			dragging: false
		},
		{
			id: 'notes.2',
			type: 'universalNode',
			position: {
				x: -1120,
				y: -770
			},
			deletable: true,
			data: {
				label: 'Notes',
				config: {
					content:
						'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
					noteType: 'warning'
				},
				metadata: {
					id: 'notes',
					name: 'Notes',
					type: 'note',
					supportedTypes: ['note'],
					description: 'Add documentation and comments to your workflow with Markdown support',
					category: 'tools',
					icon: 'mdi:note-text',
					color: '#fbbf24',
					version: '1.0.0',
					tags: ['tools', 'notes', 'documentation', 'comments', 'markdown'],
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'content',
							name: 'Note Content',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The markdown content of the note'
						},
						{
							id: 'noteType',
							name: 'Note Type',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The visual type of the note (info, warning, success, error, note)'
						},
						{
							id: 'message',
							name: 'Message',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Status message about the note'
						}
					],
					config: {
						content:
							'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
						noteType: 'info'
					},
					configSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								title: 'Note Content',
								description: 'Documentation or comment text (supports Markdown)',
								format: 'multiline',
								default:
									'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!'
							},
							noteType: {
								type: 'string',
								title: 'Note Type',
								description: 'Visual style and color of the note',
								default: 'info',
								enum: ['info', 'warning', 'success', 'error', 'note']
							}
						}
					}
				},
				nodeId: 'notes.2'
			},
			measured: {
				width: 500,
				height: 332
			},
			selected: false,
			dragging: false
		},
		{
			id: 'notes.3',
			type: 'universalNode',
			position: {
				x: -600,
				y: -770
			},
			deletable: true,
			data: {
				label: 'Notes',
				config: {
					content:
						'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
					noteType: 'success'
				},
				metadata: {
					id: 'notes',
					name: 'Notes',
					type: 'note',
					supportedTypes: ['note'],
					description: 'Add documentation and comments to your workflow with Markdown support',
					category: 'tools',
					icon: 'mdi:note-text',
					color: '#fbbf24',
					version: '1.0.0',
					tags: ['tools', 'notes', 'documentation', 'comments', 'markdown'],
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'content',
							name: 'Note Content',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The markdown content of the note'
						},
						{
							id: 'noteType',
							name: 'Note Type',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The visual type of the note (info, warning, success, error, note)'
						},
						{
							id: 'message',
							name: 'Message',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Status message about the note'
						}
					],
					config: {
						content:
							'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
						noteType: 'info'
					},
					configSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								title: 'Note Content',
								description: 'Documentation or comment text (supports Markdown)',
								format: 'multiline',
								default:
									'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!'
							},
							noteType: {
								type: 'string',
								title: 'Note Type',
								description: 'Visual style and color of the note',
								default: 'info',
								enum: ['info', 'warning', 'success', 'error', 'note']
							}
						}
					}
				},
				nodeId: 'notes.3'
			},
			measured: {
				width: 500,
				height: 332
			},
			selected: false,
			dragging: true
		},
		{
			id: 'notes.4',
			type: 'universalNode',
			position: {
				x: -80,
				y: -770
			},
			deletable: true,
			data: {
				label: 'Notes',
				config: {
					content:
						'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
					noteType: 'error'
				},
				metadata: {
					id: 'notes',
					name: 'Notes',
					type: 'note',
					supportedTypes: ['note'],
					description: 'Add documentation and comments to your workflow with Markdown support',
					category: 'tools',
					icon: 'mdi:note-text',
					color: '#fbbf24',
					version: '1.0.0',
					tags: ['tools', 'notes', 'documentation', 'comments', 'markdown'],
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'content',
							name: 'Note Content',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The markdown content of the note'
						},
						{
							id: 'noteType',
							name: 'Note Type',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The visual type of the note (info, warning, success, error, note)'
						},
						{
							id: 'message',
							name: 'Message',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Status message about the note'
						}
					],
					config: {
						content:
							'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
						noteType: 'info'
					},
					configSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								title: 'Note Content',
								description: 'Documentation or comment text (supports Markdown)',
								format: 'multiline',
								default:
									'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!'
							},
							noteType: {
								type: 'string',
								title: 'Note Type',
								description: 'Visual style and color of the note',
								default: 'info',
								enum: ['info', 'warning', 'success', 'error', 'note']
							}
						}
					}
				},
				nodeId: 'notes.4'
			},
			measured: {
				width: 500,
				height: 332
			},
			selected: false,
			dragging: false
		},
		{
			id: 'notes.5',
			type: 'universalNode',
			position: {
				x: -2160,
				y: -770
			},
			deletable: true,
			data: {
				label: 'Notes',
				config: {
					content:
						'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
					noteType: 'note'
				},
				metadata: {
					id: 'notes',
					name: 'Notes',
					type: 'note',
					supportedTypes: ['note'],
					description: 'Add documentation and comments to your workflow with Markdown support',
					category: 'tools',
					icon: 'mdi:note-text',
					color: '#fbbf24',
					version: '1.0.0',
					tags: ['tools', 'notes', 'documentation', 'comments', 'markdown'],
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'content',
							name: 'Note Content',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The markdown content of the note'
						},
						{
							id: 'noteType',
							name: 'Note Type',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The visual type of the note (info, warning, success, error, note)'
						},
						{
							id: 'message',
							name: 'Message',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Status message about the note'
						}
					],
					config: {
						content:
							'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
						noteType: 'info'
					},
					configSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								title: 'Note Content',
								description: 'Documentation or comment text (supports Markdown)',
								format: 'multiline',
								default:
									'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!'
							},
							noteType: {
								type: 'string',
								title: 'Note Type',
								description: 'Visual style and color of the note',
								default: 'info',
								enum: ['info', 'warning', 'success', 'error', 'note']
							}
						}
					}
				},
				nodeId: 'notes.5'
			},
			measured: {
				width: 500,
				height: 332
			},
			selected: false,
			dragging: true
		}
	],
	edges: [],
	metadata: {
		version: '1.0.0',
		createdAt: '2025-12-29T08:18:13.515Z',
		updatedAt: '2025-12-29T08:27:18.084Z'
	}
};

/**
 * Mock workflow: Trigger Node
 * Demonstrates the use of a trigger node
 */
export const demoTriggerNodeWorkflow: Workflow = {
	id: 'demo-trigger-node',
	name: 'Demo: Trigger Node',
	description: 'Demonstrates the use of a trigger node',
	nodes: [
		{
			id: 'text_input.1',
			type: 'universalNode',
			position: {
				x: 140,
				y: -270
			},
			deletable: true,
			data: {
				label: 'Text Input',
				config: {
					nodeType: 'simple',
					placeholder: 'Enter text...',
					defaultValue: ''
				},
				metadata: {
					id: 'text_input',
					name: 'Text Input',
					type: 'simple',
					supportedTypes: ['simple', 'square', 'default'],
					description: 'Simple text input for user data',
					category: 'inputs',
					icon: 'mdi:text',
					color: '#22c55e',
					version: '1.0.0',
					tags: ['input', 'text', 'user-input'],
					inputs: [],
					outputs: [
						{
							id: 'text',
							name: 'text',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The input text value'
						}
					],
					config: {
						placeholder: 'Enter text here...',
						defaultValue: '',
						multiline: false
					},
					configSchema: {
						type: 'object',
						properties: {
							nodeType: {
								type: 'string',
								title: 'Node Type',
								description: 'Choose the visual representation for this node',
								default: 'simple',
								oneOf: [
									{ const: 'simple', title: 'Simple (compact layout)' },
									{ const: 'square', title: 'Square (square layout)' },
									{ const: 'default', title: 'Default' }
								]
							},
							placeholder: {
								type: 'string',
								title: 'Placeholder',
								description: 'Placeholder text for the input field',
								default: 'Enter text...'
							},
							defaultValue: {
								type: 'string',
								title: 'Default Value',
								description: 'Default text value',
								default: ''
							}
						}
					}
				},
				nodeId: 'text_input.1'
			},
			measured: {
				width: 288,
				height: 88
			},
			selected: false,
			dragging: false
		},
		{
			id: 'save_to_file.1',
			type: 'universalNode',
			position: {
				x: 1210,
				y: -390
			},
			deletable: true,
			data: {
				label: 'Save to File',
				config: {
					filename: 'output.txt',
					format: 'text',
					append: false,
					directory: 'public://flowdrop/'
				},
				metadata: {
					id: 'save_to_file',
					name: 'Save to File',
					type: 'default',
					supportedTypes: ['default'],
					description: 'Save data to various file formats',
					category: 'data',
					icon: 'mdi:content-save',
					color: '#ef4444',
					version: '1.0.0',
					tags: ['data', 'save', 'file', 'export'],
					inputs: [
						{
							id: 'content',
							name: 'Content',
							type: 'input',
							dataType: 'mixed',
							required: false,
							description: 'The content to save to file'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'success',
							name: 'success',
							type: 'output',
							dataType: 'boolean',
							required: false,
							description: 'Whether the file was saved successfully'
						},
						{
							id: 'filename',
							name: 'filename',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The filename used'
						},
						{
							id: 'filepath',
							name: 'filepath',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The full file path'
						},
						{
							id: 'bytes_written',
							name: 'bytes_written',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Number of bytes written'
						},
						{
							id: 'format',
							name: 'format',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The output format used'
						},
						{
							id: 'append',
							name: 'append',
							type: 'output',
							dataType: 'boolean',
							required: false,
							description: 'Whether the file was appended to'
						}
					],
					config: {
						fileFormat: 'json',
						filePath: './output/data.json'
					},
					configSchema: {
						type: 'object',
						properties: {
							filename: {
								type: 'string',
								title: 'Filename',
								description: 'The filename to save to',
								default: 'output.txt'
							},
							format: {
								type: 'string',
								title: 'Format',
								description: 'Output format to use',
								default: 'text',
								enum: ['text', 'json']
							},
							append: {
								type: 'boolean',
								title: 'Append',
								description: 'Whether to append to existing file',
								default: false
							},
							directory: {
								type: 'string',
								title: 'Directory',
								description: 'Directory to save file in',
								default: 'public://flowdrop/'
							}
						}
					}
				},
				nodeId: 'save_to_file.1'
			},
			measured: {
				width: 288,
				height: 713
			},
			selected: false,
			dragging: false
		},
		{
			id: 'if_else.1',
			type: 'universalNode',
			position: {
				x: 650,
				y: -170
			},
			deletable: true,
			data: {
				label: 'If/Else',
				config: {
					matchText: 'banana republic',
					operator: 'contains',
					caseSensitive: false,
					branches: [
						{
							name: 'True',
							value: 'true'
						},
						{
							name: 'False',
							value: 'false'
						}
					]
				},
				metadata: {
					id: 'if_else',
					name: 'If/Else',
					type: 'gateway',
					supportedTypes: ['gateway'],
					description: 'Simple conditional logic with text input, match text, and operator',
					category: 'logic',
					icon: 'mdi:code-braces',
					color: '#8b5cf6',
					version: '1.0.0',
					tags: ['logic', 'if', 'else', 'conditional', 'text', 'comparison'],
					inputs: [
						{
							id: 'data',
							name: 'Input Data',
							type: 'input',
							dataType: 'mixed',
							required: false,
							description: 'Optional input data (if not using textInput config)'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [],
					config: {
						textInput: '',
						matchText: '',
						operator: 'equals',
						caseSensitive: false
					},
					configSchema: {
						type: 'object',
						properties: {
							matchText: {
								type: 'string',
								title: 'Match Text',
								description: 'The text to match against',
								default: ''
							},
							operator: {
								type: 'string',
								title: 'Operator',
								description: 'The comparison operator to use',
								default: 'equals',
								enum: ['equals', 'not_equals', 'contains', 'starts_with', 'ends_with', 'regex']
							},
							caseSensitive: {
								type: 'boolean',
								title: 'Case Sensitive',
								description: 'Whether string comparisons are case sensitive',
								default: false
							},
							branches: {
								type: 'array',
								description: 'The active branches',
								default: [
									{
										name: 'True',
										value: true
									},
									{
										name: 'False',
										value: false
									}
								],
								format: 'hidden',
								items: {
									type: 'object',
									properties: {
										name: {
											type: 'string',
											description: 'The name of the branch'
										},
										value: {
											type: 'boolean',
											description: 'The value of the branch'
										}
									},
									description: 'The active branch'
								}
							}
						}
					}
				},
				nodeId: 'if_else.1'
			},
			measured: {
				width: 288,
				height: 345
			},
			selected: false,
			dragging: false
		},
		{
			id: 'notes.1',
			type: 'universalNode',
			position: {
				x: 590,
				y: -600
			},
			deletable: true,
			data: {
				label: 'Notes',
				config: {
					content:
						'# Use "Trigger" for that extra control\n\nIt is common for execution flow to be identical to data flow. For cases where you need explicit control on how nodes are executed, use "Trigger".',
					noteType: 'note'
				},
				metadata: {
					id: 'notes',
					name: 'Notes',
					type: 'note',
					supportedTypes: ['note'],
					description: 'Add documentation and comments to your workflow with Markdown support',
					category: 'tools',
					icon: 'mdi:note-text',
					color: '#fbbf24',
					version: '1.0.0',
					tags: ['tools', 'notes', 'documentation', 'comments', 'markdown'],
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'content',
							name: 'Note Content',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The markdown content of the note'
						},
						{
							id: 'noteType',
							name: 'Note Type',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The visual type of the note (info, warning, success, error, note)'
						},
						{
							id: 'message',
							name: 'Message',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Status message about the note'
						}
					],
					config: {
						content:
							'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
						noteType: 'info'
					},
					configSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								title: 'Note Content',
								description: 'Documentation or comment text (supports Markdown)',
								format: 'multiline',
								default:
									'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!'
							},
							noteType: {
								type: 'string',
								title: 'Note Type',
								description: 'Visual style and color of the note',
								default: 'info',
								enum: ['info', 'warning', 'success', 'error', 'note']
							}
						}
					}
				},
				nodeId: 'notes.1'
			},
			measured: {
				width: 500,
				height: 283
			},
			selected: false,
			dragging: false
		}
	],
	edges: [
		{
			source: 'text_input.1',
			sourceHandle: 'text_input.1-output-text',
			target: 'if_else.1',
			targetHandle: 'if_else.1-input-data',
			id: 'xy-edge__text_input.1text_input.1-output-text-if_else.1if_else.1-input-data',
			style: 'stroke: var(--fd-edge-data-color);',
			class: 'flowdrop--edge--data',
			markerEnd: {
				type: 'arrowclosed',
				width: 16,
				height: 16,
				color: '#9ca3af'
			},
			data: {
				metadata: {
					edgeType: 'data',
					sourcePortDataType: 'string'
				},
				targetNodeType: 'universalNode',
				targetCategory: 'logic'
			}
		},
		{
			source: 'if_else.1',
			sourceHandle: 'if_else.1-output-True',
			target: 'save_to_file.1',
			targetHandle: 'save_to_file.1-input-trigger',
			id: 'xy-edge__if_else.1if_else.1-output-True-save_to_file.1save_to_file.1-input-trigger',
			style: 'stroke: var(--fd-edge-trigger-color); stroke-width: var(--fd-edge-trigger-width);',
			class: 'flowdrop--edge--trigger',
			markerEnd: {
				type: 'arrowclosed',
				width: 16,
				height: 16,
				color: '#111827'
			},
			data: {
				metadata: {
					edgeType: 'trigger',
					sourcePortDataType: 'trigger'
				},
				targetNodeType: 'universalNode',
				targetCategory: 'data'
			}
		},
		{
			source: 'text_input.1',
			sourceHandle: 'text_input.1-output-text',
			target: 'save_to_file.1',
			targetHandle: 'save_to_file.1-input-content',
			id: 'xy-edge__text_input.1text_input.1-output-text-save_to_file.1save_to_file.1-input-content',
			style: 'stroke: var(--fd-edge-data-color);',
			class: 'flowdrop--edge--data',
			markerEnd: {
				type: 'arrowclosed',
				width: 16,
				height: 16,
				color: '#9ca3af'
			},
			data: {
				metadata: {
					edgeType: 'data',
					sourcePortDataType: 'string'
				},
				targetNodeType: 'universalNode',
				targetCategory: 'data'
			}
		}
	],
	metadata: {
		version: '1.0.0',
		createdAt: '2025-12-29T08:32:55.061Z',
		updatedAt: '2025-12-29T08:40:01.444Z'
	}
};

/**
 * Demo workflow: ForEach Loop with Loopback
 * Demonstrates the ForEach loop node with loopback edge functionality
 */
export const demoForEachLoopWorkflow: Workflow = {
	id: 'demo-foreach-loop',
	name: 'Demo: ForEach Loop',
	nodes: [
		{
			id: 'json_loader.1',
			type: 'universalNode',
			position: {
				x: -400,
				y: -40
			},
			deletable: true,
			data: {
				label: 'JSON Loader',
				config: {
					jsonData: '["Apple", "Banana", "Cherry", "Date", "Elderberry"]'
				},
				metadata: {
					id: 'json_loader',
					name: 'JSON Loader',
					type: 'default',
					supportedTypes: ['default'],
					description: 'Load and parse JSON data',
					category: 'data',
					icon: 'mdi:code-json',
					color: '#f59e0b',
					version: '1.0.0',
					tags: ['data', 'json', 'loader'],
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: 'Start loading'
						}
					],
					outputs: [
						{
							id: 'data',
							name: 'Data',
							type: 'output',
							dataType: 'array',
							required: false,
							description: 'The parsed JSON data'
						}
					],
					config: {
						jsonData: '[]'
					},
					configSchema: {
						type: 'object',
						properties: {
							jsonData: {
								type: 'string',
								title: 'JSON Data',
								description: 'JSON data to load',
								format: 'multiline',
								default: '[]'
							}
						}
					}
				},
				nodeId: 'json_loader.1'
			},
			measured: {
				width: 290,
				height: 265
			},
			selected: false,
			dragging: false
		},
		{
			id: 'foreach.1',
			type: 'universalNode',
			position: {
				x: 200,
				y: -40
			},
			deletable: true,
			data: {
				label: 'ForEach Loop',
				config: {
					nodeType: 'default',
					maxIterations: 1000,
					continueOnError: false
				},
				metadata: {
					id: 'foreach',
					name: 'ForEach Loop',
					type: 'default',
					supportedTypes: ['default', 'simple'],
					description:
						'Iterates over an array, processing each item sequentially. Connect the output back to the loop_back input to trigger the next iteration.',
					category: 'logic',
					icon: 'mdi:repeat',
					color: '#8b5cf6',
					version: '1.0.0',
					tags: ['logic', 'loop', 'foreach', 'iterate', 'array', 'iteration', 'loopback'],
					inputs: [
						{
							id: 'items',
							name: 'Items',
							type: 'input',
							dataType: 'array',
							required: true,
							description: 'The array of items to iterate over'
						},
						{
							id: 'loop_back',
							name: 'Loop Back',
							type: 'input',
							dataType: 'mixed',
							required: false,
							description:
								'Connect any output here to trigger the next iteration. Accepts any data type. This creates a valid loopback cycle.'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: 'Start the loop iteration'
						}
					],
					outputs: [
						{
							id: 'item',
							name: 'Item',
							type: 'output',
							dataType: 'mixed',
							required: false,
							description: 'The current item being processed in each iteration'
						},
						{
							id: 'index',
							name: 'Index',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Zero-based index of the current item'
						},
						{
							id: 'total',
							name: 'Total',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'Total number of items in the array'
						},
						{
							id: 'is_first',
							name: 'Is First',
							type: 'output',
							dataType: 'boolean',
							required: false,
							description: 'True if this is the first item in the array'
						},
						{
							id: 'is_last',
							name: 'Is Last',
							type: 'output',
							dataType: 'boolean',
							required: false,
							description: 'True if this is the last item in the array'
						},
						{
							id: 'completed',
							name: 'Completed',
							type: 'output',
							dataType: 'trigger',
							required: false,
							description: 'Triggered when all items have been processed'
						}
					],
					config: {
						maxIterations: 1000,
						continueOnError: false
					},
					configSchema: {
						type: 'object',
						properties: {
							nodeType: {
								type: 'string',
								title: 'Node Type',
								description: 'Choose the visual representation for this node',
								default: 'default',
								oneOf: [
									{
										const: 'default',
										title: 'Default (Standard node)'
									},
									{
										const: 'simple',
										title: 'Simple (Compact)'
									}
								]
							},
							maxIterations: {
								type: 'integer',
								title: 'Max Iterations',
								description:
									'Maximum number of iterations (safety limit to prevent infinite loops)',
								default: 1000,
								minimum: 1,
								maximum: 100000
							},
							continueOnError: {
								type: 'boolean',
								title: 'Continue on Error',
								description: 'If true, continue iterating even if an item fails processing',
								default: false
							}
						}
					}
				},
				nodeId: 'foreach.1',
				extensions: {
					ui: {
						hideUnconnectedHandles: true
					}
				}
			},
			measured: {
				width: 290,
				height: 381
			},
			selected: false,
			dragging: false
		},
		{
			id: 'process_item.1',
			type: 'universalNode',
			position: {
				x: 580,
				y: 300
			},
			deletable: true,
			data: {
				label: 'Process Item',
				config: {
					operation: 'uppercase'
				},
				metadata: {
					id: 'process_item',
					name: 'Process Item',
					type: 'default',
					supportedTypes: ['default'],
					description: 'Process each item in the loop - displays and passes through data',
					category: 'processing',
					icon: 'mdi:cog',
					color: '#06b6d4',
					version: '1.0.0',
					tags: ['processing', 'transform', 'item'],
					inputs: [
						{
							id: 'input',
							name: 'Input',
							type: 'input',
							dataType: 'mixed',
							required: false,
							description: 'The item to process'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'output',
							name: 'Output',
							type: 'output',
							dataType: 'mixed',
							required: false,
							description: 'The processed item - connect back to ForEach Loop for iteration'
						},
						{
							id: 'completed',
							name: 'Completed',
							type: 'output',
							dataType: 'trigger',
							required: false,
							description: 'Triggered when processing is complete'
						}
					],
					config: {
						operation: 'uppercase'
					},
					configSchema: {
						type: 'object',
						properties: {
							operation: {
								type: 'string',
								title: 'Operation',
								description: 'Operation to perform on the item',
								default: 'uppercase',
								enum: ['uppercase', 'lowercase', 'passthrough']
							}
						}
					}
				},
				nodeId: 'process_item.1',
				extensions: {
					ui: {
						hideUnconnectedHandles: true
					}
				}
			},
			measured: {
				width: 290,
				height: 285
			},
			selected: true,
			dragging: true
		},
		{
			id: 'notes.1',
			type: 'universalNode',
			position: {
				x: -400,
				y: 240
			},
			deletable: true,
			data: {
				label: 'Notes',
				config: {
					content:
						'# ForEach Loop Demo\n\nThis workflow demonstrates the **ForEach Loop** node:\n\n1. **JSON Loader** provides an array of items\n2. **ForEach Loop** iterates over each item\n3. **Process Item** processes the current item\n4. The loopback edge (dashed gray) connects back to trigger the next iteration\n\n> The loopback edge uses a special `loop_back` port that accepts any data type.',
					noteType: 'info'
				},
				metadata: {
					id: 'notes',
					name: 'Notes',
					type: 'note',
					supportedTypes: ['note'],
					description: 'Add documentation and comments to your workflow with Markdown support',
					category: 'tools',
					icon: 'mdi:note-text',
					color: '#fbbf24',
					version: '1.0.0',
					tags: ['tools', 'notes', 'documentation', 'comments', 'markdown'],
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'content',
							name: 'Note Content',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The markdown content of the note'
						},
						{
							id: 'noteType',
							name: 'Note Type',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The visual type of the note (info, warning, success, error, note)'
						},
						{
							id: 'message',
							name: 'Message',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Status message about the note'
						}
					],
					config: {
						content:
							'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
						noteType: 'info'
					},
					configSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								title: 'Note Content',
								description: 'Documentation or comment text (supports Markdown)',
								format: 'markdown',
								default:
									'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!'
							},
							noteType: {
								type: 'string',
								title: 'Note Type',
								description: 'Visual style and color of the note',
								default: 'info',
								enum: ['info', 'warning', 'success', 'error', 'note']
							}
						}
					}
				},
				nodeId: 'notes.1'
			},
			measured: {
				width: 500,
				height: 375
			},
			selected: false,
			dragging: false
		}
	],
	edges: [
		{
			id: 'xy-edge__json_loader.1json_loader.1-output-data-foreach.1foreach.1-input-items',
			source: 'json_loader.1',
			target: 'foreach.1',
			sourceHandle: 'json_loader.1-output-data',
			targetHandle: 'foreach.1-input-items',
			style: 'stroke: var(--fd-edge-data);',
			class: 'flowdrop--edge--data',
			markerEnd: {
				type: 'arrowclosed',
				width: 16,
				height: 16,
				color: '#a3a3ad'
			},
			data: {
				metadata: {
					edgeType: 'data',
					sourcePortDataType: 'array'
				},
				targetNodeType: 'universalNode',
				targetCategory: 'logic'
			}
		},
		{
			id: 'xy-edge__foreach.1foreach.1-output-item-process_item.1process_item.1-input-input',
			source: 'foreach.1',
			target: 'process_item.1',
			sourceHandle: 'foreach.1-output-item',
			targetHandle: 'process_item.1-input-input',
			style: 'stroke: var(--fd-edge-data);',
			class: 'flowdrop--edge--data',
			markerEnd: {
				type: 'arrowclosed',
				width: 16,
				height: 16,
				color: '#a3a3ad'
			},
			data: {
				metadata: {
					edgeType: 'data',
					sourcePortDataType: 'mixed'
				},
				targetNodeType: 'universalNode',
				targetCategory: 'processing'
			}
		},
		{
			id: 'xy-edge__process_item.1process_item.1-output-output-foreach.1foreach.1-input-loop_back',
			source: 'process_item.1',
			target: 'foreach.1',
			sourceHandle: 'process_item.1-output-output',
			targetHandle: 'foreach.1-input-loop_back',
			style:
				'stroke: var(--fd-edge-loopback); stroke-dasharray: var(--fd-edge-loopback-dasharray); stroke-width: var(--fd-edge-loopback-width); opacity: var(--fd-edge-loopback-opacity);',
			class: 'flowdrop--edge--loopback',
			markerEnd: {
				type: 'arrowclosed',
				width: 14,
				height: 14,
				color: '#71717b'
			},
			data: {
				metadata: {
					edgeType: 'loopback',
					sourcePortDataType: 'mixed'
				},
				targetNodeType: 'universalNode',
				targetCategory: 'logic'
			}
		}
	],
	metadata: {
		version: '1.0.0',
		createdAt: '2026-02-05T21:24:59.988Z',
		updatedAt: '2026-02-05T21:24:59.988Z'
	}
};

/**
 * Demo workflow: Template Variable Autocomplete
 * Demonstrates the template autocomplete feature with nested object and array drilling
 */
export const demoTemplateAutocompleteWorkflow: Workflow = {
	id: 'demo_template_autocomplete',
	name: 'Demo: Template Variable Autocomplete',
	nodes: [
		{
			id: 'notes.autocomplete',
			type: 'universalNode',
			position: {
				x: -600,
				y: -280
			},
			deletable: true,
			data: {
				label: 'Notes',
				config: {
					content:
						'# Template Variable Autocomplete Demo\n\nThis workflow demonstrates the **template variable autocomplete** feature:\n\n## How to Test\n\n1. **Click on the Prompt Template node** to open its config panel\n2. **Find the Template field** (CodeMirror editor)\n3. **Type `{{`** to trigger autocomplete\n4. **Try these patterns:**\n   - `{{ user.` → shows `name`, `email`, `address`\n   - `{{ user.address.` → shows `street`, `city`, `country`\n   - `{{ orders[0].` → shows order properties like `product_name`, `price`\n\n## Available Variables\n\nFrom HTTP Request `json` output:\n- `user` (object): id, name, email, address\n- `user.address` (object): street, city, country\n- `orders` (array): order_id, product_name, quantity, price, status',
					noteType: 'info'
				},
				metadata: {
					id: 'notes',
					name: 'Notes',
					type: 'note',
					supportedTypes: ['note'],
					description: 'Add documentation and comments to your workflow with Markdown support',
					category: 'tools',
					icon: 'mdi:note-text',
					color: '#fbbf24',
					version: '1.0.0',
					tags: ['tools', 'notes', 'documentation', 'comments', 'markdown'],
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'content',
							name: 'Note Content',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The markdown content of the note'
						},
						{
							id: 'noteType',
							name: 'Note Type',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The visual type of the note (info, warning, success, error, note)'
						},
						{
							id: 'message',
							name: 'Message',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Status message about the note'
						}
					],
					config: {
						content:
							'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!',
						noteType: 'info'
					},
					configSchema: {
						type: 'object',
						properties: {
							content: {
								type: 'string',
								title: 'Note Content',
								description: 'Documentation or comment text (supports Markdown)',
								format: 'markdown',
								default:
									'# Workflow Notes\n\nAdd your documentation here using **Markdown** formatting.\n\n## Features\n- Supports **bold** and *italic* text\n- Create lists and code blocks\n- Add links and more!'
							},
							noteType: {
								type: 'string',
								title: 'Note Type',
								description: 'Visual style and color of the note',
								default: 'info',
								enum: ['info', 'warning', 'success', 'error', 'note']
							}
						}
					}
				},
				nodeId: 'notes.autocomplete'
			},
			measured: {
				width: 500,
				height: 685
			},
			selected: false,
			dragging: false
		},
		{
			id: 'http_request.1',
			type: 'universalNode',
			position: {
				x: -40,
				y: -280
			},
			deletable: true,
			data: {
				label: 'HTTP Request',
				config: {
					url: '',
					method: 'GET',
					headers: [],
					body: '',
					timeout: 30,
					follow_redirects: true
				},
				metadata: {
					id: 'http_request',
					name: 'HTTP Request',
					type: 'default',
					supportedTypes: ['default'],
					description: 'Make HTTP requests to external APIs and services',
					category: 'tools',
					icon: 'mdi:web',
					color: '#3b82f6',
					version: '1.0.0',
					tags: ['tool', 'http', 'api', 'request'],
					inputs: [
						{
							id: 'url',
							name: 'URL',
							type: 'input',
							dataType: 'string',
							required: false,
							description: 'The URL to request (overrides config)'
						},
						{
							id: 'method',
							name: 'HTTP Method',
							type: 'input',
							dataType: 'string',
							required: false,
							description: 'The HTTP method to use (overrides config)'
						},
						{
							id: 'headers',
							name: 'Headers',
							type: 'input',
							dataType: 'json',
							required: false,
							description: 'Additional headers to send'
						},
						{
							id: 'body',
							name: 'Request Body',
							type: 'input',
							dataType: 'string',
							required: false,
							description: 'Request body (overrides config)'
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'status_code',
							name: 'status_code',
							type: 'output',
							dataType: 'number',
							required: false,
							description: 'HTTP response status code'
						},
						{
							id: 'headers',
							name: 'headers',
							type: 'output',
							dataType: 'array',
							required: false,
							description: 'HTTP response headers'
						},
						{
							id: 'body',
							name: 'body',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'HTTP response body'
						},
						{
							id: 'json',
							name: 'json',
							type: 'output',
							dataType: 'array',
							required: false,
							description: 'Parsed JSON response (if applicable)',
							schema: {
								type: 'object',
								properties: {
									user: {
										type: 'object',
										title: 'User',
										description: 'User information from API',
										properties: {
											id: {
												type: 'integer',
												description: 'User ID'
											},
											name: {
												type: 'string',
												description: 'User full name'
											},
											email: {
												type: 'string',
												description: 'User email address'
											},
											address: {
												type: 'object',
												title: 'Address',
												description: 'User address',
												properties: {
													street: {
														type: 'string',
														description: 'Street address'
													},
													city: {
														type: 'string',
														description: 'City name'
													},
													country: {
														type: 'string',
														description: 'Country name'
													}
												}
											}
										}
									},
									orders: {
										type: 'array',
										title: 'Orders',
										description: 'List of user orders',
										items: {
											type: 'object',
											properties: {
												order_id: {
													type: 'string',
													description: 'Order identifier'
												},
												product_name: {
													type: 'string',
													description: 'Name of the product'
												},
												quantity: {
													type: 'integer',
													description: 'Quantity ordered'
												},
												price: {
													type: 'number',
													description: 'Total price'
												},
												status: {
													type: 'string',
													description: 'Order status'
												}
											}
										}
									}
								}
							}
						},
						{
							id: 'url',
							name: 'url',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The URL that was requested'
						},
						{
							id: 'method',
							name: 'method',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The HTTP method used'
						},
						{
							id: 'request_time',
							name: 'request_time',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'Timestamp when request was made'
						}
					],
					config: {
						method: 'GET',
						url: '',
						headers: [],
						timeout: 30,
						followRedirects: true
					},
					configSchema: {
						type: 'object',
						properties: {
							url: {
								type: 'string',
								title: 'URL',
								description: 'The URL to request',
								default: ''
							},
							method: {
								type: 'string',
								title: 'HTTP Method',
								description: 'The HTTP method to use',
								default: 'GET',
								enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
							},
							headers: {
								type: 'object',
								title: 'Headers',
								description: 'HTTP headers to send',
								default: []
							},
							body: {
								type: 'string',
								title: 'Request Body',
								description: 'Request body for POST/PUT requests',
								default: ''
							},
							timeout: {
								type: 'integer',
								title: 'Timeout',
								description: 'Request timeout in seconds',
								default: 30,
								minimum: 1,
								maximum: 300
							},
							follow_redirects: {
								type: 'boolean',
								title: 'Follow Redirects',
								description: 'Whether to follow HTTP redirects',
								default: true
							}
						}
					}
				},
				nodeId: 'http_request.1',
				extensions: {
					ui: {
						hideUnconnectedHandles: true
					}
				}
			},
			measured: {
				width: 290,
				height: 200
			},
			selected: false,
			dragging: false
		},
		{
			id: 'prompt_template.1',
			type: 'universalNode',
			position: {
				x: 380,
				y: -280
			},
			deletable: true,
			data: {
				label: 'Prompt Template',
				config: {
					template:
						'# User Report\n\nHello {{ user.name }},\n\nYour email: {{ user.email }}\n\n## Address\nStreet: {{ user.address.street }}\nCity: {{ user.address.city }}\nCountry: {{ user.address.country }}\n\n## Recent Orders\n{% for order in orders %}\n- Order #{{ order.order_id }}: {{ order.product_name }} (x{{ order.quantity }}) - ${{ order.price }}\n  Status: {{ order.status }}\n{% endfor %}\n\nFirst order: {{ orders[0].product_name }}',
					strictMode: false,
					preserveWhitespace: true,
					fallbackValue: ''
				},
				metadata: {
					id: 'prompt_template',
					name: 'Prompt Template',
					type: 'default',
					supportedTypes: ['default'],
					description:
						'Render dynamic templates using Twig-style {{ variable }} placeholders with data from inputs',
					category: 'processing',
					icon: 'mdi:text-box-edit-outline',
					color: '#a855f7',
					version: '1.0.0',
					tags: ['template', 'prompt', 'text', 'variable', 'twig', 'render', 'interpolation'],
					inputs: [
						{
							id: 'data',
							name: 'Data',
							type: 'input',
							dataType: 'json',
							required: false,
							description:
								"Object containing variables to substitute in the template (e.g., { name: 'John', order_id: 123 })"
						},
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: false,
							description: ''
						}
					],
					outputs: [
						{
							id: 'output',
							name: 'output',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The rendered template with all variables substituted'
						},
						{
							id: 'template',
							name: 'template',
							type: 'output',
							dataType: 'string',
							required: false,
							description: 'The original template string used'
						},
						{
							id: 'variables',
							name: 'variables',
							type: 'output',
							dataType: 'json',
							required: false,
							description: 'Object containing the variables that were substituted'
						},
						{
							id: 'missing_variables',
							name: 'missing_variables',
							type: 'output',
							dataType: 'array',
							required: false,
							description: 'List of variable names found in template but missing from data'
						},
						{
							id: 'success',
							name: 'success',
							type: 'output',
							dataType: 'boolean',
							required: false,
							description: 'Whether template rendering completed without errors'
						}
					],
					config: {
						template:
							'Hello {{ name }},\n\nYour order #{{ order_id }} has been {{ status }}.\n\nThank you for choosing us!',
						strictMode: false,
						preserveWhitespace: true
					},
					configSchema: {
						type: 'object',
						properties: {
							template: {
								type: 'string',
								title: 'Template',
								description:
									'Template text with {{ variable }} placeholders that will be replaced with values from the data input',
								format: 'template',
								variables: {
									ports: ['data'],
									showHints: true
								},
								default:
									'Hello {{ name }},\n\nYour order #{{ order_id }} has been {{ status }}.\n\nThank you for choosing us!',
								height: '300px',
								placeholderExample:
									'Dear {{ customer_name }}, your {{ product_name }} is ready for pickup.'
							},
							strictMode: {
								type: 'boolean',
								title: 'Strict Mode',
								description:
									'When enabled, throw an error if a variable in the template is missing from the data. When disabled, missing variables are left as-is.',
								default: false
							},
							preserveWhitespace: {
								type: 'boolean',
								title: 'Preserve Whitespace',
								description: 'Preserve whitespace and newlines in the rendered output',
								default: true
							},
							fallbackValue: {
								type: 'string',
								title: 'Fallback Value',
								description:
									'Value to use for missing variables when strict mode is off (leave empty to keep the placeholder)',
								default: ''
							}
						}
					}
				},
				nodeId: 'prompt_template.1',
				extensions: {
					ui: {
						hideUnconnectedHandles: true
					}
				}
			},
			measured: {
				width: 290,
				height: 220
			},
			selected: false,
			dragging: false
		}
	],
	edges: [
		{
			source: 'http_request.1',
			sourceHandle: 'http_request.1-output-json',
			target: 'prompt_template.1',
			targetHandle: 'prompt_template.1-input-data',
			id: 'xy-edge__http_request.1http_request.1-output-json-prompt_template.1prompt_template.1-input-data',
			style: 'stroke: var(--fd-edge-data);',
			class: 'flowdrop--edge--data',
			markerEnd: {
				type: 'arrowclosed',
				width: 16,
				height: 16,
				color: '#a3a3ad'
			},
			data: {
				metadata: {
					edgeType: 'data',
					sourcePortDataType: 'array'
				},
				targetNodeType: 'universalNode',
				targetCategory: 'processing'
			}
		}
	],
	metadata: {
		version: '1.0.0',
		createdAt: '2026-02-05T21:22:21.689Z',
		updatedAt: '2026-02-05T21:22:21.689Z'
	}
};

/**
 * Demo workflow: API-Based Variable Suggestions
 * Demonstrates dynamic variable loading from backend API for template fields
 */
export const demoApiVariablesWorkflow: Workflow = (() => {
	// Get node metadata from the registry
	const emailTemplateNode = getNodeById('email_template_generator');
	const notificationNode = getNodeById('notification_template');

	if (!emailTemplateNode || !notificationNode) {
		throw new Error('Required nodes not found in registry');
	}

	return {
		id: 'demo_api_variables',
		name: 'Demo: API-Based Variable Suggestions',
		description:
			'Demonstrates fetching template variables from backend API for rich autocomplete experience',
		nodes: [
			{
				id: 'email_template.1',
				type: 'universalNode',
				position: { x: 100, y: 100 },
				data: {
					label: 'Email Template',
					config: {
						templateType: 'order_confirmation',
						subjectTemplate: 'Order {{ order.orderNumber }} Confirmed - {{ company.name }}',
						bodyTemplate:
							'Hello {{ user.firstName }} {{ user.lastName }},\n\nThank you for your order!\n\nOrder Number: {{ order.orderNumber }}\nTotal: {{ order.currency }}{{ order.total }}\n\nItems:\n{% for item in order.items %}\n- {{ item.name }} x{{ item.quantity }} - {{ order.currency }}{{ item.price }}\n{% endfor %}\n\nShipping Address:\n{{ order.shippingAddress.street }}\n{{ order.shippingAddress.city }}, {{ order.shippingAddress.state }} {{ order.shippingAddress.zipCode }}\n{{ order.shippingAddress.country }}\n\nBest regards,\n{{ company.name }}\n{{ company.email }}\n{{ company.phone }}',
						includeUnsubscribeLink: true,
						trackOpens: true
					},
					metadata: emailTemplateNode,
					nodeId: 'email_template.1'
				}
			},
			{
				id: 'notification.1',
				type: 'universalNode',
				position: { x: 400, y: 100 },
				data: {
					label: 'Notification',
					config: {
						title: 'Order Confirmed: {{ order.orderNumber }}',
						message:
							'Your order for {{ order.items[0].name }} and {{ order.total }} more items is confirmed!',
						priority: 'high'
					},
					metadata: notificationNode,
					nodeId: 'notification.1'
				}
			}
		] as WorkflowNode[],
		edges: [] as WorkflowEdge[],
		metadata: {
			version: '1.0.0',
			author: 'FlowDrop Demo',
			tags: ['demo', 'api', 'variables', 'template', 'backend'],
			createdAt: '2026-02-03T10:00:00.000Z',
			updatedAt: '2026-02-03T10:00:00.000Z'
		}
	};
})();

// ============================================================================
// Agent Spec Demo Workflows
// ============================================================================

/**
 * Demo workflow: Agent Spec — LLM Pipeline
 * Simple 3-node flow: Start → LLM → End
 * Demonstrates basic Agent Spec usage with control and data flow connections.
 */
export const demoAgentSpecLLMPipelineWorkflow: Workflow = (() => {
	const startMeta = getAgentSpecNodeMetadata('start_node')!;
	const llmMeta = getAgentSpecNodeMetadata('llm_node')!;
	const endMeta = getAgentSpecNodeMetadata('end_node')!;

	return {
		id: 'agentspec-llm-pipeline',
		name: 'Demo: Agent Spec — LLM Pipeline',
		description:
			'A simple Start → LLM → End pipeline using Oracle Agent Spec node types. Demonstrates basic control flow and data flow connections.',
		nodes: [
			{
				id: 'agentspec.start_node.1',
				type: 'universalNode',
				position: { x: 0, y: 100 },
				data: {
					nodeId: 'agentspec.start_node.1',
					label: 'Start',
					config: {},
					metadata: {
						...startMeta,
						outputs: [
							...startMeta.outputs,
							{
								id: 'user_query',
								name: 'User Query',
								type: 'output',
								dataType: 'string',
								description: 'The user question to answer'
							}
						]
					}
				}
			},
			{
				id: 'agentspec.llm_node.1',
				type: 'universalNode',
				position: { x: 350, y: 100 },
				data: {
					nodeId: 'agentspec.llm_node.1',
					label: 'Summarizer LLM',
					config: {
						prompt_template: '{{prompt}}',
						system_prompt: 'You are a helpful summarizer. Summarize the input concisely.',
						llm_config_ref: 'gpt-4o'
					},
					metadata: {
						...llmMeta,
						inputs: [
							...llmMeta.inputs,
							{
								id: 'prompt',
								name: 'Prompt',
								type: 'input',
								dataType: 'string',
								required: true
							}
						],
						outputs: [
							...llmMeta.outputs,
							{
								id: 'response',
								name: 'Response',
								type: 'output',
								dataType: 'string'
							}
						]
					}
				}
			},
			{
				id: 'agentspec.end_node.1',
				type: 'universalNode',
				position: { x: 700, y: 100 },
				data: {
					nodeId: 'agentspec.end_node.1',
					label: 'End',
					config: {},
					metadata: {
						...endMeta,
						inputs: [
							...endMeta.inputs,
							{
								id: 'result',
								name: 'Result',
								type: 'input',
								dataType: 'string',
								required: true
							}
						]
					}
				}
			}
		] as WorkflowNode[],
		edges: [
			// Control flow: Start → LLM
			{
				id: 'cf-start-llm',
				source: 'agentspec.start_node.1',
				target: 'agentspec.llm_node.1',
				sourceHandle: 'agentspec.start_node.1-output-trigger',
				targetHandle: 'agentspec.llm_node.1-input-trigger'
			},
			// Control flow: LLM → End
			{
				id: 'cf-llm-end',
				source: 'agentspec.llm_node.1',
				target: 'agentspec.end_node.1',
				sourceHandle: 'agentspec.llm_node.1-output-trigger',
				targetHandle: 'agentspec.end_node.1-input-trigger'
			},
			// Data flow: Start.user_query → LLM.prompt
			{
				id: 'df-query-prompt',
				source: 'agentspec.start_node.1',
				target: 'agentspec.llm_node.1',
				sourceHandle: 'agentspec.start_node.1-output-user_query',
				targetHandle: 'agentspec.llm_node.1-input-prompt',
				data: { metadata: { edgeType: 'data' } },
				style: 'stroke: grey;'
			},
			// Data flow: LLM.response → End.result
			{
				id: 'df-response-result',
				source: 'agentspec.llm_node.1',
				target: 'agentspec.end_node.1',
				sourceHandle: 'agentspec.llm_node.1-output-response',
				targetHandle: 'agentspec.end_node.1-input-result',
				data: { metadata: { edgeType: 'data' } },
				style: 'stroke: grey;'
			}
		] as WorkflowEdge[],
		metadata: {
			version: '1.0.0',
			createdAt: '2025-01-15T10:00:00.000Z',
			updatedAt: '2025-01-15T10:00:00.000Z',
			tags: ['agent-spec', 'llm', 'demo'],
			format: 'agentspec'
		}
	};
})();

/**
 * Demo workflow: Agent Spec — Customer Support Router
 * 6-node flow: Start → LLM Classifier → Branch → 3x End nodes
 * Demonstrates branching, LLM classification, and multiple endpoints.
 */
export const demoAgentSpecCustomerSupportWorkflow: Workflow = (() => {
	const startMeta = getAgentSpecNodeMetadata('start_node')!;
	const llmMeta = getAgentSpecNodeMetadata('llm_node')!;
	const branchMeta = getAgentSpecNodeMetadata('branching_node')!;
	const endMeta = getAgentSpecNodeMetadata('end_node')!;

	return {
		id: 'agentspec-customer-support',
		name: 'Demo: Agent Spec — Customer Support Router',
		description:
			'Routes customer queries through LLM classification and branching. Demonstrates branching_node, multiple endpoints, and data flow.',
		nodes: [
			{
				id: 'agentspec.start_node.1',
				type: 'universalNode',
				position: { x: 0, y: 200 },
				data: {
					nodeId: 'agentspec.start_node.1',
					label: 'Intake',
					config: {},
					metadata: {
						...startMeta,
						outputs: [
							...startMeta.outputs,
							{
								id: 'customer_message',
								name: 'Customer Message',
								type: 'output',
								dataType: 'string',
								description: 'Raw customer message'
							}
						]
					}
				}
			},
			{
				id: 'agentspec.llm_node.1',
				type: 'universalNode',
				position: { x: 350, y: 200 },
				data: {
					nodeId: 'agentspec.llm_node.1',
					label: 'Classifier',
					config: {
						prompt_template: '{{message}}',
						system_prompt:
							'Classify the customer message as: billing, technical, or general. Respond with only the category name.',
						llm_config_ref: 'claude-sonnet-4-6'
					},
					metadata: {
						...llmMeta,
						inputs: [
							...llmMeta.inputs,
							{
								id: 'message',
								name: 'Message',
								type: 'input',
								dataType: 'string',
								required: true
							}
						],
						outputs: [
							...llmMeta.outputs,
							{
								id: 'category',
								name: 'Category',
								type: 'output',
								dataType: 'string',
								description: 'billing, technical, or general'
							}
						]
					}
				}
			},
			{
				id: 'agentspec.branching_node.1',
				type: 'universalNode',
				position: { x: 700, y: 200 },
				data: {
					nodeId: 'agentspec.branching_node.1',
					label: 'Router',
					config: {
						branches: [
							{
								name: 'billing',
								label: 'Billing',
								condition: 'category == "billing"'
							},
							{
								name: 'technical',
								label: 'Technical',
								condition: 'category == "technical"'
							},
							{
								name: 'general',
								label: 'General',
								condition: 'default',
								isDefault: true
							}
						]
					},
					metadata: {
						...branchMeta,
						inputs: [
							...branchMeta.inputs,
							{
								id: 'category',
								name: 'Category',
								type: 'input',
								dataType: 'string',
								required: true
							}
						]
					}
				}
			},
			{
				id: 'agentspec.end_node.1',
				type: 'universalNode',
				position: { x: 1050, y: 50 },
				data: {
					nodeId: 'agentspec.end_node.1',
					label: 'Billing Response',
					config: {},
					metadata: {
						...endMeta,
						inputs: [
							...endMeta.inputs,
							{
								id: 'result',
								name: 'Result',
								type: 'input',
								dataType: 'string'
							}
						]
					}
				}
			},
			{
				id: 'agentspec.end_node.2',
				type: 'universalNode',
				position: { x: 1050, y: 200 },
				data: {
					nodeId: 'agentspec.end_node.2',
					label: 'Tech Response',
					config: {},
					metadata: {
						...endMeta,
						inputs: [
							...endMeta.inputs,
							{
								id: 'result',
								name: 'Result',
								type: 'input',
								dataType: 'string'
							}
						]
					}
				}
			},
			{
				id: 'agentspec.end_node.3',
				type: 'universalNode',
				position: { x: 1050, y: 350 },
				data: {
					nodeId: 'agentspec.end_node.3',
					label: 'General Response',
					config: {},
					metadata: {
						...endMeta,
						inputs: [
							...endMeta.inputs,
							{
								id: 'result',
								name: 'Result',
								type: 'input',
								dataType: 'string'
							}
						]
					}
				}
			}
		] as WorkflowNode[],
		edges: [
			// Control flow: Start → Classifier
			{
				id: 'cf-start-classifier',
				source: 'agentspec.start_node.1',
				target: 'agentspec.llm_node.1',
				sourceHandle: 'agentspec.start_node.1-output-trigger',
				targetHandle: 'agentspec.llm_node.1-input-trigger'
			},
			// Control flow: Classifier → Router
			{
				id: 'cf-classifier-router',
				source: 'agentspec.llm_node.1',
				target: 'agentspec.branching_node.1',
				sourceHandle: 'agentspec.llm_node.1-output-trigger',
				targetHandle: 'agentspec.branching_node.1-input-trigger'
			},
			// Control flow: Router → Billing End
			{
				id: 'cf-router-billing',
				source: 'agentspec.branching_node.1',
				target: 'agentspec.end_node.1',
				sourceHandle: 'agentspec.branching_node.1-output-billing',
				targetHandle: 'agentspec.end_node.1-input-trigger'
			},
			// Control flow: Router → Tech End
			{
				id: 'cf-router-tech',
				source: 'agentspec.branching_node.1',
				target: 'agentspec.end_node.2',
				sourceHandle: 'agentspec.branching_node.1-output-technical',
				targetHandle: 'agentspec.end_node.2-input-trigger'
			},
			// Control flow: Router → General End
			{
				id: 'cf-router-general',
				source: 'agentspec.branching_node.1',
				target: 'agentspec.end_node.3',
				sourceHandle: 'agentspec.branching_node.1-output-general',
				targetHandle: 'agentspec.end_node.3-input-trigger'
			},
			// Data flow: Start.customer_message → Classifier.message
			{
				id: 'df-msg-classifier',
				source: 'agentspec.start_node.1',
				target: 'agentspec.llm_node.1',
				sourceHandle: 'agentspec.start_node.1-output-customer_message',
				targetHandle: 'agentspec.llm_node.1-input-message',
				data: { metadata: { edgeType: 'data' } },
				style: 'stroke: grey;'
			},
			// Data flow: Classifier.category → Router.category
			{
				id: 'df-category-router',
				source: 'agentspec.llm_node.1',
				target: 'agentspec.branching_node.1',
				sourceHandle: 'agentspec.llm_node.1-output-category',
				targetHandle: 'agentspec.branching_node.1-input-category',
				data: { metadata: { edgeType: 'data' } },
				style: 'stroke: grey;'
			}
		] as WorkflowEdge[],
		metadata: {
			version: '1.0.0',
			createdAt: '2025-01-15T10:00:00.000Z',
			updatedAt: '2025-01-15T10:00:00.000Z',
			tags: ['agent-spec', 'branching', 'llm', 'demo'],
			format: 'agentspec'
		}
	};
})();

/**
 * All mock workflows as a Map for easy lookup
 */
export const mockWorkflows: Map<string, Workflow> = new Map([
	[demoAIContentWorkflow.id, demoAIContentWorkflow],
	[demoNodeTypesShowcaseWorkflow.id, demoNodeTypesShowcaseWorkflow],
	[demoTriggerNodeWorkflow.id, demoTriggerNodeWorkflow],
	[demoForEachLoopWorkflow.id, demoForEachLoopWorkflow],
	[demoTemplateAutocompleteWorkflow.id, demoTemplateAutocompleteWorkflow],
	[demoAgentSpecLLMPipelineWorkflow.id, demoAgentSpecLLMPipelineWorkflow],
	[demoAgentSpecCustomerSupportWorkflow.id, demoAgentSpecCustomerSupportWorkflow]
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
		description: data.description || '',
		nodes: data.nodes || [],
		edges: data.edges || [],
		metadata: {
			version: '1.0.0',
			createdAt: now,
			updatedAt: now,
			author: 'API User',
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
	updates: Partial<Omit<Workflow, 'id' | 'metadata'>> & { metadata?: Partial<WorkflowMetadata> }
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
