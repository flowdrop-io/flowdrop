/**
 * Mock workflow data for MSW mock server
 * Provides sample workflows for API testing and documentation
 */

import type { Workflow, WorkflowNode, WorkflowEdge } from '../../lib/types/index.js';

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
								enum: ['tool', 'default'],
								enumNames: ['Tool Node (with metadata port)', 'Default Node (standard ports)']
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
								enum: ['tool', 'default'],
								enumNames: ['Tool Node (with metadata port)', 'Default Node (standard ports)']
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
								enum: ['simple', 'square', 'default'],
								enumNames: ['Simple (compact layout)', 'Square (square layout)', 'Default']
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
								enum: ['simple', 'square', 'default'],
								enumNames: ['Simple (compact layout)', 'Square (square layout)', 'Default']
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
								enum: ['tool', 'default'],
								enumNames: ['Tool Node (with metadata port)', 'Default Node (standard ports)']
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
								enum: ['simple', 'square', 'default'],
								enumNames: ['Simple (compact layout)', 'Square (square layout)', 'Default']
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
								enum: ['simple', 'square', 'default'],
								enumNames: ['Simple (compact layout)', 'Square (square layout)', 'Default']
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
								enum: [
									'entity.insert',
									'entity.update',
									'entity.delete',
									'entity.presave',
									'user.login',
									'user.logout'
								],
								enumLabels: [
									'Entity Created',
									'Entity Updated',
									'Entity Deleted',
									'Before Entity Save',
									'User Login',
									'User Logout'
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
								enum: ['simple', 'square', 'default'],
								enumNames: ['Simple (compact layout)', 'Square (square layout)', 'Default']
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
								enum: ['simple', 'square', 'default'],
								enumNames: ['Simple (compact layout)', 'Square (square layout)', 'Default']
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
			style: 'stroke: var(--flowdrop-edge-data-color);',
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
			style:
				'stroke: var(--flowdrop-edge-trigger-color); stroke-width: var(--flowdrop-edge-trigger-width);',
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
			style: 'stroke: var(--flowdrop-edge-data-color);',
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
 * All mock workflows as a Map for easy lookup
 */
export const mockWorkflows: Map<string, Workflow> = new Map([
	[demoAIContentWorkflow.id, demoAIContentWorkflow],
	[demoNodeTypesShowcaseWorkflow.id, demoNodeTypesShowcaseWorkflow],
	[demoTriggerNodeWorkflow.id, demoTriggerNodeWorkflow]
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
